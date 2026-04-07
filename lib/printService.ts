import { Platform } from 'react-native';
import { buildKitchenTicket, buildBarTicket, buildTestTicket, type KitchenTicketItem } from './escpos';
import { getPrinters, type PrinterConfig } from './printerStorage';

export interface PrintJobItem extends KitchenTicketItem {
  printerTarget?: string;
}

export interface PrintJob {
  orderNumber?: number;
  tableName: string;
  locationName?: string | null;
  waiterName?: string | null;
  items: PrintJobItem[];
}

export interface PrintResult {
  printerName: string;
  success: boolean;
  error?: string;
}

async function sendToPrinterTCP(
  ip: string,
  port: number,
  data: Uint8Array,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'web') {
      reject(new Error('TCP printing not available on web'));
      return;
    }

    let TcpSocket: any;
    try {
      TcpSocket = require('react-native-tcp-socket');
    } catch {
      reject(new Error('react-native-tcp-socket no instalado. Compilar como dev build.'));
      return;
    }

    console.log(`[Print] Conectando a ${ip}:${port} (${data.length} bytes)`);

    let done = false;
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        try { client.destroy(); } catch {}
        reject(new Error(`Timeout conectando a ${ip}:${port}. Verifica que la impresora está encendida.`));
      }
    }, 8000);

    const client = TcpSocket.createConnection(
      { host: ip, port, timeout: 8000 },
      () => {
        console.log(`[Print] Conectado a ${ip}:${port}`);
        client.write(data);
        setTimeout(() => {
          if (!done) {
            done = true;
            clearTimeout(timeout);
            client.destroy();
            resolve();
          }
        }, 800);
      },
    );

    client.on('error', (err: Error) => {
      if (!done) {
        done = true;
        clearTimeout(timeout);
        try { client.destroy(); } catch {}
        reject(new Error(`Error TCP (${ip}:${port}): ${err.message}`));
      }
    });
  });
}

async function sendToPrinterUSB(
  usbPath: string,
  data: Uint8Array,
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('USB printing not available on web');
  }

  console.log(`[Print] Enviando a USB ${usbPath} (${data.length} bytes)`);

  let RNFS: any;
  try {
    RNFS = require('react-native-fs');
  } catch {
    throw new Error(
      'Para impresión USB instala react-native-fs en el proyecto y recompila la APK.',
    );
  }

  try {
    const base64 = uint8ArrayToBase64(data);
    await RNFS.write(usbPath, base64, -1, 'base64');
    console.log(`[Print] USB OK → ${usbPath}`);
  } catch (err: any) {
    throw new Error(
      `Error al escribir en ${usbPath}: ${err.message}. ` +
      'Verifica que la impresora USB está conectada y que la ruta es correcta (ej: /dev/usb/lp0).',
    );
  }
}

function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  const len = data.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

async function sendToPrinterAgent(
  ip: string,
  port: number,
  printerName: string,
  data: Uint8Array,
): Promise<void> {
  console.log(`[Print] Enviando a Agente Windows ${ip}:${port} impresora="${printerName}" (${data.length} bytes)`);
  const header = `PRINTER:${printerName}\n`;
  const headerBytes = new TextEncoder().encode(header);
  const combined = new Uint8Array(headerBytes.length + data.length);
  combined.set(headerBytes, 0);
  combined.set(data, headerBytes.length);
  await sendToPrinterTCP(ip, port, combined);
}

async function sendToPrinter(printer: PrinterConfig, data: Uint8Array): Promise<void> {
  const connType = printer.connectionType ?? 'ip';
  if (connType === 'usb') {
    await sendToPrinterUSB(printer.usbPath ?? '/dev/usb/lp0', data);
  } else if (connType === 'usb-agent') {
    await sendToPrinterAgent(
      printer.ip,
      printer.port ?? 9100,
      printer.agentPrinterName ?? '',
      data,
    );
  } else {
    await sendToPrinterTCP(printer.ip, printer.port ?? 9100, data);
  }
}

export async function printKitchenJob(job: PrintJob): Promise<PrintResult[]> {
  const printers = await getPrinters();
  const results: PrintResult[] = [];

  const drinkItems = job.items.filter(i => i.course === 'drink');
  const kitchenItems = job.items.filter(i => i.course !== 'drink');

  const groups: Array<{ items: PrintJobItem[]; printerType: 'cocina' | 'barra' }> = [];
  if (kitchenItems.length > 0) groups.push({ items: kitchenItems, printerType: 'cocina' });
  if (drinkItems.length > 0) groups.push({ items: drinkItems, printerType: 'barra' });

  for (const group of groups) {
    const printer = findPrinter(printers, group.printerType);

    if (!printer) {
      const typeName = group.printerType === 'cocina' ? 'Cocina' : 'Barra';
      console.warn(`[Print] No hay impresora configurada para: ${typeName}`);
      results.push({
        printerName: typeName,
        success: false,
        error: `No hay impresora "${typeName}" configurada. Ve a Configurar Impresoras.`,
      });
      continue;
    }

    const ticketData =
      group.printerType === 'barra'
        ? buildBarTicket({
            orderNumber: job.orderNumber,
            tableName: job.tableName,
            locationName: job.locationName,
            waiterName: job.waiterName,
            items: group.items,
            printerWidth: printer.width ?? 32,
          })
        : buildKitchenTicket({
            orderNumber: job.orderNumber,
            tableName: job.tableName,
            locationName: job.locationName,
            waiterName: job.waiterName,
            items: group.items,
            printerWidth: printer.width ?? 32,
          });

    try {
      await sendToPrinter(printer, ticketData);
      console.log(`[Print] OK → ${printer.name}`);
      results.push({ printerName: printer.name, success: true });
    } catch (err: any) {
      console.error(`[Print] Error → ${printer.name}:`, err.message);
      results.push({ printerName: printer.name, success: false, error: err.message });
    }
  }

  return results;
}

export async function printTestTicket(printer: PrinterConfig): Promise<void> {
  const data = buildTestTicket(printer.name);
  await sendToPrinter(printer, data);
}

function findPrinter(
  printers: PrinterConfig[],
  type: 'cocina' | 'barra',
): PrinterConfig | undefined {
  const typeLabels =
    type === 'cocina'
      ? ['cocina', 'kitchen', 'cook', 'cocinA']
      : ['barra', 'bar', 'bebidas', 'drinks'];

  const match = printers.find(p =>
    p.type === type ||
    typeLabels.some(label =>
      p.name.toLowerCase().includes(label.toLowerCase()),
    ),
  );

  if (match) return match;
  if (type === 'cocina' && printers.length > 0) return printers[0];
  return undefined;
}

export async function printToSpecificPrinter(
  printerName: string,
  job: PrintJob,
): Promise<PrintResult> {
  const printers = await getPrinters();
  const printer = printers.find(
    p => p.name.toLowerCase() === printerName.toLowerCase(),
  );

  if (!printer) {
    return {
      printerName: printerName,
      success: false,
      error: `Impresora "${printerName}" no encontrada.`,
    };
  }

  const isDrink = job.items.every(i => i.course === 'drink');
  const data = isDrink
    ? buildBarTicket({
        orderNumber: job.orderNumber,
        tableName: job.tableName,
        locationName: job.locationName,
        waiterName: job.waiterName,
        items: job.items,
        printerWidth: printer.width ?? 32,
      })
    : buildKitchenTicket({
        orderNumber: job.orderNumber,
        tableName: job.tableName,
        locationName: job.locationName,
        waiterName: job.waiterName,
        items: job.items,
        printerWidth: printer.width ?? 32,
      });

  try {
    await sendToPrinter(printer, data);
    return { printerName: printer.name, success: true };
  } catch (err: any) {
    return { printerName: printer.name, success: false, error: err.message };
  }
}
