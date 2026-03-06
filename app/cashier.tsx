import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import {
  ArrowLeft,
  Printer,
  X,
  CheckCircle,
  Clock,
  Users,
  Receipt,
  Utensils,
  RefreshCw,
  Euro,
} from 'lucide-react-native';

interface OrderItem {
  id: string;
  menuItemId?: string | null;
  name: string;
  price: number;
  priceVariant: string;
  priceVariantName?: string | null;
  quantity: number;
  notes?: string | null;
  course: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  preparing: '#3B82F6',
  ready: '#10B981',
  served: '#9CA3AF',
};

const COURSE_LABELS: Record<string, string> = {
  starter: 'Entrante',
  main: 'Principal',
  dessert: 'Postre',
  drink: 'Bebida',
  other: 'Otro',
};

export default function CashierScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { restaurantId, restaurantName } = useLocalSearchParams<{ restaurantId: string; restaurantName: string }>();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ComandaOrder | null>(null);
  const [showClosedOrders, setShowClosedOrders] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  const openOrdersQuery = trpc.comandas.listOrders.useQuery(
    { restaurantId: restaurantId ?? '', status: 'open' },
    { enabled: !!restaurantId, refetchInterval: 10000 }
  );

  const closedOrdersQuery = trpc.comandas.listOrders.useQuery(
    { restaurantId: restaurantId ?? '', status: 'closed' },
    { enabled: !!restaurantId && showClosedOrders }
  );

  const getOrderQuery = trpc.comandas.getOrder.useQuery(
    { orderId: selectedOrderId ?? '' },
    { enabled: !!selectedOrderId, refetchInterval: 8000 }
  );

  const updateOrderMutation = trpc.comandas.updateOrder.useMutation();
  const updateItemMutation = trpc.comandas.updateItem.useMutation();

  useEffect(() => {
    if (getOrderQuery.data) {
      setSelectedOrder(getOrderQuery.data as ComandaOrder);
    }
  }, [getOrderQuery.data]);

  const handleCloseOrder = async () => {
    if (!selectedOrderId) return;
    Alert.alert('Cerrar Comanda', '¿Marcar esta comanda como pagada/cerrada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar y Cobrar',
        onPress: async () => {
          try {
            await updateOrderMutation.mutateAsync({ orderId: selectedOrderId!, status: 'closed' });
            await openOrdersQuery.refetch();
            setSelectedOrderId(null);
            setSelectedOrder(null);
          } catch {
            Alert.alert('Error', 'No se pudo cerrar la comanda.');
          }
        }
      }
    ]);
  };

  const handlePrint = () => {
    if (!selectedOrder) return;
    setShowPrintModal(true);
    if (Platform.OS === 'web') {
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  const handleMarkAllServed = async () => {
    if (!selectedOrderId || !selectedOrder) return;
    const unservedItems = selectedOrder.items.filter(i => i.status !== 'served');
    for (const item of unservedItems) {
      try {
        await updateItemMutation.mutateAsync({ itemId: item.id, orderId: selectedOrderId!, status: 'served' });
      } catch {}
    }
    await getOrderQuery.refetch();
  };

  const displayOrders: ComandaOrder[] = (showClosedOrders ? (closedOrdersQuery.data ?? []) : (openOrdersQuery.data ?? [])) as ComandaOrder[];
  const filteredOrders = searchText
    ? displayOrders.filter((o: ComandaOrder) => o.tableName.toLowerCase().includes(searchText.toLowerCase()) || o.waiterName?.toLowerCase().includes(searchText.toLowerCase()))
    : displayOrders;

  const totalOpen = openOrdersQuery.data?.length ?? 0;
  const totalRevenue = (openOrdersQuery.data as ComandaOrder[] | undefined)?.reduce((sum: number, o: ComandaOrder) => sum + (o.totalAmount ?? 0), 0) ?? 0;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>PC / Caja</Text>
          <Text style={styles.topBarSub}>{restaurantName || 'Restaurante'}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => { openOrdersQuery.refetch(); if (selectedOrderId) getOrderQuery.refetch(); }}>
          <RefreshCw size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Utensils size={16} color="#F97316" />
          <Text style={styles.statValue}>{totalOpen}</Text>
          <Text style={styles.statLabel}>Mesas abiertas</Text>
        </View>
        <View style={[styles.statCard, styles.statCardHighlight]}>
          <Euro size={16} color="#FFFFFF" />
          <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{totalRevenue.toFixed(2)} €</Text>
          <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Total pendiente</Text>
        </View>
        <View style={styles.statCard}>
          <Receipt size={16} color="#6B7280" />
          <Text style={styles.statValue}>{(openOrdersQuery.data as ComandaOrder[] | undefined)?.reduce((s: number, o: ComandaOrder) => s + o.items.length, 0) ?? 0}</Text>
          <Text style={styles.statLabel}>Items totales</Text>
        </View>
      </View>

      <View style={styles.mainLayout}>
        <View style={styles.ordersPanel}>
          <View style={styles.ordersPanelHeader}>
            <TouchableOpacity
              style={[styles.tabBtn, !showClosedOrders && styles.tabBtnActive]}
              onPress={() => setShowClosedOrders(false)}
            >
              <Text style={[styles.tabBtnText, !showClosedOrders && styles.tabBtnTextActive]}>Abiertas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, showClosedOrders && styles.tabBtnActive]}
              onPress={() => setShowClosedOrders(true)}
            >
              <Text style={[styles.tabBtnText, showClosedOrders && styles.tabBtnTextActive]}>Cerradas</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar mesa o camarero..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {(showClosedOrders ? closedOrdersQuery.isLoading : openOrdersQuery.isLoading) ? (
            <ActivityIndicator color="#F97316" style={{ marginTop: 30 }} />
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <CheckCircle size={32} color="#D1D5DB" />
              <Text style={styles.emptyOrdersText}>Sin comandas {showClosedOrders ? 'cerradas' : 'abiertas'}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOrders}
              keyExtractor={(o: ComandaOrder) => o.id}
              renderItem={({ item: order }: { item: ComandaOrder }) => {
                const isSelected = selectedOrderId === order.id;
                const readyCount = order.items.filter((i: OrderItem) => i.status === 'ready').length;
                return (
                  <TouchableOpacity
                    style={[styles.orderListItem, isSelected && styles.orderListItemSelected]}
                    onPress={() => setSelectedOrderId(order.id)}
                    testID={`cashier-order-${order.id}`}
                  >
                    <View style={styles.orderListItemTop}>
                      <Text style={[styles.orderListTableName, isSelected && styles.orderListTableNameSelected]}>
                        {order.tableName}
                      </Text>
                      <Text style={[styles.orderListTotal, isSelected && styles.orderListTotalSelected]}>
                        {(order.totalAmount ?? 0).toFixed(2)}€
                      </Text>
                    </View>
                    <View style={styles.orderListItemBottom}>
                      <View style={styles.orderListMeta}>
                        <Users size={10} color="#9CA3AF" />
                        <Text style={styles.orderListMetaText}>{order.guests} pax</Text>
                        <Clock size={10} color="#9CA3AF" />
                        <Text style={styles.orderListMetaText}>{formatTime(order.createdAt)}</Text>
                        {order.waiterName && <Text style={styles.orderListMetaText}>· {order.waiterName}</Text>}
                      </View>
                      {readyCount > 0 && (
                        <View style={styles.readyBadge}>
                          <Text style={styles.readyBadgeText}>{readyCount} listos</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            />
          )}
        </View>

        <View style={styles.detailPanel}>
          {!selectedOrder ? (
            <View style={styles.noOrderSelected}>
              <Receipt size={56} color="#E5E7EB" />
              <Text style={styles.noOrderTitle}>Selecciona una comanda</Text>
              <Text style={styles.noOrderSub}>Pulsa en cualquier mesa de la izquierda para ver los detalles</Text>
            </View>
          ) : (
            <>
              <View style={styles.detailHeader}>
                <View>
                  <Text style={styles.detailTableName}>{selectedOrder.tableName}</Text>
                  <Text style={styles.detailMeta}>
                    {selectedOrder.guests} comensales · {formatTime(selectedOrder.createdAt)}
                    {selectedOrder.waiterName ? ` · ${selectedOrder.waiterName}` : ''}
                    {selectedOrder.locationName ? ` · ${selectedOrder.locationName}` : ''}
                  </Text>
                </View>
                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
                    <Printer size={16} color="#FFFFFF" />
                    <Text style={styles.printBtnText}>Imprimir</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {(['starter', 'main', 'dessert', 'drink', 'other'] as const).map(course => {
                  const items = selectedOrder.items.filter((i: OrderItem) => i.course === course);
                  if (items.length === 0) return null;
                  return (
                    <View key={course} style={styles.courseSection}>
                      <Text style={styles.courseSectionLabel}>{COURSE_LABELS[course] ?? course}</Text>
                      {items.map(item => (
                        <View key={item.id} style={styles.detailItem}>
                          <View style={[styles.detailStatusDot, { backgroundColor: STATUS_COLORS[item.status] ?? '#9CA3AF' }]} />
                          <View style={styles.detailItemInfo}>
                            <Text style={styles.detailItemName}>{item.quantity}× {item.name}</Text>
                            {item.notes ? <Text style={styles.detailItemNotes}>📝 {item.notes}</Text> : null}
                            {item.priceVariantName ? <Text style={styles.detailItemVariant}>{item.priceVariantName}</Text> : null}
                          </View>
                          <View style={styles.detailItemRight}>
                            <Text style={styles.detailItemPrice}>{(item.price * item.quantity).toFixed(2)}€</Text>
                            <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
                              <Text style={[styles.statusPillText, { color: STATUS_COLORS[item.status] }]}>
                                {item.status === 'pending' ? 'Pendiente' : item.status === 'preparing' ? 'Cocinando' : item.status === 'ready' ? 'Listo' : 'Servido'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={[styles.detailFooter, { paddingBottom: insets.bottom + 12 }]}>
                <View style={styles.totalSection}>
                  <View style={styles.totalRow}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalValue}>{(selectedOrder.totalAmount ?? 0).toFixed(2)} €</Text>
                  </View>
                  <View style={[styles.totalRow, styles.totalFinalRow]}>
                    <Text style={styles.totalFinalLabel}>TOTAL</Text>
                    <Text style={styles.totalFinalValue}>{(selectedOrder.totalAmount ?? 0).toFixed(2)} €</Text>
                  </View>
                </View>
                <View style={styles.detailFooterButtons}>
                  <TouchableOpacity style={styles.markServedBtn} onPress={handleMarkAllServed}>
                    <CheckCircle size={16} color="#10B981" />
                    <Text style={styles.markServedText}>Todo servido</Text>
                  </TouchableOpacity>
                  {selectedOrder.status === 'open' && (
                    <TouchableOpacity style={styles.closeOrderBtn} onPress={handleCloseOrder}>
                      <Euro size={16} color="#FFFFFF" />
                      <Text style={styles.closeOrderBtnText}>Cobrar y Cerrar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      <Modal visible={showPrintModal} transparent animationType="fade">
        <View style={styles.printModalOverlay}>
          <View style={styles.printModalContent}>
            <View style={styles.printModalHeader}>
              <Text style={styles.printModalTitle}>🖨️ Vista de Impresión</Text>
              <TouchableOpacity onPress={() => setShowPrintModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {selectedOrder && (
              <ScrollView style={styles.printPreview}>
                <Text style={styles.printRestaurantName}>{restaurantName || 'Restaurante'}</Text>
                <Text style={styles.printTitle}>RESUMEN DE COMANDA</Text>
                <Text style={styles.printTableInfo}>Mesa: {selectedOrder.tableName}</Text>
                <Text style={styles.printTableInfo}>Comensales: {selectedOrder.guests}</Text>
                <Text style={styles.printTableInfo}>Hora: {formatTime(selectedOrder.createdAt)}</Text>
                {selectedOrder.waiterName && <Text style={styles.printTableInfo}>Camarero: {selectedOrder.waiterName}</Text>}
                <View style={styles.printDivider} />
                {selectedOrder.items.map(item => (
                  <View key={item.id} style={styles.printItem}>
                    <Text style={styles.printItemName}>{item.quantity}× {item.name}</Text>
                    <Text style={styles.printItemPrice}>{(item.price * item.quantity).toFixed(2)}€</Text>
                  </View>
                ))}
                <View style={styles.printDivider} />
                <View style={styles.printTotalRow}>
                  <Text style={styles.printTotalLabel}>TOTAL</Text>
                  <Text style={styles.printTotalValue}>{(selectedOrder.totalAmount ?? 0).toFixed(2)} €</Text>
                </View>
                <Text style={styles.printThanks}>¡Gracias por su visita!</Text>
              </ScrollView>
            )}
            {Platform.OS === 'web' && (
              <TouchableOpacity
                style={styles.printActionBtn}
                onPress={() => { window.print(); }}
              >
                <Printer size={16} color="#FFFFFF" />
                <Text style={styles.printActionBtnText}>Imprimir</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F3460',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: { flex: 1 },
  topBarTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  topBarSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#0F3460',
    paddingBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statCardHighlight: { backgroundColor: '#F97316' },
  statValue: { fontSize: 18, fontWeight: '800' as const, color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600' as const, textAlign: 'center' as const },
  mainLayout: { flex: 1, flexDirection: 'row' },
  ordersPanel: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  ordersPanelHeader: {
    flexDirection: 'row',
    padding: 12,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  tabBtnActive: { backgroundColor: '#0F3460' },
  tabBtnText: { fontSize: 12, fontWeight: '600' as const, color: '#6B7280' },
  tabBtnTextActive: { color: '#FFFFFF' },
  searchBox: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyOrders: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyOrdersText: { fontSize: 14, color: '#9CA3AF' },
  orderListItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    gap: 6,
  },
  orderListItemSelected: { backgroundColor: '#EFF6FF' },
  orderListItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderListTableName: { fontSize: 14, fontWeight: '700' as const, color: '#1F2937' },
  orderListTableNameSelected: { color: '#1D4ED8' },
  orderListTotal: { fontSize: 14, fontWeight: '700' as const, color: '#374151' },
  orderListTotalSelected: { color: '#1D4ED8' },
  orderListItemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderListMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderListMetaText: { fontSize: 11, color: '#9CA3AF' },
  readyBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  readyBadgeText: { fontSize: 10, fontWeight: '700' as const, color: '#065F46' },
  detailPanel: { flex: 1, backgroundColor: '#F8FAFC' },
  noOrderSelected: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  noOrderTitle: { fontSize: 18, fontWeight: '700' as const, color: '#9CA3AF' },
  noOrderSub: { fontSize: 13, color: '#D1D5DB', textAlign: 'center' as const, maxWidth: 260 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailTableName: { fontSize: 20, fontWeight: '800' as const, color: '#111827' },
  detailMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  detailActions: { flexDirection: 'row', gap: 8 },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  printBtnText: { fontSize: 13, fontWeight: '600' as const, color: '#FFFFFF' },
  detailScroll: { flex: 1, padding: 16 },
  courseSection: { marginBottom: 16 },
  courseSectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  detailStatusDot: { width: 8, height: 8, borderRadius: 4 },
  detailItemInfo: { flex: 1, gap: 2 },
  detailItemName: { fontSize: 14, fontWeight: '600' as const, color: '#1F2937' },
  detailItemNotes: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' as const },
  detailItemVariant: { fontSize: 11, color: '#3B82F6' },
  detailItemRight: { alignItems: 'flex-end', gap: 4 },
  detailItemPrice: { fontSize: 14, fontWeight: '700' as const, color: '#111827' },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '700' as const },
  detailFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  totalSection: { gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalFinalRow: {
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#E5E7EB',
  },
  subtotalLabel: { fontSize: 13, color: '#6B7280' },
  subtotalValue: { fontSize: 13, color: '#374151', fontWeight: '600' as const },
  totalFinalLabel: { fontSize: 16, fontWeight: '800' as const, color: '#111827', letterSpacing: 0.5 },
  totalFinalValue: { fontSize: 20, fontWeight: '800' as const, color: '#111827' },
  detailFooterButtons: { flexDirection: 'row', gap: 10 },
  markServedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1FAE5',
    backgroundColor: '#ECFDF5',
  },
  markServedText: { fontSize: 13, fontWeight: '700' as const, color: '#10B981' },
  closeOrderBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F3460',
  },
  closeOrderBtnText: { fontSize: 13, fontWeight: '700' as const, color: '#FFFFFF' },
  printModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  printModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    gap: 16,
  },
  printModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  printModalTitle: { fontSize: 17, fontWeight: '700' as const, color: '#111827' },
  printPreview: { maxHeight: 380 },
  printRestaurantName: { fontSize: 18, fontWeight: '800' as const, color: '#111827', textAlign: 'center' as const, marginBottom: 4 },
  printTitle: { fontSize: 13, fontWeight: '700' as const, color: '#6B7280', textAlign: 'center' as const, letterSpacing: 1 },
  printTableInfo: { fontSize: 13, color: '#374151', marginTop: 4 },
  printDivider: { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginVertical: 10 },
  printItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  printItemName: { fontSize: 13, color: '#374151', flex: 1 },
  printItemPrice: { fontSize: 13, fontWeight: '600' as const, color: '#111827' },
  printTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  printTotalLabel: { fontSize: 15, fontWeight: '800' as const, color: '#111827' },
  printTotalValue: { fontSize: 18, fontWeight: '800' as const, color: '#111827' },
  printThanks: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' as const, marginTop: 16 },
  printActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 12,
  },
  printActionBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
});
