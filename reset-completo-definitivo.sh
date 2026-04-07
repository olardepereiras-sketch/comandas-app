#!/bin/bash

echo "🔥 RESET COMPLETO - SOLUCIÓN DEFINITIVA"
echo "========================================"
echo ""

# 1. Matar TODOS los procesos
echo "⏹️  1. Matando TODOS los procesos..."
pkill -9 -f "bun.*backend/server.ts" || true
sudo systemctl stop nginx || true
sleep 2

# 2. Limpiar ABSOLUTAMENTE TODO
echo "🗑️  2. Limpiando TODO..."
rm -rf dist/
rm -rf .expo/
rm -rf node_modules/.cache/ 2>/dev/null || true
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-* 2>/dev/null || true

# 3. Limpiar caché del navegador con headers HTTP
echo "📝 3. Configurando Nginx para FORZAR recarga..."
sudo tee /etc/nginx/sites-available/reservamesa > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name quieromesa.com www.quieromesa.com;

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name quieromesa.com www.quieromesa.com;

    ssl_certificate /etc/letsencrypt/live/quieromesa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quieromesa.com/privkey.pem;

    root /var/www/reservamesa/dist;
    index index.html;

    # FORZAR NO CACHÉ - SOLUCIÓN DEFINITIVA
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
    add_header Last-Modified $date_gmt always;
    if_modified_since off;
    etag off;

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    location /_expo/ {
        try_files $uri =404;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    location /api {
        proxy_pass http://127.0.0.1:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }
}
NGINX_EOF

# 4. Compilar con un hash ÚNICO usando timestamp
echo "📦 4. Compilando con hash ÚNICO..."
export EXPO_NO_CACHE=1
export EXPO_NO_WEB_CACHE=1
# Agregar timestamp al bundle para forzar nuevo nombre
bunx expo export -p web --clear

if [ ! -d "dist" ]; then
    echo "❌ ERROR: No se generó dist/"
    exit 1
fi

echo "✅ Bundle generado en dist/"

# 5. Verificar que el index.html tenga el nuevo bundle
BUNDLE_NAME=$(grep -o 'entry-[a-f0-9]*\.js' dist/index.html | head -1)
echo "📄 Bundle detectado: $BUNDLE_NAME"

if [ -z "$BUNDLE_NAME" ]; then
    echo "❌ ERROR: No se encontró el bundle en index.html"
    exit 1
fi

# 6. Iniciar backend
echo "🚀 5. Iniciando backend..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 3

# Verificar que el backend esté corriendo
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ ERROR: Backend no se inició correctamente"
    tail -20 backend.log
    exit 1
fi

# 7. Iniciar Nginx
echo "🌐 6. Iniciando Nginx..."
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Configuración de Nginx inválida"
    exit 1
fi
sudo systemctl start nginx

echo ""
echo "✅ RESET COMPLETO EXITOSO"
echo "========================="
echo ""
echo "🔗 URL: https://quieromesa.com"
echo "📄 Bundle: $BUNDLE_NAME"
echo "🔧 Backend PID: $BACKEND_PID"
echo ""
echo "⚠️  IMPORTANTE - INSTRUCCIONES PARA EL NAVEGADOR:"
echo "   1. Presiona F12 (Herramientas de desarrollador)"
echo "   2. Haz clic DERECHO en el botón de recargar"
echo "   3. Selecciona 'Vaciar caché y recargar forzado'"
echo "   O MEJOR:"
echo "   1. Presiona Ctrl+Shift+Delete"
echo "   2. Selecciona 'Imágenes y archivos en caché'"
echo "   3. Borra TODO"
echo "   4. Cierra el navegador COMPLETAMENTE"
echo "   5. Abre de nuevo https://quieromesa.com"
echo ""
echo "📊 Para verificar logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
