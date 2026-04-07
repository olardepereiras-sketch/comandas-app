-- Migration: Add image_orientation to digital_menus
ALTER TABLE digital_menus ADD COLUMN IF NOT EXISTS image_orientation TEXT NOT NULL DEFAULT 'horizontal';
