#!/bin/bash

VPS_HOST="${1:-root@200.234.236.133}"
REMOTE_DIR="/var/www/reservamesa"

echo "🎮 Agregando módulo 'El Juego del Chef' a la base de datos..."
echo "📡 Servidor: $VPS_HOST"

# Subir el script de migración
scp backend/db/add-game-chef-module.ts $VPS_HOST:$REMOTE_DIR/backend/db/add-game-chef-module.ts

# Ejecutar la migración en el servidor
ssh $VPS_HOST "cd $REMOTE_DIR && npx ts-node backend/db/add-game-chef-module.ts"

echo ""
echo "✅ Módulo 'El Juego del Chef' agregado."
echo "   Ya debe aparecer en https://quieromesa.com/admin/modules"
echo "   con ícono 🎮 y ruta /restaurant/game-chef"
