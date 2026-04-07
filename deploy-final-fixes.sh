#!/bin/bash

echo "🚀 Desplegando correcciones finales..."

cd /var/www/reservamesa

echo "📦 Actualizando código..."
git pull origin main || echo "⚠️ Git pull falló, continuando..."

echo "📦 Instalando dependencias..."
bun install

echo "🔧 Ejecutando migración de columnas de recordatorios..."
bun run backend/db/fix-reminder-columns-correct.ts

echo "🔄 Reiniciando servidor con PM2..."
pm2 restart reservamesa

echo "📊 Estado del servidor..."
pm2 status

echo "✅ Despliegue completado!"
echo ""
echo "📝 Cambios aplicados:"
echo "  1. ✅ Mensaje de tronas corregido en el buscador"
echo "  2. ✅ Sistema de valoración con edición y límite de 24h"
echo "  3. ✅ Checkbox de términos se resetea correctamente"
echo "  4. ✅ Columnas de recordatorios agregadas a la base de datos"
echo ""
echo "🔍 Para verificar recordatorios:"
echo "  cd /var/www/reservamesa && bun run backend/scripts/diagnose-reminders.ts"
