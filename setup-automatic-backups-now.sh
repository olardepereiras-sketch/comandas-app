#!/bin/bash

echo "🔒 CONFIGURANDO SISTEMA DE BACKUPS AUTOMÁTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Este sistema hará backups automáticos cada hora y los"
echo "mantendrá por 7 días. Podrás restaurarlos fácilmente."
echo ""

# Paso 1: Crear directorio de backups
echo "📋 Paso 1: Creando directorio de backups..."
BACKUP_DIR="/var/backups/reservamesa"
sudo mkdir -p "$BACKUP_DIR"
sudo chown postgres:postgres "$BACKUP_DIR"
sudo chmod 755 "$BACKUP_DIR"
echo "✅ Directorio creado: $BACKUP_DIR"

# Paso 2: Crear script de backup
echo ""
echo "📋 Paso 2: Creando script de backup..."
sudo tee /usr/local/bin/backup-reservamesa.sh > /dev/null << 'SCRIPT_EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/reservamesa"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/reservamesa_backup_$TIMESTAMP.sql.gz"
LOG_FILE="$BACKUP_DIR/backup.log"

echo "[$(date)] 🔄 Iniciando backup..." >> "$LOG_FILE"

# Hacer backup
sudo -u postgres pg_dump reservamesa_db | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] ✅ Backup exitoso: $BACKUP_FILE ($BACKUP_SIZE)" >> "$LOG_FILE"
  
  # Eliminar backups de más de 7 días
  find "$BACKUP_DIR" -name "reservamesa_backup_*.sql.gz" -mtime +7 -delete
  echo "[$(date)] 🧹 Backups antiguos eliminados" >> "$LOG_FILE"
else
  echo "[$(date)] ❌ Error en backup" >> "$LOG_FILE"
  exit 1
fi
SCRIPT_EOF

sudo chmod +x /usr/local/bin/backup-reservamesa.sh
echo "✅ Script de backup creado"

# Paso 3: Hacer backup inicial
echo ""
echo "📋 Paso 3: Haciendo backup inicial..."
sudo /usr/local/bin/backup-reservamesa.sh
echo "✅ Backup inicial completado"

# Paso 4: Configurar cron para backups cada hora
echo ""
echo "📋 Paso 4: Configurando cron para backups automáticos cada hora..."
(sudo crontab -l 2>/dev/null | grep -v backup-reservamesa; echo "0 * * * * /usr/local/bin/backup-reservamesa.sh") | sudo crontab -
echo "✅ Cron configurado"

# Paso 5: Crear script de restauración
echo ""
echo "📋 Paso 5: Creando script de restauración..."
sudo tee /usr/local/bin/restore-reservamesa.sh > /dev/null << 'RESTORE_EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/reservamesa"

echo "🔄 RESTAURAR BASE DE DATOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Listar backups disponibles
echo "Backups disponibles:"
echo ""
ls -lth "$BACKUP_DIR"/reservamesa_backup_*.sql.gz | awk '{print NR". "$9" ("$5")"}'
echo ""

# Pedir al usuario que elija
read -p "¿Qué backup quieres restaurar? (número): " CHOICE

# Obtener el archivo
BACKUP_FILE=$(ls -t "$BACKUP_DIR"/reservamesa_backup_*.sql.gz | sed -n "${CHOICE}p")

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Backup no válido"
  exit 1
fi

echo ""
echo "⚠️ ADVERTENCIA: Esto eliminará TODOS los datos actuales"
echo "y los reemplazará con el backup: $(basename "$BACKUP_FILE")"
echo ""
read -p "¿Estás COMPLETAMENTE seguro? (escribe 'SI' para continuar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
  echo "❌ Restauración cancelada"
  exit 1
fi

echo ""
echo "📋 Deteniendo servidor..."
sudo systemctl stop reservamesa 2>/dev/null || true
sudo pkill -f "bun.*server.ts" || true

echo ""
echo "📋 Eliminando base de datos actual..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS reservamesa_db;"

echo ""
echo "📋 Creando base de datos nueva..."
sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"

echo ""
echo "📋 Restaurando backup..."
gunzip < "$BACKUP_FILE" | sudo -u postgres psql reservamesa_db

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Restauración exitosa"
  
  echo ""
  echo "📋 Reiniciando servidor..."
  cd /var/www/reservamesa
  sudo -u root nohup bun backend/server.ts > backend.log 2>&1 &
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ BASE DE DATOS RESTAURADA"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo ""
  echo "❌ Error en la restauración"
  exit 1
fi
RESTORE_EOF

sudo chmod +x /usr/local/bin/restore-reservamesa.sh
echo "✅ Script de restauración creado"

# Paso 6: Mostrar resumen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA DE BACKUPS CONFIGURADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Backups guardados en: $BACKUP_DIR"
echo "⏰ Frecuencia: Cada hora"
echo "🗓️ Retención: 7 días"
echo ""
echo "📋 Comandos disponibles:"
echo "  • Ver backups:      ls -lth $BACKUP_DIR"
echo "  • Restaurar backup: sudo /usr/local/bin/restore-reservamesa.sh"
echo "  • Ver log:          cat $BACKUP_DIR/backup.log"
echo ""
echo "✅ Tu base de datos está ahora protegida"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
