import { chromium, type BrowserContext } from "playwright";
import type { PlatformAdapter, AvailableSlot, WatchCriteria } from "./types";
import type { DecryptedCredentials, DecryptedCard, BookingResult } from "@/types";

// Coquitlam uses ActiveNet
const BASE_URL = "https://anc.ca.apm.activecommunities.com/coquitlam";

export class CoquitlamRecAdapter implements PlatformAdapter {
  readonly platformKey = "coquitlam_rec" as const;
  readonly displayName = "Coquitlam Parks & Rec";
  readonly pollIntervalMs = 35_000;

  async login(credentials: DecryptedCredentials): Promise<BrowserContext> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/signin`, { waitUntil: "networkidle" });

    await page.fill('input[name="email"], #Email', credentials.username);
    await page.fill('input[name="password"], #Password', credentials.password);
    await page.click('button[type="submit"], #btnSignIn');
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
      await page.goto(`${BASE_URL}/activity/search`, {
        waitUntil: "networkidle",
      });

      // Search for activity
      const searchInput = page.locator(
        'input[name*="keyword"], input[placeholder*="Search"]'
      );
      if (await searchInput.isVisible()) {
        await searchInput.fill(criteria.activityName);
        const searchBtn = page.locator(
          'button:text("Search"), button[type="submit"]'
        );
        await searchBtn.first().click();
        await page.waitForTimeout(2000);
      }

      // Find matching results
      for (const date of criteria.preferredDates) {
        const dateStr = new Date(date).toLocaleDateString("en-CA");
        const items = page.locator(
          `.activity-item, .search-result-item, .program-item`
        );
        const count = await items.count();

        for (let i = 0; i < count; i++) {
          const item = items.nth(i);
          const text = (await item.textContent()) || "";

          if (text.includes(dateStr) || text.includes(criteria.activityName)) {
            const priceMatch = text.match(/\$(\d+\.?\d*)/);
            const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);

            const hasSpace =
              !text.toLowerCase().includes("full") &&
              !text.toLowerCase().includes("sold out");

            if (hasSpace) {
              slots.push({
                slotDate: date,
                slotTime: timeMatch ? timeMatch[1] : undefined,
                slotIdentifier: `coq-${criteria.activityType}-${date}-${i}`,
                price: priceMatch ? parseFloat(priceMatch[1]) : undefined,
                description: `${criteria.activityName} - ${date}${timeMatch ? ` at ${timeMatch[1]}` : ""}`,
              });
            }
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
      // ActiveNet registration flow
      await page.goto(`${BASE_URL}/activity/search`, {
        waitUntil: "networkidle",
      });

      const registerBtn = page.locator(
        'button:text("Register"), a:text("Register"), button:text("Enroll")'
      );
      await registerBtn.first().click();
      await page.waitForTimeout(2000);

      // Add to cart and checkout
      const addToCartBtn = page.locator(
        'button:text("Add to Cart"), button:text("Add")'
      );
      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();
        await page.waitForTimeout(1000);
      }

      const checkoutBtn = page.locator(
        'button:text("Checkout"), a:text("Checkout")'
      );
      await checkoutBtn.first().click();
      await page.waitForTimeout(2000);

      // Payment form
      await page.fill('input[name*="card"], input[name*="number"]', payment.cardNumber);
      await page.fill('input[name*="expir"]', payment.expiry);
      await page.fill('input[name*="cvv"], input[name*="cvc"]', payment.cvv);
      await page.fill('input[name*="name"]', payment.cardholder);

      const payBtn = page.locator(
        'button:text("Pay"), button:text("Complete"), button[type="submit"]'
      );
      await payBtn.first().click();
      await page.waitForTimeout(5000);

      const confirmation = page.locator(
        '.confirmation, .receipt, .order-confirmation'
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
      await page.goto(`${BASE_URL}/home`, { waitUntil: "networkidle" });
      return !page.url().includes("signin");
    } finally {
      await page.close();
    }
  }
}
