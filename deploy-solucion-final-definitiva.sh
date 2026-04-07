#!/bin/bash

echo "🚀 SOLUCIÓN DEFINITIVA - DEPLOY COMPLETO"
echo "=========================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Debes ejecutar este script desde /var/www/reservamesa"
    exit 1
fi

echo ""
echo "📋 Paso 1/7: Limpiando caché y builds antiguos..."
rm -rf dist/ .expo/ node_modules/.cache/
echo "✅ Caché limpiado"

echo ""
echo "📦 Paso 2/7: Compilando frontend con nuevo hash..."
EXPO_NO_CACHE=1 npx expo export --platform web --output-dir dist

if [ $? -ne 0 ]; then
    echo "❌ Error al compilar el frontend"
    exit 1
fi
echo "✅ Frontend compilado"

echo ""
echo "🔧 Paso 3/7: Configurando Nginx para evitar caché..."
cat > /etc/nginx/sites-available/reservamesa << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name quieromesa.com www.quieromesa.com 200.234.236.133;

    root /var/www/reservamesa/dist;
    index index.html;

    # Deshabilitar completamente el caché
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    add_header Pragma "no-cache";
    add_header Expires "0";
    
    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Sin caché para API
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Archivos estáticos sin caché (temporal para debugging)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
NGINX_EOF

echo "✅ Configuración de Nginx actualizada"

echo ""
echo "🔄 Paso 4/7: Reiniciando Nginx..."
nginx -t && systemctl restart nginx
if [ $? -ne 0 ]; then
    echo "❌ Error al reiniciar Nginx"
    exit 1
fi
echo "✅ Nginx reiniciado"

echo ""
echo "🛑 Paso 5/7: Deteniendo backend antiguo..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo "✅ Backend detenido"

echo ""
echo "🚀 Paso 6/7: Iniciando backend con logs..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend iniciado con PID: $BACKEND_PID"

# Esperar a que el backend esté listo
echo ""
echo "⏳ Paso 7/7: Esperando a que el backend esté listo..."
sleep 3

# Verificar que el backend está funcionando
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend funcionando correctamente"
else
    echo "❌ Error: El backend no está funcionando"
    tail -20 backend.log
    exit 1
fi

echo ""
echo "============================================"
echo "✅ DEPLOYMENT COMPLETADO EXITOSAMENTE"
echo "============================================"
echo ""
echo "📊 Estado del sistema:"
ps aux | grep -E "bun.*backend/server.ts" | grep -v grep
echo ""
echo "🔗 URLs:"
echo "   - Frontend: http://200.234.236.133"
echo "   - Frontend: https://quieromesa.com"
echo "   - API: http://200.234.236.133/api"
echo ""
echo "🧪 IMPORTANTE: PRUEBAS OBLIGATORIAS"
echo "=================================="
echo ""
echo "1. FORZAR RECARGA SIN CACHÉ EN EL NAVEGADOR:"
echo "   - Chrome/Edge: Ctrl + Shift + R (Windows) o Cmd + Shift + R (Mac)"
echo "   - Firefox: Ctrl + F5 (Windows) o Cmd + Shift + R (Mac)"
echo ""
echo "2. O MEJOR AÚN: Abrir en ventana privada/incógnito"
echo ""
echo "3. Probar en orden:"
echo "   ✓ Modificar reserva desde token cliente"
echo "   ✓ Borrar tipo de cocina (debe pedir confirmación)"
echo "   ✓ Borrar provincia (debe validar poblaciones)"
echo "   ✓ Borrar población (debe validar restaurantes)"
echo "   ✓ Borrar hora (debe pedir confirmación)"
echo ""
echo "📝 Ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "⚠️  Si aún no funciona después de Ctrl+Shift+R:"
echo "   1. Limpia completamente el caché del navegador"
echo "   2. Cierra todas las pestañas del sitio"
echo "   3. Abre en modo incógnito"
echo ""
