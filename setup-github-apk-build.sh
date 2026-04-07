#!/bin/bash

# Configura GitHub Actions para compilar el APK + sirve el APK desde Nginx
# Ejecutar en el VPS: bash setup-github-apk-build.sh

set -e

DOWNLOADS_DIR="/var/www/comandas/public/downloads"
NGINX_CONF="/etc/nginx/sites-available/quieromesa"

echo "================================================"
echo "  Setup APK Download via GitHub Actions"
echo "================================================"

# ── 1. Crear directorio de descargas ───────────────────────────────────────
echo ""
echo "▶ Creando directorio de descargas..."
mkdir -p "$DOWNLOADS_DIR"
chmod 755 "$DOWNLOADS_DIR"
echo "  ✅ Directorio: $DOWNLOADS_DIR"

# ── 2. Crear página de descarga HTML ──────────────────────────────────────
echo ""
echo "▶ Creando página de descarga..."
cat > /var/www/comandas/public/instalar-app.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instalar App Comandas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 8px; }
    .subtitle { color: #94a3b8; font-size: 15px; margin-bottom: 32px; line-height: 1.5; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: white;
      text-decoration: none;
      padding: 16px 24px;
      border-radius: 14px;
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 16px;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn svg { width: 22px; height: 22px; }
    .steps {
      background: #0f172a;
      border-radius: 14px;
      padding: 20px;
      text-align: left;
      margin-top: 24px;
    }
    .steps h3 { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
    .step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    .step:last-child { margin-bottom: 0; }
    .step-num {
      width: 24px;
      height: 24px;
      background: #f97316;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-text { font-size: 14px; color: #cbd5e1; line-height: 1.5; }
    .step-text strong { color: #f1f5f9; }
    .version { color: #475569; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🍽️</div>
    <h1>App Comandas</h1>
    <p class="subtitle">Monitor de cocina y comandera para Android</p>

    <a class="btn" href="/downloads/comandas.apk" id="downloadBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Descargar APK para Android
    </a>

    <div class="steps">
      <h3>Pasos de instalación</h3>
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text">Pulsa el botón y descarga el archivo <strong>APK</strong></div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text">Abre los <strong>Ajustes</strong> del dispositivo → Seguridad → Activa <strong>"Orígenes desconocidos"</strong></div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text">Abre el archivo descargado y pulsa <strong>Instalar</strong></div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-text">Abre la app e introduce el <strong>token</strong> de tu restaurante</div>
      </div>
    </div>

    <p class="version">Requiere Android 8.0 o superior</p>
  </div>

  <script>
    const btn = document.getElementById('downloadBtn');
    fetch('/downloads/comandas.apk', { method: 'HEAD' })
      .then(r => {
        if (!r.ok) {
          btn.style.opacity = '0.5';
          btn.style.pointerEvents = 'none';
          btn.innerHTML = '⏳ APK en compilación...';
        }
      })
      .catch(() => {});
  </script>
</body>
</html>
HTMLEOF

chmod 644 /var/www/comandas/public/instalar-app.html
echo "  ✅ Página creada: /var/www/comandas/public/instalar-app.html"

# ── 3. Configurar Nginx ────────────────────────────────────────────────────
echo ""
echo "▶ Configurando Nginx..."

if [ ! -f "$NGINX_CONF" ]; then
  echo "  ⚠️  No se encontró $NGINX_CONF"
  echo "  Busca el archivo de configuración de nginx correcto y añade:"
  echo ""
  echo "    location = /instalar-app {"
  echo "        alias /var/www/comandas/public/instalar-app.html;"
  echo "        default_type text/html;"
  echo "    }"
  echo ""
  echo "    location /downloads/ {"
  echo "        alias /var/www/comandas/public/downloads/;"
  echo "        add_header Content-Disposition 'attachment';"
  echo "        types { application/vnd.android.package-archive apk; }"
  echo "    }"
  exit 0
fi

# Añadir locations si no existen
if ! grep -q "instalar-app" "$NGINX_CONF"; then
  # Insertar antes del último } del server block
  TEMP=$(mktemp)
  awk '
  /^}/ && !done {
    print "    location = /instalar-app {"
    print "        alias /var/www/comandas/public/instalar-app.html;"
    print "        default_type text/html;"
    print "    }"
    print ""
    print "    location /downloads/ {"
    print "        alias /var/www/comandas/public/downloads/;"
    print "        add_header Content-Disposition \"attachment\";"
    print "        types { application/vnd.android.package-archive apk; }"
    print "    }"
    print ""
    done=1
  }
  { print }
  ' "$NGINX_CONF" > "$TEMP" && mv "$TEMP" "$NGINX_CONF"
  echo "  ✅ Nginx configurado con /instalar-app y /downloads"
else
  echo "  ℹ️  Nginx ya tiene /instalar-app configurado"
fi

# Verificar y recargar nginx
if nginx -t 2>/dev/null; then
  systemctl reload nginx
  echo "  ✅ Nginx recargado"
else
  echo "  ❌ Error en nginx config. Revisa manualmente: nginx -t"
fi

# ── 4. Instrucciones GitHub Actions ────────────────────────────────────────
echo ""
echo "================================================"
echo "  ✅ SERVIDOR LISTO"
echo "================================================"
echo ""
echo "  Página descarga: https://quieromesa.com/instalar-app"
echo ""
echo "  Para compilar el APK via GitHub Actions:"
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │ 1. Sube el código a GitHub (si no está ya)          │"
echo "  │                                                     │"
echo "  │ 2. En GitHub → Settings → Secrets → Actions:       │"
echo "  │    VPS_HOST  = IP de tu VPS                         │"
echo "  │    VPS_USER  = root (o usuario SSH)                 │"
echo "  │    VPS_SSH_KEY = contenido de tu clave privada SSH  │"
echo "  │                                                     │"
echo "  │ 3. Ve a Actions → Build Android APK → Run workflow  │"
echo "  │                                                     │"
echo "  │ 4. En ~15min el APK se descargará automáticamente  │"
echo "  │    a /var/www/comandas/public/downloads/            │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""
echo "  Para obtener tu clave SSH privada:"
echo "    cat ~/.ssh/id_rsa"
echo ""
