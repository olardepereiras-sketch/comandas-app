import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { TableLocation } from '@/types';
import { getAbsoluteImageUrl } from '../../../../utils/imageUrl';

export const listTableLocationsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
    })
  )
  .query(async ({ input, ctx }): Promise<TableLocation[]> => {
    console.log('Obteniendo ubicaciones para restaurante:', input.restaurantId);
    
    const result = await ctx.db.query(
      'SELECT * FROM table_locations WHERE restaurant_id = $1 ORDER BY order_num',
      [input.restaurantId]
    );

    const locations = result.rows.map((row: any) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      imageUrl: getAbsoluteImageUrl(row.image_url),
      order: row.order,
      createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    }));

    console.log('Ubicaciones encontradas:', locations.length);
    
    return locations as TableLocation[];
  });
