import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const swapTablesProcedure = publicProcedure
  .input(
    z.object({
      reservationId1: z.string(),
      reservationId2: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔄 [SWAP TABLES] Intercambiando mesas entre reservas:', input);

    const reservation1Result = await ctx.db.query(
      'SELECT * FROM reservations WHERE id = $1',
      [input.reservationId1]
    );

    const reservation2Result = await ctx.db.query(
      'SELECT * FROM reservations WHERE id = $1',
      [input.reservationId2]
    );

    if (reservation1Result.rows.length === 0) {
      throw new Error('Reserva 1 no encontrada');
    }

    if (reservation2Result.rows.length === 0) {
      throw new Error('Reserva 2 no encontrada');
    }

    const reservation1 = reservation1Result.rows[0] as any;
    const reservation2 = reservation2Result.rows[0] as any;

    const tableIds1 = typeof reservation1.table_ids === 'string'
      ? JSON.parse(reservation1.table_ids)
      : reservation1.table_ids;

    const tableIds2 = typeof reservation2.table_ids === 'string'
      ? JSON.parse(reservation2.table_ids)
      : reservation2.table_ids;

    console.log('📋 [SWAP TABLES] Reserva 1 mesas:', tableIds1);
    console.log('📋 [SWAP TABLES] Reserva 2 mesas:', tableIds2);

    const getLocationIdForTableIds = async (tableIds: string[]): Promise<string | null> => {
      if (!Array.isArray(tableIds) || tableIds.length === 0) {
        return null;
      }

      const tableResult = await ctx.db.query(
        `SELECT location_id FROM tables WHERE id = ANY($1::text[]) LIMIT 1`,
        [tableIds]
      );

      if (tableResult.rows.length > 0) {
        return (tableResult.rows[0] as any).location_id || null;
      }

      const groupResult = await ctx.db.query(
        `SELECT location_id FROM table_groups WHERE id = ANY($1::text[]) LIMIT 1`,
        [tableIds]
      );

      return groupResult.rows.length > 0 ? ((groupResult.rows[0] as any).location_id || null) : null;
    };

    const reservation1NewLocationId = await getLocationIdForTableIds(tableIds2);
    const reservation2NewLocationId = await getLocationIdForTableIds(tableIds1);
    const now = new Date();

    await ctx.db.query(
      `UPDATE reservations 
       SET table_ids = $1, location_id = COALESCE($2, location_id), updated_at = $3
       WHERE id = $4`,
      [JSON.stringify(tableIds2), reservation1NewLocationId, now, input.reservationId1]
    );

    await ctx.db.query(
      `UPDATE reservations 
       SET table_ids = $1, location_id = COALESCE($2, location_id), updated_at = $3
       WHERE id = $4`,
      [JSON.stringify(tableIds1), reservation2NewLocationId, now, input.reservationId2]
    );

    console.log('✅ [SWAP TABLES] Mesas intercambiadas correctamente');

    return {
      success: true,
      message: 'Mesas intercambiadas correctamente',
    };
  });
