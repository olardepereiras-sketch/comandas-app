import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';

export const checkWaitlistProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[WAITLIST] Verificando lista de espera para:', input.restaurantId, input.date);

    try {
      const waitlistResult = await ctx.db.query(
        `SELECT w.*, r.name as restaurant_name
         FROM waitlist w
         JOIN restaurants r ON r.id = w.restaurant_id
         WHERE w.restaurant_id = $1 AND w.date = $2 AND w.status = 'waiting'
         ORDER BY w.created_at ASC
         LIMIT 1`,
        [input.restaurantId, input.date]
      );

      if (waitlistResult.rows.length === 0) {
        return { notified: false, message: 'No hay entradas en lista de espera' };
      }

      const entry = waitlistResult.rows[0];
      const restaurantName = (entry.restaurant_name as string) || 'El restaurante';

      const dateObj = new Date(entry.date + 'T12:00:00');
      const dateDisplay = dateObj.toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long',
      });

      const message = `🔔 *Lista de espera - ${restaurantName}*\n\n¡Hay disponibilidad para tu solicitud!\n\n📅 ${dateDisplay}\n👥 ${entry.guests} comensales\n\nTienes 15 minutos para confirmar tu reserva. Entra en el restaurante y haz tu reserva ahora.`;

      const notifQueue = new WhatsAppNotificationQueue(ctx.db);
      await notifQueue.scheduleNotification({
        restaurantId: input.restaurantId,
        reservationId: `waitlist-${entry.id as string}`,
        recipientPhone: entry.client_phone as string,
        recipientName: entry.client_name as string,
        message,
        notificationType: 'waitlist_available',
        scheduledFor: new Date(),
      });

      await ctx.db.query(
        `UPDATE waitlist SET notification_count = notification_count + 1, last_notified_at = NOW() WHERE id = $1`,
        [entry.id]
      );

      console.log('[WAITLIST] Notificación programada para:', entry.client_phone);
      return { notified: true, clientPhone: entry.client_phone as string, clientName: entry.client_name as string };
    } catch (err) {
      console.error('[WAITLIST] Error al verificar lista:', err);
      return { notified: false, message: 'Error al procesar lista de espera' };
    }
  });
