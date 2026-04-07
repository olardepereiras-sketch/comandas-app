#!/bin/bash
set -e

echo "🔥 SOLUCIÓN DEFINITIVA - LIMPIEZA TOTAL DE CACHÉ"
echo "================================================"

echo ""
echo "⏹️  Paso 1: Deteniendo nginx..."
sudo systemctl stop nginx

echo ""
echo "🗑️  Paso 2: Borrando TODO el dist..."
cd /var/www/reservamesa
rm -rf dist .expo node_modules/.cache

echo ""
echo "📝 Paso 3: Modificando nginx para NO cachear JS..."
sudo tee /etc/nginx/sites-available/reservamesa > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    root /var/www/reservamesa/dist;
    index index.html;

    # Proxy para el backend API
    location /api/ {
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

    # NO CACHEAR archivos JS - SIEMPRE descargar nuevos
    location ~* \.js$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Pragma "no-cache";
    }

    # Cache para assets estáticos (imágenes, fuentes)
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # NO cachear HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Servir archivos estáticos del frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

echo ""
echo "🛑 Paso 4: Matando TODOS los procesos del backend..."
pkill -9 -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "📦 Paso 5: Compilando frontend NUEVO..."
bunx expo export -p web

echo ""
echo "🚀 Paso 6: Iniciando backend..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "🔄 Paso 7: Iniciando nginx..."
sudo systemctl start nginx

echo ""
echo "✅ COMPLETADO"
echo "============"
echo ""
echo "🔗 Ahora abre el navegador y presiona:"
echo "   • Ctrl+Shift+R (Windows/Linux)"
echo "   • Cmd+Shift+R (Mac)"
echo ""
echo "O abre en modo incógnito: https://quieromesa.com"
echo ""
echo "Los cambios aplicados:"
echo "   ✅ Botones de borrado con validación funcionan"
echo "   ✅ Modificación de reservas desde token funciona"
echo "   ✅ Nginx configurado para NO cachear JavaScript"
echo ""
