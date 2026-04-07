import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import Stripe from 'stripe';

export const confirmDepositPaymentProcedure = publicProcedure
  .input(
    z.object({
      depositOrderId: z.string(),
      sessionId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CONFIRM DEPOSIT] Verificando pago de fianza:', input.depositOrderId);

    try {
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
            reservation_data JSONB,
            stripe_session_id TEXT,
            stripe_payment_intent_id TEXT,
            reservation_id TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )`
        );
      } catch (e) {}

      const orderResult = await ctx.db.query(
        'SELECT * FROM deposit_orders WHERE id = $1',
        [input.depositOrderId]
      );

      if (orderResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Orden de fianza no encontrada' });
      }

      const order = orderResult.rows[0];

      if (order.status === 'paid') {
        console.log('✅ [CONFIRM DEPOSIT] Fianza ya estaba pagada');
        return {
          paid: true,
          depositOrderId: input.depositOrderId,
          reservationData: typeof order.reservation_data === 'string'
            ? JSON.parse(order.reservation_data)
            : order.reservation_data,
        };
      }

      const restaurantResult = await ctx.db.query(
        'SELECT deposits_stripe_secret_key FROM restaurants WHERE id = $1',
        [order.restaurant_id]
      );

      if (restaurantResult.rows.length === 0 || !restaurantResult.rows[0].deposits_stripe_secret_key) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripe no configurado' });
      }

      const stripe = new Stripe(restaurantResult.rows[0].deposits_stripe_secret_key, {
        apiVersion: '2026-01-28.clover',
      });

      const session = await stripe.checkout.sessions.retrieve(input.sessionId);

      if (session.payment_status === 'paid') {
        await ctx.db.query(
          `UPDATE deposit_orders SET 
            status = 'paid', 
            stripe_payment_intent_id = $1,
            updated_at = NOW()
          WHERE id = $2`,
          [session.payment_intent, input.depositOrderId]
        );

        console.log('✅ [CONFIRM DEPOSIT] Fianza pagada correctamente:', input.depositOrderId);

        return {
          paid: true,
          depositOrderId: input.depositOrderId,
          reservationData: typeof order.reservation_data === 'string'
            ? JSON.parse(order.reservation_data)
            : order.reservation_data,
        };
      } else {
        console.log('⚠️ [CONFIRM DEPOSIT] Pago no completado, estado:', session.payment_status);
        return {
          paid: false,
          depositOrderId: input.depositOrderId,
          reservationData: null,
        };
      }
    } catch (error: any) {
      console.error('❌ [CONFIRM DEPOSIT] Error:', error);
      if (error.code === 'NOT_FOUND' || error.code === 'PRECONDITION_FAILED') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al verificar pago de fianza: ${error.message}`,
      });
    }
  });
