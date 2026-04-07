import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const verifyCodeProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      code: z.string(),
      ipAddress: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[verifyCode] Verificando código para usuario:', input.userId);

    const result = await ctx.db.query(
      `SELECT * FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND used = false AND expires_at > $3
       ORDER BY created_at DESC LIMIT 1`,
      [input.userId, input.code, new Date()]
    );

    if (result.rows.length === 0) {
      console.log('[verifyCode] Código inválido o expirado');
      throw new Error('Código de verificación inválido o expirado');
    }

    const verificationCode = result.rows[0] as any;
    console.log('[verifyCode] Código válido, marcando como usado...');

    await ctx.db.query(
      'UPDATE verification_codes SET used = true WHERE id = $1',
      [verificationCode.id]
    );

    const userType = verificationCode.user_type;
    let tableName = 'admin_users';
    if (userType === 'restaurant') {
      tableName = 'restaurants';
    }

    await ctx.db.query(
      `UPDATE ${tableName} SET last_ip = $1 WHERE id = $2`,
      [input.ipAddress, input.userId]
    );

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.query(
      `INSERT INTO auth_sessions 
       (id, user_id, user_type, ip_address, expires_at, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, input.userId, userType, input.ipAddress, new Date(expiresAt), new Date()]
    );

    console.log('[verifyCode] Verificación exitosa, sesión creada:', sessionId);

    return {
      sessionId,
      userId: input.userId,
      userType,
    };
  });
