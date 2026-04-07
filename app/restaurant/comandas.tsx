// @ts-nocheck
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  PanResponder,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Settings,
  Smartphone,
  Monitor,
  ChefHat,
  Plus,
  Trash2,
  Check,
  X,
  UtensilsCrossed,
  CheckCircle2,
  Edit3,
  Lock,
  MapPin,
  Link2,
  LayoutGrid,
  Printer,
  FolderOpen,
  Import,
  RotateCw,
  Move,
  Users,
  Baby,
  Dog,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Minus,
  AlertCircle,
  Maximize2,
  Minimize2,
  FileText,
  Download,
  Package,
  CalendarDays,
  RotateCcw,
  Bell,
  Volume2,
} from 'lucide-react-native';
import { trpc, vanillaClient } from '@/lib/trpc';
import { getRestaurantId } from '@/lib/restaurantSession';
import type { Table, TableLocation } from '@/types';

const C = {
  bg: '#0f1117',
  surface: '#181c27',
  card: '#1e2235',
  border: '#252840',
  accent: '#f97316',
  accentDim: '#7c3a12',
  green: '#22c55e',
  greenDark: '#14532d',
  yellow: '#eab308',
  yellowDark: '#713f12',
  red: '#ef4444',
  text: '#f1f5f9',
  textMuted: '#64748b',
  textDim: '#94a3b8',
  blue: '#3b82f6',
  blueDim: '#1e3a5f',
  canvas: '#0c0f18',
  tableFree: '#1e2a38',
  tableOccupied: '#7c3a12',
  tableReady: '#14532d',
  chair: '#2a3548',
  chairOccupied: '#5c2a08',
  chairReady: '#0f3d1f',
  purple: '#8b5cf6',
  purpleDim: '#3b1f7a',
};

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://quieromesa.com';

const { width: _SW } = Dimensions.get('window');
const RATIO_W = 5;
const RATIO_H = 3;
function getCanvasDimensions(isPC: boolean) {
  const sw = _SW > 100 ? _SW : 390;
  if (isPC) {
    const w = Math.round(Math.max(sw * 0.65, 400));
    const h = Math.round(w * RATIO_H / RATIO_W);
    return { w, h };
  }
  const w = Math.round(Math.max(Math.min(sw, 500), 300));
  const h = Math.round(w * RATIO_W / RATIO_H);
  return { w, h };
}
const _pcDim = getCanvasDimensions(true);
const _mobDim = getCanvasDimensions(false);
const CANVAS_W = _mobDim.w;
const CANVAS_H = _mobDim.h;
const CANVAS_W_PC = _pcDim.w;
const CANVAS_H_PC = _pcDim.h;
const OLD_CANVAS_W = 1200;
const OLD_CANVAS_H = 800;
const CARD_W = 92;
const CARD_H = 78;
const TABLE_W = 58;
const TABLE_H = 46;
const CHAIR_D = 11;
const CHAIR_GAP = 4;

type MainView = 'config' | 'comandera' | 'pc' | 'cocina';
type ConfigSection = 'main' | 'planos' | 'familias' | 'impresoras' | 'importar' | 'caracteristicas' | 'secuencias' | 'plantillas' | 'instalacion' | 'dispositivos';

interface UserProfile {
  id: string;
  name: string;
  pin?: string;
  role?: string;
  color?: string;
}

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  notes: string;
  price: number;
  categoryName: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  printerId?: string;
  sendToMonitor?: boolean;
  createdAt: number;
  selectedCharacteristics?: { charId: string; charName: string; optionLabel: string }[];
  selectedAddOns?: { addOnId: string; addOnName: string; optionId: string; optionLabel: string; price: number }[];
  courseSequenceId?: string;
  courseSequenceName?: string;
  courseSequenceColor?: string;
}

interface Order {
  id: string;
  tableNumber: number;
  tableLabel: string;
  tableId?: string;
  locationId?: string;
  items: OrderItem[];
  guests: number;
  createdAt: number;
  status: 'open' | 'ready' | 'closed';
  reservationInfo?: {
    clientName: string;
    time: string;
    guests: number;
    highChairs: number;
    strollers: boolean;
    pets: boolean;
  } | null;
}

interface TablePosition {
  x: number;
  y: number;
  rotation: number;
}

interface DecorativeElement {
  id: string;
  type: 'plant' | 'wall' | 'wall2' | 'door' | 'screen' | 'chair' | 'bar' | 'pillar' | 'stairs';
  x: number;
  y: number;
  rotation: number;
  label?: string;
  scaleW?: number;
  scaleH?: number;
}

interface ComandasExtraTable {
  id: string;
  name: string;
  type: 'table' | 'chair';
  capacity: number;
  locationId: string;
}

interface ComandasFamily {
  id: string;
  name: string;
  color: string;
  order: number;
  categories: ComandasCategory[];
}

interface ComandasCategory {
  id: string;
  familyId: string;
  name: string;
  color: string;
  order: number;
  items: ComandasProduct[];
}

interface ComandasProduct {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  price2?: number;
  price2Label?: string;
  price3?: number;
  price3Label?: string;
  description: string;
  printerId: string;
  sendToMonitor: boolean;
  order: number;
  characteristicIds?: string[];
  addOnIds?: string[];
  hasStockControl?: boolean;
  stockDeductionRules?: StockDeductionRule[];
  stockDeductionRules2?: StockDeductionRule[];
  stockDeductionRules3?: StockDeductionRule[];
}

interface StockEntry {
  productId: string;
  quantity: number | null;
  date: string;
  setAt?: number;
}

interface CharacteristicOption {
  id: string;
  label: string;
}
interface Characteristic {
  id: string;
  name: string;
  options: CharacteristicOption[];
}
interface AddOnOption {
  id: string;
  label: string;
  price: number;
}
interface AddOn {
  id: string;
  name: string;
  options: AddOnOption[];
}

interface PrinterConfig {
  id: string;
  name: string;
  type: 'thermal' | 'kitchen' | 'bar';
  ipAddress: string;
  port?: number;
  isActive: boolean;
  connectionType?: 'ip' | 'usb-windows';
  windowsPrinterName?: string;
}

interface DeviceConfig {
  id: string;
  name: string;
  password: string;
  type: 'kitchen' | 'cashier' | 'waiter';
  monitorIndex: number;
}

interface CourseSequence {
  id: string;
  name: string;
  priority: number;
  color: string;
}

interface PrintTemplate {
  id: string;
  name: string;
  headerLine1: string;
  headerLine2: string;
  footerLine1: string;
  footerLine2: string;
  fontSize: 'small' | 'medium' | 'large';
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

interface StockDeductionRule {
  productId: string;
  percentage: number;
}


const DECORATIVE_TYPES: { type: DecorativeElement['type']; label: string; icon: string; w: number; h: number }[] = [
  { type: 'plant', label: 'Planta', icon: '🌿', w: 28, h: 28 },
  { type: 'wall', label: 'Pared Ext.', icon: '🧱', w: 90, h: 14 },
  { type: 'wall2', label: 'Pared Int.', icon: '🪵', w: 90, h: 10 },
  { type: 'door', label: 'Puerta', icon: '🚪', w: 52, h: 20 },
  { type: 'screen', label: 'Pantalla', icon: '🖥️', w: 36, h: 24 },
  { type: 'chair', label: 'Silla', icon: '🪑', w: 20, h: 20 },
  { type: 'bar', label: 'Barra', icon: '🍸', w: 100, h: 20 },
  { type: 'pillar', label: 'Pilar', icon: '⬜', w: 18, h: 18 },
  { type: 'stairs', label: 'Escalera', icon: '🪜', w: 40, h: 40 },
];

const CATEGORY_COLORS = [
  '#f97316', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#eab308', '#06b6d4', '#64748b',
];

const SEQUENCE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6',
  '#ec4899', '#14b8a6', '#eab308',
];

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function timeSince(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'ahora';
  if (mins === 1) return '1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}min`;
}

function getDefaultPosition(index: number): TablePosition {
  const cols = Math.max(1, Math.floor((CANVAS_W - 20) / (CARD_W + 18)));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: 20 + col * (CARD_W + 18),
    y: 20 + row * (CARD_H + 18),
    rotation: 0,
  };
}

function scaleStoredPosition(pos: TablePosition): TablePosition {
  if (pos.x < CANVAS_W && pos.y < CANVAS_H) return pos;
  const sx = CANVAS_W / OLD_CANVAS_W;
  const sy = CANVAS_H / OLD_CANVAS_H;
  return {
    ...pos,
    x: Math.min(Math.round(pos.x * sx), CANVAS_W - CARD_W),
    y: Math.min(Math.round(pos.y * sy), CANVAS_H - CARD_H),
  };
}

function getChairCenters(capacity: number): { cx: number; cy: number }[] {
  const tx = (CARD_W - TABLE_W) / 2;
  const ty = (CARD_H - TABLE_H) / 2;
  const txEnd = tx + TABLE_W;
  const tyEnd = ty + TABLE_H;
  const r = CHAIR_D / 2;
  const g = CHAIR_GAP;
  const centers: { cx: number; cy: number }[] = [];

  const topRow = (n: number) => {
    for (let i = 0; i < n; i++) {
      centers.push({ cx: tx + (TABLE_W * (i + 1)) / (n + 1), cy: ty - g - r });
    }
  };
  const bottomRow = (n: number) => {
    for (let i = 0; i < n; i++) {
      centers.push({ cx: tx + (TABLE_W * (i + 1)) / (n + 1), cy: tyEnd + g + r });
    }
  };
  const leftCol = (n: number) => {
    for (let i = 0; i < n; i++) {
      centers.push({ cx: tx - g - r, cy: ty + (TABLE_H * (i + 1)) / (n + 1) });
    }
  };
  const rightCol = (n: number) => {
    for (let i = 0; i < n; i++) {
      centers.push({ cx: txEnd + g + r, cy: ty + (TABLE_H * (i + 1)) / (n + 1) });
    }
  };

  const cap = Math.min(Math.max(capacity, 2), 12);
  if (cap <= 2) { topRow(1); bottomRow(1); }
  else if (cap <= 4) { topRow(1); bottomRow(1); leftCol(1); rightCol(1); }
  else if (cap <= 6) { topRow(2); bottomRow(2); leftCol(1); rightCol(1); }
  else if (cap <= 8) { topRow(2); bottomRow(2); leftCol(2); rightCol(2); }
  else { topRow(3); bottomRow(3); leftCol(2); rightCol(2); }

  return centers;
}

function getDecoSize(type: DecorativeElement['type']): { w: number; h: number } {
  return DECORATIVE_TYPES.find((d) => d.type === type) ?? { w: 30, h: 30 };
}

function getDecoEmoji(type: DecorativeElement['type']): string {
  return DECORATIVE_TYPES.find((d) => d.type === type)?.icon ?? '❓';
}

export default function ComandasScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ view?: string; token?: string }>();
  const initialView = useMemo<MainView>(() => {
    const v = params.view;
    if (v === 'comandera' || v === 'pc' || v === 'cocina' || v === 'config') return v;
    return 'comandera';
  }, [params.view]);
  const [mainView, setMainView] = useState<MainView>(initialView);
  const isTokenMode = useMemo(() => {
    let tokenParam = params.token || '';
    if (!tokenParam && Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      tokenParam = urlParams.get('token') || '';
    }
    if (tokenParam) return true;
    const v = params.view;
    if (v === 'cocina' || v === 'comandera' || v === 'pc') {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('view')) return true;
      }
      return true;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const uv = urlParams.get('view');
      if (uv === 'cocina' || uv === 'comandera' || uv === 'pc') return true;
    }
    return false;
  }, [params.view, params.token]);
  const isKitchenOnly = useMemo(() => {
    return isTokenMode && mainView === 'cocina';
  }, [isTokenMode, mainView]);
  const isComanderaOnly = useMemo(() => {
    return isTokenMode && mainView === 'comandera';
  }, [isTokenMode, mainView]);
  const isPCOnly = useMemo(() => {
    return isTokenMode && mainView === 'pc';
  }, [isTokenMode, mainView]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get('view');
      if (v === 'comandera' || v === 'pc' || v === 'cocina' || v === 'config') {
        setMainView(v);
      }
    }
  }, []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [positions, setPositions] = useState<Record<string, TablePosition>>({});
  const [decorations, setDecorations] = useState<Record<string, DecorativeElement[]>>({});
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [families, setFamilies] = useState<ComandasFamily[]>([]);
  const [categories, setCategories] = useState<ComandasCategory[]>([]);
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [extraTables, setExtraTables] = useState<ComandasExtraTable[]>([]);
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [sequences, setSequences] = useState<CourseSequence[]>([]);
  const [printTemplates, setPrintTemplates] = useState<PrintTemplate[]>([]);
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tick, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const lastSyncRef = useRef<string | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef(false);
  const isScreenActiveRef = useRef(true);

  const syncFromServer = useCallback(async (rid: string, isInitial: boolean) => {
    try {
      const dataTypes = ['orders', 'positions', 'decorations', 'families', 'categories', 'printers', 'characteristics', 'addOns', 'extraTables', 'stockData', 'sequences', 'printTemplates', 'devices', 'users'];
      const result = await vanillaClient.comandas.loadData.query({
        restaurantId: rid,
        dataTypes,
        since: isInitial ? undefined : (lastSyncRef.current || undefined),
      });
      if (result && result.data) {
        let latestTs = lastSyncRef.current;
        const applyData = (key: string, setter: (v: any) => void) => {
          const entry = result.data[key];
          if (entry && entry.data) {
            try {
              setter(JSON.parse(entry.data));
              if (!latestTs || entry.updatedAt > latestTs) latestTs = entry.updatedAt;
            } catch { /* */ }
          }
        };
        applyData('orders', setOrders);
        applyData('positions', setPositions);
        applyData('decorations', setDecorations);
        applyData('families', setFamilies);
        applyData('categories', setCategories);
        applyData('printers', setPrinters);
        applyData('characteristics', setCharacteristics);
        applyData('addOns', setAddOns);
        applyData('extraTables', setExtraTables);
        applyData('stockData', setStockData);
        applyData('sequences', setSequences);
        applyData('printTemplates', setPrintTemplates);
        applyData('devices', setDevices);
        applyData('users', setUsers);
        if (latestTs) lastSyncRef.current = latestTs;
        console.log('[Comandas Sync]', isInitial ? 'Initial load' : 'Poll update', Object.keys(result.data).length, 'types');
      }
    } catch (e) {
      console.log('[Comandas Sync] Error:', e);
    }
  }, []);

  const saveToServer = useCallback(async (rid: string, dataType: string, data: any) => {
    try {
      await vanillaClient.comandas.saveData.mutate({
        restaurantId: rid,
        dataType,
        data: JSON.stringify(data),
      });
      lastSyncRef.current = new Date().toISOString();
    } catch (e) {
      console.log('[Comandas Sync] Save error:', dataType, e);
    }
  }, []);

  useEffect(() => {
    tickRef.current = setInterval(() => setTick((t: number) => t + 1), 30000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  useEffect(() => {
    const initSession = async () => {
      let tokenParam = params.token || '';
      if (!tokenParam && Platform.OS === 'web' && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        tokenParam = urlParams.get('token') || '';
      }
      if (tokenParam) {
        console.log('[Comandas] Token mode, validating token:', tokenParam);
        try {
          const result = await vanillaClient.comandas.validateToken.query({ token: tokenParam });
          if (result && result.restaurantId) {
            console.log('[Comandas] Token valid, restaurant:', result.restaurantName);
            setRestaurantId(result.restaurantId);
            setSessionLoading(false);
            return;
          }
        } catch (e) {
          console.error('[Comandas] Token validation error:', e);
        }
      }
      const id = await getRestaurantId();
      setRestaurantId(id);
      setSessionLoading(false);
    };
    void initSession();
  }, [params.token]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = (): void => {
      isScreenActiveRef.current = document.visibilityState === 'visible';
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    void syncFromServer(restaurantId, true);
    syncIntervalRef.current = setInterval(() => {
      if (!isSavingRef.current && restaurantId && isScreenActiveRef.current) {
        void syncFromServer(restaurantId, false);
      }
    }, 60000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [restaurantId, syncFromServer]);

  const locationsQuery = trpc.locations.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );
  const tablesQuery = trpc.tables.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );
  const reservationsQuery = trpc.reservations.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId, refetchInterval: 60000 }
  );

  const menusQuery = trpc.digitalMenus.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );

  const digitalMenus = useMemo(() => (menusQuery.data as any[]) || [], [menusQuery.data]);

  const locations = useMemo(() => locationsQuery.data || [], [locationsQuery.data]);
  const allTables = useMemo(() => tablesQuery.data || [], [tablesQuery.data]);
  const allReservations = useMemo(() => {
    const data = reservationsQuery.data || [];
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    console.log('[Comandas] allReservations filter, today:', today, 'total data:', data.length);
    return data.filter((r: any) => {
      const dateField = r.date || r.reservationDate || r.bookingDate || '';
      const rDate = dateField ? String(dateField).split('T')[0] : '';
      const statusBad = r.status === 'cancelled' || r.status === 'no-show' || r.status === 'cancelada' || r.status === 'noshow' || r.status === 'rejected';
      return rDate === today && !statusBad;
    });
  }, [reservationsQuery.data]);

  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const currentTables = useMemo(
    () => allTables.filter((t: Table) => t.locationId === selectedLocationId),
    [allTables, selectedLocationId]
  );

  const persist = useCallback((next: Order[]) => {
    setOrders(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'orders', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const savePositions = useCallback((next: Record<string, TablePosition>) => {
    setPositions(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'positions', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const saveDecorations = useCallback((locId: string, next: DecorativeElement[]) => {
    setDecorations((prev: Record<string, DecorativeElement[]>) => {
      const updated = { ...prev, [locId]: next };
      if (restaurantId) {
        isSavingRef.current = true;
        void saveToServer(restaurantId, 'decorations', updated).finally(() => { isSavingRef.current = false; });
      }
      return updated;
    });
  }, [restaurantId, saveToServer]);

  const saveFamilies = useCallback((next: ComandasFamily[]) => {
    setFamilies(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'families', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const saveCategories = useCallback((next: ComandasCategory[]) => {
    setCategories(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'categories', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const savePrinters = useCallback((next: PrinterConfig[]) => {
    setPrinters(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'printers', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const saveCharacteristics = useCallback((next: Characteristic[]) => {
    setCharacteristics(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'characteristics', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const saveAddOns = useCallback((next: AddOn[]) => {
    setAddOns(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'addOns', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const saveExtraTables = useCallback((next: ComandasExtraTable[]) => {
    setExtraTables(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'extraTables', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const saveStockData = useCallback((next: StockEntry[]) => {
    setStockData(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'stockData', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const saveSequences = useCallback((next: CourseSequence[]) => {
    setSequences(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'sequences', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const savePrintTemplates = useCallback((next: PrintTemplate[]) => {
    setPrintTemplates(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'printTemplates', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const saveDevices = useCallback((next: DeviceConfig[]) => {
    setDevices(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'devices', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const saveUsers = useCallback((next: UserProfile[]) => {
    setUsers(next);
    if (restaurantId) {
      isSavingRef.current = true;
      void saveToServer(restaurantId, 'users', next).finally(() => { isSavingRef.current = false; });
    }
  }, [restaurantId, saveToServer]);

  const getTablePosition = useCallback(
    (tableId: string, index: number): TablePosition => {
      const stored = positions[tableId];
      if (!stored) return getDefaultPosition(index);
      return scaleStoredPosition(stored);
    },
    [positions]
  );

  const handlePositionChange = useCallback(
    (tableId: string, pos: TablePosition) => {
      const clamped: TablePosition = {
        x: Math.max(0, Math.min(CANVAS_W_PC - CARD_W, pos.x)),
        y: Math.max(0, Math.min(CANVAS_H_PC - CARD_H, pos.y)),
        rotation: pos.rotation,
      };
      savePositions({ ...positions, [tableId]: clamped });
    },
    [positions, savePositions]
  );


  const openOrders = useMemo(() => orders.filter((o: Order) => o.status !== 'closed'), [orders]);

  const getOrderForTable = useCallback(
    (table: Table): Order | null => {
      return openOrders.find(
        (o: Order) => (o.tableId && o.tableId === table.id) || o.tableLabel === table.name
      ) || null;
    },
    [openOrders]
  );

  const getReservationForTable = useCallback(
    (table: Table) => {
      return allReservations.find((r: any) =>
        r.tableIds && r.tableIds.includes(table.id)
      ) || null;
    },
    [allReservations]
  );

  const handleCopyLink = useCallback(async (view: MainView) => {
    const viewParam = view === 'comandera' ? 'comandera' : view === 'pc' ? 'pc' : 'cocina';
    if (!restaurantId) {
      Alert.alert('Error', 'No se ha encontrado el restaurante');
      return;
    }
    try {
      const result = await vanillaClient.comandas.generateToken.mutate({ restaurantId });
      if (result && result.token) {
        const url = `${BASE_URL}/restaurant/comandas?token=${result.token}&view=${viewParam}`;
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          Alert.alert('Enlace copiado', `Enlace de ${viewParam} copiado al portapapeles.\n\n${url}`);
        } else {
          Alert.alert('Enlace', url);
        }
      } else {
        Alert.alert('Error', 'No se pudo generar el token de acceso');
      }
    } catch (e: any) {
      console.error('[Comandas] Error generating token:', e);
      const fallbackUrl = `${BASE_URL}/restaurant/comandas?view=${viewParam}`;
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fallbackUrl);
        Alert.alert('Enlace copiado (sin token)', fallbackUrl);
      } else {
        Alert.alert('Enlace', fallbackUrl);
      }
    }
  }, [restaurantId]);

  const pendingItemsCount = openOrders.reduce(
    (acc: number, o: Order) => acc + o.items.filter((i: OrderItem) => i.status === 'pending').length, 0
  );

  const handleEnterFullscreen = useCallback(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const elem = document.documentElement as any;
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
      } catch (e) {
        console.log('[Fullscreen] Error:', e);
      }
    }
  }, []);

  const handleExitFullscreen = useCallback(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const doc = document as any;
        if (doc.exitFullscreen) {
          doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      } catch (e) {
        console.log('[Fullscreen] Exit error:', e);
      }
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.close();
      setTimeout(() => { window.history.back(); }, 300);
    }
  }, []);

  useEffect(() => {
    if (isTokenMode) {
      handleEnterFullscreen();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const tryFullscreen = () => {
          try {
            const elem = document.documentElement as any;
            if (elem.requestFullscreen) {
              elem.requestFullscreen().catch(() => {});
            } else if (elem.webkitRequestFullscreen) {
              elem.webkitRequestFullscreen();
            }
          } catch { /* */ }
        };
        const handler = () => { tryFullscreen(); document.removeEventListener('click', handler); };
        document.addEventListener('click', handler, { once: true });
        return () => { document.removeEventListener('click', handler); };
      }
    }
  }, [isTokenMode, handleEnterFullscreen]);

  const fullscreenTitle = mainView === 'cocina' ? 'Monitor de Cocina' : mainView === 'pc' ? 'PC' : 'Comandera';
  const FullscreenIcon = mainView === 'cocina' ? ChefHat : mainView === 'pc' ? Monitor : Smartphone;

  return (
    <View style={[s.container, (mainView === 'cocina' && !isTokenMode) && { backgroundColor: '#ffffff' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {isTokenMode ? (
        <View style={s.kitchenFullscreenHeader}>
          <TouchableOpacity
            style={s.kitchenExitBtn}
            onPress={handleExitFullscreen}
            activeOpacity={0.8}
          >
            <X size={16} color={C.red} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={s.kitchenFullscreenHeaderLeft}>
            <FullscreenIcon size={16} color={C.accent} strokeWidth={2.5} />
            <Text style={s.kitchenFullscreenTitle}>{fullscreenTitle}</Text>
          </View>
          <TouchableOpacity
            style={s.fullscreenToggleBtn}
            onPress={handleEnterFullscreen}
            activeOpacity={0.8}
          >
            <Maximize2 size={14} color={C.textDim} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[s.topBar, { paddingTop: insets.top + 4 }]}>
          <View style={s.topBarRow}>
            <View style={s.topBarLeft}>
              <UtensilsCrossed size={18} color={C.accent} strokeWidth={2.5} />
              <Text style={s.topBarTitle}>Comandas</Text>
              {pendingItemsCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{pendingItemsCount}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={s.mainTabs}>
            {([
              { key: 'config' as MainView, label: 'Configuración', Icon: Settings },
              { key: 'comandera' as MainView, label: 'Comandera', Icon: Smartphone },
              { key: 'pc' as MainView, label: 'PC', Icon: Monitor },
              { key: 'cocina' as MainView, label: 'Monitor Cocina', Icon: ChefHat },
            ]).map(({ key, label, Icon }) => (
              <View key={key} style={s.mainTabWrapper}>
                <TouchableOpacity
                  style={[s.mainTab, mainView === key && s.mainTabActive]}
                  onPress={() => setMainView(key)}
                  activeOpacity={0.8}
                >
                  <Icon
                    size={16}
                    color={mainView === key ? '#fff' : C.textMuted}
                    strokeWidth={2.5}
                  />
                  <Text style={[s.mainTabText, mainView === key && s.mainTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
                {key !== 'config' && (
                  <TouchableOpacity
                    style={s.copyLinkBtn}
                    onPress={() => handleCopyLink(key)}
                    activeOpacity={0.7}
                  >
                    <Link2 size={12} color={C.textMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {(isKitchenOnly || (!isTokenMode && mainView === 'cocina')) && (
        <KitchenMonitorView
          orders={openOrders}
          allOrders={orders}
          persist={persist}
          tick={tick}
          categories={categories}
          stockData={stockData}
          onSaveStockData={saveStockData}
          sequences={sequences}
          reservations={allReservations}
          rawReservations={reservationsQuery.data || []}
          printTemplates={printTemplates}
          printers={printers}
          allTables={allTables}
          restaurantId={restaurantId}
        />
      )}

      {!isTokenMode && mainView === 'config' && (
        <ConfigView
          restaurantId={restaurantId}
          locations={locations}
          allTables={allTables}
          selectedLocationId={selectedLocationId}
          onSelectLocation={setSelectedLocationId}
          positions={positions}
          onPositionChange={handlePositionChange}
          decorations={decorations}
          onSaveDecorations={saveDecorations}
          families={families}
          onSaveFamilies={saveFamilies}
          categories={categories}
          onSaveCategories={saveCategories}
          printers={printers}
          onSavePrinters={savePrinters}
          characteristics={characteristics}
          onSaveCharacteristics={saveCharacteristics}
          addOns={addOns}
          onSaveAddOns={saveAddOns}
          loading={sessionLoading || locationsQuery.isLoading || tablesQuery.isLoading}
          digitalMenus={digitalMenus}
          getTablePosition={getTablePosition}
          savePositions={savePositions}
          allPositions={positions}
          extraTables={extraTables}
          onSaveExtraTables={saveExtraTables}
          sequences={sequences}
          onSaveSequences={saveSequences}
          printTemplates={printTemplates}
          onSavePrintTemplates={savePrintTemplates}
          devices={devices}
          onSaveDevices={saveDevices}
          users={users}
          onSaveUsers={saveUsers}
        />
      )}
      {(isComanderaOnly || (!isTokenMode && mainView === 'comandera')) && (
        <ComanderaView
          tables={currentTables}
          extraTables={extraTables.filter((t: ComandasExtraTable) => t.locationId === selectedLocationId)}
          locations={locations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={setSelectedLocationId}
          orders={openOrders}
          allOrders={orders}
          getTablePosition={getTablePosition}
          onPositionChange={handlePositionChange}
          decorations={decorations[selectedLocationId || ''] || []}
          families={families}
          categories={categories}
          characteristics={characteristics}
          addOns={addOns}
          persist={persist}
          getOrderForTable={getOrderForTable}
          getReservationForTable={getReservationForTable}
          loading={sessionLoading || locationsQuery.isLoading || tablesQuery.isLoading}
          tick={tick}
          isPC={false}
          stockData={stockData}
          sequences={sequences}
          printers={printers}
          printTemplates={printTemplates}
          restaurantId={restaurantId}
        />
      )}
      {(isPCOnly || (!isTokenMode && mainView === 'pc')) && (
        <ComanderaView
          tables={currentTables}
          extraTables={extraTables.filter((t: ComandasExtraTable) => t.locationId === selectedLocationId)}
          locations={locations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={setSelectedLocationId}
          orders={openOrders}
          allOrders={orders}
          getTablePosition={getTablePosition}
          onPositionChange={handlePositionChange}
          decorations={decorations[selectedLocationId || ''] || []}
          families={families}
          categories={categories}
          characteristics={characteristics}
          addOns={addOns}
          persist={persist}
          getOrderForTable={getOrderForTable}
          getReservationForTable={getReservationForTable}
          loading={sessionLoading || locationsQuery.isLoading || tablesQuery.isLoading}
          tick={tick}
          isPC={true}
          stockData={stockData}
          sequences={sequences}
          printers={printers}
          printTemplates={printTemplates}
          restaurantId={restaurantId}
        />
      )}
    </View>
  );
}

function ConfigView({
  restaurantId,
  locations,
  allTables,
  selectedLocationId,
  onSelectLocation,
  positions: _positions,
  onPositionChange,
  decorations,
  onSaveDecorations,
  families,
  onSaveFamilies,
  categories,
  onSaveCategories,
  printers,
  onSavePrinters,
  characteristics,
  onSaveCharacteristics,
  addOns,
  onSaveAddOns,
  loading,
  digitalMenus,
  getTablePosition,
  savePositions,
  allPositions,
  extraTables,
  onSaveExtraTables,
  sequences,
  onSaveSequences,
  printTemplates,
  onSavePrintTemplates,
  devices,
  onSaveDevices,
  users,
  onSaveUsers,
}: {
  restaurantId: string | null;
  locations: TableLocation[];
  allTables: Table[];
  selectedLocationId: string | null;
  onSelectLocation: (id: string) => void;
  positions: Record<string, TablePosition>;
  onPositionChange: (tableId: string, pos: TablePosition) => void;
  decorations: Record<string, DecorativeElement[]>;
  onSaveDecorations: (locId: string, items: DecorativeElement[]) => void;
  families: ComandasFamily[];
  onSaveFamilies: (fams: ComandasFamily[]) => void;
  categories: ComandasCategory[];
  onSaveCategories: (cats: ComandasCategory[]) => void;
  printers: PrinterConfig[];
  onSavePrinters: (p: PrinterConfig[]) => void;
  characteristics: Characteristic[];
  onSaveCharacteristics: (c: Characteristic[]) => void;
  addOns: AddOn[];
  onSaveAddOns: (a: AddOn[]) => void;
  loading: boolean;
  digitalMenus: any[];
  getTablePosition: (id: string, index: number) => TablePosition;
  savePositions: (p: Record<string, TablePosition>) => void;
  allPositions: Record<string, TablePosition>;
  extraTables: ComandasExtraTable[];
  onSaveExtraTables: (t: ComandasExtraTable[]) => void;
  sequences: CourseSequence[];
  onSaveSequences: (s: CourseSequence[]) => void;
  printTemplates: PrintTemplate[];
  onSavePrintTemplates: (t: PrintTemplate[]) => void;
  devices: DeviceConfig[];
  onSaveDevices: (d: DeviceConfig[]) => void;
  users?: UserProfile[];
  onSaveUsers?: (u: UserProfile[]) => void;
}) {
  const [section, setSection] = useState<ConfigSection>('main');
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateHeader1, setTemplateHeader1] = useState('');
  const [templateHeader2, setTemplateHeader2] = useState('');
  const [templateFooter1, setTemplateFooter1] = useState('');
  const [templateFooter2, setTemplateFooter2] = useState('');
  const [templateFontSize, setTemplateFontSize] = useState<PrintTemplate['fontSize']>('medium');
  const [templateSpaceBefore, setTemplateSpaceBefore] = useState(0);
  const [templateSpaceAfter, setTemplateSpaceAfter] = useState(0);
  const [templateFontSizeMesa, setTemplateFontSizeMesa] = useState<'small' | 'medium' | 'large'>('medium');
  const [templateFontSizeSequence, setTemplateFontSizeSequence] = useState<'small' | 'medium' | 'large'>('medium');
  const [templateFontSizeInfo, setTemplateFontSizeInfo] = useState<'small' | 'medium' | 'large'>('medium');
  const [templateFontSizeItem, setTemplateFontSizeItem] = useState<'small' | 'medium' | 'large'>('medium');
  const [templateFontSizePtMesa, setTemplateFontSizePtMesa] = useState(0);
  const [templateFontSizePtSequence, setTemplateFontSizePtSequence] = useState(0);
  const [templateFontSizePtInfo, setTemplateFontSizePtInfo] = useState(0);
  const [templateFontSizePtItem, setTemplateFontSizePtItem] = useState(0);
  const [templateFontSizePtCamarero, setTemplateFontSizePtCamarero] = useState(0);
  const [templateLineSpacingItem, setTemplateLineSpacingItem] = useState(0);
  const [editSequenceId, setEditSequenceId] = useState<string | null>(null);
  const [sequenceName, setSequenceName] = useState('');
  const [sequencePriority, setSequencePriority] = useState('1');
  const [sequenceColor, setSequenceColor] = useState(SEQUENCE_COLORS[0]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showExtraTableModal, setShowExtraTableModal] = useState(false);
  const [extraTableName, setExtraTableName] = useState('');
  const [extraTableType, setExtraTableType] = useState<'table' | 'chair'>('table');
  const [extraTableCapacity, setExtraTableCapacity] = useState('4');
  const [editExtraTableId, setEditExtraTableId] = useState<string | null>(null);

  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [prodStockRules, setProdStockRules] = useState<StockDeductionRule[]>([]);
  const [prodStockRules2, setProdStockRules2] = useState<StockDeductionRule[]>([]);
  const [prodStockRules3, setProdStockRules3] = useState<StockDeductionRule[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [printerConnectionType, setPrinterConnectionType] = useState<'ip' | 'usb-windows'>('ip');
  const [printerWindowsName, setPrinterWindowsName] = useState('');
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState(CATEGORY_COLORS[0]);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCatId, setProdCatId] = useState('');
  const [prodPrinterId, setProdPrinterId] = useState('');
  const [prodSendMonitor, setProdSendMonitor] = useState(true);
  const [prodCharacteristicIds, setProdCharacteristicIds] = useState<string[]>([]);
  const [prodAddOnIds, setProdAddOnIds] = useState<string[]>([]);
  const [prodPrice2, setProdPrice2] = useState('');
  const [prodPrice2Label, setProdPrice2Label] = useState('');
  const [prodPrice3, setProdPrice3] = useState('');
  const [prodPrice3Label, setProdPrice3Label] = useState('');
  const [prodHasStockControl, setProdHasStockControl] = useState(false);
  const [showCharModal, setShowCharModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [editCharId, setEditCharId] = useState<string | null>(null);
  const [editAddOnId, setEditAddOnId] = useState<string | null>(null);
  const [charName, setCharName] = useState('');
  const [charOptions, setCharOptions] = useState('');
  const [addOnName, setAddOnName] = useState('');
  const [addOnOptions, setAddOnOptions] = useState<AddOnOption[]>([]);
  const [addOnNewOptionLabel, setAddOnNewOptionLabel] = useState('');
  const [addOnNewOptionPrice, setAddOnNewOptionPrice] = useState('');
  const [printerName, setPrinterName] = useState('');
  const [printerIp, setPrinterIp] = useState('');
  const [printerType, setPrinterType] = useState<PrinterConfig['type']>('thermal');
  const [editPrinterId, setEditPrinterId] = useState<string | null>(null);
  const [printerPort, setPrinterPort] = useState('9100');
  const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [dispTab, setDispTab] = useState<'devices' | 'users'>('devices');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [userNameInput, setUserNameInput] = useState('');
  const [userPinInput, setUserPinInput] = useState('');
  const [userRoleInput, setUserRoleInput] = useState('');
  const [userColorInput, setUserColorInput] = useState('#f97316');
  const agentStatusQuery = trpc.comandas.agentStatus.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId, refetchInterval: 15000 }
  );
  const printTestMutation = trpc.comandas.printKitchenTicket.useMutation();
  const [editDeviceId, setEditDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [devicePassword, setDevicePassword] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceConfig['type']>('kitchen');
  const [deviceMonitorIndex, setDeviceMonitorIndex] = useState(1);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedCatForProducts, setSelectedCatForProducts] = useState<string | null>(null);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [editFamilyId, setEditFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [familyColor, setFamilyColor] = useState(CATEGORY_COLORS[0]);
  const [importLoading, setImportLoading] = useState(false);

  const currentTables = useMemo(
    () => allTables.filter((t: Table) => t.locationId === selectedLocationId),
    [allTables, selectedLocationId]
  );
  const currentExtraTables = useMemo(
    () => extraTables.filter((t) => t.locationId === selectedLocationId),
    [extraTables, selectedLocationId]
  );
  const currentDecorations = useMemo(
    () => decorations[selectedLocationId || ''] || [],
    [decorations, selectedLocationId]
  );

  const handleAddDecoration = useCallback((type: DecorativeElement['type']) => {
    if (!selectedLocationId) return;
    const newDeco: DecorativeElement = {
      id: uid(),
      type,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      rotation: 0,
    };
    onSaveDecorations(selectedLocationId, [...currentDecorations, newDeco]);
  }, [selectedLocationId, currentDecorations, onSaveDecorations]);

  const handleDeleteDeco = useCallback((decoId: string) => {
    if (!selectedLocationId) return;
    onSaveDecorations(selectedLocationId, currentDecorations.filter((d: DecorativeElement) => d.id !== decoId));
  }, [selectedLocationId, currentDecorations, onSaveDecorations]);

  const handleDecoPositionChange = useCallback((decoId: string, x: number, y: number) => {
    if (!selectedLocationId) return;
    onSaveDecorations(
      selectedLocationId,
      currentDecorations.map((d: DecorativeElement) => d.id === decoId ? { ...d, x, y } : d)
    );
  }, [selectedLocationId, currentDecorations, onSaveDecorations]);

  const handleDecoRotate = useCallback((decoId: string) => {
    if (!selectedLocationId) return;
    onSaveDecorations(
      selectedLocationId,
      currentDecorations.map((d: DecorativeElement) => d.id === decoId ? { ...d, rotation: (d.rotation + 45) % 360 } : d)
    );
  }, [selectedLocationId, currentDecorations, onSaveDecorations]);

  const handleDecoResize = useCallback((decoId: string, dw: number, dh: number) => {
    if (!selectedLocationId) return;
    onSaveDecorations(
      selectedLocationId,
      currentDecorations.map((d: DecorativeElement) => {
        if (d.id !== decoId) return d;
        const newScaleW = Math.max(0.5, Math.min(5, (d.scaleW || 1) + dw));
        const newScaleH = Math.max(0.5, Math.min(5, (d.scaleH || 1) + dh));
        return { ...d, scaleW: newScaleW, scaleH: newScaleH };
      })
    );
  }, [selectedLocationId, currentDecorations, onSaveDecorations]);

  const handleRotateTable = useCallback((tableId: string) => {
    const pos = allPositions[tableId] ?? getDefaultPosition(0);
    const newPos: TablePosition = { ...pos, rotation: ((pos.rotation || 0) + 45) % 360 };
    savePositions({ ...allPositions, [tableId]: newPos });
  }, [allPositions, savePositions]);

  const handleSaveFamily = useCallback(() => {
    if (!familyName.trim()) return;
    if (editFamilyId) {
      onSaveFamilies(families.map((f) =>
        f.id === editFamilyId ? { ...f, name: familyName.trim(), color: familyColor } : f
      ));
    } else {
      const newFam: ComandasFamily = {
        id: uid(),
        name: familyName.trim(),
        color: familyColor,
        order: families.length,
        categories: [],
      };
      onSaveFamilies([...families, newFam]);
    }
    setFamilyName('');
    setFamilyColor(CATEGORY_COLORS[0]);
    setEditFamilyId(null);
    setShowFamilyModal(false);
  }, [familyName, familyColor, editFamilyId, families, onSaveFamilies]);

  const handleDeleteFamily = useCallback((famId: string) => {
    const doDelete = () => {
      onSaveFamilies(families.filter((f) => f.id !== famId));
      onSaveCategories(categories.filter((c) => c.familyId !== famId));
    };
    Alert.alert('Eliminar familia', '¿Se eliminarán también sus categorías y productos. ¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: doDelete },
    ]);
  }, [families, categories, onSaveFamilies, onSaveCategories]);

  const handleSaveCategory = useCallback(() => {
    if (!catName.trim() || !selectedFamilyId) return;
    if (editCategoryId) {
      onSaveCategories(categories.map((c) =>
        c.id === editCategoryId ? { ...c, name: catName.trim(), color: catColor } : c
      ));
    } else {
      const newCat: ComandasCategory = {
        id: uid(),
        familyId: selectedFamilyId,
        name: catName.trim(),
        color: catColor,
        order: categories.filter((c) => c.familyId === selectedFamilyId).length,
        items: [],
      };
      onSaveCategories([...categories, newCat]);
    }
    setCatName('');
    setCatColor(CATEGORY_COLORS[0]);
    setEditCategoryId(null);
    setShowCatModal(false);
  }, [catName, catColor, editCategoryId, selectedFamilyId, categories, onSaveCategories]);

  const handleDeleteCategory = useCallback((catId: string) => {
    const doDelete = () => onSaveCategories(categories.filter((c) => c.id !== catId));
    Alert.alert('Eliminar categoría', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: doDelete },
    ]);
  }, [categories, onSaveCategories]);

  const handleSaveProduct = useCallback(() => {
    if (!prodName.trim() || !prodCatId) return;
    const price = parseFloat(prodPrice) || 0;
    const p2 = parseFloat(prodPrice2) || 0;
    const p3 = parseFloat(prodPrice3) || 0;
    const updatedCats = categories.map((cat) => {
      if (cat.id !== prodCatId) return cat;
      if (editProductId) {
        return {
          ...cat,
          items: cat.items.map((p) =>
            p.id === editProductId
              ? { ...p, name: prodName.trim(), price, price2: p2 || undefined, price2Label: prodPrice2Label.trim() || undefined, price3: p3 || undefined, price3Label: prodPrice3Label.trim() || undefined, description: prodDesc.trim(), printerId: prodPrinterId, sendToMonitor: prodSendMonitor, characteristicIds: prodCharacteristicIds, addOnIds: prodAddOnIds, hasStockControl: prodHasStockControl, stockDeductionRules: prodStockRules.length > 0 ? prodStockRules : undefined, stockDeductionRules2: prodStockRules2.length > 0 ? prodStockRules2 : undefined, stockDeductionRules3: prodStockRules3.length > 0 ? prodStockRules3 : undefined }
              : p
          ),
        };
      } else {
        const newProd: ComandasProduct = {
          id: uid(),
          categoryId: prodCatId,
          name: prodName.trim(),
          price,
          price2: p2 || undefined,
          price2Label: prodPrice2Label.trim() || undefined,
          price3: p3 || undefined,
          price3Label: prodPrice3Label.trim() || undefined,
          description: prodDesc.trim(),
          printerId: prodPrinterId,
          sendToMonitor: prodSendMonitor,
          order: cat.items.length,
          characteristicIds: prodCharacteristicIds,
          addOnIds: prodAddOnIds,
          hasStockControl: prodHasStockControl,
          stockDeductionRules: prodStockRules.length > 0 ? prodStockRules : undefined,
          stockDeductionRules2: prodStockRules2.length > 0 ? prodStockRules2 : undefined,
          stockDeductionRules3: prodStockRules3.length > 0 ? prodStockRules3 : undefined,
        };
        return { ...cat, items: [...cat.items, newProd] };
      }
    });
    onSaveCategories(updatedCats);
    setProdName('');
    setProdPrice('');
    setProdPrice2('');
    setProdPrice2Label('');
    setProdPrice3('');
    setProdPrice3Label('');
    setProdDesc('');
    setProdPrinterId('');
    setProdSendMonitor(true);
    setProdCharacteristicIds([]);
    setProdAddOnIds([]);
    setProdHasStockControl(false);
    setProdStockRules([]);
    setProdStockRules2([]);
    setProdStockRules3([]);
    setEditProductId(null);
    setShowProductModal(false);
  }, [prodName, prodPrice, prodPrice2, prodPrice2Label, prodPrice3, prodPrice3Label, prodDesc, prodCatId, prodPrinterId, prodSendMonitor, prodCharacteristicIds, prodAddOnIds, prodHasStockControl, prodStockRules, prodStockRules2, prodStockRules3, editProductId, categories, onSaveCategories]);

  const handleSaveCharacteristic = useCallback(() => {
    if (!charName.trim() || !charOptions.trim()) return;
    const options = charOptions.split(',').map((o: string) => ({ id: uid(), label: o.trim() })).filter((o: { id: string; label: string }) => o.label);
    if (options.length === 0) return;
    if (editCharId) {
      onSaveCharacteristics(characteristics.map((c) =>
        c.id === editCharId ? { ...c, name: charName.trim(), options } : c
      ));
    } else {
      onSaveCharacteristics([...characteristics, { id: uid(), name: charName.trim(), options }]);
    }
    setCharName('');
    setCharOptions('');
    setEditCharId(null);
    setShowCharModal(false);
  }, [charName, charOptions, editCharId, characteristics, onSaveCharacteristics]);

  const handleSaveAddOn = useCallback(() => {
    if (!addOnName.trim() || addOnOptions.length === 0) return;
    if (editAddOnId) {
      onSaveAddOns(addOns.map((a) =>
        a.id === editAddOnId ? { ...a, name: addOnName.trim(), options: addOnOptions } : a
      ));
    } else {
      onSaveAddOns([...addOns, { id: uid(), name: addOnName.trim(), options: addOnOptions }]);
    }
    setAddOnName('');
    setAddOnOptions([]);
    setAddOnNewOptionLabel('');
    setAddOnNewOptionPrice('');
    setEditAddOnId(null);
    setShowAddOnModal(false);
  }, [addOnName, addOnOptions, editAddOnId, addOns, onSaveAddOns]);

  const handleDeleteProduct = useCallback((catId: string, prodId: string) => {
    const doDelete = () => {
      onSaveCategories(categories.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((p) => p.id !== prodId) } : c
      ));
    };
    Alert.alert('Eliminar producto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: doDelete },
    ]);
  }, [categories, onSaveCategories]);

  const executeImport = useCallback(async () => {
    console.log('[Comandas] executeImport starting, digitalMenus:', digitalMenus.length);
    setImportLoading(true);
    try {
      const newFamilies: ComandasFamily[] = [];
      const newCategories: ComandasCategory[] = [];
      let totalProducts = 0;

      for (let mIdx = 0; mIdx < digitalMenus.length; mIdx++) {
        const menu = digitalMenus[mIdx];
        const famId = uid();
        newFamilies.push({
          id: famId,
          name: menu.name || `Menú ${mIdx + 1}`,
          color: menu.color || CATEGORY_COLORS[mIdx % CATEGORY_COLORS.length],
          order: families.length + mIdx,
          categories: [],
        });

        try {
          console.log('[Comandas] Fetching categories for menu:', menu.id);
          const menuCategories = await vanillaClient.menuCategories.list.query({ menuId: menu.id });
          console.log('[Comandas] Got categories:', menuCategories?.length || 0);
          if (menuCategories && Array.isArray(menuCategories)) {
            for (let cIdx = 0; cIdx < menuCategories.length; cIdx++) {
              const cat = menuCategories[cIdx];
              const catId = uid();
              const catItems: ComandasProduct[] = [];

              try {
                const menuItems = await vanillaClient.menuItems.list.query({ categoryId: cat.id });
                console.log('[Comandas] Got items for cat', cat.id, ':', menuItems?.length || 0);
                if (menuItems && Array.isArray(menuItems)) {
                  menuItems.forEach((item: any, pIdx: number) => {
                    catItems.push({
                      id: uid(),
                      categoryId: catId,
                      name: item.name || `Producto ${pIdx + 1}`,
                      price: Number(item.price) || 0,
                      price2: Number(item.price2) || undefined,
                      price2Label: item.price2 ? 'Media ración' : undefined,
                      price3: Number(item.price3) || undefined,
                      price3Label: item.price3 ? 'Extra grande' : undefined,
                      description: item.description || '',
                      printerId: '',
                      sendToMonitor: true,
                      order: pIdx,
                    });
                    totalProducts++;
                  });
                }
              } catch (e) {
                console.log('[Comandas] Error importing items for category', cat.id, e);
              }

              newCategories.push({
                id: catId,
                familyId: famId,
                name: cat.name || `Categoría ${cIdx + 1}`,
                color: cat.color || CATEGORY_COLORS[cIdx % CATEGORY_COLORS.length],
                order: cIdx,
                items: catItems,
              });
            }
          }
        } catch (e) {
          console.log('[Comandas] Error importing categories for menu', menu.id, e);
        }
      }

      console.log('[Comandas] Import result:', newFamilies.length, 'families,', newCategories.length, 'cats,', totalProducts, 'products');
      onSaveFamilies([...families, ...newFamilies]);
      onSaveCategories([...categories, ...newCategories]);
      Alert.alert('Importado', `Se importaron ${newFamilies.length} familias, ${newCategories.length} categorías y ${totalProducts} productos.`);
    } catch (e) {
      console.log('[Comandas] Import error:', e);
      Alert.alert('Error', 'No se pudo completar la importación.');
    } finally {
      setImportLoading(false);
    }
  }, [digitalMenus, families, categories, onSaveFamilies, onSaveCategories]);

  const handleImportFromMenu = useCallback(() => {
    console.log('[Comandas] handleImportFromMenu called, digitalMenus:', digitalMenus.length, digitalMenus.map((m: any) => m.name));
    if (digitalMenus.length === 0) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('No hay menús en la carta digital para importar. Primero crea menús en la sección de Carta Digital.');
      } else {
        Alert.alert('Sin datos', 'No hay menús en la carta digital para importar. Primero crea menús en la sección de Carta Digital.');
      }
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Se importarán ${digitalMenus.length} familias (menús), con sus categorías y productos desde tu carta digital. ¿Continuar?`
      );
      if (confirmed) {
        void executeImport();
      }
    } else {
      Alert.alert(
        'Importar carta digital',
        `Se importarán ${digitalMenus.length} familias (menús), con sus categorías y productos desde tu carta digital.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Importar', onPress: executeImport },
        ]
      );
    }
  }, [digitalMenus, executeImport]);

  const handleSavePrinter = useCallback(() => {
    if (!printerName.trim()) return;
    if (printerConnectionType === 'ip' && !printerIp.trim()) {
      Alert.alert('Campo requerido', 'Introduce la dirección IP de la impresora.');
      return;
    }
    if (printerConnectionType === 'usb-windows' && !printerWindowsName.trim()) {
      Alert.alert('Campo requerido', 'Introduce el nombre de la impresora en Windows.');
      return;
    }
    const port = parseInt(printerPort, 10) || 9100;
    if (editPrinterId) {
      onSavePrinters(printers.map((p) =>
        p.id === editPrinterId
          ? { ...p, name: printerName.trim(), ipAddress: printerIp.trim(), type: printerType, port, connectionType: printerConnectionType, windowsPrinterName: printerWindowsName.trim() }
          : p
      ));
    } else {
      onSavePrinters([...printers, {
        id: uid(),
        name: printerName.trim(),
        type: printerType,
        ipAddress: printerIp.trim(),
        port,
        isActive: true,
        connectionType: printerConnectionType,
        windowsPrinterName: printerWindowsName.trim(),
      }]);
    }
    setPrinterName('');
    setPrinterIp('');
    setPrinterType('thermal');
    setPrinterPort('9100');
    setPrinterConnectionType('ip');
    setPrinterWindowsName('');
    setEditPrinterId(null);
    setShowPrinterModal(false);
  }, [printerName, printerIp, printerPort, printerType, printerConnectionType, printerWindowsName, editPrinterId, printers, onSavePrinters]);

  const handleTestPrint = useCallback(async (p: PrinterConfig) => {
    const isUsbWindows = p.connectionType === 'usb-windows';
    if (!restaurantId) {
      Alert.alert('Error', 'Asegúrate de estar logueado.');
      return;
    }
    if (!isUsbWindows && !p.ipAddress?.trim()) {
      Alert.alert('Error', 'Configura la IP de la impresora.');
      return;
    }
    if (isUsbWindows && !p.windowsPrinterName?.trim()) {
      Alert.alert('Error', 'Configura el nombre de la impresora Windows.');
      return;
    }
    setTestingPrinterId(p.id);
    try {
      await printTestMutation.mutateAsync({
        restaurantId,
        printerIp: isUsbWindows ? '' : p.ipAddress.trim(),
        printerPort: p.port || 9100,
        printerName: p.name,
        printerType: isUsbWindows ? 'usb' : 'tcp',
        windowsPrinterName: isUsbWindows ? p.windowsPrinterName : undefined,
        tableLabel: 'TEST',
        guests: 1,
        items: [{ qty: 1, name: 'PRUEBA DE IMPRESION' }],
        headerLine1: 'QuieroMesa',
        headerLine2: 'Test de conexion OK',
      });
      Alert.alert('✅ Enviado', `Ticket de prueba enviado a "${p.name}"\n\nSi el agente de impresión está activo, imprimirá en segundos.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo enviar el trabajo de prueba');
    } finally {
      setTestingPrinterId(null);
    }
  }, [restaurantId, printTestMutation]);

  const handleSaveSequence = () => {
    if (!sequenceName.trim()) return;
    const prio = parseInt(sequencePriority) || 1;
    if (editSequenceId) {
      onSaveSequences(sequences.map((s) =>
        s.id === editSequenceId ? { ...s, name: sequenceName.trim(), priority: prio, color: sequenceColor } : s
      ));
    } else {
      const newSeq: CourseSequence = {
        id: uid(),
        name: sequenceName.trim(),
        priority: prio,
        color: sequenceColor,
      };
      const sorted = [...sequences, newSeq].sort((a, b) => a.priority - b.priority);
      onSaveSequences(sorted);
    }
    setSequenceName('');
    setSequencePriority('1');
    setSequenceColor(SEQUENCE_COLORS[0]);
    setEditSequenceId(null);
    setShowSequenceModal(false);
  };

  if (section === 'secuencias') {
    return (
      <View style={{ flex: 1 }}>
        <View style={s.sectionHeader}>
          <TouchableOpacity onPress={() => setSection('main')} style={s.backBtn}>
            <ArrowLeft size={18} color={C.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.sectionHeaderTitle}>Secuencia de platos</Text>
          <TouchableOpacity
            style={s.addBtnSmall}
            onPress={() => {
              setSequenceName('');
              setSequencePriority(String(sequences.length + 1));
              setSequenceColor(SEQUENCE_COLORS[sequences.length % SEQUENCE_COLORS.length]);
              setEditSequenceId(null);
              setShowSequenceModal(true);
            }}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#fff" strokeWidth={2.5} />
            <Text style={s.addBtnSmallText}>Secuencia</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>
          <Text style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
            Define el orden de los platos (Primeros, Segundos...). El camarero seleccionará la secuencia activa al comandar.
          </Text>
          {sequences.length === 0 ? (
            <View style={s.emptyInline}>
              <UtensilsCrossed size={40} color={C.border} strokeWidth={1.5} />
              <Text style={s.emptyInlineText}>Sin secuencias</Text>
              <Text style={s.emptyInlineDesc}>Crea secuencias para organizar el orden de servicio</Text>
            </View>
          ) : (
            [...sequences].sort((a, b) => a.priority - b.priority).map((seq) => (
              <View key={seq.id} style={s.catRow}>
                <View style={[s.catDot, { backgroundColor: seq.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.catName}>{seq.name}</Text>
                  <Text style={s.catCount}>Prioridad {seq.priority}</Text>
                </View>
                <View style={s.catActions}>
                  <TouchableOpacity
                    onPress={() => {
                      const sorted = [...sequences].sort((a, b) => a.priority - b.priority);
                      const idx = sorted.findIndex((s) => s.id === seq.id);
                      if (idx > 0) {
                        const reIndexed = sorted.map((s, i) => ({ ...s, priority: i + 1 }));
                        const swapped = reIndexed.map((s) => {
                          if (s.id === sorted[idx].id) return { ...s, priority: idx };
                          if (s.id === sorted[idx - 1].id) return { ...s, priority: idx + 1 };
                          return s;
                        });
                        onSaveSequences(swapped);
                      }
                    }}
                    style={s.iconBtn}
                  >
                    <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 16 }}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const sorted = [...sequences].sort((a, b) => a.priority - b.priority);
                      const idx = sorted.findIndex((s) => s.id === seq.id);
                      if (idx < sorted.length - 1) {
                        const reIndexed = sorted.map((s, i) => ({ ...s, priority: i + 1 }));
                        const swapped = reIndexed.map((s) => {
                          if (s.id === sorted[idx].id) return { ...s, priority: idx + 2 };
                          if (s.id === sorted[idx + 1].id) return { ...s, priority: idx + 1 };
                          return s;
                        });
                        onSaveSequences(swapped);
                      }
                    }}
                    style={s.iconBtn}
                  >
                    <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 16 }}>↓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setSequenceName(seq.name);
                      setSequencePriority(String(seq.priority));
                      setSequenceColor(seq.color);
                      setEditSequenceId(seq.id);
                      setShowSequenceModal(true);
                    }}
                    style={s.iconBtn}
                  >
                    <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Eliminar', `¿Eliminar secuencia "${seq.name}"?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: () => onSaveSequences(sequences.filter((s) => s.id !== seq.id)) },
                      ]);
                    }}
                    style={s.iconBtnDanger}
                  >
                    <Trash2 size={14} color={C.red} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <Modal visible={showSequenceModal} animationType="slide" transparent onRequestClose={() => setShowSequenceModal(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editSequenceId ? 'Editar secuencia' : 'Nueva secuencia'}</Text>
                <TouchableOpacity onPress={() => setShowSequenceModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <Text style={s.inputLabel}>Nombre (ej: Primeros, Segundos, Postres...)</Text>
              <TextInput
                style={s.input}
                value={sequenceName}
                onChangeText={setSequenceName}
                placeholder="Ej: Primeros"
                placeholderTextColor={C.textMuted}
                autoFocus
              />
              <Text style={s.inputLabel}>Prioridad (1 = primero que aparece seleccionado)</Text>
              <TextInput
                style={s.input}
                value={sequencePriority}
                onChangeText={setSequencePriority}
                placeholder="1"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
              />
              <Text style={s.inputLabel}>Color</Text>
              <View style={s.colorRow}>
                {SEQUENCE_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.colorDot, { backgroundColor: c }, sequenceColor === c && s.colorDotActive]}
                    onPress={() => setSequenceColor(c)}
                    activeOpacity={0.8}
                  >
                    {sequenceColor === c && <Check size={12} color="#fff" strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.primaryBtn} onPress={handleSaveSequence} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>{editSequenceId ? 'Guardar cambios' : 'Crear secuencia'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (section === 'main') {
    return (
      <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>
        <Text style={s.configSectionTitle}>Configuración de Comandas</Text>

        {([
          { key: 'dispositivos' as ConfigSection, icon: Smartphone, label: 'Dispositivos y Usuarios', desc: 'Configura dispositivos APK y los usuarios del sistema' },
          { key: 'planos' as ConfigSection, icon: LayoutGrid, label: 'Planos de mesas', desc: 'Arrastra, rota y decora el plano de tu restaurante' },
          { key: 'familias' as ConfigSection, icon: FolderOpen, label: 'Familias - Categorías - Productos', desc: 'Crea familias, categorías dentro de cada familia y productos' },
          { key: 'secuencias' as ConfigSection, icon: ChevronRight, label: 'Secuencia de platos', desc: 'Define el orden de servicio: Primeros, Segundos, Postres...' },
          { key: 'caracteristicas' as ConfigSection, icon: CheckCircle2, label: 'Características y Añadidos', desc: 'Crea características (sin precio) y añadidos (con precio) para tus platos' },
          { key: 'impresoras' as ConfigSection, icon: Printer, label: 'Impresoras', desc: 'Configura impresoras y envío al monitor' },
          { key: 'plantillas' as ConfigSection, icon: FileText, label: 'Plantillas de impresión', desc: 'Personaliza cabecera, pie de página y tamaño del texto del ticket' },
          { key: 'instalacion' as ConfigSection, icon: Download, label: 'Conectar impresoras', desc: 'Configura impresoras térmicas para imprimir desde cualquier dispositivo en red' },
        ]).map(({ key, icon: Icon, label, desc }) => (
          <TouchableOpacity
            key={key}
            style={s.configCard}
            onPress={() => setSection(key)}
            activeOpacity={0.8}
          >
            <View style={s.configCardIcon}>
              <Icon size={22} color={C.accent} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.configCardLabel}>{label}</Text>
              <Text style={s.configCardDesc}>{desc}</Text>
            </View>
            <ChevronRight size={18} color={C.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[s.configCard, { borderColor: C.blue + '40' }]}
          onPress={handleImportFromMenu}
          activeOpacity={0.8}
        >
          <View style={[s.configCardIcon, { backgroundColor: C.blueDim }]}>
            <Import size={22} color={C.blue} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.configCardLabel}>{importLoading ? 'Importando...' : 'Importar de Carta Digital'}</Text>
            <Text style={s.configCardDesc}>Importa familias, categorías y productos desde tu carta digital</Text>
          </View>
          {importLoading && <ActivityIndicator size="small" color={C.blue} />}
          <ChevronRight size={18} color={C.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (section === 'planos') {
    return (
      <View style={{ flex: 1 }}>
        <View style={s.sectionHeader}>
          <TouchableOpacity onPress={() => { setSection('main'); setIsEditMode(false); }} style={s.backBtn}>
            <ArrowLeft size={18} color={C.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.sectionHeaderTitle}>Planos de mesas</Text>
          <TouchableOpacity
            style={[s.editToggle, isEditMode && s.editToggleActive]}
            onPress={() => setIsEditMode((v: boolean) => !v)}
            activeOpacity={0.8}
          >
            {isEditMode ? <Lock size={14} color={C.green} strokeWidth={2.5} /> : <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />}
            <Text style={[s.editToggleText, isEditMode && s.editToggleTextActive]}>
              {isEditMode ? 'Guardar' : 'Editar'}
            </Text>
          </TouchableOpacity>
        </View>

        {locations.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.locTabs} contentContainerStyle={s.locTabsContent}>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[s.locTab, selectedLocationId === loc.id && s.locTabActive]}
                onPress={() => onSelectLocation(loc.id)}
                activeOpacity={0.8}
              >
                <MapPin size={11} color={selectedLocationId === loc.id ? '#fff' : C.textMuted} strokeWidth={2.5} />
                <Text style={[s.locTabText, selectedLocationId === loc.id && s.locTabTextActive]}>{loc.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {isEditMode && (
          <View style={s.decoToolbar}>
            <Text style={s.decoToolbarLabel}>Añadir elemento:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {DECORATIVE_TYPES.map((dt) => (
                <TouchableOpacity
                  key={dt.type}
                  style={s.decoToolbarBtn}
                  onPress={() => handleAddDecoration(dt.type)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 16 }}>{dt.icon}</Text>
                  <Text style={s.decoToolbarBtnText}>{dt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {isEditMode && (
          <View style={s.editBanner}>
            <Edit3 size={13} color={C.yellow} strokeWidth={2.5} />
            <Text style={s.editBannerText}>Arrastra mesas y elementos · Rotar · Estirar paredes</Text>
          </View>
        )}

        {isEditMode && selectedLocationId && (
          <View style={s.extraTableToolbar}>
            <Text style={s.decoToolbarLabel}>Mesas/Sillas solo comandas:</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={s.decoToolbarBtn}
                onPress={() => {
                  setExtraTableName('');
                  setExtraTableType('table');
                  setExtraTableCapacity('4');
                  setEditExtraTableId(null);
                  setShowExtraTableModal(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16 }}>🪑</Text>
                <Text style={s.decoToolbarBtnText}>+ Mesa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.decoToolbarBtn}
                onPress={() => {
                  setExtraTableName('');
                  setExtraTableType('chair');
                  setExtraTableCapacity('1');
                  setEditExtraTableId(null);
                  setShowExtraTableModal(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16 }}>💺</Text>
                <Text style={s.decoToolbarBtnText}>+ Silla</Text>
              </TouchableOpacity>
            </View>
            {currentExtraTables.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {currentExtraTables.map((et: ComandasExtraTable) => (
                    <View key={et.id} style={s.extraTableChip}>
                      <Text style={s.extraTableChipText}>{et.type === 'chair' ? '💺' : '🪑'} {et.name}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setExtraTableName(et.name);
                          setExtraTableType(et.type);
                          setExtraTableCapacity(String(et.capacity));
                          setEditExtraTableId(et.id);
                          setShowExtraTableModal(true);
                        }}
                        style={{ padding: 2 }}
                      >
                        <Edit3 size={10} color={C.textMuted} strokeWidth={2.5} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Eliminar', `¿Eliminar ${et.name}?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: () => onSaveExtraTables(extraTables.filter((t) => t.id !== et.id)) },
                          ]);
                        }}
                        style={{ padding: 2 }}
                      >
                        <X size={10} color={C.red} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        )}

        <ScrollView style={{ flex: 1 }} horizontal showsHorizontalScrollIndicator={true}>
          <ScrollView showsVerticalScrollIndicator={true}>
            <View style={[s.canvas, { width: CANVAS_W_PC, height: CANVAS_H_PC }]}>
              {currentDecorations.map((deco: DecorativeElement) => (
                <DecoNode
                  key={deco.id}
                  deco={deco}
                  isEditMode={isEditMode as boolean}
                  onPositionChange={handleDecoPositionChange as (id: string, x: number, y: number) => void}
                  onRotate={handleDecoRotate as (id: string) => void}
                  onDelete={handleDeleteDeco as (id: string) => void}
                  onResize={handleDecoResize as (id: string, dw: number, dh: number) => void}
                  canvasW={CANVAS_W_PC}
                  canvasH={CANVAS_H_PC}
                />
              ))}
              {loading ? (
                <View style={s.floorLoading}>
                  <ActivityIndicator size="large" color={C.accent} />
                </View>
              ) : currentTables.length === 0 && currentExtraTables.length === 0 ? (
                <View style={s.floorEmpty}>
                  <UtensilsCrossed size={48} color={C.border} strokeWidth={1.5} />
                  <Text style={s.floorEmptyTitle}>Sin mesas</Text>
                  <Text style={s.floorEmptyDesc}>Añade mesas en Gestión de Mesas o crea mesas solo para comandas</Text>
                </View>
              ) : (
                <>
                  {currentTables.map((table: Table, index: number) => {
                    const pos = getTablePosition(table.id, index);
                    return (
                      <ConfigTableNode
                        key={table.id}
                        table={table}
                        position={pos}
                        isEditMode={isEditMode as boolean}
                        onPositionChange={onPositionChange}
                        onRotate={handleRotateTable as (tableId: string) => void}
                        canvasW={CANVAS_W_PC}
                        canvasH={CANVAS_H_PC}
                      />
                    );
                  })}
                  {currentExtraTables.map((et: ComandasExtraTable, index: number) => {
                    const pos = getTablePosition(et.id, currentTables.length + index);
                    const asTable = {
                      id: et.id,
                      name: et.name,
                      restaurantId: '',
                      locationId: et.locationId,
                      minCapacity: 1,
                      maxCapacity: et.capacity,
                      allowsHighChairs: false,
                      allowsStrollers: false,
                      allowsPets: false,
                      priority: 0,
                      order: 0,
                      createdAt: '',
                    } as Table;
                    return (
                      <ConfigTableNode
                        key={et.id}
                        table={asTable}
                        position={pos}
                        isEditMode={isEditMode as boolean}
                        onPositionChange={onPositionChange}
                        onRotate={handleRotateTable as (tableId: string) => void}
                        canvasW={CANVAS_W_PC}
                        canvasH={CANVAS_H_PC}
                        isChair={et.type === 'chair'}
                        isExtra={true}
                      />
                    );
                  })}
                </>
              )}
            </View>
          </ScrollView>
        </ScrollView>

        <Modal visible={showExtraTableModal} animationType="slide" transparent onRequestClose={() => setShowExtraTableModal(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editExtraTableId ? 'Editar' : 'Nueva'} {extraTableType === 'chair' ? 'silla' : 'mesa'} (solo comandas)</Text>
                <TouchableOpacity onPress={() => setShowExtraTableModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
                {extraTableType === 'chair' ? 'Silla individual con vista aérea y reposabrazos.' : 'Mesa que no aparece en el sistema de reservas, solo para comandar.'}
              </Text>
              <Text style={s.inputLabel}>Tipo</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <TouchableOpacity
                  style={[s.printerChip, extraTableType === 'table' && s.printerChipActive]}
                  onPress={() => setExtraTableType('table')}
                >
                  <Text style={[s.printerChipText, extraTableType === 'table' && s.printerChipTextActive]}>🪑 Mesa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.printerChip, extraTableType === 'chair' && s.printerChipActive]}
                  onPress={() => { setExtraTableType('chair'); setExtraTableCapacity('1'); }}
                >
                  <Text style={[s.printerChipText, extraTableType === 'chair' && s.printerChipTextActive]}>💺 Silla</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.inputLabel}>Nombre</Text>
              <TextInput
                style={s.input}
                value={extraTableName}
                onChangeText={setExtraTableName}
                placeholder={extraTableType === 'chair' ? 'Ej: Barra 1, Silla VIP...' : 'Ej: Terraza Extra 1...'}
                placeholderTextColor={C.textMuted}
                autoFocus
              />
              {extraTableType === 'table' && (
                <>
                  <Text style={s.inputLabel}>Capacidad</Text>
                  <TextInput
                    style={s.input}
                    value={extraTableCapacity}
                    onChangeText={setExtraTableCapacity}
                    placeholder="4"
                    placeholderTextColor={C.textMuted}
                    keyboardType="number-pad"
                  />
                </>
              )}
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => {
                  if (!extraTableName.trim() || !selectedLocationId) return;
                  const cap = extraTableType === 'chair' ? 1 : Math.max(1, parseInt(extraTableCapacity) || 4);
                  if (editExtraTableId) {
                    onSaveExtraTables(extraTables.map((t) =>
                      t.id === editExtraTableId ? { ...t, name: extraTableName.trim(), type: extraTableType, capacity: cap } : t
                    ));
                  } else {
                    onSaveExtraTables([...extraTables, {
                      id: uid(),
                      name: extraTableName.trim(),
                      type: extraTableType,
                      capacity: cap,
                      locationId: selectedLocationId,
                    }]);
                  }
                  setShowExtraTableModal(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={s.primaryBtnText}>{editExtraTableId ? 'Guardar cambios' : 'Crear'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (section === 'familias') {
    const currentLevel = selectedCatForProducts ? 'productos' : selectedFamilyId ? 'categorias' : 'familias';
    const currentFamily = families.find((f) => f.id === selectedFamilyId);
    const familyCategories = categories.filter((c) => c.familyId === selectedFamilyId);
    const currentCat = categories.find((c) => c.id === selectedCatForProducts);

    const headerTitle = currentLevel === 'productos'
      ? currentCat?.name || 'Productos'
      : currentLevel === 'categorias'
        ? currentFamily?.name || 'Categorías'
        : 'Familias';

    const handleBack = () => {
      if (selectedCatForProducts) {
        setSelectedCatForProducts(null);
      } else if (selectedFamilyId) {
        setSelectedFamilyId(null);
      } else {
        setSection('main');
      }
    };

    const handleAdd = () => {
      if (selectedCatForProducts) {
        setProdCatId(selectedCatForProducts);
        setProdName('');
        setProdPrice('');
        setProdPrice2('');
        setProdPrice2Label('');
        setProdPrice3('');
        setProdPrice3Label('');
        setProdDesc('');
        setProdPrinterId('');
        setProdSendMonitor(true);
        setProdCharacteristicIds([]);
        setProdAddOnIds([]);
        setProdHasStockControl(false);
        setProdStockRules([]);
        setProdStockRules2([]);
        setProdStockRules3([]);
        setEditProductId(null);
        setShowProductModal(true);
      } else if (selectedFamilyId) {
        setCatName('');
        setCatColor(CATEGORY_COLORS[0]);
        setEditCategoryId(null);
        setShowCatModal(true);
      } else {
        setFamilyName('');
        setFamilyColor(CATEGORY_COLORS[0]);
        setEditFamilyId(null);
        setShowFamilyModal(true);
      }
    };

    const addLabel = currentLevel === 'productos' ? 'Producto' : currentLevel === 'categorias' ? 'Categoría' : 'Familia';

    return (
      <View style={{ flex: 1 }}>
        <View style={s.sectionHeader}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <ArrowLeft size={18} color={C.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.sectionHeaderTitle}>{headerTitle}</Text>
          <TouchableOpacity style={s.addBtnSmall} onPress={handleAdd} activeOpacity={0.8}>
            <Plus size={16} color="#fff" strokeWidth={2.5} />
            <Text style={s.addBtnSmallText}>{addLabel}</Text>
          </TouchableOpacity>
        </View>

        {currentLevel === 'productos' && selectedCatForProducts ? (
          <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>
            <TouchableOpacity onPress={() => setSelectedCatForProducts(null)} style={s.breadcrumb} activeOpacity={0.7}>
              <ChevronLeft size={14} color={C.accent} strokeWidth={2.5} />
              <Text style={s.breadcrumbText}>Volver a categorías de {currentFamily?.name}</Text>
            </TouchableOpacity>

            {(currentCat?.items.length ?? 0) === 0 ? (
              <View style={s.emptyInline}>
                <Text style={s.emptyInlineText}>Sin productos en esta categoría</Text>
              </View>
            ) : (
              currentCat?.items.map((prod) => (
                <View key={prod.id} style={s.productRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.productName}>{prod.name}</Text>
                    {prod.description ? <Text style={s.productDesc}>{prod.description}</Text> : null}
                    <View style={s.productMeta}>
                      {prod.price > 0 && <Text style={s.productPrice}>{prod.price.toFixed(2)}€</Text>}
                      {prod.price2 ? <Text style={s.productPrice}>{prod.price2Label || 'P2'}: {prod.price2.toFixed(2)}€</Text> : null}
                      {prod.price3 ? <Text style={s.productPrice}>{prod.price3Label || 'P3'}: {prod.price3.toFixed(2)}€</Text> : null}
                      {prod.sendToMonitor && <Text style={s.productTag}>Monitor</Text>}
                      {prod.printerId && <Text style={s.productTag}>Impresora</Text>}
                      {prod.hasStockControl && <Text style={[s.productTag, { backgroundColor: C.purpleDim, color: C.purple }]}>Stock</Text>}
                      {(prod.characteristicIds?.length || 0) > 0 && <Text style={[s.productTag, { backgroundColor: C.yellowDark, color: C.yellow }]}>Caract.</Text>}
                      {(prod.addOnIds?.length || 0) > 0 && <Text style={[s.productTag, { backgroundColor: C.greenDark, color: C.green }]}>Añadidos</Text>}
                    </View>
                  </View>
                  <View style={s.productActions}>
                    <TouchableOpacity
                      onPress={() => {
                        const catItems = currentCat?.items || [];
                        const sorted = [...catItems].sort((a, b) => a.order - b.order);
                        const idx = sorted.findIndex((p) => p.id === prod.id);
                        if (idx > 0) {
                          const reIndexed = sorted.map((p, i) => ({ ...p, order: i }));
                          const swapped = reIndexed.map((p) => {
                            if (p.id === sorted[idx].id) return { ...p, order: idx - 1 };
                            if (p.id === sorted[idx - 1].id) return { ...p, order: idx };
                            return p;
                          });
                          onSaveCategories(categories.map((c) => c.id === selectedCatForProducts
                            ? { ...c, items: c.items.map((p) => swapped.find((sw) => sw.id === p.id) || p) }
                            : c));
                        }
                      }}
                      style={s.iconBtn}
                    >
                      <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 16 }}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const catItems = currentCat?.items || [];
                        const sorted = [...catItems].sort((a, b) => a.order - b.order);
                        const idx = sorted.findIndex((p) => p.id === prod.id);
                        if (idx < sorted.length - 1) {
                          const reIndexed = sorted.map((p, i) => ({ ...p, order: i }));
                          const swapped = reIndexed.map((p) => {
                            if (p.id === sorted[idx].id) return { ...p, order: idx + 1 };
                            if (p.id === sorted[idx + 1].id) return { ...p, order: idx };
                            return p;
                          });
                          onSaveCategories(categories.map((c) => c.id === selectedCatForProducts
                            ? { ...c, items: c.items.map((p) => swapped.find((sw) => sw.id === p.id) || p) }
                            : c));
                        }
                      }}
                      style={s.iconBtn}
                    >
                      <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 16 }}>↓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setProdCatId(selectedCatForProducts);
                        setProdName(prod.name);
                        setProdPrice(String(prod.price));
                        setProdPrice2(prod.price2 ? String(prod.price2) : '');
                        setProdPrice2Label(prod.price2Label || '');
                        setProdPrice3(prod.price3 ? String(prod.price3) : '');
                        setProdPrice3Label(prod.price3Label || '');
                        setProdDesc(prod.description);
                        setProdPrinterId(prod.printerId);
                        setProdSendMonitor(prod.sendToMonitor);
                        setProdCharacteristicIds(prod.characteristicIds || []);
                        setProdAddOnIds(prod.addOnIds || []);
                        setProdHasStockControl(prod.hasStockControl || false);
                        setProdStockRules(prod.stockDeductionRules || []);
                        setProdStockRules2(prod.stockDeductionRules2 || []);
                        setProdStockRules3(prod.stockDeductionRules3 || []);
                        setEditProductId(prod.id);
                        setShowProductModal(true);
                      }}
                      style={s.iconBtn}
                    >
                      <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteProduct(selectedCatForProducts, prod.id)}
                      style={s.iconBtnDanger}
                    >
                      <Trash2 size={14} color={C.red} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        ) : currentLevel === 'categorias' && selectedFamilyId ? (
          <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>
            <TouchableOpacity onPress={() => setSelectedFamilyId(null)} style={s.breadcrumb} activeOpacity={0.7}>
              <ChevronLeft size={14} color={C.accent} strokeWidth={2.5} />
              <Text style={s.breadcrumbText}>Volver a familias</Text>
            </TouchableOpacity>

            {familyCategories.length === 0 ? (
              <View style={s.emptyInline}>
                <FolderOpen size={40} color={C.border} strokeWidth={1.5} />
                <Text style={s.emptyInlineText}>Sin categorías en esta familia</Text>
                <Text style={s.emptyInlineDesc}>Crea una categoría para añadir productos</Text>
              </View>
            ) : (
              familyCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={s.catRow}
                  onPress={() => setSelectedCatForProducts(cat.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.catDot, { backgroundColor: cat.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.catName}>{cat.name}</Text>
                    <Text style={s.catCount}>{cat.items.length} productos</Text>
                  </View>
                  <View style={s.catActions}>
                    <TouchableOpacity
                      onPress={() => {
                        const sorted = [...familyCategories].sort((a, b) => a.order - b.order);
                        const idx = sorted.findIndex((c) => c.id === cat.id);
                        if (idx > 0) {
                          const reIndexed = sorted.map((c, i) => ({ ...c, order: i }));
                          const swapped = reIndexed.map((c) => {
                            if (c.id === sorted[idx].id) return { ...c, order: idx - 1 };
                            if (c.id === sorted[idx - 1].id) return { ...c, order: idx };
                            return c;
                          });
                          onSaveCategories(categories.map((c) => swapped.find((sw) => sw.id === c.id) || c));
                        }
                      }}
                      style={s.iconBtn}
                    >
                      <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 16 }}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const sorted = [...familyCategories].sort((a, b) => a.order - b.order);
                        const idx = sorted.findIndex((c) => c.id === cat.id);
                        if (idx < sorted.length - 1) {
                          const reIndexed = sorted.map((c, i) => ({ ...c, order: i }));
                          const swapped = reIndexed.map((c) => {
                            if (c.id === sorted[idx].id) return { ...c, order: idx + 1 };
                            if (c.id === sorted[idx + 1].id) return { ...c, order: idx };
                            return c;
                          });
                          onSaveCategories(categories.map((c) => swapped.find((sw) => sw.id === c.id) || c));
                        }
                      }}
                      style={s.iconBtn}
                    >
                      <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 16 }}>↓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setCatName(cat.name);
                        setCatColor(cat.color);
                        setEditCategoryId(cat.id);
                        setShowCatModal(true);
                      }}
                      style={s.iconBtn}
                    >
                      <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(cat.id)}
                      style={s.iconBtnDanger}
                    >
                      <Trash2 size={14} color={C.red} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                  <ChevronRight size={16} color={C.textMuted} strokeWidth={2} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>
            {families.length === 0 ? (
              <View style={s.emptyInline}>
                <FolderOpen size={40} color={C.border} strokeWidth={1.5} />
                <Text style={s.emptyInlineText}>Sin familias</Text>
                <Text style={s.emptyInlineDesc}>Crea una familia o importa desde carta digital</Text>
              </View>
            ) : (
              families.map((fam) => {
                const famCats = categories.filter((c) => c.familyId === fam.id);
                const totalProds = famCats.reduce((acc, c) => acc + c.items.length, 0);
                return (
                  <TouchableOpacity
                    key={fam.id}
                    style={s.catRow}
                    onPress={() => setSelectedFamilyId(fam.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.catDot, { backgroundColor: fam.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.catName}>{fam.name}</Text>
                      <Text style={s.catCount}>{famCats.length} categorías · {totalProds} productos</Text>
                    </View>
                    <View style={s.catActions}>
                      <TouchableOpacity
                        onPress={() => {
                          const sorted = [...families].sort((a, b) => a.order - b.order);
                          const idx = sorted.findIndex((f) => f.id === fam.id);
                          if (idx > 0) {
                            const reIndexed = sorted.map((f, i) => ({ ...f, order: i }));
                            const updated = reIndexed.map((f) => {
                              if (f.id === sorted[idx].id) return { ...f, order: idx - 1 };
                              if (f.id === sorted[idx - 1].id) return { ...f, order: idx };
                              return f;
                            });
                            onSaveFamilies(updated);
                          }
                        }}
                        style={s.iconBtn}
                      >
                        <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 16 }}>↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const sorted = [...families].sort((a, b) => a.order - b.order);
                          const idx = sorted.findIndex((f) => f.id === fam.id);
                          if (idx < sorted.length - 1) {
                            const reIndexed = sorted.map((f, i) => ({ ...f, order: i }));
                            const updated = reIndexed.map((f) => {
                              if (f.id === sorted[idx].id) return { ...f, order: idx + 1 };
                              if (f.id === sorted[idx + 1].id) return { ...f, order: idx };
                              return f;
                            });
                            onSaveFamilies(updated);
                          }
                        }}
                        style={s.iconBtn}
                      >
                        <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 16 }}>↓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setFamilyName(fam.name);
                          setFamilyColor(fam.color);
                          setEditFamilyId(fam.id);
                          setShowFamilyModal(true);
                        }}
                        style={s.iconBtn}
                      >
                        <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteFamily(fam.id)}
                        style={s.iconBtnDanger}
                      >
                        <Trash2 size={14} color={C.red} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                    <ChevronRight size={16} color={C.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}

        <Modal visible={showFamilyModal} animationType="slide" transparent onRequestClose={() => setShowFamilyModal(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editFamilyId ? 'Editar familia' : 'Nueva familia'}</Text>
                <TouchableOpacity onPress={() => setShowFamilyModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <Text style={s.inputLabel}>Nombre</Text>
              <TextInput
                style={s.input}
                value={familyName}
                onChangeText={setFamilyName}
                placeholder="Ej: Comida, Bebidas, Postres..."
                placeholderTextColor={C.textMuted}
                autoFocus
              />
              <Text style={s.inputLabel}>Color</Text>
              <View style={s.colorRow}>
                {CATEGORY_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.colorDot, { backgroundColor: c }, familyColor === c && s.colorDotActive]}
                    onPress={() => setFamilyColor(c)}
                    activeOpacity={0.8}
                  >
                    {familyColor === c && <Check size={12} color="#fff" strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.primaryBtn} onPress={handleSaveFamily} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>{editFamilyId ? 'Guardar cambios' : 'Crear familia'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showCatModal} animationType="slide" transparent onRequestClose={() => setShowCatModal(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editCategoryId ? 'Editar categoría' : 'Nueva categoría'}</Text>
                <TouchableOpacity onPress={() => setShowCatModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <Text style={s.inputLabel}>Nombre</Text>
              <TextInput
                style={s.input}
                value={catName}
                onChangeText={setCatName}
                placeholder="Ej: Entrantes, Carnes, Postres..."
                placeholderTextColor={C.textMuted}
                autoFocus
              />
              <Text style={s.inputLabel}>Color</Text>
              <View style={s.colorRow}>
                {CATEGORY_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.colorDot, { backgroundColor: c }, catColor === c && s.colorDotActive]}
                    onPress={() => setCatColor(c)}
                    activeOpacity={0.8}
                  >
                    {catColor === c && <Check size={12} color="#fff" strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.primaryBtn} onPress={handleSaveCategory} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>{editCategoryId ? 'Guardar cambios' : 'Crear categoría'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showProductModal} animationType="slide" transparent onRequestClose={() => setShowProductModal(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { maxHeight: '80%' }]}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editProductId ? 'Editar plato' : 'Nuevo plato'}</Text>
                <TouchableOpacity onPress={() => setShowProductModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.inputLabel}>Nombre *</Text>
                <TextInput style={s.input} value={prodName} onChangeText={setProdName} placeholder="Nombre del plato" placeholderTextColor={C.textMuted} />
                <Text style={s.inputLabel}>Precio principal (€)</Text>
                <TextInput style={s.input} value={prodPrice} onChangeText={setProdPrice} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
                <Text style={[s.inputLabel, { marginTop: 2 }]}>Precio 2 - opcional (ej: media ración)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={prodPrice2Label} onChangeText={setProdPrice2Label} placeholder="Media ración" placeholderTextColor={C.textMuted} />
                  <TextInput style={[s.input, { width: 80, marginBottom: 0 }]} value={prodPrice2} onChangeText={setProdPrice2} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
                </View>
                <Text style={[s.inputLabel, { marginTop: 2 }]}>Precio 3 - opcional (ej: extra grande)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={prodPrice3Label} onChangeText={setProdPrice3Label} placeholder="Extra grande" placeholderTextColor={C.textMuted} />
                  <TextInput style={[s.input, { width: 80, marginBottom: 0 }]} value={prodPrice3} onChangeText={setProdPrice3} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
                </View>
                <Text style={s.inputLabel}>Descripción</Text>
                <TextInput style={[s.input, { minHeight: 60 }]} value={prodDesc} onChangeText={setProdDesc} placeholder="Descripción opcional" placeholderTextColor={C.textMuted} multiline />
                <Text style={s.inputLabel}>Impresora</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[s.printerChip, !prodPrinterId && s.printerChipActive]}
                      onPress={() => setProdPrinterId('')}
                    >
                      <Text style={[s.printerChipText, !prodPrinterId && s.printerChipTextActive]}>Ninguna</Text>
                    </TouchableOpacity>
                    {printers.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[s.printerChip, prodPrinterId === p.id && s.printerChipActive]}
                        onPress={() => setProdPrinterId(p.id)}
                      >
                        <Text style={[s.printerChipText, prodPrinterId === p.id && s.printerChipTextActive]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TouchableOpacity
                  style={s.switchRow}
                  onPress={() => setProdSendMonitor((v: boolean) => !v)}
                  activeOpacity={0.8}
                >
                  <Text style={s.switchLabel}>Enviar al monitor de cocina</Text>
                  <View style={[s.switchTrack, prodSendMonitor && s.switchTrackOn]}>
                    <View style={[s.switchThumb, prodSendMonitor && s.switchThumbOn]} />
                  </View>
                </TouchableOpacity>

                {characteristics.length > 0 && (
                  <>
                    <Text style={s.inputLabel}>Características (sin precio)</Text>
                    {characteristics.map((ch) => (
                      <TouchableOpacity
                        key={ch.id}
                        style={[s.printerChip, { marginBottom: 6, width: '100%', justifyContent: 'space-between' }, prodCharacteristicIds.includes(ch.id) && s.printerChipActive]}
                        onPress={() => setProdCharacteristicIds((prev: string[]) => prev.includes(ch.id) ? prev.filter((x: string) => x !== ch.id) : [...prev, ch.id])}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.printerChipText, prodCharacteristicIds.includes(ch.id) && s.printerChipTextActive]}>{ch.name}</Text>
                        <Text style={{ fontSize: 10, color: prodCharacteristicIds.includes(ch.id) ? '#fff' : C.textMuted }}>{ch.options.map((o) => o.label).join(', ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {addOns.length > 0 && (
                  <>
                    <Text style={s.inputLabel}>Añadidos (con precio)</Text>
                    {addOns.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={[s.printerChip, { marginBottom: 6, width: '100%', justifyContent: 'space-between' }, prodAddOnIds.includes(a.id) && s.printerChipActive]}
                        onPress={() => setProdAddOnIds((prev: string[]) => prev.includes(a.id) ? prev.filter((x: string) => x !== a.id) : [...prev, a.id])}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.printerChipText, prodAddOnIds.includes(a.id) && s.printerChipTextActive]}>{a.name}</Text>
                        <Text style={{ fontSize: 10, color: prodAddOnIds.includes(a.id) ? '#fff' : C.textMuted }}>{a.options.map((o) => `${o.label}${o.price > 0 ? ` +${o.price.toFixed(2)}€` : ''}`).join(', ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                <TouchableOpacity
                  style={s.switchRow}
                  onPress={() => setProdHasStockControl((v: boolean) => !v)}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={s.switchLabel}>Control de stock</Text>
                    <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Gestionar unidades desde cocina</Text>
                  </View>
                  <View style={[s.switchTrack, prodHasStockControl && s.switchTrackOn]}>
                    <View style={[s.switchThumb, prodHasStockControl && s.switchThumbOn]} />
                  </View>
                </TouchableOpacity>

                {[{ label: `Precio 1${prodPrice ? ` (${prodPrice}€)` : ''}`, rules: prodStockRules, setRules: setProdStockRules },
                  ...(parseFloat(prodPrice2) > 0 ? [{ label: `Precio 2 - ${prodPrice2Label || 'P2'} (${prodPrice2}€)`, rules: prodStockRules2, setRules: setProdStockRules2 }] : []),
                  ...(parseFloat(prodPrice3) > 0 ? [{ label: `Precio 3 - ${prodPrice3Label || 'P3'} (${prodPrice3}€)`, rules: prodStockRules3, setRules: setProdStockRules3 }] : []),
                ].map((priceLevel) => (
                  <View key={priceLevel.label} style={{ marginTop: 14, backgroundColor: C.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700' as const, color: C.text }}>📦 Stock: {priceLevel.label}</Text>
                      <TouchableOpacity
                        style={[s.addBtnSmall, { paddingHorizontal: 8, paddingVertical: 4 }]}
                        onPress={() => {
                          const allProds: ComandasProduct[] = [];
                          categories.forEach((cat) => cat.items.forEach((it) => allProds.push(it)));
                          if (allProds.length === 0) return;
                          const first = allProds[0];
                          priceLevel.setRules([...priceLevel.rules, { productId: first.id, percentage: 100 }]);
                        }}
                        activeOpacity={0.8}
                      >
                        <Plus size={12} color="#fff" strokeWidth={2.5} />
                        <Text style={[s.addBtnSmallText, { fontSize: 11 }]}>Regla</Text>
                      </TouchableOpacity>
                    </View>
                    {priceLevel.rules.length === 0 ? (
                      <Text style={{ fontSize: 11, color: C.textMuted }}>Sin reglas. Pulsa + para añadir.</Text>
                    ) : (
                      priceLevel.rules.map((rule: StockDeductionRule, rIdx: number) => {
                        const allProds: ComandasProduct[] = [];
                        categories.forEach((cat) => cat.items.forEach((it) => allProds.push(it)));
                        return (
                          <View key={rIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, maxHeight: 40 }}>
                              <View style={{ flexDirection: 'row', gap: 4 }}>
                                {allProds.map((p) => (
                                  <TouchableOpacity
                                    key={p.id}
                                    style={[s.printerChip, { paddingVertical: 6 }, rule.productId === p.id && s.printerChipActive]}
                                    onPress={() => {
                                      const updated = [...priceLevel.rules];
                                      updated[rIdx] = { ...rule, productId: p.id };
                                      priceLevel.setRules(updated);
                                    }}
                                  >
                                    <Text style={[s.printerChipText, rule.productId === p.id && s.printerChipTextActive]}>
                                      {p.name}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </ScrollView>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <TouchableOpacity
                                style={{ backgroundColor: C.surface, borderRadius: 6, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
                                onPress={() => { const u = [...priceLevel.rules]; u[rIdx] = { ...rule, percentage: Math.max(10, rule.percentage - 10) }; priceLevel.setRules(u); }}
                              >
                                <Text style={{ color: C.text, fontSize: 14 }}>-</Text>
                              </TouchableOpacity>
                              <Text style={{ fontSize: 13, fontWeight: '700' as const, color: C.text, minWidth: 36, textAlign: 'center' as const }}>{rule.percentage}%</Text>
                              <TouchableOpacity
                                style={{ backgroundColor: C.surface, borderRadius: 6, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
                                onPress={() => { const u = [...priceLevel.rules]; u[rIdx] = { ...rule, percentage: Math.min(100, rule.percentage + 10) }; priceLevel.setRules(u); }}
                              >
                                <Text style={{ color: C.text, fontSize: 14 }}>+</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={s.iconBtnDanger}
                                onPress={() => priceLevel.setRules(priceLevel.rules.filter((_: StockDeductionRule, i: number) => i !== rIdx))}
                              >
                                <X size={12} color={C.red} strokeWidth={2.5} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}

                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={s.primaryBtn} onPress={handleSaveProduct} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>{editProductId ? 'Guardar cambios' : 'Añadir plato'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (section === 'plantillas') {
    return (
      <View style={{ flex: 1 }}>
        <View style={s.sectionHeader}>
          <TouchableOpacity onPress={() => setSection('main')} style={s.backBtn}>
            <ArrowLeft size={18} color={C.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.sectionHeaderTitle}>Plantillas de impresión</Text>
          <TouchableOpacity
            style={s.addBtnSmall}
            onPress={() => {
              setTemplateName('');
              setTemplateHeader1('');
              setTemplateHeader2('');
              setTemplateFooter1('');
              setTemplateFooter2('');
              setTemplateFontSize('medium');
              setTemplateSpaceBefore(0);
              setTemplateSpaceAfter(0);
              setTemplateFontSizePtMesa(0);
              setTemplateFontSizePtSequence(0);
              setTemplateFontSizePtInfo(0);
              setTemplateFontSizePtItem(0);
              setTemplateFontSizePtCamarero(0);
              setTemplateLineSpacingItem(0);
              setEditTemplateId(null);
              setShowTemplateModal(true);
            }}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#fff" strokeWidth={2.5} />
            <Text style={s.addBtnSmallText}>Nueva</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>
          <Text style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
            Personaliza la cabecera, pie de página y tamaño de texto del ticket de impresión.
          </Text>
          {!printTemplates.some((t: PrintTemplate) => t.name === 'Resumen Consumo') && (
            <TouchableOpacity
              style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#93c5fd', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}
              onPress={() => {
                const tmpl: PrintTemplate = {
                  id: uid(),
                  name: 'Resumen Consumo',
                  headerLine1: '',
                  headerLine2: '',
                  footerLine1: '',
                  footerLine2: '',
                  fontSize: 'medium',
                  spaceBefore: 0,
                  spaceAfter: 3,
                };
                onSavePrintTemplates([...printTemplates, tmpl]);
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 22 }}>🧾</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#1d4ed8' }}>{'Crear plantilla "Resumen Consumo"'}</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Para el resumen de consumo del cliente al pagar</Text>
              </View>
            </TouchableOpacity>
          )}
          {!printTemplates.some((t: PrintTemplate) => t.name === 'Monitor de Cocina') && (
            <TouchableOpacity
              style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#86efac', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}
              onPress={() => {
                const tmpl: PrintTemplate = {
                  id: uid(),
                  name: 'Monitor de Cocina',
                  headerLine1: '',
                  headerLine2: '',
                  footerLine1: '',
                  footerLine2: '',
                  fontSize: 'large',
                };
                onSavePrintTemplates([...printTemplates, tmpl]);
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 22 }}>🍳</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#16a34a' }}>{'Crear plantilla "Monitor de Cocina"'}</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Se usará automáticamente al imprimir desde el monitor de cocina</Text>
              </View>
            </TouchableOpacity>
          )}
          {printTemplates.length === 0 ? (
            <View style={s.emptyInline}>
              <FileText size={40} color={C.border} strokeWidth={1.5} />
              <Text style={s.emptyInlineText}>Sin plantillas</Text>
              <Text style={s.emptyInlineDesc}>Crea una plantilla para personalizar el ticket</Text>
            </View>
          ) : (
            printTemplates.map((tmpl) => (
              <View key={tmpl.id} style={s.catRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.catName}>{tmpl.name}</Text>
                  {(tmpl.headerLine1 || tmpl.headerLine2) && (
                    <Text style={s.catCount}>Cabecera: {[tmpl.headerLine1, tmpl.headerLine2].filter(Boolean).join(' · ')}</Text>
                  )}
                  {(tmpl.footerLine1 || tmpl.footerLine2) && (
                    <Text style={s.catCount}>Pie: {[tmpl.footerLine1, tmpl.footerLine2].filter(Boolean).join(' · ')}</Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <Text style={[s.productTag, { backgroundColor: C.accentDim, color: C.accent }]}>
                      Texto: {tmpl.fontSize === 'large' ? 'Grande' : tmpl.fontSize === 'small' ? 'Pequeño' : 'Normal'}
                    </Text>
                    {(tmpl.spaceBefore || 0) > 0 && (
                      <Text style={[s.productTag, { backgroundColor: C.blueDim, color: C.blue }]}>↑ {tmpl.spaceBefore} líneas</Text>
                    )}
                    {(tmpl.spaceAfter || 0) > 0 && (
                      <Text style={[s.productTag, { backgroundColor: C.blueDim, color: C.blue }]}>↓ {tmpl.spaceAfter} líneas</Text>
                    )}
                  </View>
                </View>
                <View style={s.catActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setTemplateName(tmpl.name);
                      setTemplateHeader1(tmpl.headerLine1);
                      setTemplateHeader2(tmpl.headerLine2);
                      setTemplateFooter1(tmpl.footerLine1);
                      setTemplateFooter2(tmpl.footerLine2);
                      setTemplateFontSize(tmpl.fontSize);
                      setTemplateSpaceBefore(tmpl.spaceBefore || 0);
                      setTemplateSpaceAfter(tmpl.spaceAfter || 0);
                      setTemplateFontSizeMesa(tmpl.fontSizeMesa || 'medium');
                      setTemplateFontSizeSequence(tmpl.fontSizeSequence || 'medium');
                      setTemplateFontSizeInfo(tmpl.fontSizeInfo || 'medium');
                      setTemplateFontSizeItem(tmpl.fontSizeItem || 'medium');
                      setTemplateFontSizePtMesa(tmpl.fontSizePtMesa || 0);
                      setTemplateFontSizePtSequence(tmpl.fontSizePtSequence || 0);
                      setTemplateFontSizePtInfo(tmpl.fontSizePtInfo || 0);
                      setTemplateFontSizePtItem(tmpl.fontSizePtItem || 0);
                      setTemplateFontSizePtCamarero(tmpl.fontSizePtCamarero || 0);
                      setTemplateLineSpacingItem(tmpl.lineSpacingItem || 0);
                      setEditTemplateId(tmpl.id);
                      setShowTemplateModal(true);
                    }}
                    style={s.iconBtn}
                  >
                    <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Eliminar', `¿Eliminar plantilla "${tmpl.name}"?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: () => onSavePrintTemplates(printTemplates.filter((t) => t.id !== tmpl.id)) },
                      ]);
                    }}
                    style={s.iconBtnDanger}
                  >
                    <Trash2 size={14} color={C.red} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        <Modal visible={showTemplateModal} animationType="slide" transparent onRequestClose={() => setShowTemplateModal(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { maxHeight: '85%' }]}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editTemplateId ? 'Editar plantilla' : 'Nueva plantilla'}</Text>
                <TouchableOpacity onPress={() => setShowTemplateModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.inputLabel}>Nombre de la plantilla</Text>
                <TextInput style={s.input} value={templateName} onChangeText={setTemplateName} placeholder="Ej: Ticket cocina" placeholderTextColor={C.textMuted} autoFocus />
                <Text style={s.inputLabel}>Línea cabecera 1</Text>
                <TextInput style={s.input} value={templateHeader1} onChangeText={setTemplateHeader1} placeholder="Ej: Restaurante El Sol" placeholderTextColor={C.textMuted} />
                <Text style={s.inputLabel}>Línea cabecera 2</Text>
                <TextInput style={s.input} value={templateHeader2} onChangeText={setTemplateHeader2} placeholder="Ej: Tel: 600 000 000" placeholderTextColor={C.textMuted} />
                <Text style={s.inputLabel}>Línea pie de página 1</Text>
                <TextInput style={s.input} value={templateFooter1} onChangeText={setTemplateFooter1} placeholder="Ej: ¡Buen provecho!" placeholderTextColor={C.textMuted} />
                <Text style={s.inputLabel}>Línea pie de página 2</Text>
                <TextInput style={s.input} value={templateFooter2} onChangeText={setTemplateFooter2} placeholder="Ej: Gracias por su visita" placeholderTextColor={C.textMuted} />
                <Text style={s.inputLabel}>Tamaño del texto (global por defecto)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {(['small', 'medium', 'large'] as PrintTemplate['fontSize'][]).map((sz) => (
                    <TouchableOpacity
                      key={sz}
                      style={[s.printerChip, templateFontSize === sz && s.printerChipActive]}
                      onPress={() => setTemplateFontSize(sz)}
                    >
                      <Text style={[s.printerChipText, templateFontSize === sz && s.printerChipTextActive]}>
                        {sz === 'small' ? 'Pequeño' : sz === 'large' ? 'Grande' : 'Normal'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[s.inputLabel, { marginBottom: 4 }]}>📐 Tamaño por línea (punto a punto)</Text>
                <Text style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>Ajusta el tamaño de cada línea del ticket punto a punto. 0 = Auto (usa el tamaño global).</Text>
                {([
                  { label: 'Línea mesa ("Mesa XX")', val: templateFontSizePtMesa, set: setTemplateFontSizePtMesa },
                  { label: 'Línea camarero ("Camarero: nombre")', val: templateFontSizePtCamarero, set: setTemplateFontSizePtCamarero },
                  { label: 'Línea info ("HH:MM  X com.")', val: templateFontSizePtInfo, set: setTemplateFontSizePtInfo },
                  { label: 'Línea secuencia ("PRIMEROS")', val: templateFontSizePtSequence, set: setTemplateFontSizePtSequence },
                  { label: 'Línea producto ("1x Nombre")', val: templateFontSizePtItem, set: setTemplateFontSizePtItem },
                ] as { label: string; val: number; set: (v: number) => void }[]).map(({ label, val, set }) => (
                  <View key={label} style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>{label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        style={[s.printerChip, { paddingHorizontal: 14, paddingVertical: 7 }]}
                        onPress={() => set(val <= 8 ? 0 : val - 2)}
                      >
                        <Text style={[s.printerChipText, { fontSize: 16 }]}>−</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 15, fontWeight: '700' as const, color: C.text, minWidth: 50, textAlign: 'center' as const }}>
                        {val === 0 ? 'Auto' : `${val}pt`}
                      </Text>
                      <TouchableOpacity
                        style={[s.printerChip, { paddingHorizontal: 14, paddingVertical: 7 }]}
                        onPress={() => set(Math.min(64, val === 0 ? 8 : val + 2))}
                      >
                        <Text style={[s.printerChipText, { fontSize: 16 }]}>+</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 11, color: C.textMuted, flex: 1 }}>{val === 0 ? 'Tamaño automático' : val <= 10 ? 'Muy pequeño' : val <= 14 ? 'Pequeño' : val <= 18 ? 'Normal' : val <= 24 ? 'Grande' : 'Muy grande'}</Text>
                    </View>
                  </View>
                ))}
                <Text style={s.inputLabel}>Separación entre productos (líneas extra)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <TouchableOpacity
                    style={[s.printerChip, { paddingHorizontal: 16 }]}
                    onPress={() => setTemplateLineSpacingItem(Math.max(0, templateLineSpacingItem - 1))}
                  >
                    <Text style={s.printerChipText}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '700' as const, color: C.text, minWidth: 30, textAlign: 'center' as const }}>{templateLineSpacingItem}</Text>
                  <TouchableOpacity
                    style={[s.printerChip, { paddingHorizontal: 16 }]}
                    onPress={() => setTemplateLineSpacingItem(Math.min(5, templateLineSpacingItem + 1))}
                  >
                    <Text style={s.printerChipText}>+</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, color: C.textMuted }}>líneas vacías entre productos</Text>
                </View>
                <Text style={s.inputLabel}>Espacio en blanco al inicio (líneas)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <TouchableOpacity
                    style={[s.printerChip, { paddingHorizontal: 16 }]}
                    onPress={() => setTemplateSpaceBefore(Math.max(0, templateSpaceBefore - 1))}
                  >
                    <Text style={s.printerChipText}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '700' as const, color: C.text, minWidth: 30, textAlign: 'center' as const }}>{templateSpaceBefore}</Text>
                  <TouchableOpacity
                    style={[s.printerChip, { paddingHorizontal: 16 }]}
                    onPress={() => setTemplateSpaceBefore(Math.min(10, templateSpaceBefore + 1))}
                  >
                    <Text style={s.printerChipText}>+</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, color: C.textMuted }}>líneas vacías antes del contenido</Text>
                </View>
                <Text style={s.inputLabel}>Espacio en blanco al final (líneas)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <TouchableOpacity
                    style={[s.printerChip, { paddingHorizontal: 16 }]}
                    onPress={() => setTemplateSpaceAfter(Math.max(0, templateSpaceAfter - 1))}
                  >
                    <Text style={s.printerChipText}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '700' as const, color: C.text, minWidth: 30, textAlign: 'center' as const }}>{templateSpaceAfter}</Text>
                  <TouchableOpacity
                    style={[s.printerChip, { paddingHorizontal: 16 }]}
                    onPress={() => setTemplateSpaceAfter(Math.min(10, templateSpaceAfter + 1))}
                  >
                    <Text style={s.printerChipText}>+</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, color: C.textMuted }}>líneas vacías después del contenido</Text>
                </View>
              </ScrollView>
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => {
                  if (!templateName.trim()) return;
                  const tmpl: PrintTemplate = {
                    id: editTemplateId || uid(),
                    name: templateName.trim(),
                    headerLine1: templateHeader1.trim(),
                    headerLine2: templateHeader2.trim(),
                    footerLine1: templateFooter1.trim(),
                    footerLine2: templateFooter2.trim(),
                    fontSize: templateFontSize,
                    spaceBefore: templateSpaceBefore,
                    spaceAfter: templateSpaceAfter,
                    fontSizeMesa: templateFontSizeMesa,
                    fontSizeSequence: templateFontSizeSequence,
                    fontSizeInfo: templateFontSizeInfo,
                    fontSizeItem: templateFontSizeItem,
                    fontSizePtMesa: templateFontSizePtMesa || undefined,
                    fontSizePtSequence: templateFontSizePtSequence || undefined,
                    fontSizePtInfo: templateFontSizePtInfo || undefined,
                    fontSizePtCamarero: templateFontSizePtCamarero || undefined,
                    fontSizePtItem: templateFontSizePtItem || undefined,
                    lineSpacingItem: templateLineSpacingItem || undefined,
                  };
                  if (editTemplateId) {
                    onSavePrintTemplates(printTemplates.map((t) => t.id === editTemplateId ? tmpl : t));
                  } else {
                    onSavePrintTemplates([...printTemplates, tmpl]);
                  }
                  setShowTemplateModal(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={s.primaryBtnText}>{editTemplateId ? 'Guardar cambios' : 'Crear plantilla'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (section === 'instalacion') {
    const printerBrands = [
      { name: 'Epson', app: 'Epson Print Enabler', play: 'https://play.google.com/store/apps/details?id=com.epson.android.printenablerservice', color: '#1a56db' },
      { name: 'Star', app: 'Star Print Service', play: 'https://play.google.com/store/apps/details?id=jp.star_m.printsystem', color: '#7e3af2' },
      { name: 'Bixolon', app: 'Bixolon Print Service', play: 'https://play.google.com/store/apps/details?id=com.bixolon.printservice', color: '#047481' },
      { name: 'Citizen', app: 'Citizen Android Print', play: 'https://play.google.com/store/apps/details?id=com.citizen.PrintService', color: '#057a55' },
    ];

    return (
      <View style={{ flex: 1 }}>
        <View style={s.sectionHeader}>
          <TouchableOpacity onPress={() => setSection('main')} style={s.backBtn}>
            <ArrowLeft size={18} color={C.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.sectionHeaderTitle}>Conectar impresoras</Text>
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>

          {(() => {
            const agentData = agentStatusQuery.data;
            const connected = agentData?.connected ?? false;
            const secondsAgo = agentData?.secondsAgo ?? null;
            return (
              <View style={{ backgroundColor: connected ? '#052e16' : '#1a0a00', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: connected ? '#166534' : '#7c2d12', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: connected ? '#22c55e' : '#ef4444' }} />
                  <Text style={{ fontSize: 14, fontWeight: '800' as const, color: connected ? '#86efac' : '#fca5a5' }}>
                    Agente de impresión: {connected ? 'Conectado' : 'Desconectado'}
                  </Text>
                  {agentStatusQuery.isLoading && <ActivityIndicator size="small" color={C.textMuted} />}
                </View>
                {connected && secondsAgo !== null && (
                  <Text style={{ fontSize: 12, color: '#4ade80', marginBottom: 6 }}>Última señal hace {secondsAgo}s · v{agentData?.version || '?'}</Text>
                )}
                {!connected && (
                  <Text style={{ fontSize: 12, color: '#fca5a5', lineHeight: 18, marginBottom: 8 }}>
                    {'El agente de impresión no está ejecutándose. Descárgalo e instálalo en el ordenador de la red local donde están las impresoras.'}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {restaurantId && (
                    <>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#065f46', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}
                        onPress={async () => {
                          try {
                            const result = await vanillaClient.comandas.generateToken.mutate({ restaurantId });
                            if (!result?.token) { Alert.alert('Error', 'No se pudo obtener el token'); return; }
                            const url = `https://quieromesa.com/api/print-agent/installer-windows?token=${result.token}`;
                            if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'instalar-impresoras.bat';
                              a.setAttribute('target', '_blank');
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            } else {
                              Alert.alert('Descargar instalador Windows', `Abre esta URL en un navegador:\n${url}`);
                            }
                          } catch (e: any) {
                            Alert.alert('Error', e.message || 'No se pudo generar el token');
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700' as const, color: '#6ee7b7' }}>⬇️ Windows (.bat)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#1e3a5f', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}
                        onPress={async () => {
                          try {
                            const result = await vanillaClient.comandas.generateToken.mutate({ restaurantId });
                            if (!result?.token) { Alert.alert('Error', 'No se pudo obtener el token'); return; }
                            const url = `https://quieromesa.com/api/print-agent/installer-linux?token=${result.token}`;
                            if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'instalar-impresoras.sh';
                              a.setAttribute('target', '_blank');
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            } else {
                              Alert.alert('Descargar instalador Linux', `Abre esta URL en un navegador:\n${url}`);
                            }
                          } catch (e: any) {
                            Alert.alert('Error', e.message || 'No se pudo generar el token');
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700' as const, color: '#93c5fd' }}>⬇️ Linux (.sh)</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                {restaurantId && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#1c1a3a', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#3730a3' }}
                      onPress={async () => {
                        try {
                          const result = await vanillaClient.comandas.generateToken.mutate({ restaurantId });
                          if (!result?.token) { Alert.alert('Error', 'No se pudo obtener el token'); return; }
                          const url = `https://quieromesa.com/api/print-agent/download-agent?token=${result.token}`;
                          if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'print-agent.js';
                            a.setAttribute('target', '_blank');
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          } else {
                            Alert.alert('Descargar agente', `Abre esta URL en un navegador:\n${url}`);
                          }
                        } catch (e: any) {
                          Alert.alert('Error', e.message || 'No se pudo generar el token');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700' as const, color: '#a5b4fc' }}>⬇️ print-agent.js</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#1a1a0a', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#713f12' }}
                      onPress={async () => {
                        try {
                          const result = await vanillaClient.comandas.generateToken.mutate({ restaurantId });
                          if (!result?.token) { Alert.alert('Error', 'No se pudo obtener el token'); return; }
                          const url = `https://quieromesa.com/api/print-agent/iniciar-agente?token=${result.token}`;
                          if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'iniciar-agente.bat';
                            a.setAttribute('target', '_blank');
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          } else {
                            Alert.alert('Descargar iniciar-agente', `Abre esta URL en un navegador:\n${url}`);
                          }
                        } catch (e: any) {
                          Alert.alert('Error', e.message || 'No se pudo generar el token');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700' as const, color: '#fcd34d' }}>⬇️ iniciar-agente.bat</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()}

          <View style={{ backgroundColor: '#0d1f3c', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#1e3a5f', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>💡</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800' as const, color: '#93c5fd' }}>Cómo funciona el agente</Text>
            </View>
            <Text style={{ fontSize: 13, color: '#bfdbfe', lineHeight: 20 }}>
              {'1. Descarga el instalador e instálalo en un PC de la misma red WiFi que las impresoras.\n2. El agente se conecta al servidor y espera trabajos.\n3. Cuando pulsas Imprimir en la APK o el Monitor de Cocina, el trabajo llega al agente y lo envía a la impresora por TCP (puerto 9100).\n\nLa impresora debe ser ESC/POS y accesible por TCP desde el PC donde corre el agente.'}
            </Text>
          </View>

          <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#064e3b', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#065f46', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16 }}>⭐</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800' as const, color: '#6ee7b7' }}>Método recomendado: App de impresora</Text>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 13, color: C.textDim, lineHeight: 20, marginBottom: 16 }}>
                {'Instala gratis la app de tu marca de impresora en la tablet Android. La app conecta automáticamente con las impresoras de la red WiFi y las registra como impresoras del sistema Android.'}
              </Text>

              {[{
                n: '1', title: 'Instala la app de tu impresora',
                desc: 'Abre Play Store en la tablet y busca la app según tu marca:',
                extra: 'brand_list',
              }, {
                n: '2', title: 'Abre la app y permite permisos',
                desc: 'La app detecta automáticamente las impresoras encendidas en la red WiFi.',
              }, {
                n: '3', title: 'Listo — imprime desde el monitor',
                desc: 'Pulsa el icono de impresora en el monitor de cocina. Selecciona la impresora la primera vez; Android la recuerda automáticamente.',
              }].map((step) => (
                <View key={step.n} style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#065f46', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#059669', flexShrink: 0 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800' as const, color: '#6ee7b7' }}>{step.n}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700' as const, color: C.text }}>{step.title}</Text>
                    <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 3, lineHeight: 18 }}>{step.desc}</Text>
                    {step.extra === 'brand_list' && (
                      <View style={{ marginTop: 10, gap: 8 }}>
                        {printerBrands.map((brand) => (
                          <TouchableOpacity
                            key={brand.name}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border }}
                            onPress={() => {
                              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                                window.open(brand.play, '_blank');
                              } else {
                                Alert.alert(brand.name, `Busca en Play Store:\n${brand.app}`);
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: brand.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                              <Printer size={16} color={brand.color} strokeWidth={2} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700' as const, color: C.text }}>{brand.name}</Text>
                              <Text style={{ fontSize: 11, color: C.textMuted }}>{brand.app}</Text>
                            </View>
                            <Download size={14} color={C.textMuted} strokeWidth={2} />
                          </TouchableOpacity>
                        ))}
                        <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 4, fontStyle: 'italic' as const }}>{'Si tu marca no aparece, busca "[marca] Print Service" en Play Store'}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#1e1b4b', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>🖥️</Text>
              <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#a5b4fc' }}>Impresión silenciosa (sin diálogo)</Text>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 13, color: C.textDim, lineHeight: 20, marginBottom: 12 }}>
                {'Para imprimir completamente automático sin que aparezca ningún diálogo, la tablet necesita configurarse en modo quiosco o con la impresora por defecto fijada en Android.'}
              </Text>
              <View style={{ backgroundColor: C.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700' as const, color: C.text }}>Configurar impresora por defecto en Android:</Text>
                <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 18 }}>1. Ve a Ajustes → Impresión de la tablet</Text>
                <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 18 }}>2. Selecciona el servicio de tu marca de impresora</Text>
                <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 18 }}>3. Pulsa sobre la impresora y selecciona «Establecer como predeterminada»</Text>
                <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 18 }}>4. En Chrome → Ajustes → Imprimir → marca la impresora como predeterminada</Text>
              </View>
            </View>
          </View>

        </ScrollView>
      </View>
    );
  }

  if (section === 'dispositivos') {
    const DEVICE_LIMITS = {
      kitchen: 2,
      cashier: 2,
      waiter: 3,
    };
    const DEVICE_LABELS: Record<DeviceConfig['type'], string> = {
      kitchen: 'Monitor Cocina',
      cashier: 'PC / Caja',
      waiter: 'Comandera',
    };
    const devicesOfType = (type: DeviceConfig['type']) => devices.filter((d) => d.type === type);
    const handleSaveDevice = () => {
      if (!deviceName.trim() || !devicePassword.trim()) return;
      const idx = deviceMonitorIndex;
      if (editDeviceId) {
        onSaveDevices(devices.map((d) =>
          d.id === editDeviceId ? { ...d, name: deviceName.trim(), password: devicePassword.trim(), type: deviceType, monitorIndex: idx } : d
        ));
      } else {
        const existing = devicesOfType(deviceType);
        if (existing.length >= DEVICE_LIMITS[deviceType as DeviceConfig['type']]) return;
        onSaveDevices([...devices, { id: uid(), name: deviceName.trim(), password: devicePassword.trim(), type: deviceType, monitorIndex: idx }]);
      }
      setDeviceName('');
      setDevicePassword('');
      setDeviceType('kitchen');
      setDeviceMonitorIndex(1);
      setEditDeviceId(null);
      setShowDeviceModal(false);
    };
    const deviceTypeColors: Record<DeviceConfig['type'], string> = {
      kitchen: C.green,
      cashier: C.blue,
      waiter: C.accent,
    };
    const deviceTypeIcons: Record<DeviceConfig['type'], string> = {
      kitchen: '🍳',
      cashier: '🖥️',
      waiter: '📱',
    };
    const USER_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444', '#eab308', '#14b8a6', '#ec4899', '#64748b', '#0f172a'];
    const handleSaveUser = () => {
      if (!userNameInput.trim()) return;
      if (editUserId) {
        if (onSaveUsers) onSaveUsers((users || []).map((u: UserProfile) =>
          u.id === editUserId ? { ...u, name: userNameInput.trim(), pin: userPinInput.trim() || undefined, role: userRoleInput.trim() || undefined, color: userColorInput } : u
        ));
      } else {
        if (onSaveUsers) onSaveUsers([...(users || []), { id: uid(), name: userNameInput.trim(), pin: userPinInput.trim() || undefined, role: userRoleInput.trim() || undefined, color: userColorInput }]);
      }
      setUserNameInput('');
      setUserPinInput('');
      setUserRoleInput('');
      setUserColorInput('#f97316');
      setEditUserId(null);
      setShowUserModal(false);
    };
    return (
      <View style={{ flex: 1 }}>
        <View style={s.sectionHeader}>
          <TouchableOpacity onPress={() => setSection('main')} style={s.backBtn}>
            <ArrowLeft size={18} color={C.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.sectionHeaderTitle}>Dispositivos y Usuarios</Text>
          <TouchableOpacity
            style={s.addBtnSmall}
            onPress={() => {
              if (dispTab === 'users') {
                setUserNameInput('');
                setUserPinInput('');
                setUserRoleInput('');
                setUserColorInput('#f97316');
                setEditUserId(null);
                setShowUserModal(true);
              } else {
                setDeviceName('');
                setDevicePassword('');
                setDeviceType('kitchen');
                setDeviceMonitorIndex(1);
                setEditDeviceId(null);
                setShowDeviceModal(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#fff" strokeWidth={2.5} />
            <Text style={s.addBtnSmallText}>Añadir</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border }}>
          {[{ key: 'devices' as const, label: 'Dispositivos' }, { key: 'users' as const, label: 'Usuarios' }].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: dispTab === tab.key ? C.accent : 'transparent' }}
              onPress={() => setDispTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontWeight: '700' as const, color: dispTab === tab.key ? C.accent : C.textMuted }}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {dispTab === 'devices' && (
          <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>
            <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#334155' }}>
              <Text style={{ fontSize: 13, fontWeight: '700' as const, color: '#94a3b8', marginBottom: 4 }}>💡 ¿Cómo funciona?</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>{'Cada dispositivo tiene nombre y contraseña. En la APK, al elegir el modo (monitor/caja/comandera), aparecerá la lista de dispositivos configurados. El sistema recuerda el dispositivo seleccionado.\n\nMódulo Comandas: 1 monitor, 1 PC/caja, 1 comandera.\nMódulo Comandas Pro: 2 monitores, 2 PC/caja, 3 comanderas.'}</Text>
            </View>

            {(['kitchen', 'cashier', 'waiter'] as DeviceConfig['type'][]).map((type) => {
              const devs = devicesOfType(type);
              const limit = DEVICE_LIMITS[type];
              const color = deviceTypeColors[type];
              return (
                <View key={type} style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>{deviceTypeIcons[type]}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800' as const, color: C.text }}>{DEVICE_LABELS[type]}</Text>
                      <View style={{ backgroundColor: color + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700' as const, color }}>{devs.length}/{limit}</Text>
                      </View>
                    </View>
                    {devs.length < limit && (
                      <TouchableOpacity
                        onPress={() => { setDeviceType(type); setDeviceName(''); setDevicePassword(''); setDeviceMonitorIndex(devs.length + 1); setEditDeviceId(null); setShowDeviceModal(true); }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
                      >
                        <Plus size={13} color={color} strokeWidth={2.5} />
                        <Text style={{ fontSize: 12, fontWeight: '700' as const, color }}>Añadir</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {devs.length === 0 ? (
                    <View style={{ padding: 16, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: C.textMuted }}>Sin {DEVICE_LABELS[type].toLowerCase()}s configurados</Text>
                    </View>
                  ) : (
                    devs.map((dev) => (
                      <View key={dev.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8, gap: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 18 }}>{deviceTypeIcons[dev.type]}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700' as const, color: C.text }}>{dev.name}</Text>
                          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Contraseña: {'•'.repeat(dev.password.length)} · #{dev.monitorIndex}</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setDeviceName(dev.name); setDevicePassword(dev.password); setDeviceType(dev.type); setDeviceMonitorIndex(dev.monitorIndex); setEditDeviceId(dev.id); setShowDeviceModal(true); }} style={s.iconBtn}>
                          <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Alert.alert('Eliminar dispositivo', `¿Eliminar "${dev.name}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => onSaveDevices(devices.filter((d) => d.id !== dev.id)) }])} style={s.iconBtn}>
                          <Trash2 size={14} color={C.red} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {dispTab === 'users' && (
          <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>
            <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#334155' }}>
              <Text style={{ fontSize: 13, fontWeight: '700' as const, color: '#94a3b8', marginBottom: 4 }}>👤 Usuarios del sistema</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>{'Crea los usuarios que manejan el sistema. Cada día al iniciar la APK se mostrará esta lista para seleccionar quién está trabajando.'}</Text>
            </View>
            {(users || []).length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 32 }}>👤</Text>
                <Text style={{ fontSize: 15, fontWeight: '700' as const, color: C.textDim }}>Sin usuarios creados</Text>
                <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center' as const }}>Pulsa «Añadir» para crear el primer usuario</Text>
              </View>
            ) : (
              (users || []).map((user: UserProfile) => (
                <View key={user.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10, gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: user.color || C.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '800' as const, color: '#fff' }}>{user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700' as const, color: C.text }}>{user.name}</Text>
                    {user.role ? <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{user.role}</Text> : null}
                    {user.pin ? <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>PIN: {'•'.repeat(user.pin.length)}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => { setUserNameInput(user.name); setUserPinInput(user.pin || ''); setUserRoleInput(user.role || ''); setUserColorInput(user.color || '#f97316'); setEditUserId(user.id); setShowUserModal(true); }} style={s.iconBtn}>
                    <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert('Eliminar usuario', `¿Eliminar "${user.name}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => onSaveUsers && onSaveUsers((users || []).filter((u: UserProfile) => u.id !== user.id)) }])} style={s.iconBtn}>
                    <Trash2 size={14} color={C.red} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}

        <Modal visible={showDeviceModal} transparent animationType="fade" onRequestClose={() => setShowDeviceModal(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editDeviceId ? 'Editar dispositivo' : 'Nuevo dispositivo'}</Text>
                <TouchableOpacity onPress={() => setShowDeviceModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <View style={{ gap: 12, padding: 16 }}>
                <View>
                  <Text style={s.inputLabel}>Tipo de dispositivo</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    {(['kitchen', 'cashier', 'waiter'] as DeviceConfig['type'][]).map((t) => (
                      <TouchableOpacity key={t} onPress={() => setDeviceType(t)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 2, borderColor: deviceType === t ? deviceTypeColors[t] : C.border, backgroundColor: deviceType === t ? deviceTypeColors[t] + '22' : C.card, alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700' as const, color: deviceType === t ? deviceTypeColors[t] : C.textMuted }}>{t === 'kitchen' ? 'Cocina' : t === 'cashier' ? 'PC/Caja' : 'Camarero'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View>
                  <Text style={s.inputLabel}>Nombre</Text>
                  <TextInput style={[s.input, { marginTop: 6 }]} value={deviceName} onChangeText={setDeviceName} placeholder="Ej: Monitor Postres, Caja Principal..." placeholderTextColor={C.textMuted} />
                </View>
                <View>
                  <Text style={s.inputLabel}>Contraseña</Text>
                  <TextInput style={[s.input, { marginTop: 6 }]} value={devicePassword} onChangeText={setDevicePassword} placeholder="Ej: 1234" placeholderTextColor={C.textMuted} keyboardType="numeric" />
                </View>
                <TouchableOpacity style={[s.addBtnSmall, { borderRadius: 12, paddingVertical: 13, justifyContent: 'center' }, (!deviceName.trim() || !devicePassword.trim()) && { opacity: 0.4 }]} onPress={handleSaveDevice} disabled={!deviceName.trim() || !devicePassword.trim()}>
                  <Text style={s.addBtnSmallText}>{editDeviceId ? 'Guardar cambios' : 'Crear dispositivo'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showUserModal} transparent animationType="fade" onRequestClose={() => setShowUserModal(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editUserId ? 'Editar usuario' : 'Nuevo usuario'}</Text>
                <TouchableOpacity onPress={() => setShowUserModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 400 }}>
                <View style={{ gap: 12, padding: 16 }}>
                  <View>
                    <Text style={s.inputLabel}>Nombre *</Text>
                    <TextInput style={[s.input, { marginTop: 6 }]} value={userNameInput} onChangeText={setUserNameInput} placeholder="Ej: María, Carlos, Admin..." placeholderTextColor={C.textMuted} />
                  </View>
                  <View>
                    <Text style={s.inputLabel}>Rol (opcional)</Text>
                    <TextInput style={[s.input, { marginTop: 6 }]} value={userRoleInput} onChangeText={setUserRoleInput} placeholder="Ej: Camarero, Encargado, Admin..." placeholderTextColor={C.textMuted} />
                  </View>
                  <View>
                    <Text style={s.inputLabel}>PIN (opcional)</Text>
                    <TextInput style={[s.input, { marginTop: 6 }]} value={userPinInput} onChangeText={setUserPinInput} placeholder="Ej: 1234" placeholderTextColor={C.textMuted} keyboardType="numeric" secureTextEntry />
                  </View>
                  <View>
                    <Text style={[s.inputLabel, { marginBottom: 8 }]}>Color de avatar</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {USER_COLORS.map(col => (
                        <TouchableOpacity key={col} onPress={() => setUserColorInput(col)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: col, borderWidth: userColorInput === col ? 3 : 0, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 }}>
                          {userColorInput === col && <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 16 }}>✓</Text></View>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity style={[s.addBtnSmall, { borderRadius: 12, paddingVertical: 13, justifyContent: 'center' }, !userNameInput.trim() && { opacity: 0.4 }]} onPress={handleSaveUser} disabled={!userNameInput.trim()}>
                    <Text style={s.addBtnSmallText}>{editUserId ? 'Guardar cambios' : 'Crear usuario'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (section === 'impresoras') {
    return (
      <View style={{ flex: 1 }}>
        <View style={s.sectionHeader}>
          <TouchableOpacity onPress={() => setSection('main')} style={s.backBtn}>
            <ArrowLeft size={18} color={C.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.sectionHeaderTitle}>Impresoras</Text>
          <TouchableOpacity
            style={s.addBtnSmall}
            onPress={() => {
              setPrinterName('');
              setPrinterIp('');
              setPrinterPort('9100');
              setPrinterType('thermal');
              setPrinterConnectionType('ip');
              setPrinterWindowsName('');
              setEditPrinterId(null);
              setShowPrinterModal(true);
            }}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#fff" strokeWidth={2.5} />
            <Text style={s.addBtnSmallText}>Añadir</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>
          {printers.length === 0 ? (
            <View style={s.emptyInline}>
              <Printer size={40} color={C.border} strokeWidth={1.5} />
              <Text style={s.emptyInlineText}>Sin impresoras configuradas</Text>
            </View>
          ) : (
            printers.map((p) => (
              <View key={p.id} style={s.printerRow}>
                <View style={s.printerIcon}>
                  <Printer size={18} color={C.accent} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.printerName}>{p.name}</Text>
                  <Text style={s.printerInfo}>
                    {p.connectionType === 'usb-windows'
                      ? `USB Windows · ${p.windowsPrinterName || 'Sin nombre'}` 
                      : `${p.type} · ${p.ipAddress || 'Sin IP'}:${p.port || 9100}`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void handleTestPrint(p)}
                  style={[s.iconBtn, { backgroundColor: testingPrinterId === p.id ? C.accentDim : C.surface }]}
                  disabled={testingPrinterId === p.id}
                >
                  {testingPrinterId === p.id
                    ? <ActivityIndicator size="small" color={C.accent} />
                    : <Printer size={14} color={C.accent} strokeWidth={2.5} />}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setPrinterName(p.name);
                    setPrinterIp(p.ipAddress || '');
                    setPrinterPort(String(p.port || 9100));
                    setPrinterType(p.type);
                    setPrinterConnectionType(p.connectionType || 'ip');
                    setPrinterWindowsName(p.windowsPrinterName || '');
                    setEditPrinterId(p.id);
                    setShowPrinterModal(true);
                  }}
                  style={s.iconBtn}
                >
                  <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Eliminar', '¿Eliminar esta impresora?', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => onSavePrinters(printers.filter((x) => x.id !== p.id)) },
                    ]);
                  }}
                  style={s.iconBtnDanger}
                >
                  <Trash2 size={14} color={C.red} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        <Modal visible={showPrinterModal} animationType="slide" transparent onRequestClose={() => setShowPrinterModal(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editPrinterId ? 'Editar impresora' : 'Nueva impresora'}</Text>
                <TouchableOpacity onPress={() => setShowPrinterModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <Text style={s.inputLabel}>Nombre</Text>
              <TextInput style={s.input} value={printerName} onChangeText={setPrinterName} placeholder="Ej: Cocina, Barra, Caja..." placeholderTextColor={C.textMuted} />
              <Text style={s.inputLabel}>Conexión</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[s.printerChip, printerConnectionType === 'ip' && s.printerChipActive]}
                  onPress={() => setPrinterConnectionType('ip')}
                >
                  <Text style={[s.printerChipText, printerConnectionType === 'ip' && s.printerChipTextActive]}>📡 WiFi / IP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.printerChip, printerConnectionType === 'usb-windows' && s.printerChipActive]}
                  onPress={() => setPrinterConnectionType('usb-windows')}
                >
                  <Text style={[s.printerChipText, printerConnectionType === 'usb-windows' && s.printerChipTextActive]}>🖨️ USB Windows</Text>
                </TouchableOpacity>
              </View>
              {printerConnectionType === 'ip' ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 2 }}>
                    <Text style={s.inputLabel}>IP</Text>
                    <TextInput style={s.input} value={printerIp} onChangeText={setPrinterIp} placeholder="192.168.1.100" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.inputLabel}>Puerto</Text>
                    <TextInput style={s.input} value={printerPort} onChangeText={setPrinterPort} placeholder="9100" placeholderTextColor={C.textMuted} keyboardType="numeric" />
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={s.inputLabel}>Nombre en Windows *</Text>
                  <TextInput
                    style={s.input}
                    value={printerWindowsName}
                    onChangeText={setPrinterWindowsName}
                    placeholder="Ej: EPSON TM-T20, POS-58..."
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={{ backgroundColor: '#1a2a1a', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#2d5a2d' }}>
                    <Text style={{ fontSize: 11, color: '#86efac', lineHeight: 16 }}>
                      {'💡 Escribe el nombre EXACTO de la impresora en Windows.\nVe a Panel de Control → Dispositivos e Impresoras y copia el nombre.\nTambién puedes usar --list-printers en el agente para verlos.'}
                    </Text>
                  </View>
                </View>
              )}
              <Text style={s.inputLabel}>Tipo</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['thermal', 'kitchen', 'bar'] as PrinterConfig['type'][]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.printerChip, printerType === t && s.printerChipActive]}
                    onPress={() => setPrinterType(t)}
                  >
                    <Text style={[s.printerChipText, printerType === t && s.printerChipTextActive]}>
                      {t === 'thermal' ? 'Térmica' : t === 'kitchen' ? 'Cocina' : 'Barra'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.primaryBtn} onPress={handleSavePrinter} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>{editPrinterId ? 'Guardar' : 'Crear impresora'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (section === 'caracteristicas') {
    return (
      <View style={{ flex: 1 }}>
        <View style={s.sectionHeader}>
          <TouchableOpacity onPress={() => setSection('main')} style={s.backBtn}>
            <ArrowLeft size={18} color={C.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.sectionHeaderTitle}>Características y Añadidos</Text>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.configContent}>
          {/* Características */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={s.configSectionTitle}>Características</Text>
            <TouchableOpacity
              style={s.addBtnSmall}
              onPress={() => { setCharName(''); setCharOptions(''); setEditCharId(null); setShowCharModal(true); }}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#fff" strokeWidth={2.5} />
              <Text style={s.addBtnSmallText}>Añadir</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>Sin precio. Se muestran en cocina pero no en el ticket del cliente.</Text>
          {characteristics.length === 0 ? (
            <View style={s.emptyInline}>
              <Text style={s.emptyInlineText}>Sin características</Text>
              <Text style={s.emptyInlineDesc}>Ej: Punto de carne · poco hecha, al punto, pasada</Text>
            </View>
          ) : (
            characteristics.map((ch) => (
              <View key={ch.id} style={s.catRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.catName}>{ch.name}</Text>
                  <Text style={s.catCount}>{ch.options.map((o) => o.label).join(' · ')}</Text>
                </View>
                <View style={s.catActions}>
                  <TouchableOpacity
                    onPress={() => { setCharName(ch.name); setCharOptions(ch.options.map((o) => o.label).join(', ')); setEditCharId(ch.id); setShowCharModal(true); }}
                    style={s.iconBtn}
                  >
                    <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Eliminar', '¿Eliminar esta característica?', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => onSaveCharacteristics(characteristics.filter((x) => x.id !== ch.id)) },
                    ])}
                    style={s.iconBtnDanger}
                  >
                    <Trash2 size={14} color={C.red} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Añadidos */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 8 }}>
            <Text style={s.configSectionTitle}>Añadidos</Text>
            <TouchableOpacity
              style={s.addBtnSmall}
              onPress={() => { setAddOnName(''); setAddOnOptions([]); setAddOnNewOptionLabel(''); setAddOnNewOptionPrice(''); setEditAddOnId(null); setShowAddOnModal(true); }}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#fff" strokeWidth={2.5} />
              <Text style={s.addBtnSmallText}>Añadir</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>Con precio opcional. Se suman al precio del plato.</Text>
          {addOns.length === 0 ? (
            <View style={s.emptyInline}>
              <Text style={s.emptyInlineText}>Sin añadidos</Text>
              <Text style={s.emptyInlineDesc}>Ej: Salsas · alioli 0.50€, mostaza 0.80€, tomate 0€</Text>
            </View>
          ) : (
            addOns.map((a) => (
              <View key={a.id} style={s.catRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.catName}>{a.name}</Text>
                  <Text style={s.catCount}>{a.options.map((o) => `${o.label}${o.price > 0 ? ` +${o.price.toFixed(2)}€` : ''}`).join(' · ')}</Text>
                </View>
                <View style={s.catActions}>
                  <TouchableOpacity
                    onPress={() => { setAddOnName(a.name); setAddOnOptions(a.options); setAddOnNewOptionLabel(''); setAddOnNewOptionPrice(''); setEditAddOnId(a.id); setShowAddOnModal(true); }}
                    style={s.iconBtn}
                  >
                    <Edit3 size={14} color={C.textMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Eliminar', '¿Eliminar este añadido?', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => onSaveAddOns(addOns.filter((x) => x.id !== a.id)) },
                    ])}
                    style={s.iconBtnDanger}
                  >
                    <Trash2 size={14} color={C.red} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Modal Característica */}
        <Modal visible={showCharModal} animationType="slide" transparent onRequestClose={() => setShowCharModal(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editCharId ? 'Editar característica' : 'Nueva característica'}</Text>
                <TouchableOpacity onPress={() => setShowCharModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <Text style={s.inputLabel}>Nombre</Text>
              <TextInput style={s.input} value={charName} onChangeText={setCharName} placeholder="Ej: Punto de carne" placeholderTextColor={C.textMuted} autoFocus />
              <Text style={s.inputLabel}>Opciones (separadas por coma)</Text>
              <TextInput style={s.input} value={charOptions} onChangeText={setCharOptions} placeholder="poco hecha, al punto, pasada" placeholderTextColor={C.textMuted} />
              <TouchableOpacity style={s.primaryBtn} onPress={handleSaveCharacteristic} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>{editCharId ? 'Guardar cambios' : 'Crear característica'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Añadido */}
        <Modal visible={showAddOnModal} animationType="slide" transparent onRequestClose={() => setShowAddOnModal(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { maxHeight: '80%' }]}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editAddOnId ? 'Editar añadido' : 'Nuevo añadido'}</Text>
                <TouchableOpacity onPress={() => setShowAddOnModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.inputLabel}>Nombre del añadido</Text>
                <TextInput style={s.input} value={addOnName} onChangeText={setAddOnName} placeholder="Ej: Salsas" placeholderTextColor={C.textMuted} autoFocus />

                <Text style={s.inputLabel}>Opciones</Text>
                {addOnOptions.map((opt: AddOnOption, idx: number) => (
                  <View key={opt.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Text style={{ flex: 1, color: C.text, fontSize: 13 }}>{opt.label}{opt.price > 0 ? ` +${opt.price.toFixed(2)}€` : ''}</Text>
                    <TouchableOpacity
                      onPress={() => setAddOnOptions(addOnOptions.filter((_: AddOnOption, i: number) => i !== idx))}
                      style={s.iconBtnDanger}
                    >
                      <Trash2 size={13} color={C.red} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TextInput
                    style={[s.input, { flex: 2, marginBottom: 0 }]}
                    value={addOnNewOptionLabel}
                    onChangeText={setAddOnNewOptionLabel}
                    placeholder="Nombre opción"
                    placeholderTextColor={C.textMuted}
                  />
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0 }]}
                    value={addOnNewOptionPrice}
                    onChangeText={setAddOnNewOptionPrice}
                    placeholder="0.00€"
                    placeholderTextColor={C.textMuted}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity
                    style={[s.primaryBtn, { marginBottom: 0, paddingHorizontal: 12 }]}
                    onPress={() => {
                      if (!addOnNewOptionLabel.trim()) return;
                      setAddOnOptions([...addOnOptions, { id: uid(), label: addOnNewOptionLabel.trim(), price: parseFloat(addOnNewOptionPrice) || 0 }]);
                      setAddOnNewOptionLabel('');
                      setAddOnNewOptionPrice('');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.primaryBtnText, { fontSize: 13 }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              <TouchableOpacity style={[s.primaryBtn, { marginTop: 12 }]} onPress={handleSaveAddOn} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>{editAddOnId ? 'Guardar cambios' : 'Crear añadido'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return null;
}

function DecoNode({
  deco,
  isEditMode,
  onPositionChange,
  onRotate,
  onDelete,
  onResize,
  canvasW = CANVAS_W,
  canvasH = CANVAS_H,
}: {
  key?: string;
  deco: DecorativeElement;
  isEditMode: boolean;
  onPositionChange: (id: string, x: number, y: number) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
  onResize?: (id: string, dw: number, dh: number) => void;
  canvasW?: number;
  canvasH?: number;
}) {
  const posRef = useRef({ x: deco.x, y: deco.y });
  const [localPos, setLocalPos] = useState({ x: deco.x, y: deco.y });
  const dragStart = useRef({ x: 0, y: 0 });
  const baseSize = getDecoSize(deco.type);
  const scaledW = Math.round(baseSize.w * (deco.scaleW || 1));
  const scaledH = Math.round(baseSize.h * (deco.scaleH || 1));
  const emoji = getDecoEmoji(deco.type);
  const isEditModeRef = useRef(isEditMode);
  isEditModeRef.current = isEditMode;
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const isStretchable = deco.type === 'wall' || deco.type === 'wall2' || deco.type === 'bar' || deco.type === 'door';

  useEffect(() => {
    posRef.current = { x: deco.x, y: deco.y };
    setLocalPos({ x: deco.x, y: deco.y });
  }, [deco.x, deco.y]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isEditModeRef.current,
        onMoveShouldSetPanResponder: (_: unknown, gestureState: { dx: number; dy: number }) => {
          if (!isEditModeRef.current) return false;
          return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
        },
        onPanResponderGrant: () => {
          dragStart.current = { x: posRef.current.x, y: posRef.current.y };
        },
        onPanResponderMove: (_: unknown, gs: { dx: number; dy: number }) => {
          const next = {
            x: Math.max(0, Math.min(canvasW - scaledW, dragStart.current.x + gs.dx)),
            y: Math.max(0, Math.min(canvasH - scaledH, dragStart.current.y + gs.dy)),
          };
          posRef.current = next;
          setLocalPos(next);
        },
        onPanResponderRelease: () => {
          onPositionChangeRef.current(deco.id, posRef.current.x, posRef.current.y);
        },
      }),
    [deco.id, scaledW, scaledH, canvasW, canvasH]
  );

  return (
    <View
      style={{
        position: 'absolute',
        left: localPos.x,
        top: localPos.y,
        width: scaledW,
        height: scaledH,
        transform: [{ rotate: `${deco.rotation}deg` }],
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: isEditMode ? 10 : 1,
      }}
      {...(isEditMode ? panResponder.panHandlers : {})}
    >
      {deco.type === 'wall' ? (
        <View style={{ width: '100%', height: '100%', backgroundColor: '#4a4a52', borderRadius: 3, borderWidth: 2, borderColor: '#6a6a76' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#8a8a94', borderRadius: 1 }} />
        </View>
      ) : deco.type === 'wall2' ? (
        <View style={{ width: '100%', height: '100%', backgroundColor: '#7a5a3a', borderRadius: 2, borderWidth: 1.5, borderColor: '#aa7a52' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#c0904a', borderRadius: 1 }} />
        </View>
      ) : deco.type === 'bar' ? (
        <View style={{ width: '100%', height: '100%', backgroundColor: '#5a3a1a', borderRadius: 4, borderWidth: 1.5, borderColor: '#8a6030' }}>
          <View style={{ position: 'absolute', top: 2, left: 4, right: 4, height: 3, backgroundColor: '#a07040', borderRadius: 1 }} />
        </View>
      ) : deco.type === 'door' ? (
        <View style={{ width: '100%', height: '100%', backgroundColor: '#2a4a6a', borderRadius: 3, borderWidth: 1.5, borderColor: '#4a7aaa', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: '65%', height: 2, backgroundColor: '#6aaadd', position: 'absolute', top: '30%' }} />
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#c8a84b', position: 'absolute', right: 7 }} />
        </View>
      ) : deco.type === 'plant' ? (
        <View style={{ width: scaledW, height: scaledH, borderRadius: scaledW / 2, backgroundColor: '#1a4a22', borderWidth: 1.5, borderColor: '#2a7a32', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: scaledW * 0.5, height: scaledH * 0.5, borderRadius: scaledW * 0.25, backgroundColor: '#2a6a2a' }} />
        </View>
      ) : deco.type === 'pillar' ? (
        <View style={{ width: '100%', height: '100%', backgroundColor: '#3a3a48', borderRadius: 3, borderWidth: 2, borderColor: '#5a5a6a', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: '50%', height: '50%', backgroundColor: '#4a4a5a', borderRadius: 2 }} />
        </View>
      ) : (
        <Text style={{ fontSize: Math.min(scaledW, scaledH) * 0.7 }}>{emoji}</Text>
      )}
      {isEditMode && (
        <View style={s.decoEditBtns}>
          <TouchableOpacity onPress={() => onRotate(deco.id)} style={s.decoMiniBtn}>
            <RotateCw size={10} color={C.yellow} strokeWidth={2.5} />
          </TouchableOpacity>
          {isStretchable && onResize && (
            <TouchableOpacity onPress={() => onResize(deco.id, 0.3, 0)} style={s.decoMiniBtn}>
              <Maximize2 size={10} color={C.green} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          {isStretchable && onResize && (deco.scaleW || 1) > 0.5 && (
            <TouchableOpacity onPress={() => onResize(deco.id, -0.3, 0)} style={s.decoMiniBtn}>
              <Minimize2 size={10} color={C.blue} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          {isStretchable && onResize && (
            <TouchableOpacity onPress={() => onResize(deco.id, 0, 0.3)} style={[s.decoMiniBtn, { backgroundColor: '#1a2a1a' }]}>
              <Maximize2 size={10} color={C.accent} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          {isStretchable && onResize && (deco.scaleH || 1) > 0.5 && (
            <TouchableOpacity onPress={() => onResize(deco.id, 0, -0.3)} style={[s.decoMiniBtn, { backgroundColor: '#2a1a2a' }]}>
              <Minimize2 size={10} color={C.purple} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onDelete(deco.id)} style={[s.decoMiniBtn, { backgroundColor: '#3a1515' }]}>
            <X size={10} color={C.red} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ConfigTableNode({
  table,
  position,
  isEditMode,
  onPositionChange,
  onRotate,
  canvasW = CANVAS_W,
  canvasH = CANVAS_H,
  isChair = false,
  isExtra = false,
}: {
  key?: string;
  table: Table;
  position: TablePosition;
  isEditMode: boolean;
  onPositionChange: (tableId: string, pos: TablePosition) => void;
  onRotate: (tableId: string) => void;
  canvasW?: number;
  canvasH?: number;
  isChair?: boolean;
  isExtra?: boolean;
}) {
  const posRef = useRef(position);
  const [localPos, setLocalPos] = useState(position);
  const dragStart = useRef({ x: 0, y: 0 });
  const isEditModeRef = useRef(isEditMode);
  isEditModeRef.current = isEditMode;
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const tableIdRef = useRef(table.id);
  tableIdRef.current = table.id;

  useEffect(() => {
    posRef.current = position;
    setLocalPos(position);
  }, [position]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isEditModeRef.current,
        onMoveShouldSetPanResponder: (_u: unknown, gestureState: { dx: number; dy: number }) => {
          if (!isEditModeRef.current) return false;
          return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
        },
        onPanResponderGrant: () => {
          dragStart.current = { x: posRef.current.x, y: posRef.current.y };
        },
        onPanResponderMove: (_u: unknown, gs: { dx: number; dy: number }) => {
          const nodeW = isChair ? 52 : CARD_W;
          const nodeH = isChair ? 52 : CARD_H;
          const next: TablePosition = {
            x: Math.max(0, Math.min(canvasW - nodeW, dragStart.current.x + gs.dx)),
            y: Math.max(0, Math.min(canvasH - nodeH, dragStart.current.y + gs.dy)),
            rotation: posRef.current.rotation,
          };
          posRef.current = next;
          setLocalPos(next);
        },
        onPanResponderRelease: () => {
          onPositionChangeRef.current(tableIdRef.current, posRef.current);
        },
      }),
    [canvasW, canvasH, isChair]
  );

  const tx = (CARD_W - TABLE_W) / 2;
  const ty = (CARD_H - TABLE_H) / 2;
  const chairs = getChairCenters(table.maxCapacity);

  if (isChair) {
    const chairSize = 52;
    const seatSize = 32;
    const armW = 6;
    const armH = 22;
    return (
      <View
        style={{
          position: 'absolute',
          left: localPos.x,
          top: localPos.y,
          width: chairSize,
          height: chairSize,
          transform: [{ rotate: `${localPos.rotation || 0}deg` }],
        }}
        {...panResponder.panHandlers}
      >
        <View style={{
          position: 'absolute',
          left: (chairSize - seatSize) / 2,
          top: (chairSize - seatSize) / 2,
          width: seatSize,
          height: seatSize,
          borderRadius: 6,
          backgroundColor: isExtra ? '#2a3a4a' : C.tableFree,
          borderWidth: 1.5,
          borderColor: isExtra ? C.blue + '80' : C.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 8, fontWeight: '700' as const, color: isExtra ? C.blue : C.textDim, textAlign: 'center' as const }} numberOfLines={1}>{table.name}</Text>
        </View>
        <View style={{
          position: 'absolute',
          left: 0,
          top: (chairSize - armH) / 2,
          width: armW,
          height: armH,
          borderRadius: 3,
          backgroundColor: '#3a4a5a',
          borderWidth: 1,
          borderColor: '#5a6a7a',
        }} />
        <View style={{
          position: 'absolute',
          right: 0,
          top: (chairSize - armH) / 2,
          width: armW,
          height: armH,
          borderRadius: 3,
          backgroundColor: '#3a4a5a',
          borderWidth: 1,
          borderColor: '#5a6a7a',
        }} />
        <View style={{
          position: 'absolute',
          left: (chairSize - seatSize + 4) / 2,
          top: 2,
          width: seatSize - 4,
          height: 6,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          backgroundColor: '#4a5a6a',
          borderWidth: 1,
          borderColor: '#5a6a7a',
        }} />
        {isEditMode && (
          <View style={s.tableEditOverlay}>
            <TouchableOpacity onPress={() => onRotate(table.id)} style={s.decoMiniBtn}>
              <RotateCw size={10} color={C.yellow} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={s.tableDragHandle}>
              <Move size={10} color={C.yellow} strokeWidth={2.5} />
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View
      style={[s.tableNode, {
        left: localPos.x,
        top: localPos.y,
        transform: [{ rotate: `${localPos.rotation || 0}deg` }],
      }]}
      {...panResponder.panHandlers}
    >
      {chairs.map((c, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: c.cx - CHAIR_D / 2,
            top: c.cy - CHAIR_D / 2,
            width: CHAIR_D,
            height: CHAIR_D,
            borderRadius: CHAIR_D / 2,
            backgroundColor: C.chair,
            borderWidth: 1,
            borderColor: C.border + '60',
          }}
        />
      ))}
      <View style={[s.tableRect, {
        left: tx, top: ty,
        backgroundColor: isExtra ? '#1a2a3a' : C.tableFree,
        borderColor: isExtra ? C.blue + '80' : C.border,
      }]}>
        <Text style={[s.tableNumber, { color: isExtra ? C.blue : C.textDim }]} numberOfLines={1}>{table.name}</Text>
        {isExtra && <Text style={{ fontSize: 7, color: C.blue + 'aa' }}>EXTRA</Text>}
      </View>
      {isEditMode && (
        <View style={s.tableEditOverlay}>
          <TouchableOpacity onPress={() => onRotate(table.id)} style={s.decoMiniBtn}>
            <RotateCw size={10} color={C.yellow} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={s.tableDragHandle}>
            <Move size={10} color={C.yellow} strokeWidth={2.5} />
          </View>
        </View>
      )}
    </View>
  );
}

function ComanderaView({
  tables,
  extraTables = [],
  locations,
  selectedLocationId,
  onSelectLocation,
  orders,
  allOrders,
  getTablePosition,
  onPositionChange: _onPositionChange,
  decorations,
  families = [],
  categories,
  characteristics,
  addOns,
  persist,
  getOrderForTable,
  getReservationForTable,
  loading,
  tick,
  isPC,
  stockData = [],
  sequences = [],
  printers = [],
  printTemplates = [],
  restaurantId,
}: {
  tables: Table[];
  extraTables?: ComandasExtraTable[];
  locations: TableLocation[];
  selectedLocationId: string | null;
  onSelectLocation: (id: string) => void;
  orders: Order[];
  allOrders: Order[];
  getTablePosition: (tableId: string, index: number) => TablePosition;
  onPositionChange: (tableId: string, pos: TablePosition) => void;
  decorations: DecorativeElement[];
  families?: ComandasFamily[];
  categories: ComandasCategory[];
  characteristics: Characteristic[];
  addOns: AddOn[];
  persist: (orders: Order[]) => void;
  getOrderForTable: (table: Table) => Order | null;
  getReservationForTable: (table: Table) => any;
  loading: boolean;
  tick: number;
  isPC: boolean;
  stockData?: StockEntry[];
  sequences?: CourseSequence[];
  printers?: PrinterConfig[];
  printTemplates?: PrintTemplate[];
  restaurantId?: string | null;
}) {
  void tick;
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showGuestsModal, setShowGuestsModal] = useState(false);
  const [guestsInput, setGuestsInput] = useState('2');
  const [pendingTable, setPendingTable] = useState<Table | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<ComandasProduct | null>(null);
  const [selectedCharOptions, setSelectedCharOptions] = useState<Record<string, string>>({});
  const [selectedAddOnOptions, setSelectedAddOnOptions] = useState<Record<string, string>>({});
  const [selectedPriceVariant, setSelectedPriceVariant] = useState<'main' | 'price2' | 'price3'>('main');
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);

  useEffect(() => {
    if (families && families.length > 0 && !selectedFamilyId) {
      setSelectedFamilyId(families[0].id);
    }
    if (categories.length > 0 && !selectedCatId) {
      const initCat = families && families.length > 0 && selectedFamilyId
        ? categories.find((c) => c.familyId === selectedFamilyId) || categories[0]
        : categories[0];
      if (initCat) setSelectedCatId(initCat.id);
    }
  }, [categories, families, selectedCatId, selectedFamilyId]);

  useEffect(() => {
    if (sequences.length > 0 && !selectedSequenceId) {
      const sorted = [...sequences].sort((a, b) => a.priority - b.priority);
      setSelectedSequenceId(sorted[0].id);
    }
  }, [sequences, selectedSequenceId]);

  const getOrderForExtraTable = useCallback(
    (et: ComandasExtraTable): Order | null => {
      return orders.find((o) => o.tableId === et.id || o.tableLabel === et.name) || null;
    },
    [orders]
  );

  const handleTablePress = useCallback((table: Table) => {
    const existing = getOrderForTable(table);
    if (existing) {
      setSelectedOrder(existing);
    } else {
      const reservation = getReservationForTable(table);
      if (reservation) {
        setGuestsInput(String(reservation.guests || 2));
      } else {
        setGuestsInput('2');
      }
      setPendingTable(table);
      setShowGuestsModal(true);
    }
  }, [getOrderForTable, getReservationForTable]);

  const handleCreateOrderForTable = useCallback(() => {
    if (!pendingTable) return;
    const guests = Math.max(1, parseInt(guestsInput) || 2);
    const reservation = getReservationForTable(pendingTable);
    const newOrder: Order = {
      id: uid(),
      tableNumber: 0,
      tableLabel: pendingTable.name,
      tableId: pendingTable.id,
      locationId: pendingTable.locationId,
      items: [],
      guests,
      createdAt: Date.now(),
      status: 'open',
      reservationInfo: reservation ? {
        clientName: reservation.clientName || reservation.client?.name || 'Cliente',
        time: `${String(reservation.time?.hour ?? 0).padStart(2, '0')}:${String(reservation.time?.minute ?? 0).padStart(2, '0')}`,
        guests: reservation.guests,
        highChairs: reservation.highChairCount || 0,
        strollers: reservation.needsStroller || false,
        pets: reservation.hasPets || false,
      } : null,
    };
    persist([...allOrders, newOrder]);
    setSelectedOrder(newOrder);
    setShowGuestsModal(false);
    setPendingTable(null);
  }, [pendingTable, guestsInput, allOrders, persist, getReservationForTable]);

  const getStockForProduct = useCallback((productId: string): number | null => {
    const today = new Date().toISOString().split('T')[0];
    const entry = stockData.find((s) => s.productId === productId && s.date === today);
    if (!entry) return null;
    return entry.quantity;
  }, [stockData]);

  const getUsedStockForProduct = useCallback((productId: string): number => {
    let used = 0;
    allOrders.forEach((o) => {
      if (o.status === 'closed') return;
      o.items.forEach((item) => {
        if ((item as any).productId === productId) {
          used += item.qty;
        }
      });
    });
    return used;
  }, [allOrders]);

  const handleAddProduct = useCallback((product: ComandasProduct) => {
    if (!selectedOrder) return;
    const hasChars = product.characteristicIds && product.characteristicIds.length > 0;
    const hasAddOns = product.addOnIds && product.addOnIds.length > 0;
    const hasMultiPrice = (product.price2 && product.price2 > 0) || (product.price3 && product.price3 > 0);
    if (hasChars || hasAddOns || hasMultiPrice) {
      setPendingProduct(product);
      const initChars: Record<string, string> = {};
      const initAddOns: Record<string, string> = {};
      setSelectedCharOptions(initChars);
      setSelectedAddOnOptions(initAddOns);
      setSelectedPriceVariant('main');
      setShowOptionsModal(true);
      return;
    }
    if (product.hasStockControl) {
      const stock = getStockForProduct(product.id);
      if (stock !== null) {
        const used = getUsedStockForProduct(product.id);
        if (stock === 0 || used >= stock) {
          Alert.alert('Sin stock', `"${product.name}" está agotado.`);
          return;
        }
      }
    }
    const activeSeq = sequences.find((s) => s.id === selectedSequenceId);
    const newItem: OrderItem = {
      id: uid(),
      name: product.name,
      qty: 1,
      notes: '',
      price: product.price,
      categoryName: categories.find((c) => c.id === product.categoryId)?.name || '',
      status: 'pending',
      printerId: product.printerId,
      sendToMonitor: product.sendToMonitor,
      createdAt: Date.now(),
      courseSequenceId: activeSeq?.id,
      courseSequenceName: activeSeq?.name,
      courseSequenceColor: activeSeq?.color,
    };
    (newItem as any).productId = product.id;
    const updated = allOrders.map((o) =>
      o.id === selectedOrder.id ? { ...o, items: [...o.items, newItem] } : o
    );
    persist(updated);
    setSelectedOrder(updated.find((o) => o.id === selectedOrder.id) || null);
  }, [selectedOrder, allOrders, persist, categories, getStockForProduct, getUsedStockForProduct, sequences, selectedSequenceId]);

  const handleConfirmOptions = useCallback(() => {
    if (!selectedOrder || !pendingProduct) return;

    if (pendingProduct.hasStockControl) {
      const stock = getStockForProduct(pendingProduct.id);
      if (stock !== null) {
        const used = getUsedStockForProduct(pendingProduct.id);
        if (stock === 0 || used >= stock) {
          Alert.alert('Sin stock', `"${pendingProduct.name}" está agotado.`);
          return;
        }
      }
    }

    const selChars = (pendingProduct.characteristicIds || []).map((cid: string) => {
      const char = characteristics.find((c) => c.id === cid);
      if (!char) return null;
      const optLabel = selectedCharOptions[cid] || '';
      return { charId: cid, charName: char.name, optionLabel: optLabel };
    }).filter(Boolean) as { charId: string; charName: string; optionLabel: string }[];

    let extraPrice = 0;
    const selAddOns = (pendingProduct.addOnIds || []).map((aid: string) => {
      const addOn = addOns.find((a) => a.id === aid);
      if (!addOn) return null;
      const optId = selectedAddOnOptions[aid] || '';
      const opt = addOn.options.find((o) => o.id === optId);
      if (!opt) return null;
      extraPrice += opt.price || 0;
      return { addOnId: aid, addOnName: addOn.name, optionId: opt.id, optionLabel: opt.label, price: opt.price || 0 };
    }).filter(Boolean) as { addOnId: string; addOnName: string; optionId: string; optionLabel: string; price: number }[];

    let basePrice = pendingProduct.price;
    let priceSuffix = '';
    if (selectedPriceVariant === 'price2' && pendingProduct.price2) {
      basePrice = pendingProduct.price2;
      priceSuffix = ` [${pendingProduct.price2Label || 'P2'}]`;
    } else if (selectedPriceVariant === 'price3' && pendingProduct.price3) {
      basePrice = pendingProduct.price3;
      priceSuffix = ` [${pendingProduct.price3Label || 'P3'}]`;
    }

    const addOnSuffix = selAddOns.length > 0 ? ` (${selAddOns.map((a) => a.optionLabel).join(', ')})` : '';
    const activeSeq2 = sequences.find((s) => s.id === selectedSequenceId);
    const newItem: OrderItem = {
      id: uid(),
      name: pendingProduct.name + priceSuffix + addOnSuffix,
      qty: 1,
      notes: selChars.length > 0 ? selChars.map((c) => `${c.charName}: ${c.optionLabel}`).join(' | ') : '',
      price: basePrice + extraPrice,
      categoryName: categories.find((c) => c.id === pendingProduct.categoryId)?.name || '',
      status: 'pending',
      printerId: pendingProduct.printerId,
      sendToMonitor: pendingProduct.sendToMonitor,
      createdAt: Date.now(),
      selectedCharacteristics: selChars,
      selectedAddOns: selAddOns,
      courseSequenceId: activeSeq2?.id,
      courseSequenceName: activeSeq2?.name,
      courseSequenceColor: activeSeq2?.color,
    };
    (newItem as any).productId = pendingProduct.id;
    const updated = allOrders.map((o) =>
      o.id === selectedOrder.id ? { ...o, items: [...o.items, newItem] } : o
    );
    persist(updated);
    setSelectedOrder(updated.find((o) => o.id === selectedOrder.id) || null);
    setShowOptionsModal(false);
    setPendingProduct(null);
    setSelectedCharOptions({});
    setSelectedAddOnOptions({});
    setSelectedPriceVariant('main');
  }, [selectedOrder, pendingProduct, selectedCharOptions, selectedAddOnOptions, selectedPriceVariant, allOrders, persist, categories, characteristics, addOns, getStockForProduct, getUsedStockForProduct, sequences, selectedSequenceId]);

  const handleRemoveItem = useCallback((itemId: string) => {
    if (!selectedOrder) return;
    const updated = allOrders.map((o) =>
      o.id === selectedOrder.id ? { ...o, items: o.items.filter((i) => i.id !== itemId) } : o
    );
    persist(updated);
    setSelectedOrder(updated.find((o) => o.id === selectedOrder.id) || null);
  }, [selectedOrder, allOrders, persist]);

  const handleItemQty = useCallback((itemId: string, delta: number) => {
    if (!selectedOrder) return;
    const updated = allOrders.map((o) => {
      if (o.id !== selectedOrder.id) return o;
      return {
        ...o,
        items: o.items.map((i) =>
          i.id === itemId ? { ...i, qty: Math.max(1, i.qty + delta) } : i
        ),
      };
    });
    persist(updated);
    setSelectedOrder(updated.find((o) => o.id === selectedOrder.id) || null);
  }, [selectedOrder, allOrders, persist]);

  const handleCloseOrder = useCallback(() => {
    if (!selectedOrder) return;
    const doClose = () => {
      const updated = allOrders.map((o) => o.id === selectedOrder.id ? { ...o, status: 'closed' as const } : o);
      persist(updated);
      setSelectedOrder(null);
    };
    Alert.alert('Cerrar comanda', '¿Marcar como servida?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar', style: 'destructive', onPress: doClose },
    ]);
  }, [selectedOrder, allOrders, persist]);

  const handleSendToKitchen = useCallback(async () => {
    if (!selectedOrder) return;
    const updated = allOrders.map((o: Order) => {
      if (o.id !== selectedOrder.id) return o;
      return {
        ...o,
        items: o.items.map((i: OrderItem) =>
          i.status === 'pending' ? { ...i, status: 'preparing' as const } : i
        ),
      };
    });
    persist(updated);
    setSelectedOrder(updated.find((o: Order) => o.id === selectedOrder.id) || null);

    const directItems = selectedOrder.items.filter(
      (i: OrderItem) => i.status === 'pending' && i.sendToMonitor === false && i.printerId
    );
    if (directItems.length > 0 && printers.length > 0) {
      const template = printTemplates.find((t: PrintTemplate) => t.name === 'Monitor de Cocina') ||
        (printTemplates.length > 0 ? printTemplates[0] : null);
      const byPrinter: Record<string, OrderItem[]> = {};
      directItems.forEach((item: OrderItem) => {
        const key = item.printerId || '__default__';
        if (!byPrinter[key]) byPrinter[key] = [];
        byPrinter[key].push(item);
      });
      for (const [printerId, items] of Object.entries(byPrinter)) {
        const itemParams = items.map((i: OrderItem) => ({ qty: i.qty, name: i.name, notes: i.notes || undefined }));
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const html = buildThermalHtml({ tableLabel: selectedOrder.tableLabel, guests: selectedOrder.guests, items: itemParams, template });
          const pw = window.open('', '_blank', 'width=450,height=600,menubar=no,toolbar=no,location=no,status=no');
          if (pw) { pw.document.open(); pw.document.write(html); pw.document.close(); }
        } else if (restaurantId) {
          const isValidP = (p: PrinterConfig) => p.connectionType === 'usb-windows' ? !!p.windowsPrinterName?.trim() : !!p.ipAddress?.trim();
          const printer = printers.find((p: PrinterConfig) => p.id === printerId && isValidP(p))
            || printers.find((p: PrinterConfig) => isValidP(p) && p.isActive !== false);
          if (printer) {
            const isUsb = printer.connectionType === 'usb-windows';
            try {
              await vanillaClient.comandas.printKitchenTicket.mutate({
                restaurantId,
                printerIp: isUsb ? '' : printer.ipAddress.trim(),
                printerPort: printer.port || 9100,
                printerName: printer.name,
                printerType: isUsb ? 'usb' : 'tcp',
                windowsPrinterName: isUsb ? printer.windowsPrinterName : undefined,
                tableLabel: selectedOrder.tableLabel,
                guests: selectedOrder.guests,
                items: itemParams,
                headerLine1: template?.headerLine1,
                headerLine2: template?.headerLine2,
                footerLine1: template?.footerLine1,
                footerLine2: template?.footerLine2,
                fontSize: template?.fontSize || 'medium',
                spaceBefore: template?.spaceBefore || 0,
                spaceAfter: template?.spaceAfter,
                fontSizeMesa: template?.fontSizeMesa,
                fontSizeSequence: template?.fontSizeSequence,
                fontSizeInfo: template?.fontSizeInfo,
                fontSizeItem: template?.fontSizeItem,
                fontSizePtMesa: template?.fontSizePtMesa,
                fontSizePtSequence: template?.fontSizePtSequence,
                fontSizePtInfo: template?.fontSizePtInfo,
                fontSizePtItem: template?.fontSizePtItem,
                lineSpacingItem: template?.lineSpacingItem,
              });
              console.log('[ComanderaView] Auto-printed direct item to printer:', printer.name);
            } catch (err) {
              console.error('[ComanderaView] Auto-print error:', err);
            }
          }
        }
      }
    }
    Alert.alert('Enviado', 'Comanda enviada a cocina');
  }, [selectedOrder, allOrders, persist, printers, printTemplates, restaurantId]);

  const currentCatProducts = useMemo(() => {
    return categories.find((c) => c.id === selectedCatId)?.items || [];
  }, [categories, selectedCatId]);

  const orderTotal = useMemo(() => {
    return selectedOrder?.items.reduce((a: number, i: OrderItem) => a + i.price * i.qty, 0) || 0;
  }, [selectedOrder]);

  if (loading) {
    return (
      <View style={s.floorLoading}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.floorLoadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!isPC && selectedOrder) {
    const sortedSeqsSm = [...sequences].sort((a, b) => a.priority - b.priority);
    const getItemChars = (item: OrderItem): string => [
      ...(item.selectedCharacteristics || []).map((c) => `${c.charName}: ${c.optionLabel}`),
      ...(item.selectedAddOns || []).map((a) => `${a.addOnName}: ${a.optionLabel}`),
      item.notes || '',
    ].filter(Boolean).join(' · ');
    return (
      <View style={s.smContainer}>
        <View style={s.smHeader}>
          <View style={s.smHeaderLeft}>
            <Text style={s.smHeaderTable}>Mesa {selectedOrder.tableLabel}</Text>
            <View style={s.smHeaderSep} />
            <Users size={12} color="#94a3b8" strokeWidth={2} />
            <Text style={s.smHeaderGuests}>{selectedOrder.guests} com.</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedOrder(null)} style={s.smHeaderClose} activeOpacity={0.8}>
            <X size={15} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {sortedSeqsSm.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.smSeqScroll} contentContainerStyle={s.smSeqContent}>
            {sortedSeqsSm.map((seq) => (
              <TouchableOpacity
                key={seq.id}
                style={[
                  s.smSeqBtn,
                  { borderLeftColor: seq.color },
                  selectedSequenceId === seq.id && { backgroundColor: seq.color + '22', borderColor: seq.color },
                ]}
                onPress={() => setSelectedSequenceId(seq.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.smSeqBtnText, selectedSequenceId === seq.id && { color: seq.color, fontWeight: '700' as const }]}>{seq.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {categories.length > 0 && (
          families && families.length > 0 ? (
            <View style={{ backgroundColor: '#0c0f18', borderBottomWidth: 1, borderBottomColor: '#1e2438' }}>
              {[...families].sort((a, b) => a.order - b.order).map((fam) => {
                const famCats = categories.filter((c) => c.familyId === fam.id);
                if (famCats.length === 0) return null;
                return (
                  <View key={fam.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 28, borderBottomWidth: 0.5, borderBottomColor: '#1e2438' }}>
                    <View style={{ width: 68, paddingHorizontal: 5, paddingVertical: 4, justifyContent: 'center', minHeight: 28, backgroundColor: fam.color + '18', borderRightWidth: 1, borderRightColor: fam.color + '44' }}>
                      <Text style={{ fontSize: 9, color: fam.color, fontWeight: '700' as const }} numberOfLines={2}>{fam.name}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 5, paddingVertical: 3 }}>
                      {[...famCats].sort((a, b) => a.order - b.order).map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            s.smCatBtn,
                            { backgroundColor: cat.color + '22', borderColor: cat.color + '66' },
                            selectedCatId === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
                          ]}
                          onPress={() => {
                            setSelectedCatId(cat.id);
                            setSelectedFamilyId(fam.id);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.smCatBtnText, selectedCatId === cat.id && { color: '#fff', fontWeight: '700' as const }]}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.smCatScroll} contentContainerStyle={s.smCatContent}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    s.smCatBtn,
                    { backgroundColor: cat.color + '22', borderColor: cat.color + '66' },
                    selectedCatId === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
                  ]}
                  onPress={() => setSelectedCatId(cat.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.smCatBtnText, selectedCatId === cat.id && { color: '#fff', fontWeight: '700' as const }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )
        )}

        <View style={s.smSplit}>
          <ScrollView style={s.smItemsPanel} showsVerticalScrollIndicator={false}>
            {selectedOrder.items.length === 0 ? (
              <View style={s.smItemsEmpty}>
                <UtensilsCrossed size={28} color="#d1d5db" strokeWidth={1.5} />
                <Text style={s.smItemsEmptyText}>Sin productos</Text>
              </View>
            ) : (
              selectedOrder.items.map((item) => {
                const chars = getItemChars(item);
                return (
                  <View key={item.id} style={s.smItemRow}>
                    <View style={[s.smItemStrip, { backgroundColor: item.courseSequenceColor || '#cbd5e1' }]} />
                    <View style={s.smItemQtyCol}>
                      <TouchableOpacity onPress={() => handleItemQty(item.id, 1)} style={s.smQtyBtn} activeOpacity={0.7}>
                        <Plus size={11} color="#334155" strokeWidth={2.5} />
                      </TouchableOpacity>
                      <Text style={s.smQtyVal}>{item.qty}</Text>
                      <TouchableOpacity onPress={() => handleItemQty(item.id, -1)} style={s.smQtyBtn} activeOpacity={0.7}>
                        <Minus size={11} color="#334155" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.smItemTextCol}>
                      <Text style={s.smItemName} numberOfLines={2}>{item.name}</Text>
                      {chars ? <Text style={s.smItemChars} numberOfLines={1}>{chars}</Text> : null}
                      <Text style={s.smItemPrice}>{(item.price * item.qty).toFixed(2)}€</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(item.id)} style={s.smItemDel} activeOpacity={0.7}>
                      <X size={11} color="#ef4444" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          <ScrollView style={s.smProductsPanel} showsVerticalScrollIndicator={false} contentContainerStyle={s.smProductsContent}>
            {currentCatProducts.length === 0 ? (
              <View style={{ padding: 10, alignItems: 'center' as const }}>
                <Text style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' as const }}>Sin productos</Text>
              </View>
            ) : (
              currentCatProducts.map((prod) => {
                const todayD2 = new Date().toISOString().split('T')[0];
                const se2 = stockData.find((x) => x.productId === prod.id && x.date === todayD2);
                let rem2: number | null = null;
                if (se2 && se2.quantity !== null) {
                  let used2 = 0;
                  allOrders.forEach((o) => { if (o.status !== 'closed') o.items.forEach((i) => { if ((i as any).productId === prod.id) used2 += i.qty; }); });
                  rem2 = (se2.quantity ?? 0) - used2;
                }
                const out2 = rem2 !== null && rem2 <= 0;
                return (
                  <TouchableOpacity
                    key={prod.id}
                    style={[s.smProdBtn, out2 && s.smProdBtnOut]}
                    onPress={() => { if (!out2) handleAddProduct(prod); }}
                    activeOpacity={out2 ? 1 : 0.75}
                  >
                    <Text style={[s.smProdBtnName, out2 && { color: '#94a3b8' }]} numberOfLines={3}>{prod.name}</Text>
                    {rem2 !== null && !out2 && <Text style={[s.smProdBtnPrice, { color: '#22c55e' }]}>{rem2} uds</Text>}
                    {out2 && <Text style={s.smProdBtnOutText}>AGOTADO</Text>}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        <View style={s.smFooter}>
          <View style={s.smTotalBlock}>
            <Text style={s.smTotalLabel}>Total</Text>
            <Text style={s.smTotalValue}>{orderTotal.toFixed(2)}€</Text>
          </View>
          <TouchableOpacity style={s.smSendBtn} onPress={handleSendToKitchen} activeOpacity={0.85}>
            <ChefHat size={15} color="#fff" strokeWidth={2.5} />
            <Text style={s.smSendBtnText}>Enviar a cocina</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.smCloseOrderBtn} onPress={handleCloseOrder} activeOpacity={0.85}>
            <CheckCircle2 size={18} color="#16a34a" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <Modal visible={showOptionsModal} animationType="slide" transparent onRequestClose={() => setShowOptionsModal(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { maxHeight: '85%' }]}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{pendingProduct?.name}</Text>
                <TouchableOpacity onPress={() => setShowOptionsModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {pendingProduct && ((pendingProduct.price2 && pendingProduct.price2 > 0) || (pendingProduct.price3 && pendingProduct.price3 > 0)) && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[s.inputLabel, { marginBottom: 8 }]}>Seleccionar precio</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <TouchableOpacity style={[s.priceVariantChip, selectedPriceVariant === 'main' && s.priceVariantChipActive]} onPress={() => setSelectedPriceVariant('main')} activeOpacity={0.8}>
                        <Text style={[s.priceVariantLabel, selectedPriceVariant === 'main' && s.priceVariantLabelActive]}>Normal</Text>
                        <Text style={[s.priceVariantPrice, selectedPriceVariant === 'main' && s.priceVariantPriceActive]}>{pendingProduct.price.toFixed(2)}€</Text>
                      </TouchableOpacity>
                      {pendingProduct.price2 && pendingProduct.price2 > 0 ? (
                        <TouchableOpacity style={[s.priceVariantChip, selectedPriceVariant === 'price2' && s.priceVariantChipActive]} onPress={() => setSelectedPriceVariant('price2')} activeOpacity={0.8}>
                          <Text style={[s.priceVariantLabel, selectedPriceVariant === 'price2' && s.priceVariantLabelActive]}>{pendingProduct.price2Label || 'Precio 2'}</Text>
                          <Text style={[s.priceVariantPrice, selectedPriceVariant === 'price2' && s.priceVariantPriceActive]}>{pendingProduct.price2.toFixed(2)}€</Text>
                        </TouchableOpacity>
                      ) : null}
                      {pendingProduct.price3 && pendingProduct.price3 > 0 ? (
                        <TouchableOpacity style={[s.priceVariantChip, selectedPriceVariant === 'price3' && s.priceVariantChipActive]} onPress={() => setSelectedPriceVariant('price3')} activeOpacity={0.8}>
                          <Text style={[s.priceVariantLabel, selectedPriceVariant === 'price3' && s.priceVariantLabelActive]}>{pendingProduct.price3Label || 'Precio 3'}</Text>
                          <Text style={[s.priceVariantPrice, selectedPriceVariant === 'price3' && s.priceVariantPriceActive]}>{pendingProduct.price3.toFixed(2)}€</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                )}
                {(pendingProduct?.characteristicIds || []).map((cid: string) => {
                  const char2 = characteristics.find((c) => c.id === cid);
                  if (!char2) return null;
                  return (
                    <View key={cid} style={{ marginBottom: 16 }}>
                      <Text style={[s.inputLabel, { marginBottom: 8 }]}>{char2.name}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {char2.options.map((opt) => (
                          <TouchableOpacity key={opt.id} style={[s.printerChip, { paddingVertical: 10, paddingHorizontal: 16 }, selectedCharOptions[cid] === opt.label && s.printerChipActive]} onPress={() => setSelectedCharOptions((prev: Record<string, string>) => ({ ...prev, [cid]: opt.label }))} activeOpacity={0.8}>
                            <Text style={[s.printerChipText, selectedCharOptions[cid] === opt.label && s.printerChipTextActive]}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
                {(pendingProduct?.addOnIds || []).map((aid: string) => {
                  const addOn2 = addOns.find((a) => a.id === aid);
                  if (!addOn2) return null;
                  return (
                    <View key={aid} style={{ marginBottom: 16 }}>
                      <Text style={[s.inputLabel, { marginBottom: 8 }]}>{addOn2.name}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <TouchableOpacity style={[s.printerChip, { paddingVertical: 10, paddingHorizontal: 16 }, !selectedAddOnOptions[aid] && s.printerChipActive]} onPress={() => setSelectedAddOnOptions((prev: Record<string, string>) => ({ ...prev, [aid]: '' }))} activeOpacity={0.8}>
                          <Text style={[s.printerChipText, !selectedAddOnOptions[aid] && s.printerChipTextActive]}>Sin añadido</Text>
                        </TouchableOpacity>
                        {addOn2.options.map((opt) => (
                          <TouchableOpacity key={opt.id} style={[s.printerChip, { paddingVertical: 10, paddingHorizontal: 16 }, selectedAddOnOptions[aid] === opt.id && s.printerChipActive]} onPress={() => setSelectedAddOnOptions((prev: Record<string, string>) => ({ ...prev, [aid]: opt.id }))} activeOpacity={0.8}>
                            <Text style={[s.printerChipText, selectedAddOnOptions[aid] === opt.id && s.printerChipTextActive]}>{opt.label}{opt.price > 0 ? ` +${opt.price.toFixed(2)}€` : ''}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={s.primaryBtn} onPress={handleConfirmOptions} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>Añadir a la comanda</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[s.comanderaContainer, isPC && s.comanderaPC]}>
      <View style={[s.comanderaLeft, isPC && s.comanderaLeftPC]}>
        {locations.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.locTabs} contentContainerStyle={s.locTabsContent}>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[s.locTab, selectedLocationId === loc.id && s.locTabActive]}
                onPress={() => onSelectLocation(loc.id)}
                activeOpacity={0.8}
              >
                <MapPin size={11} color={selectedLocationId === loc.id ? '#fff' : C.textMuted} strokeWidth={2.5} />
                <Text style={[s.locTabText, selectedLocationId === loc.id && s.locTabTextActive]}>{loc.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <ScrollView style={{ flex: 1 }} horizontal={isPC} showsHorizontalScrollIndicator={false}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={!isPC ? { width: CANVAS_H_PC, height: CANVAS_W_PC } : undefined}>
            <View style={[
              s.canvas,
              isPC
                ? { width: CANVAS_W_PC, height: CANVAS_H_PC }
                : {
                    width: CANVAS_W_PC,
                    height: CANVAS_H_PC,
                    position: 'absolute',
                    left: -(CANVAS_W_PC - CANVAS_H_PC) / 2,
                    top: (CANVAS_W_PC - CANVAS_H_PC) / 2,
                    transform: [{ rotate: '90deg' }],
                  }
            ]}>
              {decorations.map((deco) => {
                const baseSize = getDecoSize(deco.type);
                const scaledW = Math.round(baseSize.w * (deco.scaleW || 1));
                const scaledH = Math.round(baseSize.h * (deco.scaleH || 1));
                const emoji = getDecoEmoji(deco.type);
                return (
                  <View
                    key={deco.id}
                    style={{
                      position: 'absolute',
                      left: deco.x,
                      top: deco.y,
                      width: scaledW,
                      height: scaledH,
                      transform: [{ rotate: `${deco.rotation}deg` }],
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.6,
                    }}
                  >
                    {deco.type === 'wall' ? (
                      <View style={{ width: '100%', height: '100%', backgroundColor: '#4a4a52', borderRadius: 3, borderWidth: 2, borderColor: '#6a6a76' }}>
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#8a8a94', borderRadius: 1 }} />
                      </View>
                    ) : deco.type === 'wall2' ? (
                      <View style={{ width: '100%', height: '100%', backgroundColor: '#7a5a3a', borderRadius: 2, borderWidth: 1.5, borderColor: '#aa7a52' }}>
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#c0904a', borderRadius: 1 }} />
                      </View>
                    ) : deco.type === 'bar' ? (
                      <View style={{ width: '100%', height: '100%', backgroundColor: '#5a3a1a', borderRadius: 4, borderWidth: 1.5, borderColor: '#8a6030' }}>
                        <View style={{ position: 'absolute', top: 2, left: 4, right: 4, height: 3, backgroundColor: '#a07040', borderRadius: 1 }} />
                      </View>
                    ) : deco.type === 'door' ? (
                      <View style={{ width: '100%', height: '100%', backgroundColor: '#2a4a6a', borderRadius: 3, borderWidth: 1.5, borderColor: '#4a7aaa', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: '65%', height: 2, backgroundColor: '#6aaadd', position: 'absolute', top: '30%' }} />
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#c8a84b', position: 'absolute', right: 7 }} />
                      </View>
                    ) : deco.type === 'plant' ? (
                      <View style={{ width: scaledW, height: scaledH, borderRadius: scaledW / 2, backgroundColor: '#1a4a22', borderWidth: 1.5, borderColor: '#2a7a32', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: scaledW * 0.5, height: scaledH * 0.5, borderRadius: scaledW * 0.25, backgroundColor: '#2a6a2a' }} />
                      </View>
                    ) : deco.type === 'pillar' ? (
                      <View style={{ width: '100%', height: '100%', backgroundColor: '#3a3a48', borderRadius: 3, borderWidth: 2, borderColor: '#5a5a6a', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: '50%', height: '50%', backgroundColor: '#4a4a5a', borderRadius: 2 }} />
                      </View>
                    ) : (
                      <Text style={{ fontSize: Math.min(scaledW, scaledH) * 0.7 }}>{emoji}</Text>
                    )}
                  </View>
                );
              })}
              {tables.length === 0 && extraTables.length === 0 ? (
                <View style={s.floorEmpty}>
                  <UtensilsCrossed size={48} color={C.border} strokeWidth={1.5} />
                  <Text style={s.floorEmptyTitle}>Sin mesas</Text>
                </View>
              ) : (
                <>
                  {tables.map((table, index) => {
                    const pos = getTablePosition(table.id, index);
                    const order = getOrderForTable(table);
                    const reservation = getReservationForTable(table);
                    return (
                      <ComanderaTableNode
                        key={table.id}
                        table={table}
                        position={pos}
                        order={order}
                        reservation={reservation}
                        isSelected={selectedOrder?.tableId === table.id}
                        onPress={handleTablePress}
                      />
                    );
                  })}
                  {extraTables.map((et, index) => {
                    const pos = getTablePosition(et.id, tables.length + index);
                    const asTable = {
                      id: et.id,
                      name: et.name,
                      restaurantId: '',
                      locationId: et.locationId,
                      minCapacity: 1,
                      maxCapacity: et.capacity,
                      allowsHighChairs: false,
                      allowsStrollers: false,
                      allowsPets: false,
                      priority: 0,
                      order: 0,
                      createdAt: '',
                    } as Table;
                    const order = getOrderForExtraTable(et);
                    return (
                      <ComanderaTableNode
                        key={et.id}
                        table={asTable}
                        position={pos}
                        order={order}
                        reservation={null}
                        isSelected={selectedOrder?.tableId === et.id}
                        onPress={handleTablePress}
                        isExtra={true}
                        isChairType={et.type === 'chair'}
                      />
                    );
                  })}
                </>
              )}
            </View>
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      {isPC && selectedOrder && (
        <View style={[s.comanderaRight, isPC && s.comanderaRightPC]}>
          <View style={s.orderHeader}>
            <View>
              <Text style={s.orderHeaderTitle}>Mesa {selectedOrder.tableLabel}</Text>
              <Text style={s.orderHeaderSub}>
                {selectedOrder.guests} comensales · {selectedOrder.items.length} platos · {timeSince(selectedOrder.createdAt)}
              </Text>
              {selectedOrder.reservationInfo && (
                <View style={s.reservationInfo}>
                  <Users size={11} color={C.blue} strokeWidth={2} />
                  <Text style={s.reservationInfoText}>
                    {selectedOrder.reservationInfo.clientName} · {selectedOrder.reservationInfo.time}
                  </Text>
                  {selectedOrder.reservationInfo.highChairs > 0 && (
                    <>
                      <Baby size={11} color={C.yellow} strokeWidth={2} />
                      <Text style={s.reservationInfoText}>{selectedOrder.reservationInfo.highChairs}</Text>
                    </>
                  )}
                  {selectedOrder.reservationInfo.pets && <Dog size={11} color={C.green} strokeWidth={2} />}
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelectedOrder(null)} style={s.modalCloseBtn}>
              <X size={18} color={C.textMuted} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {selectedOrder.items.length > 0 && (
              <View style={s.orderItems}>
                {selectedOrder.items.map((item: OrderItem) => (
                  <View key={item.id} style={s.orderItemRow}>
                    <View style={s.orderItemQty}>
                      <TouchableOpacity onPress={() => handleItemQty(item.id, -1)} style={s.qtyMiniBtn}>
                        <Minus size={10} color={C.text} strokeWidth={3} />
                      </TouchableOpacity>
                      <Text style={s.orderItemQtyText}>{item.qty}</Text>
                      <TouchableOpacity onPress={() => handleItemQty(item.id, 1)} style={s.qtyMiniBtn}>
                        <Plus size={10} color={C.text} strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.orderItemName}>{item.name}</Text>
                      {item.categoryName ? <Text style={s.orderItemCat}>{item.categoryName}</Text> : null}
                      {item.notes ? <Text style={s.orderItemNotes}>{item.notes}</Text> : null}
                    </View>
                    <Text style={s.orderItemPrice}>{(item.price * item.qty).toFixed(2)}€</Text>
                    <View style={[s.statusDot, {
                      backgroundColor: item.status === 'ready' ? C.green : item.status === 'preparing' ? C.yellow : item.status === 'served' ? C.blue : C.textMuted,
                    }]} />
                    <TouchableOpacity onPress={() => handleRemoveItem(item.id)} style={s.itemDelBtn}>
                      <X size={12} color={C.red} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {categories.length > 0 && (
              <View style={s.productSelector}>
                <Text style={s.productSelectorTitle}>Añadir productos</Text>
                {sequences.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {[...sequences].sort((a, b) => a.priority - b.priority).map((seq) => (
                        <TouchableOpacity
                          key={seq.id}
                          style={[
                            s.catChip,
                            selectedSequenceId === seq.id && { backgroundColor: seq.color, borderColor: seq.color },
                          ]}
                          onPress={() => setSelectedSequenceId(seq.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.catChipText, selectedSequenceId === seq.id && { color: '#fff' }]}>
                            {seq.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
                {families && families.length > 0 ? (
                  <View style={{ maxHeight: 110, marginBottom: 6 }}>
                    <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                      {[...families].sort((a, b) => a.order - b.order).map((fam) => {
                        const famCats = [...categories.filter((c) => c.familyId === fam.id)].sort((a, b) => a.order - b.order);
                        if (famCats.length === 0) return null;
                        return (
                          <View key={fam.id} style={{ marginBottom: 4 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
                              <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 }}>
                                <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, minWidth: 0 }}>
                                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fam.color }} />
                                  <Text style={{ fontSize: 10, color: fam.color, fontWeight: '700' as const, maxWidth: 72 }} numberOfLines={1}>{fam.name}</Text>
                                </View>
                                {famCats.map((cat) => (
                                  <TouchableOpacity
                                    key={cat.id}
                                    style={[s.catChip, selectedCatId === cat.id && { backgroundColor: cat.color }]}
                                    onPress={() => setSelectedCatId(cat.id)}
                                    activeOpacity={0.8}
                                  >
                                    <Text style={[s.catChipText, selectedCatId === cat.id && { color: '#fff' }]}>{cat.name}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </ScrollView>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[s.catChip, selectedCatId === cat.id && { backgroundColor: cat.color }]}
                          onPress={() => setSelectedCatId(cat.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.catChipText, selectedCatId === cat.id && { color: '#fff' }]}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
                <View style={s.productGrid}>
                  {currentCatProducts.map((prod: ComandasProduct) => (
                    <TouchableOpacity
                      key={prod.id}
                      style={s.productBtn}
                      onPress={() => handleAddProduct(prod)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.productBtnName} numberOfLines={2}>{prod.name}</Text>
                      {prod.hasStockControl && (() => {
                        const today = new Date().toISOString().split('T')[0];
                        const entry = stockData.find((se) => se.productId === prod.id && se.date === today);
                        if (!entry || entry.quantity === null) return null;
                        let used = 0;
                        allOrders.forEach((o) => { if (o.status === 'closed') return; o.items.forEach((itm) => { if ((itm as any).productId === prod.id) used += itm.qty; }); });
                        const remaining = (entry.quantity ?? 0) - used;
                        return <Text style={{ fontSize: 9, fontWeight: '700' as const, color: remaining <= 0 ? C.red : C.purple, marginTop: 1 }}>{remaining <= 0 ? 'AGOTADO' : `${remaining} uds`}</Text>;
                      })()}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {categories.length === 0 && (
              <View style={s.emptyInline}>
                <AlertCircle size={24} color={C.yellow} strokeWidth={2} />
                <Text style={s.emptyInlineText}>Configura categorías y platos</Text>
                <Text style={s.emptyInlineDesc}>Ve a Configuración → Categorías y Platos</Text>
              </View>
            )}
          </ScrollView>

          <View style={s.orderFooter}>
            <View style={s.orderTotalRow}>
              <Text style={s.orderTotalLabel}>Total</Text>
              <Text style={s.orderTotalValue}>{orderTotal.toFixed(2)}€</Text>
            </View>
            <View style={s.orderBtns}>
              <TouchableOpacity style={s.sendKitchenBtn} onPress={handleSendToKitchen} activeOpacity={0.85}>
                <ChefHat size={16} color="#fff" strokeWidth={2.5} />
                <Text style={s.sendKitchenBtnText}>Enviar a cocina</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.closeOrderBtn} onPress={handleCloseOrder} activeOpacity={0.85}>
                <CheckCircle2 size={16} color={C.green} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Modal visible={showGuestsModal} animationType="fade" transparent onRequestClose={() => setShowGuestsModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Mesa {pendingTable?.name}</Text>
              <TouchableOpacity onPress={() => setShowGuestsModal(false)} style={s.modalCloseBtn}>
                <X size={20} color={C.textMuted} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            {pendingTable && getReservationForTable(pendingTable) && (
              <View style={s.reservationBanner}>
                <Users size={14} color={C.blue} strokeWidth={2} />
                <Text style={s.reservationBannerText}>
                  Reserva: {getReservationForTable(pendingTable)?.clientName || getReservationForTable(pendingTable)?.client?.name || 'Cliente'}
                </Text>
              </View>
            )}
            <Text style={s.inputLabel}>Número de comensales</Text>
            <View style={s.guestsRow}>
              <TouchableOpacity
                style={s.guestsBtn}
                onPress={() => setGuestsInput(String(Math.max(1, parseInt(guestsInput) - 1)))}
              >
                <Minus size={18} color={C.text} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={s.guestsValue}>{guestsInput}</Text>
              <TouchableOpacity
                style={s.guestsBtn}
                onPress={() => setGuestsInput(String(parseInt(guestsInput) + 1))}
              >
                <Plus size={18} color={C.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={handleCreateOrderForTable} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Abrir comanda →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de opciones: características, añadidos y precio */}
      <Modal visible={showOptionsModal} animationType="slide" transparent onRequestClose={() => setShowOptionsModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { maxHeight: '85%' }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{pendingProduct?.name}</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)} style={s.modalCloseBtn}>
                <X size={20} color={C.textMuted} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Price variant selection */}
              {pendingProduct && ((pendingProduct.price2 && pendingProduct.price2 > 0) || (pendingProduct.price3 && pendingProduct.price3 > 0)) && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[s.inputLabel, { marginBottom: 8 }]}>Seleccionar precio</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <TouchableOpacity
                      style={[s.priceVariantChip, selectedPriceVariant === 'main' && s.priceVariantChipActive]}
                      onPress={() => setSelectedPriceVariant('main')}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.priceVariantLabel, selectedPriceVariant === 'main' && s.priceVariantLabelActive]}>Normal</Text>
                      <Text style={[s.priceVariantPrice, selectedPriceVariant === 'main' && s.priceVariantPriceActive]}>{pendingProduct.price.toFixed(2)}€</Text>
                    </TouchableOpacity>
                    {pendingProduct.price2 && pendingProduct.price2 > 0 ? (
                      <TouchableOpacity
                        style={[s.priceVariantChip, selectedPriceVariant === 'price2' && s.priceVariantChipActive]}
                        onPress={() => setSelectedPriceVariant('price2')}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.priceVariantLabel, selectedPriceVariant === 'price2' && s.priceVariantLabelActive]}>{pendingProduct.price2Label || 'Precio 2'}</Text>
                        <Text style={[s.priceVariantPrice, selectedPriceVariant === 'price2' && s.priceVariantPriceActive]}>{pendingProduct.price2.toFixed(2)}€</Text>
                      </TouchableOpacity>
                    ) : null}
                    {pendingProduct.price3 && pendingProduct.price3 > 0 ? (
                      <TouchableOpacity
                        style={[s.priceVariantChip, selectedPriceVariant === 'price3' && s.priceVariantChipActive]}
                        onPress={() => setSelectedPriceVariant('price3')}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.priceVariantLabel, selectedPriceVariant === 'price3' && s.priceVariantLabelActive]}>{pendingProduct.price3Label || 'Precio 3'}</Text>
                        <Text style={[s.priceVariantPrice, selectedPriceVariant === 'price3' && s.priceVariantPriceActive]}>{pendingProduct.price3.toFixed(2)}€</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}

              {(pendingProduct?.characteristicIds || []).map((cid: string) => {
                const char = characteristics.find((c) => c.id === cid);
                if (!char) return null;
                return (
                  <View key={cid} style={{ marginBottom: 16 }}>
                    <Text style={[s.inputLabel, { marginBottom: 8 }]}>{char.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {char.options.map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          style={[s.printerChip, { paddingVertical: 10, paddingHorizontal: 16 }, selectedCharOptions[cid] === opt.label && s.printerChipActive]}
                          onPress={() => setSelectedCharOptions((prev: Record<string, string>) => ({ ...prev, [cid]: opt.label }))}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.printerChipText, selectedCharOptions[cid] === opt.label && s.printerChipTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}

              {(pendingProduct?.addOnIds || []).map((aid: string) => {
                const addOn = addOns.find((a) => a.id === aid);
                if (!addOn) return null;
                return (
                  <View key={aid} style={{ marginBottom: 16 }}>
                    <Text style={[s.inputLabel, { marginBottom: 8 }]}>{addOn.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <TouchableOpacity
                        style={[s.printerChip, { paddingVertical: 10, paddingHorizontal: 16 }, !selectedAddOnOptions[aid] && s.printerChipActive]}
                        onPress={() => setSelectedAddOnOptions((prev: Record<string, string>) => ({ ...prev, [aid]: '' }))}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.printerChipText, !selectedAddOnOptions[aid] && s.printerChipTextActive]}>Sin añadido</Text>
                      </TouchableOpacity>
                      {addOn.options.map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          style={[s.printerChip, { paddingVertical: 10, paddingHorizontal: 16 }, selectedAddOnOptions[aid] === opt.id && s.printerChipActive]}
                          onPress={() => setSelectedAddOnOptions((prev: Record<string, string>) => ({ ...prev, [aid]: opt.id }))}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.printerChipText, selectedAddOnOptions[aid] === opt.id && s.printerChipTextActive]}>
                            {opt.label}{opt.price > 0 ? ` +${opt.price.toFixed(2)}€` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}

              {pendingProduct?.hasStockControl && (() => {
                const stock = getStockForProduct(pendingProduct.id);
                const used = getUsedStockForProduct(pendingProduct.id);
                const remaining = stock !== null ? stock - used : null;
                return (
                  <View style={{ marginBottom: 16, backgroundColor: remaining !== null && remaining <= 0 ? '#2a1515' : C.card, borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600' as const, color: remaining !== null && remaining <= 0 ? C.red : C.purple }}>
                      📦 Stock: {remaining !== null ? `${remaining} unidades disponibles` : 'Sin límite (no configurado)'}
                    </Text>
                  </View>
                );
              })()}
            </ScrollView>
            <TouchableOpacity style={s.primaryBtn} onPress={handleConfirmOptions} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Añadir a la comanda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ComanderaTableNode({
  table,
  position,
  order,
  reservation,
  isSelected,
  onPress,
  isExtra = false,
  isChairType = false,
}: {
  key?: string;
  table: Table;
  position: TablePosition;
  order: Order | null;
  reservation: any;
  isSelected: boolean;
  onPress: (t: Table) => void;
  isExtra?: boolean;
  isChairType?: boolean;
}) {
  const isOccupied = !!order && order.items.length > 0;
  const isReady = !!order && order.status === 'ready';
  const hasPending = !!order && order.items.some((i) => i.status === 'pending');
  const hasReservation = !!reservation;

  const baseTableColor = isExtra ? '#1a2a3a' : C.tableFree;
  const tableColor = isReady ? C.tableReady : isOccupied ? C.tableOccupied : baseTableColor;
  const chairColor = isReady ? C.chairReady : isOccupied ? C.chairOccupied : C.chair;
  const baseBorderColor = isExtra ? C.blue + '80' : C.border;
  const borderColor = isSelected ? C.blue : isReady ? C.green : hasPending ? C.accent : isOccupied ? '#c2570a' : hasReservation ? C.blue + '80' : baseBorderColor;
  const textColor = isReady ? C.green : isOccupied ? '#fbbf80' : isExtra ? C.blue : C.textDim;

  if (isChairType) {
    const chairSize = 52;
    const seatSize = 32;
    const armW = 6;
    const armH = 22;
    return (
      <View
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: chairSize,
          height: chairSize,
          transform: [{ rotate: `${position.rotation || 0}deg` }],
        }}
      >
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onPress(table)}
          style={{
            position: 'absolute',
            left: (chairSize - seatSize) / 2,
            top: (chairSize - seatSize) / 2,
            width: seatSize,
            height: seatSize,
            borderRadius: 6,
            backgroundColor: tableColor,
            borderWidth: isSelected ? 2.5 : 1.5,
            borderColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 8, fontWeight: '700' as const, color: textColor, textAlign: 'center' as const }} numberOfLines={1}>{table.name}</Text>
          {isOccupied && <View style={s.tablePendingDot} />}
        </TouchableOpacity>
        <View style={{
          position: 'absolute',
          left: 0,
          top: (chairSize - armH) / 2,
          width: armW,
          height: armH,
          borderRadius: 3,
          backgroundColor: isOccupied ? '#5c2a08' : '#3a4a5a',
          borderWidth: 1,
          borderColor: isOccupied ? '#7c3a12' : '#5a6a7a',
        }} />
        <View style={{
          position: 'absolute',
          right: 0,
          top: (chairSize - armH) / 2,
          width: armW,
          height: armH,
          borderRadius: 3,
          backgroundColor: isOccupied ? '#5c2a08' : '#3a4a5a',
          borderWidth: 1,
          borderColor: isOccupied ? '#7c3a12' : '#5a6a7a',
        }} />
        <View style={{
          position: 'absolute',
          left: (chairSize - seatSize + 4) / 2,
          top: 2,
          width: seatSize - 4,
          height: 6,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          backgroundColor: isOccupied ? '#6c3a08' : '#4a5a6a',
          borderWidth: 1,
          borderColor: isOccupied ? '#8c4a18' : '#5a6a7a',
        }} />
      </View>
    );
  }

  const tx = (CARD_W - TABLE_W) / 2;
  const ty = (CARD_H - TABLE_H) / 2;
  const chairs = getChairCenters(table.maxCapacity);

  const infoY = ty + TABLE_H + CHAIR_D + 8;

  return (
    <View style={[s.tableNode, {
      left: position.x,
      top: position.y,
      transform: [{ rotate: `${position.rotation || 0}deg` }],
      width: CARD_W,
      height: CARD_H + (hasReservation ? 42 : 0),
    }]}>
      {chairs.map((c, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: c.cx - CHAIR_D / 2,
            top: c.cy - CHAIR_D / 2,
            width: CHAIR_D,
            height: CHAIR_D,
            borderRadius: CHAIR_D / 2,
            backgroundColor: chairColor,
            borderWidth: 1,
            borderColor: borderColor + '60',
          }}
        />
      ))}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onPress(table)}
        style={[s.tableRect, { left: tx, top: ty, backgroundColor: tableColor, borderColor, borderWidth: isSelected ? 2.5 : 1.5 }]}
      >
        <Text style={[s.tableNumber, { color: textColor }]} numberOfLines={1}>{table.name}</Text>
        {isExtra && !isOccupied && <Text style={{ fontSize: 7, color: C.blue + 'aa' }}>EXTRA</Text>}
        {isReady && <Check size={10} color={C.green} strokeWidth={3} style={{ marginTop: 1 }} />}
        {hasPending && !isReady && <View style={s.tablePendingDot} />}
        {order && order.items.length > 0 && (
          <Text style={[s.tableItemCount, { color: textColor + 'cc' }]}>{order.items.length}p</Text>
        )}
      </TouchableOpacity>

      {hasReservation && !isOccupied && (
        <View style={[s.tableReservationTag, { top: infoY }]}>
          <Text style={s.tableReservationText} numberOfLines={1}>
            {reservation.clientName || reservation.client?.name || '?'} · {reservation.guests}p
          </Text>
        </View>
      )}
    </View>
  );
}


function buildThermalHtml(params: {
  tableLabel: string;
  guests: number;
  sequenceName?: string;
  waiterName?: string;
  items: { qty: number; name: string; notes?: string; characteristics?: string[]; addOns?: string[] }[];
  template?: PrintTemplate | null;
}): string {
  const { tableLabel, guests, sequenceName, waiterName, items, template } = params;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const ptToPx = (pt: number): number => Math.round(pt * 1.33);
  const globalBase = template?.fontSize === 'large' ? 16 : template?.fontSize === 'small' ? 11 : 13;
  const mesaPx = template?.fontSizePtMesa ? ptToPx(template.fontSizePtMesa) : (template?.fontSize === 'large' ? 22 : template?.fontSize === 'small' ? 14 : 17);
  const seqPx = template?.fontSizePtSequence ? ptToPx(template.fontSizePtSequence) : (template?.fontSize === 'large' ? 18 : 14);
  const infoPx = template?.fontSizePtInfo ? ptToPx(template.fontSizePtInfo) : globalBase;
  const camareroPx = template?.fontSizePtCamarero ? ptToPx(template.fontSizePtCamarero) : globalBase;
  const itemPx = template?.fontSizePtItem ? ptToPx(template.fontSizePtItem) : (template?.fontSize === 'large' ? 16 : template?.fontSize === 'small' ? 12 : 14);
  const lineSpacingPx = (template?.lineSpacingItem || 0) * 14;

  const rows = items.map((item) => {
    const subs = [
      ...(item.characteristics || []).map((c) => `<div class="sub">- ${c}</div>`),
      ...(item.addOns || []).map((a) => `<div class="sub">+ ${a}</div>`),
      item.notes ? `<div class="sub note">!! ${item.notes}</div>` : '',
    ].filter(Boolean).join('');
    const extraSpace = lineSpacingPx > 0 ? `margin-bottom:${lineSpacingPx}px;` : '';
    return `<div class="item" style="${extraSpace}"><span class="qty">${item.qty}x</span> ${item.name}</div>${subs}`;
  }).join('');

  const css = `@page{size:80mm auto;margin:0}*{box-sizing:border-box}body{font-family:'Courier New',Courier,monospace;font-size:${globalBase}px;width:80mm;padding:4mm;margin:0}.center{text-align:center}.bold{font-weight:bold}.big{font-size:${mesaPx}px;font-weight:bold}.hr{border:none;border-top:1px dashed #000;margin:5px 0}.item{font-weight:bold;margin:3px 0;font-size:${itemPx}px}.qty{min-width:26px;display:inline-block}.sub{padding-left:14px;font-size:11px;margin:1px 0}.note{font-style:italic}.info{font-size:${infoPx}px}.cam{font-size:${camareroPx}px}.seq{font-weight:bold;text-transform:uppercase;font-size:${seqPx}px;margin:4px 0;text-align:center}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${template?.headerLine1 ? `<div class="center bold">${template.headerLine1}</div>` : ''}${template?.headerLine2 ? `<div class="center">${template.headerLine2}</div>` : ''}${template?.headerLine1 || template?.headerLine2 ? '<hr class="hr">' : ''}<div class="big">${tableLabel}</div><br>${waiterName ? `<div class="cam">Camarero: ${waiterName}</div>` : ''}<div class="info">${timeStr} &nbsp; ${guests} com.</div><hr class="hr">${sequenceName ? `<div class="seq">${sequenceName.toUpperCase()}</div><br>` : ''}${rows}<hr class="hr">${template?.footerLine1 ? `<div class="center">${template.footerLine1}</div>` : ''}${template?.footerLine2 ? `<div class="center">${template.footerLine2}</div>` : ''}<script>window.onload=function(){window.print();setTimeout(function(){window.close();},800);}</script></body></html>`;
}

let _kwAudioCtx: any = null;

function _getKwAudioCtx(): any {
  if (typeof window === 'undefined') return null;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!_kwAudioCtx || _kwAudioCtx.state === 'closed') _kwAudioCtx = new AC();
    return _kwAudioCtx;
  } catch { return null; }
}

function unlockAudio(): void {
  const ctx = _getKwAudioCtx();
  if (ctx && ctx.state === 'suspended') { void ctx.resume(); }
}

function playBeepSound(vol: number = 0.6): void {
  try {
    const ctx = _getKwAudioCtx();
    if (!ctx) return;
    const doPlay = () => {
      const beep = (freq: number, start: number, dur: number, gain: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(gain * vol, ctx.currentTime + start);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur);
      };
      beep(880, 0, 0.18, 0.7);
      beep(1100, 0.22, 0.22, 0.8);
      beep(880, 0.48, 0.18, 0.6);
    };
    if (ctx.state === 'suspended') { ctx.resume().then(doPlay).catch(() => {}); } else { doPlay(); }
  } catch {}
}

function KitchenMonitorView({
  orders,
  allOrders,
  persist,
  tick,
  categories = [],
  stockData = [],
  onSaveStockData,
  sequences = [],
  reservations = [],
  rawReservations = [],
  printTemplates = [],
  printers = [],
  allTables = [],
  restaurantId,
}: {
  orders: Order[];
  allOrders: Order[];
  persist: (orders: Order[]) => void;
  tick: number;
  categories?: ComandasCategory[];
  stockData?: StockEntry[];
  onSaveStockData?: (data: StockEntry[]) => void;
  sequences?: CourseSequence[];
  reservations?: any[];
  rawReservations?: any[];
  printTemplates?: PrintTemplate[];
  printers?: PrinterConfig[];
  allTables?: Table[];
  restaurantId?: string | null;
}) {
  void tick;
  void sequences;
  const [showStockModal, setShowStockModal] = useState(false);
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [showBridgeModal, setShowBridgeModal] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [printedItemIds, setPrintedItemIds] = useState<Set<string>>(new Set());
  const [containerHeight, setContainerHeight] = useState(0);
  const [viewMode, setViewMode] = useState<'pendientes' | 'terminado'>('pendientes');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const lastKnownRef = useRef<Map<string, { itemCount: number; status: string }>>(new Map());
  const isFirstSyncRef = useRef(true);
  const newPulseAnim = useRef(new Animated.Value(1)).current;
  const [soundVolume, setSoundVolume] = useState<number>(0.6);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const soundVolumeRef = useRef(0.6);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = localStorage.getItem('kw_vol');
        if (v !== null) {
          const parsed = parseFloat(v);
          if (!isNaN(parsed)) {
            const clamped = Math.max(0, Math.min(1, parsed));
            setSoundVolume(clamped);
            soundVolumeRef.current = clamped;
          }
        }
      }
    } catch {}
  }, []);

  const handleVolumeChange = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(1, Math.round((soundVolumeRef.current + delta) * 10) / 10));
    setSoundVolume(next);
    soundVolumeRef.current = next;
    try {
      if (typeof window !== 'undefined') localStorage.setItem('kw_vol', String(next));
    } catch {}
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (newOrderIds.size === 0) {
      newPulseAnim.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(newPulseAnim, { toValue: 0.93, duration: 500, useNativeDriver: true }),
        Animated.timing(newPulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [newOrderIds.size, newPulseAnim]);

  useEffect(() => {
    if (orders.length === 0 && isFirstSyncRef.current) return;
    const newIds = new Set<string>();
    if (!isFirstSyncRef.current) {
      orders.forEach(o => {
        const known = lastKnownRef.current.get(o.id);
        if (!known) {
          if (o.status !== 'closed') newIds.add(o.id);
        } else {
          if (o.items.length > known.itemCount && o.status !== 'closed') newIds.add(o.id);
          else if (known.status === 'closed' && (o.status === 'open' || o.status === 'ready')) newIds.add(o.id);
        }
      });
    }
    lastKnownRef.current = new Map(orders.map(o => [o.id, { itemCount: o.items.length, status: o.status }]));
    isFirstSyncRef.current = false;
    if (newIds.size > 0) {
      setNewOrderIds(prev => new Set([...prev, ...newIds]));
      playBeepSound(soundVolumeRef.current);
    }
  }, [orders]);

  const handleAcceptOrder = useCallback((orderId: string) => {
    setNewOrderIds(prev => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const handler = () => unlockAudio();
    document.addEventListener('touchstart', handler, { once: true });
    document.addEventListener('pointerdown', handler, { once: true });
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('pointerdown', handler);
    };
  }, []);

  const timeString = useMemo(() => {
    const hh = String(currentTime.getHours()).padStart(2, '0');
    const mm = String(currentTime.getMinutes()).padStart(2, '0');
    const ss = String(currentTime.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [currentTime]);

  const TICKET_STEP = 296;

  const handleScrollLeft = useCallback(() => {
    const newOffset = Math.max(0, scrollOffset - TICKET_STEP);
    scrollRef.current?.scrollTo({ x: newOffset, animated: true });
  }, [scrollOffset]);

  const handleScrollRight = useCallback(() => {
    const newOffset = scrollOffset + TICKET_STEP;
    scrollRef.current?.scrollTo({ x: newOffset, animated: true });
  }, [scrollOffset]);

  const stockProducts = useMemo(() => {
    const prods: ComandasProduct[] = [];
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.hasStockControl) prods.push(item);
      });
    });
    return prods;
  }, [categories]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const getStockQty = useCallback((productId: string): string => {
    const entry = stockData.find((s) => s.productId === productId && s.date === today);
    if (!entry || entry.quantity === null) return '';
    const num = entry.quantity;
    return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
  }, [stockData, today]);

  const handleSetStock = useCallback((productId: string, value: string) => {
    if (!onSaveStockData) return;
    if (value.endsWith('.')) return;
    const qty = value === '' ? null : parseFloat(value);
    if (qty !== null && isNaN(qty)) return;
    const existing = stockData.filter((s) => !(s.productId === productId && s.date === today));
    if (qty !== null) {
      existing.push({ productId, quantity: qty, date: today, setAt: Date.now() });
    }
    onSaveStockData(existing);
  }, [stockData, today, onSaveStockData]);

  const allTickets = useMemo(() => {
    const tickets: { order: Order; items: OrderItem[] }[] = [];
    orders.forEach((o) => {
      const hasActivePendingItems = o.items.some(i => i.status === 'pending' || i.status === 'preparing');
      if (o.status === 'closed' && !hasActivePendingItems) return;
      const kitchenItems = o.items.filter((i) => i.status !== 'served' && i.status !== 'pending' && i.sendToMonitor !== false);
      if (kitchenItems.length > 0) {
        tickets.push({ order: o, items: kitchenItems });
      }
    });
    return tickets.sort((a, b) => {
      const aIsNew = newOrderIds.has(a.order.id) ? 0 : 1;
      const bIsNew = newOrderIds.has(b.order.id) ? 0 : 1;
      if (aIsNew !== bIsNew) return aIsNew - bIsNew;
      return a.order.createdAt - b.order.createdAt;
    });
  }, [orders, newOrderIds]);

  const completedOrders = useMemo(() => {
    return allOrders
      .filter((o) => o.status === 'closed' && !o.items.some(i => i.status === 'pending' || i.status === 'preparing'))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allOrders]);

  const handleReopenOrder = useCallback((orderId: string) => {
    const updated = allOrders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: 'open' as const,
            items: o.items.map((i) => ({ ...i, status: 'pending' as const })),
          }
        : o
    );
    persist(updated);
    setViewMode('pendientes');
  }, [allOrders, persist]);

  const handleItemReady = useCallback((orderId: string, itemId: string) => {
    const updated = allOrders.map((o) => {
      if (o.id !== orderId) return o;
      const items = o.items.map((i) => (i.id === itemId ? { ...i, status: 'ready' as const } : i));
      const allReady = items.length > 0 && items.every((i) => i.status === 'ready' || i.status === 'served');
      return { ...o, items, status: allReady ? ('ready' as const) : ('open' as const) };
    });
    persist(updated);
  }, [allOrders, persist]);

  const handleItemPreparing = useCallback((orderId: string, itemId: string) => {
    const updated = allOrders.map((o) => {
      if (o.id !== orderId) return o;
      return { ...o, items: o.items.map((i) => (i.id === itemId ? { ...i, status: 'preparing' as const } : i)) };
    });
    persist(updated);
  }, [allOrders, persist]);

  const handleTicketReady = useCallback((orderId: string) => {
    const updated = allOrders.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        items: o.items.map((i) => ({ ...i, status: 'ready' as const })),
        status: 'ready' as const,
      };
    });
    persist(updated);
  }, [allOrders, persist]);

  const handleOrderServed = useCallback((orderId: string) => {
    const updated = allOrders.map((o) =>
      o.id === orderId ? { ...o, status: 'closed' as const } : o
    );
    persist(updated);
    handleAcceptOrder(orderId);
  }, [allOrders, persist, handleAcceptOrder]);

  const togglePrintSelect = useCallback((itemId: string) => {
    setSelectedForPrint((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(itemId)) { next.delete(itemId); } else { next.add(itemId); }
      return next;
    });
  }, []);

  const handlePrintItems = useCallback(async (orderData: Order, toPrint: OrderItem[]) => {
    if (toPrint.length === 0) return;

    const template = printTemplates.find((t) => t.name === 'Monitor de Cocina') || (printTemplates.length > 0 ? printTemplates[0] : null);

    const byPrinter: Record<string, OrderItem[]> = {};
    toPrint.forEach((item) => {
      const key = item.printerId || '__default__';
      if (!byPrinter[key]) byPrinter[key] = [];
      byPrinter[key].push(item);
    });

    for (const [printerId, items] of Object.entries(byPrinter)) {
      const seqName = items.find((i) => i.courseSequenceName)?.courseSequenceName;
      const itemParams = items.map((i) => ({
        qty: i.qty,
        name: i.name,
        notes: i.notes || undefined,
        characteristics: i.selectedCharacteristics?.map((c) => `${c.charName}: ${c.optionLabel}`),
        addOns: i.selectedAddOns?.map((a) => `${a.addOnName}: ${a.optionLabel}`),
      }));

      console.log('[Print] Routing to printer', printerId, '->', items.length, 'items');

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const html = buildThermalHtml({
          tableLabel: orderData.tableLabel,
          guests: orderData.guests,
          sequenceName: seqName,
          items: itemParams,
          template,
        });
        const pw = window.open('', '_blank', 'width=450,height=600,menubar=no,toolbar=no,location=no,status=no');
        if (pw) {
          pw.document.open();
          pw.document.write(html);
          pw.document.close();
        } else {
          setShowBridgeModal(true);
        }
      } else {
        const isValidP2 = (p: PrinterConfig) => p.connectionType === 'usb-windows' ? !!p.windowsPrinterName?.trim() : !!p.ipAddress?.trim();
        const printer = printerId !== '__default__'
          ? (printers.find((p) => p.id === printerId && isValidP2(p)) || printers.find((p) => isValidP2(p) && p.isActive !== false))
          : printers.find((p) => isValidP2(p) && p.isActive !== false);
        if (!printer) {
          Alert.alert('Sin impresora', `No se encontró impresora para imprimir ${items.length} artículo(s). Comprueba la configuración de impresoras.`);
          continue;
        }
        if (!restaurantId) {
          Alert.alert('Error', 'No hay sesión activa del restaurante');
          continue;
        }
        const isUsb2 = printer.connectionType === 'usb-windows';
        try {
          console.log('[Print] Sending to agent:', printer.name, isUsb2 ? 'USB:' + printer.windowsPrinterName : printer.ipAddress + ':' + (printer.port || 9100));
          await vanillaClient.comandas.printKitchenTicket.mutate({
            restaurantId,
            printerIp: isUsb2 ? '' : printer.ipAddress.trim(),
            printerPort: printer.port || 9100,
            printerName: printer.name,
            printerType: isUsb2 ? 'usb' : 'tcp',
            windowsPrinterName: isUsb2 ? printer.windowsPrinterName : undefined,
            tableLabel: orderData.tableLabel,
            guests: orderData.guests,
            sequenceName: seqName,
            items: itemParams,
            headerLine1: template?.headerLine1,
            headerLine2: template?.headerLine2,
            footerLine1: template?.footerLine1,
            footerLine2: template?.footerLine2,
            fontSize: template?.fontSize || 'medium',
            spaceBefore: template?.spaceBefore || 0,
            spaceAfter: template?.spaceAfter,
            fontSizeMesa: template?.fontSizeMesa,
            fontSizeSequence: template?.fontSizeSequence,
            fontSizeInfo: template?.fontSizeInfo,
            fontSizeItem: template?.fontSizeItem,
            fontSizePtMesa: template?.fontSizePtMesa,
            fontSizePtSequence: template?.fontSizePtSequence,
            fontSizePtInfo: template?.fontSizePtInfo,
            fontSizePtItem: template?.fontSizePtItem,
            lineSpacingItem: template?.lineSpacingItem,
          });
          console.log('[Print] Job queued for printer:', printer.name);
        } catch (err: any) {
          console.error('[Print] Error:', err);
          Alert.alert('Error al imprimir', err.message || 'No se pudo enviar el trabajo');
        }
      }
    }
  }, [printTemplates, printers, restaurantId]);

  const _handlePrintTicket = useCallback(async (orderId: string) => {
    const orderData = allOrders.find((o) => o.id === orderId);
    if (!orderData) return;
    const readyUnprinted = orderData.items.filter(
      (i) => i.status === 'ready' && !printedItemIds.has(i.id)
    );
    const selectedInOrder = readyUnprinted.filter((i) => selectedForPrint.has(i.id));
    const toPrint = selectedInOrder.length > 0
      ? selectedInOrder
      : readyUnprinted.length > 0
        ? readyUnprinted
        : orderData.items.filter((i) => !printedItemIds.has(i.id) && i.sendToMonitor !== false);
    if (toPrint.length === 0) return;
    const newPrinted = new Set(printedItemIds);
    toPrint.forEach((i) => newPrinted.add(i.id));
    setPrintedItemIds(newPrinted);
    setSelectedForPrint((prev: Set<string>) => {
      const next = new Set(prev);
      toPrint.forEach((i) => next.delete(i.id));
      return next;
    });
    await handlePrintItems(orderData, toPrint);
    if (Platform.OS !== 'web') {
      Alert.alert('✅ Enviado al agente', 'Los trabajos de impresión han sido enviados a cada impresora configurada.');
    }
  }, [allOrders, selectedForPrint, printedItemIds, handlePrintItems]);

  const handlePrintAllInSequence = useCallback(async (orderId: string, seqItems: OrderItem[]) => {
    const orderData = allOrders.find((o) => o.id === orderId);
    if (!orderData) return;
    const unprintedSeq = seqItems.filter((i) => !printedItemIds.has(i.id) && i.status !== 'cancelled');
    if (unprintedSeq.length === 0) return;
    const newPrinted = new Set(printedItemIds);
    unprintedSeq.forEach((i) => newPrinted.add(i.id));
    setPrintedItemIds(newPrinted);
    setSelectedForPrint((prev: Set<string>) => {
      const next = new Set(prev);
      unprintedSeq.forEach((i: OrderItem) => next.delete(i.id));
      return next;
    });
    await handlePrintItems(orderData, unprintedSeq);
    if (Platform.OS !== 'web') {
      Alert.alert('✅ Enviado', 'Se enviaron todos los platos de la secuencia a sus impresoras.');
    }
  }, [allOrders, printedItemIds, handlePrintItems]);

  const handlePrintSelectedInSequence = useCallback(async (orderId: string, seqItems: OrderItem[]) => {
    const orderData = allOrders.find((o) => o.id === orderId);
    if (!orderData) return;
    const selectedInSeq = seqItems.filter((i) => selectedForPrint.has(i.id) && !printedItemIds.has(i.id));
    if (selectedInSeq.length === 0) return;
    const newPrinted = new Set(printedItemIds);
    selectedInSeq.forEach((i) => newPrinted.add(i.id));
    setPrintedItemIds(newPrinted);
    setSelectedForPrint((prev: Set<string>) => {
      const next = new Set(prev);
      selectedInSeq.forEach((i: OrderItem) => next.delete(i.id));
      return next;
    });
    await handlePrintItems(orderData, selectedInSeq);
    if (Platform.OS !== 'web') {
      Alert.alert('✅ Enviado', 'Se enviaron los platos seleccionados a sus impresoras.');
    }
  }, [allOrders, selectedForPrint, printedItemIds, handlePrintItems]);

  const renderBridgeModal = useCallback(() => (
    <Modal visible={showBridgeModal} animationType="slide" transparent onRequestClose={() => setShowBridgeModal(false)}>
      <View style={s.modalOverlay}>
        <View style={[s.modalSheet, { maxHeight: '92%' }]}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>🖨️ Configurar impresión</Text>
            <TouchableOpacity onPress={() => setShowBridgeModal(false)} style={s.modalCloseBtn}>
              <X size={20} color={C.textMuted} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ backgroundColor: '#fef3c7', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#fbbf24', flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 20 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700' as const, color: '#92400e', marginBottom: 4 }}>Las ventanas emergentes están bloqueadas</Text>
                <Text style={{ fontSize: 12, color: '#78350f', lineHeight: 18 }}>{'Para imprimir, Chrome necesita permiso para abrir ventanas emergentes. Pulsa el icono de bloqueo en la barra de dirección y activa los pop-ups para este sitio.'}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 14, fontWeight: '800' as const, color: '#0f172a', marginBottom: 12 }}>Cómo activar pop-ups en Chrome Android</Text>
              {([
                { n: '1', text: 'Pulsa el icono 🔒 o ⚙️ en la barra de dirección' },
                { n: '2', text: 'Selecciona "Configuración del sitio"' },
                { n: '3', text: 'Busca "Ventanas emergentes" y cámbialo a "Permitir"' },
                { n: '4', text: 'Recarga la página y vuelve a pulsar imprimir' },
              ] as { n: string; text: string }[]).map((s2) => (
                <View key={s2.n} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800' as const, color: '#fff' }}>{s2.n}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#334155', flex: 1, lineHeight: 20 }}>{s2.text}</Text>
                </View>
              ))}
            </View>

            <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#bbf7d0' }}>
              <Text style={{ fontSize: 13, fontWeight: '700' as const, color: '#166534', marginBottom: 6 }}>💡 ¿Cómo funciona la impresión?</Text>
              <Text style={{ fontSize: 12, color: '#14532d', lineHeight: 19 }}>
                {'Al pulsar imprimir se abre una ventana con el ticket formateado para papel térmico (80mm). Android usa la app de tu impresora (Epson Print Service, Star Print Service, etc.) para enviarlo automáticamente a la impresora correcta.\n\nSi no tienes la app instalada, ve a Configuración → Conectar impresoras para instrucciones.'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  ), [showBridgeModal]);

  const ITEMS_PER_CHUNK = 6;
  const ticketChunks = useMemo(() => {
    const result: { order: Order; items: OrderItem[]; partIndex: number; totalParts: number }[] = [];
    allTickets.forEach(({ order, items }: { order: Order; items: OrderItem[] }) => {
      const activeItems = items.filter((i: OrderItem) => i.status !== 'ready');
      const totalParts = Math.ceil(Math.max(activeItems.length, 1) / ITEMS_PER_CHUNK);
      if (totalParts <= 1) {
        result.push({ order, items, partIndex: 0, totalParts: 1 });
      } else {
        const parts: OrderItem[][] = [];
        let currentPart: OrderItem[] = [];
        let nonReadyCount = 0;
        for (const item of items) {
          if (item.status !== 'ready') {
            if (nonReadyCount > 0 && nonReadyCount % ITEMS_PER_CHUNK === 0) {
              parts.push([...currentPart]);
              currentPart = [];
            }
            nonReadyCount++;
          }
          currentPart.push(item);
        }
        if (currentPart.length > 0) parts.push(currentPart);
        parts.forEach((partItems, p) => {
          result.push({ order, items: partItems, partIndex: p, totalParts: parts.length });
        });
      }
    });
    return result;
  }, [allTickets]);

  const screenDims = Dimensions.get('window');
  const availableHeight = containerHeight > 100 ? containerHeight - 72 : screenDims.height - 150;

  const renderPlanningModalContent = () => {
    const totalGuests = todayReservations.reduce((s: number, r: any) => s + (r.guests || 0), 0);
    const confirmedCount = todayReservations.filter((r: any) => r.status === 'confirmed').length;
    return (
      <>
        <View style={s.modalHandle} />
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>📅 Planning de Hoy</Text>
          <TouchableOpacity onPress={() => setShowPlanningModal(false)} style={s.modalCloseBtn}>
            <X size={20} color={C.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        {todayReservations.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <View style={{ backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '800' as const, color: '#1d4ed8' }}>{todayReservations.length}</Text>
              <Text style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>Reservas</Text>
            </View>
            <View style={{ backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '800' as const, color: '#16a34a' }}>{totalGuests}</Text>
              <Text style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>Comensales</Text>
            </View>
            <View style={{ backgroundColor: '#fefce8', borderRadius: 10, padding: 10, flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '800' as const, color: '#d97706' }}>{confirmedCount}</Text>
              <Text style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>Confirmadas</Text>
            </View>
          </View>
        )}
        {todayReservations.length === 0 ? (
          <View style={s.emptyInline}><Text style={s.emptyInlineText}>Sin reservas hoy</Text></View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {todayReservations.map((r: any, idx: number) => {
              const timeStr = (() => {
                if (r.time && typeof r.time === 'object') return `${String(r.time.hour).padStart(2,'0')}:${String(r.time.minute).padStart(2,'0')}`;
                if (r.time && typeof r.time === 'string') return r.time.slice(0, 5);
                if (r.timeSlot && typeof r.timeSlot === 'string') return r.timeSlot.slice(0, 5);
                return '--:--';
              })();
              const name = r.clientName || r.client?.name || 'Cliente';
              const tableNames = (r.tableIds || []).map((tid: string) => allTables.find((t: Table) => t.id === tid)?.name).filter(Boolean).join(', ');
              return (
                <View key={r.id || idx} style={s.kwPlanningRow}>
                  <View style={s.kwPlanningTime}>
                    <Text style={s.kwPlanningTimeText}>{timeStr}</Text>
                    <Text style={s.kwPlanningGuests}>{r.guests}p</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.kwPlanningName}>{name}</Text>
                    {tableNames ? <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>🪑 {tableNames}</Text> : null}
                    {(r.highChairCount > 0 || r.needsStroller || r.hasPets) && (
                      <View style={{ flexDirection: 'row', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                        {r.highChairCount > 0 && <Text style={s.kwPlanningTag}>👶 {r.highChairCount} tronas</Text>}
                        {r.needsStroller && <Text style={[s.kwPlanningTag, { backgroundColor: '#ede9fe', color: '#7c3aed' }]}>🚼 Cochecito</Text>}
                        {r.hasPets && <Text style={[s.kwPlanningTag, { backgroundColor: '#dcfce7', color: '#16a34a' }]}>🐕 Mascota</Text>}
                      </View>
                    )}
                    {r.notes ? <Text style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontStyle: 'italic' as const }}>{r.notes}</Text> : null}
                  </View>
                  <View style={[s.kwPlanningStatus, { backgroundColor: r.status === 'confirmed' ? '#dcfce7' : '#fef3c7' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700' as const, color: r.status === 'confirmed' ? '#16a34a' : '#d97706' }}>
                      {r.status === 'confirmed' ? 'Conf.' : 'Pend.'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </>
    );
  };

  const todayReservations = useMemo(() => {
    const sourceData = rawReservations.length > 0 ? rawReservations : reservations;
    console.log('[KitchenMonitor] source:', sourceData.length, 'raw:', rawReservations.length, 'filtered:', reservations.length);
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const filtered = rawReservations.length > 0
      ? sourceData.filter((r: any) => {
          const dateField = r.date || r.reservationDate || r.bookingDate || '';
          const rDate = dateField ? String(dateField).split('T')[0] : '';
          const statusBad = r.status === 'cancelled' || r.status === 'no-show' || r.status === 'cancelada' || r.status === 'noshow' || r.status === 'rejected';
          return rDate === today && !statusBad;
        })
      : sourceData;
    const getMinutes = (r: any): number => {
      if (r.time && typeof r.time === 'object') {
        return (r.time.hour || 0) * 60 + (r.time.minute || 0);
      }
      if (r.time && typeof r.time === 'string') {
        const parts = r.time.split(':');
        return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
      }
      if (r.timeSlot && typeof r.timeSlot === 'string') {
        const parts = r.timeSlot.split(':');
        return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
      }
      return 0;
    };
    return [...filtered].sort((a, b) => getMinutes(a) - getMinutes(b));
  }, [reservations, rawReservations]);

  const renderBottomBar = () => (
    <View style={s.kwBottomBar}>
      <View style={s.kwClockContainer}>
        <Text style={s.kwClockText}>{timeString}</Text>
      </View>

      <TouchableOpacity
        style={[s.kwBarToggleBtn, viewMode === 'terminado' && s.kwBarToggleBtnActive]}
        onPress={() => setViewMode(viewMode === 'pendientes' ? 'terminado' : 'pendientes')}
        activeOpacity={0.8}
      >
        <Text style={[s.kwBarToggleBtnText, viewMode === 'terminado' && s.kwBarToggleBtnTextActive]}>
          {viewMode === 'pendientes' ? 'Pendientes' : 'Terminado'}
        </Text>
      </TouchableOpacity>

      <View style={s.kwNavBtns}>
        <TouchableOpacity style={s.kwNavBtn} onPress={handleScrollLeft} activeOpacity={0.7}>
          <ChevronLeft size={20} color="#334155" strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity style={s.kwNavBtn} onPress={handleScrollRight} activeOpacity={0.7}>
          <ChevronRight size={20} color="#334155" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.kwBarIconBtn} onPress={() => setShowStockModal(true)} activeOpacity={0.8}>
        <Package size={17} color="#334155" strokeWidth={2} />
        <Text style={s.kwBarIconBtnText}>Stock</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.kwBarIconBtn} onPress={() => setShowPlanningModal(true)} activeOpacity={0.8}>
        <CalendarDays size={17} color="#334155" strokeWidth={2} />
        <Text style={s.kwBarIconBtnText}>Planning</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.kwBarIconBtn} onPress={() => setShowVolumeModal(true)} activeOpacity={0.8}>
        <Volume2 size={17} color={soundVolume === 0 ? '#ef4444' : '#334155'} strokeWidth={2} />
        <Text style={[s.kwBarIconBtnText, soundVolume === 0 && { color: '#ef4444' }]}>{Math.round(soundVolume * 100)}%</Text>
      </TouchableOpacity>
    </View>
  );

  const showEmpty = viewMode === 'pendientes' ? allTickets.length === 0 : completedOrders.length === 0;

  if (showEmpty) {
    return (
      <View style={s.kwContainer} onLayout={(e: { nativeEvent: { layout: { height: number } } }) => setContainerHeight(e.nativeEvent.layout.height)}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          {viewMode === 'pendientes' ? (
            <>
              <ChefHat size={56} color="#cbd5e1" strokeWidth={1.5} />
              <Text style={{ fontSize: 22, fontWeight: '700' as const, color: '#94a3b8' }}>Cocina libre</Text>
              <Text style={{ fontSize: 14, color: '#b0bec5' }}>No hay platos pendientes</Text>
            </>
          ) : (
            <>
              <CheckCircle2 size={56} color="#cbd5e1" strokeWidth={1.5} />
              <Text style={{ fontSize: 22, fontWeight: '700' as const, color: '#94a3b8' }}>Sin pedidos terminados</Text>
              <Text style={{ fontSize: 14, color: '#b0bec5' }}>Los pedidos cerrados aparecerán aquí</Text>
            </>
          )}
        </View>
        {renderBottomBar()}
        <Modal visible={showStockModal} animationType="slide" transparent onRequestClose={() => setShowStockModal(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { maxHeight: '85%' }]}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>📦 Control de Stock</Text>
                <TouchableOpacity onPress={() => setShowStockModal(false)} style={s.modalCloseBtn}>
                  <X size={20} color={C.textMuted} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <View style={s.emptyInline}>
                <Text style={s.emptyInlineText}>Sin productos con stock configurado</Text>
              </View>
            </View>
          </View>
        </Modal>
        <Modal visible={showPlanningModal} animationType="slide" transparent onRequestClose={() => setShowPlanningModal(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { maxHeight: '90%' }]}>
              {renderPlanningModalContent()}
            </View>
          </View>
        </Modal>
        {renderBridgeModal()}
      </View>
    );
  }

  return (
    <View style={s.kwContainer} onLayout={(e: { nativeEvent: { layout: { height: number } } }) => setContainerHeight(e.nativeEvent.layout.height)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={(e: { nativeEvent: { contentOffset: { x: number } } }) => setScrollOffset(e.nativeEvent.contentOffset.x)}
      >
        <View style={[s.kwColumnGrid, availableHeight > 0 ? { height: availableHeight } : {}]}>
          {viewMode === 'terminado' && completedOrders.map((order: Order) => (
            <View key={order.id} style={[s.kwTicket, { borderTopColor: '#22c55e' }]}>
              <View style={[s.kwTicketHeader, { backgroundColor: '#f0fdf4' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.kwTicketTable}>{order.tableLabel}</Text>
                  <Text style={s.kwTicketTime}>{timeSince(order.createdAt)}</Text>
                </View>
                <Text style={s.kwTicketGuests}>{order.guests} com.</Text>
                <TouchableOpacity
                  style={[s.kwServedBtn, { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }]}
                  onPress={() => handleReopenOrder(order.id)}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={16} color="#ef4444" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              {order.items.map((item) => (
                <View key={item.id} style={[s.kwItemRow, { backgroundColor: '#f8fafc' }]}>
                  <Text style={[s.kwItemQty, { color: '#94a3b8' }]}>{item.qty}×</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.kwItemName, { color: '#94a3b8', textDecorationLine: 'line-through' as const }]}>{item.name}</Text>
                  </View>
                  <Check size={13} color="#22c55e" strokeWidth={2.5} />
                </View>
              ))}
              <View style={s.kwDoneBanner}>
                <Check size={14} color="#16a34a" strokeWidth={2.5} />
                <Text style={s.kwDoneBannerText}>Terminado</Text>
              </View>
            </View>
          ))}
          {viewMode === 'pendientes' && ticketChunks.map(({ order, items, partIndex, totalParts }: { order: Order; items: OrderItem[]; partIndex: number; totalParts: number }) => {
            const isNew = newOrderIds.has(order.id);
            const activeItems = items.filter((i: OrderItem) => i.status !== 'ready');
            const allDone = activeItems.length === 0;
            const hasPreparing = items.some((i: OrderItem) => i.status === 'preparing');
            const isContinued = partIndex > 0;
            const hasContinuation = partIndex < totalParts - 1;
            const accentColor = isNew ? '#f97316' : allDone ? '#16a34a' : (hasPreparing ? '#d97706' : '#ea580c');
            const headerBg = isNew ? '#fff7ed' : allDone ? '#dcfce7' : (hasPreparing ? '#fef9c3' : '#fff7ed');
            const ticketKey = `${order.id}-${partIndex}`;

            const seqGroups: Record<string, OrderItem[]> = {};
            const seqOrder: string[] = [];
            for (const item of items) {
              const key = item.courseSequenceId || '__none__';
              if (!seqGroups[key]) {
                seqGroups[key] = [];
                seqOrder.push(key);
              }
              seqGroups[key].push(item);
            }

            return (
              <Animated.View
                key={ticketKey}
                style={[
                  s.kwTicket,
                  { borderTopColor: accentColor },
                  isContinued && s.kwTicketContinued,
                  isNew && s.kwTicketNew,
                  isNew && { transform: [{ scale: newPulseAnim }] },
                ]}
              >
                {isNew && !isContinued && (
                  <View style={s.kwNewOrderBanner}>
                    <Bell size={12} color="#ea580c" strokeWidth={2.5} />
                    <Text style={s.kwNewOrderBannerText}>¡Nueva comanda!</Text>
                    <TouchableOpacity style={s.kwAcceptBtn} onPress={() => handleAcceptOrder(order.id)} activeOpacity={0.8}>
                      <Check size={11} color="#fff" strokeWidth={2.5} />
                      <Text style={s.kwAcceptBtnText}>Aceptar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={[s.kwTicketHeader, { backgroundColor: headerBg }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.kwTicketTable}>
                      {isContinued ? `${order.tableLabel} ›` : order.tableLabel}
                    </Text>
                    <Text style={s.kwTicketTime}>{timeSince(order.createdAt)}</Text>
                  </View>
                  <Text style={s.kwTicketGuests}>{order.guests} com.</Text>
                  {!isContinued && (
                    <TouchableOpacity
                      style={s.kwServedBtn}
                      onPress={() => handleOrderServed(order.id)}
                      activeOpacity={0.8}
                    >
                      <CheckCircle2 size={18} color="#16a34a" strokeWidth={2.5} />
                    </TouchableOpacity>
                  )}
                </View>

                {seqOrder.map((groupKey) => {
                  const seqItems = seqGroups[groupKey];
                  const seqName = seqItems.find((i) => i.courseSequenceName)?.courseSequenceName;
                  const seqColor = seqItems.find((i) => i.courseSequenceColor)?.courseSequenceColor || '#94a3b8';
                  const showLabel = !!seqName;
                  const hasPrintable = seqItems.some(i => !printedItemIds.has(i.id) && i.status !== 'cancelled');
                  const selectedInSeq = seqItems.filter(i => selectedForPrint.has(i.id) && !printedItemIds.has(i.id));

                  return (
                    <View key={groupKey}>
                      {showLabel && (
                        <View style={[s.kwSequenceLabel, { backgroundColor: seqColor + '18', borderLeftColor: seqColor }]}>
                          <TouchableOpacity
                            style={[s.kwSeqPrintAllBtn, !hasPrintable && s.kwSeqPrintAllBtnDim]}
                            onPress={() => { if (hasPrintable) void handlePrintAllInSequence(order.id, seqItems); }}
                            activeOpacity={hasPrintable ? 0.7 : 1}
                          >
                            <Printer size={14} color={hasPrintable ? '#334155' : '#b0bec5'} strokeWidth={2.5} />
                            <Text style={[s.kwSeqPrintAllBtnText, !hasPrintable && { color: '#b0bec5' }]}>Todo</Text>
                          </TouchableOpacity>
                          <Text style={[s.kwSequenceLabelText, { color: seqColor, flex: 1, marginLeft: 6, marginRight: 4 }]} numberOfLines={1}>{seqName}</Text>
                          {selectedInSeq.length > 0 && (
                            <TouchableOpacity
                              style={[s.kwSeqPrintAllBtn, s.kwSeqPrintSelBtn]}
                              onPress={() => void handlePrintSelectedInSequence(order.id, seqItems)}
                              activeOpacity={0.7}
                            >
                              <Printer size={13} color="#fff" strokeWidth={2.5} />
                              <Text style={[s.kwSeqPrintAllBtnText, { color: '#fff' }]}>{selectedInSeq.length}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {seqItems.map((item) => {
                        const isReady = item.status === 'ready';
                        const isPreparing = item.status === 'preparing';
                        const isSelectedPrint = selectedForPrint.has(item.id);

                        if (isReady) {
                          const isPrinted = printedItemIds.has(item.id);
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[s.kwItemRow, { backgroundColor: isPrinted ? '#f0fdf4' : isSelectedPrint ? '#ecfdf5' : '#f8fafc' }]}
                              onPress={() => { if (!isPrinted) togglePrintSelect(item.id); }}
                              activeOpacity={isPrinted ? 1 : 0.7}
                            >
                              <Text style={[s.kwItemQty, { color: '#16a34a' }]}>{item.qty}×</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={[s.kwItemName, { color: '#94a3b8', textDecorationLine: 'line-through' as const }]}>{item.name}</Text>
                                {item.notes ? <Text style={[s.kwItemNotes, { color: '#94a3b8' }]}>{item.notes}</Text> : null}
                              </View>
                              {isPrinted
                                ? <Printer size={13} color="#16a34a" strokeWidth={2.5} />
                                : isSelectedPrint
                                  ? <Printer size={13} color="#3b82f6" strokeWidth={2.5} />
                                  : <Check size={14} color="#16a34a" strokeWidth={2.5} />
                              }
                            </TouchableOpacity>
                          );
                        }

                        if (isPreparing) {
                          return (
                            <View key={item.id} style={[s.kwItemRow, { backgroundColor: '#fefce8' }]}>
                              <Text style={[s.kwItemQty, { color: '#d97706' }]}>{item.qty}×</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={[s.kwItemName, { color: '#92400e', fontStyle: 'italic' as const }]}>{item.name}</Text>
                                {item.notes ? <Text style={s.kwItemNotes}>{item.notes}</Text> : null}
                              </View>
                              <TouchableOpacity style={s.kwDoneBtn} onPress={() => handleItemReady(order.id, item.id)} activeOpacity={0.8}>
                                <Check size={14} color="#fff" strokeWidth={2.5} />
                              </TouchableOpacity>
                            </View>
                          );
                        }

                        return (
                          <View key={item.id} style={s.kwItemRow}>
                            <Text style={s.kwItemQty}>{item.qty}×</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={s.kwItemName}>{item.name}</Text>
                              {item.notes ? <Text style={s.kwItemNotes}>⚠ {item.notes}</Text> : null}
                            </View>
                            <TouchableOpacity style={s.kwPrepBtn} onPress={() => handleItemPreparing(order.id, item.id)} activeOpacity={0.8}>
                              <Text style={s.kwPrepBtnText}>Prep</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.kwDoneBtn} onPress={() => handleItemReady(order.id, item.id)} activeOpacity={0.8}>
                              <Check size={14} color="#fff" strokeWidth={2.5} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}


                {!hasContinuation && !allDone && (
                  <TouchableOpacity style={s.kwAllReadyBtn} onPress={() => handleTicketReady(order.id)} activeOpacity={0.85}>
                    <CheckCircle2 size={14} color="#16a34a" strokeWidth={2.5} />
                    <Text style={s.kwAllReadyBtnText}>Todo listo</Text>
                  </TouchableOpacity>
                )}
                {!hasContinuation && allDone && (
                  <View style={s.kwDoneBanner}>
                    <Check size={14} color="#16a34a" strokeWidth={2.5} />
                    <Text style={s.kwDoneBannerText}>Listo para servir</Text>
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {renderBottomBar()}

      <Modal visible={showStockModal} animationType="slide" transparent onRequestClose={() => setShowStockModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { maxHeight: '85%' }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>📦 Control de Stock</Text>
              <TouchableOpacity onPress={() => setShowStockModal(false)} style={s.modalCloseBtn}>
                <X size={20} color={C.textMuted} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Unidades disponibles hoy. Se resetean cada día. Vacío = venta ilimitada.</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {stockProducts.length === 0 ? (
                <View style={s.emptyInline}>
                  <Text style={s.emptyInlineText}>Sin productos con control de stock</Text>
                  <Text style={s.emptyInlineDesc}>Actívalo en Configuración → Familias → Producto</Text>
                </View>
              ) : (
                stockProducts.map((prod: ComandasProduct) => {
                  const currentVal = getStockQty(prod.id);
                  const stockEntry = stockData.find((s) => s.productId === prod.id && s.date === today);
                  const setAt = stockEntry?.setAt || 0;
                  let usedCount = 0;
                  allOrders.forEach((o) => { if (o.status === 'closed') return; if (o.createdAt > setAt) { o.items.forEach((itm) => { if ((itm as any).productId === prod.id) usedCount += itm.qty; }); } });
                  const remaining = currentVal !== '' ? parseFloat(currentVal) - usedCount : null;
                  return (
                    <View key={prod.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, backgroundColor: C.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600' as const, color: C.text }}>{prod.name}</Text>
                        <Text style={{ fontSize: 11, color: C.textMuted }}>
                          {currentVal !== '' ? `Stock: ${currentVal} | Vendidos: ${usedCount} | Quedan: ${remaining}` : 'Sin límite'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => { const cur = parseFloat(currentVal) || 0; const step = cur % 1 !== 0 ? 0.5 : 1; if (cur > 0) handleSetStock(prod.id, String(Math.max(0, parseFloat((cur - step).toFixed(2))))); }}
                        >
                          <Minus size={14} color={C.text} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TextInput
                          style={{ width: 50, backgroundColor: C.surface, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 6, fontSize: 16, fontWeight: '700' as const, color: C.text, textAlign: 'center' as const }}
                          value={currentVal}
                          onChangeText={(v: string) => handleSetStock(prod.id, v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                          keyboardType="number-pad"
                          placeholder="∞"
                          placeholderTextColor={C.textMuted}
                        />
                        <TouchableOpacity
                          style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => { const cur = parseFloat(currentVal) || 0; const step = cur % 1 !== 0 ? 0.5 : 1; handleSetStock(prod.id, String(parseFloat((cur + step).toFixed(2)))); }}
                        >
                          <Plus size={14} color={C.text} strokeWidth={2.5} />
                        </TouchableOpacity>
                        {currentVal !== '' && (
                          <TouchableOpacity
                            style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#2a1515', alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => handleSetStock(prod.id, '')}
                          >
                            <X size={14} color={C.red} strokeWidth={2.5} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPlanningModal} animationType="slide" transparent onRequestClose={() => setShowPlanningModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { maxHeight: '90%' }]}>
            {renderPlanningModalContent()}
          </View>
        </View>
      </Modal>

      {renderBridgeModal()}

      <Modal visible={showVolumeModal} animationType="fade" transparent onRequestClose={() => setShowVolumeModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { maxHeight: 260 }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>🔊 Volumen de alertas</Text>
              <TouchableOpacity onPress={() => setShowVolumeModal(false)} style={s.modalCloseBtn}>
                <X size={20} color={C.textMuted} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => handleVolumeChange(-0.1)}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 22, fontWeight: '700' as const, color: '#334155' }}>−</Text>
                </TouchableOpacity>
                <View style={{ alignItems: 'center', minWidth: 80 }}>
                  <Text style={{ fontSize: 38, fontWeight: '900' as const, color: '#0f172a' }}>{Math.round(soundVolume * 100)}%</Text>
                  {soundVolume === 0 && <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>Silenciado</Text>}
                </View>
                <TouchableOpacity
                  onPress={() => handleVolumeChange(0.1)}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 22, fontWeight: '700' as const, color: '#fff' }}>+</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => { playBeepSound(soundVolumeRef.current); }}
                style={{ backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '600' as const, color: '#334155' }}>▶ Probar sonido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  topBar: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 14,
    paddingBottom: 0,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarTitle: { fontSize: 18, fontWeight: '700' as const, color: C.text },
  badge: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '800' as const, color: '#fff' },

  mainTabs: {
    flexDirection: 'row',
    gap: 4,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  mainTabWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  mainTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  mainTabActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  mainTabText: { fontSize: 12, fontWeight: '600' as const, color: C.textMuted },
  mainTabTextActive: { color: '#fff' },
  copyLinkBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  scroll: { flex: 1 },
  configContent: { padding: 16, gap: 12 },
  configSectionTitle: { fontSize: 16, fontWeight: '700' as const, color: C.text, marginBottom: 4 },
  configCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  configCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configCardLabel: { fontSize: 15, fontWeight: '600' as const, color: C.text },
  configCardDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sectionHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '700' as const, color: C.text },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.border,
  },
  editToggleActive: { borderColor: C.green + '60', backgroundColor: C.greenDark },
  editToggleText: { fontSize: 12, fontWeight: '600' as const, color: C.textMuted },
  editToggleTextActive: { color: C.green },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnSmallText: { fontSize: 13, fontWeight: '700' as const, color: '#fff' },

  locTabs: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    maxHeight: 46,
  },
  locTabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  locTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  locTabActive: { backgroundColor: C.accent, borderColor: C.accent },
  locTabText: { fontSize: 13, fontWeight: '600' as const, color: C.textMuted },
  locTabTextActive: { color: '#fff' },

  decoToolbar: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  decoToolbarLabel: { fontSize: 11, color: C.textMuted, marginBottom: 6, fontWeight: '600' as const },
  decoToolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  decoToolbarBtnText: { fontSize: 11, color: C.textDim, fontWeight: '500' as const },

  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.yellowDark + 'cc',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.yellow + '30',
  },
  editBannerText: { fontSize: 12, color: C.yellow, fontWeight: '500' as const },

  canvas: { backgroundColor: C.canvas, position: 'relative' },
  floorLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  floorLoadingText: { fontSize: 14, color: C.textMuted },
  floorEmpty: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  floorEmptyTitle: { fontSize: 18, fontWeight: '700' as const, color: C.textMuted },
  floorEmptyDesc: { fontSize: 13, color: C.textMuted, textAlign: 'center' as const },

  tableNode: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
  },
  tableRect: {
    position: 'absolute',
    width: TABLE_W,
    height: TABLE_H,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  tableNumber: {
    fontSize: 11,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  tableItemCount: { fontSize: 9, fontWeight: '600' as const },
  tablePendingDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: C.accent,
  },
  tableEditOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    gap: 3,
  },
  tableDragHandle: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: C.yellowDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableReservationTag: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tableReservationText: {
    fontSize: 8,
    color: C.blue,
    fontWeight: '600' as const,
    backgroundColor: C.blueDim,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },

  decoEditBtns: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    gap: 2,
  },
  decoMiniBtn: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: C.yellowDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  breadcrumbText: { fontSize: 13, color: C.accent, fontWeight: '600' as const },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  catDot: { width: 14, height: 14, borderRadius: 7 },
  catName: { fontSize: 15, fontWeight: '600' as const, color: C.text },
  catCount: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  catActions: { flexDirection: 'row', gap: 6 },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  productName: { fontSize: 14, fontWeight: '600' as const, color: C.text },
  productDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  productMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  productPrice: { fontSize: 12, fontWeight: '700' as const, color: C.accent },
  productTag: {
    fontSize: 10,
    color: C.blue,
    backgroundColor: C.blueDim,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
    fontWeight: '600' as const,
  },
  productActions: { flexDirection: 'row', gap: 6 },

  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2a1515',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyInline: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyInlineText: { fontSize: 15, fontWeight: '600' as const, color: C.textMuted },
  emptyInlineDesc: { fontSize: 13, color: C.textMuted, textAlign: 'center' as const },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },

  printerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  printerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printerName: { fontSize: 14, fontWeight: '600' as const, color: C.text },
  printerInfo: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  printerChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  printerChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  printerChipText: { fontSize: 12, fontWeight: '600' as const, color: C.textMuted },
  printerChipTextActive: { color: '#fff' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 10,
  },
  switchLabel: { fontSize: 14, color: C.text, fontWeight: '500' as const },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackOn: { backgroundColor: C.green },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  switchThumbOn: { alignSelf: 'flex-end' as const },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 19, fontWeight: '700' as const, color: C.text },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputLabel: { fontSize: 13, fontWeight: '600' as const, color: C.textDim, marginBottom: 6 },
  input: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },

  guestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 16,
  },
  guestsBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  guestsValue: { fontSize: 32, fontWeight: '800' as const, color: C.text, minWidth: 50, textAlign: 'center' as const },

  reservationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.blueDim,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  reservationBannerText: { fontSize: 13, color: C.blue, fontWeight: '600' as const },

  comanderaContainer: { flex: 1, flexDirection: 'column' },
  comanderaPC: { flexDirection: 'row' },
  comanderaLeft: { flex: 1 },
  comanderaLeftPC: { flex: 2 },
  comanderaRight: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    maxHeight: '50%',
  },
  comanderaRightPC: {
    flex: 1,
    borderTopWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
    maxHeight: '100%',
  },

  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  orderHeaderTitle: { fontSize: 17, fontWeight: '700' as const, color: C.text },
  orderHeaderSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  reservationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  reservationInfoText: { fontSize: 11, color: C.blue, fontWeight: '500' as const },

  orderItems: { padding: 10, gap: 4 },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.card,
    borderRadius: 8,
    padding: 8,
  },
  orderItemQty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: C.surface,
    borderRadius: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  qtyMiniBtn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderItemQtyText: { fontSize: 13, fontWeight: '800' as const, color: C.accent, minWidth: 16, textAlign: 'center' as const },
  orderItemName: { fontSize: 13, fontWeight: '600' as const, color: C.text },
  orderItemCat: { fontSize: 10, color: C.textMuted },
  orderItemNotes: { fontSize: 10, color: C.yellow },
  orderItemPrice: { fontSize: 12, fontWeight: '700' as const, color: C.textDim },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  itemDelBtn: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: '#2a1515',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productSelector: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  productSelectorTitle: { fontSize: 13, fontWeight: '600' as const, color: C.textDim, marginBottom: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  catChipText: { fontSize: 12, fontWeight: '600' as const, color: C.textMuted },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  productBtn: {
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 80,
    alignItems: 'center',
  },
  productBtnName: { fontSize: 12, fontWeight: '600' as const, color: C.text, textAlign: 'center' as const },
  productBtnPrice: { fontSize: 10, color: C.accent, fontWeight: '700' as const, marginTop: 2 },

  orderFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderTotalLabel: { fontSize: 14, fontWeight: '600' as const, color: C.textDim },
  orderTotalValue: { fontSize: 18, fontWeight: '800' as const, color: C.text },
  orderBtns: { flexDirection: 'row', gap: 8 },
  sendKitchenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 13,
  },
  sendKitchenBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#fff' },
  closeOrderBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyStateTitle: { fontSize: 20, fontWeight: '700' as const, color: C.textMuted },
  emptyStateDesc: { fontSize: 14, color: C.textMuted, textAlign: 'center' as const },

  kitchenFullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  kitchenFullscreenHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  kitchenFullscreenTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: C.text,
  },
  kitchenExitBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.red + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.red + '40',
  },
  fullscreenToggleBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  kitchenContent: { padding: 12, gap: 0 },
  kitchenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kitchenTicket: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    minWidth: 260,
    maxWidth: 400,
    flex: 1,
  },
  kitchenTicketDone: { borderColor: C.green + '50' },
  kitchenTicketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  kitchenTableBadge: {
    backgroundColor: C.accentDim,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kitchenTableText: { fontSize: 15, fontWeight: '800' as const, color: C.accent },
  kitchenTicketTime: { fontSize: 11, color: C.textMuted, textAlign: 'right' as const },
  kitchenTicketGuests: { fontSize: 10, color: C.textMuted, textAlign: 'right' as const },

  kitchenItemSection: { paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  kitchenSectionDot: {
    width: 6, height: 6, borderRadius: 3, marginBottom: 4,
  },
  kitchenItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  kitchenItemQty: { fontSize: 14, fontWeight: '800' as const, color: C.accent, minWidth: 26 },
  kitchenItemName: { fontSize: 14, fontWeight: '600' as const, color: C.text },
  kitchenItemNotes: { fontSize: 11, color: C.yellow, marginTop: 1 },
  kitchenStartBtn: {
    backgroundColor: C.yellowDark,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  kitchenStartBtnText: { fontSize: 11, fontWeight: '700' as const, color: C.yellow },
  kitchenDoneBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  kitchenTicketDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.greenDark,
    margin: 10,
    borderRadius: 10,
    paddingVertical: 10,
  },
  kitchenTicketDoneBtnText: { fontSize: 13, fontWeight: '700' as const, color: C.green },
  kitchenTicketDoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.greenDark + '60',
    padding: 10,
  },
  kitchenTicketDoneBannerText: { fontSize: 13, fontWeight: '600' as const, color: C.green },

  extraTableToolbar: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  extraTableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.blueDim,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.blue + '40',
  },
  extraTableChipText: { fontSize: 11, fontWeight: '600' as const, color: C.blue },

  priceVariantChip: {
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    minWidth: 90,
  },
  priceVariantChipActive: {
    backgroundColor: C.accentDim,
    borderColor: C.accent,
  },
  priceVariantLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: C.textMuted,
    marginBottom: 2,
  },
  priceVariantLabelActive: {
    color: C.accent,
  },
  priceVariantPrice: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: C.textDim,
  },
  priceVariantPriceActive: {
    color: '#fff',
  },

  kwContainer: { flex: 1, backgroundColor: '#ffffff' },
  kwColumnGrid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    padding: 10,
    gap: 0,
  },
  kwTicket: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 3,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    width: 280,
    marginBottom: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  kwTicketContinued: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: -9,
  },
  kwTicketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  kwTicketTable: { fontSize: 16, fontWeight: '800' as const, color: '#0f172a' },
  kwTicketTime: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  kwTicketGuests: { fontSize: 13, fontWeight: '600' as const, color: '#64748b' },
  kwItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    backgroundColor: '#ffffff',
  },
  kwItemQty: { fontSize: 14, fontWeight: '800' as const, color: '#ea580c', minWidth: 26 },
  kwItemName: { fontSize: 13, fontWeight: '600' as const, color: '#1e293b' },
  kwItemNotes: { fontSize: 11, color: '#d97706', marginTop: 1 },
  kwPrepBtn: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  kwPrepBtnText: { fontSize: 11, fontWeight: '700' as const, color: '#d97706' },
  kwDoneBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kwAllReadyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    margin: 8,
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  kwAllReadyBtnText: { fontSize: 13, fontWeight: '700' as const, color: '#16a34a' },
  kwDoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    padding: 9,
  },
  kwDoneBannerText: { fontSize: 13, fontWeight: '600' as const, color: '#16a34a' },
  kwContinuesBadge: {
    backgroundColor: '#f8fafc',
    paddingVertical: 5,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  kwContinuesText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' as const },
  kwBottomBar: {
    height: 72,
    backgroundColor: '#ffffff',
    borderTopWidth: 1.5,
    borderTopColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    gap: 6,
  },
  kwClockContainer: {
    backgroundColor: '#f0f3f0',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: '#c8d0c8',
    marginRight: 2,
  },
  kwClockText: {
    fontSize: 32,
    fontWeight: '900' as const,
    color: '#0a0a0a',
    fontFamily: Platform.OS === 'web' ? '"Courier New", monospace' : 'monospace',
    letterSpacing: 2,
  },
  kwBarToggleBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  kwBarToggleBtnActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  kwBarToggleBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#334155',
  },
  kwBarToggleBtnTextActive: {
    color: '#ffffff',
  },
  kwNavBtns: {
    flexDirection: 'row' as const,
    gap: 4,
  },
  kwNavBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  kwBarIconBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 2,
  },
  kwBarIconBtnText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#334155',
  },
  kwToolbar: {
    height: 72,
    backgroundColor: '#ffffff',
    borderTopWidth: 1.5,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  kwToolbarBtn: {
    width: 60,
    height: 58,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  kwToolbarBtnText: { fontSize: 9, fontWeight: '700' as const, color: '#334155' },
  kwServedBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0fdf4',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    marginLeft: 6,
  },
  kwSequenceLabel: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderLeftWidth: 3,
    marginTop: 2,
    marginBottom: 0,
    minHeight: 42,
    gap: 4,
  },
  kwSequenceLabelText: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
  },
  kwSeqPrintAllBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    gap: 3,
    minWidth: 56,
    justifyContent: 'center' as const,
  },
  kwSeqPrintAllBtnText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#334155',
  },
  kwSeqPrintAllBtnDim: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  kwSeqPrintSelBtn: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  kwTicketNew: {
    borderColor: '#fed7aa',
    shadowColor: '#f97316',
    shadowOpacity: 0.2 as const,
    shadowRadius: 8,
    elevation: 6,
  },
  kwNewOrderBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  kwNewOrderBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#ea580c',
  },
  kwAcceptBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    backgroundColor: '#ea580c',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  kwAcceptBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  kwPrinterBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginLeft: 4,
  },
  kwPrinterBtnActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  kwPlanningRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kwPlanningTime: {
    alignItems: 'center' as const,
    minWidth: 44,
  },
  kwPlanningTimeText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#0f172a',
  },
  kwPlanningGuests: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  kwPlanningName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  kwPlanningTag: {
    fontSize: 11,
    color: '#d97706',
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden' as const,
  },
  kwPlanningStatus: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  smContainer: { flex: 1, backgroundColor: '#f8fafc' },
  smHeader: {
    backgroundColor: '#1a2535',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  smHeaderLeft: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  smHeaderTable: { fontSize: 19, fontWeight: '800' as const, color: '#fff' },
  smHeaderSep: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.2)' },
  smHeaderGuests: { fontSize: 13, color: '#94a3b8', fontWeight: '600' as const },
  smHeaderClose: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },

  smSeqScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', maxHeight: 100 },
  smSeqContent: { paddingHorizontal: 10, paddingVertical: 10, gap: 7, flexDirection: 'row' as const, alignItems: 'center' as const },
  smSeqBtn: {
    paddingHorizontal: 16, paddingVertical: 0,
    borderRadius: 10, backgroundColor: '#f8fafc',
    borderWidth: 1.5, borderColor: '#e2e8f0',
    borderLeftWidth: 4, minHeight: 76,
    justifyContent: 'center' as const,
    minWidth: 90,
  },
  smSeqBtnText: { fontSize: 13, fontWeight: '600' as const, color: '#334155' },

  smCatScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', maxHeight: 40 },
  smCatContent: { paddingHorizontal: 8, paddingVertical: 5, gap: 5, flexDirection: 'row' as const, alignItems: 'center' as const },
  smCatBtn: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1.5,
    minHeight: 30, justifyContent: 'center' as const,
  },
  smCatBtnText: { fontSize: 11, fontWeight: '600' as const, color: '#1e293b' },

  smSplit: { flex: 1, flexDirection: 'row' as const },
  smItemsPanel: { flex: 1, backgroundColor: '#f8fafc' },
  smItemsEmpty: { alignItems: 'center' as const, paddingTop: 40, gap: 8 },
  smItemsEmptyText: { fontSize: 13, color: '#cbd5e1' },
  smItemRow: {
    flexDirection: 'row' as const, alignItems: 'stretch' as const,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    minHeight: 58,
  },
  smItemStrip: { width: 5, flexShrink: 0 },
  smItemQtyCol: {
    paddingVertical: 6, paddingHorizontal: 4,
    alignItems: 'center' as const, justifyContent: 'space-between' as const,
    gap: 2,
  },
  smQtyBtn: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: '#f1f5f9',
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  smQtyVal: { fontSize: 14, fontWeight: '800' as const, color: '#f97316', minWidth: 18, textAlign: 'center' as const },
  smItemTextCol: {
    flex: 1, paddingVertical: 7, paddingLeft: 5, paddingRight: 2,
    justifyContent: 'center' as const, gap: 2,
  },
  smItemName: { fontSize: 13, fontWeight: '600' as const, color: '#1e293b', lineHeight: 17 },
  smItemChars: { fontSize: 10, color: '#64748b' },
  smItemPrice: { fontSize: 12, fontWeight: '700' as const, color: '#0f172a' },
  smItemDel: { width: 28, alignItems: 'center' as const, justifyContent: 'center' as const },

  smProductsPanel: { width: 178, backgroundColor: '#fff', borderLeftWidth: 1, borderLeftColor: '#e2e8f0' },
  smProductsContent: { padding: 5, gap: 5, flexDirection: 'row' as const, flexWrap: 'wrap' as const },
  smProdBtn: {
    width: 80, borderRadius: 9, padding: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center' as const,
  },
  smProdBtnOut: { opacity: 0.5 },
  smProdBtnName: { fontSize: 11, fontWeight: '600' as const, color: '#1e293b', textAlign: 'center' as const, lineHeight: 14 },
  smProdBtnPrice: { fontSize: 10, color: '#f97316', fontWeight: '700' as const, marginTop: 3 },
  smProdBtnOutText: { fontSize: 8, color: '#ef4444', fontWeight: '700' as const, marginTop: 2 },

  smFooter: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: '#fff', borderTopWidth: 1.5, borderTopColor: '#e2e8f0',
    padding: 10, gap: 8,
  },
  smTotalBlock: { flex: 1 },
  smTotalLabel: { fontSize: 9, fontWeight: '700' as const, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  smTotalValue: { fontSize: 20, fontWeight: '800' as const, color: '#0f172a' },
  smSendBtn: {
    flex: 2, flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 6,
    backgroundColor: '#f97316', borderRadius: 13, paddingVertical: 13,
  },
  smSendBtnText: { fontSize: 13, fontWeight: '700' as const, color: '#fff' },
  smCloseOrderBtn: {
    width: 48, height: 48, borderRadius: 13,
    backgroundColor: '#dcfce7',
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
});
