-- Migration: Add updated_at column to waitlist table
-- This column is referenced in update queries but was missing from the schema.

ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Backfill existing rows with created_at value
UPDATE waitlist SET updated_at = created_at WHERE updated_at IS NULL;

SELECT 'Migration completed: updated_at column added to waitlist table' AS result;
