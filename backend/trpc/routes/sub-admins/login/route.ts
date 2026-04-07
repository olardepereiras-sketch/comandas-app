import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { sendVerificationCode } from '../../../../services/email';

export const subAdminLoginProcedure = publicProcedure
  .input(z.object({
    username: z.string(),
    password: z.string(),
    ipAddress: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[subAdminLogin] Intentando login:', input.username);

    const result = await ctx.db.query(
      'SELECT * FROM sub_admin_users WHERE username = $1 AND password = $2 AND is_active = true',
      [input.username, input.password]
    );

    if (result.rows.length === 0) throw new Error('Usuario o contraseña incorrectos');

    const user = result.rows[0] as any;
    console.log('[subAdminLogin] Sub-admin encontrado:', user.id);

    const lastIp = user.last_ip;
    const requiresVerification = lastIp !== input.ipAddress;

    if (requiresVerification && process.env.RESEND_API_KEY) {
      try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        await ctx.db.query(
          `INSERT INTO verification_codes (id, user_id, user_type, code, ip_address, expires_at, used, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            `vcode_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            user.id, 'subadmin', code, input.ipAddress, expiresAt, false, new Date()
          ]
        );

        const emailResult = await sendVerificationCode({ to: user.email, code, userType: 'admin' });

        if (emailResult.success) {
          return { requiresVerification: true, userId: user.id, email: user.email };
        }
      } catch (error) {
        console.error('[subAdminLogin] Error verificación:', error);
      }
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.query(
      `INSERT INTO auth_sessions (id, user_id, user_type, ip_address, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, user.id, 'subadmin', input.ipAddress, new Date(expiresAt), new Date()]
    );

    await ctx.db.query(
      `INSERT INTO admin_audit_log (id, admin_id, admin_type, admin_name, action, entity_type, entity_id, entity_name, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        user.id, 'subadmin', user.username,
        'login', 'session', sessionId, 'Login',
        JSON.stringify({ ip: input.ipAddress }), input.ipAddress
      ]
    );

    return {
      requiresVerification: false,
      sessionId,
      userId: user.id,
      userType: 'subadmin',
      permissions: user.permissions || [],
      firstName: user.first_name,
      lastName: user.last_name,
    };
  });
