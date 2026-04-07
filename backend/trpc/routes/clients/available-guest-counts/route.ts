import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const availableGuestCountsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      locationId: z.string().optional(),
      date: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [AVAILABLE GUEST COUNTS] Consultando capacidades:', input);

    let sql = 'SELECT * FROM tables WHERE restaurant_id = $1';
    const params: any[] = [input.restaurantId];

    if (input.locationId) {
      sql += ' AND location_id = $' + (params.length + 1);
      params.push(input.locationId);
    }

    if (input.date) {
      const dateParamIndex = params.length + 1;
      sql += " AND ((is_temporary IS NOT TRUE) OR (is_temporary = TRUE AND shift_date::text = $" + dateParamIndex + "))";
      params.push(input.date);
    } else {
      sql += " AND (is_temporary IS NOT TRUE)";
    }

    const tablesResult = await ctx.db.query(sql, params);

    let tables = tablesResult.rows;
    console.log(`📊 [AVAILABLE GUEST COUNTS] Mesas encontradas para capacidades: ${tables.length}`);

    let groupSql = 'SELECT * FROM table_groups WHERE restaurant_id = $1';
    const groupParams: any[] = [input.restaurantId];

    if (input.locationId) {
      groupSql += ' AND location_id = $' + (groupParams.length + 1);
      groupParams.push(input.locationId);
    }

    const tableGroupsResult = await ctx.db.query(groupSql, groupParams);
    let tableGroups = tableGroupsResult.rows;

    if (input.date) {
      const [year, month, day] = input.date.split('-').map(Number);
      const dayStart = new Date(year, month - 1, day, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59);

      const blockedTablesResult = await ctx.db.query(
        `SELECT DISTINCT table_id FROM table_blocks 
         WHERE restaurant_id = $1 
         AND start_time <= $2 
         AND end_time >= $3`,
        [input.restaurantId, dayEnd, dayStart]
      );
      const blockedTableIds = new Set(blockedTablesResult.rows.map((r: any) => r.table_id));
      console.log(`🔒 [AVAILABLE GUEST COUNTS] Mesas bloqueadas en ${input.date}: ${blockedTableIds.size}`, Array.from(blockedTableIds));

      tables = tables.filter((t: any) => !blockedTableIds.has(t.id));
      tableGroups = tableGroups.filter((g: any) => {
        const groupTableIds = Array.isArray(g.table_ids) ? g.table_ids : [];
        return !groupTableIds.some((id: string) => blockedTableIds.has(id));
      });
    }

    if (tables.length === 0 && tableGroups.length === 0) {
      return { guestCounts: [], allowsHighChairs: false, allowsStrollers: false, allowsPets: false };
    }

    const guestCounts = new Set<number>();

    tables.forEach((row: any) => {
      for (let i = row.min_capacity; i <= row.max_capacity; i++) {
        guestCounts.add(i);
      }
    });

    tableGroups.forEach((group: any) => {
      for (let i = group.min_capacity; i <= group.max_capacity; i++) {
        guestCounts.add(i);
      }
    });

    const allowsHighChairs = tables.some((t: any) => t.allows_high_chairs);
    const allowsStrollers = tables.some((t: any) => t.allows_strollers);
    const allowsPets = tables.some((t: any) => t.allows_pets);

    console.log('✅ [AVAILABLE GUEST COUNTS] Capacidades disponibles (mesas + grupos):', Array.from(guestCounts).sort((a, b) => a - b));
    console.log('✅ [AVAILABLE GUEST COUNTS] Opciones:', { allowsHighChairs, allowsStrollers, allowsPets });

    return {
      guestCounts: Array.from(guestCounts).sort((a, b) => a - b),
      allowsHighChairs,
      allowsStrollers,
      allowsPets,
    };
  });
