import { publicProcedure } from '../../../create-context';
import type { Province, City } from '@/types';
import { z } from 'zod';

export const listProvincesProcedure = publicProcedure.query(async ({ ctx }) => {
  console.log('📦 [LIST PROVINCES] Ejecutando query SELECT * FROM provinces...');
  
  const result = await ctx.db.query('SELECT * FROM provinces ORDER BY name');
  
  console.log(`✅ [LIST PROVINCES] Query exitosa. Rows: ${result.rows.length}`);
  console.log(`📋 [LIST PROVINCES] Data:`, JSON.stringify(result.rows, null, 2));
  
  const provinces = result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at || new Date().toISOString(),
  })) as Province[];
  
  console.log(`📤 [LIST PROVINCES] Retornando ${provinces.length} provincias`);
  
  return provinces;
});

export const listCitiesProcedure = publicProcedure
  .input(z.object({ provinceId: z.string().optional() }).optional())
  .query(async ({ ctx, input }) => {
    let sql = 'SELECT * FROM cities';
    const params: any[] = [];

    if (input?.provinceId) {
      sql += ' WHERE province_id = $1';
      params.push(input.provinceId);
    }

    sql += ' ORDER BY name';

    const result = await ctx.db.query(sql, params);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      provinceId: row.province_id,
      createdAt: row.created_at || new Date().toISOString(),
    })) as City[];
  });
