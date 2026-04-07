import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const salesRepCommissionsProcedure = publicProcedure
  .input(
    z.object({
      salesRepId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [SALES REP COMMISSIONS] Calculando comisiones:', input);

    try {
      let whereConditions = ['r.sales_rep_id IS NOT NULL'];
      const params: any[] = [];
      let paramCount = 1;

      if (input.salesRepId) {
        whereConditions.push(`r.sales_rep_id = $${paramCount++}`);
        params.push(input.salesRepId);
      }

      if (input.startDate) {
        whereConditions.push(`r.created_at >= $${paramCount++}`);
        params.push(input.startDate);
      }

      if (input.endDate) {
        whereConditions.push(`r.created_at <= $${paramCount++}`);
        params.push(input.endDate);
      }

      const sql = `
        SELECT 
          sr.id as sales_rep_id,
          sr.first_name,
          sr.last_name,
          sr.new_client_commission_percent,
          sr.first_renewal_commission_percent,
          sr.renewal_commission_percent,
          r.id as restaurant_id,
          r.name as restaurant_name,
          r.created_at as contract_date,
          r.subscription_expiry,
          sp.price as monthly_price,
          sd.months as duration_months,
          CASE 
            WHEN r.subscription_expiry IS NULL THEN 0
            WHEN r.subscription_expiry < NOW() THEN 
              CASE
                WHEN EXTRACT(EPOCH FROM (r.subscription_expiry - r.created_at)) / (30 * 24 * 60 * 60) > 12 THEN 2
                ELSE 1
              END
            ELSE 0
          END as renewal_type
        FROM restaurants r
        INNER JOIN sales_representatives sr ON r.sales_rep_id = sr.id
        LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
        LEFT JOIN subscription_durations sd ON r.subscription_duration_id = sd.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY sr.last_name, sr.first_name, r.created_at DESC
      `;

      const result = await ctx.db.query(sql, params);

      const commissionsBySalesRep: Record<string, any> = {};

      for (const row of result.rows) {
        const repId = String(row.sales_rep_id);
        
        if (!commissionsBySalesRep[repId]) {
          commissionsBySalesRep[repId] = {
            salesRepId: repId,
            firstName: String(row.first_name),
            lastName: String(row.last_name),
            newClientCommissionPercent: Number(row.new_client_commission_percent),
            firstRenewalCommissionPercent: Number(row.first_renewal_commission_percent),
            renewalCommissionPercent: Number(row.renewal_commission_percent),
            totalCommission: 0,
            restaurants: [],
          };
        }

        const monthlyPrice = Number(row.monthly_price || 50);
        const durationMonths = Number(row.duration_months || 12);
        const totalContract = monthlyPrice * durationMonths;
        
        const renewalType = Number(row.renewal_type);
        let commissionPercent = Number(row.new_client_commission_percent);
        let commissionType = 'Alta Nueva';

        if (renewalType === 1) {
          commissionPercent = Number(row.first_renewal_commission_percent);
          commissionType = 'Primera Renovación';
        } else if (renewalType === 2) {
          commissionPercent = Number(row.renewal_commission_percent);
          commissionType = 'Renovación';
        }

        const commission = (totalContract * commissionPercent) / 100;

        commissionsBySalesRep[repId].totalCommission += commission;
        commissionsBySalesRep[repId].restaurants.push({
          restaurantId: String(row.restaurant_id),
          restaurantName: String(row.restaurant_name),
          contractDate: String(row.contract_date),
          monthlyPrice,
          durationMonths,
          totalContract,
          commissionType,
          commissionPercent,
          commission,
        });
      }

      const commissionsArray = Object.values(commissionsBySalesRep);

      console.log(`✅ [SALES REP COMMISSIONS] ${commissionsArray.length} comerciales con comisiones`);
      return commissionsArray;
    } catch (error: any) {
      console.error('❌ [SALES REP COMMISSIONS] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al calcular comisiones: ${error.message}`,
      });
    }
  });
