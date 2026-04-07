import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const createSubscriptionDurationProcedure = publicProcedure
  .input(
    z.object({
      name: z.string().min(1, 'El nombre es requerido'),
      months: z.number().int().min(0, 'Los meses deben ser 0 o mayores'),
      description: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE SUBSCRIPTION DURATION] Creando duración:', input.name);

    const id = `duration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    try {
      const result = await ctx.db.query(
        `INSERT INTO subscription_durations (id, name, months, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, input.name, input.months, input.description || null, true, now, now]
      );

      console.log('✅ [CREATE SUBSCRIPTION DURATION] Duración creada:', {
        id,
        name: input.name,
        rowsAffected: result.rowCount,
      });

      return {
        id: String(id),
        name: String(input.name),
        months: Number(input.months),
        description: input.description,
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    } catch (error: any) {
      console.error('❌ [CREATE SUBSCRIPTION DURATION] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al crear la duración: ${error.message}`,
      });
    }
  });
