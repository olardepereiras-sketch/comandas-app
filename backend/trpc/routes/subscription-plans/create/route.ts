import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const createSubscriptionPlanProcedure = publicProcedure
  .input(
    z.object({
      name: z.string().min(1, 'El nombre es requerido'),
      price: z.number().nonnegative('El precio debe ser mayor o igual a 0'),
      enabledModules: z.array(z.string()),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE SUBSCRIPTION PLAN] Creando tarifa:', input.name);

    const id = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    try {
      const result = await ctx.db.query(
        `INSERT INTO subscription_plans (id, name, price, enabled_modules, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, input.name, input.price, JSON.stringify(input.enabledModules), true, now, now]
      );

      console.log('✅ [CREATE SUBSCRIPTION PLAN] Tarifa creada:', {
        id,
        name: input.name,
        rowsAffected: result.rowCount,
      });

      return {
        id: String(id),
        name: String(input.name),
        price: Number(input.price),
        enabledModules: input.enabledModules,
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    } catch (error: any) {
      console.error('❌ [CREATE SUBSCRIPTION PLAN] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al crear la tarifa: ${error.message}`,
      });
    }
  });
