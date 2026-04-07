import { Resend } from 'resend';
import { sendWhatsAppViaCloudApi, getCloudApiConfigFromDb, deductWhatsAppCredit } from './whatsapp-cloud-api';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function convertWhatsAppToHtml(whatsappMessage: string): string {
  let html = whatsappMessage
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  html = html.replace(/━+/g, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;">');
  html = html.replace(/\n/g, '<br>');

  return html;
}

export function buildEmailFromWhatsAppMessage({
  whatsappMessage,
  subject,
  restaurantName,
}: {
  whatsappMessage: string;
  subject: string;
  restaurantName: string;
}): { html: string; text: string } {
  const htmlBody = convertWhatsAppToHtml(whatsappMessage);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 30px;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 24px 30px;
            border-radius: 12px 12px 0 0;
            text-align: center;
            margin: -30px -30px 24px -30px;
          }
          .header h2 {
            margin: 0;
            font-size: 22px;
          }
          .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .content {
            font-size: 15px;
            line-height: 1.7;
            color: #374151;
          }
          .content a {
            color: #10b981;
            text-decoration: underline;
          }
          .footer {
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }
          hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 12px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${subject}</h2>
            <p>${restaurantName}</p>
          </div>
          <div class="content">
            ${htmlBody}
          </div>
        </div>
        <div class="footer">
          <p>QuieroMesa - Sistema de Reservas</p>
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      </body>
    </html>
  `;

  return { html, text: whatsappMessage };
}

export async function sendClientEmailNotification({
  clientEmail,
  whatsappMessage,
  subject,
  restaurantName,
}: {
  clientEmail: string;
  whatsappMessage: string;
  subject: string;
  restaurantName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!clientEmail || clientEmail === 'sin-email@example.com' || !clientEmail.includes('@')) {
      console.log('[Email Client] ⏭️ Omitiendo email: dirección no válida:', clientEmail);
      return { success: false, error: 'Email no válido' };
    }

    if (!resend) {
      console.warn('[Email Client] ⚠️ RESEND_API_KEY no configurado');
      return { success: false, error: 'Email service not configured' };
    }

    const { html, text } = buildEmailFromWhatsAppMessage({ whatsappMessage, subject, restaurantName });

    console.log(`[Email Client] 📧 Enviando email a ${clientEmail}: ${subject}`);

    const result = await resend.emails.send({
      from: `${restaurantName} via QuieroMesa <onboarding@resend.dev>`,
      to: clientEmail,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error('[Email Client] Error:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('[Email Client] ✅ Email enviado. ID:', result.data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('[Email Client] Error inesperado:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

export async function sendRestaurantEmailNotification({
  restaurantEmail,
  whatsappMessage,
  subject,
  restaurantName,
  clientName,
  clientPhone,
}: {
  restaurantEmail: string;
  whatsappMessage: string;
  subject: string;
  restaurantName: string;
  clientName: string;
  clientPhone: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!restaurantEmail || !restaurantEmail.includes('@')) {
      console.log('[Email Restaurant] ⏭️ Omitiendo email: dirección del restaurante no válida:', restaurantEmail);
      return { success: false, error: 'Email del restaurante no válido' };
    }

    if (!resend) {
      console.warn('[Email Restaurant] ⚠️ RESEND_API_KEY no configurado');
      return { success: false, error: 'Email service not configured' };
    }

    const htmlBody = convertWhatsAppToHtml(whatsappMessage);
    const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 30px;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 24px 30px;
            border-radius: 12px 12px 0 0;
            text-align: center;
            margin: -30px -30px 24px -30px;
          }
          .header h2 {
            margin: 0;
            font-size: 22px;
          }
          .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .info-box {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .info-box p {
            margin: 4px 0;
            font-size: 14px;
          }
          .content {
            font-size: 15px;
            line-height: 1.7;
            color: #374151;
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 16px 0;
          }
          .content a {
            color: #10b981;
            text-decoration: underline;
          }
          .whatsapp-btn {
            display: inline-block;
            background-color: #25D366;
            color: white !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 16px 0;
          }
          .instructions {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            margin: 16px 0;
            border-radius: 4px;
            font-size: 13px;
            color: #92400e;
          }
          .footer {
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }
          hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 12px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📨 Notificación para enviar al cliente</h2>
            <p>${restaurantName}</p>
          </div>
          
          <div class="info-box">
            <p><strong>👤 Cliente:</strong> ${clientName}</p>
            <p><strong>📱 Teléfono:</strong> ${clientPhone}</p>
          </div>

          <div class="instructions">
            <strong>📋 Instrucciones:</strong> Este mensaje debe ser reenviado al cliente por WhatsApp. 
            Pulse el botón verde de abajo para abrir WhatsApp con el mensaje ya preparado.
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;"><strong>Mensaje para el cliente:</strong></p>
          <div class="content">
            ${htmlBody}
          </div>
          
          <div style="text-align: center;">
            <a href="${whatsappLink}" class="whatsapp-btn" style="color: white;">
              💬 Enviar por WhatsApp al Cliente
            </a>
          </div>
        </div>
        <div class="footer">
          <p>QuieroMesa - Sistema de Reservas</p>
          <p>Este email se envía porque el envío automático de WhatsApp no está activado.</p>
        </div>
      </body>
    </html>
    `;

    const text = `NOTIFICACIÓN PARA ENVIAR AL CLIENTE\n\nCliente: ${clientName}\nTeléfono: ${clientPhone}\n\nMensaje para reenviar por WhatsApp:\n━━━━━━━━━━━━━━━━━━\n${whatsappMessage}\n━━━━━━━━━━━━━━━━━━\n\nEnviar por WhatsApp: ${whatsappLink}`;

    console.log(`[Email Restaurant] 📧 Enviando notificación al restaurante ${restaurantEmail}: ${subject}`);

    const result = await resend.emails.send({
      from: `QuieroMesa <onboarding@resend.dev>`,
      to: restaurantEmail,
      subject: `📨 Para reenviar: ${subject}`,
      html,
      text,
    });

    if (result.error) {
      console.error('[Email Restaurant] Error:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('[Email Restaurant] ✅ Email enviado al restaurante. ID:', result.data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('[Email Restaurant] Error inesperado:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

export function generateClientWhatsAppMessage({
  restaurantName,
  restaurantPhone,
  clientName,
  date,
  time,
  guests,
  locationName,
  notes,
  needsHighChair,
  highChairCount,
  needsStroller,
  hasPets,
  whatsappCustomMessage,
  reservationId,
  confirmationToken,
  minModifyCancelMinutes,
}: {
  restaurantName: string;
  restaurantPhone?: string;
  clientName: string;
  date: string;
  time: string;
  guests: number;
  locationName: string;
  notes?: string;
  needsHighChair?: boolean;
  highChairCount?: number;
  needsStroller?: boolean;
  hasPets?: boolean;
  whatsappCustomMessage?: string;
  reservationId: string;
  confirmationToken: string;
  minModifyCancelMinutes?: number;
}): string {
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
  message += `*Nº Reserva:* ${reservationId.slice(-8).toUpperCase()}\n`;
  message += `*Fecha:* ${formattedDate}\n`;
  message += `🕐 *Hora:* ${time}\n`;
  message += `📍 *Ubicación:* ${locationName}\n`;
  message += `👥 *Comensales:* ${guests} ${guests === 1 ? 'persona' : 'personas'}\n`;

  if (needsHighChair && highChairCount && highChairCount > 0) {
    const adultsCount = guests - highChairCount;
    message += `\n  🧍🏻 *Adultos:* ${adultsCount}\n`;
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

  if (whatsappCustomMessage && whatsappCustomMessage.trim()) {
    message += `\n${whatsappCustomMessage.trim()}\n`;
  }

  const manageUrl = `https://quieromesa.com/client/reservation/${confirmationToken}`;
  
  const modifyTimeText = (() => {
    const minutes = minModifyCancelMinutes || 180;
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return hours === 1 ? '1 hora antes' : `${hours} horas antes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (hours === 0) {
        return `${remainingMinutes} minutos antes`;
      }
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} ${remainingMinutes} minutos antes`;
    }
  })();
  
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 *GESTIONAR RESERVA*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `Puede modificar o cancelar su reserva hasta ${modifyTimeText}.\n\n`;
  message += `Gestione su reserva aquí: 👇\n${manageUrl}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `¡Esperamos verle pronto!\n\n`;
  message += `Saludos cordiales,\n`;
  message += `*${restaurantName}*`;

  return message;
}

interface SendVerificationCodeParams {
  to: string;
  code: string;
  userType: 'admin' | 'restaurant';
  restaurantName?: string;
}

export async function sendVerificationCode({
  to,
  code,
  userType,
  restaurantName,
}: SendVerificationCodeParams): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Email] Enviando código de verificación a ${to}...`);

    const subject =
      userType === 'admin'
        ? 'Código de verificación - Administrador QuieroMesa'
        : `Código de verificación - ${restaurantName || 'QuieroMesa'}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              margin: 20px 0;
            }
            .code-box {
              background-color: #fff;
              border: 2px solid #10b981;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .code {
              font-size: 32px;
              font-weight: bold;
              color: #10b981;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 style="color: #10b981; margin-top: 0;">🔐 Código de Verificación</h2>
            
            <p>Hola,</p>
            
            <p>Hemos detectado un inicio de sesión desde un dispositivo nuevo en tu cuenta ${
              userType === 'admin' ? 'de administrador' : `del restaurante ${restaurantName}`
            }.</p>
            
            <p>Por seguridad, necesitamos que verifiques tu identidad con el siguiente código:</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
              Este código expirará en <strong>15 minutos</strong>
            </p>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Si no has intentado iniciar sesión, por favor ignora este correo y contacta con soporte inmediatamente.
            </div>
            
            <p>Gracias por usar QuieroMesa.</p>
          </div>
          
          <div class="footer">
            <p>QuieroMesa - Sistema de Reservas</p>
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Código de Verificación - QuieroMesa

Hola,

Hemos detectado un inicio de sesión desde un dispositivo nuevo en tu cuenta ${
      userType === 'admin' ? 'de administrador' : `del restaurante ${restaurantName}`
    }.

Por seguridad, necesitamos que verifiques tu identidad con el siguiente código:

${code}

Este código expirará en 15 minutos.

⚠️ Importante: Si no has intentado iniciar sesión, por favor ignora este correo y contacta con soporte inmediatamente.

Gracias por usar QuieroMesa.

---
QuieroMesa - Sistema de Reservas
Este es un correo automático, por favor no respondas a este mensaje.
    `;

    if (!resend) {
      console.warn('[Email] ⚠️ RESEND_API_KEY no configurado, omitiendo envío de email');
      return { success: false, error: 'Email service not configured' };
    }

    const result = await resend.emails.send({
      from: 'QuieroMesa <onboarding@resend.dev>',
      to,
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (result.error) {
      console.error('[Email] Error al enviar:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('[Email] ✅ Código enviado exitosamente. ID:', result.data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Error inesperado:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

interface SendReservationNotificationParams {
  restaurantName: string;
  restaurantEmail: string;
  restaurantPhone?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  date: string;
  time: string;
  guests: number;
  locationName: string;
  notes?: string;
  needsHighChair?: boolean;
  highChairCount?: number;
  needsStroller?: boolean;
  hasPets?: boolean;
  whatsappCustomMessage?: string;
  autoSendWhatsapp?: boolean;
  whatsappType?: string;
  reservationId: string;
  confirmationToken: string;
  confirmationToken2?: string | null;
  minModifyCancelMinutes?: number;
  skipConfirmation?: boolean;
}

interface SendCancellationNotificationParams {
  restaurantName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  date: string;
  time: string;
  reason?: string;
  reservationId: string;
}



export async function sendReservationNotifications({
  restaurantId,
  restaurantName,
  restaurantEmail,
  restaurantPhone,
  clientName,
  clientPhone,
  clientEmail,
  date,
  time,
  guests,
  locationName,
  notes,
  needsHighChair,
  highChairCount,
  needsStroller,
  hasPets,
  notificationPhones,
  notificationEmail,
  whatsappCustomMessage,
  autoSendWhatsapp,
  useWhatsappWeb,
  whatsappType,
  reservationId,
  confirmationToken,
  confirmationToken2,
  enableEmailNotifications,
  minModifyCancelMinutes,
  tableIds,
  db,
  fromRestaurantPanel,
  skipConfirmation,
  depositPaid,
}: SendReservationNotificationParams & {
  restaurantId: string;
  notificationPhones?: string[];
  notificationEmail?: string;
  useWhatsappWeb?: boolean;
  whatsappType?: string;
  enableEmailNotifications?: boolean;
  tableIds?: string[];
  db?: any;
  fromRestaurantPanel?: boolean;
  skipConfirmation?: boolean;
  depositPaid?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              margin: 20px 0;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
              margin: -30px -30px 20px -30px;
            }
            .detail-box {
              background-color: #fff;
              border-radius: 8px;
              padding: 20px;
              margin: 15px 0;
              border-left: 4px solid #10b981;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              color: #6b7280;
            }
            .value {
              color: #111827;
              font-weight: 500;
            }
            .whatsapp-button {
              display: inline-block;
              background-color: #25D366;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .notes-box {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 15px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 Nueva Reserva Recibida</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${restaurantName}</p>
            </div>
            
            <p>Has recibido una nueva solicitud de reserva. Los detalles son:</p>
            
            <div class="detail-box">
              <div class="detail-row">
                <span class="label">👤 Cliente:</span>
                <span class="value">${clientName}</span>
              </div>
              <div class="detail-row">
                <span class="label">📱 WhatsApp:</span>
                <span class="value">${clientPhone}</span>
              </div>
              <div class="detail-row">
                <span class="label">📅 Fecha:</span>
                <span class="value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="label">🕐 Hora:</span>
                <span class="value">${time}</span>
              </div>
              <div class="detail-row">
                <span class="label">👥 Comensales:</span>
                <span class="value">${guests} personas</span>
              </div>
              <div class="detail-row">
                <span class="label">📍 Ubicación:</span>
                <span class="value">${locationName}</span>
              </div>
            </div>
            
            ${needsHighChair || needsStroller || hasPets ? `
            <div class="notes-box">
              <strong>🎯 Necesidades Especiales:</strong><br>
              ${needsHighChair ? `🪑 Tronas: ${highChairCount || 1}<br>` : ''}
              ${needsStroller ? `🚼 Espacio para carrito de bebé<br>` : ''}
              ${hasPets ? `🐕 Cliente viene con mascota<br>` : ''}
            </div>
            ` : ''}
            
            ${notes ? `
            <div class="notes-box">
              <strong>📝 Notas del cliente:</strong><br>
              ${notes}
            </div>
            ` : ''}
            
            <div style="text-align: center;">
              <a href="https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(generateClientWhatsAppMessage({ restaurantName, restaurantPhone, clientName, date, time, guests, locationName, notes, needsHighChair, highChairCount, needsStroller, hasPets, whatsappCustomMessage, reservationId, confirmationToken }))}" class="whatsapp-button" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0;">
                💬 Contactar Cliente por WhatsApp
              </a>
            </div>
            
            <p style="text-align: center; color: #6b7280; font-size: 14px;">
              <strong>⚠️ Importante:</strong> Contacta al cliente lo antes posible para confirmar la reserva.
            </p>
          </div>
          
          <div class="footer">
            <p>QuieroMesa - Sistema de Reservas</p>
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
🎉 Nueva Reserva Recibida - ${restaurantName}

Has recibido una nueva solicitud de reserva:

👤 Cliente: ${clientName}
📱 WhatsApp: ${clientPhone}
📅 Fecha: ${formattedDate}
🕐 Hora: ${time}
👥 Comensales: ${guests} personas
📍 Ubicación: ${locationName}
${needsHighChair || needsStroller || hasPets ? `\n🎯 Necesidades Especiales:\n${needsHighChair ? `🪑 Tronas: ${highChairCount || 1}\n` : ''}${needsStroller ? `🚼 Espacio para carrito de bebé\n` : ''}${hasPets ? `🐕 Cliente viene con mascota\n` : ''}` : ''}${notes ? `\n📝 Notas: ${notes}` : ''}

Contacta al cliente por WhatsApp:
https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}

⚠️ Importante: Contacta al cliente lo antes posible para confirmar la reserva.

---
QuieroMesa - Sistema de Reservas
Este es un correo automático, por favor no respondas a este mensaje.
    `;

    if (fromRestaurantPanel && enableEmailNotifications) {
      console.log(`[Email] Enviando notificación de reserva al restaurante ${restaurantEmail}`);
      
      if (!resend) {
        console.warn('[Email] ⚠️ RESEND_API_KEY no configurado, omitiendo envío de email');
        return { success: true };
      }

      const result = await resend.emails.send({
        from: 'QuieroMesa <onboarding@resend.dev>',
        to: restaurantEmail,
        subject: `🎉 Nueva Reserva - ${clientName} - ${formattedDate}`,
        html: htmlContent,
        text: textContent,
      });

      if (result.error) {
        console.error('[Email] Error al enviar notificación:', result.error);
        return { success: false, error: result.error.message };
      }

      console.log('[Email] ✅ Notificación de reserva enviada. ID:', result.data?.id);
      
      const emailToSend = notificationEmail || restaurantEmail;
      if (emailToSend !== restaurantEmail && resend) {
        await resend.emails.send({
          from: 'QuieroMesa <onboarding@resend.dev>',
          to: emailToSend,
          subject: `🎉 Nueva Reserva - ${clientName} - ${formattedDate}`,
          html: htmlContent,
          text: textContent,
        });
        console.log('[Email] ✅ Notificación adicional enviada a:', emailToSend);
      }
    } else if (!fromRestaurantPanel) {
      console.log('[Email] ⏸️ Notificación al restaurante omitida: reserva pendiente de confirmación');
    } else {
      console.log('[Email] ⏸️ Notificaciones por email desactivadas');
    }

    // IMPORTANTE: Solo enviar notificación al restaurante si:
    // - skipConfirmation=true (reserva añadida directamente sin confirmación)
    // - NO enviar cuando la reserva está pendiente de confirmación (skipConfirmation=false) aunque sea desde el panel
    const shouldNotifyRestaurant = fromRestaurantPanel && skipConfirmation && useWhatsappWeb && notificationPhones && notificationPhones.length > 0;
    
    if (shouldNotifyRestaurant) {
      console.log(`📱 Enviando notificación WhatsApp al restaurante (skipConfirmation=${skipConfirmation})...`);
      
      const dateObj2 = new Date(date);
      const dayName2 = dateObj2.toLocaleDateString('es-ES', { weekday: 'long' });
      const day2 = String(dateObj2.getDate()).padStart(2, '0');
      const month2 = String(dateObj2.getMonth() + 1).padStart(2, '0');
      const year2 = dateObj2.getFullYear();
      const formattedDate2 = `${dayName2}, ${day2}/${month2}/${year2}`;
      
      const tablesResult = await (async () => {
        try {
          if (!tableIds || tableIds.length === 0) {
            return [];
          }
          if (!db) {
            console.error('[WhatsApp] Error: db no está disponible, usando pool global');
            const { Pool } = await import('pg');
            const pool = new Pool({
              connectionString: process.env.DATABASE_URL,
            });
            const result = await pool.query(
              'SELECT name FROM tables WHERE id = ANY($1)',
              [tableIds]
            );
            await pool.end();
            return result.rows;
          }
          const result = await db.query(
            'SELECT name FROM tables WHERE id = ANY($1)',
            [tableIds]
          );
          return result.rows;
        } catch (error) {
          console.error('[WhatsApp] Error obteniendo nombres de mesas:', error);
          return [];
        }
      })();
      
      const tableNames = tablesResult.map((t: any) => t.name);
      const adultsCount = needsHighChair && highChairCount ? guests - highChairCount : guests;
      const tableNamesStr = tableNames.length > 0 ? tableNames.join(', ') : 'Sin asignar';
      const reservationIdShort = reservationId.slice(-8).toUpperCase();
      
      let restaurantMessage = '';
      
      if (skipConfirmation) {
        restaurantMessage = `⚠️ *RESERVA AÑADIDA*\n\n`;
        restaurantMessage += `Reserva añadida a *${clientName}*:\n\n`;
      } else {
        restaurantMessage = `⏳ *RESERVA PENDIENTE*\n\n`;
        restaurantMessage += `Reserva pendiente de *${clientName}*:\n\n`;
      }
      
      restaurantMessage += `📅  *Fecha:* ${formattedDate2}\n`;
      restaurantMessage += `🕐  *Hora:* ${time}\n`;
      restaurantMessage += `📍  *Ubicación:* ${locationName}\n`;
      restaurantMessage += `📍  *Mesa asig:* ${tableNamesStr}\n`;
      restaurantMessage += `👥 *Comensales:* ${guests} ${guests === 1 ? 'Persona' : 'Personas'}\n`;
      
      if (needsHighChair && highChairCount && highChairCount > 0) {
        restaurantMessage += `  🧍🏻 ${adultsCount} ${adultsCount === 1 ? 'adulto' : 'adultos'}\n`;
        restaurantMessage += `  🪑 ${highChairCount} ${highChairCount === 1 ? 'trona' : 'tronas'}\n`;
      } else {
        restaurantMessage += `  🧍🏻 ${guests} ${guests === 1 ? 'adulto' : 'adultos'}\n`;
      }
      
      if (needsStroller) {
        restaurantMessage += `  🚼 Carrito de bebé\n`;
      }
      
      if (hasPets) {
        restaurantMessage += `  🐕 Mascota\n`;
      }
      
      restaurantMessage += `\n📱 *Teléfono:* ${clientPhone}\n`;
      restaurantMessage += `🆔 *Nº Reserva:* ${reservationIdShort}`;
      
      if (notes && notes.trim()) {
        restaurantMessage += `\n\n💬 *Notas:* ${notes.trim()}`;
      }
      
      if (db) {
        for (const phone of notificationPhones) {
          try {
            const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            await db.query(
              `INSERT INTO whatsapp_notifications (
                id, restaurant_id, reservation_id, recipient_phone, recipient_name,
                message, notification_type, scheduled_for, status, attempts, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'pending', 0, NOW())`,
              [
                notifId,
                restaurantId,
                reservationId,
                phone,
                restaurantName,
                restaurantMessage,
                'restaurant_confirmation'
              ]
            );
            console.log(`[WhatsApp Web] ✅ Notificación al restaurante encolada para ${phone}`);
          } catch (queueError) {
            console.error(`[WhatsApp Web] ❌ Error encolando notificación para ${phone}:`, queueError);
          }
        }
      }
    } else if (!fromRestaurantPanel) {
      console.log('📱 Notificación WhatsApp al restaurante omitida: no es desde panel de restaurante');
    }
    
    const isWalkInPhone = clientPhone && (clientPhone.startsWith('walkin-') || clientPhone.startsWith('walk-'));
    if (isWalkInPhone) {
      console.log(`[WhatsApp] ⏭️ Omitiendo notificación al cliente: teléfono walk-in (${clientPhone})`);
    }
    const useCloudApi = whatsappType === 'paid';
    const shouldSendClientWhatsApp = !isWalkInPhone && ((autoSendWhatsapp && (useWhatsappWeb || useCloudApi)) || depositPaid);
    if (shouldSendClientWhatsApp) {
      const sendMethod = useCloudApi && !useWhatsappWeb ? 'Cloud API' : 'WhatsApp Web';
      console.log(`[${sendMethod}] 📱 Enviando WhatsApp al cliente${depositPaid ? ' (fianza pagada - envío obligatorio)' : ' (envío automático)'}...`);
      
      let clientMessage: string;
      
      const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const formattedDateForWhatsapp = `${dayName}, ${day}/${month}/${year}`;
      
      const adultsCount = needsHighChair && highChairCount ? guests - highChairCount : guests;
      
      if (skipConfirmation) {
        // Mensaje para reserva añadida (sin necesidad de confirmación)
        // IMPORTANTE: Usar confirmationToken2 para gestión directa
        clientMessage = `✅ RESERVA CONFIRMADA\n\n`;
        clientMessage += `Hola *${clientName}*,\n\n`;
        clientMessage += `Nos complace confirmar su reserva en *${restaurantName}*\n`;
        clientMessage += `━━━━━━━━━━━━━━━━━━\n`;
        clientMessage += `📋 DETALLES DE LA RESERVA\n`;
        clientMessage += `━━━━━━━━━━━━━━━━━━\n`;
        clientMessage += `Nº Reserva: ${reservationId.slice(-8).toUpperCase()}\n`;
        clientMessage += `Fecha: ${formattedDateForWhatsapp}\n`;
        clientMessage += `🕐 Hora: ${time}\n`;
        clientMessage += `📍 Ubicación: ${locationName}\n`;
        clientMessage += `👥 Comensales: ${guests} ${guests === 1 ? 'persona' : 'personas'}\n`;
        
        if (needsHighChair && highChairCount && highChairCount > 0) {
          clientMessage += `\n  🧍🏻 Adultos: ${adultsCount}\n`;
          clientMessage += `  🪑 Tronas: ${highChairCount}\n`;
        }
        
        if (needsStroller) {
          clientMessage += `  🚼 Espacio para carrito de bebé\n`;
        }
        
        if (hasPets) {
          clientMessage += `  🐕 Mascota\n`;
        }
        
        if (notes && notes.trim()) {
          clientMessage += `\n  💬 ${notes.trim()}\n`;
        }
        
        if (whatsappCustomMessage && whatsappCustomMessage.trim()) {
          clientMessage += `\n${whatsappCustomMessage.trim()}\n`;
        }
        
        if (confirmationToken2 || confirmationToken) {
          clientMessage += `━━━━━━━━━━━━━━━━━━\n`;
          clientMessage += `🔗 GESTIONAR RESERVA\n`;
          clientMessage += `━━━━━━━━━━━━━━━━━━\n`;
          clientMessage += `Puede modificar o cancelar su reserva aquí: 👇\n`;
          clientMessage += `https://quieromesa.com/client/reservation2/${confirmationToken2 || confirmationToken}\n`;
          clientMessage += `━━━━━━━━━━━━━━━━━━\n`;
        } else {
          clientMessage += `━━━━━━━━━━━━━━━━━━\n`;
        }
        clientMessage += `¡Esperamos verle pronto!\n\n`;
        clientMessage += `Saludos cordiales,\n`;
        clientMessage += `*${restaurantName}*`;
      } else {
        // Mensaje para reserva pending (necesita confirmación) - Formato compacto y profesional
        clientMessage = `*${restaurantName}*\n\n`;
        clientMessage += `⚠️ *CONFIRME SU RESERVA*\n\n`;
        clientMessage += `Hola *${clientName}*,\n`;
        clientMessage += `le rogamos confirme su reserva lo antes posible,\n`;
        clientMessage += `pasados 5 minutos se anulan las reservas sin confirmar !!!\n\n`;
        clientMessage += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        clientMessage += `Entra aquí para confirmar: 👇\n`;
        clientMessage += `https://quieromesa.com/client/reservation2/${confirmationToken2 || confirmationToken}\n`;
        clientMessage += `━━━━━━━━━━━━━━━━━━━━━━━━`;
      }
      
      console.log(`[WhatsApp] 📤 ${useCloudApi && !useWhatsappWeb ? 'Enviando via Cloud API' : 'Encolando para worker'}: ${clientPhone}`);
      
      const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      if (useCloudApi && !useWhatsappWeb && db) {
        try {
          const cloudConfig = await getCloudApiConfigFromDb(db);
          if (cloudConfig) {
            const sendResult = await sendWhatsAppViaCloudApi(clientPhone, clientMessage, cloudConfig);
            if (sendResult.success) {
              console.log('[WhatsApp Cloud API] ✅ Mensaje enviado directamente al cliente');
              try { await deductWhatsAppCredit(db, restaurantId); } catch {}
            } else {
              console.error('[WhatsApp Cloud API] ❌ Error enviando al cliente:', sendResult.error);
            }
          } else {
            console.warn('[WhatsApp Cloud API] ⚠️ Config Cloud API no disponible, omitiendo envío');
          }
        } catch (cloudError: any) {
          console.error('[WhatsApp Cloud API] ❌ Error inesperado:', cloudError.message);
        }
      } else {
        try {
          const existingNotifResult = await db.query(
            `SELECT id FROM whatsapp_notifications
             WHERE reservation_id = $1
               AND notification_type = 'reservation_created'
               AND status IN ('pending', 'sent')
             LIMIT 1`,
            [reservationId]
          );
          if (existingNotifResult.rows.length > 0) {
            console.log('[WhatsApp Web] ⚠️ Notificación reservation_created duplicada detectada, omitiendo:', reservationId);
          } else {
            await db.query(
              `INSERT INTO whatsapp_notifications (
                id, restaurant_id, reservation_id, recipient_phone, recipient_name,
                message, notification_type, scheduled_for, status, attempts, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'pending', 0, NOW())`,
              [
                notificationId,
                restaurantId,
                reservationId,
                clientPhone,
                clientName,
                clientMessage,
                'reservation_created'
              ]
            );
            console.log('[WhatsApp Web] ✅ Notificación encolada para envío por worker:', notificationId);
          }
        } catch (queueError) {
          console.error('[WhatsApp Web] ❌ Error guardando en cola:', queueError);
        }
      }
      if (enableEmailNotifications) {
        const emailSubject = skipConfirmation 
          ? `✅ Reserva Confirmada - ${restaurantName}`
          : `⚠️ Confirme su Reserva - ${restaurantName}`;
        const emailToSendTo = notificationEmail || restaurantEmail;
        if (emailToSendTo && !isWalkInPhone) {
          try {
            const emailResult = await sendRestaurantEmailNotification({
              restaurantEmail: emailToSendTo,
              whatsappMessage: clientMessage,
              subject: emailSubject,
              restaurantName,
              clientName,
              clientPhone,
            });
            if (emailResult.success) {
              console.log('[Email Restaurant] ✅ Email con notificación enviado al restaurante');
            } else {
              console.error('[Email Restaurant] ⚠️ Error enviando email al restaurante:', emailResult.error);
            }
          } catch (emailError) {
            console.error('[Email Restaurant] ❌ Error enviando email al restaurante:', emailError);
          }
        }
      }
    } else if (autoSendWhatsapp && !useWhatsappWeb && !useCloudApi) {
      console.log('[WhatsApp] ⏸️ WhatsApp Web no está habilitado y no hay Cloud API configurada.');
      
      if (enableEmailNotifications && !isWalkInPhone) {
        const clientMessage = generateClientWhatsAppMessage({
          restaurantName, restaurantPhone, clientName, date, time, guests,
          locationName, notes, needsHighChair, highChairCount, needsStroller,
          hasPets, whatsappCustomMessage, reservationId, confirmationToken,
          minModifyCancelMinutes,
        });
        const emailToSendTo = notificationEmail || restaurantEmail;
        if (emailToSendTo) {
          try {
            await sendRestaurantEmailNotification({
              restaurantEmail: emailToSendTo,
              whatsappMessage: clientMessage,
              subject: `✅ Reserva Confirmada - ${restaurantName}`,
              restaurantName,
              clientName,
              clientPhone,
            });
            console.log('[Email Restaurant] ✅ Email con notificación enviado al restaurante (sin WhatsApp)');
          } catch (emailError) {
            console.error('[Email Restaurant] ❌ Error enviando email al restaurante:', emailError);
          }
        }
      }
    } else {
      console.log('[WhatsApp] ⏸️ Envío automático desactivado, omitiendo WhatsApp al cliente');
      
      if (enableEmailNotifications && !isWalkInPhone) {
        const clientMessage = generateClientWhatsAppMessage({
          restaurantName, restaurantPhone, clientName, date, time, guests,
          locationName, notes, needsHighChair, highChairCount, needsStroller,
          hasPets, whatsappCustomMessage, reservationId, confirmationToken,
          minModifyCancelMinutes,
        });
        const emailToSendTo = notificationEmail || restaurantEmail;
        if (emailToSendTo) {
          try {
            await sendRestaurantEmailNotification({
              restaurantEmail: emailToSendTo,
              whatsappMessage: clientMessage,
              subject: `✅ Reserva Confirmada - ${restaurantName}`,
              restaurantName,
              clientName,
              clientPhone,
            });
            console.log('[Email Restaurant] ✅ Email con notificación enviado al restaurante (sin WhatsApp)');
          } catch (emailError) {
            console.error('[Email Restaurant] ❌ Error enviando email al restaurante:', emailError);
          }
        }
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Error inesperado al enviar notificación:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

export async function sendCancellationNotification({
  restaurantName,
  clientName,
  clientEmail,
  clientPhone,
  date,
  time,
  reason,
  reservationId,
  whatsappMessage,
  restaurantNotificationEmail,
}: SendCancellationNotificationParams & { whatsappMessage?: string; restaurantNotificationEmail?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const targetEmail = restaurantNotificationEmail;
    console.log(`[Email] Enviando notificación de cancelación al restaurante ${targetEmail || 'N/A'} (cliente: ${clientPhone})`);

    if (!targetEmail) {
      console.log('[Email] ⏭️ No hay email de restaurante configurado, omitiendo email');
      return { success: true };
    }

    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const formattedDate = `${dayName}, ${day}/${month}/${year}`;
    
    const messageToSend = whatsappMessage || `❌ RESERVA CANCELADA\n\nHola ${clientName}, lamentamos informarle que su reserva en ${restaurantName} ha sido cancelada:\n\n📅 Fecha: ${formattedDate}\n🕐 Hora: ${time}\n${reason ? `Motivo: ${reason}\n\n` : ''}Disculpe las molestias.\n\nSaludos cordiales,\n${restaurantName}`;

    return await sendRestaurantEmailNotification({
      restaurantEmail: targetEmail,
      whatsappMessage: messageToSend,
      subject: `❌ Reserva Cancelada - ${restaurantName}`,
      restaurantName,
      clientName,
      clientPhone,
    });
  } catch (error: any) {
    console.error('[Email] Error inesperado al enviar notificación de cancelación:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}
