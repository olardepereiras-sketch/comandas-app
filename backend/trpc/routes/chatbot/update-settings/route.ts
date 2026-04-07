/// <reference types="node" />
import { z } from 'zod';
import { publicProcedure, TRPCError } from '../../../create-context';

export const updateChatbotSettingsProcedure = publicProcedure
  .input(z.object({
    enabled: z.boolean().optional(),
    verifyToken: z.string().optional(),
    autoDeriveAfterMessages: z.number().min(1).max(50).optional(),
    welcomeMessageCustomer: z.string().optional(),
    welcomeMessageOwner: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('🔵 [CHATBOT] Actualizando configuración');
    try {
      const sets: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let i = 1;

      if (input.enabled !== undefined) { sets.push(`enabled = $${i++}`); values.push(input.enabled); }
      if (input.verifyToken !== undefined) { sets.push(`verify_token = $${i++}`); values.push(input.verifyToken); }
      if (input.autoDeriveAfterMessages !== undefined) { sets.push(`auto_derive_after_messages = $${i++}`); values.push(input.autoDeriveAfterMessages); }
      if (input.welcomeMessageCustomer !== undefined) { sets.push(`welcome_message_customer = $${i++}`); values.push(input.welcomeMessageCustomer); }
      if (input.welcomeMessageOwner !== undefined) { sets.push(`welcome_message_owner = $${i++}`); values.push(input.welcomeMessageOwner); }

      await ctx.db.query(
        `INSERT INTO whatsapp_chatbot_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING`
      );
      await ctx.db.query(
        `UPDATE whatsapp_chatbot_settings SET ${sets.join(', ')} WHERE id = 'main'`,
        values
      );

      console.log('✅ [CHATBOT] Configuración actualizada');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [CHATBOT] Error actualizando config:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
