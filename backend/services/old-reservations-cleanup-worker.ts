import { Pool } from 'pg';
import { getPoolInstance } from '../trpc/create-context';

export class OldReservationsCleanupWorker {
  private pool: Pool;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(pool?: Pool) {
    this.pool = pool || getPoolInstance();
  }

  private async ensureStatsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS reservation_stats_monthly (
        id SERIAL PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        total_reservations INTEGER NOT NULL DEFAULT 0,
        cancelled_reservations INTEGER NOT NULL DEFAULT 0,
        no_show_reservations INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(restaurant_id, year, month)
      )
    `);
  }

  private async persistMonthlyStats(cutoffDateStr: string): Promise<void> {
    console.log('📊 [OLD RESERVATIONS CLEANUP] Persistiendo estadísticas mensuales antes de borrar...');
    try {
      await this.ensureStatsTable();

      const statsResult = await this.pool.query(
        `SELECT
           restaurant_id,
           EXTRACT(YEAR FROM date)::INTEGER AS year,
           EXTRACT(MONTH FROM date)::INTEGER AS month,
           COUNT(*) FILTER (WHERE status NOT IN ('modified', 'cancelled', 'no_show')) AS total_reservations,
           COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_reservations,
           COUNT(*) FILTER (WHERE status = 'no_show') AS no_show_reservations
         FROM reservations
         WHERE date < $1
         AND status IN ('completed', 'cancelled', 'modified', 'ratable', 'no_show')
         GROUP BY restaurant_id, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)`,
        [cutoffDateStr]
      );

      for (const row of statsResult.rows) {
        await this.pool.query(
          `INSERT INTO reservation_stats_monthly
             (restaurant_id, year, month, total_reservations, cancelled_reservations, no_show_reservations, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (restaurant_id, year, month) DO UPDATE SET
             total_reservations = reservation_stats_monthly.total_reservations + EXCLUDED.total_reservations,
             cancelled_reservations = reservation_stats_monthly.cancelled_reservations + EXCLUDED.cancelled_reservations,
             no_show_reservations = reservation_stats_monthly.no_show_reservations + EXCLUDED.no_show_reservations,
             updated_at = NOW()`,
          [row.restaurant_id, row.year, row.month, parseInt(row.total_reservations, 10), parseInt(row.cancelled_reservations, 10), parseInt(row.no_show_reservations, 10)]
        );
      }

      console.log(`✅ [OLD RESERVATIONS CLEANUP] Estadísticas de ${statsResult.rows.length} grupos mes/restaurante persistidas`);
    } catch (error) {
      console.error('⚠️ [OLD RESERVATIONS CLEANUP] Error al persistir estadísticas (no crítico):', error);
    }
  }

  async cleanupOldReservations(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ [OLD RESERVATIONS CLEANUP] Ya hay una limpieza en progreso, saltando...');
      return;
    }

    this.isRunning = true;
    console.log('🧹 [OLD RESERVATIONS CLEANUP] Iniciando limpieza de reservas antiguas (>10 días)...');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 10);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      console.log(`📅 [OLD RESERVATIONS CLEANUP] Eliminando reservas anteriores a: ${cutoffDateStr}`);

      // 1. Verificar cuántas reservas se van a borrar antes de proceder
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as total, status
         FROM reservations
         WHERE date < $1
         AND status IN ('completed', 'cancelled', 'modified', 'ratable', 'no_show')
         GROUP BY status`,
        [cutoffDateStr]
      );

      if (countResult.rows.length === 0) {
        console.log('✅ [OLD RESERVATIONS CLEANUP] No hay reservas antiguas para eliminar');
        this.isRunning = false;
        return;
      }

      console.log('📊 [OLD RESERVATIONS CLEANUP] Reservas a eliminar por estado:');
      let totalToDelete = 0;
      countResult.rows.forEach((row: any) => {
        console.log(`   - ${row.status}: ${row.total}`);
        totalToDelete += parseInt(row.total, 10);
      });
      console.log(`   Total: ${totalToDelete} reservas`);

      // 2. Persistir estadísticas mensuales ANTES de borrar
      await this.persistMonthlyStats(cutoffDateStr);

      // 3. IMPORTANTE: Los agregados de valoraciones ya están guardados en la tabla clients.

      // 4. Eliminar reservas antiguas en estados terminales
      //    NO se borran: pending, confirmed, in_progress, in_progress_added, añadida
      const deleteResult = await this.pool.query(
        `DELETE FROM reservations
         WHERE date < $1
         AND status IN ('completed', 'cancelled', 'modified', 'ratable', 'no_show')
         RETURNING id, date, status, client_id, restaurant_id`,
        [cutoffDateStr]
      );

      if (deleteResult.rows.length > 0) {
        console.log(`✅ [OLD RESERVATIONS CLEANUP] Eliminadas ${deleteResult.rows.length} reservas antiguas`);

        // Log resumen por restaurante
        const byRestaurant: Record<string, number> = {};
        deleteResult.rows.forEach((row: any) => {
          byRestaurant[row.restaurant_id] = (byRestaurant[row.restaurant_id] || 0) + 1;
        });
        Object.entries(byRestaurant).forEach(([restaurantId, count]) => {
          console.log(`   - Restaurante ${restaurantId}: ${count} reservas eliminadas`);
        });
      } else {
        console.log('✅ [OLD RESERVATIONS CLEANUP] No se eliminaron reservas');
      }

      // 4. También limpiar registros huérfanos en whatsapp_notifications si existen
      try {
        const wpCleanup = await this.pool.query(
          `DELETE FROM whatsapp_notifications
           WHERE reservation_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM reservations WHERE reservations.id = whatsapp_notifications.reservation_id
           )
           AND created_at < NOW() - INTERVAL '10 days'
           RETURNING id`
        );
        if (wpCleanup.rows.length > 0) {
          console.log(`🧹 [OLD RESERVATIONS CLEANUP] Eliminadas ${wpCleanup.rows.length} notificaciones WhatsApp huérfanas`);
        }
      } catch {
        // La tabla puede no existir, ignorar el error
      }

      // 5. Limpiar entradas antiguas de lista de espera
      try {
        const waitlistCleanup = await this.pool.query(
          `DELETE FROM waitlist
           WHERE date < $1
           AND status IN ('cancelled', 'converted', 'expired')
           RETURNING id`,
          [cutoffDateStr]
        );
        if (waitlistCleanup.rows.length > 0) {
          console.log(`🧹 [OLD RESERVATIONS CLEANUP] Eliminadas ${waitlistCleanup.rows.length} entradas antiguas de lista de espera`);
        }
      } catch {
        // La tabla puede no existir o tener estructura diferente, ignorar
      }

    } catch (error) {
      console.error('❌ [OLD RESERVATIONS CLEANUP] Error en limpieza:', error);
    } finally {
      this.isRunning = false;
    }
  }

  start(intervalHours: number = 24): void {
    console.log(`🚀 [OLD RESERVATIONS CLEANUP] Iniciando worker (cada ${intervalHours} hora(s))`);

    // Ejecutar con delay de 5 minutos al iniciar para no sobrecargar el arranque
    setTimeout(() => {
      void this.cleanupOldReservations();
    }, 5 * 60 * 1000);

    // Configurar intervalo diario
    this.intervalId = setInterval(() => {
      void this.cleanupOldReservations();
    }, intervalHours * 60 * 60 * 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 [OLD RESERVATIONS CLEANUP] Worker detenido');
    }
  }
}
