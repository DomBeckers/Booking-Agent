import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "booking-agent.db");

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Auto-create all tables on startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    username_enc BLOB NOT NULL,
    password_enc BLOB NOT NULL,
    iv BLOB NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payment_profiles (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    card_number_enc BLOB NOT NULL,
    expiry_enc BLOB NOT NULL,
    cvv_enc BLOB NOT NULL,
    cardholder_enc BLOB NOT NULL,
    iv BLOB NOT NULL,
    max_per_tx REAL,
    monthly_ceiling REAL,
    assigned_platforms TEXT NOT NULL DEFAULT '[]',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS watch_items (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    preferred_dates TEXT NOT NULL DEFAULT '[]',
    party_size INTEGER NOT NULL DEFAULT 1,
    site_prefs TEXT NOT NULL DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 5,
    payment_profile_id TEXT REFERENCES payment_profiles(id),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_slots (
    id TEXT PRIMARY KEY,
    watch_item_id TEXT NOT NULL REFERENCES watch_items(id),
    platform TEXT NOT NULL,
    slot_date TEXT NOT NULL,
    slot_time TEXT,
    slot_identifier TEXT NOT NULL,
    price REAL,
    status TEXT NOT NULL DEFAULT 'found',
    found_at TEXT NOT NULL DEFAULT (datetime('now')),
    booked_at TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    watch_item_id TEXT NOT NULL REFERENCES watch_items(id),
    activity_slot_id TEXT NOT NULL REFERENCES activity_slots(id),
    platform TEXT NOT NULL,
    confirmation_code TEXT,
    amount_charged REAL NOT NULL,
    payment_profile_id TEXT NOT NULL REFERENCES payment_profiles(id),
    status TEXT NOT NULL DEFAULT 'confirmed',
    booked_at TEXT NOT NULL DEFAULT (datetime('now')),
    confirmation_sent INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    related_id TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS spending_ledger (
    id TEXT PRIMARY KEY,
    payment_profile_id TEXT NOT NULL REFERENCES payment_profiles(id),
    booking_id TEXT REFERENCES bookings(id),
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agent_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'stopped',
    started_at TEXT,
    last_check_at TEXT,
    checks_count INTEGER NOT NULL DEFAULT 0
  );

  INSERT OR IGNORE INTO agent_state (id, status, checks_count) VALUES (1, 'stopped', 0);
`);
