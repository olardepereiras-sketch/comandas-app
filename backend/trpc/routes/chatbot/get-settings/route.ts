import { publicProcedure, TRPCError } from '../../../create-context';

const ENSURE_SETTINGS_SQL = `
  CREATE TABLE IF NOT EXISTS whatsapp_chatbot_settings (
    id VARCHAR(10) PRIMARY KEY DEFAULT 'main',
    enabled BOOLEAN DEFAULT TRUE,
    verify_token VARCHAR(255) DEFAULT 'quieromesa_webhook_token',
    welcome_message_customer TEXT DEFAULT '¡Hola! Soy el asistente de QuieroMesa 😊 Puedo ayudarte a hacer una reserva o resolver tus dudas. ¿En qué te puedo ayudar?',
    welcome_message_owner TEXT DEFAULT '¡Hola! Soy el asistente de QuieroMesa para restaurantes 🍴 ¿Te interesa conocer nuestros servicios o tienes alguna consulta?',
    auto_derive_after_messages INTEGER DEFAULT 8,
    updated_at TIMESTAMP DEFAULT NOW()
  );
  INSERT INTO whatsapp_chatbot_settings (id)
  VALUES ('main')
  ON CONFLICT (id) DO NOTHING;
`;

export const getChatbotSettingsProcedure = publicProcedure
  .query(async ({ ctx }: { ctx: any }) => {
    console.log('🔵 [CHATBOT] Obteniendo configuración');
    try {
      await ctx.db.query(ENSURE_SETTINGS_SQL);

      const result = await ctx.db.query(
        `SELECT enabled, verify_token, auto_derive_after_messages, welcome_message_customer, welcome_message_owner
         FROM whatsapp_chatbot_settings WHERE id = 'main' LIMIT 1`
      );
      if (result.rows.length === 0) {
        return {
          enabled: true,
          verifyToken: 'quieromesa_webhook_token',
          autoDeriveAfterMessages: 8,
          welcomeMessageCustomer: '¡Hola! Soy el asistente de QuieroMesa 😊 ¿En qué te puedo ayudar?',
          welcomeMessageOwner: '¡Hola! Soy el asistente de QuieroMesa para restaurantes 🍴',
        };
      }
      const row = result.rows[0] as any;
      return {
        enabled: row.enabled as boolean,
        verifyToken: (row.verify_token as string) || '',
        autoDeriveAfterMessages: Number(row.auto_derive_after_messages) || 8,
        welcomeMessageCustomer: (row.welcome_message_customer as string) || '',
        welcomeMessageOwner: (row.welcome_message_owner as string) || '',
      };
    } catch (error: any) {
      console.error('❌ [CHATBOT] Error obteniendo config:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
