import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import type { Reservation } from '@/types';
import { sendReservationNotifications } from '../../../../services/email';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';
import { getUnavailableTableIdsForSlot } from '../../../../services/table-availability';

function normalizeDateString(date: string): string {
  return date.includes('T') ? date.split('T')[0] : date;
}

function getDayOfWeekFromDateString(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

function getSlotTimeMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function shiftMatchesSlot(shift: any, slotTimeMinutes: number): boolean {
  if (!shift?.startTime || !shift?.endTime) {
    return false;
  }

  const [startHour, startMinute] = String(shift.startTime).split(':').map(Number);
  const [endHour, endMinute] = String(shift.endTime).split(':').map(Number);
  const shiftStart = startHour * 60 + startMinute;
  const shiftEnd = endHour * 60 + endMinute;

  if (shiftStart === shiftEnd) {
    return slotTimeMinutes === shiftStart;
  }

  return slotTimeMinutes >= shiftStart && slotTimeMinutes <= shiftEnd;
}

async function expandShiftCapacityIfNeeded(params: {
  db: any;
  restaurantId: string;
  date: string;
  hour: number;
  minute: number;
  guestsToAdd: number;
}) {
  const dateString = normalizeDateString(params.date);
  const slotTimeMinutes = getSlotTimeMinutes(params.hour, params.minute);
  const dayOfWeek = getDayOfWeekFromDateString(dateString);

  console.log('🔵 [CREATE] Verificando si hace falta ampliar aforo del turno:', {
    restaurantId: params.restaurantId,
    date: dateString,
    hour: params.hour,
    minute: params.minute,
    guestsToAdd: params.guestsToAdd,
  });

  const reservationsResult = await params.db.query(
    `SELECT guests, time
     FROM reservations
     WHERE restaurant_id = $1
       AND date::date = $2::date
       AND status != 'cancelled'`,
    [params.restaurantId, dateString]
  );

  const currentGuestsAtSlot = reservationsResult.rows
    .filter((row: any) => {
      const reservationTime = typeof row.time === 'string' ? JSON.parse(row.time) : row.time;
      return reservationTime?.hour === params.hour && reservationTime?.minute === params.minute;
    })
    .reduce((sum: number, row: any) => sum + (Number(row.guests) || 0), 0);

  const requiredCapacity = currentGuestsAtSlot + params.guestsToAdd;

  const exceptionResult = await params.db.query(
    'SELECT * FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
    [params.restaurantId, dateString]
  );

  if (exceptionResult.rows.length > 0) {
    const exception = exceptionResult.rows[0];
    let shifts = typeof exception.template_ids === 'string'
      ? JSON.parse(exception.template_ids)
      : (exception.template_ids || []);

    if (!Array.isArray(shifts)) {
      shifts = [];
    }

    let updated = false;
    const updatedShifts = shifts.map((shift: any) => {
      if (!shiftMatchesSlot(shift, slotTimeMinutes)) {
        return shift;
      }

      const currentMaxGuests = Number(shift.maxGuestsPerHour) || 0;
      if (requiredCapacity <= currentMaxGuests) {
        return shift;
      }

      updated = true;
      console.log('🔄 [CREATE] Ampliando aforo en excepción del día:', {
        startTime: shift.startTime,
        endTime: shift.endTime,
        previousMaxGuests: currentMaxGuests,
        nextMaxGuests: requiredCapacity,
      });

      return {
        ...shift,
        maxGuestsPerHour: requiredCapacity,
      };
    });

    if (updated) {
      await params.db.query(
        'UPDATE day_exceptions SET template_ids = $1, updated_at = NOW() WHERE restaurant_id = $2 AND date = $3',
        [JSON.stringify(updatedShifts), params.restaurantId, dateString]
      );

      return {
        expanded: true,
        previousGuests: currentGuestsAtSlot,
        requiredCapacity,
      };
    }

    if (!updated && requiredCapacity > 0) {
      const slotHour = Math.floor(slotTimeMinutes / 60);
      const slotMinute = slotTimeMinutes % 60;
      const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;
      const newShiftEntry = {
        templateId: `slot-${timeStr}`,
        startTime: timeStr,
        endTime: timeStr,
        maxGuestsPerHour: requiredCapacity,
      };
      const mergedShifts = [...shifts, newShiftEntry];
      await params.db.query(
        'UPDATE day_exceptions SET template_ids = $1, updated_at = NOW() WHERE restaurant_id = $2 AND date = $3',
        [JSON.stringify(mergedShifts), params.restaurantId, dateString]
      );
      console.log('🔄 [CREATE] Nuevo slot añadido a excepción con aforo ampliado:', { timeStr, requiredCapacity });
      return {
        expanded: true,
        previousGuests: currentGuestsAtSlot,
        requiredCapacity,
      };
    }

    return {
      expanded: false,
      previousGuests: currentGuestsAtSlot,
      requiredCapacity,
    };
  }

  const scheduleResult = await params.db.query(
    'SELECT * FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2',
    [params.restaurantId, dayOfWeek]
  );

  let shifts: any[] = [];
  let isOpen = true;

  if (scheduleResult.rows.length > 0) {
    const schedule = scheduleResult.rows[0];
    isOpen = Boolean(schedule.is_open);
    shifts = JSON.parse(schedule.shifts || '[]');
  }

  let updated = false;
  const updatedShifts = shifts.map((shift: any) => {
    if (!shiftMatchesSlot(shift, slotTimeMinutes)) {
      return shift;
    }

    const currentMaxGuests = Number(shift.maxGuestsPerHour) || 0;
    if (requiredCapacity <= currentMaxGuests) {
      return shift;
    }

    updated = true;
    console.log('🔄 [CREATE] Ampliando aforo en horario base:', {
      startTime: shift.startTime,
      endTime: shift.endTime,
      previousMaxGuests: currentMaxGuests,
      nextMaxGuests: requiredCapacity,
    });

    return {
      ...shift,
      maxGuestsPerHour: requiredCapacity,
    };
  });

  if (updated) {
    const exceptionId = `exc-${Date.now()}`;
    try {
      await params.db.query(
        `INSERT INTO day_exceptions (id, restaurant_id, date, is_open, template_ids, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (restaurant_id, date) DO UPDATE SET template_ids = $5, is_open = $4, updated_at = NOW()`,
        [exceptionId, params.restaurantId, dateString, isOpen, JSON.stringify(updatedShifts)]
      );
    } catch (insertErr: any) {
      console.warn('⚠️ [CREATE] INSERT/CONFLICT exception, intentando UPDATE fallback:', insertErr.message);
      await params.db.query(
        'UPDATE day_exceptions SET template_ids = $1, updated_at = NOW() WHERE restaurant_id = $2 AND date = $3',
        [JSON.stringify(updatedShifts), params.restaurantId, dateString]
      );
    }

    return {
      expanded: true,
      previousGuests: currentGuestsAtSlot,
      requiredCapacity,
    };
  }

  return {
    expanded: false,
    previousGuests: currentGuestsAtSlot,
    requiredCapacity,
  };
}

export const createReservationProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      clientPhone: z.string(),
      clientName: z.string(),
      date: z.string(),
      time: z.object({
        hour: z.number(),
        minute: z.number(),
      }),
      guests: z.number(),
      locationId: z.string(),
      tableIds: z.array(z.string()).optional(),
      needsHighChair: z.boolean(),
      highChairCount: z.number().optional(),
      needsStroller: z.boolean(),
      hasPets: z.boolean(),
      notes: z.string().optional(),
      fromRestaurantPanel: z.boolean().optional(),
      skipConfirmation: z.boolean().optional(),
      depositPaid: z.boolean().optional(),
      allowCapacityExpansion: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const clientResult = await ctx.db.query(
      'SELECT * FROM clients WHERE phone = $1',
      [input.clientPhone]
    );
    
    let clientId: string;
    let finalTableIds: string[] = [];
    let splitTableConfig: any = null;
    
    // CRÍTICO: Solo permitir división de mesas desde el panel del restaurante
    // NUNCA desde la vista del cliente (fromRestaurantPanel debe ser true)
    if (input.tableIds && input.tableIds.length > 0) {
      for (const tableId of input.tableIds) {
        try {
          const parsed = JSON.parse(tableId);
          if (parsed.type === 'split') {
            // Solo procesar configuración de división si viene del panel del restaurante
            if (input.fromRestaurantPanel === true) {
              splitTableConfig = parsed;
              finalTableIds = [];
              console.log('🔵 [CREATE] División de mesa permitida desde panel del restaurante');
            } else {
              console.log('🚫 [CREATE] División de mesa RECHAZADA - no viene del panel del restaurante');
              // Ignorar la configuración de división y tratar como reserva normal
              finalTableIds = [];
            }
          } else {
            finalTableIds.push(tableId);
          }
        } catch {
          finalTableIds.push(tableId);
        }
      }
    }
    
    // Declarar variables VIP al inicio para que estén disponibles en todo el scope
    let preferredTableIds: string[] = [];
    let isVipClient = false;
    let vipTableMessage = '';
    let isVipTableAssigned = false;
    let vipPreferredTableName = '';

    if (finalTableIds.length === 0) {
      console.log('🔄 Asignación automática de mesas/grupos iniciada...');
      
      if (clientResult.rows.length > 0) {
        const client = clientResult.rows[0];
        isVipClient = client.is_vip || false;
        
        if (isVipClient && client.preferred_table_ids) {
          try {
            preferredTableIds = JSON.parse(client.preferred_table_ids);
            console.log('⭐ Cliente VIP detectado con mesas preferidas:', preferredTableIds);
          } catch (e) {
            console.error('Error parseando mesas preferidas:', e);
          }
        }
      }
      
      // Obtener mesas bloqueadas para este horario
      const reservationDateTime = new Date(`${input.date}T${String(input.time.hour).padStart(2, '0')}:${String(input.time.minute).padStart(2, '0')}:00`);
      const blockedTablesResult = await ctx.db.query(
        `SELECT DISTINCT table_id FROM table_blocks 
         WHERE restaurant_id = $1 
         AND location_id = $2 
         AND start_time <= $3 
         AND end_time > $3`,
        [input.restaurantId, input.locationId, reservationDateTime]
      );
      const blockedTableIds = new Set(blockedTablesResult.rows.map((r: any) => r.table_id));
      console.log(`🔒 [CREATE] Mesas bloqueadas para este horario: ${blockedTableIds.size}`, Array.from(blockedTableIds));
      
      const dateString = input.date.includes('T') ? input.date.split('T')[0] : input.date;

      const tablesResult = await ctx.db.query(
        `SELECT * FROM tables WHERE restaurant_id = $1 AND location_id = $2 AND (
          (is_temporary IS NOT TRUE)
          OR (is_temporary = TRUE AND shift_date::text = $3)
        ) ORDER BY priority DESC`,
        [input.restaurantId, input.locationId, dateString]
      );

      const allTemporaryTableRows = tablesResult.rows.filter((t: any) => t.is_temporary === true || t.is_temporary === 'true');
      const permanentTableRows = tablesResult.rows.filter((t: any) => !t.is_temporary || t.is_temporary === false);

      let matchingShiftTemplateId: string | undefined;
      try {
        const [cYear, cMonth, cDay] = dateString.split('-').map(Number);
        const cDate = new Date(cYear, cMonth - 1, cDay);
        const cDayOfWeek = cDate.getDay();
        
        const excResult = await ctx.db.query(
          'SELECT template_ids FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
          [input.restaurantId, dateString]
        );
        
        let allShifts: any[] = [];
        if (excResult.rows.length > 0) {
          const parsed = typeof excResult.rows[0].template_ids === 'string'
            ? JSON.parse(excResult.rows[0].template_ids)
            : excResult.rows[0].template_ids;
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'startTime' in parsed[0]) {
            allShifts = parsed;
          }
        }
        if (allShifts.length === 0) {
          const schResult = await ctx.db.query(
            'SELECT shifts FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2 AND is_open = true',
            [input.restaurantId, cDayOfWeek]
          );
          if (schResult.rows.length > 0) {
            allShifts = JSON.parse(schResult.rows[0].shifts || '[]');
          }
        }
        
        const resTimeMinutes = input.time.hour * 60 + input.time.minute;
        for (const s of allShifts) {
          if (s.templateId) {
            const [sH, sM] = s.startTime.split(':').map(Number);
            const [eH, eM] = s.endTime.split(':').map(Number);
            const sStart = sH * 60 + sM;
            const sEnd = eH * 60 + eM;
            if (sStart === sEnd) {
              if (resTimeMinutes === sStart) {
                matchingShiftTemplateId = s.templateId;
                break;
              }
            } else if (resTimeMinutes >= sStart && resTimeMinutes <= sEnd) {
              matchingShiftTemplateId = s.templateId;
              break;
            }
          }
        }
        console.log(`\u{1F50D} [CREATE] Turno detectado para ${input.time.hour}:${input.time.minute}: ${matchingShiftTemplateId || 'ninguno'}`);
      } catch (shiftErr) {
        console.error('\u26A0\uFE0F [CREATE] Error detectando turno:', shiftErr);
      }

      const tempTablesForShift = matchingShiftTemplateId
        ? allTemporaryTableRows.filter((t: any) => t.shift_template_id === matchingShiftTemplateId)
        : [];
      
      const originalTableIdsWithSplits = new Set(
        tempTablesForShift.map((t: any) => t.original_table_id).filter(Boolean)
      );
      if (originalTableIdsWithSplits.size > 0) {
        console.log(`\u{1F504} [CREATE] Mesas originales con divisiones activas (turno ${matchingShiftTemplateId}): ${Array.from(originalTableIdsWithSplits).join(', ')}`);
        console.log(`\u{1F504} [CREATE] Mesas temporales para este turno: ${tempTablesForShift.map((t: any) => `${t.id} (${t.name})`).join(', ')}`);
      }
      if (allTemporaryTableRows.length > tempTablesForShift.length) {
        const excludedTemp = allTemporaryTableRows.filter((t: any) => t.shift_template_id !== matchingShiftTemplateId);
        console.log(`\u{1F6AB} [CREATE] Mesas temporales excluidas (otro turno): ${excludedTemp.map((t: any) => `${t.id} (${t.name}) [turno: ${t.shift_template_id}]`).join(', ')}`);
      }

      const groupedIdsInShift = new Set<string>();
      tempTablesForShift.forEach((t: any) => {
        if (!t.grouped_table_ids) return;
        try {
          const ids = typeof t.grouped_table_ids === 'string' ? JSON.parse(t.grouped_table_ids) : t.grouped_table_ids;
          if (Array.isArray(ids)) ids.forEach((id: string) => groupedIdsInShift.add(id));
        } catch { /* ignore */ }
      });
      if (groupedIdsInShift.size > 0) {
        console.log('[CREATE] Mesas absorbidas por grupos temporales:', Array.from(groupedIdsInShift).join(', '));
      }

      const allTables = [...permanentTableRows, ...tempTablesForShift].filter((t: any) => {
        if (t.is_temporary) return true;
        if (originalTableIdsWithSplits.has(t.id)) {
          console.log('[CREATE] Excluyendo mesa original ' + t.id + ' - tiene divisiones activas en este turno');
          return false;
        }
        if (groupedIdsInShift.has(t.id)) {
          console.log('[CREATE] Excluyendo mesa ' + t.id + ' - absorbida por grupo temporal en turno ' + matchingShiftTemplateId);
          return false;
        }
        return true;
      });
      
      const compatibleTables = allTables.filter((table: any) => {
        if (blockedTableIds.has(table.id)) {
          console.log(`\u{1F512} [CREATE] Mesa ${table.id} (${table.name}) excluida - está bloqueada`);
          return false;
        }
        const meetsCapacity = input.guests >= table.min_capacity && input.guests <= table.max_capacity;
        const meetsHighChair = !input.needsHighChair || table.allows_high_chairs;
        const meetsStroller = !input.needsStroller || table.allows_strollers;
        const meetsPets = !input.hasPets || table.allows_pets;
        return meetsCapacity && meetsHighChair && meetsStroller && meetsPets;
      });

      const tableGroupsResult = await ctx.db.query(
        `SELECT * FROM table_groups WHERE restaurant_id = $1 AND location_id = $2 AND
          (is_temporary IS NOT TRUE)
        ORDER BY priority DESC`,
        [input.restaurantId, input.locationId]
      );
      
      const compatibleGroups = tableGroupsResult.rows.filter((group: any) => {
        const meetsCapacity = input.guests >= group.min_capacity && input.guests <= group.max_capacity;
        if (!meetsCapacity) return false;
        const groupTableIds = Array.isArray(group.table_ids) ? group.table_ids : [];
        if (groupTableIds.length === 0) return false;
        const hasBlockedTable = groupTableIds.some((tableId: string) => blockedTableIds.has(tableId));
        if (hasBlockedTable) {
          console.log(`🔒 [CREATE] Grupo ${group.id} excluido - contiene mesas bloqueadas`);
          return false;
        }
        return true;
      });

      console.log('✅ Mesas compatibles encontradas:', compatibleTables.map((t: any) => `${t.id} (prioridad: ${t.priority || 0})`));
      console.log('✅ Grupos compatibles encontrados:', compatibleGroups.map((g: any) => `${g.id} (prioridad: ${g.priority || 0})`));

      const reservationsOnSameDay = await ctx.db.query(
        `SELECT r.*,
           COALESCE((
             SELECT MAX(t2.rotation_time_minutes)
             FROM tables t2
             WHERE t2.id = ANY(ARRAY(SELECT jsonb_array_elements_text(r.table_ids::jsonb)))
           ), 120) as rotation_time_minutes
         FROM reservations r
         WHERE r.restaurant_id = $1 
         AND r.location_id = $2 
         AND r.date::date = $3::date
         AND r.status != 'cancelled'`,
        [input.restaurantId, input.locationId, input.date]
      );

      const slotTime = input.time.hour * 60 + input.time.minute;
      const occupiedTableIds = new Set<string>();

      reservationsOnSameDay.rows.forEach((reservation: any) => {
        const resTime = typeof reservation.time === 'string' 
          ? JSON.parse(reservation.time) 
          : reservation.time;
        const resTimeMinutes = resTime.hour * 60 + resTime.minute;
        const rotationMinutes = reservation.rotation_time_minutes || 120;

        if (Math.abs(slotTime - resTimeMinutes) < rotationMinutes) {
          const tableIds = typeof reservation.table_ids === 'string'
            ? JSON.parse(reservation.table_ids)
            : reservation.table_ids;
          
          if (Array.isArray(tableIds)) {
            tableIds.forEach((tableId: string) => occupiedTableIds.add(tableId));
          }
        }
      });

      // Expandir IDs de grupos temporales a mesas individuales para bloqueo correcto por rotation time
      // CRÍTICO: Usar allTemporaryTableRows (todos los grupos temporales de la fecha) en lugar de
      // tempTablesForShift (solo del turno detectado). Si el turno no se detecta correctamente,
      // tempTablesForShift estaría vacío y los grupos temporales NO se expandirían, permitiendo
      // que mesas dentro de un grupo ocupado sean asignadas incorrectamente.
      for (const tableId of Array.from(occupiedTableIds)) {
        const tempGroup = allTemporaryTableRows.find((t: any) => t.id === tableId && t.grouped_table_ids);
        if (tempGroup) {
          try {
            const groupedIds = typeof tempGroup.grouped_table_ids === 'string'
              ? JSON.parse(tempGroup.grouped_table_ids)
              : tempGroup.grouped_table_ids;
            if (Array.isArray(groupedIds)) {
              groupedIds.forEach((gid: string) => occupiedTableIds.add(gid));
              console.log('[CREATE] Grupo temporal ' + tableId + ' expandido: bloqueando mesas individuales ' + groupedIds.join(', '));
            }
          } catch { /* ignore */ }
        }
      }

      // Propagar ocupación en grupos permanentes: SOLO si el ID del grupo en sí mismo
      // está en occupiedTableIds (es decir, una reserva usó el grupo directamente).
      // Si una mesa individual está ocupada, NO bloquear las demás mesas del mismo grupo.
      for (const group of tableGroupsResult.rows) {
        const groupId = group.id as string;
        const groupTableIds: string[] = Array.isArray(group.table_ids) ? group.table_ids : [];
        if (groupTableIds.length === 0) continue;
        if (occupiedTableIds.has(groupId)) {
          groupTableIds.forEach((id: string) => occupiedTableIds.add(id));
          console.log('[CREATE] Grupo permanente ' + groupId + ' (' + (group.name as string) + '): propagando ocupación a todas sus mesas: ' + groupTableIds.join(', '));
        }
      }

      console.log('[CREATE] Mesas ocupadas considerando rotation time (' + input.time.hour + ':' + input.time.minute + '): ' + occupiedTableIds.size);

      let assigned = false;
      
      if (isVipClient && preferredTableIds.length > 0) {
        console.log('⭐ Intentando asignar mesa preferida de cliente VIP...');
        
        for (const preferredTableId of preferredTableIds) {
          const preferredTable = compatibleTables.find((t: any) => t.id === preferredTableId);
          
          if (preferredTable && !occupiedTableIds.has(preferredTableId) && !blockedTableIds.has(preferredTableId)) {
            finalTableIds = [preferredTableId];
            console.log(`✅ Mesa preferida VIP asignada: ${preferredTableId}`);
            vipPreferredTableName = preferredTable.name || 'su mesa favorita';
            isVipTableAssigned = true;
            assigned = true;
            break;
          } else if (blockedTableIds.has(preferredTableId)) {
            const tableInfo = allTables.find((t: any) => t.id === preferredTableId);
            vipTableMessage = `⭐ Cliente VIP prefiere la mesa ${tableInfo?.name || preferredTableId} pero está bloqueada`;
            console.log(vipTableMessage);
          } else if (preferredTable && occupiedTableIds.has(preferredTableId)) {
            const tableInfo = allTables.find((t: any) => t.id === preferredTableId);
            vipTableMessage = `⭐ Cliente VIP prefiere la mesa ${tableInfo?.name || preferredTableId} pero está ocupada`;
            console.log(vipTableMessage);
          }
        }
      }
      
      if (!assigned) {
        for (const group of compatibleGroups) {
          const groupTableIds = Array.isArray(group.table_ids) ? group.table_ids : [];
          const allTablesAvailable = groupTableIds.every((tableId: string) => 
            !occupiedTableIds.has(tableId) && !blockedTableIds.has(tableId)
          );
          
          if (allTablesAvailable && groupTableIds.length > 0) {
            finalTableIds = groupTableIds;
            console.log(`✅ Grupo de mesas asignado automáticamente: ${group.id} (prioridad: ${group.priority || 0}, mesas: ${groupTableIds.join(', ')})`);
            assigned = true;
            break;
          } else if (groupTableIds.length > 0) {
            const blockedInGroup = groupTableIds.filter((id: string) => blockedTableIds.has(id));
            const occupiedInGroup = groupTableIds.filter((id: string) => occupiedTableIds.has(id));
            console.log(`⚠️ [CREATE] Grupo ${group.id} no disponible - bloqueadas: [${blockedInGroup}], ocupadas: [${occupiedInGroup}]`);
          }
        }
      }

      if (!assigned) {
        for (const table of compatibleTables) {
          if (!occupiedTableIds.has(table.id)) {
            finalTableIds.push(table.id);
            console.log(`✅ Mesa asignada automáticamente: ${table.id} (prioridad: ${table.priority || 0})`);
            break;
          }
        }
      }

      if (finalTableIds.length === 0) {
        console.log('⚠️ No hay mesas ni grupos disponibles para este horario');
      }
    }

    // VALIDACIÓN CRÍTICA: No permitir reservas sin mesa asignada
    if (finalTableIds.length === 0) {
      console.error('❌ [CREATE] RESERVA RECHAZADA: No hay mesas disponibles');
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No hay mesas disponibles para este horario. Por favor, selecciona otra fecha u hora.' });
    }

    const unavailableTablesForFinalSelection = await getUnavailableTableIdsForSlot({
      db: ctx.db,
      restaurantId: input.restaurantId,
      date: input.date,
      slotTimeMinutes: input.time.hour * 60 + input.time.minute,
      locationId: input.locationId,
    });

    const conflictingFinalOccupiedTables = finalTableIds.filter((tableId: string) =>
      unavailableTablesForFinalSelection.occupiedTableIds.has(tableId)
    );
    if (conflictingFinalOccupiedTables.length > 0) {
      console.error('❌ [CREATE] RESERVA RECHAZADA: Mesas ocupadas por rotación/grupo/división en validación final:', conflictingFinalOccupiedTables);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No hay mesas disponibles para este horario. Debe respetarse el tiempo de rotación en todas las mesas, incluidas las agrupadas o divididas.',
      });
    }

    const conflictingFinalBlockedTables = finalTableIds.filter((tableId: string) => {
      if (!unavailableTablesForFinalSelection.blockedTableIds.has(tableId)) return false;
      // temp-group tables are valid assignments: their members being structurally blocked
      // is by design (they were grouped). The group itself is the replacement table.
      if (tableId.startsWith('temp-group-')) {
        console.log('[CREATE] temp-group en blockedTableIds ignorado (es asignación válida):', tableId);
        return false;
      }
      return true;
    });
    if (conflictingFinalBlockedTables.length > 0) {
      console.error('❌ [CREATE] RESERVA RECHAZADA: Mesas bloqueadas o no adjudicables en validación final:', conflictingFinalBlockedTables);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No hay mesas disponibles para este horario. Algunas mesas están bloqueadas, agrupadas o divididas y no pueden adjudicarse ahora.',
      });
    }

    // VALIDACIÓN CRÍTICA DE SEGURIDAD: Verificar que NINGUNA mesa asignada esté bloqueada
    // Esta es una doble verificación final por seguridad - aplica SIEMPRE incluyendo panel del restaurante
    {
      const dateStr = input.date.includes('T') ? input.date.split('T')[0] : input.date;
      const slotTimeMinutes = input.time.hour * 60 + input.time.minute;
      // Obtener mesas temporales de grupo para esta fecha (necesarias para expandir IDs)
      const tempGroupsResult = await ctx.db.query(
        `SELECT id, grouped_table_ids, rotation_time_minutes FROM tables
         WHERE restaurant_id = $1 AND is_temporary = TRUE AND shift_date::text = $2 AND grouped_table_ids IS NOT NULL`,
        [input.restaurantId, dateStr]
      );
      const tempGroups: { id: string; groupedTableIds: string[]; rotationTimeMinutes: number }[] = tempGroupsResult.rows.map((r: any) => ({
        id: r.id as string,
        groupedTableIds: (() => { try { return typeof r.grouped_table_ids === 'string' ? JSON.parse(r.grouped_table_ids) : (r.grouped_table_ids || []); } catch { return []; } })(),
        rotationTimeMinutes: (r.rotation_time_minutes as number) || 120,
      }));
      // Verificar bloqueos de grupo: si una mesa forma parte de un grupo con reserva activa
      const blockCheckResult = await ctx.db.query(
        `SELECT table_id, id FROM table_blocks
         WHERE restaurant_id = $1
         AND table_id = ANY($2::text[])
         AND start_time <= $3::timestamp
         AND end_time > $3::timestamp`,
        [input.restaurantId, finalTableIds, `${dateStr}T${String(input.time.hour).padStart(2,'0')}:${String(input.time.minute).padStart(2,'0')}:00`]
      );
      for (const blockRow of blockCheckResult.rows) {
        const blockId = blockRow.id as string;
        const blockedTableId = blockRow.table_id as string;
        if (blockId.startsWith('block-group-')) {
          // Encontrar el grupo que contiene esta mesa
          const groupTable = tempGroups.find(g => g.groupedTableIds.includes(blockedTableId));
          if (groupTable) {
            // Verificar si el grupo tiene una reserva activa
            const groupResResult = await ctx.db.query(
              `SELECT time FROM reservations WHERE restaurant_id = $1 AND date::date = $2::date AND status != 'cancelled' AND table_ids::text LIKE $3`,
              [input.restaurantId, dateStr, `%${groupTable.id}%`]
            );
            if (groupResResult.rows.length > 0) {
              const grpResTime = typeof groupResResult.rows[0].time === 'string' ? JSON.parse(groupResResult.rows[0].time) : groupResResult.rows[0].time;
              const grpResTimeMin = grpResTime.hour * 60 + grpResTime.minute;
              const rotMin = groupTable.rotationTimeMinutes;
              if (slotTimeMinutes < grpResTimeMin + rotMin) {
                const availAt = `${String(Math.floor((grpResTimeMin + rotMin) / 60)).padStart(2, '0')}:${String((grpResTimeMin + rotMin) % 60).padStart(2, '0')}`;
                console.error('❌ [CREATE] RECHAZADA: Mesa en grupo activo hasta rotación cumplida:', blockedTableId, 'disponible desde:', availAt);
                throw new TRPCError({ code: 'BAD_REQUEST', message: `Esta mesa forma parte de un grupo con reserva activa. Estará disponible a partir de las ${availAt}.` });
              }
            } else {
              // Grupo sin reserva pero bloqueado → mesa no disponible individualmente
              console.error('❌ [CREATE] RECHAZADA: Mesa en grupo bloqueado (sin reserva):', blockedTableId);
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta mesa está agrupada con otras mesas y no puede reservarse individualmente en este turno.' });
            }
          }
        } else if (!input.fromRestaurantPanel) {
          // Bloqueo regular: solo rechazar para clientes, el restaurante puede sobrescribir
          console.error('❌ [CREATE] RECHAZADA: Mesa bloqueada (bloqueo regular):', blockedTableId);
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No hay mesas disponibles para este horario. Algunas mesas están bloqueadas. Por favor, selecciona otra fecha u hora.' });
        }
      }
      // Verificar que las mesas no estén ocupadas por reservas existentes (expandiendo IDs de grupos)
      const occupiedCheckResult = await ctx.db.query(
        `SELECT r.table_ids, r.time,
           COALESCE((
             SELECT MAX(t2.rotation_time_minutes)
             FROM tables t2
             WHERE t2.id = ANY(ARRAY(SELECT jsonb_array_elements_text(r.table_ids::jsonb)))
           ), 120) as rot
         FROM reservations r
         WHERE r.restaurant_id = $1 AND r.date::date = $2::date AND r.status != 'cancelled'`,
        [input.restaurantId, dateStr]
      );
      const occupiedForCheck = new Set<string>();
      for (const row of occupiedCheckResult.rows) {
        const rTime = typeof row.time === 'string' ? JSON.parse(row.time) : row.time;
        const rTimeMin = rTime.hour * 60 + rTime.minute;
        const rot = Number(row.rot) || 120;
        if (Math.abs(slotTimeMinutes - rTimeMin) < rot) {
          const tIds = typeof row.table_ids === 'string' ? JSON.parse(row.table_ids) : (row.table_ids || []);
          for (const tid of tIds) {
            occupiedForCheck.add(tid as string);
            // Expandir IDs de grupos temporales a mesas individuales
            const grp = tempGroups.find(g => g.id === tid);
            if (grp) grp.groupedTableIds.forEach(gid => occupiedForCheck.add(gid));
          }
        }
      }
      const alreadyOccupiedByGroup = finalTableIds.filter(id => occupiedForCheck.has(id));
      if (alreadyOccupiedByGroup.length > 0) {
        console.error('❌ [CREATE] RECHAZADA: Mesas ya ocupadas (incluyendo grupos):', alreadyOccupiedByGroup);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Una o más mesas seleccionadas ya están ocupadas para este horario (posiblemente a través de un grupo). Por favor, selecciona otro horario.' });
      }
      console.log('✅ [CREATE] Validación de grupos y bloqueos pasada correctamente');
    }

    if (!input.fromRestaurantPanel) {
      const reservationDateTime = new Date(`${input.date}T${String(input.time.hour).padStart(2, '0')}:${String(input.time.minute).padStart(2, '0')}:00`);
      const finalBlockCheck = await ctx.db.query(
        `SELECT DISTINCT table_id FROM table_blocks 
         WHERE restaurant_id = $1 
         AND table_id = ANY($2::text[])
         AND start_time <= $3 
         AND end_time > $3`,
        [input.restaurantId, finalTableIds, reservationDateTime]
      );
      if (finalBlockCheck.rows.length > 0) {
        const blockedIds = finalBlockCheck.rows.map((r: any) => r.table_id);
        console.error('❌ [CREATE] RESERVA RECHAZADA: Mesas bloqueadas detectadas en validación final:', blockedIds);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No hay mesas disponibles para este horario. Algunas mesas están bloqueadas. Por favor, selecciona otra fecha u hora.' });
      }

      // VALIDACIÓN CRÍTICA: Verificar que las mesas no estén ya ocupadas por otra reserva
      const finalOccupiedCheck = await ctx.db.query(
        `SELECT r.id, r.table_ids, r.time,
           COALESCE((
             SELECT MAX(t2.rotation_time_minutes)
             FROM tables t2
             WHERE t2.id = ANY(ARRAY(SELECT jsonb_array_elements_text(r.table_ids::jsonb)))
           ), 120) as rotation_time_minutes
         FROM reservations r
         WHERE r.restaurant_id = $1 
         AND r.date::date = $2::date
         AND r.status != 'cancelled'`,
        [input.restaurantId, input.date]
      );
      const slotTimeCheck = input.time.hour * 60 + input.time.minute;
      const alreadyOccupied: string[] = [];
      for (const row of finalOccupiedCheck.rows) {
        const resTime = typeof row.time === 'string' ? JSON.parse(row.time) : row.time;
        const resTimeMinutes = resTime.hour * 60 + resTime.minute;
        const rotationMinutesCheck = Number(row.rotation_time_minutes) || 120;
        if (Math.abs(slotTimeCheck - resTimeMinutes) < rotationMinutesCheck) {
          const tableIds = typeof row.table_ids === 'string' ? JSON.parse(row.table_ids) : row.table_ids;
          if (Array.isArray(tableIds)) {
            for (const tid of tableIds) {
              if (finalTableIds.includes(tid)) {
                alreadyOccupied.push(tid);
              }
            }
          }
        }
      }
      if (alreadyOccupied.length > 0) {
        console.error('❌ [CREATE] RESERVA RECHAZADA: Mesas ya ocupadas detectadas en validación final:', alreadyOccupied);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No hay mesas disponibles para este horario. Las mesas seleccionadas ya están ocupadas. Por favor, selecciona otra fecha u hora.' });
      }
      console.log('✅ [CREATE] Validación final de seguridad pasada correctamente');
    }

    console.log('✅ [CREATE] Mesas asignadas:', finalTableIds);
    console.log('🔵 [CREATE] Configuración de división:', splitTableConfig);

    if (input.fromRestaurantPanel && input.skipConfirmation && input.allowCapacityExpansion) {
      const capacityExpansionResult = await expandShiftCapacityIfNeeded({
        db: ctx.db,
        restaurantId: input.restaurantId,
        date: input.date,
        hour: input.time.hour,
        minute: input.time.minute,
        guestsToAdd: input.guests,
      });

      console.log('📊 [CREATE] Resultado ampliación automática de aforo:', capacityExpansionResult);
    }

    // Validar disponibilidad de tronas
    if (input.needsHighChair && input.highChairCount && input.highChairCount > 0) {
      const restaurantResult = await ctx.db.query(
        'SELECT available_high_chairs, high_chair_rotation_minutes FROM restaurants WHERE id = $1',
        [input.restaurantId]
      );
      const availableHighChairs = restaurantResult.rows[0]?.available_high_chairs || 0;
      const highChairRotationMinutes = restaurantResult.rows[0]?.high_chair_rotation_minutes || 120;

      if (input.highChairCount > availableHighChairs) {
        throw new Error(`Solo hay ${availableHighChairs} tronas disponibles. Solicitadas: ${input.highChairCount}`);
      }

      const reservationsOnSameDay = await ctx.db.query(
        `SELECT * FROM reservations 
         WHERE restaurant_id = $1 
         AND location_id = $2 
         AND date::date = $3::date
         AND status != 'cancelled'`,
        [input.restaurantId, input.locationId, input.date]
      );

      const slotTime = input.time.hour * 60 + input.time.minute;
      const usedHighChairs = reservationsOnSameDay.rows
        .filter((res: any) => {
          const resTime = typeof res.time === 'string' ? JSON.parse(res.time) : res.time;
          const resTimeMinutes = resTime.hour * 60 + resTime.minute;
          return Math.abs(slotTime - resTimeMinutes) < highChairRotationMinutes;
        })
        .reduce((sum: number, res: any) => sum + (res.high_chair_count || 0), 0);

      if (usedHighChairs + input.highChairCount > availableHighChairs) {
        throw new Error(`No hay suficientes tronas disponibles para este horario. Disponibles: ${availableHighChairs}, en uso: ${usedHighChairs}, solicitadas: ${input.highChairCount}`);
      }

      console.log(`✅ [CREATE] Validación de tronas: disponibles=${availableHighChairs}, en uso=${usedHighChairs}, solicitadas=${input.highChairCount}`);
    }

    const now = new Date();
    const nowUtcIso = now.toISOString();
    console.log('🔵 [CREATE] Verificando cliente existente...');
    console.log('🔵 [CREATE] Hora UTC actual:', nowUtcIso);
    
    if (clientResult.rows.length === 0) {
      clientId = `client-${Date.now()}`;
      console.log('🔵 [CREATE] Cliente no existe, creando nuevo:', clientId);
      
      // IMPORTANTE: Crear el cliente AHORA para cumplir con la foreign key constraint
      try {
        await ctx.db.query(
          `INSERT INTO clients (id, name, phone, email, rating, total_ratings, user_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            clientId,
            input.clientName,
            input.clientPhone,
            'sin-email@example.com',
            4,
            0,
            'user_new',
            now,
            now,
          ]
        );
        console.log('✅ [CREATE] Cliente creado exitosamente como user_new:', clientId);
      } catch (error: any) {
        console.error('❌ [CREATE] Error creando cliente:', error);
        throw new Error(`No se pudo crear el cliente: ${error.message}`);
      }
    } else {
      clientId = (clientResult.rows[0] as any).id;
      console.log('✅ [CREATE] Cliente existente encontrado:', clientId);
    }

    console.log('🔵 [CREATE] Preparando datos de reserva...');
    
    const reservationId = `res-${Date.now()}`;
    const confirmationToken = `token-${Date.now()}`;
    const confirmationToken2 = `token2-${Date.now()}`;

    await ctx.db.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS from_restaurant_panel BOOLEAN DEFAULT FALSE`, []);
    const isFromRestaurantPanel = input.fromRestaurantPanel === true;
    
    // NUEVO SISTEMA: 
    // - Si fromRestaurantPanel=true + skipConfirmation=true -> estado 'confirmed' (restaurante crea directamente)
    // - Si skipConfirmation=true (sin panel restaurante) -> estado 'añadida'
    // - Si no -> estado 'pending' (el cliente debe confirmar en 10 minutos)
    const reservationStatus = (input.fromRestaurantPanel && input.skipConfirmation) ? 'confirmed' : input.skipConfirmation ? 'añadida' : 'pending';
    
    console.log('🔵 [CREATE] IDs generados:', {
      reservationId,
      confirmationToken,
      confirmationToken2,
      clientId,
    });
    console.log('📋 [CREATE RESERVATION] Estado de reserva:', {
      hasTables: finalTableIds.length > 0,
      status: reservationStatus,
      tables: finalTableIds,
    });

    const locationResult = await ctx.db.query(
      'SELECT name FROM table_locations WHERE id = $1',
      [input.locationId]
    );
    const locationName = locationResult.rows[0]?.name || 'Sin ubicación';

    console.log('🔵 [CREATE] Insertando reserva con datos:', {
      reservationId,
      restaurantId: input.restaurantId,
      clientPhone: input.clientPhone,
      clientName: input.clientName,
      locationName,
      tableIds: finalTableIds,
      status: reservationStatus,
    });

    try {
      console.log('🔵 [CREATE] Intentando INSERT con valores:', {
        id: reservationId,
        restaurant_id: input.restaurantId,
        client_id: clientId,
        date: input.date,
        time: JSON.stringify(input.time),
        guests: input.guests,
        status: reservationStatus,
      });

      const insertParams = [
        reservationId,
        input.restaurantId,
        clientId,
        input.clientPhone || '',
        input.clientName || '',
        '',
        input.date,
        JSON.stringify(input.time),
        input.guests,
        input.locationId,
        locationName,
        JSON.stringify(finalTableIds),
        input.needsHighChair,
        input.highChairCount || 0,
        input.needsStroller,
        input.hasPets,
        reservationStatus,
        input.notes || '',
        input.notes || '',
        confirmationToken,
        confirmationToken2,
        confirmationToken,
        clientResult.rows.length === 0,
        nowUtcIso,
        nowUtcIso,
        isFromRestaurantPanel,
      ];

      console.log('🔵 [CREATE] Parámetros INSERT preparados, ejecutando query...');
      console.log('🔵 [CREATE] Tipos de parámetros:', insertParams.map((p, i) => `${i+1}: ${typeof p} (${p === null ? 'null' : String(p).substring(0, 50)})`));

      const insertPromise = ctx.db.query(
        `INSERT INTO reservations (id, restaurant_id, client_id, client_phone, client_name, client_email,
              date, time, guests, location_id, location_name, table_ids, needs_high_chair, high_chair_count,
              needs_stroller, has_pets, status, notes, client_notes, confirmation_token, confirmation_token2, token, 
              pending_expires_at, is_new_client, created_at, updated_at, from_restaurant_panel) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, (NOW() AT TIME ZONE 'UTC') + INTERVAL '15 minutes', $23, $24, $25, $26)`,
        insertParams
      );

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('INSERT query timeout después de 25 segundos. Posible bloqueo en la base de datos.')), 25000)
      );

      await Promise.race([insertPromise, timeoutPromise]);
      console.log('✅ [CREATE] Reserva insertada exitosamente en la base de datos');
      console.log('🔵 [CREATE] Verificando si hay división de mesa...');
      
      if (splitTableConfig) {
        console.log('🔵 [CREATE] Procesando división de mesa ANTES de notificaciones...', splitTableConfig);
        
        // CRÍTICO: Verificar que la mesa original NO esté bloqueada
        const reservationDateTime = new Date(`${input.date}T${String(input.time.hour).padStart(2, '0')}:${String(input.time.minute).padStart(2, '0')}:00`);
        const blockCheckResult = await ctx.db.query(
          `SELECT id FROM table_blocks 
           WHERE table_id = $1 
           AND restaurant_id = $2 
           AND start_time <= $3 
           AND end_time > $3`,
          [splitTableConfig.originalTableId, input.restaurantId, reservationDateTime]
        );
        
        if (blockCheckResult.rows.length > 0) {
          console.log('🚫 [CREATE] DIVISIÓN RECHAZADA: La mesa original está bloqueada:', splitTableConfig.originalTableId);
          throw new Error('No se puede dividir una mesa bloqueada. Por favor, desbloquee la mesa primero o seleccione otra mesa.');
        }
        
        const originalTableResult = await ctx.db.query(
          'SELECT * FROM tables WHERE id = $1',
          [splitTableConfig.originalTableId]
        );
        
        if (originalTableResult.rows.length > 0) {
          const originalTable = originalTableResult.rows[0];
          const splitTableId = `${splitTableConfig.originalTableId}B`;
          const splitTableName = `${splitTableConfig.originalTableName}B`;
          
          console.log('🔵 [CREATE] Creando mesa temporal:', splitTableId);
          await ctx.db.query(
            `INSERT INTO tables (
              id, location_id, restaurant_id, name, 
              min_capacity, max_capacity, 
              allows_high_chairs, available_high_chairs,
              allows_strollers, allows_pets, 
              priority, order_num, created_at, is_active,
              is_temporary, original_table_id, linked_reservation_id
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), true, true, $13, $14)
            ON CONFLICT (id) DO NOTHING`,
            [
              splitTableId,
              originalTable.location_id,
              input.restaurantId,
              splitTableName,
              splitTableConfig.splitTableBCapacity,
              splitTableConfig.splitTableBCapacity,
              splitTableConfig.splitTableBHighChairs > 0,
              splitTableConfig.splitTableBHighChairs,
              splitTableConfig.splitTableBAllowsStroller,
              splitTableConfig.splitTableBAllowsPets,
              originalTable.priority || 5,
              originalTable.order_num,
              splitTableConfig.originalTableId,
              reservationId
            ]
          );
          console.log('✅ [CREATE] Mesa temporal creada:', splitTableId);
          
          const existingModResult = await ctx.db.query(
            'SELECT id FROM table_modifications WHERE table_id = $1 AND reservation_id = $2',
            [splitTableConfig.originalTableId, reservationId]
          );
          
          if (existingModResult.rows.length > 0) {
            console.log('🔵 [CREATE] Actualizando modificación de mesa existente');
            await ctx.db.query(
              `UPDATE table_modifications SET
                modified_min_capacity = $1,
                modified_max_capacity = $2,
                modified_high_chairs = $3,
                modified_allows_stroller = $4,
                modified_allows_pets = $5
              WHERE table_id = $6 AND reservation_id = $7`,
              [
                splitTableConfig.modifiedTableACapacity,
                splitTableConfig.modifiedTableACapacity,
                splitTableConfig.modifiedTableAHighChairs,
                splitTableConfig.modifiedTableAAllowsStroller,
                splitTableConfig.modifiedTableAAllowsPets,
                splitTableConfig.originalTableId,
                reservationId
              ]
            );
          } else {
            console.log('🔵 [CREATE] Creando nueva modificación de mesa');
            await ctx.db.query(
              `INSERT INTO table_modifications (
                id, table_id, reservation_id, 
                original_min_capacity, original_max_capacity,
                original_high_chairs, original_allows_stroller, original_allows_pets,
                modified_min_capacity, modified_max_capacity,
                modified_high_chairs, modified_allows_stroller, modified_allows_pets,
                created_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
              [
                `mod-${Date.now()}`,
                splitTableConfig.originalTableId,
                reservationId,
                originalTable.min_capacity,
                originalTable.max_capacity,
                originalTable.available_high_chairs || 0,
                originalTable.allows_strollers || false,
                originalTable.allows_pets || false,
                splitTableConfig.modifiedTableACapacity,
                splitTableConfig.modifiedTableACapacity,
                splitTableConfig.modifiedTableAHighChairs,
                splitTableConfig.modifiedTableAAllowsStroller,
                splitTableConfig.modifiedTableAAllowsPets
              ]
            );
          }
          console.log('✅ [CREATE] Modificación de mesa guardada');
          console.log('✅ [CREATE] Mesa original NO se modifica, solo se guardan las modificaciones temporales');
          
          finalTableIds = [splitTableId];
          
          console.log('🔵 [CREATE] Actualizando reserva con nueva mesa dividida:', finalTableIds);
          await ctx.db.query(
            'UPDATE reservations SET table_ids = $1 WHERE id = $2',
            [JSON.stringify(finalTableIds), reservationId]
          );
          
          console.log('✅ [CREATE] Mesa dividida exitosamente:', splitTableId);
        }
      }
      
      console.log('🔵 [CREATE] Continuando con el flujo de notificaciones...');
    } catch (error: any) {
      console.error('❌ [CREATE] Error insertando reserva en base de datos:', error);
      console.error('❌ [CREATE] Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        constraint: error.constraint,
      });
      throw new Error(`No se pudo crear la reserva: ${error.message || 'Error desconocido'}`);
    }



    const newReservation: Reservation = {
      id: reservationId,
      restaurantId: input.restaurantId,
      clientId,
      date: input.date,
      time: input.time,
      guests: input.guests,
      locationId: input.locationId,
      tableIds: finalTableIds,
      needsHighChair: input.needsHighChair,
      highChairCount: input.highChairCount,
      needsStroller: input.needsStroller,
      hasPets: input.hasPets,
      status: reservationStatus,
      notes: input.notes,
      confirmationToken: confirmationToken,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    console.log('✅ [CREATE] Objeto newReservation creado correctamente');
    console.log('🔵 [CREATE] Calculando mensaje VIP...');

    const vipMessage = isVipClient && isVipTableAssigned
      ? `⭐ ¡Bienvenido! Le hemos asignado ${vipPreferredTableName}, su mesa favorita.`
      : isVipClient && !isVipTableAssigned && vipTableMessage
      ? `Su mesa favorita ya está ocupada para este horario. Le asignaremos otra mesa, esperamos que sea de su agrado.`
      : undefined;
    
    console.log('✅ [CREATE] Mensaje VIP calculado:', vipMessage ? 'Sí' : 'No');

    console.log('✅ [CREATE] Nueva reserva creada:', reservationId);
    console.log('📋 [CREATE] Detalles:', {
      status: reservationStatus,
      cliente: input.clientName,
      fecha: input.date,
      hora: `${input.time.hour}:${input.time.minute}`,
      comensales: input.guests,
    });

    try {
      console.log('🔍 [CREATE] Consultando datos del restaurante para notificaciones:', input.restaurantId);
      const restaurantResult = await ctx.db.query(
        'SELECT name, email, phone, notification_phones, notification_email, whatsapp_custom_message, auto_send_whatsapp, use_whatsapp_web, whatsapp_type, enable_email_notifications, min_modify_cancel_minutes, reminder1_enabled, reminder1_hours, reminder2_enabled, reminder2_minutes FROM restaurants WHERE id = $1',
        [input.restaurantId]
      );
      console.log('📊 [CREATE] Resultado de query restaurante:', {
        rowsFound: restaurantResult.rows.length,
        restaurantId: input.restaurantId,
      });

      if (restaurantResult.rows.length > 0) {
        console.log('✅ [CREATE] Restaurante encontrado, datos:', {
          name: restaurantResult.rows[0].name,
          autoSendWhatsapp: restaurantResult.rows[0].auto_send_whatsapp,
          useWhatsappWeb: restaurantResult.rows[0].use_whatsapp_web,
          whatsappType: restaurantResult.rows[0].whatsapp_type,
        });
        const restaurant = restaurantResult.rows[0] as any;
        const timeString = `${String(input.time.hour).padStart(2, '0')}:${String(input.time.minute).padStart(2, '0')}`;

        let restaurantPhone: string | undefined;
        try {
          restaurantPhone = Array.isArray(restaurant.phone) 
            ? restaurant.phone[0] 
            : (typeof restaurant.phone === 'string' ? JSON.parse(restaurant.phone)[0] : undefined);
        } catch (parseErr) {
          console.error('⚠️ [CREATE] Error parseando restaurant.phone:', parseErr);
          restaurantPhone = undefined;
        }
        
        let notificationPhones: string[] = [];
        try {
          notificationPhones = restaurant.notification_phones 
            ? (Array.isArray(restaurant.notification_phones) 
                ? restaurant.notification_phones 
                : JSON.parse(restaurant.notification_phones))
            : [];
        } catch (parseErr) {
          console.error('⚠️ [CREATE] Error parseando notification_phones:', parseErr);
          notificationPhones = [];
        }

        console.log('📨 [CREATE] Iniciando envío de notificaciones al cliente...');
        
        const existingClientEmail = clientResult.rows.length > 0 ? (clientResult.rows[0] as any).email : undefined;

        sendReservationNotifications({
          restaurantId: input.restaurantId,
          restaurantName: restaurant.name,
          restaurantEmail: restaurant.email,
          restaurantPhone,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          clientEmail: existingClientEmail,
          date: input.date,
          time: timeString,
          guests: input.guests,
          locationName: locationName,
          notes: input.notes,
          needsHighChair: input.needsHighChair,
          highChairCount: input.highChairCount,
          needsStroller: input.needsStroller,
          hasPets: input.hasPets,
          notificationPhones,
          notificationEmail: restaurant.notification_email,
          whatsappCustomMessage: restaurant.whatsapp_custom_message,
          autoSendWhatsapp: restaurant.auto_send_whatsapp || false,
          useWhatsappWeb: restaurant.use_whatsapp_web || false,
          whatsappType: restaurant.whatsapp_type || 'free',
          enableEmailNotifications: restaurant.enable_email_notifications || false,
          db: ctx.db,
          minModifyCancelMinutes: restaurant.min_modify_cancel_minutes || 180,
          reservationId,
          confirmationToken: confirmationToken,
          confirmationToken2: confirmationToken2,
          tableIds: finalTableIds,
          fromRestaurantPanel: input.fromRestaurantPanel || false,
          skipConfirmation: input.skipConfirmation || false,
          depositPaid: input.depositPaid || false,
        }).then(() => {
          console.log('✅ [CREATE] Notificaciones enviadas correctamente');
        }).catch((error) => {
          console.error('❌ [CREATE] Error enviando notificaciones de reserva:', error);
        });
        console.log('📨 [CREATE] Llamada a sendReservationNotifications completada');

        try {
          const reminder1Enabled = restaurant.reminder1_enabled || false;
          const reminder1Hours = restaurant.reminder1_hours || 24;
          const reminder2Enabled = restaurant.reminder2_enabled || false;
          const reminder2Minutes = restaurant.reminder2_minutes || 60;

          console.log('🔍 [CREATE] Verificando condiciones para recordatorios:', {
            reminder1Enabled,
            reminder1Hours,
            reminder2Enabled,
            reminder2Minutes,
            useWhatsappWeb: restaurant.use_whatsapp_web,
            autoSendWhatsapp: restaurant.auto_send_whatsapp,
          });

          const isWalkInPhone = input.clientPhone && (input.clientPhone.startsWith('walkin-') || input.clientPhone.startsWith('walk-'));
          if (isWalkInPhone) {
            console.log('⏭️ [CREATE] Omitiendo recordatorios: reserva walk-in sin teléfono real');
          }

          const shouldScheduleReminders = reservationStatus === 'confirmed' || reservationStatus === 'añadida';
          const canSendReminders = restaurant.use_whatsapp_web || (restaurant.whatsapp_type === 'paid');
          if (!isWalkInPhone && shouldScheduleReminders && (reminder1Enabled || reminder2Enabled) && canSendReminders && restaurant.auto_send_whatsapp) {
            console.log('📅 [CREATE] Programando recordatorios inteligentes...');
            const notificationQueue = new WhatsAppNotificationQueue(ctx.db);
            const reservationDateTime = new Date(`${input.date}T${String(input.time.hour).padStart(2, '0')}:${String(input.time.minute).padStart(2, '0')}:00`);
            const nowForReminder = new Date();
            const minutesUntilReservation = (reservationDateTime.getTime() - nowForReminder.getTime()) / (1000 * 60);

            const dateObj = new Date(input.date);
            const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const formattedDate = `${dayName}, ${day}/${month}/${year}`;

            const reminder1MinutesBeforeReservation = reminder1Hours * 60;
            const reminder2MinutesBeforeReservation = reminder2Minutes;

            if (reminder1Enabled && minutesUntilReservation > reminder1MinutesBeforeReservation) {
              const scheduledFor1 = new Date(reservationDateTime.getTime() - reminder1Hours * 60 * 60 * 1000);
              console.log(`📅 [CREATE] Programando recordatorio 1 (${reminder1Hours}h antes) para: ${scheduledFor1.toISOString()}`);
              
              try {
                const reminder1Message = `Hola *${input.clientName}*, le recordamos que tiene una reserva el *${formattedDate}* a las *${timeString}*, si lo desea puede modificar esta reserva desde el mensaje anterior que ha recibido confirmando la reserva. Quedamos a su disposición para solucionar cualquier duda. Un saludo.\n\n*${restaurant.name}*`;
                
                await notificationQueue.scheduleNotification({
                  restaurantId: input.restaurantId,
                  reservationId,
                  recipientPhone: input.clientPhone,
                  recipientName: input.clientName,
                  message: reminder1Message,
                  notificationType: `reminder_${reminder1Hours}h`,
                  scheduledFor: scheduledFor1,
                });
                console.log(`✅ [CREATE] Recordatorio ${reminder1Hours}h programado exitosamente`);
              } catch (error) {
                console.error('❌ [CREATE] Error programando recordatorio 1:', error);
              }
            } else if (reminder1Enabled) {
              console.log(`⚠️ [CREATE] Recordatorio ${reminder1Hours}h omitido: faltan ${Math.floor(minutesUntilReservation / 60)}h (menos de ${reminder1Hours}h)`);
            }

            if (reminder2Enabled && minutesUntilReservation > reminder2MinutesBeforeReservation) {
              const scheduledFor2 = new Date(reservationDateTime.getTime() - reminder2Minutes * 60 * 1000);
              console.log(`📅 [CREATE] Programando recordatorio 2 (${reminder2Minutes}m antes) para: ${scheduledFor2.toISOString()}`);
              
              try {
                const reminder2Message = `Hola ${input.clientName}, le recordamos que tiene una reserva Hoy a las ${timeString}, le rogamos puntualidad. Un saludo.`;
                
                await notificationQueue.scheduleNotification({
                  restaurantId: input.restaurantId,
                  reservationId,
                  recipientPhone: input.clientPhone,
                  recipientName: input.clientName,
                  message: reminder2Message,
                  notificationType: `reminder_${reminder2Minutes}m`,
                  scheduledFor: scheduledFor2,
                });
                console.log(`✅ [CREATE] Recordatorio ${reminder2Minutes}m programado exitosamente`);
              } catch (error) {
                console.error('❌ [CREATE] Error programando recordatorio 2:', error);
              }
            } else if (reminder2Enabled) {
              console.log(`⚠️ [CREATE] Recordatorio ${reminder2Minutes}m omitido: faltan ${Math.floor(minutesUntilReservation)}m (menos de ${reminder2Minutes}m)`);
            }
          } else {
            console.log('⚠️ [CREATE] No se programarán recordatorios: condiciones no cumplidas');
          }
        } catch (reminderError) {
          console.error('❌ [CREATE] Error en sección de recordatorios (no afecta la reserva):', reminderError);
        }
      } else {
        console.error('❌ [CREATE] ERROR CRÍTICO: No se encontró el restaurante en la base de datos:', input.restaurantId);
        console.error('❌ [CREATE] No se pueden enviar notificaciones sin datos del restaurante');
      }
    } catch (notificationError) {
      console.error('❌ [CREATE] Error en sección de notificaciones (la reserva ya fue creada):', notificationError);
    }

    return {
      ...newReservation,
      vipMessage,
      isVip: isVipClient,
    };
  });
