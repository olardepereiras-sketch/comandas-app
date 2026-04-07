import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const validateAdminSessionProcedure = publicProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('[validateAdminSession] Validando sesión:', input.sessionId.substring(0, 20) + '...');

    const adminResult = await ctx.db.query(
      `SELECT s.*, a.username, a.email, a.is_superadmin, NULL::jsonb as permissions
       FROM auth_sessions s
       JOIN admin_users a ON s.user_id = a.id
       WHERE s.id = $1 AND s.user_type = 'admin' AND s.expires_at > NOW()`,
      [input.sessionId]
    );

    if (adminResult.rows.length > 0) {
      const s = adminResult.rows[0];
      console.log('[validateAdminSession] Sesión admin válida');
      return {
        valid: true,
        userId: s.user_id,
        userType: 'admin' as const,
        isSuperAdmin: s.is_superadmin !== false,
        username: s.username,
        email: s.email,
        permissions: null as string[] | null,
      };
    }

    const subAdminResult = await ctx.db.query(
      `SELECT s.*, sa.username, sa.email, sa.permissions, sa.first_name, sa.last_name
       FROM auth_sessions s
       JOIN sub_admin_users sa ON s.user_id = sa.id
       WHERE s.id = $1 AND s.user_type = 'subadmin' AND s.expires_at > NOW()`,
      [input.sessionId]
    );

    if (subAdminResult.rows.length > 0) {
      const s = subAdminResult.rows[0];
      console.log('[validateAdminSession] Sesión sub-admin válida');
      return {
        valid: true,
        userId: s.user_id,
        userType: 'subadmin' as const,
        isSuperAdmin: false,
        username: s.username,
        email: s.email,
        permissions: (s.permissions || []) as string[],
      };
    }

    console.log('[validateAdminSession] Sesión inválida o expirada');
    return {
      valid: false,
      userId: '',
      userType: 'admin' as const,
      isSuperAdmin: false,
      username: '',
      email: '',
      permissions: null as string[] | null,
    };
  });
