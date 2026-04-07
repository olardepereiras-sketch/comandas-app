import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateScheduleProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      isOpen: z.boolean().optional(),
      shifts: z.array(
        z.object({
          templateId: z.string(),
          name: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          maxGuestsPerHour: z.number(),
          minRating: z.number(),
        })
      ).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE SCHEDULE] Actualizando horario:', input.id);

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (input.isOpen !== undefined) {
      updates.push(`is_open = $${paramCount++}`);
      params.push(input.isOpen);
    }

    if (input.shifts !== undefined) {
      updates.push(`shifts = $${paramCount++}`);
      params.push(JSON.stringify(input.shifts));
    }

    updates.push(`updated_at = $${paramCount++}`);
    params.push(new Date().toISOString());

    params.push(input.id);

    const sql = `UPDATE schedules SET ${updates.join(', ')} WHERE id = $${paramCount}`;

    try {
      const result = await ctx.db.query(sql, params);

      console.log('✅ [UPDATE SCHEDULE] Horario actualizado:', {
        id: input.id,
        rowsAffected: result.rowCount,
      });

      if ((result.rowCount || 0) === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Horario no encontrado',
        });
      }

      return { success: true, id: input.id };
    } catch (error: any) {
      console.error('❌ [UPDATE SCHEDULE] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar el horario: ${error.message}`,
      });
    }
  });
