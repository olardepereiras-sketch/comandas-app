import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { ChevronLeft, ChevronRight, Clock, Users, MapPin, MessageSquare, ShoppingCart, Dog } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRestaurantId } from '@/lib/restaurantSession';

type DayInfo = {
  date: Date;
  dateString: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isOpen: boolean;
  reservationCount: number;
  exception?: any;
  schedule?: any;
};

export default function RestaurantReservationsScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [restaurantId, setRestaurantId] = useState<string>('');

  useEffect(() => {
    const loadRestaurantId = async () => {
      const id = await getRestaurantId();
      if (id) {
        setRestaurantId(id);
        // Seleccionar automáticamente el día actual
        const today = new Date();
        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setSelectedDay({
          date: today,
          dateString: todayString,
          isCurrentMonth: true,
          isToday: true,
          isOpen: true,
          reservationCount: 0,
        });
      }
    };
    loadRestaurantId();
  }, []);

  const schedulesQuery = trpc.schedules.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );

  const dayExceptionsQuery = trpc.dayExceptions.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );

  const reservationsQuery = trpc.reservations.list.useQuery(
    {
      restaurantId,
      month: currentMonth.getMonth() + 1,
      year: currentMonth.getFullYear(),
    },
    { enabled: !!restaurantId, refetchInterval: 30000 }
  );

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    
    const firstDayOfWeek = firstDay.getDay();
    const daysFromMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysFromMonday);

    const days: DayInfo[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const exception = dayExceptionsQuery.data?.find((ex: any) => {
        let exDateString: string;
        if (typeof ex.date === 'string') {
          if (ex.date.includes('T')) {
            const exDate = new Date(ex.date);
            exDateString = `${exDate.getFullYear()}-${String(exDate.getMonth() + 1).padStart(2, '0')}-${String(exDate.getDate()).padStart(2, '0')}`;
          } else {
            exDateString = ex.date;
          }
        } else {
          const exDate = new Date(ex.date);
          exDateString = `${exDate.getFullYear()}-${String(exDate.getMonth() + 1).padStart(2, '0')}-${String(exDate.getDate()).padStart(2, '0')}`;
        }
        return exDateString === dateString;
      });

      const dayOfWeek = date.getDay();
      const schedule = schedulesQuery.data?.find(s => s.dayOfWeek === dayOfWeek);
      
      let isOpen = false;
      if (exception) {
        isOpen = exception.isOpen;
      } else if (schedule) {
        isOpen = schedule.isOpen;
      }

      const reservationCount = reservationsQuery.data?.filter((res: any) => {
        const resDate = new Date(res.date);
        return resDate.getDate() === date.getDate() &&
               resDate.getMonth() === date.getMonth() &&
               resDate.getFullYear() === date.getFullYear();
      }).length || 0;

      days.push({
        date,
        dateString,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        isOpen,
        reservationCount,
        exception,
        schedule,
      });
    }

    return days;
  }, [currentMonth, schedulesQuery.data, dayExceptionsQuery.data, reservationsQuery.data]);

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const handleDayPress = (day: DayInfo) => {
    if (day.isCurrentMonth) {
      setSelectedDay(day);
    }
  };

  const selectedDayReservations = useMemo(() => {
    if (!selectedDay) return [];
    return reservationsQuery.data?.filter((res: any) => {
      const resDate = new Date(res.date);
      return resDate.getDate() === selectedDay.date.getDate() &&
             resDate.getMonth() === selectedDay.date.getMonth() &&
             resDate.getFullYear() === selectedDay.date.getFullYear();
    }) || [];
  }, [selectedDay, reservationsQuery.data]);

  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Reservas',
          headerStyle: { backgroundColor: '#10b981' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => changeMonth(-1)}
                activeOpacity={0.7}
              >
                <ChevronLeft size={24} color="#0f172a" strokeWidth={2.5} />
              </TouchableOpacity>
              
              <Text style={styles.monthText}>
                {monthName}
              </Text>
              
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => changeMonth(1)}
                activeOpacity={0.7}
              >
                <ChevronRight size={24} color="#0f172a" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <View style={styles.dayNamesRow}>
              {dayNames.map((name) => (
                <View key={name} style={styles.dayNameCell}>
                  <Text style={styles.dayNameText}>{name}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                const isSelected = selectedDay?.dateString === day.dateString;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      !day.isCurrentMonth && styles.dayCellInactive,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => handleDayPress(day)}
                    activeOpacity={0.7}
                    disabled={!day.isCurrentMonth}
                  >
                    <View style={[
                      styles.dayContent,
                      day.isOpen && styles.dayContentOpen,
                      !day.isOpen && day.isCurrentMonth && styles.dayContentClosed,
                      day.isToday && styles.dayContentToday,
                      isSelected && styles.dayContentSelected,
                    ]}>
                      <Text style={[
                        styles.dayText,
                        !day.isCurrentMonth && styles.dayTextInactive,
                        isSelected && styles.dayTextSelected,
                        day.isToday && !isSelected && styles.dayTextToday,
                      ]}>
                        {day.date.getDate()}
                      </Text>
                      {day.isCurrentMonth && day.reservationCount > 0 && (
                        <View style={[
                          styles.reservationBadge,
                          isSelected && styles.reservationBadgeSelected,
                        ]}>
                          <Text style={[
                            styles.reservationBadgeText,
                            isSelected && styles.reservationBadgeTextSelected,
                          ]}>
                            {day.reservationCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.legendText}>Abierto</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>Cerrado</Text>
            </View>
          </View>

          {selectedDay && (
            <View style={styles.reservationsSection}>
              <View style={styles.reservationsHeader}>
                <View>
                  <Text style={styles.selectedDateTitle}>Reservas ({selectedDayReservations.length})</Text>
                  <Text style={styles.selectedDateSubtitle}>
                    {selectedDay.date.toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric' 
                    })}
                  </Text>
                </View>
              </View>

              {reservationsQuery.isLoading ? (
                <ActivityIndicator size="large" color="#10b981" style={{ marginVertical: 20 }} />
              ) : selectedDayReservations.length > 0 ? (
                selectedDayReservations.map((reservation: any) => {
                  const timeString = `${String(reservation.time.hour).padStart(2, '0')}:${String(reservation.time.minute).padStart(2, '0')}`;
                  const isCancelled = reservation.status === 'cancelled' || reservation.status === 'modified';
                  
                  return (
                    <View 
                      key={reservation.id}
                      style={[
                        styles.reservationCard,
                        isCancelled && styles.reservationCardCancelled,
                        !reservation.tableIds?.length && styles.reservationCardPending,
                      ]}
                    >
                      <View style={styles.reservationHeader}>
                        <View style={styles.reservationMainInfo}>
                          <Text style={styles.reservationClient}>{reservation.clientName}</Text>
                          <Text style={styles.reservationPhone}>{reservation.clientPhone}</Text>
                          <Text style={styles.reservationId}>Nº {reservation.id.slice(-8).toUpperCase()}</Text>
                        </View>
                        <View style={styles.reservationStatusContainer}>
                          {reservation.status === 'confirmed' && (
                            <View style={styles.statusBadgeConfirmed}>
                              <Text style={styles.statusBadgeTextConfirmed}>Confirmada</Text>
                            </View>
                          )}
                          {(reservation.status === 'cancelled' || reservation.status === 'modified') && (
                            <View style={styles.statusBadgeCancelled}>
                              <Text style={styles.statusBadgeTextCancelled}>Anulada</Text>
                            </View>
                          )}
                          {reservation.status === 'pending' && (
                            <View style={styles.statusBadgePending}>
                              <Text style={styles.statusBadgeTextPending}>Pendiente</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.reservationDetailsGrid}>
                        <View style={styles.detailRow}>
                          <Clock size={14} color="#64748b" />
                          <Text style={styles.detailText}>{timeString}</Text>
                        </View>

                        {reservation.locationName && (
                          <View style={styles.detailRow}>
                            <MapPin size={14} color="#64748b" />
                            <Text style={styles.detailText}>{reservation.locationName}</Text>
                          </View>
                        )}

                        {reservation.tableNames && reservation.tableNames.length > 0 && (
                          <View style={styles.detailRow}>
                            <MapPin size={14} color="#64748b" />
                            <Text style={styles.detailText}>Mesa: {reservation.tableNames.join(', ')}</Text>
                          </View>
                        )}

                        <View style={styles.detailRow}>
                          <Users size={14} color="#64748b" />
                          <Text style={styles.detailText}>
                            {reservation.needsHighChair && reservation.highChairCount > 0
                              ? `${reservation.guests} comensales - ${reservation.guests - reservation.highChairCount} adultos - ${reservation.highChairCount} trona${reservation.highChairCount > 1 ? 's' : ''}`
                              : `${reservation.guests} comensales`
                            }
                          </Text>
                        </View>

                        {(reservation.needsStroller || reservation.hasPets) && (
                          <View style={styles.extraRequirements}>
                            {reservation.needsStroller && (
                              <View style={styles.requirementBadge}>
                                <ShoppingCart size={12} color="#64748b" />
                                <Text style={styles.requirementText}>Carrito</Text>
                              </View>
                            )}
                            {reservation.hasPets && (
                              <View style={styles.requirementBadge}>
                                <Dog size={12} color="#64748b" />
                                <Text style={styles.requirementText}>Mascota</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                      {reservation.clientNotes && (
                        <View style={styles.notesContainer}>
                          <MessageSquare size={14} color="#64748b" />
                          <Text style={styles.notesText}>{reservation.clientNotes}</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Sin reservas para este día</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  calendarCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    textTransform: 'capitalize',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 0.95,
    padding: 1.5,
  },
  dayCellInactive: {
    opacity: 0.3,
  },
  dayCellSelected: {},
  dayContent: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayContentOpen: {
    backgroundColor: '#dcfce7',
  },
  dayContentClosed: {
    backgroundColor: '#fee2e2',
  },
  dayContentToday: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  dayContentSelected: {
    backgroundColor: '#10b981',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  dayTextInactive: {
    color: '#94a3b8',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  dayTextToday: {
    color: '#3b82f6',
    fontWeight: '700' as const,
  },
  reservationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  reservationBadgeSelected: {
    backgroundColor: '#fff',
  },
  reservationBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#fff',
  },
  reservationBadgeTextSelected: {
    color: '#10b981',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  reservationsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  reservationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedDateTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  selectedDateSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  reservationCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  reservationCardCancelled: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    shadowOpacity: 0,
    elevation: 0,
  },
  reservationCardPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: '#fbbf24',
  },
  reservationId: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reservationMainInfo: {
    flex: 1,
  },
  reservationClient: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  reservationPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  reservationStatusContainer: {
    alignItems: 'flex-end',
  },
  statusBadgeConfirmed: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeTextConfirmed: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  statusBadgeCancelled: {
    backgroundColor: '#9ca3af',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeTextCancelled: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  statusBadgePending: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeTextPending: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  reservationDetailsGrid: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  extraRequirements: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  requirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requirementText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600' as const,
  },
  notesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
    fontStyle: 'italic',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
