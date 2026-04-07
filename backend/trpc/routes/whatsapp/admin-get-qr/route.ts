import { publicProcedure } from '../../../create-context';
import { initializeWhatsAppForRestaurant, getSessionStatus } from '../../../../services/whatsapp-web-manager';

const ADMIN_WHATSAPP_ID = 'superadmin-whatsapp';

export const adminGetWhatsAppQrProcedure = publicProcedure
  .mutation(async () => {
    console.log('[Admin WhatsApp] Iniciando generación de QR para superadmin...');
    const status = getSessionStatus(ADMIN_WHATSAPP_ID);

    if (status.isReady || status.authenticated) {
      console.log('[Admin WhatsApp] Ya está conectado');
      return status;
    }

    if (!status.isInitializing && !status.isReady) {
      console.log('[Admin WhatsApp] Inicializando nueva sesión...');
      initializeWhatsAppForRestaurant(ADMIN_WHATSAPP_ID, false).catch((error) => {
        console.error(`Error inicializando WhatsApp para admin:`, error);
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const newStatus = getSessionStatus(ADMIN_WHATSAPP_ID);
    console.log('[Admin WhatsApp] Estado:', newStatus);
    return newStatus;
  });
