import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const checkDepositRequiredProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string(),
      guests: z.number(),
      highChairCount: z.number().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [CHECK DEPOSIT] Verificando si se requiere fianza:', input.restaurantId, input.date);

    try {
      const result = await ctx.db.query(
        `SELECT 
          deposits_enabled, deposits_default_amount,
          deposits_stripe_publishable_key, deposits_custom_message,
          deposits_specific_days, deposits_include_high_chairs,
          deposits_apply_to_all_days,
          deposits_management_fee_enabled,
          deposits_management_fee_percent,
          deposits_cancellation_hours,
          deposits_auto_refund,
          deposits_cancellation_policy
        FROM restaurants WHERE id = $1`,
        [input.restaurantId]
      );

      if (result.rows.length === 0) {
        return { required: false, amount: 0, totalAmount: 0, message: '', chargeableGuests: 0, managementFeeEnabled: false, managementFeePercent: 0, managementFeeAmount: 0, totalWithFee: 0, cancellationHours: 0, cancellationPolicy: '', autoRefund: false };
      }

      const restaurant = result.rows[0];

      if (!restaurant.deposits_enabled || !restaurant.deposits_stripe_publishable_key) {
        return { required: false, amount: 0, totalAmount: 0, message: '', chargeableGuests: 0, managementFeeEnabled: false, managementFeePercent: 0, managementFeeAmount: 0, totalWithFee: 0, cancellationHours: 0, cancellationPolicy: '', autoRefund: false };
      }

      const specificDays = restaurant.deposits_specific_days
        ? (typeof restaurant.deposits_specific_days === 'string'
          ? JSON.parse(restaurant.deposits_specific_days)
          : restaurant.deposits_specific_days)
        : [];

      const dayConfig = specificDays.find((d: any) => d.date === input.date);
      const applyToAllDays = restaurant.deposits_apply_to_all_days !== false;

      let depositAmount = parseFloat(restaurant.deposits_default_amount || '0');
      let depositMessage = restaurant.deposits_custom_message || '';

      if (dayConfig) {
        depositAmount = dayConfig.amount;
        if (dayConfig.customMessage) depositMessage = dayConfig.customMessage;
      } else if (!applyToAllDays) {
        return { required: false, amount: 0, totalAmount: 0, message: '', chargeableGuests: 0, managementFeeEnabled: false, managementFeePercent: 0, managementFeeAmount: 0, totalWithFee: 0, cancellationHours: 0, cancellationPolicy: '', autoRefund: false };
      }

      if (depositAmount <= 0) {
        return { required: false, amount: 0, totalAmount: 0, message: '', chargeableGuests: 0, managementFeeEnabled: false, managementFeePercent: 0, managementFeeAmount: 0, totalWithFee: 0, cancellationHours: 0, cancellationPolicy: '', autoRefund: false };
      }

      const includeHighChairs = restaurant.deposits_include_high_chairs !== false;
      const highChairs = input.highChairCount || 0;
      const chargeableGuests = includeHighChairs ? input.guests : Math.max(1, input.guests - highChairs);
      const totalAmount = depositAmount * chargeableGuests;

      const managementFeeEnabled = restaurant.deposits_management_fee_enabled || false;
      const managementFeePercent = parseFloat(restaurant.deposits_management_fee_percent || '0');
      const managementFeeAmount = managementFeeEnabled && managementFeePercent > 0
        ? Math.round(totalAmount * (managementFeePercent / 100) * 100) / 100
        : 0;
      const totalWithFee = Math.round((totalAmount + managementFeeAmount) * 100) / 100;

      console.log(`✅ [CHECK DEPOSIT] Fianza: ${depositAmount}€ x ${chargeableGuests} = ${totalAmount}€ + gastos ${managementFeeAmount}€ = ${totalWithFee}€`);

      return {
        required: true,
        amount: depositAmount,
        totalAmount,
        message: depositMessage,
        chargeableGuests,
        includeHighChairs,
        managementFeeEnabled,
        managementFeePercent,
        managementFeeAmount,
        totalWithFee,
        cancellationHours: parseInt(restaurant.deposits_cancellation_hours || '0'),
        cancellationPolicy: restaurant.deposits_cancellation_policy || '',
        autoRefund: restaurant.deposits_auto_refund || false,
      };
    } catch (error: any) {
      console.error('❌ [CHECK DEPOSIT] Error:', error);
      return { required: false, amount: 0, totalAmount: 0, message: '', chargeableGuests: 0, managementFeeEnabled: false, managementFeePercent: 0, managementFeeAmount: 0, totalWithFee: 0, cancellationHours: 0, cancellationPolicy: '', autoRefund: false };
    }
  });
