#!/bin/bash
# ===========================================
# Script de despliegue automático para VPS
# ===========================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

# Variables (personaliza según tu configuración)
VPS_USER=${VPS_USER:-"root"}
VPS_HOST=${VPS_HOST:-"200.234.236.133"}
VPS_PATH=${VPS_PATH:-"/var/www/reservamesa"}
PROJECT_NAME="reservamesa"

echo -e "${GREEN}🚀 Iniciando despliegue de ${PROJECT_NAME}...${NC}"

# Verificar que rsync esté instalado
if ! command -v rsync &> /dev/null; then
  echo -e "${RED}❌ Error: rsync no está instalado${NC}"
  echo "   Instala rsync: sudo apt install rsync (Linux) o brew install rsync (Mac)"
  exit 1
fi

# 1. Verificar archivo .env
if [ ! -f ".env" ]; then
  echo -e "${RED}❌ Error: No se encuentra el archivo .env${NC}"
  echo "   Copia env.example a .env y configura tus credenciales"
  exit 1
fi

echo -e "${YELLOW}⏭️  Omitiendo compilación de frontend (se hará en el VPS)${NC}"
# bunx expo export --platform web

# 2. Copiar archivos al VPS (excluir node_modules, .git, etc.)
echo -e "${YELLOW}📤 Subiendo archivos al VPS...${NC}"

# Crear archivo de exclusiones si existe rsync-exclude.txt
if [ -f "rsync-exclude.txt" ]; then
  rsync -avz --progress --exclude-from='rsync-exclude.txt' ./ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/
else
  rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '.expo' \
    --exclude '.cache' \
    --exclude 'bun.lock' \
    --exclude '.DS_Store' \
    --exclude '*.log' \
    --exclude 'logs/' \
    ./ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/
fi

# 3. Ejecutar comandos en el VPS
echo -e "${YELLOW}⚙️  Instalando dependencias y configurando...${NC}"
ssh ${VPS_USER}@${VPS_HOST} << EOF
  cd ${VPS_PATH}
  
  echo "🔹 Verificando archivo .env..."
  if [ ! -f ".env" ]; then
    echo "❌ Error: No se encuentra .env en el VPS"
    exit 1
  fi
  
  echo "🔹 Cargando variables de entorno..."
  export \$(cat .env | grep -v '^#' | xargs)
  
  echo "🔹 Instalando dependencias..."
  bun install
  
  echo "🔹 Compilando frontend..."
  CI=1 bunx expo export --platform web || echo "⚠️  Error en compilación de frontend, continuando..."
  
  echo "🔹 Probando conexión a base de datos..."
  bun run backend/test-turso.ts || echo "⚠️  Error al conectar a Turso"
  
  echo "🔹 Ejecutando migraciones de base de datos..."
  bun run backend/db/migrations.ts
  
  echo "🔹 Ejecutando seed de datos..."
  bun run backend/db/seed.ts
  
  echo "🔹 Reiniciando aplicación con PM2..."
  pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
  
  echo "🔹 Guardando configuración de PM2..."
  pm2 save
  
  echo "🔹 Estado de la aplicación:"
  pm2 status
EOF

echo -e "${GREEN}✅ Despliegue completado con éxito!${NC}"
echo -e "${GREEN}🌐 Tu aplicación debería estar disponible en: http://${VPS_HOST}${NC}"
