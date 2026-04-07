#!/usr/bin/env node
/**
 * QuieroMesa - Agente de Impresion Local v3.2.0
 *
 * Soporta impresoras TCP/IP (red) y USB (conectadas al PC con Windows).
 * Compatible con Windows 7 o superior, Node.js 8 o superior.
 *
 * Uso:
 *   node print-agent.js --token cmd-xxx-xxx
 *   node print-agent.js --token cmd-xxx-xxx --server https://quieromesa.com
 *   node print-agent.js --list-printers   (muestra impresoras USB disponibles)
 *
 * Opciones:
 *   --token          Token de comandas del restaurante
 *   --server         URL del servidor (por defecto: https://quieromesa.com)
 *   --interval       Intervalo de sondeo en ms (por defecto: 3000)
 *   --list-printers  Lista las impresoras instaladas en Windows y sale
 *   --verbose        Muestra informacion detallada
 *
 * Metodos de impresion USB (en orden de preferencia):
 *   1. WinSpool RAW API via PowerShell (mejor para ESC/POS, Win7+)
 *   2. Escritura directa al puerto (USB001:, COM1:, LPT1:) via cmd
 *   3. Impresion via red local (\\localhost\NombreImpresora)
 *
 * Requisitos:
 *   - Node.js 8 o superior
 *   - Windows 7 o superior (para impresion USB via PowerShell)
 *   - Para impresoras TCP: accesibles por red en puerto 9100
 *   - Para impresoras USB: instaladas en Windows (Panel de Control > Impresoras)
 */
'use strict';

var net = require('net');
var https = require('https');
var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');
var childProcess = require('child_process');

var VERSION = '3.2.0';
var CONFIG_FILE = path.join(__dirname, 'print-agent-config.json');

var config = {
  token: '',
  server: 'https://quieromesa.com',
  interval: 3000,
  verbose: false,
};

try {
  if (fs.existsSync(CONFIG_FILE)) {
    var raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (raw.token) config.token = raw.token;
    if (raw.server) config.server = raw.server;
    if (raw.interval) config.interval = raw.interval;
    console.log('[Config] Configuracion cargada desde ' + CONFIG_FILE);
  }
} catch (e) {
  console.error('[Config] Error leyendo configuracion:', e.message);
}

var args = process.argv.slice(2);
for (var i = 0; i < args.length; i++) {
  if (args[i] === '--server' && args[i + 1]) config.server = args[i + 1];
  if (args[i] === '--token' && args[i + 1]) config.token = args[i + 1];
  if (args[i] === '--interval' && args[i + 1]) config.interval = parseInt(args[i + 1], 10) || 3000;
  if (args[i] === '--verbose') config.verbose = true;
}

config.server = config.server.replace(/\/$/, '');

function ts() {
  return new Date().toTimeString().substring(0, 8);
}

function log(msg) {
  console.log('[' + ts() + '] ' + msg);
}

function verbose(msg) {
  if (config.verbose) console.log('[' + ts() + '] [V] ' + msg);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de archivos temporales
// ─────────────────────────────────────────────────────────────────────────────
function makeTmpId() {
  return Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

function cleanupFiles() {
  var files = Array.prototype.slice.call(arguments);
  files.forEach(function (f) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Listar impresoras Windows con informacion de puerto
// ─────────────────────────────────────────────────────────────────────────────
function listWindowsPrinters(callback) {
  if (process.platform !== 'win32') {
    return callback(null, []);
  }

  // PowerShell: obtiene nombre + puerto de cada impresora (Win7+)
  var psCmd = [
    'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command',
    '"Get-WmiObject -Class Win32_Printer |',
    'Select-Object Name,PortName,PrinterStatus |',
    'ForEach-Object { $_.Name + \'|\' + $_.PortName + \'|\' + $_.PrinterStatus }"',
  ].join(' ');

  childProcess.exec(psCmd, { timeout: 12000, windowsHide: true }, function (err, stdout) {
    if (!err && stdout && stdout.trim().length > 0) {
      var printers = stdout.split('\n')
        .map(function (l) { return l.trim(); })
        .filter(function (l) { return l.length > 0 && l.indexOf('|') !== -1; })
        .map(function (l) {
          var parts = l.split('|');
          return { name: parts[0] || '', port: parts[1] || '', status: parts[2] || '' };
        });
      if (printers.length > 0) return callback(null, printers);
    }

    // Fallback: wmic (Win7+) - solo nombre
    childProcess.exec('wmic printer get name,portname /format:list', { timeout: 12000, windowsHide: true }, function (err2, stdout2) {
      if (err2 || !stdout2) return callback(null, []);
      var blocks = stdout2.split(/\r?\n\r?\n/).filter(function (b) { return b.trim().length > 0; });
      var result = [];
      blocks.forEach(function (block) {
        var nameMatch = block.match(/Name=(.+)/i);
        var portMatch = block.match(/PortName=(.+)/i);
        if (nameMatch) {
          result.push({
            name: nameMatch[1].trim(),
            port: portMatch ? portMatch[1].trim() : '',
            status: '',
          });
        }
      });
      callback(null, result);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener el puerto fisico de una impresora por nombre
// ─────────────────────────────────────────────────────────────────────────────
function getPrinterPort(printerName, callback) {
  if (process.platform !== 'win32') return callback(null, null);

  var safeName = printerName.replace(/'/g, "''");
  var psCmd = [
    'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command',
    '"(Get-WmiObject -Class Win32_Printer | Where-Object { $_.Name -eq \'' + safeName + '\' }).PortName"',
  ].join(' ');

  childProcess.exec(psCmd, { timeout: 8000, windowsHide: true }, function (err, stdout) {
    if (err || !stdout) return callback(null, null);
    var port = stdout.trim();
    callback(null, port.length > 0 ? port : null);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// METODO 1: WinSpool RAW API via PowerShell
// Compatible con Windows 7 y superior (.NET Framework 2.0+, PS 2.0+)
// ─────────────────────────────────────────────────────────────────────────────
function printUsbViaWinSpool(printerName, data) {
  return new Promise(function (resolve, reject) {
    var tmpId = makeTmpId();
    var tmpBin = path.join(os.tmpdir(), 'qm_' + tmpId + '.bin');
    var tmpPs1 = path.join(os.tmpdir(), 'qm_' + tmpId + '.ps1');

    try {
      fs.writeFileSync(tmpBin, data);
    } catch (e) {
      return reject(new Error('Error guardando datos temporales: ' + e.message));
    }

    // Escapar comillas simples en el nombre de impresora
    var safePrinter = printerName.replace(/'/g, "''");
    // Rutas con barras normales para PowerShell
    var safeBin = tmpBin.replace(/\\/g, '/');

    // Script PowerShell compatible con PS 2.0 / .NET 2.0 (Windows 7)
    var psLines = [
      'Add-Type -TypeDefinition @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public struct DOCINFOA {',
      '    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;',
      '    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;',
      '    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;',
      '}',
      'public class RawPrint {',
      '    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true)]',
      '    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);',
      '    [DllImport("winspool.Drv", EntryPoint="ClosePrinter")]',
      '    public static extern bool ClosePrinter(IntPtr hPrinter);',
      '    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true)]',
      '    public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA di);',
      '    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter")]',
      '    public static extern bool EndDocPrinter(IntPtr hPrinter);',
      '    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter")]',
      '    public static extern bool StartPagePrinter(IntPtr hPrinter);',
      '    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter")]',
      '    public static extern bool EndPagePrinter(IntPtr hPrinter);',
      '    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true)]',
      '    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);',
      '}',
      '"@ -ErrorAction Stop',
      '',
      '$tmpFile = "' + safeBin + '"',
      '$printerName = \'' + safePrinter + '\'',
      '$bytes = [System.IO.File]::ReadAllBytes($tmpFile)',
      '$hPrinter = [IntPtr]::Zero',
      'if (-not [RawPrint]::OpenPrinter($printerName, [ref]$hPrinter, [IntPtr]::Zero)) {',
      '    Write-Error "ERROR_OPEN: No se pudo abrir la impresora: $printerName"',
      '    exit 1',
      '}',
      '$di = New-Object DOCINFOA',
      '$di.pDocName = "QuieroMesa"',
      '$di.pOutputFile = $null',
      '$di.pDataType = "RAW"',
      '$docId = [RawPrint]::StartDocPrinter($hPrinter, 1, [ref]$di)',
      'if ($docId -le 0) {',
      '    [RawPrint]::ClosePrinter($hPrinter) | Out-Null',
      '    Write-Error "ERROR_STARTDOC: StartDocPrinter fallo"',
      '    exit 1',
      '}',
      '[RawPrint]::StartPagePrinter($hPrinter) | Out-Null',
      '$gc = [System.Runtime.InteropServices.GCHandle]::Alloc($bytes, [System.Runtime.InteropServices.GCHandleType]::Pinned)',
      '$written = 0',
      '[RawPrint]::WritePrinter($hPrinter, $gc.AddrOfPinnedObject(), $bytes.Length, [ref]$written) | Out-Null',
      '$gc.Free()',
      '[RawPrint]::EndPagePrinter($hPrinter) | Out-Null',
      '[RawPrint]::EndDocPrinter($hPrinter) | Out-Null',
      '[RawPrint]::ClosePrinter($hPrinter) | Out-Null',
      'if ($written -gt 0) { Write-Output "OK:$written" } else { Write-Error "ERROR_WRITE: 0 bytes escritos"; exit 1 }',
    ];

    try {
      fs.writeFileSync(tmpPs1, psLines.join('\n'), 'utf8');
    } catch (e) {
      cleanupFiles(tmpBin);
      return reject(new Error('Error guardando script PowerShell: ' + e.message));
    }

    verbose('[USB-M1] WinSpool para: ' + printerName);
    var cmd = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + tmpPs1 + '"';
    childProcess.exec(cmd, { timeout: 25000, windowsHide: true }, function (err, stdout, stderr) {
      cleanupFiles(tmpBin, tmpPs1);
      if (err) {
        var errMsg = ((stderr || stdout || err.message || '').trim()).substring(0, 400);
        return reject(new Error('WinSpool error: ' + errMsg));
      }
      var out = (stdout || '').trim();
      if (out.indexOf('OK:') !== -1) {
        verbose('[USB-M1] OK: ' + out);
        return resolve();
      }
      var errOut = ((stderr || stdout || 'respuesta inesperada').trim()).substring(0, 400);
      return reject(new Error('WinSpool respuesta inesperada: ' + errOut));
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// METODO 2: Escritura directa al puerto via cmd (copy /b)
// Funciona con puertos USB001:, LPT1:, COM1:, etc.
// Compatible con Windows XP / 7 / 10 / 11
// ─────────────────────────────────────────────────────────────────────────────
function printUsbViaPortCopy(portName, data) {
  return new Promise(function (resolve, reject) {
    // Los puertos USB en Windows son USB001, USB002, etc.
    // Para copy necesitamos agregar : al final si no lo tiene
    var port = portName.trim();
    if (!port.endsWith(':')) port = port + ':';

    var tmpId = makeTmpId();
    var tmpBin = path.join(os.tmpdir(), 'qm_' + tmpId + '.bin');

    try {
      fs.writeFileSync(tmpBin, data);
    } catch (e) {
      return reject(new Error('Error guardando datos temporales: ' + e.message));
    }

    // copy /b es el comando de Windows para copiar binario
    var cmd = 'cmd.exe /C copy /b "' + tmpBin + '" ' + port;
    verbose('[USB-M2] Escribiendo al puerto: ' + port);

    childProcess.exec(cmd, { timeout: 15000, windowsHide: true }, function (err, stdout, stderr) {
      cleanupFiles(tmpBin);
      if (err) {
        return reject(new Error('Error puerto ' + port + ': ' + ((stderr || err.message || '').trim()).substring(0, 300)));
      }
      verbose('[USB-M2] OK puerto ' + port);
      resolve();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// METODO 3: Impresion via red local (\\localhost\NombreImpresora)
// Funciona si la impresora esta compartida en red local
// ─────────────────────────────────────────────────────────────────────────────
function printUsbViaNetShare(printerName, data) {
  return new Promise(function (resolve, reject) {
    var tmpId = makeTmpId();
    var tmpBin = path.join(os.tmpdir(), 'qm_' + tmpId + '.bin');

    try {
      fs.writeFileSync(tmpBin, data);
    } catch (e) {
      return reject(new Error('Error guardando datos temporales: ' + e.message));
    }

    // Compartir via localhost
    var sharePath = '\\\\localhost\\' + printerName;
    var cmd = 'cmd.exe /C copy /b "' + tmpBin + '" "' + sharePath + '"';
    verbose('[USB-M3] Via red local: ' + sharePath);

    childProcess.exec(cmd, { timeout: 15000, windowsHide: true }, function (err, stdout, stderr) {
      cleanupFiles(tmpBin);
      if (err) {
        return reject(new Error('Error red local ' + sharePath + ': ' + ((stderr || err.message || '').trim()).substring(0, 300)));
      }
      verbose('[USB-M3] OK via red local');
      resolve();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Enviar a impresora USB con fallback automatico
// Orden: WinSpool -> puerto directo -> red local
// ─────────────────────────────────────────────────────────────────────────────
function sendToWindowsUsbPrinter(printerName, dataHex) {
  return new Promise(function (resolve, reject) {
    if (process.platform !== 'win32') {
      return reject(new Error('La impresion USB solo esta soportada en Windows'));
    }

    var data;
    try {
      data = Buffer.from(dataHex, 'hex');
    } catch (e) {
      return reject(new Error('Datos hex invalidos: ' + e.message));
    }

    var errors = [];

    // Metodo 1: WinSpool (el mas fiable para ESC/POS)
    printUsbViaWinSpool(printerName, data)
      .then(function () {
        verbose('[USB] Impreso correctamente via WinSpool');
        resolve();
      })
      .catch(function (e1) {
        errors.push('M1(WinSpool): ' + e1.message);
        verbose('[USB] WinSpool fallo, probando puerto directo...');

        // Metodo 2: obtener puerto fisico y escribir directamente
        getPrinterPort(printerName, function (err, port) {
          if (!err && port && (
            port.match(/^USB\d+$/i) ||
            port.match(/^LPT\d+$/i) ||
            port.match(/^COM\d+$/i)
          )) {
            printUsbViaPortCopy(port, data)
              .then(function () {
                verbose('[USB] Impreso correctamente via puerto ' + port);
                resolve();
              })
              .catch(function (e2) {
                errors.push('M2(Puerto ' + port + '): ' + e2.message);
                verbose('[USB] Puerto directo fallo, probando red local...');
                // Metodo 3: red local
                printUsbViaNetShare(printerName, data)
                  .then(function () {
                    verbose('[USB] Impreso correctamente via red local');
                    resolve();
                  })
                  .catch(function (e3) {
                    errors.push('M3(RedLocal): ' + e3.message);
                    reject(new Error(
                      'No se pudo imprimir en "' + printerName + '" por ningun metodo.\n' +
                      errors.join('\n') + '\n' +
                      'Comprueba que:\n' +
                      '  - La impresora esta encendida y conectada\n' +
                      '  - El nombre es correcto (usa --list-printers)\n' +
                      '  - Esta instalada en Panel de Control > Dispositivos e Impresoras'
                    ));
                  });
              });
          } else {
            // Sin puerto fisico detectable, ir directo a metodo 3
            printUsbViaNetShare(printerName, data)
              .then(function () {
                verbose('[USB] Impreso correctamente via red local');
                resolve();
              })
              .catch(function (e3) {
                errors.push('M3(RedLocal): ' + e3.message);
                reject(new Error(
                  'No se pudo imprimir en "' + printerName + '" por ningun metodo.\n' +
                  errors.join('\n') + '\n' +
                  'Comprueba que:\n' +
                  '  - La impresora esta encendida y conectada por USB\n' +
                  '  - El nombre exacto (usa --list-printers para verlo)\n' +
                  '  - Esta instalada en Panel de Control > Dispositivos e Impresoras'
                ));
              });
          }
        });
      });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Imprimir en impresora TCP (red local, puerto 9100)
// ─────────────────────────────────────────────────────────────────────────────
function sendToTcpPrinter(ip, port, dataHex) {
  return new Promise(function (resolve, reject) {
    var data = Buffer.from(dataHex, 'hex');
    var socket = new net.Socket();
    var done = false;

    var finish = function (err) {
      if (done) return;
      done = true;
      socket.destroy();
      if (err) reject(err); else resolve();
    };

    socket.setTimeout(8000);
    socket.connect(parseInt(port, 10) || 9100, ip, function () {
      verbose('TCP conectado a ' + ip + ':' + port);
      socket.write(data, function (err) {
        if (err) { finish(err); } else { setTimeout(function () { finish(); }, 800); }
      });
    });
    socket.on('error', function (err) {
      finish(new Error('Error TCP (' + ip + ':' + port + '): ' + err.message));
    });
    socket.on('timeout', function () {
      finish(new Error('Timeout TCP ' + ip + ':' + port + ' - verifica que la impresora este encendida y en red'));
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Comunicacion con el servidor
// ─────────────────────────────────────────────────────────────────────────────
function request(method, url, body) {
  return new Promise(function (resolve, reject) {
    var isHttps = url.startsWith('https://');
    var lib = isHttps ? https : http;
    var urlObj;
    try { urlObj = new URL(url); } catch (e) { return reject(new Error('URL invalida: ' + url)); }
    var bodyStr = body ? JSON.stringify(body) : null;
    var options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QuieroMesa-PrintAgent/' + VERSION,
        'Accept': 'application/json',
      },
      timeout: 15000,
      rejectUnauthorized: false,
    };
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    var req = lib.request(options, function (res) {
      var data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        try { resolve(JSON.parse(data)); } catch (_) { resolve({ _raw: data.substring(0, 500) }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(new Error('Timeout')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Modo --list-printers
// ─────────────────────────────────────────────────────────────────────────────
if (args.indexOf('--list-printers') !== -1) {
  console.log('');
  console.log('=== QuieroMesa - Impresoras disponibles en este equipo ===');
  console.log('');
  if (process.platform !== 'win32') {
    console.log('NOTA: La impresion USB solo esta soportada en Windows.');
    console.log('Este equipo usa: ' + process.platform);
    process.exit(0);
  }
  listWindowsPrinters(function (err, printers) {
    if (err || printers.length === 0) {
      console.log('No se encontraron impresoras instaladas.');
      console.log('Ve a Panel de Control > Dispositivos e Impresoras para instalar tu impresora.');
    } else {
      console.log('Impresoras instaladas (' + printers.length + '):');
      printers.forEach(function (p, i) {
        var portInfo = p.port ? ' [Puerto: ' + p.port + ']' : '';
        console.log('  ' + (i + 1) + '. ' + p.name + portInfo);
      });
      console.log('');
      console.log('Usa el nombre EXACTO al configurar la impresora en QuieroMesa.');
      console.log('Ejemplo: "EPSON TM-T20" o "POS-58"');
      console.log('');
      console.log('Puertos USB comunes: USB001, USB002 (conectadas por USB)');
      console.log('Puertos COM: COM1, COM2 (conectadas por puerto serie)');
      console.log('Puertos LPT: LPT1 (conectadas por puerto paralelo)');
    }
    console.log('');
    process.exit(0);
  });
} else {
  // ─────────────────────────────────────────────────────────────────────────
  // Modo normal: agente de impresion
  // ─────────────────────────────────────────────────────────────────────────

  if (!config.token) {
    console.error('');
    console.error('ERROR: Token requerido.');
    console.error('');
    console.error('  Opciones:');
    console.error('  1. Usa el instalador: iniciar-agente.bat');
    console.error('  2. Ejecuta: node print-agent.js --token <tu-token>');
    console.error('  3. Crea print-agent-config.json con: {"token":"cmd-xxx"}');
    console.error('');
    process.exit(1);
  }

  console.log('');
  console.log('==========================================================');
  console.log('   QuieroMesa - Agente de Impresion v' + VERSION);
  console.log('==========================================================');
  console.log('');
  console.log('Servidor  : ' + config.server);
  console.log('Token     : ' + config.token.substring(0, 24) + '...');
  console.log('Intervalo : ' + config.interval + ' ms');
  console.log('Sistema   : ' + process.platform + ' / Node.js ' + process.version);
  if (process.platform === 'win32') {
    console.log('USB       : Soportado');
    console.log('           Metodos: WinSpool RAW -> Puerto directo -> Red local');
    console.log('           Usa --list-printers para ver impresoras disponibles');
  }
  console.log('');
  console.log('[' + ts() + '] Iniciado. Conectando al servidor...');
  console.log('Presiona Ctrl+C para detener.');
  console.log('');

  var connected = false;
  var consecutiveErrors = 0;
  var totalPrinted = 0;
  var totalErrors = 0;

  function sendHeartbeat() {
    return request('POST', config.server + '/api/print-agent/heartbeat', {
      token: config.token,
      version: VERSION,
      platform: process.platform,
      usbSupport: process.platform === 'win32',
    }).then(function () {
      if (!connected) {
        connected = true;
        consecutiveErrors = 0;
        log('Conectado al servidor ' + config.server);
      }
    }).catch(function (e) {
      consecutiveErrors++;
      if (connected) {
        connected = false;
        log('ADVERTENCIA: Conexion perdida: ' + e.message + '. Reintentando...');
      } else if (consecutiveErrors === 1 || consecutiveErrors % 15 === 0) {
        log('Sin conexion (intento ' + consecutiveErrors + '): ' + e.message);
      }
    });
  }

  function pollAndProcess() {
    return request('GET', config.server + '/api/print-agent/jobs?token=' + encodeURIComponent(config.token))
      .then(function (result) {
        if (!connected) {
          connected = true;
          consecutiveErrors = 0;
          log('Reconectado al servidor.');
        }

        if (result.error) {
          log('Error del servidor: ' + result.error);
          return;
        }

        var jobs = Array.isArray(result.jobs) ? result.jobs : [];
        if (jobs.length === 0) return;

        log(jobs.length + ' trabajo(s) de impresion pendiente(s)');

        var chain = Promise.resolve();
        jobs.forEach(function (job) {
          chain = chain.then(function () {
            var printerType = job.printer_type || 'tcp';
            var isUsb = printerType === 'usb';
            var usbName = job.windows_printer_name || job.printer_name || '';
            var label = isUsb
              ? 'USB: ' + (usbName || 'sin nombre')
              : (job.printer_name || 'sin nombre') + ' (' + job.printer_ip + ':' + (job.printer_port || 9100) + ')';

            log('  Imprimiendo #' + job.id + ' -> ' + label);

            var printPromise = isUsb
              ? sendToWindowsUsbPrinter(usbName, job.data_hex)
              : sendToTcpPrinter(job.printer_ip, job.printer_port || 9100, job.data_hex);

            return printPromise.then(function () {
              log('  OK #' + job.id + ' impreso correctamente');
              totalPrinted++;
              return request('POST', config.server + '/api/print-agent/confirm', {
                token: config.token,
                jobId: job.id,
                success: true,
              }).catch(function () {});
            }).catch(function (e) {
              log('  ERROR #' + job.id + ': ' + e.message);
              totalErrors++;
              return request('POST', config.server + '/api/print-agent/confirm', {
                token: config.token,
                jobId: job.id,
                success: false,
                error: e.message.substring(0, 500),
              }).catch(function () {});
            });
          });
        });

        return chain;
      })
      .catch(function (e) {
        consecutiveErrors++;
        if (connected) {
          connected = false;
          log('ADVERTENCIA: Conexion perdida: ' + e.message + '. Reintentando...');
        } else if (consecutiveErrors % 20 === 0) {
          log('Aun sin conexion (intento ' + consecutiveErrors + '). Esperando...');
        }
      });
  }

  var running = true;
  var iteration = 0;

  process.on('SIGINT', function () {
    running = false;
    console.log('');
    log('Agente detenido.');
    log('Total impresos : ' + totalPrinted);
    log('Errores        : ' + totalErrors);
    process.exit(0);
  });

  process.on('SIGTERM', function () {
    running = false;
    process.exit(0);
  });

  process.on('uncaughtException', function (e) {
    log('Error no capturado: ' + e.message);
  });

  process.on('unhandledRejection', function (e) {
    log('Promesa rechazada: ' + (e && e.message ? e.message : String(e)));
  });

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function loop() {
    return sendHeartbeat().then(function () {
      function tick() {
        if (!running) return Promise.resolve();
        iteration++;
        var heartbeatEvery = Math.max(1, Math.round(30000 / config.interval));
        var doHeartbeat = iteration % heartbeatEvery === 0 ? sendHeartbeat() : Promise.resolve();
        return doHeartbeat
          .then(function () { return pollAndProcess(); })
          .catch(function (e) { log('Error en ciclo: ' + e.message); })
          .then(function () { return sleep(config.interval); })
          .then(function () { return tick(); });
      }
      return tick();
    });
  }

  loop().catch(function (e) {
    log('Error fatal: ' + e.message);
    process.exit(1);
  });
}
