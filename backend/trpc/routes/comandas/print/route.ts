// @ts-nocheck
import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';

function escposInit(): string { return ESC + '@'; }
function escposCodePage(page: number): string { return ESC + 't' + String.fromCharCode(page); }

const PC850_MAP: Record<string, string> = {
  '\u00e1': '\xa0', '\u00e9': '\x82', '\u00ed': '\xa1', '\u00f3': '\xa2', '\u00fa': '\xa3',
  '\u00c1': '\xb5', '\u00c9': '\x90', '\u00cd': '\xd6', '\u00d3': '\xe0', '\u00da': '\xe9',
  '\u00f1': '\xa4', '\u00d1': '\xa5',
  '\u00fc': '\x81', '\u00dc': '\x9a',
  '\u00f6': '\x94', '\u00d6': '\x99',
  '\u00e4': '\x84', '\u00c4': '\x8e',
  '\u00bf': '\xa8', '\u00a1': '\xad',
  '\u00aa': '\xa6', '\u00ba': '\xa7',
  '\u20ac': '?',
};

function fixSpanishChars(text: string): string {
  let result = '';
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < 0x80) {
      result += char;
    } else if (PC850_MAP[char] !== undefined) {
      result += PC850_MAP[char];
    } else {
      result += '?';
    }
  }
  return result;
}
function escposAlign(align: 'left' | 'center' | 'right'): string {
  const n = align === 'left' ? 0 : align === 'center' ? 1 : 2;
  return ESC + 'a' + String.fromCharCode(n);
}
function escposBold(on: boolean): string {
  return ESC + 'E' + String.fromCharCode(on ? 1 : 0);
}
function escposCut(): string { return GS + 'V' + String.fromCharCode(1); }
function escposFeed(lines: number): string { return ESC + 'd' + String.fromCharCode(lines); }

function escposFontSize(size: 'small' | 'medium' | 'large'): string {
  if (size === 'large') {
    return GS + '!' + String.fromCharCode(0x11);
  } else if (size === 'small') {
    return ESC + 'M' + String.fromCharCode(1);
  }
  return GS + '!' + String.fromCharCode(0x00);
}

function ptToEscPosSize(pt: number): string {
  let code = 0x00;
  if (pt >= 12 && pt < 16) code = 0x01;
  else if (pt >= 16 && pt < 20) code = 0x11;
  else if (pt >= 20 && pt < 24) code = 0x12;
  else if (pt >= 24 && pt < 28) code = 0x22;
  else if (pt >= 28 && pt < 32) code = 0x23;
  else if (pt >= 32 && pt < 38) code = 0x33;
  else if (pt >= 38 && pt < 44) code = 0x44;
  else if (pt >= 44 && pt < 52) code = 0x55;
  else if (pt >= 52) code = 0x66;
  return GS + '!' + String.fromCharCode(code);
}

function buildEscPos(data: {
  tableLabel: string;
  guests: number;
  sequenceName?: string;
  time: string;
  waiterName?: string;
  items: { qty: number; name: string; notes?: string; characteristics?: string[]; addOns?: string[] }[];
  headerLine1?: string;
  headerLine2?: string;
  footerLine1?: string;
  footerLine2?: string;
  fontSize?: 'small' | 'medium' | 'large';
  spaceBefore?: number;
  spaceAfter?: number;
  fontSizeMesa?: 'small' | 'medium' | 'large';
  fontSizeSequence?: 'small' | 'medium' | 'large';
  fontSizeInfo?: 'small' | 'medium' | 'large';
  fontSizeItem?: 'small' | 'medium' | 'large';
  fontSizePtMesa?: number;
  fontSizePtSequence?: number;
  fontSizePtInfo?: number;
  fontSizePtItem?: number;
  fontSizePtCamarero?: number;
  lineSpacingItem?: number;
}): Buffer {
  const defaultSize = data.fontSize || 'medium';
  const mesaSize = data.fontSizeMesa || defaultSize;
  const sequenceSize = data.fontSizeSequence || defaultSize;
  const infoSize = data.fontSizeInfo || defaultSize;
  const itemSize = data.fontSizeItem || defaultSize;
  const spaceBefore = data.spaceBefore || 0;
  const spaceAfter = data.spaceAfter !== undefined ? data.spaceAfter : 4;
  const lineSpacingItem = data.lineSpacingItem || 0;

  const getMesaSize = () => data.fontSizePtMesa ? ptToEscPosSize(data.fontSizePtMesa) : escposFontSize(mesaSize);
  const getSeqSize = () => data.fontSizePtSequence ? ptToEscPosSize(data.fontSizePtSequence) : escposFontSize(sequenceSize);
  const getInfoSize = () => data.fontSizePtInfo ? ptToEscPosSize(data.fontSizePtInfo) : escposFontSize(infoSize);
  const getItemSize = () => data.fontSizePtItem ? ptToEscPosSize(data.fontSizePtItem) : escposFontSize(itemSize);
  const getCamareroSize = () => data.fontSizePtCamarero ? ptToEscPosSize(data.fontSizePtCamarero) : escposFontSize(infoSize);

  let text = '';
  text += escposInit();
  text += escposCodePage(2);

  if (spaceBefore > 0) {
    text += escposFeed(spaceBefore);
  }

  if (data.headerLine1 || data.headerLine2) {
    text += escposAlign('center');
    text += escposBold(true);
    if (data.headerLine1) text += data.headerLine1 + LF;
    if (data.headerLine2) text += data.headerLine2 + LF;
    text += escposBold(false);
    text += '******************************************' + LF;
  }

  text += escposAlign('left');
  text += getMesaSize();
  text += escposBold(true);
  text += fixSpanishChars(`${data.tableLabel}`) + LF;
  text += escposBold(false);
  text += LF;

  if (data.waiterName) {
    text += getCamareroSize();
    text += fixSpanishChars(`Camarero: ${data.waiterName}`) + LF;
  }

  text += getInfoSize();
  text += fixSpanishChars(`${data.time}  ${data.guests} com.`) + LF;
  text += escposFontSize('medium');
  text += '******************************************' + LF;

  if (data.sequenceName) {
    text += escposAlign('center');
    text += getSeqSize();
    text += escposBold(true);
    text += fixSpanishChars(data.sequenceName.toUpperCase()) + LF;
    text += escposBold(false);
    text += escposAlign('left');
    text += LF;
  }

  for (const item of data.items) {
    text += getItemSize();
    text += escposBold(true);
    text += fixSpanishChars(`${item.qty}x ${item.name}`) + LF;
    text += escposBold(false);
    if (item.characteristics) {
      for (const c of item.characteristics) text += fixSpanishChars(`  * ${c}`) + LF;
    }
    if (item.addOns) {
      for (const a of item.addOns) text += fixSpanishChars(`  + ${a}`) + LF;
    }
    if (item.notes) text += fixSpanishChars(`  !! ${item.notes}`) + LF;
    if (lineSpacingItem > 0) {
      for (let ls = 0; ls < lineSpacingItem; ls++) text += LF;
    }
  }

  text += escposFontSize('medium');
  text += '******************************************' + LF;

  if (data.footerLine1 || data.footerLine2) {
    text += escposAlign('center');
    if (data.footerLine1) text += fixSpanishChars(data.footerLine1) + LF;
    if (data.footerLine2) text += fixSpanishChars(data.footerLine2) + LF;
  }

  text += escposFontSize('medium');
  const feedLines = spaceAfter > 0 ? spaceAfter : 4;
  text += escposFeed(feedLines);
  text += escposCut();
  return Buffer.from(text, 'latin1');
}

const printItemSchema = z.object({
  qty: z.number(),
  name: z.string(),
  notes: z.string().optional(),
  characteristics: z.array(z.string()).optional(),
  addOns: z.array(z.string()).optional(),
});

export const printKitchenTicketProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
    printerIp: z.string().default(''),
    printerPort: z.number().default(9100),
    printerName: z.string().optional(),
    printerType: z.enum(['tcp', 'usb']).default('tcp'),
    windowsPrinterName: z.string().optional(),
    tableLabel: z.string(),
    guests: z.number(),
    sequenceName: z.string().optional(),
    items: z.array(printItemSchema),
    headerLine1: z.string().optional(),
    headerLine2: z.string().optional(),
    footerLine1: z.string().optional(),
    footerLine2: z.string().optional(),
    fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
    spaceBefore: z.number().default(0),
    spaceAfter: z.number().optional(),
    fontSizeMesa: z.enum(['small', 'medium', 'large']).optional(),
    fontSizeSequence: z.enum(['small', 'medium', 'large']).optional(),
    fontSizeInfo: z.enum(['small', 'medium', 'large']).optional(),
    fontSizeItem: z.enum(['small', 'medium', 'large']).optional(),
    fontSizePtMesa: z.number().optional(),
    fontSizePtSequence: z.number().optional(),
    fontSizePtInfo: z.number().optional(),
    fontSizePtItem: z.number().optional(),
    fontSizePtCamarero: z.number().optional(),
    waiterName: z.string().optional(),
    lineSpacingItem: z.number().optional(),
  }))
  .mutation(async ({ input, ctx }: { input: { restaurantId: string; printerIp: string; printerPort: number; printerName?: string; printerType: 'tcp' | 'usb'; windowsPrinterName?: string; tableLabel: string; guests: number; sequenceName?: string; items: { qty: number; name: string; notes?: string; characteristics?: string[]; addOns?: string[] }[]; headerLine1?: string; headerLine2?: string; footerLine1?: string; footerLine2?: string; fontSize: 'small' | 'medium' | 'large'; spaceBefore: number; spaceAfter?: number; fontSizeMesa?: 'small' | 'medium' | 'large'; fontSizeSequence?: 'small' | 'medium' | 'large'; fontSizeInfo?: 'small' | 'medium' | 'large'; fontSizeItem?: 'small' | 'medium' | 'large'; fontSizePtMesa?: number; fontSizePtSequence?: number; fontSizePtInfo?: number; fontSizePtItem?: number; fontSizePtCamarero?: number; waiterName?: string; lineSpacingItem?: number }; ctx: any }) => {
    if (input.printerType === 'tcp' && (!input.printerIp || input.printerIp.trim() === '')) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'La impresora no tiene IP configurada' });
    }
    if (input.printerType === 'usb' && (!input.windowsPrinterName || input.windowsPrinterName.trim() === '')) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'La impresora USB no tiene nombre de Windows configurado' });
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const data = buildEscPos({
      tableLabel: input.tableLabel,
      guests: input.guests,
      sequenceName: input.sequenceName,
      time: timeStr,
      items: input.items,
      headerLine1: input.headerLine1,
      headerLine2: input.headerLine2,
      footerLine1: input.footerLine1,
      footerLine2: input.footerLine2,
      fontSize: input.fontSize,
      spaceBefore: input.spaceBefore,
      spaceAfter: input.spaceAfter,
      fontSizeMesa: input.fontSizeMesa,
      fontSizeSequence: input.fontSizeSequence,
      fontSizeInfo: input.fontSizeInfo,
      fontSizeItem: input.fontSizeItem,
      fontSizePtMesa: input.fontSizePtMesa,
      fontSizePtSequence: input.fontSizePtSequence,
      fontSizePtInfo: input.fontSizePtInfo,
      fontSizePtItem: input.fontSizePtItem,
      fontSizePtCamarero: input.fontSizePtCamarero,
      waiterName: input.waiterName,
      lineSpacingItem: input.lineSpacingItem,
    });

    const dataHex = data.toString('hex');

    await ctx.db.query(`
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

    await ctx.db.query(`
      ALTER TABLE comanda_print_jobs
        ADD COLUMN IF NOT EXISTS printer_type VARCHAR(20) DEFAULT 'tcp',
        ADD COLUMN IF NOT EXISTS windows_printer_name VARCHAR(255)
    `).catch(() => {});

    const result = await ctx.db.query(
      `INSERT INTO comanda_print_jobs (restaurant_id, printer_ip, printer_port, printer_name, printer_type, windows_printer_name, data_hex, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id`,
      [input.restaurantId, input.printerIp.trim(), input.printerPort, input.printerName || null, input.printerType || 'tcp', input.windowsPrinterName?.trim() || null, dataHex]
    );

    const jobId = result.rows[0].id;
    const connInfo = input.printerType === 'usb' ? `USB:${input.windowsPrinterName}` : `${input.printerIp}:${input.printerPort}`;
    console.log(`[Print] Queued job #${jobId} → ${connInfo} (${input.items.length} items, restaurant: ${input.restaurantId})`);

    await ctx.db.query(
      `DELETE FROM comanda_print_jobs WHERE created_at < NOW() - INTERVAL '2 hours' AND restaurant_id = $1`,
      [input.restaurantId]
    ).catch(() => {});

    return { success: true, jobId, message: `Trabajo de impresión #${jobId} en cola para agente local` };
  });
