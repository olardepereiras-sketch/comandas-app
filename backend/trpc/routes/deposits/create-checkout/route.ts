import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import Stripe from 'stripe';

export const createDepositCheckoutProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string(),
      guests: z.number(),
      highChairCount: z.number().optional(),
      clientPhone: z.string(),
      clientName: z.string(),
      reservationData: z.object({
        time: z.object({ hour: z.number(), minute: z.number() }),
        locationId: z.string(),
        needsHighChair: z.boolean(),
        needsStroller: z.boolean(),
        hasPets: z.boolean(),
        notes: z.string().optional(),
        tableIds: z.array(z.string()).optional(),
      }),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DEPOSIT CHECKOUT] Creando sesión de pago de fianza...');

    try {
      const restaurantResult = await ctx.db.query(
        `SELECT 
          name, slug,
          deposits_enabled, deposits_default_amount,
          deposits_stripe_secret_key, deposits_stripe_publishable_key,
          deposits_custom_message, deposits_specific_days,
          deposits_include_high_chairs, deposits_apply_to_all_days,
          deposits_management_fee_enabled, deposits_management_fee_percent,
          deposits_cancellation_hours, deposits_auto_refund, deposits_cancellation_policy
        FROM restaurants WHERE id = $1`,
        [input.restaurantId]
      );

      if (restaurantResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Restaurante no encontrado' });
      }

      const restaurant = restaurantResult.rows[0];

      if (!restaurant.deposits_enabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'El sistema de fianzas no está activado' });
      }

      if (!restaurant.deposits_stripe_secret_key) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripe no está configurado para fianzas' });
      }

      const specificDays = restaurant.deposits_specific_days
        ? (typeof restaurant.deposits_specific_days === 'string'
          ? JSON.parse(restaurant.deposits_specific_days)
          : restaurant.deposits_specific_days)
        : [];

      const dayConfig = specificDays.find((d: any) => d.date === input.date);
      const applyToAllDays = restaurant.deposits_apply_to_all_days !== false;

      let depositAmount = parseFloat(restaurant.deposits_default_amount || '0');
      let depositMessage = restaurant.deposits_custom_message || '';

      if (dayConfig) {
        depositAmount = dayConfig.amount;
        if (dayConfig.customMessage) depositMessage = dayConfig.customMessage;
        console.log(`🔵 [DEPOSIT CHECKOUT] Config específica para ${input.date}: ${depositAmount}€`);
      } else if (!applyToAllDays) {
        console.log(`🔵 [DEPOSIT CHECKOUT] No aplica a todos los días y no hay config específica para ${input.date}`);
        const includeHighChairsDefault = restaurant.deposits_include_high_chairs !== false;
        const highChairsDefault = input.highChairCount || 0;
        const chargeableGuestsDefault = includeHighChairsDefault ? input.guests : Math.max(1, input.guests - highChairsDefault);
        return {
          requiresPayment: false,
          totalDeposit: 0,
          depositPerPerson: 0,
          chargeableGuests: chargeableGuestsDefault,
          depositMessage: '',
          managementFeeAmount: 0,
          managementFeePercent: 0,
          totalWithFee: 0,
        };
      }

      const includeHighChairs = restaurant.deposits_include_high_chairs !== false;
      const highChairs = input.highChairCount || 0;
      const chargeableGuests = includeHighChairs ? input.guests : Math.max(1, input.guests - highChairs);
      const totalDeposit = depositAmount * chargeableGuests;

      const managementFeeEnabled = restaurant.deposits_management_fee_enabled || false;
      const managementFeePercent = parseFloat(restaurant.deposits_management_fee_percent || '0');
      const managementFeeAmount = managementFeeEnabled && managementFeePercent > 0
        ? Math.round(totalDeposit * (managementFeePercent / 100) * 100) / 100
        : 0;
      const totalWithFee = Math.round((totalDeposit + managementFeeAmount) * 100) / 100;

      if (totalWithFee <= 0) {
        return {
          requiresPayment: false,
          totalDeposit: 0,
          depositPerPerson: 0,
          chargeableGuests,
          depositMessage,
          managementFeeAmount: 0,
          managementFeePercent: 0,
          totalWithFee: 0,
        };
      }

      // Verificar disponibilidad de mesas
      console.log('🔍 [DEPOSIT CHECKOUT] Verificando disponibilidad de mesas...');
      const { time, locationId, needsHighChair, needsStroller, hasPets } = input.reservationData;
      const rotationMinutes = 90;

      const blockedTablesResult = await ctx.db.query(
        `SELECT DISTINCT table_id FROM table_blocks 
         WHERE restaurant_id = $1 AND location_id = $2 AND start_time <= $3 AND end_time > $3`,
        [input.restaurantId, locationId, new Date(`${input.date}T${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:00`)]
      );
      const blockedTableIds = new Set(blockedTablesResult.rows.map((r: any) => r.table_id));

      const compatibleTablesResult = await ctx.db.query(
        `SELECT id FROM tables 
         WHERE restaurant_id = $1 AND location_id = $2
           AND (is_temporary IS NOT TRUE)
           AND is_active = TRUE AND max_capacity >= $3
           AND ($4 = FALSE OR allows_high_chairs = TRUE)
           AND ($5 = FALSE OR allows_strollers = TRUE)
           AND ($6 = FALSE OR allows_pets = TRUE)`,
        [input.restaurantId, locationId, input.guests, needsHighChair, needsStroller, hasPets]
      );

      const compatibleTables = compatibleTablesResult.rows.filter((t: any) => !blockedTableIds.has(t.id));

      if (compatibleTables.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No hay mesas disponibles para los requisitos seleccionados.' });
      }

      const targetTimeMinutes = time.hour * 60 + time.minute;
      const allReservationsResult = await ctx.db.query(
        `SELECT table_ids, time FROM reservations WHERE restaurant_id = $1 AND date = $2 AND status NOT IN ('cancelled', 'no_show')`,
        [input.restaurantId, input.date]
      );

      const occupiedTableIds = new Set<string>();
      for (const row of allReservationsResult.rows) {
        try {
          const resTime = typeof row.time === 'string' ? JSON.parse(row.time) : row.time;
          const resTimeMinutes = resTime.hour * 60 + resTime.minute;
          if (Math.abs(targetTimeMinutes - resTimeMinutes) < rotationMinutes) {
            const tableIds = typeof row.table_ids === 'string' ? JSON.parse(row.table_ids) : row.table_ids;
            if (Array.isArray(tableIds)) tableIds.forEach((id: string) => occupiedTableIds.add(id));
          }
        } catch (e) {}
      }

      const freeTables = compatibleTables.filter((t: any) => !occupiedTableIds.has(t.id));

      if (freeTables.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `No hay mesas disponibles para las ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')} el ${input.date}.`,
        });
      }

      console.log(`✅ [DEPOSIT CHECKOUT] ${freeTables.length} mesa(s) disponible(s). Fianza: ${depositAmount}€ x ${chargeableGuests} = ${totalDeposit}€ + gastos ${managementFeeAmount}€ = ${totalWithFee}€`);

      const stripe = new Stripe(restaurant.deposits_stripe_secret_key, {
        apiVersion: '2026-01-28.clover',
      });

      const depositOrderId = `deposit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        await ctx.db.query(
          `CREATE TABLE IF NOT EXISTS deposit_orders (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL,
            client_phone TEXT NOT NULL,
            client_name TEXT NOT NULL,
            reservation_date TEXT,
            guests INTEGER,
            high_chair_count INTEGER DEFAULT 0,
            include_high_chairs BOOLEAN DEFAULT TRUE,
            deposit_per_person DECIMAL(10,2),
            total_amount DECIMAL(10,2),
            chargeable_guests INTEGER,
            management_fee_percent DECIMAL(5,2) DEFAULT 0,
            management_fee_amount DECIMAL(10,2) DEFAULT 0,
            reservation_data JSONB,
            stripe_session_id TEXT,
            stripe_payment_intent_id TEXT,
            reservation_id TEXT,
            status TEXT DEFAULT 'pending',
            refunded_at TIMESTAMP,
            refund_id TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )`
        );
      } catch (tableErr: any) {
        if (!tableErr.message?.includes('already exists')) {
          console.error('⚠️ [DEPOSIT] Error creando tabla deposit_orders:', tableErr.message);
        }
      }

      try {
        await ctx.db.query(`ALTER TABLE deposit_orders ADD COLUMN IF NOT EXISTS management_fee_percent DECIMAL(5,2) DEFAULT 0`);
        await ctx.db.query(`ALTER TABLE deposit_orders ADD COLUMN IF NOT EXISTS management_fee_amount DECIMAL(10,2) DEFAULT 0`);
        await ctx.db.query(`ALTER TABLE deposit_orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP`);
        await ctx.db.query(`ALTER TABLE deposit_orders ADD COLUMN IF NOT EXISTS refund_id TEXT`);
      } catch (e) {}

      await ctx.db.query(
        `INSERT INTO deposit_orders (
          id, restaurant_id, client_phone, client_name,
          reservation_date, guests, high_chair_count, include_high_chairs,
          deposit_per_person, total_amount, chargeable_guests,
          management_fee_percent, management_fee_amount,
          reservation_data, status, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())`,
        [
          depositOrderId, input.restaurantId, input.clientPhone, input.clientName,
          input.date, input.guests, highChairs, includeHighChairs,
          depositAmount, totalWithFee, chargeableGuests,
          managementFeePercent, managementFeeAmount,
          JSON.stringify({
            ...input.reservationData,
            restaurantId: input.restaurantId,
            clientPhone: input.clientPhone,
            clientName: input.clientName,
            date: input.date,
            guests: input.guests,
            highChairCount: input.highChairCount,
          }),
          'pending',
        ]
      );

      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://quieromesa.com';
      const restaurantSlug = restaurant.slug || '';

      const lineItems: any[] = [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Fianza - ${restaurant.name}`,
              description: `${depositAmount}€ x ${chargeableGuests} comensal${chargeableGuests > 1 ? 'es' : ''}`,
            },
            unit_amount: Math.round(depositAmount * 100),
          },
          quantity: chargeableGuests,
        },
      ];

      if (managementFeeAmount > 0) {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Gastos de gestión',
              description: `${managementFeePercent}% sobre el importe de la fianza`,
            },
            unit_amount: Math.round(managementFeeAmount * 100),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/client/deposit-success?session_id={CHECKOUT_SESSION_ID}&deposit_id=${depositOrderId}&slug=${restaurantSlug}`,
        cancel_url: `${baseUrl}/client/restaurant/${restaurantSlug}?deposit_canceled=true`,
        client_reference_id: depositOrderId,
        metadata: {
          depositOrderId,
          restaurantId: input.restaurantId,
          clientPhone: input.clientPhone,
          clientName: input.clientName,
        },
      });

      await ctx.db.query(
        'UPDATE deposit_orders SET stripe_session_id = $1 WHERE id = $2',
        [session.id, depositOrderId]
      );

      console.log('✅ [DEPOSIT CHECKOUT] Sesión de Stripe creada:', session.id);

      return {
        requiresPayment: true,
        sessionId: session.id,
        url: session.url,
        depositOrderId,
        totalDeposit,
        depositPerPerson: depositAmount,
        chargeableGuests,
        depositMessage,
        managementFeeEnabled,
        managementFeePercent,
        managementFeeAmount,
        totalWithFee,
      };
    } catch (error: any) {
      console.error('❌ [DEPOSIT CHECKOUT] Error:', error);
      if (
        error.code === 'NOT_FOUND' ||
        error.code === 'BAD_REQUEST' ||
        error.code === 'PRECONDITION_FAILED'
      ) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al crear sesión de fianza: ${error.message}`,
      });
    }
  });
