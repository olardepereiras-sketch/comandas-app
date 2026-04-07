import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateSalesRepProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      dni: z.string(),
      address: z.string(),
      phone: z.string(),
      email: z.string().email(),
      newClientCommissionPercent: z.number().min(0).max(100),
      firstRenewalCommissionPercent: z.number().min(0).max(100),
      renewalCommissionPercent: z.number().min(0).max(100),
      isActive: z.boolean(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE SALES REP] Actualizando comercial:', input.id);

    try {
      const result = await ctx.db.query(
        `UPDATE sales_representatives 
         SET first_name = $1, last_name = $2, dni = $3, address = $4, 
             phone = $5, email = $6, new_client_commission_percent = $7,
             first_renewal_commission_percent = $8, renewal_commission_percent = $9,
             is_active = $10, updated_at = NOW()
         WHERE id = $11`,
        [
          input.firstName,
          input.lastName,
          input.dni,
          input.address,
          input.phone,
          input.email,
          input.newClientCommissionPercent,
          input.firstRenewalCommissionPercent,
          input.renewalCommissionPercent,
          input.isActive,
          input.id,
        ]
      );

      if (result.rowCount === 0) {
        throw new Error('Comercial no encontrado');
      }

      console.log('✅ [UPDATE SALES REP] Comercial actualizado:', input.id);
      return { success: true };
    } catch (error: any) {
      console.error('❌ [UPDATE SALES REP] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar comercial: ${error.message}`,
      });
    }
  });
