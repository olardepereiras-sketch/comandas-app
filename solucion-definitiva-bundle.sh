#!/bin/bash

echo "🔥 SOLUCIÓN DEFINITIVA - FORZAR NUEVO BUNDLE"
echo "============================================"
echo ""

echo "⏹️  1. Deteniendo TODO..."
echo "-------------------------"
sudo systemctl stop nginx
pkill -9 -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "🗑️  2. Eliminando COMPLETAMENTE dist/ y caché..."
echo "------------------------------------------------"
rm -rf dist/
rm -rf .expo/
rm -rf node_modules/.cache/
echo "✅ Limpiado completo"

echo ""
echo "📦 3. Compilando NUEVO bundle con hash único..."
echo "-----------------------------------------------"
# Forzar que Expo genere un nuevo hash
EXPO_NO_CACHE=1 bunx expo export -p web --clear

if [ ! -d "dist" ]; then
  echo "❌ ERROR: No se generó dist/"
  exit 1
fi

echo ""
echo "🔍 4. Verificando que el nuevo bundle tenga el código..."
echo "--------------------------------------------------------"
ENTRY_FILE=$(ls -t dist/_expo/static/js/web/entry-*.js | head -1)
if [ -n "$ENTRY_FILE" ]; then
  echo "Bundle generado: $ENTRY_FILE"
  
  # Verificar que tenga el código de borrado
  if grep -q "handleDelete" "$ENTRY_FILE"; then
    echo "✅ Bundle contiene 'handleDelete'"
  else
    echo "❌ Bundle NO contiene 'handleDelete' - PROBLEMA EN COMPILACIÓN"
    exit 1
  fi
  
  if grep -q "deleteProvince" "$ENTRY_FILE"; then
    echo "✅ Bundle contiene 'deleteProvince'"
  else
    echo "❌ Bundle NO contiene 'deleteProvince'"
  fi
  
  if grep -q "modifyByClient" "$ENTRY_FILE"; then
    echo "✅ Bundle contiene 'modifyByClient'"
  else
    echo "❌ Bundle NO contiene 'modifyByClient'"
  fi
else
  echo "❌ No se encontró el bundle JS"
  exit 1
fi

echo ""
echo "📝 5. Modificando index.html con timestamp único..."
echo "--------------------------------------------------"
TIMESTAMP=$(date +%s)
sed -i "s/<html/<html data-version=\"v${TIMESTAMP}\"/" dist/index.html
echo "✅ Agregado timestamp: v${TIMESTAMP}"

echo ""
echo "⚙️  6. Configurando Nginx para NO cachear..."
echo "--------------------------------------------"
cat > /etc/nginx/sites-available/reservamesa << 'NGINX_EOF'
server {
    listen 80;
    server_name quieromesa.com www.quieromesa.com 200.234.236.133;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name quieromesa.com www.quieromesa.com 200.234.236.133;

    ssl_certificate /etc/letsencrypt/live/quieromesa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quieromesa.com/privkey.pem;

    root /var/www/reservamesa/dist;
    index index.html;

    # NO CACHEAR NADA
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
    etag off;
    if_modified_since off;

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }

    location /_expo/static/ {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

echo "✅ Nginx configurado"

echo ""
echo "🔄 7. Iniciando backend..."
echo "-------------------------"
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  echo "✅ Backend corriendo"
else
  echo "❌ Backend NO arrancó"
  exit 1
fi

echo ""
echo "🔄 8. Iniciando Nginx..."
echo "-----------------------"
sudo systemctl start nginx
sleep 2

if systemctl is-active --quiet nginx; then
  echo "✅ Nginx activo"
else
  echo "❌ Nginx NO arrancó"
  exit 1
fi

echo ""
echo "✅ DEPLOY COMPLETADO"
echo "===================="
echo ""
echo "📊 Información del deploy:"
echo "   • Versión del bundle: v${TIMESTAMP}"
echo "   • Bundle: $(basename $ENTRY_FILE)"
echo "   • Backend PID: $BACKEND_PID"
echo ""
echo "🌐 IMPORTANTE - Para que funcione:"
echo "   1. Abre Chrome/Firefox en MODO INCÓGNITO"
echo "   2. Ve a: https://quieromesa.com"
echo "   3. Si no funciona, presiona Ctrl+Shift+Delete"
echo "   4. Borra TODO el caché del navegador"
echo "   5. Cierra el navegador completamente"
echo "   6. Abre de nuevo en incógnito"
echo ""
echo "🧪 PRUEBAS:"
echo "   1. Ve a /admin/locations"
echo "   2. Intenta borrar una provincia"
echo "   3. Debe aparecer un Alert de confirmación"
echo ""
