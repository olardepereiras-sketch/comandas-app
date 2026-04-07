import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const listSubAdminsProcedure = publicProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('[listSubAdmins] Listando sub-administradores');

    const sessionResult = await ctx.db.query(
      `SELECT s.*, a.is_superadmin FROM auth_sessions s
       JOIN admin_users a ON s.user_id = a.id
       WHERE s.id = $1 AND s.user_type = 'admin' AND s.expires_at > NOW()`,
      [input.sessionId]
    );

    if (sessionResult.rows.length === 0) throw new Error('Sesión inválida');
    if (!sessionResult.rows[0].is_superadmin) throw new Error('Solo el superadministrador puede ver sub-admins');

    const result = await ctx.db.query(
      `SELECT id, username, email, first_name, last_name, permissions, is_active, last_ip, created_at, updated_at
       FROM sub_admin_users ORDER BY created_at DESC`
    );

    return result.rows;
  });
