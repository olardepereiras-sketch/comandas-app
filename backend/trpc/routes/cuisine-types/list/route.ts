import { publicProcedure } from '../../../create-context';

export const listCuisineTypesProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [LIST CUISINE TYPES] Listando tipos de cocina');

    const result = await ctx.db.query(`
      SELECT * FROM cuisine_types 
      ORDER BY name ASC
    `);

    const cuisineTypes = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    }));

    console.log(`✅ [LIST CUISINE TYPES] ${cuisineTypes.length} tipos encontrados`);

    return cuisineTypes;
  });
