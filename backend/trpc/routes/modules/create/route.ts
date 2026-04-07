import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const createModuleProcedure = publicProcedure
  .input(
    z.object({
      name: z.string().min(1, 'El nombre es requerido'),
      description: z.string().min(1, 'La descripción es requerida'),
      icon: z.string().min(1, 'El icono es requerido'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un hex válido'),
      route: z.string().optional(),
      displayOrder: z.number().default(0),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE MODULE] Creando módulo:', input.name);

    const id = input.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const now = new Date();

    try {
      const result = await ctx.db.query(
        `INSERT INTO modules (id, name, description, icon, color, route, display_order, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [id, input.name, input.description, input.icon, input.color, input.route || null, input.displayOrder, true, now, now]
      );

      const module = result.rows[0];

      console.log('✅ [CREATE MODULE] Módulo creado:', id);

      return {
        id: String(module.id),
        name: String(module.name),
        description: String(module.description),
        icon: String(module.icon),
        color: String(module.color),
        route: module.route ? String(module.route) : null,
        isActive: Boolean(module.is_active),
        displayOrder: Number(module.display_order),
        createdAt: new Date(module.created_at).toISOString(),
        updatedAt: new Date(module.updated_at).toISOString(),
      };
    } catch (error: any) {
      console.error('❌ [CREATE MODULE] Error:', error);
      if (error.code === '23505') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ya existe un módulo con ese nombre',
        });
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al crear el módulo: ${error.message}`,
      });
    }
  });
