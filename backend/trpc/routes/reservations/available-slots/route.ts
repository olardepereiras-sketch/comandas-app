import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { TimeSlot } from '@/types';

export const availableSlotsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string(),
      guests: z.number(),
      locationId: z.string(),
      needsHighChair: z.boolean().optional(),
      highChairCount: z.number().optional(),
      needsStroller: z.boolean().optional(),
      hasPets: z.boolean().optional(),
      excludeToken: z.string().optional(),
      ignoreMinAdvance: z.boolean().optional(),
      ignoreMaxCapacity: z.boolean().optional(),
      clientPhone: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [AVAILABLE SLOTS] Consultando horarios disponibles:', input);
    
    try {

    let clientGlobalRating = 5.0;
    let clientLocalRating = 5.0;
    let isBlockedForRestaurant = false;

    if (input.clientPhone) {
      const clientResult = await ctx.db.query(
        `SELECT rating, local_ratings, restaurant_blocks, total_no_shows FROM clients WHERE phone = $1`,
        [input.clientPhone]
      );
      
      if (clientResult.rows.length > 0) {
        const clientData = clientResult.rows[0];
        clientGlobalRating = parseFloat(clientData.rating) || 5.0;
        
        const localRatings = clientData.local_ratings;
        const localRatingsData = typeof localRatings === 'string' 
          ? JSON.parse(localRatings) 
          : (localRatings || {});
        
        const restaurantLocalData = localRatingsData[input.restaurantId];
        clientLocalRating = restaurantLocalData?.average || 5.0;
        
        const restaurantBlocks = clientData.restaurant_blocks;
        const blocksData = typeof restaurantBlocks === 'string'
          ? JSON.parse(restaurantBlocks)
          : (restaurantBlocks || {});
        
        const blockInfo = blocksData[input.restaurantId];
        if (blockInfo && blockInfo.isBlocked && blockInfo.reason === 'unwanted') {
          isBlockedForRestaurant = true;
          console.log('🚫 [AVAILABLE SLOTS] Cliente bloqueado como "no deseado" para este restaurante');
        }
        
        console.log('📊 [AVAILABLE SLOTS] Valoraciones del cliente:', {
          phone: input.clientPhone,
          globalRating: clientGlobalRating,
          localRating: clientLocalRating,
          isBlocked: isBlockedForRestaurant,
          totalNoShows: clientData.total_no_shows
        });
      } else {
        console.log('👤 [AVAILABLE SLOTS] Cliente nuevo sin valoraciones');
      }
    }

    if (isBlockedForRestaurant) {
      console.log('🚫 [AVAILABLE SLOTS] No se muestran horarios - cliente no deseado');
      return [];
    }

    const restaurantResult = await ctx.db.query(
      'SELECT min_booking_advance_minutes, available_high_chairs, high_chair_rotation_minutes FROM restaurants WHERE id = $1',
      [input.restaurantId]
    );
    const minBookingAdvanceMinutes = input.ignoreMinAdvance ? 0 : (restaurantResult.rows[0]?.min_booking_advance_minutes || 0);
    const availableHighChairs = restaurantResult.rows[0]?.available_high_chairs || 0;
    const highChairRotationMinutes = restaurantResult.rows[0]?.high_chair_rotation_minutes || 120;
    console.log(`🔍 [AVAILABLE SLOTS] Tiempo mínimo de anticipación: ${minBookingAdvanceMinutes} minutos`);
    console.log(`🔍 [AVAILABLE SLOTS] Tronas disponibles: ${availableHighChairs}, rotación: ${highChairRotationMinutes} minutos`);

    let dateString: string;
    let dayOfWeek: number;
    
    if (input.date.includes('T')) {
      const inputDate = new Date(input.date);
      const year = inputDate.getFullYear();
      const month = String(inputDate.getMonth() + 1).padStart(2, '0');
      const day = String(inputDate.getDate()).padStart(2, '0');
      dateString = `${year}-${month}-${day}`;
      dayOfWeek = inputDate.getDay();
      console.log('🔍 [AVAILABLE SLOTS] Fecha con timezone convertida:', { input: input.date, dateString, dayOfWeek });
    } else {
      dateString = input.date;
      const [year, month, day] = input.date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      dayOfWeek = localDate.getDay();
      console.log('🔍 [AVAILABLE SLOTS] Fecha sin timezone:', { dateString, dayOfWeek });
    }
    
    console.log('🔍 [AVAILABLE SLOTS] Fecha procesada:', { input: input.date, dateString, dayOfWeek });

    const dayExceptionResult = await ctx.db.query(
      'SELECT * FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
      [input.restaurantId, dateString]
    );

    let shifts = [];
    let isOpen = false;

    if (dayExceptionResult.rows.length > 0) {
      const exception = dayExceptionResult.rows[0];
      isOpen = exception.is_open;
      console.log(`🔍 [AVAILABLE SLOTS] Excepción de día encontrada para ${dateString}: isOpen=${isOpen}`);
      
      if (!isOpen) {
        console.log('⚠️ [AVAILABLE SLOTS] Día marcado como cerrado en excepción');
        return [];
      }
      
      try {
        const parsedShifts = typeof exception.template_ids === 'string' 
          ? JSON.parse(exception.template_ids) 
          : exception.template_ids;
        
        console.log('🔍 [AVAILABLE SLOTS] Shifts parseados de excepción:', {
          type: typeof parsedShifts,
          isArray: Array.isArray(parsedShifts),
          length: Array.isArray(parsedShifts) ? parsedShifts.length : 0,
          firstElement: Array.isArray(parsedShifts) && parsedShifts.length > 0 ? parsedShifts[0] : null
        });
        
        if (Array.isArray(parsedShifts) && parsedShifts.length > 0) {
          if (typeof parsedShifts[0] === 'object' && parsedShifts[0] !== null && 'startTime' in parsedShifts[0]) {
            shifts = parsedShifts;
            console.log(`✅ [AVAILABLE SLOTS] Turnos de excepción (formato completo): ${shifts.length}`, shifts);
          } else {
            console.log('⚠️ [AVAILABLE SLOTS] Array sin formato correcto, usando horario base');
            const schedulesResult = await ctx.db.query(
              'SELECT * FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2',
              [input.restaurantId, dayOfWeek]
            );
            if (schedulesResult.rows.length > 0 && schedulesResult.rows[0].is_open) {
              shifts = JSON.parse(schedulesResult.rows[0].shifts || '[]');
              console.log(`✅ [AVAILABLE SLOTS] Usando turnos del horario base: ${shifts.length}`);
            } else {
              shifts = [];
            }
          }
        } else {
          console.log('⚠️ [AVAILABLE SLOTS] Excepción sin turnos, usando horario base');
          const schedulesResult = await ctx.db.query(
            'SELECT * FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2',
            [input.restaurantId, dayOfWeek]
          );
          if (schedulesResult.rows.length > 0 && schedulesResult.rows[0].is_open) {
            shifts = JSON.parse(schedulesResult.rows[0].shifts || '[]');
            console.log(`✅ [AVAILABLE SLOTS] Usando turnos del horario base: ${shifts.length}`);
          } else {
            shifts = [];
          }
        }
      } catch (e) {
        console.error('❌ [AVAILABLE SLOTS] Error parseando turnos de excepción:', e);
        console.log('🔄 [AVAILABLE SLOTS] Intentando usar horario base');
        const schedulesResult = await ctx.db.query(
          'SELECT * FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2',
          [input.restaurantId, dayOfWeek]
        );
        if (schedulesResult.rows.length > 0 && schedulesResult.rows[0].is_open) {
          shifts = JSON.parse(schedulesResult.rows[0].shifts || '[]');
          console.log(`✅ [AVAILABLE SLOTS] Usando turnos del horario base tras error: ${shifts.length}`);
        } else {
          shifts = [];
        }
      }
    } else {
      console.log('🔍 [AVAILABLE SLOTS] No hay excepción, usando horario base');
      const schedulesResult = await ctx.db.query(
        'SELECT * FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2',
        [input.restaurantId, dayOfWeek]
      );

      if (schedulesResult.rows.length === 0 || !schedulesResult.rows[0].is_open) {
        console.log('⚠️ [AVAILABLE SLOTS] Restaurante cerrado este día (horario base)');
        return [];
      }

      const schedule = schedulesResult.rows[0];
      shifts = JSON.parse(schedule.shifts || '[]');
      isOpen = schedule.is_open;
    }

    if (shifts.length === 0) {
      console.log('⚠️ [AVAILABLE SLOTS] No hay turnos configurados');
      return [];
    }

    const tablesResult = await ctx.db.query(
      `SELECT * FROM tables WHERE restaurant_id = $1 AND location_id = $2 AND (
        (is_temporary IS NOT TRUE)
        OR (is_temporary = TRUE AND shift_date::text = $3)
      )`,
      [input.restaurantId, input.locationId, dateString]
    );

    const allTemporaryTableRows = tablesResult.rows.filter((t: any) => t.is_temporary === true || t.is_temporary === 'true');
    const permanentTableRows = tablesResult.rows.filter((t: any) => !t.is_temporary || t.is_temporary === false);
    
    const allOriginalTableIdsWithSplits = new Set(
      allTemporaryTableRows.map((t: any) => t.original_table_id).filter(Boolean)
    );
    if (allOriginalTableIdsWithSplits.size > 0) {
      console.log(`🔄 [AVAILABLE SLOTS] Mesas originales con divisiones activas: ${Array.from(allOriginalTableIdsWithSplits).join(', ')}`);
      console.log(`🔄 [AVAILABLE SLOTS] Mesas temporales activas: ${allTemporaryTableRows.map((t: any) => `${t.id} (${t.name}) [turno: ${t.shift_template_id}]`).join(', ')}`);
    }

    const groupTempTableToIndividuals = new Map<string, string[]>();
    const allGroupedIndividualTableIds = new Set<string>();
    allTemporaryTableRows.forEach((t: any) => {
      if (!t.grouped_table_ids) return;
      try {
        const ids = typeof t.grouped_table_ids === 'string' ? JSON.parse(t.grouped_table_ids) : t.grouped_table_ids;
        if (Array.isArray(ids) && ids.length > 0) {
          groupTempTableToIndividuals.set(t.id, ids);
          ids.forEach((id: string) => allGroupedIndividualTableIds.add(id));
        }
      } catch (e) {
        console.warn('[AVAILABLE SLOTS] Error parseando grouped_table_ids para mesa', t.id, e);
      }
    });
    if (allGroupedIndividualTableIds.size > 0) {
      console.log(`🔗 [AVAILABLE SLOTS] Mesas absorbidas por grupos temporales: ${Array.from(allGroupedIndividualTableIds).join(', ')}`);
    }

    const [yearParsed, monthParsed, dayParsed] = dateString.split('-').map(Number);
    const todayStart = new Date(yearParsed, monthParsed - 1, dayParsed, 0, 0, 0);
    const todayEnd = new Date(yearParsed, monthParsed - 1, dayParsed, 23, 59, 59);
    const blockedTablesResult = await ctx.db.query(
      `SELECT DISTINCT table_id, start_time, end_time FROM table_blocks 
       WHERE restaurant_id = $1 
       AND location_id = $2 
       AND start_time <= $3 
       AND end_time >= $4`,
      [input.restaurantId, input.locationId, todayEnd, todayStart]
    );
    const blockedTablesInfo = blockedTablesResult.rows.map((r: any) => ({
      tableId: r.table_id,
      startTime: new Date(r.start_time),
      endTime: new Date(r.end_time)
    }));
    console.log(`🔒 [AVAILABLE SLOTS] Mesas bloqueadas encontradas: ${blockedTablesInfo.length}`);

    const isTableBlockedAtTime = (tableId: string, slotHour: number, slotMinute: number): boolean => {
      const slotDateTime = new Date(yearParsed, monthParsed - 1, dayParsed, slotHour, slotMinute);
      return blockedTablesInfo.some(block => 
        block.tableId === tableId && 
        slotDateTime >= block.startTime && 
        slotDateTime < block.endTime
      );
    };

    const getTablesForShiftTemplate = (shiftTemplateId: string | undefined) => {
      const tempTablesForShift = shiftTemplateId 
        ? allTemporaryTableRows.filter((t: any) => t.shift_template_id === shiftTemplateId)
        : [];
      
      const originalIdsWithSplitsInShift = new Set(
        tempTablesForShift.map((t: any) => t.original_table_id).filter(Boolean)
      );

      const groupedIdsInShift = new Set<string>();
      tempTablesForShift.forEach((t: any) => {
        if (!t.grouped_table_ids) return;
        try {
          const ids = typeof t.grouped_table_ids === 'string' ? JSON.parse(t.grouped_table_ids) : t.grouped_table_ids;
          if (Array.isArray(ids)) ids.forEach((id: string) => groupedIdsInShift.add(id));
        } catch { /* ignore */ }
      });

      const filteredPermanent = permanentTableRows.filter((t: any) => {
        if (originalIdsWithSplitsInShift.has(t.id)) return false;
        if (groupedIdsInShift.has(t.id)) {
          console.log(`🔗 [AVAILABLE SLOTS] Mesa absorbida por grupo en turno ${shiftTemplateId}, excluida: ${t.id} (${t.name})`);
          return false;
        }
        return true;
      });

      return [...filteredPermanent, ...tempTablesForShift];
    };

    const tableGroupsResult = await ctx.db.query(
      `SELECT * FROM table_groups WHERE restaurant_id = $1 AND location_id = $2 AND
        (is_temporary IS NULL OR is_temporary = FALSE)`,
      [input.restaurantId, input.locationId]
    );
    const tableGroups = tableGroupsResult.rows;

    if (permanentTableRows.length === 0 && allTemporaryTableRows.length === 0 && tableGroups.length === 0) {
      console.log('⚠️ [AVAILABLE SLOTS] No hay mesas ni grupos configurados');
      return [];
    }

    const getCompatibleTablesForShift = (shiftTemplateId: string | undefined) => {
      const tablesForShift = getTablesForShiftTemplate(shiftTemplateId);
      return tablesForShift.filter((table: any) => {
        const meetsMinCapacity = input.guests >= table.min_capacity;
        const meetsMaxCapacity = input.ignoreMaxCapacity ? true : input.guests <= table.max_capacity;
        if (!meetsMinCapacity || !meetsMaxCapacity) return false;
        if (input.needsHighChair && !table.allows_high_chairs) return false;
        if (input.needsStroller && !table.allows_strollers) return false;
        if (input.hasPets && !table.allows_pets) return false;
        return true;
      }).sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
    };

    const compatibleGroups = tableGroups.filter((group: any) => {
      const meetsCapacity = input.guests >= group.min_capacity && input.guests <= group.max_capacity;
      if (!meetsCapacity) return false;
      const groupTableIds = Array.isArray(group.table_ids) ? group.table_ids : [];
      if (groupTableIds.length === 0) return false;
      return true;
    }).map((group: any) => ({
      ...group,
      isGroup: true,
      id: group.id,
      table_ids: Array.isArray(group.table_ids) ? group.table_ids : [],
    })).sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));

    // ─── Query para ocupación de mesas (SOLO esta ubicación) ─────────────────
    let reservationsLocationQuery = `SELECT r.*,
       COALESCE((
         SELECT MAX(t2.rotation_time_minutes)
         FROM tables t2
         WHERE t2.id = ANY(ARRAY(SELECT jsonb_array_elements_text(r.table_ids::jsonb)))
       ), 120) as rotation_time_minutes
       FROM reservations r
       WHERE r.restaurant_id = $1 
       AND r.location_id = $2 
       AND r.date::date = $3::date
       AND r.status != 'cancelled'`;
    
    const locationQueryParams: any[] = [input.restaurantId, input.locationId, dateString];
    
    if (input.excludeToken) {
      reservationsLocationQuery += ` AND r.confirmation_token != $4`;
      locationQueryParams.push(input.excludeToken);
      console.log(`🔍 [AVAILABLE SLOTS] Excluyendo reserva con token: ${input.excludeToken}`);
    }
    
    const reservationsLocationResult = await ctx.db.query(reservationsLocationQuery, locationQueryParams);

    const existingReservationsInLocation = reservationsLocationResult.rows.map((row: any) => {
      const rawTableIds: string[] = JSON.parse(row.table_ids || '[]');
      const expandedTableIds = [...rawTableIds];
      rawTableIds.forEach((tableId: string) => {
        const individuals = groupTempTableToIndividuals.get(tableId);
        if (individuals) {
          individuals.forEach((id: string) => {
            if (!expandedTableIds.includes(id)) expandedTableIds.push(id);
          });
          console.log(`🔗 [AVAILABLE SLOTS] Reserva en grupo temporal ${tableId}: expandiendo a mesas individuales: ${individuals.join(', ')}`);
        }
      });
      return {
        time: JSON.parse(row.time),
        guests: row.guests,
        tableIds: expandedTableIds,
        rotationTime: row.rotation_time_minutes || 120,
        highChairCount: row.high_chair_count || 0,
      };
    });

    // ─── Query para conteo de comensales (TODAS las ubicaciones) ─────────────
    // El límite maxGuestsPerHour aplica al restaurante completo, no por ubicación
    let reservationsAllQuery = `SELECT r.time, r.guests, r.high_chair_count FROM reservations r
       WHERE r.restaurant_id = $1 
       AND r.date::date = $2::date
       AND r.status != 'cancelled'`;
    
    const allQueryParams: any[] = [input.restaurantId, dateString];
    
    if (input.excludeToken) {
      reservationsAllQuery += ` AND r.confirmation_token != $3`;
      allQueryParams.push(input.excludeToken);
    }
    
    const reservationsAllResult = await ctx.db.query(reservationsAllQuery, allQueryParams);

    const existingReservationsAllLocations = reservationsAllResult.rows.map((row: any) => ({
      time: JSON.parse(row.time),
      guests: row.guests,
      highChairCount: row.high_chair_count || 0,
    }));

    console.log(`🌍 [AVAILABLE SLOTS] Reservas en todas las ubicaciones: ${existingReservationsAllLocations.length}, solo en esta ubicación: ${existingReservationsInLocation.length}`);

    const availableSlots: (TimeSlot & { isUnavailableDueToMinAdvance?: boolean; availableHighChairs?: number; isOverCapacity?: boolean; overBy?: number; currentGuests?: number; maxGuests?: number; isFullyBooked?: boolean })[] = [];
    const unavailableSlots: (TimeSlot & { isUnavailableDueToMinAdvance: boolean })[] = [];

    for (const shift of shifts) {
      const [startHour, startMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);
      const maxGuestsPerHour = shift.maxGuestsPerHour || 999;
      const minRating = parseFloat(shift.minRating) || 0;
      const minLocalRating = parseFloat(shift.minLocalRating) || 0;

      if (input.clientPhone) {
        if (clientGlobalRating < minRating) {
          console.log(`⚠️ [AVAILABLE SLOTS] ${startHour}:${startMinute} - Rechazado: valoración global ${clientGlobalRating} < mínima ${minRating}`);
          continue;
        }
        if (clientLocalRating < minLocalRating) {
          console.log(`⚠️ [AVAILABLE SLOTS] ${startHour}:${startMinute} - Rechazado: valoración local ${clientLocalRating} < mínima ${minLocalRating}`);
          continue;
        }
      }

      const shiftTemplateId = shift.templateId || undefined;
      const compatibleTables = getCompatibleTablesForShift(shiftTemplateId);
      console.log(`🔍 [AVAILABLE SLOTS] Turno ${shiftTemplateId}: ${compatibleTables.length} mesas compatibles (${compatibleTables.filter((t: any) => t.is_temporary).length} temporales)`);

      if (startHour === endHour && startMinute === endMinute) {
        const now = new Date();
        const [year, month, day] = dateString.split('-').map(Number);
        const slotDateTime = new Date(year, month - 1, day, startHour, startMinute);
        const minutesUntilSlot = Math.floor((slotDateTime.getTime() - now.getTime()) / (1000 * 60));
        
        const meetsMinAdvance = minutesUntilSlot >= minBookingAdvanceMinutes;
        
        if (meetsMinAdvance) {
          const occupiedTableIdsAtTime = new Set<string>();
          
          existingReservationsInLocation.forEach((res) => {
            const resTime = res.time.hour * 60 + res.time.minute;
            const slotTime = startHour * 60 + startMinute;
            const rotationMinutes = res.rotationTime;
            
            if (Math.abs(slotTime - resTime) < rotationMinutes) {
              res.tableIds.forEach((tableId: string) => occupiedTableIdsAtTime.add(tableId));
            }
          });

          const availableTablesForSlot = compatibleTables.filter(
            (table: any) => !occupiedTableIdsAtTime.has(table.id) && !isTableBlockedAtTime(table.id, startHour, startMinute)
          );

          const availableGroupsForSlot = compatibleGroups.filter((group: any) => {
            const groupTableIds = Array.isArray(group.table_ids) ? group.table_ids : [];
            return groupTableIds.every((tableId: string) => !occupiedTableIdsAtTime.has(tableId) && !isTableBlockedAtTime(tableId, startHour, startMinute));
          });

          const totalAvailableOptions = availableTablesForSlot.length + availableGroupsForSlot.length;

          const hasCompatibleTablesConfigured = compatibleTables.length > 0 || compatibleGroups.length > 0;
          let slotAdded = false;

          if (totalAvailableOptions > 0) {
            // Contar comensales de TODAS las ubicaciones para este horario exacto
            const guestsAtThisTime = existingReservationsAllLocations
              .filter((res) => res.time.hour === startHour && res.time.minute === startMinute)
              .reduce((sum, res) => sum + res.guests, 0);

            const totalGuestsAfterBooking = guestsAtThisTime + input.guests;
            console.log(`🔍 [AVAILABLE SLOTS] ${startHour}:${startMinute} - Comensales actuales (todas ubicaciones): ${guestsAtThisTime}, solicitados: ${input.guests}, total: ${totalGuestsAfterBooking}, límite: ${maxGuestsPerHour}`);
            
            if (input.needsHighChair && input.highChairCount && availableHighChairs > 0) {
              const highChairsInUse = existingReservationsInLocation
                .filter((res) => {
                  const resTime = res.time.hour * 60 + res.time.minute;
                  const slotTime = startHour * 60 + startMinute;
                  return Math.abs(slotTime - resTime) < highChairRotationMinutes;
                })
                .reduce((sum, res) => sum + (res.highChairCount || 0), 0);
              
              const availableHighChairsForSlot = availableHighChairs - highChairsInUse;
              console.log(`🔍 [AVAILABLE SLOTS] ${startHour}:${startMinute} - Tronas: ${highChairsInUse}/${availableHighChairs} en uso, disponibles: ${availableHighChairsForSlot}, solicitadas: ${input.highChairCount}`);
              
              if (input.highChairCount > availableHighChairsForSlot) {
                console.log(`⚠️ [AVAILABLE SLOTS] ${startHour}:${startMinute} - Rechazado: tronas insuficientes`);
              } else if (totalGuestsAfterBooking <= maxGuestsPerHour) {
                availableSlots.push({ hour: startHour, minute: startMinute, availableHighChairs: availableHighChairsForSlot });
                slotAdded = true;
              } else if (input.ignoreMaxCapacity) {
                const overBy = totalGuestsAfterBooking - maxGuestsPerHour;
                console.log(`⚠️ [AVAILABLE SLOTS] ${startHour}:${startMinute} - Sobre capacidad (ignoreMaxCapacity=true): excede por ${overBy}`);
                availableSlots.push({ hour: startHour, minute: startMinute, availableHighChairs: availableHighChairsForSlot, isOverCapacity: true, overBy, currentGuests: guestsAtThisTime, maxGuests: maxGuestsPerHour });
                slotAdded = true;
              } else {
                console.log(`⚠️ [AVAILABLE SLOTS] ${startHour}:${startMinute} - Rechazado: excede límite de ${maxGuestsPerHour} comensales por turno`);
              }
            } else {
              if (totalGuestsAfterBooking <= maxGuestsPerHour) {
                availableSlots.push({ hour: startHour, minute: startMinute, availableHighChairs: 0 });
                slotAdded = true;
              } else if (input.ignoreMaxCapacity) {
                const overBy = totalGuestsAfterBooking - maxGuestsPerHour;
                console.log(`⚠️ [AVAILABLE SLOTS] ${startHour}:${startMinute} - Sobre capacidad (ignoreMaxCapacity=true): excede por ${overBy}`);
                availableSlots.push({ hour: startHour, minute: startMinute, availableHighChairs: 0, isOverCapacity: true, overBy, currentGuests: guestsAtThisTime, maxGuests: maxGuestsPerHour });
                slotAdded = true;
              } else {
                console.log(`⚠️ [AVAILABLE SLOTS] ${startHour}:${startMinute} - Rechazado: excede límite de ${maxGuestsPerHour} comensales por turno`);
              }
            }
          }

          if (!slotAdded && hasCompatibleTablesConfigured && minutesUntilSlot >= 0) {
            console.log(`🔴 [AVAILABLE SLOTS] ${startHour}:${startMinute} - Sin disponibilidad pero existe configuración de mesas → lista de espera`);
            availableSlots.push({ hour: startHour, minute: startMinute, availableHighChairs: 0, isFullyBooked: true });
          }
        } else {
          const occupiedTableIdsAtTime = new Set<string>();
          
          existingReservationsInLocation.forEach((res) => {
            const resTime = res.time.hour * 60 + res.time.minute;
            const slotTime = startHour * 60 + startMinute;
            const rotationMinutes = res.rotationTime;
            
            if (Math.abs(slotTime - resTime) < rotationMinutes) {
              res.tableIds.forEach((tableId: string) => occupiedTableIdsAtTime.add(tableId));
            }
          });

          const availableTablesForSlot = compatibleTables.filter(
            (table: any) => !occupiedTableIdsAtTime.has(table.id) && !isTableBlockedAtTime(table.id, startHour, startMinute)
          );

          const availableGroupsForSlot = compatibleGroups.filter((group: any) => {
            const groupTableIds = Array.isArray(group.table_ids) ? group.table_ids : [];
            return groupTableIds.every((tableId: string) => !occupiedTableIdsAtTime.has(tableId) && !isTableBlockedAtTime(tableId, startHour, startMinute));
          });

          const totalAvailableOptions = availableTablesForSlot.length + availableGroupsForSlot.length;

          if (totalAvailableOptions > 0) {
            const guestsAtThisTime = existingReservationsAllLocations
              .filter((res) => res.time.hour === startHour && res.time.minute === startMinute)
              .reduce((sum, res) => sum + res.guests, 0);

            const totalGuestsAfterBooking = guestsAtThisTime + input.guests;
            
            if (totalGuestsAfterBooking <= maxGuestsPerHour && minutesUntilSlot >= 0) {
              unavailableSlots.push({ hour: startHour, minute: startMinute, isUnavailableDueToMinAdvance: true });
              console.log(`⏰ [AVAILABLE SLOTS] ${startHour}:${startMinute} - No disponible por tiempo mínimo pero tiene mesas libres`);
            }
          }
        }
        continue;
      }

      let currentHour = startHour;
      let currentMinute = startMinute;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMinute < endMinute)
      ) {
        const now = new Date();
        const [year, month, day] = dateString.split('-').map(Number);
        const slotDateTime = new Date(year, month - 1, day, currentHour, currentMinute);
        const minutesUntilSlot = Math.floor((slotDateTime.getTime() - now.getTime()) / (1000 * 60));
        
        const meetsMinAdvance = minutesUntilSlot >= minBookingAdvanceMinutes;

        const occupiedTableIdsAtTime = new Set<string>();
        
        existingReservationsInLocation.forEach((res) => {
          const resTime = res.time.hour * 60 + res.time.minute;
          const slotTime = currentHour * 60 + currentMinute;
          const rotationMinutes = res.rotationTime;
          
          if (Math.abs(slotTime - resTime) < rotationMinutes) {
            res.tableIds.forEach((tableId: string) => occupiedTableIdsAtTime.add(tableId));
          }
        });

        const availableTablesForSlot = compatibleTables.filter(
          (table: any) => !occupiedTableIdsAtTime.has(table.id) && !isTableBlockedAtTime(table.id, currentHour, currentMinute)
        );

        const availableGroupsForSlot = compatibleGroups.filter((group: any) => {
          const groupTableIds = Array.isArray(group.table_ids) ? group.table_ids : [];
          return groupTableIds.every((tableId: string) => !occupiedTableIdsAtTime.has(tableId) && !isTableBlockedAtTime(tableId, currentHour, currentMinute));
        });

        const totalAvailableOptions = availableTablesForSlot.length + availableGroupsForSlot.length;

        let highChairsAvailable = true;
        if (input.needsHighChair && input.highChairCount && input.highChairCount > 0) {
          const usedHighChairs = existingReservationsInLocation
            .filter((res) => {
              const resTime = res.time.hour * 60 + res.time.minute;
              const slotTime = currentHour * 60 + currentMinute;
              return Math.abs(slotTime - resTime) < highChairRotationMinutes;
            })
            .reduce((sum, res) => sum + res.highChairCount, 0);
          
          highChairsAvailable = (usedHighChairs + input.highChairCount) <= availableHighChairs;
        }

        const hasCompatibleTablesConfiguredForRange = compatibleTables.length > 0 || compatibleGroups.length > 0;
        let rangeSlotAdded = false;

        if (totalAvailableOptions > 0 && highChairsAvailable) {
          // Contar comensales de TODAS las ubicaciones para este horario
          const guestsAtThisTime = existingReservationsAllLocations
            .filter((res) => res.time.hour === currentHour && res.time.minute === currentMinute)
            .reduce((sum, res) => sum + res.guests, 0);

          const totalGuestsAfterBooking = guestsAtThisTime + input.guests;

          if (totalGuestsAfterBooking <= maxGuestsPerHour) {
            if (meetsMinAdvance) {
              availableSlots.push({ hour: currentHour, minute: currentMinute });
              rangeSlotAdded = true;
            } else if (minutesUntilSlot >= 0) {
              unavailableSlots.push({ hour: currentHour, minute: currentMinute, isUnavailableDueToMinAdvance: true });
              console.log(`⏰ [AVAILABLE SLOTS] ${currentHour}:${currentMinute} - No disponible por tiempo mínimo pero tiene mesas libres`);
              rangeSlotAdded = true;
            }
          } else if (input.ignoreMaxCapacity) {
            const overBy = totalGuestsAfterBooking - maxGuestsPerHour;
            console.log(`⚠️ [AVAILABLE SLOTS] ${currentHour}:${currentMinute} - Sobre capacidad (ignoreMaxCapacity=true): excede por ${overBy}`);
            if (meetsMinAdvance) {
              availableSlots.push({ hour: currentHour, minute: currentMinute, isOverCapacity: true, overBy, currentGuests: guestsAtThisTime, maxGuests: maxGuestsPerHour });
              rangeSlotAdded = true;
            } else if (minutesUntilSlot >= 0) {
              unavailableSlots.push({ hour: currentHour, minute: currentMinute, isUnavailableDueToMinAdvance: true });
              rangeSlotAdded = true;
            }
          } else {
            console.log(`⚠️ [AVAILABLE SLOTS] ${currentHour}:${currentMinute} - Rechazado: excede límite de ${maxGuestsPerHour} comensales (todas ubicaciones: ${guestsAtThisTime})`);
          }
        }

        if (!rangeSlotAdded && meetsMinAdvance && hasCompatibleTablesConfiguredForRange && minutesUntilSlot >= 0) {
          console.log(`🔴 [AVAILABLE SLOTS] ${currentHour}:${currentMinute} - Sin disponibilidad pero hay mesas configuradas → lista de espera`);
          availableSlots.push({ hour: currentHour, minute: currentMinute, isFullyBooked: true });
        }

        currentMinute += 30;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour += 1;
        }
      }
    }

      const responseWithHighChairInfo: any[] = availableSlots.map(slot => {
        if (availableHighChairs > 0) {
          const highChairsInUse = existingReservationsInLocation
            .filter((res) => {
              const resTime = res.time.hour * 60 + res.time.minute;
              const slotTime = slot.hour * 60 + slot.minute;
              return Math.abs(slotTime - resTime) < highChairRotationMinutes;
            })
            .reduce((sum, res) => sum + (res.highChairCount || 0), 0);
          
          const availableHighChairsForSlot = availableHighChairs - highChairsInUse;
          return {
            ...slot,
            availableHighChairs: availableHighChairsForSlot
          };
        }
        return slot;
      });

      const allSlotsRaw = [...responseWithHighChairInfo, ...unavailableSlots];
      
      const seenSlotKeys = new Set<string>();
      const allSlots = allSlotsRaw.filter(slot => {
        const key = `${slot.hour}:${slot.minute}:${(slot as any).isUnavailableDueToMinAdvance ? '1' : '0'}:${(slot as any).isFullyBooked ? 'fb' : ''}`;
        if (seenSlotKeys.has(key)) {
          console.log(`⚠️ [AVAILABLE SLOTS] Slot duplicado eliminado: ${slot.hour}:${slot.minute}`);
          return false;
        }
        seenSlotKeys.add(key);
        return true;
      });

      // Si existe el mismo slot como disponible Y como fully booked, eliminar el fully booked
      const availableSlotKeys = new Set(availableSlots.filter(s => !(s as any).isFullyBooked).map(s => `${s.hour}:${s.minute}`));
      const unavailableSlotKeys = new Set(unavailableSlots.map(s => `${s.hour}:${s.minute}`));
      const finalSlots = allSlots.filter(slot => {
        if ((slot as any).isFullyBooked) {
          const key = `${slot.hour}:${slot.minute}`;
          if (availableSlotKeys.has(key) || unavailableSlotKeys.has(key)) {
            console.log(`⚠️ [AVAILABLE SLOTS] Slot fully-booked eliminado por duplicado con disponible: ${key}`);
            return false;
          }
        }
        return true;
      });

      finalSlots.sort((a, b) => {
        const aTime = a.hour * 60 + a.minute;
        const bTime = b.hour * 60 + b.minute;
        return aTime - bTime;
      });
      
      const fullyBookedCount = finalSlots.filter(s => (s as any).isFullyBooked).length;
      console.log(`✅ [AVAILABLE SLOTS] Horarios disponibles: ${availableSlots.filter(s => !(s as any).isFullyBooked).length}`);
      console.log(`🔴 [AVAILABLE SLOTS] Horarios completos (lista espera): ${fullyBookedCount}`);
      console.log(`⏰ [AVAILABLE SLOTS] Horarios no disponibles por tiempo mínimo: ${unavailableSlots.length}`);
      console.log(`📋 [AVAILABLE SLOTS] Total horarios retornados (ordenados): ${finalSlots.length}`);
      
      return finalSlots;
    } catch (error: any) {
      console.error('❌ [AVAILABLE SLOTS] Error completo:', error);
      console.error('❌ [AVAILABLE SLOTS] Stack trace:', error.stack);
      console.error('❌ [AVAILABLE SLOTS] Detalles:', {
        message: error.message,
        input: input,
      });
      throw error;
    }
  });
