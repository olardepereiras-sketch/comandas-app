#!/bin/bash

echo "🧪 Script de Pruebas de Operaciones"
echo "════════════════════════════════════════════════════════════════"
echo ""

export $(cat .env | grep -v '^#' | xargs)

echo "📋 1. Listando clientes disponibles..."
echo "────────────────────────────────────────────────────────────────"
bun backend/test-manual-operations.ts list-clients
echo ""

echo "📋 2. Listando reservas activas..."
echo "────────────────────────────────────────────────────────────────"
bun backend/test-manual-operations.ts list-reservations
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "✅ Listados completados"
echo ""
echo "Para eliminar un cliente:"
echo "  bun backend/test-manual-operations.ts delete-client <clientId>"
echo ""
echo "Para anular una reserva:"
echo "  bun backend/test-manual-operations.ts cancel-reservation <reservationId> \"Motivo\""
echo ""
echo "Ejemplo con los IDs mostrados arriba:"
echo "  bun backend/test-manual-operations.ts delete-client test-delete-1767648775"
echo "════════════════════════════════════════════════════════════════"
