import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Printer,
  CheckCircle2,
  Settings,
  FileEdit,
  Info,
} from 'lucide-react-native';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string | null;
  course: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  addOns?: string[];
  characteristics?: string[];
  stockCount?: number | null;
}

interface ComandaOrder {
  id: string;
  tableName: string;
  locationName?: string | null;
  waiterName?: string | null;
  guests: number;
  status: string;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  orderNumber?: number;
}

type CardStatus = 'pending' | 'prepared' | 'served';
type ItemDisplayStatus = 'pending' | 'initiated' | 'finished' | 'cancelled';
type FilterStatus = 'all' | 'pending' | 'prepared' | 'served';
type SortMode = 'all' | 'byDate' | 'byFamily';

const COURSE_LABELS: Record<string, string> = {
  starter: 'Entrantes',
  main: 'Segundos',
  dessert: 'Postres',
  drink: 'Bebidas',
  other: 'Otros',
};

const COURSE_HEADER_COLORS: Record<string, string> = {
  drink: '#1565C0',
  starter: '#E65100',
  main: '#F9A825',
  dessert: '#6A1B9A',
  other: '#546E7A',
};

const CARD_STATUS_COLORS: Record<CardStatus, string> = {
  pending: '#FFF176',
  prepared: '#81C784',
  served: '#EF9A9A',
};

const CARD_BORDER_COLORS: Record<CardStatus, string> = {
  pending: '#F9A825',
  prepared: '#F97316',
  served: '#E57373',
};

function getCardStatus(items: OrderItem[]): CardStatus {
  const allReady = items.every(i => i.status === 'ready' || i.status === 'served');
  const allServed = items.every(i => i.status === 'served');
  if (allServed) return 'served';
  if (allReady) return 'prepared';
  return 'pending';
}

function getItemDisplayStatus(status: string): ItemDisplayStatus {
  switch (status) {
    case 'preparing': return 'initiated';
    case 'ready': return 'finished';
    case 'served': return 'finished';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function OrderCard({
  order,
  orderIndex,
  onMarkPreparing,
  onMarkReady,
  onMarkAllReady,
}: {
  order: ComandaOrder;
  orderIndex: number;
  onMarkPreparing: (itemId: string, orderId: string) => void;
  onMarkReady: (itemId: string, orderId: string) => void;
  onMarkAllReady: (orderId: string) => void;
}) {
  const cardStatus = getCardStatus(order.items);
  const elapsedMins = getElapsedMinutes(order.createdAt);
  const headerColor = CARD_STATUS_COLORS[cardStatus];
  const borderColor = CARD_BORDER_COLORS[cardStatus];
  const isPrepared = cardStatus === 'prepared';

  const groupedByCourse = useMemo(() => {
    const groups: Record<string, OrderItem[]> = {};
    order.items.forEach(item => {
      const course = item.course || 'other';
      if (!groups[course]) groups[course] = [];
      groups[course].push(item);
    });
    return groups;
  }, [order.items]);

  const locationPart = order.locationName ? `/${order.locationName}` : '';
  const orderLabel = `#${order.orderNumber ?? orderIndex + 1}${locationPart}/${order.tableName}`;

  return (
    <View style={[styles.card, { borderColor }]}>
      <View style={[styles.cardHeader, { backgroundColor: headerColor }]}>
        <View style={styles.cardHeaderTop}>
          <Text style={styles.cardHeaderTitle} numberOfLines={1}>
            <Text style={styles.cardHeaderBold}>{orderLabel}</Text>
          </Text>
          <Text style={styles.cardHeaderTime}>{elapsedMins} min.</Text>
        </View>
        <View style={styles.cardHeaderBottom}>
          {Object.keys(groupedByCourse).map(course => (
            <Text key={course} style={styles.cardCategoryLabel}>
              {COURSE_LABELS[course] ?? course}
            </Text>
          ))}
          {isPrepared && (
            <View style={styles.cardHeaderActions}>
              <TouchableOpacity style={styles.cardActionBtn} onPress={() => {}}>
                <Info size={16} color="#455A64" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardActionBtn} onPress={() => {}}>
                <Printer size={16} color="#455A64" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardActionBtn} onPress={() => onMarkAllReady(order.id)}>
                <CheckCircle2 size={16} color="#43A047" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        {Object.entries(groupedByCourse).map(([course, items]) => (
          <View key={course} style={styles.courseGroup}>
            {Object.keys(groupedByCourse).length > 1 && (
              <Text style={styles.courseGroupLabel}>{COURSE_LABELS[course] ?? course}</Text>
            )}
            {items.map((item, idx) => {
              const displayStatus = getItemDisplayStatus(item.status);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemRow,
                    idx % 2 === 1 && styles.itemRowAlt,
                  ]}
                  onPress={() => {
                    if (item.status === 'pending') {
                      onMarkPreparing(item.id, order.id);
                    } else if (item.status === 'preparing') {
                      onMarkReady(item.id, order.id);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemContent}>
                    <Text
                      style={[
                        styles.itemText,
                        displayStatus === 'initiated' && styles.itemTextInitiated,
                        displayStatus === 'finished' && styles.itemTextFinished,
                        displayStatus === 'cancelled' && styles.itemTextCancelled,
                      ]}
                    >
                      {item.quantity} x {item.name}
                    </Text>
                    {item.addOns && item.addOns.length > 0 && (
                      <View style={styles.addOnsWrap}>
                        {item.addOns.map((addon, aIdx) => (
                          <Text
                            key={aIdx}
                            style={[
                              styles.addOnText,
                              displayStatus === 'initiated' && styles.addOnTextInitiated,
                            ]}
                          >
                            {'  '}c/ {addon}
                          </Text>
                        ))}
                      </View>
                    )}
                    {item.characteristics && item.characteristics.length > 0 && (
                      <Text
                        style={[
                          styles.characteristicText,
                          displayStatus === 'initiated' && styles.characteristicTextInitiated,
                        ]}
                      >
                        {'  '}* {item.characteristics.join(', ')} *
                      </Text>
                    )}
                    {item.notes && (
                      <Text style={styles.notesText}>{'  '}📝 {item.notes}</Text>
                    )}
                  </View>
                  {item.status === 'pending' && item.stockCount != null && (
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockBadgeText}>{item.stockCount}</Text>
                    </View>
                  )}
                  {item.status === 'preparing' && (
                    <View style={styles.cookingIcon}>
                      <Text style={styles.cookingIconText}>🔥</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryColumn({ orders, course }: { orders: ComandaOrder[]; course: string }) {
  const aggregated = useMemo(() => {
    const map: Record<string, { name: string; total: number; stockCount?: number | null }> = {};
    orders.forEach(order => {
      order.items
        .filter(i => i.course === course && (i.status === 'pending' || i.status === 'preparing'))
        .forEach(item => {
          const key = item.name;
          if (!map[key]) {
            map[key] = { name: item.name, total: 0, stockCount: item.stockCount };
          }
          map[key].total += item.quantity;
        });
    });
    return Object.values(map);
  }, [orders, course]);

  if (aggregated.length === 0) return null;

  const headerColor = COURSE_HEADER_COLORS[course] ?? '#546E7A';

  return (
    <View style={styles.summaryColumn}>
      <View style={[styles.summaryHeader, { backgroundColor: headerColor }]}>
        <Text style={styles.summaryHeaderText}>{COURSE_LABELS[course] ?? course}</Text>
      </View>
      <View style={styles.summaryBody}>
        {aggregated.map((item, idx) => (
          <View key={idx} style={[styles.summaryItem, idx % 2 === 1 && styles.summaryItemAlt]}>
            <Text style={styles.summaryItemText}>
              {item.total > 1 ? `${item.total} x ` : '1 x '}{item.name}
            </Text>
            {item.stockCount != null && (
              <View style={styles.stockBadge}>
                <Text style={styles.stockBadgeText}>{item.stockCount}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function KitchenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string; restaurantName: string }>();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [sortMode, setSortMode] = useState<SortMode>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [, setLastUpdate] = useState(new Date());
  const ITEMS_PER_PAGE = 20;

  const ordersQuery = trpc.comandas.listOrders.useQuery(
    { restaurantId: restaurantId ?? '', status: 'open' },
    { enabled: !!restaurantId, refetchInterval: 5000 }
  );

  const updateItemMutation = trpc.comandas.updateItem.useMutation();

  useEffect(() => {
    if (ordersQuery.dataUpdatedAt) {
      setLastUpdate(new Date());
    }
  }, [ordersQuery.dataUpdatedAt]);

  const allOrders = useMemo(() => {
    return (ordersQuery.data as ComandaOrder[] | undefined) ?? [];
  }, [ordersQuery.data]);

  const filteredOrders = useMemo(() => {
    let result = allOrders.filter(o => o.items.length > 0);

    if (filterStatus === 'pending') {
      result = result.filter(o => getCardStatus(o.items) === 'pending');
    } else if (filterStatus === 'prepared') {
      result = result.filter(o => getCardStatus(o.items) === 'prepared');
    } else if (filterStatus === 'served') {
      result = result.filter(o => getCardStatus(o.items) === 'served');
    }

    if (sortMode === 'byDate') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return result;
  }, [allOrders, filterStatus, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const pagedOrders = filteredOrders.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const activeCourses = useMemo(() => {
    const courses = new Set<string>();
    allOrders.forEach(o => o.items.forEach(i => {
      if (i.status === 'pending' || i.status === 'preparing') {
        courses.add(i.course);
      }
    }));
    return Array.from(courses);
  }, [allOrders]);



  const handleMarkPreparing = useCallback(async (itemId: string, orderId: string) => {
    try {
      await updateItemMutation.mutateAsync({ itemId, orderId, status: 'preparing' });
      await ordersQuery.refetch();
    } catch (err) {
      console.log('[KITCHEN] Error marking preparing:', err);
    }
  }, [updateItemMutation, ordersQuery]);

  const handleMarkReady = useCallback(async (itemId: string, orderId: string) => {
    try {
      await updateItemMutation.mutateAsync({ itemId, orderId, status: 'ready' });
      await ordersQuery.refetch();
    } catch (err) {
      console.log('[KITCHEN] Error marking ready:', err);
    }
  }, [updateItemMutation, ordersQuery]);

  const handleMarkAllReady = useCallback(async (orderId: string) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    try {
      for (const item of order.items) {
        if (item.status !== 'ready' && item.status !== 'served') {
          await updateItemMutation.mutateAsync({ itemId: item.id, orderId, status: 'ready' });
        }
      }
      await ordersQuery.refetch();
    } catch (err) {
      console.log('[KITCHEN] Error marking all ready:', err);
    }
  }, [allOrders, updateItemMutation, ordersQuery]);

  const handleMarkAllServed = useCallback(async () => {
    const readyOrders = allOrders.filter(o => getCardStatus(o.items) === 'prepared');
    try {
      for (const order of readyOrders) {
        for (const item of order.items) {
          if (item.status === 'ready') {
            await updateItemMutation.mutateAsync({ itemId: item.id, orderId: order.id, status: 'served' });
          }
        }
      }
      await ordersQuery.refetch();
    } catch (err) {
      console.log('[KITCHEN] Error marking all served:', err);
    }
  }, [allOrders, updateItemMutation, ordersQuery]);

  const filterLabel = filterStatus === 'all' ? 'Todos' :
    filterStatus === 'pending' ? 'Pendiente' :
    filterStatus === 'prepared' ? 'Preparada' : 'Terminada';

  const sortLabel = sortMode === 'all' ? `Todos (${filteredOrders.length})` :
    sortMode === 'byDate' ? 'Por Fecha' : 'Por Familia';

  const cycleFilter = () => {
    const order: FilterStatus[] = ['pending', 'prepared', 'served', 'all'];
    const idx = order.indexOf(filterStatus);
    setFilterStatus(order[(idx + 1) % order.length]);
    setCurrentPage(0);
  };

  const cycleSort = () => {
    const order: SortMode[] = ['all', 'byDate', 'byFamily'];
    const idx = order.indexOf(sortMode);
    setSortMode(order[(idx + 1) % order.length]);
  };

  if (ordersQuery.isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#F9A825" size="large" />
          <Text style={styles.loadingText}>Cargando comandas...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {sortMode === 'byFamily' ? (
        <ScrollView
          horizontal
          contentContainerStyle={styles.familyViewContainer}
          showsHorizontalScrollIndicator={false}
        >
          {activeCourses.map(course => (
            <View key={course} style={styles.familyColumn}>
              <SummaryColumn orders={allOrders} course={course} />
              {filteredOrders
                .filter(o => o.items.some(i => i.course === course))
                .map((order, idx) => (
                  <OrderCard
                    key={order.id}
                    order={{
                      ...order,
                      items: order.items.filter(i => i.course === course),
                    }}
                    orderIndex={idx}
                    onMarkPreparing={handleMarkPreparing}
                    onMarkReady={handleMarkReady}
                    onMarkAllReady={handleMarkAllReady}
                  />
                ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.gridContainer, { paddingBottom: insets.bottom + 70 }]}
          showsVerticalScrollIndicator={false}
        >
          {activeCourses.length > 0 && filterStatus === 'pending' && (
            <View style={styles.summaryRow}>
              {activeCourses.map(course => (
                <SummaryColumn key={course} orders={allOrders} course={course} />
              ))}
            </View>
          )}

          {pagedOrders.length === 0 ? (
            <View style={styles.emptyWrap}>
              <CheckCircle2 size={64} color="#81C784" />
              <Text style={styles.emptyTitle}>¡Todo al día!</Text>
              <Text style={styles.emptySub}>No hay pedidos en este estado.</Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {pagedOrders.map((order, idx) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  orderIndex={currentPage * ITEMS_PER_PAGE + idx}
                  onMarkPreparing={handleMarkPreparing}
                  onMarkReady={handleMarkReady}
                  onMarkAllReady={handleMarkAllReady}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
        <View style={styles.bottomBarLeft}>
          <TouchableOpacity style={styles.filterBtn} onPress={cycleFilter}>
            <Text style={styles.filterBtnText}>{filterLabel}</Text>
            <Text style={styles.filterArrow}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={cycleSort}>
            <Text style={styles.filterBtnText}>{sortLabel}</Text>
            <Text style={styles.filterArrow}>▾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomBarCenter}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentPage(0)}
            disabled={currentPage === 0}
          >
            <ChevronsLeft size={18} color={currentPage === 0 ? '#BDBDBD' : '#455A64'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft size={18} color={currentPage === 0 ? '#BDBDBD' : '#455A64'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronRight size={18} color={currentPage >= totalPages - 1 ? '#BDBDBD' : '#455A64'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronsRight size={18} color={currentPage >= totalPages - 1 ? '#BDBDBD' : '#455A64'} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomBarRight}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
            <FileEdit size={20} color="#455A64" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
            <Printer size={20} color="#455A64" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleMarkAllServed}>
            <CheckCircle2 size={20} color="#43A047" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.back()}>
            <Settings size={20} color="#455A64" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#757575',
  },
  gridContainer: {
    padding: 12,
    gap: 12,
  },
  familyViewContainer: {
    padding: 12,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  familyColumn: {
    width: 300,
    gap: 10,
    marginRight: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  summaryColumn: {
    flex: 1,
    minWidth: 180,
    borderRadius: 4,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryHeader: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  summaryHeaderText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  summaryBody: {},
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  summaryItemAlt: {
    backgroundColor: '#F5F5F5',
  },
  summaryItemText: {
    fontSize: 13,
    color: '#37474F',
    flex: 1,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  card: {
    borderWidth: 2,
    borderRadius: 6,
    overflow: 'hidden' as const,
    width: Platform.OS === 'web' ? 290 : '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
    fontWeight: '700' as const,
  },
  cardHeaderBold: {
    fontWeight: '800' as const,
    fontSize: 14,
    color: '#000000',
  },
  cardHeaderTime: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginLeft: 8,
  },
  cardHeaderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap' as const,
  },
  cardCategoryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#212121',
  },
  cardHeaderActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto' as any,
  },
  cardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardBody: {
    paddingBottom: 2,
  },
  courseGroup: {
    marginTop: 2,
  },
  courseGroupLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#37474F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ECEFF1',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  itemRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 13,
    color: '#212121',
  },
  itemTextInitiated: {
    color: '#2E7D32',
    fontStyle: 'italic' as const,
  },
  itemTextFinished: {
    color: '#78909C',
    textDecorationLine: 'line-through' as const,
    fontStyle: 'italic' as const,
  },
  itemTextCancelled: {
    color: '#C62828',
    textDecorationLine: 'line-through' as const,
    fontStyle: 'italic' as const,
  },
  addOnsWrap: {
    marginTop: 1,
  },
  addOnText: {
    fontSize: 12,
    color: '#455A64',
  },
  addOnTextInitiated: {
    color: '#2E7D32',
    fontStyle: 'italic' as const,
  },
  characteristicText: {
    fontSize: 12,
    color: '#455A64',
    fontStyle: 'italic' as const,
  },
  characteristicTextInitiated: {
    color: '#2E7D32',
  },
  notesText: {
    fontSize: 11,
    color: '#78909C',
    fontStyle: 'italic' as const,
    marginTop: 1,
  },
  stockBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#9E9E9E',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: '#FFFFFF',
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#424242',
  },
  cookingIcon: {
    marginLeft: 8,
  },
  cookingIconText: {
    fontSize: 16,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#43A047',
  },
  emptySub: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center' as const,
  },
  bottomBar: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingTop: 6,
    minHeight: 48,
  },
  bottomBarLeft: {
    flexDirection: 'row',
    gap: 6,
  },
  bottomBarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bottomBarRight: {
    flexDirection: 'row',
    gap: 4,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  filterBtnText: {
    fontSize: 12,
    color: '#424242',
  },
  filterArrow: {
    fontSize: 10,
    color: '#757575',
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
