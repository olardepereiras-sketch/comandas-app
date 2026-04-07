import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const newRestaurantsProcedure = publicProcedure
  .input(
    z.object({
      startDate: z.string(),
      endDate: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [NEW RESTAURANTS] Obteniendo altas de restaurantes:', input);

    try {
      const sql = `
        SELECT 
          r.id,
          r.name,
          r.email,
          r.phone,
          r.created_at as contract_date,
          r.subscription_expiry,
          sp.name as plan_name,
          sp.price as monthly_price,
          sd.months as duration_months,
          sd.name as duration_name,
          sr.first_name as sales_rep_first_name,
          sr.last_name as sales_rep_last_name,
          sr.phone as sales_rep_phone,
          p.name as province_name,
          c.name as city_name
        FROM restaurants r
        LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
        LEFT JOIN subscription_durations sd ON r.subscription_duration_id = sd.id
        LEFT JOIN sales_representatives sr ON r.sales_rep_id = sr.id
        LEFT JOIN provinces p ON r.province_id = p.id
        LEFT JOIN cities c ON r.city_id = c.id
        WHERE r.created_at >= $1 AND r.created_at <= $2
        ORDER BY r.created_at DESC
      `;

      const result = await ctx.db.query(sql, [input.startDate, input.endDate]);

      const restaurants = result.rows.map((row: any) => ({
        id: String(row.id),
        name: String(row.name),
        email: String(row.email),
        phone: String(row.phone),
        contractDate: String(row.contract_date),
        subscriptionExpiry: row.subscription_expiry ? String(row.subscription_expiry) : null,
        planName: row.plan_name ? String(row.plan_name) : 'Sin plan',
        monthlyPrice: row.monthly_price ? Number(row.monthly_price) : 0,
        durationMonths: row.duration_months ? Number(row.duration_months) : 0,
        durationName: row.duration_name ? String(row.duration_name) : 'Sin duración',
        salesRepFirstName: row.sales_rep_first_name ? String(row.sales_rep_first_name) : '',
        salesRepLastName: row.sales_rep_last_name ? String(row.sales_rep_last_name) : '',
        salesRepPhone: row.sales_rep_phone ? String(row.sales_rep_phone) : '',
        provinceName: row.province_name ? String(row.province_name) : '',
        cityName: row.city_name ? String(row.city_name) : '',
      }));

      console.log(`✅ [NEW RESTAURANTS] ${restaurants.length} altas encontradas`);
      return restaurants;
    } catch (error: any) {
      console.error('❌ [NEW RESTAURANTS] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al obtener altas: ${error.message}`,
      });
    }
  });
