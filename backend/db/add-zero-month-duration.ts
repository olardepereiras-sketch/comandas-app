import { Pool } from 'pg';

console.log('🔧 Agregando duración de suscripción de 0 meses...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addZeroMonthDuration() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    const durationId = `duration-${Date.now()}-zero`;
    const now = new Date();

    console.log('🔄 Insertando duración de 0 meses...');
    await client.query(
      `INSERT INTO subscription_durations 
       (id, name, months, description, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        durationId,
        'Suscripción Caducada',
        0,
        'Duración de 0 meses para marcar suscripciones como caducadas',
        true,
        now,
        now,
      ]
    );
    
    console.log('✅ Duración de 0 meses agregada exitosamente');
    console.log('  📋 Nombre: Suscripción Caducada');
    console.log('  ⏱️  Meses: 0');
    console.log('  🆔 ID:', durationId);

  } catch (error) {
    console.error('❌ Error al agregar duración:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addZeroMonthDuration();
