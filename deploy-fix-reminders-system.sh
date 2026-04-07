#!/bin/bash

echo "🚀 Desplegando correcciones del sistema de recordatorios..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encuentra package.json${NC}"
    echo "   Asegúrate de estar en el directorio raíz del proyecto"
    exit 1
fi

echo -e "${YELLOW}📋 Resumen de cambios:${NC}"
echo "   ✓ Sistema de recordatorios actualizado (reminder1/reminder2)"
echo "   ✓ Ordenamiento cronológico de horarios disponibles"
echo "   ✓ Mensajes mejorados para validación de tronas"
echo "   ✓ Checkbox de términos siempre se resetea"
echo "   ✓ Botones visibles correctamente en reservas pasadas"
echo ""

# Hacer rsync excluyendo node_modules, .git, etc.
echo -e "${YELLOW}📦 Subiendo archivos al servidor...${NC}"

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'bun.lock' \
  --exclude '.expo' \
  --exclude 'dist' \
  --exclude '.turbo' \
  ./ root@vps-4619177-x.dattaweb.com:/var/www/reservamesa/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archivos subidos correctamente${NC}"
else
    echo -e "${RED}❌ Error al subir archivos${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔧 Ejecutando en el servidor...${NC}"

# Ejecutar comandos en el servidor
ssh root@vps-4619177-x.dattaweb.com << 'ENDSSH'

cd /var/www/reservamesa

echo "📦 Instalando dependencias..."
bun install

echo ""
echo "🔍 Verificando sistema de recordatorios..."
bun run backend/scripts/diagnose-reminders.ts

echo ""
echo "🔄 Reiniciando servidor con PM2..."
pm2 restart reservamesa-backend

echo ""
echo "⏳ Esperando 5 segundos para que el servidor inicie..."
sleep 5

echo ""
echo "🔍 Verificando estado del servidor..."
pm2 list | grep reservamesa-backend

echo ""
echo "✅ Despliegue completado"

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ ¡Despliegue completado exitosamente!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}📋 Próximos pasos:${NC}"
    echo "   1. Verifica que las reservas ahora crean recordatorios:"
    echo "      ssh root@vps-4619177-x.dattaweb.com"
    echo "      cd /var/www/reservamesa"
    echo "      bun run backend/scripts/diagnose-reminders.ts"
    echo ""
    echo "   2. Prueba crear una reserva en:"
    echo "      https://quieromesa.com/client/restaurant/[slug]"
    echo ""
    echo "   3. Verifica los horarios ordenados cronológicamente"
    echo ""
    echo "   4. Prueba validación de tronas en el buscador"
    echo ""
else
    echo ""
    echo -e "${RED}════════════════════════════════════════════════${NC}"
    echo -e "${RED}❌ Error durante el despliegue${NC}"
    echo -e "${RED}════════════════════════════════════════════════${NC}"
    echo ""
    echo "Revisa los logs del servidor para más detalles"
    exit 1
fi
