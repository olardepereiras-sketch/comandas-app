#!/bin/bash

echo "🚀 Iniciando deploy completo de correcciones de recordatorios y UI..."

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encuentra package.json${NC}"
    echo "Por favor ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

echo -e "${BLUE}📦 1. Compilando correcciones de recordatorios...${NC}"
bun run backend/db/fix-reminders-columns-final.ts
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en migración de columnas de recordatorios${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Columnas de recordatorios corregidas${NC}"

echo ""
echo -e "${BLUE}🔄 2. Compilando frontend con todas las correcciones...${NC}"
echo "   - Validación de tronas mejorada"
echo "   - Checkbox de condiciones se resetea"
echo "   - Botón valorar con límite de 24h"
echo "   - Botones contactar/llamar visibles en reservas pasadas"

# Limpiar compilación anterior
rm -rf dist/

# Compilar
bunx expo export -p web
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error compilando frontend${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend compilado${NC}"

echo ""
echo -e "${BLUE}📤 3. Subiendo archivos al servidor...${NC}"

# Crear directorio temporal de respaldo
ssh root@200.234.236.133 "mkdir -p /var/www/reservamesa_backup_$(date +%Y%m%d_%H%M%S)"

# Respaldar archivos actuales
echo -e "${YELLOW}📋 Creando respaldo...${NC}"
ssh root@200.234.236.133 "cp -r /var/www/reservamesa/dist /var/www/reservamesa_backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true"
ssh root@200.234.236.133 "cp -r /var/www/reservamesa/backend /var/www/reservamesa_backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true"

# Subir nuevo frontend
echo -e "${YELLOW}📦 Subiendo frontend...${NC}"
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.expo' \
    --exclude='.git' \
    dist/ root@200.234.236.133:/var/www/reservamesa/dist/

# Subir backend actualizado
echo -e "${YELLOW}📦 Subiendo backend...${NC}"
rsync -avz \
    --exclude='node_modules' \
    backend/ root@200.234.236.133:/var/www/reservamesa/backend/

echo -e "${GREEN}✅ Archivos subidos${NC}"

echo ""
echo -e "${BLUE}🔧 4. Configurando en el servidor...${NC}"

ssh root@200.234.236.133 << 'ENDSSH'
cd /var/www/reservamesa

echo "📋 Instalando dependencias..."
bun install

echo "🗄️ Ejecutando migración de base de datos..."
bun run backend/db/fix-reminders-columns-final.ts

echo "🔄 Reiniciando servidor con PM2..."
pm2 restart reservamesa-server

echo "⏳ Esperando a que el servidor inicie..."
sleep 5

echo "✅ Verificando estado del servidor..."
pm2 status reservamesa-server

echo "📊 Últimos logs del servidor:"
pm2 logs reservamesa-server --lines 20 --nostream

ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en configuración del servidor${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deploy completado exitosamente!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Resumen de cambios aplicados:${NC}"
echo ""
echo "  🔧 Backend:"
echo "     • Columnas de recordatorios estandarizadas"
echo "     • Worker automático de notificaciones WhatsApp"
echo "     • Sistema de recordatorios funcional"
echo ""
echo "  🎨 Frontend:"
echo "     • Validación de tronas sin ocultar horas"
echo "     • Checkbox de condiciones se resetea entre reservas"
echo "     • Botón valorar visible después de reserva (máx 24h)"
echo "     • Botones contactar/llamar siempre visibles"
echo "     • Botones editar/anular solo en reservas futuras"
echo ""
echo -e "${YELLOW}⚠️  Notas importantes:${NC}"
echo "  • El sistema de recordatorios ahora funciona automáticamente"
echo "  • El worker procesa notificaciones cada minuto"
echo "  • Los restaurantes deben tener enable_reminders=true"
echo "  • Los recordatorios se crean al hacer cada reserva"
echo ""
echo -e "${BLUE}🌐 Accede a:${NC}"
echo "  • Frontend: https://quieromesa.com"
echo "  • Panel Admin: https://quieromesa.com/admin"
echo "  • Panel Restaurant: https://quieromesa.com/restaurant"
echo ""
echo -e "${GREEN}✅ Sistema listo para usar!${NC}"
