#!/bin/bash

echo "🚀 Iniciando servicios completos del sistema..."
echo "========================================================"

cd /var/www/reservamesa

echo ""
echo "📋 1. Cargando variables de entorno..."
echo "------------------------------------------------------------"
export $(cat .env | grep -v '^#' | xargs)
echo "✅ Variables cargadas"

echo ""
echo "📋 2. Deteniendo procesos anteriores..."
echo "------------------------------------------------------------"
pm2 delete reservamesa 2>/dev/null || echo "   No había proceso PM2 previo"
pkill -f "bun.*backend/server.ts" 2>/dev/null || echo "   No había proceso bun previo"
echo "✅ Procesos anteriores detenidos"

echo ""
echo "📋 3. Verificando base de datos..."
echo "------------------------------------------------------------"
bun run backend/db/verify-and-fix-schema.ts
echo "✅ Base de datos verificada"

echo ""
echo "📋 4. Iniciando servidor con PM2..."
echo "------------------------------------------------------------"
pm2 start bun --name reservamesa -- run backend/server.ts
echo "✅ Servidor iniciado con PM2"

echo ""
echo "📋 5. Verificando estado del servidor..."
echo "------------------------------------------------------------"
sleep 3
pm2 status reservamesa
echo ""
pm2 logs reservamesa --lines 20 --nostream
echo "✅ Estado verificado"

echo ""
echo "📋 6. Iniciando/reiniciando nginx..."
echo "------------------------------------------------------------"
sudo systemctl start nginx 2>/dev/null && echo "   Nginx iniciado" || echo "   Nginx ya estaba corriendo"
sudo systemctl enable nginx 2>/dev/null && echo "   Nginx habilitado en arranque" || true
sudo systemctl reload nginx 2>/dev/null && echo "   Nginx recargado" || true
sudo systemctl status nginx --no-pager | head -10
echo "✅ Nginx activo"

echo ""
echo "========================================================"
echo "✅ SERVICIOS INICIADOS CORRECTAMENTE"
echo "========================================================"
echo ""
echo "🔍 Para verificar logs en tiempo real:"
echo "   pm2 logs reservamesa"
echo ""
echo "🔍 Para verificar estado:"
echo "   pm2 status"
echo "   sudo systemctl status nginx"
echo ""
echo "🧪 Prueba ahora:"
echo "   1. Borrar un usuario: http://200.234.236.133/admin/users"
echo "   2. Cancelar reserva (restaurante): http://200.234.236.133/restaurant/reservations-pro"
echo "   3. Cancelar reserva (cliente): http://200.234.236.133/client/reservation/[token]"
echo ""
echo "📝 Si siguen los problemas, revisa:"
echo "   pm2 logs reservamesa --err"
echo "   sudo tail -f /var/log/nginx/error.log"
echo ""
