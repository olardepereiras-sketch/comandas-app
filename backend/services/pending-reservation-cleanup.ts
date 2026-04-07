import type { Pool } from 'pg';

export class PendingReservationCleanup {
  private pool: Pool;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isCleaningExpiredReservations = false;
  private isCleaningNewUsers = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async cleanupExpiredReservations() {
    if (this.isCleaningExpiredReservations) {
      return 0;
    }

    this.isCleaningExpiredReservations = true;

    try {

      const expiredReservations = await this.pool.query(
        `SELECT id, client_id, client_name, date, time, pending_expires_at
         FROM reservations 
         WHERE status = 'pending' 
         AND pending_expires_at IS NOT NULL
         AND pending_expires_at < (NOW() AT TIME ZONE 'UTC') - INTERVAL '5 minutes'`
      );

      if (expiredReservations.rows.length > 0) {
        console.log(`🗑️ [CLEANUP] Encontradas ${expiredReservations.rows.length} reservas pendientes expiradas para BORRAR:`);
        
        for (const reservation of expiredReservations.rows) {
          const time = typeof reservation.time === 'string' ? JSON.parse(reservation.time) : reservation.time;
          console.log(`  - Borrando reserva ${reservation.id} (${reservation.client_name}) - ${reservation.date} ${time.hour}:${time.minute}`);
          
          await this.pool.query(
            'DELETE FROM reservations WHERE id = $1',
            [reservation.id]
          );
        }
        
        console.log(`✅ [CLEANUP] ${expiredReservations.rows.length} reservas pendientes borradas`);
      } else {
        console.log('✅ [CLEANUP] No hay reservas pendientes expiradas para limpiar');
      }

      return expiredReservations.rows.length;
    } catch (error: any) {
      console.error('❌ [CLEANUP] Error limpiando reservas pendientes:', error.message);
      return 0;
    } finally {
      this.isCleaningExpiredReservations = false;
    }
  }

  async cleanupNewUsersWithExpiredReservations() {
    if (this.isCleaningNewUsers) {
      return 0;
    }

    this.isCleaningNewUsers = true;

    try {

      const usersToDelete = await this.pool.query(
        `SELECT DISTINCT c.id, c.name, c.phone
         FROM clients c
         WHERE c.user_status = 'user_new'
         AND NOT EXISTS (
           SELECT 1 FROM reservations r 
           WHERE r.client_id = c.id 
           AND r.status IN ('confirmed', 'añadida', 'in_progress_added', 'in_progress', 'ratable', 'completed')
         )
         AND NOT EXISTS (
           SELECT 1 FROM reservations r 
           WHERE r.client_id = c.id 
           AND r.status = 'pending'
           AND r.pending_expires_at IS NOT NULL
           AND r.pending_expires_at > (NOW() AT TIME ZONE 'UTC')
         )`
      );

      if (usersToDelete.rows.length > 0) {
        console.log(`🗑️ [CLEANUP NEW USERS] Encontrados ${usersToDelete.rows.length} usuarios nuevos sin reservas confirmadas para eliminar`);
        
        for (const user of usersToDelete.rows) {
          await this.pool.query(
            'DELETE FROM reservations WHERE client_id = $1',
            [user.id]
          );
          
          await this.pool.query(
            'DELETE FROM clients WHERE id = $1',
            [user.id]
          );
          
          console.log(`  ✅ Usuario eliminado: ${user.name} (${user.phone})`);
        }
        
        console.log(`✅ [CLEANUP NEW USERS] ${usersToDelete.rows.length} usuarios nuevos eliminados`);
      } else {
        console.log('✅ [CLEANUP NEW USERS] No hay usuarios nuevos para eliminar');
      }

      return usersToDelete.rows.length;
    } catch (error: any) {
      console.error('❌ [CLEANUP NEW USERS] Error eliminando usuarios nuevos:', error.message);
      return 0;
    } finally {
      this.isCleaningNewUsers = false;
    }
  }

  start(intervalMinutes: number = 3) {
    console.log(`🚀 [CLEANUP] Iniciando worker de limpieza (cada ${intervalMinutes} minuto(s))`);
    
    void this.cleanupExpiredReservations();
    void this.cleanupNewUsersWithExpiredReservations();
    
    this.intervalId = setInterval(() => {
      void this.cleanupExpiredReservations();
      void this.cleanupNewUsersWithExpiredReservations();
    }, intervalMinutes * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 [CLEANUP] Worker de limpieza detenido');
    }
  }
}
