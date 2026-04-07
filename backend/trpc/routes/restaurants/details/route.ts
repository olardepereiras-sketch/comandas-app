import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { Restaurant, CuisineType } from '@/types';
import { getAbsoluteImageUrl } from '../../../../utils/imageUrl';

export const restaurantDetailsProcedure = publicProcedure
  .input(z.object({ slug: z.string().optional(), restaurantId: z.string().optional() }))
  .query(async ({ input, ctx }) => {
    console.log('🔍 [RESTAURANT DETAILS] Buscando restaurante:', input);
    
    if (!input.slug && !input.restaurantId) {
      console.error('❌ [RESTAURANT DETAILS] Falta slug o restaurantId');
      throw new Error('Either slug or restaurantId is required');
    }
    
    const restaurantResult = input.restaurantId
      ? await ctx.db.query('SELECT * FROM restaurants WHERE id = $1', [input.restaurantId])
      : await ctx.db.query('SELECT * FROM restaurants WHERE slug = $1', [input.slug]);
    
    console.log('📊 [RESTAURANT DETAILS] Resultado de query:', restaurantResult.rows.length, 'restaurantes encontrados');
    
    if (restaurantResult.rows.length === 0) {
      throw new Error('Restaurant not found');
    }

    const row = restaurantResult.rows[0] as any;
    
    const isExpired = row.subscription_expiry && new Date(row.subscription_expiry) < new Date();
    if (isExpired) {
      throw new Error('Este restaurante no está disponible actualmente. La suscripción ha caducado.');
    }
    
    let enabledModules: string[] = [];
    console.log('🔍 [RESTAURANT DETAILS] Obteniendo módulos del plan de suscripción');
    
    if (row.subscription_plan_id) {
      const planResult = await ctx.db.query(
        'SELECT enabled_modules FROM subscription_plans WHERE id = $1',
        [row.subscription_plan_id]
      );
      
      if (planResult.rows.length > 0) {
        const planRow = planResult.rows[0] as any;
        try {
          if (planRow.enabled_modules) {
            if (typeof planRow.enabled_modules === 'string') {
              enabledModules = JSON.parse(planRow.enabled_modules);
            } else if (Array.isArray(planRow.enabled_modules)) {
              enabledModules = planRow.enabled_modules;
            }
          }
          console.log('✅ [RESTAURANT DETAILS] Módulos del plan:', enabledModules);
        } catch (err) {
          console.error('❌ [RESTAURANT DETAILS] Error parseando módulos:', err);
        }
      } else {
        console.warn('⚠️ [RESTAURANT DETAILS] Plan no encontrado:', row.subscription_plan_id);
      }
    } else {
      console.warn('⚠️ [RESTAURANT DETAILS] Restaurante sin plan de suscripción');
    }
    
    const safeJsonParse = (val: any, fallback: any = []) => {
      if (Array.isArray(val)) return val;
      if (!val) return fallback;
      try { return JSON.parse(val); } catch { return fallback; }
    };

    const restaurant: Restaurant = {
      id: row.id,
      name: row.name,
      description: row.description,
      username: row.username,
      password: row.password,
      profileImageUrl: getAbsoluteImageUrl(row.profile_image_url),
      googleMapsUrl: row.google_maps_url,
      cuisineType: safeJsonParse(row.cuisine_type) as CuisineType[],
      address: row.address,
      postalCode: row.postal_code,
      cityId: row.city_id,
      provinceId: row.province_id,
      phone: safeJsonParse(row.phone) as string[],
      email: row.email,
      slug: row.slug,
      imageUrl: getAbsoluteImageUrl(row.image_url || row.profile_image_url),
      isActive: Boolean(row.is_active),
      subscriptionPlanId: row.subscription_plan_id,
      subscriptionExpiry: row.subscription_expiry ? String(row.subscription_expiry) : null,
      subscriptionDurationMonths: row.subscription_duration_months || null,
      enabledModules: enabledModules,
      advanceBookingDays: row.advance_booking_days,
      customLinks: safeJsonParse(row.custom_links),
      notificationPhones: safeJsonParse(row.notification_phones),
      notificationEmail: row.notification_email || undefined,
      whatsappCustomMessage: row.whatsapp_custom_message || undefined,
      availableHighChairs: row.available_high_chairs || 0,
      highChairRotationMinutes: row.high_chair_rotation_minutes || 120,
      importantMessageEnabled: row.important_message_enabled === true || row.important_message_enabled === 't' || row.important_message_enabled === 'true' || row.important_message_enabled === 1,
      importantMessage: row.important_message || '',
      createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
      updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
    };

    let city = null;
    let province = null;
    
    if (row.city_id) {
      const cityResult = await ctx.db.query(
        'SELECT * FROM cities WHERE id = $1',
        [row.city_id]
      );
      if (cityResult.rows.length > 0) {
        const cityRow = cityResult.rows[0] as any;
        city = {
          id: cityRow.id,
          name: cityRow.name,
          provinceId: cityRow.province_id,
        };
      }
    }
    
    if (row.province_id) {
      const provinceResult = await ctx.db.query(
        'SELECT * FROM provinces WHERE id = $1',
        [row.province_id]
      );
      if (provinceResult.rows.length > 0) {
        const provinceRow = provinceResult.rows[0] as any;
        province = {
          id: provinceRow.id,
          name: provinceRow.name,
        };
      }
    }

    const locationsResult = await ctx.db.query(
      'SELECT * FROM table_locations WHERE restaurant_id = $1 ORDER BY order_num',
      [restaurant.id]
    );

    const tablesResult = await ctx.db.query(
      'SELECT * FROM tables WHERE restaurant_id = $1 ORDER BY order_num',
      [restaurant.id]
    );

    const locations = locationsResult.rows.map((locRow: any) => ({
      id: locRow.id,
      restaurantId: locRow.restaurant_id,
      name: locRow.name,
      imageUrl: getAbsoluteImageUrl(locRow.image_url),
      order: locRow.order,
      createdAt: locRow.created_at ? String(locRow.created_at) : new Date().toISOString(),
      tables: tablesResult.rows
        .filter((tRow: any) => tRow.location_id === locRow.id)
        .map((tRow: any) => ({
          id: tRow.id,
          locationId: tRow.location_id,
          restaurantId: tRow.restaurant_id,
          name: tRow.name,
          minCapacity: tRow.min_capacity,
          maxCapacity: tRow.max_capacity,
          allowsHighChairs: Boolean(tRow.allows_high_chairs),
          allowsStrollers: Boolean(tRow.allows_strollers),
          allowsPets: Boolean(tRow.allows_pets),
          order: tRow.order,
          createdAt: tRow.created_at ? String(tRow.created_at) : new Date().toISOString(),
        })),
    }));

    return {
      ...restaurant,
      city,
      province,
      locations,
    };
  });
