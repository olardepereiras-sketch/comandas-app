import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const listDepositOperationsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      phone: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST DEPOSIT OPS] Listando operaciones:', input.restaurantId);

    try {
      try {
        await ctx.db.query(`ALTER TABLE deposit_orders ADD COLUMN IF NOT EXISTS management_fee_percent DECIMAL(5,2) DEFAULT 0`);
        await ctx.db.query(`ALTER TABLE deposit_orders ADD COLUMN IF NOT EXISTS management_fee_amount DECIMAL(10,2) DEFAULT 0`);
        await ctx.db.query(`ALTER TABLE deposit_orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP`);
        await ctx.db.query(`ALTER TABLE deposit_orders ADD COLUMN IF NOT EXISTS refund_id TEXT`);
      } catch (e) {}

      const conditions: string[] = ['do2.restaurant_id = $1', "do2.status != 'pending'"];
      const params: any[] = [input.restaurantId];
      let paramIdx = 2;

      if (input.dateFrom) {
        conditions.push(`do2.reservation_date >= $${paramIdx++}`);
        params.push(input.dateFrom);
      }
      if (input.dateTo) {
        conditions.push(`do2.reservation_date <= $${paramIdx++}`);
        params.push(input.dateTo);
      }
      if (input.phone && input.phone.trim()) {
        conditions.push(`do2.client_phone ILIKE $${paramIdx++}`);
        params.push(`%${input.phone.trim()}%`);
      }

      const whereClause = conditions.join(' AND ');

      const countResult = await ctx.db.query(
        `SELECT COUNT(*) as total FROM deposit_orders do2 WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total || '0');

      const offset = (input.page - 1) * input.limit;
      const dataParams = [...params, input.limit, offset];

      const result = await ctx.db.query(
        `SELECT 
          do2.id,
          do2.client_name,
          do2.client_phone,
          do2.reservation_date,
          do2.guests,
          do2.chargeable_guests,
          do2.deposit_per_person,
          do2.total_amount,
          do2.management_fee_percent,
          do2.management_fee_amount,
          do2.status,
          do2.stripe_payment_intent_id,
          do2.reservation_id,
          do2.refunded_at,
          do2.refund_id,
          do2.created_at
        FROM deposit_orders do2
        WHERE ${whereClause}
        ORDER BY do2.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        dataParams
      );

      const operations = result.rows.map((row: any) => {
        const reservationShortId = (row.reservation_id || '')
          .substring((row.reservation_id || '').length - 8) || '';
        return {
          id: row.id,
          clientName: row.client_name || '',
          clientPhone: row.client_phone || '',
          reservationDate: row.reservation_date || '',
          guests: row.guests || 0,
          chargeableGuests: row.chargeable_guests || 0,
          depositPerPerson: parseFloat(row.deposit_per_person || '0'),
          totalAmount: parseFloat(row.total_amount || '0'),
          managementFeePercent: parseFloat(row.management_fee_percent || '0'),
          managementFeeAmount: parseFloat(row.management_fee_amount || '0'),
          status: (row.status || 'pending') as string,
          stripePaymentIntentId: row.stripe_payment_intent_id || '',
          reservationId: row.reservation_id || '',
          reservationShortId,
          refundedAt: row.refunded_at ? new Date(row.refunded_at).toISOString() : null,
          refundId: row.refund_id || null,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        };
      });

      console.log(`✅ [LIST DEPOSIT OPS] ${operations.length} operaciones encontradas de ${total} total`);

      return {
        operations,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    } catch (error: any) {
      console.error('❌ [LIST DEPOSIT OPS] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al listar operaciones: ${error.message}`,
      });
    }
  });
