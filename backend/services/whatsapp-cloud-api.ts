export interface CloudApiConfig {
  token: string;
  phoneNumberId: string;
}

export async function sendWhatsAppViaCloudApi(
  to: string,
  message: string,
  config: CloudApiConfig
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const cleanPhone = to.replace(/\s+/g, '').replace(/^00/, '+');
    const e164Phone = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;

    console.log(`[WhatsApp Cloud API] 📤 Enviando mensaje a ${e164Phone}`);

    const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;

    const body = {
      messaging_product: 'whatsapp',
      to: e164Phone,
      type: 'text',
      text: { body: message },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      console.error(`[WhatsApp Cloud API] ❌ Error: ${errMsg}`, data);
      return { success: false, error: errMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log(`[WhatsApp Cloud API] ✅ Mensaje enviado. ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error: any) {
    console.error('[WhatsApp Cloud API] ❌ Error inesperado:', error.message);
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

export async function deductWhatsAppCredit(db: any, restaurantId: string): Promise<void> {
  try {
    await db.query(
      `UPDATE restaurants SET whatsapp_pro_credits = GREATEST(0, COALESCE(whatsapp_pro_credits, 0) - 1) WHERE id = $1`,
      [restaurantId]
    );
    console.log(`[WhatsApp Cloud API] 💳 Crédito descontado para restaurante: ${restaurantId}`);
  } catch (error: any) {
    console.error('[WhatsApp Cloud API] ❌ Error descontando crédito:', error.message);
  }
}

export async function getCloudApiConfigFromDb(db: any): Promise<CloudApiConfig | null> {
  try {
    const result = await db.query(
      `SELECT cloud_api_token, cloud_api_phone_number_id, enabled, provider
       FROM admin_whatsapp_pro_config WHERE id = 'main' LIMIT 1`
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row.enabled) {
      console.log('[WhatsApp Cloud API] ⏸️ Cloud API desactivada en config admin');
      return null;
    }
    if (row.provider !== 'cloud_api') {
      console.log(`[WhatsApp Cloud API] ⏸️ Proveedor configurado es "${row.provider}", no cloud_api`);
      return null;
    }
    if (!row.cloud_api_token || !row.cloud_api_phone_number_id) {
      console.log('[WhatsApp Cloud API] ⚠️ Token o Phone Number ID no configurados');
      return null;
    }
    return {
      token: row.cloud_api_token,
      phoneNumberId: row.cloud_api_phone_number_id,
    };
  } catch (error: any) {
    console.error('[WhatsApp Cloud API] ❌ Error obteniendo config de DB:', error.message);
    return null;
  }
}
