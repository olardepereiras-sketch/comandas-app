import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { forceResetSession, initializeWhatsAppForRestaurant } from '../../../../services/whatsapp-web-manager';

export const forceResetWhatsAppProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log(`[WhatsApp Force Reset] Reseteando sesión para ${input.restaurantId}`);
    await forceResetSession(input.restaurantId);
    console.log(`[WhatsApp Force Reset] Iniciando nueva sesión para ${input.restaurantId}`);
    initializeWhatsAppForRestaurant(input.restaurantId, false).catch((err) => {
      console.error(`[WhatsApp Force Reset] Error iniciando sesión:`, err?.message || err);
    });
    return { success: true };
  });
