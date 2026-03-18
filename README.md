# BC Family Booking Agent

**"It's booked. Go pack the tent."**

A visual dashboard that watches BC Parks, Buntzen Lake, and Tri-Cities rec systems and automatically books and pays for spots the moment they open up — with full spending controls and no bank account required.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set your encryption key (generate a random 64-char hex string)
# Edit .env.local and set VAULT_MASTER_KEY

# Initialize the database
pnpm db:push

# Start the app
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Setup Checklist

1. **Settings page** — Add your login credentials for each platform (encrypted at rest)
2. **Payments page** — Add a KOHO prepaid Visa card, set per-booking and monthly spending caps
3. **Watch List page** — Add activities you want the agent to monitor
4. **Dashboard** — Click "Start Watching" and let the agent do its thing

## Features

- **Watch List Builder** — Add activities, preferred dates, party size, and site preferences
- **Platform Toggles** — BC Parks, Buntzen Lake (BC Hydro), PoCo Parks & Rec, Coquitlam Parks & Rec
- **Live Status Feed** — Real-time WebSocket updates showing what the agent is doing
- **Payment Profiles** — Store prepaid/virtual cards, assign to platforms, set per-booking caps
- **Spending Guardrails** — Per-transaction limit AND monthly ceiling across all bookings
- **Credentials Vault** — AES-256-GCM encrypted platform logins
- **Email Confirmation** — Get notified the moment a booking succeeds with amount charged
- **Booking History** — Full record of every booking, payment, and confirmation code
- **Pause/Resume** — Stop the agent instantly when your calendar is full

## Recommended Payment Setup

Use a [KOHO](https://www.koho.ca) prepaid Visa — Canadian, no bank link needed, reloadable, works on all target platforms. Load $200, set a $60 per-booking cap, and walk away.

## Tech Stack

- **Frontend + API**: Next.js 15 (App Router)
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Browser Automation**: Playwright (headless)
- **Real-time**: WebSocket (ws)
- **Encryption**: AES-256-GCM (node:crypto)
- **Email**: Nodemailer
- **Styling**: Tailwind CSS

## Architecture

```
src/
  app/           — Next.js pages + API routes
  lib/
    agent/       — Booking agent orchestrator + scheduler
    platforms/   — Platform adapters (BC Parks, Buntzen, PoCo, Coquitlam)
    payments/    — Spending guard + payment routing
    crypto/      — AES-256-GCM encryption vault
    db/          — Drizzle ORM schema + SQLite connection
    notifications/ — Email confirmation sender
    ws/          — WebSocket status emitter
  components/    — React UI components
  hooks/         — Client-side WebSocket hook
server.ts        — Custom Node.js server (Next.js + WebSocket)
```
