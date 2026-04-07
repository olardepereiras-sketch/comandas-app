import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const listAdminAuditProcedure = publicProcedure
  .input(z.object({
    sessionId: z.string(),
    limit: z.number().default(100),
    offset: z.number().default(0),
    adminId: z.string().optional(),
    action: z.string().optional(),
  }))
  .query(async ({ input, ctx }) => {
    console.log('[listAdminAudit] Listando registro de actividad');

    const sessionResult = await ctx.db.query(
      `SELECT s.*, a.is_superadmin FROM auth_sessions s
       JOIN admin_users a ON s.user_id = a.id
       WHERE s.id = $1 AND s.user_type = 'admin' AND s.expires_at > NOW()`,
      [input.sessionId]
    );

    if (sessionResult.rows.length === 0) throw new Error('Sesión inválida');
    if (!sessionResult.rows[0].is_superadmin) throw new Error('Solo el superadministrador puede ver el registro');

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.adminId) { conditions.push(`admin_id = $${idx++}`); values.push(input.adminId); }
    if (input.action) { conditions.push(`action = $${idx++}`); values.push(input.action); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    values.push(input.limit, input.offset);
    const result = await ctx.db.query(
      `SELECT * FROM admin_audit_log ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    const countResult = await ctx.db.query(
      `SELECT COUNT(*) as total FROM admin_audit_log ${where}`,
      conditions.length > 0 ? values.slice(0, values.length - 2) : []
    );

    return {
      logs: result.rows,
      total: parseInt(countResult.rows[0].total),
    };
  });
