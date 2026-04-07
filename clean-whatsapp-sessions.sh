#!/bin/bash
# Limpieza de sesiones WhatsApp inactivas
# Elimina carpetas de Chromium de restaurantes que llevan mas de N dias sin actividad
# USO: ./clean-whatsapp-sessions.sh [dias_inactividad] [--dry-run]
# EJEMPLO: ./clean-whatsapp-sessions.sh 7 --dry-run

SESSIONS_DIR="/var/www/reservamesa/whatsapp-sessions"
INACTIVE_DAYS=${1:-7}
DRY_RUN=false
if [[ "$2" == "--dry-run" ]] || [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  INACTIVE_DAYS=${1:-7}
  [[ "$1" == "--dry-run" ]] && INACTIVE_DAYS=7
fi

echo ""
echo "=================================================="
echo " LIMPIEZA DE SESIONES WHATSAPP"
echo "=================================================="
echo " Directorio: $SESSIONS_DIR"
echo " Inactividad minima: $INACTIVE_DAYS dias"
if $DRY_RUN; then
  echo " MODO: DRY-RUN (solo informar, no borrar)"
else
  echo " MODO: REAL (se eliminaran los archivos)"
fi
echo "--------------------------------------------------"

if [ ! -d "$SESSIONS_DIR" ]; then
  echo "El directorio $SESSIONS_DIR no existe. Nada que limpiar."
  exit 0
fi

total_size_before=0
total_deleted=0
total_size_deleted=0

# Calcular tamano total antes
for session_dir in "$SESSIONS_DIR"/*/; do
  if [ -d "$session_dir" ]; then
    size=$(du -sb "$session_dir" 2>/dev/null | cut -f1)
    total_size_before=$((total_size_before + size))
  fi
done

echo ""
echo "Sesiones encontradas:"
echo ""

for session_dir in "$SESSIONS_DIR"/*/; do
  if [ ! -d "$session_dir" ]; then
    continue
  fi

  session_name=$(basename "$session_dir")
  size=$(du -sh "$session_dir" 2>/dev/null | cut -f1)
  size_bytes=$(du -sb "$session_dir" 2>/dev/null | cut -f1)

  # Obtener fecha de ultima modificacion de cualquier archivo dentro
  last_modified=$(find "$session_dir" -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1)
  
  if [ -z "$last_modified" ]; then
    # Sin archivos, usar fecha del directorio
    last_modified=$(stat -c '%Y' "$session_dir" 2>/dev/null || echo "0")
  fi

  now=$(date +%s)
  age_seconds=$((now - ${last_modified%.*}))
  age_days=$((age_seconds / 86400))

  if [ $age_days -ge $INACTIVE_DAYS ]; then
    status="INACTIVO ($age_days dias) -> ELIMINAR"
    if ! $DRY_RUN; then
      rm -rf "$session_dir"
      total_deleted=$((total_deleted + 1))
      total_size_deleted=$((total_size_deleted + size_bytes))
      status="INACTIVO ($age_days dias) -> ELIMINADO"
    else
      total_deleted=$((total_deleted + 1))
      total_size_deleted=$((total_size_deleted + size_bytes))
    fi
  else
    status="activo (hace $age_days dias)"
  fi

  printf "  %-45s %6s  %s\n" "$session_name" "$size" "$status"
done

echo ""
echo "--------------------------------------------------"
echo " RESUMEN:"
size_before_mb=$((total_size_before / 1024 / 1024))
size_deleted_mb=$((total_size_deleted / 1024 / 1024))
echo "  Tamano total antes: ${size_before_mb} MB"
echo "  Sesiones a/eliminadas: $total_deleted"
echo "  Espacio liberado: ${size_deleted_mb} MB"
echo ""

if $DRY_RUN; then
  echo "  Para ejecutar la limpieza real:"
  echo "  ./clean-whatsapp-sessions.sh $INACTIVE_DAYS"
fi

echo "=================================================="
echo ""
