import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import {
  ArrowLeft,
  Plus,
  Minus,
  X,
  ChevronRight,
  Coffee,
  Utensils,
  Wine,
  IceCream,
  ShoppingBag,
  Users,
  ChefHat,
  Send,
} from 'lucide-react-native';

type Course = 'starter' | 'main' | 'dessert' | 'drink' | 'other';
type ItemStatus = 'pending' | 'preparing' | 'ready' | 'served';

interface OrderItem {
  id: string;
  menuItemId?: string | null;
  name: string;
  price: number;
  priceVariant: string;
  priceVariantName?: string | null;
  quantity: number;
  notes?: string | null;
  course: Course;
  status: ItemStatus;
}

interface ComandaOrder {
  id: string;
  restaurantId: string;
  tableId?: string | null;
  tableName: string;
  locationId?: string | null;
  locationName?: string | null;
  status: string;
  guests: number;
  notes?: string | null;
  waiterName?: string | null;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

const COURSE_LABELS: Record<Course, string> = {
  starter: 'Entrante',
  main: 'Principal',
  dessert: 'Postre',
  drink: 'Bebida',
  other: 'Otro',
};

const COURSE_ICONS: Record<Course, React.ReactNode> = {
  starter: <ShoppingBag size={14} color="#6B7280" />,
  main: <Utensils size={14} color="#6B7280" />,
  dessert: <IceCream size={14} color="#6B7280" />,
  drink: <Wine size={14} color="#6B7280" />,
  other: <Coffee size={14} color="#6B7280" />,
};

const STATUS_COLORS: Record<ItemStatus, string> = {
  pending: '#F59E0B',
  preparing: '#3B82F6',
  ready: '#10B981',
  served: '#9CA3AF',
};

const STATUS_LABELS: Record<ItemStatus, string> = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  ready: '¡Listo!',
  served: 'Servido',
};

type Screen = 'tables' | 'menu' | 'order';

export default function WaiterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { restaurantId, restaurantName } = useLocalSearchParams<{ restaurantId: string; restaurantName: string }>();

  const [screen, setScreen] = useState<Screen>('tables');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<ComandaOrder | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [waiterName, setWaiterName] = useState<string>('');

  const [selectedCourse, setSelectedCourse] = useState<Course>('main');

  const locationsQuery = trpc.locations.list.useQuery(
    { restaurantId: restaurantId ?? '' },
    { enabled: !!restaurantId }
  );

  const tablesQuery = trpc.tables.list.useQuery(
    { restaurantId: restaurantId ?? '', locationId: selectedLocationId ?? undefined },
    { enabled: !!restaurantId && !!selectedLocationId }
  );

  const ordersQuery = trpc.comandas.listOrders.useQuery(
    { restaurantId: restaurantId ?? '', status: 'open' },
    { enabled: !!restaurantId, refetchInterval: 8000 }
  );

  const menusQuery = trpc.digitalMenus.list.useQuery(
    { restaurantId: restaurantId ?? '' },
    { enabled: !!restaurantId }
  );

  const firstMenuId = menusQuery.data?.[0]?.id ?? '';

  const categoriesQuery = trpc.menuCategories.list.useQuery(
    { menuId: firstMenuId },
    { enabled: !!firstMenuId }
  );

  const menuItemsQuery = trpc.menuItems.list.useQuery(
    { categoryId: selectedCategoryId ?? '' },
    { enabled: !!selectedCategoryId }
  );

  const createOrderMutation = trpc.comandas.createOrder.useMutation();
  const addItemMutation = trpc.comandas.addItem.useMutation();
  const updateItemMutation = trpc.comandas.updateItem.useMutation();
  const removeItemMutation = trpc.comandas.removeItem.useMutation();
  const updateOrderMutation = trpc.comandas.updateOrder.useMutation();
  const getOrderQuery = trpc.comandas.getOrder.useQuery(
    { orderId: activeOrderId ?? '' },
    { enabled: !!activeOrderId, refetchInterval: 5000 }
  );

  useEffect(() => {
    if (getOrderQuery.data) {
      setActiveOrder(getOrderQuery.data as ComandaOrder);
    }
  }, [getOrderQuery.data]);

  const getTableOrder = useCallback((tableId: string) => {
    return (ordersQuery.data as ComandaOrder[] | undefined)?.find((o: ComandaOrder) => o.tableId === tableId && o.status === 'open');
  }, [ordersQuery.data]);

  const handleTablePress = (tableId: string, tableName: string) => {
    setSelectedTableId(tableId);
    setSelectedTableName(tableName);
    const existing = getTableOrder(tableId);
    if (existing) {
      setActiveOrderId(existing.id);
      setActiveOrder(existing as ComandaOrder);
      setScreen('order');
    } else {
      setShowNewOrderModal(true);
    }
  };

  const handleCreateOrder = async () => {
    if (!restaurantId || !selectedTableId) return;
    try {
      const order = await createOrderMutation.mutateAsync({
        restaurantId,
        tableId: selectedTableId,
        tableName: selectedTableName,
        locationId: selectedLocationId ?? undefined,
        locationName: selectedLocationName || undefined,
        guests: guestCount,
        waiterName: waiterName || undefined,
      });
      setActiveOrderId(order.id);
      setActiveOrder(order as ComandaOrder);
      setShowNewOrderModal(false);
      setScreen('order');
      await ordersQuery.refetch();
    } catch (err) {
      console.error('[WAITER] Error al crear comanda:', err);
      Alert.alert('Error', 'No se pudo crear la comanda. Inténtalo de nuevo.');
    }
  };

  const handleAddItem = async (item: any, priceVariant: 'price1' | 'price2' | 'price3' = 'price1') => {
    if (!activeOrderId) return;
    const price = priceVariant === 'price2' ? item.price2Amount : priceVariant === 'price3' ? item.price3Amount : item.price;
    const variantName = priceVariant === 'price2' ? item.price2Name : priceVariant === 'price3' ? item.price3Name : null;
    try {
      await addItemMutation.mutateAsync({
        orderId: activeOrderId,
        menuItemId: item.id,
        name: item.name,
        price: price ?? item.price,
        priceVariant,
        priceVariantName: variantName,
        quantity: 1,
        course: selectedCourse,
      });
      await getOrderQuery.refetch();
    } catch (err) {
      console.error('[WAITER] Error al añadir item:', err);
    }
  };

  const handleQtyChange = async (itemId: string, delta: number) => {
    if (!activeOrderId || !activeOrder) return;
    const item = activeOrder.items.find(i => i.id === itemId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      Alert.alert('Eliminar', `¿Eliminar "${item.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await removeItemMutation.mutateAsync({ itemId, orderId: activeOrderId! });
              await getOrderQuery.refetch();
            } catch {}
          }
        }
      ]);
      return;
    }
    try {
      await updateItemMutation.mutateAsync({ itemId, orderId: activeOrderId, quantity: newQty });
      await getOrderQuery.refetch();
    } catch {}
  };

  const handleSendToKitchen = async () => {
    if (!activeOrderId || !activeOrder) return;
    const pendingItems = activeOrder.items.filter(i => i.status === 'pending');
    for (const item of pendingItems) {
      try {
        await updateItemMutation.mutateAsync({ itemId: item.id, orderId: activeOrderId, status: 'preparing' });
      } catch {}
    }
    await getOrderQuery.refetch();
    Alert.alert('✅ Enviado', 'Los pedidos han sido enviados a cocina.');
  };

  const handleCloseOrder = async () => {
    if (!activeOrderId) return;
    Alert.alert('Cerrar Comanda', '¿Cerrar esta comanda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar', style: 'destructive',
        onPress: async () => {
          try {
            await updateOrderMutation.mutateAsync({ orderId: activeOrderId!, status: 'closed' });
            await ordersQuery.refetch();
            setActiveOrderId(null);
            setActiveOrder(null);
            setScreen('tables');
          } catch {}
        }
      }
    ]);
  };

  const pendingCount = activeOrder?.items.filter(i => i.status === 'pending').length ?? 0;

  if (screen === 'tables') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle}>Comandera</Text>
            <Text style={styles.topBarSub}>{restaurantName || 'Restaurante'}</Text>
          </View>
          <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>{ordersQuery.data?.length ?? 0} abiertas</Text>
          </View>
        </View>

        {!selectedLocationId ? (
          <ScrollView contentContainerStyle={styles.locationsContent}>
            <Text style={styles.sectionTitle}>Selecciona una ubicación</Text>
            {locationsQuery.isLoading ? (
              <ActivityIndicator color="#F97316" size="large" style={{ marginTop: 40 }} />
            ) : (
              (locationsQuery.data as any[] ?? []).map((loc: any) => (
                <TouchableOpacity
                  key={loc.id}
                  style={styles.locationCard}
                  onPress={() => { setSelectedLocationId(loc.id); setSelectedLocationName(loc.name); }}
                >
                  <Text style={styles.locationName}>{loc.name}</Text>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            <View style={styles.locationHeader}>
              <TouchableOpacity onPress={() => { setSelectedLocationId(null); setSelectedLocationName(''); }}>
                <Text style={styles.locationBreadcrumb}>← {selectedLocationName}</Text>
              </TouchableOpacity>
              <Text style={styles.locationHint}>Toca una mesa para tomar nota</Text>
            </View>
            <ScrollView contentContainerStyle={styles.tablesGrid}>
              {tablesQuery.isLoading ? (
                <ActivityIndicator color="#F97316" size="large" style={{ marginTop: 40 }} />
              ) : (
                (tablesQuery.data as any[] ?? []).map((table: any) => {
                  const order = getTableOrder(table.id);
                  const hasOrder = !!order;
                  return (
                    <TouchableOpacity
                      key={table.id}
                      testID={`table-${table.id}`}
                      style={[styles.tableCard, hasOrder && styles.tableCardActive]}
                      onPress={() => handleTablePress(table.id, table.name)}
                    >
                      <Text style={[styles.tableName, hasOrder && styles.tableNameActive]}>{table.name}</Text>
                      <Text style={[styles.tableCapacity, hasOrder && styles.tableCapacityActive]}>
                        {table.minCapacity}–{table.maxCapacity} pax
                      </Text>
                      {hasOrder && (
                        <View style={styles.tableOrderBadge}>
                          <Users size={10} color="#FFFFFF" />
                          <Text style={styles.tableOrderBadgeText}>{order!.items.length} items</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        <Modal visible={showNewOrderModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Nueva Comanda</Text>
              <Text style={styles.modalSubtitle}>Mesa: {selectedTableName}</Text>
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Número de comensales</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setGuestCount(Math.max(1, guestCount - 1))}>
                    <Minus size={18} color="#1F2937" />
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{guestCount}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setGuestCount(guestCount + 1)}>
                    <Plus size={18} color="#1F2937" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Camarero (opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Tu nombre..."
                  value={waiterName}
                  onChangeText={setWaiterName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewOrderModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleCreateOrder}
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Abrir Comanda</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (screen === 'menu') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('order')}>
            <ArrowLeft size={20} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle}>Añadir pedido</Text>
            <Text style={styles.topBarSub}>{selectedTableName}</Text>
          </View>
        </View>

        <View style={styles.courseSelector}>
          {(Object.keys(COURSE_LABELS) as Course[]).map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.courseChip, selectedCourse === c && styles.courseChipActive]}
              onPress={() => setSelectedCourse(c)}
            >
              <Text style={[styles.courseChipText, selectedCourse === c && styles.courseChipTextActive]}>
                {COURSE_LABELS[c]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.menuLayout}>
          <View style={styles.categoriesPanel}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(categoriesQuery.data as any[] ?? []).map((cat: any) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryItem, selectedCategoryId === cat.id && styles.categoryItemActive]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <Text style={[styles.categoryItemText, selectedCategoryId === cat.id && styles.categoryItemTextActive]} numberOfLines={2}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.itemsPanel}>
            {!selectedCategoryId ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Selecciona una categoría</Text>
              </View>
            ) : menuItemsQuery.isLoading ? (
              <ActivityIndicator color="#F97316" size="large" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={(menuItemsQuery.data as any[] ?? []).filter((i: any) => i.isActive)}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.menuItem}>
                    <View style={styles.menuItemInfo}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.menuItemDesc} numberOfLines={1}>{item.description}</Text>
                      ) : null}
                      <Text style={styles.menuItemPrice}>{item.price.toFixed(2)} €</Text>
                    </View>
                    <View style={styles.menuItemActions}>
                      <TouchableOpacity
                        style={styles.addItemBtn}
                        onPress={() => handleAddItem(item)}
                        disabled={addItemMutation.isPending}
                      >
                        <Plus size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      {item.price2Enabled && (
                        <TouchableOpacity
                          style={[styles.addItemBtn, styles.addItemBtnAlt]}
                          onPress={() => handleAddItem(item, 'price2')}
                        >
                          <Text style={styles.altPriceText}>{item.price2Name?.[0] ?? '2'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('tables')}>
          <ArrowLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>{selectedTableName}</Text>
          <Text style={styles.topBarSub}>{selectedLocationName} · {activeOrder?.guests ?? 0} pax</Text>
        </View>
        <TouchableOpacity style={styles.topBarAction} onPress={handleCloseOrder}>
          <X size={18} color="#EF4444" />
          <Text style={styles.topBarActionText}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      {getOrderQuery.isLoading && !activeOrder ? (
        <ActivityIndicator color="#F97316" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={activeOrder?.items ?? []}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.orderList, { paddingBottom: insets.bottom + 120 }]}
          ListHeaderComponent={
            <View style={styles.orderHeader}>
              <Text style={styles.orderHeaderText}>PEDIDO ACTUAL</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyOrder}>
              <ChefHat size={48} color="#E5E7EB" />
              <Text style={styles.emptyOrderText}>Sin pedidos aún</Text>
              <Text style={styles.emptyOrderSub}>{'Pulsa "+" para añadir platos'}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.orderItem}>
              <View style={styles.orderItemLeft}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status as ItemStatus] }]} />
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>{item.name}</Text>
                  <View style={styles.orderItemMeta}>
                    {COURSE_ICONS[item.course as Course]}
                    <Text style={styles.orderItemCourse}>{COURSE_LABELS[item.course as Course]}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status as ItemStatus] + '22' }]}>
                      <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[item.status as ItemStatus] }]}>
                        {STATUS_LABELS[item.status as ItemStatus]}
                      </Text>
                    </View>
                  </View>
                  {item.notes ? <Text style={styles.orderItemNotes}>📝 {item.notes}</Text> : null}
                </View>
              </View>
              <View style={styles.orderItemRight}>
                <Text style={styles.orderItemPrice}>{(item.price * item.quantity).toFixed(2)}€</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtnSm} onPress={() => handleQtyChange(item.id, -1)}>
                    <Minus size={12} color="#6B7280" />
                  </TouchableOpacity>
                  <Text style={styles.qtyValueSm}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtnSm} onPress={() => handleQtyChange(item.id, 1)}>
                    <Plus size={12} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <View style={[styles.orderFooter, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>{activeOrder?.totalAmount?.toFixed(2) ?? '0.00'} €</Text>
        </View>
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.addMoreBtn} onPress={() => setScreen('menu')}>
            <Plus size={18} color="#F97316" />
            <Text style={styles.addMoreBtnText}>Añadir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendKitchenBtn, pendingCount === 0 && styles.sendKitchenBtnDisabled]}
            onPress={handleSendToKitchen}
            disabled={pendingCount === 0}
          >
            <Send size={18} color="#FFFFFF" />
            <Text style={styles.sendKitchenBtnText}>
              {pendingCount > 0 ? `Enviar a Cocina (${pendingCount})` : 'Todo enviado'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7F4' },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: { flex: 1 },
  topBarTitle: { fontSize: 16, fontWeight: '700' as const, color: '#111827' },
  topBarSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  topBarAction: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  topBarActionText: { fontSize: 12, fontWeight: '600' as const, color: '#EF4444' },
  openBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  openBadgeText: { fontSize: 11, fontWeight: '700' as const, color: '#22C55E' },
  locationsContent: { padding: 20, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: '#374151', marginBottom: 4 },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  locationName: { fontSize: 16, fontWeight: '600' as const, color: '#1F2937' },
  locationHeader: { paddingHorizontal: 16, paddingVertical: 10, gap: 2 },
  locationBreadcrumb: { fontSize: 14, fontWeight: '600' as const, color: '#F97316' },
  locationHint: { fontSize: 12, color: '#9CA3AF' },
  tablesGrid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap' as const, gap: 12 },
  tableCard: {
    width: '30%',
    minWidth: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    minHeight: 80,
  },
  tableCardActive: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  tableName: { fontSize: 15, fontWeight: '700' as const, color: '#374151' },
  tableNameActive: { color: '#F97316' },
  tableCapacity: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  tableCapacityActive: { color: '#FB923C' },
  tableOrderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
    marginTop: 6,
  },
  tableOrderBadgeText: { fontSize: 9, fontWeight: '700' as const, color: '#FFFFFF' },
  courseSelector: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  courseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  courseChipActive: { backgroundColor: '#F97316' },
  courseChipText: { fontSize: 12, fontWeight: '600' as const, color: '#6B7280' },
  courseChipTextActive: { color: '#FFFFFF' },
  menuLayout: { flex: 1, flexDirection: 'row' },
  categoriesPanel: {
    width: 100,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  categoryItemActive: { backgroundColor: '#FFF7ED', borderLeftWidth: 3, borderLeftColor: '#F97316' },
  categoryItemText: { fontSize: 12, color: '#6B7280', fontWeight: '500' as const },
  categoryItemTextActive: { color: '#F97316', fontWeight: '700' as const },
  itemsPanel: { flex: 1 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItemInfo: { flex: 1, gap: 2 },
  menuItemName: { fontSize: 14, fontWeight: '600' as const, color: '#1F2937' },
  menuItemDesc: { fontSize: 12, color: '#9CA3AF' },
  menuItemPrice: { fontSize: 13, fontWeight: '700' as const, color: '#F97316' },
  menuItemActions: { flexDirection: 'row', gap: 6 },
  addItemBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemBtnAlt: { backgroundColor: '#3B82F6' },
  altPriceText: { fontSize: 12, fontWeight: '700' as const, color: '#FFFFFF' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  orderList: { padding: 16, gap: 8 },
  orderHeader: { marginBottom: 4 },
  orderHeaderText: { fontSize: 11, fontWeight: '700' as const, color: '#9CA3AF', letterSpacing: 1 },
  emptyOrder: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyOrderText: { fontSize: 18, fontWeight: '700' as const, color: '#D1D5DB' },
  emptyOrderSub: { fontSize: 14, color: '#9CA3AF' },
  orderItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  orderItemLeft: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  orderItemInfo: { flex: 1, gap: 3 },
  orderItemName: { fontSize: 14, fontWeight: '600' as const, color: '#1F2937' },
  orderItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderItemCourse: { fontSize: 11, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' as const },
  orderItemNotes: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' as const },
  orderItemRight: { alignItems: 'flex-end', gap: 6 },
  orderItemPrice: { fontSize: 14, fontWeight: '700' as const, color: '#111827' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnSm: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { fontSize: 18, fontWeight: '700' as const, color: '#1F2937', minWidth: 32, textAlign: 'center' as const },
  qtyValueSm: { fontSize: 14, fontWeight: '700' as const, color: '#1F2937', minWidth: 20, textAlign: 'center' as const },
  orderFooter: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 12, fontWeight: '700' as const, color: '#9CA3AF', letterSpacing: 1 },
  totalAmount: { fontSize: 22, fontWeight: '800' as const, color: '#111827' },
  footerButtons: { flexDirection: 'row', gap: 10 },
  addMoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  addMoreBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#F97316' },
  sendKitchenBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#1A1A2E',
  },
  sendKitchenBtnDisabled: { backgroundColor: '#9CA3AF' },
  sendKitchenBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#FFFFFF' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center' as const,
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' as const, color: '#111827' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginTop: -8 },
  modalField: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: '#374151' },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600' as const, color: '#6B7280' },
  primaryBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
});
