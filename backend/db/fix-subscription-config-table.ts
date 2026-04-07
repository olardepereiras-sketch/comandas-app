import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '..', 'env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      acc[key.trim()] = valueParts.join('=').trim();
    }
    return acc;
  }, {} as Record<string, string>);
  
  Object.assign(process.env, envVars);
} catch (error) {
  console.log('⚠️ No se pudo cargar el archivo env:', error);
}

import pg from 'pg';
const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL no está definida en las variables de entorno');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function fixSubscriptionConfig() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  try {
    // Verificar si la tabla existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscription_config'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('📋 Creando tabla subscription_config...');
      await pool.query(`
        CREATE TABLE subscription_config (
          id INTEGER PRIMARY KEY DEFAULT 1,
          expiry_alert_days INTEGER NOT NULL DEFAULT 15,
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT single_row CHECK (id = 1)
        );
      `);
      console.log('✅ Tabla subscription_config creada');
      
      // Insertar configuración por defecto
      await pool.query(`
        INSERT INTO subscription_config (id, expiry_alert_days) 
        VALUES (1, 15)
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Configuración inicial insertada');
    } else {
      console.log('✅ La tabla subscription_config ya existe');
      
      // Verificar si la columna existe
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_config' 
        AND column_name = 'expiry_alert_days';
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('📋 Agregando columna expiry_alert_days...');
        await pool.query(`
          ALTER TABLE subscription_config 
          ADD COLUMN expiry_alert_days INTEGER NOT NULL DEFAULT 15;
        `);
        console.log('✅ Columna expiry_alert_days agregada');
      } else {
        console.log('✅ La columna expiry_alert_days ya existe');
      }
      
      // Verificar si existe una fila de configuración
      const configCheck = await pool.query('SELECT * FROM subscription_config WHERE id = 1');
      
      if (configCheck.rows.length === 0) {
        console.log('📋 Insertando configuración inicial...');
        await pool.query(`
          INSERT INTO subscription_config (id, expiry_alert_days) 
          VALUES (1, 15);
        `);
        console.log('✅ Configuración inicial insertada');
      } else {
        console.log('✅ Configuración ya existe');
      }
    }
    
    console.log('✅ Sistema de configuración de suscripciones listo');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixSubscriptionConfig();
