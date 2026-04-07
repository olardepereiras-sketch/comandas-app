#!/bin/bash

echo "🔧 INSTALANDO CHROME Y DEPENDENCIAS PARA WHATSAPP WEB"
echo "======================================================"
echo ""

echo "📋 Paso 1/6: Actualizando paquetes del sistema..."
sudo apt-get update -y
echo ""

echo "📋 Paso 2/6: Instalando dependencias de Chrome/Chromium..."
sudo apt-get install -y \
  wget \
  gnupg \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libatspi2.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libwayland-client0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  xdg-utils \
  libu2f-udev \
  libvulkan1
echo ""

echo "📋 Paso 3/6: Instalando Chromium..."
sudo apt-get install -y chromium-browser chromium-chromedriver || \
sudo apt-get install -y chromium chromium-driver
echo ""

echo "📋 Paso 4/6: Verificando instalación de Chromium..."
if command -v chromium-browser &> /dev/null; then
    CHROMIUM_PATH=$(which chromium-browser)
    echo "✅ Chromium instalado en: $CHROMIUM_PATH"
    chromium-browser --version
elif command -v chromium &> /dev/null; then
    CHROMIUM_PATH=$(which chromium)
    echo "✅ Chromium instalado en: $CHROMIUM_PATH"
    chromium --version
else
    echo "❌ No se pudo instalar Chromium. Intentando instalar Chrome..."
    
    # Instalar Google Chrome como alternativa
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
    sudo apt-get update -y
    sudo apt-get install -y google-chrome-stable
    
    if command -v google-chrome &> /dev/null; then
        CHROMIUM_PATH=$(which google-chrome)
        echo "✅ Google Chrome instalado en: $CHROMIUM_PATH"
        google-chrome --version
    else
        echo "❌ Error: No se pudo instalar ni Chromium ni Chrome"
        exit 1
    fi
fi
echo ""

echo "📋 Paso 5/6: Configurando permisos y directorios..."
cd /var/www/reservamesa || exit 1

# Crear directorio para sesiones de WhatsApp
mkdir -p whatsapp-sessions
chmod 755 whatsapp-sessions

# Crear directorio para Puppeteer
mkdir -p /root/.cache/puppeteer
chmod -R 755 /root/.cache/puppeteer
echo ""

echo "📋 Paso 6/6: Instalando paquetes de npm..."
bun install whatsapp-web.js qrcode @types/qrcode
echo ""

echo "✅ INSTALACIÓN COMPLETADA"
echo ""
echo "📱 Información del navegador instalado:"
if command -v chromium-browser &> /dev/null; then
    echo "   Ruta: $(which chromium-browser)"
    chromium-browser --version
elif command -v chromium &> /dev/null; then
    echo "   Ruta: $(which chromium)"
    chromium --version
elif command -v google-chrome &> /dev/null; then
    echo "   Ruta: $(which google-chrome)"
    google-chrome --version
fi
echo ""
echo "💡 Próximo paso: Ejecuta el script de despliegue de WhatsApp Web"
echo "   ./deploy-whatsapp-web-final.sh"
echo ""
