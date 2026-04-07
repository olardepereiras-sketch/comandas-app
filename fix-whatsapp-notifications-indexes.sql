-- Fix whatsapp_notifications table: add missing indexes and fix status constraint

-- Drop CHECK constraint if exists (might block 'processing' status)
DO $$ 
BEGIN
  ALTER TABLE whatsapp_notifications DROP CONSTRAINT IF EXISTS whatsapp_notifications_status_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add composite index for the worker's main query (status + scheduled_for)
CREATE INDEX IF NOT EXISTS idx_whatsapp_notif_pending_scheduled 
ON whatsapp_notifications(status, scheduled_for) 
WHERE status = 'pending';

-- Add index on restaurant_id for filtered queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_notif_restaurant 
ON whatsapp_notifications(restaurant_id, status);

-- Add index on status alone
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status 
ON whatsapp_notifications(status);

-- Add index on last_attempt_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_notif_last_attempt 
ON whatsapp_notifications(last_attempt_at);

-- Reset any stuck 'processing' notifications back to pending
UPDATE whatsapp_notifications 
SET status = 'pending', scheduled_for = NOW() + INTERVAL '10 seconds'
WHERE status = 'processing' 
AND last_attempt_at < NOW() - INTERVAL '5 minutes';

-- VACUUM ANALYZE to update statistics after index creation
VACUUM ANALYZE whatsapp_notifications;
