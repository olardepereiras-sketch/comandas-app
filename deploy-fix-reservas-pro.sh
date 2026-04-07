#!/bin/bash

echo "🚀 Desplegando correcciones de Reservas Pro y modificación de reservas..."

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar conexión SSH
echo -e "${BLUE}📡 Verificando conexión al servidor...${NC}"
if ! ssh root@quieromesa.com "echo 'Conexión OK'"; then
    echo -e "${RED}❌ No se pudo conectar al servidor${NC}"
    exit 1
fi

# Subir archivos modificados
echo -e "${BLUE}📤 Subiendo archivos al servidor...${NC}"

scp app/restaurant/reservations-pro.tsx root@quieromesa.com:/root/quieromesa/app/restaurant/
scp backend/trpc/routes/reservations/modify-by-client/route.ts root@quieromesa.com:/root/quieromesa/backend/trpc/routes/reservations/modify-by-client/
scp backend/trpc/routes/reservations/available-slots/route.ts root@quieromesa.com:/root/quieromesa/backend/trpc/routes/reservations/available-slots/

# Reiniciar servicios en el servidor
echo -e "${BLUE}🔄 Reiniciando servicios...${NC}"

ssh root@quieromesa.com << 'ENDSSH'
cd /root/quieromesa

echo "🛑 Deteniendo servicios..."
pm2 stop all

echo "🧹 Limpiando caché..."
rm -rf .expo
rm -rf dist
rm -rf node_modules/.cache

echo "📦 Reconstruyendo frontend..."
npx expo export -p web --output-dir dist

echo "🚀 Reiniciando servicios..."
pm2 restart all

echo "✅ Servicios reiniciados"
ENDSSH

echo -e "${GREEN}✅ Despliegue completado${NC}"
echo ""
echo -e "${BLUE}Cambios aplicados:${NC}"
echo "  ✅ Calendario de Reservas Pro con 7 columnas correctas"
echo "  ✅ Apertura de días hereda turnos del horario base"
echo "  ✅ Corrección de errores 500 en modificación de reservas"
echo ""
echo -e "${BLUE}Prueba los cambios en:${NC}"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo "  🔄 https://quieromesa.com/client/reservation/[tu-token]"
