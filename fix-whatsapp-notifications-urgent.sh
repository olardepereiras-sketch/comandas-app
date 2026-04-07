#!/bin/bash

echo "🚨 SOLUCION URGENTE: Reparando sistema de notificaciones WhatsApp"
echo "================================================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
VPS_USER="root"
VPS_HOST="51.210.105.235"
VPS_DIR="/var/www/reservamesa"
BACKUP_DIR="$VPS_DIR/backups/emergency-$(date +%Y%m%d-%H%M%S)"

echo -e "${YELLOW}📋 Este script:${NC}"
echo "  1. Hace backup de emergencia"
echo "  2. Mata todos los procesos Chrome bloqueados"
echo "  3. Limpia archivos de bloqueo"
echo "  4. Actualiza el código con las correcciones"
echo "  5. Reinicia el servidor"
echo ""
read -p "¿Continuar? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Operación cancelada"
    exit 1
fi

echo ""
echo -e "${GREEN}🔧 Paso 1: Creando backup de emergencia...${NC}"
ssh $VPS_USER@$VPS_HOST "mkdir -p $BACKUP_DIR && \
    cp -r $VPS_DIR/backend/services/whatsapp-web-manager.ts $BACKUP_DIR/ 2>/dev/null || true && \
    cp -r $VPS_DIR/backend/services/whatsapp-notification-worker.ts $BACKUP_DIR/ 2>/dev/null || true && \
    echo '✅ Backup creado en $BACKUP_DIR'"

echo ""
echo -e "${GREEN}🔪 Paso 2: Matando procesos Chrome bloqueados...${NC}"
ssh $VPS_USER@$VPS_HOST "pkill -9 -f 'chrome.*whatsapp-sessions' 2>/dev/null || true && \
    pkill -9 -f 'chromium.*whatsapp-sessions' 2>/dev/null || true && \
    sleep 3 && \
    echo '✅ Procesos Chrome terminados'"

echo ""
echo -e "${GREEN}🗑️ Paso 3: Limpiando archivos de bloqueo...${NC}"
ssh $VPS_USER@$VPS_HOST "cd $VPS_DIR && \
    find whatsapp-sessions -name 'SingletonLock' -delete 2>/dev/null || true && \
    find whatsapp-sessions -name 'lockfile' -delete 2>/dev/null || true && \
    find whatsapp-sessions -name 'SingletonSocket' -delete 2>/dev/null || true && \
    find whatsapp-sessions -name 'SingletonCookie' -delete 2>/dev/null || true && \
    echo '✅ Archivos de bloqueo eliminados'"

echo ""
echo -e "${GREEN}📤 Paso 4: Subiendo archivos corregidos...${NC}"
rsync -avz --progress \
    backend/services/whatsapp-web-manager.ts \
    $VPS_USER@$VPS_HOST:$VPS_DIR/backend/services/

rsync -avz --progress \
    backend/services/whatsapp-notification-worker.ts \
    $VPS_USER@$VPS_HOST:$VPS_DIR/backend/services/

rsync -avz --progress \
    clean-chrome-sessions.sh \
    $VPS_USER@$VPS_HOST:$VPS_DIR/

echo ""
echo -e "${GREEN}🔄 Paso 5: Reiniciando servidor...${NC}"
ssh $VPS_USER@$VPS_HOST "cd $VPS_DIR && \
    chmod +x clean-chrome-sessions.sh && \
    pm2 restart all && \
    sleep 5 && \
    pm2 status"

echo ""
echo -e "${GREEN}✅ PROCESO COMPLETADO${NC}"
echo ""
echo -e "${YELLOW}📊 Verificación:${NC}"
ssh $VPS_USER@$VPS_HOST "ps aux | grep -i chrome | grep -v grep | wc -l | xargs echo 'Procesos Chrome activos:'"
ssh $VPS_USER@$VPS_HOST "cd $VPS_DIR && pm2 logs --lines 20 --nostream | tail -30"

echo ""
echo -e "${YELLOW}💡 Pasos siguientes:${NC}"
echo "  1. Ve a https://quieromesa.com/admin/whatsapp"
echo "  2. Si hay problemas, haz clic en 'Generar Código'"
echo "  3. Escanea el código QR con tu teléfono"
echo "  4. Prueba crear una reserva para verificar notificaciones"
echo ""
echo -e "${YELLOW}⚠️ Si el problema persiste:${NC}"
echo "  1. SSH al servidor: ssh $VPS_USER@$VPS_HOST"
echo "  2. Ejecuta: cd $VPS_DIR && ./clean-chrome-sessions.sh"
echo "  3. Reinicia: pm2 restart all"
echo ""
