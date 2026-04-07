import { sendWhatsAppViaRestaurant } from './whatsapp-web-manager';
import { sendWhatsAppViaCloudApi, getCloudApiConfigFromDb } from './whatsapp-cloud-api';

export interface DbConnection {
  query: (text: string, params?: any[]) => Promise<any>;
}

export interface WhatsAppNotification {
  id: string;
  restaurantId: string;
  reservationId: string;
  recipientPhone: string;
  recipientName: string;
  message: string;
  notificationType: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
}

export interface ScheduleNotificationParams {
  restaurantId: string;
  reservationId?: string | null;
  recipientPhone: string;
  recipientName: string;
  message: string;
  notificationType: string;
  scheduledFor: Date;
}

export class WhatsAppNotificationQueue {
  constructor(private db: DbConnection) {}

  async scheduleNotification(params: ScheduleNotificationParams): Promise<string> {
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    try {
      await this.db.query(
        `CREATE TABLE IF NOT EXISTS whatsapp_notifications (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          reservation_id TEXT,
          recipient_phone TEXT NOT NULL,
          recipient_name TEXT NOT NULL,
          message TEXT NOT NULL,
          notification_type TEXT NOT NULL,
          scheduled_for TIMESTAMP NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TIMESTAMP,
          error_message TEXT,
          sent_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        []
      );

      // Drop FK constraint and ensure column is nullable
      try {
        await this.db.query(
          `ALTER TABLE whatsapp_notifications DROP CONSTRAINT IF EXISTS whatsapp_notifications_reservation_id_fkey`,
          []
        );
      } catch {
        // Ignore
      }
      try {
        await this.db.query(
          `ALTER TABLE whatsapp_notifications ALTER COLUMN reservation_id DROP NOT NULL`,
          []
        );
      } catch {
        // Ignore
      }

      // Use NULL for non-reservation notifications (waitlist, etc.) to avoid FK issues
      const reservationIdValue = params.reservationId && !params.reservationId.startsWith('waitlist-') && !params.reservationId.startsWith('notif-')
        ? params.reservationId
        : null;

      await this.db.query(
        `INSERT INTO whatsapp_notifications 
        (id, restaurant_id, reservation_id, recipient_phone, recipient_name, message, 
         notification_type, scheduled_for, status, attempts, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          notificationId,
          params.restaurantId,
          reservationIdValue,
          params.recipientPhone,
          params.recipientName,
          params.message,
          params.notificationType,
          params.scheduledFor,
          'pending',
          0,
          now,
        ]
      );

      console.log(`[Notification Queue] ✅ Notificación programada: ${notificationId} para ${params.scheduledFor.toISOString()}`);
      return notificationId;
    } catch (error) {
      console.error('[Notification Queue] ❌ Error al programar notificación:', error);
      throw error;
    }
  }

  async getPendingNotifications(): Promise<WhatsAppNotification[]> {
    try {
      const now = new Date();
      const result = await this.db.query(
        `SELECT * FROM whatsapp_notifications 
         WHERE status = 'pending' 
         AND scheduled_for <= $1
         ORDER BY scheduled_for ASC`,
        [now]
      );

      return result.rows.map((row: any) => ({
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
      }));
    } catch (error) {
      console.error('[Notification Queue] ❌ Error al obtener notificaciones pendientes:', error);
      throw error;
    }
  }

  async processNotification(notification: WhatsAppNotification): Promise<boolean> {
    const maxAttempts = 10;

    try {
      console.log(`[Notification Queue] 📤 Procesando notificación ${notification.id} (intento ${notification.attempts + 1}/${maxAttempts})`);

      try {
        await Promise.race([
          this.db.query(
            `UPDATE whatsapp_notifications 
             SET attempts = attempts + 1, last_attempt_at = $1, status = 'processing'
             WHERE id = $2 AND status = 'pending'`,
            [new Date(), notification.id]
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB update timeout')), 10000))
        ]);
      } catch (dbError: any) {
        console.error(`[Notification Queue] ⚠️ Error actualizando estado a processing: ${dbError.message}`);
        return false;
      }

      const restaurantResult = await this.db.query(
        'SELECT use_whatsapp_web, whatsapp_type FROM restaurants WHERE id = $1',
        [notification.restaurantId]
      );

      if (restaurantResult.rows.length === 0) {
        console.error(`[Notification Queue] ❌ Restaurante no encontrado: ${notification.restaurantId}`);
        await this.markAsFailed(notification.id, 'Restaurante no encontrado');
        return false;
      }

      const useWhatsappWeb = restaurantResult.rows[0].use_whatsapp_web;
      const whatsappType = restaurantResult.rows[0].whatsapp_type || 'free';
      const useCloudApi = whatsappType === 'paid';

      if (!useWhatsappWeb && !useCloudApi) {
        console.log(`[Notification Queue] ⏸️ Sin método de envío habilitado para ${notification.restaurantId}`);
        await this.markAsFailed(notification.id, 'Sin método de envío WhatsApp habilitado');
        return false;
      }

      let result: { success: boolean; error?: string };

      if (useCloudApi && !useWhatsappWeb) {
        console.log(`[Notification Queue] ☁️ Enviando via Cloud API para ${notification.restaurantId}`);
        const cloudConfig = await getCloudApiConfigFromDb(this.db);
        if (!cloudConfig) {
          await this.markAsFailed(notification.id, 'Cloud API no configurada o desactivada');
          return false;
        }
        result = await sendWhatsAppViaCloudApi(
          notification.recipientPhone,
          notification.message,
          cloudConfig
        );
      } else {
        result = await Promise.race([
          sendWhatsAppViaRestaurant(
            notification.restaurantId,
            notification.recipientPhone,
            notification.message
          ),
          new Promise<{ success: boolean; error?: string }>((resolve) =>
            setTimeout(() => resolve({ success: false, error: 'Timeout después de 45s' }), 45000)
          )
        ]);
      }

      if (result.success) {
        await this.markAsSent(notification.id);
        console.log(`[Notification Queue] ✅ Notificación ${notification.id} enviada exitosamente`);
        return true;
      } else {
        console.log(`[Notification Queue] ⚠️ Envío falló: ${result.error}`);

        if (notification.attempts + 1 >= maxAttempts) {
          await this.markAsFailed(notification.id, result.error || 'Error desconocido');
          console.error(`[Notification Queue] ❌ Notificación ${notification.id} falló después de ${maxAttempts} intentos`);
          return false;
        } else {
          try {
            await this.db.query(
              `UPDATE whatsapp_notifications 
               SET status = 'pending', error_message = $1, scheduled_for = NOW() + INTERVAL '60 seconds'
               WHERE id = $2`,
              [result.error || 'Error', notification.id]
            );
          } catch { }
          console.log(`[Notification Queue] ⚠️ Intento ${notification.attempts + 1}/${maxAttempts} falló, se reintentará más tarde`);
          return false;
        }
      }
    } catch (error: any) {
      console.error(`[Notification Queue] ❌ Error procesando notificación ${notification.id}:`, error);

      try {
        if (notification.attempts + 1 >= maxAttempts) {
          await this.markAsFailed(notification.id, error.message || 'Error desconocido');
        } else {
          await this.db.query(
            `UPDATE whatsapp_notifications 
             SET status = 'pending', error_message = $1, scheduled_for = NOW() + INTERVAL '60 seconds'
             WHERE id = $2`,
            [error.message || 'Error', notification.id]
          );
        }
      } catch (dbError) {
        console.error(`[Notification Queue] ❌ Error actualizando estado:`, dbError);
      }

      return false;
    }
  }

  private async markAsSent(notificationId: string): Promise<void> {
    const now = new Date();
    await this.db.query(
      `UPDATE whatsapp_notifications 
       SET status = 'sent', sent_at = $1
       WHERE id = $2`,
      [now, notificationId]
    );
  }

  private async markAsFailed(notificationId: string, errorMessage: string): Promise<void> {
    await this.db.query(
      `UPDATE whatsapp_notifications 
       SET status = 'failed', error_message = $1
       WHERE id = $2`,
      [errorMessage, notificationId]
    );
  }

  async deleteNotificationsForReservation(reservationId: string): Promise<number> {
    try {
      const result = await this.db.query(
        `DELETE FROM whatsapp_notifications 
         WHERE reservation_id = $1 AND status = 'pending'
         RETURNING id`,
        [reservationId]
      );

      const deletedCount = result.rowCount || 0;
      console.log(`[Notification Queue] 🗑️ ${deletedCount} notificaciones pendientes eliminadas para la reserva ${reservationId}`);
      return deletedCount;
    } catch (error) {
      console.error('[Notification Queue] ❌ Error al eliminar notificaciones:', error);
      throw error;
    }
  }

  async cleanupOldNotifications(): Promise<number> {
    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const result = await this.db.query(
        `DELETE FROM whatsapp_notifications 
         WHERE scheduled_for < $1 
         AND (status = 'sent' OR status = 'failed')
         RETURNING id`,
        [twoDaysAgo]
      );

      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        console.log(`[Notification Queue] 🧹 ${deletedCount} notificaciones antiguas limpiadas`);
      }
      return deletedCount;
    } catch (error) {
      console.error('[Notification Queue] ❌ Error al limpiar notificaciones antiguas:', error);
      throw error;
    }
  }
}
