import { chromium, type BrowserContext } from "playwright";
import type { PlatformAdapter, AvailableSlot, WatchCriteria } from "./types";
import type { DecryptedCredentials, DecryptedCard, BookingResult } from "@/types";

const BASE_URL = "https://camping.bcparks.ca";

export class BCParksAdapter implements PlatformAdapter {
  readonly platformKey = "bc_parks" as const;
  readonly displayName = "BC Parks (Discover Camping)";
  readonly pollIntervalMs = 55_000; // ~55s with jitter added by scheduler

  async login(credentials: DecryptedCredentials): Promise<BrowserContext> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/create-account/login`, {
      waitUntil: "networkidle",
    });

    await page.fill('input[name="email"], input[type="email"]', credentials.username);
    await page.fill('input[name="password"], input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/account/**", { timeout: 15_000 });

    return context;
  }

  async checkAvailability(
    ctx: BrowserContext,
    criteria: WatchCriteria
  ): Promise<AvailableSlot[]> {
    const page = await ctx.newPage();
    const slots: AvailableSlot[] = [];

    try {
      // Navigate to the park/facility search
      await page.goto(`${BASE_URL}/create-booking/results`, {
        waitUntil: "networkidle",
      });

      // Search for the activity by name
      const searchInput = page.locator('input[placeholder*="Search"], input[name*="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(criteria.activityName);
        await page.waitForTimeout(1500); // Wait for search results
      }

      // Check each preferred date
      for (const date of criteria.preferredDates) {
        // Navigate to the date — BC Parks uses a calendar picker
        const dateParam = new Date(date).toISOString().split("T")[0];
        await page.goto(
          `${BASE_URL}/create-booking/results?date=${dateParam}&nights=1`,
          { waitUntil: "networkidle" }
        );

        // Look for available sites
        const availableSites = page.locator(
          '.site-available, [data-status="available"], .availability-cell.available'
        );
        const count = await availableSites.count();

        for (let i = 0; i < count; i++) {
          const site = availableSites.nth(i);
          const siteId =
            (await site.getAttribute("data-site-id")) ||
            (await site.textContent()) ||
            `site-${i}`;
          const priceText = await site
            .locator(".price, .site-fee")
            .textContent()
            .catch(() => null);
          const price = priceText
            ? parseFloat(priceText.replace(/[^0-9.]/g, ""))
            : undefined;

          slots.push({
            slotDate: date,
            slotIdentifier: siteId.trim(),
            price,
            description: `${criteria.activityName} - ${siteId.trim()} on ${date}`,
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
      // Navigate to the slot and add to cart
      await page.goto(
        `${BASE_URL}/create-booking/results?date=${slot.slotDate}`,
        { waitUntil: "networkidle" }
      );

      // Click on the specific site
      const siteButton = page.locator(
        `[data-site-id="${slot.slotIdentifier}"], :text("${slot.slotIdentifier}")`
      );
      await siteButton.first().click();
      await page.waitForTimeout(1000);

      // Set party size if applicable
      const partySizeInput = page.locator(
        'input[name*="party"], input[name*="occupant"], input[name*="guest"]'
      );
      if (await partySizeInput.isVisible()) {
        await partySizeInput.fill(String(partySize));
      }

      // Proceed to checkout
      const bookButton = page.locator(
        'button:text("Book"), button:text("Add to Cart"), button:text("Continue")'
      );
      await bookButton.first().click();
      await page.waitForTimeout(2000);

      // Navigate to checkout/payment
      const checkoutButton = page.locator(
        'button:text("Checkout"), a:text("Checkout"), button:text("Pay")'
      );
      if (await checkoutButton.isVisible()) {
        await checkoutButton.click();
        await page.waitForTimeout(2000);
      }

      // Fill payment details
      const cardFrame = page.frameLocator("iframe").first();
      const cardInput =
        cardFrame.locator('input[name*="card"], input[name*="number"]');

      if (await cardInput.isVisible({ timeout: 5000 })) {
        await cardInput.fill(payment.cardNumber);
        await cardFrame
          .locator('input[name*="expir"]')
          .fill(payment.expiry);
        await cardFrame
          .locator('input[name*="cvv"], input[name*="cvc"]')
          .fill(payment.cvv);
        await cardFrame
          .locator('input[name*="name"]')
          .fill(payment.cardholder);
      } else {
        // Try direct form fields
        await page.fill('input[name*="card"], input[name*="number"]', payment.cardNumber);
        await page.fill('input[name*="expir"]', payment.expiry);
        await page.fill('input[name*="cvv"], input[name*="cvc"]', payment.cvv);
      }

      // Submit payment
      const payButton = page.locator(
        'button:text("Pay"), button:text("Complete"), button[type="submit"]'
      );
      await payButton.first().click();
      await page.waitForTimeout(5000);

      // Look for confirmation
      const confirmation = page.locator(
        '.confirmation-number, .booking-id, [data-testid="confirmation"]'
      );
      const confirmationCode = await confirmation
        .textContent({ timeout: 10_000 })
        .catch(() => null);

      return {
        success: true,
        confirmationCode: confirmationCode?.trim() || "PENDING",
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
      // If redirected to login, session is expired
      return !page.url().includes("login");
    } finally {
      await page.close();
    }
  }
}
