import { publicProcedure } from '../../context';
import { z } from 'zod';

const TablePositionSchema = z.object({
  tableId: z.string(),
  tableName: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  shape: z.enum(['rectangle', 'circle']).default('rectangle'),
});

export const saveFloorPlanProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
    locationId: z.string(),
    planData: z.array(TablePositionSchema),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🟢 [COMANDAS] Guardar floor plan - restaurantId:', input.restaurantId);

    await ctx.db.query(
      `INSERT INTO comanda_floor_plans (restaurant_id, location_id, plan_data, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (restaurant_id, location_id)
       DO UPDATE SET plan_data = $3, updated_at = NOW()`,
      [input.restaurantId, input.locationId, JSON.stringify(input.planData)]
    );

    return {
      restaurantId: input.restaurantId,
      locationId: input.locationId,
      planData: input.planData,
      updatedAt: new Date().toISOString(),
    };
  });
