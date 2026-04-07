/// <reference types="node" />
import { z } from 'zod';
import { publicProcedure, TRPCError } from '../../../create-context';

export const listChatbotConversationsProcedure = publicProcedure
  .input(z.object({
    status: z.enum(['active', 'pending_human', 'resolved', 'all']).optional().default('all'),
    userType: z.enum(['customer', 'restaurant_owner', 'unknown', 'all']).optional().default('all'),
    limit: z.number().optional().default(50),
    offset: z.number().optional().default(0),
  }))
  .query(async ({ ctx, input }) => {
    console.log('🔵 [CHATBOT] Listando conversaciones', input);
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (input.status !== 'all') {
        conditions.push(`c.status = $${i++}`);
        values.push(input.status);
      }
      if (input.userType !== 'all') {
        conditions.push(`c.user_type = $${i++}`);
        values.push(input.userType);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      values.push(input.limit);
      values.push(input.offset);

      const result = await ctx.db.query(
        `SELECT
          c.id, c.user_phone, c.user_name, c.user_type, c.status,
          c.ai_response_count, c.last_message_at, c.created_at,
          (SELECT content FROM whatsapp_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
          (SELECT COUNT(*) FROM whatsapp_messages WHERE conversation_id = c.id AND direction = 'inbound') AS total_inbound,
          (SELECT COUNT(*) FROM whatsapp_messages WHERE conversation_id = c.id) AS total_messages
         FROM whatsapp_conversations c
         ${where}
         ORDER BY c.last_message_at DESC
         LIMIT $${i++} OFFSET $${i++}`,
        values
      );

      const countResult = await ctx.db.query(
        `SELECT COUNT(*) as total FROM whatsapp_conversations c ${where}`,
        values.slice(0, -2)
      );

      return {
        conversations: result.rows.map((row: any) => ({
          id: row.id as string,
          userPhone: row.user_phone as string,
          userName: (row.user_name as string | null) ?? null,
          userType: row.user_type as string,
          status: row.status as string,
          aiResponseCount: Number(row.ai_response_count) || 0,
          lastMessage: (row.last_message as string | null) ?? null,
          totalMessages: Number(row.total_messages) || 0,
          lastMessageAt: row.last_message_at ? String(row.last_message_at) : new Date().toISOString(),
          createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
        })),
        total: Number(countResult.rows[0]?.total) || 0,
      };
    } catch (error: any) {
      console.error('❌ [CHATBOT] Error listando conversaciones:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
