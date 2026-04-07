import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { sendWhatsAppViaRestaurant } from "../../../../services/whatsapp-web-manager";

export const sendWhatsAppNotificationProcedure = publicProcedure
  .input(z.object({
    notificationId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('📤 [WHATSAPP WORKER] Enviando notificación manualmente:', input.notificationId);

    try {
      const notifResult = await ctx.db.query(
        `SELECT * FROM whatsapp_notifications WHERE id = $1`,
        [input.notificationId]
      );

      if (notifResult.rows.length === 0) {
        return { success: false, message: 'Notificación no encontrada' };
      }

      const notification = notifResult.rows[0];

      console.log(`📤 [WHATSAPP WORKER] Enviando a ${notification.recipient_phone} (${notification.recipient_name})`);

      const result = await Promise.race([
        sendWhatsAppViaRestaurant(
          notification.restaurant_id,
          notification.recipient_phone,
          notification.message
        ),
        new Promise<{ success: boolean; error?: string }>((resolve) =>
          setTimeout(() => resolve({ success: false, error: 'Timeout después de 45s' }), 45000)
        )
      ]);

      if (result.success) {
        await ctx.db.query(
          `UPDATE whatsapp_notifications SET status = 'sent', sent_at = $1 WHERE id = $2`,
          [new Date(), input.notificationId]
        );
        console.log('✅ [WHATSAPP WORKER] Notificación enviada exitosamente:', input.notificationId);
        return { success: true, message: 'Notificación enviada correctamente' };
      } else {
        await ctx.db.query(
          `UPDATE whatsapp_notifications SET attempts = attempts + 1, last_attempt_at = $1, error_message = $2 WHERE id = $3`,
          [new Date(), result.error || 'Error desconocido', input.notificationId]
        );
        console.log('⚠️ [WHATSAPP WORKER] Error enviando:', result.error);
        return { success: false, message: result.error || 'Error al enviar la notificación' };
      }
    } catch (error: any) {
      console.error('❌ [WHATSAPP WORKER] Error enviando notificación:', error.message);
      return { success: false, message: error.message || 'Error interno al enviar' };
    }
  });
