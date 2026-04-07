#!/bin/bash

echo "🖼️  DESPLIEGUE: SISTEMA DE IMÁGENES COMPLETO"
echo "============================================"
echo ""

# Verificar Sharp
echo "📦 Verificando Sharp..."
if ! bun pm ls | grep -q "sharp"; then
    echo "⚠️  Instalando Sharp..."
    bun add sharp
fi

# Crear carpetas necesarias
echo "📁 Creando carpetas de uploads..."
mkdir -p dist/uploads/restaurants
mkdir -p dist/uploads/locations
echo "✅ Carpetas creadas"

# Reiniciar servidor
echo ""
echo "🔄 Reiniciando servidor..."
pm2 stop reservamesa 2>/dev/null || true
pm2 delete reservamesa 2>/dev/null || true

# Iniciar servidor
echo "🚀 Iniciando servidor..."
pm2 start bun --name reservamesa -- backend/server.ts
pm2 save

echo ""
echo "⏳ Esperando que el servidor inicie..."
sleep 3

# Verificar que el servidor está corriendo
if pm2 list | grep -q "reservamesa.*online"; then
    echo "✅ Servidor iniciado correctamente"
else
    echo "❌ Error al iniciar el servidor"
    echo "📋 Logs del servidor:"
    pm2 logs reservamesa --lines 20 --nostream
    exit 1
fi

echo ""
echo "🔍 Verificando configuración..."
echo ""
echo "Estructura de carpetas:"
ls -la dist/uploads/ 2>/dev/null || echo "⚠️  Carpeta uploads no existe"
echo ""
echo "Imágenes de restaurantes:"
ls -lh dist/uploads/restaurants/ 2>/dev/null | head -5 || echo "  (vacío)"
echo ""
echo "Imágenes de ubicaciones:"
ls -lh dist/uploads/locations/ 2>/dev/null | head -5 || echo "  (vacío)"

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "🌐 URLs de prueba:"
echo "   https://quieromesa.com/uploads/restaurants/[filename]"
echo "   https://quieromesa.com/uploads/locations/[filename]"
echo ""
echo "📝 IMPORTANTE:"
echo "   - Las imágenes ahora se optimizan automáticamente"
echo "   - Se generan en formato JPG (máxima compatibilidad)"
echo "   - Funcionan en todos los dispositivos (PC, móvil, tablet)"
echo "   - Las portadas se redimensionan a 1200x675px"
echo "   - Las ubicaciones se redimensionan a 800x600px"
echo ""
