import { publicProcedure } from '../../../create-context';
import type { SubscriptionDuration } from '@/types';

export const listSubscriptionDurationsProcedure = publicProcedure.query(async ({ ctx }) => {
  const result = await ctx.db.query(
    'SELECT * FROM subscription_durations WHERE is_active = true AND is_visible = true ORDER BY months ASC'
  );
  
  const durations: SubscriptionDuration[] = result.rows.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    months: Number(row.months),
    description: row.description ? String(row.description) : undefined,
    isActive: Boolean(row.is_active),
    isVisible: row.is_visible !== undefined ? Boolean(row.is_visible) : true,
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
  }));
  
  return durations;
});
