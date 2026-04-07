import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateWhatsappProAdminConfigProcedure = publicProcedure
  .input(
    z.object({
      provider: z.enum(['twilio', '360dialog', 'cloud_api']).optional(),
      enabled: z.boolean().optional(),
      costPerMessage: z.number().optional(),
      twilioAccountSid: z.string().optional(),
      twilioAuthToken: z.string().optional(),
      twilioFromPhone: z.string().optional(),
      dialog360ApiKey: z.string().optional(),
      dialog360FromPhone: z.string().optional(),
      cloudApiToken: z.string().optional(),
      cloudApiPhoneNumberId: z.string().optional(),
      cloudApiBusinessAccountId: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [WHATSAPP PRO] Actualizando configuración admin');
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let pc = 1;

      if (input.provider !== undefined) { updates.push(`provider = $${pc++}`); params.push(input.provider); }
      if (input.enabled !== undefined) { updates.push(`enabled = $${pc++}`); params.push(input.enabled); }
      if (input.costPerMessage !== undefined) { updates.push(`cost_per_message = $${pc++}`); params.push(input.costPerMessage); }
      if (input.twilioAccountSid !== undefined) { updates.push(`twilio_account_sid = $${pc++}`); params.push(input.twilioAccountSid); }
      if (input.twilioAuthToken !== undefined) { updates.push(`twilio_auth_token = $${pc++}`); params.push(input.twilioAuthToken); }
      if (input.twilioFromPhone !== undefined) { updates.push(`twilio_from_phone = $${pc++}`); params.push(input.twilioFromPhone); }
      if (input.dialog360ApiKey !== undefined) { updates.push(`dialog360_api_key = $${pc++}`); params.push(input.dialog360ApiKey); }
      if (input.dialog360FromPhone !== undefined) { updates.push(`dialog360_from_phone = $${pc++}`); params.push(input.dialog360FromPhone); }
      if (input.cloudApiToken !== undefined) { updates.push(`cloud_api_token = $${pc++}`); params.push(input.cloudApiToken); }
      if (input.cloudApiPhoneNumberId !== undefined) { updates.push(`cloud_api_phone_number_id = $${pc++}`); params.push(input.cloudApiPhoneNumberId); }
      if (input.cloudApiBusinessAccountId !== undefined) { updates.push(`cloud_api_business_account_id = $${pc++}`); params.push(input.cloudApiBusinessAccountId); }

      updates.push(`updated_at = $${pc++}`);
      params.push(new Date());

      const columns = updates.map(u => u.split(' = ')[0]).join(', ');
      const vals = params.map((_, i) => `$${i + 1}`).join(', ');

      const sql = `
        INSERT INTO admin_whatsapp_pro_config (id, ${columns})
        VALUES ('main', ${vals})
        ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}
      `;

      await ctx.db.query(sql, params);
      console.log('✅ [WHATSAPP PRO] Configuración actualizada');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [WHATSAPP PRO] Error actualizando config:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
