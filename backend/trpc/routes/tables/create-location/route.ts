import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { TableLocation } from '@/types';

export const createTableLocationProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string().min(1, 'El restaurante es requerido'),
      name: z.string().min(1, 'El nombre es requerido'),
      imageUrl: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE TABLE LOCATION] Iniciando creación de ubicación:', input);
    
    const countResult = await ctx.db.query(
      'SELECT COUNT(*) as count FROM table_locations WHERE restaurant_id = $1',
      [input.restaurantId]
    );
    
    const count = parseInt(countResult.rows[0].count) || 0;
    const id = 'loc-' + Date.now();
    const slug = input.name.toLowerCase().replace(/\s+/g, '-');
    const createdAt = new Date();

    console.log('🔵 [CREATE TABLE LOCATION] Ejecutando INSERT en PostgreSQL...');
    
    try {
      const result = await ctx.db.query(
        'INSERT INTO table_locations (id, restaurant_id, name, slug, order_num, created_at, is_active, image_url) VALUES ($1::text, $2::text, $3::text, $4::text, $5, $6, $7, $8::text)',
        [id, input.restaurantId, input.name, slug, count + 1, createdAt, true, input.imageUrl || null]
      );
      
      console.log('✅ [CREATE TABLE LOCATION] INSERT exitoso. Rows affected:', result.rowCount);
    } catch (error: any) {
      console.error('❌ [CREATE TABLE LOCATION] Error en INSERT:', error);
      throw error;
    }

    const newLocation: TableLocation = {
      id,
      restaurantId: input.restaurantId,
      name: input.name,
      order: count + 1,
      createdAt: createdAt.toISOString(),
    };
    
    console.log('✅ [CREATE TABLE LOCATION] Ubicación creada y retornada:', newLocation);
    
    return newLocation;
  });
