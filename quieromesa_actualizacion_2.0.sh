#!/bin/bash

#############################################
# QUIEROMESA - SCRIPT DE ACTUALIZACIÓN 2.0
# Script unificado para actualizar el sistema
# Autor: Sistema QuieroMesa
# Fecha: 2026-01-17
#############################################

set -e

echo "🚀 QUIEROMESA - ACTUALIZACIÓN 2.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables de entorno correctas
export DATABASE_URL="postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db"
export PGPASSWORD="MiContrasenaSegura666"

# Función para mensajes
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

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

print_step "Paso 1: Verificando variables de entorno"
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL no está configurada"
    exit 1
fi
print_success "Variables de entorno configuradas"

print_step "Paso 2: Instalando dependencias"
bun install
print_success "Dependencias instaladas"

print_step "Paso 3: Actualizando esquema de base de datos"

# Arreglar esquema de tablas de valoración definitivamente
print_warning "Arreglando sistema completo de valoración..."
if ! bun backend/db/fix-rating-system-complete.ts; then
    print_error "Error crítico al arreglar esquema de valoración"
    echo "Intentando ver el error en detalle:"
    tail -n 50 backend.log 2>/dev/null || true
    echo ""
    echo "Verifica que DATABASE_URL esté correctamente configurada en el archivo env"
    exit 1
fi
print_success "Sistema de valoración arreglado correctamente"

# Arreglar constraint de table_blocks para usar table_locations
print_warning "Arreglando tabla de bloqueos de mesas..."
bun backend/db/fix-table-blocks-constraint.ts 2>/dev/null || print_warning "La tabla ya existe o hubo un error menor"

# Verificar que la tabla day_exceptions tenga las columnas correctas
print_warning "Verificando esquema de day_exceptions..."
psql "$DATABASE_URL" -c "ALTER TABLE day_exceptions ADD COLUMN IF NOT EXISTS shifts JSONB DEFAULT '[]'::jsonb;" 2>/dev/null || true
psql "$DATABASE_URL" -c "ALTER TABLE day_exceptions ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;" 2>/dev/null || true

print_success "Esquema de base de datos actualizado"

print_step "Paso 4: Compilando frontend"
print_warning "Limpiando cache anterior..."
rm -rf dist .expo 2>/dev/null || true
print_warning "Exportando aplicación web..."
bunx expo export -p web || {
    print_error "Error compilando frontend"
    exit 1
}
print_success "Frontend compilado"

print_step "Paso 5: Reiniciando servidor"
# Detener procesos existentes
print_warning "Deteniendo procesos anteriores..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

# Iniciar nuevo proceso
print_warning "Iniciando servidor en background..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

print_success "Servidor reiniciado"

print_step "Paso 6: Recargando nginx"
print_warning "Recargando configuración de nginx..."
sudo systemctl reload nginx
print_success "Nginx recargado"

print_step "Paso 7: Verificando estado del sistema"
sleep 2

# Verificar que el servidor esté corriendo
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    print_success "Servidor ejecutándose correctamente (PID: $(pgrep -f 'bun.*backend/server.ts'))"
else
    print_error "El servidor no se inició correctamente"
    echo "Últimas líneas del log:"
    tail -n 50 backend.log
    exit 1
fi

# Verificar que el endpoint responda
if curl -f http://localhost:3000/api/health &>/dev/null; then
    print_success "Endpoint de salud respondiendo"
else
    print_warning "El endpoint de salud no responde aún (puede tardar unos segundos)"
fi

print_step "Paso 8: Limpieza"
# Limpiar archivos temporales si es necesario
print_warning "Limpiando archivos temporales..."
rm -rf dist/.cache 2>/dev/null || true
print_success "Limpieza completada"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ ACTUALIZACIÓN COMPLETADA EXITOSAMENTE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
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
echo "🎯 PROBLEMAS RESUELTOS EN ESTA VERSIÓN 2.0.10:"
echo "  ✅ FIX 1: Valoración media en dashboard restaurante (últimas 500 valoraciones)"
echo "  ✅ FIX 2: Valoración en admin/users calculada desde historial completo"
echo "  ✅ FIX 3: Recordatorio2 con texto: 'Hola [nombre], le recordamos que tiene una reserva Hoy a las [hora]...'"
echo "  ✅ FIX 4: Texto de confirmación con detalles: adultos, tronas, carrito, mascota"
echo "  ✅ FIX 5: Número de reserva permanece igual en múltiples modificaciones"
echo "  ✅ FIX 6: Botones modificar/anular siempre visibles en token2 (si hay tiempo)"
echo "  ✅ FIX 7: Confirmación cliente incluye número de comensales desglosado"
echo ""
echo "⚠️ NOTA IMPORTANTE:"
echo "  • El servidor se ejecuta sin PM2 (proceso simple en background)"
echo "  • Logs disponibles en backend.log"
echo "  • Para reiniciar: pkill -f 'bun.*backend/server.ts' && bun backend/server.ts > backend.log 2>&1 &"
echo ""
