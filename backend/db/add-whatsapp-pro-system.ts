import { getPoolInstance } from '../trpc/create-context';

async function addWhatsappProSystem() {
  const pool = getPoolInstance();

  console.log('🔵 [WHATSAPP PRO] Iniciando migración del sistema WhatsApp Pro...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_whatsapp_pro_config (
        id TEXT PRIMARY KEY DEFAULT 'main',
        provider TEXT DEFAULT 'twilio',
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
    console.log('✅ [WHATSAPP PRO] Tabla admin_whatsapp_pro_config creada/verificada');

    await pool.query(`
      INSERT INTO admin_whatsapp_pro_config (id) VALUES ('main')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ [WHATSAPP PRO] Registro inicial creado');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_credit_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_without_vat DECIMAL(10,2) NOT NULL DEFAULT 0,
        sends_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ [WHATSAPP PRO] Tabla whatsapp_credit_plans creada/verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_credit_history (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        credits_added INTEGER NOT NULL DEFAULT 0,
        plan_id TEXT,
        plan_name TEXT,
        recharge_type TEXT DEFAULT 'manual',
        amount_paid DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ [WHATSAPP PRO] Tabla whatsapp_credit_history creada/verificada');

    await pool.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_type TEXT DEFAULT 'free'`);
    await pool.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_pro_credits INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_pro_alert_threshold INTEGER DEFAULT 0`);
    console.log('✅ [WHATSAPP PRO] Columnas añadidas a restaurants');

    console.log('✅ [WHATSAPP PRO] Migración completada correctamente');
  } catch (error: any) {
    console.error('❌ [WHATSAPP PRO] Error en migración:', error.message);
    throw error;
  }
}

addWhatsappProSystem()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
