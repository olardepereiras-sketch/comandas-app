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
  ChefHat,
  X,
  Plus,
  Minus,
  Edit3,
  ShoppingCart,
  AlertCircle,
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
  dark: '#0f172a',
  text: '#1e293b',
  muted: '#64748b',
  dim: '#94a3b8',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#f59e0b',
  headerBg: '#1e293b',
  sidebarBg: '#f8fafc',
  canvasBg: '#eef0f3',
  leftPanel: '#ffffff',
  rightPanel: '#f8fafc',
  bottomBar: '#1e293b',
};

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
  edited?: boolean;
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
  urgent?: boolean;
  urgentAt?: number;
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
}

interface ComandasCategory {
  id: string;
  familyId?: string;
  name: string;
  color: string;
  order: number;
  items: ComandasProduct[];
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

export default function WaiterScreen() {
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
  const [families, setFamilies] = useState<ComandasFamily[]>([]);
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
  const [editItemSeqId, setEditItemSeqId] = useState<string | null>(null);

  const [showEditGuestsModal, setShowEditGuestsModal] = useState(false);
  const [editGuestsCount, setEditGuestsCount] = useState(2);

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
          fams.forEach(f => {
            if (f.categories) {
              f.categories.forEach(cat => {
                allCats.push({ ...cat, familyId: cat.familyId || f.id });
              });
            }
          });
          setFamilies(fams);
          setCategories(allCats);
          if (allCats.length > 0) setSelectedCatId(prev => prev || allCats[0].id);
        });
        apply('categories', (cats: ComandasCategory[]) => {
          if (cats.length > 0) {
            setCategories(prev => {
              if (prev.length > 0 && prev.some(c => c.familyId)) return prev;
              return cats;
            });
            setSelectedCatId(prev => prev || cats[0].id);
          }
        });
        if (latestTs) lastSyncRef.current = latestTs;
      }
    } catch (e) {
      console.log('[Waiter Sync] Error:', e);
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
      console.log('[Waiter] Save error:', e);
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
    }).catch(e => console.log('[Waiter] Load locations/tables error:', e));
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

  const floorCanvasW = useMemo(() => {
    if (!currentTables.length) return Math.max(canvasSize.w, 700);
    let maxX = 600;
    currentTables.forEach((t, idx) => {
      const pos = positions[t.id] || getDefaultPos(idx, canvasSize.w);
      maxX = Math.max(maxX, pos.x + CARD_W + 20);
    });
    return Math.max(canvasSize.w, maxX);
  }, [currentTables, positions, canvasSize.w]);

  const floorCanvasH = useMemo(() => {
    if (!currentTables.length) return Math.max(canvasSize.h, 500);
    let maxY = 400;
    currentTables.forEach((t, idx) => {
      const pos = positions[t.id] || getDefaultPos(idx, canvasSize.w);
      maxY = Math.max(maxY, pos.y + CARD_H + 20);
    });
    return Math.max(canvasSize.h, maxY);
  }, [currentTables, positions, canvasSize.h, canvasSize.w]);

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
    setEditItemKitchenNote(item.kitchenNote || '');
    setEditItemQty(item.qty);
    setEditItemSeqId(item.courseSequenceId || null);
    setShowEditItemModal(true);
  }, []);

  const handleSaveEditItem = useCallback(() => {
    if (!activeOrder || !editItemId) return;
    const newSeq = sequences.find(s => s.id === editItemSeqId);
    const newItems = activeOrder.items.map(i =>
      i.id === editItemId
        ? {
            ...i,
            kitchenNote: editItemKitchenNote.trim(),
            qty: Math.max(1, editItemQty),
            edited: true,
            courseSequenceId: editItemSeqId || undefined,
            courseSequenceName: newSeq?.name,
            courseSequenceColor: newSeq?.color,
          }
        : i
    );
    const updatedOrder = { ...activeOrder, items: newItems };
    setActiveOrder(updatedOrder);
    void saveOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setShowEditItemModal(false);
    setEditItemId(null);
  }, [activeOrder, editItemId, editItemKitchenNote, editItemQty, editItemSeqId, sequences, orders, saveOrders]);

  const handleSaveEditGuests = useCallback(() => {
    if (!activeOrder) return;
    const updatedOrder = { ...activeOrder, guests: editGuestsCount };
    setActiveOrder(updatedOrder);
    void saveOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setShowEditGuestsModal(false);
  }, [activeOrder, editGuestsCount, orders, saveOrders]);

  const handleClaimOrder = useCallback(async () => {
    if (!activeOrder) return;
    const updatedOrder = { ...activeOrder, urgent: true, urgentAt: Date.now() };
    setActiveOrder(updatedOrder);
    const next = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    void saveOrders(next);
    Alert.alert('⚠️ Alerta urgente', 'Se ha reclamado el pedido. El monitor de cocina mostrará una alerta.');
  }, [activeOrder, orders, saveOrders]);

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
              items: items.map(i => ({
                qty: i.qty,
                name: i.name,
                notes: i.kitchenNote || i.notes || undefined,
              })),
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
              fontSizePtCamarero: template?.fontSizePtCamarero,
              lineSpacingItem: template?.lineSpacingItem,
              waiterName: userName || undefined,
            });
            console.log('[Waiter] Direct print to:', printer.name);
          } catch (err) {
            console.error('[Waiter] Direct print error:', err);
          }
        }
      }
    }

    Alert.alert('✓ Enviado', `${pendingItems.length} ítem(s) enviados a cocina.`);
  }, [activeOrder, orders, saveOrders, printers, printTemplates, restaurantId, userName]);

  const _handlePrintOrder = useCallback(async () => {
    if (!activeOrder || !restaurantId) {
      Alert.alert('Sin comanda', 'No hay comanda activa.');
      return;
    }
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
            items: items.map(i => ({
              qty: i.qty,
              name: i.name,
              notes: i.kitchenNote || i.notes || undefined,
            })),
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
            fontSizePtCamarero: template?.fontSizePtCamarero,
            lineSpacingItem: template?.lineSpacingItem,
            waiterName: userName || undefined,
          });
          printed = true;
        } catch (err) {
          console.error('[Waiter] Print error:', err);
        }
      }
    }
    if (!printed) Alert.alert('Sin impresora', 'No se encontró impresora configurada.');
  }, [activeOrder, restaurantId, printers, printTemplates, userName]);

  const _handleCloseOrder = useCallback(() => {
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
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('comandas_device_session');
          router.replace('/');
        },
      },
    ]);
  }, [router]);

  const selectedCat = useMemo(() => categories.find(c => c.id === selectedCatId), [categories, selectedCatId]);
  const currentCatProducts = useMemo(() => selectedCat?.items || [], [selectedCat]);

  const orderTotal = useMemo(() =>
    activeOrder?.items.reduce((s, i) => s + i.price * i.qty, 0) || 0,
    [activeOrder]
  );

  const groupedItems = useMemo(() => {
    if (!activeOrder) return [];
    const sorted = [...sequences].sort((a, b) => a.priority - b.priority);
    const groups: { seqId: string | null; seqName?: string; seqColor?: string; items: OrderItem[] }[] = [];
    sorted.forEach(seq => {
      const seqItems = activeOrder.items.filter(i => i.courseSequenceId === seq.id);
      if (seqItems.length > 0) {
        groups.push({ seqId: seq.id, seqName: seq.name, seqColor: seq.color, items: seqItems });
      }
    });
    const unsequenced = activeOrder.items.filter(i => !i.courseSequenceId);
    if (unsequenced.length > 0) {
      groups.push({ seqId: null, items: unsequenced });
    }
    return groups;
  }, [activeOrder, sequences]);

  const pendingCount = useMemo(() =>
    activeOrder?.items.filter(i => i.status === 'pending').length || 0,
    [activeOrder]
  );

  if (syncing && orders.length === 0 && categories.length === 0) {
    return (
      <View style={[ss.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={ss.loadingText}>Conectando...</Text>
      </View>
    );
  }

  return (
    <View style={[ss.root, { paddingTop: insets.top }]}>
      <View style={ss.header}>
        <View style={ss.headerLeft}>
          <View style={ss.headerTitleRow}>
            <Text style={ss.headerRestaurant} numberOfLines={1}>
              {activeOrder && screen === 'order' ? activeOrder.tableLabel : 'Seleccionar Mesa'}
            </Text>
            {activeOrder && screen === 'order' && (
              <TouchableOpacity
                style={ss.headerGuestPill}
                onPress={() => { setEditGuestsCount(activeOrder.guests); setShowEditGuestsModal(true); }}
                activeOpacity={0.7}
              >
                <Text style={ss.headerGuestPillText}>{activeOrder.guests} com. ✎</Text>
              </TouchableOpacity>
            )}
          </View>
          {userName ? <Text style={ss.headerUser}>{userName}</Text> : null}
        </View>
        <View style={ss.headerRight}>
          <TouchableOpacity style={ss.headerBtn} onPress={() => syncFromServer(true)} activeOpacity={0.7}>
            <RefreshCw size={16} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
          </TouchableOpacity>
          {screen === 'order' && (
            <TouchableOpacity
              style={ss.headerBtn}
              onPress={() => { setActiveOrder(null); setSelectedItemId(null); setScreen('tables'); }}
              activeOpacity={0.7}
            >
              <X size={16} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={ss.headerBtn} onPress={handleLogout} activeOpacity={0.7}>
            <LogOut size={16} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {screen === 'tables' && (
        <View style={ss.tablesScreen}>
          <View style={ss.locationSidebar}>
            {locations.map(loc => (
              <TouchableOpacity
                key={loc.id}
                style={[ss.locBtn, selectedLocationId === loc.id && ss.locBtnActive]}
                onPress={() => setSelectedLocationId(loc.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[ss.locBtnText, selectedLocationId === loc.id && ss.locBtnTextActive]}
                  numberOfLines={3}
                >
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
            {locations.length === 0 && (
              <View style={ss.locEmpty}>
                <Text style={ss.locEmptyText}>Sin{'\n'}zonas</Text>
              </View>
            )}
          </View>

          <ScrollView
            style={ss.floorCanvas}
            horizontal
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onLayout={e => setCanvasSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          >
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ width: floorCanvasW, height: floorCanvasH, position: 'relative', backgroundColor: C.canvasBg }}>
                {currentTables.length === 0 ? (
                  <View style={ss.floorEmpty}>
                    <ShoppingCart size={40} color={C.dim} strokeWidth={1.5} />
                    <Text style={ss.floorEmptyText}>Sin mesas en esta zona</Text>
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
                          ss.tableCard,
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
                        <Text style={ss.tableCardName}>{table.name}</Text>
                        <Text style={ss.tableCardCap}>{table.capacity}p</Text>
                        {hasOrder && (
                          <View style={[ss.tableDot, { backgroundColor: hasReady ? C.green : C.accent }]} />
                        )}
                        {pendingItems > 0 && (
                          <View style={ss.tableBadge}>
                            <Text style={ss.tableBadgeText}>{pendingItems}</Text>
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
      )}

      {screen === 'order' && activeOrder && (
        <View style={ss.orderWrapper}>
          {sequences.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.seqRow} contentContainerStyle={ss.seqRowContent} bounces={false}>
              {[...sequences].sort((a, b) => a.priority - b.priority).map(seq => (
                <TouchableOpacity
                  key={seq.id}
                  style={[ss.seqChip, selectedSequenceId === seq.id && { backgroundColor: seq.color, borderColor: '#0f172a', borderWidth: 2 }]}
                  onPress={() => setSelectedSequenceId(seq.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[ss.seqChipText, selectedSequenceId === seq.id && { color: '#fff', fontWeight: '800' as const }]}>
                    {seq.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={ss.catSection}>
            {categories.length === 0 ? (
              <View style={ss.emptyCats}>
                <AlertCircle size={18} color={C.dim} strokeWidth={2} />
                <Text style={ss.emptyCatsText}>Sin categorías</Text>
              </View>
            ) : families.length > 0 ? (
              [...families].sort((a, b) => a.order - b.order).map(fam => {
                const famCats = [...categories].filter(c => c.familyId === fam.id).sort((a, b) => a.order - b.order);
                if (famCats.length === 0) return null;
                return (
                  <View key={fam.id} style={[ss.catFamilyRow, { backgroundColor: fam.color }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.catRowContent} bounces={false}>
                      {famCats.map(cat => {
                        const isActive = selectedCatId === cat.id;
                        const catColor = cat.color || C.accent;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[ss.catChip, { backgroundColor: catColor }, isActive && ss.catChipActive]}
                            onPress={() => setSelectedCatId(cat.id)}
                            activeOpacity={0.85}
                          >
                            {isActive && <View style={ss.catChipOverlay} />}
                            <Text style={ss.catChipText} numberOfLines={2}>{cat.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                );
              })
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.catRowContent} bounces={false} style={ss.catSingleRow}>
                {[...categories].sort((a, b) => a.order - b.order).map(cat => {
                  const isActive = selectedCatId === cat.id;
                  const catColor = cat.color || C.accent;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[ss.catChip, { backgroundColor: catColor }, isActive && ss.catChipActive]}
                      onPress={() => setSelectedCatId(cat.id)}
                      activeOpacity={0.85}
                    >
                      {isActive && <View style={ss.catChipOverlay} />}
                      <Text style={ss.catChipText} numberOfLines={2}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={ss.orderMain}>
            <View style={ss.orderLeft}>
              <ScrollView
                ref={itemsScrollRef}
                style={ss.itemsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={ss.itemsListContent}
              >
                {activeOrder.items.length === 0 ? (
                  <View style={ss.emptyOrder}>
                    <ShoppingCart size={30} color={C.dim} strokeWidth={1.5} />
                    <Text style={ss.emptyOrderText}>Comanda vacía</Text>
                  </View>
                ) : (
                  groupedItems.map(group => (
                    <View key={group.seqId || '__none__'}>
                      {group.seqId && group.seqName && (
                        <View style={[ss.seqGroupHeader, { borderLeftColor: group.seqColor || C.dim }]}>
                          <View style={[ss.seqGroupDot, { backgroundColor: group.seqColor || C.dim }]} />
                          <Text style={ss.seqGroupLabel}>{group.seqName}</Text>
                        </View>
                      )}
                      {group.items.map(item => {
                        const isSelected = selectedItemId === item.id;
                        const seqColor = item.courseSequenceColor || C.dim;
                        const charNote = item.notes || '';
                        const kitNote = item.kitchenNote || '';
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[ss.orderItem, isSelected && ss.orderItemSelected, item.edited && ss.orderItemEdited]}
                            onPress={() => setSelectedItemId(isSelected ? null : item.id)}
                            activeOpacity={0.8}
                          >
                            <View style={[ss.itemSeqBar, { backgroundColor: seqColor }]} />
                            <View style={ss.itemQtyCol}>
                              {item.status === 'pending' ? (
                                <>
                                  <TouchableOpacity style={ss.qtyBtn} onPress={() => handleQtyChange(item.id, 1)}>
                                    <Plus size={10} color={C.text} strokeWidth={3} />
                                  </TouchableOpacity>
                                  <Text style={ss.qtyNum}>{item.qty}</Text>
                                  <TouchableOpacity style={ss.qtyBtn} onPress={() => handleQtyChange(item.id, -1)}>
                                    <Minus size={10} color={C.text} strokeWidth={3} />
                                  </TouchableOpacity>
                                </>
                              ) : (
                                <Text style={ss.qtyFixed}>×{item.qty}</Text>
                              )}
                            </View>
                            <View style={ss.itemInfo}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={ss.itemName} numberOfLines={3}>{item.name}</Text>
                                {item.edited && <Text style={ss.editedBadge}>✎</Text>}
                              </View>
                              {(charNote || kitNote) ? (
                                <Text style={ss.itemCat} numberOfLines={2}>{[charNote, kitNote].filter(Boolean).join(' · ')}</Text>
                              ) : null}
                              <Text style={ss.itemPrice}>{(item.price * item.qty).toFixed(2)}€</Text>
                            </View>
                            {isSelected && (
                              <TouchableOpacity
                                style={ss.editBtn}
                                onPress={() => handleOpenEditItem(item)}
                                activeOpacity={0.8}
                              >
                                <Edit3 size={12} color="#fff" strokeWidth={2.5} />
                              </TouchableOpacity>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            <View style={ss.orderRight}>
              <ScrollView style={ss.productsArea} showsVerticalScrollIndicator={false} contentContainerStyle={ss.productsGrid}>
                {currentCatProducts.map(prod => {
                  const stock = prod.hasStockControl ? getStockForProduct(prod.id) : null;
                  const outOfStock = stock !== null && stock <= 0;
                  return (
                    <TouchableOpacity
                      key={prod.id}
                      style={[ss.productBtn, { backgroundColor: selectedCat?.color || '#e2e8f0' }, outOfStock && ss.productBtnDisabled]}
                      onPress={() => !outOfStock && handleAddProduct(prod)}
                      activeOpacity={0.8}
                      disabled={outOfStock}
                    >
                      <Text style={ss.productBtnName} numberOfLines={3}>{prod.name}</Text>
                      {outOfStock && <Text style={ss.productBtnOut}>AGOTADO</Text>}
                      {stock !== null && stock > 0 && (
                        <Text style={ss.productBtnStock}>{stock} uds</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {currentCatProducts.length === 0 && selectedCatId && (
                  <View style={ss.emptyCats}>
                    <Text style={ss.emptyCatsText}>Sin productos en esta categoría</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {screen === 'order' && activeOrder && (
        <View style={ss.orderTotalBar}>
          <Text style={ss.orderTotalLabel}>TOTAL</Text>
          <Text style={ss.orderTotalValue}>{orderTotal.toFixed(2)} €</Text>
        </View>
      )}

      {screen === 'order' && activeOrder && (
        <View style={[ss.bottomBar, { paddingBottom: insets.bottom + 4 }]}>
          <View style={ss.bottomBarContent}>
            <TouchableOpacity
              style={[ss.actionBtn, { backgroundColor: pendingCount > 0 ? C.accent : '#374151' }]}
              onPress={handleSendToKitchen}
              activeOpacity={0.8}
            >
              <ChefHat size={18} color="#fff" strokeWidth={2} />
              <Text style={ss.actionBtnText}>{pendingCount > 0 ? `Enviar (${pendingCount})` : 'Enviar a cocina'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ss.actionBtn, { backgroundColor: C.red }]}
              onPress={handleClaimOrder}
              activeOpacity={0.8}
            >
              <AlertCircle size={18} color="#fff" strokeWidth={2} />
              <Text style={ss.actionBtnText}>Reclamar pedido</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ss.actionBtn, { backgroundColor: C.green }]}
              onPress={() => { setActiveOrder(null); setSelectedItemId(null); setScreen('tables'); }}
              activeOpacity={0.8}
            >
              <ShoppingCart size={18} color="#fff" strokeWidth={2} />
              <Text style={ss.actionBtnText}>Plano de mesas</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showGuestsModal} transparent animationType="fade" onRequestClose={() => setShowGuestsModal(false)}>
        <View style={ss.modalOverlay}>
          <View style={ss.modalCard}>
            <Text style={ss.modalTitle}>Nueva comanda</Text>
            <Text style={ss.modalSub}>{pendingTableLabel}</Text>
            <Text style={ss.modalLabel}>Comensales</Text>
            <View style={ss.guestRow}>
              <TouchableOpacity style={ss.guestBtn} onPress={() => setGuestCount(Math.max(1, guestCount - 1))}>
                <Minus size={18} color={C.text} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={ss.guestCount}>{guestCount}</Text>
              <TouchableOpacity style={ss.guestBtn} onPress={() => setGuestCount(guestCount + 1)}>
                <Plus size={18} color={C.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <View style={ss.modalActions}>
              <TouchableOpacity style={ss.modalCancel} onPress={() => setShowGuestsModal(false)}>
                <Text style={ss.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ss.modalConfirm} onPress={handleCreateOrder}>
                <Text style={ss.modalConfirmText}>Abrir comanda</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditItemModal} transparent animationType="fade" onRequestClose={() => setShowEditItemModal(false)}>
        <View style={ss.modalOverlay}>
          <View style={[ss.modalCard, { maxHeight: SH * 0.85 }]}>
            <Text style={ss.modalTitle}>Editar ítem</Text>
            <Text style={ss.modalSub}>{activeOrder?.items.find(i => i.id === editItemId)?.name}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={ss.modalLabel}>Cantidad</Text>
              <View style={ss.guestRow}>
                <TouchableOpacity style={ss.guestBtn} onPress={() => setEditItemQty(Math.max(1, editItemQty - 1))}>
                  <Minus size={18} color={C.text} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={ss.guestCount}>{editItemQty}</Text>
                <TouchableOpacity style={ss.guestBtn} onPress={() => setEditItemQty(editItemQty + 1)}>
                  <Plus size={18} color={C.text} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              {sequences.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={ss.modalLabel}>Secuencia</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[ss.optChip, !editItemSeqId && ss.optChipActive]}
                      onPress={() => setEditItemSeqId(null)}
                      activeOpacity={0.8}
                    >
                      <Text style={[ss.optChipLabel, !editItemSeqId && { color: '#fff' }]}>Sin secuencia</Text>
                    </TouchableOpacity>
                    {[...sequences].sort((a, b) => a.priority - b.priority).map(seq => (
                      <TouchableOpacity
                        key={seq.id}
                        style={[ss.optChip, editItemSeqId === seq.id && { backgroundColor: seq.color, borderColor: seq.color }]}
                        onPress={() => setEditItemSeqId(seq.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[ss.optChipLabel, editItemSeqId === seq.id && { color: '#fff' }]}>{seq.priority}. {seq.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <Text style={[ss.modalLabel, { marginTop: 12 }]}>Nota para cocina</Text>
              <Text style={ss.noteHint}>Esta nota solo se mostrará en el monitor de cocina y al imprimir la comanda</Text>
              <TextInput
                style={ss.noteInput}
                value={editItemKitchenNote}
                onChangeText={setEditItemKitchenNote}
                placeholder="Ej: sin gluten, muy hecho, sin sal..."
                multiline
                placeholderTextColor={C.dim}
              />
            </ScrollView>
            <View style={[ss.modalActions, { marginTop: 12 }]}>
              <TouchableOpacity style={ss.modalCancel} onPress={() => setShowEditItemModal(false)}>
                <Text style={ss.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ss.modalConfirm} onPress={handleSaveEditItem}>
                <Text style={ss.modalConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showOptionsModal} transparent animationType="slide" onRequestClose={() => setShowOptionsModal(false)}>
        <View style={ss.modalOverlay}>
          <View style={[ss.modalCard, { maxHeight: SH * 0.85 }]}>
            <View style={ss.modalHandle} />
            <Text style={ss.modalTitle}>{pendingProduct?.name}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pendingProduct && ((pendingProduct.price2 && pendingProduct.price2 > 0) || (pendingProduct.price3 && pendingProduct.price3 > 0)) && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={ss.modalLabel}>Precio</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {[
                      { key: 'main' as const, label: 'Normal', price: pendingProduct.price },
                      ...(pendingProduct.price2 && pendingProduct.price2 > 0 ? [{ key: 'price2' as const, label: pendingProduct.price2Label || 'Precio 2', price: pendingProduct.price2 }] : []),
                      ...(pendingProduct.price3 && pendingProduct.price3 > 0 ? [{ key: 'price3' as const, label: pendingProduct.price3Label || 'Precio 3', price: pendingProduct.price3 }] : []),
                    ].map(v => (
                      <TouchableOpacity
                        key={v.key}
                        style={[ss.optChip, selectedPriceVariant === v.key && ss.optChipActive]}
                        onPress={() => setSelectedPriceVariant(v.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[ss.optChipLabel, selectedPriceVariant === v.key && { color: '#fff' }]}>{v.label}</Text>
                        <Text style={[ss.optChipPrice, selectedPriceVariant === v.key && { color: 'rgba(255,255,255,0.8)' }]}>{v.price.toFixed(2)}€</Text>
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
                    <Text style={ss.modalLabel}>{char.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {char.options.map(opt => (
                        <TouchableOpacity
                          key={opt.id}
                          style={[ss.optChip, selectedCharOptions[cid] === opt.label && ss.optChipActive]}
                          onPress={() => setSelectedCharOptions(prev => ({ ...prev, [cid]: opt.label }))}
                          activeOpacity={0.8}
                        >
                          <Text style={[ss.optChipLabel, selectedCharOptions[cid] === opt.label && { color: '#fff' }]}>{opt.label}</Text>
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
                    <Text style={ss.modalLabel}>{addOn.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {addOn.options.map(opt => (
                        <TouchableOpacity
                          key={opt.id}
                          style={[ss.optChip, selectedAddOnOptions[aid] === opt.id && ss.optChipActive]}
                          onPress={() => setSelectedAddOnOptions(prev => ({ ...prev, [aid]: opt.id }))}
                          activeOpacity={0.8}
                        >
                          <Text style={[ss.optChipLabel, selectedAddOnOptions[aid] === opt.id && { color: '#fff' }]}>{opt.label}</Text>
                          {opt.price > 0 && (
                            <Text style={[ss.optChipPrice, selectedAddOnOptions[aid] === opt.id && { color: 'rgba(255,255,255,0.8)' }]}>+{opt.price.toFixed(2)}€</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}

              <Text style={ss.modalLabel}>Nota para cocina</Text>
              <Text style={ss.noteHint}>Solo visible en cocina y al imprimir</Text>
              <TextInput
                style={[ss.noteInput, { marginTop: 6 }]}
                value={optionNote}
                onChangeText={setOptionNote}
                placeholder="Nota especial para este ítem..."
                multiline
                placeholderTextColor={C.dim}
              />
            </ScrollView>

            <View style={[ss.modalActions, { marginTop: 12 }]}>
              <TouchableOpacity style={ss.modalCancel} onPress={() => setShowOptionsModal(false)}>
                <Text style={ss.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ss.modalConfirm} onPress={handleConfirmOptions}>
                <Text style={ss.modalConfirmText}>Añadir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showEditGuestsModal} transparent animationType="fade" onRequestClose={() => setShowEditGuestsModal(false)}>
        <View style={ss.modalOverlay}>
          <View style={ss.modalCard}>
            <Text style={ss.modalTitle}>Comensales</Text>
            <Text style={ss.modalSub}>{activeOrder?.tableLabel}</Text>
            <View style={[ss.guestRow, { marginTop: 8 }]}>
              <TouchableOpacity style={ss.guestBtn} onPress={() => setEditGuestsCount(Math.max(1, editGuestsCount - 1))}>
                <Minus size={18} color={C.text} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={ss.guestCount}>{editGuestsCount}</Text>
              <TouchableOpacity style={ss.guestBtn} onPress={() => setEditGuestsCount(editGuestsCount + 1)}>
                <Plus size={18} color={C.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <View style={ss.modalActions}>
              <TouchableOpacity style={ss.modalCancel} onPress={() => setShowEditGuestsModal(false)}>
                <Text style={ss.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ss.modalConfirm} onPress={handleSaveEditGuests}>
                <Text style={ss.modalConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const SIDEBAR_W = IS_TABLET ? 122 : 97;
const RIGHT_PANEL_W = Math.floor(SW * 0.30);

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadingText: { marginTop: 12, color: C.muted, fontSize: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.headerBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
  },
  headerLeft: { flex: 1 },
  headerRestaurant: { fontSize: 15, fontWeight: '700' as const, color: '#fff' },
  headerUser: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerBtn: {
    width: 32, height: 32, borderRadius: 8,
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
    minHeight: 50,
    justifyContent: 'center',
  },
  locBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  locBtnText: { fontSize: 11, fontWeight: '600' as const, color: C.muted, textAlign: 'center' as const },
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

  orderWrapper: { flex: 1 },
  orderMain: { flex: 1, flexDirection: 'row' },

  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerGuestPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  headerGuestPillText: { fontSize: 12, color: '#fff', fontWeight: '700' as const },
  sendToKitchenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  sendToKitchenBtnText: { fontSize: 13, fontWeight: '800' as const, color: '#fff' },

  orderLeft: {
    flex: 1,
    backgroundColor: C.leftPanel,
    borderRightWidth: 1,
    borderRightColor: C.border,
    flexDirection: 'column',
  },
  itemsList: { flex: 1 },
  itemsListContent: { paddingVertical: 4 },

  orderItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 64,
  },
  orderItemSelected: { backgroundColor: '#fff7ed' },
  orderItemEdited: { backgroundColor: '#fefce8' },
  editedBadge: { fontSize: 10, color: '#d97706', fontWeight: '700' as const },
  seqGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    gap: 6,
  },
  seqGroupDot: { width: 7, height: 7, borderRadius: 4 },
  seqGroupLabel: { fontSize: 10, fontWeight: '800' as const, color: '#475569', letterSpacing: 0.5, textTransform: 'uppercase' as const },
  itemSeqBar: { width: 8, flexShrink: 0 },
  itemQtyCol: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 6, minWidth: 38 },
  qtyBtn: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: '#f1f5f9',
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyNum: { fontSize: 13, fontWeight: '800' as const, color: C.accent, minWidth: 18, textAlign: 'center' as const },
  qtyFixed: { fontSize: 13, color: C.muted, fontWeight: '600' as const },
  itemInfo: { flex: 1, paddingVertical: 6, paddingRight: 6, justifyContent: 'center' as const, gap: 1 },
  itemName: { fontSize: 12, fontWeight: '600' as const, color: C.text, lineHeight: 15 },
  itemCat: { fontSize: 10, color: '#d97706', fontStyle: 'italic' as const, lineHeight: 13 },
  itemPrice: { fontSize: 11, fontWeight: '800' as const, color: C.dark },
  editBtn: {
    width: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accent,
  },

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
  orderTotalLabel: { fontSize: 11, fontWeight: '800' as const, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2 },
  orderTotalValue: { fontSize: 20, fontWeight: '800' as const, color: '#fff' },

  orderRight: {
    width: RIGHT_PANEL_W,
    backgroundColor: C.rightPanel,
    flexDirection: 'column',
    borderLeftWidth: 1,
    borderLeftColor: C.border,
  },
  seqRow: { maxHeight: 60, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  seqRowContent: { paddingHorizontal: 8, paddingVertical: 5, gap: 6, alignItems: 'center' as const },
  seqChip: {
    paddingHorizontal: 14, paddingVertical: 0,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#475569',
    backgroundColor: '#334155', minHeight: 46, minWidth: 70,
    justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  seqChipText: { fontSize: 11, fontWeight: '600' as const, color: '#94a3b8', textAlign: 'center' as const },

  catSection: { borderBottomWidth: 1, borderBottomColor: '#334155' },
  catFamilyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.12)',
  },
  catSingleRow: { maxHeight: 62, backgroundColor: '#1e293b' },
  catRowContent: { paddingHorizontal: 6, paddingVertical: 5, gap: 6, alignItems: 'center' as const },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 46,
    minWidth: 60,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
  catChipActive: {
    borderColor: '#000',
    borderWidth: 2.5,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  catChipOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 6,
  },
  catChipText: { fontSize: 11, fontWeight: '700' as const, color: '#fff', textAlign: 'center' as const, lineHeight: 14 },
  emptyCats: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  emptyCatsText: { fontSize: 11, color: C.dim },

  productsArea: { flex: 1 },
  productsGrid: {
    flexDirection: 'column',
    padding: 4,
    gap: 4,
  },
  productBtn: {
    borderRadius: 10,
    padding: 8,
    borderWidth: 0,
    gap: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  productBtnDisabled: { opacity: 0.5 },
  productBtnName: { fontSize: 11, fontWeight: '700' as const, color: '#fff', lineHeight: 15, textAlign: 'center' as const },
  productBtnPrice: { fontSize: 11, fontWeight: '800' as const, color: C.accent },
  productBtnOut: { fontSize: 9, fontWeight: '800' as const, color: C.red },
  productBtnStock: { fontSize: 9, fontWeight: '700' as const, color: '#7c3aed' },

  bottomBar: {
    backgroundColor: C.bottomBar,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 6,
  },
  bottomBarContent: { flexDirection: 'row', paddingHorizontal: 8, gap: 6, paddingBottom: 6, alignItems: 'stretch' },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 3,
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
  noteHint: { fontSize: 11, color: C.dim, fontStyle: 'italic', marginTop: 2 },
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
