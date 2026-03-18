import { db } from "@/lib/db";
import {
  watchItems,
  credentials,
  activitySlots,
  bookings,
  notifications,
  agentState,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { decryptFields } from "@/lib/crypto/vault";
import { getAdapter } from "@/lib/platforms/registry";
import { Scheduler } from "./scheduler";
import {
  checkSpendingCap,
  recordSpending,
} from "@/lib/payments/spending-guard";
import { getPaymentForPlatform } from "@/lib/payments/payment-router";
import { sendBookingConfirmation } from "@/lib/notifications/email";
import { statusEmitter } from "./status-emitter";
import type { Platform, AgentStatus } from "@/types";
import type { BrowserContext } from "playwright";

class BookingAgent {
  private scheduler = new Scheduler();
  private sessions = new Map<Platform, BrowserContext>();
  private status: AgentStatus = "stopped";

  constructor() {
    this.scheduler.setCheckCallback((platform) => this.checkPlatform(platform));
  }

  async start(): Promise<void> {
    if (this.status === "running") return;

    this.status = "running";
    await this.updateDbState("running");

    statusEmitter.emit({
      type: "agent_state",
      message: "Agent started — watching for availability",
    });

    // Get all active watch items grouped by platform
    const items = await db.query.watchItems.findMany({
      where: eq(watchItems.status, "active"),
    });

    const platforms = new Set(items.map((i) => i.platform as Platform));

    for (const platform of platforms) {
      const adapter = getAdapter(platform);
      this.scheduler.addPlatform(platform, adapter.pollIntervalMs);

      // Login to platform
      await this.ensureSession(platform);
    }

    this.scheduler.start();
  }

  async pause(): Promise<void> {
    if (this.status !== "running") return;

    this.status = "paused";
    this.scheduler.pause();
    await this.updateDbState("paused");

    statusEmitter.emit({
      type: "agent_state",
      message: "Agent paused",
    });
  }

  async resume(): Promise<void> {
    if (this.status !== "paused") return;

    this.status = "running";
    this.scheduler.start();
    await this.updateDbState("running");

    statusEmitter.emit({
      type: "agent_state",
      message: "Agent resumed — watching for availability",
    });
  }

  async stop(): Promise<void> {
    this.status = "stopped";
    this.scheduler.stop();

    // Close all browser sessions
    for (const [, ctx] of this.sessions) {
      try {
        const browser = ctx.browser();
        await ctx.close();
        await browser?.close();
      } catch {
        // Ignore close errors
      }
    }
    this.sessions.clear();

    await this.updateDbState("stopped");

    statusEmitter.emit({
      type: "agent_state",
      message: "Agent stopped",
    });
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  private async ensureSession(platform: Platform): Promise<BrowserContext | null> {
    let ctx = this.sessions.get(platform);

    if (ctx) {
      const adapter = getAdapter(platform);
      try {
        const valid = await adapter.isSessionValid(ctx);
        if (valid) return ctx;
      } catch {
        // Session invalid, re-login
      }

      try {
        const browser = ctx.browser();
        await ctx.close();
        await browser?.close();
      } catch {
        // Ignore
      }
    }

    // Get credentials
    const cred = await db.query.credentials.findFirst({
      where: and(
        eq(credentials.platform, platform),
        eq(credentials.enabled, true)
      ),
    });

    if (!cred) {
      statusEmitter.emit({
        type: "error",
        platform,
        message: `No credentials configured for ${platform}`,
      });
      return null;
    }

    const decrypted = decryptFields(
      { username: cred.usernameEnc, password: cred.passwordEnc },
      cred.iv
    );

    try {
      const adapter = getAdapter(platform);
      ctx = await adapter.login({
        username: decrypted.username,
        password: decrypted.password,
      });
      this.sessions.set(platform, ctx);

      statusEmitter.emit({
        type: "check",
        platform,
        message: `Logged in to ${adapter.displayName}`,
      });

      return ctx;
    } catch (error) {
      statusEmitter.emit({
        type: "error",
        platform,
        message: `Login failed for ${platform}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      return null;
    }
  }

  private async checkPlatform(platform: Platform): Promise<void> {
    const ctx = await this.ensureSession(platform);
    if (!ctx) return;

    const adapter = getAdapter(platform);
    const items = await db.query.watchItems.findMany({
      where: and(
        eq(watchItems.platform, platform),
        eq(watchItems.status, "active")
      ),
    });

    if (items.length === 0) {
      this.scheduler.removePlatform(platform);
      return;
    }

    statusEmitter.emit({
      type: "check",
      platform,
      message: `Checking ${items.length} watch item(s) on ${adapter.displayName}`,
    });

    // Update agent state
    db.update(agentState)
      .set({
        lastCheckAt: new Date().toISOString(),
        checksCount: sql`${agentState.checksCount} + 1`,
      })
      .where(eq(agentState.id, 1))
      .run();

    for (const item of items) {
      try {
        const criteria = {
          activityType: item.activityType,
          activityName: item.activityName,
          preferredDates: JSON.parse(item.preferredDates),
          partySize: item.partySize,
          sitePrefs: JSON.parse(item.sitePrefs),
        };

        const slots = await adapter.checkAvailability(ctx, criteria);

        if (slots.length > 0) {
          statusEmitter.emit({
            type: "found",
            platform,
            message: `Found ${slots.length} available slot(s) for "${item.activityName}"`,
            data: { watchItemId: item.id, slots },
          });

          // Try to book the best slot (first one for now)
          const slot = slots[0];

          // Record the found slot
          const slotRecord = await db
            .insert(activitySlots)
            .values({
              watchItemId: item.id,
              platform,
              slotDate: slot.slotDate,
              slotTime: slot.slotTime || null,
              slotIdentifier: slot.slotIdentifier,
              price: slot.price || null,
              status: "found",
            })
            .returning()
            .get();

          // Attempt booking if payment profile is set
          if (item.paymentProfileId && slot.price !== undefined) {
            await this.attemptBooking(
              item,
              slotRecord,
              slot,
              platform,
              ctx,
              adapter
            );
          }
        }
      } catch (error) {
        statusEmitter.emit({
          type: "error",
          platform,
          message: `Error checking "${item.activityName}": ${error instanceof Error ? error.message : "Unknown"}`,
        });
      }
    }
  }

  private async attemptBooking(
    item: typeof watchItems.$inferSelect,
    slotRecord: typeof activitySlots.$inferSelect,
    slot: { slotDate: string; slotIdentifier: string; price?: number },
    platform: Platform,
    ctx: BrowserContext,
    adapter: ReturnType<typeof getAdapter>
  ): Promise<void> {
    const price = slot.price || 0;

    // Check spending cap
    const capCheck = await checkSpendingCap(item.paymentProfileId!, price);
    if (!capCheck.approved) {
      statusEmitter.emit({
        type: "error",
        platform,
        message: `Spending cap blocked: ${capCheck.reason}`,
      });

      await db.insert(notifications).values({
        type: "cap_reached",
        title: "Spending Cap Reached",
        body: capCheck.reason,
        relatedId: item.id,
      });

      return;
    }

    // Get payment card
    const paymentInfo = await getPaymentForPlatform(
      item.paymentProfileId!,
      platform
    );
    if (!paymentInfo) {
      statusEmitter.emit({
        type: "error",
        platform,
        message: `No valid payment card for ${platform}`,
      });
      return;
    }

    // Update slot status
    await db
      .update(activitySlots)
      .set({ status: "attempting" })
      .where(eq(activitySlots.id, slotRecord.id));

    statusEmitter.emit({
      type: "booking",
      platform,
      message: `Attempting to book "${item.activityName}" on ${slot.slotDate}...`,
    });

    // Execute booking
    const result = await adapter.bookSlot(
      ctx,
      {
        slotDate: slot.slotDate,
        slotIdentifier: slot.slotIdentifier,
        price: slot.price,
      },
      paymentInfo.card,
      item.partySize
    );

    if (result.success) {
      const amountCharged = result.amountCharged || price;

      // Record booking
      const booking = await db
        .insert(bookings)
        .values({
          watchItemId: item.id,
          activitySlotId: slotRecord.id,
          platform,
          confirmationCode: result.confirmationCode,
          amountCharged,
          paymentProfileId: paymentInfo.profileId,
          status: "confirmed",
        })
        .returning()
        .get();

      // Record spending
      await recordSpending(paymentInfo.profileId, booking.id, amountCharged);

      // Update slot and watch item status
      await db
        .update(activitySlots)
        .set({ status: "booked", bookedAt: new Date().toISOString() })
        .where(eq(activitySlots.id, slotRecord.id));

      await db
        .update(watchItems)
        .set({ status: "fulfilled", updatedAt: new Date().toISOString() })
        .where(eq(watchItems.id, item.id));

      // Notification
      await db.insert(notifications).values({
        type: "booking_success",
        title: `Booked: ${item.activityName}`,
        body: `Confirmation: ${result.confirmationCode} | Charged: $${amountCharged.toFixed(2)}`,
        relatedId: booking.id,
      });

      // Get card label for email
      const profile = await db.query.paymentProfiles.findFirst({
        where: eq(
          (await import("@/lib/db/schema")).paymentProfiles.id,
          paymentInfo.profileId
        ),
      });

      // Send email
      const emailSent = await sendBookingConfirmation({
        platform: adapter.displayName,
        activityName: item.activityName,
        date: slot.slotDate,
        confirmationCode: result.confirmationCode || "N/A",
        amountCharged,
        cardLabel: profile?.label || "Unknown card",
      });

      if (emailSent) {
        await db
          .update(bookings)
          .set({ confirmationSent: true })
          .where(eq(bookings.id, booking.id));
      }

      statusEmitter.emit({
        type: "booking",
        platform,
        message: `BOOKED! "${item.activityName}" on ${slot.slotDate} — $${amountCharged.toFixed(2)} charged`,
        data: { bookingId: booking.id, confirmationCode: result.confirmationCode },
      });
    } else {
      // Booking failed
      await db
        .update(activitySlots)
        .set({ status: "failed" })
        .where(eq(activitySlots.id, slotRecord.id));

      await db.insert(notifications).values({
        type: "booking_failed",
        title: `Failed: ${item.activityName}`,
        body: result.error,
        relatedId: item.id,
      });

      statusEmitter.emit({
        type: "error",
        platform,
        message: `Booking failed for "${item.activityName}": ${result.error}`,
      });
    }
  }

  private async updateDbState(status: AgentStatus): Promise<void> {
    const now = new Date().toISOString();
    db.update(agentState)
      .set({
        status,
        ...(status === "running" ? { startedAt: now } : {}),
      })
      .where(eq(agentState.id, 1))
      .run();
  }
}

// Singleton
export const bookingAgent = new BookingAgent();
