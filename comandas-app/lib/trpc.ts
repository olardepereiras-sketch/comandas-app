import { createTRPCReact } from '@trpc/react-query';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import type { AppRouter } from '../../backend/trpc/app-router';

export type { AppRouter };

const API_BASE = 'https://quieromesa.com/api/trpc';

const commonHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

export const trpc = createTRPCReact<AppRouter>();

const linkConfig = httpLink({
  url: API_BASE,
  headers: commonHeaders,
});

export const trpcClient = createTRPCProxyClient<AppRouter>({ links: [linkConfig] });

export async function trpcGet<T>(procedure: string, input: unknown): Promise<T> {
  const inputStr = encodeURIComponent(JSON.stringify(input));
  const url = `${API_BASE}/${procedure}?input=${inputStr}`;
  console.log(`[API] GET ${procedure}`, JSON.stringify(input).slice(0, 120));
  const res = await fetch(url, {
    method: 'GET',
    headers: commonHeaders(),
  });
  const text = await res.text();
  console.log(`[API] GET ${procedure} status=${res.status} body=${text.slice(0, 200)}`);
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta inválida del servidor (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!Array.isArray(json) && json?.error) {
    const err = json.error;
    throw Object.assign(new Error(err?.message || 'Error del servidor'), { data: err?.data });
  }
  if (Array.isArray(json)) {
    if (json[0]?.error) {
      const err = json[0].error;
      throw Object.assign(new Error(err?.message || 'Error del servidor'), { data: err?.data });
    }
    return json[0]?.result?.data as T;
  }
  return json?.result?.data as T;
}

export async function trpcPost<T>(procedure: string, input: unknown): Promise<T> {
  const url = `${API_BASE}/${procedure}`;
  console.log(`[API] POST ${procedure}`, JSON.stringify(input).slice(0, 120));
  const res = await fetch(url, {
    method: 'POST',
    headers: commonHeaders(),
    body: JSON.stringify(input),
  });
  const text = await res.text();
  console.log(`[API] POST ${procedure} status=${res.status} body=${text.slice(0, 200)}`);
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta inválida del servidor (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!Array.isArray(json) && json?.error) {
    const err = json.error;
    throw Object.assign(new Error(err?.message || 'Error del servidor'), { data: err?.data });
  }
  if (Array.isArray(json)) {
    if (json[0]?.error) {
      const err = json[0].error;
      throw Object.assign(new Error(err?.message || 'Error del servidor'), { data: err?.data });
    }
    return json[0]?.result?.data as T;
  }
  return json?.result?.data as T;
}

interface LoadDataInput {
  restaurantId: string;
  dataTypes: string[];
  since?: string;
}

interface LoadDataResult {
  data: Record<string, { data: string; updatedAt: string }>;
}

interface SaveDataInput {
  restaurantId: string;
  dataType: string;
  data: string;
}

export interface FloorPlanItem {
  tableId: string;
  tableName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: 'rectangle' | 'circle';
}

interface PrintKitchenTicketInput {
  restaurantId: string;
  printerIp: string;
  printerPort?: number;
  printerName?: string;
  tableLabel: string;
  guests: number;
  sequenceName?: string;
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
  lineSpacingItem?: number;
}

interface PrintKitchenTicketResult {
  success: boolean;
  jobId: number;
  message: string;
}

interface ValidateTokenResult {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug?: string;
  view?: string;
}

interface RestaurantDetailsResult {
  id: string;
  name: string;
  slug: string;
  active?: boolean;
}

export interface LocationItem {
  id: string;
  name: string;
  restaurantId: string;
  active?: boolean;
}

export interface TableItem {
  id: string;
  name: string;
  capacity: number;
  locationId: string;
  restaurantId: string;
  active?: boolean;
}

export interface PrinterConfig {
  id: string;
  name: string;
  type: 'thermal' | 'kitchen' | 'bar';
  ipAddress: string;
  port?: number;
  isActive: boolean;
  connectionType?: 'ip' | 'usb-windows';
  windowsPrinterName?: string;
}

export interface DeviceConfig {
  id: string;
  name: string;
  password: string;
  type: 'kitchen' | 'cashier' | 'waiter';
  monitorIndex: number;
}

export interface UserProfile {
  id: string;
  name: string;
  role?: string;
  color?: string;
}

export interface CourseSequence {
  id: string;
  name: string;
  priority: number;
  color: string;
}

export interface Characteristic {
  id: string;
  name: string;
  options: { id: string; label: string }[];
}

export interface AddOn {
  id: string;
  name: string;
  options: { id: string; label: string; price: number }[];
}

export interface PrintTemplate {
  id: string;
  name: string;
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
}

export interface TablePosition {
  x: number;
  y: number;
  rotation: number;
}

export const vanillaClient = {
  floorPlan: {
    get: {
      query: (input: { restaurantId: string; locationId: string }) =>
        trpcGet<{ planData: FloorPlanItem[] }>('comandas.getFloorPlan', input),
    },
  },
  locations: {
    list: {
      query: (input: { restaurantId: string }) =>
        trpcGet<LocationItem[]>('locations.list', input),
    },
  },
  tables: {
    list: {
      query: (input: { restaurantId: string }) =>
        trpcGet<TableItem[]>('tables.list', input),
    },
  },
  restaurants: {
    details: {
      query: (input: { restaurantId?: string; slug?: string }) =>
        trpcGet<RestaurantDetailsResult>('restaurants.details', input),
    },
  },
  comandas: {
    validateToken: {
      query: (input: { token: string }) =>
        trpcGet<ValidateTokenResult>('comandas.validateToken', input),
    },
    loadData: {
      query: (input: LoadDataInput) =>
        trpcGet<LoadDataResult>('comandas.loadData', input),
    },
    saveData: {
      mutate: (input: SaveDataInput) =>
        trpcPost<{ success: boolean }>('comandas.saveData', input),
    },
    printKitchenTicket: {
      mutate: (input: PrintKitchenTicketInput) =>
        trpcPost<PrintKitchenTicketResult>('comandas.printKitchenTicket', input),
    },
  },
};
