import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateSubscriptionPlanProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      price: z.number().nonnegative().optional(),
      enabledModules: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE SUBSCRIPTION PLAN] Actualizando tarifa:', input.id);
    console.log('🔍 [UPDATE SUBSCRIPTION PLAN] Datos recibidos:', {
      name: input.name,
      price: input.price,
      enabledModules: input.enabledModules,
      isActive: input.isActive
    });

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(input.name);
    }
    if (input.price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      params.push(input.price);
    }
    if (input.enabledModules !== undefined) {
      updates.push(`enabled_modules = $${paramCount++}`);
      params.push(JSON.stringify(input.enabledModules));
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      params.push(input.isActive);
    }

    updates.push(`updated_at = $${paramCount++}`);
    params.push(new Date());

    params.push(input.id);

    const sql = `UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = $${paramCount}`;

    try {
      const result = await ctx.db.query(sql, params);

      console.log('✅ [UPDATE SUBSCRIPTION PLAN] Tarifa actualizada:', {
        id: input.id,
        rowsAffected: result.rowCount,
        sql: sql,
        params: params
      });

      if ((result.rowCount || 0) === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tarifa no encontrada',
        });
      }

      return { success: true, id: String(input.id) };
    } catch (error: any) {
      console.error('❌ [UPDATE SUBSCRIPTION PLAN] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar la tarifa: ${error.message}`,
      });
    }
  });
