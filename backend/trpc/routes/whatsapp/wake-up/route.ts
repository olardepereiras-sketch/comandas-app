import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { initializeWhatsAppForRestaurant, getSessionStatus } from "../../../../services/whatsapp-web-manager";
import { WhatsAppNotificationQueue } from "../../../../services/whatsapp-notification-queue";

const wakeUpRequestTimestamps = new Map<string, number>();
const wakeUpCooldownLogTimestamps = new Map<string, number>();
const pendingProcessingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const pendingNotificationProcessingLocks = new Set<string>();
const inFlightWakeUpRequests = new Map<string, Promise<{ success: boolean; throttled?: boolean; cooldownRemainingMs?: number; reason?: string; alreadyReady?: boolean; initializing?: boolean; error?: string }>>();
const WAKE_UP_REQUEST_COOLDOWN_MS = 180000;
const COOLDOWN_LOG_INTERVAL_MS = 60000;
const READY_PROCESSING_DEBOUNCE_MS = 3000;
const PENDING_NOTIFICATION_PROCESSING_COOLDOWN_MS = 45000;
const pendingNotificationProcessingTimestamps = new Map<string, number>();

function schedulePendingNotificationsProcessing(db: any, restaurantId: string, delayMs: number): void {
  const existingTimeout = pendingProcessingTimeouts.get(restaurantId);

  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeout = setTimeout(() => {
    pendingProcessingTimeouts.delete(restaurantId);
    void processPendingNotificationsForRestaurant(db, restaurantId);
  }, delayMs);

  pendingProcessingTimeouts.set(restaurantId, timeout);
}

async function processPendingNotificationsForRestaurant(db: any, restaurantId: string): Promise<void> {
  const now = Date.now();
  const lastProcessedAt = pendingNotificationProcessingTimestamps.get(restaurantId) ?? 0;
  const elapsedMs = now - lastProcessedAt;

  if (pendingNotificationProcessingLocks.has(restaurantId)) {
    return;
  }

  if (elapsedMs < PENDING_NOTIFICATION_PROCESSING_COOLDOWN_MS) {
    return;
  }

  pendingNotificationProcessingLocks.add(restaurantId);
  pendingNotificationProcessingTimestamps.set(restaurantId, now);

  try {
    const notificationQueue = new WhatsAppNotificationQueue(db);
    
    const pendingResult = await db.query(
      `SELECT * FROM whatsapp_notifications 
       WHERE restaurant_id = $1 
       AND status = 'pending' 
       AND scheduled_for <= NOW()
       AND (last_attempt_at IS NULL OR last_attempt_at < NOW() - INTERVAL '30 seconds')
       ORDER BY scheduled_for ASC
       LIMIT 5`,
      [restaurantId]
    );
    
    if (pendingResult.rows.length === 0) {
      console.log(`[WhatsApp WakeUp] ✅ No hay notificaciones pendientes para: ${restaurantId}`);
      return;
    }
    
    console.log(`[WhatsApp WakeUp] 📨 Procesando ${pendingResult.rows.length} notificaciones pendientes para: ${restaurantId}`);
    
    for (const row of pendingResult.rows) {
      const notification = {
        id: row.id,
        restaurantId: row.restaurant_id,
        reservationId: row.reservation_id,
        recipientPhone: row.recipient_phone,
        recipientName: row.recipient_name,
        message: row.message,
        notificationType: row.notification_type,
        scheduledFor: new Date(row.scheduled_for),
        status: row.status,
        attempts: row.attempts,
        lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : undefined,
        errorMessage: row.error_message,
        sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
        createdAt: new Date(row.created_at),
      };
      
      try {
        await notificationQueue.processNotification(notification);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`[WhatsApp WakeUp] Error procesando notificación ${notification.id}:`, err);
      }
    }
    
    console.log(`[WhatsApp WakeUp] ✅ Procesamiento de notificaciones completado para: ${restaurantId}`);
  } catch (error) {
    pendingNotificationProcessingTimestamps.delete(restaurantId);
    console.error(`[WhatsApp WakeUp] ❌ Error procesando notificaciones pendientes:`, error);
  } finally {
    pendingNotificationProcessingLocks.delete(restaurantId);
  }
}

export const wakeUpWhatsAppProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { restaurantId } = input;

    try {
      const now = Date.now();
      const lastWakeUpRequestAt = wakeUpRequestTimestamps.get(restaurantId) ?? 0;
      const elapsedMs = now - lastWakeUpRequestAt;

      if (elapsedMs < WAKE_UP_REQUEST_COOLDOWN_MS) {
        const lastCooldownLog = wakeUpCooldownLogTimestamps.get(restaurantId) ?? 0;
        if (now - lastCooldownLog > COOLDOWN_LOG_INTERVAL_MS) {
          wakeUpCooldownLogTimestamps.set(restaurantId, now);
          console.log(`[WhatsApp WakeUp] ⏱️ WakeUp en cooldown para: ${restaurantId} (${Math.round(elapsedMs / 1000)}s desde el último, quedan ${Math.round((WAKE_UP_REQUEST_COOLDOWN_MS - elapsedMs) / 1000)}s)`);
        }
        return {
          success: true,
          throttled: true,
          cooldownRemainingMs: WAKE_UP_REQUEST_COOLDOWN_MS - elapsedMs,
        };
      }

      const existingRequest = inFlightWakeUpRequests.get(restaurantId);
      if (existingRequest) {
        console.log(`[WhatsApp WakeUp] 🔁 Reutilizando wakeUp en vuelo para: ${restaurantId}`);
        return await existingRequest;
      }

      console.log(`[WhatsApp WakeUp] 🔔 Solicitud de despertar para restaurante: ${restaurantId}`);
      wakeUpRequestTimestamps.set(restaurantId, now);

      const wakeUpPromise = (async () => {
        const restaurantResult = await ctx.db.query(
          'SELECT id, use_whatsapp_web FROM restaurants WHERE id = $1 OR slug = $1',
          [restaurantId]
        );

        if (restaurantResult.rows.length === 0) {
          console.log(`[WhatsApp WakeUp] ⚠️ Restaurante no encontrado: ${restaurantId}`);
          return { success: false, reason: 'restaurant_not_found' };
        }

        const restaurant = restaurantResult.rows[0];

        if (!restaurant.use_whatsapp_web) {
          console.log(`[WhatsApp WakeUp] ⏸️ WhatsApp Web no está habilitado para: ${restaurant.id}`);
          return { success: false, reason: 'whatsapp_not_enabled' };
        }

        const currentStatus = getSessionStatus(restaurant.id);

        if (currentStatus.isReady) {
          console.log(`[WhatsApp WakeUp] ✅ Sesión ya está lista para: ${restaurant.id}`);
          schedulePendingNotificationsProcessing(ctx.db, restaurant.id, READY_PROCESSING_DEBOUNCE_MS);
          return { success: true, alreadyReady: true };
        }

        if (currentStatus.isInitializing) {
          return { success: true, initializing: true };
        }

        console.log(`[WhatsApp WakeUp] 🚀 Iniciando sesión de WhatsApp para: ${restaurant.id}`);

        void initializeWhatsAppForRestaurant(restaurant.id)
          .then(() => {
            const statusAfterInit = getSessionStatus(restaurant.id);
            if (statusAfterInit.isReady) {
              console.log(`[WhatsApp WakeUp] ✅ Sesión inicializada y lista, procesando notificaciones pendientes...`);
              schedulePendingNotificationsProcessing(ctx.db, restaurant.id, 2000);
            } else {
              console.log(`[WhatsApp WakeUp] ⚠️ Sesión inicializada pero NO lista (isReady=${statusAfterInit.isReady}, isInitializing=${statusAfterInit.isInitializing}). Las notificaciones se procesarán cuando el worker detecte la sesión lista.`);
            }
          })
          .catch((error) => {
            console.error(`[WhatsApp WakeUp] ❌ Error al inicializar sesión:`, error);
          });

        return { success: true, initializing: true };
      })();

      inFlightWakeUpRequests.set(restaurantId, wakeUpPromise);

      try {
        return await wakeUpPromise;
      } finally {
        inFlightWakeUpRequests.delete(restaurantId);
      }
    } catch (error: any) {
      console.error(`[WhatsApp WakeUp] ❌ Error:`, error);
      return { success: false, error: error.message };
    }
  });
