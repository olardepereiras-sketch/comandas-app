#!/bin/bash

echo "🔍 DIAGNÓSTICO PROFUNDO DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 1. Verificando servicio PostgreSQL..."
sudo systemctl status postgresql@14-main.service --no-pager -l

echo ""
echo "📋 2. Verificando logs detallados (últimas 50 líneas)..."
sudo tail -n 50 /var/log/postgresql/postgresql-14-main.log

echo ""
echo "📋 3. Verificando archivo postmaster.pid..."
if [ -f /var/lib/postgresql/14/main/postmaster.pid ]; then
    echo "⚠️ Archivo postmaster.pid existe (puede ser el problema)"
    sudo cat /var/lib/postgresql/14/main/postmaster.pid
else
    echo "✅ No hay archivo postmaster.pid residual"
fi

echo ""
echo "📋 4. Verificando permisos de directorio de datos..."
sudo ls -la /var/lib/postgresql/14/main/ | head -20

echo ""
echo "📋 5. Verificando puerto 5432..."
sudo netstat -tlnp | grep 5432 || echo "✅ Puerto libre"

echo ""
echo "📋 6. Verificando procesos de postgres..."
ps aux | grep postgres | grep -v grep || echo "✅ No hay procesos"

echo ""
echo "📋 7. Intentando iniciar con pg_ctl directamente..."
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl status -D /var/lib/postgresql/14/main

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 DIAGNÓSTICO COMPLETADO"
