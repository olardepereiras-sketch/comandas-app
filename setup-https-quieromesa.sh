#!/bin/bash

################################################################################
# Script de Configuración HTTPS para quieromesa.com
################################################################################

set -e

echo "🔒 Configuración HTTPS para quieromesa.com"
echo "════════════════════════════════════════════════════════════════"

DOMAIN="quieromesa.com"
EMAIL="admin@quieromesa.com"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Este script debe ejecutarse como root (sudo)"
    exit 1
fi

echo -e "${BLUE}📋 1. Instalando Certbot...${NC}"
apt update
apt install certbot python3-certbot-nginx -y
echo -e "${GREEN}✅ Certbot instalado${NC}"

echo ""
echo -e "${BLUE}📋 2. Verificando configuración de DNS...${NC}"
echo "Verificando que $DOMAIN apunta a este servidor..."
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)
SERVER_IP=$(curl -s ifconfig.me)
echo "IP del dominio: $DOMAIN_IP"
echo "IP del servidor: $SERVER_IP"

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}⚠️  ADVERTENCIA: El dominio no apunta a este servidor${NC}"
    echo "Asegúrate de que en tu registrador de dominios:"
    echo "- Registro A: $DOMAIN → $SERVER_IP"
    echo "- Registro A: www.$DOMAIN → $SERVER_IP"
    echo ""
    read -p "¿Quieres continuar de todos modos? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ DNS verificado${NC}"

echo ""
echo -e "${BLUE}📋 3. Creando configuración de Nginx temporal...${NC}"

cat > /etc/nginx/sites-available/reservamesa << 'EOF'
server {
    listen 80;
    listen [::]:80;
    
    server_name quieromesa.com www.quieromesa.com;

    root /var/www/reservamesa/dist;
    index index.html;

    # Proxy para el backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Servir archivos estáticos del frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Mantener acceso por IP
server {
    listen 80;
    listen [::]:80;
    
    server_name 200.234.236.133;

    root /var/www/reservamesa/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

echo -e "${GREEN}✅ Configuración de Nginx creada${NC}"

echo ""
echo -e "${BLUE}📋 4. Verificando y recargando Nginx...${NC}"
nginx -t
systemctl reload nginx
echo -e "${GREEN}✅ Nginx recargado${NC}"

echo ""
echo -e "${BLUE}📋 5. Obteniendo certificado SSL con Let's Encrypt...${NC}"
echo "Esto puede tardar unos minutos..."
echo ""

# Obtener certificado
certbot --nginx \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

echo -e "${GREEN}✅ Certificado SSL obtenido y configurado${NC}"

echo ""
echo -e "${BLUE}📋 6. Verificando renovación automática...${NC}"
certbot renew --dry-run
echo -e "${GREEN}✅ Renovación automática configurada${NC}"

echo ""
echo -e "${BLUE}📋 7. Actualizando variables de entorno...${NC}"

cd /var/www/reservamesa

# Backup del env actual
cp env env.backup.$(date +%Y%m%d_%H%M%S)

# Actualizar URLs en el archivo env
sed -i "s|http://200.234.236.133|https://quieromesa.com|g" env
sed -i "s|EXPO_PUBLIC_RORK_API_BASE_URL=.*|EXPO_PUBLIC_RORK_API_BASE_URL=https://quieromesa.com|g" env

echo -e "${GREEN}✅ Variables de entorno actualizadas${NC}"

echo ""
echo -e "${BLUE}📋 8. Recompilando frontend con URLs HTTPS...${NC}"

# Cargar variables
export $(cat env | xargs)

# Compilar frontend
bun run build:web

echo -e "${GREEN}✅ Frontend recompilado${NC}"

echo ""
echo -e "${BLUE}📋 9. Reiniciando servicios...${NC}"

# Reiniciar backend
pkill -f "bun.*backend/server.ts" || true
sleep 2
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
echo $! > backend.pid

# Recargar nginx
systemctl reload nginx

echo -e "${GREEN}✅ Servicios reiniciados${NC}"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ CONFIGURACIÓN HTTPS COMPLETADA${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Tu sitio ahora está disponible en:"
echo "   https://quieromesa.com"
echo "   https://www.quieromesa.com"
echo ""
echo "🔒 Características habilitadas:"
echo "   ✅ Certificado SSL válido"
echo "   ✅ Redirección automática HTTP → HTTPS"
echo "   ✅ Renovación automática de certificados"
echo "   ✅ Enlaces azules en WhatsApp"
echo "   ✅ Sitio seguro en navegadores"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Verifica https://quieromesa.com en tu navegador"
echo "   2. Prueba enviar un enlace de reserva por WhatsApp"
echo "   3. Configura Google Search Console para SEO"
echo ""
echo "🔄 Los certificados se renovarán automáticamente cada 60 días"
echo ""
echo "════════════════════════════════════════════════════════════════"
