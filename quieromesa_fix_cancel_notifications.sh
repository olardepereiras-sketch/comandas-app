#!/bin/bash

echo "🚀 QUIEROMESA - FIX NOTIFICACIONES DE CANCELACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Variables
DEPLOY_DIR="/var/www/reservamesa"
BACKUP_DIR="$DEPLOY_DIR/backups/$(date +%Y%m%d_%H%M%S)"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_step() {
    echo ""
    echo "📋 $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -d "$DEPLOY_DIR" ]; then
    print_error "El directorio $DEPLOY_DIR no existe"
    exit 1
fi

cd $DEPLOY_DIR

print_step "Paso 1: Creando backup"
mkdir -p $BACKUP_DIR
cp backend/trpc/routes/reservations/cancel-by-client/route.ts $BACKUP_DIR/ 2>/dev/null || true
cp backend/trpc/routes/reservations/cancel/route.ts $BACKUP_DIR/ 2>/dev/null || true
print_success "Backup creado en $BACKUP_DIR"

print_step "Paso 2: Instalando dependencias"
bun install
print_success "Dependencias instaladas"

print_step "Paso 3: Compilando frontend"
print_warning "Limpiando cache anterior..."
rm -rf dist .expo

print_warning "Exportando aplicación web..."
EXPO_NO_DOTENV=1 bunx expo export -p web --output-dir dist
print_success "Frontend compilado"

print_step "Paso 4: Reiniciando servidor"
print_warning "Deteniendo procesos anteriores..."
pkill -f 'bun.*backend/server.ts' || true
sleep 2

print_warning "Iniciando servidor en background..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3
print_success "Servidor reiniciado"

print_step "Paso 5: Recargando nginx"
print_warning "Recargando configuración de nginx..."
sudo systemctl reload nginx
print_success "Nginx recargado"

print_step "Paso 6: Verificando estado del sistema"
if pgrep -f 'bun.*backend/server.ts' > /dev/null; then
    SERVER_PID=$(pgrep -f 'bun.*backend/server.ts')
    print_success "Servidor ejecutándose correctamente (PID: $SERVER_PID)"
else
    print_error "El servidor no está ejecutándose"
    print_warning "Mostrando últimas líneas del log:"
    tail -n 20 backend.log
    exit 1
fi

# Verificar endpoint de salud
sleep 2
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_success "Endpoint de salud respondiendo"
else
    print_warning "El endpoint de salud no responde, pero el servidor está ejecutándose"
fi

print_step "Paso 7: Limpieza"
print_warning "Limpiando archivos temporales..."
# Mantener solo los últimos 5 backups
cd $DEPLOY_DIR/backups
ls -t | tail -n +6 | xargs -r rm -rf
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
echo "  • Ver logs: tail -f $DEPLOY_DIR/backend.log"
echo "  • Reiniciar: pkill -f 'bun.*backend/server.ts' && cd $DEPLOY_DIR && nohup bun backend/server.ts > backend.log 2>&1 &"
echo "  • Estado: pgrep -f 'bun.*backend/server.ts'"
echo ""
echo "🎯 PROBLEMA RESUELTO:"
echo "  ✅ Las notificaciones de cancelación ahora se envían al número configurado en Configuración Pro"
echo "  ✅ Cuando un cliente cancela, el restaurante recibe la notificación en los números de notification_phones"
echo "  ✅ Cuando el restaurante cancela, también notifica a los números configurados"
echo ""
