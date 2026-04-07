import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, TextInput, Modal, Linking, FlatList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRestaurantId } from '@/lib/restaurantSession';
import { Calendar, Clock, Users, MapPin, ChevronLeft, ChevronRight, X, Edit, Search, ChevronDown, Star, AlertTriangle, ShoppingCart, Dog, MessageCircle, Phone, Check, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { PHONE_PREFIXES, DEFAULT_PREFIX } from '@/constants/phone-prefixes';
import type { PhonePrefix } from '@/constants/phone-prefixes';

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

export default function RestaurantReservationsProScreen() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [showShiftsModal, setShowShiftsModal] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<string[]>([]);
  const [timeConfigs, setTimeConfigs] = useState<{[key: string]: {maxGuests: number, minRating: number, minLocalRating: number}}>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingReservation, setRatingReservation] = useState<any>(null);
  const [ratings, setRatings] = useState<{[key: string]: number}>({});
  const [isNoShow, setIsNoShow] = useState(false);
  const [isBlockClient, setIsBlockClient] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [phonePrefix, setPhonePrefix] = useState<string>(DEFAULT_PREFIX);
  const [prefixSearchText, setPrefixSearchText] = useState<string>('');
  const [showPrefixModal, setShowPrefixModal] = useState(false);
  const [showTableBlockModal, setShowTableBlockModal] = useState(false);
  const [blockLocation, setBlockLocation] = useState<string>('');
  const [blockTable, setBlockTable] = useState<string>('');
  const [blockDuration, setBlockDuration] = useState<string>('120');
  const [showBulkShiftsModal, setShowBulkShiftsModal] = useState(false);
  const [bulkSelectedTemplateIds, setBulkSelectedTemplateIds] = useState<string[]>([]);
  const [bulkExpandedTemplateIds, setBulkExpandedTemplateIds] = useState<string[]>([]);
  const [bulkTimeConfigs, setBulkTimeConfigs] = useState<{[key: string]: {maxGuests: number, minRating: number, minLocalRating: number}}>({});
  const [pendingTimers, setPendingTimers] = useState<{[key: string]: number}>({});
  const [showDayMessageModal, setShowDayMessageModal] = useState(false);
  const [dayMessageEnabled, setDayMessageEnabled] = useState(false);
  const [dayMessageText, setDayMessageText] = useState('');
  const [showAvailableTablesModal, setShowAvailableTablesModal] = useState(false);
  const [showSwapConfirmModal, setShowSwapConfirmModal] = useState(false);
  const [swapTargetTable, setSwapTargetTable] = useState<any>(null);
  const [swapTargetReservation, setSwapTargetReservation] = useState<any>(null);
  const [selectedShiftForTables, setSelectedShiftForTables] = useState<any>(null);
  const [showConfigurableTableModal, setShowConfigurableTableModal] = useState(false);
  const [configurableSelectedTable, setConfigurableSelectedTable] = useState<any>(null);
  const [configurableGuestsInput, setConfigurableGuestsInput] = useState<string>('');

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSession = async () => {
    try {
      const id = await getRestaurantId();
      
      if (!id) {
        Alert.alert('Error', 'Sesión no encontrada. Por favor, inicia sesión nuevamente.');
        router.replace('/');
        return;
      }

      console.log('🔵 [RESERVAS PRO] Restaurant ID cargado:', id);
      setRestaurantId(id);
    } catch (error) {
      console.error('❌ [RESERVAS PRO] Error loading session:', error);
      Alert.alert('Error', 'Error al cargar la sesión');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const schedulesQuery = trpc.schedules.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );

  const templatesQuery = trpc.shiftTemplates.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );

  const dayExceptionsQuery = trpc.dayExceptions.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );

  const reservationsQuery = trpc.reservations.list.useQuery(
    { 
      restaurantId: restaurantId || '',
      month: currentMonth.getMonth() + 1,
      year: currentMonth.getFullYear(),
    },
    { enabled: !!restaurantId, refetchInterval: 30000 }
  );

  useEffect(() => {
    const parseCreatedAtAsUTC = (createdAtStr: string): Date => {
      if (!createdAtStr) return new Date();
      const str = String(createdAtStr).trim();
      return new Date(str);
    };

    const calculateTimers = () => {
      if (reservationsQuery.data) {
        const newTimers: {[key: string]: number} = {};
        reservationsQuery.data.forEach((reservation: any) => {
          if (reservation.status === 'pending' && reservation.createdAt) {
            const createdAt = parseCreatedAtAsUTC(reservation.createdAt);
            const now = new Date();
            const diffMinutes = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60)));
            newTimers[reservation.id] = diffMinutes;
          }
        });
        setPendingTimers(newTimers);
      }
    };

    const interval = setInterval(calculateTimers, 30000);
    calculateTimers();

    return () => clearInterval(interval);
  }, [reservationsQuery.data]);

  const locationsQuery = trpc.locations.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId && (showEditModal || showTableBlockModal || showAvailableTablesModal) }
  );

  const blockTablesQuery = trpc.tables.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId && !!blockLocation && showTableBlockModal }
  );

  const tablesForEditQuery = trpc.tables.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId && showEditModal }
  );

  const editBlocksQuery = trpc.tables.listBlocks.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId && showEditModal }
  );

  const blocksQuery = trpc.tables.listBlocks.useQuery(
    { restaurantId: restaurantId || '', date: selectedDay?.dateString || '' },
    { enabled: !!restaurantId && showDayModal && !!selectedDay?.dateString }
  );

  const blockTableMutation = trpc.tables.blockTable.useMutation({
    onSuccess: async () => {
      await Promise.all([reservationsQuery.refetch(), blocksQuery.refetch()]);
      setShowTableBlockModal(false);
      setShowDayModal(true);
      Alert.alert('Éxito', 'Mesa bloqueada correctamente');
      setBlockLocation('');
      setBlockTable('');
      setBlockDuration('120');
    },
    onError: (error: any) => {
      console.error('❌ [BLOCK TABLE] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo bloquear la mesa');
    },
  });

  const unblockTableMutation = trpc.tables.unblockTable.useMutation({
    onSuccess: async () => {
      await Promise.all([reservationsQuery.refetch(), blocksQuery.refetch()]);
      Alert.alert('Éxito', 'Mesa desbloqueada correctamente');
    },
    onError: (error: any) => {
      console.error('❌ [UNBLOCK TABLE] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo desbloquear la mesa');
    },
  });

  const swapTablesMutation = trpc.reservations.swapTables.useMutation({
    onSuccess: async () => {
      await reservationsQuery.refetch();
      setShowSwapConfirmModal(false);
      setShowEditModal(false);
      setEditingReservation(null);
      setSwapTargetTable(null);
      setSwapTargetReservation(null);
      Alert.alert('Éxito', 'Mesas intercambiadas correctamente');
      setShowDayModal(true);
    },
    onError: (error: any) => {
      console.error('❌ [SWAP TABLES] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo intercambiar las mesas');
    },
  });

  const availableTablesQuery = trpc.tables.availableForReservation.useQuery(
    {
      restaurantId: restaurantId || '',
      locationId: selectedLocation || (locationsQuery.data && locationsQuery.data.length > 0 ? locationsQuery.data[0].id : ''),
      date: editingReservation?.date || selectedDay?.dateString || '',
      time: editingReservation?.time || { hour: 12, minute: 0 },
      guests: editingReservation?.guests || 1,
      excludeReservationId: editingReservation?.id,
      skipCapacityFilter: showAvailableTablesModal,
    },
    { enabled: !!restaurantId && (showEditModal || showAvailableTablesModal) }
  );

  const ratingCriteriaQuery = trpc.ratingCriteria.list.useQuery(
    undefined,
    { enabled: showRatingModal }
  );

  const cancelMutation = trpc.reservations.cancel.useMutation({
    onSuccess: async () => {
      await reservationsQuery.refetch();
      setShowDayModal(true);
      Alert.alert('Éxito', 'Reserva cancelada correctamente');
    },
    onError: (error: any) => {
      console.error('❌ [CANCEL] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo cancelar la reserva');
    },
  });

  const updateExceptionWithShiftsMutation = trpc.dayExceptions.updateWithShifts.useMutation({
    onSuccess: async (data) => {
      console.log('✅ [UPDATE SHIFTS] Success, refrescando datos...', data);
      
      await Promise.all([
        dayExceptionsQuery.refetch(),
        reservationsQuery.refetch(),
      ]);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedException = dayExceptionsQuery.data?.find((ex: any) => {
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
        return exDateString === data.date;
      });

      console.log('🔍 [UPDATE SHIFTS] Exception actualizada:', {
        isOpen: data.isOpen,
        exceptionFound: !!updatedException,
        exceptionIsOpen: updatedException?.isOpen
      });
      
      if (selectedDay) {
        const updatedDay = {
          ...selectedDay,
          isOpen: data.isOpen,
          exception: updatedException || data,
        };
        setSelectedDay(updatedDay);
      }
      
      if (showShiftsModal) {
        setShowShiftsModal(false);
        
        setSelectedTemplateIds([]);
        setTimeConfigs({});
        setExpandedTemplateIds([]);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        setShowDayModal(true);
        Alert.alert('Éxito', 'Turnos del día actualizados correctamente');
      } else {
        Alert.alert('Éxito', 'Estado del día actualizado');
      }
    },
    onError: (error: any) => {
      console.error('❌ [UPDATE SHIFTS] Error:', error);
      Alert.alert('Error', 'No se pudieron actualizar los turnos');
    },
  });

  const updateTableMutation = trpc.reservations.updateTable.useMutation({
    onSuccess: async () => {
      await reservationsQuery.refetch();
      setShowEditModal(false);
      setEditingReservation(null);
      setShowDayModal(true);
      Alert.alert('Éxito', 'Reserva actualizada correctamente');
    },
    onError: (error: any) => {
      console.error('❌ [UPDATE TABLE] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo actualizar la reserva');
    },
  });

  const rateClientMutation = trpc.reservations.rateClient.useMutation({
    onSuccess: async () => {
      console.log('✅ [RATE CLIENT] Valoración guardada exitosamente');
      
      await reservationsQuery.refetch();
      
      setShowRatingModal(false);
      setRatingReservation(null);
      setRatings({});
      setIsNoShow(false);
      setIsBlockClient(false);
      
      Alert.alert('Éxito', 'Cliente valorado correctamente');
      setShowDayModal(true);
    },
    onError: (error: any) => {
      console.error('❌ [RATE CLIENT] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo valorar al cliente');
    },
  });

  const handleCancelReservation = (reservationId: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro de que deseas cancelar esta reserva?');
      if (confirmed) {
        cancelMutation.mutate({ reservationId, cancelledBy: 'restaurant' });
      }
    } else {
      Alert.alert(
        'Cancelar Reserva',
        '¿Estás seguro de que deseas cancelar esta reserva?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Sí', onPress: () => cancelMutation.mutate({ reservationId, cancelledBy: 'restaurant' }) },
        ]
      );
    }
  };

  const handleEditReservation = (reservation: any) => {
    setEditingReservation(reservation);
    setSelectedLocation(reservation.locationId || '');
    setSelectedTables(reservation.tableIds || []);
    setShowDayModal(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingReservation) return;
    
    if (selectedTables.length === 0) {
      Alert.alert('Error', 'Debe seleccionar una mesa');
      return;
    }

    if (selectedTables.length > 1) {
      Alert.alert('Error', 'Solo puede seleccionar una mesa a la vez');
      return;
    }

    const selectedTableId = selectedTables[0];

    const isBlocked = editBlocksQuery.data?.some((block: any) => block.tableId === selectedTableId);
    if (isBlocked) {
      Alert.alert('Mesa Bloqueada', 'No puedes asignar una mesa que está bloqueada. Por favor, selecciona otra mesa.');
      return;
    }

    const editDate = new Date(editingReservation.date);
    const conflictingReservation = reservationsQuery.data?.find((res: any) => {
      if (res.id === editingReservation.id) return false;
      if (res.status === 'cancelled' || res.status === 'modified') return false;
      if (!res.tableIds?.includes(selectedTableId)) return false;
      const resDate = new Date(res.date);
      return resDate.getDate() === editDate.getDate() &&
             resDate.getMonth() === editDate.getMonth() &&
             resDate.getFullYear() === editDate.getFullYear();
    });

    if (conflictingReservation) {
      const conflictTable = tablesForEditQuery.data?.find((t: any) => t.id === selectedTableId);
      setSwapTargetTable(conflictTable);
      setSwapTargetReservation(conflictingReservation);
      setShowSwapConfirmModal(true);
      return;
    }

    updateTableMutation.mutate({
      reservationId: editingReservation.id,
      tableIds: selectedTables,
      locationId: selectedLocation,
    });
  };

  const handleOpenRating = (reservation: any) => {
    console.log('🔍 [RATING] Abriendo modal de valoración para reserva:', reservation.id);
    console.log('🔍 [RATING] clientRatings recibidos:', reservation.clientRatings);
    console.log('🔍 [RATING] wasNoShow:', reservation.wasNoShow);
    
    setRatingReservation(reservation);
    setShowDayModal(false);
    setShowRatingModal(true);
  };

  const searchByPhoneMutation = trpc.reservations.searchByPhone.useQuery(
    {
      restaurantId: restaurantId || '',
      phone: phonePrefix + searchPhone,
    },
    { enabled: false }
  );

  const handleSearchPhone = async () => {
    if (!searchPhone.trim()) {
      Alert.alert('Error', 'Por favor ingresa un número de teléfono');
      return;
    }

    try {
      const results = await searchByPhoneMutation.refetch();
      if (results.data && results.data.length > 0) {
        setSearchResults(results.data);
      } else {
        setSearchResults([]);
        Alert.alert('Sin resultados', 'No se encontraron reservas para este número');
      }
    } catch (error) {
      console.error('Error buscando reservas:', error);
      Alert.alert('Error', 'No se pudo buscar las reservas');
    }
  };

  const filteredPrefixList = useMemo(() => {
    if (!prefixSearchText.trim()) return PHONE_PREFIXES;
    const q = prefixSearchText.toLowerCase();
    return PHONE_PREFIXES.filter(
      (p: PhonePrefix) => p.country.toLowerCase().includes(q) || p.code.includes(q)
    );
  }, [prefixSearchText]);

  const handleToggleMultiSelect = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedDays([]);
  };

  const handleDayPress = (day: DayInfo) => {
    if (isMultiSelectMode) {
      if (selectedDays.includes(day.dateString)) {
        setSelectedDays(selectedDays.filter(d => d !== day.dateString));
      } else {
        setSelectedDays([...selectedDays, day.dateString]);
      }
    } else {
      setSelectedDay(day);
      setShowDayModal(true);
    }
  };

  const handleBulkOpenDays = () => {
    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un día');
      return;
    }

    const message = `¿Deseas abrir ${selectedDays.length} día(s) seleccionado(s)?`;
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        const askShifts = window.confirm('¿Deseas asignar turnos a estos días?');
        if (askShifts) {
          setShowBulkShiftsModal(true);
        } else {
          processBulkUpdate(true, []);
        }
      }
    } else {
      Alert.alert(
        'Abrir días',
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Abrir', 
            onPress: () => {
              Alert.alert(
                'Asignar turnos',
                '¿Deseas asignar turnos a estos días?',
                [
                  { text: 'No', onPress: () => processBulkUpdate(true, []) },
                  { text: 'Sí', onPress: () => setShowBulkShiftsModal(true) },
                ]
              );
            }
          },
        ]
      );
    }
  };

  const handleBulkCloseDays = () => {
    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un día');
      return;
    }

    const message = `¿Deseas cerrar ${selectedDays.length} día(s) seleccionado(s)?`;
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        processBulkUpdate(false);
      }
    } else {
      Alert.alert(
        'Cerrar días',
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar', onPress: () => processBulkUpdate(false) },
        ]
      );
    }
  };

  const processBulkUpdate = (isOpen: boolean, shifts: any[] = []) => {
    if (!restaurantId) return;

    const updates = selectedDays.map(dateString => 
      updateExceptionWithShiftsMutation.mutateAsync({
        restaurantId,
        date: dateString,
        isOpen,
        shifts,
      }).catch(error => {
        console.error(`Error updating ${dateString}:`, error);
        return null;
      })
    );

    Promise.all(updates).then(async (results) => {
      const completed = results.filter(r => r !== null).length;
      
      await Promise.all([
        dayExceptionsQuery.refetch(),
        reservationsQuery.refetch(),
      ]);

      setSelectedDays([]);
      setIsMultiSelectMode(false);
      setShowBulkShiftsModal(false);
      setBulkSelectedTemplateIds([]);
      setBulkExpandedTemplateIds([]);
      setBulkTimeConfigs({});
      Alert.alert('Éxito', `${completed} día(s) actualizado(s) correctamente`);
    });
  };

  const handleSaveRating = () => {
    if (!ratingReservation) return;

    console.log('💾 [SAVE RATING] Guardando valoración');
    console.log('📊 [SAVE RATING] Ratings:', ratings);
    console.log('🚫 [SAVE RATING] IsNoShow:', isNoShow);

    const ratingsArray = Object.entries(ratings).map(([criteriaId, value]) => ({
      criteriaId,
      value: Number(value),
    }));

    if (ratingsArray.length === 0) {
      Alert.alert('Error', 'Debes valorar al menos un criterio');
      return;
    }

    console.log('📤 [SAVE RATING] Enviando datos:', {
      reservationId: ratingReservation.id,
      clientId: ratingReservation.clientId,
      ratingsCount: ratingsArray.length,
      isNoShow,
    });

    rateClientMutation.mutate({
      restaurantId: restaurantId || '',
      reservationId: ratingReservation.id,
      clientId: ratingReservation.clientId,
      ratings: ratingsArray,
      isNoShow,
      isUnwantedClient: isBlockClient,
    });
  };

  useEffect(() => {
    if (showRatingModal && ratingCriteriaQuery.data && ratingReservation) {
      console.log('🔍 [RATING EFFECT] Cargando valoraciones del modal');
      console.log('🔍 [RATING EFFECT] clientRatings:', ratingReservation.clientRatings);
      console.log('🔍 [RATING EFFECT] wasNoShow:', ratingReservation.wasNoShow);
      console.log('🔍 [RATING EFFECT] clientRated:', ratingReservation.clientRated);
      
      let parsedRatings: any = null;
      if (ratingReservation.clientRatings) {
        if (typeof ratingReservation.clientRatings === 'string') {
          try {
            parsedRatings = JSON.parse(ratingReservation.clientRatings);
          } catch (e) {
            console.error('❌ [RATING EFFECT] Error parsing clientRatings:', e);
          }
        } else if (typeof ratingReservation.clientRatings === 'object') {
          parsedRatings = ratingReservation.clientRatings;
        }
      }
      
      const hasExistingRatings = ratingReservation.clientRated && 
        parsedRatings && 
        Object.keys(parsedRatings).length > 0;
      
      if (hasExistingRatings) {
        console.log('✅ [RATING EFFECT] Cargando valoraciones existentes:', parsedRatings);
        const loadedRatings: {[key: string]: number} = {};
        Object.entries(parsedRatings).forEach(([key, value]) => {
          loadedRatings[key] = value as number;
        });
        console.log('📝 [RATING EFFECT] Valoraciones procesadas:', loadedRatings);
        setRatings(loadedRatings);
        setIsNoShow(ratingReservation.wasNoShow || false);
        setIsBlockClient(false);
      } else {
        console.log('⚠️ [RATING EFFECT] No hay valoraciones previas, usando valores por defecto');
        const defaultRatings: {[key: string]: number} = {};
        ratingCriteriaQuery.data.forEach((criteria: any) => {
          defaultRatings[criteria.id] = criteria.defaultValue || 4;
        });
        console.log('📝 [RATING EFFECT] Seteando valores por defecto:', defaultRatings);
        setRatings(defaultRatings);
        setIsNoShow(false);
        setIsBlockClient(false);
      }
    }
  }, [showRatingModal, ratingCriteriaQuery.data, ratingReservation]);

  const handleToggleDayStatus = () => {
    if (!selectedDay || !restaurantId) return;

    const newStatus = !selectedDay.isOpen;
    
    console.log('🔄 [TOGGLE DAY] Cambiando estado del día:', {
      date: selectedDay.dateString,
      currentStatus: selectedDay.isOpen,
      newStatus: newStatus,
      hasException: !!selectedDay.exception,
      hasSchedule: !!selectedDay.schedule,
    });
    
    if (!newStatus) {
      updateExceptionWithShiftsMutation.mutate({
        restaurantId,
        date: selectedDay.dateString,
        isOpen: false,
        shifts: [],
      });
      return;
    }
    
    let shiftsToUse: any[] = [];
    
    if (selectedDay.exception?.shifts && Array.isArray(selectedDay.exception.shifts) && selectedDay.exception.shifts.length > 0) {
      shiftsToUse = selectedDay.exception.shifts;
      console.log('✅ [TOGGLE DAY] Usando turnos de excepción existente');
    } else if (selectedDay.schedule?.shifts) {
      try {
        const scheduleShifts = typeof selectedDay.schedule.shifts === 'string'
          ? JSON.parse(selectedDay.schedule.shifts)
          : selectedDay.schedule.shifts;
        
        if (Array.isArray(scheduleShifts) && scheduleShifts.length > 0) {
          shiftsToUse = scheduleShifts.map((shift: any) => ({
            templateId: shift.templateId,
            startTime: shift.startTime,
            endTime: shift.endTime,
            maxGuestsPerHour: shift.maxGuestsPerHour || 10,
            minRating: shift.minRating || 0,
            minLocalRating: shift.minLocalRating || 0,
          }));
          console.log('✅ [TOGGLE DAY] Heredando turnos de horario base');
        }
      } catch (e) {
        console.error('Error parsing schedule shifts:', e);
      }
    }
    
    console.log('🔵 [TOGGLE DAY] Turnos preparados:', shiftsToUse.length);
    
    const message = newStatus 
      ? (shiftsToUse.length > 0 
          ? `Se abrirá el día con ${shiftsToUse.length} turno(s). Puedes modificarlos después en "Turnos para Hoy".`
          : 'Se abrirá el día sin turnos configurados. Usa "Turnos para Hoy" para agregar horarios disponibles.')
      : '¿Deseas cerrar este día? Las reservas existentes no se verán afectadas.';
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        updateExceptionWithShiftsMutation.mutate({
          restaurantId,
          date: selectedDay.dateString,
          isOpen: newStatus,
          shifts: shiftsToUse,
        });
      }
    } else {
      Alert.alert(
        newStatus ? 'Abrir Día' : 'Cerrar Día',
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: newStatus ? 'Abrir' : 'Cerrar',
            onPress: () => {
              updateExceptionWithShiftsMutation.mutate({
                restaurantId,
                date: selectedDay.dateString,
                isOpen: newStatus,
                shifts: shiftsToUse,
              });
            }
          },
        ]
      );
    }
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newDate);
  };

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
               resDate.getFullYear() === date.getFullYear() &&
               res.status !== 'cancelled' && res.status !== 'modified';
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

  const selectedDayReservations = useMemo(() => {
    if (!selectedDay) return [];
    const filtered = reservationsQuery.data?.filter((res: any) => {
      const resDate = new Date(res.date);
      return resDate.getDate() === selectedDay.date.getDate() &&
             resDate.getMonth() === selectedDay.date.getMonth() &&
             resDate.getFullYear() === selectedDay.date.getFullYear();
    }) || [];
    
    return filtered.sort((a: any, b: any) => {
      const timeA = a.time.hour * 60 + a.time.minute;
      const timeB = b.time.hour * 60 + b.time.minute;
      return timeA - timeB;
    });
  }, [selectedDay, reservationsQuery.data]);

  const getReservationColor = (reservation: any): string => {
    if (reservation.status === 'cancelled' || reservation.status === 'modified') {
      return 'cancelled';
    }

    if (reservation.status === 'pending') {
      return 'pending';
    }

    if (reservation.status === 'confirmed') {
      return 'confirmed';
    }

    if (reservation.status === 'añadida') {
      return 'added';
    }

    if (reservation.status === 'in_progress' || reservation.status === 'in_progress_added') {
      return 'active';
    }

    if (reservation.status === 'ratable') {
      return 'ratable';
    }

    if (reservation.status === 'completed') {
      return 'completed';
    }

    return 'confirmed';
  };

  if (isLoadingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Cargando sesión...</Text>
      </View>
    );
  }

  if (!restaurantId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error al cargar sesión</Text>
      </View>
    );
  }

  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Reservas Pro',
          headerStyle: { backgroundColor: '#8b5cf6' },
          headerTintColor: '#fff',
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.headerGradient}>
            <Text style={styles.headerTitle}>Gestión Avanzada</Text>
            <Text style={styles.headerSubtitle}>Calendario de Reservas</Text>
          </LinearGradient>
        </View>

        <View style={styles.monthSelector}>
          <TouchableOpacity
            style={styles.monthArrow}
            onPress={() => changeMonth(-1)}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#8b5cf6" />
          </TouchableOpacity>
          
          <Text style={styles.monthText}>{monthName}</Text>
          
          <TouchableOpacity
            style={styles.monthArrow}
            onPress={() => changeMonth(1)}
            activeOpacity={0.7}
          >
            <ChevronRight size={24} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.headerActionButton, isMultiSelectMode && styles.headerActionButtonActive]}
            onPress={handleToggleMultiSelect}
            activeOpacity={0.7}
          >
            <Text style={[styles.headerActionButtonText, isMultiSelectMode && styles.headerActionButtonTextActive]}>
              {isMultiSelectMode ? 'Cancelar Selección' : 'Seleccionar Días'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => setShowSearchModal(true)}
            activeOpacity={0.7}
          >
            <Search size={18} color="#fff" />
            <Text style={styles.headerActionButtonText}>Buscar Cliente</Text>
          </TouchableOpacity>
        </View>

        {isMultiSelectMode && selectedDays.length > 0 && (
          <View style={styles.bulkActionsContainer}>
            <Text style={styles.bulkActionsText}>{selectedDays.length} día(s) seleccionado(s)</Text>
            <View style={styles.bulkActionsButtons}>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={handleBulkOpenDays}
              >
                <Text style={styles.bulkActionButtonText}>Abrir Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkActionButton, styles.bulkActionButtonClose]}
                onPress={handleBulkCloseDays}
              >
                <Text style={styles.bulkActionButtonText}>Cerrar Todos</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.weekHeader}>
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
            <View key={index} style={styles.weekDayHeader}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <ScrollView style={styles.calendarContainer}>
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  !day.isCurrentMonth && styles.dayCellInactive,
                  selectedDay?.dateString === day.dateString && styles.dayCellSelected,
                  isMultiSelectMode && selectedDays.includes(day.dateString) && styles.dayCellMultiSelected,
                ]}
                onPress={() => handleDayPress(day)}
                activeOpacity={0.7}
                disabled={false}
              >
                <View style={[
                  styles.dayContent,
                  day.isOpen && styles.dayContentOpen,
                  !day.isOpen && day.isCurrentMonth && styles.dayContentClosed,
                  day.isToday && styles.dayContentToday,
                  selectedDay?.dateString === day.dateString && styles.dayContentSelected,
                ]}>
                  <Text style={[
                    styles.dayNumber,
                    !day.isCurrentMonth && styles.dayNumberOtherMonth,
                    selectedDay?.dateString === day.dateString && styles.dayTextSelected,
                    day.isToday && selectedDay?.dateString !== day.dateString && styles.dayTextToday,
                  ]}>
                    {day.date.getDate()}
                  </Text>
                  {day.isCurrentMonth && day.reservationCount > 0 && (
                    <View style={[
                      styles.reservationBadge,
                      selectedDay?.dateString === day.dateString && styles.reservationBadgeSelected,
                    ]}>
                      <Text style={[
                        styles.reservationCount,
                        selectedDay?.dateString === day.dateString && styles.reservationCountSelected,
                      ]}>
                        {day.reservationCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Modal
          visible={showDayModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDayModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedDay?.date.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric' 
                  })}
                </Text>
                <TouchableOpacity onPress={() => setShowDayModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.dayStatusContainer}>
                <View style={styles.dayStatusInfo}>
                  <Text style={styles.dayStatusLabel}>Estado:</Text>
                  <View style={[
                    styles.dayStatusBadge,
                    selectedDay?.isOpen ? styles.dayStatusBadgeOpen : styles.dayStatusBadgeClosed
                  ]}>
                    <Text style={[styles.dayStatusBadgeText, selectedDay?.isOpen ? styles.dayStatusBadgeTextOpen : styles.dayStatusBadgeTextClosed]}>
                      {selectedDay?.isOpen ? '🟢 Abierto' : '🔴 Cerrado'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={handleToggleDayStatus}
                  disabled={updateExceptionWithShiftsMutation.isPending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleButtonText}>
                    {selectedDay?.isOpen ? 'Cerrar día' : 'Abrir día'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Reservas del Día ({selectedDayReservations.filter((r: any) => r.status !== 'cancelled' && r.status !== 'modified').length})</Text>
                  
                  {selectedDayReservations.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Calendar size={48} color="#94a3b8" />
                      <Text style={styles.emptyText}>No hay reservas para este día</Text>
                    </View>
                  ) : (
                    selectedDayReservations.map((reservation: any) => {
                      const colorState = getReservationColor(reservation);
                      return (
                      <View key={reservation.id} style={[
                        styles.reservationCard,
                        colorState === 'cancelled' && styles.reservationCardCancelled,
                        colorState === 'pending' && styles.reservationCardPending,
                        colorState === 'confirmed' && styles.reservationCardConfirmed,
                        colorState === 'added' && styles.reservationCardAdded,
                        colorState === 'ratable' && styles.reservationCardRatable,
                        colorState === 'completed' && styles.reservationCardCompleted,
                        colorState === 'active' && styles.reservationCardActive,
                      ]}>
                        <View style={styles.reservationHeader}>
                          <View style={styles.reservationMainInfo}>
                            <View style={styles.nameWithRating}>
                              <Text style={[styles.reservationName, colorState === 'active' && styles.reservationNameActive]}>{reservation.clientName}</Text>
                              {reservation.clientRating !== null && reservation.clientRating > 0 && (
                                <TouchableOpacity 
                                  style={styles.ratingBadge}
                                  onPress={() => {
                                    Alert.alert(
                                      'Valoración del Cliente',
                                      `Cliente: ${reservation.clientName}\n\nNota Media: ${reservation.clientRating.toFixed(1)} ⭐\n\nEsta función mostrará detalles completos próximamente.`
                                    );
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.ratingBadgeText}>{reservation.clientRating.toFixed(1)}</Text>
                                  <Text style={styles.ratingBadgeHeart}>♥</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                            <Text style={styles.reservationPhone}>{reservation.clientPhone}</Text>
                            <Text style={styles.reservationId}>Nº {reservation.id.slice(-8)}</Text>
                          </View>
                          <View style={styles.reservationStatus}>
                            {colorState === 'confirmed' && (
                              <View style={styles.statusBadgeConfirmed}>
                                <Text style={styles.statusBadgeTextConfirmed}>Confirmada</Text>
                              </View>
                            )}
                            {colorState === 'active' && (
                              <View style={styles.statusBadgeActive}>
                                <Text style={styles.statusBadgeTextActive}>En Curso</Text>
                              </View>
                            )}
                            {colorState === 'ratable' && (
                              <View style={styles.statusBadgeRatable}>
                                <Text style={styles.statusBadgeTextRatable}>Valorable</Text>
                              </View>
                            )}
                            {colorState === 'completed' && (
                              <View style={styles.statusBadgeCompleted}>
                                <Text style={styles.statusBadgeTextCompleted}>Finalizada</Text>
                              </View>
                            )}
                            {(reservation.status === 'cancelled' || reservation.status === 'modified') && (
                              <View style={styles.statusBadgeCancelled}>
                                <Text style={styles.statusBadgeTextCancelled}>Anulada</Text>
                              </View>
                            )}
                            {colorState === 'pending' && (
                              <View style={styles.statusBadgePending}>
                                <Text style={styles.statusBadgeTextPending}>Pendiente</Text>
                                {pendingTimers[reservation.id] !== undefined && (
                                  <Text style={styles.statusBadgeTextPending}> ({pendingTimers[reservation.id]} min)</Text>
                                )}
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.reservationDetails}>
                          <View style={styles.detailRow}>
                            <Clock size={14} color="#64748b" />
                            <Text style={[styles.detailText, colorState === 'active' && styles.detailTextActive]}>
                              {String(reservation.time.hour).padStart(2, '0')}:{String(reservation.time.minute).padStart(2, '0')}
                            </Text>
                          </View>

                          {reservation.locationName && (
                            <View style={styles.detailRow}>
                              <MapPin size={14} color="#64748b" />
                              <Text style={[styles.detailText, colorState === 'active' && styles.detailTextActive]}>{reservation.locationName}</Text>
                            </View>
                          )}

                          {reservation.tableNames && reservation.tableNames.length > 0 && (
                            <View style={styles.detailRow}>
                              <MapPin size={14} color="#64748b" />
                              <Text style={[styles.detailText, colorState === 'active' && styles.detailTextActive]}>Mesa: {reservation.tableNames.join(', ')}</Text>
                            </View>
                          )}

                          <View style={styles.detailRow}>
                            <Users size={14} color="#64748b" />
                            <Text style={[styles.detailText, colorState === 'active' && styles.detailTextActive]}>
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

                        {reservation.status !== 'modified' && reservation.status !== 'cancelled' && (
                        <View style={styles.reservationActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                              const phone = reservation.clientPhone.replace(/[^0-9]/g, '');
                              if (Platform.OS === 'web') {
                                window.open(`https://wa.me/${phone}`, '_blank');
                              } else {
                                const url = `whatsapp://send?phone=${phone}`;
                                Linking.openURL(url).catch(() => {
                                  Alert.alert('Error', 'No se pudo abrir WhatsApp');
                                });
                              }
                            }}
                          >
                            <MessageCircle size={14} color="#25D366" />
                            <Text style={styles.actionButtonText}>Contactar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                              const phone = reservation.clientPhone.replace(/[^0-9]/g, '');
                              if (Platform.OS === 'web') {
                                window.open(`tel:${phone}`, '_blank');
                              } else {
                                const url = `tel:${phone}`;
                                Linking.openURL(url).catch(() => {
                                  Alert.alert('Error', 'No se pudo realizar la llamada');
                                });
                              }
                            }}
                          >
                            <Phone size={14} color="#3b82f6" />
                            <Text style={styles.actionButtonText}>Llamar</Text>
                          </TouchableOpacity>

                          {colorState === 'ratable' && (
                            <TouchableOpacity
                              style={[styles.actionButton, styles.actionButtonRate]}
                              onPress={() => handleOpenRating(reservation)}
                            >
                              <Star size={14} color="#ec4899" />
                              <Text style={[styles.actionButtonText, styles.actionButtonTextRate]}>{reservation.clientRated ? 'Modificar' : 'Valorar'}</Text>
                            </TouchableOpacity>
                          )}

                          {(colorState === 'confirmed' || colorState === 'pending' || colorState === 'active' || colorState === 'added') && (
                            <>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleEditReservation(reservation)}
                              >
                                <Edit size={14} color="#8b5cf6" />
                                <Text style={styles.actionButtonText}>Editar</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionButton, {opacity: cancelMutation.isPending ? 0.5 : 1}]}
                                onPress={() => handleCancelReservation(reservation.id)}
                                disabled={cancelMutation.isPending}
                              >
                                <AlertTriangle size={14} color="#f59e0b" />
                                <Text style={styles.actionButtonText}>Anular</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                        )}
                        {reservation.status === 'cancelled' && (
                          <Text style={styles.modifiedNote}>Esta reserva fue cancelada</Text>
                        )}
                        {reservation.status === 'modified' && (
                          <Text style={styles.modifiedNote}>Esta reserva fue modificada por el cliente</Text>
                        )}
                        {reservation.clientRated && colorState === 'ratable' && (
                          <Text style={styles.ratedNote}>✓ Cliente valorado (puedes modificar la valoración hasta 24h después)</Text>
                        )}
                        {reservation.clientRated && colorState === 'completed' && (
                          <Text style={styles.ratedNote}>✓ Cliente valorado</Text>
                        )}
                        {!reservation.clientRated && colorState === 'completed' && !reservation.wasNoShow && (
                          <Text style={styles.completedAutoNote}>⏱ Valoración automática aplicada</Text>
                        )}
                        {colorState === 'completed' && reservation.wasNoShow && (
                          <Text style={styles.noShowNote}>⚠ No Show - El cliente no se presentó</Text>
                        )}
                        {reservation.isVip && reservation.isVipTable && (
                          <View style={styles.vipTableNote}>
                            <Text style={styles.vipTableNoteText}>⭐ Mesa favorita del cliente VIP - No modificar sin consultar</Text>
                          </View>
                        )}
                      </View>
                    );
                    })
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Configuración del Día</Text>
                  <Text style={styles.sectionNote}>Los días abiertos del calendario están disponibles para reservas en el buscador público</Text>
                  
                  <TouchableOpacity
                    style={styles.configButton}
                    onPress={async () => {
                      if (!selectedDay) return;
                      
                      let selectedIds: string[] = [];
                      let expandedIds: string[] = [];
                      let configs: {[key: string]: any} = {};
                      
                      await dayExceptionsQuery.refetch();
                      
                      const latestException = dayExceptionsQuery.data?.find((ex: any) => {
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
                        return exDateString === selectedDay.dateString;
                      });
                      
                      console.log('🔵 [SHIFTS MODAL] Abriendo modal para día:', {
                        date: selectedDay.dateString,
                        hasException: !!latestException,
                        hasSchedule: !!selectedDay.schedule,
                        exceptionShifts: latestException?.shifts,
                        scheduleShifts: selectedDay.schedule?.shifts
                      });
                      
                      if (latestException && latestException.shifts && latestException.shifts.length > 0) {
                        const shifts = latestException.shifts;
                        
                        console.log('🔍 [SHIFTS] Exception shifts recibidos:', shifts);
                        
                        if (Array.isArray(shifts) && shifts.length > 0 && typeof shifts[0] === 'object' && shifts[0].templateId) {
                          const templateIds = [...new Set(shifts.map((s: any) => s.templateId))] as string[];
                          selectedIds = templateIds;
                          expandedIds = [...selectedIds];
                          
                          shifts.forEach((shift: any) => {
                            const key = `${shift.templateId}-${shift.startTime}`;
                            configs[key] = {
                              maxGuests: shift.maxGuestsPerHour || 10,
                              minRating: shift.minRating || 0,
                              minLocalRating: shift.minLocalRating || 0,
                            };
                          });
                          
                          console.log('✅ [SHIFTS] Cargando desde exception:', { selectedIds, expandedIds, configs });
                        }
                      } else if (selectedDay.schedule && selectedDay.schedule.shifts) {
                        // Heredar configuración de schedules
                        try {
                          let scheduleShifts = [];
                          
                          if (typeof selectedDay.schedule.shifts === 'string') {
                            try {
                              scheduleShifts = JSON.parse(selectedDay.schedule.shifts);
                            } catch (parseError) {
                              console.error('❌ [SHIFTS] Error parsing schedule shifts:', parseError);
                            }
                          } else if (Array.isArray(selectedDay.schedule.shifts)) {
                            scheduleShifts = selectedDay.schedule.shifts;
                          }
                          
                          console.log('🔍 [SHIFTS] Schedule shifts:', scheduleShifts);
                          
                          if (Array.isArray(scheduleShifts) && scheduleShifts.length > 0) {
                            const templateIds = [...new Set(scheduleShifts.map((s: any) => s.templateId).filter((id: any) => id))] as string[];
                            selectedIds = templateIds;
                            expandedIds = [...selectedIds];
                            
                            console.log('🔍 [SHIFTS] Template IDs extraídos desde schedules:', selectedIds);
                            
                            scheduleShifts.forEach((shift: any) => {
                              if (shift.templateId) {
                                const key = `${shift.templateId}-${shift.startTime}`;
                                configs[key] = {
                                  maxGuests: shift.maxGuestsPerHour || 10,
                                  minRating: shift.minRating || 0,
                                  minLocalRating: shift.minLocalRating || 0,
                                };
                              }
                            });
                            
                            console.log('✅ [SHIFTS] Heredando desde schedule:', { selectedIds, expandedIds, configs });
                          }
                        } catch (e) {
                          console.error('❌ [SHIFTS] Error:', e);
                        }
                      }
                      
                      console.log('🔵 [SHIFTS] Estado final antes de abrir modal:', { selectedIds, expandedIds, configs });
                      setSelectedTemplateIds(selectedIds);
                      setTimeConfigs(configs);
                      setExpandedTemplateIds(expandedIds);
                      setShowDayModal(false);
                      setShowShiftsModal(true);
                    }}
                  >
                    <Clock size={18} color="#8b5cf6" />
                    <Text style={styles.configButtonText}>Turnos para Hoy</Text>
                  </TouchableOpacity>



                  <TouchableOpacity
                    style={styles.configButton}
                    onPress={() => {
                      if (!selectedDay) return;
                      
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
                        return exDateString === selectedDay.dateString;
                      });
                      
                      setDayMessageEnabled(exception?.specialMessageEnabled || false);
                      setDayMessageText(exception?.specialDayMessage || '');
                      setShowDayModal(false);
                      setShowDayMessageModal(true);
                    }}
                  >
                    <Calendar size={18} color="#8b5cf6" />
                    <Text style={styles.configButtonText}>Mensaje del día</Text>
                  </TouchableOpacity>



                  {blocksQuery.data && blocksQuery.data.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Mesas Bloqueadas Ahora</Text>
                      {blocksQuery.data.map((block: any) => {
                        const isSplitBlock = typeof block.id === 'string' && block.id.startsWith('block-split-');
                        return (
                          <View key={block.id} style={[
                            styles.blockCard,
                            isSplitBlock && styles.blockCardSplit,
                          ]}>
                            <View style={styles.blockInfo}>
                              <Text style={styles.blockTableName}>{block.tableName}</Text>
                              <Text style={styles.blockLocation}>{block.locationName}</Text>
                              {isSplitBlock ? (
                                <View style={styles.splitBlockBadge}>
                                  <Lock size={11} color="#7c3aed" />
                                  <Text style={styles.splitBlockText}>Bloqueada por división de mesa (mesas A y B activas)</Text>
                                </View>
                              ) : (
                                <Text style={styles.blockTime}>
                                  Hasta: {new Date(block.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                              )}
                            </View>
                            {!isSplitBlock && (
                              <TouchableOpacity
                                style={styles.unblockButton}
                                onPress={() => {
                                  if (Platform.OS === 'web') {
                                    const confirmed = window.confirm('¿Desbloquear esta mesa?');
                                    if (confirmed) {
                                      unblockTableMutation.mutate({ blockId: block.id });
                                    }
                                  } else {
                                    Alert.alert(
                                      'Desbloquear Mesa',
                                      '¿Deseas desbloquear esta mesa?',
                                      [
                                        { text: 'Cancelar', style: 'cancel' },
                                        { text: 'Desbloquear', onPress: () => unblockTableMutation.mutate({ blockId: block.id }) },
                                      ]
                                    );
                                  }
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.unblockButtonText}>Desbloquear</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </>
                  )}


                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDayModal(false)}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showSearchModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSearchModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.searchModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Buscar Cliente</Text>
                <TouchableOpacity onPress={() => setShowSearchModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.phoneInputContainer}>
                <TouchableOpacity
                  style={styles.prefixSelector}
                  onPress={() => setShowPrefixModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.prefixText}>{phonePrefix}</Text>
                  <ChevronDown size={16} color="#64748b" />
                </TouchableOpacity>
                <TextInput
                  style={styles.phoneInput}
                  value={searchPhone}
                  onChangeText={setSearchPhone}
                  placeholder="666123456"
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <TouchableOpacity
                style={styles.searchSubmitButton}
                onPress={handleSearchPhone}
                disabled={searchByPhoneMutation.isFetching}
              >
                <Text style={styles.searchSubmitButtonText}>
                  {searchByPhoneMutation.isFetching ? 'Buscando...' : 'Buscar'}
                </Text>
              </TouchableOpacity>

              {searchResults.length > 0 && (
                <ScrollView style={styles.searchResultsContainer}>
                  <Text style={styles.searchResultsTitle}>Reservas encontradas ({searchResults.length})</Text>
                  {searchResults.map((reservation: any) => {
                    const colorState = getReservationColor(reservation);
                    return (
                      <View key={reservation.id} style={[
                        styles.reservationCard,
                        colorState === 'cancelled' && styles.reservationCardCancelled,
                        colorState === 'pending' && styles.reservationCardPending,
                        colorState === 'confirmed' && styles.reservationCardConfirmed,
                        colorState === 'added' && styles.reservationCardAdded,
                        colorState === 'ratable' && styles.reservationCardRatable,
                        colorState === 'completed' && styles.reservationCardCompleted,
                        colorState === 'active' && styles.reservationCardActive,
                        { marginHorizontal: 0 }
                      ]}>
                        <View style={styles.reservationHeader}>
                          <View style={styles.reservationMainInfo}>
                            <View style={styles.clientNameWithRating}>
                              <Text style={[styles.reservationName, colorState === 'active' && styles.reservationNameActive]}>{reservation.clientName}</Text>
                              {reservation.clientRating > 0 && (
                                <View style={styles.ratingBadgeSmall}>
                                  <Star size={12} color="#f59e0b" strokeWidth={2.5} fill="#f59e0b" />
                                  <Text style={styles.ratingTextSmall}>{reservation.clientRating.toFixed(1)}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.reservationPhone}>{reservation.clientPhone}</Text>
                            <Text style={styles.reservationId}>Nº {reservation.id.slice(-8)}</Text>
                          </View>
                          <View style={styles.reservationStatus}>
                            {colorState === 'confirmed' && (
                              <View style={styles.statusBadgeConfirmed}>
                                <Text style={styles.statusBadgeTextConfirmed}>Confirmada</Text>
                              </View>
                            )}
                            {colorState === 'active' && (
                              <View style={styles.statusBadgeActive}>
                                <Text style={styles.statusBadgeTextActive}>En Curso</Text>
                              </View>
                            )}
                            {colorState === 'ratable' && (
                              <View style={styles.statusBadgeRatable}>
                                <Text style={styles.statusBadgeTextRatable}>Valorable</Text>
                              </View>
                            )}
                            {colorState === 'completed' && (
                              <View style={styles.statusBadgeCompleted}>
                                <Text style={styles.statusBadgeTextCompleted}>Finalizada</Text>
                              </View>
                            )}
                            {(reservation.status === 'cancelled' || reservation.status === 'modified') && (
                              <View style={styles.statusBadgeCancelled}>
                                <Text style={styles.statusBadgeTextCancelled}>Anulada</Text>
                              </View>
                            )}
                            {colorState === 'pending' && (
                              <View style={styles.statusBadgePending}>
                                <Text style={styles.statusBadgeTextPending}>Pendiente</Text>
                                {pendingTimers[reservation.id] !== undefined && (
                                  <Text style={styles.statusBadgeTextPending}> ({pendingTimers[reservation.id]} min)</Text>
                                )}
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.reservationDetails}>
                          <View style={styles.detailRow}>
                            <Calendar size={14} color="#64748b" />
                            <Text style={[styles.detailText, colorState === 'active' && styles.detailTextActive]}>
                              {new Date(reservation.date).toLocaleDateString('es-ES')}
                            </Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Clock size={14} color="#64748b" />
                            <Text style={[styles.detailText, colorState === 'active' && styles.detailTextActive]}>
                              {String(reservation.time.hour).padStart(2, '0')}:{String(reservation.time.minute).padStart(2, '0')}
                            </Text>
                          </View>

                          {reservation.locationName && (
                            <View style={styles.detailRow}>
                              <MapPin size={14} color="#64748b" />
                              <Text style={[styles.detailText, colorState === 'active' && styles.detailTextActive]}>{reservation.locationName}</Text>
                            </View>
                          )}

                          {reservation.tableNames && reservation.tableNames.length > 0 && (
                            <View style={styles.detailRow}>
                              <MapPin size={14} color="#64748b" />
                              <Text style={[styles.detailText, colorState === 'active' && styles.detailTextActive]}>Mesa: {reservation.tableNames.join(', ')}</Text>
                            </View>
                          )}

                          <View style={styles.detailRow}>
                            <Users size={14} color="#64748b" />
                            <Text style={[styles.detailText, colorState === 'active' && styles.detailTextActive]}>
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

                        {reservation.status !== 'modified' && reservation.status !== 'cancelled' && colorState !== 'completed' && (
                        <View style={styles.reservationActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                              const phone = reservation.clientPhone.replace(/[^0-9]/g, '');
                              if (Platform.OS === 'web') {
                                window.open(`https://wa.me/${phone}`, '_blank');
                              } else {
                                const url = `whatsapp://send?phone=${phone}`;
                                Linking.openURL(url).catch(() => {
                                  Alert.alert('Error', 'No se pudo abrir WhatsApp');
                                });
                              }
                            }}
                          >
                            <MessageCircle size={14} color="#25D366" />
                            <Text style={styles.actionButtonText}>Contactar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                              const phone = reservation.clientPhone.replace(/[^0-9]/g, '');
                              if (Platform.OS === 'web') {
                                window.open(`tel:${phone}`, '_blank');
                              } else {
                                const url = `tel:${phone}`;
                                Linking.openURL(url).catch(() => {
                                  Alert.alert('Error', 'No se pudo realizar la llamada');
                                });
                              }
                            }}
                          >
                            <Phone size={14} color="#3b82f6" />
                            <Text style={styles.actionButtonText}>Llamar</Text>
                          </TouchableOpacity>

                          {colorState === 'ratable' && (
                            <TouchableOpacity
                              style={[styles.actionButton, styles.actionButtonRate]}
                              onPress={() => {
                                setShowSearchModal(false);
                                handleOpenRating(reservation);
                              }}
                            >
                              <Star size={14} color="#ec4899" />
                              <Text style={[styles.actionButtonText, styles.actionButtonTextRate]}>{reservation.clientRated ? 'Modificar' : 'Valorar'}</Text>
                            </TouchableOpacity>
                          )}

                          {(colorState === 'confirmed' || colorState === 'active' || colorState === 'pending' || colorState === 'added') && (
                            <>
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => {
                                  setShowSearchModal(false);
                                  handleEditReservation(reservation);
                                }}
                              >
                                <Edit size={14} color="#8b5cf6" />
                                <Text style={styles.actionButtonText}>Editar</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionButton, {opacity: cancelMutation.isPending ? 0.5 : 1}]}
                                onPress={() => {
                                  setShowSearchModal(false);
                                  handleCancelReservation(reservation.id);
                                }}
                                disabled={cancelMutation.isPending}
                              >
                                <AlertTriangle size={14} color="#f59e0b" />
                                <Text style={styles.actionButtonText}>Anular</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                        )}
                        {reservation.status === 'cancelled' && (
                          <Text style={styles.modifiedNote}>Esta reserva fue cancelada</Text>
                        )}
                        {reservation.status === 'modified' && (
                          <Text style={styles.modifiedNote}>Esta reserva fue modificada por el cliente</Text>
                        )}
                        {reservation.clientRated && colorState === 'ratable' && (
                          <Text style={styles.ratedNote}>✓ Cliente valorado (puedes modificar la valoración hasta 24h después)</Text>
                        )}
                        {colorState === 'completed' && reservation.clientRated && (
                          <Text style={styles.ratedNote}>✓ Cliente valorado</Text>
                        )}
                        {colorState === 'completed' && !reservation.clientRated && !reservation.wasNoShow && (
                          <Text style={styles.completedAutoNote}>⏱ Valoración automática aplicada</Text>
                        )}
                        {colorState === 'completed' && reservation.wasNoShow && (
                          <Text style={styles.noShowNote}>⚠ No Show - El cliente no se presentó</Text>
                        )}
                        {reservation.isVip && reservation.isVipTable && (
                          <View style={styles.vipTableNote}>
                            <Text style={styles.vipTableNoteText}>⭐ Mesa favorita del cliente VIP - No modificar sin consultar</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {searchResults.length === 0 && searchByPhoneMutation.isFetched && searchPhone.trim() && (
                <View style={styles.emptySearchResults}>
                  <Text style={styles.emptySearchText}>No se encontraron reservas</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <Modal
          visible={showPrefixModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPrefixModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.prefixModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar prefijo</Text>
                <TouchableOpacity onPress={() => setShowPrefixModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={styles.prefixSearchBarContainer}>
                <Search size={16} color="#94a3b8" />
                <TextInput
                  style={styles.prefixSearchBarInput}
                  value={prefixSearchText}
                  onChangeText={setPrefixSearchText}
                  placeholder="Buscar país o código..."
                  placeholderTextColor="#94a3b8"
                  autoFocus
                />
                {prefixSearchText.length > 0 && (
                  <TouchableOpacity onPress={() => setPrefixSearchText('')} activeOpacity={0.7}>
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={filteredPrefixList}
                keyExtractor={(item: PhonePrefix, index: number) => `${item.code}-${item.country}-${index}`}
                style={styles.prefixList}
                renderItem={({ item }: { item: PhonePrefix }) => (
                  <TouchableOpacity
                    style={[
                      styles.prefixOption,
                      phonePrefix === item.code && styles.prefixOptionSelected,
                    ]}
                    onPress={() => {
                      setPhonePrefix(item.code);
                      setShowPrefixModal(false);
                      setPrefixSearchText('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.prefixFlag}>{item.flag}</Text>
                    <View style={styles.prefixInfo}>
                      <Text style={styles.prefixCountry}>{item.country}</Text>
                      <Text style={styles.prefixCode}>{item.code}</Text>
                    </View>
                    {phonePrefix === item.code && (
                      <Text style={styles.prefixCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal
          visible={showShiftsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowShiftsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Configurar Turnos - {selectedDay?.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </Text>
                <TouchableOpacity onPress={() => setShowShiftsModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.section}>
                  <Text style={styles.sectionNote}>
                    Selecciona las plantillas de turnos que deseas activar para este día. Luego podrás configurar cada horario individualmente.
                  </Text>

                  {templatesQuery.isLoading ? (
                    <ActivityIndicator size="large" color="#8b5cf6" />
                  ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
                    templatesQuery.data.map((template: any) => {
                      const isSelected = selectedTemplateIds.includes(template.id);
                      const isExpanded = expandedTemplateIds.includes(template.id);
                      const times = Array.isArray(template.times) ? template.times : [];

                      return (
                        <View key={template.id} style={styles.templateCard}>
                          <TouchableOpacity
                            style={styles.templateHeader}
                            onPress={() => {
                              if (isSelected) {
                                setSelectedTemplateIds(selectedTemplateIds.filter((id: string) => id !== template.id));
                                setExpandedTemplateIds(expandedTemplateIds.filter((id: string) => id !== template.id));
                                // Limpiar configuraciones de este template
                                const newConfigs = { ...timeConfigs };
                                times.forEach((time: string) => {
                                  delete newConfigs[`${template.id}-${time}`];
                                });
                                setTimeConfigs(newConfigs);
                              } else {
                                setSelectedTemplateIds([...selectedTemplateIds, template.id]);
                                setExpandedTemplateIds([...expandedTemplateIds, template.id]);
                                // Inicializar configuraciones con valores por defecto o heredados
                                const newConfigs = { ...timeConfigs };
                                times.forEach((time: string) => {
                                  const key = `${template.id}-${time}`;
                                  if (!newConfigs[key]) {
                                    // Buscar config en schedules o usar valores por defecto
                                    let defaultConfig = { maxGuests: 10, minRating: 0, minLocalRating: 0 };
                                    if (selectedDay?.schedule?.shifts) {
                                      const matchingShift = selectedDay.schedule.shifts.find(
                                        (s: any) => s.id === template.id && s.name === time
                                      );
                                      if (matchingShift) {
                                        defaultConfig = {
                                          maxGuests: matchingShift.maxGuestsPerHour || 10,
                                          minRating: matchingShift.minRating || 0,
                                          minLocalRating: 0,
                                        };
                                      }
                                    }
                                    newConfigs[key] = defaultConfig;
                                  }
                                });
                                setTimeConfigs(newConfigs);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.templateCheckbox}>
                              <View style={[
                                styles.checkbox,
                                isSelected && styles.checkboxSelected
                              ]}>
                                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                              </View>
                              <View style={styles.templateInfo}>
                                <Text style={styles.templateName}>{template.name}</Text>
                                <Text style={styles.templateTimeCount}>{times.length} horarios</Text>
                              </View>
                            </View>
                            {isSelected && (
                              <TouchableOpacity
                                onPress={() => {
                                  if (isExpanded) {
                                    setExpandedTemplateIds(expandedTemplateIds.filter((id: string) => id !== template.id));
                                  } else {
                                    setExpandedTemplateIds([...expandedTemplateIds, template.id]);
                                  }
                                }}
                                style={styles.expandButton}
                              >
                                <ChevronDown size={20} color="#8b5cf6" style={{
                                  transform: [{ rotate: isExpanded ? '180deg' : '0deg' }]
                                }} />
                              </TouchableOpacity>
                            )}
                          </TouchableOpacity>

                          {isSelected && isExpanded && (
                            <View style={styles.timeConfigsContainer}>
                              {times.map((time: string) => {
                                const key = `${template.id}-${time}`;
                                const config = timeConfigs[key] || { maxGuests: 10, minRating: 0, minLocalRating: 0 };

                                return (
                                  <View key={time} style={styles.timeConfigCard}>
                                    <Text style={styles.timeConfigTime}>{time}</Text>
                                    
                                    <View style={styles.configInputRow}>
                                      <View style={styles.configInputField}>
                                        <Text style={styles.configInputLabel}>Comensales/h</Text>
                                        <TextInput
                                          style={styles.configInput}
                                          value={String(config.maxGuests)}
                                          onChangeText={(text) => {
                                            const num = parseInt(text) || 0;
                                            setTimeConfigs({
                                              ...timeConfigs,
                                              [key]: { ...config, maxGuests: num }
                                            });
                                          }}
                                          keyboardType="number-pad"
                                          placeholderTextColor="#9ca3af"
                                        />
                                      </View>
                                      <View style={styles.configInputField}>
                                        <Text style={styles.configInputLabel}>Val. Global</Text>
                                        <TextInput
                                          style={styles.configInput}
                                          defaultValue={String((config.minRating || 0).toFixed(1))}
                                          onBlur={(e) => {
                                            const text = e.nativeEvent.text;
                                            const value = parseFloat(text || '0');
                                            const clamped = Math.min(5, Math.max(0, value));
                                            const rounded = Math.round(clamped * 10) / 10;
                                            
                                            setTimeConfigs({
                                              ...timeConfigs,
                                              [key]: { ...config, minRating: rounded }
                                            });
                                          }}
                                          onFocus={(e) => {
                                            if (Platform.OS === 'web') {
                                              setTimeout(() => {
                                                (e.target as HTMLInputElement).select();
                                              }, 0);
                                            }
                                          }}
                                          keyboardType="decimal-pad"
                                          placeholder="0.0"
                                          placeholderTextColor="#9ca3af"
                                        />
                                      </View>
                                      <View style={styles.configInputField}>
                                        <Text style={styles.configInputLabel}>Val. Local</Text>
                                        <TextInput
                                          style={styles.configInput}
                                          defaultValue={String((config.minLocalRating || 0).toFixed(1))}
                                          onBlur={(e) => {
                                            const text = e.nativeEvent.text;
                                            const value = parseFloat(text || '0');
                                            const clamped = Math.min(5, Math.max(0, value));
                                            const rounded = Math.round(clamped * 10) / 10;
                                            
                                            setTimeConfigs({
                                              ...timeConfigs,
                                              [key]: { ...config, minLocalRating: rounded }
                                            });
                                          }}
                                          onFocus={(e) => {
                                            if (Platform.OS === 'web') {
                                              setTimeout(() => {
                                                (e.target as HTMLInputElement).select();
                                              }, 0);
                                            }
                                          }}
                                          keyboardType="decimal-pad"
                                          placeholder="0.0"
                                          placeholderTextColor="#9ca3af"
                                        />
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyState}>
                      <Clock size={48} color="#94a3b8" />
                      <Text style={styles.emptyText}>No hay plantillas de turnos</Text>
                      <Text style={styles.emptySubtext}>Crea plantillas en el módulo de Horarios</Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary]}
                  onPress={() => setShowShiftsModal(false)}
                >
                  <Text style={styles.footerButtonTextSecondary}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonPrimary]}
                  onPress={() => {
                    if (!selectedDay || !restaurantId) return;

                    const shifts: any[] = [];
                    selectedTemplateIds.forEach((templateId: string) => {
                      const template = templatesQuery.data?.find((t: any) => t.id === templateId);
                      if (template && template.times) {
                        template.times.forEach((time: string) => {
                          const key = `${templateId}-${time}`;
                          const config = timeConfigs[key] || { maxGuests: 10, minRating: 0, minLocalRating: 0 };
                          
                          shifts.push({
                            templateId: templateId,
                            startTime: time,
                            endTime: time,
                            maxGuestsPerHour: config.maxGuests,
                            minRating: config.minRating,
                            minLocalRating: config.minLocalRating,
                          });
                        });
                      }
                    });

                    console.log('🔵 [SAVE SHIFTS] Guardando:', { 
                      shifts, 
                      templateIds: selectedTemplateIds,
                      shiftsCount: shifts.length,
                      willBeOpen: shifts.length > 0 || selectedDay.isOpen
                    });

                    updateExceptionWithShiftsMutation.mutate({
                      restaurantId,
                      date: selectedDay.dateString,
                      isOpen: shifts.length > 0,
                      shifts,
                    });
                  }}
                  disabled={updateExceptionWithShiftsMutation.isPending}
                >
                  <Text style={styles.footerButtonTextPrimary}>
                    {updateExceptionWithShiftsMutation.isPending ? 'Guardando...' : 'Guardar Turnos'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Reserva</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.section}>
                  {editingReservation && (
                    <View style={styles.editInfo}>
                      <Text style={styles.editInfoText}>Cliente: {editingReservation.clientName}</Text>
                      <Text style={styles.editInfoText}>Hora: {String(editingReservation.time.hour).padStart(2, '0')}:{String(editingReservation.time.minute).padStart(2, '0')}</Text>
                      <Text style={styles.editInfoText}>Comensales: {editingReservation.guests}</Text>
                      {editingReservation.tableNames && editingReservation.tableNames.length > 0 && (
                        <Text style={styles.editInfoText}>Mesa actual: {editingReservation.tableNames.join(', ')}</Text>
                      )}
                      {(editingReservation.needsHighChair || editingReservation.needsStroller || editingReservation.hasPets) && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {editingReservation.needsHighChair && (
                            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 12, color: '#92400e' }}>🪑 {editingReservation.highChairCount || 1} trona{(editingReservation.highChairCount || 1) > 1 ? 's' : ''}</Text>
                            </View>
                          )}
                          {editingReservation.needsStroller && (
                            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 12, color: '#92400e' }}>🚼 Carrito</Text>
                            </View>
                          )}
                          {editingReservation.hasPets && (
                            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 12, color: '#92400e' }}>🐕 Mascota</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={styles.sectionTitle}>Ubicación</Text>
                  {locationsQuery.isLoading ? (
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  ) : (
                    <View style={styles.locationsList}>
                      {locationsQuery.data?.map((location: any) => (
                        <TouchableOpacity
                          key={location.id}
                          style={[
                            styles.locationOption,
                            selectedLocation === location.id && styles.locationOptionSelected,
                          ]}
                          onPress={() => {
                            setSelectedLocation(location.id);
                            setSelectedTables([]);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.locationOptionText,
                            selectedLocation === location.id && styles.locationOptionTextSelected,
                          ]}>
                            {location.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {selectedLocation && (
                    <>
                      <Text style={styles.sectionTitle}>Seleccionar Mesa</Text>
                      {tablesForEditQuery.isLoading ? (
                        <ActivityIndicator size="small" color="#8b5cf6" />
                      ) : (
                        <View style={styles.tablesList}>
                          {(() => {
                            const allTablesInLocation = (tablesForEditQuery.data || []).filter((t: any) => t.locationId === selectedLocation);
                            const editDate = editingReservation ? new Date(editingReservation.date) : null;
                            const freeTables: any[] = [];
                            const swappableTables: any[] = [];
                            const configurableTables: any[] = [];
                            const blockedList: any[] = [];

                            allTablesInLocation.forEach((table: any) => {
                              const isBlockedTable = editBlocksQuery.data?.some((block: any) => block.tableId === table.id);
                              if (isBlockedTable) { blockedList.push(table); return; }

                              const resGuests = editingReservation?.guests || 1;
                              const tableMax = table.maxCapacity || table.capacity || 99;
                              const tableMin = table.minCapacity || 1;
                              const isCompatible = tableMax >= resGuests && tableMin <= resGuests &&
                                (!editingReservation?.needsHighChair || !(editingReservation?.highChairCount > 0) || table.allowsHighChairs || table.availableHighChairs > 0) &&
                                (!editingReservation?.needsStroller || table.allowsStroller || table.allowsStrollers) &&
                                (!editingReservation?.hasPets || table.allowsPets);

                              const hasOtherReservation = editDate ? reservationsQuery.data?.some((res: any) => {
                                if (res.id === editingReservation?.id) return false;
                                if (res.status === 'cancelled' || res.status === 'modified') return false;
                                if (!res.tableIds?.includes(table.id)) return false;
                                const resDate = new Date(res.date);
                                return resDate.getDate() === editDate.getDate() &&
                                       resDate.getMonth() === editDate.getMonth() &&
                                       resDate.getFullYear() === editDate.getFullYear();
                              }) : false;

                              if (isCompatible && !hasOtherReservation) {
                                freeTables.push(table);
                              } else if (isCompatible && hasOtherReservation) {
                                swappableTables.push(table);
                              } else if (!isCompatible && !hasOtherReservation) {
                                configurableTables.push(table);
                              }
                            });

                            return (
                              <>
                                {freeTables.length > 0 && (
                                  <>
                                    <View style={styles.tableSectionHeader}>
                                      <View style={[styles.tableSectionDot, { backgroundColor: '#10B981' }]} />
                                      <Text style={[styles.tableSectionLabel, { color: '#065F46' }]}>Disponibles</Text>
                                    </View>
                                    {freeTables.map((table: any) => {
                                      const isSelected = selectedTables.includes(table.id);
                                      const isCurrentTable = editingReservation?.tableIds?.includes(table.id);
                                      return (
                                        <TouchableOpacity
                                          key={table.id}
                                          style={[styles.tableOption, styles.tableOptionAvailable, isSelected && styles.tableOptionSelected, isCurrentTable && !isSelected && { borderColor: '#10B981', borderWidth: 2 }]}
                                          onPress={() => { if (isSelected) setSelectedTables([]); else setSelectedTables([table.id]); }}
                                          activeOpacity={0.7}
                                        >
                                          <Text style={[styles.tableOptionText, isSelected && styles.tableOptionTextSelected, !isSelected && { color: '#065F46' }]}>{table.name}</Text>
                                          <Text style={[styles.tableCapacity, !isSelected && { color: '#059669' }]}>{table.minCapacity}-{table.maxCapacity} personas</Text>
                                          <Text style={styles.tableAvailableLabel}>disponible</Text>
                                          {isCurrentTable && !isSelected && <Text style={[styles.tableCapacity, { color: '#059669', fontWeight: '600' as const }]}>Mesa actual</Text>}
                                          {isSelected && <View style={{ position: 'absolute', right: 8, top: 8 }}><Check size={16} color="#8b5cf6" /></View>}
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </>
                                )}

                                {swappableTables.length > 0 && (
                                  <>
                                    <View style={styles.tableSectionHeader}>
                                      <View style={[styles.tableSectionDot, { backgroundColor: '#F59E0B' }]} />
                                      <Text style={[styles.tableSectionLabel, { color: '#92400E' }]}>Con reserva (intercambiables)</Text>
                                    </View>
                                    {swappableTables.map((table: any) => {
                                      const isSelected = selectedTables.includes(table.id);
                                      return (
                                        <TouchableOpacity
                                          key={table.id}
                                          style={[styles.tableOption, isSelected && styles.tableOptionSelected, !isSelected && { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}
                                          onPress={() => { if (isSelected) setSelectedTables([]); else setSelectedTables([table.id]); }}
                                          activeOpacity={0.7}
                                        >
                                          <Text style={[styles.tableOptionText, isSelected && styles.tableOptionTextSelected, !isSelected && { color: '#92400E' }]}>{table.name}</Text>
                                          <Text style={styles.tableCapacity}>{table.minCapacity}-{table.maxCapacity} personas</Text>
                                          {!isSelected && <Text style={[styles.tableCapacity, { color: '#F59E0B', fontWeight: '600' as const }]}>Reservada · intercambiar</Text>}
                                          {isSelected && <View style={{ position: 'absolute', right: 8, top: 8 }}><Check size={16} color="#8b5cf6" /></View>}
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </>
                                )}

                                {configurableTables.length > 0 && (
                                  <>
                                    <View style={styles.tableSectionHeader}>
                                      <View style={[styles.tableSectionDot, { backgroundColor: '#EF4444' }]} />
                                      <Text style={[styles.tableSectionLabel, { color: '#7F1D1D' }]}>Configurables</Text>
                                    </View>
                                    {configurableTables.map((table: any) => (
                                      <TouchableOpacity
                                        key={table.id}
                                        style={[styles.tableOption, styles.tableOptionConfigurable]}
                                        onPress={() => {
                                          setConfigurableSelectedTable(table);
                                          setConfigurableGuestsInput(String(editingReservation?.guests || 1));
                                          setShowConfigurableTableModal(true);
                                        }}
                                        activeOpacity={0.7}
                                      >
                                        <Text style={[styles.tableOptionText, { color: '#991B1B' }]}>{table.name}</Text>
                                        <Text style={[styles.tableCapacity, { color: '#B91C1C' }]}>{table.minCapacity}-{table.maxCapacity} personas</Text>
                                        <Text style={styles.tableConfigurableLabel}>configurable</Text>
                                      </TouchableOpacity>
                                    ))}
                                  </>
                                )}

                                {blockedList.map((table: any) => (
                                  <View key={table.id} style={[styles.tableOption, { backgroundColor: '#FEE2E2', borderColor: '#FECACA', opacity: 0.7, flexDirection: 'row' as const, alignItems: 'center' as const }]}>
                                    <Lock size={12} color="#DC2626" />
                                    <Text style={[styles.tableOptionText, { color: '#DC2626', marginLeft: 6 }]}>{table.name}</Text>
                                    <Text style={[styles.tableCapacity, { color: '#DC2626', marginLeft: 8 }]}>Bloqueada</Text>
                                  </View>
                                ))}

                                {allTablesInLocation.length === 0 && (
                                  <Text style={styles.emptyText}>No hay mesas en esta ubicación</Text>
                                )}
                              </>
                            );
                          })()}
                        </View>
                      )}
                    </>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.footerButtonTextSecondary}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonPrimary]}
                  onPress={handleSaveEdit}
                  disabled={updateTableMutation.isPending || selectedTables.length === 0}
                >
                  <Text style={styles.footerButtonTextPrimary}>
                    {updateTableMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showRatingModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRatingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Valorar Cliente</Text>
                <TouchableOpacity onPress={() => setShowRatingModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.section}>
                  {ratingReservation && (
                    <View style={styles.editInfo}>
                      <Text style={styles.editInfoText}>Cliente: {ratingReservation.clientName}</Text>
                      <Text style={styles.sectionNote}>Tienes 24 horas desde la hora de la reserva para valorar al cliente</Text>
                    </View>
                  )}

                  <Text style={styles.sectionTitle}>Criterios de Valoración</Text>
                  {ratingCriteriaQuery.isLoading ? (
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  ) : ratingCriteriaQuery.data && ratingCriteriaQuery.data.length > 0 ? (
                    ratingCriteriaQuery.data.map((criteria: any) => (
                      <View key={criteria.id} style={styles.ratingCriteria}>
                        <Text style={styles.criteriaName}>{criteria.name}</Text>
                        {criteria.description && (
                          <Text style={styles.criteriaDescription}>{criteria.description}</Text>
                        )}
                        <View style={styles.ratingStars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                              key={star}
                              onPress={() => setRatings({ ...ratings, [criteria.id]: star })}
                              activeOpacity={0.7}
                            >
                              <Star
                                size={32}
                                color={star <= (ratings[criteria.id] || 4) ? '#fbbf24' : '#e5e7eb'}
                                fill={star <= (ratings[criteria.id] || 4) ? '#fbbf24' : 'transparent'}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No hay criterios de valoración configurados</Text>
                  )}

                  <View style={styles.noShowContainer}>
                    <TouchableOpacity
                      style={styles.noShowCheckbox}
                      onPress={() => setIsNoShow(!isNoShow)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.checkbox,
                        isNoShow && styles.checkboxSelected,
                      ]}>
                        {isNoShow && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.noShowText}>El cliente no se presentó (No Show)</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.blockClientContainer}>
                    <TouchableOpacity
                      style={styles.blockClientCheckbox}
                      onPress={() => setIsBlockClient(!isBlockClient)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.checkbox,
                        isBlockClient && styles.checkboxSelected,
                      ]}>
                        {isBlockClient && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={styles.blockClientTextContainer}>
                        <Text style={styles.blockClientText}>Bloquear cliente permanentemente</Text>
                        <Text style={styles.blockClientSubtext}>Este cliente no podrá reservar en tu restaurante</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary]}
                  onPress={() => setShowRatingModal(false)}
                >
                  <Text style={styles.footerButtonTextSecondary}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonPrimary]}
                  onPress={handleSaveRating}
                  disabled={rateClientMutation.isPending}
                >
                  <Text style={styles.footerButtonTextPrimary}>
                    {rateClientMutation.isPending ? 'Guardando...' : 'Guardar Valoración'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showTableBlockModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTableBlockModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Bloqueo de Mesas</Text>
                <TouchableOpacity onPress={() => setShowTableBlockModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.section}>
                  <Text style={styles.sectionNote}>
                    Bloquea una mesa para las próximas 2 horas. La mesa no estará disponible para reservas durante ese tiempo.
                  </Text>

                  <Text style={styles.sectionTitle}>Ubicación</Text>
                  {locationsQuery.isLoading ? (
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  ) : (
                    <View style={styles.locationsList}>
                      {locationsQuery.data?.map((location: any) => (
                        <TouchableOpacity
                          key={location.id}
                          style={[
                            styles.locationOption,
                            blockLocation === location.id && styles.locationOptionSelected,
                          ]}
                          onPress={() => {
                            setBlockLocation(location.id);
                            setBlockTable('');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.locationOptionText,
                            blockLocation === location.id && styles.locationOptionTextSelected,
                          ]}>
                            {location.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {blockLocation && (
                    <>
                      <Text style={styles.sectionTitle}>Seleccionar Mesa</Text>
                      {blockTablesQuery.isLoading ? (
                        <ActivityIndicator size="small" color="#8b5cf6" />
                      ) : blockTablesQuery.data && blockTablesQuery.data.filter((t: any) => t.locationId === blockLocation).length > 0 ? (
                        <View style={styles.tablesList}>
                          {blockTablesQuery.data
                            .filter((table: any) => table.locationId === blockLocation)
                            .map((table: any) => {
                              const isSelected = blockTable === table.id;
                              return (
                                <TouchableOpacity
                                  key={table.id}
                                  style={[
                                    styles.tableOption,
                                    isSelected && styles.tableOptionSelected,
                                  ]}
                                  onPress={() => setBlockTable(table.id)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[
                                    styles.tableOptionText,
                                    isSelected && styles.tableOptionTextSelected,
                                  ]}>
                                    {table.name}
                                  </Text>
                                  <Text style={styles.tableCapacity}>
                                    {table.minCapacity}-{table.maxCapacity} personas
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>No hay mesas en esta ubicación</Text>
                      )}

                      <Text style={styles.sectionTitle}>Duración del Bloqueo</Text>
                      <Text style={styles.sectionNote}>Tiempo en minutos que la mesa permanecerá bloqueada</Text>
                      <TextInput
                        style={styles.formInput}
                        value={blockDuration}
                        onChangeText={setBlockDuration}
                        placeholder="120"
                        keyboardType="number-pad"
                        placeholderTextColor="#9ca3af"
                      />
                    </>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary]}
                  onPress={() => setShowTableBlockModal(false)}
                >
                  <Text style={styles.footerButtonTextSecondary}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonPrimary]}
                  onPress={() => {
                    if (!blockTable || !restaurantId) {
                      Alert.alert('Error', 'Selecciona una mesa para bloquear');
                      return;
                    }
                    const duration = parseInt(blockDuration) || 120;
                    blockTableMutation.mutate({
                      restaurantId,
                      tableId: blockTable,
                      locationId: blockLocation,
                      durationMinutes: duration,
                    });
                  }}
                  disabled={!blockTable || blockTableMutation.isPending}
                >
                  <Text style={styles.footerButtonTextPrimary}>
                    {blockTableMutation.isPending ? 'Bloqueando...' : 'Bloquear Mesa'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showDayMessageModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDayMessageModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Mensaje del día - {selectedDay?.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </Text>
                <TouchableOpacity onPress={() => setShowDayMessageModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.section}>
                  <Text style={styles.sectionNote}>
                    El mensaje del día se mostrará en el buscador público cuando los clientes seleccionen este día para reservar.
                  </Text>

                  <View style={styles.dayMessageToggle}>
                    <Text style={styles.dayMessageToggleLabel}>Activar mensaje para este día</Text>
                    <TouchableOpacity
                      style={[styles.toggleSwitch, dayMessageEnabled && styles.toggleSwitchActive]}
                      onPress={() => setDayMessageEnabled(!dayMessageEnabled)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.toggleCircle, dayMessageEnabled && styles.toggleCircleActive]} />
                    </TouchableOpacity>
                  </View>

                  {dayMessageEnabled && (
                    <View style={styles.dayMessageInputContainer}>
                      <Text style={styles.formLabel}>Mensaje a mostrar</Text>
                      <TextInput
                        style={styles.dayMessageInput}
                        value={dayMessageText}
                        onChangeText={setDayMessageText}
                        placeholder="Ej: Hoy tenemos un menú especial por festividad local..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      <Text style={styles.formHelper}>Este mensaje aparecerá destacado en el proceso de reserva</Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary]}
                  onPress={() => setShowDayMessageModal(false)}
                >
                  <Text style={styles.footerButtonTextSecondary}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonPrimary]}
                  onPress={() => {
                    if (!selectedDay || !restaurantId) return;

                    let shiftsToKeep: any[] = [];
                    if (selectedDay.exception?.shifts && Array.isArray(selectedDay.exception.shifts)) {
                      shiftsToKeep = selectedDay.exception.shifts;
                    }

                    updateExceptionWithShiftsMutation.mutate({
                      restaurantId,
                      date: selectedDay.dateString,
                      isOpen: selectedDay.isOpen,
                      shifts: shiftsToKeep,
                      specialDayMessage: dayMessageEnabled ? dayMessageText : undefined,
                      specialMessageEnabled: dayMessageEnabled,
                    });

                    setShowDayMessageModal(false);
                    setShowDayModal(true);
                  }}
                  disabled={updateExceptionWithShiftsMutation.isPending || (dayMessageEnabled && !dayMessageText.trim())}
                >
                  <Text style={styles.footerButtonTextPrimary}>
                    {updateExceptionWithShiftsMutation.isPending ? 'Guardando...' : 'Guardar Mensaje'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showAvailableTablesModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowAvailableTablesModal(false);
            setSelectedShiftForTables(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '95%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Mesas disponibles - {selectedDay?.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowAvailableTablesModal(false);
                  setSelectedShiftForTables(null);
                  setShowDayModal(true);
                }} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {!selectedShiftForTables ? (
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Selecciona un turno</Text>
                    <Text style={styles.sectionNote}>Elige el turno para ver las mesas disponibles y ocupadas</Text>
                    
                    {selectedDay?.exception?.shifts && Array.isArray(selectedDay.exception.shifts) && selectedDay.exception.shifts.length > 0 ? (
                      selectedDay.exception.shifts.map((shift: any, index: number) => {
                        const template = templatesQuery.data?.find((t: any) => t.id === shift.templateId);
                        return (
                          <TouchableOpacity
                            key={index}
                            style={styles.shiftCard}
                            onPress={() => setSelectedShiftForTables(shift)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.shiftCardHeader}>
                              <Text style={styles.shiftCardTitle}>{template?.name || 'Turno'}</Text>
                              <Text style={styles.shiftCardTime}>{shift.startTime} - {shift.endTime}</Text>
                            </View>
                            <Text style={styles.shiftCardCapacity}>Capacidad: {shift.maxGuestsPerHour || 0} comensales/hora</Text>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.emptyState}>
                        <Clock size={48} color="#94a3b8" />
                        <Text style={styles.emptyText}>No hay turnos configurados</Text>
                        <Text style={styles.emptySubtext}>Configura los turnos para este día</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              ) : (
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.section}>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => setSelectedShiftForTables(null)}
                      activeOpacity={0.7}
                    >
                      <ChevronLeft size={20} color="#8b5cf6" />
                      <Text style={styles.backButtonText}>Volver a turnos</Text>
                    </TouchableOpacity>

                    <View style={styles.shiftSummary}>
                      <Text style={styles.shiftSummaryTitle}>
                        {templatesQuery.data?.find((t: any) => t.id === selectedShiftForTables.templateId)?.name || 'Turno'}
                      </Text>
                      <Text style={styles.shiftSummaryTime}>{selectedShiftForTables.startTime} - {selectedShiftForTables.endTime}</Text>
                    </View>

                    <View style={styles.statsContainer}>
                      <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Comensales totales</Text>
                        <Text style={styles.statValue}>{selectedDayReservations.filter((r: any) => r.status !== 'cancelled' && r.status !== 'modified').reduce((sum: number, r: any) => sum + r.guests, 0)}</Text>
                      </View>
                    </View>

                    <Text style={styles.sectionTitle}>Comensales por hora</Text>
                    {(() => {
                      const startParts = selectedShiftForTables.startTime.split(':');
                      const endParts = selectedShiftForTables.endTime.split(':');
                      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
                      const interval = 30;
                      const slots = [];
                      
                      for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
                        const hour = Math.floor(minutes / 60);
                        const minute = minutes % 60;
                        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                        const reservationsAtTime = selectedDayReservations.filter((r: any) => 
                          r.status !== 'cancelled' && r.status !== 'modified' &&
                          r.time.hour === hour && r.time.minute === minute
                        );
                        const guestsAtTime = reservationsAtTime.reduce((sum: number, r: any) => sum + r.guests, 0);
                        
                        slots.push(
                          <View key={timeString} style={styles.hourSlotCard}>
                            <Text style={styles.hourSlotTime}>{timeString}</Text>
                            <Text style={styles.hourSlotGuests}>{guestsAtTime} / {selectedShiftForTables.maxGuestsPerHour || 0} comensales</Text>
                          </View>
                        );
                      }
                      
                      return slots;
                    })()}

                    <Text style={styles.sectionTitle}>Mesas por ubicación</Text>
                    {locationsQuery.data?.map((location: any) => {
                      const tables = availableTablesQuery.data?.filter((t: any) => t.locationId === location.id) || [];
                      if (tables.length === 0) return null;
                      
                      return (
                        <View key={location.id} style={styles.locationSection}>
                          <Text style={styles.locationSectionTitle}>{location.name}</Text>
                          <View style={styles.tablesGrid}>
                            {tables.map((table: any) => {
                              const reservation = selectedDayReservations.find((r: any) => 
                                r.status !== 'cancelled' && r.status !== 'modified' &&
                                r.tableIds?.includes(table.id)
                              );
                              const isReserved = !!reservation;
                              
                              return (
                                <View
                                  key={table.id}
                                  style={[
                                    styles.tableBox,
                                    isReserved ? styles.tableBoxReserved : styles.tableBoxAvailable
                                  ]}
                                >
                                  <Text style={[
                                    styles.tableBoxNumber,
                                    isReserved ? styles.tableBoxNumberReserved : styles.tableBoxNumberAvailable
                                  ]}>{table.name}</Text>
                                  {isReserved && (
                                    <>
                                      <Text style={styles.tableBoxTime}>
                                        {String(reservation.time.hour).padStart(2, '0')}:{String(reservation.time.minute).padStart(2, '0')}
                                      </Text>
                                      <Text style={styles.tableBoxGuests}>{reservation.guests} pers.</Text>
                                    </>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowAvailableTablesModal(false);
                  setSelectedShiftForTables(null);
                  setShowDayModal(true);
                }}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showBulkShiftsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBulkShiftsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Asignar Turnos - {selectedDays.length} día(s)
                </Text>
                <TouchableOpacity onPress={() => setShowBulkShiftsModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.section}>
                  <Text style={styles.sectionNote}>
                    Los turnos seleccionados se aplicarán a todos los días marcados ({selectedDays.length} días).
                  </Text>

                  {templatesQuery.isLoading ? (
                    <ActivityIndicator size="large" color="#8b5cf6" />
                  ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
                    templatesQuery.data.map((template: any) => {
                      const isSelected = bulkSelectedTemplateIds.includes(template.id);
                      const isExpanded = bulkExpandedTemplateIds.includes(template.id);
                      const times = Array.isArray(template.times) ? template.times : [];

                      return (
                        <View key={template.id} style={styles.templateCard}>
                          <TouchableOpacity
                            style={styles.templateHeader}
                            onPress={() => {
                              if (isSelected) {
                                setBulkSelectedTemplateIds(bulkSelectedTemplateIds.filter((id: string) => id !== template.id));
                                setBulkExpandedTemplateIds(bulkExpandedTemplateIds.filter((id: string) => id !== template.id));
                                const newConfigs = { ...bulkTimeConfigs };
                                times.forEach((time: string) => {
                                  delete newConfigs[`${template.id}-${time}`];
                                });
                                setBulkTimeConfigs(newConfigs);
                              } else {
                                setBulkSelectedTemplateIds([...bulkSelectedTemplateIds, template.id]);
                                setBulkExpandedTemplateIds([...bulkExpandedTemplateIds, template.id]);
                                const newConfigs = { ...bulkTimeConfigs };
                                times.forEach((time: string) => {
                                  const key = `${template.id}-${time}`;
                                  if (!newConfigs[key]) {
                                    newConfigs[key] = { maxGuests: 10, minRating: 0, minLocalRating: 0 };
                                  }
                                });
                                setBulkTimeConfigs(newConfigs);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.templateCheckbox}>
                              <View style={[
                                styles.checkbox,
                                isSelected && styles.checkboxSelected
                              ]}>
                                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                              </View>
                              <View style={styles.templateInfo}>
                                <Text style={styles.templateName}>{template.name}</Text>
                                <Text style={styles.templateTimeCount}>{times.length} horarios</Text>
                              </View>
                            </View>
                            {isSelected && (
                              <TouchableOpacity
                                onPress={() => {
                                  if (isExpanded) {
                                    setBulkExpandedTemplateIds(bulkExpandedTemplateIds.filter((id: string) => id !== template.id));
                                  } else {
                                    setBulkExpandedTemplateIds([...bulkExpandedTemplateIds, template.id]);
                                  }
                                }}
                                style={styles.expandButton}
                              >
                                <ChevronDown size={20} color="#8b5cf6" style={{
                                  transform: [{ rotate: isExpanded ? '180deg' : '0deg' }]
                                }} />
                              </TouchableOpacity>
                            )}
                          </TouchableOpacity>

                          {isSelected && isExpanded && (
                            <View style={styles.timeConfigsContainer}>
                              {times.map((time: string) => {
                                const key = `${template.id}-${time}`;
                                const config = bulkTimeConfigs[key] || { maxGuests: 10, minRating: 0, minLocalRating: 0 };

                                return (
                                  <View key={time} style={styles.timeConfigCard}>
                                    <Text style={styles.timeConfigTime}>{time}</Text>
                                    
                                    <View style={styles.configInputRow}>
                                      <View style={styles.configInputField}>
                                        <Text style={styles.configInputLabel}>Comensales/h</Text>
                                        <TextInput
                                          style={styles.configInput}
                                          value={String(config.maxGuests)}
                                          onChangeText={(text) => {
                                            const num = parseInt(text) || 0;
                                            setBulkTimeConfigs({
                                              ...bulkTimeConfigs,
                                              [key]: { ...config, maxGuests: num }
                                            });
                                          }}
                                          keyboardType="number-pad"
                                          placeholderTextColor="#9ca3af"
                                        />
                                      </View>
                                      <View style={styles.configInputField}>
                                        <Text style={styles.configInputLabel}>Val. Global</Text>
                                        <TextInput
                                          style={styles.configInput}
                                          defaultValue={String((config.minRating || 0).toFixed(1))}
                                          onBlur={(e) => {
                                            const text = e.nativeEvent.text;
                                            const value = parseFloat(text || '0');
                                            const clamped = Math.min(5, Math.max(0, value));
                                            const rounded = Math.round(clamped * 10) / 10;
                                            
                                            setBulkTimeConfigs({
                                              ...bulkTimeConfigs,
                                              [key]: { ...config, minRating: rounded }
                                            });
                                          }}
                                          onFocus={(e) => {
                                            if (Platform.OS === 'web') {
                                              setTimeout(() => {
                                                (e.target as HTMLInputElement).select();
                                              }, 0);
                                            }
                                          }}
                                          keyboardType="decimal-pad"
                                          placeholder="0.0"
                                          placeholderTextColor="#9ca3af"
                                        />
                                      </View>
                                      <View style={styles.configInputField}>
                                        <Text style={styles.configInputLabel}>Val. Local</Text>
                                        <TextInput
                                          style={styles.configInput}
                                          defaultValue={String((config.minLocalRating || 0).toFixed(1))}
                                          onBlur={(e) => {
                                            const text = e.nativeEvent.text;
                                            const value = parseFloat(text || '0');
                                            const clamped = Math.min(5, Math.max(0, value));
                                            const rounded = Math.round(clamped * 10) / 10;
                                            
                                            setBulkTimeConfigs({
                                              ...bulkTimeConfigs,
                                              [key]: { ...config, minLocalRating: rounded }
                                            });
                                          }}
                                          onFocus={(e) => {
                                            if (Platform.OS === 'web') {
                                              setTimeout(() => {
                                                (e.target as HTMLInputElement).select();
                                              }, 0);
                                            }
                                          }}
                                          keyboardType="decimal-pad"
                                          placeholder="0.0"
                                          placeholderTextColor="#9ca3af"
                                        />
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyState}>
                      <Clock size={48} color="#94a3b8" />
                      <Text style={styles.emptyText}>No hay plantillas de turnos</Text>
                      <Text style={styles.emptySubtext}>Crea plantillas en el módulo de Horarios</Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary]}
                  onPress={() => setShowBulkShiftsModal(false)}
                >
                  <Text style={styles.footerButtonTextSecondary}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonPrimary]}
                  onPress={() => {
                    if (!restaurantId) return;

                    const shifts: any[] = [];
                    bulkSelectedTemplateIds.forEach((templateId: string) => {
                      const template = templatesQuery.data?.find((t: any) => t.id === templateId);
                      if (template && template.times) {
                        template.times.forEach((time: string) => {
                          const key = `${templateId}-${time}`;
                          const config = bulkTimeConfigs[key] || { maxGuests: 10, minRating: 0, minLocalRating: 0 };
                          
                          shifts.push({
                            templateId: templateId,
                            startTime: time,
                            endTime: time,
                            maxGuestsPerHour: config.maxGuests,
                            minRating: config.minRating,
                            minLocalRating: config.minLocalRating,
                          });
                        });
                      }
                    });

                    processBulkUpdate(true, shifts);
                  }}
                  disabled={updateExceptionWithShiftsMutation.isPending || bulkSelectedTemplateIds.length === 0}
                >
                  <Text style={styles.footerButtonTextPrimary}>
                    {updateExceptionWithShiftsMutation.isPending ? 'Guardando...' : 'Aplicar Turnos'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          visible={showConfigurableTableModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfigurableTableModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '85%' as any }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Mesa Configurable</Text>
                <TouchableOpacity onPress={() => setShowConfigurableTableModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <View style={styles.section}>
                  <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FECACA' }}>
                    <Text style={{ fontSize: 15, color: '#991B1B', fontWeight: '700' as const }}>{configurableSelectedTable?.name}</Text>
                    <Text style={{ fontSize: 13, color: '#B91C1C', marginTop: 4 }}>
                      Capacidad: {configurableSelectedTable?.minCapacity}–{configurableSelectedTable?.maxCapacity} pax · Reserva: {editingReservation?.guests} comensales
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 14, lineHeight: 20 }}>
                    Esta mesa no coincide con los requisitos de la reserva. Puedes cambiar el número de comensales temporalmente:
                  </Text>
                  <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#BBF7D0' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600' as const, color: '#166534', marginBottom: 8 }}>Cambiar comensales temporalmente</Text>
                    <Text style={{ fontSize: 12, color: '#15803D', marginBottom: 10 }}>Ajusta el número de comensales solo para este turno:</Text>
                    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 }}>
                      <TouchableOpacity
                        style={{ backgroundColor: '#D1FAE5', borderRadius: 8, width: 36, height: 36, alignItems: 'center' as const, justifyContent: 'center' as const }}
                        onPress={() => setConfigurableGuestsInput(String(Math.max(1, parseInt(configurableGuestsInput || '1') - 1)))}
                      >
                        <Text style={{ fontSize: 20, color: '#065F46', fontWeight: '700' as const }}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={{ backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#6EE7B7', paddingHorizontal: 12, paddingVertical: 8, width: 64, textAlign: 'center' as const, fontSize: 16, fontWeight: '700' as const, color: '#065F46' }}
                        value={configurableGuestsInput}
                        onChangeText={setConfigurableGuestsInput}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={{ backgroundColor: '#D1FAE5', borderRadius: 8, width: 36, height: 36, alignItems: 'center' as const, justifyContent: 'center' as const }}
                        onPress={() => setConfigurableGuestsInput(String(parseInt(configurableGuestsInput || '1') + 1))}
                      >
                        <Text style={{ fontSize: 20, color: '#065F46', fontWeight: '700' as const }}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ backgroundColor: '#10B981', borderRadius: 8, flex: 1, paddingVertical: 10, alignItems: 'center' as const }}
                        onPress={() => {
                          const newGuests = parseInt(configurableGuestsInput || '1');
                          if (!newGuests || newGuests < 1) {
                            Alert.alert('Error', 'Ingresa un número de comensales válido');
                            return;
                          }
                          if (configurableSelectedTable) {
                            setSelectedTables([configurableSelectedTable.id]);
                          }
                          setShowConfigurableTableModal(false);
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#fff' }}>Aplicar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary]}
                  onPress={() => setShowConfigurableTableModal(false)}
                >
                  <Text style={styles.footerButtonTextSecondary}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showSwapConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSwapConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { borderRadius: 20, margin: 20, maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Intercambiar Mesas</Text>
                <TouchableOpacity onPress={() => setShowSwapConfirmModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <View style={styles.section}>
                  <Text style={styles.sectionNote}>
                    La mesa <Text style={{ fontWeight: '700', color: '#1F2937' }}>{swapTargetTable?.name}</Text> ya tiene una reserva asignada.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginVertical: 16 }}>
                    <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' }}>Reserva actual</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937', marginTop: 4 }}>{editingReservation?.clientName}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{editingReservation?.tableNames?.join(', ')}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>
                        {editingReservation?.time ? `${String(editingReservation.time.hour).padStart(2, '0')}:${String(editingReservation.time.minute).padStart(2, '0')}` : ''} · {editingReservation?.guests} pax
                      </Text>
                    </View>
                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 24, color: '#8b5cf6' }}>⇄</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' }}>En {swapTargetTable?.name}</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937', marginTop: 4 }}>{swapTargetReservation?.clientName}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>
                        {swapTargetReservation?.time ? `${String(swapTargetReservation.time.hour).padStart(2, '0')}:${String(swapTargetReservation.time.minute).padStart(2, '0')}` : ''} · {swapTargetReservation?.guests} pax
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.sectionNote, { textAlign: 'center', fontWeight: '600', color: '#1F2937' }]}>
                    ¿Deseas intercambiar las mesas de estas reservas?
                  </Text>
                </View>
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary]}
                  onPress={() => {
                    setShowSwapConfirmModal(false);
                    setSwapTargetTable(null);
                    setSwapTargetReservation(null);
                  }}
                >
                  <Text style={styles.footerButtonTextSecondary}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonPrimary, swapTablesMutation.isPending && { opacity: 0.7 }]}
                  onPress={() => {
                    if (!editingReservation || !swapTargetReservation) return;
                    swapTablesMutation.mutate({
                      reservationId1: editingReservation.id,
                      reservationId2: swapTargetReservation.id,
                    });
                  }}
                  disabled={swapTablesMutation.isPending}
                >
                  <Text style={styles.footerButtonTextPrimary}>
                    {swapTablesMutation.isPending ? 'Intercambiando...' : 'Sí, Intercambiar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  header: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  monthArrow: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f5f3ff',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'capitalize',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  headerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  headerActionButtonActive: {
    backgroundColor: '#f59e0b',
  },
  headerActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  headerActionButtonTextActive: {
    color: '#fff',
  },
  bulkActionsContainer: {
    backgroundColor: '#f5f3ff',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  bulkActionsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  bulkActionsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  bulkActionButtonClose: {
    backgroundColor: '#ef4444',
  },
  bulkActionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    paddingVertical: 6,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center' as const,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center' as const,
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  calendarContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
    maxHeight: 380,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 1.5,
  },
  dayCellInactive: {
    opacity: 0.3,
  },
  dayCellSelected: {},
  dayCellMultiSelected: {
    borderWidth: 3,
    borderColor: '#f59e0b',
  },
  dayCellOtherMonth: {
    opacity: 0.3,
  },
  dayCellToday: {},
  dayCellOpen: {},
  dayCellClosed: {},
  dayContent: {
    flex: 1,
    borderRadius: 12,
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
    backgroundColor: '#8b5cf6',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  dayNumberOtherMonth: {
    color: '#94a3b8',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  dayNumberToday: {},
  dayNumberOpen: {},
  dayNumberClosed: {},
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
  reservationCount: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  reservationCountSelected: {
    color: '#8b5cf6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'capitalize',
    flex: 1,
  },
  dayStatusContainer: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dayStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  toggleButtonContainer: {
    marginTop: 0,
  },
  dayStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  dayStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dayStatusBadgeOpen: {
    backgroundColor: '#d1fae5',
  },
  dayStatusBadgeClosed: {
    backgroundColor: '#fee2e2',
  },
  dayStatusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayStatusBadgeTextOpen: {
    color: '#065f46',
  },
  dayStatusBadgeTextClosed: {
    color: '#991b1b',
  },
  toggleButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '40%',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  modalScroll: {
    maxHeight: 500,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionNote: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
  reservationCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  reservationCardConfirmed: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: '#10b981',
  },
  reservationCardActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    borderColor: '#059669',
    borderWidth: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  reservationCardRatable: {
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    borderColor: '#ec4899',
    borderWidth: 2,
  },
  reservationCardCompleted: {
    backgroundColor: 'rgba(236, 72, 153, 0.06)',
    borderColor: '#d1d5db',
    borderWidth: 1,
    opacity: 0.8,
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
  reservationCardModified: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    shadowOpacity: 0,
    elevation: 0,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reservationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  reservationNameActive: {
    fontWeight: '800',
  },
  reservationPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  reservationStatus: {
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  statusBadgeActive: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeTextActive: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  statusBadgeRatable: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeTextRatable: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  statusBadgeCompleted: {
    backgroundColor: '#9ca3b8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeTextCompleted: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  statusBadgePending: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeTextPending: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '700',
  },
  reservationDetails: {
    gap: 8,
    marginBottom: 12,
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
  },
  detailTextActive: {
    fontWeight: '600',
    color: '#0f172a',
  },
  reservationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f5f3ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  configButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  closeButton: {
    backgroundColor: '#8b5cf6',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  searchModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    margin: 20,
    padding: 20,
    maxHeight: '80%',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  prefixSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 90,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  prefixModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    margin: 20,
    maxHeight: '75%',
  },
  prefixSearchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  prefixSearchBarInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  prefixList: {
    padding: 8,
  },
  prefixOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  prefixOptionSelected: {
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
    borderWidth: 2,
  },
  prefixFlag: {
    fontSize: 24,
  },
  prefixInfo: {
    flex: 1,
  },
  prefixCountry: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  prefixCode: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  prefixCheckmark: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  blockCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ffc107',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockInfo: {
    flex: 1,
  },
  blockTableName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  blockLocation: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  blockTime: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
  },
  unblockButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unblockButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  blockCardSplit: {
    backgroundColor: '#f3e8ff',
    borderColor: '#7c3aed',
  },
  splitBlockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  splitBlockText: {
    fontSize: 11,
    color: '#7c3aed',
    fontWeight: '600',
    flex: 1,
  },
  searchSubmitButton: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  searchSubmitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modifiedNote: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  reservationCardPending: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
    borderWidth: 2,
  },
  reservationCardAdded: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: '#3b82f6',
    borderWidth: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  reservationMainInfo: {
    flex: 1,
  },
  reservationId: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
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
    fontWeight: '600',
  },
  ratedNote: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600' as const,
    marginTop: 8,
    textAlign: 'center' as const,
  },
  completedAutoNote: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600' as const,
    marginTop: 8,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  noShowNote: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '700' as const,
    marginTop: 8,
    textAlign: 'center' as const,
  },
  vipTableNote: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  vipTableNoteText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  actionButtonRate: {
    backgroundColor: '#fce7f3',
    borderColor: '#ec4899',
  },
  actionButtonTextRate: {
    color: '#ec4899',
    fontWeight: '700' as const,
  },
  editInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  editInfoText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  locationsList: {
    gap: 8,
    marginBottom: 16,
  },
  locationOption: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  locationOptionSelected: {
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
  },
  locationOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  locationOptionTextSelected: {
    color: '#8b5cf6',
  },
  tablesList: {
    gap: 8,
  },
  tableOption: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  tableOptionSelected: {
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
  },
  tableOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tableOptionTextSelected: {
    color: '#8b5cf6',
  },
  tableCapacity: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  tableOptionAvailable: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  tableAvailableLabel: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700' as const,
    marginTop: 3,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  tableOptionConfigurable: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  tableConfigurableLabel: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700' as const,
    marginTop: 3,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  tableSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  tableSectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tableSectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  ratingCriteria: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  criteriaName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  criteriaDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  noShowContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  noShowCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noShowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  blockClientContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  blockClientCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  blockClientTextContainer: {
    flex: 1,
  },
  blockClientText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ef4444',
    marginBottom: 4,
  },
  blockClientSubtext: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  shiftCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shiftTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  shiftDetails: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  shiftActions: {
    flexDirection: 'row',
    gap: 8,
  },
  shiftActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shiftFormCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  shiftFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formField: {
    flex: 1,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formHelper: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  addShiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  addShiftButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  cancelEditButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  cancelEditButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerButtonSecondary: {
    backgroundColor: '#f1f5f9',
  },
  footerButtonPrimary: {
    backgroundColor: '#8b5cf6',
  },
  footerButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  footerButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  templateCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  templateTimeCount: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  expandButton: {
    padding: 4,
  },
  timeConfigsContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 12,
  },
  timeConfigCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeConfigTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  configInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  configInputField: {
    flex: 1,
  },
  configInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  configInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlign: 'center',
  },
  searchResultsContainer: {
    maxHeight: 400,
    marginTop: 16,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  searchResultCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultCardFuture: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  searchResultCardPast: {
    backgroundColor: '#f3f4f6',
    borderColor: '#9ca3af',
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  searchResultLeftHeader: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  searchResultDateBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  searchResultDateBadgeFuture: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  searchResultDateBadgePast: {
    backgroundColor: '#6b7280',
    color: '#fff',
  },
  searchResultStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchResultStatusConfirmed: {
    backgroundColor: '#10b981',
  },
  searchResultStatusCancelled: {
    backgroundColor: '#9ca3af',
  },
  searchResultStatusPending: {
    backgroundColor: '#fbbf24',
  },
  searchResultStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  searchResultDetail: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 5,
    fontWeight: '500',
  },
  emptySearchResults: {
    padding: 20,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  nameWithRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fce7f3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ec4899',
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  ratingBadgeHeart: {
    fontSize: 14,
    color: '#ec4899',
  },
  dayMessageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  dayMessageToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#10b981',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  dayMessageInputContainer: {
    marginTop: 8,
  },
  clientNameWithRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ratingBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  ratingTextSmall: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#d97706',
  },
  dayMessageInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#0f172a',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 120,
  },
  shiftCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  shiftCardTime: {
    fontSize: 14,
    color: '#64748b',
  },
  shiftCardCapacity: {
    fontSize: 13,
    color: '#64748b',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#8b5cf6',
  },
  shiftSummary: {
    backgroundColor: '#f5f3ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  shiftSummaryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#6d28d9',
    marginBottom: 4,
  },
  shiftSummaryTime: {
    fontSize: 14,
    color: '#8b5cf6',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  hourSlotCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hourSlotTime: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  hourSlotGuests: {
    fontSize: 14,
    color: '#64748b',
  },
  locationSection: {
    marginBottom: 24,
  },
  locationSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tableBox: {
    width: 100,
    minHeight: 90,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tableBoxAvailable: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  tableBoxReserved: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  tableBoxNumber: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  tableBoxNumberAvailable: {
    color: '#64748b',
  },
  tableBoxNumberReserved: {
    color: '#15803d',
  },
  tableBoxTime: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#15803d',
    marginTop: 4,
  },
  tableBoxGuests: {
    fontSize: 11,
    color: '#15803d',
  },
});
