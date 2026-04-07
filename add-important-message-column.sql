-- Add important_message columns to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS important_message_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS important_message TEXT DEFAULT '';
