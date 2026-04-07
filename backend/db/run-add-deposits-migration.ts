import { Pool } from 'pg';
import { addDepositsSystem } from './add-deposits-system';
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

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada');
  console.error('💡 Asegúrate de que el archivo env existe en la raíz del proyecto');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración de sistema de fianzas...');
    await addDepositsSystem(pool);
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

runMigration();
