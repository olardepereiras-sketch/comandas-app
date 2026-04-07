import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), 'env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
  console.log('✅ Variables cargadas desde env');
} catch (error) {
  console.log('⚠️ No se pudo cargar el archivo env:', error);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida en las variables de entorno');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addAdminStripeConfig() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  const client = await pool.connect();
  
  try {
    console.log('📋 Creando tabla de configuración de Stripe para Admin...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_stripe_config (
        id VARCHAR(255) PRIMARY KEY DEFAULT 'admin-stripe-config',
        stripe_secret_key TEXT,
        stripe_publishable_key TEXT,
        stripe_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      INSERT INTO admin_stripe_config (id, stripe_enabled)
      VALUES ('admin-stripe-config', FALSE)
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('✅ Tabla admin_stripe_config creada');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addAdminStripeConfig().catch(console.error);