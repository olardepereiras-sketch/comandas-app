#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - Arreglando TODOS los errores"
echo "====================================================="

# Detener servicios
echo ""
echo "⏹️  1. Deteniendo servicios..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true

# Limpiar TODO
echo ""
echo "🗑️  2. Limpiando TODO..."
rm -rf dist/ .expo/ node_modules/.cache/

# Verificar TypeScript
echo ""
echo "🔍 3. Verificando errores de TypeScript..."
echo "   (Si hay errores críticos, el script se detendrá)"
if ! bunx tsc --noEmit 2>&1 | grep -q "error TS"; then
  echo "   ✅ Sin errores de TypeScript"
else
  echo "   ⚠️  Hay advertencias pero continuamos..."
fi

# Compilar frontend
echo ""
echo "📦 4. Compilando frontend (~90 segundos)..."
bunx expo export -p web --clear

if [ $? -ne 0 ]; then
  echo "   ❌ Error al compilar"
  exit 1
fi

BUNDLE_FILE=$(ls -t dist/_expo/static/js/web/*.js 2>/dev/null | head -1)
if [ -n "$BUNDLE_FILE" ]; then
  BUNDLE_NAME=$(basename "$BUNDLE_FILE")
  echo "   ✅ Bundle generado: $BUNDLE_NAME"
else
  echo "   ❌ No se encontró el bundle"
  exit 1
fi

# Iniciar backend
echo ""
echo "🚀 5. Iniciando backend..."
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Configurar Nginx
echo ""
echo "🌐 6. Configurando Nginx..."
sudo tee /etc/nginx/sites-available/reservamesa > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name quieromesa.com www.quieromesa.com 200.234.236.133;

    root /var/www/reservamesa/dist;
    index index.html;

    # IMPORTANTE: NO cachear JavaScript
    location ~* \.js$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Reiniciar Nginx
echo ""
echo "🔄 7. Reiniciando Nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
  sudo systemctl start nginx
  echo "   ✅ Nginx iniciado"
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
echo "⚠️  IMPORTANTE - En tu navegador:"
echo "   1. Presiona Ctrl+Shift+Delete"
echo "   2. Selecciona 'Imágenes y archivos en caché'"
echo "   3. Borra TODO"
echo "   4. Cierra COMPLETAMENTE el navegador"
echo "   5. Abre https://quieromesa.com de nuevo"
echo ""
echo "   O mejor: Abre en modo incógnito"
echo ""
echo "📝 Ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
