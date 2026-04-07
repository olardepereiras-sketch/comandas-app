import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { getUnavailableTableIdsForSlot } from '../../../../services/table-availability';

export const availableTablesForReservationProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      locationId: z.string(),
      date: z.string(),
      time: z.object({
        hour: z.number(),
        minute: z.number(),
      }),
      guests: z.number(),
      excludeReservationId: z.string().optional(),
      skipCapacityFilter: z.boolean().optional(),
      shiftTemplateId: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [AVAILABLE TABLES FOR RESERVATION] Consultando mesas disponibles para edición:', input);

    try {
      let needsHighChair = false;
      let needsStroller = false;
      let hasPets = false;
      const dateString = input.date.includes('T') ? input.date.split('T')[0] : input.date;

      if (input.excludeReservationId) {
        const reservationResult = await ctx.db.query(
          'SELECT needs_high_chair, needs_stroller, has_pets FROM reservations WHERE id = $1',
          [input.excludeReservationId]
        );
        if (reservationResult.rows.length > 0) {
          const res = reservationResult.rows[0] as any;
          needsHighChair = res.needs_high_chair || false;
          needsStroller = res.needs_stroller || false;
          hasPets = res.has_pets || false;
        }
      }

      const tablesParams: unknown[] = [input.restaurantId, input.locationId];
      let nextTableParamIndex = 3;

      const shiftDateCondition = `$${nextTableParamIndex}`;
      const shiftTemplateCondition = input.shiftTemplateId ? ` AND shift_template_id = $${nextTableParamIndex + 1}` : '';

      let tablesQuery = `SELECT * FROM tables 
         WHERE restaurant_id = $1 
         AND location_id = $2
         AND (
           (is_temporary IS NOT TRUE)
           OR (
             is_temporary = TRUE
             AND shift_date = ${shiftDateCondition}
             ${shiftTemplateCondition}
           )
         )`;

      tablesParams.push(dateString);
      nextTableParamIndex += 1;

      if (input.shiftTemplateId) {
        tablesParams.push(input.shiftTemplateId);
        nextTableParamIndex += 1;
      }

      if (!input.skipCapacityFilter) {
        const p1 = `$${nextTableParamIndex}`;
        const p2 = `$${nextTableParamIndex + 1}`;
        const p3 = `$${nextTableParamIndex + 2}`;
        const p4 = `$${nextTableParamIndex + 3}`;
        tablesQuery += ` 
         AND min_capacity <= ${p1} 
         AND max_capacity >= ${p1}
         AND (NOT ${p2} OR allows_high_chairs = true)
         AND (NOT ${p3} OR allows_strollers = true)
         AND (NOT ${p4} OR allows_pets = true)`;
        tablesParams.push(input.guests, needsHighChair, needsStroller, hasPets);
      }

      tablesQuery += ' ORDER BY priority DESC, order_num ASC';

      console.log('🔍 [AVAILABLE TABLES] SQL params count:', tablesParams.length, 'query snippet:', tablesQuery.substring(0, 200));

      const tablesResult = await ctx.db.query(tablesQuery, tablesParams);

      const groupParams: unknown[] = [input.restaurantId, input.locationId];
      let nextGroupParamIndex = 3;
      let groupsQuery = `SELECT id, name, array_to_json(table_ids)::text AS table_ids, min_capacity, max_capacity, priority, FALSE AS is_temporary
         FROM table_groups 
         WHERE restaurant_id = $1 
         AND location_id = $2
         AND (is_temporary IS NULL OR is_temporary = FALSE)`;

      if (!input.skipCapacityFilter) {
        const capacityGroupParam = '$' + String(nextGroupParamIndex);
        groupsQuery += `
         AND min_capacity <= ${capacityGroupParam} 
         AND max_capacity >= ${capacityGroupParam}`;
        groupParams.push(input.guests);
        nextGroupParamIndex += 1;
      }

      const shiftDateGroupParam = '$' + String(nextGroupParamIndex);
      let temporaryGroupsQuery = `SELECT id, name, grouped_table_ids::text AS table_ids, min_capacity, max_capacity, priority, TRUE AS is_temporary
         FROM tables
         WHERE restaurant_id = $1
         AND location_id = $2
         AND is_temporary = TRUE
         AND grouped_table_ids IS NOT NULL
         AND shift_date = ${shiftDateGroupParam}`;
      groupParams.push(dateString);
      nextGroupParamIndex += 1;

      if (input.shiftTemplateId) {
        const shiftTemplateGroupParam = '$' + String(nextGroupParamIndex);
        temporaryGroupsQuery += ` AND shift_template_id = ${shiftTemplateGroupParam}`;
        groupParams.push(input.shiftTemplateId);
        nextGroupParamIndex += 1;
      }

      if (!input.skipCapacityFilter) {
        temporaryGroupsQuery += `
         AND min_capacity <= $3 
         AND max_capacity >= $3`;
      }

      const groupsResult = await ctx.db.query(`${groupsQuery} UNION ALL ${temporaryGroupsQuery} ORDER BY priority DESC`, groupParams);

      if (tablesResult.rows.length === 0 && groupsResult.rows.length === 0) {
        console.log('⚠️ [AVAILABLE TABLES] No hay mesas ni grupos que cumplan con la capacidad');
        return [];
      }

      console.log(`✅ [AVAILABLE TABLES] ${tablesResult.rows.length} mesas y ${groupsResult.rows.length} grupos cumplen con capacidad`);
      console.log(`🔎 [AVAILABLE TABLES] Fecha normalizada=${dateString}, turno=${input.shiftTemplateId || 'sin-turno'}`);

      const slotTimeMinutes = input.time.hour * 60 + input.time.minute;

      const { occupiedTableIds, blockedTableIds } = await getUnavailableTableIdsForSlot({
        db: ctx.db,
        restaurantId: input.restaurantId,
        date: input.date,
        slotTimeMinutes,
        locationId: input.locationId,
        excludeReservationId: input.excludeReservationId,
        shiftTemplateId: input.shiftTemplateId,
      });

      console.log(`🔍 [AVAILABLE TABLES] Mesas ocupadas (con grupos/splits/rotación): ${occupiedTableIds.size}, bloqueadas: ${blockedTableIds.size}`);

      const permanentGroupMembersByGroupId = new Map<string, string[]>();
      groupsResult.rows.forEach((group: any) => {
        const tableIds: string[] = Array.isArray(group.table_ids)
          ? group.table_ids
          : (typeof group.table_ids === 'string' ? JSON.parse(group.table_ids) : []);
        permanentGroupMembersByGroupId.set(group.id as string, tableIds);
      });

      const availableTables = tablesResult.rows
        .filter((table: any) => {
          const isOccupied = occupiedTableIds.has(table.id as string);
          const isBlocked = blockedTableIds.has(table.id as string);
          if (isOccupied || isBlocked) {
            console.log(`🚫 [AVAILABLE TABLES] Mesa descartada "${table.name as string}": ocupada=${isOccupied}, bloqueada=${isBlocked}`);
          }
          return !isOccupied && !isBlocked;
        })
        .map((table: any) => ({
          id: table.id,
          name: table.name,
          minCapacity: table.min_capacity,
          maxCapacity: table.max_capacity,
          locationId: table.location_id,
          priority: table.priority || 5,
          allowsHighChairs: table.allows_high_chairs,
          availableHighChairs: table.available_high_chairs,
          allowsStroller: table.allows_strollers,
          allowsPets: table.allows_pets,
          rotationTimeMinutes: table.rotation_time_minutes || 120,
          isTemporary: Boolean(table.is_temporary),
          originalTableId: table.original_table_id || undefined,
          shiftTemplateId: table.shift_template_id || undefined,
          shiftDate: table.shift_date || undefined,
        }));

      console.log(`✅ [AVAILABLE TABLES] ${availableTables.length} mesas individuales disponibles`);

      const availableGroups = [];
      for (const group of groupsResult.rows) {
        const groupId = group.id as string;
        const groupTableIds = permanentGroupMembersByGroupId.get(groupId) ?? [];

        if (groupTableIds.length === 0) continue;

        const anyMemberOccupied = groupTableIds.some(
          (tableId: string) => occupiedTableIds.has(tableId) || blockedTableIds.has(tableId)
        );

        const groupItselfOccupied = occupiedTableIds.has(groupId) || blockedTableIds.has(groupId);

        if (!anyMemberOccupied && !groupItselfOccupied) {
          availableGroups.push({
            id: groupId,
            name: group.name,
            isGroup: true,
            isTemporary: Boolean(group.is_temporary),
            locationId: input.locationId,
            tableIds: groupTableIds,
            groupedTableIds: groupTableIds,
            minCapacity: group.min_capacity,
            maxCapacity: group.max_capacity,
            priority: group.priority || 5,
          });
        } else {
          console.log(`🚫 [AVAILABLE GROUPS] Grupo descartado "${group.name as string}": miembro ocupado=${anyMemberOccupied}, grupo ocupado=${groupItselfOccupied}`);
        }
      }

      console.log(`✅ [AVAILABLE GROUPS] ${availableGroups.length} grupos de mesas disponibles`);

      return [...availableGroups, ...availableTables];
    } catch (error) {
      console.error('❌ [AVAILABLE TABLES FOR RESERVATION] Error:', error);
      throw error;
    }
  });
