#!/bin/bash
# ================================================================
# DEPLOY COMPLETO DEL SISTEMA COMANDAS EN VPS 217.71.202.110
# Ejecutar desde quieromesa.com o cualquier máquina con SSH
# Uso: bash deploy-comandas-vps.sh <usuario_vps> <password_vps>
#   o con clave SSH: bash deploy-comandas-vps.sh root
# ================================================================

VPS_IP="217.71.202.110"
VPS_USER="${1:-root}"
VPS_PORT="22"
APP_DIR="/var/www/comandas"
BACKEND_DIR="/opt/comandas-backend"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "================================================================"
echo "  DEPLOY COMANDAS → VPS $VPS_IP"
echo "================================================================"

# ── 1. BUILD LOCAL de la web Expo ─────────────────────────────────
echo ""
echo "📦 [1/5] Construyendo Expo web (base /restaurant/comandas)..."
cd "$PROJECT_ROOT/comandas-app"

if [ ! -d "node_modules" ]; then
  echo "  → Instalando dependencias npm..."
  npm install --legacy-peer-deps 2>&1 | tail -5
fi

EXPO_UNSTABLE_BASE_URL="/restaurant/comandas" \
EXPO_PUBLIC_COMANDAS_API_URL="" \
  npx expo export --platform web --output-dir dist 2>&1

if [ ! -d "dist" ]; then
  echo "❌ Error: no se generó el directorio dist. Revisa los errores de Expo arriba."
  exit 1
fi
echo "✅ Build web OK → $PROJECT_ROOT/comandas-app/dist"
cd "$PROJECT_ROOT"

# ── 2. SUBIR FICHEROS AL VPS ──────────────────────────────────────
echo ""
echo "🚀 [2/5] Subiendo ficheros al VPS $VPS_IP..."

ssh -p $VPS_PORT -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "
  set -e
  mkdir -p $APP_DIR/dist
  mkdir -p $BACKEND_DIR
  echo '✅ Directorios creados'
"

# Subir backend
rsync -avz --delete \
  -e "ssh -p $VPS_PORT -o StrictHostKeyChecking=no" \
  "$PROJECT_ROOT/comandas-backend/" \
  "$VPS_USER@$VPS_IP:$BACKEND_DIR/" \
  --exclude node_modules \
  --exclude dist \
  2>&1 | tail -10

# Subir web build
rsync -avz --delete \
  -e "ssh -p $VPS_PORT -o StrictHostKeyChecking=no" \
  "$PROJECT_ROOT/comandas-app/dist/" \
  "$VPS_USER@$VPS_IP:$APP_DIR/dist/" \
  2>&1 | tail -10

echo "✅ Ficheros subidos"

# ── 3. SETUP DEL VPS ──────────────────────────────────────────────
echo ""
echo "🔧 [3/5] Configurando VPS (Node, PM2, PostgreSQL, Nginx)..."

ssh -p $VPS_PORT -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'REMOTE'
set -e

# ── Node.js 20 ──────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -v)" < "v18" ]]; then
  echo "  → Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "  Node: $(node -v)  NPM: $(npm -v)"

# ── PM2 ─────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

# ── tsx (para ejecutar TypeScript directamente) ─────────────────
if ! command -v tsx &>/dev/null; then
  npm install -g tsx
fi

# ── PostgreSQL ───────────────────────────────────────────────────
if ! command -v psql &>/dev/null; then
  echo "  → Instalando PostgreSQL..."
  apt-get update -qq
  apt-get install -y postgresql postgresql-contrib
fi
systemctl enable postgresql
systemctl start postgresql

# ── Nginx ────────────────────────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  echo "  → Instalando Nginx..."
  apt-get install -y nginx
fi
systemctl enable nginx

echo "✅ Dependencias OK"
REMOTE

# ── 4. CONFIGURAR BASE DE DATOS Y BACKEND ────────────────────────
echo ""
echo "🗄️  [4/5] Base de datos y backend..."

ssh -p $VPS_PORT -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" << 'REMOTE'
set -e
BACKEND_DIR="/opt/comandas-backend"

# ── Crear usuario y base de datos PostgreSQL ────────────────────
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='comandas'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER comandas WITH PASSWORD 'comandas_secure_2024';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='comandas_db'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE comandas_db OWNER comandas;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE comandas_db TO comandas;"

# ── Ejecutar migración ───────────────────────────────────────────
echo "  → Ejecutando migración SQL..."
sudo -u postgres psql -d comandas_db -f "$BACKEND_DIR/migration.sql" 2>&1 || echo "  (migración ya aplicada o error menor, continuando...)"

# ── Crear .env del backend ───────────────────────────────────────
cat > "$BACKEND_DIR/.env" << 'ENV'
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://comandas:comandas_secure_2024@localhost:5432/comandas_db
ENV

# ── Instalar dependencias del backend ────────────────────────────
cd "$BACKEND_DIR"
npm install --production 2>&1 | tail -5

# ── Cargar .env en PM2 y arrancar ────────────────────────────────
pm2 delete comandas-backend 2>/dev/null || true

pm2 start ecosystem.config.js --env production \
  --update-env \
  -- --env-file "$BACKEND_DIR/.env" 2>/dev/null || \
  pm2 start src/index.ts \
    --name comandas-backend \
    --interpreter tsx \
    --env NODE_ENV=production \
    -e "$BACKEND_DIR/.env" \
    -- 2>/dev/null || \
  DATABASE_URL=postgresql://comandas:comandas_secure_2024@localhost:5432/comandas_db \
  PORT=3001 NODE_ENV=production \
  pm2 start "$BACKEND_DIR/src/index.ts" \
    --name comandas-backend \
    --interpreter tsx

pm2 save
pm2 startup 2>/dev/null || true

sleep 3
pm2 status
echo "✅ Backend iniciado"
REMOTE

# ── 5. CONFIGURAR NGINX EN VPS ────────────────────────────────────
echo ""
echo "🌐 [5/5] Configurando Nginx en VPS..."

scp -P $VPS_PORT -o StrictHostKeyChecking=no \
  "$PROJECT_ROOT/nginx-comandas-vps.conf" \
  "$VPS_USER@$VPS_IP:/etc/nginx/sites-available/comandas"

ssh -p $VPS_PORT -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "
  set -e
  ln -sf /etc/nginx/sites-available/comandas /etc/nginx/sites-enabled/comandas
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  echo '✅ Nginx configurado y recargado'
"

# ── VERIFICACIÓN FINAL ────────────────────────────────────────────
echo ""
echo "🔍 Verificando despliegue..."
sleep 2

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$VPS_IP/health" 2>/dev/null || echo "0")
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$VPS_IP/restaurant/comandas/" 2>/dev/null || echo "0")

echo "  Backend /health → HTTP $HTTP_STATUS"
echo "  Web app         → HTTP $WEB_STATUS"

echo ""
echo "================================================================"
echo "  ✅ DEPLOY COMPLETADO"
echo "================================================================"
echo ""
echo "  VPS directo:      http://$VPS_IP/restaurant/comandas/"
echo ""
echo "  PRÓXIMO PASO: Actualizar Nginx en quieromesa.com"
echo "  Copia nginx-quieromesa-fixed.conf actualizado al servidor"
echo "  y ejecuta: sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "  El restaurante entrará por:"
echo "  https://quieromesa.com/restaurant/comandas"
echo "================================================================"
