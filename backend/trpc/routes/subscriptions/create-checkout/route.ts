import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import Stripe from 'stripe';

export const createCheckoutSessionProcedure = publicProcedure
  .input(
    z.object({
      subscriptionPlanId: z.string(),
      subscriptionDurationId: z.string(),
      restaurantData: z.object({
        name: z.string(),
        description: z.string(),
        username: z.string(),
        password: z.string(),
        email: z.string().email(),
        phone: z.string(),
        address: z.string(),
        postalCode: z.string().optional(),
        cityId: z.string(),
        provinceId: z.string(),
        cuisineType: z.array(z.string()),
        profileImageUrl: z.string().optional(),
        googleMapsUrl: z.string().optional(),
      }),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE CHECKOUT] Creando sesión de Stripe...');

    try {
      const stripeConfigResult = await ctx.db.query(
        'SELECT stripe_secret_key, stripe_enabled FROM admin_stripe_config WHERE id = $1',
        ['admin-stripe-config']
      );

      if (stripeConfigResult.rows.length === 0 || !stripeConfigResult.rows[0].stripe_enabled || !stripeConfigResult.rows[0].stripe_secret_key) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Stripe no está configurado. Por favor contacta al administrador.',
        });
      }

      const stripe = new Stripe(stripeConfigResult.rows[0].stripe_secret_key, {
        apiVersion: '2024-12-18.acacia',
      });
      const planResult = await ctx.db.query(
        'SELECT * FROM subscription_plans WHERE id = $1',
        [input.subscriptionPlanId]
      );

      const durationResult = await ctx.db.query(
        'SELECT * FROM subscription_durations WHERE id = $1',
        [input.subscriptionDurationId]
      );

      if (planResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Plan de suscripción no encontrado',
        });
      }

      if (durationResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Duración de suscripción no encontrada',
        });
      }

      const plan = planResult.rows[0];
      const duration = durationResult.rows[0];

      const totalAmount = Number(plan.price) * Number(duration.months);

      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await ctx.db.query(
        `INSERT INTO subscription_orders (
          id, subscription_plan_id, subscription_duration_id, 
          total_amount, restaurant_data, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          orderId,
          input.subscriptionPlanId,
          input.subscriptionDurationId,
          totalAmount,
          JSON.stringify(input.restaurantData),
          'pending',
        ]
      );

      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'http://localhost:3000';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `${plan.name} - ${duration.name}`,
                description: `Suscripción ${plan.name} por ${duration.months} meses`,
              },
              unit_amount: Math.round(totalAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
        cancel_url: `${baseUrl}/subscribe?canceled=true`,
        client_reference_id: orderId,
        customer_email: input.restaurantData.email,
        metadata: {
          orderId,
          restaurantName: input.restaurantData.name,
        },
      });

      await ctx.db.query(
        'UPDATE subscription_orders SET stripe_session_id = $1 WHERE id = $2',
        [session.id, orderId]
      );

      console.log('✅ [CREATE CHECKOUT] Sesión creada:', session.id);

      return {
        sessionId: session.id,
        url: session.url,
        orderId,
      };
    } catch (error: any) {
      console.error('❌ [CREATE CHECKOUT] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al crear sesión de pago: ${error.message}`,
      });
    }
  });
