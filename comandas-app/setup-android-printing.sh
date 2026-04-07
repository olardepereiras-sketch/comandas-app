#!/bin/bash
# ============================================================
#  QuieroMesa Comandas App - Setup Impresión Android
#  Ejecutar en el directorio: /var/www/comandas/comandas-app
# ============================================================
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
echo ""
echo "============================================"
echo "  QuieroMesa - Setup Impresión Android"
echo "============================================"
echo ""
echo "Directorio: $APP_DIR"
echo ""

cd "$APP_DIR"

echo "▶ Instalando dependencias de impresión..."
npm install react-native-tcp-socket@6.2.0 --save
npm install @react-native-async-storage/async-storage --save

echo ""
echo "▶ Generando proyecto nativo Android..."
npx expo prebuild --platform android --clean

echo ""
echo "▶ Compilando APK (modo debug)..."
cd android
./gradlew assembleDebug

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
  echo ""
  echo "============================================"
  echo "  ✅ APK generado correctamente"
  echo "============================================"
  echo ""
  echo "  Ruta: $APP_DIR/android/$APK_PATH"
  echo ""
  echo "  Pasos siguientes:"
  echo "  1. Descarga el APK con WinSCP o scp"
  echo "  2. Instálalo en la tablet Android"
  echo "     (Activar 'Orígenes desconocidos' en Ajustes)"
  echo "  3. Abre la app → Monitor Cocina"
  echo "  4. Pulsa el botón ⚙ Ajustes → Impresoras"
  echo "  5. Añade tus impresoras con su IP y nombre"
  echo "     - Impresoras con nombre 'Cocina' → platos"
  echo "     - Impresoras con nombre 'Barra' → bebidas"
  echo "  6. Pulsa ⚡ Test para verificar conexión"
  echo "  7. ¡Listo! Pulsa 🖨 en cualquier comanda"
  echo ""
else
  echo ""
  echo "  ⚠ APK no encontrado en $APK_PATH"
  echo "  Comprueba los logs de error de Gradle."
fi
