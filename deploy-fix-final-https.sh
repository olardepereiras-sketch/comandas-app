#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - Corrigiendo HTTPS y Mixed Content"
echo "==========================================================="

echo "⏹️  1. Deteniendo todos los servicios..."
pkill -f "bun.*server.ts" 2>/dev/null
killall -9 nginx 2>/dev/null
sleep 2

echo "🗑️  2. Limpiando caché y builds..."
rm -rf dist/ .expo/ node_modules/.cache/

echo "📋 3. Verificando variables de entorno..."
if [ ! -f "env" ]; then
  echo "❌ Archivo env no encontrado"
  exit 1
fi

source env

if [ -z "$EXPO_PUBLIC_RORK_API_BASE_URL" ]; then
  echo "❌ EXPO_PUBLIC_RORK_API_BASE_URL no configurada"
  exit 1
fi

echo "   ✅ EXPO_PUBLIC_RORK_API_BASE_URL=$EXPO_PUBLIC_RORK_API_BASE_URL"

echo "📦 4. Compilando frontend con HTTPS (esto tomará ~90 segundos)..."
export EXPO_PUBLIC_RORK_API_BASE_URL="https://quieromesa.com"
export EXPO_PUBLIC_API_URL="https://quieromesa.com"

bunx expo export -p web --output-dir dist --clear

BUNDLE_FILE=$(ls -t dist/_expo/static/js/web/*.js 2>/dev/null | head -n1)
if [ -n "$BUNDLE_FILE" ]; then
  BUNDLE_NAME=$(basename "$BUNDLE_FILE")
  echo "   ✅ Bundle generado: $BUNDLE_NAME"
  
  if grep -q "https://quieromesa.com" "$BUNDLE_FILE"; then
    echo "   ✅ Bundle contiene URLs HTTPS correctas"
  else
    echo "   ⚠️  Verificando URLs en el bundle..."
    if grep -q "200.234.236.133" "$BUNDLE_FILE"; then
      echo "   ❌ Bundle todavía contiene IP antigua"
    fi
  fi
else
  echo "   ❌ Error: Bundle no generado"
  exit 1
fi

echo "🚀 5. Iniciando backend..."
cd /var/www/reservamesa
export EXPO_PUBLIC_RORK_API_BASE_URL="https://quieromesa.com"
export DATABASE_URL="postgresql://reservamesa_user:tu_password_seguro@localhost:5432/reservamesa"
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 3

if ! ps -p $BACKEND_PID > /dev/null; then
  echo "   ❌ Backend falló al iniciar"
  tail -20 backend.log
  exit 1
fi

echo "🌐 6. Configurando Nginx..."
cat > /etc/nginx/sites-available/reservamesa << 'NGINX_EOF'
server {
    listen 80;
    server_name quieromesa.com www.quieromesa.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name quieromesa.com www.quieromesa.com;

    ssl_certificate /etc/letsencrypt/live/quieromesa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quieromesa.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /var/www/reservamesa/dist;
    index index.html;

    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    add_header Pragma "no-cache";
    add_header Expires "0";

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        try_files $uri =404;
    }
}
NGINX_EOF

echo "🔄 7. Reiniciando Nginx..."
nginx -t
if [ $? -eq 0 ]; then
  systemctl restart nginx
  echo "   ✅ Nginx reiniciado"
else
  echo "   ❌ Error en configuración de Nginx"
  exit 1
fi

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URL: https://quieromesa.com"
echo "📄 Bundle: $BUNDLE_NAME"
echo "🔧 Backend PID: $BACKEND_PID"
echo ""
echo "⚠️  IMPORTANTE - LIMPIA EL CACHÉ:"
echo "   1. Presiona Ctrl+Shift+Delete"
echo "   2. Marca 'Imágenes y archivos en caché'"
echo "   3. Haz clic en 'Borrar datos'"
echo "   4. Cierra COMPLETAMENTE el navegador"
echo "   5. Abre https://quieromesa.com de nuevo"
echo ""
echo "   O MEJOR: Abre en modo incógnito"
echo ""
echo "📝 Ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🧪 Verificar que NO hay errores de Mixed Content:"
echo "   Abre F12 -> Consola -> Busca 'Mixed Content'"
echo ""
