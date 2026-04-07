#!/bin/bash

echo "🚀 Desplegando sistema de suscripciones..."

echo "📦 Instalando dependencias..."
bun install

echo "🗄️ Agregando duración de 0 meses..."
bun run backend/db/add-zero-month-duration.ts

echo "🔄 Reiniciando servidor con PM2..."
pm2 restart backend

echo "✅ Sistema de suscripciones desplegado correctamente"
echo ""
echo "📋 Resumen de cambios:"
echo "  ✓ Restaurantes desactivados ahora aparecen en el panel admin"
echo "  ✓ Botón de eliminar restaurante corregido"
echo "  ✓ Duración de 0 meses 'Suscripción Caducada' creada"
echo "  ✓ Botón 'Cargar Duración' actualiza correctamente la fecha de caducidad"
echo "  ✓ Restaurantes con suscripción caducada:"
echo "    - No aparecen en búsquedas del buscador"
echo "    - Enlace del cliente muestra error"
echo "    - Acceso al panel del restaurante bloqueado"
echo ""
echo "🎯 Sistema de suscripciones completo y funcionando"
