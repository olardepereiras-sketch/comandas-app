import { publicProcedure } from '../../context';
import { z } from 'zod';

export const getFloorPlanProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
    locationId: z.string(),
  }))
  .query(async ({ input, ctx }) => {
    console.log('🔵 [COMANDAS] Get floor plan - restaurantId:', input.restaurantId, 'locationId:', input.locationId);

    const result = await ctx.db.query(
      `SELECT * FROM comanda_floor_plans
       WHERE restaurant_id = $1 AND location_id = $2`,
      [input.restaurantId, input.locationId]
    );

    if (!result.rows[0]) {
      return {
        restaurantId: input.restaurantId,
        locationId: input.locationId,
        planData: [],
        updatedAt: new Date().toISOString(),
      };
    }

    const row = result.rows[0];
    let planData = [];
    try {
      const raw = row.plan_data;
      planData = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
    } catch {
      planData = [];
    }

    return {
      restaurantId: String(row.restaurant_id),
      locationId: String(row.location_id),
      planData,
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  });
