import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '..', 'env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
} catch (error) {
  console.log('⚠️ No se pudo cargar el archivo env:', error);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no está definida en las variables de entorno');
  process.exit(1);
}

const sql = postgres(databaseUrl);

async function addExpiryAlertColumn() {
  try {
    console.log('🔗 Conectando a PostgreSQL...');
    
    console.log('📋 Verificando columna last_expiry_alert_sent...');
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name = 'last_expiry_alert_sent'
    `;

    if (checkColumn.length === 0) {
      console.log('📋 Agregando columna last_expiry_alert_sent a restaurants...');
      await sql`
        ALTER TABLE restaurants 
        ADD COLUMN last_expiry_alert_sent TIMESTAMP
      `;
      console.log('✅ Columna last_expiry_alert_sent agregada');
    } else {
      console.log('✅ Columna last_expiry_alert_sent ya existe');
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

addExpiryAlertColumn();
