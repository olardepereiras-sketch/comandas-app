import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { sendReservationNotifications } from '../../../../services/email';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';

export const modifyReservationByClientProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      date: z.string(),
      time: z.object({
        hour: z.number(),
        minute: z.number(),
      }),
      guests: z.number(),
      locationId: z.string(),
      needsHighChair: z.boolean().optional(),
      highChairCount: z.number().optional(),
      needsStroller: z.boolean().optional(),
      hasPets: z.boolean().optional(),
      clientNotes: z.string().optional(),
      tableIds: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [MODIFY BY CLIENT] Iniciando modificación:', input.token);
    console.log('🔵 [MODIFY BY CLIENT] Input completo:', JSON.stringify(input, null, 2));

    try {
      const reservationResult = await ctx.db.query(
        `SELECT r.*, rest.min_modify_cancel_minutes 
         FROM reservations r
         JOIN restaurants rest ON r.restaurant_id = rest.id
         WHERE r.confirmation_token = $1 AND r.status != 'cancelled'`,
        [input.token]
      );

      if (reservationResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reserva no encontrada o ya cancelada',
        });
      }

      const oldReservation = reservationResult.rows[0];
      const originalToken = oldReservation.confirmation_token;
      const originalId = oldReservation.id;
      const originalReservationNumber = oldReservation.id;
      const isFromRestaurantPanel = oldReservation.from_restaurant_panel === true;
      
      console.log('🔍 [MODIFY] Reserva encontrada:', { id: originalId, token: originalToken, reservationNumber: originalReservationNumber, fromRestaurantPanel: isFromRestaurantPanel });

      const reservationDate = new Date(input.date);
      const reservationDateTime = new Date(reservationDate);
      reservationDateTime.setHours(input.time.hour, input.time.minute, 0, 0);
      const now = new Date();
      const minModifyCancelMinutes = oldReservation.min_modify_cancel_minutes || 180;
      const minutesUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60);

      if (!isFromRestaurantPanel && minutesUntilReservation < minModifyCancelMinutes) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `No se puede modificar una reserva con menos de ${Math.floor(minModifyCancelMinutes / 60)} horas de antelación. Contacte al restaurante.`,
        });
      }

      if (isFromRestaurantPanel && minutesUntilReservation < 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No se puede modificar una reserva que ya ha pasado.',
        });
      }

      console.log('🔄 [MODIFY] PASO 1: Eliminando notificaciones pendientes de la reserva antigua');
      
      const notificationQueue = new WhatsAppNotificationQueue(ctx.db);
      await notificationQueue.deleteNotificationsForReservation(originalId);
      console.log('✅ [MODIFY] Notificaciones eliminadas');
    
      console.log('🔄 [MODIFY] PASO 2: Marcando reserva antigua como cancelada');
      await ctx.db.query(
        `UPDATE reservations 
         SET status = 'modified', 
             cancelled_at = NOW(), 
             confirmation_token = NULL,
             token = NULL,
             notes = 'Reserva modificada por el cliente'
         WHERE id = $1`,
        [originalId]
      );
      console.log('✅ [MODIFY] Reserva antigua marcada como modificada');

      console.log('🔄 [MODIFY] PASO 3: Asignando mesa para la nueva reserva');
      
      const newReservationId = originalReservationNumber;
      const newToken = originalToken;
      
      console.log('🔍 [MODIFY] IMPORTANTE: Usando el MISMO ID de reserva:', newReservationId);

      const locationResult = await ctx.db.query(
        'SELECT name FROM table_locations WHERE id = $1',
        [input.locationId]
      );
      const locationName = locationResult.rows[0]?.name || 'Mesa';
      
      console.log('🔍 [MODIFY] Location name:', locationName);

      const clientResult = await ctx.db.query(
        'SELECT name, phone, email FROM clients WHERE id = $1',
        [oldReservation.client_id]
      );
      
      const client = clientResult.rows[0];

      let finalTableIds: string[] = input.tableIds || [];
      const oldTableIds = typeof oldReservation.table_ids === 'string' 
        ? JSON.parse(oldReservation.table_ids) 
        : oldReservation.table_ids || [];

      if (finalTableIds.length === 0) {
        console.log('🔄 [MODIFY] Buscando mesa automáticamente...');
        
        const tablesResult = await ctx.db.query(
          'SELECT * FROM tables WHERE restaurant_id = $1 AND location_id = $2 ORDER BY priority DESC',
          [oldReservation.restaurant_id, input.locationId]
        );

        const allTables = tablesResult.rows;
        
        const compatibleTables = allTables.filter((table: any) => {
          const meetsCapacity = input.guests >= table.min_capacity && input.guests <= table.max_capacity;
          const meetsHighChair = !input.needsHighChair || table.allows_high_chairs;
          const meetsStroller = !input.needsStroller || table.allows_strollers;
          const meetsPets = !input.hasPets || table.allows_pets;
          return meetsCapacity && meetsHighChair && meetsStroller && meetsPets;
        });

        const tableGroupsResult = await ctx.db.query(
          'SELECT * FROM table_groups WHERE restaurant_id = $1 AND location_id = $2 ORDER BY priority DESC',
          [oldReservation.restaurant_id, input.locationId]
        );
        
        const compatibleGroups = tableGroupsResult.rows.filter((group: any) => {
          const meetsCapacity = input.guests >= group.min_capacity && input.guests <= group.max_capacity;
          return meetsCapacity;
        });

        console.log('✅ [MODIFY] Mesas compatibles:', compatibleTables.map((t: any) => t.id));
        console.log('✅ [MODIFY] Grupos compatibles:', compatibleGroups.map((g: any) => g.id));

        const reservationsOnNewDay = await ctx.db.query(
          `SELECT r.*, COALESCE(t.rotation_time_minutes, 120) as rotation_time_minutes
           FROM reservations r
           LEFT JOIN tables t ON t.id = ANY(string_to_array(trim(both '[]' from r.table_ids::text), ',')::text[])
           WHERE r.restaurant_id = $1 
           AND r.location_id = $2 
           AND r.date::date = $3::date
           AND r.status != 'cancelled'
           AND r.status != 'modified'
           AND r.id != $4`,
          [oldReservation.restaurant_id, input.locationId, input.date, originalId]
        );

        const slotTime = input.time.hour * 60 + input.time.minute;
        const occupiedTableIds = new Set<string>();

        reservationsOnNewDay.rows.forEach((reservation: any) => {
          const resTime = typeof reservation.time === 'string' 
            ? JSON.parse(reservation.time) 
            : reservation.time;
          const resTimeMinutes = resTime.hour * 60 + resTime.minute;
          const rotationMinutes = reservation.rotation_time_minutes || 120;

          if (Math.abs(slotTime - resTimeMinutes) < rotationMinutes) {
            const tableIds = typeof reservation.table_ids === 'string'
              ? JSON.parse(reservation.table_ids)
              : reservation.table_ids;
            
            if (Array.isArray(tableIds)) {
              tableIds.forEach((tableId: string) => occupiedTableIds.add(tableId));
            }
          }
        });

        console.log(`🔍 [MODIFY] Mesas ocupadas: ${occupiedTableIds.size}`);

        const oldTableStillValid = oldTableIds.length > 0 && 
          oldTableIds.every((tableId: string) => !occupiedTableIds.has(tableId)) &&
          compatibleTables.some((t: any) => oldTableIds.includes(t.id));

        if (oldTableStillValid) {
          finalTableIds = oldTableIds;
          console.log('✅ [MODIFY] Manteniendo mesa anterior:', finalTableIds);
        } else {
          let assigned = false;
          
          for (const group of compatibleGroups) {
            const groupTableIds = Array.isArray(group.table_ids) ? group.table_ids : [];
            const allTablesAvailable = groupTableIds.every((tableId: string) => !occupiedTableIds.has(tableId));
            
            if (allTablesAvailable && groupTableIds.length > 0) {
              finalTableIds = groupTableIds;
              console.log(`✅ [MODIFY] Grupo asignado: ${group.id}`);
              assigned = true;
              break;
            }
          }

          if (!assigned) {
            for (const table of compatibleTables) {
              if (!occupiedTableIds.has(table.id)) {
                finalTableIds.push(table.id);
                console.log(`✅ [MODIFY] Mesa asignada: ${table.id}`);
                break;
              }
            }
          }
        }

        if (finalTableIds.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No hay mesas disponibles para la nueva fecha/hora seleccionada',
          });
        }
      }

      console.log('🔍 [MODIFY] Mesas finales asignadas:', finalTableIds);

      await ctx.db.query(
        `INSERT INTO reservations (
        id, restaurant_id, client_id, client_phone, client_name, client_email,
        date, time, guests, table_ids, token, confirmation_token, status, location_id, location_name,
        needs_high_chair, high_chair_count, needs_stroller, has_pets, client_notes, notes,
        client_rated, rating_deadline,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        guests = EXCLUDED.guests,
        table_ids = EXCLUDED.table_ids,
        token = EXCLUDED.token,
        confirmation_token = EXCLUDED.confirmation_token,
        location_id = EXCLUDED.location_id,
        location_name = EXCLUDED.location_name,
        needs_high_chair = EXCLUDED.needs_high_chair,
        high_chair_count = EXCLUDED.high_chair_count,
        needs_stroller = EXCLUDED.needs_stroller,
        has_pets = EXCLUDED.has_pets,
        client_notes = EXCLUDED.client_notes,
        status = 'confirmed',
        client_rated = false,
        rating_deadline = NULL,
        updated_at = EXCLUDED.updated_at`,
      [
        newReservationId,
        oldReservation.restaurant_id,
        oldReservation.client_id,
        client.phone,
        client.name,
        client.email || null,
        input.date,
        JSON.stringify(input.time),
        input.guests,
        JSON.stringify(finalTableIds),
        newToken,
        newToken,
        'confirmed',
        input.locationId,
        locationName,
        input.needsHighChair || false,
        input.highChairCount || null,
        input.needsStroller || false,
        input.hasPets || false,
        input.clientNotes || '',
        'Reserva modificada por el cliente',
        false,
        null,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
      );

      console.log('✅ [MODIFY] Nueva reserva creada exitosamente');
      console.log('🔍 [MODIFY] Detalles: ID:', newReservationId, 'Token:', newToken);

      try {
      const restaurantResult = await ctx.db.query(
        `SELECT name, email, phone, notification_phones, notification_email, whatsapp_custom_message, 
         auto_send_whatsapp, use_whatsapp_web, reminder1_enabled, reminder1_hours, 
         reminder2_enabled, reminder2_minutes FROM restaurants WHERE id = $1`,
        [oldReservation.restaurant_id]
      );
      
      if (restaurantResult.rows.length > 0) {
        const restaurant = restaurantResult.rows[0];
        const timeString = `${String(input.time.hour).padStart(2, '0')}:${String(input.time.minute).padStart(2, '0')}`;
        
        const restaurantPhone = restaurant.phone 
          ? (Array.isArray(restaurant.phone) ? restaurant.phone[0] : JSON.parse(restaurant.phone)[0])
          : undefined;
        
        const notificationPhones = restaurant.notification_phones
          ? (Array.isArray(restaurant.notification_phones) ? restaurant.notification_phones : JSON.parse(restaurant.notification_phones))
          : [];
        
        console.log('📨 [MODIFY] Enviando notificaciones al restaurante (MODIFICACIÓN)...');
        
        if (restaurant.use_whatsapp_web && notificationPhones.length > 0) {
          const guestsInfo = [];
        if (input.guests > (input.highChairCount || 0)) {
          guestsInfo.push(`${input.guests - (input.highChairCount || 0)} adultos`);
        }
        if (input.needsHighChair && input.highChairCount) {
          guestsInfo.push(`${input.highChairCount} ${input.highChairCount === 1 ? 'trona' : 'tronas'}`);
        }
        const guestsText = guestsInfo.length > 0 ? guestsInfo.join(' + ') : `${input.guests} ${input.guests === 1 ? 'persona' : 'personas'}`;
        
        const specialNeeds = [];
        if (input.needsStroller) specialNeeds.push('🛒 Con carrito');
        if (input.hasPets) specialNeeds.push('🐾 Con mascota');
        
        const reservationNumber = originalReservationNumber.substring(originalReservationNumber.length - 8);
        
        const [dYear, dMonth, dDay] = input.date.split('-').map(Number);
        const formattedDate = `${String(dDay).padStart(2, '0')}/${String(dMonth).padStart(2, '0')}/${dYear}`;

        const modificationMessage = `⚠️ *RESERVA MODIFICADA*\n\n` +
            `El cliente *${client.name}* ha modificado su reserva:\n\n` +
            `📅 Nueva fecha: ${formattedDate}\n` +
            `🕐 Nueva hora: ${timeString}\n` +
            `👥 Comensales: ${guestsText}\n` +
            `${specialNeeds.length > 0 ? specialNeeds.join('\n') + '\n' : ''}` +
            `📍 Ubicación: ${locationName}\n` +
            `${input.clientNotes ? `📝 Notas: ${input.clientNotes}\n` : ''}` +
            `\n📱 Teléfono: ${client.phone}\n` +
            `🆔 Nº Reserva: ${reservationNumber}`;

          for (const phone of notificationPhones) {
            try {
              await notificationQueue.scheduleNotification({
                restaurantId: oldReservation.restaurant_id,
                reservationId: newReservationId,
                recipientPhone: phone,
                recipientName: restaurant.name,
                message: modificationMessage,
                notificationType: 'restaurant_modification',
                scheduledFor: new Date(),
              });
              console.log(`[WhatsApp Modification] ✅ Notificación de modificación encolada para ${phone}`);
            } catch (error) {
              console.error(`[WhatsApp Modification] ❌ Error encolando notificación a ${phone}:`, error);
            }
          }
        }
        
        await sendReservationNotifications({
          restaurantId: oldReservation.restaurant_id,
          restaurantName: restaurant.name,
          restaurantEmail: restaurant.email,
          restaurantPhone,
          clientName: client.name,
          clientPhone: client.phone,
          clientEmail: client.email,
          date: input.date,
          time: timeString,
          guests: input.guests,
          locationName,
          notes: input.clientNotes || '',
          needsHighChair: input.needsHighChair || false,
          highChairCount: input.highChairCount,
          needsStroller: input.needsStroller || false,
          hasPets: input.hasPets || false,
          notificationPhones,
          notificationEmail: restaurant.notification_email,
          whatsappCustomMessage: restaurant.whatsapp_custom_message,
          autoSendWhatsapp: restaurant.auto_send_whatsapp,
          reservationId: originalReservationNumber.substring(originalReservationNumber.length - 8),
          confirmationToken: newToken,
        });
        console.log('✅ [MODIFY BY CLIENT] Notificaciones de email enviadas');

        const reminder1Enabled = restaurant.reminder1_enabled || false;
        const reminder1Hours = restaurant.reminder1_hours || 24;
        const reminder2Enabled = restaurant.reminder2_enabled || false;
        const reminder2Minutes = restaurant.reminder2_minutes || 60;

        if ((reminder1Enabled || reminder2Enabled) && restaurant.use_whatsapp_web && restaurant.auto_send_whatsapp) {
          console.log('📅 [MODIFY] Programando recordatorios inteligentes...');
          const reservationDateTime = new Date(`${input.date}T${String(input.time.hour).padStart(2, '0')}:${String(input.time.minute).padStart(2, '0')}:00`);
          const now = new Date();
          const minutesUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60);

          const dateObj = new Date(input.date);
          const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const formattedDate = `${dayName}, ${day}/${month}/${year}`;

          const reminder1MinutesBeforeReservation = reminder1Hours * 60;
          const reminder2MinutesBeforeReservation = reminder2Minutes;

          if (reminder1Enabled && minutesUntilReservation > reminder1MinutesBeforeReservation) {
            const scheduledFor1 = new Date(reservationDateTime.getTime() - reminder1Hours * 60 * 60 * 1000);
            console.log(`📅 [MODIFY] Programando recordatorio 1 (${reminder1Hours}h antes) para: ${scheduledFor1.toISOString()}`);
            
            try {
              const reminder1Message = `Hola *${client.name}*, le recordamos que tiene una reserva el *${formattedDate}* a las *${timeString}*, si lo desea puede modificar esta reserva desde el mensaje anterior. Quedamos a su disposición para solucionar cualquier duda. Un saludo.\n\n*${restaurant.name}*`;
              
              await notificationQueue.scheduleNotification({
                restaurantId: oldReservation.restaurant_id,
                reservationId: newReservationId,
                recipientPhone: client.phone,
                recipientName: client.name,
                message: reminder1Message,
                notificationType: `reminder_${reminder1Hours}h`,
                scheduledFor: scheduledFor1,
              });
              console.log(`✅ [MODIFY] Recordatorio ${reminder1Hours}h programado`);
            } catch (error) {
              console.error('❌ [MODIFY] Error programando recordatorio 1:', error);
            }
          } else if (reminder1Enabled) {
            console.log(`⚠️ [MODIFY] Recordatorio ${reminder1Hours}h omitido: faltan ${Math.floor(minutesUntilReservation / 60)}h (menos de ${reminder1Hours}h)`);
          }

          if (reminder2Enabled && minutesUntilReservation > reminder2MinutesBeforeReservation) {
            const scheduledFor2 = new Date(reservationDateTime.getTime() - reminder2Minutes * 60 * 1000);
            console.log(`📅 [MODIFY] Programando recordatorio 2 (${reminder2Minutes}m antes) para: ${scheduledFor2.toISOString()}`);
            
            try {
              const reminder2Message = `Hola *${client.name}*, le recordamos que tiene una reserva Hoy a las *${timeString}*, le rogamos puntualidad. Un saludo.\n\n*${restaurant.name}*`;
              
              await notificationQueue.scheduleNotification({
                restaurantId: oldReservation.restaurant_id,
                reservationId: newReservationId,
                recipientPhone: client.phone,
                recipientName: client.name,
                message: reminder2Message,
                notificationType: `reminder_${reminder2Minutes}m`,
                scheduledFor: scheduledFor2,
              });
              console.log(`✅ [MODIFY] Recordatorio ${reminder2Minutes}m programado`);
            } catch (error) {
              console.error('❌ [MODIFY] Error programando recordatorio 2:', error);
            }
          } else if (reminder2Enabled) {
            console.log(`⚠️ [MODIFY] Recordatorio ${reminder2Minutes}m omitido: faltan ${Math.floor(minutesUntilReservation)}m (menos de ${reminder2Minutes}m)`);
          }
        }

        // Notificar al CLIENTE sobre la modificación
        if (restaurant.use_whatsapp_web && client.phone && !client.phone.startsWith('walkin-') && !client.phone.startsWith('walk-')) {
          try {
            const dateObj2 = new Date(input.date);
            const dayName2 = dateObj2.toLocaleDateString('es-ES', { weekday: 'long' });
            const day2 = String(dateObj2.getDate()).padStart(2, '0');
            const month2 = String(dateObj2.getMonth() + 1).padStart(2, '0');
            const year2 = dateObj2.getFullYear();
            const formattedDate2 = `${dayName2}, ${day2}/${month2}/${year2}`;

            const guestsInfo2 = [];
            if (input.guests > (input.highChairCount || 0)) {
              guestsInfo2.push(`${input.guests - (input.highChairCount || 0)} ${(input.guests - (input.highChairCount || 0)) === 1 ? 'adulto' : 'adultos'}`);
            }
            if (input.needsHighChair && input.highChairCount) {
              guestsInfo2.push(`${input.highChairCount} ${input.highChairCount === 1 ? 'trona' : 'tronas'}`);
            }
            const guestsText2 = guestsInfo2.length > 0 ? guestsInfo2.join(' + ') : `${input.guests} ${input.guests === 1 ? 'persona' : 'personas'}`;

            const clientConfirmMessage = `✅ *RESERVA MODIFICADA*\n\nHola *${client.name}*, le confirmamos que su reserva en *${restaurant.name}* ha sido modificada correctamente.\n\n📅 Nueva fecha: ${formattedDate2}\n🕐 Nueva hora: ${timeString}\n👥 Comensales: ${guestsText2}\n📍 Ubicación: ${locationName}\n${input.clientNotes ? `📝 Notas: ${input.clientNotes}\n` : ''}\nPuede consultar su reserva en el enlace del mensaje original.\n\nHasta pronto 👋\n*${restaurant.name}*`;

            await notificationQueue.scheduleNotification({
              restaurantId: oldReservation.restaurant_id,
              reservationId: newReservationId,
              recipientPhone: client.phone,
              recipientName: client.name,
              message: clientConfirmMessage,
              notificationType: 'client_modification_confirmation',
              scheduledFor: new Date(),
            });
            console.log(`✅ [MODIFY BY CLIENT] Confirmación de modificación encolada para cliente: ${client.phone}`);
          } catch (clientNotifError) {
            console.error('❌ [MODIFY BY CLIENT] Error encolando confirmación al cliente:', clientNotifError);
          }
        }
      }
      } catch (error) {
        console.error('❌ [MODIFY BY CLIENT] Error enviando notificaciones:', error);
      }

      console.log('✅ [MODIFY BY CLIENT] Modificación completada exitosamente');

      return { 
        success: true, 
        token: newToken,
        reservationId: newReservationId,
        message: 'Reserva modificada exitosamente. El restaurante ha sido notificado.' 
      };
    } catch (error: any) {
      console.error('❌ [MODIFY BY CLIENT] Error completo:', error);
      console.error('❌ [MODIFY BY CLIENT] Stack trace:', error.stack);
      console.error('❌ [MODIFY BY CLIENT] Detalles del error:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      });
      throw error;
    }
  });
