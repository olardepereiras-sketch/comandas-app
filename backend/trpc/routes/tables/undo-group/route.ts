import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa';

export const undoGroupProcedure = publicProcedure
  .input(
    z.object({
      groupId: z.string(),
      restaurantId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
      console.log('🔄 [UNDO GROUP] Deshaciendo grupo:', input.groupId);

      // Get the group info
      const groupResult = await pool.query(
        `SELECT id, name, grouped_table_ids, shift_template_id, shift_date 
         FROM tables 
         WHERE id = $1 AND restaurant_id = $2 AND is_temporary = TRUE`,
        [input.groupId, input.restaurantId]
      );

      if (groupResult.rows.length === 0) {
        throw new Error('Grupo no encontrado');
      }

      const group = groupResult.rows[0];
      
      // Parse grouped table IDs
      const groupedTableIds = typeof group.grouped_table_ids === 'string' 
        ? JSON.parse(group.grouped_table_ids) 
        : group.grouped_table_ids;

      if (!Array.isArray(groupedTableIds) || groupedTableIds.length === 0) {
        throw new Error('No se encontraron las mesas originales del grupo');
      }

      console.log('📋 [UNDO GROUP] Mesas originales del grupo:', groupedTableIds);

      // Check if the group has any reservations
      const reservationCheck = await pool.query(
        `SELECT id FROM reservations 
         WHERE restaurant_id = $1 
         AND table_ids::jsonb ? $2
         AND status NOT IN ('cancelled', 'modified')`,
        [input.restaurantId, input.groupId]
      );

      if (reservationCheck.rows.length > 0) {
        throw new Error('No se puede deshacer el grupo: tiene una reserva activa');
      }

      // Delete the blocks on the original tables that were created when grouping
      // Blocks from grouping start with 'block-group-'
      for (const tableId of groupedTableIds) {
        const blockDeleteResult = await pool.query(
          `DELETE FROM table_blocks 
           WHERE table_id = $1 
           AND restaurant_id = $2 
           AND id LIKE 'block-group-%'`,
          [tableId, input.restaurantId]
        );
        console.log('🔓 [UNDO GROUP] Bloqueos eliminados para mesa:', tableId, 'filas:', blockDeleteResult.rowCount);
      }

      // Delete the temporary group table
      await pool.query(
        `DELETE FROM tables WHERE id = $1`,
        [input.groupId]
      );

      console.log('✅ [UNDO GROUP] Grupo deshecho exitosamente');

      return { 
        success: true, 
        groupId: input.groupId,
        unlockedTableIds: groupedTableIds,
      };
    } catch (error: any) {
      console.error('❌ [UNDO GROUP] Error:', error);
      throw new Error(error.message || 'No se pudo deshacer el grupo');
    } finally {
      await pool.end();
    }
  });
