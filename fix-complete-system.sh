#!/bin/bash

echo "🔧 Solución Completa del Sistema"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 1. Cargar variables de entorno
echo "📋 1. Cargando variables de entorno..."
export $(cat /var/www/reservamesa/.env | grep -v '^#' | xargs)
echo "✅ Variables cargadas"
echo ""

# 2. Detener todo
echo "📋 2. Deteniendo procesos..."
pkill -f "bun.*backend/server.ts"
sudo systemctl stop nginx
echo "✅ Procesos detenidos"
echo ""

# 3. Limpiar completamente el frontend
echo "📋 3. Limpiando frontend..."
cd /var/www/reservamesa
rm -rf dist .expo node_modules/.cache
echo "✅ Frontend limpiado"
echo ""

# 4. Compilar frontend
echo "📋 4. Compilando frontend..."
bunx expo export -p web --clear
if [ $? -eq 0 ]; then
    echo "✅ Frontend compilado"
else
    echo "❌ Error compilando frontend"
    exit 1
fi
echo ""

# 5. Configurar nginx para evitar caché
echo "📋 5. Configurando nginx..."
sudo tee /etc/nginx/sites-available/reservamesa > /dev/null <<'NGINX_CONFIG'
server {
    listen 80;
    server_name 200.234.236.133;
    
    # Root para el frontend
    root /var/www/reservamesa/dist;
    index index.html;

    # Desactivar caché para desarrollo
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    add_header Pragma "no-cache";
    add_header Expires "0";
    
    # API Backend (tRPC)
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Sin caché para API
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }

    # Frontend - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        
        # Sin caché para HTML
        if ($uri ~* "\.html$") {
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }
}
NGINX_CONFIG

sudo ln -sf /etc/nginx/sites-available/reservamesa /etc/nginx/sites-enabled/reservamesa
echo "✅ Nginx configurado"
echo ""

# 6. Probar configuración de nginx
echo "📋 6. Probando configuración de nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Configuración correcta"
else
    echo "❌ Error en configuración de nginx"
    exit 1
fi
echo ""

# 7. Iniciar nginx
echo "📋 7. Iniciando nginx..."
sudo systemctl start nginx
sleep 2
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx iniciado"
else
    echo "❌ Error iniciando nginx"
    sudo systemctl status nginx
    exit 1
fi
echo ""

# 8. Iniciar backend con logs completos
echo "📋 8. Iniciando backend..."
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"
sleep 3
echo ""

# 9. Verificar que el backend esté corriendo
echo "📋 9. Verificando backend..."
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend corriendo"
else
    echo "❌ Backend falló al iniciar"
    echo "Últimas líneas del log:"
    tail -20 backend.log
    exit 1
fi
echo ""

# 10. Verificar health check
echo "📋 10. Verificando health check..."
sleep 2
HEALTH=$(curl -s http://localhost:3000/api/health)
if [ $? -eq 0 ]; then
    echo "✅ Health check OK"
    echo "$HEALTH" | head -c 200
else
    echo "❌ Health check falló"
fi
echo ""
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "✅ Sistema completamente reiniciado"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://200.234.236.133"
echo "   Admin: http://200.234.236.133/admin"
echo "   Usuarios: http://200.234.236.133/admin/users"
echo "   API: http://200.234.236.133/api"
echo ""
echo "🔍 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log | grep -E '(DELETE|CANCEL|🔵|✅|❌)'"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Abre el navegador en modo incógnito o limpia la caché"
echo "   2. Ve a http://200.234.236.133/admin/users"
echo "   3. Intenta eliminar un usuario"
echo "   4. Deberías ver logs '🔵 [DELETE CLIENT] INICIO' en el backend"
echo ""
