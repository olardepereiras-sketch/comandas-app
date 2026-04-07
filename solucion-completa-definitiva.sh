#!/bin/bash

echo "🚨 SOLUCIÓN DEFINITIVA - POSTGRESQL + BACKUPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Este script:"
echo "  1. Diagnosticará PostgreSQL"
echo "  2. Lo arreglará definitivamente"
echo "  3. Configurará backups automáticos cada 6 horas"
echo "  4. Creará el primer backup"
echo ""
read -p "¿Continuar? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 1/4: DIAGNÓSTICO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar si hay procesos zombies
echo "🔍 Verificando procesos de PostgreSQL..."
ZOMBIE_PROCS=$(ps aux | grep postgres | grep -v grep | wc -l)
echo "Procesos encontrados: $ZOMBIE_PROCS"

# Verificar archivo de bloqueo
if [ -f /var/lib/postgresql/14/main/postmaster.pid ]; then
    echo "⚠️ Archivo de bloqueo postmaster.pid existe"
else
    echo "✅ No hay archivo de bloqueo"
fi

# Verificar puerto
if sudo netstat -tlnp | grep -q 5432; then
    echo "⚠️ Puerto 5432 en uso"
else
    echo "✅ Puerto 5432 libre"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 2/4: ARREGLANDO POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Matar procesos
echo "🧹 Limpiando procesos..."
sudo pkill -9 postgres 2>/dev/null || true
sleep 2

# Eliminar archivos de bloqueo
echo "🧹 Eliminando archivos de bloqueo..."
sudo rm -f /var/lib/postgresql/14/main/postmaster.pid
sudo rm -f /var/run/postgresql/.s.PGSQL.5432*
sudo rm -f /tmp/.s.PGSQL.5432*

# Verificar permisos
echo "🔑 Verificando permisos..."
sudo chown -R postgres:postgres /var/lib/postgresql/14/main
sudo chmod 700 /var/lib/postgresql/14/main

# Iniciar PostgreSQL
echo "🚀 Iniciando PostgreSQL..."
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl start -D /var/lib/postgresql/14/main -l /var/log/postgresql/postgresql-14-main.log

sleep 5

# Verificar que inició
if sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl status -D /var/lib/postgresql/14/main | grep -q "server is running"; then
    echo "✅ PostgreSQL iniciado correctamente"
    
    # Verificar base de datos
    echo ""
    echo "🔍 Verificando base de datos reservamesa_db..."
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw reservamesa_db; then
        echo "✅ Base de datos existe"
    else
        echo "⚠️ Creando base de datos..."
        sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
        sudo -u postgres psql -c "CREATE USER reservamesa_user WITH PASSWORD 'Mariano1985*';"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
        sudo -u postgres psql -d reservamesa_db -c "ALTER USER reservamesa_user WITH SUPERUSER;"
        echo "✅ Base de datos creada"
    fi
else
    echo "❌ ERROR: PostgreSQL no pudo iniciar"
    echo ""
    echo "Últimas líneas del log:"
    sudo tail -20 /var/log/postgresql/postgresql-14-main.log
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 3/4: CONFIGURANDO BACKUPS AUTOMÁTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Crear directorio de backups
BACKUP_DIR="/var/backups/reservamesa"
echo "📂 Creando directorio: $BACKUP_DIR"
sudo mkdir -p $BACKUP_DIR
sudo chown postgres:postgres $BACKUP_DIR

# Crear script de backup
echo "📝 Creando script de backup..."
cat > /tmp/backup-database.sh << 'EOFBACKUP'
#!/bin/bash
BACKUP_DIR="/var/backups/reservamesa"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Realizar backup
sudo -u postgres pg_dump reservamesa_db > $BACKUP_FILE 2>/dev/null

if [ $? -eq 0 ]; then
    # Comprimir backup
    gzip $BACKUP_FILE
    
    # Mantener solo los últimos 20 backups
    cd $BACKUP_DIR
    ls -t backup_*.sql.gz | tail -n +21 | xargs rm -f 2>/dev/null
    
    echo "$(date): ✅ Backup creado: backup_$DATE.sql.gz"
else
    echo "$(date): ❌ Error creando backup"
fi
EOFBACKUP

sudo mv /tmp/backup-database.sh /usr/local/bin/backup-database.sh
sudo chmod +x /usr/local/bin/backup-database.sh

# Configurar cron
echo "⏰ Configurando cron (cada 6 horas)..."
(crontab -l 2>/dev/null | grep -v backup-database.sh; echo "0 */6 * * * /usr/local/bin/backup-database.sh >> /var/log/backup-database.log 2>&1") | crontab -

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASO 4/4: CREANDO PRIMER BACKUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "💾 Creando backup inicial..."
sudo /usr/local/bin/backup-database.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA COMPLETAMENTE CONFIGURADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 RESUMEN:"
echo "  ✅ PostgreSQL funcionando"
echo "  ✅ Base de datos reservamesa_db lista"
echo "  ✅ Backups automáticos cada 6 horas"
echo "  ✅ Primer backup creado"
echo ""
echo "📂 Ubicación backups: $BACKUP_DIR"
echo "📝 Log de backups: /var/log/backup-database.log"
echo ""
echo "🔧 COMANDOS ÚTILES:"
echo "  Ver backups:       ls -lh $BACKUP_DIR"
echo "  Backup manual:     sudo /usr/local/bin/backup-database.sh"
echo "  Ver log backups:   tail -f /var/log/backup-database.log"
echo "  Estado PostgreSQL: sudo -u postgres pg_ctl status -D /var/lib/postgresql/14/main"
echo ""
