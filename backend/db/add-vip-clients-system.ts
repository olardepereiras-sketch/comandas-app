import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '..', 'env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.error('⚠️ No se pudo cargar el archivo env:', error);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL no está definida en las variables de entorno');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function addVipClientsSystem() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  try {
    console.log('📋 Agregando campos VIP a la tabla clients...');
    
    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS preferred_table_ids TEXT,
      ADD COLUMN IF NOT EXISTS vip_notes TEXT
    `);
    
    console.log('✅ Campos VIP agregados a clients');
    
    console.log('📋 Creando índice para clientes VIP...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_vip ON clients(is_vip) WHERE is_vip = true
    `);
    
    console.log('✅ Índice de clientes VIP creado');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addVipClientsSystem().catch(console.error);
