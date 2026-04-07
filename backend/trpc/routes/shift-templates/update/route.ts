import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateShiftTemplateProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      times: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE SHIFT TEMPLATE] Actualizando plantilla:', input);

    const updates: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${valueIndex++}`);
      values.push(input.name);
    }

    if (input.times !== undefined) {
      updates.push(`times = $${valueIndex++}`);
      values.push(JSON.stringify(input.times));
    }

    updates.push(`updated_at = $${valueIndex++}`);
    values.push(new Date());

    values.push(input.id);

    await ctx.db.query(
      `UPDATE shift_templates SET ${updates.join(', ')} WHERE id = $${valueIndex}`,
      values
    );

    console.log('✅ [UPDATE SHIFT TEMPLATE] Plantilla actualizada:', input.id);

    return { success: true };
  });
