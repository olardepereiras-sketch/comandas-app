import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testDeleteClient(clientId: string) {
  console.log('════════════════════════════════════════════════════════');
  console.log('🧪 TEST: Eliminando cliente manualmente');
  console.log('Cliente ID:', clientId);
  console.log('════════════════════════════════════════════════════════');

  try {
    const clientCheck = await pool.query(
      'SELECT id, name, phone FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientCheck.rows.length === 0) {
      console.log('❌ Cliente no encontrado');
      return;
    }

    console.log('✅ Cliente encontrado:', clientCheck.rows[0]);

    console.log('\n📋 Eliminando no_shows...');
    const noShowsResult = await pool.query(
      'DELETE FROM client_no_shows WHERE client_id = $1 RETURNING *',
      [clientId]
    );
    console.log(`✅ No_shows eliminados: ${noShowsResult.rowCount}`);

    console.log('\n📋 Eliminando ratings...');
    const ratingsResult = await pool.query(
      'DELETE FROM client_ratings WHERE client_id = $1 RETURNING *',
      [clientId]
    );
    console.log(`✅ Ratings eliminados: ${ratingsResult.rowCount}`);

    console.log('\n📋 Eliminando reservas...');
    const reservationsResult = await pool.query(
      'DELETE FROM reservations WHERE client_id = $1 RETURNING *',
      [clientId]
    );
    console.log(`✅ Reservas eliminadas: ${reservationsResult.rowCount}`);

    console.log('\n📋 Eliminando cliente...');
    const clientResult = await pool.query(
      'DELETE FROM clients WHERE id = $1 RETURNING *',
      [clientId]
    );
    console.log(`✅ Cliente eliminado: ${clientResult.rowCount}`);

    console.log('\n════════════════════════════════════════════════════════');
    console.log('✅ OPERACIÓN COMPLETADA EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════');
  } catch (error) {
    console.log('════════════════════════════════════════════════════════');
    console.log('❌ ERROR');
    console.error(error);
    console.log('════════════════════════════════════════════════════════');
  }
}

async function testCancelReservation(reservationId: string, reason?: string) {
  console.log('════════════════════════════════════════════════════════');
  console.log('🧪 TEST: Anulando reserva manualmente');
  console.log('Reserva ID:', reservationId);
  console.log('Motivo:', reason || 'Sin motivo especificado');
  console.log('════════════════════════════════════════════════════════');

  try {
    const reservation = await pool.query(
      'SELECT * FROM reservations WHERE id = $1',
      [reservationId]
    );

    if (reservation.rows.length === 0) {
      console.log('❌ Reserva no encontrada');
      return;
    }

    const reservationData = reservation.rows[0];
    console.log('✅ Reserva encontrada:', {
      id: reservationData.id,
      status: reservationData.status,
      client_id: reservationData.client_id,
      date: reservationData.date,
    });

    console.log('\n📋 Actualizando estado a cancelled...');
    const updateResult = await pool.query(
      `UPDATE reservations 
       SET status = $1, notes = $2, updated_at = $3, cancelled_by = $4
       WHERE id = $5
       RETURNING *`,
      [
        'cancelled',
        reason ? `Anulada: ${reason}` : 'Reserva anulada manualmente',
        new Date(),
        'restaurant',
        reservationId,
      ]
    );
    console.log('✅ Reserva actualizada:', updateResult.rowCount, 'registros');

    console.log('\n════════════════════════════════════════════════════════');
    console.log('✅ OPERACIÓN COMPLETADA EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════');
  } catch (error) {
    console.log('════════════════════════════════════════════════════════');
    console.log('❌ ERROR');
    console.error(error);
    console.log('════════════════════════════════════════════════════════');
  }
}

async function listClients() {
  console.log('════════════════════════════════════════════════════════');
  console.log('📋 Listado de Clientes');
  console.log('════════════════════════════════════════════════════════');

  try {
    const result = await pool.query(
      'SELECT id, name, phone, email FROM clients ORDER BY created_at DESC'
    );

    console.log(`\n✅ ${result.rows.length} clientes encontrados:\n`);
    result.rows.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name}`);
      console.log(`   ID: ${client.id}`);
      console.log(`   Teléfono: ${client.phone}`);
      console.log(`   Email: ${client.email}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function listReservations() {
  console.log('════════════════════════════════════════════════════════');
  console.log('📋 Listado de Reservas');
  console.log('════════════════════════════════════════════════════════');

  try {
    const result = await pool.query(`
      SELECT r.id, r.status, r.date, r.time, c.name as client_name, res.name as restaurant_name
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      JOIN restaurants res ON r.restaurant_id = res.id
      WHERE r.status != 'cancelled'
      ORDER BY r.date DESC, r.time DESC
      LIMIT 20
    `);

    console.log(`\n✅ ${result.rows.length} reservas activas encontradas:\n`);
    result.rows.forEach((reservation, index) => {
      const timeData = typeof reservation.time === 'string' 
        ? JSON.parse(reservation.time) 
        : reservation.time;
      const timeString = `${String(timeData.hour).padStart(2, '0')}:${String(timeData.minute).padStart(2, '0')}`;
      
      console.log(`${index + 1}. ${reservation.client_name} - ${reservation.restaurant_name}`);
      console.log(`   ID: ${reservation.id}`);
      console.log(`   Fecha: ${new Date(reservation.date).toLocaleDateString('es-ES')}`);
      console.log(`   Hora: ${timeString}`);
      console.log(`   Estado: ${reservation.status}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

const command = process.argv[2];
const id = process.argv[3];
const extra = process.argv[4];

(async () => {
  try {
    switch (command) {
      case 'list-clients':
        await listClients();
        break;
      case 'list-reservations':
        await listReservations();
        break;
      case 'delete-client':
        if (!id) {
          console.log('❌ Error: Debes proporcionar el ID del cliente');
          console.log('Uso: bun backend/test-manual-operations.ts delete-client <clientId>');
          process.exit(1);
        }
        await testDeleteClient(id);
        break;
      case 'cancel-reservation':
        if (!id) {
          console.log('❌ Error: Debes proporcionar el ID de la reserva');
          console.log('Uso: bun backend/test-manual-operations.ts cancel-reservation <reservationId> [motivo]');
          process.exit(1);
        }
        await testCancelReservation(id, extra);
        break;
      default:
        console.log('════════════════════════════════════════════════════════');
        console.log('🧪 Script de Pruebas Manuales');
        console.log('════════════════════════════════════════════════════════');
        console.log('\nComandos disponibles:\n');
        console.log('  list-clients');
        console.log('    Lista todos los clientes en la base de datos');
        console.log('');
        console.log('  list-reservations');
        console.log('    Lista las reservas activas');
        console.log('');
        console.log('  delete-client <clientId>');
        console.log('    Elimina un cliente y todos sus datos relacionados');
        console.log('');
        console.log('  cancel-reservation <reservationId> [motivo]');
        console.log('    Anula una reserva');
        console.log('');
        console.log('Ejemplos:');
        console.log('  bun backend/test-manual-operations.ts list-clients');
        console.log('  bun backend/test-manual-operations.ts delete-client client-123456');
        console.log('  bun backend/test-manual-operations.ts cancel-reservation res-123456 "Cliente canceló"');
        console.log('════════════════════════════════════════════════════════');
    }
  } catch (error) {
    console.error('❌ Error fatal:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
