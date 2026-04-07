/// <reference types="node" />
import { z } from 'zod';
import { publicProcedure, TRPCError } from '../../../create-context';

export const getChatbotConversationProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    console.log('🔵 [CHATBOT] Obteniendo conversación:', input.id);
    try {
      const convResult = await ctx.db.query(
        `SELECT id, user_phone, user_name, user_type, status, ai_response_count, last_message_at, created_at
         FROM whatsapp_conversations WHERE id = $1`,
        [input.id]
      );
      if (convResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversación no encontrada' });
      }
      const conv = convResult.rows[0] as any;

      const msgResult = await ctx.db.query(
        `SELECT id, direction, content, sent_by_ai, whatsapp_message_id, created_at
         FROM whatsapp_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [input.id]
      );

      return {
        id: conv.id as string,
        userPhone: conv.user_phone as string,
        userName: (conv.user_name as string | null) ?? null,
        userType: conv.user_type as string,
        status: conv.status as string,
        aiResponseCount: Number(conv.ai_response_count) || 0,
        lastMessageAt: conv.last_message_at ? String(conv.last_message_at) : new Date().toISOString(),
        createdAt: conv.created_at ? String(conv.created_at) : new Date().toISOString(),
        messages: msgResult.rows.map((row: any) => ({
          id: row.id as string,
          direction: row.direction as string,
          content: row.content as string,
          sentByAi: row.sent_by_ai as boolean,
          createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
        })),
      };
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') throw error;
      console.error('❌ [CHATBOT] Error obteniendo conversación:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
