#!/bin/bash

echo "🔧 REPARACIÓN COMPLETA DEL SISTEMA"
echo "=================================="

cd /var/www/reservamesa

# 1. Verificar y arrancar PostgreSQL
echo ""
echo "1️⃣ Verificando PostgreSQL..."
if ! systemctl is-active --quiet postgresql; then
    echo "   ⚠️  PostgreSQL no está corriendo. Iniciando..."
    sudo systemctl start postgresql
    sleep 3
    
    if systemctl is-active --quiet postgresql; then
        echo "   ✅ PostgreSQL iniciado correctamente"
    else
        echo "   ❌ Error al iniciar PostgreSQL"
        sudo systemctl status postgresql
        exit 1
    fi
else
    echo "   ✅ PostgreSQL está corriendo"
fi

# 2. Verificar archivo .env
echo ""
echo "2️⃣ Verificando archivo .env..."
if [ ! -f .env ]; then
    echo "   ❌ Archivo .env no existe. Copiando desde env..."
    cp env .env
    echo "   ✅ Archivo .env creado"
fi

# 3. Detener procesos existentes
echo ""
echo "3️⃣ Deteniendo procesos anteriores..."
pkill -f "bun.*backend/server.ts" 2>/dev/null && echo "   ✅ Backend detenido"
pkill -f "npx expo" 2>/dev/null && echo "   ✅ Frontend detenido"
sleep 2

# 4. Verificar permisos de directorios
echo ""
echo "4️⃣ Verificando permisos..."
sudo chown -R $USER:$USER /var/www/reservamesa
echo "   ✅ Permisos actualizados"

# 5. Limpiar logs anteriores
echo ""
echo "5️⃣ Limpiando logs..."
> backend.log
echo "   ✅ Logs limpiados"

# 6. Iniciar backend
echo ""
echo "6️⃣ Iniciando backend..."
nohup bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   📋 Backend PID: $BACKEND_PID"

# Esperar a que el backend inicie
echo "   ⏳ Esperando 10 segundos a que el backend inicie..."
sleep 10

# Verificar si el backend está corriendo
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "   ✅ Backend corriendo correctamente"
    
    # Verificar que responde en puerto 3000
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "   ✅ Backend responde en puerto 3000"
    else
        echo "   ⚠️  Backend corriendo pero no responde en /api/health"
    fi
else
    echo "   ❌ Backend no está corriendo. Revisando log..."
    tail -50 backend.log
    exit 1
fi

# 7. Construir y preparar frontend para producción
echo ""
echo "7️⃣ Construyendo frontend..."

# Verificar si existe directorio dist
if [ ! -d "dist" ]; then
    echo "   📦 Construyendo aplicación web..."
    npx expo export:web
    
    if [ -d "dist" ]; then
        echo "   ✅ Build completado"
    else
        echo "   ❌ Error al construir frontend"
        exit 1
    fi
else
    echo "   ✅ Directorio dist existe"
fi

# 8. Configurar nginx correctamente
echo ""
echo "8️⃣ Configurando nginx..."

# Copiar configuración correcta
sudo cp nginx-quieromesa-fixed.conf /etc/nginx/sites-available/quieromesa

# Asegurar que el enlace simbólico existe
if [ ! -L /etc/nginx/sites-enabled/quieromesa ]; then
    sudo ln -sf /etc/nginx/sites-available/quieromesa /etc/nginx/sites-enabled/quieromesa
fi

# Eliminar configuración default si existe
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración de nginx
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Configuración de nginx válida"
    sudo systemctl reload nginx
    echo "   ✅ Nginx recargado"
else
    echo "   ❌ Error en configuración de nginx"
    sudo nginx -t
    exit 1
fi

# 9. Verificar estado final
echo ""
echo "9️⃣ Verificación final..."
echo ""

# Backend
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "   ✅ Backend: CORRIENDO"
else
    echo "   ❌ Backend: NO CORRIENDO"
fi

# PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo "   ✅ PostgreSQL: CORRIENDO"
else
    echo "   ❌ PostgreSQL: NO CORRIENDO"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx: CORRIENDO"
else
    echo "   ❌ Nginx: NO CORRIENDO"
fi

# Frontend dist
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "   ✅ Frontend: BUILD DISPONIBLE"
else
    echo "   ❌ Frontend: BUILD NO DISPONIBLE"
fi

echo ""
echo "=================================="
echo "✅ REPARACIÓN COMPLETADA"
echo ""
echo "🌐 Accede a: https://quieromesa.com"
echo ""
echo "📋 Para ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "📋 Para ver logs de nginx:"
echo "   sudo tail -f /var/log/nginx/quieromesa-error.log"
echo ""
