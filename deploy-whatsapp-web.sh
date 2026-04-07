#!/bin/bash

echo "🚀 DESPLEGANDO WHATSAPP WEB"
echo "============================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detener servidor
echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

# Instalar dependencias
echo ""
echo "📋 Paso 2/5: Instalando dependencias..."
bun install

# Limpiar caché
echo ""
echo "📋 Paso 3/5: Limpiando caché..."
rm -rf dist .expo

# Reconstruir frontend
echo ""
echo "📋 Paso 4/5: Reconstruyendo frontend..."
bunx expo export -p web

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error reconstruyendo frontend${NC}"
    exit 1
fi

# Iniciar servidor
echo ""
echo "📋 Paso 5/5: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

# Verificar que el servidor está corriendo
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo -e "${GREEN}✅ Servidor iniciado correctamente${NC}"
else
    echo -e "${RED}❌ Error: El servidor no se inició${NC}"
    exit 1
fi

echo ""
echo "📱 WhatsApp Web Info:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "El servidor intentará conectar WhatsApp Web automáticamente."
echo ""
echo "Si es la primera vez o la sesión expiró:"
echo ""
echo "1. Ejecuta en otra terminal:"
echo "   ${YELLOW}bun backend/scripts/start-whatsapp.ts${NC}"
echo ""
echo "2. Escanea el código QR con tu WhatsApp:"
echo "   📱 WhatsApp > Configuración > Dispositivos vinculados"
echo ""
echo "3. Una vez conectado, la sesión se guardará automáticamente"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ver logs del servidor:"
echo "  ${YELLOW}tail -f /var/www/reservamesa/backend.log${NC}"
echo ""
echo "Verificar estado de WhatsApp Web:"
echo "  ${YELLOW}tail -f backend.log | grep 'WhatsApp'${NC}"
echo ""
echo -e "${GREEN}✅ Despliegue completado${NC}"
echo ""
