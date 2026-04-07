import { initializeWhatsAppClient, isWhatsAppReady } from '../services/whatsapp-web';

console.log('='.repeat(60));
console.log('🚀 INICIANDO WHATSAPP WEB CLIENT');
console.log('='.repeat(60));
console.log('');
console.log('Este script iniciará WhatsApp Web y mostrará un código QR');
console.log('que debes escanear con tu teléfono para vincular el dispositivo.');
console.log('');
console.log('📱 Pasos:');
console.log('  1. Abre WhatsApp en tu teléfono');
console.log('  2. Ve a: Configuración > Dispositivos vinculados');
console.log('  3. Toca "Vincular un dispositivo"');
console.log('  4. Escanea el código QR que aparecerá abajo');
console.log('');
console.log('⏳ Iniciando...');
console.log('');

initializeWhatsAppClient()
  .then(() => {
    console.log('');
    console.log('✅ WhatsApp Web está listo!');
    console.log('');
    console.log('El cliente se mantendrá ejecutándose en segundo plano.');
    console.log('La sesión se guardará en la carpeta "whatsapp-session"');
    console.log('No necesitarás escanear el código QR de nuevo.');
    console.log('');
    console.log('Presiona Ctrl+C para salir');
    console.log('');
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Error al inicializar WhatsApp Web:', error);
    console.error('');
    process.exit(1);
  });

setInterval(() => {
  if (isWhatsAppReady()) {
    process.stdout.write('.');
  } else {
    process.stdout.write('x');
  }
}, 5000);

process.on('SIGINT', () => {
  console.log('');
  console.log('');
  console.log('👋 Cerrando WhatsApp Web...');
  process.exit(0);
});
