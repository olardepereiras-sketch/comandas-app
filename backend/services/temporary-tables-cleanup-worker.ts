import { Pool } from 'pg';
import { getPoolInstance } from '../trpc/create-context';

export class TemporaryTablesCleanupWorker {
  private pool: Pool;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(pool?: Pool) {
    this.pool = pool || getPoolInstance();
  }

  async cleanupTemporaryTables(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ [TEMP TABLES CLEANUP] Ya hay una limpieza en progreso, saltando...');
      return;
    }

    this.isRunning = true;
    console.log('🧹 [TEMP TABLES CLEANUP] Iniciando limpieza de mesas temporales antiguas...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // 1. Primero, verificar si hay mesas temporales con reservas activas que no debemos eliminar
      const tablesWithReservationsResult = await this.pool.query(
        `SELECT DISTINCT t.id 
         FROM tables t
         INNER JOIN reservations r ON r.table_ids::jsonb ? t.id
         WHERE t.is_temporary = TRUE 
         AND t.shift_date < $1
         AND r.status IN ('pending', 'confirmed', 'in_progress')`,
        [todayStr]
      );

      const tablesWithReservations = tablesWithReservationsResult.rows.map((r: any) => r.id);
      console.log(`📋 [TEMP TABLES CLEANUP] Mesas temporales antiguas con reservas activas: ${tablesWithReservations.length}`);

      // 2. Encontrar mesas temporales de días anteriores SIN reservas activas
      let deleteQuery = `
        DELETE FROM tables 
        WHERE is_temporary = TRUE 
        AND shift_date < $1
        AND shift_date IS NOT NULL`;
      
      const params: any[] = [todayStr];
      
      if (tablesWithReservations.length > 0) {
        const placeholders = tablesWithReservations.map((_: any, i: number) => `$${i + 2}`).join(', ');
        deleteQuery += ` AND id NOT IN (${placeholders})`;
        params.push(...tablesWithReservations);
      }

      deleteQuery += ' RETURNING id, name, shift_date';

      const deleteResult = await this.pool.query(deleteQuery, params);
      
      if (deleteResult.rows.length > 0) {
        console.log(`✅ [TEMP TABLES CLEANUP] Eliminadas ${deleteResult.rows.length} mesas temporales antiguas:`);
        deleteResult.rows.forEach((row: any) => {
          console.log(`   - ${row.name} (${row.id}) del ${row.shift_date}`);
        });
      } else {
        console.log('✅ [TEMP TABLES CLEANUP] No hay mesas temporales antiguas para eliminar');
      }

      // 3. Limpiar bloqueos asociados a mesas divididas que ya no existen
      const cleanupBlocksResult = await this.pool.query(
        `DELETE FROM table_blocks 
         WHERE id LIKE 'block-split-%' 
         AND end_time < NOW()
         RETURNING id`
      );

      if (cleanupBlocksResult.rows.length > 0) {
        console.log(`✅ [TEMP TABLES CLEANUP] Eliminados ${cleanupBlocksResult.rows.length} bloqueos de división expirados`);
      }

      // 4. También limpiar bloqueos de agrupación expirados
      const cleanupGroupBlocksResult = await this.pool.query(
        `DELETE FROM table_blocks 
         WHERE id LIKE 'block-group-%' 
         AND end_time < NOW()
         RETURNING id`
      );

      if (cleanupGroupBlocksResult.rows.length > 0) {
        console.log(`✅ [TEMP TABLES CLEANUP] Eliminados ${cleanupGroupBlocksResult.rows.length} bloqueos de agrupación expirados`);
      }

    } catch (error) {
      console.error('❌ [TEMP TABLES CLEANUP] Error en limpieza:', error);
    } finally {
      this.isRunning = false;
    }
  }

  start(intervalMinutes: number = 60): void {
    console.log(`🚀 [TEMP TABLES CLEANUP] Iniciando worker (cada ${intervalMinutes} minuto(s))`);
    
    // Ejecutar inmediatamente al iniciar
    this.cleanupTemporaryTables();
    
    // Configurar intervalo
    this.intervalId = setInterval(() => {
      this.cleanupTemporaryTables();
    }, intervalMinutes * 60 * 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 [TEMP TABLES CLEANUP] Worker detenido');
    }
  }
}

let workerInstance: TemporaryTablesCleanupWorker | null = null;

export function startTemporaryTablesCleanupWorker(pool?: Pool): TemporaryTablesCleanupWorker {
  if (!workerInstance) {
    workerInstance = new TemporaryTablesCleanupWorker(pool);
    workerInstance.start(60); // Ejecutar cada hora
  }
  return workerInstance;
}

export function stopTemporaryTablesCleanupWorker(): void {
  if (workerInstance) {
    workerInstance.stop();
    workerInstance = null;
  }
}
