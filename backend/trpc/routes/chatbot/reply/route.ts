/// <reference types="node" />
import { z } from 'zod';
import { publicProcedure, TRPCError } from '../../../create-context';
import { sendWhatsAppViaCloudApi, getCloudApiConfigFromDb } from '../../../../services/whatsapp-cloud-api';

export const replyChatbotConversationProcedure = publicProcedure
  .input(z.object({
    conversationId: z.string(),
    message: z.string().min(1),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('🔵 [CHATBOT] Respondiendo conversación:', input.conversationId);
    try {
      const convResult = await ctx.db.query(
        `SELECT id, user_phone, status FROM whatsapp_conversations WHERE id = $1`,
        [input.conversationId]
      );
      if (convResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversación no encontrada' });
      }
      const conv = convResult.rows[0] as any;
      const userPhone = conv.user_phone as string;

      const cloudConfig = await getCloudApiConfigFromDb(ctx.db);
      let sendSuccess = false;
      let errorMsg: string | undefined;

      if (cloudConfig) {
        const result = await sendWhatsAppViaCloudApi(userPhone, input.message, cloudConfig);
        sendSuccess = result.success;
        errorMsg = result.error;
      } else {
        console.warn('[CHATBOT] Cloud API no configurada, guardando mensaje sin enviar');
        sendSuccess = true;
      }

      if (sendSuccess) {
        await ctx.db.query(
          `INSERT INTO whatsapp_messages (conversation_id, direction, content, sent_by_ai)
           VALUES ($1, 'outbound', $2, FALSE)`,
          [input.conversationId, input.message]
        );
        await ctx.db.query(
          `UPDATE whatsapp_conversations SET last_message_at = NOW(), updated_at = NOW(), status = 'active' WHERE id = $1`,
          [input.conversationId]
        );
        console.log(`✅ [CHATBOT] Respuesta manual enviada a ${userPhone}`);
        return { success: true };
      } else {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: errorMsg || 'Error enviando mensaje' });
      }
    } catch (error: any) {
      if (error.code === 'NOT_FOUND' || error.code === 'INTERNAL_SERVER_ERROR') throw error;
      console.error('❌ [CHATBOT] Error respondiendo:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
