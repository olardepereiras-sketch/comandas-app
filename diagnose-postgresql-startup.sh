#!/bin/bash

echo "🔍 DIAGNÓSTICO REAL DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 1. Verificando logs del servicio systemd..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo journalctl -xeu postgresql@14-main.service --no-pager -n 50
echo ""

echo "📋 2. Verificando logs de PostgreSQL..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo tail -100 /var/log/postgresql/postgresql-14-main.log
echo ""

echo "📋 3. Verificando postmaster.pid..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /var/lib/postgresql/14/main/postmaster.pid ]; then
    echo "⚠️ postmaster.pid existe (puede estar bloqueando el inicio)"
    cat /var/lib/postgresql/14/main/postmaster.pid
else
    echo "✅ postmaster.pid no existe"
fi
echo ""

echo "📋 4. Verificando procesos postgres..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ps aux | grep postgres
echo ""

echo "📋 5. Verificando archivos de configuración..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "pg_hba.conf:"
sudo cat /etc/postgresql/14/main/pg_hba.conf | grep -v "^#" | grep -v "^$"
echo ""
echo "postgresql.conf (listen_addresses):"
sudo cat /etc/postgresql/14/main/postgresql.conf | grep "listen_addresses"
echo ""

echo "📋 6. Verificando permisos del directorio de datos..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ls -la /var/lib/postgresql/14/main/ | head -20
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DIAGNÓSTICO COMPLETO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
