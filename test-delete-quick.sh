#!/bin/bash

echo "🧪 Test Rápido de DELETE"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 1. Listar clientes
echo "📋 1. Listando clientes actuales..."
curl -s "http://localhost:3000/api/trpc/clients.list" | jq -r '.result.data[] | .id + " - " + .name + " (" + .phone + ")"' 2>/dev/null || echo "No se pudo parsear JSON"
echo ""

# 2. Seleccionar un cliente
echo "📋 2. Ingresa el ID del cliente que quieres eliminar:"
echo "    (o presiona Enter para salir)"
read -r CLIENT_ID

if [ -z "$CLIENT_ID" ]; then
    echo "❌ Cancelado"
    exit 0
fi

echo ""
echo "📋 3. Enviando petición DELETE al backend..."
echo "   URL: http://localhost:3000/api/trpc/clients.delete"
echo "   Cliente ID: $CLIENT_ID"
echo ""

# 3. Hacer la petición DELETE
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\",\"confirmed\":true}" \
  "http://localhost:3000/api/trpc/clients.delete")

echo "Respuesta del servidor:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# 4. Verificar si se eliminó
echo "📋 4. Verificando si el cliente fue eliminado..."
sleep 1
STILL_EXISTS=$(curl -s "http://localhost:3000/api/trpc/clients.list" | grep -c "$CLIENT_ID")

if [ "$STILL_EXISTS" -eq 0 ]; then
    echo "✅ Cliente eliminado exitosamente"
else
    echo "❌ El cliente todavía existe"
fi
echo ""

echo "📋 5. Últimos logs del backend:"
tail -30 /var/www/reservamesa/backend.log | grep -E "(DELETE|ERROR|❌|✅)" | tail -20
echo ""
echo "════════════════════════════════════════════════════════════════"
