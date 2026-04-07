import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { Province } from '@/types';

export const createProvinceProcedure = publicProcedure
  .input(
    z.object({
      name: z.string().min(1, 'El nombre es requerido'),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE PROVINCE] ========== INICIO ==========');
    console.log('🔵 [CREATE PROVINCE] Input recibido:', JSON.stringify(input, null, 2));
    console.log('🔵 [CREATE PROVINCE] Input.name:', input.name);
    console.log('🔵 [CREATE PROVINCE] Input.name type:', typeof input.name);
    
    if (!input || !input.name) {
      console.error('❌ [CREATE PROVINCE] Input inválido:', input);
      throw new Error('El nombre es requerido');
    }
    
    const id = `prov-${Date.now()}`;
    const createdAt = new Date().toISOString();

    console.log('🔵 [CREATE PROVINCE] Ejecutando INSERT en PostgreSQL...');
    console.log('🔵 [CREATE PROVINCE] SQL:', 'INSERT INTO provinces (id, name, created_at) VALUES ($1, $2, $3)');
    console.log('🔵 [CREATE PROVINCE] Args:', [id, input.name, createdAt]);
    
    try {
      const result = await ctx.db.query(
        'INSERT INTO provinces (id, name, created_at) VALUES ($1, $2, $3)',
        [id, input.name, createdAt]
      );
      
      console.log('✅ [CREATE PROVINCE] INSERT exitoso. Rows affected:', result.rowCount);
    } catch (error: any) {
      console.error('❌ [CREATE PROVINCE] Error en INSERT:', error);
      console.error('❌ [CREATE PROVINCE] Error message:', error.message);
      console.error('❌ [CREATE PROVINCE] Error stack:', error.stack);
      throw error;
    }

    const newProvince: Province = {
      id,
      name: input.name,
      createdAt,
    };
    
    console.log('✅ [CREATE PROVINCE] Provincia creada y retornada:', newProvince);
    console.log('🔵 [CREATE PROVINCE] ========== FIN ==========');
    
    return newProvince;
  });
