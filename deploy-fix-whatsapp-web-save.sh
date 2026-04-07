#!/bin/bash

echo "🔧 CORRIGIENDO GUARDADO DE WHATSAPP WEB"
echo "========================================"

# Detener servidor
echo ""
echo "📋 Paso 1/5: Deteniendo servidor..."
pm2 stop backend 2>/dev/null || true

# Corregir el código
echo ""
echo "📋 Paso 2/5: Corrigiendo código de actualización..."

cat > /tmp/update-fix.txt << 'EOF'
    if (input.minBookingAdvanceMinutes !== undefined) {
      updates.push(`min_booking_advance_minutes = $${paramCount++}`);
      params.push(Number(input.minBookingAdvanceMinutes));
    }
    if (input.useWhatsappWeb !== undefined) {
      updates.push(`use_whatsapp_web = $${paramCount++}`);
      params.push(input.useWhatsappWeb);
    }
EOF

# Usar sed para reemplazar las líneas problemáticas
sed -i '135,142d' backend/trpc/routes/restaurants/update/route.ts
sed -i '134r /tmp/update-fix.txt' backend/trpc/routes/restaurants/update/route.ts

echo "✅ Código corregido"

# Actualizar base de datos para restaurantes existentes
echo ""
echo "📋 Paso 3/5: Actualizando base de datos..."

cat > /tmp/fix-whatsapp-web.ts << 'EOF'
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixWhatsappWeb() {
  try {
    console.log('🔧 Actualizando campo use_whatsapp_web para todos los restaurantes...');
    
    // Obtener todos los restaurantes que tienen WhatsApp configurado
    const result = await pool.query(`
      UPDATE restaurants 
      SET use_whatsapp_web = true 
      WHERE auto_send_whatsapp = true
      RETURNING id, name, use_whatsapp_web, auto_send_whatsapp
    `);
    
    console.log(`✅ Actualizado ${result.rowCount} restaurante(s):`);
    result.rows.forEach(row => {
      console.log(`   - ${row.name}: use_whatsapp_web=${row.use_whatsapp_web}, auto_send_whatsapp=${row.auto_send_whatsapp}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixWhatsappWeb();
EOF

bun /tmp/fix-whatsapp-web.ts

# Limpiar cache
echo ""
echo "📋 Paso 4/5: Limpiando caché..."
rm -rf node_modules/.cache
rm -rf .next

# Reiniciar servidor
echo ""
echo "📋 Paso 5/5: Reiniciando servidor..."
pm2 restart backend
pm2 logs backend --lines 50

echo ""
echo "✅ CORRECCIÓN COMPLETADA"
echo ""
echo "📱 Próximos pasos:"
echo "   1. Verifica que WhatsApp Web esté conectado en config-pro"
echo "   2. Si no lo está, escanea el código QR nuevamente"
echo "   3. Activa 'Envío Automático de WhatsApp'"
echo "   4. Crea una nueva reserva de prueba"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
