import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

let whatsappClient: Client | null = null;
let isReady = false;
let isInitializing = false;

export function initializeWhatsAppClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (whatsappClient && isReady) {
      console.log('[WhatsApp Web] Cliente ya está listo');
      resolve();
      return;
    }

    if (isInitializing) {
      console.log('[WhatsApp Web] Ya se está inicializando...');
      const checkInterval = setInterval(() => {
        if (isReady) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
      return;
    }

    isInitializing = true;
    console.log('[WhatsApp Web] Inicializando cliente...');

    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        dataPath: './whatsapp-session',
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    whatsappClient.on('qr', (qr) => {
      console.log('[WhatsApp Web] 📱 Escanea este código QR con tu WhatsApp:');
      console.log('');
      qrcode.generate(qr, { small: true });
      console.log('');
      console.log('[WhatsApp Web] ⚠️ IMPORTANTE: Abre WhatsApp en tu teléfono > Dispositivos vinculados > Vincular dispositivo');
      console.log('[WhatsApp Web] ⏳ Esperando escaneo del código QR...');
    });

    whatsappClient.on('authenticated', () => {
      console.log('[WhatsApp Web] ✅ Autenticado correctamente');
    });

    whatsappClient.on('ready', () => {
      console.log('[WhatsApp Web] ✅ Cliente listo para enviar mensajes');
      isReady = true;
      isInitializing = false;
      resolve();
    });

    whatsappClient.on('disconnected', (reason) => {
      console.log('[WhatsApp Web] ❌ Desconectado:', reason);
      isReady = false;
      whatsappClient = null;
    });

    whatsappClient.on('auth_failure', (msg) => {
      console.error('[WhatsApp Web] ❌ Error de autenticación:', msg);
      isReady = false;
      isInitializing = false;
      whatsappClient = null;
      reject(new Error('Error de autenticación'));
    });

    whatsappClient.initialize().catch((error) => {
      console.error('[WhatsApp Web] ❌ Error al inicializar:', error);
      isReady = false;
      isInitializing = false;
      whatsappClient = null;
      reject(error);
    });

    setTimeout(() => {
      if (!isReady) {
        console.warn('[WhatsApp Web] ⚠️ Timeout: El cliente no se conectó en 2 minutos');
        isInitializing = false;
        resolve();
      }
    }, 120000);
  });
}

export function getWhatsAppClient(): Client | null {
  return whatsappClient;
}

export function isWhatsAppReady(): boolean {
  return isReady;
}

interface SendWhatsAppParams {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage({
  to,
  message,
}: SendWhatsAppParams): Promise<{ success: boolean; error?: string }> {
  try {
    if (!whatsappClient || !isReady) {
      console.warn('[WhatsApp Web] Cliente no está listo. Intentando inicializar...');
      
      try {
        await initializeWhatsAppClient();
      } catch (error) {
        console.error('[WhatsApp Web] No se pudo inicializar el cliente:', error);
        return { 
          success: false, 
          error: 'WhatsApp Web no está conectado. Por favor, escanea el código QR primero.' 
        };
      }

      if (!whatsappClient || !isReady) {
        return { 
          success: false, 
          error: 'WhatsApp Web no está conectado. Por favor, escanea el código QR primero.' 
        };
      }
    }

    let phoneNumber = to.replace(/[^0-9]/g, '');
    
    if (!phoneNumber.startsWith('34') && phoneNumber.length === 9) {
      phoneNumber = '34' + phoneNumber;
    }

    const chatId = `${phoneNumber}@c.us`;

    console.log(`[WhatsApp Web] Enviando mensaje a ${chatId}`);

    await whatsappClient.sendMessage(chatId, message);

    console.log('[WhatsApp Web] ✅ Mensaje enviado exitosamente');
    return { success: true };
  } catch (error: any) {
    console.error('[WhatsApp Web] Error al enviar mensaje:', error);
    return { 
      success: false, 
      error: error.message || 'Error desconocido al enviar WhatsApp' 
    };
  }
}

export async function sendWhatsAppToRestaurant({
  restaurantName,
  clientName,
  clientPhone,
  date,
  time,
  guests,
  locationName,
  notes,
  needsHighChair,
  highChairCount,
  needsStroller,
  hasPets,
  restaurantPhones,
  reservationId,
}: {
  restaurantName: string;
  clientName: string;
  clientPhone: string;
  date: string;
  time: string;
  guests: number;
  locationName: string;
  notes?: string;
  needsHighChair?: boolean;
  highChairCount?: number;
  needsStroller?: boolean;
  hasPets?: boolean;
  restaurantPhones: string[];
  reservationId: string;
}): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${dayName}, ${day}/${month}/${year}`;

  const adultsCount = needsHighChair && highChairCount ? guests - highChairCount : guests;

  let guestDetails = `👥 *Comensales:* ${guests} ${guests === 1 ? 'persona' : 'personas'}`;
  if (needsHighChair && highChairCount && highChairCount > 0) {
    guestDetails += `\n   🧍🏻 Adultos: ${adultsCount}`;
    guestDetails += `\n   🪑 Tronas: ${highChairCount}`;
  }

  const specialNeeds = [];
  if (needsStroller) specialNeeds.push(`🚼 Espacio para carrito de bebé`);
  if (hasPets) specialNeeds.push(`🐕 Cliente viene con mascota`);

  const shortReservationId = reservationId.slice(-8);

  const message = `🎉 *Nueva Reserva - ${restaurantName}*\n\n` +
    `*Nº Reserva:* ${shortReservationId.toUpperCase()}\n` +
    `👤 *Cliente:* ${clientName}\n` +
    `📱 *Teléfono:* ${clientPhone}\n` +
    `📅 *Fecha:* ${formattedDate}\n` +
    `🕐 *Hora:* ${time}\n` +
    `${guestDetails}\n` +
    `📍 *Ubicación:* ${locationName}\n` +
    (specialNeeds.length > 0 ? `\n🎯 *Necesidades Especiales:*\n${specialNeeds.join('\n')}\n` : '') +
    (notes ? `\n📝 *Notas:* ${notes}\n` : '') +
    `\n⚠️ *Importante:* El cliente recibirá una notificación automática por WhatsApp.\n\n` +
    `💬 *Contactar cliente:* https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}`;

  for (const phone of restaurantPhones) {
    const result = await sendWhatsAppMessage({ to: phone, message });
    if (!result.success) {
      errors.push(`Error enviando a ${phone}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

export async function sendWhatsAppToClient({
  restaurantName,
  restaurantPhone,
  clientName,
  clientPhone,
  date,
  time,
  guests,
  locationName,
  notes,
  needsHighChair,
  highChairCount,
  needsStroller,
  hasPets,
  customMessage,
  reservationId,
  confirmationToken,
}: {
  restaurantName: string;
  restaurantPhone?: string;
  clientName: string;
  clientPhone: string;
  date: string;
  time: string;
  guests: number;
  locationName: string;
  notes?: string;
  needsHighChair?: boolean;
  highChairCount?: number;
  needsStroller?: boolean;
  hasPets?: boolean;
  customMessage?: string;
  reservationId: string;
  confirmationToken: string;
}): Promise<{ success: boolean; error?: string }> {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${dayName}, ${day}/${month}/${year}`;

  const shortReservationId = reservationId.slice(-8);

  let message = `✅ *RESERVA CONFIRMADA*\n\n`;
  message += `Hola *${clientName}*,\n\n`;
  message += `Nos complace confirmar su reserva en *${restaurantName}*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 *DETALLES DE LA RESERVA*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `*Nº Reserva:* ${shortReservationId.toUpperCase()}\n`;
  message += `*Fecha:* ${formattedDate}\n`;
  message += `🕐 *Hora:* ${time}\n`;
  message += `📍 *Ubicación:* ${locationName}\n`;
  message += `👥 *Comensales:* ${guests} ${guests === 1 ? 'persona' : 'personas'}\n`;

  const adultsCount = needsHighChair && highChairCount ? guests - highChairCount : guests;
  
  if (needsHighChair && highChairCount && highChairCount > 0) {
    message += `\n   🧍🏻 *Adultos:* ${adultsCount}\n`;
    message += `   🪑 *Tronas:* ${highChairCount}\n`;
  }
  if (needsStroller) {
    message += `   🚼 Espacio para carrito de bebé\n`;
  }
  if (hasPets) {
    message += `   🐕 Mascota\n`;
  }

  if (notes && notes.trim()) {
    message += `\n💬 *Notas:* ${notes.trim()}\n`;
  }

  if (customMessage && customMessage.trim()) {
    message += `\n━━━━━━━━━━━━━━━━━━\n`;
    message += `ℹ️ *INFORMACIÓN IMPORTANTE*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    message += `${customMessage.trim()}\n`;
  }

  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://quieromesa.com';
  const httpsBaseUrl = baseUrl.replace(/^http:/, 'https:');
  const manageUrl = `${httpsBaseUrl}/client/reservation/${confirmationToken}`;
  
  message += `\n━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 *GESTIONAR RESERVA*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;
  message += `Puede modificar o cancelar su reserva hasta 3 horas antes.\n\n`;
  message += `👉 *Gestione su reserva aquí:*\n${manageUrl}\n\n`;
  message += `⚠️ *Importante:* Si quedan menos de 3 horas para su reserva, deberá contactar directamente al restaurante${restaurantPhone ? ` al ${restaurantPhone}` : ''} para realizar cambios.\n`;
  
  message += `\n━━━━━━━━━━━━━━━━━━\n\n`;
  message += `¡Esperamos verle pronto! 🙏\n`;
  message += `\nSaludos cordiales,\n`;
  message += `*${restaurantName}*`;

  return await sendWhatsAppMessage({ to: clientPhone, message });
}

export async function sendCancellationWhatsApp({
  restaurantName,
  clientName,
  clientPhone,
  date,
  time,
  guests,
  locationName,
  reservationId,
}: {
  restaurantName: string;
  clientName: string;
  clientPhone: string;
  date: string;
  time: string;
  guests: number;
  locationName: string;
  reservationId: string;
}): Promise<{ success: boolean; error?: string }> {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${dayName}, ${day}/${month}/${year}`;

  const shortReservationId = reservationId.slice(-8);

  let message = `❌ *RESERVA ANULADA*\n\n`;
  message += `Hola *${clientName}*,\n\n`;
  message += `Lamentamos informarle que su reserva en *${restaurantName}* ha sido anulada.\n\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 *DETALLES DE LA RESERVA ANULADA*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `*Nº Reserva:* ${shortReservationId.toUpperCase()}\n`;
  message += `*Fecha:* ${formattedDate}\n`;
  message += `🕐 *Hora:* ${time}\n`;
  message += `📍 *Ubicación:* ${locationName}\n`;
  message += `👥 *Comensales:* ${guests} ${guests === 1 ? 'persona' : 'personas'}\n`;
  message += `\n━━━━━━━━━━━━━━━━━━\n\n`;
  message += `Si tiene alguna pregunta o desea realizar una nueva reserva, no dude en contactarnos.\n\n`;
  message += `Gracias por su comprensión.\n\n`;
  message += `Saludos cordiales,\n`;
  message += `*${restaurantName}*`;

  return await sendWhatsAppMessage({ to: clientPhone, message });
}
