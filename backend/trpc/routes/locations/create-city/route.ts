import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { City } from '@/types';

export const createCityProcedure = publicProcedure
  .input(
    z.object({
      name: z.string().min(1, 'El nombre es requerido'),
      provinceId: z.string().min(1, 'La provincia es requerida'),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE CITY] Iniciando creación de ciudad:', input);
    
    const id = `city-${Date.now()}`;
    const createdAt = new Date().toISOString();

    console.log('🔵 [CREATE CITY] Ejecutando INSERT en Turso...');
    console.log('🔵 [CREATE CITY] SQL:', 'INSERT INTO cities (id, name, province_id, created_at) VALUES (?, ?, ?, ?)');
    console.log('🔵 [CREATE CITY] Args:', [id, input.name, input.provinceId, createdAt]);
    
    try {
      const result = await ctx.db.query(
        'INSERT INTO cities (id, name, province_id, created_at) VALUES ($1, $2, $3, $4)',
        [id, input.name, input.provinceId, createdAt]
      );
      
      console.log('✅ [CREATE CITY] INSERT exitoso. Rows affected:', result.rowCount);
    } catch (error: any) {
      console.error('❌ [CREATE CITY] Error en INSERT:', error);
      console.error('❌ [CREATE CITY] Error message:', error.message);
      console.error('❌ [CREATE CITY] Error stack:', error.stack);
      throw error;
    }

    const newCity: City = {
      id,
      name: input.name,
      provinceId: input.provinceId,
      createdAt,
    };
    
    console.log('✅ [CREATE CITY] Ciudad creada y retornada:', newCity);
    
    return newCity;
  });
