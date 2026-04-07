#!/bin/bash

echo "🔧 DESPLEGANDO FIX PARA BOTÓN TOGGLE ACTIVE"
echo "==========================================="

cd /var/www/reservamesa

echo ""
echo "📦 Limpiando y construyendo frontend..."
rm -rf dist .expo
bunx expo export -p web

if [ ! -d "dist" ]; then
    echo "❌ ERROR: No se generó dist"
    exit 1
fi

echo ""
echo "✅ Configurando permisos..."
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

echo ""
echo "🔄 Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📋 INSTRUCCIONES:"
echo "1. Ve a https://quieromesa.com/restaurant"
echo "2. Abre la consola del navegador (F12)"
echo "3. Pulsa el botón Activar/Desactivar"
echo "4. Verás logs que empiezan con:"
echo "   👆 [TOGGLE ACTIVE] TouchableOpacity presionado"
echo "   🔘 [TOGGLE ACTIVE] Botón presionado"
echo "   🔍 [TOGGLE ACTIVE] Estado actual: ..."
echo ""
echo "Si NO aparece NINGÚN log, el problema es que el botón"
echo "no está recibiendo el evento onPress."
echo ""
echo "Si aparecen los logs, sabremos dónde se detiene."
