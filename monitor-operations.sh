#!/bin/bash

echo "🔍 Monitor de Operaciones en Tiempo Real"
echo "========================================"
echo ""
echo "Este script mostrará en tiempo real lo que sucede cuando:"
echo "  1. Intentas borrar un usuario"
echo "  2. Intentas anular una reserva"
echo ""
echo "Monitoreando logs del servidor..."
echo "Presiona Ctrl+C para detener"
echo ""
echo "════════════════════════════════════════════════════════"
echo ""

# Limpiar el log anterior si existe
> /tmp/reservamesa-monitor.log

# Iniciar el monitoreo en tiempo real
pm2 logs reservamesa --lines 0 --raw 2>&1 | while IFS= read -r line; do
  # Filtrar solo las líneas relevantes
  if [[ "$line" == *"DELETE CLIENT"* ]] || \
     [[ "$line" == *"CANCEL RESERVATION"* ]] || \
     [[ "$line" == *"ERROR"* ]] || \
     [[ "$line" == *"Paso"* ]] || \
     [[ "$line" == *"═══"* ]] || \
     [[ "$line" == *"✅"* ]] || \
     [[ "$line" == *"❌"* ]] || \
     [[ "$line" == *"📋"* ]] || \
     [[ "$line" == *"🔵"* ]]; then
    echo "$line"
    echo "$line" >> /tmp/reservamesa-monitor.log
  fi
done
