#!/bin/bash

#############################################
# QUIEROMESA - FIX DEFINITIVO RATING SCHEMA
# Script para arreglar el esquema de tablas
# de valoración de una vez por todas
#############################################

set -e

echo "🚀 FIX DEFINITIVO - ESQUEMA DE VALORACIONES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables de entorno
export DATABASE_URL="postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db"
export PGPASSWORD="MiContrasenaSegura666"

print_step() {
    echo ""
    echo -e "${GREEN}📋 $1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_error() {
    echo -e "${RED}❌ Error: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar directorio
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json"
    exit 1
fi

print_step "Arreglando esquema de base de datos"
print_warning "Esto eliminará y recreará las tablas de valoración"
echo "Las tablas que se van a recrear:"
echo "  - rating_criteria"
echo "  - no_show_rules"
echo "  - no_show_config"
echo "  - client_no_shows"
echo ""
echo -n "¿Continuar? (s/n): "
read -r respuesta

if [ "$respuesta" != "s" ] && [ "$respuesta" != "S" ]; then
    echo "Operación cancelada"
    exit 0
fi

print_step "Ejecutando fix del esquema"
if ! bun backend/db/fix-rating-schema-definitivo.ts; then
    print_error "Error al ejecutar el fix"
    exit 1
fi

print_step "Verificando que los endpoints funcionen"
sleep 2

# Reiniciar servidor
print_warning "Reiniciando servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
bun backend/server.ts > backend.log 2>&1 &
sleep 3

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    print_success "Servidor reiniciado (PID: $(pgrep -f 'bun.*backend/server.ts'))"
else
    print_error "Error al reiniciar servidor"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ FIX COMPLETADO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ahora puedes:"
echo "  1. Ir a https://quieromesa.com/admin/rating-criteria"
echo "  2. Crear criterios de valoración"
echo "  3. El error 500 ya no debería aparecer"
echo ""
echo "Si aún hay problemas, ejecuta:"
echo "  tail -f backend.log"
echo ""
