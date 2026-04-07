import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT,
});

async function addIndividualRatingsSystem() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('📋 Creando tabla de valoraciones individuales...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_ratings (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        reservation_id TEXT NOT NULL,
        rating_average REAL DEFAULT 4.0,
        ratings JSONB NOT NULL,
        was_no_show BOOLEAN DEFAULT false,
        auto_rated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
      );
    `);

    console.log('📋 Creando índices para client_ratings...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_ratings_restaurant 
      ON client_ratings(restaurant_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_ratings_client 
      ON client_ratings(client_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_ratings_reservation 
      ON client_ratings(reservation_id);
    `);

    console.log('📋 Añadiendo columna local_rating en clients...');
    await client.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS local_ratings JSONB DEFAULT '{}';
    `);

    console.log('📋 Añadiendo columna rating_deadline en reservations...');
    await client.query(`
      ALTER TABLE reservations
      ADD COLUMN IF NOT EXISTS rating_deadline TIMESTAMP;
    `);

    console.log('📋 Migrando valoraciones existentes a la nueva tabla...');
    const existingRatings = await client.query(`
      SELECT id, restaurant_id, client_id, client_ratings, was_no_show, created_at
      FROM reservations
      WHERE client_rated = true AND client_ratings IS NOT NULL
    `);

    for (const row of existingRatings.rows) {
      const ratingId = `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const ratings = typeof row.client_ratings === 'string' 
        ? JSON.parse(row.client_ratings) 
        : row.client_ratings;
      
      const criteriaValues = Object.values(ratings);
      const ratingAverage = criteriaValues.length > 0
        ? criteriaValues.reduce((sum: number, val: any) => sum + Number(val), 0) / criteriaValues.length
        : 4.0;

      await client.query(`
        INSERT INTO client_ratings (
          id, restaurant_id, client_id, reservation_id, 
          rating_average, ratings, was_no_show, auto_rated, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        ratingId,
        row.restaurant_id,
        row.client_id,
        row.id,
        ratingAverage,
        JSON.stringify(ratings),
        row.was_no_show || false,
        false,
        row.created_at
      ]);
    }

    console.log(`✅ Migradas ${existingRatings.rows.length} valoraciones existentes`);

    console.log('📋 Actualizando rating_deadline para reservas completadas sin valorar...');
    await client.query(`
      UPDATE reservations
      SET rating_deadline = created_at + INTERVAL '24 hours'
      WHERE status = 'completed' 
        AND client_rated = false
        AND rating_deadline IS NULL
    `);

    await client.query('COMMIT');
    console.log('✅ Sistema de valoraciones individuales creado exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addIndividualRatingsSystem();
