import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { initializeWhatsAppForRestaurant, getSessionStatus } from '../../../../services/whatsapp-web-manager';

export const getWhatsAppQrProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const status = getSessionStatus(input.restaurantId);

    if (status.isReady || status.authenticated) {
      return status;
    }

    if (!status.isInitializing) {
      initializeWhatsAppForRestaurant(input.restaurantId, false).catch((error) => {
        console.error(`Error inicializando WhatsApp para ${input.restaurantId}:`, error);
      });
    }

    return getSessionStatus(input.restaurantId);
  });
