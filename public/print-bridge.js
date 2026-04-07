#!/usr/bin/env node
/**
 * QuieroMesa - Puente de Impresión para Android v1.0.0
 *
 * Ejecuta este script en la tablet Android con Termux para conectar
 * el monitor de cocina con las impresoras térmicas de tu red local.
 *
 * INSTALACIÓN (una sola vez):
 * ─────────────────────────────────────────────────────────────────
 * 1. Instala Termux desde F-Droid (NO desde Play Store):
 *    https://f-droid.org/packages/com.termux/
 *
 * 2. Abre Termux y ejecuta:
 *    pkg update && pkg upgrade -y
 *    pkg install nodejs -y
 *
 * 3. Descarga este script:
 *    wget https://quieromesa.com/print-bridge.js
 *
 * 4. Inicia el puente:
 *    node ~/print-bridge.js
 *
 * INICIO AUTOMÁTICO (opcional):
 * ─────────────────────────────────────────────────────────────────
 * Para que el puente se inicie automáticamente al abrir Termux:
 *    echo "node ~/print-bridge.js &" >> ~/.bashrc
 *
 * CÓMO FUNCIONA:
 * ─────────────────────────────────────────────────────────────────
 * - Este script escucha en http://127.0.0.1:8765
 * - El monitor de cocina (en el navegador) envía trabajos de impresión
 *   a http://127.0.0.1:8765/print
 * - El puente abre una conexión TCP al puerto 9100 de la impresora
 *   y envía los datos ESC/POS directamente
 * - Todo ocurre en la red local WiFi, sin pasar por internet
 *
 * REQUISITOS:
 * ─────────────────────────────────────────────────────────────────
 * - La tablet y las impresoras deben estar en la misma red WiFi
 * - Las impresoras deben aceptar conexiones TCP en el puerto 9100
 *   (configuración por defecto en la mayoría de impresoras térmicas)
 * - Node.js 14 o superior
 */

'use strict';

const net = require('net');
const http = require('http');

const PORT = 8765;
const HOST = '127.0.0.1';
const VERSION = '1.0.0';

let jobCounter = 0;

function log(msg) {
  const now = new Date().toLocaleTimeString('es-ES');
  console.log(`[${now}] ${msg}`);
}

function sendToTcpPrinter(printerIp, printerPort, dataBase64) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(dataBase64, 'base64');
    const socket = new net.Socket();
    let resolved = false;

    const done = (err) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };

    socket.setTimeout(5000);

    socket.connect(printerPort, printerIp, () => {
      log(`[TCP] Conectado a ${printerIp}:${printerPort} — enviando ${data.length} bytes`);
      socket.write(data, (writeErr) => {
        if (writeErr) {
          done(writeErr);
        } else {
          setTimeout(() => done(null), 300);
        }
      });
    });

    socket.on('timeout', () => {
      log(`[TCP] Timeout conectando a ${printerIp}:${printerPort}`);
      done(new Error(`Timeout conectando a ${printerIp}:${printerPort}`));
    });

    socket.on('error', (err) => {
      log(`[TCP] Error ${printerIp}:${printerPort} — ${err.message}`);
      done(err);
    });
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: VERSION,
      jobs: jobCounter,
      uptime: Math.floor(process.uptime()),
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { printerIp, printerPort, data } = JSON.parse(body);

        if (!printerIp || !data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Faltan printerIp o data' }));
          return;
        }

        const port = printerPort || 9100;
        jobCounter++;
        const jobId = `job-${jobCounter}`;

        log(`[Job ${jobId}] Imprimiendo en ${printerIp}:${port}`);

        await sendToTcpPrinter(printerIp, port, data);

        log(`[Job ${jobId}] OK — impresión enviada a ${printerIp}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, jobId }));

      } catch (err) {
        log(`[Error] ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      }
    });
    req.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] El puerto ${PORT} ya está en uso.`);
    console.error('Puede que el puente ya esté corriendo. Cierra la otra instancia.\n');
  } else {
    console.error('[ERROR] Servidor:', err.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   QuieroMesa — Puente de Impresión       ║');
  console.log(`  ║   v${VERSION}  Escuchando en ${HOST}:${PORT}   ║`);
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
  console.log('  ✅ Listo. Abre el monitor de cocina en el navegador.');
  console.log('  📲 El indicador "Impresora" se pondrá verde automáticamente.');
  console.log('  ⚡ Pulsa imprimir en el monitor y el ticket saldrá en cocina.');
  console.log('');
  console.log('  Para parar: Ctrl+C');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\n[Puente] Cerrando...');
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  log(`[Excepción] ${err.message}`);
});
