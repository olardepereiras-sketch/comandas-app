import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const undoSplitProcedure = publicProcedure
  .input(
    z.object({
      originalTableId: z.string().optional(),
      temporaryTableId: z.string().optional(),
      restaurantId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      console.log('🔄 [UNDO SPLIT] Deshaciendo división de mesa:', input);

      if (!input.originalTableId && !input.temporaryTableId) {
        throw new Error('Falta la mesa original o la mesa temporal');
      }

      let originalTableId = input.originalTableId;
      let shiftTemplateId: string | null = null;
      let shiftDate: string | null = null;

      if (input.temporaryTableId) {
        const temporaryTableResult = await ctx.db.query(
          `SELECT original_table_id, shift_template_id, shift_date
           FROM tables
           WHERE id = $1 AND restaurant_id = $2 AND is_temporary = TRUE`,
          [input.temporaryTableId, input.restaurantId]
        );

        if (temporaryTableResult.rows.length === 0) {
          throw new Error('Mesa temporal no encontrada');
        }

        originalTableId = (temporaryTableResult.rows[0]?.original_table_id as string | null) ?? originalTableId;
        shiftTemplateId = (temporaryTableResult.rows[0]?.shift_template_id as string | null) ?? null;
        shiftDate = (temporaryTableResult.rows[0]?.shift_date as string | null) ?? null;
      }

      if (!originalTableId) {
        throw new Error('No se encontró la mesa original');
      }

      const splitTablesParams: unknown[] = [originalTableId, input.restaurantId];
      let splitTablesQuery = `SELECT id, name FROM tables 
         WHERE original_table_id = $1 AND restaurant_id = $2 AND is_temporary = TRUE`;

      if (shiftTemplateId && shiftDate) {
        splitTablesParams.push(shiftTemplateId, shiftDate);
        splitTablesQuery += ` AND shift_template_id = $3 AND shift_date = $4`;
      }

      const splitTablesResult = await ctx.db.query(splitTablesQuery, splitTablesParams);

      if (splitTablesResult.rows.length === 0) {
        throw new Error('No se encontraron mesas divididas para esta mesa');
      }

      const splitTableIds = splitTablesResult.rows.map((t: any) => t.id as string);
      console.log('📋 [UNDO SPLIT] Mesas divididas encontradas:', splitTableIds);

      for (const tableId of splitTableIds) {
        const reservationCheck = await ctx.db.query(
          `SELECT id FROM reservations 
           WHERE restaurant_id = $1 
           AND table_ids::jsonb ? $2
           AND status NOT IN ('cancelled', 'modified')`,
          [input.restaurantId, tableId]
        );
        if (reservationCheck.rows.length > 0) {
          throw new Error('No se puede deshacer la división: una de las mesas tiene una reserva activa');
        }
      }

      await ctx.db.query(
        `DELETE FROM tables
         WHERE original_table_id = $1
         AND restaurant_id = $2
         AND is_temporary = TRUE
         ${shiftTemplateId && shiftDate ? 'AND shift_template_id = $3 AND shift_date = $4' : ''}`,
        shiftTemplateId && shiftDate
          ? [originalTableId, input.restaurantId, shiftTemplateId, shiftDate]
          : [originalTableId, input.restaurantId]
      );
      console.log('✅ [UNDO SPLIT] Mesas temporales eliminadas:', splitTableIds.length);

      const blockDeleteResult = await ctx.db.query(
        `DELETE FROM table_blocks 
         WHERE table_id = $1 
         AND restaurant_id = $2 
         AND id LIKE 'block-split-%'
         ${shiftTemplateId && shiftDate ? 'AND start_time::date = $3::date' : ''}`,
        shiftTemplateId && shiftDate
          ? [originalTableId, input.restaurantId, shiftDate]
          : [originalTableId, input.restaurantId]
      );
      console.log('🔓 [UNDO SPLIT] Bloqueos de división eliminados:', blockDeleteResult.rowCount);

      return {
        success: true,
        originalTableId,
        deletedTableIds: splitTableIds,
      };
    } catch (error: any) {
      console.error('❌ [UNDO SPLIT] Error:', error);
      throw new Error(error.message || 'No se pudo deshacer la división');
    }
  });
