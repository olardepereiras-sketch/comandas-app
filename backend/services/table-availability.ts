interface DbQueryResultRow {
  [key: string]: unknown;
}

interface DbLike {
  query: (text: string, params?: unknown[]) => Promise<{ rows: DbQueryResultRow[] }>;
}

interface TableAvailabilityOptions {
  db: DbLike;
  restaurantId: string;
  date: string;
  slotTimeMinutes: number;
  locationId?: string | null;
  excludeReservationId?: string;
  shiftTemplateId?: string;
}

interface UnavailableTablesResult {
  occupiedTableIds: Set<string>;
  blockedTableIds: Set<string>;
}

interface TemporaryGroupRow {
  id: string;
  groupedTableIds: string[];
}

const DEFAULT_ROTATION_MINUTES = 120;

function getStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toDateOnlyString(value: string): string {
  return value.includes('T') ? value.split('T')[0] : value;
}

function safeParseStringArray(value: unknown): string[] {
  try {
    if (Array.isArray(value)) {
      return value.filter((item: unknown): item is string => typeof item === 'string');
    }
    if (typeof value === 'string') {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item: unknown): item is string => typeof item === 'string')
        : [];
    }
    return [];
  } catch (error) {
    console.error('❌ [TABLE AVAILABILITY] Error parseando array JSON:', error);
    return [];
  }
}

function addSetValues(target: Set<string>, values: string[]): boolean {
  let changed = false;
  values.forEach((value: string) => {
    if (!target.has(value)) {
      target.add(value);
      changed = true;
    }
  });
  return changed;
}

export async function getUnavailableTableIdsForSlot({
  db,
  restaurantId,
  date,
  slotTimeMinutes,
  locationId,
  excludeReservationId,
  shiftTemplateId,
}: TableAvailabilityOptions): Promise<UnavailableTablesResult> {
  const dateStr = toDateOnlyString(date);
  console.log('🔵 [TABLE AVAILABILITY] Calculando indisponibilidad:', {
    restaurantId,
    dateStr,
    slotTimeMinutes,
    locationId: locationId ?? null,
    excludeReservationId: excludeReservationId ?? null,
    shiftTemplateId: shiftTemplateId ?? null,
  });

  const structureConditions: string[] = ['restaurant_id = $1', 'is_temporary = TRUE', 'shift_date::text = $2'];
  const structureParams: unknown[] = [restaurantId, dateStr];

  if (locationId) {
    structureParams.push(locationId);
    structureConditions.push('location_id = $' + String(structureParams.length));
  }

  if (shiftTemplateId) {
    structureParams.push(shiftTemplateId);
    structureConditions.push('shift_template_id = $' + String(structureParams.length));
  }

  const temporaryGroupsResult = await db.query(
    `SELECT id, grouped_table_ids
     FROM tables
     WHERE ${structureConditions.join('\n     AND ')}
     AND grouped_table_ids IS NOT NULL`,
    structureParams
  );

  const temporarySplitsResult = await db.query(
    `SELECT id, original_table_id
     FROM tables
     WHERE ${structureConditions.join('\n     AND ')}
     AND original_table_id IS NOT NULL`,
    structureParams
  );

  const tableGroupsResult = await db.query(
    `SELECT id, table_ids
     FROM table_groups
     WHERE restaurant_id = $1
     ${locationId ? 'AND (location_id = $2 OR location_id IS NULL)' : ''}`,
    locationId ? [restaurantId, locationId] : [restaurantId]
  );

  let reservationsSql = `SELECT r.id, r.table_ids, r.time,
      COALESCE((
        SELECT MAX(t2.rotation_time_minutes)
        FROM tables t2
        WHERE t2.id = ANY(ARRAY(SELECT jsonb_array_elements_text(r.table_ids::jsonb)))
      ), ${DEFAULT_ROTATION_MINUTES}) as rotation_time_minutes
    FROM reservations r
    WHERE r.restaurant_id = $1
    AND r.date::date = $2::date
    AND r.status != 'cancelled'`;
  const reservationParams: unknown[] = [restaurantId, dateStr];

  if (locationId) {
    reservationParams.push(locationId);
    reservationsSql += ' AND r.location_id = $' + String(reservationParams.length);
  }

  if (excludeReservationId) {
    reservationParams.push(excludeReservationId);
    reservationsSql += ' AND r.id != $' + String(reservationParams.length);
  }

  const reservationsResult = await db.query(reservationsSql, reservationParams);

  const temporaryGroups: TemporaryGroupRow[] = temporaryGroupsResult.rows.map((row: DbQueryResultRow) => ({
    id: getStringValue(row.id),
    groupedTableIds: safeParseStringArray(row.grouped_table_ids),
  })).filter((row: TemporaryGroupRow) => row.id.length > 0 && row.groupedTableIds.length > 0);

  const temporaryGroupIdsByIndividual = new Map<string, string[]>();
  const temporaryGroupMembersById = new Map<string, string[]>();
  temporaryGroups.forEach((group: TemporaryGroupRow) => {
    temporaryGroupMembersById.set(group.id, group.groupedTableIds);
    group.groupedTableIds.forEach((tableId: string) => {
      const current = temporaryGroupIdsByIndividual.get(tableId) ?? [];
      if (!current.includes(group.id)) {
        current.push(group.id);
        temporaryGroupIdsByIndividual.set(tableId, current);
      }
    });
  });

  const splitTempIdsByOriginal = new Map<string, string[]>();
  const splitOriginalByTempId = new Map<string, string>();
  temporarySplitsResult.rows.forEach((row: DbQueryResultRow) => {
    const tempId = getStringValue(row.id);
    const originalTableId = getStringValue(row.original_table_id);
    if (!tempId || !originalTableId) {
      return;
    }
    splitOriginalByTempId.set(tempId, originalTableId);
    const current = splitTempIdsByOriginal.get(originalTableId) ?? [];
    if (!current.includes(tempId)) {
      current.push(tempId);
      splitTempIdsByOriginal.set(originalTableId, current);
    }
  });

  const permanentGroupMembersByTableId = new Map<string, string[]>();
  const groupMembersByGroupId = new Map<string, string[]>();
  tableGroupsResult.rows.forEach((row: DbQueryResultRow) => {
    const groupId = getStringValue(row.id);
    const tableIds = safeParseStringArray(row.table_ids);
    if (tableIds.length === 0) {
      return;
    }
    if (groupId) {
      groupMembersByGroupId.set(groupId, tableIds);
    }
    if (tableIds.length <= 1) {
      return;
    }
    tableIds.forEach((tableId: string) => {
      const existing = permanentGroupMembersByTableId.get(tableId) ?? [];
      const merged = Array.from(new Set([...existing, ...tableIds]));
      permanentGroupMembersByTableId.set(tableId, merged);
    });
  });

  const occupiedTableIds = new Set<string>();
  const structurallyOccupied = new Set<string>();
  reservationsResult.rows.forEach((row: DbQueryResultRow) => {
    const parsedTime = typeof row.time === 'string' ? JSON.parse(row.time) : row.time;
    const reservationHour = Number((parsedTime as { hour?: number } | null)?.hour ?? 0);
    const reservationMinute = Number((parsedTime as { minute?: number } | null)?.minute ?? 0);
    const reservationTimeMinutes = reservationHour * 60 + reservationMinute;
    const rotationMinutes = Number(row.rotation_time_minutes ?? DEFAULT_ROTATION_MINUTES) || DEFAULT_ROTATION_MINUTES;
    if (Math.abs(slotTimeMinutes - reservationTimeMinutes) < rotationMinutes) {
      addSetValues(occupiedTableIds, safeParseStringArray(row.table_ids));
    }
  });

  let changed = true;
  while (changed) {
    changed = false;
    Array.from(occupiedTableIds).forEach((tableId: string) => {
      const temporaryGroupMembers = temporaryGroupMembersById.get(tableId) ?? [];
      if (addSetValues(occupiedTableIds, temporaryGroupMembers)) {
        changed = true;
      }

      const temporaryGroupIds = temporaryGroupIdsByIndividual.get(tableId) ?? [];
      if (addSetValues(occupiedTableIds, temporaryGroupIds)) {
        changed = true;
      }
      temporaryGroupIds.forEach((groupId: string) => {
        if (addSetValues(occupiedTableIds, temporaryGroupMembersById.get(groupId) ?? [])) {
          changed = true;
        }
      });

      const originalTableId = splitOriginalByTempId.get(tableId);
      if (originalTableId) {
        if (!occupiedTableIds.has(originalTableId)) {
          occupiedTableIds.add(originalTableId);
          structurallyOccupied.add(originalTableId);
          changed = true;
        }
      }

      const isStructural = structurallyOccupied.has(tableId);
      if (!isStructural) {
        // Solo propagar a miembros del grupo si el tableId ES el ID del grupo mismo.
        // Si es una mesa individual dentro de un grupo, NO propagar a sus "hermanas".
        // Esto evita que una reserva individual bloquee todo el grupo permanente.
        const groupMembers = groupMembersByGroupId.get(tableId) ?? [];
        if (addSetValues(occupiedTableIds, groupMembers)) {
          changed = true;
        }
      }
    });
  }

  const blockedTableIds = new Set<string>();
  const structurallyBlockedMemberIds = new Set<string>();

  temporaryGroups.forEach((group: TemporaryGroupRow) => {
    if (group.groupedTableIds.length > 0) {
      group.groupedTableIds.forEach((id: string) => structurallyBlockedMemberIds.add(id));
      addSetValues(blockedTableIds, group.groupedTableIds);
    }
  });

  splitTempIdsByOriginal.forEach((tempIds: string[], originalTableId: string) => {
    if (tempIds.length > 0) {
      structurallyBlockedMemberIds.add(originalTableId);
      addSetValues(blockedTableIds, [originalTableId]);
    }
  });

  console.log('🔒 [TABLE AVAILABILITY] Mesas bloqueadas por estructura activa (grupos/divisiones):', Array.from(blockedTableIds));

  const slotHour = Math.floor(slotTimeMinutes / 60);
  const slotMinute = slotTimeMinutes % 60;
  const slotDateTime = `${dateStr}T${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}:00`;

  const blockedTablesResult = await db.query(
    `SELECT table_id, id
     FROM table_blocks
     WHERE restaurant_id = $1
     ${locationId ? 'AND location_id = $2' : ''}
     AND start_time <= $${locationId ? 3 : 2}::timestamp
     AND end_time > $${locationId ? 3 : 2}::timestamp`,
    locationId ? [restaurantId, locationId, slotDateTime] : [restaurantId, slotDateTime]
  );

  const actuallyBlockedIds = new Set<string>();
  const structuralBlockEntryTableIds = new Set<string>();

  blockedTablesResult.rows.forEach((row: DbQueryResultRow) => {
    const blockId = getStringValue(row.id);
    const tableId = getStringValue(row.table_id);
    if (!tableId) return;
    if (blockId.startsWith('block-split-') || blockId.startsWith('block-group-')) {
      structuralBlockEntryTableIds.add(tableId);
    } else {
      actuallyBlockedIds.add(tableId);
    }
  });

  addSetValues(blockedTableIds, Array.from(actuallyBlockedIds));
  addSetValues(blockedTableIds, Array.from(structuralBlockEntryTableIds));

  let blockedChanged = true;
  while (blockedChanged) {
    blockedChanged = false;
    Array.from(blockedTableIds).forEach((tableId: string) => {
      const isOnlyStructural = (structurallyBlockedMemberIds.has(tableId) || structuralBlockEntryTableIds.has(tableId))
        && !actuallyBlockedIds.has(tableId);

      if (!isOnlyStructural) {
        const temporaryGroupMembers = temporaryGroupMembersById.get(tableId) ?? [];
        if (addSetValues(blockedTableIds, temporaryGroupMembers)) {
          blockedChanged = true;
        }

        const temporaryGroupIds = temporaryGroupIdsByIndividual.get(tableId) ?? [];
        if (addSetValues(blockedTableIds, temporaryGroupIds)) {
          blockedChanged = true;
        }
        temporaryGroupIds.forEach((groupId: string) => {
          if (addSetValues(blockedTableIds, temporaryGroupMembersById.get(groupId) ?? [])) {
            blockedChanged = true;
          }
        });

        const originalTableId = splitOriginalByTempId.get(tableId);
        if (originalTableId) {
          if (addSetValues(blockedTableIds, [originalTableId])) {
            blockedChanged = true;
          }
        }
      }

      // Structural blocks (temp group absorption, splits) must NOT propagate to
      // permanent group siblings — those individual tables are still bookable.
      // Only actual blocks/occupancy should cascade through permanent groups.
      if (!isOnlyStructural) {
        const permanentGroupMembers = permanentGroupMembersByTableId.get(tableId) ?? [];
        permanentGroupMembers.forEach((memberId: string) => {
          if (addSetValues(blockedTableIds, [memberId])) {
            blockedChanged = true;
          }
        });

        const groupMembers = groupMembersByGroupId.get(tableId) ?? [];
        groupMembers.forEach((memberId: string) => {
          if (addSetValues(blockedTableIds, [memberId])) {
            blockedChanged = true;
          }
        });
      }
    });
  }

  console.log('✅ [TABLE AVAILABILITY] Resultado calculado:', {
    occupiedTableIds: Array.from(occupiedTableIds),
    blockedTableIds: Array.from(blockedTableIds),
  });

  return {
    occupiedTableIds,
    blockedTableIds,
  };
}
