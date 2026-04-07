const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const SPANISH_MAP: Record<string, number> = {
  'á': 0xa0, 'é': 0x82, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3,
  'Á': 0x41, 'É': 0x45, 'Í': 0x49, 'Ó': 0x4f, 'Ú': 0x55,
  'ñ': 0xa4, 'Ñ': 0xa5,
  'ü': 0x81, 'Ü': 0x55,
  '¿': 0xa8, '¡': 0xad,
  'ª': 0xa6, 'º': 0xa7,
  '€': 0xd5,
};

function encodeText(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < 0x80) {
      bytes.push(code);
    } else {
      bytes.push(SPANISH_MAP[char] ?? 0x3f);
    }
  }
  return bytes;
}

export interface KitchenTicketItem {
  quantity: number;
  name: string;
  notes?: string | null;
  addOns?: string[];
  characteristics?: string[];
  course: string;
}

export interface KitchenTicketOptions {
  orderNumber?: number;
  tableName: string;
  locationName?: string | null;
  waiterName?: string | null;
  items: KitchenTicketItem[];
  printerWidth?: number;
}

export interface DrinkTicketOptions {
  orderNumber?: number;
  tableName: string;
  locationName?: string | null;
  waiterName?: string | null;
  items: KitchenTicketItem[];
  printerWidth?: number;
}

const COURSE_LABELS: Record<string, string> = {
  starter: 'PRIMEROS',
  main: 'SEGUNDOS',
  dessert: 'POSTRES',
  drink: 'BEBIDAS',
  other: 'OTROS',
};

function buildTicket(
  title: string,
  opts: KitchenTicketOptions,
): Uint8Array {
  const W = opts.printerWidth ?? 32;
  const buf: number[] = [];

  const add = (...bytes: number[]) => buf.push(...bytes);
  const addText = (t: string) => buf.push(...encodeText(t));
  const addLine = (t: string) => { buf.push(...encodeText(t)); add(LF); };
  const sep = () => addLine('-'.repeat(W));

  void addText;

  add(ESC, 0x40);
  add(ESC, 0x74, 0x02);

  add(ESC, 0x61, 0x01);
  add(ESC, 0x21, 0x30);
  addLine(title);
  add(ESC, 0x21, 0x00);

  add(GS, 0x21, 0x01);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const orderLabel = opts.orderNumber ? ` #${opts.orderNumber}` : '';
  const locPart = opts.locationName ? ` · ${opts.locationName}` : '';
  addLine(`Mesa: ${opts.tableName}${locPart}${orderLabel}`);
  add(GS, 0x21, 0x00);

  add(ESC, 0x61, 0x00);
  if (opts.waiterName) addLine(`Camarero: ${opts.waiterName}`);
  addLine(`Hora: ${timeStr}`);

  sep();

  const grouped: Record<string, KitchenTicketItem[]> = {};
  for (const item of opts.items) {
    const c = item.course ?? 'other';
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push(item);
  }

  const courseOrder = ['starter', 'main', 'dessert', 'drink', 'other'];
  const keys = Object.keys(grouped).sort(
    (a, b) => courseOrder.indexOf(a) - courseOrder.indexOf(b),
  );

  for (const course of keys) {
    const courseItems = grouped[course];
    const label = COURSE_LABELS[course] ?? course.toUpperCase();

    if (keys.length > 1) {
      add(ESC, 0x45, 0x01);
      addLine(`--- ${label} ---`);
      add(ESC, 0x45, 0x00);
    }

    for (const item of courseItems) {
      add(ESC, 0x21, 0x10);
      addLine(`${item.quantity}x ${item.name.toUpperCase()}`);
      add(ESC, 0x21, 0x00);

      if (item.addOns && item.addOns.length > 0) {
        for (const addon of item.addOns) {
          addLine(`  + ${addon}`);
        }
      }
      if (item.characteristics && item.characteristics.length > 0) {
        addLine(`  * ${item.characteristics.join(', ')}`);
      }
      if (item.notes) {
        add(ESC, 0x45, 0x01);
        addLine(`  NOTA: ${item.notes}`);
        add(ESC, 0x45, 0x00);
      }
    }
  }

  sep();
  add(LF, LF, LF);
  add(GS, 0x56, 0x42, 0x00);

  return new Uint8Array(buf);
}

export function buildKitchenTicket(opts: KitchenTicketOptions): Uint8Array {
  return buildTicket('COCINA', opts);
}

export function buildBarTicket(opts: DrinkTicketOptions): Uint8Array {
  return buildTicket('BARRA', opts);
}

export function buildTestTicket(printerName: string): Uint8Array {
  const buf: number[] = [];
  const add = (...bytes: number[]) => buf.push(...bytes);
  const addLine = (t: string) => { buf.push(...encodeText(t)); add(LF); };

  add(ESC, 0x40);
  add(ESC, 0x74, 0x02);
  add(ESC, 0x61, 0x01);
  add(ESC, 0x21, 0x10);
  addLine('PRUEBA DE IMPRESION');
  add(ESC, 0x21, 0x00);
  addLine(`Impresora: ${printerName}`);
  addLine(new Date().toLocaleString('es-ES'));
  addLine('--------------------------------');
  addLine('QuieroMesa Comandas');
  addLine('Conexion correcta!');
  addLine('--------------------------------');
  add(LF, LF, LF);
  add(GS, 0x56, 0x42, 0x00);

  return new Uint8Array(buf);
}
