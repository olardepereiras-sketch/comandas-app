#!/bin/bash

echo "🔧 Recompilando frontend con HTTPS..."

# Cargar variables de entorno
source /var/www/reservamesa/env

# Recompilar frontend
cd /var/www/reservamesa
bun run build

# Reiniciar servidor
pm2 restart backend

# Recargar nginx
sudo nginx -s reload

echo "✅ Frontend recompilado con HTTPS"
echo "🌐 Accede a: https://quieromesa.com"
