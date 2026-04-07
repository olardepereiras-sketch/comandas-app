import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import Stripe from 'stripe';

export const refundDepositOperationProcedure = publicProcedure
  .input(
    z.object({
      depositOrderId: z.string(),
      restaurantId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [REFUND DEPOSIT] Procesando devolución:', input.depositOrderId);

    try {
      const orderResult = await ctx.db.query(
        'SELECT * FROM deposit_orders WHERE id = $1 AND restaurant_id = $2',
        [input.depositOrderId, input.restaurantId]
      );

      if (orderResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Operación no encontrada' });
      }

      const order = orderResult.rows[0];

      if (order.status === 'refunded') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta operación ya fue devuelta' });
      }

      if (order.status !== 'paid') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solo se pueden devolver operaciones cobradas' });
      }

      if (!order.stripe_payment_intent_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No se encontró el identificador de pago de Stripe' });
      }

      const restaurantResult = await ctx.db.query(
        'SELECT deposits_stripe_secret_key FROM restaurants WHERE id = $1',
        [input.restaurantId]
      );

      if (restaurantResult.rows.length === 0 || !restaurantResult.rows[0].deposits_stripe_secret_key) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripe no está configurado' });
      }

      const stripe = new Stripe(restaurantResult.rows[0].deposits_stripe_secret_key, {
        apiVersion: '2026-01-28.clover',
      });

      const depositPerPerson = parseFloat(order.deposit_per_person || '0');
      const chargeableGuests = parseInt(order.chargeable_guests || '0');
      const baseAmountCents = Math.round(depositPerPerson * chargeableGuests * 100);

      console.log(`🔵 [REFUND DEPOSIT] Importe base (sin gastos gestión): ${baseAmountCents / 100}€ (${chargeableGuests} comensales × ${depositPerPerson}€)`);

      if (baseAmountCents <= 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'El importe a devolver debe ser mayor que 0' });
      }

      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: baseAmountCents,
      });

      console.log('✅ [REFUND DEPOSIT] Devolución Stripe creada:', refund.id);

      await ctx.db.query(
        `UPDATE deposit_orders 
         SET status = 'refunded', refunded_at = NOW(), refund_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [refund.id, input.depositOrderId]
      );

      console.log('✅ [REFUND DEPOSIT] Operación marcada como devuelta:', input.depositOrderId);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } catch (error: any) {
      console.error('❌ [REFUND DEPOSIT] Error:', error);
      if (
        error.code === 'NOT_FOUND' ||
        error.code === 'BAD_REQUEST' ||
        error.code === 'PRECONDITION_FAILED'
      ) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al procesar devolución: ${error.message}`,
      });
    }
  });
