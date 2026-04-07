-- Migration: Add is_active to menu_categories and dietary_preferences to menu_items

ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS dietary_preferences JSONB DEFAULT '[]'::jsonb;

UPDATE menu_categories SET is_active = TRUE WHERE is_active IS NULL;
UPDATE menu_items SET dietary_preferences = '[]'::jsonb WHERE dietary_preferences IS NULL;
