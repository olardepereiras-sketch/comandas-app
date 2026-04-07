import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

const OVERLAP_MINUTES = 120;

export const checkClientOverlapsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [CLIENT OVERLAPS] Verificando solapamientos para:', input);

    const dateOnly = input.date.includes('T') ? input.date.split('T')[0] : input.date;

    const myResResult = await ctx.db.query(
      `SELECT id, client_phone, time FROM reservations
       WHERE restaurant_id = $1
       AND date::date = $2::date
       AND status NOT IN ('cancelled', 'modified')`,
      [input.restaurantId, dateOnly]
    );

    if (myResResult.rows.length === 0) {
      console.log('✅ [CLIENT OVERLAPS] Sin reservas, nada que verificar');
      return {};
    }

    const phones = [
      ...new Set(
        myResResult.rows
          .map((r: any) => r.client_phone as string)
          .filter(Boolean)
      ),
    ];

    if (phones.length === 0) {
      return {};
    }

    const allResResult = await ctx.db.query(
      `SELECT r.id, r.client_phone, r.time, r.restaurant_id, rest.name as restaurant_name
       FROM reservations r
       JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE r.client_phone = ANY($1::text[])
       AND r.date::date = $2::date
       AND r.status NOT IN ('cancelled', 'modified')`,
      [phones, dateOnly]
    );

    const overlapMap: Record<
      string,
      { hasSameRestaurant: boolean; hasDifferentRestaurant: boolean; details: string[] }
    > = {};

    for (const myRes of myResResult.rows as any[]) {
      const myTime =
        typeof myRes.time === 'string' ? JSON.parse(myRes.time) : myRes.time;
      const myTimeMin = (myTime?.hour ?? 0) * 60 + (myTime?.minute ?? 0);

      for (const otherRes of allResResult.rows as any[]) {
        if (otherRes.id === myRes.id) continue;
        if (otherRes.client_phone !== myRes.client_phone) continue;

        const otherTime =
          typeof otherRes.time === 'string'
            ? JSON.parse(otherRes.time)
            : otherRes.time;
        const otherTimeMin = (otherTime?.hour ?? 0) * 60 + (otherTime?.minute ?? 0);

        if (Math.abs(myTimeMin - otherTimeMin) < OVERLAP_MINUTES) {
          if (!overlapMap[myRes.id as string]) {
            overlapMap[myRes.id as string] = {
              hasSameRestaurant: false,
              hasDifferentRestaurant: false,
              details: [],
            };
          }

          const isSame = (otherRes.restaurant_id as string) === input.restaurantId;
          if (isSame) {
            overlapMap[myRes.id as string].hasSameRestaurant = true;
          } else {
            overlapMap[myRes.id as string].hasDifferentRestaurant = true;
          }

          const h = String(otherTime?.hour ?? 0).padStart(2, '0');
          const m = String(otherTime?.minute ?? 0).padStart(2, '0');
          const detail = isSame
            ? `Otra reserva en este restaurante a las ${h}:${m}`
            : `Reserva en otro restaurante a las ${h}:${m}`;

          if (!overlapMap[myRes.id as string].details.includes(detail)) {
            overlapMap[myRes.id as string].details.push(detail);
          }
        }
      }
    }

    console.log(
      `✅ [CLIENT OVERLAPS] ${Object.keys(overlapMap).length} reservas con solapamientos detectados`
    );
    return overlapMap;
  });
