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

// Initialize agent_state singleton row if not exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS agent_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'stopped',
    started_at TEXT,
    last_check_at TEXT,
    checks_count INTEGER NOT NULL DEFAULT 0
  );
  INSERT OR IGNORE INTO agent_state (id, status, checks_count) VALUES (1, 'stopped', 0);
`);
