import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { sendVerificationCode } from '../../../../services/email';

export const adminLoginProcedure = publicProcedure
  .input(
    z.object({
      username: z.string(),
      password: z.string(),
      ipAddress: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[adminLogin] Intentando login:', { username: input.username, ip: input.ipAddress });

    const result = await ctx.db.query(
      'SELECT * FROM admin_users WHERE username = $1 AND password = $2',
      [input.username, input.password]
    );

    if (result.rows.length === 0) {
      console.log('[adminLogin] Credenciales inválidas');
      throw new Error('Usuario o contraseña incorrectos');
    }

    const user = result.rows[0] as any;
    console.log('[adminLogin] Usuario encontrado:', user.id);

    const lastIp = user.last_ip;
    const requiresVerification = lastIp !== input.ipAddress;

    if (requiresVerification && process.env.RESEND_API_KEY) {
      console.log('[adminLogin] Nueva IP detectada, enviando código de verificación...');

      try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        await ctx.db.query(
          `INSERT INTO verification_codes 
           (id, user_id, user_type, code, ip_address, expires_at, used, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            `vcode_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            user.id,
            'admin',
            code,
            input.ipAddress,
            expiresAt,
            false,
            new Date()
          ]
        );

        const emailResult = await sendVerificationCode({
          to: user.email,
          code,
          userType: 'admin',
        });

        if (emailResult.success) {
          console.log('[adminLogin] Código enviado exitosamente');
          return {
            requiresVerification: true,
            userId: user.id,
            email: user.email,
          };
        } else {
          console.warn('[adminLogin] Error al enviar código, permitiendo acceso directo:', emailResult.error);
        }
      } catch (error) {
        console.error('[adminLogin] Error en verificación:', error);
        console.log('[adminLogin] Permitiendo acceso directo debido al error');
      }
    } else if (requiresVerification) {
      console.log('[adminLogin] Nueva IP detectada pero email no configurado, permitiendo acceso directo');
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.query(
      `INSERT INTO auth_sessions 
       (id, user_id, user_type, ip_address, expires_at, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, user.id, 'admin', input.ipAddress, new Date(expiresAt), new Date()]
    );

    console.log('[adminLogin] Login exitoso desde IP conocida, sesión creada:', sessionId);

    return {
      requiresVerification: false,
      sessionId,
      userId: user.id,
      email: user.email,
    };
  });
