import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const logAdminActionProcedure = publicProcedure
  .input(z.object({
    sessionId: z.string(),
    action: z.string(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    entityName: z.string().optional(),
    details: z.record(z.any()).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[logAdminAction] Registrando acción:', input.action);

    const adminSession = await ctx.db.query(
      `SELECT s.*, a.is_superadmin, a.username as admin_name FROM auth_sessions s
       JOIN admin_users a ON s.user_id = a.id
       WHERE s.id = $1 AND s.user_type = 'admin' AND s.expires_at > NOW()`,
      [input.sessionId]
    );

    let adminId: string;
    let adminType: string;
    let adminName: string;
    let ipAddress: string;

    if (adminSession.rows.length > 0) {
      const s = adminSession.rows[0];
      adminId = s.user_id;
      adminType = s.is_superadmin ? 'superadmin' : 'admin';
      adminName = s.admin_name;
      ipAddress = s.ip_address;
    } else {
      const subAdminSession = await ctx.db.query(
        `SELECT s.*, sa.username as admin_name FROM auth_sessions s
         JOIN sub_admin_users sa ON s.user_id = sa.id
         WHERE s.id = $1 AND s.user_type = 'subadmin' AND s.expires_at > NOW()`,
        [input.sessionId]
      );
      if (subAdminSession.rows.length === 0) throw new Error('Sesión inválida');
      const s = subAdminSession.rows[0];
      adminId = s.user_id;
      adminType = 'subadmin';
      adminName = s.admin_name;
      ipAddress = s.ip_address;
    }

    await ctx.db.query(
      `INSERT INTO admin_audit_log (id, admin_id, admin_type, admin_name, action, entity_type, entity_id, entity_name, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        adminId, adminType, adminName,
        input.action, input.entityType || null, input.entityId || null, input.entityName || null,
        JSON.stringify(input.details || {}), ipAddress
      ]
    );

    return { success: true };
  });
