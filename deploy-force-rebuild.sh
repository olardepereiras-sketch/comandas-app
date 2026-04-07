#!/bin/bash

echo "🔥 FORZANDO RECOMPILACIÓN COMPLETA"
echo "=================================="
echo ""

echo "⏹️  1. Deteniendo TODOS los servicios..."
pkill -f "bun.*backend/server.ts" || true
sudo systemctl stop nginx || true
sleep 2

echo "🗑️  2. Eliminando TODO el caché..."
rm -rf dist/
rm -rf .expo/
rm -rf node_modules/.cache/
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-map-* 2>/dev/null || true

echo "📦 3. Recompilando frontend (esto puede tardar)..."
bunx expo export -p web --clear

if [ $? -ne 0 ]; then
  echo "❌ Error al compilar el frontend"
  exit 1
fi

echo "✅ Bundle generado exitosamente"

NEW_BUNDLE=$(ls -t dist/_expo/static/js/web/*.js | head -1)
echo "📄 Nuevo bundle: $NEW_BUNDLE"

if grep -q "handleDelete" "$NEW_BUNDLE"; then
  echo "✅ handleDelete encontrado en el bundle"
else
  echo "⚠️  handleDelete NO encontrado en el bundle"
fi

if grep -q "modifyMutation" "$NEW_BUNDLE"; then
  echo "✅ modifyMutation encontrado en el bundle"
else
  echo "⚠️  modifyMutation NO encontrado en el bundle"
fi

echo ""
echo "🚀 4. Iniciando backend..."
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend iniciado con PID: $BACKEND_PID"
sleep 2

echo ""
echo "🌐 5. Configurando Nginx para NO cachear..."
sudo tee /etc/nginx/sites-available/reservamesa > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name quieromesa.com www.quieromesa.com 200.234.236.133;

    root /var/www/reservamesa/dist;
    index index.html;

    # NO CACHEAR JavaScript
    location ~* \.js$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Pragma "no-cache";
        try_files $uri =404;
    }

    # NO CACHEAR HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Pragma "no-cache";
        try_files $uri =404;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

echo ""
echo "🔄 6. Recargando Nginx..."
sudo nginx -t && sudo systemctl start nginx && sudo systemctl reload nginx

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URL: https://quieromesa.com"
echo ""
echo "⚠️  IMPORTANTE: En el navegador presiona:"
echo "   • Ctrl+Shift+Delete (o Cmd+Shift+Delete en Mac)"
echo "   • Borra 'Imágenes y archivos en caché'"
echo "   • Luego presiona Ctrl+Shift+R (o Cmd+Shift+R)"
echo ""
echo "O mejor aún, abre en modo incógnito"
echo ""
echo "📝 Para ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
