#!/bin/bash

echo "🚀 Desplegando sistema de tronas y grupos de mesas..."
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📦 Paso 1: Subiendo archivos al servidor...${NC}"
rsync -avz --exclude 'node_modules' \
  --exclude '.expo' \
  --exclude '.expo-shared' \
  --exclude 'dist' \
  --exclude '.git' \
  backend/db/add-high-chairs-and-groups.ts \
  backend/trpc/routes/restaurants/update-high-chairs/ \
  backend/trpc/routes/tables/create-group/ \
  backend/trpc/routes/tables/update-group/ \
  backend/trpc/routes/tables/delete-group/ \
  backend/trpc/routes/tables/list-groups/ \
  backend/trpc/routes/reservations/available-slots/route.ts \
  backend/trpc/routes/tables/available-for-reservation/route.ts \
  backend/trpc/app-router.ts \
  types/index.ts \
  app/restaurant/reservations-pro.tsx \
  root@146.190.17.138:/var/www/reservamesa/

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error al subir archivos${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Archivos subidos correctamente${NC}"
echo ""

echo -e "${BLUE}📦 Paso 2: Ejecutando migraciones de base de datos...${NC}"
ssh root@146.190.17.138 << 'ENDSSH'
cd /var/www/reservamesa

echo "🔧 Ejecutando migración de tronas y grupos de mesas..."
bun run backend/db/add-high-chairs-and-groups.ts

if [ $? -ne 0 ]; then
  echo "❌ Error en migración de base de datos"
  exit 1
fi

echo "✅ Migración completada"
ENDSSH

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error en migraciones de base de datos${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Migraciones ejecutadas correctamente${NC}"
echo ""

echo -e "${BLUE}📦 Paso 3: Reiniciando servidor...${NC}"
ssh root@146.190.17.138 << 'ENDSSH'
cd /var/www/reservamesa

echo "🔄 Reiniciando aplicación con PM2..."
pm2 restart reservamesa-server

echo "✅ Servidor reiniciado"
ENDSSH

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error al reiniciar servidor${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Servidor reiniciado correctamente${NC}"
echo ""

echo -e "${BLUE}📦 Paso 4: Reconstruyendo frontend...${NC}"
ssh root@146.190.17.138 << 'ENDSSH'
cd /var/www/reservamesa

echo "🔨 Construyendo frontend..."
bun run build

if [ $? -ne 0 ]; then
  echo "❌ Error al construir frontend"
  exit 1
fi

echo "✅ Frontend construido"
ENDSSH

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error al construir frontend${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Frontend construido correctamente${NC}"
echo ""

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ ¡Despliegue completado exitosamente!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}📋 Funcionalidades desplegadas:${NC}"
echo ""
echo "1. ✅ Sistema de tronas (tronas disponibles)"
echo "   - Los restaurantes pueden configurar cuántas tronas tienen"
echo "   - Tiempo de rotación de tronas configurable"
echo "   - Las reservas verifican disponibilidad de tronas"
echo "   - Mensaje al usuario cuando no hay tronas disponibles"
echo ""
echo "2. ✅ Grupos de mesas"
echo "   - Los restaurantes pueden crear grupos de mesas"
echo "   - Capacidad mínima y máxima por grupo"
echo "   - Prioridad configurable"
echo "   - Verificación de disponibilidad de todas las mesas del grupo"
echo ""
echo "3. ✅ Mejoras en reservations-pro"
echo "   - Al abrir un día cerrado, se actualiza el estado sin salir"
echo "   - Al guardar turnos, se actualiza la pantalla automáticamente"
echo ""
echo -e "${BLUE}⚠️  Notas importantes:${NC}"
echo "- Las notificaciones de WhatsApp ahora mostrarán todas las mesas cuando se reserva un grupo"
echo "- En las pantallas de reservas se mostrarán todas las mesas del grupo"
echo "- La UI para gestionar tronas y grupos de mesas en /restaurant/tables necesita actualizarse manualmente"
echo ""
echo -e "${BLUE}🔍 Verificación:${NC}"
echo "1. Verifica que https://quieromesa.com/restaurant/reservations-pro funciona correctamente"
echo "2. Prueba abrir un día cerrado y guarda turnos - debe actualizar sin salir"
echo "3. Verifica que el sistema de reservas respeta las tronas disponibles"
echo ""
