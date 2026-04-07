import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const deleteSubAdminProcedure = publicProcedure
  .input(z.object({
    sessionId: z.string(),
    id: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[deleteSubAdmin] Eliminando sub-admin:', input.id);

    const sessionResult = await ctx.db.query(
      `SELECT s.*, a.is_superadmin, a.username as admin_username FROM auth_sessions s
       JOIN admin_users a ON s.user_id = a.id
       WHERE s.id = $1 AND s.user_type = 'admin' AND s.expires_at > NOW()`,
      [input.sessionId]
    );

    if (sessionResult.rows.length === 0) throw new Error('Sesión inválida');
    if (!sessionResult.rows[0].is_superadmin) throw new Error('Sin permisos');

    const session = sessionResult.rows[0];
    const subAdminResult = await ctx.db.query('SELECT username FROM sub_admin_users WHERE id = $1', [input.id]);
    const subAdminName = subAdminResult.rows[0]?.username || input.id;

    await ctx.db.query('DELETE FROM sub_admin_users WHERE id = $1', [input.id]);

    await ctx.db.query(
      `INSERT INTO admin_audit_log (id, admin_id, admin_type, admin_name, action, entity_type, entity_id, entity_name, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        session.user_id, 'superadmin', session.admin_username,
        'delete_subadmin', 'sub_admin', input.id, subAdminName,
        JSON.stringify({}), session.ip_address
      ]
    );

    return { success: true };
  });
