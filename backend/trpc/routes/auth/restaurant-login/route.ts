import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { sendVerificationCode } from '../../../../services/email';

export const restaurantLoginProcedure = publicProcedure
  .input(
    z.object({
      slug: z.string(),
      username: z.string(),
      password: z.string(),
      ipAddress: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[restaurantLogin] Intentando login para restaurante:', input.slug);

    const result = await ctx.db.query(
      'SELECT * FROM restaurants WHERE (slug = $1 OR id = $1) AND username = $2 AND password = $3',
      [input.slug, input.username, input.password]
    );

    if (result.rows.length === 0) {
      console.log('[restaurantLogin] Credenciales inválidas');
      throw new Error('Usuario o contraseña incorrectos');
    }

    const restaurant = result.rows[0] as any;
    console.log('[restaurantLogin] Restaurante encontrado:', restaurant.id);

    const isExpired = restaurant.subscription_expiry && new Date(restaurant.subscription_expiry) < new Date();
    if (isExpired) {
      console.log('[restaurantLogin] Suscripción caducada');
      throw new Error('Tu suscripción ha caducado. Por favor, contacta con el administrador para renovarla.');
    }

    const lastIp = restaurant.last_ip;
    const requiresVerification = lastIp !== input.ipAddress;

    if (requiresVerification && process.env.RESEND_API_KEY) {
      console.log('[restaurantLogin] Nueva IP detectada, enviando código de verificación...');
      
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
            restaurant.id,
            'restaurant',
            code,
            input.ipAddress,
            expiresAt,
            false,
            new Date()
          ]
        );

        const emailResult = await sendVerificationCode({
          to: restaurant.email,
          code,
          userType: 'restaurant',
          restaurantName: restaurant.name,
        });

        if (emailResult.success) {
          console.log('[restaurantLogin] Código enviado exitosamente');
          return {
            requiresVerification: true,
            userId: restaurant.id,
            email: restaurant.email,
            restaurantName: restaurant.name,
          };
        } else {
          console.warn('[restaurantLogin] Error al enviar código, permitiendo acceso directo:', emailResult.error);
        }
      } catch (error) {
        console.error('[restaurantLogin] Error en verificación:', error);
        console.log('[restaurantLogin] Permitiendo acceso directo debido al error');
      }
    } else if (requiresVerification) {
      console.log('[restaurantLogin] Nueva IP detectada pero email no configurado, permitiendo acceso directo');
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await ctx.db.query(
      `INSERT INTO auth_sessions 
       (id, user_id, user_type, ip_address, expires_at, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, restaurant.id, 'restaurant', input.ipAddress, new Date(expiresAt), new Date()]
    );

    console.log('[restaurantLogin] Login exitoso desde IP conocida, sesión creada:', sessionId);

    return {
      requiresVerification: false,
      sessionId,
      userId: restaurant.id,
      restaurantName: restaurant.name,
    };
  });
