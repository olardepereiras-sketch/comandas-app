import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteProvinceProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE PROVINCE] Iniciando borrado:', input.id);

    const provinceResult = await ctx.db.query(
      'SELECT * FROM provinces WHERE id = $1',
      [input.id]
    );
    
    if (provinceResult.rows.length === 0) {
      console.log('❌ [DELETE PROVINCE] Provincia no encontrada');
      throw new Error('Provincia no encontrada');
    }

    const citiesResult = await ctx.db.query(
      'SELECT COUNT(*) as count FROM cities WHERE province_id = $1',
      [input.id]
    );

    const cityCount = parseInt(citiesResult.rows[0]?.count || '0');
    
    if (cityCount > 0) {
      throw new Error(`No se puede eliminar la provincia porque tiene ${cityCount} población(es) asignada(s). Elimine primero las poblaciones.`);
    }

    await ctx.db.query(
      'DELETE FROM province_cuisine_types WHERE province_id = $1',
      [input.id]
    );

    const result = await ctx.db.query(
      'DELETE FROM provinces WHERE id = $1 RETURNING id',
      [input.id]
    );
    
    console.log('✅ [DELETE PROVINCE] Provincia eliminada:', {
      id: input.id,
      rowsAffected: result.rowCount,
    });
    
    return { success: true, rowsAffected: result.rowCount || 0 };
  });
