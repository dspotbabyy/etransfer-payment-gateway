-- Migration: 2025_03_multi_bank.sql
-- Description: Add bank_slug column to email_aliases table for multi-bank support

-- Add bank_slug column to email_aliases table
ALTER TABLE email_aliases ADD COLUMN bank_slug TEXT DEFAULT 'bank1';

-- Create index for better performance on bank_slug queries
CREATE INDEX IF NOT EXISTS idx_email_aliases_bank_slug ON email_aliases(bank_slug);

-- Create index for rotation queries (weight, last_used_at, active)
CREATE INDEX IF NOT EXISTS idx_email_aliases_rotation ON email_aliases(active, weight DESC, last_used_at ASC);
