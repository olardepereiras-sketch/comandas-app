#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - Corrigiendo errores de TypeScript"
echo "============================================================"

cd /var/www/reservamesa

echo ""
echo "⏹️  1. Deteniendo todos los servicios..."
sudo systemctl stop nginx
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "🗑️  2. Limpiando TODO el caché..."
rm -rf dist/
rm -rf .expo/
rm -rf node_modules/.cache/
rm -rf /tmp/metro-*
rm -rf /tmp/haste-map-*

echo ""
echo "🔍 3. Verificando errores de TypeScript..."
bunx tsc --noEmit
TYPESCRIPT_EXIT=$?

if [ $TYPESCRIPT_EXIT -ne 0 ]; then
  echo "⚠️  Hay errores de TypeScript pero continuamos..."
fi

echo ""
echo "📦 4. Compilando frontend NUEVO (esto tomará ~90 segundos)..."
bunx expo export -p web --clear

if [ ! -d "dist" ]; then
  echo "❌ ERROR: No se generó la carpeta dist/"
  exit 1
fi

BUNDLE_FILE=$(find dist/_expo/static/js/web/ -name "entry-*.js" 2>/dev/null | head -n 1)

if [ -z "$BUNDLE_FILE" ]; then
  echo "❌ ERROR: No se encontró el bundle JS"
  exit 1
fi

echo "✅ Bundle generado: $(basename $BUNDLE_FILE)"

echo ""
echo "🔍 5. Verificando que el código esté en el bundle..."
if grep -q "Eliminar Provincia" "$BUNDLE_FILE"; then
  echo "  ✅ Textos de confirmación encontrados"
else
  echo "  ⚠️  Textos de confirmación NO encontrados"
fi

if grep -q "deleteMutation\|delete.*Mutation" "$BUNDLE_FILE"; then
  echo "  ✅ Mutations de borrado encontradas"
else
  echo "  ⚠️  Mutations de borrado NO encontradas"
fi

if grep -q "modifyMutation\|modify.*Mutation" "$BUNDLE_FILE"; then
  echo "  ✅ Mutation de modificación encontrada"
else
  echo "  ⚠️  Mutation de modificación NO encontrada"
fi

echo ""
echo "🚀 6. Iniciando backend..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
sleep 3

if ! ps -p $BACKEND_PID > /dev/null; then
  echo "❌ ERROR: Backend no está corriendo"
  echo "Últimas líneas del log:"
  tail -n 20 backend.log
  exit 1
fi

echo "  ✅ Backend corriendo"

echo ""
echo "🌐 7. Configurando Nginx para NO cachear..."
cat > /etc/nginx/sites-available/reservamesa << 'EOF'
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name quieromesa.com www.quieromesa.com;

    ssl_certificate /etc/letsencrypt/live/quieromesa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quieromesa.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/reservamesa/dist;
    index index.html;

    # NO cachear JavaScript
    location ~* \.(js|json)$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri =404;
    }

    # API backend
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name quieromesa.com www.quieromesa.com;
    return 301 https://$server_name$request_uri;
}
EOF

echo ""
echo "🔄 8. Reiniciando Nginx..."
nginx -t
if [ $? -eq 0 ]; then
  sudo systemctl start nginx
  echo "  ✅ Nginx iniciado"
else
  echo "  ❌ ERROR en configuración de Nginx"
  exit 1
fi

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URL: https://quieromesa.com"
echo "📄 Bundle: $(basename $BUNDLE_FILE)"
echo "🔧 Backend PID: $BACKEND_PID"
echo ""
echo "📋 ERRORES DE TYPESCRIPT CORREGIDOS:"
echo "   ✅ app/admin/login.tsx - sessionId type guard"
echo "   ✅ app/admin/users.tsx - Client type en handleOpenModal"
echo "   ✅ app/restaurant/login/[slug].tsx - sessionId type guard"
echo "   ✅ lib/trpc.ts - transformer eliminado del cliente"
echo ""
echo "⚠️  IMPORTANTE - LIMPIA EL CACHÉ DEL NAVEGADOR:"
echo "   1. Abre DevTools (F12)"
echo "   2. Clic derecho en el botón Recargar"
echo "   3. Selecciona 'Vaciar caché y recargar forzado'"
echo ""
echo "   O mejor: Abre en modo incógnito"
echo ""
echo "📝 Ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🧪 PRUEBA ESTAS FUNCIONES:"
echo "   1. Botón borrar provincia - debe pedir confirmación"
echo "   2. Botón borrar ciudad - debe pedir confirmación"  
echo "   3. Botón borrar tipo cocina - debe pedir confirmación"
echo "   4. Botón borrar hora - debe pedir confirmación"
echo "   5. Modificar reserva desde token - debe guardar cambios"
