#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - Corrigiendo TypeScript y desplegando"
echo "=============================================================="

cd /var/www/reservamesa

echo ""
echo "⏹️  1. Deteniendo todos los servicios..."
pkill -f "bun.*backend/server.ts" || true
sudo systemctl stop nginx || true

echo ""
echo "🗑️  2. Limpiando TODO el caché..."
rm -rf dist/ .expo/ node_modules/.cache/

echo ""
echo "📦 3. Compilando frontend (esto tomará ~90 segundos)..."
bunx expo export -p web --clear

if [ ! -d "dist" ]; then
    echo "❌ Error: No se generó el directorio dist/"
    exit 1
fi

BUNDLE_FILE=$(ls dist/_expo/static/js/web/entry-*.js 2>/dev/null | head -n 1)
if [ -z "$BUNDLE_FILE" ]; then
    echo "❌ Error: No se encontró el bundle"
    exit 1
fi

echo "✅ Bundle generado: $(basename $BUNDLE_FILE)"

echo ""
echo "🚀 4. Iniciando backend..."
nohup bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

sleep 2

if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ Error: El backend no se inició correctamente"
    cat backend.log
    exit 1
fi

echo ""
echo "🌐 5. Configurando Nginx para NO cachear..."
sudo tee /etc/nginx/sites-available/reservamesa > /dev/null <<'NGINX_CONFIG'
server {
    listen 80;
    listen [::]:80;
    server_name quieromesa.com www.quieromesa.com 200.234.236.133;

    root /var/www/reservamesa/dist;
    index index.html;

    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    add_header Pragma "no-cache";
    add_header Expires "0";

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location /_expo/static/js/ {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        expires -1;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_CONFIG

echo ""
echo "🔄 6. Reiniciando Nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl start nginx
    echo "  ✅ Nginx iniciado"
else
    echo "  ❌ Error en configuración de Nginx"
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
echo "⚠️  IMPORTANTE - LIMPIA EL CACHÉ DEL NAVEGADOR:"
echo "   1. Presiona Ctrl+Shift+Delete (Windows/Linux)"
echo "   2. O Cmd+Shift+Delete (Mac)"
echo "   3. Selecciona 'Imágenes y archivos en caché'"
echo "   4. Haz clic en 'Borrar datos'"
echo "   5. Cierra COMPLETAMENTE el navegador"
echo "   6. Abre de nuevo https://quieromesa.com"
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
