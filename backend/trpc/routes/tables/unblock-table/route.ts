import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa';

export const unblockTableRoute = publicProcedure
  .input(
    z.object({
      blockId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
      console.log('🔓 [UNBLOCK TABLE] Desbloqueando mesa:', input.blockId);

      // Check if this block is from a split operation (block-split-*)
      const isSplitBlock = input.blockId.startsWith('block-split-');
      
      if (isSplitBlock) {
        console.log('🔄 [UNBLOCK TABLE] Detectado bloqueo de división, verificando mesas temporales...');
        
        // Get the block info to find the original table
        const blockResult = await pool.query(
          `SELECT table_id, restaurant_id FROM table_blocks WHERE id = $1`,
          [input.blockId]
        );
        
        if (blockResult.rows.length > 0) {
          const { table_id: originalTableId, restaurant_id: restaurantId } = blockResult.rows[0];
          
          // Find split tables (tables with original_table_id pointing to this table)
          const splitTablesResult = await pool.query(
            `SELECT id, name FROM tables WHERE original_table_id = $1 AND is_temporary = TRUE`,
            [originalTableId]
          );
          
          if (splitTablesResult.rows.length > 0) {
            console.log('🔍 [UNBLOCK TABLE] Mesas divididas encontradas:', splitTablesResult.rows.map(t => t.name));
            
            // Check if any split table has a reservation
            const splitTableIds = splitTablesResult.rows.map(t => t.id);
            
            for (const splitTableId of splitTableIds) {
              const reservationCheck = await pool.query(
                `SELECT id FROM reservations 
                 WHERE restaurant_id = $1 
                 AND table_ids::jsonb ? $2
                 AND status NOT IN ('cancelled', 'modified')`,
                [restaurantId, splitTableId]
              );
              
              if (reservationCheck.rows.length > 0) {
                throw new Error('No se puede deshacer la división: una de las mesas divididas tiene una reserva activa');
              }
            }
            
            // No reservations on split tables, delete them
            for (const splitTableId of splitTableIds) {
              await pool.query(
                `DELETE FROM tables WHERE id = $1`,
                [splitTableId]
              );
              console.log('🗑️ [UNBLOCK TABLE] Mesa temporal eliminada:', splitTableId);
            }
            
            console.log('✅ [UNBLOCK TABLE] División deshecha, mesas temporales eliminadas');
          }
        }
      }

      // Delete the block
      await pool.query(
        `DELETE FROM table_blocks WHERE id = $1`,
        [input.blockId]
      );

      console.log('✅ [UNBLOCK TABLE] Mesa desbloqueada exitosamente');

      return { success: true, splitUndone: isSplitBlock };
    } catch (error: any) {
      console.error('❌ [UNBLOCK TABLE] Error:', error);
      throw new Error(error.message || 'No se pudo desbloquear la mesa');
    } finally {
      await pool.end();
    }
  });
