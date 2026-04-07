import { publicProcedure, TRPCError } from '../../../create-context';

export const listSalesRepsProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [LIST SALES REPS] Listando comerciales');

    try {
      const result = await ctx.db.query(
        `SELECT 
          id, first_name, last_name, dni, address, phone, email,
          new_client_commission_percent, first_renewal_commission_percent,
          renewal_commission_percent, is_active, created_at, updated_at
         FROM sales_representatives 
         ORDER BY created_at DESC`
      );

      const salesReps = result.rows.map((row: any) => ({
        id: String(row.id),
        firstName: String(row.first_name),
        lastName: String(row.last_name),
        dni: String(row.dni),
        address: String(row.address),
        phone: String(row.phone),
        email: String(row.email),
        newClientCommissionPercent: Number(row.new_client_commission_percent),
        firstRenewalCommissionPercent: Number(row.first_renewal_commission_percent),
        renewalCommissionPercent: Number(row.renewal_commission_percent),
        isActive: Boolean(row.is_active),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      }));

      console.log(`✅ [LIST SALES REPS] ${salesReps.length} comerciales encontrados`);
      return salesReps;
    } catch (error: any) {
      console.error('❌ [LIST SALES REPS] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al listar comerciales: ${error.message}`,
      });
    }
  });
