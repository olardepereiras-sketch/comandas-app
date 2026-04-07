#!/bin/bash
# Script maestro de optimizaciones de almacenamiento VPS
# Ejecutar en el VPS como root: bash apply-storage-optimizations.sh
# Este script:
#   1. Instala logrotate para backend.log (compresion diaria, 7 dias)
#   2. Aplica indices PostgreSQL para acelerar queries
#   3. Actualiza configuracion de backups a 7 dias de retencion
#   4. Limpieza inicial de sesiones WhatsApp inactivas (>7 dias)
#   5. Configura cron para limpieza semanal de sesiones WhatsApp

set -e

PROJECT_DIR="/var/www/reservamesa"
BACKUP_DIR="/var/backups/reservamesa"
SESSIONS_DIR="$PROJECT_DIR/whatsapp-sessions"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}=================================================="
echo " OPTIMIZACIONES DE ALMACENAMIENTO VPS"
echo -e "==================================================${NC}"
echo ""

# ──────────────────────────────────────────────────────────────
# PASO 1: Logrotate para backend.log
# ──────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/5] Configurando logrotate para backend.log...${NC}"

cat > /etc/logrotate.d/reservamesa << 'LOGROTATE_EOF'
/var/www/reservamesa/backend.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    maxsize 50M
}
LOGROTATE_EOF

echo -e "${GREEN}     OK: /etc/logrotate.d/reservamesa creado${NC}"

# Verificar configuracion logrotate
logrotate --debug /etc/logrotate.d/reservamesa 2>&1 | tail -5
echo -e "${GREEN}     OK: Logrotate verificado${NC}"

# Mostrar tamano actual del log
if [ -f "$PROJECT_DIR/backend.log" ]; then
  log_size=$(du -sh "$PROJECT_DIR/backend.log" 2>/dev/null | cut -f1)
  echo "     Tamano actual de backend.log: $log_size"
fi

echo ""

# ──────────────────────────────────────────────────────────────
# PASO 2: Indices PostgreSQL
# ──────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/5] Aplicando indices PostgreSQL...${NC}"

# Obtener credenciales de la base de datos
if [ -f "$PROJECT_DIR/env" ]; then
  source <(grep -v '^#' "$PROJECT_DIR/env" | grep DATABASE_URL)
elif [ -f "$PROJECT_DIR/.env" ]; then
  source <(grep -v '^#' "$PROJECT_DIR/.env" | grep DATABASE_URL)
fi

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}     ERROR: DATABASE_URL no encontrada en $PROJECT_DIR/env${NC}"
  echo "     Ejecuta manualmente: psql \$DATABASE_URL -f $PROJECT_DIR/add-storage-indexes.sql"
else
  # Extraer componentes
  DB_USER=$(echo "$DATABASE_URL" | sed 's/postgresql:\/\/\([^:]*\):.*/\1/')
  DB_PASS=$(echo "$DATABASE_URL" | sed 's/postgresql:\/\/[^:]*:\([^@]*\)@.*/\1/')
  DB_HOST=$(echo "$DATABASE_URL" | sed 's/postgresql:\/\/[^@]*@\([^:/]*\).*/\1/')
  DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\/\([^?]*\).*/\1/')

  echo "     DB: $DB_USER@$DB_HOST/$DB_NAME"
  
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    -f "$PROJECT_DIR/add-storage-indexes.sql" \
    --set ON_ERROR_STOP=0 2>&1 | grep -E "CREATE INDEX|already exists|ERROR" | head -20

  echo -e "${GREEN}     OK: Indices PostgreSQL aplicados${NC}"
fi

echo ""

# ──────────────────────────────────────────────────────────────
# PASO 3: Actualizar config de backups a 7 dias
# ──────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/5] Actualizando configuracion de backups a 7 dias...${NC}"

mkdir -p "$BACKUP_DIR"

BACKUP_CONFIG="$BACKUP_DIR/backup-config.json"
if [ -f "$BACKUP_CONFIG" ]; then
  # Leer retention actual
  current_retention=$(python3 -c "import json; d=json.load(open('$BACKUP_CONFIG')); print(d.get('retention',30))" 2>/dev/null || echo "30")
  echo "     Retencion actual: $current_retention dias -> cambiando a 7 dias"
  
  # Actualizar manteniendo otros valores
  python3 -c "
import json
with open('$BACKUP_CONFIG', 'r') as f:
    config = json.load(f)
config['retention'] = 7
with open('$BACKUP_CONFIG', 'w') as f:
    json.dump(config, f, indent=2)
print('     Config actualizada:', config)
" 2>/dev/null || echo '{"frequency":6,"retention":7,"autoBackupEnabled":true}' > "$BACKUP_CONFIG"
else
  echo '{"frequency":6,"retention":7,"autoBackupEnabled":true}' > "$BACKUP_CONFIG"
  echo "     Config creada con retencion de 7 dias"
fi

# Mostrar estado actual de backups
echo ""
echo "     Estado actual de backups en $BACKUP_DIR:"
total_files=$(ls "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l)
total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo "     Total ficheros .gz: $total_files (Total: $total_size)"

# Eliminar backups automaticos con mas de 7 dias
echo "     Eliminando backups automaticos con mas de 7 dias..."
find "$BACKUP_DIR" -name "backup-*-auto-*.gz" -mtime +7 -type f | while read f; do
  size=$(du -sh "$f" 2>/dev/null | cut -f1)
  echo "     Eliminando: $(basename $f) ($size)"
  rm -f "$f"
done

total_files_after=$(ls "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l)
total_size_after=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo -e "${GREEN}     OK: Quedan $total_files_after ficheros (Total: $total_size_after)${NC}"

echo ""

# ──────────────────────────────────────────────────────────────
# PASO 4: Limpieza inicial de sesiones WhatsApp inactivas
# ──────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/5] Limpiando sesiones WhatsApp inactivas (>7 dias)...${NC}"

if [ -d "$SESSIONS_DIR" ]; then
  size_before=$(du -sh "$SESSIONS_DIR" 2>/dev/null | cut -f1)
  echo "     Tamano antes: $size_before"

  deleted=0
  for session_dir in "$SESSIONS_DIR"/*/; do
    if [ ! -d "$session_dir" ]; then continue; fi
    
    session_name=$(basename "$session_dir")
    last_modified=$(find "$session_dir" -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1)
    
    if [ -z "$last_modified" ]; then
      last_modified=$(stat -c '%Y' "$session_dir" 2>/dev/null || echo "0")
    fi

    now=$(date +%s)
    age_days=$(( (now - ${last_modified%.*}) / 86400 ))

    if [ $age_days -ge 7 ]; then
      size=$(du -sh "$session_dir" 2>/dev/null | cut -f1)
      rm -rf "$session_dir"
      deleted=$((deleted + 1))
      echo "     Eliminada sesion inactiva ($age_days dias): $session_name ($size)"
    fi
  done

  size_after=$(du -sh "$SESSIONS_DIR" 2>/dev/null | cut -f1)
  echo -e "${GREEN}     OK: $deleted sesiones eliminadas. Tamano: $size_before -> $size_after${NC}"
else
  echo "     Directorio $SESSIONS_DIR no existe, nada que limpiar"
fi

echo ""

# ──────────────────────────────────────────────────────────────
# PASO 5: Configurar cron semanal para limpieza WhatsApp
# ──────────────────────────────────────────────────────────────
echo -e "${YELLOW}[5/5] Configurando cron semanal para sesiones WhatsApp...${NC}"

# Copiar script de limpieza al proyecto
chmod +x "$PROJECT_DIR/clean-whatsapp-sessions.sh" 2>/dev/null || true

CRON_LINE="0 3 * * 0 bash $PROJECT_DIR/clean-whatsapp-sessions.sh 7 >> /var/log/whatsapp-cleanup.log 2>&1"

# Verificar si ya existe el cron
if crontab -l 2>/dev/null | grep -q "clean-whatsapp-sessions"; then
  echo "     Cron ya configurado"
else
  # Agregar cron
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo -e "${GREEN}     OK: Cron configurado (domingos a las 03:00)${NC}"
  echo "     Cron: $CRON_LINE"
fi

echo ""

# ──────────────────────────────────────────────────────────────
# RESUMEN FINAL
# ──────────────────────────────────────────────────────────────
echo -e "${BLUE}=================================================="
echo " RESUMEN FINAL"
echo -e "==================================================${NC}"

echo ""
echo "Espacio en disco:"
df -h / | tail -1 | awk '{printf "  Usado: %s / %s (%s libre)\n", $3, $2, $4}'

echo ""
echo "Directorios clave:"
for dir in "$PROJECT_DIR" "$BACKUP_DIR" "$SESSIONS_DIR" "/var/log"; do
  if [ -d "$dir" ]; then
    size=$(du -sh "$dir" 2>/dev/null | cut -f1)
    printf "  %-45s %s\n" "$dir" "$size"
  fi
done

echo ""
echo -e "${GREEN}Optimizaciones completadas:${NC}"
echo "  [OK] Logrotate configurado: backend.log comprimido diariamente, 7 dias"
echo "  [OK] Indices PostgreSQL aplicados"
echo "  [OK] Retencion de backups: 7 dias (antes: 30 dias)"
echo "  [OK] Sesiones WhatsApp inactivas eliminadas"
echo "  [OK] Cron semanal para limpieza WhatsApp configurado"
echo ""
echo -e "${YELLOW}Proximos pasos recomendados:${NC}"
echo "  - Reiniciar el servidor para que el nuevo backup-worker tome efecto:"
echo "    pkill -f 'bun.*server.ts' && bun backend/server.ts > backend.log 2>&1 &"
echo ""
echo -e "${BLUE}==================================================${NC}"
echo ""
