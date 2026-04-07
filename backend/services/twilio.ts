import { sendWhatsAppViaCloudApi } from './whatsapp-cloud-api';

const cloudToken = process.env.WHATSAPP_CLOUD_TOKEN;
const cloudPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

interface SendWhatsAppParams {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage({
  to,
  message,
}: SendWhatsAppParams): Promise<{ success: boolean; error?: string }> {
  if (!cloudToken || !cloudPhoneNumberId) {
    console.warn('[WhatsApp Cloud API] ⚠️ WHATSAPP_CLOUD_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados');
    console.log('[WhatsApp Cloud API] Mensaje simulado para:', to);
    console.log('[WhatsApp Cloud API] Contenido:', message);
    return { success: true };
  }

  console.log(`[WhatsApp Cloud API] 📤 Enviando mensaje a ${to}`);
  return await sendWhatsAppViaCloudApi(to, message, {
    token: cloudToken,
    phoneNumberId: cloudPhoneNumberId,
  });
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
}): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${dayName}, ${day}/${month}/${year}`;

  const specialNeeds = [];
  if (needsHighChair) specialNeeds.push(`🪑 Tronas: ${highChairCount || 1}`);
  if (needsStroller) specialNeeds.push(`🚼 Espacio para carrito de bebé`);
  if (hasPets) specialNeeds.push(`🐕 Cliente viene con mascota`);

  const message = `🎉 *Nueva Reserva - ${restaurantName}*\n\n` +
    `👤 Cliente: ${clientName}\n` +
    `📱 WhatsApp: ${clientPhone}\n` +
    `📅 Fecha: ${formattedDate}\n` +
    `🕐 Hora: ${time}\n` +
    `👥 Comensales: ${guests} personas\n` +
    `📍 Ubicación: ${locationName}\n` +
    (specialNeeds.length > 0 ? `\n🎯 *Necesidades Especiales:*\n${specialNeeds.join('\n')}\n` : '') +
    (notes ? `\n📝 Notas: ${notes}\n` : '') +
    `\n⚠️ *Importante:* Contacta al cliente lo antes posible para confirmar.\n\n` +
    `💬 Contactar cliente: https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}`;

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

  let message = `✅ *RESERVA CONFIRMADA*\n\n`;
  message += `Hola *${clientName}*,\n\n`;
  message += `Nos complace confirmar su reserva en *${restaurantName}*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 *DETALLES DE LA RESERVA*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `*Nº Reserva:* ${reservationId.toUpperCase()}\n`;
  message += `*Fecha:* ${formattedDate}\n`;
  message += `🕐 *Hora:* ${time}\n`;
  message += `📍 *Ubicación:* ${locationName}\n`;
  message += `👥 *Comensales:* ${guests} ${guests === 1 ? 'persona' : 'personas'}\n`;

  const adultsCount = needsHighChair && highChairCount ? guests - highChairCount : guests;

  if (adultsCount > 0 && needsHighChair && highChairCount) {
    message += `\n  🧍🏻 *Adultos:* ${adultsCount}\n`;
  }
  if (needsHighChair && highChairCount) {
    message += `  🪑 *Tronas:* ${highChairCount}\n`;
  }
  if (needsStroller) {
    message += `  🚼 Espacio para carrito de bebé\n`;
  }
  if (hasPets) {
    message += `  🐕 Mascota\n`;
  }

  if (notes && notes.trim()) {
    message += `\n  💬 ${notes.trim()}\n`;
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
  message += `👉 *Enlace de gestión:*\n${manageUrl}\n\n`;
  message += `⚠️ *Importante:* Si quedan menos de 3 horas para su reserva, deberá contactar directamente al restaurante${restaurantPhone ? ` al ${restaurantPhone}` : ''} para realizar cambios.\n`;

  message += `\n━━━━━━━━━━━━━━━━━━\n\n`;
  message += `¡Esperamos verle pronto! 🙏\n`;
  message += `\nSaludos cordiales,\n`;
  message += `*${restaurantName}*`;

  return await sendWhatsAppMessage({ to: clientPhone, message });
}
