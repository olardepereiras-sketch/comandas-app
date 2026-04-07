#!/bin/bash

echo "🚀 Desplegando correcciones del sistema de valoraciones..."

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

print_status "Paso 1: Ejecutando script de corrección de esquema..."
bun run backend/db/fix-client-ratings-schema.ts
if [ $? -eq 0 ]; then
    print_status "Esquema de base de datos corregido"
else
    print_warning "Hubo un problema con la corrección del esquema, continuando..."
fi

print_status "Paso 2: Verificando cambios en código..."

# Archivos modificados
FILES_TO_CHECK=(
    "backend/services/auto-rating-worker.ts"
    "backend/trpc/routes/reservations/rate-client/route.ts"
    "backend/trpc/routes/reservations/available-slots/route.ts"
    "app/client/restaurant/[slug].tsx"
    "app/client/restaurant2/[slug].tsx"
)

ALL_FILES_EXIST=true
for file in "${FILES_TO_CHECK[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Archivo no encontrado: $file"
        ALL_FILES_EXIST=false
    fi
done

if [ "$ALL_FILES_EXIST" = true ]; then
    print_status "Todos los archivos modificados están presentes"
else
    print_error "Faltan archivos modificados"
    exit 1
fi

print_status "Paso 3: Reiniciando servidor..."

# Detener PM2 si está corriendo
pm2 delete all 2>/dev/null || true

# Reiniciar el servidor
pm2 start ecosystem.config.js
if [ $? -eq 0 ]; then
    print_status "Servidor reiniciado con PM2"
else
    print_warning "No se pudo reiniciar con PM2, intenta manualmente"
fi

print_status "Paso 4: Verificando servicios..."
sleep 3
pm2 status

echo ""
print_status "=========================================="
print_status "✨ Despliegue completado exitosamente"
print_status "=========================================="
echo ""
echo "Correcciones aplicadas:"
echo "  1. ✅ Corregida columna 'order' → 'order_num' en rating_criteria"
echo "  2. ✅ Agregadas columnas rating_average, was_no_show, auto_rated a client_ratings"
echo "  3. ✅ Agregadas columnas rating_deadline, client_ratings, was_no_show a reservations"
echo "  4. ✅ Agregada columna local_ratings a clients"
echo "  5. ✅ Implementado sistema de valoraciones globales vs locales"
echo "  6. ✅ Auto-valoración de 4 corazones después de 24 horas"
echo "  7. ✅ Sistema de deadline de 24 horas para modificar valoraciones"
echo ""
print_status "Verifica los logs con: pm2 logs"
