import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import apiApp from './hono';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { initializeAllActiveSessions } from './services/whatsapp-web-manager';
import { WhatsAppNotificationWorker } from './services/whatsapp-notification-worker';
import { PendingReservationCleanup } from './services/pending-reservation-cleanup';
import { SubscriptionExpiryWorker } from './services/subscription-expiry-worker';
import { BackupWorker } from './services/backup-worker';
import { TemporaryTablesCleanupWorker } from './services/temporary-tables-cleanup-worker';
import { OldReservationsCleanupWorker } from './services/old-reservations-cleanup-worker';
import { startWaitlistWorker } from './services/waitlist-worker';
import { createContext, getPoolInstance } from './trpc/create-context';

const envPaths = [join(process.cwd(), 'env'), join(process.cwd(), '.env')];
let envLoaded = false;

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
    console.log(`✅ Variables de entorno cargadas desde ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('⚠️ Archivo env/.env no encontrado');
}

const mainApp = new Hono();

mainApp.use('*', cors({
  origin: '*',
  credentials: true,
  allowHeaders: ['*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

mainApp.use('*', async (c, next) => {
  const userAgent = c.req.header('user-agent') || '';
  const isInAppBrowser = /instagram|FBAN|FBAV/i.test(userAgent);
  
  if (isInAppBrowser) {
    console.log('🔍 Petición desde Instagram/Facebook detectada:', c.req.path);
  }
  
  await next();
  
  if (c.req.path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || c.req.path.includes('/uploads/')) {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Cross-Origin-Resource-Policy', 'cross-origin');
    c.header('Referrer-Policy', 'no-referrer-when-downgrade');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    c.header('X-Content-Type-Options', 'nosniff');
    
    if (isInAppBrowser) {
      c.header('Vary', 'User-Agent');
      c.header('X-Robots-Tag', 'noindex');
    }
  }
});

mainApp.get('/api/backups/download/:filename', async (c) => {
  const filename = c.req.param('filename');
  const filePath = join('/var/backups/reservamesa', filename);
  
  if (!existsSync(filePath)) {
    return c.text('File not found', 404);
  }

  const file = Bun.file(filePath);
  return new Response(file, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

mainApp.route('/api', apiApp);

mainApp.get('/downloads/*', async (c) => {
  const reqPath = c.req.path;
  const filename = reqPath.replace('/downloads/', '');
  const filePath = join(process.cwd(), 'downloads', filename);

  if (!existsSync(filePath)) {
    console.log('⚠️ Descarga no encontrada:', filePath);
    return c.text('File not found', 404);
  }

  const file = Bun.file(filePath);
  const ext = filename.split('.').pop()?.toLowerCase();

  let contentType = 'application/octet-stream';
  if (ext === 'apk') contentType = 'application/vnd.android.package-archive';
  else if (ext === 'exe') contentType = 'application/vnd.microsoft.portable-executable';
  else if (ext === 'zip') contentType = 'application/zip';
  else if (ext === 'pdf') contentType = 'application/pdf';

  console.log(`📦 [DOWNLOADS] Sirviendo: ${filename} (${contentType})`);
  return new Response(file, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

const distPath = join(process.cwd(), 'dist');
const indexPath = join(distPath, 'index.html');

if (existsSync(distPath)) {
  console.log('📁 Sirviendo archivos estáticos desde:', distPath);
  
  mainApp.use('/_expo/*', serveStatic({ root: './dist' }));
  mainApp.use('/assets/*', serveStatic({ root: './dist' }));
  mainApp.get('/uploads/*', async (c) => {
    const path = c.req.path;
    const filePath = join(process.cwd(), path);
    
    if (!existsSync(filePath)) {
      console.log('⚠️ Imagen no encontrada:', path);
      return c.text('Image not found', 404);
    }
    
    const file = Bun.file(filePath);
    const ext = path.split('.').pop()?.toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'svg') contentType = 'image/svg+xml';
    
    const userAgent = c.req.header('user-agent') || '';
    const isInAppBrowser = /instagram|FBAN|FBAV/i.test(userAgent);
    
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Referrer-Policy': 'no-referrer-when-downgrade',
        'Cache-Control': isInAppBrowser ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'User-Agent',
      },
    });
  });
  mainApp.use('/favicon.ico', serveStatic({ path: './dist/favicon.ico' }));
  
  mainApp.get('*', (c) => {
    if (existsSync(indexPath)) {
      const userAgent = c.req.header('user-agent') || '';
      const isInAppBrowser = /instagram|FBAN|FBAV|FB_IAB|FB4A/i.test(userAgent);
      
      if (isInAppBrowser) {
        const currentUrl = `https://${c.req.header('host')}${c.req.path}`;
        const redirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirigiendo...</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 {
      font-size: 24px;
      margin: 0 0 10px;
    }
    p {
      font-size: 16px;
      opacity: 0.9;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>Abriendo en navegador...</h1>
    <p>Un momento por favor</p>
  </div>
  <script>
    (function() {
      const targetUrl = '${currentUrl}';
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // Detectar si es iOS
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
      
      // Intentar múltiples métodos de redirección
      function openInBrowser() {
        // Método 1: Intent URL para Android
        if (!isIOS && /android/i.test(userAgent)) {
          const intentUrl = 'intent://' + targetUrl.replace(/^https?:\/\//, '') + '#Intent;scheme=https;action=android.intent.action.VIEW;end';
          window.location.href = intentUrl;
          
          // Fallback después de 1 segundo
          setTimeout(function() {
            window.location.href = targetUrl;
          }, 1000);
          return;
        }
        
        // Método 2: Para iOS - usar googlechrome:// o x-safari-https://
        if (isIOS) {
          // Intentar abrir en Safari
          const safariUrl = targetUrl.replace('https://', 'x-safari-https://');
          window.location.href = safariUrl;
          
          // Fallback
          setTimeout(function() {
            window.location.href = targetUrl;
          }, 1000);
          return;
        }
        
        // Método 3: Abrir ventana nueva (puede funcionar en algunos casos)
        const newWindow = window.open(targetUrl, '_blank');
        if (!newWindow) {
          window.location.href = targetUrl;
        }
      }
      
      // Ejecutar inmediatamente
      setTimeout(openInBrowser, 100);
      
      // Intentar de nuevo si no funcionó
      setTimeout(function() {
        if (document.visibilityState === 'visible') {
          window.location.href = targetUrl;
        }
      }, 2000);
    })();
  </script>
</body>
</html>`;
        return c.html(redirectHtml);
      }
      
      const html = readFileSync(indexPath, 'utf-8');
      return c.html(html);
    }
    return c.text('Frontend not found', 404);
  });
} else {
  console.log('⚠️ Carpeta dist/ no encontrada. Solo API disponible.');
  mainApp.get('/', (c) => {
    return c.json({ 
      status: 'ok', 
      message: 'ReservaMesa API',
      endpoints: {
        health: '/api/health',
        trpc: '/api/trpc',
      }
    });
  });
}

const port = parseInt(process.env.PORT || '3000', 10);

console.log('✅ Variables de entorno cargadas');
console.log(`🗄️ DATABASE_URL: ${process.env.DATABASE_URL ? 'configurada' : '❌ FALTA'}`);
console.log(`📧 RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'configurada (opcional)' : 'no configurada'}`);
console.log(`🌐 API URL: ${process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'no configurada'}`);
console.log(`🚀 Iniciando servidor en puerto ${port}...`);

const initContext = createContext({ req: {} as any, resHeaders: new Headers() });
initContext.then((ctx) => {
  initializeAllActiveSessions(ctx.db).catch((error) => {
    console.error('⚠️ Error al inicializar sesiones de WhatsApp Web:', error);
  });

  const pool = getPoolInstance();
  const notificationWorker = new WhatsAppNotificationWorker(pool);
  notificationWorker.start();
  console.log('✅ Worker de notificaciones WhatsApp iniciado');

  const cleanupWorker = new PendingReservationCleanup(pool);
  cleanupWorker.start(1);
  console.log('✅ Worker de limpieza de reservas pendientes iniciado');
  
  const { startAutoRatingWorker } = require('./services/auto-rating-worker');
  startAutoRatingWorker();
  console.log('✅ Worker de auto-valoración iniciado');
  
  const { startReservationCompletionWorker } = require('./services/reservation-completion-worker');
  startReservationCompletionWorker();
  console.log('✅ Worker de completado de reservas iniciado');
  
  const expiryWorker = new SubscriptionExpiryWorker(pool);
  expiryWorker.start();

  const backupWorker = new BackupWorker();
  backupWorker.start();
  console.log('✅ Worker de alertas de caducidad iniciado');

  const tempTablesCleanupWorker = new TemporaryTablesCleanupWorker(pool);
  tempTablesCleanupWorker.start(60); // Cada hora
  console.log('✅ Worker de limpieza de mesas temporales iniciado');

  const oldReservationsCleanupWorker = new OldReservationsCleanupWorker(pool);
  oldReservationsCleanupWorker.start(24); // Una vez al día
  console.log('✅ Worker de limpieza de reservas antiguas (>10 días) iniciado');

  startWaitlistWorker(pool);
  console.log('✅ Worker de lista de espera iniciado');
});

export default {
  port,
  hostname: '0.0.0.0',
  fetch: mainApp.fetch,
};

console.log(`✅ Servidor corriendo en http://0.0.0.0:${port}`);
if (existsSync(distPath)) {
  console.log(`🌐 Frontend disponible en http://0.0.0.0:${port}`);
}
console.log(`📡 API disponible en http://0.0.0.0:${port}/api`);
console.log(`🔧 tRPC endpoint: http://0.0.0.0:${port}/api/trpc`);
console.log(`🏥 Health check: http://0.0.0.0:${port}/api/health`);
