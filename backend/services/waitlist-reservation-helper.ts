import { Pool } from 'pg';
import { getUnavailableTableIdsForSlot } from './table-availability';

interface DbInterface {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number | null }>;
}

export interface WaitlistEntryData {
  id?: string;
  client_phone: string;
  client_name: string;
  date: string;
  guests: number;
  location_id?: string | null;
  needs_high_chair?: boolean;
  high_chair_count?: number;
  needs_stroller?: boolean;
  has_pets?: boolean;
  notes?: string;
  preferred_time?: string | null;
}

export async function createPendingReservationForWaitlist(
  db: DbInterface | Pool,
  restaurantId: string,
  wlEntry: WaitlistEntryData
): Promise<{ confirmUrl: string; confirmationToken: string } | null> {
  try {
    const dbQuery = (text: string, params?: any[]) => {
      if (typeof (db as any).query === 'function') {
        return (db as any).query(text, params);
      }
      return (db as Pool).query(text, params);
    };

    const dateStr = typeof wlEntry.date === 'string' ? wlEntry.date.split('T')[0] : String(wlEntry.date);

    console.log(`[WAITLIST HELPER] Creando reserva pendiente para ${wlEntry.client_phone} fecha=${dateStr}`);

    const existingPending = await dbQuery(
      `SELECT id, confirmation_token FROM reservations
       WHERE restaurant_id = $1 AND client_phone = $2 AND date::text LIKE $3
         AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [restaurantId, wlEntry.client_phone, `${dateStr}%`]
    );

    if (existingPending.rows.length > 0) {
      const existingToken = existingPending.rows[0].confirmation_token as string;
      const confirmUrl = `https://quieromesa.com/client/reservation/${existingToken}`;
      console.log(`[WAITLIST HELPER] Reserva pendiente ya existe: ${existingPending.rows[0].id as string}`);
      return { confirmUrl, confirmationToken: existingToken };
    }

    const clientResult = await dbQuery(
      'SELECT id FROM clients WHERE phone = $1',
      [wlEntry.client_phone]
    );

    let clientId: string;
    const isNewClient = clientResult.rows.length === 0;
    if (isNewClient) {
      clientId = `client-wl-${Date.now()}`;
      await dbQuery(
        `INSERT INTO clients (id, name, phone, email, rating, total_ratings, user_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name`,
        [clientId, wlEntry.client_name, wlEntry.client_phone, 'sin-email@example.com', 4, 0, 'user_new', new Date(), new Date()]
      );
    } else {
      clientId = clientResult.rows[0].id as string;
    }

    let reservationTime: { hour: number; minute: number };
    if (wlEntry.preferred_time) {
      const parts = (wlEntry.preferred_time as string).split(':').map(Number);
      reservationTime = { hour: parts[0] || 21, minute: parts[1] || 0 };
    } else {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeek = dateObj.getDay();

      let shifts: any[] = [];
      const excResult = await dbQuery(
        'SELECT template_ids FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
        [restaurantId, dateStr]
      );
      if (excResult.rows.length > 0) {
        const parsed = typeof excResult.rows[0].template_ids === 'string'
          ? JSON.parse(excResult.rows[0].template_ids)
          : excResult.rows[0].template_ids;
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'startTime' in parsed[0]) {
          shifts = parsed;
        }
      }
      if (shifts.length === 0) {
        const schResult = await dbQuery(
          'SELECT shifts FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2 AND is_open = true',
          [restaurantId, dayOfWeek]
        );
        if (schResult.rows.length > 0) {
          shifts = JSON.parse(schResult.rows[0].shifts || '[]');
        }
      }
      if (shifts.length > 0) {
        const firstShift = shifts[0];
        const [h, min] = ((firstShift.startTime as string) || '21:00').split(':').map(Number);
        reservationTime = { hour: h || 21, minute: min || 0 };
      } else {
        reservationTime = { hour: 21, minute: 0 };
      }
    }

    let tablesQuery = `SELECT * FROM tables WHERE restaurant_id = $1
      AND (is_temporary IS NOT TRUE)
      AND min_capacity <= $2 AND max_capacity >= $2`;
    const tablesParams: any[] = [restaurantId, wlEntry.guests];

    if (wlEntry.location_id) {
      tablesQuery += ' AND location_id = $3';
      tablesParams.push(wlEntry.location_id);
    }
    tablesQuery += ' ORDER BY priority DESC';

    const tablesResult = await dbQuery(tablesQuery, tablesParams);

    const slotTime = reservationTime.hour * 60 + reservationTime.minute;
    const unavailableTables = await getUnavailableTableIdsForSlot({
      db: { query: dbQuery },
      restaurantId,
      date: dateStr,
      slotTimeMinutes: slotTime,
      locationId: wlEntry.location_id ?? null,
    });

    let assignedTableIds: string[] = [];
    for (const table of tablesResult.rows) {
      const tableId = table.id as string;
      const isOccupied = unavailableTables.occupiedTableIds.has(tableId);
      const isBlocked = unavailableTables.blockedTableIds.has(tableId);
      if (!isOccupied && !isBlocked) {
        assignedTableIds = [tableId];
        break;
      }
      console.log('[WAITLIST HELPER] Mesa descartada:', tableId, { isOccupied, isBlocked });
    }

    if (assignedTableIds.length === 0) {
      console.log('[WAITLIST HELPER] No hay mesa disponible para crear reserva pendiente');
      return null;
    }

    const locationResult = await dbQuery(
      'SELECT name FROM table_locations WHERE id = $1',
      [wlEntry.location_id]
    );
    const locationName = (locationResult.rows[0]?.name as string) || 'Comedor';

    const reservationId = `res-wl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const confirmationToken = `wl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const confirmationToken2 = `wl2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await dbQuery(
      `INSERT INTO reservations (id, restaurant_id, client_id, client_phone, client_name, client_email,
          date, time, guests, location_id, location_name, table_ids, needs_high_chair, high_chair_count,
          needs_stroller, has_pets, status, notes, client_notes, confirmation_token, confirmation_token2, token,
          pending_expires_at, is_new_client, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending', $17, $17, $18, $19, $20,
          (NOW() AT TIME ZONE 'UTC') + INTERVAL '35 minutes', $21, NOW(), NOW())`,
      [
        reservationId,
        restaurantId,
        clientId,
        wlEntry.client_phone,
        wlEntry.client_name,
        'sin-email@example.com',
        dateStr,
        JSON.stringify(reservationTime),
        wlEntry.guests,
        wlEntry.location_id || '',
        locationName,
        JSON.stringify(assignedTableIds),
        wlEntry.needs_high_chair || false,
        wlEntry.high_chair_count || 0,
        wlEntry.needs_stroller || false,
        wlEntry.has_pets || false,
        wlEntry.notes || '',
        confirmationToken,
        confirmationToken2,
        confirmationToken,
        isNewClient,
      ]
    );

    const confirmUrl = `https://quieromesa.com/client/reservation/${confirmationToken}`;
    console.log(`[WAITLIST HELPER] ✅ Reserva pendiente creada: ${reservationId}, mesa: ${assignedTableIds[0]}, hora: ${reservationTime.hour}:${String(reservationTime.minute).padStart(2,'0')}`);
    return { confirmUrl, confirmationToken };
  } catch (error: any) {
    console.error('[WAITLIST HELPER] ❌ Error creando reserva pendiente:', error.message);
    return null;
  }
}
