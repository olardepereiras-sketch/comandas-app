// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  LogOut,
  RefreshCw,
  Printer,
  CreditCard,
  Banknote,
  Scissors,
  ArrowLeftRight,
  X,
  Plus,
  Minus,
  Edit3,
  Users,
  CheckCircle2,
  ShoppingCart,
  AlertCircle,
  ChefHat,
  MoreHorizontal,
  FileText,
  Archive,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vanillaClient } from '@/lib/trpc';
import type {
  LocationItem,
  TableItem,
  TablePosition,
  CourseSequence,
  Characteristic,
  AddOn,
  PrinterConfig,
  PrintTemplate,
} from '@/lib/trpc';

const { width: SW, height: SH } = Dimensions.get('window');
const IS_TABLET = SW >= 768;

const C = {
  bg: '#f0f2f5',
  surface: '#ffffff',
  border: '#e2e8f0',
  accent: '#f97316',
  dark: '#1e293b',
  text: '#1e293b',
  muted: '#64748b',
  dim: '#94a3b8',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#f59e0b',
  headerBg: '#1e293b',
  sidebarBg: '#f8fafc',
  canvasBg: '#e8edf2',
  leftPanel: '#ffffff',
  rightPanel: '#f8fafc',
  bottomBar: '#1e293b',
  catPanel: '#f1f5f9',
};

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDate(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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
  courseSequenceId?: string;
  courseSequenceName?: string;
  courseSequenceColor?: string;
  selectedCharacteristics?: { charId: string; charName: string; optionLabel: string }[];
  selectedAddOns?: { addOnId: string; addOnName: string; optionId: string; optionLabel: string; price: number }[];
  productId?: string;
  kitchenNote?: string;
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
  printerId?: string;
  sendToMonitor?: boolean;
  order: number;
  characteristicIds?: string[];
  addOnIds?: string[];
  hasStockControl?: boolean;
  imageUrl?: string;
}

interface ComandasCategory {
  id: string;
  familyId?: string;
  name: string;
  color: string;
  order: number;
  items: ComandasProduct[];
  imageUrl?: string;
}

interface ComandasFamily {
  id: string;
  name: string;
  color: string;
  order: number;
  categories: ComandasCategory[];
}

interface StockEntry {
  productId: string;
  quantity: number | null;
  date: string;
}

const CARD_W = IS_TABLET ? 80 : 68;
const CARD_H = IS_TABLET ? 62 : 52;

function getDefaultPos(index: number, canvasW: number): TablePosition {
  const cols = Math.max(1, Math.floor((canvasW - 20) / (CARD_W + 14)));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: 12 + col * (CARD_W + 14), y: 12 + row * (CARD_H + 14), rotation: 0 };
}

export default function CashierScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { restaurantId, deviceName: _deviceName, userName: paramUserName } = useLocalSearchParams<{
    restaurantId: string;
    deviceName?: string;
    userName?: string;
  }>();

  const [screen, setScreen] = useState<'tables' | 'order'>('tables');
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<ComandasCategory[]>([]);
  const [sequences, setSequences] = useState<CourseSequence[]>([]);
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [printTemplates, setPrintTemplates] = useState<PrintTemplate[]>([]);
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [positions, setPositions] = useState<Record<string, TablePosition>>({});
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [allTables, setAllTables] = useState<TableItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [userName, setUserName] = useState<string>(paramUserName || '');
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });

  const [showGuestsModal, setShowGuestsModal] = useState(false);
  const [pendingTableId, setPendingTableId] = useState<string | null>(null);
  const [pendingTableLabel, setPendingTableLabel] = useState('');
  const [guestCount, setGuestCount] = useState(2);

  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemKitchenNote, setEditItemKitchenNote] = useState('');
  const [editItemQty, setEditItemQty] = useState(1);

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<ComandasProduct | null>(null);
  const [selectedCharOptions, setSelectedCharOptions] = useState<Record<string, string>>({});
  const [selectedAddOnOptions, setSelectedAddOnOptions] = useState<Record<string, string>>({});
  const [selectedPriceVariant, setSelectedPriceVariant] = useState<'main' | 'price2' | 'price3'>('main');
  const [optionNote, setOptionNote] = useState('');

  const lastSyncRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScreenActiveRef = useRef(true);
  const itemsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem('waiter_user_name');
      if (stored && !paramUserName) setUserName(stored);
    };
    void init();
  }, [paramUserName]);

  const syncFromServer = useCallback(async (isInitial: boolean) => {
    if (!restaurantId) return;
    try {
      const result = await vanillaClient.comandas.loadData.query({
        restaurantId,
        dataTypes: ['orders', 'families', 'categories', 'sequences', 'characteristics', 'addOns', 'printers', 'printTemplates', 'stockData', 'positions'],
        since: isInitial ? undefined : (lastSyncRef.current || undefined),
      });
      if (result?.data) {
        let latestTs = lastSyncRef.current;
        const apply = (key: string, setter: (v: any) => void) => {
          const entry = result.data[key];
          if (entry?.data) {
            try {
              setter(JSON.parse(entry.data));
              if (!latestTs || entry.updatedAt > latestTs) latestTs = entry.updatedAt;
            } catch { /**/ }
          }
        };
        apply('orders', setOrders);
        apply('sequences', setSequences);
        apply('characteristics', setCharacteristics);
        apply('addOns', setAddOns);
        apply('printers', setPrinters);
        apply('printTemplates', setPrintTemplates);
        apply('stockData', setStockData);
        apply('positions', setPositions);
        apply('families', (fams: ComandasFamily[]) => {
          const allCats: ComandasCategory[] = [];
          fams.forEach(f => { if (f.categories) allCats.push(...f.categories); });
          setCategories(allCats);
          if (allCats.length > 0) setSelectedCatId(prev => prev || allCats[0].id);
        });
        apply('categories', (cats: ComandasCategory[]) => {
          if (cats.length > 0) {
            setCategories(cats);
            setSelectedCatId(prev => prev || cats[0].id);
          }
        });
        if (latestTs) lastSyncRef.current = latestTs;
      }
    } catch (e) {
      console.log('[Cashier Sync] Error:', e);
    }
  }, [restaurantId]);

  const saveOrders = useCallback(async (next: Order[]) => {
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
      console.log('[Cashier] Save error:', e);
    } finally {
      isSavingRef.current = false;
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    Promise.all([
      vanillaClient.locations.list.query({ restaurantId }),
      vanillaClient.tables.list.query({ restaurantId }),
    ]).then(([locs, tabs]) => {
      const locArr = Array.isArray(locs) ? locs : [];
      const tabArr = Array.isArray(tabs) ? tabs : [];
      setLocations(locArr);
      setAllTables(tabArr);
      if (locArr.length > 0) setSelectedLocationId(locArr[0].id);
    }).catch(e => console.log('[Cashier] Load locations/tables error:', e));
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    setSyncing(true);
    void syncFromServer(true).finally(() => setSyncing(false));
    syncIntervalRef.current = setInterval(() => {
      if (!isSavingRef.current && isScreenActiveRef.current) void syncFromServer(false);
    }, 15000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [restaurantId, syncFromServer]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => { isScreenActiveRef.current = document.visibilityState === 'visible'; };
    handler();
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  useEffect(() => {
    if (sequences.length > 0 && !selectedSequenceId) {
      const sorted = [...sequences].sort((a, b) => a.priority - b.priority);
      setSelectedSequenceId(sorted[0].id);
    }
  }, [sequences, selectedSequenceId]);

  const currentTables = useMemo(
    () => allTables.filter(t => t.locationId === selectedLocationId),
    [allTables, selectedLocationId]
  );

  const openOrders = useMemo(() => orders.filter(o => o.status !== 'closed'), [orders]);

  const getOrderForTable = useCallback((tableId: string) =>
    openOrders.find(o => o.tableId === tableId) || null,
    [openOrders]
  );

  const getTablePos = useCallback((tableId: string, index: number): TablePosition => {
    const stored = positions[tableId];
    if (stored) return stored;
    return getDefaultPos(index, canvasSize.w);
  }, [positions, canvasSize.w]);

  const getStockForProduct = useCallback((productId: string): number | null => {
    const today = new Date().toISOString().split('T')[0];
    const entry = stockData.find(s => s.productId === productId && s.date === today);
    if (!entry) return null;
    return entry.quantity;
  }, [stockData]);

  const handleTablePress = useCallback((tableId: string, tableLabel: string) => {
    const existing = getOrderForTable(tableId);
    if (existing) {
      setActiveOrder(existing);
      setSelectedItemId(null);
      setScreen('order');
    } else {
      setPendingTableId(tableId);
      setPendingTableLabel(tableLabel);
      setGuestCount(2);
      setShowGuestsModal(true);
    }
  }, [getOrderForTable]);

  const handleCreateOrder = useCallback(() => {
    if (!pendingTableId) return;
    const newOrder: Order = {
      id: uid(),
      tableNumber: 0,
      tableLabel: pendingTableLabel,
      tableId: pendingTableId,
      locationId: selectedLocationId || undefined,
      items: [],
      guests: guestCount,
      createdAt: Date.now(),
      status: 'open',
    };
    const next = [...orders, newOrder];
    void saveOrders(next);
    setActiveOrder(newOrder);
    setShowGuestsModal(false);
    setSelectedItemId(null);
    setScreen('order');
  }, [pendingTableId, pendingTableLabel, selectedLocationId, guestCount, orders, saveOrders]);

  const handleAddProduct = useCallback((product: ComandasProduct) => {
    if (!activeOrder) return;
    const hasChars = product.characteristicIds && product.characteristicIds.length > 0;
    const hasAddOns = product.addOnIds && product.addOnIds.length > 0;
    const hasMultiPrice = (product.price2 && product.price2 > 0) || (product.price3 && product.price3 > 0);

    if (hasChars || hasAddOns || hasMultiPrice) {
      setPendingProduct(product);
      setSelectedCharOptions({});
      setSelectedAddOnOptions({});
      setSelectedPriceVariant('main');
      setOptionNote('');
      setShowOptionsModal(true);
      return;
    }

    if (product.hasStockControl) {
      const stock = getStockForProduct(product.id);
      if (stock !== null && stock <= 0) {
        Alert.alert('Sin stock', `"${product.name}" está agotado.`);
        return;
      }
    }

    const activeSeq = sequences.find(s => s.id === selectedSequenceId);
    const existing = activeOrder.items.find(i =>
      i.productId === product.id && i.status === 'pending' && !i.courseSequenceId
    );
    let newItems: OrderItem[];
    if (existing && !activeSeq) {
      newItems = activeOrder.items.map(i =>
        i.id === existing.id ? { ...i, qty: i.qty + 1 } : i
      );
    } else {
      const newItem: OrderItem = {
        id: uid(),
        name: product.name,
        qty: 1,
        notes: '',
        kitchenNote: '',
        price: product.price,
        categoryName: categories.find(c => c.id === product.categoryId)?.name || '',
        status: 'pending',
        printerId: product.printerId,
        sendToMonitor: product.sendToMonitor,
        createdAt: Date.now(),
        courseSequenceId: activeSeq?.id,
        courseSequenceName: activeSeq?.name,
        courseSequenceColor: activeSeq?.color,
        productId: product.id,
      };
      newItems = [...activeOrder.items, newItem];
    }
    const updatedOrder = { ...activeOrder, items: newItems };
    setActiveOrder(updatedOrder);
    const next = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    void saveOrders(next);
    setTimeout(() => itemsScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [activeOrder, orders, saveOrders, categories, sequences, selectedSequenceId, getStockForProduct]);

  const handleConfirmOptions = useCallback(() => {
    if (!activeOrder || !pendingProduct) return;
    if (pendingProduct.hasStockControl) {
      const stock = getStockForProduct(pendingProduct.id);
      if (stock !== null && stock <= 0) {
        Alert.alert('Sin stock', `"${pendingProduct.name}" está agotado.`);
        return;
      }
    }

    const selChars = (pendingProduct.characteristicIds || []).map((cid: string) => {
      const char = characteristics.find(c => c.id === cid);
      if (!char) return null;
      return { charId: cid, charName: char.name, optionLabel: selectedCharOptions[cid] || '' };
    }).filter(Boolean) as any[];

    let extraPrice = 0;
    const selAddOns = (pendingProduct.addOnIds || []).map((aid: string) => {
      const addOn = addOns.find(a => a.id === aid);
      if (!addOn) return null;
      const optId = selectedAddOnOptions[aid] || '';
      const opt = addOn.options.find(o => o.id === optId);
      if (!opt) return null;
      extraPrice += opt.price || 0;
      return { addOnId: aid, addOnName: addOn.name, optionId: opt.id, optionLabel: opt.label, price: opt.price || 0 };
    }).filter(Boolean) as any[];

    let basePrice = pendingProduct.price;
    let priceSuffix = '';
    if (selectedPriceVariant === 'price2' && pendingProduct.price2) {
      basePrice = pendingProduct.price2;
      priceSuffix = ` [${pendingProduct.price2Label || 'P2'}]`;
    } else if (selectedPriceVariant === 'price3' && pendingProduct.price3) {
      basePrice = pendingProduct.price3;
      priceSuffix = ` [${pendingProduct.price3Label || 'P3'}]`;
    }

    const addOnSuffix = selAddOns.length > 0 ? ` (${selAddOns.map((a: any) => a.optionLabel).join(', ')})` : '';
    const activeSeq = sequences.find(s => s.id === selectedSequenceId);
    const newItem: OrderItem = {
      id: uid(),
      name: pendingProduct.name + priceSuffix + addOnSuffix,
      qty: 1,
      notes: selChars.length > 0 ? selChars.map((c: any) => `${c.charName}: ${c.optionLabel}`).join(' | ') : '',
      kitchenNote: optionNote.trim(),
      price: basePrice + extraPrice,
      categoryName: categories.find(c => c.id === pendingProduct.categoryId)?.name || '',
      status: 'pending',
      printerId: pendingProduct.printerId,
      sendToMonitor: pendingProduct.sendToMonitor,
      createdAt: Date.now(),
      selectedCharacteristics: selChars,
      selectedAddOns: selAddOns,
      courseSequenceId: activeSeq?.id,
      courseSequenceName: activeSeq?.name,
      courseSequenceColor: activeSeq?.color,
      productId: pendingProduct.id,
    };

    const updatedOrder = { ...activeOrder, items: [...activeOrder.items, newItem] };
    setActiveOrder(updatedOrder);
    void saveOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setShowOptionsModal(false);
    setPendingProduct(null);
    setTimeout(() => itemsScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [activeOrder, pendingProduct, selectedCharOptions, selectedAddOnOptions, selectedPriceVariant, optionNote, orders, saveOrders, categories, characteristics, addOns, sequences, selectedSequenceId, getStockForProduct]);

  const handleQtyChange = useCallback((itemId: string, delta: number) => {
    if (!activeOrder) return;
    const item = activeOrder.items.find(i => i.id === itemId);
    if (!item) return;
    const newQty = item.qty + delta;
    let newItems: OrderItem[];
    if (newQty <= 0) {
      newItems = activeOrder.items.filter(i => i.id !== itemId);
      if (selectedItemId === itemId) setSelectedItemId(null);
    } else {
      newItems = activeOrder.items.map(i => i.id === itemId ? { ...i, qty: newQty } : i);
    }
    const updatedOrder = { ...activeOrder, items: newItems };
    setActiveOrder(updatedOrder);
    void saveOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  }, [activeOrder, orders, saveOrders, selectedItemId]);

  const handleOpenEditItem = useCallback((item: OrderItem) => {
    setEditItemId(item.id);
    setEditItemKitchenNote(item.kitchenNote || item.notes || '');
    setEditItemQty(item.qty);
    setShowEditItemModal(true);
  }, []);

  const handleSaveEditItem = useCallback(() => {
    if (!activeOrder || !editItemId) return;
    const newItems = activeOrder.items.map(i =>
      i.id === editItemId
        ? { ...i, kitchenNote: editItemKitchenNote.trim(), qty: Math.max(1, editItemQty) }
        : i
    );
    const updatedOrder = { ...activeOrder, items: newItems };
    setActiveOrder(updatedOrder);
    void saveOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setShowEditItemModal(false);
    setEditItemId(null);
  }, [activeOrder, editItemId, editItemKitchenNote, editItemQty, orders, saveOrders]);

  const handleSendToKitchen = useCallback(async () => {
    if (!activeOrder) return;
    const pendingItems = activeOrder.items.filter(i => i.status === 'pending');
    if (pendingItems.length === 0) {
      Alert.alert('Sin elementos', 'No hay ítems pendientes.');
      return;
    }
    const newItems = activeOrder.items.map(i =>
      i.status === 'pending' ? { ...i, status: 'preparing' as const } : i
    );
    const updatedOrder = { ...activeOrder, items: newItems };
    setActiveOrder(updatedOrder);
    const next = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    void saveOrders(next);

    const directItems = pendingItems.filter(i => i.sendToMonitor === false && i.printerId);
    if (directItems.length > 0 && restaurantId) {
      const template = printTemplates.find(t => t.name === 'Monitor de Cocina') ||
        (printTemplates.length > 0 ? printTemplates[0] : null);
      const byPrinter: Record<string, OrderItem[]> = {};
      directItems.forEach(item => {
        const key = item.printerId || '__default__';
        if (!byPrinter[key]) byPrinter[key] = [];
        byPrinter[key].push(item);
      });
      for (const [printerId, items] of Object.entries(byPrinter)) {
        const printer = printers.find(p => p.id === printerId && p.ipAddress?.trim())
          || printers.find(p => p.ipAddress?.trim() && p.isActive !== false);
        if (printer) {
          try {
            await vanillaClient.comandas.printKitchenTicket.mutate({
              restaurantId,
              printerIp: printer.ipAddress.trim(),
              printerPort: printer.port || 9100,
              printerName: printer.name,
              tableLabel: activeOrder.tableLabel,
              guests: activeOrder.guests,
              items: items.map(i => ({ qty: i.qty, name: i.name, notes: i.kitchenNote || i.notes || undefined })),
              headerLine1: template?.headerLine1,
              headerLine2: template?.headerLine2,
              footerLine1: template?.footerLine1,
              footerLine2: template?.footerLine2,
              fontSize: template?.fontSize || 'medium',
              spaceBefore: template?.spaceBefore || 0,
              spaceAfter: template?.spaceAfter,
              fontSizePtMesa: template?.fontSizePtMesa,
              fontSizePtSequence: template?.fontSizePtSequence,
              fontSizePtInfo: template?.fontSizePtInfo,
              fontSizePtItem: template?.fontSizePtItem,
              lineSpacingItem: template?.lineSpacingItem,
            });
          } catch (err) {
            console.error('[Cashier] Direct print error:', err);
          }
        }
      }
    }
    Alert.alert('✓ Enviado', `${pendingItems.length} ítem(s) enviados a cocina.`);
  }, [activeOrder, orders, saveOrders, printers, printTemplates, restaurantId]);

  const handlePrintOrder = useCallback(async () => {
    if (!activeOrder || !restaurantId) return;
    const template = printTemplates.find(t => t.name === 'Monitor de Cocina') ||
      (printTemplates.length > 0 ? printTemplates[0] : null);
    const byPrinter: Record<string, OrderItem[]> = {};
    activeOrder.items.forEach(item => {
      const key = item.printerId || '__default__';
      if (!byPrinter[key]) byPrinter[key] = [];
      byPrinter[key].push(item);
    });
    let printed = false;
    for (const [printerId, items] of Object.entries(byPrinter)) {
      const printer = printers.find(p => p.id === printerId && p.ipAddress?.trim())
        || printers.find(p => p.ipAddress?.trim() && p.isActive !== false);
      if (printer) {
        try {
          await vanillaClient.comandas.printKitchenTicket.mutate({
            restaurantId,
            printerIp: printer.ipAddress.trim(),
            printerPort: printer.port || 9100,
            printerName: printer.name,
            tableLabel: activeOrder.tableLabel,
            guests: activeOrder.guests,
            items: items.map(i => ({ qty: i.qty, name: i.name, notes: i.kitchenNote || i.notes || undefined })),
            headerLine1: template?.headerLine1,
            headerLine2: template?.headerLine2,
            footerLine1: template?.footerLine1,
            footerLine2: template?.footerLine2,
            fontSize: template?.fontSize || 'medium',
            spaceBefore: template?.spaceBefore || 0,
            spaceAfter: template?.spaceAfter,
            fontSizePtMesa: template?.fontSizePtMesa,
            fontSizePtSequence: template?.fontSizePtSequence,
            fontSizePtInfo: template?.fontSizePtInfo,
            fontSizePtItem: template?.fontSizePtItem,
            lineSpacingItem: template?.lineSpacingItem,
          });
          printed = true;
        } catch (err) {
          console.error('[Cashier] Print error:', err);
        }
      }
    }
    if (!printed) Alert.alert('Sin impresora', 'No se encontró impresora configurada.');
  }, [activeOrder, restaurantId, printers, printTemplates]);

  const handleCloseOrder = useCallback(() => {
    if (!activeOrder) return;
    Alert.alert('Cerrar comanda', `¿Cerrar comanda de ${activeOrder.tableLabel}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar',
        style: 'destructive',
        onPress: () => {
          const next = orders.map(o => o.id === activeOrder.id ? { ...o, status: 'closed' as const } : o);
          void saveOrders(next);
          setActiveOrder(null);
          setSelectedItemId(null);
          setScreen('tables');
        },
      },
    ]);
  }, [activeOrder, orders, saveOrders]);

  const handleLogout = useCallback(() => {
    Alert.alert('Cerrar sesión', '¿Cerrar sesión del dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('comandas_device_session');
          router.replace('/');
        },
      },
    ]);
  }, [router]);

  const currentCatProducts = useMemo(() => {
    const cat = categories.find(c => c.id === selectedCatId);
    return cat?.items || [];
  }, [categories, selectedCatId]);

  const orderTotal = useMemo(() =>
    activeOrder?.items.reduce((s, i) => s + i.price * i.qty, 0) || 0,
    [activeOrder]
  );

  const pendingCount = useMemo(() =>
    activeOrder?.items.filter(i => i.status === 'pending').length || 0,
    [activeOrder]
  );

  if (syncing && orders.length === 0 && categories.length === 0) {
    return (
      <View style={[cs.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={cs.loadingText}>Conectando...</Text>
      </View>
    );
  }

  return (
    <View style={[cs.root, { paddingTop: insets.top }]}>
      <View style={cs.header}>
        <View style={cs.headerLeft}>
          <Text style={cs.headerTitle} numberOfLines={1}>
            {activeOrder ? activeOrder.tableLabel : 'Seleccionar Mesa'}
          </Text>
          <Text style={cs.headerSub}>{userName || 'PC/Caja'} · {formatDate()}</Text>
        </View>
        <View style={cs.headerRight}>
          <TouchableOpacity style={cs.headerBtn} onPress={() => void syncFromServer(true)} activeOpacity={0.7}>
            <RefreshCw size={15} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
          </TouchableOpacity>
          {screen === 'order' && (
            <TouchableOpacity
              style={cs.headerBtn}
              onPress={() => { setActiveOrder(null); setSelectedItemId(null); setScreen('tables'); }}
              activeOpacity={0.7}
            >
              <X size={15} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={cs.headerBtn} onPress={handleLogout} activeOpacity={0.7}>
            <LogOut size={15} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {screen === 'tables' && (
        <View style={cs.tablesScreen}>
          <View style={cs.locationSidebar}>
            {locations.map(loc => (
              <TouchableOpacity
                key={loc.id}
                style={[cs.locBtn, selectedLocationId === loc.id && cs.locBtnActive]}
                onPress={() => setSelectedLocationId(loc.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[cs.locBtnText, selectedLocationId === loc.id && cs.locBtnTextActive]}
                  numberOfLines={3}
                >
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
            {locations.length === 0 && (
              <View style={cs.locEmpty}>
                <Text style={cs.locEmptyText}>Sin{'\n'}zonas</Text>
              </View>
            )}
          </View>

          <View
            style={cs.floorCanvas}
            onLayout={e => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ minWidth: canvasSize.w }}
            >
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ minHeight: canvasSize.h }}>
                <View style={{ width: canvasSize.w, height: Math.max(canvasSize.h, 400), position: 'relative' }}>
                  {currentTables.length === 0 ? (
                    <View style={cs.floorEmpty}>
                      <ShoppingCart size={40} color={C.dim} strokeWidth={1.5} />
                      <Text style={cs.floorEmptyText}>Sin mesas en esta zona</Text>
                    </View>
                  ) : (
                    currentTables.map((table, index) => {
                      const pos = getTablePos(table.id, index);
                      const order = getOrderForTable(table.id);
                      const hasOrder = !!order;
                      const hasReady = hasOrder && order.items.some(i => i.status === 'ready');
                      const pendingItems = hasOrder ? order.items.filter(i => i.status === 'pending').length : 0;
                      const bgColor = hasReady ? '#dcfce7' : hasOrder ? '#fff7ed' : '#ffffff';
                      const borderColor = hasReady ? '#86efac' : hasOrder ? '#fed7aa' : '#d1d5db';
                      return (
                        <TouchableOpacity
                          key={table.id}
                          style={[
                            cs.tableCard,
                            {
                              position: 'absolute',
                              left: pos.x,
                              top: pos.y,
                              width: CARD_W,
                              height: CARD_H,
                              backgroundColor: bgColor,
                              borderColor,
                            },
                          ]}
                          onPress={() => handleTablePress(table.id, table.name)}
                          activeOpacity={0.75}
                        >
                          <Text style={cs.tableCardName}>{table.name}</Text>
                          <Text style={cs.tableCardCap}>{table.capacity}p</Text>
                          {hasOrder && (
                            <View style={[cs.tableDot, { backgroundColor: hasReady ? C.green : C.accent }]} />
                          )}
                          {pendingItems > 0 && (
                            <View style={cs.tableBadge}>
                              <Text style={cs.tableBadgeText}>{pendingItems}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      )}

      {screen === 'order' && activeOrder && (
        <View style={cs.orderScreen}>
          <View style={cs.orderLeft}>
            <View style={cs.orderLeftHeader}>
              <View style={{ flex: 1 }}>
                <Text style={cs.orderTableLabel}>{activeOrder.tableLabel}</Text>
                <View style={cs.orderHeaderMeta}>
                  <Users size={11} color={C.muted} strokeWidth={2.5} />
                  <Text style={cs.orderHeaderMetaText}>{activeOrder.guests} com.</Text>
                </View>
              </View>
            </View>

            <View style={cs.orderListHeader}>
              <Text style={[cs.orderListCol, { flex: 0.5 }]}></Text>
              <Text style={[cs.orderListCol, { flex: 0.35, textAlign: 'center' }]}>Uds</Text>
              <Text style={[cs.orderListCol, { flex: 1 }]}>Producto</Text>
              <Text style={[cs.orderListCol, { flex: 0.45, textAlign: 'right' }]}>Precio</Text>
              <Text style={[cs.orderListCol, { flex: 0.45, textAlign: 'right' }]}>Total</Text>
            </View>

            <ScrollView
              ref={itemsScrollRef}
              style={cs.itemsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={cs.itemsListContent}
            >
              {activeOrder.items.length === 0 ? (
                <View style={cs.emptyOrder}>
                  <ShoppingCart size={28} color={C.dim} strokeWidth={1.5} />
                  <Text style={cs.emptyOrderText}>Comanda vacía</Text>
                </View>
              ) : (
                activeOrder.items.map(item => {
                  const isSelected = selectedItemId === item.id;
                  const statusColor =
                    item.status === 'ready' ? C.green :
                    item.status === 'preparing' ? C.blue :
                    item.status === 'served' ? C.muted : C.yellow;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[cs.orderItem, isSelected && cs.orderItemSelected]}
                      onPress={() => setSelectedItemId(isSelected ? null : item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[cs.itemStatusDot, { backgroundColor: statusColor }]} />
                      <View style={cs.itemQtyCol}>
                        {item.status === 'pending' ? (
                          <>
                            <TouchableOpacity style={cs.qtyBtn} onPress={() => handleQtyChange(item.id, -1)}>
                              <Minus size={9} color={C.text} strokeWidth={3} />
                            </TouchableOpacity>
                            <Text style={cs.qtyNum}>{item.qty}</Text>
                            <TouchableOpacity style={cs.qtyBtn} onPress={() => handleQtyChange(item.id, 1)}>
                              <Plus size={9} color={C.text} strokeWidth={3} />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <Text style={cs.qtyFixed}>{item.qty}</Text>
                        )}
                      </View>
                      <View style={cs.itemInfo}>
                        <Text style={cs.itemName} numberOfLines={2}>{item.name}</Text>
                        {item.kitchenNote ? (
                          <Text style={cs.itemNote}>📝 {item.kitchenNote}</Text>
                        ) : item.notes ? (
                          <Text style={cs.itemNote}>📝 {item.notes}</Text>
                        ) : null}
                      </View>
                      <Text style={cs.itemPrice}>{item.price.toFixed(2)}€</Text>
                      <View style={cs.itemTotalCol}>
                        <Text style={cs.itemTotal}>{(item.price * item.qty).toFixed(2)}€</Text>
                        {isSelected && (
                          <TouchableOpacity
                            style={cs.editBtn}
                            onPress={() => handleOpenEditItem(item)}
                            activeOpacity={0.8}
                          >
                            <Edit3 size={10} color="#fff" strokeWidth={2.5} />
                            <Text style={cs.editBtnText}>Editar</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={cs.orderTotalBar}>
              <Text style={cs.orderTotalLabel}>Total</Text>
              <Text style={cs.orderTotalValue}>{orderTotal.toFixed(2)} €</Text>
            </View>
          </View>

          <View style={cs.orderRight}>
            {sequences.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cs.seqRow} contentContainerStyle={cs.seqRowContent}>
                {[...sequences].sort((a, b) => a.priority - b.priority).map(seq => (
                  <TouchableOpacity
                    key={seq.id}
                    style={[cs.seqChip, selectedSequenceId === seq.id && { backgroundColor: seq.color, borderColor: seq.color }]}
                    onPress={() => setSelectedSequenceId(seq.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[cs.seqChipText, selectedSequenceId === seq.id && { color: '#fff' }]}>
                      {seq.priority}. {seq.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={cs.catGrid}>
              {categories.map(cat => {
                const isActive = selectedCatId === cat.id;
                const color = cat.color || C.accent;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      cs.catBtn,
                      isActive && { borderColor: color, backgroundColor: color },
                    ]}
                    onPress={() => setSelectedCatId(cat.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[cs.catBtnInner, isActive && { backgroundColor: 'transparent' }]}>
                      {cat.imageUrl ? (
                        <View style={[cs.catColorDot, { backgroundColor: color }]} />
                      ) : (
                        <View style={[cs.catColorDot, { backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : color }]} />
                      )}
                      <Text style={[cs.catBtnText, isActive && { color: '#fff' }]} numberOfLines={2}>
                        {cat.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {categories.length === 0 && (
                <View style={cs.emptyCats}>
                  <AlertCircle size={18} color={C.dim} strokeWidth={2} />
                  <Text style={cs.emptyCatsText}>Sin categorías</Text>
                </View>
              )}
            </View>

            <ScrollView style={cs.productsArea} showsVerticalScrollIndicator={false} contentContainerStyle={cs.productsGrid}>
              {currentCatProducts.map(prod => {
                const stock = prod.hasStockControl ? getStockForProduct(prod.id) : null;
                const outOfStock = stock !== null && stock <= 0;
                return (
                  <TouchableOpacity
                    key={prod.id}
                    style={[cs.productBtn, outOfStock && cs.productBtnDisabled]}
                    onPress={() => !outOfStock && handleAddProduct(prod)}
                    activeOpacity={0.8}
                    disabled={outOfStock}
                  >
                    <Text style={cs.productBtnName} numberOfLines={3}>{prod.name}</Text>
                    {prod.price > 0 && (
                      <Text style={cs.productBtnPrice}>{prod.price.toFixed(2)}€</Text>
                    )}
                    {outOfStock && <Text style={cs.productBtnOut}>AGOTADO</Text>}
                    {stock !== null && stock > 0 && (
                      <Text style={cs.productBtnStock}>{stock} uds</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              {currentCatProducts.length === 0 && selectedCatId && (
                <View style={cs.emptyCats}>
                  <Text style={cs.emptyCatsText}>Sin productos en esta categoría</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {screen === 'order' && activeOrder && (
        <View style={[cs.bottomBar, { paddingBottom: insets.bottom + 2 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cs.bottomBarContent}>
            <TouchableOpacity style={cs.actionBtn} onPress={handlePrintOrder} activeOpacity={0.8}>
              <Printer size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Imprimir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => Alert.alert('Cobro Efectivo', `Total: ${orderTotal.toFixed(2)} €`)} activeOpacity={0.8}>
              <Banknote size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Cobro Efectivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.actionBtn, { backgroundColor: '#2563eb' }]} onPress={() => Alert.alert('Cobro Tarjeta', `Total: ${orderTotal.toFixed(2)} €`)} activeOpacity={0.8}>
              <CreditCard size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Cobro Tarjeta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.actionBtn, { backgroundColor: '#7c3aed' }]} onPress={() => Alert.alert('Dividir Ticket', 'Función próximamente disponible')} activeOpacity={0.8}>
              <Scissors size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Dividir Ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.actionBtn, { backgroundColor: '#0891b2' }]} onPress={() => Alert.alert('Cambiar Mesa', 'Función próximamente disponible')} activeOpacity={0.8}>
              <ArrowLeftRight size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Cambiar Mesa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.actionBtn, { backgroundColor: '#374151' }]} onPress={() => Alert.alert('Preparar', 'Función próximamente disponible')} activeOpacity={0.8}>
              <ChefHat size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Preparar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.actionBtn, { backgroundColor: '#374151' }]} onPress={() => Alert.alert('Marchar', 'Función próximamente disponible')} activeOpacity={0.8}>
              <Archive size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Marchar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cs.actionBtn, { backgroundColor: pendingCount > 0 ? C.accent : '#4b5563' }]}
              onPress={handleSendToKitchen}
              activeOpacity={0.8}
            >
              <ChefHat size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>
                Enviar Cocina{pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.actionBtn, { backgroundColor: '#374151' }]} onPress={() => Alert.alert('Buscar Facturas', 'Función próximamente disponible')} activeOpacity={0.8}>
              <FileText size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Buscar Facturas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.actionBtn, { backgroundColor: '#374151' }]} onPress={() => Alert.alert('Otros', 'Función próximamente disponible')} activeOpacity={0.8}>
              <MoreHorizontal size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Otros</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.actionBtn, { backgroundColor: '#64748b' }]} onPress={handleCloseOrder} activeOpacity={0.8}>
              <CheckCircle2 size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cs.actionBtn, { backgroundColor: '#ef4444' }]} onPress={handleLogout} activeOpacity={0.8}>
              <LogOut size={17} color="#fff" strokeWidth={2} />
              <Text style={cs.actionBtnText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <Modal visible={showGuestsModal} transparent animationType="fade" onRequestClose={() => setShowGuestsModal(false)}>
        <View style={cs.modalOverlay}>
          <View style={cs.modalCard}>
            <Text style={cs.modalTitle}>Nueva comanda</Text>
            <Text style={cs.modalSub}>{pendingTableLabel}</Text>
            <Text style={cs.modalLabel}>Comensales</Text>
            <View style={cs.guestRow}>
              <TouchableOpacity style={cs.guestBtn} onPress={() => setGuestCount(Math.max(1, guestCount - 1))}>
                <Minus size={18} color={C.text} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={cs.guestCount}>{guestCount}</Text>
              <TouchableOpacity style={cs.guestBtn} onPress={() => setGuestCount(guestCount + 1)}>
                <Plus size={18} color={C.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <View style={cs.modalActions}>
              <TouchableOpacity style={cs.modalCancel} onPress={() => setShowGuestsModal(false)}>
                <Text style={cs.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cs.modalConfirm} onPress={handleCreateOrder}>
                <Text style={cs.modalConfirmText}>Abrir comanda</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditItemModal} transparent animationType="fade" onRequestClose={() => setShowEditItemModal(false)}>
        <View style={cs.modalOverlay}>
          <View style={cs.modalCard}>
            <Text style={cs.modalTitle}>Editar ítem</Text>
            <Text style={cs.modalSub}>{activeOrder?.items.find(i => i.id === editItemId)?.name}</Text>
            <Text style={cs.modalLabel}>Cantidad</Text>
            <View style={cs.guestRow}>
              <TouchableOpacity style={cs.guestBtn} onPress={() => setEditItemQty(Math.max(1, editItemQty - 1))}>
                <Minus size={18} color={C.text} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={cs.guestCount}>{editItemQty}</Text>
              <TouchableOpacity style={cs.guestBtn} onPress={() => setEditItemQty(editItemQty + 1)}>
                <Plus size={18} color={C.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <Text style={[cs.modalLabel, { marginTop: 12 }]}>Nota para cocina</Text>
            <Text style={cs.noteHint}>Solo visible en cocina y al imprimir. No aparece en el ticket de cuenta.</Text>
            <TextInput
              style={cs.noteInput}
              value={editItemKitchenNote}
              onChangeText={setEditItemKitchenNote}
              placeholder="Ej: sin gluten, muy hecho, sin sal..."
              multiline
              placeholderTextColor={C.dim}
            />
            <View style={cs.modalActions}>
              <TouchableOpacity style={cs.modalCancel} onPress={() => setShowEditItemModal(false)}>
                <Text style={cs.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cs.modalConfirm} onPress={handleSaveEditItem}>
                <Text style={cs.modalConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showOptionsModal} transparent animationType="slide" onRequestClose={() => setShowOptionsModal(false)}>
        <View style={cs.modalOverlay}>
          <View style={[cs.modalCard, { maxHeight: SH * 0.85 }]}>
            <View style={cs.modalHandle} />
            <Text style={cs.modalTitle}>{pendingProduct?.name}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pendingProduct && ((pendingProduct.price2 && pendingProduct.price2 > 0) || (pendingProduct.price3 && pendingProduct.price3 > 0)) && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={cs.modalLabel}>Precio</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {[
                      { key: 'main' as const, label: 'Normal', price: pendingProduct.price },
                      ...(pendingProduct.price2 && pendingProduct.price2 > 0 ? [{ key: 'price2' as const, label: pendingProduct.price2Label || 'Precio 2', price: pendingProduct.price2 }] : []),
                      ...(pendingProduct.price3 && pendingProduct.price3 > 0 ? [{ key: 'price3' as const, label: pendingProduct.price3Label || 'Precio 3', price: pendingProduct.price3 }] : []),
                    ].map(v => (
                      <TouchableOpacity
                        key={v.key}
                        style={[cs.optChip, selectedPriceVariant === v.key && cs.optChipActive]}
                        onPress={() => setSelectedPriceVariant(v.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[cs.optChipLabel, selectedPriceVariant === v.key && { color: '#fff' }]}>{v.label}</Text>
                        <Text style={[cs.optChipPrice, selectedPriceVariant === v.key && { color: 'rgba(255,255,255,0.8)' }]}>{v.price.toFixed(2)}€</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {(pendingProduct?.characteristicIds || []).map((cid: string) => {
                const char = characteristics.find(c => c.id === cid);
                if (!char) return null;
                return (
                  <View key={cid} style={{ marginBottom: 14 }}>
                    <Text style={cs.modalLabel}>{char.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {char.options.map(opt => (
                        <TouchableOpacity
                          key={opt.id}
                          style={[cs.optChip, selectedCharOptions[cid] === opt.label && cs.optChipActive]}
                          onPress={() => setSelectedCharOptions(prev => ({ ...prev, [cid]: opt.label }))}
                          activeOpacity={0.8}
                        >
                          <Text style={[cs.optChipLabel, selectedCharOptions[cid] === opt.label && { color: '#fff' }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}

              {(pendingProduct?.addOnIds || []).map((aid: string) => {
                const addOn = addOns.find(a => a.id === aid);
                if (!addOn) return null;
                return (
                  <View key={aid} style={{ marginBottom: 14 }}>
                    <Text style={cs.modalLabel}>{addOn.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {addOn.options.map(opt => (
                        <TouchableOpacity
                          key={opt.id}
                          style={[cs.optChip, selectedAddOnOptions[aid] === opt.id && cs.optChipActive]}
                          onPress={() => setSelectedAddOnOptions(prev => ({ ...prev, [aid]: opt.id }))}
                          activeOpacity={0.8}
                        >
                          <Text style={[cs.optChipLabel, selectedAddOnOptions[aid] === opt.id && { color: '#fff' }]}>{opt.label}</Text>
                          {opt.price > 0 && (
                            <Text style={[cs.optChipPrice, selectedAddOnOptions[aid] === opt.id && { color: 'rgba(255,255,255,0.8)' }]}>+{opt.price.toFixed(2)}€</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}

              <Text style={cs.modalLabel}>Nota para cocina</Text>
              <Text style={cs.noteHint}>Solo visible en cocina y al imprimir</Text>
              <TextInput
                style={[cs.noteInput, { marginTop: 6 }]}
                value={optionNote}
                onChangeText={setOptionNote}
                placeholder="Nota especial para este ítem..."
                multiline
                placeholderTextColor={C.dim}
              />
            </ScrollView>

            <View style={[cs.modalActions, { marginTop: 12 }]}>
              <TouchableOpacity style={cs.modalCancel} onPress={() => setShowOptionsModal(false)}>
                <Text style={cs.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cs.modalConfirm} onPress={handleConfirmOptions}>
                <Text style={cs.modalConfirmText}>Añadir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const SIDEBAR_W = IS_TABLET ? 100 : 80;
const LEFT_PANEL = IS_TABLET ? '38%' : '36%';
const RIGHT_PANEL = IS_TABLET ? '62%' : '64%';
const CAT_BTN_W = IS_TABLET ? '30%' : '31%';

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadingText: { marginTop: 12, color: C.muted, fontSize: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.headerBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700' as const, color: '#fff' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  tablesScreen: { flex: 1, flexDirection: 'row' },
  locationSidebar: {
    width: SIDEBAR_W,
    backgroundColor: C.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: C.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 6,
  },
  locBtn: {
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  locBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  locBtnText: { fontSize: 12, fontWeight: '600' as const, color: C.muted, textAlign: 'center' as const },
  locBtnTextActive: { color: '#fff' },
  locEmpty: { alignItems: 'center', paddingTop: 20 },
  locEmptyText: { fontSize: 10, color: C.dim, textAlign: 'center' as const },
  floorCanvas: { flex: 1, backgroundColor: C.canvasBg },
  floorEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  floorEmptyText: { color: C.dim, fontSize: 14 },

  tableCard: {
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tableCardName: { fontSize: IS_TABLET ? 13 : 11, fontWeight: '800' as const, color: C.text },
  tableCardCap: { fontSize: 10, color: C.muted, marginTop: 1 },
  tableDot: { width: 7, height: 7, borderRadius: 4, position: 'absolute', bottom: 5, left: 7 },
  tableBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
  },
  tableBadgeText: { fontSize: 10, fontWeight: '800' as const, color: '#fff' },

  orderScreen: { flex: 1, flexDirection: 'row' },

  orderLeft: {
    width: LEFT_PANEL,
    backgroundColor: C.leftPanel,
    borderRightWidth: 1,
    borderRightColor: C.border,
    flexDirection: 'column',
  },
  orderLeftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: '#f8fafc',
  },
  orderTableLabel: { fontSize: 16, fontWeight: '800' as const, color: C.text },
  orderHeaderMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  orderHeaderMetaText: { fontSize: 11, color: C.muted },

  orderListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  orderListCol: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  itemsList: { flex: 1 },
  itemsListContent: { paddingVertical: 2 },

  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 5,
    minHeight: 40,
  },
  orderItemSelected: { backgroundColor: '#fff7ed' },
  itemStatusDot: {
    width: 8, height: 8, borderRadius: 4,
    flexShrink: 0,
  },
  itemQtyCol: { alignItems: 'center', gap: 2, width: 34, flexShrink: 0 },
  qtyBtn: {
    width: 20, height: 20, borderRadius: 5,
    backgroundColor: '#f1f5f9',
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyNum: { fontSize: 12, fontWeight: '700' as const, color: C.text },
  qtyFixed: { fontSize: 12, color: C.muted, fontWeight: '600' as const },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 12, fontWeight: '600' as const, color: C.text, lineHeight: 15 },
  itemNote: { fontSize: 10, color: C.muted, fontStyle: 'italic' as const, marginTop: 1 },
  itemPrice: { fontSize: 11, color: C.muted, width: 44, textAlign: 'right' as const, flexShrink: 0 },
  itemTotalCol: { width: 52, alignItems: 'flex-end', flexShrink: 0, gap: 3 },
  itemTotal: { fontSize: 12, fontWeight: '700' as const, color: C.text },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: C.accent, borderRadius: 5,
    paddingHorizontal: 5, paddingVertical: 3,
  },
  editBtnText: { fontSize: 9, fontWeight: '700' as const, color: '#fff' },

  emptyOrder: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyOrderText: { fontSize: 13, color: C.dim },

  orderTotalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.dark,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  orderTotalLabel: { fontSize: 12, fontWeight: '700' as const, color: 'rgba(255,255,255,0.6)' },
  orderTotalValue: { fontSize: 22, fontWeight: '800' as const, color: '#fff' },

  orderRight: {
    width: RIGHT_PANEL,
    backgroundColor: C.rightPanel,
    flexDirection: 'column',
  },

  seqRow: { maxHeight: 38, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: C.border },
  seqRowContent: { paddingHorizontal: 10, paddingVertical: 5, gap: 6, alignItems: 'center' },
  seqChip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: '#fff',
  },
  seqChipText: { fontSize: 11, fontWeight: '600' as const, color: C.muted },

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    padding: 6,
    gap: 5,
    maxHeight: IS_TABLET ? 160 : 140,
    overflow: 'hidden',
  },
  catBtn: {
    width: CAT_BTN_W,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    minHeight: IS_TABLET ? 56 : 48,
    justifyContent: 'center',
  },
  catBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  catColorDot: {
    width: 10, height: 10, borderRadius: 5, flexShrink: 0,
  },
  catBtnText: {
    fontSize: IS_TABLET ? 12 : 11,
    fontWeight: '600' as const,
    color: C.text,
    flex: 1,
  },
  emptyCats: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  emptyCatsText: { fontSize: 13, color: C.dim },

  productsArea: { flex: 1 },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 7,
  },
  productBtn: {
    width: IS_TABLET ? '22%' : '30%',
    minWidth: IS_TABLET ? 120 : 90,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: IS_TABLET ? 12 : 8,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  productBtnDisabled: { opacity: 0.5 },
  productBtnName: { fontSize: IS_TABLET ? 13 : 11, fontWeight: '700' as const, color: C.text, lineHeight: 16 },
  productBtnPrice: { fontSize: IS_TABLET ? 13 : 11, fontWeight: '800' as const, color: C.accent },
  productBtnOut: { fontSize: 10, fontWeight: '800' as const, color: C.red },
  productBtnStock: { fontSize: 9, fontWeight: '700' as const, color: '#7c3aed' },

  bottomBar: {
    backgroundColor: C.bottomBar,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 5,
  },
  bottomBarContent: { paddingHorizontal: 8, gap: 5, paddingBottom: 5, alignItems: 'center' },
  actionBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 3,
    minWidth: 72,
  },
  actionBtnText: { fontSize: 10, fontWeight: '700' as const, color: '#fff', textAlign: 'center' as const },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 22, width: '100%', maxWidth: 400, gap: 10,
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' as const, color: C.text },
  modalSub: { fontSize: 13, color: C.muted },
  modalLabel: { fontSize: 12, fontWeight: '700' as const, color: C.text },
  noteHint: { fontSize: 11, color: C.dim, fontStyle: 'italic' as const, marginTop: 2 },
  noteInput: {
    backgroundColor: '#f8fafc', borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: C.text, minHeight: 70,
    textAlignVertical: 'top' as const,
  },
  guestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  guestBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  guestCount: { fontSize: 26, fontWeight: '800' as const, color: C.text, minWidth: 40, textAlign: 'center' as const },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 12, alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600' as const, color: C.muted },
  modalConfirm: {
    flex: 1, borderRadius: 12, backgroundColor: C.accent,
    paddingVertical: 12, alignItems: 'center',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '700' as const, color: '#fff' },
  optChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: '#f8fafc', alignItems: 'center',
  },
  optChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  optChipLabel: { fontSize: 13, fontWeight: '600' as const, color: C.text },
  optChipPrice: { fontSize: 11, color: C.muted, marginTop: 1 },
});
