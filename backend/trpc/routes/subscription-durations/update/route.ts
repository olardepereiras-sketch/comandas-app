import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateSubscriptionDurationProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      months: z.number().int().min(0).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE SUBSCRIPTION DURATION] Actualizando duración:', input.id);

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(input.name);
    }
    if (input.months !== undefined) {
      updates.push(`months = $${paramCount++}`);
      params.push(input.months);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(input.description);
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      params.push(input.isActive);
    }

    updates.push(`updated_at = $${paramCount++}`);
    params.push(new Date());

    params.push(input.id);

    const sql = `UPDATE subscription_durations SET ${updates.join(', ')} WHERE id = $${paramCount}`;

    try {
      const result = await ctx.db.query(sql, params);

      console.log('✅ [UPDATE SUBSCRIPTION DURATION] Duración actualizada:', {
        id: input.id,
        rowsAffected: result.rowCount,
      });

      if ((result.rowCount || 0) === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Duración no encontrada',
        });
      }

      return { success: true, id: String(input.id) };
    } catch (error: any) {
      console.error('❌ [UPDATE SUBSCRIPTION DURATION] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar la duración: ${error.message}`,
      });
    }
  });
