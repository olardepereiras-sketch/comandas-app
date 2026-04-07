import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { sendWhatsAppViaRestaurant } from '../../../../services/whatsapp-web-manager';

const ADMIN_WHATSAPP_ID = 'superadmin-whatsapp';

export const adminSendWhatsAppProcedure = publicProcedure
  .input(
    z.object({
      to: z.string(),
      message: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const result = await sendWhatsAppViaRestaurant(
      ADMIN_WHATSAPP_ID,
      input.to,
      input.message
    );

    return result;
  });
