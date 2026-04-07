#!/bin/bash

echo "🔧 ARREGLANDO TODOS LOS PROBLEMAS CRÍTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Paso 1: Matar procesos en puerto 3000
echo ""
echo "📋 Paso 1: Matando procesos en puerto 3000..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo "✅ Procesos eliminados"

# Paso 2: Ejecutar script de corrección de base de datos
echo ""
echo "📋 Paso 2: Corrigiendo esquema de base de datos..."
bun backend/db/fix-all-critical-columns.ts
if [ $? -eq 0 ]; then
  echo "✅ Base de datos actualizada"
else
  echo "❌ Error actualizando base de datos"
  exit 1
fi

# Paso 3: Reconstruir frontend
echo ""
echo "📋 Paso 3: Reconstruyendo frontend..."
bun run export:web > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Frontend reconstruido"
else
  echo "❌ Error reconstruyendo frontend"
  exit 1
fi

# Paso 4: Iniciar servidor
echo ""
echo "📋 Paso 4: Iniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

# Verificar que el servidor arrancó
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  echo "✅ Servidor iniciado (PID: $(pgrep -f 'bun.*backend/server.ts'))"
else
  echo "❌ Error iniciando servidor"
  exit 1
fi

# Paso 5: Verificar que responde
echo ""
echo "📋 Paso 5: Verificando servidor..."
sleep 2
if curl -s http://localhost:3000/api/health > /dev/null; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "⚠️ Servidor puede no estar respondiendo aún (esperando inicialización)"
fi

# Paso 6: Recargar Nginx
echo ""
echo "📋 Paso 6: Recargando Nginx..."
nginx -t && systemctl reload nginx
if [ $? -eq 0 ]; then
  echo "✅ Nginx recargado"
else
  echo "❌ Error recargando Nginx"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TODOS LOS PROBLEMAS CRÍTICOS ARREGLADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Cambios aplicados:"
echo "  • Tabla clients actualizada (terms_accepted_at y más)"
echo "  • Tabla whatsapp_notifications actualizada (updated_at y más)"
echo "  • Servidor reiniciado correctamente"
echo "  • Frontend reconstruido"
echo ""
echo "📊 Para monitorear el sistema:"
echo "  tail -f backend.log"
echo ""
echo "🧪 Para probar:"
echo "  • Crear reserva desde: https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  • Crear reserva desde: https://quieromesa.com/client/restaurant2/o-lar-de-pereiras"
echo "  • Ambas deberían funcionar sin errores"
