-- Migration: 2025_01_instructions_sqlite.sql
-- Description: Create email_aliases, payment_instructions, and payment_events tables (SQLite version)

-- Email aliases table for bank account email aliases
CREATE TABLE IF NOT EXISTS email_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_account_id INTEGER,
  alias_email TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  weight INTEGER DEFAULT 1,
  cool_off_minutes INTEGER DEFAULT 20,
  daily_cap_cents INTEGER DEFAULT 25000000,
  daily_total_cents INTEGER DEFAULT 0,
  last_used_at TEXT
);

-- Payment instructions table for tracking e-transfer requests
CREATE TABLE IF NOT EXISTS payment_instructions (
  id TEXT PRIMARY KEY,
  order_id INTEGER,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'CAD',
  payer_handle TEXT,
  recipient_alias TEXT,
  bank_slug TEXT,
  instruction_code TEXT,
  request_ref TEXT,
  status TEXT DEFAULT 'waiting',
  resend_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Payment events table for tracking email notifications and status updates
CREATE TABLE IF NOT EXISTS payment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instruction_id TEXT,
  source TEXT,
  parsed_amount_cents INTEGER,
  payer_handle TEXT,
  recipient_alias TEXT,
  request_ref TEXT,
  status TEXT,
  raw_email TEXT,
  received_at TEXT DEFAULT CURRENT_TIMESTAMP
);
