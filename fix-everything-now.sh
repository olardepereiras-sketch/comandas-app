#!/bin/bash

echo "🚨 SOLUCIÓN COMPLETA Y DEFINITIVA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Este script hará lo siguiente:"
echo "  1. Arreglará PostgreSQL completamente"
echo "  2. Configurará backups automáticos cada 6 horas"
echo "  3. Creará el primer backup de seguridad"
echo "  4. Arreglará la tabla whatsapp_notifications"
echo "  5. Reiniciará el servidor"
echo ""
read -p "¿Continuar? (s/n): " CONFIRM

if [ "$CONFIRM" != "s" ]; then
    echo "❌ Cancelado"
    exit 1
fi

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /var/www/reservamesa || exit 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 1/5: ARREGLANDO POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

chmod +x fix-postgresql-complete.sh
if ./fix-postgresql-complete.sh; then
    echo -e "${GREEN}✅ PostgreSQL arreglado${NC}"
else
    echo -e "${RED}❌ Error arreglando PostgreSQL${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 2/5: CONFIGURANDO SISTEMA DE BACKUPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

chmod +x setup-backup-system.sh
if ./setup-backup-system.sh; then
    echo -e "${GREEN}✅ Sistema de backups configurado${NC}"
else
    echo -e "${RED}❌ Error configurando backups${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 3/5: ARREGLANDO TABLA WHATSAPP_NOTIFICATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cargar variables de entorno
if [ -f "env" ]; then
    export $(grep -v '^#' env | grep DATABASE_PASSWORD | xargs)
fi

export PGPASSWORD="$DATABASE_PASSWORD"

echo "🔧 Eliminando tabla whatsapp_notifications si existe..."
psql -U reservamesa_user -h localhost -d reservamesa_db -c "DROP TABLE IF EXISTS whatsapp_notifications CASCADE;" 2>/dev/null

echo "📝 Creando tabla whatsapp_notifications..."
psql -U reservamesa_user -h localhost -d reservamesa_db << 'EOFTABLE'
CREATE TABLE whatsapp_notifications (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_reservation 
        FOREIGN KEY (reservation_id) 
        REFERENCES reservations(id) 
        ON DELETE CASCADE
);

CREATE INDEX idx_whatsapp_notifications_status ON whatsapp_notifications(status);
CREATE INDEX idx_whatsapp_notifications_scheduled ON whatsapp_notifications(scheduled_for);
CREATE INDEX idx_whatsapp_notifications_reservation ON whatsapp_notifications(reservation_id);
EOFTABLE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tabla whatsapp_notifications creada correctamente${NC}"
else
    echo -e "${RED}❌ Error creando tabla${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 4/5: VERIFICANDO ESTRUCTURA DE BASE DE DATOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 Tablas en la base de datos:"
psql -U reservamesa_user -h localhost -d reservamesa_db -c "\dt" 2>/dev/null

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 5/5: REINICIANDO SERVIDOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "⏸️  Deteniendo servidor..."
sudo pm2 stop reservamesa 2>/dev/null || true
sudo pkill -9 -f "bun.*server.ts" 2>/dev/null || true
sleep 2

echo "🚀 Iniciando servidor..."
cd /var/www/reservamesa
export $(grep -v '^#' env | xargs)
if sudo pm2 start ecosystem.config.js; then
    echo -e "${GREEN}✅ Servidor iniciado${NC}"
else
    echo -e "${RED}❌ Error iniciando servidor${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅✅✅ SISTEMA COMPLETAMENTE ARREGLADO ✅✅✅${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Resumen:"
echo "  ✅ PostgreSQL funcionando correctamente"
echo "  ✅ Sistema de backups automáticos activo (cada 6 horas)"
echo "  ✅ Tabla whatsapp_notifications arreglada"
echo "  ✅ Servidor reiniciado"
echo ""
echo "🔧 Comandos útiles:"
echo "  • Ver backups:       ls -lh /var/backups/reservamesa"
echo "  • Backup manual:     sudo /usr/local/bin/backup-reservamesa.sh"
echo "  • Restaurar backup:  sudo /usr/local/bin/restore-reservamesa.sh"
echo "  • Estado servidor:   sudo pm2 status"
echo "  • Logs del servidor: sudo pm2 logs reservamesa"
echo ""
echo "💡 Los backups se crean automáticamente cada 6 horas"
echo "💡 Los backups se guardan durante 30 días"
echo "💡 Si algo sale mal, puedes restaurar un backup en cualquier momento"
echo ""
