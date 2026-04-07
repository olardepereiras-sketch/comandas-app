import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PrinterConfig {
  id: string;
  name: string;
  connectionType: 'ip' | 'usb' | 'usb-agent';
  ip: string;
  port: number;
  usbPath: string;
  agentPrinterName: string;
  width: number;
  type: 'cocina' | 'barra' | 'otro';
  enabled: boolean;
}

const STORAGE_KEY = 'quieromesa_printers_v1';

export async function getPrinters(): Promise<PrinterConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: any) => ({
      ...p,
      connectionType: p.connectionType ?? 'ip',
      usbPath: p.usbPath ?? '/dev/usb/lp0',
      agentPrinterName: p.agentPrinterName ?? '',
    }));
  } catch (err) {
    console.error('[PrinterStorage] Error reading printers:', err);
    return [];
  }
}

export async function savePrinters(printers: PrinterConfig[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(printers));
  } catch (err) {
    console.error('[PrinterStorage] Error saving printers:', err);
  }
}

export async function addPrinter(printer: Omit<PrinterConfig, 'id'>): Promise<PrinterConfig> {
  const printers = await getPrinters();
  const newPrinter: PrinterConfig = {
    ...printer,
    id: `printer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
  printers.push(newPrinter);
  await savePrinters(printers);
  return newPrinter;
}

export async function updatePrinter(id: string, updates: Partial<PrinterConfig>): Promise<void> {
  const printers = await getPrinters();
  const idx = printers.findIndex(p => p.id === id);
  if (idx >= 0) {
    printers[idx] = { ...printers[idx], ...updates };
    await savePrinters(printers);
  }
}

export async function deletePrinter(id: string): Promise<void> {
  const printers = await getPrinters();
  await savePrinters(printers.filter(p => p.id !== id));
}

export function getPrinterTypeLabel(type: PrinterConfig['type']): string {
  const map: Record<PrinterConfig['type'], string> = {
    cocina: 'Cocina',
    barra: 'Barra / Bebidas',
    otro: 'Otro',
  };
  return map[type];
}

export function getPrinterTypeColor(type: PrinterConfig['type']): string {
  const map: Record<PrinterConfig['type'], string> = {
    cocina: '#E65100',
    barra: '#1565C0',
    otro: '#546E7A',
  };
  return map[type];
}
