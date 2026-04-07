/// <reference types="node" />
import { z } from 'zod';
import { publicProcedure, TRPCError } from '../../../create-context';

export const markChatbotConversationResolvedProcedure = publicProcedure
  .input(z.object({
    conversationId: z.string(),
    status: z.enum(['resolved', 'pending_human', 'active']).default('resolved'),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('🔵 [CHATBOT] Cambiando estado conversación:', input.conversationId, '->', input.status);
    try {
      const result = await ctx.db.query(
        `UPDATE whatsapp_conversations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
        [input.status, input.conversationId]
      );
      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversación no encontrada' });
      }
      console.log(`✅ [CHATBOT] Conversación ${input.conversationId} marcada como ${input.status}`);
      return { success: true };
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') throw error;
      console.error('❌ [CHATBOT] Error cambiando estado:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
