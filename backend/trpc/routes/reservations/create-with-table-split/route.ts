import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createReservationWithTableSplitProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      clientPhone: z.string(),
      clientName: z.string(),
      date: z.string(),
      time: z.object({
        hour: z.number(),
        minute: z.number(),
      }),
      guests: z.number(),
      locationId: z.string(),
      needsHighChair: z.boolean(),
      highChairCount: z.number().optional(),
      needsStroller: z.boolean(),
      hasPets: z.boolean(),
      notes: z.string().optional(),
      splitConfig: z.object({
        originalTableId: z.string(),
        originalTableName: z.string(),
        splitTableBCapacity: z.number(),
        splitTableBHighChairs: z.number(),
        splitTableBAllowsStroller: z.boolean(),
        splitTableBAllowsPets: z.boolean(),
        splitTableACapacity: z.number(),
        splitTableAHighChairs: z.number(),
        splitTableAAllowsStroller: z.boolean(),
        splitTableAAllowsPets: z.boolean(),
      }),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE WITH SPLIT] Iniciando creación de reserva con división de mesa');
    console.log('🔵 [CREATE WITH SPLIT] Config división:', input.splitConfig);

    const now = new Date();
    
    let clientId: string;
    const clientResult = await ctx.db.query(
      'SELECT * FROM clients WHERE phone = $1',
      [input.clientPhone]
    );
    
    if (clientResult.rows.length === 0) {
      clientId = `client-${Date.now()}`;
      await ctx.db.query(
        `INSERT INTO clients (id, name, phone, email, rating, total_ratings, user_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [clientId, input.clientName, input.clientPhone, 'sin-email@example.com', 4, 0, 'user_new', now, now]
      );
      console.log('✅ [CREATE WITH SPLIT] Cliente creado:', clientId);
    } else {
      clientId = clientResult.rows[0].id;
      console.log('✅ [CREATE WITH SPLIT] Cliente existente:', clientId);
    }

    const reservationId = `res-${Date.now()}`;
    const confirmationToken = `token-${Date.now()}`;
    const confirmationToken2 = `token2-${Date.now()}`;

    const locationResult = await ctx.db.query(
      'SELECT name FROM table_locations WHERE id = $1',
      [input.locationId]
    );
    const locationName = locationResult.rows[0]?.name || 'Sin ubicación';

    console.log('🔵 [CREATE WITH SPLIT] Verificando mesa original...');
    const originalTableResult = await ctx.db.query(
      'SELECT * FROM tables WHERE id = $1',
      [input.splitConfig.originalTableId]
    );
    
    if (originalTableResult.rows.length === 0) {
      throw new Error('Mesa original no encontrada');
    }
    
    const originalTable = originalTableResult.rows[0];
    console.log('✅ [CREATE WITH SPLIT] Mesa original encontrada:', originalTable.name);

    console.log('🔵 [CREATE WITH SPLIT] Creando mesas temporales...');
    
    const tempTableAId = `${input.splitConfig.originalTableId}A-${reservationId}`;
    const tempTableBId = `${input.splitConfig.originalTableId}B-${reservationId}`;
    
    await ctx.db.query(
      `INSERT INTO temporary_tables (
        id, restaurant_id, location_id, reservation_id,
        original_table_id, name, min_capacity, max_capacity,
        high_chairs, allows_stroller, allows_pets, table_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        tempTableAId,
        input.restaurantId,
        input.locationId,
        reservationId,
        input.splitConfig.originalTableId,
        `${input.splitConfig.originalTableName}A`,
        input.splitConfig.splitTableACapacity,
        input.splitConfig.splitTableACapacity,
        input.splitConfig.splitTableAHighChairs,
        input.splitConfig.splitTableAAllowsStroller,
        input.splitConfig.splitTableAAllowsPets,
        'split_a'
      ]
    );
    console.log('✅ [CREATE WITH SPLIT] Mesa temporal A creada:', tempTableAId);

    await ctx.db.query(
      `INSERT INTO temporary_tables (
        id, restaurant_id, location_id, reservation_id,
        original_table_id, name, min_capacity, max_capacity,
        high_chairs, allows_stroller, allows_pets, table_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        tempTableBId,
        input.restaurantId,
        input.locationId,
        reservationId,
        input.splitConfig.originalTableId,
        `${input.splitConfig.originalTableName}B`,
        input.splitConfig.splitTableBCapacity,
        input.splitConfig.splitTableBCapacity,
        input.splitConfig.splitTableBHighChairs,
        input.splitConfig.splitTableBAllowsStroller,
        input.splitConfig.splitTableBAllowsPets,
        'split_b'
      ]
    );
    console.log('✅ [CREATE WITH SPLIT] Mesa temporal B creada:', tempTableBId);

    console.log('🔵 [CREATE WITH SPLIT] Bloqueando mesa original (sin modificar sus propiedades)...');
    await ctx.db.query(
      `INSERT INTO table_blocks_for_split (id, table_id, reservation_id, blocked_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (table_id, reservation_id) DO NOTHING`,
      [`block-${Date.now()}`, input.splitConfig.originalTableId, reservationId]
    );
    console.log('✅ [CREATE WITH SPLIT] Mesa original bloqueada');

    console.log('🔵 [CREATE WITH SPLIT] Creando reserva con mesa temporal B...');
    await ctx.db.query(
      `INSERT INTO reservations (
        id, restaurant_id, client_id, client_phone, client_name, client_email,
        date, time, guests, location_id, location_name, table_ids, 
        needs_high_chair, high_chair_count, needs_stroller, has_pets, 
        status, notes, client_notes, confirmation_token, confirmation_token2, 
        token, pending_expires_at, is_new_client, created_at, updated_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, (NOW() AT TIME ZONE 'UTC') + INTERVAL '15 minutes', $23, $24, $25)`,
      [
        reservationId,
        input.restaurantId,
        clientId,
        input.clientPhone || '',
        input.clientName || '',
        '',
        input.date,
        JSON.stringify(input.time),
        input.guests,
        input.locationId,
        locationName,
        JSON.stringify([tempTableBId]),
        input.needsHighChair,
        input.highChairCount || 0,
        input.needsStroller,
        input.hasPets,
        'pending',
        input.notes || '',
        input.notes || '',
        confirmationToken,
        confirmationToken2,
        confirmationToken,
        clientResult.rows.length === 0,
        now,
        now,
      ]
    );
    console.log('✅ [CREATE WITH SPLIT] Reserva creada con éxito');

    console.log('🔵 [CREATE WITH SPLIT] Enviando notificaciones...');
    
    const restaurantResult = await ctx.db.query(
      'SELECT * FROM restaurants WHERE id = $1',
      [input.restaurantId]
    );
    const restaurant = restaurantResult.rows[0];

    if (!restaurant) {
      throw new Error('Restaurante no encontrado');
    }

    const { sendReservationNotifications } = await import('../../../../services/email');
    const { WhatsAppNotificationQueue } = await import('../../../../services/whatsapp-notification-queue');

    try {
      await sendReservationNotifications({
        reservationId,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        date: input.date,
        time: input.time,
        guests: input.guests,
        tableName: `${input.splitConfig.originalTableName}B`,
        locationName,
        restaurantName: restaurant.name,
        restaurantEmail: restaurant.email,
        confirmationToken,
        confirmationToken2,
      });

      if (restaurant.whatsapp_enabled) {
        const queue = WhatsAppNotificationQueue.getInstance();
        await queue.addReservationNotification({
          reservationId,
          clientPhone: input.clientPhone,
          clientName: input.clientName,
          restaurantId: input.restaurantId,
          date: input.date,
          time: input.time,
          guests: input.guests,
          tableName: `${input.splitConfig.originalTableName}B`,
          locationName,
          confirmationToken,
        });
      }

      console.log('✅ [CREATE WITH SPLIT] Notificaciones enviadas');
    } catch (error) {
      console.error('❌ [CREATE WITH SPLIT] Error enviando notificaciones:', error);
    }

    return {
      success: true,
      reservationId,
      temporaryTables: {
        tableA: tempTableAId,
        tableB: tempTableBId,
      },
      confirmationToken,
    };
  });
