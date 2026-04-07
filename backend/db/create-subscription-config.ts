#!/usr/bin/env bun
import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const envPath = join(process.cwd(), '..', 'env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
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

const pool = new pg.Pool({
  connectionString: databaseUrl,
});

async function createSubscriptionConfigTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Conectando a PostgreSQL...');
    
    console.log('📋 Creando tabla subscription_config...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_config (
        id SERIAL PRIMARY KEY,
        stripe_enabled BOOLEAN DEFAULT FALSE,
        stripe_public_key TEXT,
        stripe_secret_key TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla subscription_config creada');

    console.log('📋 Insertando configuración inicial...');
    const result = await client.query('SELECT COUNT(*) as count FROM subscription_config');
    if (parseInt(result.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO subscription_config (stripe_enabled, stripe_public_key, stripe_secret_key)
        VALUES (FALSE, NULL, NULL);
      `);
      console.log('✅ Configuración inicial insertada');
    } else {
      console.log('ℹ️ Ya existe configuración inicial');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSubscriptionConfigTable()
  .then(() => {
    console.log('✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el proceso:', error);
    process.exit(1);
  });
