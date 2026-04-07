import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const getPublicDigitalMenuProcedure = publicProcedure
  .input(z.object({ menuId: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('🔵 [GET PUBLIC MENU]', input.menuId);

    const menuResult = await ctx.db.query(
      `SELECT dm.id, dm.name, dm.color, dm.image_orientation, dm.restaurant_id,
              dm.show_allergen_filter, dm.show_dietary_filter, dm.custom_characteristics,
              r.name as restaurant_name, r.profile_image_url, r.image_url
       FROM digital_menus dm
       JOIN restaurants r ON r.id = dm.restaurant_id
       WHERE dm.id = $1`,
      [input.menuId]
    );

    if (menuResult.rows.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Carta no encontrada' });
    }

    const menu = menuResult.rows[0];

    let customCharacteristics = [];
    try {
      const raw = menu.custom_characteristics;
      customCharacteristics = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
    } catch {
      customCharacteristics = [];
    }

    const categoriesResult = await ctx.db.query(
      `SELECT id, menu_id, name, description, image_url, color, position, is_active
       FROM menu_categories
       WHERE menu_id = $1 AND (is_active IS NULL OR is_active = TRUE)
       ORDER BY position ASC, created_at ASC`,
      [input.menuId]
    );

    const categories = await Promise.all(
      categoriesResult.rows.map(async (cat: any) => {
        const itemsResult = await ctx.db.query(
          `SELECT id, category_id, name, description, image_url, price, allergens, dietary_preferences,
                  price2_enabled, price2_name, price2_amount,
                  price3_enabled, price3_name, price3_amount,
                  display_order, is_active
           FROM menu_items
           WHERE category_id = $1 AND is_active = TRUE
           ORDER BY display_order ASC, created_at ASC`,
          [cat.id]
        );

        return {
          id: String(cat.id),
          menuId: String(cat.menu_id),
          name: String(cat.name),
          description: cat.description ? String(cat.description) : null,
          imageUrl: cat.image_url ? String(cat.image_url) : null,
          color: String(cat.color),
          position: Number(cat.position),
          isActive: cat.is_active !== false,
          items: itemsResult.rows.map((item: any) => ({
            id: String(item.id),
            categoryId: String(item.category_id),
            name: String(item.name),
            description: item.description ? String(item.description) : null,
            imageUrl: item.image_url ? String(item.image_url) : null,
            price: Number(item.price),
            allergens: Array.isArray(item.allergens) ? item.allergens : (typeof item.allergens === 'string' ? JSON.parse(item.allergens) : []),
            dietaryPreferences: Array.isArray(item.dietary_preferences) ? item.dietary_preferences : (typeof item.dietary_preferences === 'string' ? JSON.parse(item.dietary_preferences) : []),
            price2Enabled: Boolean(item.price2_enabled),
            price2Name: item.price2_name ? String(item.price2_name) : null,
            price2Amount: item.price2_amount ? Number(item.price2_amount) : null,
            price3Enabled: Boolean(item.price3_enabled),
            price3Name: item.price3_name ? String(item.price3_name) : null,
            price3Amount: item.price3_amount ? Number(item.price3_amount) : null,
            displayOrder: Number(item.display_order),
            isActive: Boolean(item.is_active),
          })),
        };
      })
    );

    const imageUrl = menu.profile_image_url || menu.image_url || null;

    console.log('✅ [GET PUBLIC MENU]', menu.name, '- categorías:', categories.length);
    return {
      id: String(menu.id),
      name: String(menu.name),
      color: String(menu.color),
      imageOrientation: (menu.image_orientation || 'horizontal') as 'horizontal' | 'vertical',
      restaurantId: String(menu.restaurant_id),
      restaurantName: String(menu.restaurant_name),
      restaurantImageUrl: imageUrl ? String(imageUrl) : null,
      showAllergenFilter: menu.show_allergen_filter !== false,
      showDietaryFilter: menu.show_dietary_filter !== false,
      customCharacteristics,
      categories,
    };
  });
