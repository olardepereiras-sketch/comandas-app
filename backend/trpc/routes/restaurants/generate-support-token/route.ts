import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const generateSupportTokenProcedure = publicProcedure
  .input(z.object({
    sessionId: z.string(),
    restaurantId: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[generateSupportToken] Generando token soporte para restaurante:', input.restaurantId);

    const sessionResult = await ctx.db.query(
      `SELECT s.id, s.user_id, s.user_type, s.ip_address, a.username as admin_username
       FROM auth_sessions s
       JOIN admin_users a ON s.user_id = a.id
       WHERE s.id = $1 AND s.user_type = 'admin'
       UNION ALL
       SELECT s.id, s.user_id, s.user_type, s.ip_address, sa.username as admin_username
       FROM auth_sessions s
       JOIN sub_admin_users sa ON s.user_id = sa.id
       WHERE s.id = $1 AND s.user_type = 'subadmin'`,
      [input.sessionId]
    );

    if (sessionResult.rows.length === 0) throw new Error('Sesión inválida');

    await ctx.db.query(
      `UPDATE auth_sessions SET expires_at = NOW() + INTERVAL '7 days' WHERE id = $1`,
      [input.sessionId]
    );
    console.log('[generateSupportToken] Sesión refrescada:', input.sessionId.substring(0, 20));

    const session = sessionResult.rows[0];
    const adminType = session.user_type === 'subadmin' ? 'subadmin' : 'superadmin';

    const restaurantResult = await ctx.db.query(
      'SELECT id, name, slug FROM restaurants WHERE id = $1',
      [input.restaurantId]
    );
    if (restaurantResult.rows.length === 0) throw new Error('Restaurante no encontrado');

    const restaurant = restaurantResult.rows[0];

    const token = `support_${Date.now()}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const tokenId = `stkn_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await ctx.db.query(
      `INSERT INTO admin_support_tokens (id, admin_id, admin_name, restaurant_id, restaurant_name, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [tokenId, session.user_id, session.admin_username, input.restaurantId, restaurant.name, token, expiresAt]
    );

    await ctx.db.query(
      `INSERT INTO admin_audit_log (id, admin_id, admin_type, admin_name, action, entity_type, entity_id, entity_name, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        session.user_id, adminType, session.admin_username,
        'support_access', 'restaurant', input.restaurantId, restaurant.name,
        JSON.stringify({ tokenId, expiresAt }),
        session.ip_address
      ]
    );

    console.log('[generateSupportToken] Token generado:', tokenId);

    return {
      token,
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      expiresAt: expiresAt.toISOString(),
      accessUrl: `/restaurant/support-access/${restaurant.slug}?token=${token}`,
    };
  });
