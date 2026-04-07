#!/bin/bash

echo "🔧 Aplicando corrección al UPDATE de restaurantes..."

cd /var/www/reservamesa

cat > backend/trpc/routes/restaurants/update/route.ts << 'EOF'
import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateRestaurantProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      profileImageUrl: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      cuisineType: z.array(z.string()).optional(),
      address: z.string().optional(),
      postalCode: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      cityId: z.string().optional(),
      provinceId: z.string().optional(),
      subscriptionPlanId: z.string().optional(),
      salesRepId: z.string().optional(),
      advanceBookingDays: z.number().optional(),
      customLinks: z.array(
        z.object({
          url: z.string(),
          buttonText: z.string(),
          enabled: z.boolean(),
        })
      ).optional(),
      phoneNumbers: z.array(z.string()).optional(),
      notificationPhones: z.array(z.string()).optional(),
      notificationEmail: z.string().email().optional(),
      whatsappCustomMessage: z.string().optional(),
      tableRotationTime: z.number().optional(),
      autoSendWhatsapp: z.boolean().optional(),
      minBookingAdvanceMinutes: z.number().optional(),
      minModifyCancelMinutes: z.number().optional(),
      useWhatsappWeb: z.boolean().optional(),
      enableEmailNotifications: z.boolean().optional(),
      reminder1Enabled: z.boolean().optional(),
      reminder1Hours: z.number().optional(),
      reminder2Enabled: z.boolean().optional(),
      reminder2Minutes: z.number().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE RESTAURANT] Actualizando restaurante:', input.id);

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(input.description);
    }
    if (input.username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      params.push(input.username);
    }
    if (input.password !== undefined) {
      updates.push(`password = $${paramCount++}`);
      params.push(input.password);
    }
    if (input.profileImageUrl !== undefined) {
      updates.push(`profile_image_url = $${paramCount++}`);
      params.push(input.profileImageUrl);
    }
    if (input.googleMapsUrl !== undefined) {
      updates.push(`google_maps_url = $${paramCount++}`);
      params.push(input.googleMapsUrl);
    }
    if (input.cuisineType !== undefined) {
      updates.push(`cuisine_type = $${paramCount++}`);
      params.push(JSON.stringify(input.cuisineType));
    }
    if (input.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      params.push(input.address);
    }
    if (input.postalCode !== undefined) {
      updates.push(`postal_code = $${paramCount++}`);
      params.push(input.postalCode);
    }
    if (input.cityId !== undefined) {
      updates.push(`city_id = $${paramCount++}`);
      params.push(input.cityId);
    }
    if (input.provinceId !== undefined) {
      updates.push(`province_id = $${paramCount++}`);
      params.push(input.provinceId);
    }
    if (input.phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      params.push(JSON.stringify([input.phone]));
    }
    if (input.phoneNumbers !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      params.push(JSON.stringify(input.phoneNumbers));
    }
    if (input.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      params.push(input.email);
    }
    if (input.subscriptionPlanId !== undefined) {
      updates.push(`subscription_plan_id = $${paramCount++}`);
      params.push(input.subscriptionPlanId);
    }
    if (input.salesRepId !== undefined) {
      updates.push(`sales_rep_id = $${paramCount++}`);
      params.push(input.salesRepId);
    }
    if (input.advanceBookingDays !== undefined) {
      updates.push(`advance_booking_days = $${paramCount++}`);
      params.push(input.advanceBookingDays);
    }
    if (input.customLinks !== undefined) {
      updates.push(`custom_links = $${paramCount++}`);
      params.push(JSON.stringify(input.customLinks));
    }
    if (input.notificationPhones !== undefined) {
      updates.push(`notification_phones = $${paramCount++}`);
      params.push(JSON.stringify(input.notificationPhones));
    }
    if (input.notificationEmail !== undefined) {
      updates.push(`notification_email = $${paramCount++}`);
      params.push(input.notificationEmail);
    }
    if (input.whatsappCustomMessage !== undefined) {
      updates.push(`whatsapp_custom_message = $${paramCount++}`);
      params.push(input.whatsappCustomMessage);
    }
    if (input.tableRotationTime !== undefined) {
      updates.push(`table_rotation_time = $${paramCount++}`);
      params.push(Number(input.tableRotationTime));
    }
    if (input.autoSendWhatsapp !== undefined) {
      updates.push(`auto_send_whatsapp = $${paramCount++}`);
      params.push(input.autoSendWhatsapp);
    }
    if (input.minBookingAdvanceMinutes !== undefined) {
      updates.push(`min_booking_advance_minutes = $${paramCount++}`);
      params.push(Number(input.minBookingAdvanceMinutes));
    }
    if (input.useWhatsappWeb !== undefined) {
      updates.push(`use_whatsapp_web = $${paramCount++}`);
      params.push(input.useWhatsappWeb);
    }
    if (input.enableEmailNotifications !== undefined) {
      updates.push(`enable_email_notifications = $${paramCount++}`);
      params.push(input.enableEmailNotifications);
    }
    if (input.minModifyCancelMinutes !== undefined) {
      updates.push(`min_modify_cancel_minutes = $${paramCount++}`);
      params.push(Number(input.minModifyCancelMinutes));
    }
    if (input.reminder1Enabled !== undefined) {
      updates.push(`reminder1_enabled = $${paramCount++}`);
      params.push(input.reminder1Enabled);
    }
    if (input.reminder1Hours !== undefined) {
      updates.push(`reminder1_hours = $${paramCount++}`);
      params.push(Number(input.reminder1Hours));
    }
    if (input.reminder2Enabled !== undefined) {
      updates.push(`reminder2_enabled = $${paramCount++}`);
      params.push(input.reminder2Enabled);
    }
    if (input.reminder2Minutes !== undefined) {
      updates.push(`reminder2_minutes = $${paramCount++}`);
      params.push(Number(input.reminder2Minutes));
    }

    updates.push(`updated_at = $${paramCount++}`);
    params.push(new Date());

    const whereParamIndex = paramCount++;
    params.push(input.id);

    const sql = `UPDATE restaurants SET ${updates.join(', ')} WHERE id = $${whereParamIndex}`;
    
    console.log('🔍 [UPDATE RESTAURANT] SQL:', sql);
    console.log('🔍 [UPDATE RESTAURANT] Params:', params);

    if (updates.length === 1) {
      console.log('⚠️ [UPDATE RESTAURANT] Solo updated_at para actualizar, considerando éxito');
      return { success: true, id: String(input.id) };
    }

    try {
      console.log('🔍 [UPDATE RESTAURANT] Ejecutando query...');
      const result = await ctx.db.query(sql, params);

      console.log('✅ [UPDATE RESTAURANT] Restaurante actualizado:', {
        id: input.id,
        rowsAffected: result.rowCount,
      });

      if ((result.rowCount || 0) === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurante no encontrado',
        });
      }

      const verify = await ctx.db.query(
        'SELECT min_booking_advance_minutes, min_modify_cancel_minutes, auto_send_whatsapp, table_rotation_time, use_whatsapp_web, enable_email_notifications, reminder1_enabled, reminder1_hours, reminder2_enabled, reminder2_minutes FROM restaurants WHERE id = $1',
        [input.id]
      );
      console.log('✅ [UPDATE RESTAURANT] Verificación post-guardado:', verify.rows[0]);

      return { success: true, id: String(input.id) };
    } catch (error: any) {
      console.error('❌ [UPDATE RESTAURANT] Error:', error);
      console.error('❌ [UPDATE RESTAURANT] SQL:', sql);
      console.error('❌ [UPDATE RESTAURANT] Params:', params);
      console.error('❌ [UPDATE RESTAURANT] Error detail:', error.detail);
      console.error('❌ [UPDATE RESTAURANT] Error code:', error.code);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar el restaurante: ${error.message}`,
      });
    }
  });
EOF

echo "✅ Archivo actualizado con los placeholders SQL correctos (\$14 y \$15)"

echo ""
echo "🔄 Reiniciando servidor..."
pkill -f 'bun.*server.ts'
sleep 2
nohup bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "✅ Servidor reiniciado"
echo ""
echo "📋 Para verificar los logs:"
echo "   tail -f backend.log"
echo ""
echo "🔍 Ahora prueba a guardar un restaurante con comercial asignado"
