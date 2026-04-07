import { getPoolInstance } from '../trpc/create-context';

async function addAdminSubadminsAndAudit() {
  const pool = getPoolInstance();

  console.log('🔄 Creando tablas sub_admin_users y admin_audit_log...');

  try {
    await pool.query(`
      ALTER TABLE admin_users 
      ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `);
    console.log('✅ Columnas añadidas a admin_users');

    await pool.query(`
      UPDATE admin_users SET is_superadmin = true WHERE is_superadmin IS NULL
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sub_admin_users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        permissions JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT true,
        last_ip VARCHAR(255),
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla sub_admin_users creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id VARCHAR(255) PRIMARY KEY,
        admin_id VARCHAR(255) NOT NULL,
        admin_type VARCHAR(50) NOT NULL,
        admin_name VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(255),
        entity_name VARCHAR(255),
        details JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla admin_audit_log creada');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_support_tokens (
        id VARCHAR(255) PRIMARY KEY,
        admin_id VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255),
        restaurant_id VARCHAR(255) NOT NULL,
        restaurant_name VARCHAR(255),
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla admin_support_tokens creada');

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addAdminSubadminsAndAudit().catch(console.error);
