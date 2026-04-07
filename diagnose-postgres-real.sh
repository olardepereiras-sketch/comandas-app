#!/bin/bash

echo "🔍 DIAGNÓSTICO REAL DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paso 1: Limpiar procesos
echo "📋 Limpiando procesos..."
pkill -9 postgres 2>/dev/null
pkill -9 psql 2>/dev/null
kill -9 486151 486152 486153 486161 486162 2>/dev/null
sleep 2

# Paso 2: Limpiar archivos de bloqueo
echo "📋 Limpiando archivos de bloqueo..."
rm -f /var/lib/postgresql/14/main/postmaster.pid
rm -f /var/run/postgresql/.s.PGSQL.5432*
rm -f /tmp/.s.PGSQL.5432*

# Paso 3: Verificar permisos
echo "📋 Verificando permisos..."
chown -R postgres:postgres /var/lib/postgresql/14/main
chmod 700 /var/lib/postgresql/14/main
mkdir -p /var/run/postgresql
chown -R postgres:postgres /var/run/postgresql
chmod 775 /var/run/postgresql

# Paso 4: Limpiar journal y log viejo
echo "📋 Limpiando logs viejos para ver error nuevo..."
mv /var/log/postgresql/postgresql-14-main.log /var/log/postgresql/postgresql-14-main.log.OLD 2>/dev/null
touch /var/log/postgresql/postgresql-14-main.log
chown postgres:postgres /var/log/postgresql/postgresql-14-main.log
chmod 640 /var/log/postgresql/postgresql-14-main.log

# Paso 5: Resetear systemd
echo "📋 Reseteando systemd..."
systemctl reset-failed postgresql@14-main 2>/dev/null

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 INTENTANDO INICIAR POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Intentar con systemctl primero
systemctl start postgresql@14-main 2>&1

sleep 3

# Verificar estado
if systemctl is-active --quiet postgresql@14-main; then
    echo "✅ ¡POSTGRESQL ESTÁ CORRIENDO!"
    echo ""
    echo "Probando conexión..."
    sudo -u postgres psql -c "SELECT version();" 2>&1
    echo ""
    echo "✅ TODO FUNCIONA"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ POSTGRESQL NO INICIÓ - ANALIZANDO ERRORES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 1. ERROR DEL JOURNAL DE SYSTEMD (últimas 50 líneas):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
journalctl -u postgresql@14-main -n 50 --no-pager
echo ""

echo "📋 2. ERROR DEL LOG DE POSTGRESQL:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -s /var/log/postgresql/postgresql-14-main.log ]; then
    cat /var/log/postgresql/postgresql-14-main.log
else
    echo "⚠️ Log vacío o no existe. Intentando iniciar manualmente..."
    echo ""
    sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl start \
      -D /var/lib/postgresql/14/main \
      -l /var/log/postgresql/postgresql-14-main.log \
      -o "-c config_file=/etc/postgresql/14/main/postgresql.conf" 2>&1
    
    sleep 2
    
    if [ -s /var/log/postgresql/postgresql-14-main.log ]; then
        echo ""
        echo "ERROR CAPTURADO:"
        cat /var/log/postgresql/postgresql-14-main.log
    fi
fi
echo ""

echo "📋 3. CONFIGURACIÓN DE POSTGRESQL:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Listen addresses:"
grep "^listen_addresses" /etc/postgresql/14/main/postgresql.conf 2>/dev/null || echo "No configurado (usa default)"
echo ""
echo "Puerto:"
grep "^port" /etc/postgresql/14/main/postgresql.conf 2>/dev/null || echo "No configurado (usa 5432)"
echo ""

echo "📋 4. ESPACIO EN DISCO:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
df -h /var/lib/postgresql/
echo ""

echo "📋 5. VERIFICANDO DATA DIRECTORY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ls -la /var/lib/postgresql/14/main/ | head -20
echo ""

echo "📋 6. VERIFICANDO SI HAY CORRUPCIÓN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /var/lib/postgresql/14/main/PG_VERSION ]; then
    echo "✅ PG_VERSION existe: $(cat /var/lib/postgresql/14/main/PG_VERSION)"
else
    echo "❌ PG_VERSION no existe - DATA DIRECTORY CORRUPTO"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ANÁLISIS COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Guarda esta salida completa para analizar el problema."
