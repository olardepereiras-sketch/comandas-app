import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const validateSupportTokenProcedure = publicProcedure
  .input(z.object({
    token: z.string(),
    slug: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[validateSupportToken] Validando token soporte para slug:', input.slug);

    const tokenResult = await ctx.db.query(
      `SELECT ast.*, r.id as rid, r.name, r.slug, r.username
       FROM admin_support_tokens ast
       JOIN restaurants r ON ast.restaurant_id = r.id
       WHERE ast.token = $1 AND r.slug = $2 AND ast.expires_at > NOW() AND ast.used_at IS NULL`,
      [input.token, input.slug]
    );

    if (tokenResult.rows.length === 0) {
      console.log('[validateSupportToken] Token inválido o expirado');
      throw new Error('El enlace de acceso soporte es inválido o ha expirado');
    }

    const tokenRow = tokenResult.rows[0];

    await ctx.db.query(
      'UPDATE admin_support_tokens SET used_at = NOW() WHERE id = $1',
      [tokenRow.id]
    );

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await ctx.db.query(
      `INSERT INTO auth_sessions (id, user_id, user_type, ip_address, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [sessionId, tokenRow.restaurant_id, 'restaurant_support', 'admin_support', expiresAt]
    );

    await ctx.db.query(
      `INSERT INTO admin_audit_log (id, admin_id, admin_type, admin_name, action, entity_type, entity_id, entity_name, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        tokenRow.admin_id, 'superadmin', tokenRow.admin_name,
        'support_session_used', 'restaurant', tokenRow.restaurant_id, tokenRow.name,
        JSON.stringify({ tokenId: tokenRow.id, sessionId }),
        'admin_support'
      ]
    );

    console.log('[validateSupportToken] Sesión soporte creada:', sessionId);

    return {
      sessionId,
      restaurantId: tokenRow.restaurant_id,
      restaurantName: tokenRow.name,
      restaurantSlug: tokenRow.slug,
    };
  });
