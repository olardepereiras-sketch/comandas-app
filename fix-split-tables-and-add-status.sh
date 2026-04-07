#!/bin/bash

echo "🔧 Aplicando correcciones de división de mesas y nuevo estado 'añadida'..."

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar directorio
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Ejecuta este script desde el directorio raíz del proyecto${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Archivos actualizados correctamente${NC}"
echo ""
echo "📋 Cambios realizados:"
echo "  1. ✅ Mesa original ya NO se modifica al dividir"
echo "  2. ✅ Agregado botón 'Reserva sin Confirmar'"
echo "  3. ✅ Nuevo estado 'añadida' para reservas sin confirmación"
echo ""
echo "🔄 Reiniciando servidor..."

# Reiniciar el servidor
pm2 restart all

echo ""
echo -e "${GREEN}✅ Proceso completado${NC}"
echo ""
echo "📝 Notas importantes:"
echo "  • Las mesas temporales NO modifican las mesas originales"
echo "  • El botón 'Reserva sin Confirmar' envía token (modificar/anular) directamente"
echo "  • Las reservas con estado 'añadida' NO se pueden valorar ni marcar como no-show"
echo "  • Después de 30 min de la hora de reserva, pasan de 'añadida' a 'finalizada'"
