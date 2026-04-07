import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });

async function addNoShowRules() {
  console.log('🔵 Creando tabla de reglas de no shows...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS no_show_rules (
        id TEXT PRIMARY KEY,
        no_show_count INTEGER NOT NULL,
        block_days INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabla no_show_rules creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_no_shows (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        reservation_id TEXT NOT NULL,
        reservation_token TEXT,
        restaurant_name TEXT,
        reservation_date TEXT,
        reservation_time TEXT,
        guest_count INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deactivated_at TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tabla client_no_shows creada');

    console.log('✅ Todas las tablas de no shows creadas correctamente');
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
}

addNoShowRules()
  .then(() => {
    console.log('✅ Migraciones completadas');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en las migraciones:', error);
    process.exit(1);
  });
