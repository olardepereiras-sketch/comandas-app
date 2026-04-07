import { publicProcedure, TRPCError } from '../../../create-context';

export const getAdminStripeConfigProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [GET ADMIN STRIPE CONFIG] Obteniendo configuración de Stripe del admin');

    try {
      const result = await ctx.db.query(
        'SELECT stripe_enabled, stripe_publishable_key FROM admin_stripe_config WHERE id = $1',
        ['admin-stripe-config']
      );

      if (result.rows.length === 0) {
        return {
          stripeEnabled: false,
          stripePublishableKey: '',
          isConfigured: false,
        };
      }

      const row = result.rows[0];
      return {
        stripeEnabled: row.stripe_enabled || false,
        stripePublishableKey: row.stripe_publishable_key || '',
        isConfigured: !!(row.stripe_enabled && row.stripe_publishable_key),
      };
    } catch (error: any) {
      console.error('❌ [GET ADMIN STRIPE CONFIG] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al obtener configuración de Stripe: ${error.message}`,
      });
    }
  });