#!/bin/bash

echo "🔧 DETECTANDO Y CONFIGURANDO CHROME PARA WHATSAPP"
echo "=================================================="
echo ""

# 1. Buscar Chrome/Chromium en el sistema
echo "📋 Paso 1/5: Buscando Chrome/Chromium..."

CHROME_PATH=""

# Posibles ubicaciones de Chrome
POSSIBLE_PATHS=(
    "/usr/bin/chromium-browser"
    "/usr/bin/chromium"
    "/usr/bin/google-chrome"
    "/usr/bin/google-chrome-stable"
    "/snap/bin/chromium"
)

for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        CHROME_PATH="$path"
        echo "✅ Chrome encontrado en: $CHROME_PATH"
        break
    fi
done

if [ -z "$CHROME_PATH" ]; then
    echo "❌ No se encontró Chrome/Chromium instalado"
    echo ""
    echo "Instalando Chromium..."
    sudo apt-get update
    sudo apt-get install -y chromium-browser
    
    # Verificar de nuevo
    if [ -f "/usr/bin/chromium-browser" ]; then
        CHROME_PATH="/usr/bin/chromium-browser"
        echo "✅ Chromium instalado exitosamente en: $CHROME_PATH"
    else
        echo "❌ Error: No se pudo instalar Chromium"
        exit 1
    fi
fi

echo ""

# 2. Actualizar archivo .env
echo "📋 Paso 2/5: Configurando variable de entorno..."

if grep -q "^PUPPETEER_EXECUTABLE_PATH=" env 2>/dev/null; then
    sed -i "s|^PUPPETEER_EXECUTABLE_PATH=.*|PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH|" env
    echo "✅ Variable PUPPETEER_EXECUTABLE_PATH actualizada en env"
else
    echo "" >> env
    echo "PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> env
    echo "✅ Variable PUPPETEER_EXECUTABLE_PATH agregada a env"
fi

echo ""

# 3. Crear directorio para sesiones
echo "📋 Paso 3/5: Creando directorios..."

mkdir -p whatsapp-sessions
chmod 755 whatsapp-sessions
echo "✅ Directorio de sesiones creado"

echo ""

# 4. Detener servidor y limpiar
echo "📋 Paso 4/5: Reiniciando servidor..."

pkill -f "bun.*backend/server.ts" || true
sleep 2

# Iniciar servidor
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &

echo "✅ Servidor reiniciado"

echo ""

# 5. Verificar
echo "📋 Paso 5/5: Verificando configuración..."
sleep 3

if grep -q "Servidor corriendo" backend.log; then
    echo "✅ Servidor funcionando correctamente"
else
    echo "⚠️  Revisar logs con: tail -f backend.log"
fi

echo ""
echo "✅ CONFIGURACIÓN COMPLETADA"
echo ""
echo "🔧 Chrome configurado en: $CHROME_PATH"
echo ""
echo "📱 Próximos pasos:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Activa 'Usar WhatsApp Web'"
echo "   3. Espera a que aparezca el código QR (puede tardar 10-15 segundos)"
echo "   4. Escanea el código QR con el WhatsApp del restaurante"
echo "   5. Una vez conectado, activa 'Envío Automático de WhatsApp'"
echo ""
echo "💡 Si el QR no aparece, revisa los logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
