import { publicProcedure } from '../../../create-context';

export const cuisineTypesDiagnosticsProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [CUISINE DIAGNOSTICS] Ejecutando diagnóstico...');

    const cuisineTypesResult = await ctx.db.query(`
      SELECT id, name, created_at FROM cuisine_types ORDER BY name ASC
    `);

    const restaurantsResult = await ctx.db.query(`
      SELECT id, name, cuisine_type FROM restaurants WHERE cuisine_type IS NOT NULL AND cuisine_type != '[]' AND cuisine_type != 'null'
    `);

    const provinceAssignResult = await ctx.db.query(`
      SELECT ct.id, ct.name, p.id as province_id, p.name as province_name
      FROM cuisine_types ct
      LEFT JOIN province_cuisine_types pct ON ct.id = pct.cuisine_type_id
      LEFT JOIN provinces p ON pct.province_id = p.id
      ORDER BY ct.name ASC
    `);

    const cuisineTypes = cuisineTypesResult.rows.map((row: any) => ({
      id: row.id as string,
      name: row.name as string,
      createdAt: row.created_at as string,
    }));

    const restaurantCuisineCounts: Record<string, { count: number; restaurants: string[] }> = {};
    for (const row of restaurantsResult.rows) {
      let types: string[] = [];
      try {
        types = row.cuisine_type ? JSON.parse(row.cuisine_type) : [];
      } catch {
        types = [];
      }
      for (const ct of types) {
        const cleanCt = ct.replace(/^cuisine-/, '').toLowerCase();
        if (!restaurantCuisineCounts[cleanCt]) {
          restaurantCuisineCounts[cleanCt] = { count: 0, restaurants: [] };
        }
        restaurantCuisineCounts[cleanCt].count++;
        restaurantCuisineCounts[cleanCt].restaurants.push(row.name as string);
      }
    }

    const provinceMap: Record<string, string[]> = {};
    for (const row of provinceAssignResult.rows) {
      if (!provinceMap[row.id as string]) {
        provinceMap[row.id as string] = [];
      }
      if (row.province_id) {
        provinceMap[row.id as string].push(row.province_name as string);
      }
    }

    const nameGroups: Record<string, string[]> = {};
    for (const ct of cuisineTypes) {
      const normalizedName = ct.name.toLowerCase().trim();
      if (!nameGroups[normalizedName]) {
        nameGroups[normalizedName] = [];
      }
      nameGroups[normalizedName].push(ct.id);
    }

    const duplicates = Object.entries(nameGroups)
      .filter(([, ids]) => ids.length > 1)
      .map(([name, ids]) => ({ name, ids }));

    const restaurantDetails = restaurantsResult.rows.map((row: any) => {
      let types: string[] = [];
      try {
        types = row.cuisine_type ? JSON.parse(row.cuisine_type) : [];
      } catch {
        types = [];
      }
      return {
        id: row.id as string,
        name: row.name as string,
        cuisineTypeIds: types,
      };
    });

    const enriched = cuisineTypes.map(ct => {
      const cleanId = ct.id.replace(/^cuisine-/, '').toLowerCase();
      const stats = restaurantCuisineCounts[cleanId] || { count: 0, restaurants: [] };
      const assignedProvinces = provinceMap[ct.id] || [];
      const isDuplicate = nameGroups[ct.name.toLowerCase().trim()]?.length > 1;
      return {
        ...ct,
        restaurantCount: stats.count,
        restaurantNames: stats.restaurants,
        assignedProvinces,
        isDuplicate,
      };
    });

    console.log(`✅ [CUISINE DIAGNOSTICS] ${cuisineTypes.length} tipos, ${duplicates.length} duplicados detectados`);

    return {
      cuisineTypes: enriched,
      duplicates,
      restaurants: restaurantDetails,
      summary: {
        totalTypes: cuisineTypes.length,
        duplicateGroups: duplicates.length,
        typesWithRestaurants: enriched.filter(ct => ct.restaurantCount > 0).length,
        typesWithoutProvinces: enriched.filter(ct => ct.assignedProvinces.length === 0).length,
      },
    };
  });
