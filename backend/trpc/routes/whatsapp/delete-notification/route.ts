import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export const deleteWhatsAppNotificationProcedure = publicProcedure
  .input(z.object({
    notificationId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('🗑️ [WHATSAPP WORKER] Eliminando notificación:', input.notificationId);

    try {
      const result = await ctx.db.query(
        `DELETE FROM whatsapp_notifications WHERE id = $1 RETURNING id`,
        [input.notificationId]
      );

      if (result.rowCount === 0) {
        console.log('⚠️ [WHATSAPP WORKER] Notificación no encontrada:', input.notificationId);
        return { success: false, message: 'Notificación no encontrada' };
      }

      console.log('✅ [WHATSAPP WORKER] Notificación eliminada:', input.notificationId);
      return { success: true, message: 'Notificación eliminada correctamente' };
    } catch (error: any) {
      console.error('❌ [WHATSAPP WORKER] Error eliminando notificación:', error.message);
      throw error;
    }
  });
