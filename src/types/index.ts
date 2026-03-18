export type Platform = "bc_parks" | "buntzen_lake" | "poco_rec" | "coquitlam_rec";

export type ActivityType = "campsite" | "day_use" | "swim" | "skate" | "program";

export type WatchItemStatus = "active" | "paused" | "fulfilled" | "expired";

export type SlotStatus = "found" | "attempting" | "booked" | "failed" | "expired";

export type BookingStatus = "confirmed" | "cancelled" | "failed";

export type AgentStatus = "running" | "paused" | "stopped";

export type NotificationType =
  | "slot_found"
  | "booking_success"
  | "booking_failed"
  | "cap_reached"
  | "error";

export const PLATFORM_LABELS: Record<Platform, string> = {
  bc_parks: "BC Parks (Discover Camping)",
  buntzen_lake: "Buntzen Lake (BC Hydro)",
  poco_rec: "PoCo Parks & Rec",
  coquitlam_rec: "Coquitlam Parks & Rec",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  campsite: "Campsite",
  day_use: "Day Use Pass",
  swim: "Swimming",
  skate: "Skating",
  program: "Recreation Program",
};

export interface DecryptedCredentials {
  username: string;
  password: string;
}

export interface DecryptedCard {
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardholder: string;
}

export interface BookingResult {
  success: boolean;
  confirmationCode?: string;
  amountCharged?: number;
  error?: string;
}

export interface StatusEvent {
  type: "check" | "found" | "booking" | "error" | "agent_state";
  platform?: Platform;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}
