#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO - ERROR 403"
echo "===================================="

cd /var/www/reservamesa

echo ""
echo "1️⃣ Estado de PostgreSQL:"
if systemctl is-active --quiet postgresql; then
    echo "   ✅ PostgreSQL está CORRIENDO"
    sudo -u postgres psql -c "SELECT version();" 2>&1 | head -2
else
    echo "   ❌ PostgreSQL NO está corriendo"
    echo "   📋 Estado:"
    sudo systemctl status postgresql --no-pager | head -10
fi

echo ""
echo "2️⃣ Estado del Backend:"
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    PID=$(pgrep -f "bun.*backend/server.ts")
    echo "   ✅ Backend corriendo (PID: $PID)"
    
    # Probar endpoint
    echo "   🔌 Probando http://localhost:3000/api/health ..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>&1)
    if [ "$RESPONSE" = "200" ]; then
        echo "   ✅ Backend responde correctamente (HTTP 200)"
    else
        echo "   ⚠️  Backend responde con: HTTP $RESPONSE"
    fi
else
    echo "   ❌ Backend NO está corriendo"
fi

echo ""
echo "3️⃣ Estado de Nginx:"
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx está CORRIENDO"
    
    # Verificar configuración
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo "   ✅ Configuración válida"
    else
        echo "   ❌ Error en configuración:"
        sudo nginx -t 2>&1
    fi
    
    # Ver qué sitios están habilitados
    echo "   📋 Sitios habilitados:"
    ls -l /etc/nginx/sites-enabled/ 2>&1 | grep -v total
else
    echo "   ❌ Nginx NO está corriendo"
fi

echo ""
echo "4️⃣ Frontend Build:"
if [ -d "dist" ]; then
    echo "   ✅ Directorio dist existe"
    if [ -f "dist/index.html" ]; then
        echo "   ✅ index.html presente"
        echo "   📋 Tamaño: $(du -sh dist | cut -f1)"
        echo "   📋 Archivos: $(find dist -type f | wc -l)"
    else
        echo "   ❌ index.html NO encontrado"
    fi
else
    echo "   ❌ Directorio dist NO existe"
fi

echo ""
echo "5️⃣ Permisos:"
echo "   📋 Propietario de /var/www/reservamesa:"
ls -ld /var/www/reservamesa
if [ -d "dist" ]; then
    echo "   📋 Propietario de dist/:"
    ls -ld dist
fi

echo ""
echo "6️⃣ Puertos en uso:"
echo "   📋 Puerto 3000 (Backend):"
if lsof -i :3000 2>/dev/null; then
    echo "   ✅ Puerto 3000 en uso"
else
    echo "   ❌ Puerto 3000 libre"
fi

echo "   📋 Puerto 80/443 (Nginx):"
sudo lsof -i :80 2>/dev/null | head -2
sudo lsof -i :443 2>/dev/null | head -2

echo ""
echo "7️⃣ Últimas líneas del log de backend:"
if [ -f backend.log ]; then
    echo "   📋 Últimas 20 líneas:"
    tail -20 backend.log
else
    echo "   ⚠️  No existe backend.log"
fi

echo ""
echo "8️⃣ Logs de Nginx:"
echo "   📋 Últimos errores:"
if [ -f /var/log/nginx/quieromesa-error.log ]; then
    sudo tail -10 /var/log/nginx/quieromesa-error.log
else
    echo "   ⚠️  No existe log de errores de quieromesa"
fi

echo ""
echo "9️⃣ Archivo .env:"
if [ -f .env ]; then
    echo "   ✅ Archivo .env existe"
    echo "   📋 Variables configuradas:"
    grep "=" .env | grep -v "^#" | cut -d "=" -f1 | head -10
else
    echo "   ❌ Archivo .env NO existe"
fi

echo ""
echo "🔟 Test de conectividad local:"
echo "   📋 Test curl a localhost:"
curl -I http://localhost:3000/api/health 2>&1 | head -5

echo ""
echo "===================================="
echo "DIAGNÓSTICO COMPLETADO"
echo ""
echo "💡 Recomendación:"
echo "   Si hay problemas, ejecuta:"
echo "   bash fix-403-complete.sh"
echo ""
