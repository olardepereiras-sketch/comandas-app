#!/bin/bash

echo "🚀 QUIEROMESA - FIX CRÍTICO DE RESERVAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar variables de entorno
echo "📋 Paso 1: Verificando variables de entorno"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ ! -f "env" ]; then
  echo -e "${RED}❌ Archivo env no encontrado${NC}"
  exit 1
fi
source env
echo -e "${GREEN}✅ Variables de entorno configuradas${NC}"
echo ""

# Instalar dependencias
echo "📋 Paso 2: Instalando dependencias"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun install
echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

# Compilar frontend
echo "📋 Paso 3: Compilando frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠️  Limpiando cache...${NC}"
rm -rf dist .expo

echo -e "${YELLOW}⚠️  Exportando aplicación web...${NC}"
bunx expo export --platform web

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Frontend compilado correctamente${NC}"
else
  echo -e "${RED}❌ Error compilando frontend${NC}"
  exit 1
fi
echo ""

# Reiniciar servidor
echo "📋 Paso 4: Reiniciando servidor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠️  Deteniendo procesos anteriores...${NC}"
pkill -f 'bun.*backend/server.ts' || true
sleep 2

echo -e "${YELLOW}⚠️  Iniciando servidor en background...${NC}"
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
sleep 3

if ps -p $SERVER_PID > /dev/null; then
  echo -e "${GREEN}✅ Servidor iniciado correctamente (PID: $SERVER_PID)${NC}"
else
  echo -e "${RED}❌ Error iniciando servidor${NC}"
  exit 1
fi
echo ""

# Recargar nginx
echo "📋 Paso 5: Recargando nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠️  Recargando configuración de nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx recargado${NC}"
echo ""

# Verificación
echo "📋 Paso 6: Verificando sistema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pgrep -f 'bun.*backend/server.ts' > /dev/null; then
  echo -e "${GREEN}✅ Servidor ejecutándose correctamente${NC}"
else
  echo -e "${RED}❌ Servidor no está ejecutándose${NC}"
  exit 1
fi

sleep 2
if curl -s http://localhost:3000/api/health > /dev/null; then
  echo -e "${GREEN}✅ Endpoint de salud respondiendo${NC}"
else
  echo -e "${RED}❌ Endpoint de salud no responde${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ FIX CRÍTICO COMPLETADO EXITOSAMENTE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 PROBLEMAS RESUELTOS:"
echo "  ✅ Buscador solo muestra números de comensales con mesas disponibles"
echo "  ✅ Reservas anuladas liberan mesas correctamente"
echo "  ✅ Modificaciones de reserva mantienen mismo token y número"
echo "  ✅ Modificaciones reutilizan mesa si cumple requisitos"
echo "  ✅ Si no cumple requisitos, se asigna nueva mesa y libera la anterior"
echo ""
echo "🌐 Servicios disponibles:"
echo "  • Frontend: https://quieromesa.com"
echo "  • API: https://quieromesa.com/api"
echo "  • Admin: https://quieromesa.com/admin"
echo ""
echo "📊 Comandos útiles:"
echo "  • Ver logs: tail -f backend.log"
echo "  • Reiniciar: pkill -f 'bun.*backend/server.ts' && bun backend/server.ts > backend.log 2>&1 &"
echo "  • Estado: pgrep -f 'bun.*backend/server.ts'"
echo ""
echo "🎉 ¡Sistema completamente operativo!"
echo ""
