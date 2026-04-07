import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listTablesWithTemporaryProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      locationId: z.string(),
      date: z.string(),
      time: z.object({
        hour: z.number(),
        minute: z.number(),
      }),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST WITH TEMPORARY] Listando mesas incluyendo temporales disponibles');

    const permanentTablesResult = await ctx.db.query(
      `SELECT * FROM tables 
       WHERE restaurant_id = $1 
       AND location_id = $2 
       AND (is_temporary IS NOT TRUE)
       AND is_active = true
       ORDER BY order_num`,
      [input.restaurantId, input.locationId]
    );

    const temporaryTablesResult = await ctx.db.query(
      `SELECT tt.*, 'split_a' as table_type
       FROM temporary_tables tt
       JOIN reservations r ON tt.reservation_id = r.id
       WHERE tt.restaurant_id = $1 
       AND tt.location_id = $2
       AND tt.table_type = 'split_a'
       AND r.date = $3
       AND r.status NOT IN ('cancelled', 'completed', 'no_show')`,
      [input.restaurantId, input.locationId, input.date]
    );

    const blockedTablesResult = await ctx.db.query(
      `SELECT DISTINCT tbs.table_id
       FROM table_blocks_for_split tbs
       JOIN reservations r ON tbs.reservation_id = r.id
       WHERE r.restaurant_id = $1
       AND r.location_id = $2
       AND r.date = $3
       AND r.status NOT IN ('cancelled', 'completed', 'no_show')`,
      [input.restaurantId, input.locationId, input.date]
    );

    const blockedTableIds = new Set(blockedTablesResult.rows.map((r: any) => r.table_id));

    const availablePermanentTables = permanentTablesResult.rows
      .filter((table: any) => !blockedTableIds.has(table.id))
      .map((table: any) => ({
        id: table.id,
        name: table.name,
        minCapacity: table.min_capacity,
        maxCapacity: table.max_capacity,
        allowsHighChairs: table.allows_high_chairs,
        availableHighChairs: table.available_high_chairs || 0,
        allowsStrollers: table.allows_strollers,
        allowsPets: table.allows_pets,
        isTemporary: false,
        priority: table.priority || 5,
      }));

    const availableTemporaryTables = temporaryTablesResult.rows.map((table: any) => ({
      id: table.id,
      name: table.name,
      minCapacity: table.min_capacity,
      maxCapacity: table.max_capacity,
      allowsHighChairs: table.high_chairs > 0,
      availableHighChairs: table.high_chairs || 0,
      allowsStrollers: table.allows_stroller,
      allowsPets: table.allows_pets,
      isTemporary: true,
      originalTableId: table.original_table_id,
      priority: 5,
    }));

    const allTables = [...availablePermanentTables, ...availableTemporaryTables];

    console.log(`✅ [LIST WITH TEMPORARY] Mesas permanentes: ${availablePermanentTables.length}, temporales: ${availableTemporaryTables.length}`);

    return allTables;
  });
