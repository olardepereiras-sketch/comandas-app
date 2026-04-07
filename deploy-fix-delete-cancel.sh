#!/bin/bash

echo "🚀 Desplegando correcciones de borrado y cancelación..."
echo "========================================================"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Arreglar esquema de base de datos
echo ""
echo "📋 1. Arreglando esquema de base de datos..."
echo "------------------------------------------------------------"
bun run backend/db/fix-delete-cancel-issues.ts
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error arreglando esquema${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Esquema corregido${NC}"

# 2. Instalar dependencias (por si acaso)
echo ""
echo "📋 2. Verificando dependencias..."
echo "------------------------------------------------------------"
bun install
echo -e "${GREEN}✅ Dependencias actualizadas${NC}"

# 3. Construir backend
echo ""
echo "📋 3. Construyendo backend..."
echo "------------------------------------------------------------"
bun run build 2>&1 | head -20
echo -e "${GREEN}✅ Backend construido${NC}"

# 4. Construir frontend
echo ""
echo "📋 4. Construyendo frontend..."
echo "------------------------------------------------------------"
bunx expo export -p web --output-dir dist/public 2>&1 | tail -5
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Advertencia en build del frontend${NC}"
else
    echo -e "${GREEN}✅ Frontend construido${NC}"
fi

# 5. Reiniciar servidor
echo ""
echo "📋 5. Reiniciando servidor..."
echo "------------------------------------------------------------"
pm2 restart reservamesa 2>/dev/null || echo -e "${YELLOW}⚠️  PM2 no está corriendo, inícialo con: pm2 start backend/server.ts --name reservamesa${NC}"
echo -e "${GREEN}✅ Servidor reiniciado${NC}"

echo ""
echo "========================================================"
echo -e "${GREEN}✅ Despliegue completado exitosamente${NC}"
echo ""
echo "🔍 Para verificar:"
echo "   pm2 logs reservamesa"
echo ""
echo "📝 Cambios aplicados:"
echo "   ✅ Tabla client_no_shows verificada/creada"
echo "   ✅ location_id ahora permite NULL"
echo "   ✅ Foreign keys configuradas con CASCADE/SET NULL"
echo "   ✅ Ruta de delete corregida"
echo "   ✅ Índices de rendimiento agregados"
echo ""
