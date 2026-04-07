#!/bin/bash

echo "📦 CONFIGURANDO SISTEMA DE BACKUPS AUTOMÁTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar que PostgreSQL esté corriendo
if ! sudo -u postgres psql -c '\l' > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL no está corriendo. Ejecuta primero: ./fix-postgresql-definitivo-real.sh${NC}"
    exit 1
fi

echo "📋 Paso 1: Creando directorios para backups..."
mkdir -p /var/backups/reservamesa
mkdir -p /var/www/reservamesa/backup-scripts
echo -e "${GREEN}✅ Directorios creados${NC}"
echo ""

echo "📋 Paso 2: Creando script de backup..."
cat > /var/www/reservamesa/backup-scripts/backup-db.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/reservamesa"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/reservamesa_db_$DATE.sql"
LOG_FILE="/var/log/reservamesa-backups.log"

echo "$(date): Iniciando backup..." >> $LOG_FILE

PGPASSWORD=MiContrasenaSegura666 pg_dump -U reservamesa_user -h localhost reservamesa_db > $BACKUP_FILE 2>> $LOG_FILE

if [ $? -eq 0 ]; then
    gzip $BACKUP_FILE
    echo "$(date): Backup exitoso: ${BACKUP_FILE}.gz" >> $LOG_FILE
    
    # Mantener solo los últimos 20 backups
    ls -t $BACKUP_DIR/reservamesa_db_*.sql.gz | tail -n +21 | xargs -r rm
    echo "$(date): Backups antiguos limpiados" >> $LOG_FILE
else
    echo "$(date): ERROR en backup" >> $LOG_FILE
fi
EOF

chmod +x /var/www/reservamesa/backup-scripts/backup-db.sh
echo -e "${GREEN}✅ Script de backup creado${NC}"
echo ""

echo "📋 Paso 3: Creando script de restauración..."
cat > /var/www/reservamesa/backup-scripts/restore-db.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/reservamesa"

echo "📦 Backups disponibles:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ls -lh $BACKUP_DIR/reservamesa_db_*.sql.gz | awk '{print $9, $5, $6, $7, $8}'
echo ""

read -p "Ingresa el nombre completo del archivo a restaurar: " BACKUP_FILE

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Archivo no encontrado"
    exit 1
fi

echo "⚠️ ADVERTENCIA: Esto sobrescribirá todos los datos actuales"
read -p "¿Estás seguro? (escribe 'SI' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo "❌ Restauración cancelada"
    exit 1
fi

echo "🔄 Restaurando backup..."

# Descomprimir
gunzip -c $BACKUP_FILE > /tmp/restore_temp.sql

# Detener servidor
pm2 stop reservamesa

# Limpiar base de datos
sudo -u postgres psql -c "DROP DATABASE IF EXISTS reservamesa_db;"
sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"

# Restaurar
PGPASSWORD=MiContrasenaSegura666 psql -U reservamesa_user -h localhost -d reservamesa_db < /tmp/restore_temp.sql

# Limpiar
rm /tmp/restore_temp.sql

# Reiniciar servidor
pm2 start reservamesa

echo "✅ Restauración completada"
EOF

chmod +x /var/www/reservamesa/backup-scripts/restore-db.sh
echo -e "${GREEN}✅ Script de restauración creado${NC}"
echo ""

echo "📋 Paso 4: Configurando cron para backups cada 6 horas..."
(crontab -l 2>/dev/null | grep -v "backup-db.sh"; echo "0 */6 * * * /var/www/reservamesa/backup-scripts/backup-db.sh") | crontab -
echo -e "${GREEN}✅ Cron job configurado${NC}"
echo ""

echo "📋 Paso 5: Creando primer backup..."
/var/www/reservamesa/backup-scripts/backup-db.sh
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Primer backup creado exitosamente${NC}"
else
    echo -e "${RED}❌ Error creando primer backup${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ SISTEMA DE BACKUPS CONFIGURADO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Backups automáticos cada 6 horas"
echo "📂 Ubicación: /var/backups/reservamesa"
echo "📝 Log: /var/log/reservamesa-backups.log"
echo ""
echo "COMANDOS ÚTILES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "• Crear backup manual:"
echo "  /var/www/reservamesa/backup-scripts/backup-db.sh"
echo ""
echo "• Restaurar backup:"
echo "  /var/www/reservamesa/backup-scripts/restore-db.sh"
echo ""
echo "• Ver backups disponibles:"
echo "  ls -lh /var/backups/reservamesa"
echo ""
echo "• Ver log de backups:"
echo "  tail -f /var/log/reservamesa-backups.log"
echo ""
