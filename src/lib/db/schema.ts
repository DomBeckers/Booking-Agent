import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
};

export const credentials = sqliteTable("credentials", {
  id: id(),
  platform: text("platform").notNull(), // bc_parks | buntzen_lake | poco_rec | coquitlam_rec
  usernameEnc: blob("username_enc", { mode: "buffer" }).notNull(),
  passwordEnc: blob("password_enc", { mode: "buffer" }).notNull(),
  iv: blob("iv", { mode: "buffer" }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const paymentProfiles = sqliteTable("payment_profiles", {
  id: id(),
  label: text("label").notNull(),
  cardNumberEnc: blob("card_number_enc", { mode: "buffer" }).notNull(),
  expiryEnc: blob("expiry_enc", { mode: "buffer" }).notNull(),
  cvvEnc: blob("cvv_enc", { mode: "buffer" }).notNull(),
  cardholderEnc: blob("cardholder_enc", { mode: "buffer" }).notNull(),
  iv: blob("iv", { mode: "buffer" }).notNull(),
  maxPerTx: real("max_per_tx"),
  monthlyCeiling: real("monthly_ceiling"),
  assignedPlatforms: text("assigned_platforms").notNull().default("[]"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const watchItems = sqliteTable("watch_items", {
  id: id(),
  platform: text("platform").notNull(),
  activityType: text("activity_type").notNull(),
  activityName: text("activity_name").notNull(),
  preferredDates: text("preferred_dates").notNull().default("[]"),
  partySize: integer("party_size").notNull().default(1),
  sitePrefs: text("site_prefs").notNull().default("{}"),
  priority: integer("priority").notNull().default(5),
  paymentProfileId: text("payment_profile_id").references(
    () => paymentProfiles.id
  ),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

export const activitySlots = sqliteTable("activity_slots", {
  id: id(),
  watchItemId: text("watch_item_id")
    .notNull()
    .references(() => watchItems.id),
  platform: text("platform").notNull(),
  slotDate: text("slot_date").notNull(),
  slotTime: text("slot_time"),
  slotIdentifier: text("slot_identifier").notNull(),
  price: real("price"),
  status: text("status").notNull().default("found"),
  foundAt: text("found_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  bookedAt: text("booked_at"),
});

export const bookings = sqliteTable("bookings", {
  id: id(),
  watchItemId: text("watch_item_id")
    .notNull()
    .references(() => watchItems.id),
  activitySlotId: text("activity_slot_id")
    .notNull()
    .references(() => activitySlots.id),
  platform: text("platform").notNull(),
  confirmationCode: text("confirmation_code"),
  amountCharged: real("amount_charged").notNull(),
  paymentProfileId: text("payment_profile_id")
    .notNull()
    .references(() => paymentProfiles.id),
  status: text("status").notNull().default("confirmed"),
  bookedAt: text("booked_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  confirmationSent: integer("confirmation_sent", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const notifications = sqliteTable("notifications", {
  id: id(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  relatedId: text("related_id"),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const spendingLedger = sqliteTable("spending_ledger", {
  id: id(),
  paymentProfileId: text("payment_profile_id")
    .notNull()
    .references(() => paymentProfiles.id),
  bookingId: text("booking_id").references(() => bookings.id),
  amount: real("amount").notNull(),
  month: text("month").notNull(), // '2026-03'
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const agentState = sqliteTable("agent_state", {
  id: integer("id").primaryKey().default(1),
  status: text("status").notNull().default("stopped"),
  startedAt: text("started_at"),
  lastCheckAt: text("last_check_at"),
  checksCount: integer("checks_count").notNull().default(0),
});
