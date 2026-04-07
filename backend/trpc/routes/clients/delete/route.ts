import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteClientProcedure = publicProcedure
  .input(
    z.object({
      clientId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔴 [DELETE CLIENT] Raw input received:', JSON.stringify(input, null, 2));
    console.log('🔴 [DELETE CLIENT] Input type:', typeof input);
    console.log('🔴 [DELETE CLIENT] Input keys:', input ? Object.keys(input) : 'null/undefined');
    console.log('════════════════════════════════════════════════════════');
    console.log('🔵 [DELETE CLIENT] INICIO - Eliminando cliente:', input.clientId);
    console.log('Timestamp:', new Date().toISOString());
    console.log('════════════════════════════════════════════════════════');

    try {
      // Paso 1: Verificar si el cliente existe
      console.log('📋 Paso 1: Verificando existencia del cliente...');
      const clientCheck = await ctx.db.query(
        'SELECT id, name, phone FROM clients WHERE id = $1',
        [input.clientId]
      );
      
      if (clientCheck.rows.length === 0) {
        console.log('❌ Error: Cliente no encontrado');
        throw new Error('Cliente no encontrado');
      }
      
      console.log('✅ Cliente encontrado:', clientCheck.rows[0]);

      // Paso 2: Borrar no_shows
      console.log('📋 Paso 2: Eliminando no_shows del cliente...');
      const noShowsResult = await ctx.db.query(
        'DELETE FROM client_no_shows WHERE client_id = $1 RETURNING *',
        [input.clientId]
      );
      console.log(`✅ No_shows eliminados: ${noShowsResult.rowCount} registros`);

      // Paso 3: Borrar ratings
      console.log('📋 Paso 3: Eliminando ratings del cliente...');
      const ratingsResult = await ctx.db.query(
        'DELETE FROM client_ratings WHERE client_id = $1 RETURNING *',
        [input.clientId]
      );
      console.log(`✅ Ratings eliminados: ${ratingsResult.rowCount} registros`);

      // Paso 4: Borrar reservas
      console.log('📋 Paso 4: Eliminando reservas del cliente...');
      const reservationsResult = await ctx.db.query(
        'DELETE FROM reservations WHERE client_id = $1 RETURNING *',
        [input.clientId]
      );
      console.log(`✅ Reservas eliminadas: ${reservationsResult.rowCount} registros`);

      // Paso 5: Borrar cliente
      console.log('📋 Paso 5: Eliminando cliente...');
      const clientResult = await ctx.db.query(
        'DELETE FROM clients WHERE id = $1 RETURNING *',
        [input.clientId]
      );
      console.log(`✅ Cliente eliminado: ${clientResult.rowCount} registros`);

      console.log('════════════════════════════════════════════════════════');
      console.log('✅ [DELETE CLIENT] COMPLETADO EXITOSAMENTE');
      console.log('════════════════════════════════════════════════════════');

      return { success: true };
    } catch (error) {
      console.log('════════════════════════════════════════════════════════');
      console.log('❌ [DELETE CLIENT] ERROR CRÍTICO');
      console.log('Error:', error);
      console.log('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.log('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.log('════════════════════════════════════════════════════════');
      throw error;
    }
  });
