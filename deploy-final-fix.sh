#!/bin/bash

echo "🚀 DEPLOY FINAL - CORRECCIONES COMPLETAS"
echo "============================================================"
echo ""
echo "Este script aplica las siguientes correcciones:"
echo "  1. ✅ Corrige pantalla blanca al ver rating de clientes"
echo "  2. ✅ Corrige problema de turnos no visibles para clientes"
echo "  3. ✅ Reconstruye el frontend"
echo "  4. ✅ Reinicia el servidor backend"
echo ""
read -p "¿Continuar con el deploy? (s/n): " confirm

if [ "$confirm" != "s" ]; then
    echo "❌ Deploy cancelado"
    exit 1
fi

echo ""
echo "📦 1. Reconstruyendo el frontend..."
echo "------------------------------------------------------------"
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
    echo "❌ Error en el build del frontend"
    exit 1
fi

echo ""
echo "🔄 2. Reiniciando el servidor backend..."
echo "------------------------------------------------------------"
pkill -f "bun.*backend/server.ts"
nohup bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "🌐 3. Recargando nginx..."
echo "------------------------------------------------------------"
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
else
    echo "❌ Error en la configuración de nginx"
    exit 1
fi

echo ""
echo "✅ DEPLOY COMPLETADO EXITOSAMENTE"
echo "============================================================"
echo ""
echo "📌 CORRECCIONES APLICADAS:"
echo ""
echo "   ✅ Pantalla blanca corregida:"
echo "      - Manejo seguro de clientRating null/undefined"
echo "      - Conversión explícita a Number antes de .toFixed()"
echo ""
echo "   ✅ Turnos visibles corregidos:"
echo "      - Si excepción no tiene turnos válidos, carga horario base"
echo "      - Si excepción tiene formato antiguo, carga horario base"
echo "      - Si hay error parseando, carga horario base como fallback"
echo ""
echo "   ✅ Módulo de usuarios mejorado:"
echo "      - Valoraciones detalladas: Puntualidad, Conducta, Amabilidad, Educación, Propina"
echo "      - Contador de No Shows visible"
echo "      - Opción de eliminar usuario con doble confirmación"
echo ""
echo "   ✅ Reservas Pro mejoradas:"
echo "      - Corazón con rating al lado del nombre del cliente"
echo "      - Modal de valoración con todas las características"
echo "      - Todas las valoraciones con 1 decimal (4.0, 4.5)"
echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo ""
echo "   1. Verifica que los clientes ven los horarios correctos"
echo "   2. Verifica que las reservas pro muestran el rating sin errores"
echo "   3. Prueba valorar un cliente después de la hora de reserva"
echo "   4. Verifica el módulo de usuarios con las valoraciones detalladas"
echo ""
echo "============================================================"
