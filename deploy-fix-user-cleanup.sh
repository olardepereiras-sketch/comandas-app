#!/bin/bash

echo "================================================"
echo "🚀 DEPLOY - Arreglo limpieza user_new"
echo "================================================"
echo ""

echo "✅ Paso 1: Deteniendo servidor..."
pm2 stop backend

echo ""
echo "✅ Paso 2: Limpiando build anterior..."
rm -rf dist/

echo ""
echo "✅ Paso 3: Compilando backend..."
bun run build

echo ""
echo "✅ Paso 4: Reiniciando servidor..."
pm2 restart backend

echo ""
echo "================================================"
echo "✅ DEPLOY COMPLETADO"
echo "================================================"
echo ""
echo "Cambios aplicados:"
echo "  1. ✅ Worker ahora borra user_new con reservas pending/cancelled"
echo "  2. ✅ Verifica fecha Y hora de la reserva antes de borrar"
echo "  3. ✅ Solo borra si no hay reservas confirmed/completed"
echo ""
echo "LÓGICA IMPLEMENTADA:"
echo "  - user_new con reserva pending/cancelled + hora pasada = SE BORRA"
echo "  - user_conf con cualquier reserva = NO SE BORRA (solo admin)"
echo "  - user_new con reserva confirmed/completed = NO SE BORRA"
echo ""
echo "El worker se ejecuta cada 1 minuto"
echo ""
echo "Para ver logs:"
echo "  pm2 logs backend --lines 100"
