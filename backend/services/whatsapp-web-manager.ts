import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface WhatsAppSession {
  client: Client;
  isReady: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  qrCode?: string;
  lastQrUpdate?: Date;
  initPromise?: Promise<void>;
  authenticatedAt?: number;
  readyAt?: number;
  consecutiveFailures: number;
}

const sessions = new Map<string, WhatsAppSession>();
const qrCallbacks = new Map<string, (qr: string) => void>();
const initializationLocks = new Map<string, Promise<void>>();
const initCooldowns = new Map<string, number>();
const INIT_COOLDOWN_MS = 15000;
const AUTH_TO_READY_TIMEOUT_MS = 90000;
const MAX_CONSECUTIVE_FAILURES = 3;

export function getSessionPath(restaurantId: string): string {
  const prefix = restaurantId.startsWith('admin-') ? 'admin' : 'rest';
  const sessionName = `${prefix}-${restaurantId.replace('admin-', '')}`;
  return path.join(process.cwd(), 'whatsapp-sessions', restaurantId, `session-${sessionName}`);
}

async function killExistingChromeProcesses(restaurantId: string): Promise<void> {
  try {
    const sessionDir = path.join(process.cwd(), 'whatsapp-sessions', restaurantId);
    
    console.log(`[WhatsApp Manager] 🔪 Matando procesos Chrome para sesión: ${restaurantId}`);
    
    let killed = false;

    // Method 1: pkill by restaurant ID in command line (most reliable)
    try {
      execSync(`pkill -9 -f "${restaurantId}" 2>/dev/null || true`, { stdio: 'pipe' });
      killed = true;
    } catch { }

    // Method 2: pkill by session directory path
    try {
      execSync(`pkill -9 -f "${sessionDir}" 2>/dev/null || true`, { stdio: 'pipe' });
      killed = true;
    } catch { }

    // Method 3: grep-based fallback for any remaining chrome/puppeteer processes
    try {
      const result = execSync(
        `ps aux | grep -E "(chrom|puppeteer)" | grep "${restaurantId}" | grep -v grep | awk '{print $2}' 2>/dev/null || true`,
        { stdio: 'pipe', encoding: 'utf-8' }
      ).trim();
      if (result) {
        const pids = result.split('\n').filter(Boolean);
        for (const pid of pids) {
          try { execSync(`kill -9 ${pid} 2>/dev/null || true`, { stdio: 'pipe' }); killed = true; } catch { }
        }
      }
    } catch { }

    if (killed) {
      console.log(`[WhatsApp Manager] ✅ Procesos Chrome eliminados para ${restaurantId}`);
    } else {
      console.log(`[WhatsApp Manager] ℹ️ No hay procesos Chrome activos para ${restaurantId}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, killed ? 3000 : 500));
  } catch (error) {
    console.warn(`[WhatsApp Manager] ⚠️ Error matando procesos:`, error);
  }
}

async function cleanupChromeLock(sessionPath: string): Promise<void> {
  try {
    const lockFileNames = ['SingletonLock', 'lockfile', 'SingletonSocket', 'SingletonCookie'];

    // The restaurant directory is the parent of sessionPath
    // e.g. {cwd}/whatsapp-sessions/{restaurantId}/session-XXX -> parent = {cwd}/whatsapp-sessions/{restaurantId}
    const restaurantDir = path.dirname(sessionPath);

    console.log(`[WhatsApp Manager] 🔍 Limpiando locks en: ${restaurantDir}`);

    // Collect ALL directories recursively under the restaurant dir (covers any session variant)
    const dirsToCheck = new Set<string>();
    const scanDirsRecursively = (dir: string, depth: number = 0) => {
      if (depth > 5) return;
      dirsToCheck.add(dir);
      try {
        if (fs.existsSync(dir)) {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              scanDirsRecursively(path.join(dir, entry.name), depth + 1);
            }
          }
        }
      } catch { }
    };

    scanDirsRecursively(restaurantDir);

    let cleaned = 0;
    for (const dir of dirsToCheck) {
      for (const lockName of lockFileNames) {
        const lockPath = path.join(dir, lockName);
        try {
          // lstat detects broken symlinks (Linux SingletonLock is a symlink)
          fs.lstatSync(lockPath);
          fs.unlinkSync(lockPath);
          console.log(`[WhatsApp Manager] 🧹 Eliminado lock: ${lockPath}`);
          cleaned++;
        } catch { }
      }
    }

    // Shell-based fallback: run separate find -delete per filename to avoid -o precedence issues
    for (const name of lockFileNames) {
      try {
        execSync(`find "${restaurantDir}" -name '${name}' -delete 2>/dev/null || true`, { stdio: 'pipe' });
      } catch { }
    }

    if (cleaned > 0) {
      console.log(`[WhatsApp Manager] ✅ Eliminados ${cleaned} archivos de lock`);
    } else {
      console.log(`[WhatsApp Manager] ℹ️ No se encontraron lockfiles en ${restaurantDir}`);
    }

  } catch (error) {
    console.warn(`[WhatsApp Manager] ⚠️ No se pudo limpiar locks:`, error);
  }
}

export async function initializeWhatsAppForRestaurant(restaurantId: string, forceRestart: boolean = false): Promise<void> {
  const existingSession = sessions.get(restaurantId);
  
  if (existingSession?.isReady && !forceRestart) {
    console.log(`[WhatsApp Manager] Sesión para ${restaurantId} ya está lista`);
    return;
  }

  const existingLock = initializationLocks.get(restaurantId);
  if (existingLock && !forceRestart) {
    console.log(`[WhatsApp Manager] Sesión para ${restaurantId} ya se está inicializando, esperando...`);
    try {
      await existingLock;
    } catch { }
    const session = sessions.get(restaurantId);
    if (session?.isReady) {
      console.log(`[WhatsApp Manager] ✅ Sesión ready después de esperar`);
      return;
    }
    return;
  }

  const lastInitTime = initCooldowns.get(restaurantId) || 0;
  const now = Date.now();
  if (!forceRestart && now - lastInitTime < INIT_COOLDOWN_MS) {
    const remainingSecs = Math.ceil((INIT_COOLDOWN_MS - (now - lastInitTime)) / 1000);
    console.log(`[WhatsApp Manager] ⏳ Cooldown activo para ${restaurantId}, ${remainingSecs}s restantes`);
    return;
  }

  initCooldowns.set(restaurantId, now);

  const initPromise = doInitializeSession(restaurantId, forceRestart);
  initializationLocks.set(restaurantId, initPromise);
  
  try {
    await initPromise;
  } finally {
    if (initializationLocks.get(restaurantId) === initPromise) {
      initializationLocks.delete(restaurantId);
    }
  }
}

async function doInitializeSession(restaurantId: string, forceRestart: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const run = async () => {
      if (forceRestart) {
        const oldSession = sessions.get(restaurantId);
        if (oldSession) {
          try {
            await oldSession.client.destroy();
          } catch {
            // ignore
          }
          sessions.delete(restaurantId);
        }
      }

      const sessionPath = getSessionPath(restaurantId);
      const parentDir = path.dirname(sessionPath);
      
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      await killExistingChromeProcesses(restaurantId);
      await cleanupChromeLock(sessionPath);

      console.log(`[WhatsApp Manager] Inicializando sesión para ${restaurantId}...`);

      const chromePaths = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
      ].filter(Boolean);

      let executablePath = chromePaths.find(p => {
        try {
          return p && fs.existsSync(p as string);
        } catch {
          return false;
        }
      });

      if (!executablePath) {
        console.error('[WhatsApp Manager] ❌ No se encontró ningún ejecutable de Chrome/Chromium');
        reject(new Error('Chrome/Chromium no encontrado'));
        return;
      }

      console.log(`[WhatsApp Manager] Usando Chrome en: ${executablePath}`);

      const prefix = restaurantId.startsWith('admin-') ? 'admin' : 'rest';
      const sessionName = `${prefix}-${restaurantId.replace('admin-', '')}`;
      
      const puppeteerOptions: any = {
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process',
          `--user-data-dir=${sessionPath}`,
          `--profile-directory=${sessionName}`,
        ],
      };

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: restaurantId,
          dataPath: path.dirname(sessionPath),
        }),
        puppeteer: puppeteerOptions,
      });

      const existingFailures = sessions.get(restaurantId)?.consecutiveFailures || 0;
      
      const session: WhatsAppSession = {
        client,
        isReady: false,
        isInitializing: true,
        isAuthenticated: false,
        consecutiveFailures: existingFailures,
      };

      sessions.set(restaurantId, session);
      let resolved = false;

      const doResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      const doReject = (err: Error) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      };

      client.on('qr', async (qr) => {
        console.log(`[WhatsApp Manager] 📱 Código QR generado para ${restaurantId}`);
        
        try {
          const qrDataUrl = await qrcode.toDataURL(qr);
          session.qrCode = qrDataUrl;
          session.lastQrUpdate = new Date();
          
          const callback = qrCallbacks.get(restaurantId);
          if (callback) {
            callback(qrDataUrl);
          }
        } catch (error) {
          console.error(`[WhatsApp Manager] Error generando QR para ${restaurantId}:`, error);
        }
      });

      client.on('authenticated', () => {
        console.log(`[WhatsApp Manager] ✅ ${restaurantId} autenticado correctamente`);
        session.qrCode = undefined;
        session.isAuthenticated = true;
        session.authenticatedAt = Date.now();
        
        const pollReadyState = async () => {
          const pollInterval = 5000;
          const maxPolls = Math.floor(AUTH_TO_READY_TIMEOUT_MS / pollInterval);
          let pollCount = 0;
          
          while (pollCount < maxPolls && !session.isReady && session.isInitializing) {
            pollCount++;
            await new Promise(r => setTimeout(r, pollInterval));
            
            if (session.isReady) {
              console.log(`[WhatsApp Manager] ✅ ${restaurantId}: ready detectado durante polling`);
              return;
            }
            
            try {
              const state = await Promise.race([
                client.getState(),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
              ]);
              
              if (state === 'CONNECTED') {
                console.log(`[WhatsApp Manager] ✅ ${restaurantId}: Estado CONNECTED detectado via getState() tras ${pollCount * pollInterval / 1000}s. Forzando ready.`);
                session.isReady = true;
                session.isInitializing = false;
                session.readyAt = Date.now();
                session.consecutiveFailures = 0;
                doResolve();
                return;
              } else if (state) {
                console.log(`[WhatsApp Manager] 🔍 ${restaurantId}: Estado actual: ${state} (poll ${pollCount}/${maxPolls})`);
              }
            } catch {
              if (pollCount <= 3) {
                console.log(`[WhatsApp Manager] 🔍 ${restaurantId}: getState() no disponible aún (poll ${pollCount}/${maxPolls})`);
              }
            }
          }
          
          if (!session.isReady && session.isInitializing) {
            console.warn(`[WhatsApp Manager] ⚠️ ${restaurantId}: Autenticado hace ${AUTH_TO_READY_TIMEOUT_MS / 1000}s pero 'ready' nunca llegó y estado no es CONNECTED. Forzando reinicio...`);
            session.isInitializing = false;
            session.isAuthenticated = false;
            session.consecutiveFailures++;
            
            try {
              client.destroy().catch(() => {});
            } catch { }
            sessions.delete(restaurantId);
            
            void killExistingChromeProcesses(restaurantId).then(() => {
              const sp = getSessionPath(restaurantId);
              void cleanupChromeLock(sp);
            });
            
            doResolve();
          }
        };
        
        pollReadyState().catch((err) => {
          console.error(`[WhatsApp Manager] ❌ Error en pollReadyState para ${restaurantId}:`, err);
        });
      });

      client.on('ready', () => {
        console.log(`[WhatsApp Manager] ✅ ${restaurantId} listo para enviar mensajes`);
        session.isReady = true;
        session.isInitializing = false;
        session.isAuthenticated = true;
        session.qrCode = undefined;
        session.readyAt = Date.now();
        session.consecutiveFailures = 0;
        
        if (session.authenticatedAt) {
          const timeSinceAuth = Date.now() - session.authenticatedAt;
          console.log(`[WhatsApp Manager] ⏱️ ${restaurantId}: ready ${timeSinceAuth}ms después de autenticación`);
        }
        
        doResolve();
      });

      client.on('disconnected', (reason) => {
        console.log(`[WhatsApp Manager] ❌ ${restaurantId} desconectado:`, reason);
        session.isReady = false;
        session.isInitializing = false;
        session.qrCode = undefined;
        sessions.delete(restaurantId);
        doResolve();
      });

      client.on('auth_failure', (msg) => {
        console.error(`[WhatsApp Manager] ❌ Error de autenticación para ${restaurantId}:`, msg);
        session.isReady = false;
        session.isInitializing = false;
        session.qrCode = undefined;
        sessions.delete(restaurantId);
        doReject(new Error('Error de autenticación'));
      });

      client.initialize().catch(async (error) => {
        const errorMsg = error?.message || String(error);
        console.error(`[WhatsApp Manager] ❌ Error al inicializar ${restaurantId}:`, errorMsg);
        session.isReady = false;
        session.isInitializing = false;
        session.qrCode = undefined;
        sessions.delete(restaurantId);

        // Specific handling for Chrome "already running" / lockfile error
        const isLockfileError = errorMsg.includes('already running') || errorMsg.includes('lockfile');
        if (isLockfileError) {
          console.log(`[WhatsApp Manager] 🔓 Error de lockfile detectado para ${restaurantId}. Limpieza agresiva...`);
          try {
            // Kill any chrome processes more aggressively
            try { execSync(`pkill -9 -f "${restaurantId}" 2>/dev/null || true`, { stdio: 'pipe' }); } catch { }
            try { execSync(`pkill -9 -f "chromium" 2>/dev/null || true`, { stdio: 'pipe' }); } catch { }
            await new Promise(r => setTimeout(r, 2000));

            // Clean locks in ALL possible paths
            const restaurantDir = path.dirname(sessionPath);
            const lockNames = ['SingletonLock', 'lockfile', 'SingletonSocket', 'SingletonCookie'];
            for (const name of lockNames) {
              try { execSync(`find "${restaurantDir}" -name '${name}' -delete 2>/dev/null || true`, { stdio: 'pipe' }); } catch { }
            }
            console.log(`[WhatsApp Manager] ✅ Limpieza agresiva completada para ${restaurantId}`);
          } catch (cleanupErr) {
            console.error(`[WhatsApp Manager] Error en limpieza agresiva:`, cleanupErr);
          }
          // Clear cooldown so worker can retry sooner
          initCooldowns.delete(restaurantId);
          doResolve();
          return;
        }
        
        await killExistingChromeProcesses(restaurantId);
        await cleanupChromeLock(sessionPath);
        
        doReject(error);
      });

      setTimeout(() => {
        if (!session.isReady && session.isInitializing) {
          console.warn(`[WhatsApp Manager] ⚠️ Timeout para ${restaurantId}: El cliente no se conectó en 2 minutos`);
          session.isInitializing = false;
          session.consecutiveFailures++;
          console.log(`[WhatsApp Manager] 📊 ${restaurantId}: Fallos consecutivos tras timeout: ${session.consecutiveFailures}`);
          
          // Apply a long cooldown (5 min) so the worker doesn't re-spin Chrome immediately
          const longCooldown = 5 * 60 * 1000;
          initCooldowns.set(restaurantId, Date.now() + longCooldown - INIT_COOLDOWN_MS);
          console.log(`[WhatsApp Manager] ⏳ ${restaurantId}: Cooldown de 5 minutos aplicado tras timeout de QR`);
          
          try {
            client.destroy().catch(() => {});
          } catch { }
          sessions.delete(restaurantId);
          
          void killExistingChromeProcesses(restaurantId).then(() => {
            const sp = getSessionPath(restaurantId);
            void cleanupChromeLock(sp);
            // Also clean locks in the entire session directory
            const sessionDir = path.join(process.cwd(), 'whatsapp-sessions', restaurantId);
            void cleanupChromeLock(sessionDir);
          });
          
          doResolve();
        }
      }, 120000);
    };
    run().catch(reject);
  });
}

export function getSessionStatus(restaurantId: string): {
  isReady: boolean;
  isInitializing: boolean;
  qrCode?: string;
  hasSession: boolean;
  authenticated: boolean;
} {
  const session = sessions.get(restaurantId);
  
  if (!session) {
    const sessionPath = getSessionPath(restaurantId);
    const hasPersistedSession = fs.existsSync(path.join(sessionPath, 'session'));
    
    return {
      isReady: false,
      isInitializing: false,
      hasSession: hasPersistedSession,
      authenticated: false,
    };
  }

  return {
    isReady: session.isReady,
    isInitializing: session.isInitializing,
    qrCode: session.qrCode,
    hasSession: true,
    authenticated: session.isReady,
  };
}

export function onQrCodeUpdate(restaurantId: string, callback: (qr: string) => void): void {
  qrCallbacks.set(restaurantId, callback);
}

export function removeQrCodeCallback(restaurantId: string): void {
  qrCallbacks.delete(restaurantId);
}

export async function sendWhatsAppViaRestaurant(
  restaurantId: string,
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let session = sessions.get(restaurantId);

    if (!session || !session.isReady) {
      const currentSession = sessions.get(restaurantId);
      const shouldForceRestart = currentSession && currentSession.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
      
      if (shouldForceRestart) {
        console.warn(`[WhatsApp Manager] 🔄 ${restaurantId}: ${currentSession.consecutiveFailures} fallos consecutivos, forzando reinicio completo...`);
        try {
          await currentSession.client.destroy().catch(() => {});
        } catch { }
        sessions.delete(restaurantId);
        await killExistingChromeProcesses(restaurantId);
        const sp = getSessionPath(restaurantId);
        await cleanupChromeLock(sp);
        initializationLocks.delete(restaurantId);
        initCooldowns.delete(restaurantId);
      }
      
      console.warn(`[WhatsApp Manager] Sesión de ${restaurantId} no está lista. Intentando inicializar${shouldForceRestart ? ' (forzado)' : ''}...`);
      
      try {
        await initializeWhatsAppForRestaurant(restaurantId, shouldForceRestart);
      } catch (error) {
        console.error(`[WhatsApp Manager] No se pudo inicializar sesión para ${restaurantId}:`, error);
        return { 
          success: false, 
          error: 'session_not_ready' 
        };
      }

      const maxWaitTime = 45000;
      const checkInterval = 2000;
      let waitedTime = 0;
      
      while (waitedTime < maxWaitTime) {
        session = sessions.get(restaurantId);
        if (session?.isReady) {
          console.log(`[WhatsApp Manager] ✅ Sesión ready después de ${waitedTime}ms`);
          break;
        }
        
        if (session?.isAuthenticated && waitedTime > 10000) {
          try {
            const state = await Promise.race([
              session.client.getState(),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
            ]);
            if (state === 'CONNECTED') {
              console.log(`[WhatsApp Manager] ✅ Sesión CONNECTED detectada via getState() después de ${waitedTime}ms. Forzando ready.`);
              session.isReady = true;
              session.isInitializing = false;
              session.readyAt = Date.now();
              session.consecutiveFailures = 0;
              break;
            }
          } catch { }
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitedTime += checkInterval;
      }
      
      session = sessions.get(restaurantId);
      if (!session || !session.isReady) {
        console.warn(`[WhatsApp Manager] ⚠️ Sesión no está ready después de ${waitedTime}ms`);
        if (session) {
          session.consecutiveFailures = (session.consecutiveFailures || 0) + 1;
          console.log(`[WhatsApp Manager] 📊 ${restaurantId}: Fallos consecutivos: ${session.consecutiveFailures}`);
        }
        return { 
          success: false, 
          error: 'session_not_ready'
        };
      }
    }

    let phoneNumber = to.replace(/[^0-9]/g, '');
    
    if (!phoneNumber.startsWith('34') && phoneNumber.length === 9) {
      phoneNumber = '34' + phoneNumber;
    }

    const chatId = `${phoneNumber}@c.us`;

    console.log(`[WhatsApp Manager] Enviando mensaje de ${restaurantId} a ${chatId}`);

    try {
      await session.client.sendMessage(chatId, message, { sendSeen: false });
      console.log(`[WhatsApp Manager] ✅ Mensaje enviado exitosamente por ${restaurantId}`);
      return { success: true };
    } catch (sendError: any) {
      const errorMsg = sendError?.message || String(sendError);
      console.error(`[WhatsApp Manager] Error al enviar mensaje:`, errorMsg);
      
      const isRecipientError = errorMsg.includes('No LID for user') || 
                               errorMsg.includes('number is not registered') ||
                               errorMsg.includes('not a valid WhatsApp');
      
      if (isRecipientError) {
        console.log(`[WhatsApp Manager] ⚠️ El destinatario ${chatId} no tiene WhatsApp o el número es inválido. Sesión NO se destruye.`);
        return { 
          success: false, 
          error: 'recipient_not_on_whatsapp'
        };
      }
      
      const isProtocolError = errorMsg.includes('Protocol error') || 
                              errorMsg.includes('Target closed') ||
                              errorMsg.includes('getChat') ||
                              errorMsg.includes('detached Frame') ||
                              errorMsg.includes('detached frame') ||
                              errorMsg.includes('Execution context was destroyed') ||
                              errorMsg.includes('Cannot read properties of null') ||
                              errorMsg.includes('Session closed') ||
                              errorMsg.includes('browser has been closed');
      
      if (isProtocolError) {
        console.log(`[WhatsApp Manager] 🔄 Error de protocolo/frame detached, marcando sesión para reinicio...`);
        session.isReady = false;
        session.isInitializing = false;
        sessions.delete(restaurantId);
        initCooldowns.delete(restaurantId);
        
        try {
          await session.client.destroy();
        } catch {
          // ignore
        }
        
        await killExistingChromeProcesses(restaurantId);
        const sessionPath = getSessionPath(restaurantId);
        await cleanupChromeLock(sessionPath);
        
        void initializeWhatsAppForRestaurant(restaurantId, true).catch(() => {});
        
        return { 
          success: false, 
          error: 'session_disconnected'
        };
      }
      
      console.log(`[WhatsApp Manager] ❌ Error desconocido al enviar, destruyendo sesión`);
      session.isReady = false;
      session.isInitializing = false;
      sessions.delete(restaurantId);
      initCooldowns.delete(restaurantId);
      
      try {
        await session.client.destroy();
      } catch {
        // ignore
      }
      
      await killExistingChromeProcesses(restaurantId);
      
      void initializeWhatsAppForRestaurant(restaurantId, true).catch(() => {});
      
      return { 
        success: false, 
        error: 'session_disconnected'
      };
    }
  } catch (error: any) {
    console.error(`[WhatsApp Manager] Error al enviar mensaje desde ${restaurantId}:`, error?.message || error);
    return { 
      success: false, 
      error: error?.message || 'Error desconocido al enviar WhatsApp' 
    };
  }
}

export async function forceResetSession(restaurantId: string): Promise<void> {
  console.log(`[WhatsApp Manager] 🔄 Forzando reset completo para ${restaurantId}`);

  const session = sessions.get(restaurantId);
  if (session) {
    try {
      await session.client.destroy().catch(() => {});
    } catch { }
    sessions.delete(restaurantId);
  }

  initializationLocks.delete(restaurantId);
  initCooldowns.delete(restaurantId);
  qrCallbacks.delete(restaurantId);

  await killExistingChromeProcesses(restaurantId);

  const sessionPath = getSessionPath(restaurantId);
  const parentDir = path.dirname(sessionPath);

  if (fs.existsSync(sessionPath)) {
    try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch { }
  }
  if (fs.existsSync(parentDir)) {
    try { fs.rmSync(parentDir, { recursive: true, force: true }); } catch { }
  }

  console.log(`[WhatsApp Manager] ✅ Reset completo para ${restaurantId}`);
}

export async function disconnectRestaurantSession(restaurantId: string): Promise<void> {
  const session = sessions.get(restaurantId);
  
  if (session) {
    try {
      await session.client.destroy();
    } catch (error) {
      console.error(`[WhatsApp Manager] Error al desconectar ${restaurantId}:`, error);
    }
    sessions.delete(restaurantId);
  }

  const sessionPath = getSessionPath(restaurantId);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }

  console.log(`[WhatsApp Manager] ✅ Sesión de ${restaurantId} eliminada`);
}

export async function initializeAllActiveSessions(db: any): Promise<void> {
  try {
    const result = await db.query(
      'SELECT id FROM restaurants WHERE use_whatsapp_web = true'
    );

    console.log(`[WhatsApp Manager] Inicializando ${result.rows.length} sesiones activas...`);

    for (const row of result.rows) {
      const restaurantId = row.id;
      const sessionPath = getSessionPath(restaurantId);
      
      if (fs.existsSync(path.join(sessionPath, 'session'))) {
        console.log(`[WhatsApp Manager] Inicializando sesión persistida para ${restaurantId}...`);
        initializeWhatsAppForRestaurant(restaurantId).catch((error) => {
          console.error(`[WhatsApp Manager] Error inicializando ${restaurantId}:`, error);
        });
      }
    }
  } catch (error) {
    console.error('[WhatsApp Manager] Error inicializando sesiones activas:', error);
  }
}
