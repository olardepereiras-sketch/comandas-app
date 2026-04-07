import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateModuleProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      icon: z.string().min(1).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      route: z.string().optional(),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE MODULE] Actualizando módulo:', input.id);

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(input.description);
    }
    if (input.icon !== undefined) {
      updates.push(`icon = $${paramCount++}`);
      params.push(input.icon);
    }
    if (input.color !== undefined) {
      updates.push(`color = $${paramCount++}`);
      params.push(input.color);
    }
    if (input.route !== undefined) {
      updates.push(`route = $${paramCount++}`);
      params.push(input.route);
    }
    if (input.displayOrder !== undefined) {
      updates.push(`display_order = $${paramCount++}`);
      params.push(input.displayOrder);
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      params.push(input.isActive);
    }

    updates.push(`updated_at = $${paramCount++}`);
    params.push(new Date());

    params.push(input.id);

    const sql = `UPDATE modules SET ${updates.join(', ')} WHERE id = $${paramCount}`;

    try {
      const result = await ctx.db.query(sql, params);

      console.log('✅ [UPDATE MODULE] Módulo actualizado:', {
        id: input.id,
        rowsAffected: result.rowCount,
      });

      if ((result.rowCount || 0) === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Módulo no encontrado',
        });
      }

      return { success: true, id: String(input.id) };
    } catch (error: any) {
      console.error('❌ [UPDATE MODULE] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar el módulo: ${error.message}`,
      });
    }
  });
