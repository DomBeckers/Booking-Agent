import { chromium, type BrowserContext } from "playwright";
import type { PlatformAdapter, AvailableSlot, WatchCriteria } from "./types";
import type { DecryptedCredentials, DecryptedCard, BookingResult } from "@/types";

// PoCo Parks & Rec uses PerfectMind
const BASE_URL = "https://cityofpoco.perfectmind.com";

export class PocoRecAdapter implements PlatformAdapter {
  readonly platformKey = "poco_rec" as const;
  readonly displayName = "PoCo Parks & Rec";
  readonly pollIntervalMs = 35_000;

  async login(credentials: DecryptedCredentials): Promise<BrowserContext> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/24aboron/Ede/Login`, {
      waitUntil: "networkidle",
    });

    await page.fill("#login_Email, #txtLogin", credentials.username);
    await page.fill("#login_Password, #txtPassword", credentials.password);
    await page.click("#btnLogin, button[type='submit']");
    await page.waitForTimeout(3000);

    return context;
  }

  async checkAvailability(
    ctx: BrowserContext,
    criteria: WatchCriteria
  ): Promise<AvailableSlot[]> {
    const page = await ctx.newPage();
    const slots: AvailableSlot[] = [];

    try {
      await page.goto(`${BASE_URL}/24aboron/Ede/BookMe4LandingPages/Courses`, {
        waitUntil: "networkidle",
      });

      // Search for the activity
      const searchInput = page.locator(
        'input[name*="search"], input[placeholder*="Search"]'
      );
      if (await searchInput.isVisible()) {
        await searchInput.fill(criteria.activityName);
        await page.waitForTimeout(2000);
      }

      // Look for available sessions on preferred dates
      for (const date of criteria.preferredDates) {
        const dateStr = new Date(date).toLocaleDateString("en-CA");
        const available = page.locator(
          `.course-item:has-text("${dateStr}"), .schedule-item:has-text("${dateStr}")`
        );
        const count = await available.count();

        for (let i = 0; i < count; i++) {
          const item = available.nth(i);
          const text = (await item.textContent()) || "";
          const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
          const priceMatch = text.match(/\$(\d+\.?\d*)/);

          if (!text.toLowerCase().includes("full") && !text.toLowerCase().includes("waitlist")) {
            slots.push({
              slotDate: date,
              slotTime: timeMatch ? timeMatch[1] : undefined,
              slotIdentifier: `poco-${criteria.activityType}-${date}-${i}`,
              price: priceMatch ? parseFloat(priceMatch[1]) : undefined,
              description: `${criteria.activityName} - ${date}${timeMatch ? ` at ${timeMatch[1]}` : ""}`,
            });
          }
        }
      }
    } finally {
      await page.close();
    }

    return slots;
  }

  async bookSlot(
    ctx: BrowserContext,
    slot: AvailableSlot,
    payment: DecryptedCard,
    _partySize: number
  ): Promise<BookingResult> {
    const page = await ctx.newPage();

    try {
      // PerfectMind booking flow
      await page.goto(`${BASE_URL}/24adoron/Ede/BookMe4LandingPages/Courses`, {
        waitUntil: "networkidle",
      });

      // Click enroll/register on the matching slot
      const enrollBtn = page.locator(
        `button:text("Enroll"), button:text("Register"), a:text("Register")`
      );
      await enrollBtn.first().click();
      await page.waitForTimeout(2000);

      // Proceed through checkout
      const continueBtn = page.locator(
        'button:text("Continue"), button:text("Next"), button:text("Proceed")'
      );
      await continueBtn.first().click();
      await page.waitForTimeout(2000);

      // Payment
      await page.fill('input[name*="card"], #txtCardNumber', payment.cardNumber);
      await page.fill('input[name*="expir"], #txtExpiry', payment.expiry);
      await page.fill('input[name*="cvv"], #txtCVV', payment.cvv);

      const payBtn = page.locator(
        'button:text("Pay"), button:text("Submit"), button:text("Complete")'
      );
      await payBtn.first().click();
      await page.waitForTimeout(5000);

      const confirmation = page.locator(
        '.confirmation, .receipt-number, .order-number'
      );
      const code = await confirmation
        .textContent({ timeout: 10_000 })
        .catch(() => null);

      return {
        success: true,
        confirmationCode: code?.trim() || "PENDING",
        amountCharged: slot.price,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Booking failed",
      };
    } finally {
      await page.close();
    }
  }

  async isSessionValid(ctx: BrowserContext): Promise<boolean> {
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE_URL}/24adoron/Ede/Home`, {
        waitUntil: "networkidle",
      });
      return !page.url().includes("Login");
    } finally {
      await page.close();
    }
  }
}
