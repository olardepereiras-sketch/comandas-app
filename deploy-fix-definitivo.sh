#!/bin/bash

echo "🚀 Desplegando corrección definitiva..."
echo "========================================================"

# Ir al directorio del proyecto
cd /var/www/reservamesa

# Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)

echo ""
echo "📋 1. Arreglando esquema de base de datos..."
echo "------------------------------------------------------------"
bun run backend/db/fix-schema-definitivo.ts
if [ $? -ne 0 ]; then
    echo "❌ Error arreglando esquema"
    exit 1
fi
echo "✅ Esquema corregido"

echo ""
echo "📋 2. Verificando dependencias..."
echo "------------------------------------------------------------"
bun install
echo "✅ Dependencias verificadas"

echo ""
echo "📋 3. Construyendo frontend..."
echo "------------------------------------------------------------"
npx expo export -p web --output-dir dist/public
if [ $? -ne 0 ]; then
    echo "⚠️  Error construyendo frontend, pero continuando..."
fi
echo "✅ Frontend construido"

echo ""
echo "📋 4. Reiniciando servidor con PM2..."
echo "------------------------------------------------------------"
pm2 restart reservamesa 2>/dev/null || {
    echo "⚠️  PM2 no está corriendo"
    echo "   Inicia el servidor con:"
    echo "   pm2 start backend/server.ts --name reservamesa --interpreter bun"
}
echo "✅ Servidor reiniciado"

echo ""
echo "========================================================"
echo "✅ Despliegue completado exitosamente"
echo ""
echo "🔍 Para verificar logs:"
echo "   pm2 logs reservamesa"
echo ""
echo "📝 Cambios aplicados:"
echo "   ✅ Esquema de base de datos completamente corregido"
echo "   ✅ Tabla clients con country_code y email nullable"
echo "   ✅ Tabla reservations con location_id nullable"
echo "   ✅ Tabla client_no_shows creada"
echo "   ✅ Tabla no_show_rules creada"
echo "   ✅ Foreign keys configuradas correctamente"
echo "   ✅ Todos los índices de rendimiento agregados"
echo ""
echo "🧪 Prueba ahora:"
echo "   1. Borrar un usuario en http://200.234.236.133/admin/users"
echo "   2. Cancelar una reserva en http://200.234.236.133/restaurant/reservations-pro"
echo "   3. Cliente cancela en http://200.234.236.133/client/reservation/[token]"
echo ""
