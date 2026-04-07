#!/bin/bash

echo "🔧 Solucionando módulo de Fianzas..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Ejecutar script de corrección
echo "📋 Limpiando módulos duplicados..."
cd /var/www/reservamesa
bun backend/db/fix-deposits-module-duplicate.ts

echo ""
echo "✅ ¡Listo! El módulo de Fianzas ha sido corregido."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Verifica que el módulo aparezca correctamente en:"
echo "   - https://quieromesa.com/admin/modules"
echo "   - https://quieromesa.com/restaurant (si está habilitado)"
