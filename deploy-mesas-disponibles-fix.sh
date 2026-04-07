#!/bin/bash

echo "🔧 Desplegando correcciones de Mesas Disponibles y Reserva sin Confirmar..."

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Variables de entorno cargadas"
else
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

# Verificar que las variables necesarias estén configuradas
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL no está configurado en .env"
    exit 1
fi

echo "📦 Instalando dependencias..."
bun install

echo "🔨 Compilando proyecto..."
cd backend
bun run build
cd ..

echo "🔄 Reiniciando servicios..."
pm2 restart all

echo "✅ Despliegue completado exitosamente"
echo ""
echo "Cambios aplicados:"
echo "1. ✅ Botón 'Reserva sin Confirmar' disponible en restaurant2"
echo "2. ✅ Nuevo botón 'Mesas disponibles' en reservations-pro"
echo "3. ✅ Modal completo con vista de turnos, comensales y mesas"
echo ""
echo "El botón 'Reserva sin Confirmar' aparece en:"
echo "https://quieromesa.com/client/restaurant2/{slug}"
echo ""
echo "El botón 'Mesas disponibles' aparece en:"
echo "https://quieromesa.com/restaurant/reservations-pro"
