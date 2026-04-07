import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const updateSubAdminProcedure = publicProcedure
  .input(z.object({
    sessionId: z.string(),
    id: z.string(),
    password: z.string().optional(),
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[updateSubAdmin] Actualizando sub-admin:', input.id);

    const sessionResult = await ctx.db.query(
      `SELECT s.*, a.is_superadmin, a.username as admin_username FROM auth_sessions s
       JOIN admin_users a ON s.user_id = a.id
       WHERE s.id = $1 AND s.user_type = 'admin' AND s.expires_at > NOW()`,
      [input.sessionId]
    );

    if (sessionResult.rows.length === 0) throw new Error('Sesión inválida');
    if (!sessionResult.rows[0].is_superadmin) throw new Error('Sin permisos');

    const session = sessionResult.rows[0];

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.password !== undefined) { fields.push(`password = $${idx++}`); values.push(input.password); }
    if (input.email !== undefined) { fields.push(`email = $${idx++}`); values.push(input.email); }
    if (input.firstName !== undefined) { fields.push(`first_name = $${idx++}`); values.push(input.firstName); }
    if (input.lastName !== undefined) { fields.push(`last_name = $${idx++}`); values.push(input.lastName); }
    if (input.permissions !== undefined) { fields.push(`permissions = $${idx++}`); values.push(JSON.stringify(input.permissions)); }
    if (input.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(input.isActive); }
    fields.push('updated_at = NOW()');

    values.push(input.id);
    await ctx.db.query(`UPDATE sub_admin_users SET ${fields.join(', ')} WHERE id = $${idx}`, values);

    const subAdminResult = await ctx.db.query('SELECT username FROM sub_admin_users WHERE id = $1', [input.id]);
    const subAdminName = subAdminResult.rows[0]?.username || input.id;

    await ctx.db.query(
      `INSERT INTO admin_audit_log (id, admin_id, admin_type, admin_name, action, entity_type, entity_id, entity_name, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        session.user_id, 'superadmin', session.admin_username,
        'update_subadmin', 'sub_admin', input.id, subAdminName,
        JSON.stringify({ permissions: input.permissions, isActive: input.isActive }),
        session.ip_address
      ]
    );

    return { success: true };
  });
