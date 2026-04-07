// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  Animated,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChefHat,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Printer,
  ChevronLeft,
  ChevronRight,
  Package,
  CalendarDays,
  Check,
  RotateCcw,
  Minus,
  Plus,
  X,
  Bell,
  Volume2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vanillaClient } from '@/lib/trpc';
import type { PrinterConfig } from '@/lib/trpc';

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
  courseSequenceId?: string;
  courseSequenceName?: string;
  courseSequenceColor?: string;
  selectedCharacteristics?: { charId: string; charName: string; optionLabel: string }[];
  selectedAddOns?: { addOnId: string; addOnName: string; optionId: string; optionLabel: string; price: number }[];
}

interface Order {
  id: string;
  tableLabel: string;
  tableId?: string;
  items: OrderItem[];
  guests: number;
  createdAt: number;
  status: 'open' | 'ready' | 'closed';
}

interface ComandasProduct {
  id: string;
  name: string;
  price: number;
  hasStockControl?: boolean;
}

interface ComandasCategory {
  id: string;
  name: string;
  color: string;
  items: ComandasProduct[];
}

interface StockEntry {
  productId: string;
  quantity: number | null;
  date: string;
  setAt?: number;
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
  lineSpacingItem?: number;
}

function timeSince(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'ahora';
  if (mins === 1) return '1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}min`;
}

let _webAudioCtx: AudioContext | null = null;
function getWebAudioCtx(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!_webAudioCtx || _webAudioCtx.state === 'closed') {
      _webAudioCtx = new AC();
    }
    return _webAudioCtx;
  } catch { return null; }
}

function doBeepNow(ctx: AudioContext, vol: number): void {
  try {
    const now = ctx.currentTime;
    const beep = (freq: number, start: number, dur: number, gain: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain * vol, now + start);
      g.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      o.start(now + start);
      o.stop(now + start + dur);
    };
    beep(880, 0, 0.18, 0.6);
    beep(1100, 0.22, 0.22, 0.7);
    beep(880, 0.48, 0.2, 0.5);
    beep(1100, 0.72, 0.25, 0.6);
  } catch {}
}

function playWebBeep(vol: number): void {
  try {
    const ctx = getWebAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'running') {
      doBeepNow(ctx, vol);
    } else if (ctx.state === 'suspended') {
      ctx.resume().then(() => doBeepNow(ctx, vol)).catch(() => {});
    }
  } catch {}
}

const STORAGE_DEVICE_KEY = 'comandas_device_session';
const TICKET_STEP = 296;
const ITEMS_PER_CHUNK = 6;

export default function KitchenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { restaurantId, deviceName: _deviceName } = useLocalSearchParams<{ restaurantId: string; deviceName?: string }>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<ComandasCategory[]>([]);
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [printTemplates, setPrintTemplates] = useState<PrintTemplate[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [printedItemIds, setPrintedItemIds] = useState<Set<string>>(new Set());
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'pendientes' | 'terminado'>('pendientes');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [isAudioLocked, setIsAudioLocked] = useState<boolean>(Platform.OS === 'web');
  const lastKnownRef = useRef<Map<string, { itemCount: number; status: string }>>(new Map());
  const isFirstSyncRef = useRef(true);
  const newPulseAnim = useRef(new Animated.Value(1)).current;
  const [alarmVolume, setAlarmVolume] = useState<number>(0.8);
  const alarmVolumeRef = useRef<number>(0.8);
  const playAlarmSoundRef = useRef<() => void>(() => {});
  const lastSyncRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScreenActiveRef = useRef(true);
  const scrollRef = useRef<ScrollView>(null);

  // Cargar volumen de alarma desde AsyncStorage
  useEffect(() => {
    void AsyncStorage.getItem('kitchen_alarm_volume').then(v => {
      if (v !== null) {
        const vol = parseFloat(v);
        setAlarmVolume(vol);
        alarmVolumeRef.current = vol;
      }
    });
  }, []);

  // Desbloquear AudioContext web en cada toque del usuario
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const checkAndUnlock = () => {
      const ctx = getWebAudioCtx();
      if (ctx) {
        if (ctx.state !== 'running') {
          ctx.resume().then(() => {
            setIsAudioLocked(false);
            console.log('[Kitchen] AudioContext resumed OK');
          }).catch(() => {});
        } else {
          setIsAudioLocked(false);
        }
      }
    };
    document.addEventListener('pointerdown', checkAndUnlock);
    document.addEventListener('touchstart', checkAndUnlock);
    document.addEventListener('keydown', checkAndUnlock);
    return () => {
      document.removeEventListener('pointerdown', checkAndUnlock);
      document.removeEventListener('touchstart', checkAndUnlock);
      document.removeEventListener('keydown', checkAndUnlock);
    };
  }, []);

  // Actualizar ref cuando cambia el volumen
  useEffect(() => {
    alarmVolumeRef.current = alarmVolume;
  }, [alarmVolume]);




  // Configurar función para reproducir alarma
  useEffect(() => {
    playAlarmSoundRef.current = () => {
      const vol = alarmVolumeRef.current;
      console.log('[Kitchen] playAlarm called, platform:', Platform.OS, 'vol:', vol);
      if (Platform.OS === 'web') {
        const ctx = getWebAudioCtx();
        if (!ctx) { setIsAudioLocked(true); return; }
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            setIsAudioLocked(false);
            playWebBeep(vol);
          }).catch(() => {
            console.log('[Kitchen] AudioContext suspended - necesita interacción de usuario');
            setIsAudioLocked(true);
          });
        } else {
          playWebBeep(vol);
        }
      } else {
        const pattern = [0, 200, 100, 200, 100, 300, 100, 400];
        Vibration.vibrate(pattern);
        console.log('[Kitchen] Alarma (vibración) activada (nativo)');
      }
    };
  }, []);

  // Reloj en tiempo real
  useEffect(() => {
    clockIntervalRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { if (clockIntervalRef.current) clearInterval(clockIntervalRef.current); };
  }, []);

  const timeString = useMemo(() => {
    const hh = String(currentTime.getHours()).padStart(2, '0');
    const mm = String(currentTime.getMinutes()).padStart(2, '0');
    const ss = String(currentTime.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [currentTime]);

  // Animación de pulso para nuevas comandas
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

  // Detectar nuevas comandas y reproducir sonido
  useEffect(() => {
    if (orders.length === 0) return;
    if (isFirstSyncRef.current) {
      // Primera carga: establecer baseline sin reproducir alarma
      lastKnownRef.current = new Map(
        orders.map(o => [o.id, { itemCount: o.items.filter(i => i.status !== 'pending').length, status: o.status }])
      );
      isFirstSyncRef.current = false;
      console.log('[Kitchen] Baseline establecido, comandas:', orders.length);
      return;
    }
    const newIds = new Set<string>();
    orders.forEach(o => {
      const known = lastKnownRef.current.get(o.id);
      const kitchenCount = o.items.filter(i => i.status !== 'pending').length;
      if (!known) {
        if (kitchenCount > 0 && o.status !== 'closed') {
          console.log('[Kitchen] NUEVA comanda:', o.tableLabel, 'items cocina:', kitchenCount);
          newIds.add(o.id);
        }
      } else {
        if (kitchenCount > known.itemCount && o.status !== 'closed') {
          console.log('[Kitchen] ACTUALIZADA comanda:', o.tableLabel, 'de', known.itemCount, 'a', kitchenCount);
          newIds.add(o.id);
        } else if (known.status === 'closed' && (o.status === 'open' || o.status === 'ready')) {
          console.log('[Kitchen] REABIERTA comanda:', o.tableLabel);
          newIds.add(o.id);
        }
      }
    });
    lastKnownRef.current = new Map(
      orders.map(o => [o.id, { itemCount: o.items.filter(i => i.status !== 'pending').length, status: o.status }])
    );
    if (newIds.size > 0) {
      console.log('[Kitchen] Reproduciendo alarma para', newIds.size, 'comanda(s)');
      setNewOrderIds(prev => new Set([...prev, ...newIds]));
      // Pequeño delay para asegurar que el contexto de audio esté listo
      setTimeout(() => playAlarmSoundRef.current(), 50);
    }
  }, [orders]);

  const saveAlarmVolume = useCallback(async (vol: number) => {
    setAlarmVolume(vol);
    alarmVolumeRef.current = vol;
    await AsyncStorage.setItem('kitchen_alarm_volume', String(vol));
  }, []);

  const handleAcceptOrder = useCallback((orderId: string) => {
    setNewOrderIds(prev => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  }, []);

  const syncFromServer = useCallback(async (_isInitial: boolean): Promise<void> => {
    if (!restaurantId) return;
    try {
      const result = await vanillaClient.comandas.loadData.query({
        restaurantId,
        dataTypes: ['orders', 'sequences', 'printers', 'categories', 'stockData', 'printTemplates'],
        since: undefined,
      });
      if (result?.data) {
        const apply = (key: string, setter: (v: any) => void): void => {
          const entry = result.data[key];
          if (entry?.data) {
            try {
              setter(JSON.parse(entry.data));
              if (!lastSyncRef.current || entry.updatedAt > lastSyncRef.current) {
                lastSyncRef.current = entry.updatedAt;
              }
            } catch { /**/ }
          }
        };
        apply('orders', setOrders);
        apply('printers', setPrinters);
        apply('categories', setCategories);
        apply('stockData', setStockData);
        apply('printTemplates', setPrintTemplates);
      }
    } catch (e) {
      console.log('[Kitchen Sync] Error:', e);
    }
  }, [restaurantId]);

  const loadReservations = useCallback(async (): Promise<void> => {
    if (!restaurantId) return;
    try {
      const inputStr = encodeURIComponent(JSON.stringify({ restaurantId }));
      const res = await fetch(`https://quieromesa.com/api/trpc/reservations.list?input=${inputStr}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const text = await res.text();
      const json = JSON.parse(text);
      let data: any[] = [];
      if (Array.isArray(json)) {
        data = json[0]?.result?.data || [];
      } else {
        data = json?.result?.data || [];
      }
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const todayRsvs = data.filter((r: any) => {
        const dateField = r.date || r.reservationDate || r.bookingDate || '';
        const rDate = dateField ? String(dateField).split('T')[0] : '';
        const statusBad = ['cancelled', 'no-show', 'cancelada', 'noshow', 'rejected'].includes(r.status || '');
        return rDate === today && !statusBad;
      });
      const getMin = (r: any): number => {
        if (r.time && typeof r.time === 'object') return (r.time.hour || 0) * 60 + (r.time.minute || 0);
        if (r.time && typeof r.time === 'string') { const p = r.time.split(':'); return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); }
        if (r.timeSlot && typeof r.timeSlot === 'string') { const p = r.timeSlot.split(':'); return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); }
        return 0;
      };
      setReservations([...todayRsvs].sort((a, b) => getMin(a) - getMin(b)));
    } catch (e) {
      console.log('[Kitchen] Reservations load error:', e);
    }
  }, [restaurantId]);

  const saveOrders = useCallback(async (next: Order[]): Promise<void> => {
    if (!restaurantId) return;
    setOrders(next);
    isSavingRef.current = true;
    try {
      await vanillaClient.comandas.saveData.mutate({
        restaurantId,
        dataType: 'orders',
        data: JSON.stringify(next),
      });
      lastSyncRef.current = new Date().toISOString();
    } catch (e) {
      console.log('[Kitchen] Save error:', e);
    } finally {
      isSavingRef.current = false;
    }
  }, [restaurantId]);

  const saveStockData = useCallback(async (next: StockEntry[]): Promise<void> => {
    if (!restaurantId) return;
    setStockData(next);
    try {
      await vanillaClient.comandas.saveData.mutate({
        restaurantId,
        dataType: 'stockData',
        data: JSON.stringify(next),
      });
    } catch (e) {
      console.log('[Kitchen] Stock save error:', e);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    setSyncing(true);
    void Promise.all([syncFromServer(true), loadReservations()]).finally(() => setSyncing(false));
    syncIntervalRef.current = setInterval(() => {
      if (!isSavingRef.current && isScreenActiveRef.current) void syncFromServer(false);
    }, 8000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [restaurantId, syncFromServer, loadReservations]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const stockProducts = useMemo(() => {
    const prods: ComandasProduct[] = [];
    categories.forEach((cat: ComandasCategory) => {
      (cat.items || []).forEach((item: ComandasProduct) => {
        if (item.hasStockControl) prods.push(item);
      });
    });
    return prods;
  }, [categories]);

  const getStockQty = useCallback((productId: string): string => {
    const entry = stockData.find((s: StockEntry) => s.productId === productId && s.date === today);
    if (!entry || entry.quantity === null) return '';
    return String(entry.quantity);
  }, [stockData, today]);

  const handleSetStock = useCallback((productId: string, value: string) => {
    if (value.endsWith('.')) return;
    const qty = value === '' ? null : parseFloat(value);
    if (qty !== null && isNaN(qty)) return;
    const existing = stockData.filter((s: StockEntry) => !(s.productId === productId && s.date === today));
    const next = [...existing];
    if (qty !== null) {
      next.push({ productId, quantity: qty, date: today, setAt: Date.now() });
    }
    void saveStockData(next);
  }, [stockData, today, saveStockData]);

  const handleOrderServed = useCallback((orderId: string) => {
    const next = orders.map((o: Order) => o.id === orderId ? { ...o, status: 'closed' as const } : o);
    void saveOrders(next);
    handleAcceptOrder(orderId);
  }, [orders, saveOrders, handleAcceptOrder]);

  const handleReopenOrder = useCallback((orderId: string) => {
    const next = orders.map((o: Order) =>
      o.id === orderId
        ? { ...o, status: 'open' as const, items: o.items.map((i: OrderItem) => ({ ...i, status: 'pending' as const })) }
        : o
    );
    void saveOrders(next);
    setViewMode('pendientes');
  }, [orders, saveOrders]);

  const handleItemReady = useCallback((orderId: string, itemId: string) => {
    const next = orders.map((o: Order) => {
      if (o.id !== orderId) return o;
      const items = o.items.map((i: OrderItem) => i.id === itemId ? { ...i, status: 'ready' as const } : i);
      const allReady = items.length > 0 && items.every((i: OrderItem) => i.status === 'ready' || i.status === 'served');
      return { ...o, items, status: allReady ? ('ready' as const) : ('open' as const) };
    });
    void saveOrders(next);
  }, [orders, saveOrders]);

  const handleItemPreparing = useCallback((orderId: string, itemId: string) => {
    const next = orders.map((o: Order) => {
      if (o.id !== orderId) return o;
      return { ...o, items: o.items.map((i: OrderItem) => i.id === itemId ? { ...i, status: 'preparing' as const } : i) };
    });
    void saveOrders(next);
  }, [orders, saveOrders]);

  const handleTicketReady = useCallback((orderId: string) => {
    const next = orders.map((o: Order) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        items: o.items.map((i: OrderItem) => ({ ...i, status: 'ready' as const })),
        status: 'ready' as const,
      };
    });
    void saveOrders(next);
  }, [orders, saveOrders]);

  const togglePrintSelect = useCallback((itemId: string) => {
    setSelectedForPrint((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(itemId)) { next.delete(itemId); } else { next.add(itemId); }
      return next;
    });
  }, []);

  const handlePrintItems = useCallback(async (orderData: Order, toPrint: OrderItem[]): Promise<void> => {
    if (toPrint.length === 0 || !restaurantId) return;
    const template = printTemplates.find((t) => t.name === 'Monitor de Cocina') || (printTemplates.length > 0 ? printTemplates[0] : null);
    const byPrinter: Record<string, OrderItem[]> = {};
    toPrint.forEach((item: OrderItem) => {
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
      console.log('[Kitchen Print] Routing', items.length, 'items to printer key:', printerId);
      const printer = printerId !== '__default__'
        ? (printers.find((p: PrinterConfig) => p.id === printerId && (p.ipAddress as string)?.trim()) ||
           printers.find((p: PrinterConfig) => (p.ipAddress as string)?.trim() && p.isActive !== false))
        : printers.find((p: PrinterConfig) => (p.ipAddress as string)?.trim() && p.isActive !== false);
      if (!printer || !(printer.ipAddress as string)?.trim()) {
        console.log('[Kitchen Print] No printer found for key:', printerId);
        Alert.alert('Sin impresora', 'No se encontró impresora configurada. Comprueba Configuración → Impresoras.');
        continue;
      }
      try {
        console.log('[Kitchen Print] Sending to:', printer.name, printer.ipAddress, ':', printer.port || 9100);
        await vanillaClient.comandas.printKitchenTicket.mutate({
          restaurantId,
          printerIp: (printer.ipAddress as string).trim(),
          printerPort: printer.port || 9100,
          printerName: printer.name,
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
        console.log('[Kitchen Print] Job queued for printer:', printer.name);
      } catch (err: any) {
        console.error('[Kitchen Print] Error:', err);
        Alert.alert('Error al imprimir', err?.message || 'No se pudo enviar el trabajo');
      }
    }
  }, [printTemplates, printers, restaurantId]);

  const handlePrintAllInSequence = useCallback(async (orderId: string, seqItems: OrderItem[]): Promise<void> => {
    const orderData = orders.find((o: Order) => o.id === orderId);
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
  }, [orders, printedItemIds, handlePrintItems]);

  const handlePrintSelectedInSequence = useCallback(async (orderId: string, seqItems: OrderItem[]): Promise<void> => {
    const orderData = orders.find((o: Order) => o.id === orderId);
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
  }, [orders, selectedForPrint, printedItemIds, handlePrintItems]);

  const handleLogout = useCallback(() => {
    Alert.alert('Cerrar sesión', '¿Cerrar sesión del dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_DEVICE_KEY);
          router.replace('/');
        },
      },
    ]);
  }, [router]);

  const handleScrollLeft = useCallback(() => {
    const newOffset = Math.max(0, scrollOffset - TICKET_STEP);
    scrollRef.current?.scrollTo({ x: newOffset, animated: true });
  }, [scrollOffset]);

  const handleScrollRight = useCallback(() => {
    scrollRef.current?.scrollTo({ x: scrollOffset + TICKET_STEP, animated: true });
  }, [scrollOffset]);

  const allTickets = useMemo(() => {
    const tickets: { order: Order; items: OrderItem[] }[] = [];
    orders.forEach((o: Order) => {
      const hasActivePendingItems = o.items.some(i => i.status === 'pending' || i.status === 'preparing');
      if (o.status === 'closed' && !hasActivePendingItems) return;
      const kitchenItems = o.items.filter((i) => i.status !== 'served' && i.status !== 'pending' && i.sendToMonitor !== false);
      if (kitchenItems.length > 0) tickets.push({ order: o, items: kitchenItems });
    });
    return tickets.sort((a, b) => {
      const aIsNew = newOrderIds.has(a.order.id) ? 0 : 1;
      const bIsNew = newOrderIds.has(b.order.id) ? 0 : 1;
      if (aIsNew !== bIsNew) return aIsNew - bIsNew;
      return a.order.createdAt - b.order.createdAt;
    });
  }, [orders, newOrderIds]);

  const completedOrders = useMemo(() =>
    orders.filter((o: Order) => o.status === 'closed' && !o.items.some(i => i.status === 'pending' || i.status === 'preparing'))
      .sort((a: Order, b: Order) => b.createdAt - a.createdAt),
    [orders]
  );

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
        parts.forEach((partItems, p) => result.push({ order, items: partItems, partIndex: p, totalParts: parts.length }));
      }
    });
    return result;
  }, [allTickets]);

  const availableHeight = containerHeight > 100 ? containerHeight - 72 : Dimensions.get('window').height - 200;

  if (syncing && orders.length === 0) {
    return (
      <View style={[st.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>Conectando con cocina...</Text>
      </View>
    );
  }

  const showEmpty = viewMode === 'pendientes' ? allTickets.length === 0 : completedOrders.length === 0;

  const renderBottomBar = () => (
    <View style={[st.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
      <View style={st.clockContainer}>
        <Text style={st.clockText}>{timeString}</Text>
      </View>
      <TouchableOpacity
        style={[st.toggleBtn, viewMode === 'terminado' && st.toggleBtnActive]}
        onPress={() => setViewMode(viewMode === 'pendientes' ? 'terminado' : 'pendientes')}
        activeOpacity={0.8}
      >
        <Text style={[st.toggleBtnText, viewMode === 'terminado' && st.toggleBtnTextActive]}>
          {viewMode === 'pendientes' ? 'Pendientes' : 'Terminado'}
        </Text>
      </TouchableOpacity>
      <View style={st.navBtns}>
        <TouchableOpacity style={st.navBtn} onPress={handleScrollLeft} activeOpacity={0.7}>
          <ChevronLeft size={20} color="#334155" strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity style={st.navBtn} onPress={handleScrollRight} activeOpacity={0.7}>
          <ChevronRight size={20} color="#334155" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={st.iconBtn} onPress={() => setShowStockModal(true)} activeOpacity={0.8}>
        <Package size={17} color="#334155" strokeWidth={2} />
        <Text style={st.iconBtnText}>Stock</Text>
      </TouchableOpacity>
      <TouchableOpacity style={st.iconBtn} onPress={() => setShowPlanningModal(true)} activeOpacity={0.8}>
        <CalendarDays size={17} color="#334155" strokeWidth={2} />
        <Text style={st.iconBtnText}>Planning</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={st.iconBtn}
        onPress={() => {
          const steps = [0.3, 0.5, 0.7, 1.0];
          const idx = steps.findIndex(s => Math.abs(s - alarmVolume) < 0.05);
          void saveAlarmVolume(steps[(idx + 1) % steps.length]);
          setTimeout(() => playAlarmSoundRef.current(), 100);
        }}
        activeOpacity={0.8}
      >
        <Volume2 size={16} color="#334155" strokeWidth={2} />
        <Text style={st.iconBtnText}>{Math.round(alarmVolume * 100)}%</Text>
      </TouchableOpacity>
      <TouchableOpacity style={st.iconBtn} onPress={() => void syncFromServer(true)} activeOpacity={0.8}>
        <RefreshCw size={14} color="#334155" strokeWidth={2} />
      </TouchableOpacity>
      <TouchableOpacity style={st.iconBtn} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut size={14} color="#334155" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );

  const renderStockModal = () => (
    <Modal visible={showStockModal} animationType="slide" transparent onRequestClose={() => setShowStockModal(false)}>
      <View style={st.modalOverlay}>
        <View style={[st.modalSheet, { maxHeight: '85%' }]}>
          <View style={st.modalHandle} />
          <View style={st.modalHeader}>
            <Text style={st.modalTitle}>📦 Control de Stock</Text>
            <TouchableOpacity onPress={() => setShowStockModal(false)} style={st.modalCloseBtn}>
              <X size={20} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Unidades disponibles hoy. Vacío = sin límite. Al actualizar el stock, las comandas anteriores no cuentan.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {stockProducts.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 30, gap: 10 }}>
                <Package size={44} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={{ fontSize: 15, fontWeight: '600' as const, color: '#94a3b8', textAlign: 'center' as const }}>
                  Sin productos con control de stock
                </Text>
                <Text style={{ fontSize: 12, color: '#b0bec5', textAlign: 'center' as const }}>
                  Actívalo en Configuración → Familias → Producto
                </Text>
              </View>
            ) : (
              stockProducts.map((prod: ComandasProduct) => {
                const currentVal = getStockQty(prod.id);
                const entry = stockData.find((s: StockEntry) => s.productId === prod.id && s.date === today);
                const setAt = entry?.setAt || 0;
                let usedAfter = 0;
                orders.forEach((o: Order) => {
                  if (o.status === 'closed') return;
                  if (o.createdAt > setAt) {
                    o.items.forEach((itm: OrderItem) => {
                      if ((itm as any).productId === prod.id) usedAfter += itm.qty;
                    });
                  }
                });
                const remaining = currentVal !== '' ? parseFloat(currentVal) - usedAfter : null;
                return (
                  <View key={prod.id} style={st.stockRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600' as const, color: '#0f172a' }}>{prod.name}</Text>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {currentVal !== '' ? `Stock: ${currentVal} | Vendidos: ${usedAfter} | Quedan: ${remaining}` : 'Sin límite'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={st.stockBtn}
                        onPress={() => { const cur = parseFloat(currentVal) || 0; const step = cur % 1 !== 0 ? 0.5 : 1; if (cur > 0) handleSetStock(prod.id, String(parseFloat(Math.max(0, cur - step).toFixed(2)))); }}
                      >
                        <Minus size={14} color="#334155" strokeWidth={2.5} />
                      </TouchableOpacity>
                      <TextInput
                        style={st.stockInput}
                        value={currentVal}
                        onChangeText={(v: string) => handleSetStock(prod.id, v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                        keyboardType="decimal-pad"
                        placeholder="∞"
                        placeholderTextColor="#94a3b8"
                      />
                      <TouchableOpacity
                        style={st.stockBtn}
                        onPress={() => { const cur = parseFloat(currentVal) || 0; const step = cur % 1 !== 0 ? 0.5 : 1; handleSetStock(prod.id, String(parseFloat((cur + step).toFixed(2)))); }}
                      >
                        <Plus size={14} color="#334155" strokeWidth={2.5} />
                      </TouchableOpacity>
                      {currentVal !== '' && (
                        <TouchableOpacity
                          style={[st.stockBtn, { backgroundColor: '#fee2e2' }]}
                          onPress={() => handleSetStock(prod.id, '')}
                        >
                          <X size={14} color="#ef4444" strokeWidth={2.5} />
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
  );

  const renderPlanningModal = () => (
    <Modal visible={showPlanningModal} animationType="slide" transparent onRequestClose={() => setShowPlanningModal(false)}>
      <View style={st.modalOverlay}>
        <View style={[st.modalSheet, { maxHeight: '90%' }]}>
          <View style={st.modalHandle} />
          <View style={st.modalHeader}>
            <Text style={st.modalTitle}>📅 Planning de Hoy</Text>
            <TouchableOpacity onPress={() => setShowPlanningModal(false)} style={st.modalCloseBtn}>
              <X size={20} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          {reservations.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <View style={{ backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800' as const, color: '#1d4ed8' }}>{reservations.length}</Text>
                <Text style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>Reservas</Text>
              </View>
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800' as const, color: '#16a34a' }}>
                  {reservations.reduce((s: number, r: any) => s + (r.guests || 0), 0)}
                </Text>
                <Text style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>Comensales</Text>
              </View>
              <View style={{ backgroundColor: '#fefce8', borderRadius: 10, padding: 10, flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800' as const, color: '#d97706' }}>
                  {reservations.filter((r: any) => r.status === 'confirmed').length}
                </Text>
                <Text style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>Confirmadas</Text>
              </View>
            </View>
          )}
          {reservations.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <CalendarDays size={44} color="#cbd5e1" strokeWidth={1.5} />
              <Text style={{ fontSize: 15, fontWeight: '600' as const, color: '#94a3b8' }}>Sin reservas hoy</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {reservations.map((r: any, idx: number) => {
                const timeStr = (() => {
                  if (r.time && typeof r.time === 'object') return `${String(r.time.hour).padStart(2, '0')}:${String(r.time.minute).padStart(2, '0')}`;
                  if (r.time && typeof r.time === 'string') return r.time.slice(0, 5);
                  if (r.timeSlot && typeof r.timeSlot === 'string') return r.timeSlot.slice(0, 5);
                  return '--:--';
                })();
                const name = r.clientName || r.client?.name || 'Cliente';
                return (
                  <View key={r.id || idx} style={st.planningRow}>
                    <View style={st.planningTime}>
                      <Text style={st.planningTimeText}>{timeStr}</Text>
                      <Text style={st.planningGuests}>{r.guests}p</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.planningName}>{name}</Text>
                      {r.notes ? <Text style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontStyle: 'italic' as const }}>{r.notes}</Text> : null}
                      {(r.highChairCount > 0 || r.needsStroller || r.hasPets) && (
                        <View style={{ flexDirection: 'row', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                          {r.highChairCount > 0 && (
                            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontSize: 11, color: '#d97706' }}>👶 {r.highChairCount} tronas</Text>
                            </View>
                          )}
                          {r.needsStroller && (
                            <View style={{ backgroundColor: '#ede9fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontSize: 11, color: '#7c3aed' }}>🚼 Cochecito</Text>
                            </View>
                          )}
                          {r.hasPets && (
                            <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontSize: 11, color: '#16a34a' }}>🐕 Mascota</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                    <View style={{ backgroundColor: r.status === 'confirmed' ? '#dcfce7' : '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700' as const, color: r.status === 'confirmed' ? '#16a34a' : '#d97706' }}>
                        {r.status === 'confirmed' ? 'Conf.' : 'Pend.'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      {isAudioLocked && Platform.OS === 'web' && (
        <TouchableOpacity
          style={st.audioLockBanner}
          onPress={() => {
            const ctx = getWebAudioCtx();
            if (ctx) {
              ctx.resume().then(() => {
                setIsAudioLocked(false);
                setTimeout(() => playAlarmSoundRef.current(), 100);
              }).catch(() => {});
            }
          }}
          activeOpacity={0.8}
        >
          <Bell size={14} color="#fff" strokeWidth={2.5} />
          <Text style={st.audioLockText}>Toca aquí para activar el sonido de nuevos pedidos</Text>
        </TouchableOpacity>
      )}
      <View
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        onLayout={(e: { nativeEvent: { layout: { height: number } } }) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        {showEmpty ? (
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
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            bounces={false}
            scrollEventThrottle={16}
            onScroll={(e: { nativeEvent: { contentOffset: { x: number } } }) => setScrollOffset(e.nativeEvent.contentOffset.x)}
          >
            <View style={[st.columnGrid, availableHeight > 0 ? { height: availableHeight } : {}]}>
              {viewMode === 'terminado' && completedOrders.map((order: Order) => (
                <View key={order.id} style={[st.ticket, { borderTopColor: '#22c55e' }]}>
                  <View style={[st.ticketHeader, { backgroundColor: '#f0fdf4' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.ticketTable}>{order.tableLabel}</Text>
                      <Text style={st.ticketTime}>{timeSince(order.createdAt)}</Text>
                    </View>
                    <Text style={st.ticketGuests}>{order.guests} com.</Text>
                    <TouchableOpacity
                      style={[st.servedBtn, { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }]}
                      onPress={() => handleReopenOrder(order.id)}
                      activeOpacity={0.8}
                    >
                      <RotateCcw size={16} color="#ef4444" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                  {order.items.map((item: OrderItem) => (
                    <View key={item.id} style={[st.itemRow, { backgroundColor: '#f8fafc' }]}>
                      <Text style={[st.itemQty, { color: '#94a3b8' }]}>{item.qty}×</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[st.itemName, { color: '#94a3b8', textDecorationLine: 'line-through' as const }]}>{item.name}</Text>
                      </View>
                      <Check size={13} color="#22c55e" strokeWidth={2.5} />
                    </View>
                  ))}
                  <View style={st.doneBanner}>
                    <Check size={14} color="#16a34a" strokeWidth={2.5} />
                    <Text style={st.doneBannerText}>Terminado</Text>
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
                const accentColor = isNew ? '#f97316' : allDone ? '#16a34a' : hasPreparing ? '#d97706' : '#ea580c';
                const headerBg = isNew ? '#fff7ed' : allDone ? '#dcfce7' : hasPreparing ? '#fef9c3' : '#fff7ed';
                const ticketKey = `${order.id}-${partIndex}`;
                const seqGroups: Record<string, OrderItem[]> = {};
                const seqOrder: string[] = [];
                for (const item of items) {
                  const key = item.courseSequenceId || '__none__';
                  if (!seqGroups[key]) { seqGroups[key] = []; seqOrder.push(key); }
                  seqGroups[key].push(item);
                }
                return (
                  <Animated.View
                    key={ticketKey}
                    style={[
                      st.ticket,
                      { borderTopColor: accentColor },
                      isContinued && st.ticketContinued,
                      isNew && st.ticketNew,
                      isNew && { transform: [{ scale: newPulseAnim }] },
                    ]}
                  >
                    {isNew && !isContinued && (
                      <View style={st.newOrderBanner}>
                        <Bell size={13} color="#ea580c" strokeWidth={2.5} />
                        <Text style={st.newOrderBannerText}>¡Nueva comanda!</Text>
                        <TouchableOpacity style={st.acceptBtn} onPress={() => handleAcceptOrder(order.id)} activeOpacity={0.8}>
                          <Check size={12} color="#fff" strokeWidth={2.5} />
                          <Text style={st.acceptBtnText}>Aceptar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={[st.ticketHeader, { backgroundColor: headerBg }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.ticketTable}>{isContinued ? `${order.tableLabel} ›` : order.tableLabel}</Text>
                        <Text style={st.ticketTime}>{timeSince(order.createdAt)}</Text>
                      </View>
                      <Text style={st.ticketGuests}>{order.guests} com.</Text>
                      {!isContinued && (
                        <TouchableOpacity style={st.servedBtn} onPress={() => handleOrderServed(order.id)} activeOpacity={0.8}>
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
                            <View style={[st.seqLabel, { backgroundColor: seqColor + '18', borderLeftColor: seqColor }]}>
                              <TouchableOpacity
                                style={[st.seqPrintAllBtn, !hasPrintable && st.seqPrintAllBtnDim]}
                                onPress={() => { if (hasPrintable) void handlePrintAllInSequence(order.id, seqItems); }}
                                activeOpacity={hasPrintable ? 0.7 : 1}
                              >
                                <Printer size={13} color={hasPrintable ? '#334155' : '#b0bec5'} strokeWidth={2.5} />
                                <Text style={[st.seqPrintAllBtnText, !hasPrintable && { color: '#b0bec5' }]}>Todo</Text>
                              </TouchableOpacity>
                              <Text style={[st.seqLabelText, { color: seqColor, flex: 1, marginLeft: 6 }]} numberOfLines={1}>{seqName}</Text>
                              {selectedInSeq.length > 0 && (
                                <TouchableOpacity
                                  style={[st.seqPrintAllBtn, st.seqPrintSelBtn]}
                                  onPress={() => void handlePrintSelectedInSequence(order.id, seqItems)}
                                  activeOpacity={0.7}
                                >
                                  <Printer size={13} color="#fff" strokeWidth={2.5} />
                                  <Text style={[st.seqPrintAllBtnText, { color: '#fff' }]}>{selectedInSeq.length}</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                          {seqItems.map((item) => {
                            const isReady = item.status === 'ready';
                            const isPreparing = item.status === 'preparing';
                            const isPrinted = printedItemIds.has(item.id);
                            const isSelectedPrint = selectedForPrint.has(item.id);
                            if (isReady) {
                              return (
                                <TouchableOpacity
                                  key={item.id}
                                  style={[st.itemRow, {
                                    backgroundColor: isPrinted ? '#f0fdf4' : isSelectedPrint ? '#ecfdf5' : '#f8fafc',
                                    borderLeftWidth: isSelectedPrint && !isPrinted ? 3 : 0,
                                    borderLeftColor: '#3b82f6',
                                  }]}
                                  onPress={() => { if (!isPrinted) togglePrintSelect(item.id); }}
                                  activeOpacity={isPrinted ? 1 : 0.7}
                                >
                                  <Text style={[st.itemQty, { color: '#16a34a' }]}>{item.qty}×</Text>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[st.itemName, { color: '#94a3b8', textDecorationLine: 'line-through' as const }]}>{item.name}</Text>
                                    {item.notes ? <Text style={[st.itemNotes, { color: '#94a3b8' }]}>{item.notes}</Text> : null}
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
                                <TouchableOpacity
                                  key={item.id}
                                  style={[st.itemRow, {
                                    backgroundColor: isSelectedPrint ? '#eff6ff' : '#fefce8',
                                    borderLeftWidth: isSelectedPrint ? 3 : 0,
                                    borderLeftColor: '#3b82f6',
                                  }]}
                                  onPress={() => { if (!isPrinted) togglePrintSelect(item.id); }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[st.itemQty, { color: '#d97706' }]}>{item.qty}×</Text>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[st.itemName, { color: '#92400e', fontStyle: 'italic' as const }]}>{item.name}</Text>
                                    {item.notes ? <Text style={st.itemNotes}>{item.notes}</Text> : null}
                                  </View>
                                  {isSelectedPrint
                                    ? <Printer size={13} color="#3b82f6" strokeWidth={2.5} />
                                    : <TouchableOpacity style={st.doneBtn} onPress={() => handleItemReady(order.id, item.id)} activeOpacity={0.8}>
                                        <Check size={14} color="#fff" strokeWidth={2.5} />
                                      </TouchableOpacity>
                                  }
                                </TouchableOpacity>
                              );
                            }
                            return (
                              <TouchableOpacity
                                key={item.id}
                                style={[st.itemRow, {
                                  borderLeftWidth: isSelectedPrint ? 3 : 0,
                                  borderLeftColor: '#3b82f6',
                                  backgroundColor: isSelectedPrint ? '#eff6ff' : '#ffffff',
                                }]}
                                onPress={() => { if (!isPrinted) togglePrintSelect(item.id); }}
                                activeOpacity={0.7}
                              >
                                <Text style={st.itemQty}>{item.qty}×</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={st.itemName}>{item.name}</Text>
                                  {item.notes ? <Text style={st.itemNotes}>⚠ {item.notes}</Text> : null}
                                  {item.selectedCharacteristics?.map((c) => (
                                    <Text key={c.charId} style={{ fontSize: 10, color: '#64748b' }}>• {c.charName}: {c.optionLabel}</Text>
                                  ))}
                                  {item.selectedAddOns?.map((a) => (
                                    <Text key={a.addOnId} style={{ fontSize: 10, color: '#64748b' }}>+ {a.addOnName}: {a.optionLabel}</Text>
                                  ))}
                                </View>
                                {isSelectedPrint
                                  ? <Printer size={13} color="#3b82f6" strokeWidth={2.5} />
                                  : <>
                                      <TouchableOpacity style={st.prepBtn} onPress={() => handleItemPreparing(order.id, item.id)} activeOpacity={0.8}>
                                        <Text style={st.prepBtnText}>Prep</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity style={st.doneBtn} onPress={() => handleItemReady(order.id, item.id)} activeOpacity={0.8}>
                                        <Check size={14} color="#fff" strokeWidth={2.5} />
                                      </TouchableOpacity>
                                    </>
                                }
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })}
                    {!hasContinuation && !allDone && (
                      <TouchableOpacity style={st.allReadyBtn} onPress={() => handleTicketReady(order.id)} activeOpacity={0.85}>
                        <CheckCircle2 size={14} color="#16a34a" strokeWidth={2.5} />
                        <Text style={st.allReadyBtnText}>Todo listo</Text>
                      </TouchableOpacity>
                    )}
                    {!hasContinuation && allDone && (
                      <View style={st.doneBanner}>
                        <Check size={14} color="#16a34a" strokeWidth={2.5} />
                        <Text style={st.doneBannerText}>Listo para servir</Text>
                      </View>
                    )}
                  </Animated.View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
      {renderBottomBar()}
      {renderStockModal()}
      {renderPlanningModal()}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  columnGrid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    padding: 10,
  },
  ticket: {
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
  ticketNew: {
    borderColor: '#fed7aa',
    shadowColor: '#f97316',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  ticketContinued: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: -9,
  },
  newOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  newOrderBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#ea580c',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ea580c',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  acceptBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ticketTable: { fontSize: 16, fontWeight: '800' as const, color: '#0f172a' },
  ticketTime: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  ticketGuests: { fontSize: 13, fontWeight: '600' as const, color: '#64748b' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    backgroundColor: '#ffffff',
  },
  itemQty: { fontSize: 14, fontWeight: '800' as const, color: '#ea580c', minWidth: 26 },
  itemName: { fontSize: 13, fontWeight: '600' as const, color: '#1e293b' },
  itemNotes: { fontSize: 11, color: '#d97706', marginTop: 1 },
  prepBtn: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  prepBtnText: { fontSize: 11, fontWeight: '700' as const, color: '#d97706' },
  doneBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allReadyBtn: {
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
  allReadyBtnText: { fontSize: 13, fontWeight: '700' as const, color: '#16a34a' },
  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    padding: 9,
  },
  doneBannerText: { fontSize: 13, fontWeight: '600' as const, color: '#16a34a' },
  servedBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    marginLeft: 6,
  },
  seqLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderLeftWidth: 3,
    marginTop: 2,
    gap: 4,
    minHeight: 40,
  },
  seqLabelText: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5 },
  seqPrintAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 3,
    minHeight: 30,
  },
  seqPrintAllBtnDim: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  seqPrintSelBtn: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  seqPrintAllBtnText: { fontSize: 10, fontWeight: '700' as const, color: '#334155' },
  bottomBar: {
    minHeight: 72,
    backgroundColor: '#ffffff',
    borderTopWidth: 1.5,
    borderTopColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  clockContainer: {
    backgroundColor: '#f0f3f0',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: '#c8d0c8',
    marginRight: 2,
  },
  clockText: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: '#0a0a0a',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier New',
    letterSpacing: 2,
  },
  toggleBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  toggleBtnText: { fontSize: 12, fontWeight: '700' as const, color: '#334155' },
  toggleBtnTextActive: { color: '#ffffff' },
  navBtns: { flexDirection: 'row', gap: 4 },
  navBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconBtnText: { fontSize: 9, fontWeight: '700' as const, color: '#334155' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' as const, color: '#0f172a' },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stockBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stockInput: {
    width: 50,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    textAlign: 'center',
  },
  planningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  planningTime: { alignItems: 'center', minWidth: 44 },
  planningTimeText: { fontSize: 16, fontWeight: '800' as const, color: '#0f172a' },
  planningGuests: { fontSize: 11, color: '#64748b', marginTop: 2 },
  planningName: { fontSize: 15, fontWeight: '700' as const, color: '#0f172a' },
  audioLockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c',
  },
  audioLockText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
});

