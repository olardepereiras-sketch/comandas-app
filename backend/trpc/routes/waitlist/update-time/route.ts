import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateWaitlistTimeProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      preferredTime: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE WAITLIST TIME] Actualizando hora preferida:', input.id, '->', input.preferredTime);

    const normalizedPreferredTime = input.preferredTime.trim();
    console.log('🔵 [UPDATE WAITLIST TIME] Hora normalizada:', normalizedPreferredTime);

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(normalizedPreferredTime)) {
      console.error('❌ [UPDATE WAITLIST TIME] Formato de hora inválido:', normalizedPreferredTime);
      throw new Error('La hora preferida no tiene un formato válido');
    }

    const result = await ctx.db.query(
      `UPDATE waitlist SET preferred_time = $1 WHERE id = $2 AND status = 'waiting' RETURNING id, preferred_time`,
      [normalizedPreferredTime, input.id]
    );

    console.log('🟣 [UPDATE WAITLIST TIME] Resultado DB:', result.rows[0] ?? null);

    if (!result.rows[0]?.id) {
      console.error('❌ [UPDATE WAITLIST TIME] No se encontró entrada waiting para actualizar:', input.id);
      throw new Error('Entrada de lista de espera no encontrada o ya procesada');
    }

    console.log('✅ [UPDATE WAITLIST TIME] Hora preferida actualizada:', result.rows[0].id);
    return { success: true };
  });
