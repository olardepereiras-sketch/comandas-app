import { publicProcedure, TRPCError } from '../../../create-context';

export const getWhatsappProAdminConfigProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [WHATSAPP PRO] Obteniendo configuración admin');
    try {
      await ctx.db.query(`
        CREATE TABLE IF NOT EXISTS admin_whatsapp_pro_config (
          id TEXT PRIMARY KEY DEFAULT 'main',
          provider TEXT DEFAULT 'cloud_api',
          enabled BOOLEAN DEFAULT FALSE,
          cost_per_message DECIMAL(10,4) DEFAULT 0.05,
          twilio_account_sid TEXT DEFAULT '',
          twilio_auth_token TEXT DEFAULT '',
          twilio_from_phone TEXT DEFAULT '',
          dialog360_api_key TEXT DEFAULT '',
          dialog360_from_phone TEXT DEFAULT '',
          cloud_api_token TEXT DEFAULT '',
          cloud_api_phone_number_id TEXT DEFAULT '',
          cloud_api_business_account_id TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await ctx.db.query(`INSERT INTO admin_whatsapp_pro_config (id) VALUES ('main') ON CONFLICT (id) DO NOTHING`);

      const result = await ctx.db.query('SELECT * FROM admin_whatsapp_pro_config WHERE id = $1', ['main']);

      if (result.rows.length === 0) {
        return {
          provider: 'cloud_api' as const,
          enabled: false,
          costPerMessage: 0.05,
          twilioAccountSid: '',
          twilioAuthToken: '',
          twilioFromPhone: '',
          dialog360ApiKey: '',
          dialog360FromPhone: '',
          cloudApiToken: '',
          cloudApiPhoneNumberId: '',
          cloudApiBusinessAccountId: '',
        };
      }

      const row = result.rows[0];
      return {
        provider: (row.provider || 'cloud_api') as 'twilio' | '360dialog' | 'cloud_api',
        enabled: Boolean(row.enabled),
        costPerMessage: Number(row.cost_per_message) || 0.05,
        twilioAccountSid: row.twilio_account_sid || '',
        twilioAuthToken: row.twilio_auth_token || '',
        twilioFromPhone: row.twilio_from_phone || '',
        dialog360ApiKey: row.dialog360_api_key || '',
        dialog360FromPhone: row.dialog360_from_phone || '',
        cloudApiToken: row.cloud_api_token || '',
        cloudApiPhoneNumberId: row.cloud_api_phone_number_id || '',
        cloudApiBusinessAccountId: row.cloud_api_business_account_id || '',
      };
    } catch (error: any) {
      console.error('❌ [WHATSAPP PRO] Error obteniendo config:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
