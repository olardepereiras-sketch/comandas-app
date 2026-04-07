import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { disconnectRestaurantSession } from '../../../../services/whatsapp-web-manager';

export const disconnectWhatsAppProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    await disconnectRestaurantSession(input.restaurantId);
    return { success: true };
  });
