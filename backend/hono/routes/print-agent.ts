import { Hono } from 'hono';
import { getPoolInstance } from '../../trpc/create-context';

const app = new Hono();

async function getRestaurantIdFromToken(token: string): Promise<string | null> {
  try {
    const pool = getPoolInstance();
    const result = await pool.query(
      `SELECT restaurant_id FROM comandas_access_tokens WHERE token = $1`,
      [token]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].restaurant_id as string;
  } catch {
    return null;
  }
}

async function ensureTables(): Promise<void> {
  const pool = getPoolInstance();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comanda_print_jobs (
      id SERIAL PRIMARY KEY,
      restaurant_id VARCHAR(255) NOT NULL,
      printer_ip VARCHAR(100) NOT NULL DEFAULT '',
      printer_port INTEGER DEFAULT 9100,
      printer_name VARCHAR(255),
      printer_type VARCHAR(20) DEFAULT 'tcp',
      windows_printer_name VARCHAR(255),
      data_hex TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      error_message TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE comanda_print_jobs
      ADD COLUMN IF NOT EXISTS printer_type VARCHAR(20) DEFAULT 'tcp',
      ADD COLUMN IF NOT EXISTS windows_printer_name VARCHAR(255)
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comanda_print_agents (
      id SERIAL PRIMARY KEY,
      restaurant_id VARCHAR(255) NOT NULL UNIQUE,
      last_seen TIMESTAMP DEFAULT NOW(),
      agent_version VARCHAR(50)
    )
  `);
}

app.post('/heartbeat', async (c) => {
  try {
    const body = await c.req.json();
    const { token, version } = body;
    if (!token) return c.json({ error: 'token required' }, 400);

    const restaurantId = await getRestaurantIdFromToken(token);
    if (!restaurantId) return c.json({ error: 'invalid token' }, 401);

    await ensureTables();
    const pool = getPoolInstance();

    await pool.query(
      `INSERT INTO comanda_print_agents (restaurant_id, last_seen, agent_version)
       VALUES ($1, NOW(), $2)
       ON CONFLICT (restaurant_id) DO UPDATE SET last_seen = NOW(), agent_version = $2`,
      [restaurantId, version || '1.0.0']
    );

    console.log(`[PrintAgent] Heartbeat from restaurant ${restaurantId} (v${version || '?'})`);
    return c.json({ ok: true });
  } catch (e: any) {
    console.error('[PrintAgent] Heartbeat error:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

app.get('/jobs', async (c) => {
  try {
    const token = c.req.query('token');
    if (!token) return c.json({ error: 'token required' }, 400);

    const restaurantId = await getRestaurantIdFromToken(token);
    if (!restaurantId) return c.json({ error: 'invalid token' }, 401);

    await ensureTables();
    const pool = getPoolInstance();

    await pool.query(
      `INSERT INTO comanda_print_agents (restaurant_id, last_seen, agent_version)
       VALUES ($1, NOW(), '?')
       ON CONFLICT (restaurant_id) DO UPDATE SET last_seen = NOW()`,
      [restaurantId]
    );

    // Recover jobs stuck in 'processing' for more than 5 minutes (agent crashed before confirming)
    const recovered = await pool.query(
      `UPDATE comanda_print_jobs
       SET status = 'pending', updated_at = NOW()
       WHERE restaurant_id = $1 AND status = 'processing' AND updated_at < NOW() - INTERVAL '5 minutes'
       RETURNING id`,
      [restaurantId]
    );
    if (recovered.rows.length > 0) {
      console.log(`[PrintAgent] Recovered ${recovered.rows.length} stuck job(s) back to pending (restaurant: ${restaurantId})`);
    }

    const result = await pool.query(
      `UPDATE comanda_print_jobs
       SET status = 'processing', updated_at = NOW()
       WHERE id IN (
         SELECT id FROM comanda_print_jobs
         WHERE restaurant_id = $1 AND status = 'pending'
         ORDER BY created_at ASC
         LIMIT 20
       )
       RETURNING id, printer_ip, printer_port, printer_name, COALESCE(printer_type, 'tcp') as printer_type, windows_printer_name, data_hex`,
      [restaurantId]
    );

    if (result.rows.length > 0) {
      console.log(`[PrintAgent] Delivering ${result.rows.length} job(s) to agent (restaurant: ${restaurantId})`);
    }

    return c.json({ jobs: result.rows });
  } catch (e: any) {
    console.error('[PrintAgent] Jobs error:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

app.post('/confirm', async (c) => {
  try {
    const body = await c.req.json();
    const { token, jobId, success, error } = body;
    if (!token || !jobId) return c.json({ error: 'token and jobId required' }, 400);

    const restaurantId = await getRestaurantIdFromToken(token);
    if (!restaurantId) return c.json({ error: 'invalid token' }, 401);

    const pool = getPoolInstance();
    await pool.query(
      `UPDATE comanda_print_jobs
       SET status = $1, error_message = $2, updated_at = NOW()
       WHERE id = $3 AND restaurant_id = $4`,
      [success ? 'done' : 'failed', error || null, jobId, restaurantId]
    );

    console.log(`[PrintAgent] Job #${jobId} ${success ? '✅ done' : '❌ failed'} (${error || ''})`);
    return c.json({ ok: true });
  } catch (e: any) {
    console.error('[PrintAgent] Confirm error:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

app.get('/download-agent', async (c) => {
  try {
    const token = c.req.query('token');
    if (!token) return c.json({ error: 'token required' }, 400);

    const restaurantId = await getRestaurantIdFromToken(token);
    if (!restaurantId) return c.json({ error: 'invalid token' }, 401);

    const serverUrl = process.env.BASE_URL || 'https://quieromesa.com';
    const agentJs = generateAgentScript(serverUrl);

    c.header('Content-Type', 'application/javascript');
    c.header('Content-Disposition', 'attachment; filename="print-agent.js"');
    return c.body(agentJs);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/installer-windows', async (c) => {
  try {
    const token = c.req.query('token');
    if (!token) return c.json({ error: 'token required' }, 400);

    const restaurantId = await getRestaurantIdFromToken(token);
    if (!restaurantId) return c.json({ error: 'invalid token' }, 401);

    const serverUrl = process.env.BASE_URL || 'https://quieromesa.com';
    const bat = generateWindowsInstaller(token, serverUrl);

    c.header('Content-Type', 'application/octet-stream');
    c.header('Content-Disposition', 'attachment; filename="instalar-impresoras.bat"');
    return c.body(bat);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/installer-linux', async (c) => {
  try {
    const token = c.req.query('token');
    if (!token) return c.json({ error: 'token required' }, 400);

    const restaurantId = await getRestaurantIdFromToken(token);
    if (!restaurantId) return c.json({ error: 'invalid token' }, 401);

    const serverUrl = process.env.BASE_URL || 'https://quieromesa.com';
    const sh = generateLinuxInstaller(token, serverUrl);

    c.header('Content-Type', 'application/x-sh');
    c.header('Content-Disposition', 'attachment; filename="instalar-impresoras.sh"');
    return c.body(sh);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/status', async (c) => {
  try {
    const token = c.req.query('token');
    const restaurantId = c.req.query('restaurantId');

    let rid: string | null = null;
    if (token) {
      rid = await getRestaurantIdFromToken(token);
    } else if (restaurantId) {
      rid = restaurantId;
    }

    if (!rid) return c.json({ connected: false, lastSeen: null });

    await ensureTables();
    const pool = getPoolInstance();

    const result = await pool.query(
      `SELECT last_seen, agent_version FROM comanda_print_agents WHERE restaurant_id = $1`,
      [rid]
    );

    if (result.rows.length === 0) {
      return c.json({ connected: false, lastSeen: null });
    }

    const lastSeen = new Date(result.rows[0].last_seen as string);
    const secondsAgo = (Date.now() - lastSeen.getTime()) / 1000;

    return c.json({
      connected: secondsAgo < 30,
      lastSeen: lastSeen.toISOString(),
      secondsAgo: Math.round(secondsAgo),
      version: result.rows[0].agent_version,
    });
  } catch {
    return c.json({ connected: false, lastSeen: null });
  }
});

function generateAgentScript(serverUrl: string): string {
  return `#!/usr/bin/env node
'use strict';
const net = require('net');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const VERSION = '3.0.0';
const CONFIG_FILE = path.join(__dirname, 'print-agent-config.json');

let config = { token: '', server: '${serverUrl}', interval: 3000 };

try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (raw.token) config.token = raw.token;
    if (raw.server) config.server = raw.server;
    if (raw.interval) config.interval = raw.interval;
  }
} catch(e) { console.error('Error reading config:', e.message); }

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--server' && args[i+1]) config.server = args[i+1];
  if (args[i] === '--token' && args[i+1]) config.token = args[i+1];
  if (args[i] === '--interval' && args[i+1]) config.interval = parseInt(args[i+1],10)||3000;
}

config.server = config.server.replace(/\\/$/,'');

if (!config.token) {
  console.error('Token requerido. Uso: node print-agent.js --token <tu-token>');
  console.error('O crea print-agent-config.json con { "token": "cmd-xxx" }');
  process.exit(1);
}

function ts() { return new Date().toTimeString().substring(0,8); }

console.log('');
console.log('=== QuieroMesa - Agente de Impresion v' + VERSION + ' ===');
console.log('Servidor : ' + config.server);
console.log('Token    : ' + config.token.substring(0,24) + '...');
console.log('Intervalo: ' + config.interval + ' ms');
console.log('');
console.log('[' + ts() + '] Iniciado. Conectando al servidor...');
console.log('Presiona Ctrl+C para detener.');
console.log('');

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const lib = isHttps ? https : http;
    let urlObj;
    try { urlObj = new URL(url); } catch(e) { return reject(new Error('URL invalida: ' + url)); }
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'QuieroMesa-PrintAgent/' + VERSION, 'Accept': 'application/json' },
      timeout: 15000,
      rejectUnauthorized: false,
    };
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ _raw: data.substring(0,500) }); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('Timeout')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function sendToPrinter(ip, port, dataHex) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(dataHex, 'hex');
    const socket = new net.Socket();
    let done = false;
    const finish = (err) => { if (done) return; done = true; socket.destroy(); if (err) reject(err); else resolve(); };
    socket.setTimeout(8000);
    socket.connect(parseInt(port,10)||9100, ip, () => {
      socket.write(data, (err) => { if (err) finish(err); else setTimeout(() => finish(), 800); });
    });
    socket.on('error', (err) => finish(new Error('Error TCP (' + ip + ':' + port + '): ' + err.message)));
    socket.on('timeout', () => finish(new Error('Timeout ' + ip + ':' + port)));
  });
}

let connected = false;
let consecutiveErrors = 0;

async function sendHeartbeat() {
  try {
    await request('POST', config.server + '/api/print-agent/heartbeat', { token: config.token, version: VERSION });
    if (!connected) {
      connected = true;
      consecutiveErrors = 0;
      console.log('[' + ts() + '] ✅ Conectado al servidor ' + config.server);
    }
  } catch(e) {
    consecutiveErrors++;
    if (connected) {
      connected = false;
      console.error('[' + ts() + '] ⚠️  Conexion perdida: ' + e.message + '. Reintentando...');
    } else if (consecutiveErrors === 1 || consecutiveErrors % 10 === 0) {
      console.error('[' + ts() + '] Sin conexion (intento ' + consecutiveErrors + '): ' + e.message);
    }
  }
}

let totalPrinted = 0, totalErrors = 0;
async function pollAndProcess() {
  let result;
  try {
    result = await request('GET', config.server + '/api/print-agent/jobs?token=' + encodeURIComponent(config.token));
    if (!connected) {
      connected = true;
      consecutiveErrors = 0;
      console.log('[' + ts() + '] ✅ Reconectado al servidor.');
    }
  } catch(e) {
    consecutiveErrors++;
    if (connected) {
      connected = false;
      console.error('[' + ts() + '] ⚠️  Conexion perdida: ' + e.message + '. Reintentando...');
    } else if (consecutiveErrors % 20 === 0) {
      console.error('[' + ts() + '] Aun sin conexion (intento ' + consecutiveErrors + '). Esperando...');
    }
    return;
  }
  if (result.error) { console.error('[' + ts() + '] Error servidor:', result.error); return; }
  const jobs = Array.isArray(result.jobs) ? result.jobs : [];
  if (jobs.length === 0) return;
  console.log('[' + ts() + '] 🖨️  ' + jobs.length + ' trabajo(s) pendiente(s)');
  for (const job of jobs) {
    console.log('  → Impresora: ' + (job.printer_name||'sin nombre') + ' (' + job.printer_ip + ':' + (job.printer_port||9100) + ') job#' + job.id);
    try {
      await sendToPrinter(job.printer_ip, job.printer_port||9100, job.data_hex);
      console.log('  ✅ Impreso correctamente (#' + job.id + ')');
      totalPrinted++;
      await request('POST', config.server + '/api/print-agent/confirm', { token: config.token, jobId: job.id, success: true }).catch(()=>{});
    } catch(e) {
      console.error('  ❌ Error imprimiendo (#' + job.id + '):', e.message);
      totalErrors++;
      await request('POST', config.server + '/api/print-agent/confirm', { token: config.token, jobId: job.id, success: false, error: e.message }).catch(()=>{});
    }
  }
}

let running = true, iteration = 0;
process.on('SIGINT', () => {
  running = false;
  console.log('');
  console.log('[' + ts() + '] Agente detenido. Total impresos: ' + totalPrinted + ' | Errores: ' + totalErrors);
  process.exit(0);
});
process.on('SIGTERM', () => { running = false; process.exit(0); });
process.on('uncaughtException', (e) => { console.error('[' + ts() + '] Error no capturado:', e.message); });
process.on('unhandledRejection', (e) => { console.error('[' + ts() + '] Promesa rechazada:', e && e.message ? e.message : String(e)); });

async function loop() {
  await sendHeartbeat();
  while (running) {
    iteration++;
    // Heartbeat each ~30 seconds
    if (iteration % Math.max(1, Math.round(30000/config.interval)) === 0) {
      await sendHeartbeat();
    }
    await pollAndProcess().catch((e) => console.error('[' + ts() + '] Error ciclo:', e.message));
    await new Promise((r) => setTimeout(r, config.interval));
  }
}
loop().catch((e) => { console.error('[' + ts() + '] Error fatal:', e.message); process.exit(1); });
`;
}

function generateWindowsInstaller(token: string, serverUrl: string): string {
  const nodeUrl = 'https://nodejs.org/dist/v12.22.12/node-v12.22.12-x86.msi';
  const nodeUrlHttp = 'http://nodejs.org/dist/v12.22.12/node-v12.22.12-x86.msi';
  const agentUrl = `${serverUrl}/api/print-agent/download-agent?token=${token}`;
  const tokenShort = token.substring(0, 20);

  const lines: string[] = [];
  lines.push('@echo off');
  lines.push('chcp 65001 >nul 2>&1');
  lines.push('title QuieroMesa - Instalador de Impresoras');
  lines.push('echo.');
  lines.push('echo ===================================================');
  lines.push('echo    QuieroMesa - Instalador de Impresoras v6.0');
  lines.push('echo ===================================================');
  lines.push('echo.');
  lines.push('echo  Fecha   : %date%');
  lines.push('echo  Usuario : %USERNAME%');
  lines.push('echo  Sistema : Windows 7+ Compatible');
  lines.push('echo.');
  lines.push('');
  lines.push(`set "INSTALL_DIR=%USERPROFILE%\\QuieroMesa-PrintAgent"`);
  lines.push(`set "TOKEN=${token}"`);
  lines.push(`set "SERVER=${serverUrl}"`);
  lines.push(`set "NODE_URL=${nodeUrl}"`);
  lines.push(`set "NODE_URL_HTTP=${nodeUrlHttp}"`);
  lines.push(`set "AGENT_URL=${agentUrl}"`);
  lines.push('set "STARTUP_DIR=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"');
  lines.push('');

  lines.push('echo ---------------------------------------------------');
  lines.push('echo  PASO 1/5 - Verificando Node.js...');
  lines.push('echo ---------------------------------------------------');
  lines.push('echo.');
  lines.push('node --version >nul 2>&1');
  lines.push('if not errorlevel 1 goto node_ok');
  lines.push('if exist "%ProgramFiles%\\nodejs\\node.exe" goto node_found_pf');
  lines.push('if exist "%ProgramFiles(x86)%\\nodejs\\node.exe" goto node_found_pf86');
  lines.push('');
  lines.push('echo  Node.js NO encontrado. Descargando Node.js v12...');
  lines.push('echo  (Compatible con Windows 7 y superior)');
  lines.push('echo.');
  lines.push('');
  lines.push('echo  Metodo 1: Intentando con bitsadmin (HTTPS)...');
  lines.push('del "%TEMP%\\node-installer.msi" >nul 2>&1');
  lines.push('bitsadmin /transfer NodeJSDownload /priority high "%NODE_URL%" "%TEMP%\\node-installer.msi" >nul 2>&1');
  lines.push('if exist "%TEMP%\\node-installer.msi" (');
  lines.push('  echo  OK - Descarga completada con bitsadmin.');
  lines.push('  goto node_install');
  lines.push(')');
  lines.push('');
  lines.push('echo  Metodo 1 fallo. Intentando con bitsadmin (HTTP)...');
  lines.push('bitsadmin /transfer NodeJSDownload /priority high "%NODE_URL_HTTP%" "%TEMP%\\node-installer.msi" >nul 2>&1');
  lines.push('if exist "%TEMP%\\node-installer.msi" (');
  lines.push('  echo  OK - Descarga completada con bitsadmin (HTTP).');
  lines.push('  goto node_install');
  lines.push(')');
  lines.push('');
  lines.push('echo  Metodo 2: Intentando con PowerShell...');
  lines.push(`powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%NODE_URL%', '%TEMP%\\node-installer.msi')" >nul 2>&1`);
  lines.push('if exist "%TEMP%\\node-installer.msi" (');
  lines.push('  echo  OK - Descarga completada con PowerShell.');
  lines.push('  goto node_install');
  lines.push(')');
  lines.push('');
  lines.push('echo  Metodo 3: Intentando con certutil...');
  lines.push('certutil -urlcache -split -f "%NODE_URL%" "%TEMP%\\node-installer.msi" >nul 2>&1');
  lines.push('if exist "%TEMP%\\node-installer.msi" (');
  lines.push('  echo  OK - Descarga completada con certutil.');
  lines.push('  goto node_install');
  lines.push(')');
  lines.push('');
  lines.push('goto node_dl_error');
  lines.push('');
  lines.push(':node_install');
  lines.push('echo  Descarga OK. Instalando Node.js...');
  lines.push('echo  (Puede tardar 1-3 minutos, NO cierre esta ventana)');
  lines.push('msiexec /i "%TEMP%\\node-installer.msi" /qn /norestart');
  lines.push('del "%TEMP%\\node-installer.msi" >nul 2>&1');
  lines.push('');
  lines.push('set "PATH=%ProgramFiles%\\nodejs;%ProgramFiles(x86)%\\nodejs;%PATH%"');
  lines.push('node --version >nul 2>&1');
  lines.push('if not errorlevel 1 goto node_ok');
  lines.push('if exist "%ProgramFiles%\\nodejs\\node.exe" goto node_found_pf');
  lines.push('if exist "%ProgramFiles(x86)%\\nodejs\\node.exe" goto node_found_pf86');
  lines.push('echo.');
  lines.push('echo  ERROR: Node.js instalado pero no se detecta en PATH.');
  lines.push('echo  Reinicia el equipo y vuelve a ejecutar este instalador.');
  lines.push('echo.');
  lines.push('goto error_exit');
  lines.push('');
  lines.push(':node_found_pf');
  lines.push('set "PATH=%ProgramFiles%\\nodejs;%PATH%"');
  lines.push('echo  OK - Node.js encontrado en Archivos de Programa');
  lines.push('goto node_ok');
  lines.push('');
  lines.push(':node_found_pf86');
  lines.push('set "PATH=%ProgramFiles(x86)%\\nodejs;%PATH%"');
  lines.push('echo  OK - Node.js encontrado en Archivos de Programa (x86)');
  lines.push('goto node_ok');
  lines.push('');
  lines.push(':node_dl_error');
  lines.push('echo.');
  lines.push('echo  ERROR: No se pudo descargar Node.js con ningun metodo.');
  lines.push('echo  Descargalo manualmente desde otro equipo:');
  lines.push('echo    https://nodejs.org/dist/v12.22.12/node-v12.22.12-x86.msi');
  lines.push('echo  Copia el archivo .msi a este equipo, instalalo y vuelve a ejecutar.');
  lines.push('echo.');
  lines.push('goto error_exit');
  lines.push('');
  lines.push(':node_ok');
  lines.push('for /f "tokens=*" %%v in (\'node --version 2^>nul\') do echo  OK - Node.js %%v listo');
  lines.push('');

  lines.push('echo.');
  lines.push('echo ---------------------------------------------------');
  lines.push('echo  PASO 2/5 - Creando directorio de instalacion...');
  lines.push('echo ---------------------------------------------------');
  lines.push('echo.');
  lines.push('echo  Directorio: %INSTALL_DIR%');
  lines.push('if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"');
  lines.push('if not exist "%INSTALL_DIR%" (');
  lines.push('  echo  ERROR: No se pudo crear el directorio.');
  lines.push('  goto error_exit');
  lines.push(')');
  lines.push('echo  OK - Directorio listo.');
  lines.push('');

  lines.push('echo.');
  lines.push('echo ---------------------------------------------------');
  lines.push('echo  PASO 3/5 - Descargando agente de impresion...');
  lines.push('echo ---------------------------------------------------');
  lines.push('echo.');
  lines.push('del "%INSTALL_DIR%\\print-agent.js" >nul 2>&1');
  lines.push('echo  URL: %AGENT_URL%');
  lines.push('echo.');
  lines.push('');

  lines.push('echo  Metodo 1: Intentando con certutil...');
  lines.push('certutil -urlcache -split -f "%AGENT_URL%" "%INSTALL_DIR%\\print-agent.js" >nul 2>&1');
  lines.push('if not exist "%INSTALL_DIR%\\print-agent.js" goto agent_try2');
  lines.push('for %%A in ("%INSTALL_DIR%\\print-agent.js") do if %%~zA GTR 100 (');
  lines.push('  echo  OK - Agente descargado con certutil ^(%%~zA bytes^)');
  lines.push('  goto agent_dl_ok');
  lines.push(')');
  lines.push('del "%INSTALL_DIR%\\print-agent.js" >nul 2>&1');
  lines.push('');

  lines.push(':agent_try2');
  lines.push('echo  certutil fallo. Metodo 2: Intentando con bitsadmin...');
  lines.push('bitsadmin /transfer AgentDownload /priority high "%AGENT_URL%" "%INSTALL_DIR%\\print-agent.js" >nul 2>&1');
  lines.push('if not exist "%INSTALL_DIR%\\print-agent.js" goto agent_try3');
  lines.push('for %%A in ("%INSTALL_DIR%\\print-agent.js") do if %%~zA GTR 100 (');
  lines.push('  echo  OK - Agente descargado con bitsadmin ^(%%~zA bytes^)');
  lines.push('  goto agent_dl_ok');
  lines.push(')');
  lines.push('del "%INSTALL_DIR%\\print-agent.js" >nul 2>&1');
  lines.push('');

  lines.push(':agent_try3');
  lines.push('echo  bitsadmin fallo. Metodo 3: Intentando con PowerShell...');
  lines.push(`powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%AGENT_URL%', '%INSTALL_DIR%\\print-agent.js')" >nul 2>&1`);
  lines.push('if not exist "%INSTALL_DIR%\\print-agent.js" goto agent_try4');
  lines.push('for %%A in ("%INSTALL_DIR%\\print-agent.js") do if %%~zA GTR 100 (');
  lines.push('  echo  OK - Agente descargado con PowerShell ^(%%~zA bytes^)');
  lines.push('  goto agent_dl_ok');
  lines.push(')');
  lines.push('del "%INSTALL_DIR%\\print-agent.js" >nul 2>&1');
  lines.push('');

  lines.push(':agent_try4');
  lines.push('echo  PowerShell fallo. Metodo 4: Intentando con Node.js...');
  lines.push('echo  (Descarga via Node.js con HTTPS)');
  lines.push('(');
  lines.push('echo var https=require^(^"https^"^),http=require^(^"http^"^),fs=require^(^"fs^"^),url=require^(^"url^"^);');
  lines.push('echo var dlUrl=process.argv[2],dest=process.argv[3];');
  lines.push('echo function doGet^(u,cb^){var p=url.parse^(u^);var l=p.protocol===^"https:^"?https:http;');
  lines.push('echo var o={hostname:p.hostname,port:p.port,path:p.path,method:^"GET^",rejectUnauthorized:false,headers:{^"User-Agent^":^"QM/6^"}};');
  lines.push('echo l.get^(o,function^(r^){');
  lines.push('echo if^(r.statusCode^>=300^&^&r.statusCode^<400^&^&r.headers.location^){doGet^(r.headers.location,cb^);return;}');
  lines.push('echo if^(r.statusCode^<200^|^|r.statusCode^>299^){cb^(new Error^(^"HTTP ^"+r.statusCode^)^);return;}');
  lines.push('echo var f=fs.createWriteStream^(dest^);r.pipe^(f^);f.on^(^"finish^",function^(^){f.close^(^);cb^(null^);}^);');
  lines.push('echo }^).on^(^"error^",function^(e^){cb^(e^);}^);}');
  lines.push('echo doGet^(dlUrl,function^(e^){if^(e^){console.error^(^"ERROR: ^"+e.message^);process.exit^(1^);}console.log^(^"OK^"^);}^);');
  lines.push(') > "%TEMP%\\qm-download.js"');
  lines.push('node "%TEMP%\\qm-download.js" "%AGENT_URL%" "%INSTALL_DIR%\\print-agent.js"');
  lines.push('del "%TEMP%\\qm-download.js" >nul 2>&1');
  lines.push('if not exist "%INSTALL_DIR%\\print-agent.js" goto agent_dl_error');
  lines.push('for %%A in ("%INSTALL_DIR%\\print-agent.js") do if %%~zA GTR 100 (');
  lines.push('  echo  OK - Agente descargado con Node.js ^(%%~zA bytes^)');
  lines.push('  goto agent_dl_ok');
  lines.push(')');
  lines.push('del "%INSTALL_DIR%\\print-agent.js" >nul 2>&1');
  lines.push('');

  lines.push(':agent_dl_error');
  lines.push('echo.');
  lines.push('echo  ERROR: No se pudo descargar el agente con ningun metodo.');
  lines.push('echo  Verifica que el servidor %SERVER% esta accesible.');
  lines.push('echo  Verifica tu conexion a internet y vuelve a intentarlo.');
  lines.push('echo.');
  lines.push('goto error_exit');
  lines.push('');

  lines.push(':agent_dl_ok');
  lines.push('');
  lines.push('echo.');
  lines.push('echo ---------------------------------------------------');
  lines.push('echo  PASO 4/5 - Guardando configuracion...');
  lines.push('echo ---------------------------------------------------');
  lines.push('echo.');
  lines.push('(');
  lines.push('  echo {"token":"%TOKEN%","server":"%SERVER%","interval":3000}');
  lines.push(') > "%INSTALL_DIR%\\print-agent-config.json"');
  lines.push('echo  OK - Configuracion guardada.');
  lines.push('');

  lines.push('echo.');
  lines.push('echo ---------------------------------------------------');
  lines.push('echo  PASO 5/5 - Configurando inicio automatico...');
  lines.push('echo ---------------------------------------------------');
  lines.push('echo.');
  lines.push('echo  Creando script watchdog (reinicio automatico si el agente falla)...');
  lines.push('(');
  lines.push('  echo @echo off');
  lines.push('  echo title QuieroMesa - Agente de Impresion');
  lines.push('  echo :watchdog_loop');
  lines.push('  echo cd /d "%INSTALL_DIR%"');
  lines.push('  echo echo [%date% %time%] Agente iniciado. ^>^> print-agent.log');
  lines.push('  echo node print-agent.js ^>^> print-agent.log 2^>^&1');
  lines.push('  echo echo [%date% %time%] Agente detenido. Reiniciando en 10s... ^>^> print-agent.log');
  lines.push('  echo ping -n 11 127.0.0.1 ^>nul 2^>^&1');
  lines.push('  echo goto watchdog_loop');
  lines.push(') > "%STARTUP_DIR%\\QuieroMesa-PrintAgent.bat"');
  lines.push('echo  OK - Script watchdog creado (reinicio automatico si el agente falla).');
  lines.push('echo  OK - Se iniciara automaticamente al encender Windows.');
  lines.push('');
  lines.push('echo.');
  lines.push('echo ===================================================');
  lines.push('echo  INSTALACION COMPLETADA CON EXITO');
  lines.push('echo ===================================================');
  lines.push('echo.');
  lines.push('echo  Directorio : %INSTALL_DIR%');
  lines.push(`echo  Token      : ${tokenShort}...`);
  lines.push('echo  Servidor   : %SERVER%');
  lines.push('echo  Auto-inicio: SI - con reinicio automatico si el agente falla');
  lines.push('echo.');
  lines.push('echo  Iniciando agente ahora en segundo plano...');
  lines.push('start "QuieroMesa-PrintAgent" /min cmd /c "%STARTUP_DIR%\\QuieroMesa-PrintAgent.bat"');
  lines.push('ping -n 4 127.0.0.1 >nul 2>&1');
  lines.push('echo  OK - Agente iniciado en segundo plano.');
  lines.push('echo.');
  lines.push('echo  Para ver los logs del agente abre este archivo:');
  lines.push('echo    %INSTALL_DIR%\\print-agent.log');
  lines.push('echo.');
  lines.push('echo  El agente se reconecta automaticamente si pierde conexion.');
  lines.push('echo  Los trabajos pendientes se imprimen cuando vuelve la conexion.');
  lines.push('echo.');
  lines.push('echo  Puedes cerrar esta ventana cuando quieras.');
  lines.push('echo.');
  lines.push('pause');
  lines.push('exit /b 0');
  lines.push('');
  lines.push(':error_exit');
  lines.push('echo.');
  lines.push('echo  Pulsa cualquier tecla para cerrar...');
  lines.push('echo.');
  lines.push('pause');
  lines.push('exit /b 1');

  return lines.join('\r\n');
}

function generateLinuxInstaller(token: string, serverUrl: string): string {
  return `#!/bin/bash
set -e

echo ""
echo "============================================"
echo "  QuieroMesa - Instalador de Impresoras"
echo "============================================"
echo ""

INSTALL_DIR="$HOME/quieromesa-print-agent"
TOKEN="${token}"
SERVER="${serverUrl}"

echo "[1/5] Verificando Node.js..."
if ! command -v node &> /dev/null; then
  echo "Node.js no encontrado. Instalando..."
  if command -v apt-get &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command -v yum &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
  else
    echo "No se pudo instalar Node.js automaticamente."
    echo "Instala Node.js 18+ manualmente: https://nodejs.org"
    exit 1
  fi
else
  echo "Node.js encontrado: $(node --version)"
fi

echo ""
echo "[2/5] Creando directorio..."
mkdir -p "$INSTALL_DIR"

echo ""
echo "[3/5] Descargando agente..."
curl -sL "$SERVER/api/print-agent/download-agent?token=$TOKEN" -o "$INSTALL_DIR/print-agent.js"

echo ""
echo "[4/5] Configurando token..."
cat > "$INSTALL_DIR/print-agent-config.json" << EOFCONFIG
{"token":"$TOKEN","server":"$SERVER","interval":3000}
EOFCONFIG

echo ""
echo "[5/5] Configurando servicio systemd (reinicio automatico)..."
sudo tee /etc/systemd/system/quieromesa-print-agent.service > /dev/null << EOFSERVICE
[Unit]
Description=QuieroMesa Print Agent
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) $INSTALL_DIR/print-agent.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOFSERVICE

sudo systemctl daemon-reload
sudo systemctl enable quieromesa-print-agent
sudo systemctl start quieromesa-print-agent

echo ""
echo "============================================"
echo "  Instalacion completada!"
echo "============================================"
echo ""
echo "Directorio: $INSTALL_DIR"
echo "Token: $TOKEN"
echo ""
echo "El agente se ejecuta como servicio systemd."
echo "Se reinicia automaticamente si falla."
echo ""
echo "Comandos utiles:"
echo "  sudo systemctl status quieromesa-print-agent"
echo "  sudo systemctl restart quieromesa-print-agent"
echo "  sudo journalctl -u quieromesa-print-agent -f"
echo ""
`;
}

app.get('/iniciar-agente', async (c) => {
  try {
    const token = c.req.query('token');
    if (!token) return c.json({ error: 'token required' }, 400);

    const restaurantId = await getRestaurantIdFromToken(token);
    if (!restaurantId) return c.json({ error: 'invalid token' }, 401);

    const bat = generateIniciarAgente();

    c.header('Content-Type', 'application/octet-stream');
    c.header('Content-Disposition', 'attachment; filename="iniciar-agente.bat"');
    return c.body(bat);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

function generateIniciarAgente(): string {
  const lines: string[] = [];
  lines.push('@echo off');
  lines.push('chcp 65001 >nul 2>&1');
  lines.push('title QuieroMesa - Agente de Impresion');
  lines.push('echo.');
  lines.push('echo  ==========================================');
  lines.push('echo   QuieroMesa - Agente de Impresion Local');
  lines.push('echo  ==========================================');
  lines.push('echo.');
  lines.push('');
  lines.push(':: Buscar Node.js');
  lines.push('where node >nul 2>&1');
  lines.push('if %errorlevel% neq 0 (');
  lines.push('    echo  ERROR: Node.js no esta instalado.');
  lines.push('    echo.');
  lines.push('    echo  Por favor instala Node.js desde:');
  lines.push('    echo  https://nodejs.org/  (version 8 o superior)');
  lines.push('    echo.');
  lines.push('    echo  Para Windows 7 usa Node.js 12 (ultima version compatible):');
  lines.push('    echo  https://nodejs.org/dist/v12.22.12/node-v12.22.12-x86.msi');
  lines.push('    echo.');
  lines.push('    pause');
  lines.push('    exit /b 1');
  lines.push(')');
  lines.push('');
  lines.push(':: Mostrar version de Node.js');
  lines.push('for /f "tokens=*" %%v in (\'node --version\') do set NODE_VERSION=%%v');
  lines.push('echo  Node.js encontrado: %NODE_VERSION%');
  lines.push('');
  lines.push(':: Verificar que existe print-agent.js');
  lines.push('if not exist "%~dp0print-agent.js" (');
  lines.push('    echo.');
  lines.push('    echo  ERROR: No se encuentra print-agent.js');
  lines.push('    echo  Asegurate de que este archivo esta en la misma carpeta que iniciar-agente.bat');
  lines.push('    echo.');
  lines.push('    pause');
  lines.push('    exit /b 1');
  lines.push(')');
  lines.push('');
  lines.push(':: Leer token desde archivo de configuracion si existe');
  lines.push('set TOKEN=');
  lines.push('if exist "%~dp0print-agent-config.json" (');
  lines.push('    echo  Configuracion encontrada: print-agent-config.json');
  lines.push('    goto :run_agent');
  lines.push(')');
  lines.push('');
  lines.push(':: Pedir token al usuario si no hay configuracion');
  lines.push('echo.');
  lines.push('echo  Para conectar el agente necesitas el token de tu restaurante.');
  lines.push('echo  Lo encuentras en: QuieroMesa ^> Comandas ^> Configuracion ^> Impresoras');
  lines.push('echo.');
  lines.push('set /p TOKEN="  Introduce tu token (cmd-xxx-xxx): "');
  lines.push('');
  lines.push('if "%TOKEN%"=="" (');
  lines.push('    echo.');
  lines.push('    echo  ERROR: El token no puede estar vacio.');
  lines.push('    pause');
  lines.push('    exit /b 1');
  lines.push(')');
  lines.push('');
  lines.push(':: Guardar configuracion');
  lines.push('echo  Guardando configuracion...');
  lines.push('echo {"token":"%TOKEN%","server":"https://quieromesa.com"} > "%~dp0print-agent-config.json"');
  lines.push('echo  Configuracion guardada en print-agent-config.json');
  lines.push('echo  (La proxima vez no necesitaras introducir el token)');
  lines.push('');
  lines.push(':run_agent');
  lines.push('echo.');
  lines.push('echo  Iniciando agente de impresion...');
  lines.push('echo  Presiona Ctrl+C para detener.');
  lines.push('echo.');
  lines.push('');
  lines.push('if "%TOKEN%"=="" (');
  lines.push('    node "%~dp0print-agent.js"');
  lines.push(') else (');
  lines.push('    node "%~dp0print-agent.js" --token %TOKEN%');
  lines.push(')');
  lines.push('');
  lines.push('if %errorlevel% neq 0 (');
  lines.push('    echo.');
  lines.push('    echo  El agente se ha detenido con un error.');
  lines.push('    pause');
  lines.push(')');
  return lines.join('\r\n');
}

export default app;
