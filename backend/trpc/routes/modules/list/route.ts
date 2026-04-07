import { publicProcedure } from '../../../create-context';

export const listModulesProcedure = publicProcedure.query(async ({ ctx }) => {
  console.log('🔵 [LIST MODULES] Obteniendo módulos');

  try {
    await ctx.db.query(
      `INSERT INTO modules (id, name, description, icon, color, route, display_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        'game-chef',
        'El Juego del Chef',
        'Juego interactivo para clientes: trivia gastronómica, memory de platos y ranking con premios',
        'Gamepad2',
        '#f59e0b',
        '/restaurant/game-chef',
        11,
        true
      ]
    );
  } catch (seedErr: any) {
    console.warn('⚠️ [LIST MODULES] Error seeding game-chef module:', seedErr.message);
  }

  try {
    await ctx.db.query(
      `INSERT INTO modules (id, name, description, icon, color, route, display_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         color = EXCLUDED.color,
         route = EXCLUDED.route,
         display_order = EXCLUDED.display_order,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()`,
      [
        'comandas-pro',
        'Comandas Pro',
        'Sistema avanzado: 2 monitores de cocina, 2 PC/Caja, 3 comanderas',
        'ClipboardList',
        '#8b5cf6',
        '/restaurant/comandas',
        12,
        true
      ]
    );
  } catch (seedErr: any) {
    console.warn('⚠️ [LIST MODULES] Error seeding comandas-pro module:', seedErr.message);
  }

  const result = await ctx.db.query(
    `SELECT id, name, description, icon, color, route, is_active, display_order, created_at, updated_at
     FROM modules
     ORDER BY display_order ASC, name ASC`
  );

  const modules = result.rows.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    icon: String(row.icon),
    color: String(row.color),
    route: row.route ? String(row.route) : null,
    isActive: Boolean(row.is_active),
    displayOrder: Number(row.display_order),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));

  console.log(`✅ [LIST MODULES] ${modules.length} módulos encontrados`);

  return modules;
});
