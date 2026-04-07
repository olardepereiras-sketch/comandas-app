import { publicProcedure } from '../../../create-context';
import type { SubscriptionPlan } from '@/types';

export const listAllSubscriptionPlansProcedure = publicProcedure.query(async ({ ctx }) => {
  console.log('🔵 [LIST ALL SUBSCRIPTION PLANS] Obteniendo todos los planes...');
  const result = await ctx.db.query(
    'SELECT * FROM subscription_plans ORDER BY price ASC'
  );
  
  console.log('🔍 [LIST ALL SUBSCRIPTION PLANS] Planes encontrados:', result.rows.length);
  
  const plans: SubscriptionPlan[] = result.rows.map((row: any) => {
    let enabledModules: string[] = [];
    try {
      if (row.enabled_modules) {
        if (typeof row.enabled_modules === 'string') {
          enabledModules = JSON.parse(row.enabled_modules);
        } else if (Array.isArray(row.enabled_modules)) {
          enabledModules = row.enabled_modules;
        }
      }
    } catch (err) {
      console.warn('⚠️ [LIST ALL SUBSCRIPTION PLANS] Failed to parse enabled_modules for plan:', row.id, err);
    }
    
    let allowedDurationIds: string[] = [];
    try {
      if (row.allowed_duration_ids) {
        if (typeof row.allowed_duration_ids === 'string') {
          allowedDurationIds = JSON.parse(row.allowed_duration_ids);
        } else if (Array.isArray(row.allowed_duration_ids)) {
          allowedDurationIds = row.allowed_duration_ids;
        }
      }
    } catch (err) {
      console.warn('⚠️ [LIST ALL SUBSCRIPTION PLANS] Failed to parse allowed_duration_ids for plan:', row.id, err);
    }
    
    return {
      id: String(row.id),
      name: String(row.name),
      price: Number(row.price),
      enabledModules,
      allowedDurationIds,
      isActive: Boolean(row.is_active),
      isVisible: row.is_visible !== undefined ? Boolean(row.is_visible) : true,
      createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
      updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
    };
  });
  
  console.log('✅ [LIST ALL SUBSCRIPTION PLANS] Total planes retornados:', plans.length);
  return plans;
});
