#!/bin/bash

echo "💾 CONFIGURANDO SISTEMA DE BACKUPS AUTOMÁTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Crear directorio de backups
BACKUP_DIR="/var/www/reservamesa/backups"
echo "📋 Paso 1: Creando directorio de backups..."
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/hourly"
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"

echo -e "${GREEN}✅ Directorios creados${NC}"

# Crear script de backup
echo ""
echo "📋 Paso 2: Creando script de backup..."
cat > /var/www/reservamesa/backup-database.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/www/reservamesa/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="reservamesa_db"
DB_USER="reservamesa_user"

# Función para hacer backup
do_backup() {
    local TYPE=$1
    local BACKUP_FILE="$BACKUP_DIR/$TYPE/backup_${TIMESTAMP}.sql.gz"
    
    echo "[$(date)] 💾 Iniciando backup $TYPE..."
    
    # Hacer backup
    PGPASSWORD='MiContrasenaSegura666' pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "[$(date)] ✅ Backup $TYPE completado: $BACKUP_FILE ($SIZE)"
        
        # Limpiar backups antiguos según tipo
        case $TYPE in
            hourly)
                # Mantener últimas 24 horas
                find "$BACKUP_DIR/hourly" -name "backup_*.sql.gz" -mtime +1 -delete
                ;;
            daily)
                # Mantener últimos 7 días
                find "$BACKUP_DIR/daily" -name "backup_*.sql.gz" -mtime +7 -delete
                ;;
            weekly)
                # Mantener últimas 4 semanas
                find "$BACKUP_DIR/weekly" -name "backup_*.sql.gz" -mtime +28 -delete
                ;;
        esac
        
        return 0
    else
        echo "[$(date)] ❌ Error en backup $TYPE"
        return 1
    fi
}

# Determinar tipo de backup según parámetro
BACKUP_TYPE=${1:-hourly}
do_backup $BACKUP_TYPE
EOF

chmod +x /var/www/reservamesa/backup-database.sh
echo -e "${GREEN}✅ Script de backup creado${NC}"

# Crear archivo .pgpass para autenticación automática
echo ""
echo "📋 Paso 3: Configurando autenticación automática..."
cat > ~/.pgpass << EOF
localhost:5432:reservamesa_db:reservamesa_user:MiContrasenaSegura666
EOF
chmod 600 ~/.pgpass
echo -e "${GREEN}✅ Archivo .pgpass creado${NC}"

# Configurar cron jobs
echo ""
echo "📋 Paso 4: Configurando tareas programadas (cron)..."

# Eliminar cron jobs existentes de backups
crontab -l 2>/dev/null | grep -v "backup-database.sh" | crontab -

# Añadir nuevos cron jobs
(crontab -l 2>/dev/null; echo "# Backup cada hora") | crontab -
(crontab -l 2>/dev/null; echo "0 * * * * /var/www/reservamesa/backup-database.sh hourly >> /var/www/reservamesa/backups/backup.log 2>&1") | crontab -

(crontab -l 2>/dev/null; echo "# Backup diario a las 3 AM") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * * /var/www/reservamesa/backup-database.sh daily >> /var/www/reservamesa/backups/backup.log 2>&1") | crontab -

(crontab -l 2>/dev/null; echo "# Backup semanal los domingos a las 4 AM") | crontab -
(crontab -l 2>/dev/null; echo "0 4 * * 0 /var/www/reservamesa/backup-database.sh weekly >> /var/www/reservamesa/backups/backup.log 2>&1") | crontab -

echo -e "${GREEN}✅ Tareas programadas configuradas${NC}"

# Hacer un backup inicial
echo ""
echo "📋 Paso 5: Creando backup inicial..."
/var/www/reservamesa/backup-database.sh hourly

# Mostrar cron jobs actuales
echo ""
echo "📋 Tareas programadas actuales:"
crontab -l | grep backup-database

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ SISTEMA DE BACKUPS CONFIGURADO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resumen:"
echo "  • Backups cada hora: Mantiene últimas 24 horas"
echo "  • Backups diarios: Mantiene últimos 7 días"
echo "  • Backups semanales: Mantiene últimas 4 semanas"
echo "  • Ubicación: $BACKUP_DIR"
echo "  • Log: $BACKUP_DIR/backup.log"
echo ""
echo "📝 Para ver backups disponibles:"
echo "  ls -lh $BACKUP_DIR/hourly/"
echo "  ls -lh $BACKUP_DIR/daily/"
echo "  ls -lh $BACKUP_DIR/weekly/"
