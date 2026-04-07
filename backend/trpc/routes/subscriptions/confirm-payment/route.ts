import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import Stripe from 'stripe';

export const confirmPaymentProcedure = publicProcedure
  .input(
    z.object({
      sessionId: z.string(),
      orderId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CONFIRM PAYMENT] Confirmando pago:', input.orderId);

    try {
      const stripeConfigResult = await ctx.db.query(
        'SELECT stripe_secret_key, stripe_enabled FROM admin_stripe_config WHERE id = $1',
        ['admin-stripe-config']
      );

      if (stripeConfigResult.rows.length === 0 || !stripeConfigResult.rows[0].stripe_enabled || !stripeConfigResult.rows[0].stripe_secret_key) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Stripe no está configurado.',
        });
      }

      const stripe = new Stripe(stripeConfigResult.rows[0].stripe_secret_key, {
        apiVersion: '2024-12-18.acacia',
      });
      const orderResult = await ctx.db.query(
        'SELECT * FROM subscription_orders WHERE id = $1',
        [input.orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Orden no encontrada',
        });
      }

      const order = orderResult.rows[0];

      if (order.status === 'completed') {
        console.log('✅ [CONFIRM PAYMENT] Orden ya completada');
        return {
          success: true,
          restaurantId: order.restaurant_id,
          message: 'Pago ya procesado',
        };
      }

      const session = await stripe.checkout.sessions.retrieve(input.sessionId);

      if (session.payment_status !== 'paid') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El pago no ha sido completado',
        });
      }

      const restaurantData = typeof order.restaurant_data === 'string' 
        ? JSON.parse(order.restaurant_data) 
        : order.restaurant_data;

      const restaurantId = `rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const slug = restaurantData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const now = new Date().toISOString();

      const durationResult = await ctx.db.query(
        'SELECT months FROM subscription_durations WHERE id = $1',
        [order.subscription_duration_id]
      );

      const months = Number(durationResult.rows[0].months);
      const subscriptionExpiryDate = new Date();
      subscriptionExpiryDate.setMonth(subscriptionExpiryDate.getMonth() + months);
      const subscriptionExpiry = subscriptionExpiryDate.toISOString();

      const planResult = await ctx.db.query(
        'SELECT enabled_modules FROM subscription_plans WHERE id = $1',
        [order.subscription_plan_id]
      );

      let enabledModules: string[] = ['info-config', 'reservations'];
      if (planResult.rows[0].enabled_modules) {
        const planModules = typeof planResult.rows[0].enabled_modules === 'string'
          ? JSON.parse(planResult.rows[0].enabled_modules)
          : planResult.rows[0].enabled_modules;
        enabledModules = Array.isArray(planModules) ? planModules : enabledModules;
      }

      const imageUrl = restaurantData.profileImageUrl || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800';

      await ctx.db.query(
        `INSERT INTO restaurants (
          id, name, description, username, password, profile_image_url, google_maps_url,
          cuisine_type, address, postal_code, city_id, province_id, phone, email, 
          slug, image_url, is_active, subscription_plan_id, subscription_expiry,
          enabled_modules, advance_booking_days, custom_links, sales_rep_id, 
          stripe_customer_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
        [
          restaurantId,
          restaurantData.name,
          restaurantData.description,
          restaurantData.username,
          restaurantData.password,
          restaurantData.profileImageUrl || null,
          restaurantData.googleMapsUrl || null,
          JSON.stringify(restaurantData.cuisineType.map((ct: string) => ct.replace('cuisine-', ''))),
          restaurantData.address,
          restaurantData.postalCode || null,
          restaurantData.cityId,
          restaurantData.provinceId,
          JSON.stringify([restaurantData.phone]),
          restaurantData.email,
          slug,
          imageUrl,
          true,
          order.subscription_plan_id,
          subscriptionExpiry,
          JSON.stringify(enabledModules),
          30,
          JSON.stringify([]),
          'salesrep-website',
          session.customer || null,
          now,
          now,
        ]
      );

      await ctx.db.query(
        `UPDATE subscription_orders 
         SET status = $1, restaurant_id = $2, stripe_payment_intent_id = $3, completed_at = NOW()
         WHERE id = $4`,
        ['completed', restaurantId, session.payment_intent, input.orderId]
      );

      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      if (process.env.RESEND_API_KEY) {
        try {
          const accessUrl = `https://quieromesa.com/restaurant/login/${slug}`;
          
          await resend.emails.send({
            from: 'Quieromesa <noreply@quieromesa.com>',
            to: restaurantData.email,
            subject: '¡Bienvenido a Quieromesa! 🎉',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #FF1493;">¡Bienvenido a Quieromesa!</h1>
                <p>Hola <strong>${restaurantData.name}</strong>,</p>
                <p>Tu suscripción ha sido activada exitosamente. Ya puedes empezar a configurar tu restaurante y recibir reservas.</p>
                
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0;">Credenciales de acceso</h2>
                  <p><strong>URL de acceso:</strong> <a href="${accessUrl}">${accessUrl}</a></p>
                  <p><strong>Usuario:</strong> ${restaurantData.username}</p>
                  <p><strong>Contraseña:</strong> ${restaurantData.password}</p>
                </div>

                <p>Tu suscripción expira el: <strong>${new Date(subscriptionExpiry).toLocaleDateString('es-ES')}</strong></p>

                <p>Si tienes alguna pregunta, no dudes en contactarnos:</p>
                <ul>
                  <li>Teléfono: 615 91 44 34</li>
                  <li>Email: info@quieromesa.com</li>
                </ul>

                <p>¡Gracias por confiar en nosotros!</p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                  Este es un email automático, por favor no respondas a este mensaje.
                </p>
              </div>
            `,
          });
          console.log('📧 [CONFIRM PAYMENT] Email enviado a:', restaurantData.email);
        } catch (emailError) {
          console.error('⚠️ [CONFIRM PAYMENT] Error enviando email:', emailError);
        }
      }

      console.log('✅ [CONFIRM PAYMENT] Restaurante creado:', restaurantId);

      return {
        success: true,
        restaurantId,
        slug,
        accessUrl: `https://quieromesa.com/restaurant/login/${slug}`,
      };
    } catch (error: any) {
      console.error('❌ [CONFIRM PAYMENT] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al confirmar pago: ${error.message}`,
      });
    }
  });
