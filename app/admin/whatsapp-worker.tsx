import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, TextInput, Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import {
  Trash2, Send, Search, Filter, Clock, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp,
  MessageSquare,
} from 'lucide-react-native';

type NotificationStatus = 'all' | 'pending' | 'processing' | 'sent' | 'failed';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  processing: { label: 'Procesando', color: '#3b82f6', bg: '#dbeafe', icon: RefreshCw },
  sent: { label: 'Enviado', color: '#10b981', bg: '#d1fae5', icon: CheckCircle },
  failed: { label: 'Fallido', color: '#ef4444', bg: '#fee2e2', icon: XCircle },
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  reservation_created: 'Reserva creada',
  reservation_confirmed: 'Reserva confirmada',
  reservation_cancelled: 'Reserva cancelada',
  reservation_modified: 'Reserva modificada',
  reminder_24h: 'Recordatorio 24h',
  reminder_60m: 'Recordatorio 60min',
  restaurant_notification: 'Notificación restaurante',
};

export default function WhatsAppWorkerScreen() {
  const [statusFilter, setStatusFilter] = useState<NotificationStatus>('pending');
  const [restaurantFilter, setRestaurantFilter] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const notificationsQuery = trpc.whatsapp.listNotifications.useQuery(
    {
      restaurantId: restaurantFilter || undefined,
      status: statusFilter,
    },
    { refetchInterval: 10000 }
  );

  const restaurantsQuery = trpc.restaurants.list.useQuery({});

  const deleteNotificationMutation = trpc.whatsapp.deleteNotification.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        notificationsQuery.refetch();
      } else {
        Alert.alert('Error', data.message);
      }
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const sendNotificationMutation = trpc.whatsapp.sendNotification.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        Alert.alert('Éxito', 'Notificación enviada correctamente');
        notificationsQuery.refetch();
      } else {
        Alert.alert('Error al enviar', data.message);
      }
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const filteredNotifications = useMemo(() => {
    if (!notificationsQuery.data) return [];
    if (!searchText.trim()) return notificationsQuery.data;
    const lower = searchText.toLowerCase();
    return notificationsQuery.data.filter((n: any) =>
      n.recipientName?.toLowerCase().includes(lower) ||
      n.recipientPhone?.toLowerCase().includes(lower) ||
      n.restaurantName?.toLowerCase().includes(lower) ||
      n.notificationType?.toLowerCase().includes(lower)
    );
  }, [notificationsQuery.data, searchText]);

  const handleDelete = useCallback((id: string, name: string) => {
    const doDelete = () => {
      deleteNotificationMutation.mutate({ notificationId: id });
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`¿Eliminar la notificación para ${name}?`)) doDelete();
    } else {
      Alert.alert(
        'Eliminar notificación',
        `¿Eliminar la notificación para ${name}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  }, [deleteNotificationMutation]);

  const handleSend = useCallback((id: string, name: string) => {
    const doSend = () => {
      sendNotificationMutation.mutate({ notificationId: id });
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`¿Enviar la notificación a ${name} ahora?`)) doSend();
    } else {
      Alert.alert(
        'Enviar notificación',
        `¿Enviar la notificación a ${name} ahora?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Enviar', onPress: doSend },
        ]
      );
    }
  }, [sendNotificationMutation]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const statusCounts = useMemo(() => {
    if (!notificationsQuery.data) return { pending: 0, processing: 0, sent: 0, failed: 0, all: 0 };
    const data = notificationsQuery.data;
    return {
      pending: data.filter((n: any) => n.status === 'pending').length,
      processing: data.filter((n: any) => n.status === 'processing').length,
      sent: data.filter((n: any) => n.status === 'sent').length,
      failed: data.filter((n: any) => n.status === 'failed').length,
      all: data.length,
    };
  }, [notificationsQuery.data]);

  const pendingAndFailedCount = useMemo(() => {
    if (!notificationsQuery.data) return 0;
    return notificationsQuery.data.filter((n: any) => n.status === 'pending' || n.status === 'processing').length;
  }, [notificationsQuery.data]);

  return (
    <>
      <Stack.Screen options={{ title: 'Worker de WhatsApp' }} />
      <View style={styles.container}>
        <View style={styles.headerBar}>
          <View style={styles.headerTop}>
            <View style={styles.headerInfo}>
              <View style={styles.headerIconWrap}>
                <MessageSquare size={22} color="#fff" strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Cola de Notificaciones</Text>
                <Text style={styles.headerSubtitle}>
                  {pendingAndFailedCount} pendiente{pendingAndFailedCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => notificationsQuery.refetch()}
              activeOpacity={0.7}
            >
              <RefreshCw size={18} color="#475569" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Search size={16} color="#94a3b8" strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre, teléfono..."
                placeholderTextColor="#94a3b8"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
            <TouchableOpacity
              style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
              onPress={() => setShowFilters(!showFilters)}
              activeOpacity={0.7}
            >
              <Filter size={16} color={showFilters ? '#fff' : '#64748b'} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={styles.filtersPanel}>
              <Text style={styles.filterLabel}>Estado:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
                {(['all', 'pending', 'processing', 'sent', 'failed'] as NotificationStatus[]).map((s) => {
                  const isActive = statusFilter === s;
                  const label = s === 'all' ? 'Todos' : STATUS_CONFIG[s]?.label || s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusChip, isActive && styles.statusChipActive]}
                      onPress={() => setStatusFilter(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.filterLabel, { marginTop: 10 }]}>Restaurante:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
                <TouchableOpacity
                  style={[styles.statusChip, !restaurantFilter && styles.statusChipActive]}
                  onPress={() => setRestaurantFilter('')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusChipText, !restaurantFilter && styles.statusChipTextActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {(restaurantsQuery.data || []).map((r: any) => {
                  const isActive = restaurantFilter === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.statusChip, isActive && styles.statusChipActive]}
                      onPress={() => setRestaurantFilter(r.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={notificationsQuery.isRefetching}
              onRefresh={() => notificationsQuery.refetch()}
              colors={['#25D366']}
              tintColor="#25D366"
            />
          }
        >
          {notificationsQuery.isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#25D366" />
              <Text style={styles.loadingText}>Cargando notificaciones...</Text>
            </View>
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.centerBox}>
              <CheckCircle size={48} color="#d1d5db" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Sin notificaciones</Text>
              <Text style={styles.emptySubtitle}>
                {statusFilter === 'pending'
                  ? 'No hay notificaciones pendientes de envío'
                  : 'No se encontraron notificaciones con estos filtros'}
              </Text>
            </View>
          ) : (
            filteredNotifications.map((notif: any) => {
              const statusConf = STATUS_CONFIG[notif.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConf.icon;
              const isExpanded = expandedId === notif.id;
              const typeLabel = NOTIFICATION_TYPE_LABELS[notif.notificationType] || notif.notificationType;
              const canSend = notif.status === 'pending' || notif.status === 'failed';
              const canDelete = notif.status !== 'processing';

              return (
                <TouchableOpacity
                  key={notif.id}
                  style={styles.notifCard}
                  onPress={() => setExpandedId(isExpanded ? null : notif.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.notifHeader}>
                    <View style={[styles.statusDot, { backgroundColor: statusConf.color }]} />
                    <View style={styles.notifInfo}>
                      <Text style={styles.notifName} numberOfLines={1}>{notif.recipientName}</Text>
                      <Text style={styles.notifPhone}>{notif.recipientPhone}</Text>
                    </View>
                    <View style={styles.notifMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
                        <StatusIcon size={12} color={statusConf.color} strokeWidth={2.5} />
                        <Text style={[styles.statusBadgeText, { color: statusConf.color }]}>
                          {statusConf.label}
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={16} color="#94a3b8" strokeWidth={2} />
                      ) : (
                        <ChevronDown size={16} color="#94a3b8" strokeWidth={2} />
                      )}
                    </View>
                  </View>

                  <View style={styles.notifSubRow}>
                    <Text style={styles.notifType}>{typeLabel}</Text>
                    <Text style={styles.notifRestaurant}>{notif.restaurantName}</Text>
                  </View>

                  <View style={styles.notifSubRow}>
                    <Text style={styles.notifAttempts}>Intentos: {notif.attempts}</Text>
                    <Text style={styles.notifDate}>{formatDate(notif.createdAt)}</Text>
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>ID:</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>{notif.id}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reserva:</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>{notif.reservationId}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Programado:</Text>
                        <Text style={styles.detailValue}>{formatDate(notif.scheduledFor)}</Text>
                      </View>
                      {notif.lastAttemptAt && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Último intento:</Text>
                          <Text style={styles.detailValue}>{formatDate(notif.lastAttemptAt)}</Text>
                        </View>
                      )}
                      {notif.sentAt && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Enviado:</Text>
                          <Text style={styles.detailValue}>{formatDate(notif.sentAt)}</Text>
                        </View>
                      )}
                      {notif.errorMessage && (
                        <View style={styles.errorBox}>
                          <AlertTriangle size={14} color="#ef4444" strokeWidth={2} />
                          <Text style={styles.errorText} numberOfLines={3}>{notif.errorMessage}</Text>
                        </View>
                      )}

                      <View style={styles.messageBox}>
                        <Text style={styles.messageLabel}>Mensaje:</Text>
                        <Text style={styles.messageText} numberOfLines={6}>{notif.message}</Text>
                      </View>

                      <View style={styles.actionRow}>
                        {canSend && (
                          <TouchableOpacity
                            style={styles.sendBtn}
                            onPress={() => handleSend(notif.id, notif.recipientName)}
                            activeOpacity={0.7}
                            disabled={sendNotificationMutation.isPending}
                          >
                            {sendNotificationMutation.isPending ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Send size={15} color="#fff" strokeWidth={2.5} />
                                <Text style={styles.sendBtnText}>Enviar</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                        {canDelete && (
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDelete(notif.id, notif.recipientName)}
                            activeOpacity={0.7}
                            disabled={deleteNotificationMutation.isPending}
                          >
                            {deleteNotificationMutation.isPending ? (
                              <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                              <>
                                <Trash2 size={15} color="#ef4444" strokeWidth={2.5} />
                                <Text style={styles.deleteBtnText}>Eliminar</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  headerBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 1,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    height: 40,
  },
  filterToggle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleActive: {
    backgroundColor: '#25D366',
  },
  filtersPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  statusFilters: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#64748b',
  },
  statusChipTextActive: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center' as const,
    paddingHorizontal: 32,
  },
  notifCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  notifInfo: {
    flex: 1,
  },
  notifName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  notifPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  notifMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  notifSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 20,
  },
  notifType: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#475569',
  },
  notifRestaurant: {
    fontSize: 11,
    color: '#94a3b8',
  },
  notifAttempts: {
    fontSize: 11,
    color: '#94a3b8',
  },
  notifDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
    width: 100,
  },
  detailValue: {
    fontSize: 12,
    color: '#0f172a',
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#991b1b',
    flex: 1,
    lineHeight: 17,
  },
  messageBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
  },
  messageText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
});
