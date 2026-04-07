#!/bin/bash

echo "🔧 Ejecutando corrección de Fianzas y Admin Stripe..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Credenciales desde el archivo env
DB_USER="reservamesa_user"
DB_NAME="reservamesa_db"
DB_HOST="localhost"

# Exportar la contraseña para psql
export PGPASSWORD="MiContrasenaSegura666"

echo "📋 Ejecutando script SQL..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f fix-deposits-and-admin-stripe.sql

if [ $? -eq 0 ]; then
  echo "✅ Script ejecutado correctamente"
  echo ""
  echo "🔄 Reiniciando servidor backend..."
  pkill -f "bun.*backend/server.ts"
  bun backend/server.ts > backend.log 2>&1 &
  echo "✅ Servidor reiniciado"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ CORRECCIÓN COMPLETADA"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📌 Próximos pasos:"
  echo "   1. El módulo 'Fianzas' ya está disponible en los planes PRO y PREMIUM"
  echo "   2. Ve a https://quieromesa.com/admin/modules para verificar"
  echo "   3. Ve a https://quieromesa.com/admin/stats para configurar Stripe"
else
  echo "❌ Error al ejecutar el script"
  echo ""
  echo "💡 Verifica que PostgreSQL esté corriendo:"
  echo "   sudo systemctl status postgresql"
fi

# Limpiar la variable de contraseña
unset PGPASSWORD
