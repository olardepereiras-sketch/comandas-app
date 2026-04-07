import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';

export const createWaitlistEntryProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      clientPhone: z.string(),
      clientName: z.string(),
      date: z.string(),
      guests: z.number(),
      locationId: z.string().optional(),
      notes: z.string().optional(),
      needsHighChair: z.boolean().optional(),
      highChairCount: z.number().optional(),
      needsStroller: z.boolean().optional(),
      hasPets: z.boolean().optional(),
      preferredTime: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[WAITLIST] Creando solicitud pendiente de confirmación:', input.clientPhone, input.date);

    await ctx.db.query(
      `CREATE TABLE IF NOT EXISTS waitlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        client_name TEXT NOT NULL,
        date TEXT NOT NULL,
        guests INTEGER NOT NULL,
        location_id TEXT,
        notes TEXT DEFAULT '',
        notification_count INTEGER DEFAULT 0,
        last_notified_at TIMESTAMP,
        status TEXT DEFAULT 'pending_confirmation',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      []
    );

    await ctx.db.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS needs_high_chair BOOLEAN DEFAULT FALSE`, []);
    await ctx.db.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS high_chair_count INTEGER DEFAULT 0`, []);
    await ctx.db.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS needs_stroller BOOLEAN DEFAULT FALSE`, []);
    await ctx.db.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS has_pets BOOLEAN DEFAULT FALSE`, []);
    await ctx.db.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS preferred_time TEXT DEFAULT NULL`, []);
    await ctx.db.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS confirmation_token TEXT DEFAULT NULL`, []);
    await ctx.db.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP DEFAULT NULL`, []);
    await ctx.db.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS pending_expires_at TIMESTAMP DEFAULT NULL`, []);
    console.log('[WAITLIST] Columnas verificadas/añadidas');

    const existing = await ctx.db.query(
      `SELECT id FROM waitlist WHERE restaurant_id = $1 AND client_phone = $2 AND date = $3 AND status IN ('waiting', 'pending_confirmation')`,
      [input.restaurantId, input.clientPhone, input.date]
    );

    if (existing.rows.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Ya tienes una solicitud en lista de espera para esta fecha en este restaurante.',
      });
    }

    const confirmationToken = `wl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await ctx.db.query(
      `INSERT INTO waitlist (restaurant_id, client_phone, client_name, date, guests, location_id, notes,
         needs_high_chair, high_chair_count, needs_stroller, has_pets, preferred_time,
         status, confirmation_token, pending_expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending_confirmation', $13,
         NOW() + INTERVAL '30 minutes', NOW())
       RETURNING *`,
      [
        input.restaurantId,
        input.clientPhone,
        input.clientName,
        input.date,
        input.guests,
        input.locationId || null,
        input.notes || '',
        input.needsHighChair || false,
        input.highChairCount || 0,
        input.needsStroller || false,
        input.hasPets || false,
        input.preferredTime || null,
        confirmationToken,
      ]
    );

    const entryId = result.rows[0]?.id as string;
    const confirmUrl = `https://quieromesa.com/client/waitlist/${confirmationToken}`;
    console.log('[WAITLIST] Solicitud creada con token:', entryId, confirmationToken);

    try {
      const restaurantResult = await ctx.db.query(
        'SELECT name, use_whatsapp_web FROM restaurants WHERE id = $1',
        [input.restaurantId]
      );

      const restaurant = restaurantResult.rows[0];
      if (restaurant) {
        const dateObj = new Date(input.date + 'T12:00:00');
        const dateDisplay = dateObj.toLocaleDateString('es-ES', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });

        const specialNeeds: string[] = [];
        if (input.needsHighChair && (input.highChairCount || 0) > 0) {
          specialNeeds.push(`🪑 ${input.highChairCount} trona${(input.highChairCount || 0) !== 1 ? 's' : ''}`);
        }
        if (input.needsStroller) specialNeeds.push('🛒 Carrito de bebé');
        if (input.hasPets) specialNeeds.push('🐾 Con mascota');

        const message =
          `📋 Confirma tu solicitud de Lista de Espera\n\n` +
          `Hola ${input.clientName},\n\n` +
          `Para entrar en la lista de espera de ${restaurant.name}, confirma tu solicitud pulsando el enlace de abajo.\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📅 Fecha: ${dateDisplay}\n` +
          `🕐 Horario preferido: ${input.preferredTime || ''}\n` +
          `👥 Comensales: ${input.guests}\n` +
          `📝 Notas: ${input.notes || ''}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⏰ Tienes 30 minutos para confirmar tu solicitud. Si no confirmas, se cancelará automáticamente.\n\n` +
          `Para confirmar pulsa aquí 👇🏼\n${confirmUrl}\n\n` +
          `Saludos,\n${restaurant.name}`;

        if (restaurant.use_whatsapp_web) {
          const notifQueue = new WhatsAppNotificationQueue(ctx.db);
          await notifQueue.scheduleNotification({
            restaurantId: input.restaurantId,
            reservationId: `waitlist-pending-${entryId}`,
            recipientPhone: input.clientPhone,
            recipientName: input.clientName,
            message,
            notificationType: 'waitlist_confirmation',
            scheduledFor: new Date(),
          });
          console.log('[WAITLIST] Notificación de token encolada (WhatsApp Web) para:', input.clientPhone);
        } else {
          try {
            const { sendWhatsAppMessage } = await import('../../../../services/twilio');
            await sendWhatsAppMessage({ to: input.clientPhone, message });
            console.log('[WAITLIST] Notificación de token enviada (Twilio) a:', input.clientPhone);
          } catch (twilioErr) {
            console.error('[WAITLIST] Error enviando vía Twilio:', twilioErr);
          }
        }
      }
    } catch (notifError) {
      console.error('[WAITLIST] Error enviando notificación de token:', notifError);
    }

    return { success: true, id: entryId };
  });
