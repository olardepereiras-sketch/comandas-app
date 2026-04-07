#!/bin/bash
set -e

TARGET="/var/www/comandas/comandas-app/app/kitchen.tsx"
APP_DIR="/var/www/comandas/comandas-app"

echo "Escribiendo nuevo kitchen.tsx..."

cat > "$TARGET" << 'ENDOFFILE'
import React, { useState, useCallback, useMemo } from 'react';
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
type FilterStatus = 'all' | 'pending' | 'prepared' | 'served';
type SortMode = 'all' | 'byDate' | 'byFamily';

const COURSE_LABELS: Record<string, string> = {
  starter: 'Primeros',
  main: 'Segundos',
  dessert: 'Postres',
  drink: 'Bebidas',
  other: 'Otros',
};

const COURSE_COLORS: Record<string, string> = {
  drink: '#1565C0',
  starter: '#E65100',
  main: '#F9A825',
  dessert: '#6A1B9A',
  other: '#546E7A',
};

const CARD_HEADER_BG: Record<CardStatus, string> = {
  pending: '#FFF176',
  prepared: '#81C784',
  served: '#EF9A9A',
};

const CARD_BORDER: Record<CardStatus, string> = {
  pending: '#F9A825',
  prepared: '#4CAF50',
  served: '#E57373',
};

function getCardStatus(items: OrderItem[]): CardStatus {
  if (items.length === 0) return 'pending';
  const allDone = items.every(i => i.status === 'ready' || i.status === 'served' || i.status === 'cancelled');
  const allServed = items.every(i => i.status === 'served' || i.status === 'cancelled');
  if (allServed) return 'served';
  if (allDone) return 'prepared';
  return 'pending';
}

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function OrderCard({
  order,
  orderIndex,
  onMarkPreparing,
  onMarkReady,
  onMarkAllServed,
}: {
  order: ComandaOrder;
  orderIndex: number;
  onMarkPreparing: (itemId: string, orderId: string) => void;
  onMarkReady: (itemId: string, orderId: string) => void;
  onMarkAllServed: (orderId: string) => void;
}) {
  const cardStatus = getCardStatus(order.items);
  const elapsedMins = getElapsedMinutes(order.createdAt);
  const headerBg = CARD_HEADER_BG[cardStatus];
  const borderColor = CARD_BORDER[cardStatus];
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

  const courseKeys = Object.keys(groupedByCourse);
  const locationPart = order.locationName ? `${order.locationName}/` : '';
  const orderLabel = `#${order.orderNumber ?? orderIndex + 1}/${locationPart}${order.tableName}`;

  return (
    <View style={[styles.card, { borderColor }]}>
      <View style={[styles.cardHeader, { backgroundColor: headerBg }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardOrderLabel} numberOfLines={1}>{orderLabel}</Text>
          <Text style={styles.cardTime}>{elapsedMins} min.</Text>
        </View>
        <View style={styles.cardHeaderRow2}>
          <View style={styles.cardCategoriesRow}>
            {courseKeys.map(course => (
              <Text key={course} style={styles.cardCategoryTag}>
                {COURSE_LABELS[course] ?? course}
              </Text>
            ))}
          </View>
          {isPrepared && (
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.cardActionBtn} onPress={() => {}}>
                <Info size={15} color="#37474F" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardActionBtn} onPress={() => {}}>
                <Printer size={15} color="#37474F" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cardActionBtn, styles.cardActionBtnGreen]} onPress={() => onMarkAllServed(order.id)}>
                <CheckCircle2 size={15} color="#2E7D32" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        {courseKeys.map((course, cIdx) => {
          const courseItems = groupedByCourse[course];
          return (
            <View key={course}>
              {courseKeys.length > 1 && (
                <View style={[styles.courseDivider, { backgroundColor: COURSE_COLORS[course] ?? '#546E7A' }]}>
                  <Text style={styles.courseDividerText}>{COURSE_LABELS[course] ?? course}</Text>
                </View>
              )}
              {courseItems.map((item, idx) => {
                const globalIdx = cIdx * 100 + idx;
                const isPending = item.status === 'pending';
                const isInitiated = item.status === 'preparing';
                const isFinished = item.status === 'ready' || item.status === 'served';
                const isCancelled = item.status === 'cancelled';

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemRow, globalIdx % 2 === 1 && styles.itemRowAlt]}
                    onPress={() => {
                      if (isPending) onMarkPreparing(item.id, order.id);
                      else if (isInitiated) onMarkReady(item.id, order.id);
                    }}
                    activeOpacity={isPending || isInitiated ? 0.65 : 1}
                  >
                    <View style={styles.itemContent}>
                      <Text
                        style={[
                          styles.itemText,
                          isInitiated && styles.itemTextInitiated,
                          isFinished && styles.itemTextFinished,
                          isCancelled && styles.itemTextCancelled,
                        ]}
                      >
                        {item.quantity} x {item.name}
                      </Text>

                      {isInitiated && item.addOns && item.addOns.length > 0 && (
                        <View style={styles.addOnsWrap}>
                          {item.addOns.map((addon, aIdx) => (
                            <Text key={aIdx} style={styles.addOnTextInitiated}>
                              {'  '}c/ {addon}
                            </Text>
                          ))}
                        </View>
                      )}

                      {!isInitiated && item.addOns && item.addOns.length > 0 && (
                        <View style={styles.addOnsWrap}>
                          {item.addOns.map((addon, aIdx) => (
                            <Text key={aIdx} style={styles.addOnText}>
                              {'  '}c/ {addon}
                            </Text>
                          ))}
                        </View>
                      )}

                      {item.characteristics && item.characteristics.length > 0 && (
                        <Text style={[styles.characteristicText, isInitiated && styles.characteristicTextInitiated]}>
                          {'  '}* {item.characteristics.join(', ')} *
                        </Text>
                      )}

                      {item.notes && (
                        <Text style={styles.notesText}>{'  '}📝 {item.notes}</Text>
                      )}
                    </View>

                    {isPending && item.stockCount != null && (
                      <View style={styles.stockBadge}>
                        <Text style={styles.stockBadgeText}>{item.stockCount}</Text>
                      </View>
                    )}

                    {isInitiated && (
                      <View style={styles.cookingBadge}>
                        <Printer size={13} color="#78909C" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
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
          if (!map[item.name]) map[item.name] = { name: item.name, total: 0, stockCount: item.stockCount };
          map[item.name].total += item.quantity;
        });
    });
    return Object.values(map);
  }, [orders, course]);

  if (aggregated.length === 0) return null;
  const hColor = COURSE_COLORS[course] ?? '#546E7A';

  return (
    <View style={styles.summaryCol}>
      <View style={[styles.summaryColHeader, { backgroundColor: hColor }]}>
        <Text style={styles.summaryColHeaderText}>{COURSE_LABELS[course] ?? course}</Text>
      </View>
      {aggregated.map((item, idx) => (
        <View key={idx} style={[styles.summaryRow, idx % 2 === 1 && styles.summaryRowAlt]}>
          <Text style={styles.summaryRowText}>{item.total} x {item.name}</Text>
          {item.stockCount != null && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>{item.stockCount}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

export default function KitchenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [sortMode, setSortMode] = useState<SortMode>('byDate');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const ordersQuery = trpc.comandas.listOrders.useQuery(
    { restaurantId: restaurantId ?? '', status: 'open' },
    { enabled: !!restaurantId, refetchInterval: 5000 }
  );

  const updateItemMutation = trpc.comandas.updateItem.useMutation();

  const allOrders = useMemo<ComandaOrder[]>(() => {
    return (ordersQuery.data as ComandaOrder[] | undefined) ?? [];
  }, [ordersQuery.data]);

  const filteredOrders = useMemo(() => {
    let result = allOrders.filter(o => o.items.length > 0);
    if (filterStatus !== 'all') {
      result = result.filter(o => getCardStatus(o.items) === filterStatus);
    }
    if (sortMode === 'byDate') {
      result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return result;
  }, [allOrders, filterStatus, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const pagedOrders = filteredOrders.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const activeCourses = useMemo(() => {
    const s = new Set<string>();
    allOrders.forEach(o => o.items.forEach(i => {
      if (i.status === 'pending' || i.status === 'preparing') s.add(i.course);
    }));
    return Array.from(s);
  }, [allOrders]);

  const handleMarkPreparing = useCallback(async (itemId: string, orderId: string) => {
    try {
      await updateItemMutation.mutateAsync({ itemId, orderId, status: 'preparing' });
      ordersQuery.refetch();
    } catch (err) {
      console.log('[KITCHEN] markPreparing error:', err);
    }
  }, [updateItemMutation, ordersQuery]);

  const handleMarkReady = useCallback(async (itemId: string, orderId: string) => {
    try {
      await updateItemMutation.mutateAsync({ itemId, orderId, status: 'ready' });
      ordersQuery.refetch();
    } catch (err) {
      console.log('[KITCHEN] markReady error:', err);
    }
  }, [updateItemMutation, ordersQuery]);

  const handleMarkAllServed = useCallback(async (orderId: string) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    try {
      for (const item of order.items) {
        if (item.status === 'ready') {
          await updateItemMutation.mutateAsync({ itemId: item.id, orderId, status: 'served' });
        }
      }
      ordersQuery.refetch();
    } catch (err) {
      console.log('[KITCHEN] markAllServed error:', err);
    }
  }, [allOrders, updateItemMutation, ordersQuery]);

  const handleMarkAllReadyGlobal = useCallback(async () => {
    const readyOrders = allOrders.filter(o => getCardStatus(o.items) === 'prepared');
    try {
      for (const order of readyOrders) {
        for (const item of order.items) {
          if (item.status === 'ready') {
            await updateItemMutation.mutateAsync({ itemId: item.id, orderId: order.id, status: 'served' });
          }
        }
      }
      ordersQuery.refetch();
    } catch (err) {
      console.log('[KITCHEN] markAllReadyGlobal error:', err);
    }
  }, [allOrders, updateItemMutation, ordersQuery]);

  const FILTER_OPTIONS: FilterStatus[] = ['pending', 'prepared', 'served', 'all'];
  const SORT_OPTIONS: SortMode[] = ['byDate', 'byFamily', 'all'];

  const filterLabel =
    filterStatus === 'all' ? 'Todos' :
    filterStatus === 'pending' ? 'Pendiente' :
    filterStatus === 'prepared' ? 'Preparada' : 'Terminada';

  const sortLabel =
    sortMode === 'all' ? 'Todos' :
    sortMode === 'byDate' ? 'Por Fecha' : 'Por Familia';

  const cycleFilter = () => {
    const idx = FILTER_OPTIONS.indexOf(filterStatus);
    setFilterStatus(FILTER_OPTIONS[(idx + 1) % FILTER_OPTIONS.length]);
    setCurrentPage(0);
  };

  const cycleSort = () => {
    const idx = SORT_OPTIONS.indexOf(sortMode);
    setSortMode(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length]);
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

  const bottomPad = Math.max(insets.bottom, 4) + 52;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {sortMode === 'byFamily' ? (
        <ScrollView
          horizontal
          contentContainerStyle={[styles.familyContainer, { paddingBottom: bottomPad }]}
          showsHorizontalScrollIndicator
        >
          {activeCourses.map(course => (
            <View key={course} style={styles.familyColumn}>
              <SummaryColumn orders={allOrders} course={course} />
              {filteredOrders
                .filter(o => o.items.some(i => i.course === course))
                .map((order, idx) => (
                  <OrderCard
                    key={order.id}
                    order={{ ...order, items: order.items.filter(i => i.course === course) }}
                    orderIndex={idx}
                    onMarkPreparing={handleMarkPreparing}
                    onMarkReady={handleMarkReady}
                    onMarkAllServed={handleMarkAllServed}
                  />
                ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.gridContainer, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          {activeCourses.length > 0 && filterStatus === 'pending' && (
            <View style={styles.summarySection}>
              {activeCourses.map(course => (
                <SummaryColumn key={course} orders={allOrders} course={course} />
              ))}
            </View>
          )}

          {pagedOrders.length === 0 ? (
            <View style={styles.emptyWrap}>
              <CheckCircle2 size={56} color="#81C784" />
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
                  onMarkAllServed={handleMarkAllServed}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
        <View style={styles.barLeft}>
          <TouchableOpacity style={styles.dropBtn} onPress={cycleFilter}>
            <Text style={styles.dropBtnText}>{filterLabel}</Text>
            <Text style={styles.dropArrow}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropBtn} onPress={cycleSort}>
            <Text style={styles.dropBtnText}>{sortLabel}</Text>
            <Text style={styles.dropArrow}>▾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.barCenter}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentPage(0)} disabled={currentPage === 0}>
            <ChevronsLeft size={18} color={currentPage === 0 ? '#BDBDBD' : '#37474F'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
            <ChevronLeft size={18} color={currentPage === 0 ? '#BDBDBD' : '#37474F'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}>
            <ChevronRight size={18} color={currentPage >= totalPages - 1 ? '#BDBDBD' : '#37474F'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentPage(totalPages - 1)} disabled={currentPage >= totalPages - 1}>
            <ChevronsRight size={18} color={currentPage >= totalPages - 1 ? '#BDBDBD' : '#37474F'} />
          </TouchableOpacity>
        </View>

        <View style={styles.barRight}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
            <FileEdit size={19} color="#546E7A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
            <Printer size={19} color="#546E7A" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={handleMarkAllReadyGlobal}>
            <CheckCircle2 size={19} color="#2E7D32" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.back()}>
            <Settings size={19} color="#546E7A" />
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
    padding: 10,
    gap: 10,
  },
  familyContainer: {
    padding: 10,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  familyColumn: {
    width: 280,
    gap: 8,
    marginRight: 10,
  },
  summarySection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  summaryCol: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  summaryColHeader: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  summaryColHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  summaryRowAlt: {
    backgroundColor: '#F5F5F5',
  },
  summaryRowText: {
    fontSize: 13,
    color: '#37474F',
    flex: 1,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    borderWidth: 2,
    borderRadius: 4,
    overflow: 'hidden',
    width: Platform.OS === 'web' ? 285 : '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardOrderLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    flex: 1,
  },
  cardTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 6,
  },
  cardHeaderRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardCategoriesRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cardCategoryTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212121',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 3,
    marginLeft: 6,
  },
  cardActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionBtnGreen: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: '#A5D6A7',
  },
  cardBody: {
    backgroundColor: '#FFFFFF',
  },
  courseDivider: {
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  courseDividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  itemRowAlt: {
    backgroundColor: '#F5F5F5',
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
    fontStyle: 'italic',
  },
  itemTextFinished: {
    color: '#9E9E9E',
    fontStyle: 'italic',
    textDecorationLine: 'line-through',
  },
  itemTextCancelled: {
    color: '#C62828',
    fontStyle: 'italic',
    textDecorationLine: 'line-through',
  },
  addOnsWrap: {
    marginTop: 1,
  },
  addOnText: {
    fontSize: 12,
    color: '#546E7A',
  },
  addOnTextInitiated: {
    fontSize: 12,
    color: '#2E7D32',
    fontStyle: 'italic',
  },
  characteristicText: {
    fontSize: 12,
    color: '#546E7A',
    fontStyle: 'italic',
  },
  characteristicTextInitiated: {
    color: '#2E7D32',
  },
  notesText: {
    fontSize: 11,
    color: '#78909C',
    fontStyle: 'italic',
    marginTop: 1,
  },
  stockBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#9E9E9E',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 1,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#424242',
  },
  cookingBadge: {
    marginLeft: 8,
    marginTop: 2,
    opacity: 0.5,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#43A047',
  },
  emptySub: {
    fontSize: 13,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#DEDEDE',
    paddingHorizontal: 8,
    paddingTop: 5,
    minHeight: 46,
  },
  barLeft: {
    flexDirection: 'row',
    gap: 5,
  },
  barCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  barRight: {
    flexDirection: 'row',
    gap: 3,
  },
  dropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 3,
  },
  dropBtnText: {
    fontSize: 12,
    color: '#37474F',
  },
  dropArrow: {
    fontSize: 9,
    color: '#757575',
  },
  navBtn: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnGreen: {
    borderColor: '#A5D6A7',
  },
});
ENDOFFILE

echo "kitchen.tsx actualizado."

echo "Reconstruyendo web..."
cd "$APP_DIR"
./node_modules/.bin/expo export --platform web

echo "Desplegando a nginx..."
sudo mkdir -p /var/www/html/comandas
sudo cp -r dist/* /var/www/html/comandas/
sudo chown -R www-data:www-data /var/www/html/comandas/
sudo systemctl reload nginx

echo "✅ Listo! Recarga https://quieromesa.com/restaurant/comandas"
