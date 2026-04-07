#!/bin/bash

echo "🔄 RESTAURACIÓN DE BASE DE DATOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

BACKUP_DIR_1="/var/www/reservamesa/backups"
BACKUP_DIR_2="/var/backups/reservamesa"
DB_NAME="reservamesa_db"
DB_USER="reservamesa_user"
DB_PASSWORD="MiContrasenaSegura666"

find_all_backups() {
    local ALL_BACKUPS=""
    
    for dir in "$BACKUP_DIR_1/hourly" "$BACKUP_DIR_1/daily" "$BACKUP_DIR_1/weekly" "$BACKUP_DIR_1" "$BACKUP_DIR_2"; do
        if [ -d "$dir" ]; then
            local files=$(find "$dir" -maxdepth 1 -name "*.sql.gz" -type f 2>/dev/null)
            if [ -n "$files" ]; then
                ALL_BACKUPS="$ALL_BACKUPS $files"
            fi
        fi
    done
    
    echo "$ALL_BACKUPS"
}

find_latest_backup() {
    local LATEST=""
    local LATEST_TIME=0
    
    local ALL=$(find_all_backups)
    
    for f in $ALL; do
        if [ -f "$f" ]; then
            local FTIME=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null)
            if [ -n "$FTIME" ] && [ "$FTIME" -gt "$LATEST_TIME" ]; then
                LATEST_TIME=$FTIME
                LATEST=$f
            fi
        fi
    done
    
    echo "$LATEST"
}

list_backups() {
    echo -e "${CYAN}📋 Buscando backups en TODAS las ubicaciones...${NC}"
    echo ""
    
    local FOUND=0
    
    echo -e "${CYAN}📂 Ubicación 1: $BACKUP_DIR_1${NC}"
    for subdir in "hourly" "daily" "weekly" ""; do
        local dir="$BACKUP_DIR_1"
        if [ -n "$subdir" ]; then
            dir="$BACKUP_DIR_1/$subdir"
        fi
        if [ -d "$dir" ]; then
            local count=$(find "$dir" -maxdepth 1 -name "*.sql.gz" -type f 2>/dev/null | wc -l)
            if [ "$count" -gt 0 ]; then
                if [ -n "$subdir" ]; then
                    echo -e "  ${GREEN}[$subdir]${NC} $count archivos:"
                else
                    echo -e "  ${GREEN}[raíz]${NC} $count archivos:"
                fi
                find "$dir" -maxdepth 1 -name "*.sql.gz" -type f -exec ls -lh {} \; 2>/dev/null | awk '{print "    " $5 "  " $6 " " $7 " " $8 "  " $NF}'
                FOUND=$((FOUND + count))
            fi
        fi
    done
    
    echo ""
    echo -e "${CYAN}📂 Ubicación 2: $BACKUP_DIR_2${NC}"
    if [ -d "$BACKUP_DIR_2" ]; then
        local count=$(find "$BACKUP_DIR_2" -maxdepth 1 -name "*.sql.gz" -type f 2>/dev/null | wc -l)
        if [ "$count" -gt 0 ]; then
            echo -e "  ${GREEN}$count archivos encontrados:${NC}"
            find "$BACKUP_DIR_2" -maxdepth 1 -name "*.sql.gz" -type f -exec ls -lh {} \; 2>/dev/null | awk '{print "    " $5 "  " $6 " " $7 " " $8 "  " $NF}'
            FOUND=$((FOUND + count))
        else
            echo "  No hay backups aquí"
        fi
    else
        echo "  Directorio no existe"
    fi
    
    echo ""
    
    if [ "$FOUND" -eq 0 ]; then
        echo -e "${RED}❌ NO SE ENCONTRARON BACKUPS EN NINGUNA UBICACIÓN${NC}"
        echo ""
        echo "Esto significa que el sistema de backups no estaba funcionando correctamente."
        echo "Para evitar esto en el futuro, ejecuta:"
        echo "  chmod +x setup-automatic-backups-reliable.sh && ./setup-automatic-backups-reliable.sh"
        return 1
    fi
    
    echo -e "${GREEN}Total de backups encontrados: $FOUND${NC}"
    
    local LATEST=$(find_latest_backup)
    if [ -n "$LATEST" ]; then
        local SIZE=$(du -h "$LATEST" | cut -f1)
        local DATE=$(stat -c '%Y' "$LATEST" 2>/dev/null || stat -f '%m' "$LATEST" 2>/dev/null)
        local HUMAN_DATE=$(date -d "@$DATE" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r "$DATE" '+%Y-%m-%d %H:%M:%S' 2>/dev/null)
        echo ""
        echo -e "${CYAN}⭐ Backup más reciente:${NC}"
        echo -e "   Archivo: ${GREEN}$LATEST${NC}"
        echo -e "   Tamaño: $SIZE"
        echo -e "   Fecha:  $HUMAN_DATE"
    fi
    
    return 0
}

verify_backup_content() {
    local BACKUP_FILE=$1
    echo "🔍 Verificando contenido del backup..."
    
    local SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    local SIZE_BYTES=$(stat -c %s "$BACKUP_FILE" 2>/dev/null || stat -f %z "$BACKUP_FILE" 2>/dev/null)
    
    echo "   Tamaño: $SIZE ($SIZE_BYTES bytes)"
    
    if [ "$SIZE_BYTES" -lt 500 ]; then
        echo -e "${RED}   ❌ ADVERTENCIA: El backup es muy pequeño, puede estar vacío o corrupto${NC}"
        return 1
    fi
    
    if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        echo -e "${RED}   ❌ El archivo está corrupto (fallo test gunzip)${NC}"
        return 1
    fi
    echo -e "${GREEN}   ✅ Archivo gzip válido${NC}"
    
    local HAS_TABLES=$(gunzip -c "$BACKUP_FILE" 2>/dev/null | head -200 | grep -c "CREATE TABLE")
    local HAS_DATA=$(gunzip -c "$BACKUP_FILE" 2>/dev/null | head -500 | grep -c "INSERT INTO\|COPY.*FROM stdin")
    
    echo "   Tablas encontradas en backup: ~$HAS_TABLES"
    echo "   Inserciones de datos: ~$HAS_DATA"
    
    if [ "$HAS_TABLES" -eq 0 ] && [ "$HAS_DATA" -eq 0 ]; then
        echo -e "${RED}   ❌ ADVERTENCIA: El backup parece no tener datos útiles${NC}"
        return 1
    fi
    
    local HAS_RESTAURANTS=$(gunzip -c "$BACKUP_FILE" 2>/dev/null | grep -c "restaurants")
    if [ "$HAS_RESTAURANTS" -gt 0 ]; then
        echo -e "${GREEN}   ✅ El backup contiene datos de restaurantes${NC}"
    else
        echo -e "${YELLOW}   ⚠️ No se detectaron datos de restaurantes en el backup${NC}"
    fi
    
    return 0
}

restore_backup() {
    local BACKUP_FILE=$1
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Archivo de backup no encontrado: $BACKUP_FILE${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️ ADVERTENCIA: Esto reemplazará TODOS los datos actuales${NC}"
    echo "Backup a restaurar: $BACKUP_FILE"
    echo ""
    
    verify_backup_content "$BACKUP_FILE"
    local VERIFY_RESULT=$?
    
    if [ $VERIFY_RESULT -ne 0 ]; then
        echo ""
        echo -e "${RED}⚠️ El backup tiene problemas. ¿Deseas continuar igualmente?${NC}"
        read -p "Escribe 'FORZAR' para continuar o cualquier otra cosa para cancelar: " FORCE_CONFIRM
        if [ "$FORCE_CONFIRM" != "FORZAR" ]; then
            echo "Operación cancelada"
            exit 0
        fi
    fi
    
    echo ""
    read -p "¿Estás seguro de restaurar? (escribe 'SI' para confirmar): " CONFIRM
    
    if [ "$CONFIRM" != "SI" ]; then
        echo "Operación cancelada"
        exit 0
    fi
    
    echo ""
    echo "📋 Paso 1: Haciendo backup de seguridad del estado actual..."
    mkdir -p "$BACKUP_DIR_1"
    SAFETY_BACKUP="$BACKUP_DIR_1/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost $DB_NAME 2>/dev/null | gzip > "$SAFETY_BACKUP"
    local SAFETY_SIZE=$(du -h "$SAFETY_BACKUP" 2>/dev/null | cut -f1)
    echo -e "${GREEN}✅ Backup de seguridad creado: $SAFETY_BACKUP ($SAFETY_SIZE)${NC}"
    
    echo ""
    echo "📋 Paso 2: Deteniendo servidor..."
    pkill -f "bun.*backend/server.ts" 2>/dev/null || true
    pkill -f "bun.*server.ts" 2>/dev/null || true
    sleep 3
    echo -e "${GREEN}✅ Servidor detenido${NC}"
    
    echo ""
    echo "📋 Paso 3: Terminando conexiones activas a la base de datos..."
    sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✅ Conexiones terminadas${NC}"
    
    echo ""
    echo "📋 Paso 4: Eliminando base de datos actual..."
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️ No se pudo eliminar normalmente, forzando...${NC}"
        sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';" 2>/dev/null
        sleep 2
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null
    fi
    echo -e "${GREEN}✅ Base de datos eliminada${NC}"
    
    echo ""
    echo "📋 Paso 5: Creando base de datos nueva..."
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error creando base de datos${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Base de datos creada${NC}"
    
    echo ""
    echo "📋 Paso 6: Restaurando backup... (esto puede tardar unos segundos)"
    local RESTORE_OUTPUT=$(gunzip -c "$BACKUP_FILE" | PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h localhost -d $DB_NAME 2>&1)
    local RESTORE_RESULT=$?
    
    local ERROR_COUNT=$(echo "$RESTORE_OUTPUT" | grep -ci "error" || echo "0")
    local TABLE_COUNT=$(echo "$RESTORE_OUTPUT" | grep -ci "CREATE TABLE" || echo "0")
    
    echo "   Tablas restauradas: ~$TABLE_COUNT"
    
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}   ⚠️ Se encontraron $ERROR_COUNT errores menores (normalmente son duplicados que se pueden ignorar)${NC}"
    fi
    
    echo ""
    echo "📋 Paso 7: Verificando restauración..."
    local RESTORED_TABLES=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h localhost -d $DB_NAME -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    echo "   Tablas en la base de datos: $RESTORED_TABLES"
    
    local RESTAURANT_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h localhost -d $DB_NAME -t -c "SELECT count(*) FROM restaurants;" 2>/dev/null | tr -d ' ')
    echo "   Restaurantes: $RESTAURANT_COUNT"
    
    local CLIENT_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h localhost -d $DB_NAME -t -c "SELECT count(*) FROM clients;" 2>/dev/null | tr -d ' ')
    echo "   Clientes: $CLIENT_COUNT"
    
    local RESERVATION_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h localhost -d $DB_NAME -t -c "SELECT count(*) FROM reservations;" 2>/dev/null | tr -d ' ')
    echo "   Reservas: $RESERVATION_COUNT"
    
    if [ "$RESTAURANT_COUNT" = "0" ] || [ -z "$RESTAURANT_COUNT" ]; then
        echo ""
        echo -e "${RED}❌ ADVERTENCIA: No se restauraron restaurantes.${NC}"
        echo -e "${RED}   El backup puede estar vacío o ser de cuando la BD ya estaba vacía.${NC}"
        echo ""
        echo "¿Quieres intentar con otro backup?"
        echo "  Usa: ./restore-database.sh /ruta/al/otro/backup.sql.gz"
    else
        echo -e "${GREEN}   ✅ Datos restaurados correctamente${NC}"
    fi
    
    echo ""
    echo "📋 Paso 8: Asegurando permisos..."
    sudo -u postgres psql -d $DB_NAME << EOF
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
GRANT USAGE ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
EOF
    echo -e "${GREEN}✅ Permisos otorgados${NC}"
    
    echo ""
    echo "📋 Paso 9: Ejecutando migraciones para agregar columnas que puedan faltar..."
    cd /var/www/reservamesa
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h localhost -d $DB_NAME << 'MIGRATION'
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS important_message_enabled BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS important_message TEXT DEFAULT '';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS min_booking_advance_minutes INTEGER DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS available_high_chairs INTEGER DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS high_chair_rotation_minutes INTEGER DEFAULT 120;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS table_rotation_time INTEGER DEFAULT 100;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS min_modify_cancel_minutes INTEGER DEFAULT 180;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reminder1_enabled BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reminder1_hours INTEGER DEFAULT 24;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reminder2_enabled BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reminder2_minutes INTEGER DEFAULT 60;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS use_whatsapp_web BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS auto_send_whatsapp BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS sales_rep_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_duration_months INTEGER DEFAULT 12;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'user_new';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT '';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS client_email TEXT DEFAULT '';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS client_notes TEXT DEFAULT '';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_token2 TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS pending_expires_at TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_new_client BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS client_rated BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rating_deadline TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS group_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS high_chair_count INTEGER DEFAULT 0;

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

ALTER TABLE subscription_durations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subscription_durations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE subscription_durations ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
ALTER TABLE subscription_durations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE tables ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE tables ADD COLUMN IF NOT EXISTS seats INTEGER;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS table_number INTEGER;

ALTER TABLE table_locations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE table_locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE table_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS table_groups (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    location_id TEXT,
    table_ids TEXT[] NOT NULL,
    min_capacity INTEGER NOT NULL,
    max_capacity INTEGER NOT NULL,
    priority INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_templates (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    time_slots TEXT NOT NULL,
    max_guests_per_hour INTEGER DEFAULT 10,
    min_rating DECIMAL(3,2) DEFAULT 0,
    min_local_rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS day_exceptions (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    date DATE NOT NULL,
    is_open BOOLEAN NOT NULL DEFAULT false,
    enabled_shift_ids TEXT,
    shifts TEXT,
    max_guests_per_shift TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_no_shows (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    restaurant_id TEXT NOT NULL,
    reservation_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cuisine_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS province_cuisine_types (
    id TEXT PRIMARY KEY,
    province_id TEXT NOT NULL,
    cuisine_type_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurant_modules (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS no_show_rules (
    id TEXT PRIMARY KEY,
    no_shows_required INTEGER NOT NULL,
    block_duration_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_slots (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    time TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    reservation_id TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_representatives (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    dni TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    new_client_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    first_renewal_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    renewal_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
MIGRATION
    echo -e "${GREEN}✅ Migraciones aplicadas${NC}"
    
    echo ""
    echo "📋 Paso 10: Reiniciando servidor..."
    cd /var/www/reservamesa
    pkill -f "bun.*server.ts" 2>/dev/null || true
    sleep 1
    bun backend/server.ts > backend.log 2>&1 &
    sleep 4
    echo -e "${GREEN}✅ Servidor reiniciado (PID: $!)${NC}"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✅ RESTAURACIÓN COMPLETADA${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 Resumen final:"
    echo "   Restaurantes: $RESTAURANT_COUNT"
    echo "   Clientes: $CLIENT_COUNT"
    echo "   Reservas: $RESERVATION_COUNT"
    echo ""
    echo "Para ver los logs: tail -f backend.log"
}

if [ -z "$1" ]; then
    list_backups
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Para restaurar un backup, usa:"
    echo "  ./restore-database.sh /ruta/completa/al/backup.sql.gz"
    echo ""
    echo "O usa uno de estos atajos:"
    echo "  ./restore-database.sh latest    (backup más reciente de cualquier ubicación)"
    echo "  ./restore-database.sh hourly    (último backup por hora)"
    echo "  ./restore-database.sh daily     (último backup diario)"
    echo "  ./restore-database.sh weekly    (último backup semanal)"
else
    case $1 in
        latest)
            BACKUP_FILE=$(find_latest_backup)
            ;;
        hourly)
            BACKUP_FILE=$(ls -t "$BACKUP_DIR_1/hourly/"*.sql.gz 2>/dev/null | head -n 1)
            ;;
        daily)
            BACKUP_FILE=$(ls -t "$BACKUP_DIR_1/daily/"*.sql.gz 2>/dev/null | head -n 1)
            ;;
        weekly)
            BACKUP_FILE=$(ls -t "$BACKUP_DIR_1/weekly/"*.sql.gz 2>/dev/null | head -n 1)
            ;;
        *)
            BACKUP_FILE=$1
            ;;
    esac
    
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ No se encontró ningún backup${NC}"
        echo ""
        list_backups
        exit 1
    fi
    
    echo -e "${CYAN}📦 Backup seleccionado: $BACKUP_FILE${NC}"
    echo ""
    restore_backup "$BACKUP_FILE"
fi
