import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const createSubAdminProcedure = publicProcedure
  .input(z.object({
    sessionId: z.string(),
    username: z.string().min(3),
    password: z.string().min(6),
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    permissions: z.array(z.string()).default([]),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[createSubAdmin] Creando sub-admin:', input.username);

    const sessionResult = await ctx.db.query(
      `SELECT s.*, a.is_superadmin, a.username as admin_username FROM auth_sessions s
       JOIN admin_users a ON s.user_id = a.id
       WHERE s.id = $1 AND s.user_type = 'admin' AND s.expires_at > NOW()`,
      [input.sessionId]
    );

    if (sessionResult.rows.length === 0) throw new Error('Sesión inválida');
    if (!sessionResult.rows[0].is_superadmin) throw new Error('Solo el superadministrador puede crear sub-admins');

    const session = sessionResult.rows[0];

    const existing = await ctx.db.query('SELECT id FROM sub_admin_users WHERE username = $1', [input.username]);
    if (existing.rows.length > 0) throw new Error('El nombre de usuario ya existe');

    const id = `subadmin_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await ctx.db.query(
      `INSERT INTO sub_admin_users (id, username, password, email, first_name, last_name, permissions, is_active, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [id, input.username, input.password, input.email, input.firstName, input.lastName || '', JSON.stringify(input.permissions), true, session.user_id]
    );

    await ctx.db.query(
      `INSERT INTO admin_audit_log (id, admin_id, admin_type, admin_name, action, entity_type, entity_id, entity_name, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        session.user_id, 'superadmin', session.admin_username,
        'create_subadmin', 'sub_admin', id, input.username,
        JSON.stringify({ email: input.email, permissions: input.permissions }),
        session.ip_address
      ]
    );

    return { id, username: input.username };
  });
