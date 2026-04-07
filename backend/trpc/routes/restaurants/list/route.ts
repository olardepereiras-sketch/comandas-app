import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { Restaurant, CuisineType } from '@/types';
import { getAbsoluteImageUrl } from '../../../../utils/imageUrl';

export const listRestaurantsProcedure = publicProcedure
  .input(
    z.object({
      provinceId: z.string().optional(),
      cityId: z.string().optional(),
      cuisineTypes: z.array(z.string()).optional(),
      searchText: z.string().optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      guests: z.number().optional(),
      needsHighChair: z.boolean().optional(),
      needsStroller: z.boolean().optional(),
      hasPets: z.boolean().optional(),
      includeInactive: z.boolean().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    let sql = `
      SELECT r.*, c.name as city_name, p.name as province_name
      FROM restaurants r
      LEFT JOIN cities c ON r.city_id = c.id
      LEFT JOIN provinces p ON r.province_id = p.id
      WHERE 1=1
    `;
    
    if (!input.includeInactive) {
      sql += ` AND r.is_active = true AND r.subscription_expiry > NOW()`;
    }
    const params: any[] = [];

    if (input.provinceId) {
      sql += ' AND r.province_id = $' + (params.length + 1);
      params.push(input.provinceId);
    }

    if (input.cityId) {
      sql += ' AND r.city_id = $' + (params.length + 1);
      params.push(input.cityId);
    }

    const result = await ctx.db.query(sql, params);
    
    let restaurants = result.rows.map((row: any) => {
      let cuisineType: CuisineType[] = [];
      let phone: string[] = [];
      let enabledModules: import('@/types').RestaurantModule[] = [];
      let customLinks: any[] = [];

      try {
        cuisineType = row.cuisine_type ? JSON.parse(row.cuisine_type) : [];
      } catch {
        console.warn('Failed to parse cuisine_type for restaurant:', row.id);
      }

      try {
        phone = row.phone ? JSON.parse(row.phone) : [];
      } catch {
        console.warn('Failed to parse phone for restaurant:', row.id);
      }

      try {
        const parsed = row.enabled_modules ? JSON.parse(row.enabled_modules) : [];
        enabledModules = parsed.filter((m: string) => 
          ['info-config', 'reservations', 'table-management', 'schedules', 'client-ratings'].includes(m)
        );
      } catch {
        console.warn('Failed to parse enabled_modules for restaurant:', row.id);
      }

      try {
        customLinks = row.custom_links ? JSON.parse(row.custom_links) : [];
      } catch {
        customLinks = [];
      }

      let notificationPhones: string[] = [];
      try {
        notificationPhones = row.notification_phones ? JSON.parse(row.notification_phones) : [];
      } catch {
        notificationPhones = [];
      }

      const safeRestaurant: Restaurant = {
        id: row.id,
        name: row.name || '',
        description: row.description || '',
        username: row.username || '',
        password: row.password || '',
        profileImageUrl: getAbsoluteImageUrl(row.profile_image_url),
        googleMapsUrl: row.google_maps_url || null,
        cuisineType,
        address: row.address || '',
        postalCode: row.postal_code || null,
        cityId: row.city_id,
        provinceId: row.province_id,
        phone,
        email: row.email || '',
        slug: row.slug || '',
        imageUrl: getAbsoluteImageUrl(row.profile_image_url || row.image_url),
        isActive: Boolean(row.is_active),
        subscriptionPlanId: row.subscription_plan_id || null,
        subscriptionExpiry: row.subscription_expiry ? String(row.subscription_expiry) : null,
        subscriptionDurationMonths: row.subscription_duration_months || null,
        enabledModules,
        advanceBookingDays: row.advance_booking_days || 30,
        customLinks,
        notificationPhones,
        notificationEmail: row.notification_email || undefined,
        whatsappCustomMessage: row.whatsapp_custom_message || undefined,
        tableRotationTime: row.table_rotation_time || 100,
        autoSendWhatsapp: Boolean(row.auto_send_whatsapp),
        useWhatsappWeb: Boolean(row.use_whatsapp_web),
        minBookingAdvanceMinutes: row.min_booking_advance_minutes || 0,
        minModifyCancelMinutes: row.min_modify_cancel_minutes || 180,
        enableEmailNotifications: Boolean(row.enable_email_notifications),
        reminder1Enabled: Boolean(row.reminder1_enabled),
        reminder1Hours: row.reminder1_hours || 24,
        reminder2Enabled: Boolean(row.reminder2_enabled),
        reminder2Minutes: row.reminder2_minutes || 60,
        importantMessageEnabled: row.important_message_enabled === true || row.important_message_enabled === 't' || row.important_message_enabled === 'true' || row.important_message_enabled === 1,
        importantMessage: row.important_message || '',
        whatsappType: (row.whatsapp_type || 'free') as 'free' | 'paid',
        whatsappProCredits: Number(row.whatsapp_pro_credits) || 0,
        whatsappProAlertThreshold: Number(row.whatsapp_pro_alert_threshold) || 0,
        createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
        updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
        salesRepId: row.sales_rep_id || null,
        city: row.city_name ? { id: row.city_id, name: row.city_name } : undefined,
        province: row.province_name ? { id: row.province_id, name: row.province_name } : undefined,
      };
      
      return safeRestaurant;
    });

    if (input.cuisineTypes && input.cuisineTypes.length > 0) {
      restaurants = restaurants.filter((r: Restaurant) => {
        return r.cuisineType.some((ct: string) => {
          const cleanCt = ct.replace(/^cuisine-/, '').toLowerCase();
          return input.cuisineTypes!.some(searchType => {
            const cleanSearch = searchType.replace(/^cuisine-/, '').toLowerCase();
            return cleanCt.includes(cleanSearch) || ct.toLowerCase() === searchType.toLowerCase();
          });
        });
      });
    }

    if (input.searchText) {
      const search = input.searchText.toLowerCase();
      restaurants = restaurants.filter((r: Restaurant) =>
        r.name.toLowerCase().includes(search) ||
        r.description.toLowerCase().includes(search)
      );
    }

    const restaurantIds = restaurants.map((r: Restaurant) => r.id);

    if (restaurantIds.length > 0 && (input.guests || input.needsHighChair || input.needsStroller || input.hasPets)) {
      let tableFilter = `SELECT DISTINCT restaurant_id FROM tables WHERE restaurant_id = ANY($1) AND is_active = true AND (is_temporary IS NOT TRUE OR is_temporary IS NULL)`;
      const tableParams: any[] = [restaurantIds];

      if (input.guests) {
        const guestIdx = tableParams.length + 1;
        tableFilter += ` AND min_capacity <= $${guestIdx} AND max_capacity >= $${guestIdx}`;
        tableParams.push(input.guests);
      }
      if (input.needsHighChair) {
        tableFilter += ` AND allows_high_chairs = true`;
      }
      if (input.needsStroller) {
        tableFilter += ` AND allows_strollers = true`;
      }
      if (input.hasPets) {
        tableFilter += ` AND allows_pets = true`;
      }

      const tablesResult = await ctx.db.query(tableFilter, tableParams);
      const restaurantsWithTables = new Set(tablesResult.rows.map((r: any) => r.restaurant_id as string));
      restaurants = restaurants.filter((r: Restaurant) => restaurantsWithTables.has(r.id));
    }

    if (input.date && restaurants.length > 0) {
      const remainingIds = restaurants.map((r: Restaurant) => r.id);
      const dateParts = input.date.split('-').map(Number);
      const dayOfWeek = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).getDay();

      const exceptionsResult = await ctx.db.query(
        `SELECT restaurant_id, is_open, template_ids FROM day_exceptions WHERE restaurant_id = ANY($1) AND date::date = $2::date`,
        [remainingIds, input.date]
      );
      const exceptionsByRestaurant = new Map<string, { isOpen: boolean; shifts: any[] }>();
      for (const row of exceptionsResult.rows) {
        let shifts: any[] = [];
        try { shifts = typeof row.template_ids === 'string' ? JSON.parse(row.template_ids) : (row.template_ids || []); } catch { shifts = []; }
        exceptionsByRestaurant.set(row.restaurant_id as string, { isOpen: Boolean(row.is_open), shifts });
      }

      const schedulesResult = await ctx.db.query(
        `SELECT restaurant_id, is_open, shifts FROM schedules WHERE restaurant_id = ANY($1) AND day_of_week = $2`,
        [remainingIds, dayOfWeek]
      );
      const schedulesByRestaurant = new Map<string, { isOpen: boolean; shifts: any[] }>();
      for (const row of schedulesResult.rows) {
        let shifts: any[] = [];
        try { shifts = typeof row.shifts === 'string' ? JSON.parse(row.shifts) : (row.shifts || []); } catch { shifts = []; }
        schedulesByRestaurant.set(row.restaurant_id as string, { isOpen: Boolean(row.is_open), shifts });
      }

      const timeMinutes = input.time ? (() => {
        const parts = input.time.split(':').map(Number);
        return parts[0] * 60 + (parts[1] || 0);
      })() : null;

      const isTimeInShifts = (shifts: any[], tMin: number): boolean => {
        if (!Array.isArray(shifts) || shifts.length === 0) return false;
        for (const shift of shifts) {
          if (!shift.startTime || !shift.endTime) continue;
          const sParts = String(shift.startTime).split(':').map(Number);
          const eParts = String(shift.endTime).split(':').map(Number);
          const sMin = sParts[0] * 60 + (sParts[1] || 0);
          const eMin = eParts[0] * 60 + (eParts[1] || 0);
          if (tMin >= sMin && tMin <= eMin) return true;
        }
        return false;
      };

      restaurants = restaurants.filter((r: Restaurant) => {
        const exception = exceptionsByRestaurant.get(r.id);
        if (exception !== undefined) {
          if (!exception.isOpen) return false;
          if (timeMinutes === null) return true;
          return isTimeInShifts(exception.shifts, timeMinutes);
        }
        const schedule = schedulesByRestaurant.get(r.id);
        if (!schedule || !schedule.isOpen) return false;
        if (timeMinutes === null) return true;
        return isTimeInShifts(schedule.shifts, timeMinutes);
      });
    }

    return restaurants;
  });
