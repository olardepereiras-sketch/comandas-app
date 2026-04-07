import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export const listWhatsAppNotificationsProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string().optional(),
    status: z.enum(['pending', 'processing', 'sent', 'failed', 'all']).optional().default('all'),
  }))
  .query(async ({ ctx, input }) => {
    console.log('📋 [WHATSAPP WORKER] Listando notificaciones:', input);

    try {
      let query = `
        SELECT n.*, r.name as restaurant_name 
        FROM whatsapp_notifications n
        LEFT JOIN restaurants r ON r.id = n.restaurant_id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (input.restaurantId) {
        query += ` AND n.restaurant_id = $${paramIndex}`;
        params.push(input.restaurantId);
        paramIndex++;
      }

      if (input.status && input.status !== 'all') {
        query += ` AND n.status = $${paramIndex}`;
        params.push(input.status);
        paramIndex++;
      }

      query += ` ORDER BY n.created_at ASC LIMIT 200`;

      const result = await ctx.db.query(query, params);

      console.log(`✅ [WHATSAPP WORKER] ${result.rows.length} notificaciones encontradas`);

      return result.rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurant_id,
        restaurantName: row.restaurant_name || 'Desconocido',
        reservationId: row.reservation_id,
        recipientPhone: row.recipient_phone,
        recipientName: row.recipient_name,
        message: row.message,
        notificationType: row.notification_type,
        scheduledFor: row.scheduled_for,
        status: row.status,
        attempts: row.attempts,
        lastAttemptAt: row.last_attempt_at,
        errorMessage: row.error_message,
        sentAt: row.sent_at,
        createdAt: row.created_at,
      }));
    } catch (error: any) {
      console.error('❌ [WHATSAPP WORKER] Error listando notificaciones:', error.message);
      throw error;
    }
  });
