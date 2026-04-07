#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES URGENTES..."
echo "========================================"
echo ""

echo "📋 Cambios incluidos:"
echo "  1. ✅ Error SQL en update-table corregido"
echo "  2. ✅ Vista de adultos y tronas en reservas"
echo "  3. ✅ Navegación mantiene contexto del día"
echo "  4. ✅ Botón 'Añadir Reserva' actualizado"
echo "  5. ✅ Cálculo de valoraciones en admin/users"
echo "  6. ✅ Cálculo de estadísticas en dashboard"
echo ""

echo "📋 Paso 1/4: Deteniendo servidor..."
pm2 stop reservamesa-backend 2>/dev/null || true

echo ""
echo "📋 Paso 2/4: Instalando dependencias..."
cd /var/www/reservamesa
bun install

echo ""
echo "📋 Paso 3/4: Construyendo frontend..."
npx expo export -p web --output-dir dist --clear

echo ""
echo "📋 Paso 4/4: Reiniciando servidor..."
pm2 start ecosystem.config.js --env production
pm2 save

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Error SQL corregido en edición de mesas"
echo "  ✅ Información de tronas y adultos visible"
echo "  ✅ Navegación mejorada en reservas-pro"
echo "  ✅ Valoraciones calculadas correctamente"
echo "  ✅ Estadísticas de dashboard corregidas"
echo ""
echo "Ver logs:"
echo "  pm2 logs reservamesa-backend"
