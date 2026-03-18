import { chromium, type BrowserContext } from "playwright";
import type { PlatformAdapter, AvailableSlot, WatchCriteria } from "./types";
import type { DecryptedCredentials, DecryptedCard, BookingResult } from "@/types";

const BASE_URL = "https://buntzenlake.ca";

export class BuntzenLakeAdapter implements PlatformAdapter {
  readonly platformKey = "buntzen_lake" as const;
  readonly displayName = "Buntzen Lake (BC Hydro)";
  readonly pollIntervalMs = 25_000;

  async login(credentials: DecryptedCredentials): Promise<BrowserContext> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

    await page.fill('input[name="email"], input[type="email"]', credentials.username);
    await page.fill('input[name="password"], input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');
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
      for (const date of criteria.preferredDates) {
        await page.goto(`${BASE_URL}/reservations`, {
          waitUntil: "networkidle",
        });

        // Select date
        const dateInput = page.locator(
          'input[type="date"], input[name*="date"]'
        );
        if (await dateInput.isVisible()) {
          await dateInput.fill(date);
          await page.waitForTimeout(1500);
        }

        // Set party size
        const sizeInput = page.locator(
          'input[name*="guest"], select[name*="guest"], input[name*="size"]'
        );
        if (await sizeInput.isVisible()) {
          await sizeInput.fill(String(criteria.partySize));
        }

        // Search
        const searchBtn = page.locator(
          'button:text("Search"), button:text("Check"), button[type="submit"]'
        );
        if (await searchBtn.isVisible()) {
          await searchBtn.click();
          await page.waitForTimeout(2000);
        }

        // Find available passes
        const available = page.locator(
          '.available, [data-available="true"], .pass-available'
        );
        const count = await available.count();

        for (let i = 0; i < count; i++) {
          const item = available.nth(i);
          const text = (await item.textContent()) || "";
          const priceMatch = text.match(/\$(\d+\.?\d*)/);

          slots.push({
            slotDate: date,
            slotIdentifier: `buntzen-pass-${date}`,
            price: priceMatch ? parseFloat(priceMatch[1]) : undefined,
            description: `Buntzen Lake Day Pass - ${date} - Party of ${criteria.partySize}`,
          });
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
    partySize: number
  ): Promise<BookingResult> {
    const page = await ctx.newPage();

    try {
      await page.goto(`${BASE_URL}/reservations`, {
        waitUntil: "networkidle",
      });

      // Select the slot date and book
      const dateInput = page.locator('input[type="date"], input[name*="date"]');
      await dateInput.fill(slot.slotDate);
      await page.waitForTimeout(1000);

      // Set party size
      const sizeInput = page.locator('input[name*="guest"], input[name*="size"]');
      if (await sizeInput.isVisible()) {
        await sizeInput.fill(String(partySize));
      }

      // Click book/reserve
      const bookBtn = page.locator(
        'button:text("Reserve"), button:text("Book"), button:text("Add")'
      );
      await bookBtn.first().click();
      await page.waitForTimeout(2000);

      // Payment
      await page.fill('input[name*="card"], input[name*="number"]', payment.cardNumber);
      await page.fill('input[name*="expir"]', payment.expiry);
      await page.fill('input[name*="cvv"], input[name*="cvc"]', payment.cvv);
      await page.fill('input[name*="name"]', payment.cardholder);

      const payBtn = page.locator('button:text("Pay"), button[type="submit"]');
      await payBtn.first().click();
      await page.waitForTimeout(5000);

      const confirmation = page.locator(
        '.confirmation, .booking-number, .reference'
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
      await page.goto(`${BASE_URL}/account`, { waitUntil: "networkidle" });
      return !page.url().includes("login");
    } finally {
      await page.close();
    }
  }
}
