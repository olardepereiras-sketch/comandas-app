#!/bin/bash

echo "💾 CONFIGURANDO SISTEMA DE BACKUPS AUTOMÁTICOS (FIABLE)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="/var/www/reservamesa/backups"
DB_NAME="reservamesa_db"
DB_USER="reservamesa_user"
DB_PASSWORD="MiContrasenaSegura666"

echo "📋 Paso 1: Creando directorios de backups..."
mkdir -p "$BACKUP_DIR/hourly"
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/manual"
echo -e "${GREEN}✅ Directorios creados${NC}"

echo ""
echo "📋 Paso 2: Creando archivo .pgpass para autenticación automática..."
echo "localhost:5432:${DB_NAME}:${DB_USER}:${DB_PASSWORD}" > ~/.pgpass
chmod 600 ~/.pgpass
echo -e "${GREEN}✅ .pgpass configurado${NC}"

echo ""
echo "📋 Paso 3: Creando script de backup..."
cat > /var/www/reservamesa/backup-database.sh << 'EOFBACKUP'
#!/bin/bash

BACKUP_DIR="/var/www/reservamesa/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="reservamesa_db"
DB_USER="reservamesa_user"
DB_PASSWORD="MiContrasenaSegura666"
BACKUP_TYPE=${1:-hourly}
BACKUP_FILE="$BACKUP_DIR/$BACKUP_TYPE/backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR/$BACKUP_TYPE"

echo "[$(date)] 💾 Iniciando backup $BACKUP_TYPE..."

PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost --no-owner --no-acl $DB_NAME 2>/dev/null | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    SIZE_BYTES=$(stat -c %s "$BACKUP_FILE" 2>/dev/null || stat -f %z "$BACKUP_FILE" 2>/dev/null)
    
    if [ "$SIZE_BYTES" -lt 500 ]; then
        echo "[$(date)] ❌ Backup $BACKUP_TYPE demasiado pequeño ($SIZE) - posiblemente vacío"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
    
    echo "[$(date)] ✅ Backup $BACKUP_TYPE completado: $BACKUP_FILE ($SIZE)"
    
    case $BACKUP_TYPE in
        hourly)
            find "$BACKUP_DIR/hourly" -name "backup_*.sql.gz" -mtime +1 -delete 2>/dev/null
            ;;
        daily)
            find "$BACKUP_DIR/daily" -name "backup_*.sql.gz" -mtime +7 -delete 2>/dev/null
            ;;
        weekly)
            find "$BACKUP_DIR/weekly" -name "backup_*.sql.gz" -mtime +30 -delete 2>/dev/null
            ;;
    esac
    
    exit 0
else
    echo "[$(date)] ❌ Error en backup $BACKUP_TYPE"
    rm -f "$BACKUP_FILE" 2>/dev/null
    exit 1
fi
EOFBACKUP

chmod +x /var/www/reservamesa/backup-database.sh
echo -e "${GREEN}✅ Script de backup creado${NC}"

echo ""
echo "📋 Paso 4: Configurando cron jobs..."

TEMP_CRON=$(mktemp)
crontab -l 2>/dev/null | grep -v "backup-database.sh" | grep -v "backup-reservamesa" > "$TEMP_CRON"

echo "# === BACKUPS RESERVAMESA ===" >> "$TEMP_CRON"
echo "# Backup cada hora" >> "$TEMP_CRON"
echo "0 * * * * /var/www/reservamesa/backup-database.sh hourly >> /var/www/reservamesa/backups/backup.log 2>&1" >> "$TEMP_CRON"
echo "# Backup diario a las 4 AM" >> "$TEMP_CRON"
echo "0 4 * * * /var/www/reservamesa/backup-database.sh daily >> /var/www/reservamesa/backups/backup.log 2>&1" >> "$TEMP_CRON"
echo "# Backup semanal los domingos a las 3 AM" >> "$TEMP_CRON"
echo "0 3 * * 0 /var/www/reservamesa/backup-database.sh weekly >> /var/www/reservamesa/backups/backup.log 2>&1" >> "$TEMP_CRON"

crontab "$TEMP_CRON"
rm -f "$TEMP_CRON"
echo -e "${GREEN}✅ Cron jobs configurados${NC}"

echo ""
echo "📋 Paso 5: Realizando backup inmediato de prueba..."
/var/www/reservamesa/backup-database.sh hourly
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup de prueba exitoso${NC}"
else
    echo -e "${RED}❌ Error en backup de prueba. Verifica la conexión a la base de datos.${NC}"
    echo "   Prueba manualmente: PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost $DB_NAME | head -5"
fi

echo ""
echo "📋 Paso 6: Haciendo también backup manual como respaldo..."
/var/www/reservamesa/backup-database.sh manual
/var/www/reservamesa/backup-database.sh daily

echo ""
echo "📋 Verificando backups creados:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for dir in hourly daily weekly manual; do
    count=$(find "$BACKUP_DIR/$dir" -name "*.sql.gz" -type f 2>/dev/null | wc -l)
    echo "  $dir: $count backups"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ SISTEMA DE BACKUPS CONFIGURADO CORRECTAMENTE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Frecuencia de backups:"
echo "  • Cada hora  → se guardan las últimas 24 horas"
echo "  • Diario     → se guardan los últimos 7 días"
echo "  • Semanal    → se guardan las últimas 4 semanas"
echo ""
echo "🔧 Comandos útiles:"
echo "  Backup manual:     ./backup-database.sh manual"
echo "  Ver backups:       ./restore-database.sh"
echo "  Restaurar último:  ./restore-database.sh latest"
echo "  Restaurar archivo: ./restore-database.sh /ruta/al/backup.sql.gz"
echo "  Ver log backups:   tail -f $BACKUP_DIR/backup.log"
echo "  Ver cron:          crontab -l"
