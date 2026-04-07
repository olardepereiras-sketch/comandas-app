#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN DE WHATSAPP WEB"
echo "=========================================="

cd /var/www/reservamesa

# Detener servidor
echo ""
echo "📋 Paso 1/4: Deteniendo servidor..."
pkill -f 'bun.*server.ts' 2>/dev/null || true
sleep 2

# Limpiar caché
echo ""
echo "📋 Paso 2/4: Limpiando caché..."
rm -rf node_modules/.cache
rm -rf .next

# Verificar base de datos
echo ""
echo "📋 Paso 3/4: Verificando base de datos..."
cat > /tmp/check_whatsapp_field.ts << 'EOF'
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function checkAndShowRestaurants() {
  try {
    const result = await pool.query(
      'SELECT id, name, use_whatsapp_web, auto_send_whatsapp FROM restaurants'
    );
    
    console.log('\n🔍 Estado actual de restaurantes:');
    for (const row of result.rows) {
      console.log(`   - ${row.name} (${row.id})`);
      console.log(`     use_whatsapp_web: ${row.use_whatsapp_web}`);
      console.log(`     auto_send_whatsapp: ${row.auto_send_whatsapp}`);
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkAndShowRestaurants();
EOF

bun --env-file .env /tmp/check_whatsapp_field.ts

# Reiniciar servidor
echo ""
echo "📋 Paso 4/4: Reiniciando servidor..."
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
sleep 3

# Verificar que esté corriendo
if ps aux | grep 'bun.*server.ts' | grep -v grep > /dev/null; then
    echo ""
    echo "✅ Servidor reiniciado correctamente"
else
    echo ""
    echo "❌ Error al reiniciar servidor"
    tail -30 backend.log
    exit 1
fi

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Próximos pasos:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Si 'Usar WhatsApp Web' está APAGADO:"
echo "      - Actívalo y guarda"
echo "      - Escanea el código QR"
echo "      - Activa 'Envío Automático de WhatsApp' y guarda"
echo "   3. Si 'Usar WhatsApp Web' está ENCENDIDO:"
echo "      - Verifica el código QR (debe decir 'Conectado')"
echo "      - Verifica que 'Envío Automático' esté activado"
echo "   4. Crea una reserva de prueba"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
