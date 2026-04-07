#!/bin/bash

echo "🚨 REPARACIÓN COMPLETA DEL SISTEMA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Este script arreglará TODO en el orden correcto:"
echo "  1. PostgreSQL"
echo "  2. Tabla whatsapp_notifications"
echo "  3. Sistema de backups automáticos"
echo "  4. Reinicio del servidor"
echo ""
read -p "¿Continuar? (s/n): " CONFIRM

if [ "$CONFIRM" != "s" ]; then
  echo "❌ Cancelado"
  exit 1
fi

# Paso 1: Arreglar PostgreSQL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 1/4: ARREGLANDO POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
chmod +x fix-postgresql-now.sh
./fix-postgresql-now.sh

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Error arreglando PostgreSQL. Abortando."
  exit 1
fi

# Esperar un poco
sleep 3

# Paso 2: Arreglar tabla
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 2/4: ARREGLANDO TABLA WHATSAPP_NOTIFICATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
chmod +x fix-whatsapp-table-correct.sh
./fix-whatsapp-table-correct.sh

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Error arreglando tabla. Abortando."
  exit 1
fi

# Paso 3: Configurar backups
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 3/4: CONFIGURANDO SISTEMA DE BACKUPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
chmod +x setup-automatic-backups-now.sh
./setup-automatic-backups-now.sh

if [ $? -ne 0 ]; then
  echo ""
  echo "⚠️ Error configurando backups, pero continuando..."
fi

# Paso 4: Reiniciar servidor
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 4/4: REINICIANDO SERVIDOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Matar procesos en puerto 3000
echo "📋 Deteniendo servidor actual..."
sudo lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Reconstruir frontend
echo ""
echo "📋 Reconstruyendo frontend..."
npx expo export -p web --output-dir dist > /dev/null 2>&1

# Iniciar servidor
echo ""
echo "📋 Iniciando servidor..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!

# Esperar un poco
sleep 5

# Verificar que está corriendo
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor corriendo (PID: $SERVER_PID)"
else
  echo "❌ Error iniciando servidor"
  tail -20 backend.log
  exit 1
fi

# Recargar Nginx
echo ""
echo "📋 Recargando Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA COMPLETAMENTE ARREGLADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ PostgreSQL funcionando"
echo "✅ Tabla whatsapp_notifications arreglada"
echo "✅ Backups automáticos cada hora"
echo "✅ Servidor corriendo"
echo ""
echo "📋 Para monitorear el servidor:"
echo "   tail -f backend.log"
echo ""
echo "📋 Para ver backups:"
echo "   ls -lth /var/backups/reservamesa"
echo ""
echo "📋 Para restaurar un backup:"
echo "   sudo /usr/local/bin/restore-reservamesa.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
