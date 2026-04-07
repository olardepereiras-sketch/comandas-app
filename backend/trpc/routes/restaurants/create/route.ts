import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const createRestaurantProcedure = publicProcedure
  .input(
    z.object({
      name: z.string(),
      description: z.string(),
      username: z.string(),
      password: z.string(),
      profileImageUrl: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      cuisineType: z.array(z.string()),
      address: z.string(),
      postalCode: z.string().optional(),
      phone: z.string(),
      email: z.string().email(),
      cityId: z.string(),
      provinceId: z.string(),
      subscriptionPlanId: z.string().optional(),
      subscriptionDurationMonths: z.number().default(12),
      salesRepId: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE RESTAURANT] Creando restaurante:', input.name);

    const id = `rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let baseSlug = input.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Verificar si el slug ya existe y generar uno único
    let slug = baseSlug;
    let counter = 1;
    let slugExists = true;

    while (slugExists) {
      const checkResult = await ctx.db.query(
        'SELECT id FROM restaurants WHERE slug = $1',
        [slug]
      );
      
      if (checkResult.rows.length === 0) {
        slugExists = false;
      } else {
        counter++;
        slug = `${baseSlug}-${counter}`;
        console.log(`🔄 [CREATE RESTAURANT] Slug duplicado, intentando: ${slug}`);
      }
    }

    console.log('✅ [CREATE RESTAURANT] Slug único generado:', slug);

    const now = new Date().toISOString();
    const subscriptionExpiryDate = new Date();
    subscriptionExpiryDate.setMonth(subscriptionExpiryDate.getMonth() + input.subscriptionDurationMonths);
    const subscriptionExpiry = subscriptionExpiryDate.toISOString();

    const sql = `
      INSERT INTO restaurants (
        id, name, description, username, password, profile_image_url, google_maps_url,
        cuisine_type, address, postal_code, city_id, province_id, phone, email, 
        slug, image_url, is_active, subscription_plan_id, subscription_expiry,
        enabled_modules, advance_booking_days, custom_links, sales_rep_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    `;

    const defaultEnabledModules = ['info-config', 'reservations'];
    const imageUrl = input.profileImageUrl || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800';

    try {
      const result = await ctx.db.query(
        sql,
        [
          id,
          input.name,
          input.description,
          input.username,
          input.password,
          input.profileImageUrl || null,
          input.googleMapsUrl || null,
          JSON.stringify(input.cuisineType.map(ct => ct.replace('cuisine-', ''))),
          input.address,
          input.postalCode || null,
          input.cityId,
          input.provinceId,
          JSON.stringify([input.phone]),
          input.email,
          slug,
          imageUrl,
          false,
          input.subscriptionPlanId || null,
          subscriptionExpiry,
          JSON.stringify(defaultEnabledModules),
          30,
          JSON.stringify([]),
          input.salesRepId || 'salesrep-website',
          now,
          now,
        ]
      );

      const accessUrl = `https://quieromesa.com/restaurant/login/${slug}`;

      console.log('✅ [CREATE RESTAURANT] Restaurante creado:', {
        id,
        name: input.name,
        slug,
        accessUrl,
        rowsAffected: result.rowCount,
      });

      const response = {
        id: String(id),
        name: String(input.name),
        slug: String(slug),
        accessUrl: String(accessUrl),
      };
      
      return response;
    } catch (error: any) {
      console.error('❌ [CREATE RESTAURANT] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al crear el restaurante: ${error.message}`,
      });
    }
  });
