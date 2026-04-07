import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';

let lastNotificationCheckTime: { [restaurantId: string]: number } = {};
const NOTIFICATION_CHECK_INTERVAL_MS = 30000;

export const listReservationsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string().optional(),
      month: z.number().optional(),
      year: z.number().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    let query = `
      SELECT 
        r.*,
        to_char(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_utc,
        c.name as client_name,
        c.phone as client_phone,
        c.rating as client_rating,
        c.is_vip as client_is_vip,
        c.preferred_table_ids as client_preferred_table_ids,
        tl.name as location_name
      FROM reservations r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN table_locations tl ON r.location_id = tl.id
      WHERE r.restaurant_id = $1
    `;
    
    const params: any[] = [input.restaurantId];
    
    if (input.date) {
      let dateOnly: string;
      if (input.date.includes('T')) {
        const inputDate = new Date(input.date);
        const year = inputDate.getFullYear();
        const month = String(inputDate.getMonth() + 1).padStart(2, '0');
        const day = String(inputDate.getDate()).padStart(2, '0');
        dateOnly = `${year}-${month}-${day}`;
      } else {
        dateOnly = input.date;
      }
      query += ` AND DATE(r.date) = $2`;
      params.push(dateOnly);
    } else if (input.month && input.year) {
      query += ` AND EXTRACT(MONTH FROM r.date) = $2 AND EXTRACT(YEAR FROM r.date) = $3`;
      params.push(input.month, input.year);
    }
    
    query += ` ORDER BY r.date DESC, r.time DESC`;
    
    const result = await ctx.db.query(query, params);
    
    // Obtener nombres de mesas para cada reserva
    const reservationsWithTables = await Promise.all(
      result.rows.map(async (row: any) => {
        let dateValue = row.date;
        if (row.date instanceof Date) {
          const year = row.date.getFullYear();
          const month = String(row.date.getMonth() + 1).padStart(2, '0');
          const day = String(row.date.getDate()).padStart(2, '0');
          dateValue = `${year}-${month}-${day}`;
        } else if (typeof row.date === 'string' && row.date.includes('T')) {
          dateValue = row.date.split('T')[0];
        }
        
        // Obtener nombres de mesas
        let tableNames: string[] = [];
        const tableIds = typeof row.table_ids === 'string' ? JSON.parse(row.table_ids) : row.table_ids;
        if (tableIds && Array.isArray(tableIds) && tableIds.length > 0) {
          const tablesResult = await ctx.db.query(
            'SELECT name FROM tables WHERE id = ANY($1)',
            [tableIds]
          );
          tableNames = tablesResult.rows.map((t: any) => t.name);
        }
        
        let clientRatings = null;
        if (row.client_ratings) {
          try {
            clientRatings = typeof row.client_ratings === 'string' 
              ? JSON.parse(row.client_ratings) 
              : row.client_ratings;
          } catch (e) {
            console.error('Error parsing client_ratings:', e);
          }
        }
        
        const isVip = Boolean(row.client_is_vip);
        let isVipTable = false;
        
        if (isVip && row.client_preferred_table_ids && tableIds && Array.isArray(tableIds)) {
          try {
            const preferredTableIds = typeof row.client_preferred_table_ids === 'string' 
              ? JSON.parse(row.client_preferred_table_ids) 
              : row.client_preferred_table_ids;
            
            if (Array.isArray(preferredTableIds)) {
              isVipTable = tableIds.some((tableId: string) => preferredTableIds.includes(tableId));
            }
          } catch (e) {
            console.error('Error parsing preferred_table_ids:', e);
          }
        }
        
        return {
          id: row.id,
          restaurantId: row.restaurant_id,
          clientId: row.client_id,
          clientName: row.client_name,
          clientPhone: row.client_phone,
          clientRating: row.client_rating != null ? Number(row.client_rating) : null,
          isVip,
          isVipTable,
          date: dateValue,
          time: typeof row.time === 'string' ? JSON.parse(row.time) : row.time,
          guests: row.guests,
          locationId: row.location_id,
          locationName: row.location_name,
          tableIds,
          tableNames,
          needsHighChair: row.needs_high_chair,
          highChairCount: row.high_chair_count || 0,
          needsStroller: row.needs_stroller,
          hasPets: row.has_pets,
          status: row.status,
          notes: row.notes,
          clientNotes: row.client_notes || null,
          internalNotes: row.internal_notes || null,
          clientRated: Boolean(row.client_rated),
          clientRatings,
          wasNoShow: Boolean(row.was_no_show),
          confirmationToken: row.confirmation_token,
          cancelledBy: row.cancelled_by,
          createdAt: row.created_at_utc || (row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at),
          updatedAt: row.updated_at,
        };
      })
    );
    
    const now = Date.now();
    const lastCheck = lastNotificationCheckTime[input.restaurantId] || 0;
    if (now - lastCheck > NOTIFICATION_CHECK_INTERVAL_MS) {
      lastNotificationCheckTime[input.restaurantId] = now;
      
      void (async () => {
        try {
          const pendingResult = await ctx.db.query(
            `SELECT * FROM whatsapp_notifications 
             WHERE restaurant_id = $1 
             AND status = 'pending' 
             AND scheduled_for <= NOW()
             AND (last_attempt_at IS NULL OR last_attempt_at < NOW() - INTERVAL '30 seconds')
             ORDER BY created_at ASC
             LIMIT 3`,
            [input.restaurantId]
          );
          
          if (pendingResult.rows.length > 0) {
            console.log(`[LIST RETRY] 📨 ${pendingResult.rows.length} notificaciones pendientes encontradas para ${input.restaurantId}`);
            const notificationQueue = new WhatsAppNotificationQueue(ctx.db);
            
            for (const row of pendingResult.rows) {
              const notification = {
                id: row.id,
                restaurantId: row.restaurant_id,
                reservationId: row.reservation_id,
                recipientPhone: row.recipient_phone,
                recipientName: row.recipient_name,
                message: row.message,
                notificationType: row.notification_type,
                scheduledFor: new Date(row.scheduled_for),
                status: row.status as 'pending' | 'sent' | 'failed',
                attempts: row.attempts,
                lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : undefined,
                errorMessage: row.error_message,
                sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
                createdAt: new Date(row.created_at),
              };
              
              try {
                await notificationQueue.processNotification(notification);
                await new Promise(resolve => setTimeout(resolve, 1500));
              } catch (err) {
                console.error(`[LIST RETRY] Error procesando notificación ${notification.id}:`, err);
              }
            }
          }
        } catch (err) {
          console.error('[LIST RETRY] Error en chequeo de notificaciones:', err);
        }
      })();
    }

    return reservationsWithTables;
  });
