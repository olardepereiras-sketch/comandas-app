#!/bin/bash

echo "💾 CONFIGURANDO SISTEMA DE BACKUPS AUTOMÁTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuración
BACKUP_DIR="/var/backups/reservamesa"
BACKUP_SCRIPT="/usr/local/bin/backup-reservamesa.sh"
LOG_DIR="/var/log/reservamesa-backups"
RETENTION_DAYS=30

echo ""
echo "📋 Paso 1: Creando directorios..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo mkdir -p "$BACKUP_DIR"
sudo mkdir -p "$LOG_DIR"
sudo chown postgres:postgres "$BACKUP_DIR"
sudo chmod 755 "$BACKUP_DIR"
echo -e "${GREEN}✅ Directorios creados${NC}"

echo ""
echo "📋 Paso 2: Creando script de backup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sudo tee "$BACKUP_SCRIPT" > /dev/null << 'EOFBACKUP'
#!/bin/bash

# Script de backup automático para ReservaMesa
BACKUP_DIR="/var/backups/reservamesa"
LOG_DIR="/var/log/reservamesa-backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/reservamesa_backup_$TIMESTAMP.sql.gz"
LOG_FILE="$LOG_DIR/backup_$TIMESTAMP.log"

exec > >(tee -a "$LOG_FILE") 2>&1

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Iniciando backup: $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que PostgreSQL está corriendo
if ! sudo systemctl is-active --quiet postgresql; then
    echo "❌ ERROR: PostgreSQL no está corriendo"
    exit 1
fi

# Realizar backup
echo "📦 Generando backup..."
if sudo -u postgres pg_dump reservamesa_db | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completado: $BACKUP_FILE ($BACKUP_SIZE)"
    
    # Verificar integridad del backup
    echo "🔍 Verificando integridad..."
    if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        echo "✅ Backup verificado correctamente"
    else
        echo "❌ ERROR: Backup corrupto"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    echo "❌ ERROR: Fallo al crear backup"
    exit 1
fi

# Limpiar backups antiguos
echo "🧹 Limpiando backups antiguos (más de $RETENTION_DAYS días)..."
DELETED=$(find "$BACKUP_DIR" -name "reservamesa_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "✅ Eliminados $DELETED backups antiguos"
else
    echo "ℹ️  No hay backups antiguos para eliminar"
fi

# Mostrar estadísticas
echo ""
echo "📊 Estadísticas de backups:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/reservamesa_backup_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "Total de backups: $BACKUP_COUNT"
echo "Espacio usado: $TOTAL_SIZE"
echo ""

# Listar últimos 5 backups
echo "📋 Últimos 5 backups:"
ls -lht "$BACKUP_DIR"/reservamesa_backup_*.sql.gz 2>/dev/null | head -5

echo ""
echo "✅ Backup completado exitosamente: $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
EOFBACKUP

sudo chmod +x "$BACKUP_SCRIPT"
echo -e "${GREEN}✅ Script de backup creado en $BACKUP_SCRIPT${NC}"

echo ""
echo "📋 Paso 3: Configurando cron para backups automáticos..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Crear cron job (cada 6 horas)
CRON_JOB="0 */6 * * * $BACKUP_SCRIPT"

# Verificar si ya existe
if sudo crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "⚠️  Cron job ya existe, actualizando..."
    sudo crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | sudo crontab -
fi

# Añadir cron job
(sudo crontab -l 2>/dev/null; echo "$CRON_JOB") | sudo crontab -

echo -e "${GREEN}✅ Cron job configurado (backups cada 6 horas)${NC}"

echo ""
echo "📋 Paso 4: Realizando primer backup de prueba..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if sudo "$BACKUP_SCRIPT"; then
    echo -e "${GREEN}✅ Primer backup completado exitosamente${NC}"
else
    echo -e "${RED}❌ Error en primer backup${NC}"
    exit 1
fi

echo ""
echo "📋 Paso 5: Creando script de restauración..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sudo tee /usr/local/bin/restore-reservamesa.sh > /dev/null << 'EOFRESTORE'
#!/bin/bash

BACKUP_DIR="/var/backups/reservamesa"

echo "🔄 RESTAURAR BACKUP DE RESERVAMESA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Listar backups disponibles
echo ""
echo "📋 Backups disponibles:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! "$(ls -A $BACKUP_DIR/reservamesa_backup_*.sql.gz 2>/dev/null)" ]; then
    echo "❌ No hay backups disponibles"
    exit 1
fi

# Mostrar backups con números
select BACKUP_FILE in $BACKUP_DIR/reservamesa_backup_*.sql.gz; do
    if [ -n "$BACKUP_FILE" ]; then
        BACKUP_NAME=$(basename "$BACKUP_FILE")
        BACKUP_DATE=$(echo "$BACKUP_NAME" | grep -oP '\d{8}_\d{6}')
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📦 Backup seleccionado:"
        echo "   Archivo: $BACKUP_NAME"
        echo "   Fecha: $BACKUP_DATE"
        echo "   Tamaño: $BACKUP_SIZE"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "⚠️  ADVERTENCIA: Esto ELIMINARÁ todos los datos actuales"
        echo ""
        read -p "¿Continuar con la restauración? (escriba 'SI' para confirmar): " CONFIRM
        
        if [ "$CONFIRM" != "SI" ]; then
            echo "❌ Restauración cancelada"
            exit 1
        fi
        
        echo ""
        echo "🔄 Restaurando backup..."
        
        # Detener servidor
        echo "⏸️  Deteniendo servidor..."
        sudo systemctl stop reservamesa 2>/dev/null || true
        sudo pkill -9 -f "bun.*server.ts" 2>/dev/null || true
        
        # Eliminar base de datos actual y recrear
        echo "🗑️  Eliminando base de datos actual..."
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS reservamesa_db;"
        sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
        
        # Restaurar backup
        echo "📥 Restaurando datos..."
        if gunzip -c "$BACKUP_FILE" | sudo -u postgres psql reservamesa_db > /dev/null 2>&1; then
            echo "✅ Datos restaurados correctamente"
            
            # Restaurar permisos
            echo "🔐 Restaurando permisos..."
            
            # Cargar password desde env
            if [ -f "/var/www/reservamesa/env" ]; then
                export $(grep -v '^#' /var/www/reservamesa/env | grep DATABASE_PASSWORD | xargs)
            fi
            
            sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reservamesa_user;"
            sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reservamesa_user;"
            sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO reservamesa_user;"
            sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO reservamesa_user;"
            
            echo "✅ Permisos restaurados"
            
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ RESTAURACIÓN COMPLETADA EXITOSAMENTE"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "Para reiniciar el servidor ejecuta:"
            echo "  cd /var/www/reservamesa && sudo pm2 restart reservamesa"
        else
            echo "❌ Error al restaurar backup"
            exit 1
        fi
        
        break
    else
        echo "❌ Selección inválida"
    fi
done
EOFRESTORE

sudo chmod +x /usr/local/bin/restore-reservamesa.sh
echo -e "${GREEN}✅ Script de restauración creado${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ SISTEMA DE BACKUPS CONFIGURADO EXITOSAMENTE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Resumen:"
echo "  • Backups automáticos cada 6 horas"
echo "  • Retención: $RETENTION_DAYS días"
echo "  • Ubicación: $BACKUP_DIR"
echo "  • Logs: $LOG_DIR"
echo ""
echo "🔧 Comandos útiles:"
echo "  Backup manual:    sudo $BACKUP_SCRIPT"
echo "  Restaurar backup: sudo /usr/local/bin/restore-reservamesa.sh"
echo "  Ver backups:      ls -lh $BACKUP_DIR"
echo "  Ver logs:         tail -f $LOG_DIR/backup_*.log"
echo ""
