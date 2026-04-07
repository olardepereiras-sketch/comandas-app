import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateTableLocationProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1, 'El nombre es requerido'),
      imageUrl: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE TABLE LOCATION] Actualizando ubicación:', input);
    
    const checkResult = await ctx.db.query(
      'SELECT * FROM table_locations WHERE id = $1',
      [input.id]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Ubicación no encontrada');
    }

    try {
      await ctx.db.query(
        'UPDATE table_locations SET name = $1::text, image_url = $2::text, updated_at = $3 WHERE id = $4::text',
        [input.name, input.imageUrl || null, new Date(), input.id]
      );
      
      console.log('✅ [UPDATE TABLE LOCATION] UPDATE exitoso, imageUrl:', input.imageUrl || 'null');
      
      return {
        id: input.id,
        name: input.name,
        imageUrl: input.imageUrl,
      };
    } catch (error: any) {
      console.error('❌ [UPDATE TABLE LOCATION] Error en UPDATE:', error);
      throw error;
    }
  });
