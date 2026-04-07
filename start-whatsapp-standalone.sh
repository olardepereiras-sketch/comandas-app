#!/bin/bash

echo "📱 INICIANDO WHATSAPP WEB (modo standalone)"
echo "=========================================="
echo ""
echo "Este script te ayudará a conectar WhatsApp Web"
echo "y mantenerlo ejecutándose en segundo plano."
echo ""

# Verificar si ya está ejecutándose
if pgrep -f "start-whatsapp.ts" > /dev/null; then
    echo "⚠️  WhatsApp Web ya está ejecutándose"
    echo ""
    echo "Para ver el estado:"
    echo "  pm2 status"
    echo ""
    echo "Para ver logs:"
    echo "  pm2 logs whatsapp-web"
    echo ""
    echo "Para reiniciar:"
    echo "  pm2 restart whatsapp-web"
    echo ""
    exit 0
fi

# Verificar si PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    bun install -g pm2
fi

# Iniciar con PM2
echo "🚀 Iniciando WhatsApp Web con PM2..."
cd /var/www/reservamesa
pm2 start backend/scripts/start-whatsapp.ts --name whatsapp-web --interpreter bun

echo ""
echo "✅ WhatsApp Web iniciado"
echo ""
echo "📱 Para vincular tu dispositivo:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Ver el código QR:"
echo "   pm2 logs whatsapp-web"
echo ""
echo "2. Abre WhatsApp en tu teléfono"
echo ""
echo "3. Ve a: Configuración → Dispositivos vinculados"
echo ""
echo "4. Toca 'Vincular un dispositivo'"
echo ""
echo "5. Escanea el código QR"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Comandos útiles:"
echo "  pm2 status           - Ver estado"
echo "  pm2 logs whatsapp-web  - Ver logs"
echo "  pm2 stop whatsapp-web  - Detener"
echo "  pm2 restart whatsapp-web - Reiniciar"
echo ""
