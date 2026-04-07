import { publicProcedure } from '../../../create-context';
import { disconnectRestaurantSession } from '../../../../services/whatsapp-web-manager';

const ADMIN_WHATSAPP_ID = 'superadmin-whatsapp';

export const adminDisconnectWhatsAppProcedure = publicProcedure
  .mutation(async () => {
    await disconnectRestaurantSession(ADMIN_WHATSAPP_ID);
    return { success: true };
  });
