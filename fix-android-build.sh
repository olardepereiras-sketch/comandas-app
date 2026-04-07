#!/bin/bash

# Fix Android build - Kotlin version incompatibility + APK serving setup
# Run this on your VPS: bash fix-android-build.sh

set -e

APP_DIR="/var/www/comandas/comandas-app"
ANDROID_DIR="$APP_DIR/android"
APK_SERVE_DIR="/var/www/comandas/public/downloads"
APK_DEST="$APK_SERVE_DIR/comandas.apk"

echo "================================================"
echo "  Fix Android Build + APK Serving Setup"
echo "================================================"

# ── 1. Fix Kotlin version in build.gradle ──────────────────────────────────
echo ""
echo "▶ Fixing Kotlin version in android/build.gradle..."

if [ ! -f "$ANDROID_DIR/build.gradle" ]; then
  echo "  ❌ android/build.gradle not found. Run: cd $APP_DIR && npx expo prebuild --platform android"
  exit 1
fi

# Replace kotlinVersion 1.9.x with 2.1.0
sed -i 's/kotlinVersion = "1\.9\.[0-9]*"/kotlinVersion = "2.1.0"/g' "$ANDROID_DIR/build.gradle"

# Verify the change
if grep -q 'kotlinVersion = "2.1.0"' "$ANDROID_DIR/build.gradle"; then
  echo "  ✅ kotlinVersion updated to 2.1.0"
else
  echo "  ⚠️  Pattern not found, trying alternative..."
  # Try to find current kotlin version
  CURRENT=$(grep -oP 'kotlinVersion\s*=\s*"\K[^"]+' "$ANDROID_DIR/build.gradle" || echo "not found")
  echo "  Current kotlinVersion: $CURRENT"
  if [ "$CURRENT" != "not found" ]; then
    sed -i "s/kotlinVersion = \"$CURRENT\"/kotlinVersion = \"2.1.0\"/" "$ANDROID_DIR/build.gradle"
    echo "  ✅ Replaced $CURRENT → 2.1.0"
  else
    echo "  ℹ️  Adding kotlinVersion to buildscript ext..."
    sed -i '/buildscript {/,/ext {/ { /ext {/a\        kotlinVersion = "2.1.0"
}' "$ANDROID_DIR/build.gradle"
  fi
fi

# ── 2. Fix gradle.properties for memory ────────────────────────────────────
echo ""
echo "▶ Configuring gradle.properties..."
GRADLE_PROPS="$ANDROID_DIR/gradle/wrapper/gradle-wrapper.properties"

# Set Gradle to a stable version compatible with Kotlin 2.1
if [ -f "$ANDROID_DIR/gradle/wrapper/gradle-wrapper.properties" ]; then
  sed -i 's|gradle-[0-9.]*-bin|gradle-8.6-bin|g' "$GRADLE_PROPS"
  echo "  ✅ Gradle wrapper set to 8.6"
fi

# Increase JVM heap
GRADLE_LOCAL="$ANDROID_DIR/gradle.properties"
if ! grep -q "org.gradle.jvmargs" "$GRADLE_LOCAL" 2>/dev/null; then
  echo "org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m" >> "$GRADLE_LOCAL"
  echo "  ✅ Added JVM args to gradle.properties"
else
  sed -i 's/org.gradle.jvmargs=.*/org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m/' "$GRADLE_LOCAL"
  echo "  ✅ Updated JVM args in gradle.properties"
fi

# ── 3. Set JAVA_HOME and PATH ───────────────────────────────────────────────
echo ""
echo "▶ Configuring Java environment..."
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin
export ANDROID_HOME=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin

java -version 2>&1 | head -1
echo "  ✅ JAVA_HOME = $JAVA_HOME"

# ── 4. Install Android SDK if needed ───────────────────────────────────────
echo ""
echo "▶ Checking Android SDK..."

if [ ! -f "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "  Installing Android command line tools..."
  apt-get install -y unzip wget 2>/dev/null || true
  mkdir -p /opt/android-sdk/cmdline-tools
  cd /tmp
  wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
  unzip -q cmdline-tools.zip -d /opt/android-sdk/cmdline-tools/
  mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest 2>/dev/null || true
  rm -f /tmp/cmdline-tools.zip
  echo "  ✅ Android command line tools installed"
fi

if [ -f "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "  Accepting licenses and installing SDK components..."
  yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses 2>/dev/null || true
  $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
    "platform-tools" \
    "platforms;android-35" \
    "build-tools;35.0.0" 2>/dev/null || true
  echo "  ✅ Android SDK components ready"
fi

# ── 5. Build the APK ───────────────────────────────────────────────────────
echo ""
echo "▶ Building APK (esto puede tardar varios minutos)..."
cd "$ANDROID_DIR"
./gradlew assembleRelease --no-daemon -Dkotlin.daemon.jvm.options="-Xmx1024m" 2>&1 | tail -30

APK_SOURCE=$(find "$ANDROID_DIR/app/build/outputs/apk/release/" -name "*.apk" 2>/dev/null | head -1)
if [ -z "$APK_SOURCE" ]; then
  APK_SOURCE=$(find "$ANDROID_DIR/app/build/outputs/apk/debug/" -name "*.apk" 2>/dev/null | head -1)
fi

if [ -z "$APK_SOURCE" ]; then
  echo ""
  echo "  ❌ APK no encontrado. Revisa los errores de compilación."
  exit 1
fi

echo "  ✅ APK generado: $APK_SOURCE"

# ── 6. Copiar APK al directorio público ────────────────────────────────────
echo ""
echo "▶ Copiando APK al directorio público..."
mkdir -p "$APK_SERVE_DIR"
cp "$APK_SOURCE" "$APK_DEST"
chmod 644 "$APK_DEST"
echo "  ✅ APK disponible en: $APK_DEST"

# ── 7. Configurar Nginx para servir el APK ────────────────────────────────
echo ""
echo "▶ Configurando Nginx para servir el APK..."

NGINX_CONF="/etc/nginx/sites-available/quieromesa"
if [ -f "$NGINX_CONF" ]; then
  # Check if downloads location already exists
  if ! grep -q "location /downloads" "$NGINX_CONF"; then
    # Add before the last closing brace of the server block
    sed -i '/^}/i \    location /downloads {\n        alias /var/www/comandas/public/downloads;\n        add_header Content-Disposition "attachment";\n        add_header Content-Type "application/vnd.android.package-archive";\n        expires -1;\n    }' "$NGINX_CONF" 2>/dev/null || true
    nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
    echo "  ✅ Nginx configurado para servir /downloads"
  else
    echo "  ℹ️  Nginx ya tiene /downloads configurado"
  fi
else
  echo "  ⚠️  Nginx config no encontrada en $NGINX_CONF"
  echo "  Añade manualmente este bloque a tu nginx config:"
  echo ""
  echo "    location /downloads {"
  echo "        alias /var/www/comandas/public/downloads;"
  echo "        add_header Content-Disposition \"attachment\";"
  echo "        add_header Content-Type \"application/vnd.android.package-archive\";"
  echo "        expires -1;"
  echo "    }"
fi

# ── 8. Resumen ─────────────────────────────────────────────────────────────
echo ""
echo "================================================"
echo "  ✅ PROCESO COMPLETADO"
echo "================================================"
echo ""
echo "  APK disponible en:"
echo "    → https://quieromesa.com/downloads/comandas.apk"
echo ""
echo "  Página de descarga:"
echo "    → https://quieromesa.com/instalar-app"
echo ""
echo "  Para actualizar el APK en el futuro:"
echo "    bash fix-android-build.sh"
echo ""
