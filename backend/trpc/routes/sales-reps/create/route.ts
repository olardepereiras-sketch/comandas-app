import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const createSalesRepProcedure = publicProcedure
  .input(
    z.object({
      firstName: z.string(),
      lastName: z.string(),
      dni: z.string(),
      address: z.string(),
      phone: z.string(),
      email: z.string().email(),
      newClientCommissionPercent: z.number().min(0).max(100),
      firstRenewalCommissionPercent: z.number().min(0).max(100),
      renewalCommissionPercent: z.number().min(0).max(100),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE SALES REP] Creando comercial:', input.firstName, input.lastName);

    const id = `salesrep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      await ctx.db.query(
        `INSERT INTO sales_representatives (
          id, first_name, last_name, dni, address, phone, email,
          new_client_commission_percent, first_renewal_commission_percent,
          renewal_commission_percent, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          id,
          input.firstName,
          input.lastName,
          input.dni,
          input.address,
          input.phone,
          input.email,
          input.newClientCommissionPercent,
          input.firstRenewalCommissionPercent,
          input.renewalCommissionPercent,
          true,
        ]
      );

      console.log('✅ [CREATE SALES REP] Comercial creado:', id);
      return { id, success: true };
    } catch (error: any) {
      console.error('❌ [CREATE SALES REP] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al crear comercial: ${error.message}`,
      });
    }
  });
