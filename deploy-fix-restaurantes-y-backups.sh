#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY: FIX RESTAURANTES + SISTEMA DE BACKUPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PROJECT_DIR="/var/www/reservamesa"

cd $PROJECT_DIR || exit 1

echo ""
echo "🛑 Deteniendo servidor..."
pkill -f "bun.*server.ts"
sleep 2

echo ""
echo "📦 Creando directorio de backups..."
mkdir -p /var/backups/reservamesa
chmod 755 /var/backups/reservamesa

echo ""
echo "🚀 Iniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "⏳ Esperando inicio del servidor..."
sleep 5

echo ""
echo "📋 Últimas líneas del log:"
tail -50 backend.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ FIX 1: Botón guardar restaurantes - ARREGLADO"
echo "   - Error en SQL con subscription_plan_id y sales_rep_id"
echo "   - Faltaba el símbolo $ en los placeholders"
echo ""
echo "✅ FIX 2: Sistema de copias de seguridad - IMPLEMENTADO"
echo "   - Crear copias manuales (BD, Programa o Completas)"
echo "   - Descargar copias"
echo "   - Restaurar sistema completo en segundos"
echo "   - Eliminar copias antiguas"
echo "   - Worker automático cada 6 horas (configurable)"
echo "   - Retención de 30 días (configurable)"
echo ""
echo "📍 Accede a: https://quieromesa.com/admin/system-config"
echo ""
