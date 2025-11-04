-- Migration: 2025_04_add_merchant_email.sql
-- Description: Add merchant_email column to orders table for direct merchant email storage

-- Add merchant_email column to orders table
ALTER TABLE orders ADD COLUMN merchant_email TEXT;

-- Create index for better performance on merchant_email queries
CREATE INDEX IF NOT EXISTS idx_orders_merchant_email ON orders(merchant_email);

