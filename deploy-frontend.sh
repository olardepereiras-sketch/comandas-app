#!/bin/bash

echo "=== DEPLOY FRONTEND ==="

# 1. Asegurarse de estar en el directorio correcto
cd /var/www/reservamesa || exit 1
echo "✓ En directorio: $(pwd)"

# 2. Limpiar cache de Expo
echo "Limpiando cache..."
rm -rf .expo
echo "✓ Cache limpiado"

# 3. Construir frontend
echo "Construyendo frontend..."
bunx expo export -p web

# 4. Verificar que se creó dist
if [ ! -d "dist" ]; then
    echo "❌ ERROR: No se generó la carpeta dist"
    exit 1
fi

echo "✓ Frontend construido"

# 5. Verificar que index.html existe
if [ ! -f "dist/index.html" ]; then
    echo "❌ ERROR: No se generó index.html"
    exit 1
fi

echo "✓ index.html encontrado"

# 6. Dar permisos correctos
echo "Configurando permisos..."
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist
echo "✓ Permisos configurados"

# 7. Recargar nginx
echo "Recargando nginx..."
sudo systemctl reload nginx
echo "✓ Nginx recargado"

# 8. Verificar que funciona
echo ""
echo "=== VERIFICACIÓN ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Frontend funcionando correctamente (HTTP $HTTP_CODE)"
else
    echo "⚠️  HTTP Code: $HTTP_CODE"
    echo "Ver logs: sudo tail -n 20 /var/log/nginx/error.log"
fi

# 9. Verificar backend
echo ""
BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/trpc/example.hi)
if [ "$BACKEND_CODE" = "200" ]; then
    echo "✅ Backend funcionando correctamente (HTTP $BACKEND_CODE)"
else
    echo "⚠️  Backend HTTP Code: $BACKEND_CODE"
fi

echo ""
echo "=== DEPLOY COMPLETADO ==="
echo "URL: http://200.234.236.133"
