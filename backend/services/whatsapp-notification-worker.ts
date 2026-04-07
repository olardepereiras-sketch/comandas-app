import { Pool } from 'pg';
import { sendWhatsAppViaRestaurant, initializeWhatsAppForRestaurant, getSessionStatus, getSessionPath } from './whatsapp-web-manager';
import { sendRestaurantEmailNotification } from './email';
import { sendWhatsAppViaCloudApi, getCloudApiConfigFromDb, deductWhatsAppCredit } from './whatsapp-cloud-api';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class WhatsAppNotificationWorker {
  private pool: Pool;
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private restaurantSessionCooldowns = new Map<string, number>();
  private static SESSION_RETRY_COOLDOWN_MS = 30000;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async start() {
    if (this.isRunning) {
      console.log('[WhatsApp Worker] Ya está en ejecución');
      return;
    }

    this.isRunning = true;
    console.log('[WhatsApp Worker] 🚀 Iniciando worker de notificaciones...');

    await this.cleanOldNotifications();

    const runCycle = async () => {
      await this.preWakeActiveRestaurants();
      await new Promise(resolve => setTimeout(resolve, 10000));
      await this.processNotifications();
      await this.cleanOldNotifications();
    };

    void runCycle();

    this.intervalId = setInterval(() => {
      void runCycle();
    }, 25 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[WhatsApp Worker] ⏹️ Worker detenido');
  }

  private async preWakeActiveRestaurants() {
    try {
      const result = await this.pool.query(
        `SELECT DISTINCT n.restaurant_id, r.use_whatsapp_web
         FROM whatsapp_notifications n
         JOIN restaurants r ON r.id = n.restaurant_id
         WHERE n.status = 'pending'
           AND n.scheduled_for <= NOW() + INTERVAL '25 seconds'
           AND r.use_whatsapp_web = true`
      );

      if (result.rows.length === 0) return;

      console.log(`[WhatsApp Worker] 🔔 Pre-despertando ${result.rows.length} restaurante(s) antes del envío...`);

      for (const row of result.rows) {
        const restaurantId = row.restaurant_id as string;
        const status = getSessionStatus(restaurantId);
        if (!status.isReady && !status.isInitializing) {
          console.log(`[WhatsApp Worker] 🌅 Pre-despertando sesión: ${restaurantId}`);
          initializeWhatsAppForRestaurant(restaurantId, false).catch((err: any) => {
            console.log(`[WhatsApp Worker] ⚠️ Pre-wake error para ${restaurantId}:`, err?.message);
          });
        } else if (status.isReady) {
          console.log(`[WhatsApp Worker] ✅ Sesión ${restaurantId} ya activa, no necesita pre-wake`);
        } else {
          console.log(`[WhatsApp Worker] ⏳ Sesión ${restaurantId} ya inicializándose`);
        }
      }
    } catch (err) {
      console.error('[WhatsApp Worker] ❌ Error en pre-wake:', err);
    }
  }

  private async cleanOldNotifications() {
    try {
      // Eliminar notificaciones enviadas hace más de 7 días
      const sentResult = await this.pool.query(
        `DELETE FROM whatsapp_notifications 
         WHERE status = 'sent' 
         AND sent_at < NOW() - INTERVAL '7 days'
         RETURNING id`
      );

      // Eliminar notificaciones fallidas hace más de 48 horas
      const failedResult = await this.pool.query(
        `DELETE FROM whatsapp_notifications 
         WHERE status = 'failed' 
         AND last_attempt_at < NOW() - INTERVAL '48 hours'
         RETURNING id`
      );

      // Reactivar notificaciones pendientes que llevan más de 1 hora sin procesarse
      // (por si el worker se cayó o hubo algún problema)
      const stuckResult = await this.pool.query(
        `UPDATE whatsapp_notifications 
         SET status = 'pending', scheduled_for = NOW()
         WHERE status = 'processing' 
         AND last_attempt_at < NOW() - INTERVAL '10 minutes'
         RETURNING id`
      );
      
      if ((stuckResult.rowCount || 0) > 0) {
        console.log(`[WhatsApp Worker] 🔄 Reactivadas ${stuckResult.rowCount} notificaciones atascadas`);
      }

      const totalDeleted = (sentResult.rowCount || 0) + (failedResult.rowCount || 0);
      if (totalDeleted > 0) {
        console.log(`[WhatsApp Worker] 🗑️ Eliminadas ${totalDeleted} notificaciones antiguas`);
      }
    } catch (error) {
      console.error('[WhatsApp Worker] Error limpiando notificaciones antiguas:', error);
    }
  }

  private async processNotifications() {
    let notificationsToProcess: any[] = [];
    
    const client = await this.pool.connect();
    try {
      const now = new Date();
      
      await client.query('BEGIN');
      
      const result = await client.query(
        `SELECT n.*, r.status as reservation_status
         FROM whatsapp_notifications n
         LEFT JOIN reservations r ON n.reservation_id = r.id
         WHERE n.status = 'pending' 
         AND n.scheduled_for <= $1
         ORDER BY n.scheduled_for ASC
         LIMIT 5
         FOR UPDATE OF n SKIP LOCKED`,
        [now]
      );

      if (result.rows.length === 0) {
        await client.query('COMMIT');
        return;
      }

      console.log(`[WhatsApp Worker] 📨 Procesando ${result.rows.length} notificaciones pendientes...`);

      for (const notification of result.rows) {
        const isCancellationNotif = [
          'reservation_cancelled',
          'restaurant_cancellation',
          'cancellation',
        ].includes(notification.notification_type);
        if (notification.reservation_status === 'cancelled' && !isCancellationNotif) {
          console.log(`[WhatsApp Worker] ⏭️ Omitiendo notificación ${notification.id} - reserva cancelada (tipo: ${notification.notification_type})`);
          await client.query(
            'DELETE FROM whatsapp_notifications WHERE id = $1',
            [notification.id]
          );
          continue;
        }

        await client.query(
          `UPDATE whatsapp_notifications 
           SET status = 'processing', attempts = attempts + 1, last_attempt_at = NOW()
           WHERE id = $1 AND status = 'pending'
           RETURNING id`,
          [notification.id]
        );
        notificationsToProcess.push(notification);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { }
      console.error('[WhatsApp Worker] Error seleccionando notificaciones:', error);
      return;
    } finally {
      client.release();
    }

    for (const notification of notificationsToProcess) {
      await this.sendNotification(notification);
    }
  }

  private isRestaurantSessionInCooldown(restaurantId: string): boolean {
    const lastFailure = this.restaurantSessionCooldowns.get(restaurantId) || 0;
    return Date.now() - lastFailure < WhatsAppNotificationWorker.SESSION_RETRY_COOLDOWN_MS;
  }

  private markRestaurantSessionFailed(restaurantId: string) {
    this.restaurantSessionCooldowns.set(restaurantId, Date.now());
  }

  private clearRestaurantSessionCooldown(restaurantId: string) {
    this.restaurantSessionCooldowns.delete(restaurantId);
  }

  private async forceLockfileCleanup(restaurantId: string): Promise<void> {
    try {
      console.log(`[WhatsApp Worker] 🔓 Forzando limpieza de lockfiles para ${restaurantId}...`);
      const sessionPath = getSessionPath(restaurantId);
      const restaurantDir = path.dirname(sessionPath);
      const lockNames = ['SingletonLock', 'lockfile', 'SingletonSocket', 'SingletonCookie'];
      // Also kill any stale chromium processes
      try { execSync(`pkill -9 -f "${restaurantId}" 2>/dev/null || true`, { stdio: 'pipe' }); } catch { }
      await new Promise(r => setTimeout(r, 1500));
      // Clean lockfiles from all subdirs
      for (const name of lockNames) {
        try { execSync(`find "${restaurantDir}" -name '${name}' -delete 2>/dev/null || true`, { stdio: 'pipe' }); } catch { }
      }
      // Also scan and delete via Node.js
      const deleteLocks = (dir: string, depth: number = 0) => {
        if (depth > 5) return;
        try {
          if (!fs.existsSync(dir)) return;
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
              deleteLocks(path.join(dir, entry.name), depth + 1);
            } else if (lockNames.includes(entry.name)) {
              try { fs.unlinkSync(path.join(dir, entry.name)); } catch { }
            }
          }
        } catch { }
      };
      deleteLocks(restaurantDir);
      console.log(`[WhatsApp Worker] ✅ Limpieza de lockfiles completada para ${restaurantId}`);
    } catch (err) {
      console.error(`[WhatsApp Worker] ⚠️ Error en limpieza de lockfiles:`, err);
    }
  }

  private async ensureSessionReady(restaurantId: string, forceRestart: boolean = false): Promise<boolean> {
    const status = getSessionStatus(restaurantId);
    if (status.isReady) {
      this.clearRestaurantSessionCooldown(restaurantId);
      return true;
    }

    if (status.isInitializing) {
      console.log(`[WhatsApp Worker] ⏳ Sesión de ${restaurantId} se está inicializando, esperando...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
      const statusAfter = getSessionStatus(restaurantId);
      if (statusAfter.isReady) {
        this.clearRestaurantSessionCooldown(restaurantId);
        return true;
      }
      return false;
    }

    if (this.isRestaurantSessionInCooldown(restaurantId) && !forceRestart) {
      console.log(`[WhatsApp Worker] ⏳ Sesión de ${restaurantId} en cooldown, posponiendo notificaciones`);
      return false;
    }

    // Pre-clean lockfiles before attempting initialization to avoid "already running" errors
    await this.forceLockfileCleanup(restaurantId);

    console.log(`[WhatsApp Worker] 🔄 Inicializando sesión para ${restaurantId}${forceRestart ? ' (forzado)' : ''}...`);
    try {
      await initializeWhatsAppForRestaurant(restaurantId, forceRestart);
      await new Promise(resolve => setTimeout(resolve, 12000));
      
      let statusAfterInit = getSessionStatus(restaurantId);
      if (statusAfterInit.isReady) {
        this.clearRestaurantSessionCooldown(restaurantId);
        console.log(`[WhatsApp Worker] ✅ Sesión de ${restaurantId} lista tras inicialización`);
        return true;
      }

      // If not ready yet but initializing, wait a bit more
      if (statusAfterInit.isInitializing) {
        console.log(`[WhatsApp Worker] ⏳ Sesión sigue inicializando, esperando 15s más...`);
        await new Promise(resolve => setTimeout(resolve, 15000));
        statusAfterInit = getSessionStatus(restaurantId);
        if (statusAfterInit.isReady) {
          this.clearRestaurantSessionCooldown(restaurantId);
          return true;
        }
      }
    } catch (error: any) {
      console.error(`[WhatsApp Worker] ⚠️ Error inicializando sesión de ${restaurantId}:`, error?.message);
      // On lockfile error, do aggressive cleanup so next retry works
      if (error?.message?.includes('already running') || error?.message?.includes('lockfile')) {
        await this.forceLockfileCleanup(restaurantId);
      }
    }

    this.markRestaurantSessionFailed(restaurantId);
    return false;
  }

  private async sendNotification(notification: any) {
    try {
      const isCritical = notification.notification_type === 'reservation_created' || 
                         notification.notification_type === 'reservation_confirmed' ||
                         notification.notification_type === 'reservation_cancelled';
      const maxAttempts = isCritical ? 25 : 10;
      const currentAttempt = notification.attempts + 1;
      
      console.log(`[WhatsApp Worker] 📤 Enviando ${notification.notification_type} a ${notification.recipient_name} (${notification.recipient_phone}) [intento ${currentAttempt}/${maxAttempts}]`);

      // Verificar si el restaurante usa Cloud API
      const restaurantTypeResult = await this.pool.query(
        'SELECT whatsapp_type FROM restaurants WHERE id = $1',
        [notification.restaurant_id]
      );
      const whatsappType = restaurantTypeResult.rows[0]?.whatsapp_type || 'free';

      if (whatsappType === 'paid') {
        console.log(`[WhatsApp Worker] ☁️ Enviando via Cloud API para notificación ${notification.id}`);
        try {
          const cloudConfig = await getCloudApiConfigFromDb(this.pool);
          if (!cloudConfig) {
            if (currentAttempt >= maxAttempts) {
              await this.pool.query(
                `UPDATE whatsapp_notifications SET status = 'failed', error_message = $2 WHERE id = $1`,
                [notification.id, 'Cloud API no configurada o desactivada']
              );
              console.log(`[WhatsApp Worker] ❌ Notificación ${notification.id} fallida: Cloud API no configurada`);
            } else {
              await this.pool.query(
                `UPDATE whatsapp_notifications SET status = 'pending', error_message = $2, scheduled_for = NOW() + INTERVAL '60 seconds' WHERE id = $1`,
                [notification.id, `Cloud API no disponible - reintento ${currentAttempt}/${maxAttempts}`]
              );
              console.log(`[WhatsApp Worker] 🔄 Notificación ${notification.id} reintento en 60s (Cloud API no disponible)`);
            }
            return;
          }

          const cloudResult = await sendWhatsAppViaCloudApi(
            notification.recipient_phone,
            notification.message,
            cloudConfig
          );

          if (cloudResult.success) {
            await this.pool.query(
              `UPDATE whatsapp_notifications SET status = 'sent', sent_at = NOW() WHERE id = $1`,
              [notification.id]
            );
            console.log(`[WhatsApp Worker] ✅ Notificación ${notification.id} enviada via Cloud API`);
            try { await deductWhatsAppCredit(this.pool, notification.restaurant_id); } catch {}
            try { await this.sendEmailCopy(notification); } catch {}
          } else {
            if (currentAttempt >= maxAttempts) {
              await this.pool.query(
                `UPDATE whatsapp_notifications SET status = 'failed', error_message = $2 WHERE id = $1`,
                [notification.id, `Cloud API error: ${cloudResult.error}`]
              );
              console.log(`[WhatsApp Worker] ❌ Notificación ${notification.id} fallida via Cloud API después de ${currentAttempt} intentos: ${cloudResult.error}`);
            } else {
              const retryDelay = [30, 60, 120, 180, 300][Math.min(currentAttempt - 1, 4)];
              await this.pool.query(
                `UPDATE whatsapp_notifications SET status = 'pending', error_message = $2, scheduled_for = NOW() + $3::interval WHERE id = $1`,
                [notification.id, `Cloud API error: ${cloudResult.error} - reintento ${currentAttempt}/${maxAttempts}`, `${retryDelay} seconds`]
              );
              console.log(`[WhatsApp Worker] 🔄 Notificación ${notification.id} reintento Cloud API en ${retryDelay}s`);
            }
          }
        } catch (cloudError: any) {
          console.error(`[WhatsApp Worker] ❌ Error inesperado Cloud API:`, cloudError?.message);
          await this.pool.query(
            `UPDATE whatsapp_notifications SET status = 'pending', error_message = $2, scheduled_for = NOW() + INTERVAL '60 seconds' WHERE id = $1`,
            [notification.id, cloudError?.message || 'Error Cloud API']
          );
        }
        return;
      }

      const shouldForceRestart = currentAttempt >= 5 && currentAttempt % 5 === 0;
      const sessionReady = await this.ensureSessionReady(notification.restaurant_id, shouldForceRestart);

      if (!sessionReady) {
        const retryDelays = [20, 40, 60, 90, 120, 180, 300, 300, 600, 600, 900, 900, 1800, 1800, 3600, 3600];
        const delaySeconds = retryDelays[Math.min(currentAttempt - 1, retryDelays.length - 1)];
        
        if (currentAttempt >= maxAttempts) {
          await this.pool.query(
            `UPDATE whatsapp_notifications 
             SET status = 'failed', error_message = $2
             WHERE id = $1`,
            [notification.id, `Fallida después de ${currentAttempt} intentos. Sesión WhatsApp no disponible.`]
          );
          console.log(`[WhatsApp Worker] ❌ Notificación ${notification.id} fallida después de ${currentAttempt} intentos`);
        } else {
          await this.pool.query(
            `UPDATE whatsapp_notifications 
             SET status = 'pending', error_message = $2, scheduled_for = NOW() + $3::interval
             WHERE id = $1`,
            [notification.id, `Sesión no disponible - reintento ${currentAttempt}/${maxAttempts} en ${delaySeconds}s`, `${delaySeconds} seconds`]
          );
          console.log(`[WhatsApp Worker] 🔄 Notificación ${notification.id} pospuesta ${delaySeconds}s (sesión no lista)`);
        }
        return;
      }

      const result = await Promise.race([
        sendWhatsAppViaRestaurant(
          notification.restaurant_id,
          notification.recipient_phone,
          notification.message
        ),
        new Promise<{ success: boolean; error?: string }>((resolve) => 
          setTimeout(() => resolve({ success: false, error: 'Timeout después de 45s' }), 45000)
        )
      ]);

      if (result.success) {
        this.clearRestaurantSessionCooldown(notification.restaurant_id);
        await this.pool.query(
          `UPDATE whatsapp_notifications 
           SET status = 'sent', sent_at = NOW()
           WHERE id = $1`,
          [notification.id]
        );
        console.log(`[WhatsApp Worker] ✅ Notificación ${notification.id} enviada exitosamente`);

        try {
          await this.sendEmailCopy(notification);
        } catch (emailErr) {
          console.error(`[WhatsApp Worker] ⚠️ Error enviando copia email:`, emailErr);
        }
      } else {
        const errorStr = result.error || '';
        
        if (errorStr.includes('recipient_not_on_whatsapp')) {
          console.log(`[WhatsApp Worker] ⚠️ Destinatario ${notification.recipient_phone} no tiene WhatsApp`);
          await this.pool.query(
            `UPDATE whatsapp_notifications 
             SET status = 'failed', error_message = $2
             WHERE id = $1`,
            [notification.id, 'El destinatario no tiene WhatsApp']
          );
          return;
        }
        
        const isSessionIssue = errorStr.includes('session') || errorStr.includes('not_ready') || 
                              errorStr.includes('disconnected') || errorStr.includes('Timeout') ||
                              errorStr.includes('detached') || errorStr.includes('frame') ||
                              errorStr.includes('Protocol') || errorStr.includes('closed');
        
        if (isSessionIssue) {
          this.markRestaurantSessionFailed(notification.restaurant_id);
        }

        if (currentAttempt >= maxAttempts) {
          await this.pool.query(
            `UPDATE whatsapp_notifications 
             SET status = 'failed', error_message = $2
             WHERE id = $1`,
            [notification.id, `Fallida después de ${currentAttempt} intentos: ${result.error || 'Error desconocido'}`]
          );
          console.log(`[WhatsApp Worker] ❌ Notificación ${notification.id} fallida después de ${currentAttempt} intentos`);
        } else {
          const isDetachedError = (result.error || '').includes('disconnected') || (result.error || '').includes('session');
          const retryDelaysNormal = [15, 30, 60, 120, 180, 300, 300, 600, 600, 900, 900, 1800, 1800, 3600, 3600, 3600];
          const retryDelaysFast = [20, 30, 45, 60, 90, 120, 180, 300, 300, 600, 600, 900, 900, 1800, 1800, 3600];
          const delays = isDetachedError ? retryDelaysFast : retryDelaysNormal;
          const delaySeconds = delays[Math.min(currentAttempt - 1, delays.length - 1)];
          
          await this.pool.query(
            `UPDATE whatsapp_notifications 
             SET status = 'pending', error_message = $2, scheduled_for = NOW() + $3::interval
             WHERE id = $1`,
            [notification.id, `${result.error || 'Error'} - reintento ${currentAttempt}/${maxAttempts} en ${delaySeconds}s`, `${delaySeconds} seconds`]
          );
          console.log(`[WhatsApp Worker] 🔄 Notificación ${notification.id} reintento ${currentAttempt}/${maxAttempts} en ${delaySeconds}s`);
        }
      }
    } catch (error: any) {
      console.error(`[WhatsApp Worker] ❌ Error enviando notificación ${notification.id}:`, error);
      
      try {
        await this.pool.query(
          `UPDATE whatsapp_notifications 
           SET status = 'pending', error_message = $2, scheduled_for = NOW() + INTERVAL '60 seconds'
           WHERE id = $1`,
          [notification.id, error.message || 'Error desconocido']
        );
      } catch (dbError) {
        console.error(`[WhatsApp Worker] ❌ Error actualizando estado de notificación ${notification.id}:`, dbError);
      }
    }
  }

  private async sendEmailCopy(notification: any) {
    try {
      const isRestaurantNotification = notification.notification_type === 'restaurant_cancellation' ||
        notification.notification_type === 'restaurant_confirmation';
      if (isRestaurantNotification) {
        return;
      }

      const reservationResult = await this.pool.query(
        `SELECT r.client_id, r.restaurant_id, rest.name as restaurant_name, rest.enable_email_notifications,
                rest.notification_email, rest.email as restaurant_email
         FROM reservations r
         JOIN restaurants rest ON r.restaurant_id = rest.id
         WHERE r.id = $1`,
        [notification.reservation_id]
      );

      if (reservationResult.rows.length === 0) return;
      const reservation = reservationResult.rows[0];

      if (!reservation.enable_email_notifications) return;

      const restaurantEmail = reservation.notification_email || reservation.restaurant_email;
      if (!restaurantEmail) {
        console.log('[WhatsApp Worker] ⏭️ No hay email de restaurante configurado, omitiendo copia email');
        return;
      }

      const subjectMap: Record<string, string> = {
        'reservation_created': `\u2705 Reserva Confirmada - ${reservation.restaurant_name}`,
        'reservation_confirmed': `\u2705 Reserva Confirmada - ${reservation.restaurant_name}`,
        'reservation_modified': `\u270f\ufe0f Reserva Modificada - ${reservation.restaurant_name}`,
        'reservation_cancelled': `\u274c Reserva Cancelada - ${reservation.restaurant_name}`,
        'cancellation': `\u274c Reserva Cancelada - ${reservation.restaurant_name}`,
      };

      const notifType = notification.notification_type || '';
      const isReminder = notifType.startsWith('reminder_');
      const subject = isReminder
        ? `\u23f0 Recordatorio de Reserva - ${reservation.restaurant_name}`
        : (subjectMap[notifType] || `Notificaci\u00f3n - ${reservation.restaurant_name}`);

      await sendRestaurantEmailNotification({
        restaurantEmail,
        whatsappMessage: notification.message,
        subject,
        restaurantName: reservation.restaurant_name,
        clientName: notification.recipient_name || 'Cliente',
        clientPhone: notification.recipient_phone || '',
      });

      console.log(`[WhatsApp Worker] \u2709\ufe0f Email copia enviado al restaurante ${restaurantEmail} (${notifType})`);
    } catch (error) {
      console.error('[WhatsApp Worker] Error en sendEmailCopy:', error);
    }
  }
}

let workerInstance: WhatsAppNotificationWorker | null = null;

export function startWhatsAppWorker(pool: Pool) {
  if (!workerInstance) {
    workerInstance = new WhatsAppNotificationWorker(pool);
    void workerInstance.start();
  }
  return workerInstance;
}

export function stopWhatsAppWorker() {
  if (workerInstance) {
    workerInstance.stop();
    workerInstance = null;
  }
}
