#!/bin/bash

echo "💾 CONFIGURANDO SISTEMA DE BACKUPS AUTOMÁTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Crear directorio de backups
BACKUP_DIR="/var/backups/reservamesa"
echo ""
echo "📋 Paso 1: Creando directorio de backups..."
sudo mkdir -p $BACKUP_DIR
sudo chown postgres:postgres $BACKUP_DIR

# Crear script de backup
echo ""
echo "📋 Paso 2: Creando script de backup..."
cat > /tmp/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/reservamesa"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Realizar backup
sudo -u postgres pg_dump reservamesa_db > $BACKUP_FILE

# Comprimir backup
gzip $BACKUP_FILE

# Mantener solo los últimos 20 backups
cd $BACKUP_DIR
ls -t backup_*.sql.gz | tail -n +21 | xargs rm -f 2>/dev/null

echo "✅ Backup creado: backup_$DATE.sql.gz"
EOF

sudo mv /tmp/backup-database.sh /usr/local/bin/backup-database.sh
sudo chmod +x /usr/local/bin/backup-database.sh

# Configurar cron para backups cada 6 horas
echo ""
echo "📋 Paso 3: Configurando cron (backups cada 6 horas)..."
(crontab -l 2>/dev/null | grep -v backup-database.sh; echo "0 */6 * * * /usr/local/bin/backup-database.sh >> /var/log/backup-database.log 2>&1") | crontab -

# Crear primer backup
echo ""
echo "📋 Paso 4: Creando primer backup..."
sudo -u postgres pg_dump reservamesa_db > $BACKUP_DIR/backup_initial_$(date +%Y%m%d_%H%M%S).sql
gzip $BACKUP_DIR/backup_initial_*.sql

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA DE BACKUPS CONFIGURADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📂 Backups se guardan en: $BACKUP_DIR"
echo "⏰ Se crean automáticamente cada 6 horas"
echo "📦 Se mantienen los últimos 20 backups"
echo ""
echo "Ver backups: ls -lh $BACKUP_DIR"
