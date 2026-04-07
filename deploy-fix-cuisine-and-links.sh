#!/bin/bash

echo "🚀 Desplegando correcciones críticas..."
echo "========================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encuentra package.json${NC}"
    echo "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

echo -e "${GREEN}✅ Directorio correcto${NC}"
echo ""

# 1. Instalar dependencias si es necesario
echo "📦 1. Verificando dependencias..."
echo "------------------------------------------------------------"
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    bun install
else
    echo -e "${GREEN}✅ Dependencias ya instaladas${NC}"
fi
echo ""

# 2. Hacer backup de la base de datos (opcional)
echo "💾 2. Haciendo backup (recomendado)..."
echo "------------------------------------------------------------"
read -p "¿Deseas hacer backup de la base de datos? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    timestamp=$(date +%Y%m%d_%H%M%S)
    pg_dump $DATABASE_URL > "backup_${timestamp}.sql" 2>/dev/null || echo -e "${YELLOW}⚠️  No se pudo hacer backup (continuando...)${NC}"
fi
echo ""

# 3. Compilar TypeScript
echo "🔨 3. Compilando aplicación..."
echo "------------------------------------------------------------"
echo "Compilando backend y frontend..."

# Limpiar cache
rm -rf .expo
rm -rf dist
rm -rf .next

# Compilar
bun run build || {
    echo -e "${RED}❌ Error al compilar${NC}"
    echo "Revisa los errores de TypeScript arriba"
    exit 1
}

echo -e "${GREEN}✅ Compilación exitosa${NC}"
echo ""

# 4. Reiniciar el servidor con PM2
echo "🔄 4. Reiniciando servidor..."
echo "------------------------------------------------------------"

# Verificar si PM2 está corriendo
if pm2 list | grep -q "reservamesa"; then
    echo "Reiniciando aplicación con PM2..."
    pm2 restart reservamesa
    pm2 save
else
    echo "Iniciando aplicación con PM2..."
    pm2 start bun --name reservamesa -- run backend/server.ts
    pm2 save
    pm2 startup
fi

echo -e "${GREEN}✅ Servidor reiniciado${NC}"
echo ""

# 5. Verificar que el servidor está corriendo
echo "🔍 5. Verificando servidor..."
echo "------------------------------------------------------------"
sleep 3

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor respondiendo correctamente${NC}"
else
    echo -e "${RED}❌ El servidor no responde${NC}"
    echo "Revisa los logs con: pm2 logs reservamesa"
    exit 1
fi
echo ""

# 6. Mostrar resumen
echo ""
echo "✨ ¡Despliegue completado!"
echo "========================================"
echo ""
echo -e "${GREEN}Correcciones aplicadas:${NC}"
echo "  ✅ Error de tipos de cocina por provincia solucionado"
echo "  ✅ Formato de enlaces de reserva mejorado"
echo "  ✅ Enlaces ahora más visibles en WhatsApp"
echo "  ✅ Cancelación de reservas funcionando correctamente"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE - Configuración HTTPS:${NC}"
echo ""
echo "Para que los enlaces aparezcan en AZUL y sean clicables,"
echo "necesitas configurar HTTPS. Lee la guía:"
echo ""
echo "  📖 GUIA-HTTPS-LETSENCRYPT.md"
echo ""
echo "Comandos rápidos para HTTPS:"
echo "  1. sudo apt install certbot python3-certbot-nginx"
echo "  2. sudo certbot --nginx -d tu-dominio.com"
echo "  3. Actualizar URLs en .env y backend/services/email.ts"
echo ""
echo -e "${GREEN}📊 Estado del servidor:${NC}"
pm2 status
echo ""
echo -e "${GREEN}📝 Ver logs en tiempo real:${NC}"
echo "  pm2 logs reservamesa"
echo ""
echo -e "${GREEN}🌐 Acceder a la aplicación:${NC}"
echo "  http://200.234.236.133"
echo ""
echo "🎉 ¡Todo listo!"
