import { Pool } from 'pg';

export class WaitlistWorker {
  private pool: Pool;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  start(intervalMinutes: number = 1) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Waitlist Worker] 🚀 Iniciando worker de lista de espera...');

    this.intervalId = setInterval(async () => {
      await this.processWaitlist();
    }, intervalMinutes * 60 * 1000);

    setTimeout(() => this.processWaitlist(), 5000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Waitlist Worker] ⏹️ Worker detenido');
  }

  private async processWaitlist() {
    try {
      const now = new Date();

      // 1. Expire pending_confirmation entries that passed their deadline
      const expiredPendingResult = await this.pool.query(
        `UPDATE waitlist SET status = 'expired'
         WHERE status = 'pending_confirmation'
           AND pending_expires_at IS NOT NULL
           AND pending_expires_at < $1
         RETURNING id`,
        [now]
      );
      if ((expiredPendingResult.rowCount || 0) > 0) {
        console.log(`[Waitlist Worker] ⏰ ${expiredPendingResult.rowCount} solicitudes pendientes expiradas por timeout`);
      }

      // 2. Expire waiting entries whose date has passed
      const todayStr = now.toISOString().split('T')[0];
      const expiredByDateResult = await this.pool.query(
        `UPDATE waitlist SET status = 'expired'
         WHERE status IN ('waiting', 'pending_confirmation')
           AND date < $1
         RETURNING id`,
        [todayStr]
      );
      if ((expiredByDateResult.rowCount || 0) > 0) {
        console.log(`[Waitlist Worker] 🗓️ ${expiredByDateResult.rowCount} entradas expiradas por fecha pasada`);
      }

    } catch (error) {
      console.error('[Waitlist Worker] ❌ Error procesando lista de espera:', error);
    }
  }

  async notifyWaitlistForRestaurantDate(restaurantId: string, date: string, _useWhatsAppWeb: boolean, _notificationPhones: string[], _restaurantName: string) {
    try {
      console.log(`[Waitlist Worker] 🔔 Verificando lista de espera para ${restaurantId} en ${date}`);

      const waitlistResult = await this.pool.query(
        `SELECT w.*, r.name as restaurant_name, r.slug as restaurant_slug, r.use_whatsapp_web
         FROM waitlist w
         JOIN restaurants r ON r.id = w.restaurant_id
         WHERE w.restaurant_id = $1 AND w.date = $2 AND w.status = 'waiting'
         ORDER BY COALESCE(w.confirmed_at, w.created_at) ASC`,
        [restaurantId, date]
      );

      if (waitlistResult.rows.length === 0) {
        console.log(`[Waitlist Worker] ℹ️ No hay entradas en lista de espera para ${restaurantId} ${date}`);
        return;
      }

      console.log(`[Waitlist Worker] 📋 ${waitlistResult.rows.length} entradas en lista de espera para ${restaurantId} ${date}`);
    } catch (error) {
      console.error('[Waitlist Worker] ❌ Error notificando lista de espera:', error);
    }
  }
}

let workerInstance: WaitlistWorker | null = null;

export function startWaitlistWorker(pool: Pool) {
  if (!workerInstance) {
    workerInstance = new WaitlistWorker(pool);
    workerInstance.start(1);
  }
  return workerInstance;
}

export function stopWaitlistWorker() {
  if (workerInstance) {
    workerInstance.stop();
    workerInstance = null;
  }
}
