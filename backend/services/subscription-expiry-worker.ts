import { Pool } from 'pg';
import { sendWhatsAppViaRestaurant } from './whatsapp-web-manager';

export class SubscriptionExpiryWorker {
  private pool: Pool;
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private dailyCheckHour = 9;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async start() {
    if (this.isRunning) {
      console.log('[Subscription Expiry Worker] Ya está en ejecución');
      return;
    }

    this.isRunning = true;
    console.log('[Subscription Expiry Worker] 🚀 Iniciando worker de alertas de caducidad...');

    await this.checkExpiringSubscriptions();
    
    this.intervalId = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === this.dailyCheckHour && now.getMinutes() < 60) {
        await this.checkExpiringSubscriptions();
      }
    }, 60 * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Subscription Expiry Worker] ⏹️ Worker detenido');
  }

  private async checkExpiringSubscriptions() {
    try {
      console.log('[Subscription Expiry Worker] 🔍 Verificando suscripciones próximas a caducar...');

      const configResult = await this.pool.query(
        'SELECT expiry_alert_days FROM subscription_config WHERE id = 1'
      );

      const alertDays = configResult.rows[0]?.expiry_alert_days || 15;
      console.log(`[Subscription Expiry Worker] ⚙️ Días de aviso configurados: ${alertDays}`);

      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + alertDays);
      const alertDateString = alertDate.toISOString().split('T')[0];

      const today = new Date().toISOString().split('T')[0];

      const result = await this.pool.query(
        `SELECT r.id, r.name, r.phone, r.email, r.subscription_expiry, r.last_expiry_alert_sent,
                r.use_whatsapp_web, r.auto_send_whatsapp
         FROM restaurants r
         WHERE r.subscription_expiry IS NOT NULL
         AND r.subscription_expiry::date <= $1::date
         AND r.subscription_expiry::date > $2::date
         AND r.is_active = true
         AND (r.last_expiry_alert_sent IS NULL OR r.last_expiry_alert_sent::date < $2::date)`,
        [alertDateString, today]
      );

      if (result.rows.length === 0) {
        console.log('[Subscription Expiry Worker] ✅ No hay suscripciones próximas a caducar');
        return;
      }

      console.log(`[Subscription Expiry Worker] 📨 ${result.rows.length} restaurantes con suscripción próxima a caducar`);

      for (const restaurant of result.rows) {
        await this.sendExpiryAlert(restaurant, alertDays);
      }
    } catch (error) {
      console.error('[Subscription Expiry Worker] ❌ Error verificando suscripciones:', error);
    }
  }

  private async sendExpiryAlert(restaurant: any, alertDays: number) {
    try {
      const expiryDate = new Date(restaurant.subscription_expiry);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`[Subscription Expiry Worker] 📧 Enviando alerta a ${restaurant.name} (${daysUntilExpiry} días hasta caducidad)`);

      const expiryDateFormatted = expiryDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const message = `⚠️ *ALERTA DE CADUCIDAD DE SUSCRIPCIÓN*\n\n` +
        `Hola *${restaurant.name}*,\n\n` +
        `Le recordamos que su suscripción al servicio QuieroMesa caducará en *${daysUntilExpiry} días*.\n\n` +
        `📅 *Fecha de caducidad:* ${expiryDateFormatted}\n\n` +
        `Para continuar disfrutando de nuestro servicio sin interrupciones, le recomendamos renovar su suscripción cuanto antes.\n\n` +
        `📞 *Contacto para renovación:*\n` +
        `• Teléfono: 615 91 44 34\n` +
        `• WhatsApp: https://wa.me/34615914434\n` +
        `• Email: info@quieromesa.com\n\n` +
        `Estamos a su disposición para cualquier consulta.\n\n` +
        `Saludos cordiales,\n` +
        `*Equipo QuieroMesa*`;

      let alertSent = false;

      if (restaurant.use_whatsapp_web && restaurant.auto_send_whatsapp) {
        const phones = Array.isArray(restaurant.phone) 
          ? restaurant.phone 
          : (typeof restaurant.phone === 'string' ? JSON.parse(restaurant.phone) : []);

        if (phones.length > 0) {
          const mainPhone = phones[0];
          
          const whatsappResult = await sendWhatsAppViaRestaurant(
            restaurant.id,
            mainPhone,
            message
          );

          if (whatsappResult.success) {
            console.log(`[Subscription Expiry Worker] ✅ Alerta WhatsApp enviada a ${restaurant.name}`);
            alertSent = true;
          } else {
            console.error(`[Subscription Expiry Worker] ❌ Error enviando WhatsApp a ${restaurant.name}:`, whatsappResult.error);
          }
        }
      }

      if (!alertSent && restaurant.email) {
        console.log(`[Subscription Expiry Worker] 📧 Intentando enviar alerta por email a ${restaurant.email}`);
      }

      await this.pool.query(
        'UPDATE restaurants SET last_expiry_alert_sent = NOW() WHERE id = $1',
        [restaurant.id]
      );

      console.log(`[Subscription Expiry Worker] ✅ Alerta registrada para ${restaurant.name}`);
    } catch (error: any) {
      console.error(`[Subscription Expiry Worker] ❌ Error enviando alerta a ${restaurant.name}:`, error);
    }
  }
}

let workerInstance: SubscriptionExpiryWorker | null = null;

export function startSubscriptionExpiryWorker(pool: Pool) {
  if (!workerInstance) {
    workerInstance = new SubscriptionExpiryWorker(pool);
    workerInstance.start();
  }
  return workerInstance;
}

export function stopSubscriptionExpiryWorker() {
  if (workerInstance) {
    workerInstance.stop();
    workerInstance = null;
  }
}
