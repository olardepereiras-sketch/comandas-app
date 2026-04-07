#!/bin/bash

echo "🧹 Limpiando datos de prueba..."
echo "============================================================"
echo ""
echo "⚠️  ADVERTENCIA: Esto eliminará:"
echo "   - Todas las reservas"
echo "   - Todas las excepciones de día (días abiertos/cerrados)"
echo ""
echo "   NO eliminará:"
echo "   - Horarios base (schedules)"
echo "   - Restaurantes"
echo "   - Mesas y ubicaciones"
echo "   - Plantillas de turnos"
echo ""
read -p "¿Continuar? (s/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    cd /var/www/reservamesa
    bun backend/db/clean-test-data.ts
    
    echo ""
    echo "🔄 Reiniciando servidor..."
    pm2 restart backend
    
    echo ""
    echo "✅ Limpieza completada"
fi
