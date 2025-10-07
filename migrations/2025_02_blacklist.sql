-- Migration: 2025_02_blacklist.sql
-- Description: Create blacklist table for risk management

-- Blacklist table for storing blocked emails, phones, and IP addresses
CREATE TABLE IF NOT EXISTS blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  phone TEXT,
  ip TEXT,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_blacklist_email ON blacklist(email);
CREATE INDEX IF NOT EXISTS idx_blacklist_phone ON blacklist(phone);
CREATE INDEX IF NOT EXISTS idx_blacklist_ip ON blacklist(ip);