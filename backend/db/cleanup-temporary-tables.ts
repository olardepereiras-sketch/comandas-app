import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reservamesa';

export async function cleanupTemporaryTables(reservationId: string) {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    
    await client.query(
      'DELETE FROM temporary_tables WHERE reservation_id = $1',
      [reservationId]
    );
    
    console.log(`✅ Mesas temporales eliminadas para reserva ${reservationId}`);
    
  } catch (error) {
    console.error('❌ Error limpiando mesas temporales:', error);
  } finally {
    await client.end();
  }
}
