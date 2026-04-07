declare const process: { env: Record<string, string | undefined> };

export type UserType = 'customer' | 'restaurant_owner' | 'unknown';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CUSTOMER_KEYWORDS = [
  'reservar', 'reserva', 'mesa', 'comer', 'cenar', 'almorzar', 'horario',
  'dirección', 'menu', 'menú', 'gluten', 'alergia', 'vegetariano', 'vegan',
  'disponible', 'disponibilidad', 'cancelar', 'cambiar', 'modificar', 'confirmar',
  'ticket', 'comprobante', 'precio', 'precio medio', 'ubicación', 'mapa',
  'cuando', 'cuándo', 'abierto', 'cierra', 'abre', 'pedir', 'quiero',
];

const OWNER_KEYWORDS = [
  'contratar', 'registrar', 'registro', 'plan', 'planes', 'suscripción',
  'soporte', 'api', 'integración', 'software', 'sistema', 'gestión',
  'mi restaurante', 'tengo un restaurante', 'quiero el servicio', 'alta',
  'demo', 'prueba', 'presupuesto', 'coste', 'costo', 'configurar', 'configuración',
  'funciona', 'módulo', 'modulo', 'instalar', 'setup', 'activar',
];

export function classifyUser(message: string): UserType {
  const lower = message.toLowerCase();
  const customerScore = CUSTOMER_KEYWORDS.filter(k => lower.includes(k)).length;
  const ownerScore = OWNER_KEYWORDS.filter(k => lower.includes(k)).length;

  console.log(`[Chatbot] Clasificación: customer=${customerScore}, owner=${ownerScore}`);

  if (customerScore > ownerScore && customerScore > 0) return 'customer';
  if (ownerScore > customerScore && ownerScore > 0) return 'restaurant_owner';
  return 'unknown';
}

const SYSTEM_PROMPT_CUSTOMER = `Eres el asistente virtual de QuieroMesa, una plataforma de reservas de restaurantes en España.
Tu rol es ayudar a clientes finales que quieren hacer reservas o tienen dudas sobre restaurantes.

Instrucciones:
- Responde siempre en español de forma amable y concisa
- Si el cliente quiere hacer una reserva, pide: restaurante, fecha, hora, número de personas, nombre y teléfono
- Si preguntan por horarios o dirección, indica que consultes la información del restaurante específico
- Si tienes dudas sobre disponibilidad, indica que estás verificando y que en breve confirmas
- Si la consulta es muy compleja o específica, di que pasarás la consulta a un especialista humano
- Mantén respuestas cortas (máximo 3-4 líneas)
- Usa emojis ocasionalmente para ser más amigable 🍽️
- Sé proactivo y ofrece ayuda concreta`;

const SYSTEM_PROMPT_OWNER = `Eres el asistente virtual de QuieroMesa para restaurantes, una plataforma de gestión de reservas profesional.
Tu rol es ayudar a dueños de restaurantes: tanto para contratar el servicio como para configurar y usar la app correctamente.

Información sobre QuieroMesa:
- Plataforma web de gestión de reservas para restaurantes en España
- URL de acceso al panel de administración: https://quieromesa.com/admin
- URL para nuevos registros: https://quieromesa.com/

Módulos disponibles:
1. RESERVAS (reservations-pro): Gestión completa de reservas online. Configurar en Admin → Reservas
2. MESAS (table-management): Plano del restaurante con gestión de mesas y ubicaciones. Admin → Mesas
3. HORARIOS (schedules): Horarios de apertura, turnos y excepciones. Admin → Horarios
4. CARTA DIGITAL (carta-digital): Menú digital con QR para clientes. Admin → Carta Digital
5. COMANDAS (comandas): Sistema de pedidos internos. Admin → Comandas
6. DEPÓSITOS (deposits): Cobro de fianzas en reservas. Admin → Configuración
7. WHATSAPP PRO: Chatbot y notificaciones automáticas por WhatsApp
8. VALORACIONES (client-ratings): Sistema de valoraciones de clientes

Proceso de configuración inicial (paso a paso):
1. Registro: Ir a https://quieromesa.com/ → Crear cuenta → Elegir plan
2. Información del restaurante: Admin → Configuración → Datos del restaurante (nombre, dirección, teléfono, descripción)
3. Ubicaciones: Admin → Mesas → Ubicaciones → Añadir sala/terraza/barra
4. Mesas: Admin → Mesas → Añadir mesas con capacidad y nombre
5. Horarios: Admin → Horarios → Configurar días y horas de apertura
6. Turnos: Admin → Horarios → Plantillas de turno (comida, cena...)
7. Reservas online: Admin → Configuración → Activar reservas online → Poner el widget en vuestra web

Planes:
- Plan Básico Gratis: Funciones esenciales sin coste
- Plan Gestión de Reservas: Reservas avanzadas + gestión de mesas
- Plan con Carta Digital: Incluye menú digital con QR
- Plan con Fianzas: Incluye cobro de depósitos en reservas
- Plan Completo: Todas las funcionalidades

Instrucciones:
- Responde siempre en español de forma profesional y amable
- Si preguntan cómo configurar algo, da instrucciones concretas paso a paso
- Si preguntan precios, indica que pueden empezar gratis en https://quieromesa.com/
- Si necesitan soporte técnico urgente, indícales que pasarás su consulta a un especialista
- Mantén respuestas claras y estructuradas
- Usa emojis ocasionalmente 🍴`;

const SYSTEM_PROMPT_UNKNOWN = `Eres el asistente virtual de QuieroMesa, una plataforma de reservas de restaurantes en España.
No tengo claro si la persona es un cliente o un restaurante.

Tu primera respuesta debe ser:
"¡Hola! Soy el asistente de QuieroMesa 😊 ¿Cómo puedo ayudarte?
👤 ¿Eres cliente y quieres hacer una reserva en un restaurante?
🍴 ¿O tienes un restaurante y quieres conocer/usar nuestros servicios?"

Responde siempre en español y de forma amable.`;

export function getSystemPrompt(userType: UserType): string {
  switch (userType) {
    case 'customer': return SYSTEM_PROMPT_CUSTOMER;
    case 'restaurant_owner': return SYSTEM_PROMPT_OWNER;
    default: return SYSTEM_PROMPT_UNKNOWN;
  }
}

export async function generateChatbotResponse(
  userType: UserType,
  conversationHistory: ChatMessage[],
  newMessage: string
): Promise<string> {
  const openAiKey = (process as any).env?.OPENAI_API_KEY as string | undefined;

  if (!openAiKey) {
    console.error('[Chatbot] ❌ OPENAI_API_KEY no configurada en .env');
    return 'Lo siento, el servicio de IA no está configurado. Por favor contacta con el administrador.';
  }

  const systemPrompt = getSystemPrompt(userType);

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: newMessage },
  ];

  console.log(`[Chatbot] 🤖 Generando respuesta OpenAI para tipo: ${userType}, mensajes: ${messages.length}`);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Chatbot] ❌ Error OpenAI ${response.status}: ${errorText}`);
      return 'Lo siento, no puedo procesar tu consulta en este momento. Un especialista te atenderá pronto.';
    }

    const data = await response.json() as any;
    const result = data?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!result) {
      console.error('[Chatbot] ❌ Respuesta vacía de OpenAI');
      return 'Un momento, déjame verificar esa información para ti.';
    }

    console.log(`[Chatbot] ✅ Respuesta generada (${result.length} chars)`);
    return result;
  } catch (error: any) {
    console.error('[Chatbot] ❌ Error llamando a OpenAI:', error.message);
    return 'Lo siento, ha ocurrido un error. Un especialista se pondrá en contacto contigo pronto.';
  }
}

export function shouldDeriveToHuman(message: string, aiResponseCount: number): boolean {
  const deriveKeywords = [
    'queja', 'reclamación', 'urgente', 'problema grave', 'denunciar',
    'devolución', 'reembolso', 'no funciona', 'error en mi reserva',
    'hablar con persona', 'hablar con humano', 'agente humano',
  ];

  const lower = message.toLowerCase();
  const hasComplexKeyword = deriveKeywords.some(k => lower.includes(k));
  const tooManyMessages = aiResponseCount >= 10;

  return hasComplexKeyword || tooManyMessages;
}
