import { Hono } from 'hono';
import { getPoolInstance } from '../../trpc/create-context';
import { classifyUser, generateChatbotResponse, shouldDeriveToHuman, type ChatMessage, type UserType } from '../../services/whatsapp-chatbot';
import { sendWhatsAppViaCloudApi, getCloudApiConfigFromDb } from '../../services/whatsapp-cloud-api';

const app = new Hono();

async function ensureChatbotTables(): Promise<void> {
  const pool = getPoolInstance();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_phone VARCHAR(50) NOT NULL,
      user_name VARCHAR(255),
      user_type VARCHAR(30) DEFAULT 'unknown',
      restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
      status VARCHAR(30) DEFAULT 'active',
      ai_response_count INTEGER DEFAULT 0,
      last_message_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
      direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
      content TEXT NOT NULL,
      sent_by_ai BOOLEAN DEFAULT FALSE,
      whatsapp_message_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_chatbot_settings (
      id VARCHAR(10) PRIMARY KEY DEFAULT 'main',
      enabled BOOLEAN DEFAULT TRUE,
      verify_token VARCHAR(255) DEFAULT 'quieromesa_webhook_token',
      welcome_message_customer TEXT DEFAULT '¡Hola! Soy el asistente de QuieroMesa 😊 Puedo ayudarte a hacer una reserva o resolver tus dudas. ¿En qué te puedo ayudar?',
      welcome_message_owner TEXT DEFAULT '¡Hola! Soy el asistente de QuieroMesa para restaurantes 🍴 ¿Te interesa conocer nuestros servicios o tienes alguna consulta?',
      auto_derive_after_messages INTEGER DEFAULT 8,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    INSERT INTO whatsapp_chatbot_settings (id)
    VALUES ('main')
    ON CONFLICT (id) DO NOTHING
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(user_phone);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON whatsapp_conversations(status);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
  `);
}

async function getOrCreateConversation(pool: any, userPhone: string, userName: string | null): Promise<{ id: string; userType: UserType; aiResponseCount: number; status: string }> {
  const existing = await pool.query(
    `SELECT id, user_type, ai_response_count, status FROM whatsapp_conversations
     WHERE user_phone = $1 AND status != 'resolved'
     ORDER BY last_message_at DESC LIMIT 1`,
    [userPhone]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    return {
      id: row.id as string,
      userType: row.user_type as UserType,
      aiResponseCount: row.ai_response_count as number,
      status: row.status as string,
    };
  }

  const created = await pool.query(
    `INSERT INTO whatsapp_conversations (user_phone, user_name, user_type, status)
     VALUES ($1, $2, 'unknown', 'active')
     RETURNING id, user_type, ai_response_count, status`,
    [userPhone, userName]
  );
  const row = created.rows[0];
  return {
    id: row.id as string,
    userType: row.user_type as UserType,
    aiResponseCount: row.ai_response_count as number,
    status: row.status as string,
  };
}

async function saveMessage(pool: any, conversationId: string, direction: 'inbound' | 'outbound', content: string, sentByAi: boolean, waMessageId?: string): Promise<void> {
  await pool.query(
    `INSERT INTO whatsapp_messages (conversation_id, direction, content, sent_by_ai, whatsapp_message_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [conversationId, direction, content, sentByAi, waMessageId || null]
  );
}

async function getConversationHistory(pool: any, conversationId: string, limit = 10): Promise<ChatMessage[]> {
  const result = await pool.query(
    `SELECT direction, content FROM whatsapp_messages
     WHERE conversation_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [conversationId, limit]
  );
  return (result.rows as any[])
    .reverse()
    .map((row: any) => ({
      role: row.direction === 'inbound' ? 'user' : 'assistant',
      content: row.content,
    })) as ChatMessage[];
}

async function updateConversation(pool: any, conversationId: string, updates: { userType?: UserType; status?: string; aiResponseCount?: number }): Promise<void> {
  const sets: string[] = ['last_message_at = NOW()', 'updated_at = NOW()'];
  const values: any[] = [];
  let i = 1;

  if (updates.userType !== undefined) { sets.push(`user_type = $${i++}`); values.push(updates.userType); }
  if (updates.status !== undefined) { sets.push(`status = $${i++}`); values.push(updates.status); }
  if (updates.aiResponseCount !== undefined) { sets.push(`ai_response_count = $${i++}`); values.push(updates.aiResponseCount); }

  values.push(conversationId);
  await pool.query(`UPDATE whatsapp_conversations SET ${sets.join(', ')} WHERE id = $${i}`, values);
}

async function getChatbotSettings(pool: any): Promise<{ enabled: boolean; verifyToken: string; autoDeriveAfterMessages: number; welcomeMessageCustomer: string; welcomeMessageOwner: string }> {
  const result = await pool.query(
    `SELECT enabled, verify_token, auto_derive_after_messages, welcome_message_customer, welcome_message_owner
     FROM whatsapp_chatbot_settings WHERE id = 'main' LIMIT 1`
  );
  if (result.rows.length === 0) {
    return {
      enabled: true,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'quieromesa_webhook_token',
      autoDeriveAfterMessages: 8,
      welcomeMessageCustomer: '¡Hola! Soy el asistente de QuieroMesa 😊 ¿En qué te puedo ayudar?',
      welcomeMessageOwner: '¡Hola! Soy el asistente de QuieroMesa para restaurantes 🍴',
    };
  }
  const row = result.rows[0];
  return {
    enabled: row.enabled as boolean,
    verifyToken: (row.verify_token as string) || (process.env.WHATSAPP_VERIFY_TOKEN || 'quieromesa_webhook_token'),
    autoDeriveAfterMessages: row.auto_derive_after_messages as number,
    welcomeMessageCustomer: row.welcome_message_customer as string,
    welcomeMessageOwner: row.welcome_message_owner as string,
  };
}

app.get('/', (c: any) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  console.log(`[WhatsApp Webhook] 🔍 Verificación: mode=${mode}, token=${token}`);

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'quieromesa_webhook_token';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook] ✅ Webhook verificado correctamente');
    return c.text(challenge || '', 200);
  }

  console.warn(`[WhatsApp Webhook] ❌ Token inválido. Recibido: "${token}", esperado: "${expectedToken}"`);
  return c.json({ error: 'Forbidden' }, 403);
});

app.post('/', async (c: any) => {
  try {
    await ensureChatbotTables();
    const pool = getPoolInstance();
    const settings = await getChatbotSettings(pool);

    const body = await c.req.json() as any;
    console.log('[WhatsApp Webhook] 📨 Mensaje recibido:', JSON.stringify(body).substring(0, 500));

    if (body.object !== 'whatsapp_business_account') {
      return c.json({ status: 'ignored' }, 200);
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          if (msg.type !== 'text') {
            console.log(`[WhatsApp Webhook] ⏭️ Ignorando mensaje tipo: ${msg.type}`);
            continue;
          }

          const userPhone = msg.from as string;
          const messageText = msg.text?.body as string;
          const waMessageId = msg.id as string;
          const contact = contacts.find((c: any) => c.wa_id === userPhone);
          const userName = contact?.profile?.name || null;

          console.log(`[WhatsApp Webhook] 💬 Mensaje de ${userPhone}: ${messageText?.substring(0, 100)}`);

          if (!messageText || !userPhone) continue;

          if (!settings.enabled) {
            console.log('[WhatsApp Webhook] ⏸️ Chatbot desactivado, ignorando mensaje');
            continue;
          }

          const conversation = await getOrCreateConversation(pool, userPhone, userName);

          await saveMessage(pool, conversation.id, 'inbound', messageText, false, waMessageId);

          if (conversation.status === 'pending_human') {
            console.log(`[WhatsApp Webhook] 👤 Conversación ${conversation.id} pendiente de humano, no respondiendo con IA`);
            await updateConversation(pool, conversation.id, {});
            continue;
          }

          let userType = conversation.userType;
          if (userType === 'unknown') {
            userType = classifyUser(messageText);
            if (userType !== 'unknown') {
              await updateConversation(pool, conversation.id, { userType });
            }
          }

          const derivar = shouldDeriveToHuman(messageText, conversation.aiResponseCount);
          if (derivar) {
            const deriveMsg = 'Voy a pasar tu consulta a un especialista. En breve te contestaremos 👋';
            const cloudConfig = await getCloudApiConfigFromDb(pool);
            if (cloudConfig) {
              await sendWhatsAppViaCloudApi(userPhone, deriveMsg, cloudConfig);
              await saveMessage(pool, conversation.id, 'outbound', deriveMsg, true);
            }
            await updateConversation(pool, conversation.id, { status: 'pending_human' });
            console.log(`[WhatsApp Webhook] 🔄 Conversación ${conversation.id} derivada a humano`);
            continue;
          }

          const history = await getConversationHistory(pool, conversation.id, 10);
          const aiResponse = await generateChatbotResponse(userType, history.slice(0, -1), messageText);

          const cloudConfig = await getCloudApiConfigFromDb(pool);
          if (cloudConfig) {
            const sendResult = await sendWhatsAppViaCloudApi(userPhone, aiResponse, cloudConfig);
            if (sendResult.success) {
              await saveMessage(pool, conversation.id, 'outbound', aiResponse, true, sendResult.messageId);
              await updateConversation(pool, conversation.id, {
                userType,
                aiResponseCount: conversation.aiResponseCount + 1,
              });
              console.log(`[WhatsApp Webhook] ✅ Respuesta IA enviada a ${userPhone}`);
            } else {
              console.error(`[WhatsApp Webhook] ❌ Error enviando respuesta: ${sendResult.error}`);
            }
          } else {
            console.warn('[WhatsApp Webhook] ⚠️ Cloud API no configurada, no se pudo enviar respuesta');
            await saveMessage(pool, conversation.id, 'outbound', aiResponse, true);
            await updateConversation(pool, conversation.id, {
              userType,
              aiResponseCount: conversation.aiResponseCount + 1,
            });
          }
        }
      }
    }

    return c.json({ status: 'ok' }, 200);
  } catch (error: any) {
    console.error('[WhatsApp Webhook] ❌ Error procesando mensaje:', error.message);
    return c.json({ status: 'error', message: error.message }, 200);
  }
});

export default app;
