import { Pool } from 'pg';

console.log('🔧 REPARANDO ESQUEMA DESPUÉS DE RESET');
console.log('=====================================\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL\n');

    // ============================================
    // 1. SUBSCRIPTION_PLANS - columnas faltantes
    // ============================================
    console.log('📋 [1/8] Reparando tabla subscription_plans...');
    await client.query(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true`);
    await client.query(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
    console.log('  ✅ subscription_plans reparada');

    // ============================================
    // 2. SUBSCRIPTION_DURATIONS - columnas faltantes
    // ============================================
    console.log('📋 [2/8] Reparando tabla subscription_durations...');
    await client.query(`ALTER TABLE subscription_durations ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true`);
    console.log('  ✅ subscription_durations reparada');

    // ============================================
    // 3. RESTAURANTS - columnas faltantes
    // ============================================
    console.log('📋 [3/8] Reparando tabla restaurants...');
    await client.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS notification_phones TEXT`);
    await client.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS notification_email TEXT`);
    await client.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS auto_send_whatsapp BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS sales_rep_id TEXT`);
    console.log('  ✅ restaurants reparada');

    // ============================================
    // 4. CLIENTS - columnas faltantes
    // ============================================
    console.log('📋 [4/8] Reparando tabla clients...');
    await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'user_new'`);
    await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_user_status ON clients(user_status)`);
    console.log('  ✅ clients reparada');

    // ============================================
    // 5. RESERVATIONS - columnas faltantes
    // ============================================
    console.log('📋 [5/8] Reparando tabla reservations...');
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS location_name TEXT DEFAULT ''`);
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT ''`);
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT ''`);
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS client_email TEXT DEFAULT ''`);
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS client_notes TEXT DEFAULT ''`);
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_token2 TEXT`);
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS pending_expires_at TIMESTAMP`);
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_new_client BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rating_deadline TIMESTAMP`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reservations_pending_expires ON reservations(pending_expires_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_token2 ON reservations(confirmation_token2)`);
    console.log('  ✅ reservations reparada');

    // ============================================
    // 6. SALES_REPRESENTATIVES - tabla completa
    // ============================================
    console.log('📋 [6/8] Creando tabla sales_representatives...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_representatives (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        dni TEXT NOT NULL UNIQUE,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        new_client_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        first_renewal_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        renewal_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Add FK if not exists
    try {
      await client.query(`
        ALTER TABLE restaurants 
        ADD CONSTRAINT fk_restaurants_sales_rep 
        FOREIGN KEY (sales_rep_id) REFERENCES sales_representatives(id)
      `);
    } catch (e: any) {
      if (e.code !== '42710') {
        console.log('  ℹ️ FK sales_rep ya existe o no se pudo crear');
      }
    }

    // Insert default sales reps
    await client.query(`
      INSERT INTO sales_representatives (id, first_name, last_name, dni, address, phone, email, 
        new_client_commission_percent, first_renewal_commission_percent, renewal_commission_percent, is_active)
      VALUES 
        ('salesrep-website', 'Página', 'Web', '00000000A', 'Online', '+34000000000', 'web@quieromesa.com', 0, 0, 0, true),
        ('salesrep-marcos', 'Marcos', 'Antonio', '00000001A', 'Galicia', '+34666088708', 'marcos@quieromesa.com', 10, 5, 3, true)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  ✅ sales_representatives creada con datos iniciales');

    // ============================================
    // 7. ADMIN_USERS - recrear admin por defecto
    // ============================================
    console.log('📋 [7/8] Verificando admin users...');
    const adminCheck = await client.query('SELECT COUNT(*) as count FROM admin_users');
    if (parseInt(adminCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO admin_users (id, username, password, email, created_at, updated_at)
        VALUES ('admin-1', 'admin', 'admin123', 'admin@quieromesa.com', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('  ✅ Admin por defecto creado (admin/admin123)');
    } else {
      console.log('  ✅ Admin users ya existe');
    }

    // ============================================
    // 8. VERIFICACIÓN FINAL
    // ============================================
    console.log('\n📋 [8/8] Verificación final de columnas...');
    
    const verifyColumns = async (table: string, columns: string[]) => {
      const result = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      const existingCols = result.rows.map((r: any) => r.column_name);
      const missing = columns.filter(c => !existingCols.includes(c));
      if (missing.length > 0) {
        console.log(`  ❌ ${table}: faltan columnas: ${missing.join(', ')}`);
      } else {
        console.log(`  ✅ ${table}: todas las columnas OK (${existingCols.length} columnas)`);
      }
    };

    await verifyColumns('subscription_plans', ['id', 'name', 'price', 'enabled_modules', 'is_active', 'is_visible', 'created_at', 'updated_at']);
    await verifyColumns('subscription_durations', ['id', 'name', 'months', 'description', 'is_active', 'is_visible', 'created_at', 'updated_at']);
    await verifyColumns('restaurants', ['id', 'name', 'notification_phones', 'notification_email', 'auto_send_whatsapp', 'enable_email_notifications', 'important_message_enabled', 'important_message', 'sales_rep_id']);
    await verifyColumns('clients', ['id', 'name', 'user_status', 'updated_at']);
    await verifyColumns('reservations', ['id', 'client_phone', 'client_name', 'client_email', 'client_notes', 'confirmation_token2', 'pending_expires_at', 'is_new_client', 'rating_deadline']);
    await verifyColumns('sales_representatives', ['id', 'first_name', 'last_name', 'dni']);

    console.log('\n🎉 ESQUEMA REPARADO COMPLETAMENTE');
    console.log('\n⚠️  NOTA: Los datos de restaurantes se perdieron al ejecutar init-complete-schema-fixed.ts');
    console.log('   Deberás recrear los restaurantes desde el panel admin.');

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
