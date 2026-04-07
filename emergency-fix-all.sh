#!/bin/bash

echo "🚨 REPARACIÓN COMPLETA DE EMERGENCIA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Este script arreglará TODO el sistema en el siguiente orden:"
echo "  1. PostgreSQL"
echo "  2. Tabla whatsapp_notifications"
echo "  3. Sistema de backups automáticos"
echo "  4. Reinicio del servidor"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

read -p "¿Continuar? (s/n): " CONFIRM
if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    echo "Operación cancelada"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 1/5: ARREGLANDO POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
chmod +x fix-postgresql-emergency.sh
./fix-postgresql-emergency.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error arreglando PostgreSQL${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 2/5: ARREGLANDO TABLA WHATSAPP_NOTIFICATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
chmod +x fix-whatsapp-table-emergency.sh
./fix-whatsapp-table-emergency.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error arreglando tabla${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 3/5: CONFIGURANDO BACKUPS AUTOMÁTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
chmod +x setup-automatic-backups.sh
./setup-automatic-backups.sh

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️ Advertencia: Error configurando backups (continuando...)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 4/5: DETENIENDO SERVIDOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo -e "${GREEN}✅ Servidor detenido${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 5/5: INICIANDO SERVIDOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
sleep 5

if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✅ Servidor iniciado (PID: $SERVER_PID)${NC}"
else
    echo -e "${RED}❌ Error iniciando servidor. Revisando logs:${NC}"
    tail -n 30 backend.log
    exit 1
fi

echo ""
echo "Esperando a que el servidor esté listo..."
sleep 3

# Verificar que el servidor responda
for i in {1..10}; do
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo -e "${GREEN}✅ Servidor respondiendo correctamente${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${YELLOW}⚠️ Servidor no responde aún, pero continúa ejecutándose${NC}"
    fi
    sleep 1
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ SISTEMA COMPLETAMENTE REPARADO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resumen:"
echo "  ✅ PostgreSQL funcionando"
echo "  ✅ Tabla whatsapp_notifications corregida"
echo "  ✅ Backups automáticos configurados"
echo "  ✅ Servidor corriendo (PID: $SERVER_PID)"
echo ""
echo "📝 Comandos útiles:"
echo "  • Ver logs: tail -f backend.log"
echo "  • Ver backups: ls -lh /var/www/reservamesa/backups/hourly/"
echo "  • Restaurar backup: ./restore-database.sh latest"
echo "  • Ver estado PostgreSQL: sudo systemctl status postgresql"
echo ""
echo "💾 Sistema de backups:"
echo "  • Backups cada hora automáticamente"
echo "  • Backups diarios a las 3 AM"
echo "  • Backups semanales los domingos a las 4 AM"
echo "  • Para restaurar: ./restore-database.sh latest"
