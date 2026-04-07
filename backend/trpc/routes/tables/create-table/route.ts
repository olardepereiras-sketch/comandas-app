import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { Table } from '@/types';

export const createTableProcedure = publicProcedure
  .input(
    z.object({
      locationId: z.string().min(1, 'La ubicación es requerida'),
      restaurantId: z.string().min(1, 'El restaurante es requerido'),
      name: z.string().min(1, 'El nombre es requerido'),
      minCapacity: z.number().min(1),
      maxCapacity: z.number().min(1),
      allowsHighChairs: z.boolean(),
      allowsStrollers: z.boolean(),
      allowsPets: z.boolean(),
      priority: z.number().min(1).max(9).default(5),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE TABLE] Iniciando creación de mesa:', input);
    
    const countResult = await ctx.db.query(
      'SELECT COUNT(*) as count FROM tables WHERE location_id = $1',
      [input.locationId]
    );
    
    const count = parseInt(countResult.rows[0].count) || 0;
    const id = `table-${Date.now()}`;
    const createdAt = new Date();

    console.log('🔵 [CREATE TABLE] Ejecutando INSERT en PostgreSQL...');
    
    try {
      const result = await ctx.db.query(
        `INSERT INTO tables (id, location_id, restaurant_id, name, min_capacity, max_capacity, 
         allows_high_chairs, allows_strollers, allows_pets, priority, order_num, created_at, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          id,
          input.locationId,
          input.restaurantId,
          input.name,
          input.minCapacity,
          input.maxCapacity,
          input.allowsHighChairs,
          input.allowsStrollers,
          input.allowsPets,
          input.priority,
          count + 1,
          createdAt,
          true,
        ]
      );
      
      console.log('✅ [CREATE TABLE] INSERT exitoso. Rows affected:', result.rowCount);
    } catch (error: any) {
      console.error('❌ [CREATE TABLE] Error en INSERT:', error);
      throw error;
    }

    const newTable: Table = {
      id,
      locationId: input.locationId,
      restaurantId: input.restaurantId,
      name: input.name,
      minCapacity: input.minCapacity,
      maxCapacity: input.maxCapacity,
      allowsHighChairs: input.allowsHighChairs,
      allowsStrollers: input.allowsStrollers,
      allowsPets: input.allowsPets,
      priority: input.priority,
      order: count + 1,
      createdAt: createdAt.toISOString(),
    };
    
    console.log('✅ [CREATE TABLE] Mesa creada y retornada:', newTable);
    
    return newTable;
  });
