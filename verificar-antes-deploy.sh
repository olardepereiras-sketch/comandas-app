#!/bin/bash
# ===========================================
# Script de verificación pre-despliegue (Linux/Mac)
# ===========================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "==============================================="
echo "  VERIFICACIÓN PRE-DESPLIEGUE"
echo "  Proyecto: ReservaMesa"
echo "==============================================="
echo ""

# 1. Verificar que existe .env
echo -e "${BLUE}[1/6]${NC} Verificando archivo .env..."
if [ ! -f ".env" ]; then
    echo -e "  ${RED}❌ ERROR: No se encuentra el archivo .env${NC}"
    echo -e "  ${YELLOW}📝 Solución: Copia env.example a .env y configura tus credenciales${NC}"
    echo "     cp env.example .env"
    exit 1
fi
echo -e "  ${GREEN}✅ Archivo .env encontrado${NC}"

# 2. Verificar contenido de .env
echo ""
echo -e "${BLUE}[2/6]${NC} Verificando configuración de Turso..."
if grep -q "tu_token_de_autenticacion" .env; then
    echo -e "  ${RED}❌ ERROR: El token de Turso no está configurado${NC}"
    echo -e "  ${YELLOW}📝 El archivo .env contiene 'tu_token_de_autenticacion'${NC}"
    echo "     Debes reemplazarlo con tu token real de Turso"
    echo "     Token formato: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
    exit 1
fi
echo -e "  ${GREEN}✅ Token de Turso parece configurado${NC}"

# 3. Verificar conectividad SSH
echo ""
echo -e "${BLUE}[3/6]${NC} Verificando conectividad SSH al VPS..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes root@200.234.236.133 "echo OK" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Conectividad SSH OK${NC}"
else
    echo -e "  ${YELLOW}⚠️  ADVERTENCIA: No se puede conectar al VPS via SSH${NC}"
    echo -e "  ${YELLOW}📝 Verifica que:${NC}"
    echo "     - Tu clave SSH esté configurada"
    echo "     - El VPS esté accesible"
    echo "     - El firewall permita conexiones SSH"
    echo ""
    read -p "  ¿Deseas continuar de todos modos? (s/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# 4. Verificar herramientas de transferencia
echo ""
echo -e "${BLUE}[4/6]${NC} Verificando herramientas de transferencia..."
if command -v rsync >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅ rsync disponible (recomendado)${NC}"
elif command -v scp >/dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠️  rsync no disponible, se usará scp (más lento)${NC}"
    echo -e "  ${YELLOW}💡 Recomendación: Instala rsync para despliegues más rápidos${NC}"
else
    echo -e "  ${RED}❌ ERROR: No se encuentra rsync ni scp${NC}"
    echo -e "  ${YELLOW}📝 Instala rsync: sudo apt install rsync (Linux) o brew install rsync (Mac)${NC}"
    exit 1
fi

# 5. Verificar estructura de archivos
echo ""
echo -e "${BLUE}[5/6]${NC} Verificando estructura del proyecto..."
files_to_check=(
    "backend/db/migrations.ts"
    "backend/db/seed.ts"
    "backend/test-turso.ts"
    "deploy.sh"
)

all_files_exist=true
for file in "${files_to_check[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "  ${RED}❌ ERROR: No se encuentra $file${NC}"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    exit 1
fi
echo -e "  ${GREEN}✅ Estructura del proyecto OK${NC}"

# 6. Verificar permisos de deploy.sh
echo ""
echo -e "${BLUE}[6/6]${NC} Verificando permisos de deploy.sh..."
if [ ! -x "deploy.sh" ]; then
    echo -e "  ${YELLOW}⚠️  deploy.sh no tiene permisos de ejecución${NC}"
    echo -e "  ${YELLOW}📝 Aplicando permisos...${NC}"
    chmod +x deploy.sh
fi
echo -e "  ${GREEN}✅ Permisos OK${NC}"

echo ""
echo "==============================================="
echo -e "  ${GREEN}✅ VERIFICACIÓN COMPLETA${NC}"
echo "==============================================="
echo ""
echo "  Todas las verificaciones pasaron exitosamente"
echo "  El proyecto está listo para desplegarse"
echo ""
echo "  Para iniciar el despliegue ejecuta:"
echo "    ./deploy.sh"
echo ""
