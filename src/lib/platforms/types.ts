import type { BrowserContext } from "playwright";
import type {
  Platform,
  DecryptedCredentials,
  DecryptedCard,
  BookingResult,
} from "@/types";

export interface AvailableSlot {
  slotDate: string;
  slotTime?: string;
  slotIdentifier: string;
  price?: number;
  description?: string;
}

export interface WatchCriteria {
  activityType: string;
  activityName: string;
  preferredDates: string[];
  partySize: number;
  sitePrefs: Record<string, unknown>;
}

export interface PlatformAdapter {
  readonly platformKey: Platform;
  readonly displayName: string;
  readonly pollIntervalMs: number;

  /** Create an authenticated browser context */
  login(credentials: DecryptedCredentials): Promise<BrowserContext>;

  /** Check for available slots matching the criteria */
  checkAvailability(
    ctx: BrowserContext,
    criteria: WatchCriteria
  ): Promise<AvailableSlot[]>;

  /** Book a specific slot and pay */
  bookSlot(
    ctx: BrowserContext,
    slot: AvailableSlot,
    payment: DecryptedCard,
    partySize: number
  ): Promise<BookingResult>;

  /** Check if the browser session is still valid */
  isSessionValid(ctx: BrowserContext): Promise<boolean>;
}
