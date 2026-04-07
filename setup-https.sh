#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "🔒 Configuración Automática de HTTPS con Let's Encrypt"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
   echo "❌ Por favor ejecuta este script como root: sudo ./setup-https.sh"
   exit 1
fi

# Pedir el dominio
echo "📋 Ingresa tu dominio (ejemplo: quieromesa.com):"
read -p "Dominio: " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Debes ingresar un dominio"
    exit 1
fi

echo ""
echo "🔍 Verificando configuración actual..."
echo ""

# Verificar que el dominio apunte a este servidor
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

echo "   IP del servidor: $SERVER_IP"
echo "   IP del dominio: $DOMAIN_IP"
echo ""

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    echo "⚠️  ADVERTENCIA: El dominio no apunta a este servidor"
    echo "   Asegúrate de que el DNS esté configurado correctamente"
    echo ""
    read -p "¿Deseas continuar de todos modos? (s/n): " CONTINUE
    if [ "$CONTINUE" != "s" ]; then
        exit 1
    fi
fi

# Instalar certbot si no está instalado
if ! command -v certbot &> /dev/null; then
    echo "📦 Instalando Certbot..."
    apt update
    apt install certbot python3-certbot-nginx -y
    echo "✅ Certbot instalado"
else
    echo "✅ Certbot ya está instalado"
fi

# Detener nginx temporalmente
echo ""
echo "🛑 Deteniendo nginx..."
systemctl stop nginx

# Obtener certificado SSL
echo ""
echo "🔐 Obteniendo certificado SSL..."
echo "   Se te pedirá un email para notificaciones de renovación"
echo ""

certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN

if [ $? -ne 0 ]; then
    echo "❌ Error al obtener el certificado SSL"
    systemctl start nginx
    exit 1
fi

echo ""
echo "✅ Certificado SSL obtenido exitosamente"

# Crear configuración de nginx con HTTPS
echo ""
echo "📝 Configurando Nginx para HTTPS..."

cat > /etc/nginx/sites-available/reservamesa << EOF
# HTTP - Redirigir a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Redirigir todo el tráfico HTTP a HTTPS
    return 301 https://\$host\$request_uri;
}

# HTTPS - Configuración principal
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name $DOMAIN www.$DOMAIN;

    # Certificados SSL de Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;

    # Configuración SSL moderna y segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    root /var/www/reservamesa/dist;
    index index.html;

    # Proxy para el backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Servir archivos estáticos del frontend
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

echo "✅ Configuración de Nginx creada"

# Verificar configuración de nginx
echo ""
echo "🔍 Verificando configuración de Nginx..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Error en la configuración de Nginx"
    exit 1
fi

# Iniciar nginx
echo ""
echo "🚀 Iniciando Nginx..."
systemctl start nginx
systemctl enable nginx

echo ""
echo "✅ Nginx iniciado con éxito"

# Configurar renovación automática
echo ""
echo "🔄 Configurando renovación automática de certificados..."

# Crear hook para recargar nginx después de renovar
cat > /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF

chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh

# Probar renovación automática
echo "   Probando renovación automática..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo "✅ Renovación automática configurada correctamente"
else
    echo "⚠️  Hubo un problema con la renovación automática"
fi

# Actualizar archivo .env
echo ""
echo "📝 Actualizando archivo .env..."

if [ -f /var/www/reservamesa/env ]; then
    # Hacer backup del env
    cp /var/www/reservamesa/env /var/www/reservamesa/env.backup
    
    # Actualizar URL en env
    sed -i "s|EXPO_PUBLIC_RORK_API_BASE_URL=.*|EXPO_PUBLIC_RORK_API_BASE_URL=https://$DOMAIN|g" /var/www/reservamesa/env
    
    echo "✅ Archivo .env actualizado"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ HTTPS CONFIGURADO EXITOSAMENTE"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🌐 URLs actualizadas:"
echo "   Frontend: https://$DOMAIN"
echo "   Admin: https://$DOMAIN/admin"
echo "   API: https://$DOMAIN/api"
echo ""
echo "🔒 Características habilitadas:"
echo "   ✓ Certificado SSL válido de Let's Encrypt"
echo "   ✓ Renovación automática cada 60 días"
echo "   ✓ Redirección automática de HTTP a HTTPS"
echo "   ✓ Headers de seguridad configurados"
echo "   ✓ Enlaces en WhatsApp aparecerán en azul"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Limpia la caché del navegador (Ctrl+Shift+R)"
echo "   2. Visita https://$DOMAIN"
echo "   3. Verifica que aparece el candado de seguridad 🔒"
echo "   4. Prueba los enlaces de WhatsApp"
echo ""
echo "🔄 Para recompilar el frontend con las nuevas URLs:"
echo "   cd /var/www/reservamesa"
echo "   ./deploy-frontend.sh"
echo ""
echo "════════════════════════════════════════════════════════════════"
