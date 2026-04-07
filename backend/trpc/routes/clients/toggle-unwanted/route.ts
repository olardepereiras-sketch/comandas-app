import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const toggleUnwantedProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      clientId: z.string(),
      isUnwanted: z.boolean(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [TOGGLE UNWANTED] Cambiando estado de cliente no deseado:', input);

    try {
      const clientResult = await ctx.db.query(
        `SELECT id, name, phone, restaurant_blocks FROM clients WHERE id = $1`,
        [input.clientId]
      );

      if (clientResult.rows.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      const client = clientResult.rows[0];
      let restaurantBlocks = {};
      
      if (client.restaurant_blocks) {
        restaurantBlocks = typeof client.restaurant_blocks === 'string'
          ? JSON.parse(client.restaurant_blocks)
          : client.restaurant_blocks;
      }

      if (input.isUnwanted) {
        restaurantBlocks[input.restaurantId as keyof typeof restaurantBlocks] = {
          isBlocked: true,
          reason: 'unwanted',
          blockedAt: new Date().toISOString(),
          blockedBy: 'restaurant'
        };
        console.log('🚫 [TOGGLE UNWANTED] Cliente marcado como no deseado');
      } else {
        if (restaurantBlocks[input.restaurantId as keyof typeof restaurantBlocks]) {
          delete restaurantBlocks[input.restaurantId as keyof typeof restaurantBlocks];
          console.log('✅ [TOGGLE UNWANTED] Cliente desbloqueado');
        }
      }

      await ctx.db.query(
        `UPDATE clients 
         SET restaurant_blocks = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(restaurantBlocks), input.clientId]
      );

      console.log('✅ [TOGGLE UNWANTED] Estado actualizado correctamente');

      return {
        success: true,
        isUnwanted: input.isUnwanted,
        message: input.isUnwanted 
          ? 'Cliente marcado como no deseado. No podrá reservar en este restaurante.'
          : 'Cliente desbloqueado. Ahora puede reservar en este restaurante.',
      };
    } catch (error: any) {
      console.error('❌ [TOGGLE UNWANTED] Error:', error);
      throw new Error(`Error al cambiar estado: ${error.message}`);
    }
  });
