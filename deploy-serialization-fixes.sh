#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Desplegando correcciones de serialización              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuración
VPS="root@200.234.236.133"
REMOTE_DIR="/var/www/reservamesa"

# Lista de archivos a copiar
declare -a FILES=(
  "types/index.ts"
  "backend/trpc/routes/locations/create-province/route.ts"
  "backend/trpc/routes/locations/create-city/route.ts"
  "backend/trpc/routes/locations/list/route.ts"
  "backend/trpc/routes/locations/update-province/route.ts"
  "backend/trpc/routes/locations/update-city/route.ts"
)

# Contador de archivos
TOTAL=${#FILES[@]}
CURRENT=0

echo -e "${YELLOW}📦 Copiando archivos al VPS...${NC}"
echo ""

# Copiar cada archivo
for file in "${FILES[@]}"; do
  CURRENT=$((CURRENT + 1))
  echo -e "${BLUE}[$CURRENT/$TOTAL]${NC} Copiando: ${GREEN}$file${NC}"
  
  if scp "$file" "$VPS:$REMOTE_DIR/$file" 2>/dev/null; then
    echo -e "         ${GREEN}✓ OK${NC}"
  else
    echo -e "         ${RED}✗ ERROR${NC}"
    exit 1
  fi
done

echo ""
echo -e "${YELLOW}🔄 Reiniciando aplicación en el VPS...${NC}"

# Reiniciar la aplicación
ssh $VPS "cd $REMOTE_DIR && pm2 restart quieromesa" 2>/dev/null

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Aplicación reiniciada correctamente${NC}"
else
  echo -e "${RED}❌ Error al reiniciar la aplicación${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}⏳ Esperando 3 segundos para que la aplicación inicie...${NC}"
sleep 3

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   LOGS DE LA APLICACIÓN                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Mostrar últimos logs
ssh $VPS "pm2 logs quieromesa --lines 20 --nostream"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ DESPLIEGUE COMPLETADO                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "  1. Ve a: ${BLUE}http://200.234.236.133/admin/restaurants${NC}"
echo -e "  2. Intenta crear un nuevo restaurante"
echo -e "  3. Verifica que funcione correctamente"
echo ""
echo -e "${YELLOW}Para ver logs en tiempo real:${NC}"
echo -e "  ${BLUE}ssh $VPS \"cd $REMOTE_DIR && pm2 logs quieromesa\"${NC}"
echo ""
