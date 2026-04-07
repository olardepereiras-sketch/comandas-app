import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateDayExceptionProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      isOpen: z.boolean().optional(),
      templateIds: z.array(z.string()).optional(),
      maxGuestsOverride: z.number().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE DAY EXCEPTION] Actualizando excepción:', input);

    const updates: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    if (input.isOpen !== undefined) {
      updates.push(`is_open = $${valueIndex++}`);
      values.push(input.isOpen);
    }

    if (input.templateIds !== undefined) {
      updates.push(`template_ids = $${valueIndex++}`);
      values.push(JSON.stringify(input.templateIds));
    }

    if (input.maxGuestsOverride !== undefined) {
      updates.push(`max_guests_override = $${valueIndex++}`);
      values.push(input.maxGuestsOverride);
    }

    if (input.notes !== undefined) {
      updates.push(`notes = $${valueIndex++}`);
      values.push(input.notes);
    }

    updates.push(`updated_at = $${valueIndex++}`);
    values.push(new Date());

    values.push(input.id);

    await ctx.db.query(
      `UPDATE day_exceptions SET ${updates.join(', ')} WHERE id = $${valueIndex}`,
      values
    );

    console.log('✅ [UPDATE DAY EXCEPTION] Excepción actualizada:', input.id);

    return { success: true };
  });
