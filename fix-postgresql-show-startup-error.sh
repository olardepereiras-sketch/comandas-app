#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO - CAPTURANDO ERROR REAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Matando TODOS los procesos postgres zombies..."
pkill -9 postgres 2>/dev/null
pkill -9 psql 2>/dev/null
killall -9 postgres 2>/dev/null
killall -9 psql 2>/dev/null

# Matar específicamente los procesos zombies conocidos
kill -9 486151 486152 486153 486161 486162 2>/dev/null

sleep 2

echo "✅ Procesos eliminados"

echo ""
echo "📋 Paso 2: Limpiando archivos de bloqueo..."
rm -f /var/lib/postgresql/14/main/postmaster.pid
rm -f /var/run/postgresql/.s.PGSQL.5432*
rm -f /tmp/.s.PGSQL.5432*

echo "✅ Archivos de bloqueo eliminados"

echo ""
echo "📋 Paso 3: Moviendo log viejo para ver errores nuevos..."
sudo mv /var/log/postgresql/postgresql-14-main.log /var/log/postgresql/postgresql-14-main.log.old-$(date +%s) 2>/dev/null
sudo -u postgres touch /var/log/postgresql/postgresql-14-main.log
sudo chown postgres:postgres /var/log/postgresql/postgresql-14-main.log
sudo chmod 640 /var/log/postgresql/postgresql-14-main.log

echo "✅ Log limpiado"

echo ""
echo "📋 Paso 4: Verificando permisos..."
sudo chown -R postgres:postgres /var/lib/postgresql/14/main
sudo chmod 700 /var/lib/postgresql/14/main
sudo chown -R postgres:postgres /var/run/postgresql
sudo chmod 775 /var/run/postgresql

echo "✅ Permisos verificados"

echo ""
echo "📋 Paso 5: Intentando iniciar PostgreSQL y capturando error..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Intentar iniciar y capturar salida
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl start \
  -D /var/lib/postgresql/14/main \
  -l /var/log/postgresql/postgresql-14-main.log \
  -o "-c config_file=/etc/postgresql/14/main/postgresql.conf" 2>&1

sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Paso 6: Verificando si está corriendo..."
if sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl status -D /var/lib/postgresql/14/main | grep -q "server is running"; then
    echo "✅ ¡PostgreSQL ESTÁ CORRIENDO!"
    
    echo ""
    echo "Probando conexión..."
    if sudo -u postgres psql -c "SELECT version();" 2>/dev/null; then
        echo "✅ ¡CONEXIÓN EXITOSA!"
    else
        echo "⚠️ Está corriendo pero no se puede conectar. Verificando pg_hba.conf..."
        cat /etc/postgresql/14/main/pg_hba.conf | grep -v "^#" | grep -v "^$"
    fi
else
    echo "❌ PostgreSQL NO está corriendo"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 ERROR REAL DEL LOG (últimas 30 líneas):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -30 /var/log/postgresql/postgresql-14-main.log
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Verificando configuración de PostgreSQL:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo "Configuración de escucha:"
    grep "^listen_addresses" /etc/postgresql/14/main/postgresql.conf 2>/dev/null || echo "listen_addresses no configurado (usa default)"
    
    echo ""
    echo "Configuración de puerto:"
    grep "^port" /etc/postgresql/14/main/postgresql.conf 2>/dev/null || echo "port no configurado (usa default 5432)"
    
    echo ""
    echo "Verificando espacio en disco:"
    df -h /var/lib/postgresql/
    
    echo ""
    echo "Verificando memoria disponible:"
    free -h
fi
