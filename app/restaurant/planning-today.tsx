// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRestaurantId, getRestaurantSlug } from '@/lib/restaurantSession';
import { X, Users, Clock, Baby, Dog, ShoppingCart, Phone, MessageCircle, ChevronLeft, ChevronRight, Edit2, Check, Calendar, Crown, Star, Lock, Plus, MapPin, Unlock, RefreshCw, Scissors, Link2, Unlink, AlertTriangle, ListChecks, StickyNote } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShiftInfo {
  templateId: string;
  templateName: string;
  startTime: string;
  endTime: string;
  maxGuestsPerHour: number;
  timeSlotMaxGuests: Record<string, number>;
}

interface TimeSlotInfo {
  time: string;
  hour: number;
  minute: number;
  maxGuests: number;
  reservedGuests: number;
}

interface TableInfo {
  id: string;
  name: string;
  capacity: number;
  minCapacity?: number;
  maxCapacity?: number;
  locationId: string;
  isReserved: boolean;
  reservation?: any;
  reservations?: any[];
  isBlocked?: boolean;
  blockInfo?: any;
  groupedTableNames?: string[];
  availableFromTime?: string;
}

interface EditSelectableTable {
  id: string;
  name: string;
  minCapacity?: number;
  maxCapacity?: number;
  capacity?: number;
  locationId: string;
  isTemporary?: boolean;
  originalTableId?: string;
  groupedTableIds?: string[];
  allowsHighChairs?: boolean;
  availableHighChairs?: number;
  allowsStroller?: boolean;
  allowsStrollers?: boolean;
  allowsPets?: boolean;
  rotationTimeMinutes?: number;
}

export default function PlanningTodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [selectedShift, setSelectedShift] = useState<ShiftInfo | null>(null);
  const [autoShiftSelected, setAutoShiftSelected] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [showShiftSelector, setShowShiftSelector] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editMaxGuests, setEditMaxGuests] = useState<string>('');
  const [customMaxGuests, setCustomMaxGuests] = useState<Record<string, number>>({});
  const [showFreeTableModal, setShowFreeTableModal] = useState(false);
  const [selectedFreeTable, setSelectedFreeTable] = useState<TableInfo | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);
  const [editSelectedLocation, setEditSelectedLocation] = useState<string>('');
  const [editSelectedTables, setEditSelectedTables] = useState<string[]>([]);
  const [showSwapConfirmModal, setShowSwapConfirmModal] = useState(false);
  const [swapTargetTable, setSwapTargetTable] = useState<any>(null);
  const [swapTargetReservation, setSwapTargetReservation] = useState<any>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDuration, setBlockDuration] = useState<string>('120');
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [selectedBlockedTable, setSelectedBlockedTable] = useState<TableInfo | null>(null);
  const [blockWalkInName, setBlockWalkInName] = useState<string>('');
  const [blockWalkInPhone, setBlockWalkInPhone] = useState<string>('');
  const [blockWalkInPhonePrefix, setBlockWalkInPhonePrefix] = useState<string>('+34');
  const [blockWalkInGuests, setBlockWalkInGuests] = useState<number>(2);
  const [blockSelectedTimeSlot, setBlockSelectedTimeSlot] = useState<string>('');
  const [showBlockPrefixModal, setShowBlockPrefixModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalStep, setGroupModalStep] = useState<'time' | 'tables'>('time');
  const [groupTimeSlot, setGroupTimeSlot] = useState<string>('');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedTablesForGroup, setSelectedTablesForGroup] = useState<string[]>([]);
  const [splitTableBCapacity, setSplitTableBCapacity] = useState<string>('');
  const [modifiedTableACapacity, setModifiedTableACapacity] = useState<string>('');
  const [splitTableAMinCapacity, setSplitTableAMinCapacity] = useState<string>('');
  const [splitTableBMinCapacity, setSplitTableBMinCapacity] = useState<string>('');
  const [splitTableAHighChairs, setSplitTableAHighChairs] = useState<string>('0');
  const [splitTableBHighChairs, setSplitTableBHighChairs] = useState<string>('0');
  const [splitTableAAllowsStroller, setSplitTableAAllowsStroller] = useState(true);
  const [splitTableBAllowsStroller, setSplitTableBAllowsStroller] = useState(true);
  const [splitTableAAllowsPets, setSplitTableAAllowsPets] = useState(false);
  const [splitTableBAllowsPets, setSplitTableBAllowsPets] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUndoGroupModal, setShowUndoGroupModal] = useState(false);
  const [selectedGroupTable, setSelectedGroupTable] = useState<TableInfo | null>(null);
  const [showUndoSplitModal, setShowUndoSplitModal] = useState(false);
  const [selectedSplitTable, setSelectedSplitTable] = useState<TableInfo | null>(null);
  const [groupMinCapacity, setGroupMinCapacity] = useState<string>('');
  const [groupMaxCapacity, setGroupMaxCapacity] = useState<string>('');
  const queryClient = useQueryClient();
  const [showChangeTimeModal, setShowChangeTimeModal] = useState(false);
  const [showChangeGuestsModal, setShowChangeGuestsModal] = useState(false);
  const [changeGuestsValue, setChangeGuestsValue] = useState<number>(1);
  const [editGuestsValue, setEditGuestsValue] = useState<number>(1);
  const [editTimeValue, setEditTimeValue] = useState<string>('');
  const [editModalTab, setEditModalTab] = useState<'mesa' | 'comensales' | 'horario'>('comensales');
  const [groupModalError, setGroupModalError] = useState<string | null>(null);
  const [changeNeedsHighChair, setChangeNeedsHighChair] = useState(false);
  const [changeHighChairCount, setChangeHighChairCount] = useState<string>('1');
  const [changeNeedsStroller, setChangeNeedsStroller] = useState(false);
  const [changeHasPets, setChangeHasPets] = useState(false);
  const [blockWalkInExtraTables, setBlockWalkInExtraTables] = useState<string[]>([]);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [selectedWaitlistEntry, setSelectedWaitlistEntry] = useState<any>(null);
  const [waitlistAssignLocation, setWaitlistAssignLocation] = useState<string>('');
  const [waitlistAssignTableId, setWaitlistAssignTableId] = useState<string>('');
  const [waitlistAssignTime, setWaitlistAssignTime] = useState<string>('');
  const [editingWaitlistTime, setEditingWaitlistTime] = useState<any>(null);
  const [editWaitlistNewTime, setEditWaitlistNewTime] = useState<string>('');
  const [showInternalNoteModal, setShowInternalNoteModal] = useState(false);
  const [internalNoteValue, setInternalNoteValue] = useState<string>('');
  const [showTempCapacityModal, setShowTempCapacityModal] = useState(false);
  const [tempCapacityTable, setTempCapacityTable] = useState<TableInfo | null>(null);
  const [tempMinCapacity, setTempMinCapacity] = useState<string>('');
  const [tempMaxCapacity, setTempMaxCapacity] = useState<string>('');
  const [showConfigurableTableModal, setShowConfigurableTableModal] = useState(false);
  const [configurableSelectedTable, setConfigurableSelectedTable] = useState<EditSelectableTable | null>(null);
  const [configurableGuestsInput, setConfigurableGuestsInput] = useState<string>('');
  const [groupFromReservationId, setGroupFromReservationId] = useState<string | null>(null);

  const isAddedReservationInProgress = (reservation: any): boolean => {
    if (reservation.status !== 'añadida') return false;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    try {
      const resTime = typeof reservation.time === 'string' ? JSON.parse(reservation.time) : reservation.time;
      return nowMinutes >= (resTime.hour * 60 + resTime.minute);
    } catch {
      return false;
    }
  };

  const updateExceptionWithShiftsMutation = trpc.dayExceptions.updateWithShifts.useMutation({
    onSuccess: async () => {
      console.log('✅ [PLANNING] MaxGuests guardado en exception');
      await dayExceptionsQuery.refetch();
    },
    onError: (error: any) => {
      console.error('❌ [PLANNING] Error guardando maxGuests:', error);
      Alert.alert('Error', 'No se pudo guardar el máximo de comensales');
    },
  });

  const expandSlotCapacityMutation = trpc.reservations.expandSlotCapacity.useMutation({
    onSuccess: async () => {
      console.log('✅ [PLANNING] Capacidad de turno sincronizada correctamente');
      await dayExceptionsQuery.refetch();
    },
    onError: (error: any) => {
      console.error('❌ [PLANNING] Error sincronizando capacidad de turno:', error);
    },
  });

  const updateTableCapacityMutation = trpc.tables.updateTable.useMutation({
    onSuccess: async () => {
      console.log('✅ [PLANNING] Capacidad temporal de mesa actualizada');
      await tablesQuery.refetch();
      setShowTempCapacityModal(false);
      setTempCapacityTable(null);
      Alert.alert('Éxito', 'Capacidad de la mesa actualizada para este turno');
    },
    onError: (error: any) => {
      console.error('❌ [PLANNING] Error actualizando capacidad de mesa:', error);
      Alert.alert('Error', error?.message || 'No se pudo actualizar la capacidad');
    },
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const today = selectedDate;

  const navigateDay = (direction: number) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + direction);
    const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDate);
    setSelectedShift(null);
    setAutoShiftSelected(false);
    setCustomMaxGuests({});
  };

  const goToToday = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setSelectedDate(todayStr);
    setSelectedShift(null);
    setAutoShiftSelected(false);
    setCustomMaxGuests({});
  };

  const formatDisplayDate = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  };

  const formatDayOfWeek = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', { weekday: 'long' });
  };

  const loadSession = useCallback(async () => {
    try {
      const id = await getRestaurantId();
      const slug = await getRestaurantSlug();
      if (!id) {
        Alert.alert('Error', 'Sesión no encontrada');
        router.replace('/restaurant' as any);
        return;
      }
      setRestaurantId(id);
      setRestaurantSlug(slug);
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoadingSession(false);
    }
  }, [router]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const schedulesQuery = trpc.schedules.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId, staleTime: 0, refetchOnMount: true }
  );

  const dayExceptionsQuery = trpc.dayExceptions.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId, staleTime: 0, refetchOnMount: true }
  );

  const templatesQuery = trpc.shiftTemplates.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId, staleTime: 0, refetchOnMount: true }
  );

  const locationsQuery = trpc.locations.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );

  // Usar listForPlanning para incluir mesas temporales (divididas/agrupadas)
  // IMPORTANTE: Pasar shiftTemplateId y shiftDate para filtrar mesas temporales del turno
  const tablesQuery = trpc.tables.listForPlanning.useQuery(
    { 
      restaurantId: restaurantId || '',
      shiftTemplateId: selectedShift?.templateId || undefined,
      shiftDate: today,
    },
    { 
      enabled: !!restaurantId,
      // Forzar refetch cuando cambian los parámetros
      refetchOnMount: true,
      staleTime: 0,
      gcTime: 0,
    }
  );
  
  // Log para depuración de mesas temporales
  useEffect(() => {
    if (tablesQuery.data) {
      const temporaryTables = tablesQuery.data.filter((t: any) => t.isTemporary);
      console.log('[Planning] Turno seleccionado:', selectedShift?.templateId);
      console.log('[Planning] Mesas temporales cargadas:', temporaryTables.length);
      if (temporaryTables.length > 0) {
        console.log('[Planning] Detalle mesas temporales:', temporaryTables.map((t: any) => ({
          name: t.name,
          shiftTemplateId: t.shiftTemplateId,
          shiftDate: t.shiftDate,
        })));
      }
    }
  }, [tablesQuery.data, selectedShift?.templateId]);

  const waitlistQuery = trpc.waitlist.list.useQuery(
    { restaurantId: restaurantId || '', date: today },
    { enabled: !!restaurantId, refetchInterval: 30000, staleTime: 0 }
  );

  const reservationsQuery = trpc.reservations.list.useQuery(
    {
      restaurantId: restaurantId || '',
      date: today,
    },
    { enabled: !!restaurantId, refetchInterval: 10000, staleTime: 0 }
  );

  const clientOverlapsQuery = trpc.reservations.checkClientOverlaps.useQuery(
    { restaurantId: restaurantId || '', date: today },
    { enabled: !!restaurantId, refetchInterval: 30000, staleTime: 0 }
  );
  const clientOverlapsData = clientOverlapsQuery.data as Record<string, { hasSameRestaurant: boolean; hasDifferentRestaurant: boolean; details: string[] }> | undefined;

  const availableTablesQuery = trpc.tables.availableForReservation.useQuery(
    {
      restaurantId: restaurantId || '',
      locationId: editSelectedLocation || '',
      date: editingReservation?.date || today,
      time: editingReservation?.time || { hour: 12, minute: 0 },
      guests: editingReservation?.guests || 1,
      excludeReservationId: editingReservation?.id,
      shiftTemplateId: selectedShift?.templateId,
    },
    { enabled: !!restaurantId && showEditModal && !!editSelectedLocation }
  );

  const waitlistAvailableTablesQuery = trpc.tables.availableForReservation.useQuery(
    {
      restaurantId: restaurantId || '',
      locationId: waitlistAssignLocation || '',
      date: today,
      time: waitlistAssignTime
        ? (() => {
            const [hour, minute] = waitlistAssignTime.split(':').map(Number);
            return { hour: hour || 0, minute: minute || 0 };
          })()
        : { hour: 0, minute: 0 },
      guests: selectedWaitlistEntry?.guests || 1,
      shiftTemplateId: selectedShift?.templateId,
      skipCapacityFilter: true,
    },
    {
      enabled: false,
      staleTime: Infinity,
    }
  );

  const updateTableMutation = trpc.reservations.updateTable.useMutation({
    onSuccess: async () => {
      await reservationsQuery.refetch();
      setShowEditModal(false);
      setEditingReservation(null);
      Alert.alert('Éxito', 'Reserva actualizada correctamente');
    },
    onError: (error: any) => {
      console.error('Error updating table:', error);
      Alert.alert('Error', error?.message || 'No se pudo actualizar la reserva');
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
    },
    onError: (error: any) => {
      console.error('Error swapping tables:', error);
      Alert.alert('Error', error?.message || 'No se pudo intercambiar las mesas');
    },
  });

  const blockedTablesQuery = trpc.tables.listBlocks.useQuery(
    { restaurantId: restaurantId || '', date: today },
    { enabled: !!restaurantId, refetchInterval: 10000 }
  );

  const createWalkInMutation = trpc.reservations.create.useMutation({
    onSuccess: async (data) => {
      console.log('[Planning] Walk-in reservation created:', data?.id);
      await reservationsQuery.refetch();
    },
    onError: (error: any) => {
      console.error('[Planning] Error creating walk-in reservation:', error);
    },
  });

  const blockTableMutation = trpc.tables.blockTable.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', blockSelectedTimeSlot && blockWalkInGuests > 0 ? 'Reserva sin cita creada y mesa bloqueada' : 'Mesa bloqueada correctamente');
      setShowBlockModal(false);
      setShowFreeTableModal(false);
      setSelectedFreeTable(null);
      setBlockDuration('120');
      setBlockWalkInName('');
      setBlockWalkInPhone('');
      setBlockWalkInGuests(2);
      setBlockSelectedTimeSlot('');
      setBlockWalkInExtraTables([]);
      void blockedTablesQuery.refetch();
      void reservationsQuery.refetch();
      void tablesQuery.refetch();
    },
    onError: (error: any) => {
      console.error('Error blocking table:', error);
      Alert.alert('Error', error?.message || 'No se pudo bloquear la mesa');
    },
  });

  const unblockTableMutation = trpc.tables.unblockTable.useMutation({
    onSuccess: (data) => {
      const isSplit = selectedBlockedTable?.blockInfo?.id?.startsWith('block-split-');
      if (isSplit || data?.splitUndone) {
        Alert.alert('División Deshecha', 'Las mesas temporales han sido eliminadas y la mesa original está disponible nuevamente.', [{ text: 'Entendido', onPress: () => handleRefresh() }]);
      } else {
        Alert.alert('Éxito', 'Mesa desbloqueada correctamente');
      }
      setShowUnblockModal(false);
      setSelectedBlockedTable(null);
      void blockedTablesQuery.refetch();
      void tablesQuery.refetch();
    },
    onError: (error: any) => {
      console.error('Error unblocking table:', error);
      Alert.alert('Error', error?.message || 'No se pudo desbloquear la mesa');
    },
  });

  const splitTableDirectMutation = trpc.tables.splitTableDirect.useMutation({
    onSuccess: (data) => {
      Alert.alert(
        'Mesa Dividida', 
        `Se han creado las mesas temporales:\n• ${data.tableAName}\n• ${data.tableBName}\n\nLa mesa original ha sido bloqueada para este turno.`,
        [{ text: 'Entendido', onPress: () => handleRefresh() }]
      );
      setShowSplitModal(false);
      setSelectedFreeTable(null);
      void tablesQuery.refetch();
      void blockedTablesQuery.refetch();
    },
    onError: (error: any) => {
      console.error('Error splitting table:', error);
      Alert.alert('Error', error?.message || 'No se pudo dividir la mesa');
    },
  });

  const groupTablesDirectMutation = trpc.tables.groupTablesDirect.useMutation({
    onSuccess: (data) => {
      setGroupModalError(null);
      const reservationIdToUpdate = groupFromReservationId;
      setGroupFromReservationId(null);
      setShowGroupModal(false);
      setSelectedFreeTable(null);
      setSelectedTablesForGroup([]);
      void tablesQuery.refetch();
      void blockedTablesQuery.refetch();
      if (reservationIdToUpdate) {
        const locId = editingReservation?.locationId || '';
        updateTableMutation.mutate(
          { reservationId: reservationIdToUpdate, tableIds: [data.groupId], locationId: locId },
          {
            onSuccess: async () => {
              await reservationsQuery.refetch();
              setShowEditModal(false);
              setEditingReservation(null);
              Alert.alert(
                'Mesas Agrupadas',
                `Se ha creado el grupo temporal:\n• ${data.groupName}\n• Capacidad total: ${data.totalCapacity} pax\n\nLa reserva ha sido asignada al grupo.`,
                [{ text: 'Entendido', onPress: () => handleRefresh() }]
              );
            },
            onError: (error: any) => {
              Alert.alert(
                'Mesas Agrupadas',
                `Se ha creado el grupo temporal ${data.groupName} (${data.totalCapacity} pax).\nPero no se pudo reasignar la reserva automáticamente.\nVe a "Mesa" y selecciona el grupo manualmente.`,
                [{ text: 'Entendido', onPress: () => handleRefresh() }]
              );
              console.error('[Planning] Error reasignando reserva al grupo:', error);
            },
          }
        );
      } else {
        Alert.alert(
          'Mesas Agrupadas', 
          `Se ha creado el grupo temporal:\n• ${data.groupName}\n• Capacidad total: ${data.totalCapacity} pax\n\nLas mesas originales se han ocultado para este turno y solo aparecerá el grupo.`,
          [{ text: 'Entendido', onPress: () => handleRefresh() }]
        );
      }
    },
    onError: (error: any) => {
      console.error('Error grouping tables:', error);
      const msg = error?.data?.message || error?.shape?.message || error?.message || 'No se pudieron agrupar las mesas';
      setGroupModalError(msg);
      Alert.alert('Error al agrupar', msg);
    },
  });

  const undoSplitMutation = trpc.tables.undoSplit.useMutation({
    onSuccess: () => {
      Alert.alert(
        'División Deshecha',
        'Las mesas temporales han sido eliminadas y la mesa original está disponible nuevamente.',
        [{ text: 'Entendido', onPress: () => handleRefresh() }]
      );
      setShowUndoSplitModal(false);
      setSelectedSplitTable(null);
      void tablesQuery.refetch();
      void blockedTablesQuery.refetch();
    },
    onError: (error: any) => {
      console.error('Error undoing split:', error);
      Alert.alert('Error', error?.message || 'No se pudo deshacer la división');
    },
  });

  const undoGroupMutation = trpc.tables.undoGroup.useMutation({
    onSuccess: () => {
      Alert.alert(
        'Grupo Deshecho', 
        'El grupo ha sido eliminado y las mesas originales están disponibles nuevamente.',
        [{ text: 'Entendido', onPress: () => handleRefresh() }]
      );
      setShowUndoGroupModal(false);
      setSelectedGroupTable(null);
      void tablesQuery.refetch();
      void blockedTablesQuery.refetch();
    },
    onError: (error: any) => {
      console.error('Error undoing group:', error);
      Alert.alert('Error', error?.message || 'No se pudo deshacer el grupo');
    },
  });

  const sendModificationNotificationMutation = trpc.reservations.sendModificationNotification.useMutation({
    onSuccess: () => {
      if (selectedReservation) {
        setSelectedReservation((prev: any) => prev ? { ...prev, notes: 'Reserva modificada (notificado)' } : prev);
      }
      void reservationsQuery.refetch();
      Alert.alert('Éxito', 'Notificación enviada al cliente con los nuevos datos');
    },
    onError: (error: any) => {
      console.error('Error sending modification notification:', error);
      Alert.alert('Error', error?.data?.message || error?.message || 'No se pudo enviar la notificación');
    },
  });

  const cancelWaitlistMutation = trpc.waitlist.cancel.useMutation({
    onSuccess: () => {
      console.log('[Planning] Lista de espera cancelada');
      void waitlistQuery.refetch();
    },
    onError: (error: any) => {
      console.error('[Planning] Error cancelando lista de espera:', error);
    },
  });

  const updateWaitlistTimeMutation = trpc.waitlist.updateTime.useMutation({
    onSuccess: () => {
      console.log('[Planning] Hora de lista de espera actualizada');
      void waitlistQuery.refetch();
      setEditingWaitlistTime(null);
      setEditWaitlistNewTime('');
      Alert.alert('Éxito', 'Hora preferida actualizada correctamente');
    },
    onError: (error: any) => {
      console.error('[Planning] Error actualizando hora de lista de espera:', error);
      Alert.alert('Error', error?.message || 'No se pudo actualizar la hora');
    },
  });

  const [locallyBlockedClientIds, setLocallyBlockedClientIds] = useState<Set<string>>(new Set<string>());

  const blockUserFromPlanningMutation = trpc.clients.toggleUnwanted.useMutation({
    onSuccess: async (_data, variables) => {
      await reservationsQuery.refetch();
      if (variables.isUnwanted) {
        setLocallyBlockedClientIds(prev => new Set([...prev, variables.clientId]));
        Alert.alert('Usuario bloqueado', 'El usuario ha sido bloqueado y no podrá realizar reservas en este restaurante.');
      } else {
        setLocallyBlockedClientIds(prev => {
          const next = new Set([...prev]);
          next.delete(variables.clientId);
          return next;
        });
        Alert.alert('Usuario desbloqueado', 'El usuario ha sido desbloqueado y ya puede realizar reservas en este restaurante.');
      }
    },
    onError: (error: any) => {
      console.error('[Planning] Error cambiando estado de usuario:', error);
      Alert.alert('Error', error?.message || 'No se pudo cambiar el estado del usuario');
    },
  });

  const updateInternalNotesMutation = trpc.reservations.updateInternalNotes.useMutation({
    onSuccess: async () => {
      await reservationsQuery.refetch();
      setShowInternalNoteModal(false);
      if (selectedReservation) {
        setSelectedReservation((prev: any) => prev ? { ...prev, internalNotes: internalNoteValue.trim() || null } : prev);
      }
    },
    onError: (error: any) => {
      console.error('[Planning] Error guardando nota interna:', error);
      Alert.alert('Error', error?.message || 'No se pudo guardar la nota');
    },
  });

  const createFromWaitlistMutation = trpc.reservations.create.useMutation({
    onSuccess: async (data) => {
      console.log('[Planning] Reserva creada desde lista de espera:', data?.id);
      if (selectedWaitlistEntry) {
        cancelWaitlistMutation.mutate({
          id: selectedWaitlistEntry.id,
          clientPhone: selectedWaitlistEntry.client_phone,
        });
      }
      await Promise.all([
        reservationsQuery.refetch(),
        dayExceptionsQuery.refetch(),
        waitlistQuery.refetch(),
      ]);
      setCustomMaxGuests({});
      setSelectedWaitlistEntry(null);
      setWaitlistAssignLocation('');
      setWaitlistAssignTableId('');
      setWaitlistAssignTime('');
      Alert.alert('Éxito', 'Reserva creada correctamente. Se ha enviado la confirmación al cliente.');
    },
    onError: (error: any) => {
      console.error('[Planning] Error creando reserva desde lista de espera:', error);
      Alert.alert('Error', error?.data?.message || error?.message || 'No se pudo crear la reserva');
    },
  });

  const cancelReservationMutation = trpc.reservations.cancel.useMutation({
    onSuccess: async () => {
      await reservationsQuery.refetch();
      setShowReservationModal(false);
      setSelectedReservation(null);
      Alert.alert('Éxito', 'Reserva anulada correctamente');
    },
    onError: (error: any) => {
      console.error('❌ [CANCEL] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo anular la reserva');
    },
  });

  const handleCancelReservation = (reservationId: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro de que deseas anular esta reserva?');
      if (confirmed) {
        cancelReservationMutation.mutate({ reservationId, cancelledBy: 'restaurant' });
      }
    } else {
      Alert.alert(
        'Anular Reserva',
        '¿Estás seguro de que deseas anular esta reserva?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sí, anular', style: 'destructive', onPress: () => cancelReservationMutation.mutate({ reservationId, cancelledBy: 'restaurant' }) },
        ]
      );
    }
  };

  const updateReservationMutation = trpc.reservations.update.useMutation({
    onSuccess: async () => {
      await reservationsQuery.refetch();
      setShowChangeTimeModal(false);
      setShowChangeGuestsModal(false);
      Alert.alert('Éxito', 'Reserva actualizada correctamente');
    },
    onError: (error: any) => {
      console.error('Error updating reservation:', error);
      Alert.alert('Error', error?.message || 'No se pudo actualizar la reserva');
    },
  });

  const todayShifts = useMemo(() => {
    console.log('[Planning] Calculating todayShifts...');
    console.log('[Planning] schedulesQuery.data:', schedulesQuery.data?.length, 'items');
    console.log('[Planning] dayExceptionsQuery.data:', dayExceptionsQuery.data?.length, 'items');
    console.log('[Planning] templatesQuery.data:', templatesQuery.data?.length, 'items');
    
    if (!schedulesQuery.data || !templatesQuery.data) {
      console.log('[Planning] Waiting for data...');
      return [];
    }

    const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
    const selDateObj = new Date(selYear, selMonth - 1, selDay);
    const dayOfWeek = selDateObj.getDay();
    console.log('[Planning] Today dayOfWeek:', dayOfWeek, '(0=Sun, 1=Mon, etc)');
    console.log('[Planning] Today date string:', today);
    
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
      return exDateString === today;
    });

    let shifts: any[] = [];

    if (exception) {
      console.log('[Planning] Found exception for today:', exception);
      if (!exception.isOpen) {
        console.log('[Planning] Exception says closed');
        return [];
      }
      shifts = exception.shifts || [];
      console.log('[Planning] Exception shifts:', shifts.length);
    } else {
      console.log('[Planning] No exception, looking for regular schedule...');
      console.log('[Planning] Available schedules:', schedulesQuery.data?.map((s: any) => ({ dayOfWeek: s.dayOfWeek, isOpen: s.isOpen })));
      
      const schedule = schedulesQuery.data?.find((s: any) => s.dayOfWeek === dayOfWeek);
      console.log('[Planning] Found schedule for today:', schedule ? { dayOfWeek: schedule.dayOfWeek, isOpen: schedule.isOpen, hasShifts: !!schedule.shifts } : 'NOT FOUND');
      
      if (!schedule) {
        console.log('[Planning] No schedule found for dayOfWeek:', dayOfWeek);
        return [];
      }
      
      if (!schedule.isOpen) {
        console.log('[Planning] Schedule exists but isOpen is false');
        return [];
      }
      
      try {
        shifts = typeof schedule.shifts === 'string' 
          ? JSON.parse(schedule.shifts) 
          : (schedule.shifts || []);
        console.log('[Planning] Parsed shifts from schedule:', shifts.length, 'shifts');
        console.log('[Planning] Raw shifts:', JSON.stringify(shifts).substring(0, 500));
      } catch (e) {
        console.error('[Planning] Error parsing shifts:', e);
        shifts = [];
      }
    }

    // Agrupar shifts por templateId para mostrar solo un botón por turno
    const groupedShifts = new Map<string, ShiftInfo>();
    
    shifts.forEach((shift: any, index: number) => {
      // Usar templateId si existe, o el id del shift, o generar uno basado en el índice
      const shiftKey = shift.templateId || shift.id || `shift-${index}`;
      const template = templatesQuery.data?.find((t: any) => t.id === shift.templateId);
      const templateName = template?.name || shift.name || 'Turno';
      const shiftMaxGuests = shift.maxGuestsPerHour || 10;
      
      console.log('[Planning] Processing shift:', { shiftKey, templateName, startTime: shift.startTime, endTime: shift.endTime, maxGuests: shiftMaxGuests });
      
      if (!shift.startTime || !shift.endTime) {
        console.log('[Planning] Shift sin startTime o endTime, saltando');
        return;
      }
      
      // Generar las horas de este shift y guardar el maxGuestsPerHour individual
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      const [endHour, endMin] = shift.endTime.split(':').map(Number);
      const slotMaxGuests: Record<string, number> = {};
      
      let currentHour = startHour;
      let currentMin = startMin;
      // CRÍTICO: Usar <= para incluir el último horario del turno (ej: 15:00 en turno 13:30-15:00)
      while (currentHour < endHour || (currentHour === endHour && currentMin <= endMin)) {
        const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        slotMaxGuests[timeString] = shiftMaxGuests;
        currentMin += 30;
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour += 1;
        }
      }
      
      console.log('[Planning] Generated time slots for shift:', Object.keys(slotMaxGuests).length, 'slots');
      
      if (groupedShifts.has(shiftKey)) {
        // Actualizar el rango de tiempo si ya existe
        const existing = groupedShifts.get(shiftKey)!;
        const existingStart = existing.startTime.split(':').map(Number);
        const existingEnd = existing.endTime.split(':').map(Number);
        const newStart = shift.startTime.split(':').map(Number);
        
        // Tomar el tiempo más temprano como inicio
        if (newStart[0] < existingStart[0] || (newStart[0] === existingStart[0] && newStart[1] < existingStart[1])) {
          existing.startTime = shift.startTime;
        }
        // Usar el startTime más tardío como endTime del grupo.
        // Esto evita que endTime = startTime+30min de cada entrada individual
        // genere un slot extra al final del turno.
        // Para entradas colapsadas (endTime ya es el startTime del último slot)
        // el valor inicial se mantiene correcto.
        if (newStart[0] > existingEnd[0] || (newStart[0] === existingEnd[0] && newStart[1] >= existingEnd[1])) {
          existing.endTime = shift.startTime;
        }
        // Mantener el maxGuestsPerHour más alto
        if (shiftMaxGuests > existing.maxGuestsPerHour) {
          existing.maxGuestsPerHour = shiftMaxGuests;
        }
        // Combinar los máximos por slot
        existing.timeSlotMaxGuests = { ...existing.timeSlotMaxGuests, ...slotMaxGuests };
      } else {
        groupedShifts.set(shiftKey, {
          templateId: shiftKey,
          templateName,
          startTime: shift.startTime,
          endTime: shift.endTime,
          maxGuestsPerHour: shiftMaxGuests,
          timeSlotMaxGuests: slotMaxGuests,
        });
      }
    });

    const result = Array.from(groupedShifts.values());
    console.log('[Planning] Final todayShifts:', result.length, 'shifts:', result.map(s => ({ name: s.templateName, slots: Object.keys(s.timeSlotMaxGuests).length })));
    return result;
  }, [schedulesQuery.data, dayExceptionsQuery.data, templatesQuery.data, today, selectedDate]);

  const todayReservations = useMemo(() => {
    if (!reservationsQuery.data) {
      console.log('[Planning] No hay datos de reservas');
      return [];
    }
    
    console.log('[Planning] Filtrando reservas, total recibidas:', reservationsQuery.data.length);
    
    const filtered = reservationsQuery.data.filter((res: any) => {
      // Ya que ahora consultamos por fecha específica, solo filtramos por status
      const validStatus = res.status !== 'cancelled' && res.status !== 'modified';
      
      // Doble verificación de fecha por si acaso
      let resDateString: string;
      if (typeof res.date === 'string') {
        resDateString = res.date.includes('T') ? res.date.split('T')[0] : res.date;
      } else {
        const resDate = new Date(res.date);
        resDateString = `${resDate.getFullYear()}-${String(resDate.getMonth() + 1).padStart(2, '0')}-${String(resDate.getDate()).padStart(2, '0')}`;
      }
      
      const isToday = resDateString === today;
      
      if (!isToday) {
        console.log('[Planning] Reserva descartada por fecha:', res.id, resDateString, 'vs', today);
      }
      
      return isToday && validStatus;
    });
    
    console.log('[Planning] Reservas de hoy filtradas:', filtered.length);
    return filtered;
  }, [reservationsQuery.data, today]);

  const shiftFilteredReservations = useMemo(() => {
    if (!selectedShift || !todayReservations.length) return [];
    
    const [shiftStartHour, shiftStartMin] = selectedShift.startTime.split(':').map(Number);
    const [shiftEndHour, shiftEndMin] = selectedShift.endTime.split(':').map(Number);
    const shiftStartMinutes = shiftStartHour * 60 + shiftStartMin;
    const shiftEndMinutes = shiftEndHour * 60 + shiftEndMin;
    
    return todayReservations.filter((res: any) => {
      const resMinutes = res.time.hour * 60 + res.time.minute;
      return resMinutes >= shiftStartMinutes && resMinutes <= shiftEndMinutes;
    });
  }, [selectedShift, todayReservations]);

  const timeSlots = useMemo(() => {
    if (!selectedShift) return [];

    console.log('[Planning] Generando timeSlots para:', selectedShift.templateName);
    console.log('[Planning] startTime:', selectedShift.startTime, 'endTime:', selectedShift.endTime);
    console.log('[Planning] timeSlotMaxGuests keys:', Object.keys(selectedShift.timeSlotMaxGuests || {}));
    console.log('[Planning] maxGuestsPerHour:', selectedShift.maxGuestsPerHour);

    // SIEMPRE generar los horarios desde startTime hasta endTime para garantizar que se muestren todos
    const generatedTimeSlots: string[] = [];
    
    if (selectedShift.startTime && selectedShift.endTime) {
      const [startHour, startMin] = selectedShift.startTime.split(':').map(Number);
      const [endHour, endMin] = selectedShift.endTime.split(':').map(Number);
      
      let currentHour = startHour;
      let currentMin = startMin;
      // CRÍTICO: Usar <= para incluir el último horario del turno (ej: 15:00 en turno 13:30-15:00)
      while (currentHour < endHour || (currentHour === endHour && currentMin <= endMin)) {
        const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        generatedTimeSlots.push(timeString);
        currentMin += 30;
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour += 1;
        }
      }
    }
    
    console.log('[Planning] Horarios generados desde start/end:', generatedTimeSlots);

    const slots: TimeSlotInfo[] = generatedTimeSlots.map((timeString) => {
      const reservedGuests = shiftFilteredReservations
        .filter((res: any) => {
          const resTime = `${String(res.time.hour).padStart(2, '0')}:${String(res.time.minute).padStart(2, '0')}`;
          return resTime === timeString;
        })
        .reduce((acc: number, res: any) => acc + res.guests, 0);

      // Prioridad: customMaxGuests > timeSlotMaxGuests > maxGuestsPerHour
      const maxGuests = customMaxGuests[timeString] ?? selectedShift.timeSlotMaxGuests?.[timeString] ?? selectedShift.maxGuestsPerHour ?? 10;

      const [slotHour, slotMinute] = timeString.split(':').map(Number);

      return {
        time: timeString,
        hour: slotHour,
        minute: slotMinute,
        maxGuests,
        reservedGuests,
      };
    });

    console.log('[Planning] TimeSlots finales:', slots.length, 'slots');
    if (slots.length > 0) {
      console.log('[Planning] Primer slot:', slots[0]);
      console.log('[Planning] Último slot:', slots[slots.length - 1]);
    }
    return slots;
  }, [selectedShift, shiftFilteredReservations, customMaxGuests]);

  const waitlistSelectedSlot = useMemo(() => {
    return timeSlots.find((slot) => slot.time === waitlistAssignTime) ?? null;
  }, [timeSlots, waitlistAssignTime]);

  const locationTables = useMemo(() => {
    if (!tablesQuery.data || !selectedLocation) return [];

    // Obtener mesas de la ubicación, filtrando mesas temporales de otros turnos
    const baseTables = tablesQuery.data.filter((table: any) => {
      if (table.locationId !== selectedLocation) return false;
      
      // Si es una mesa temporal, verificar que pertenece al turno actual
      if (table.isTemporary) {
        // Solo incluir si coincide con el turno seleccionado
        if (!selectedShift) return false;
        const matchesShift = table.shiftTemplateId === selectedShift.templateId && 
                             table.shiftDate === today;
        console.log('[Planning] Mesa temporal', table.name, ':', {
          tableShiftId: table.shiftTemplateId,
          selectedShiftId: selectedShift.templateId,
          tableDate: table.shiftDate,
          today: today,
          matches: matchesShift
        });
        return matchesShift;
      }
      
      return true;
    });
    
    // También incluir mesas temporales que estén vinculadas a reservas del turno actual
    const temporaryTableIds = new Set<string>();
    shiftFilteredReservations.forEach((res: any) => {
      if (res.tableIds && Array.isArray(res.tableIds)) {
        res.tableIds.forEach((tableId: string) => {
          if (tableId.includes('-A-') || tableId.includes('-B-') || tableId.includes('-split-') || tableId.includes('-group-')) {
            temporaryTableIds.add(tableId);
          }
        });
      }
    });
    
    // Añadir mesas temporales que no estén en baseTables pero tienen reserva en este turno
    const allTableIds = new Set(baseTables.map((t: any) => t.id));
    const missingTemporaryTables = tablesQuery.data.filter((table: any) => {
      if (!temporaryTableIds.has(table.id)) return false;
      if (allTableIds.has(table.id)) return false;
      // CRÍTICO: Solo incluir si pertenece a la ubicación actual
      if (table.locationId !== selectedLocation) return false;
      // Verificar que la mesa temporal es del turno correcto
      if (table.isTemporary && selectedShift) {
        return table.shiftTemplateId === selectedShift.templateId && table.shiftDate === today;
      }
      return true;
    });
    
    const allTables = [...baseTables, ...missingTemporaryTables];
    
    // Identificar mesas que forman parte de un grupo temporal para este turno
    // Estas mesas deben ocultarse y solo mostrar el grupo
    const groupedTableIds = new Set<string>();
    allTables.forEach((table: any) => {
      if (table.isTemporary && table.groupedTableIds) {
        const ids = typeof table.groupedTableIds === 'string' 
          ? JSON.parse(table.groupedTableIds) 
          : table.groupedTableIds;
        if (Array.isArray(ids)) {
          ids.forEach((id: string) => groupedTableIds.add(id));
        }
      }
    });
    
    // Identificar mesas originales que han sido divididas en mesas temporales
    // La mesa original debe ocultarse y solo mostrar las mesas temporales A y B
    const splitOriginalTableIds = new Set<string>();
    allTables.forEach((table: any) => {
      if (table.isTemporary && table.originalTableId && !table.groupedTableIds) {
        splitOriginalTableIds.add(table.originalTableId);
      }
    });
    if (splitOriginalTableIds.size > 0) {
      console.log('[Planning] Mesas originales con división activa:', Array.from(splitOriginalTableIds));
    }
    
    const nowObj = new Date();
    const realTodayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;
    const isPastDay = selectedDate < realTodayStr;
    const isSelectedToday = selectedDate === realTodayStr;
    const nowMinutesOfDay = isPastDay ? 24 * 60 : (isSelectedToday ? nowObj.getHours() * 60 + nowObj.getMinutes() : 0);

    const [shiftEndH, shiftEndM] = (selectedShift?.endTime || '23:59').split(':').map(Number);
    const shiftEndMinutesVal = shiftEndH * 60 + shiftEndM;

    const pendingAvailableFromMap = new Map<string, string>();

    const filteredTables = allTables.filter((table: any) => {
      // Ocultar mesa original cuando existen mesas temporales divididas (A/B)
      if (splitOriginalTableIds.has(table.id) && !table.isTemporary) {
        console.log('[Planning] Ocultando mesa original dividida:', table.name);
        return false;
      }
      
      if (groupedTableIds.has(table.id)) {
        const hasOwnIndependentReservation = shiftFilteredReservations.some((res: any) => {
          if (!res.tableIds?.includes(table.id)) return false;
          const resIncludesGroupTable = allTables.some((t: any) =>
            t.isTemporary && t.groupedTableIds && res.tableIds?.includes(t.id)
          );
          return !resIncludesGroupTable;
        });
        if (hasOwnIndependentReservation) {
          console.log('[Planning] Mesa agrupada con reserva propia, mostrando:', table.name);
          return true;
        }

        const groupTable = allTables.find((t: any) => {
          if (!t.isTemporary || !t.groupedTableIds) return false;
          const ids = typeof t.groupedTableIds === 'string' ? JSON.parse(t.groupedTableIds) : t.groupedTableIds;
          return Array.isArray(ids) && ids.includes(table.id);
        });

        if (groupTable) {
          const groupReservation = shiftFilteredReservations.find((res: any) =>
            res.tableIds?.includes(groupTable.id)
          );
          if (!groupReservation) {
            return false;
          }
          const resTimeMin = groupReservation.time.hour * 60 + groupReservation.time.minute;
          const rotMin = (groupTable as any).rotationTimeMinutes || 120;
          const availFromMin = resTimeMin + rotMin;
          if (availFromMin > shiftEndMinutesVal) {
            console.log('[Planning] Mesa agrupada: rotación excede el turno, ocultando:', table.name);
            return false;
          }
          if (nowMinutesOfDay < availFromMin) {
            const availH = Math.floor(availFromMin / 60);
            const availM = availFromMin % 60;
            pendingAvailableFromMap.set(
              table.id,
              String(availH).padStart(2, '0') + ':' + String(availM).padStart(2, '0')
            );
            console.log('[Planning] Mesa agrupada libre desde:', table.name);
          } else {
            console.log('[Planning] Mesa agrupada visible por rotación cumplida:', table.name);
          }
          return true;
        }

        return false;
      }
      return true;
    });
    
    console.log('[Planning] Mesas en ubicación:', baseTables.length, '+ temporales:', missingTemporaryTables.length, '- agrupadas:', groupedTableIds.size);

    // Manejar reservas que abarcan múltiples mesas regulares (creadas desde restaurant3)
    // Diferente a mesas de grupo temporales: son reservas normales con múltiples tableIds
    const multiTableResSecondaryIds = new Set<string>();
    const multiTableResPrimaryGroupNames = new Map<string, string[]>();

    shiftFilteredReservations.forEach((res: any) => {
      if (!res.tableIds || res.tableIds.length <= 1) return;
      // Si implica mesa de grupo temporal, ya está gestionado arriba
      const involvesGroupTable = allTables.some((t: any) =>
        t.isTemporary && t.groupedTableIds && res.tableIds.includes(t.id)
      );
      if (involvesGroupTable) return;
      // Obtener las mesas reales de esta reserva en la ubicación actual
      const resTables = allTables.filter((t: any) =>
        res.tableIds.includes(t.id) && t.locationId === selectedLocation
      );
      if (resTables.length <= 1) return;
      // Mesa principal = la de mayor capacidad máxima
      const primary = resTables.reduce((best: any, t: any) => {
        const bestCap = best.maxCapacity || best.capacity || 0;
        const tCap = t.maxCapacity || t.capacity || 0;
        return tCap >= bestCap ? t : best;
      });
      // Las demás son secundarias
      const secondaries = resTables.filter((t: any) => t.id !== primary.id);
      secondaries.forEach((t: any) => multiTableResSecondaryIds.add(t.id));
      // Guardar nombres de secundarias para la mesa principal
      const existing = multiTableResPrimaryGroupNames.get(primary.id) || [];
      secondaries.forEach((t: any) => {
        if (!existing.includes(t.name)) existing.push(t.name);
      });
      multiTableResPrimaryGroupNames.set(primary.id, existing);
      console.log('[Planning] Reserva multi-mesa:', res.id, '- Principal:', primary.name, '- Secundarias:', secondaries.map((t: any) => t.name));
    });

    const finalFilteredTables = filteredTables.filter((table: any) => {
      if (!multiTableResSecondaryIds.has(table.id)) return true;

      const hasOwnReservation = shiftFilteredReservations.some((res: any) =>
        res.tableIds?.includes(table.id) && res.tableIds.length === 1
      );
      if (hasOwnReservation) return true;

      const groupingReservation = shiftFilteredReservations.find((res: any) => {
        if (!res.tableIds?.includes(table.id)) return false;
        if (res.tableIds.length <= 1) return false;
        const involvesGroupTable = allTables.some((t: any) =>
          t.isTemporary && t.groupedTableIds && res.tableIds.includes(t.id)
        );
        return !involvesGroupTable;
      });

      if (groupingReservation) {
        const resTimeMin = groupingReservation.time.hour * 60 + groupingReservation.time.minute;
        const tableData = allTables.find((t: any) => t.id === table.id);
        const rotMin = tableData?.rotationTimeMinutes || 120;
        const availFromMin = resTimeMin + rotMin;
        if (availFromMin > shiftEndMinutesVal) {
          console.log('[Planning] Mesa secundaria: rotacion excede el turno, ocultando:', table.name);
          return false;
        }
        if (nowMinutesOfDay < availFromMin) {
          const availH = Math.floor(availFromMin / 60);
          const availM = availFromMin % 60;
          pendingAvailableFromMap.set(
            table.id,
            String(availH).padStart(2, '0') + ':' + String(availM).padStart(2, '0')
          );
          console.log('[Planning] Mesa secundaria libre desde:', table.name);
        } else {
          console.log('[Planning] Mesa secundaria visible por rotacion cumplida:', table.name);
        }
        return true;
      }

      console.log('[Planning] Ocultando mesa secundaria de reserva multi-mesa:', table.name);
      return false;
    });

    // Añadir mesa de grupo temporal a pendingAvailableFromMap si el tiempo de rotación aún no ha pasado
    allTables.forEach((groupT: any) => {
      if (!groupT.isTemporary || !groupT.groupedTableIds) return;
      const groupRes = shiftFilteredReservations.find((res: any) => res.tableIds?.includes(groupT.id));
      if (!groupRes) return;
      const resTimeMin = groupRes.time.hour * 60 + groupRes.time.minute;
      const rotMin = (groupT as any).rotationTimeMinutes || 120;
      const availFromMin = resTimeMin + rotMin;
      if (availFromMin > shiftEndMinutesVal) return;
      if (nowMinutesOfDay < availFromMin) {
        const availH = Math.floor(availFromMin / 60);
        const availM = availFromMin % 60;
        pendingAvailableFromMap.set(
          groupT.id,
          String(availH).padStart(2, '0') + ':' + String(availM).padStart(2, '0')
        );
        console.log('[Planning] Mesa grupo temporal libre a partir de:', groupT.name, String(availH).padStart(2, '0') + ':' + String(availM).padStart(2, '0'));
      }
    });

    // Construir set de mesas que reaparecen tras el tiempo de rotación → deben mostrarse LIBRES
    const rotationPassedIds = new Set<string>();

    // 1) Mesas que pertenecen a un grupo temporal (temp-group)
    allTables.forEach((gTable: any) => {
      if (!groupedTableIds.has(gTable.id)) return;
      const groupTable = allTables.find((t: any) => {
        if (!t.isTemporary || !t.groupedTableIds) return false;
        const ids = typeof t.groupedTableIds === 'string' ? JSON.parse(t.groupedTableIds) : t.groupedTableIds;
        return Array.isArray(ids) && ids.includes(gTable.id);
      });
      if (!groupTable) return;
      const groupRes = shiftFilteredReservations.find((res: any) => res.tableIds?.includes(groupTable.id));
      if (!groupRes) return;
      const resTimeMin = groupRes.time.hour * 60 + groupRes.time.minute;
      const rotMin = (groupTable as any).rotationTimeMinutes || 120;
      if (nowMinutesOfDay >= resTimeMin + rotMin) {
        rotationPassedIds.add(gTable.id);
        console.log('[Planning] Mesa agrupada con rotación cumplida → libre:', gTable.name);
      }
    });

    // 2) Mesas secundarias de reservas multi-mesa (restaurant3)
    Array.from(multiTableResSecondaryIds).forEach((tableId: string) => {
      const groupingRes = shiftFilteredReservations.find((res: any) => {
        if (!res.tableIds?.includes(tableId)) return false;
        if (res.tableIds.length <= 1) return false;
        const involvesGroup = allTables.some((t: any) =>
          t.isTemporary && t.groupedTableIds && res.tableIds.includes(t.id)
        );
        return !involvesGroup;
      });
      if (!groupingRes) return;
      const resTimeMin = groupingRes.time.hour * 60 + groupingRes.time.minute;
      const tData = allTables.find((t: any) => t.id === tableId);
      const rotMin = (tData as any)?.rotationTimeMinutes || 120;
      if (nowMinutesOfDay >= resTimeMin + rotMin) {
        rotationPassedIds.add(tableId);
        console.log('[Planning] Mesa secundaria multi-mesa con rotación cumplida → libre:', tableId);
      }
    });

    // 3) Mesa de grupo temporal (la propia mesa temporal del grupo)
    allTables.forEach((groupT: any) => {
      if (!groupT.isTemporary || !groupT.groupedTableIds) return;
      const groupRes = shiftFilteredReservations.find((res: any) => res.tableIds?.includes(groupT.id));
      if (!groupRes) return;
      const resTimeMin = groupRes.time.hour * 60 + groupRes.time.minute;
      const rotMin = (groupT as any).rotationTimeMinutes || 120;
      const availFromMin = resTimeMin + rotMin;
      if (availFromMin > shiftEndMinutesVal) return;
      if (nowMinutesOfDay >= availFromMin) {
        rotationPassedIds.add(groupT.id);
        console.log('[Planning] Mesa grupo temporal con rotación cumplida → libre:', groupT.name);
      }
    });

    // Calcular el rango de tiempo del turno seleccionado para filtrar bloqueos
    const getShiftTimeRange = () => {
      if (!selectedShift) return null;
      
      const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
      const [startHour, startMin] = selectedShift.startTime.split(':').map(Number);
      const [endHour, endMin] = selectedShift.endTime.split(':').map(Number);
      
      const shiftStart = new Date(selYear, selMonth - 1, selDay, startHour, startMin);
      const shiftEnd = new Date(selYear, selMonth - 1, selDay, endHour, endMin);
      
      return { shiftStart, shiftEnd };
    };
    
    const shiftTimeRange = getShiftTimeRange();
    
    // Log de depuración para bloqueos
    console.log('[Planning] Bloqueos disponibles:', blockedTablesQuery.data?.length || 0);
    if (blockedTablesQuery.data && blockedTablesQuery.data.length > 0) {
      console.log('[Planning] Primer bloqueo:', JSON.stringify(blockedTablesQuery.data[0]));
    }
    if (shiftTimeRange) {
      console.log('[Planning] Rango del turno:', {
        start: shiftTimeRange.shiftStart.toISOString(),
        end: shiftTimeRange.shiftEnd.toISOString(),
      });
    }

    return finalFilteredTables.map((table: any) => {
        const tableReservations = shiftFilteredReservations.filter((res: any) => {
          if (!res.tableIds?.includes(table.id)) return false;
          const isTerminalStatus = res.status === 'completed' || res.status === 'ratable' || res.status === 'no_show';
          if (isTerminalStatus) return true;
          const resTableIds: string[] = Array.isArray(res.tableIds)
            ? res.tableIds
            : (typeof res.tableIds === 'string' ? JSON.parse(res.tableIds) : []);
          const isGroupOrMultiReservation = resTableIds.length > 1 ||
            allTables.some((t: any) => t.isTemporary && t.groupedTableIds && resTableIds.includes(t.id));
          if (isGroupOrMultiReservation) {
            if (rotationPassedIds.has(table.id)) return false;
            if (pendingAvailableFromMap.has(table.id)) return false;
          }
          return true;
        }).sort((a: any, b: any) => {
          const timeA = a.time.hour * 60 + a.time.minute;
          const timeB = b.time.hour * 60 + b.time.minute;
          return timeA - timeB;
        });
        const reservation = tableReservations.length > 0 ? tableReservations[0] : undefined;

        // Buscar bloqueos para esta mesa
        const tableBlocks = blockedTablesQuery.data?.filter((block: any) => block.tableId === table.id) || [];
        
        // Verificar si algún bloqueo se solapa con el turno actual
        let blockInfo = null;
        const now = new Date();
        
        for (const block of tableBlocks) {
          // Parsear fechas de bloqueo de forma robusta
          const blockStart = new Date(block.startTime);
          const blockEnd = new Date(block.endTime);
          
          // Verificar que el bloqueo aún está activo (end_time > now)
          if (blockEnd.getTime() <= now.getTime()) {
            continue; // Bloqueo ya expirado
          }
          
          // Para bloqueos de división, solo aplicar si existen mesas temporales en el turno actual
          if (block.id && typeof block.id === 'string' && block.id.startsWith('block-split-')) {
            const hasTempTablesInShift = tablesQuery.data?.some((t: any) =>
              t.isTemporary &&
              t.originalTableId === table.id &&
              t.shiftTemplateId === selectedShift?.templateId &&
              t.shiftDate === today
            );
            if (!hasTempTablesInShift) {
              console.log('[Planning] ⏭️ Split block ignorado para mesa', table.name, '- no hay mesas temporales en este turno');
              continue;
            }
          }
          
          // Para bloqueos de agrupación, ignorar SOLO si el tiempo de rotación ya ha pasado
          if (block.id && typeof block.id === 'string' && block.id.startsWith('block-group-')) {
            const groupTable = allTables.find((t: any) => {
              if (!t.isTemporary || !t.groupedTableIds) return false;
              const gIds = typeof t.groupedTableIds === 'string' ? JSON.parse(t.groupedTableIds) : t.groupedTableIds;
              return Array.isArray(gIds) && gIds.includes(table.id);
            });
            if (groupTable) {
              const groupReservation = shiftFilteredReservations.find((res: any) =>
                res.tableIds?.includes(groupTable.id)
              );
              if (groupReservation) {
                const resTimeMin = groupReservation.time.hour * 60 + groupReservation.time.minute;
                const rotMin = (groupTable as any).rotationTimeMinutes || 120;
                if (nowMinutesOfDay >= resTimeMin + rotMin) {
                  console.log('[Planning] ⏭️ Group block ignorado para mesa', table.name, '- rotación cumplida');
                  continue;
                }
                // Rotación NO cumplida: el bloqueo aplica, se muestra como bloqueada
                console.log('[Planning] 🔒 Group block activo para mesa', table.name, '- reserva en grupo, rotación pendiente');
              } else {
                // Grupo configurado pero sin reserva: el bloqueo SIGUE aplicando
                // Las mesas individuales no se pueden reservar mientras estén agrupadas
                console.log('[Planning] 🔒 Group block activo para mesa', table.name, '- grupo sin reserva, mesa no disponible individualmente');
              }
            }
          }
          
          // Si no hay rango de turno, cualquier bloqueo activo cuenta
          if (!shiftTimeRange) {
            console.log('[Planning] ✅ Bloqueo activo encontrado para mesa', table.name, '(sin turno)');
            blockInfo = block;
            break;
          }
          
          // Verificar solapamiento: blockStart < shiftEnd AND blockEnd > shiftStart
          const overlaps = blockStart.getTime() < shiftTimeRange.shiftEnd.getTime() && 
                           blockEnd.getTime() > shiftTimeRange.shiftStart.getTime();
          
          if (overlaps) {
            console.log('[Planning] ✅ Bloqueo encontrado para mesa', table.name, ':', {
              blockStart: blockStart.toISOString(),
              blockEnd: blockEnd.toISOString(),
              shiftStart: shiftTimeRange.shiftStart.toISOString(),
              shiftEnd: shiftTimeRange.shiftEnd.toISOString(),
            });
            blockInfo = block;
            break;
          } else {
            console.log('[Planning] ⏭️ Bloqueo no solapa con turno para mesa', table.name);
          }
        }

        const isBlocked = !!blockInfo;
        
        // Log adicional para debug
        if (tableBlocks.length > 0) {
          console.log('[Planning] Mesa', table.name, 'tiene', tableBlocks.length, 'bloqueos, isBlocked:', isBlocked);
        }
        
        // Obtener nombres de mesas agrupadas si es una mesa de grupo temporal
        let groupedTableNames: string[] = [];
        if (table.isTemporary && table.groupedTableIds) {
          const ids = typeof table.groupedTableIds === 'string'
            ? JSON.parse(table.groupedTableIds)
            : table.groupedTableIds;
          if (Array.isArray(ids)) {
            groupedTableNames = tablesQuery.data
              ?.filter((t: any) => ids.includes(t.id))
              .map((t: any) => t.name) || [];
          }
        }
        // Añadir nombres de mesas secundarias de reservas multi-mesa (restaurant3 style)
        const multiResNames = multiTableResPrimaryGroupNames.get(table.id) || [];
        if (multiResNames.length > 0) {
          groupedTableNames = [...groupedTableNames, ...multiResNames];
        }

        const hasTerminalReservation = tableReservations.some((r: any) => r.status === 'completed' || r.status === 'ratable' || r.status === 'no_show');
        const availableFromTime = hasTerminalReservation ? undefined : pendingAvailableFromMap.get(table.id);
        return {
          ...table,
          isReserved: tableReservations.length > 0,
          reservation,
          reservations: tableReservations,
          isBlocked,
          blockInfo,
          isTemporary: table.isTemporary || table.is_temporary || false,
          groupedTableNames,
          availableFromTime,
        };
      });
  }, [tablesQuery.data, selectedLocation, shiftFilteredReservations, blockedTablesQuery.data, selectedShift, today, selectedDate]);

  const handleSelectShift = useCallback(async (shift: ShiftInfo) => {
    console.log('[Planning] Shift selected:', shift.templateName);
    setSelectedShift(shift);
    setShowShiftSelector(false);
    if (locationsQuery.data && locationsQuery.data.length > 0) {
      setSelectedLocation(locationsQuery.data[0].id);
    }
    setTimeout(() => {
      void tablesQuery.refetch();
      void blockedTablesQuery.refetch();
    }, 100);
  }, [blockedTablesQuery, locationsQuery.data, tablesQuery]);

  const selectBestShift = useCallback((shifts: ShiftInfo[]) => {
    if (shifts.length === 0) return;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
    const todayObj = new Date();
    const isToday = selYear === todayObj.getFullYear() && (selMonth - 1) === todayObj.getMonth() && selDay === todayObj.getDate();
    let best: ShiftInfo | null = null;
    if (isToday) {
      for (const shift of shifts) {
        const [sh, sm] = shift.startTime.split(':').map(Number);
        const [eh, em] = shift.endTime.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        if (nowMinutes >= startMin && nowMinutes <= endMin) {
          best = shift;
          break;
        }
      }
      if (!best) {
        for (const shift of shifts) {
          const [sh, sm] = shift.startTime.split(':').map(Number);
          const startMin = sh * 60 + sm;
          if (startMin > nowMinutes) {
            best = shift;
            break;
          }
        }
      }
    }
    if (!best) best = shifts[0];
    void handleSelectShift(best);
  }, [handleSelectShift, selectedDate]);

  const isWalkInReservation = (reservation: any): boolean => {
    return typeof reservation.notes === 'string' && reservation.notes.includes('[WALK-IN]');
  };

  const getReservationStatusColor = (reservation: any): { bg: string; border: string; textColor: string; label: string } => {
    if (reservation.status === 'cancelled' || reservation.status === 'modified') {
      return { bg: '#F3F4F6', border: '#D1D5DB', textColor: '#6B7280', label: 'Anulada' };
    }
    if (isWalkInReservation(reservation)) {
      return { bg: '#FEE2E2', border: '#EF4444', textColor: '#991B1B', label: 'Sin cita' };
    }
    if (reservation.status === 'pending') {
      return { bg: '#FEF3C7', border: '#F59E0B', textColor: '#92400E', label: 'Pendiente' };
    }
    if (reservation.status === 'in_progress' || reservation.status === 'in_progress_added') {
      return { bg: '#059669', border: '#047857', textColor: '#fff', label: 'En Curso' };
    }
    if (reservation.status === 'ratable') {
      return { bg: '#FDF2F8', border: '#EC4899', textColor: '#BE185D', label: 'Valorable' };
    }
    if (reservation.status === 'completed') {
      return { bg: '#F3E8EF', border: '#C9A0B4', textColor: '#8B4D6A', label: 'Finalizada' };
    }
    if (reservation.status === 'añadida') {
      if (isAddedReservationInProgress(reservation)) {
        return { bg: '#059669', border: '#047857', textColor: '#fff', label: 'En Curso' };
      }
      return { bg: '#E0E7FF', border: '#6366F1', textColor: '#4338CA', label: 'Añadida' };
    }
    return { bg: '#D1FAE5', border: '#10B981', textColor: '#065F46', label: 'Confirmada' };
  };

  const getTableCardColor = (table: TableInfo): { bg: string; border: string } => {
    if (table.isBlocked) return { bg: '#FEE2E2', border: '#EF4444' };
    if (table.availableFromTime) return { bg: '#E5E7EB', border: '#F59E0B' };
    if (!table.reservations || table.reservations.length === 0) return { bg: '#E5E7EB', border: '#E5E7EB' };
    const activeReservations = table.reservations.filter((r: any) => r.status !== 'cancelled' && r.status !== 'modified');
    if (activeReservations.length === 0) return { bg: '#E5E7EB', border: '#E5E7EB' };
    if (activeReservations.length > 1) {
      return { bg: '#F9FAFB', border: '#8B5CF6' };
    }
    const color = getReservationStatusColor(activeReservations[0]);
    return { bg: color.bg, border: color.border };
  };

  const handleTablePress = (table: TableInfo) => {
    if (table.isReserved && table.reservation) {
      setSelectedReservation(table.reservation);
      setShowReservationModal(true);
    } else if (table.isBlocked) {
      setSelectedBlockedTable(table);
      setShowUnblockModal(true);
    } else if (table.availableFromTime) {
      Alert.alert(
        'Mesa no disponible aún',
        `Esta mesa forma parte de una reserva activa.\nEstará disponible a partir de las ${table.availableFromTime}`,
        [{ text: 'Entendido', style: 'default' }]
      );
    } else {
      const tableData = tablesQuery.data?.find((t: any) => t.id === table.id) as any;
      const isTemporaryGroup = tableData?.isTemporary && tableData?.groupedTableIds;
      const isTemporarySplit = tableData?.isTemporary && tableData?.originalTableId && !tableData?.groupedTableIds;
      
      if (isTemporaryGroup) {
        setSelectedGroupTable(table);
        setShowUndoGroupModal(true);
      } else if (isTemporarySplit) {
        const origId = tableData?.originalTableId;
        const allTempTables = (tablesQuery.data as any[]) ?? [];
        const siblingTables = allTempTables.filter((t: any) =>
          t.isTemporary &&
          t.originalTableId === origId &&
          t.id !== table.id &&
          !(Array.isArray(t.groupedTableIds) && t.groupedTableIds.length > 0)
        );
        const siblingIds = siblingTables.map((t: any) => t.id as string);
        const siblingHasReservation = shiftFilteredReservations.some((res: any) => {
          const rIds: string[] = Array.isArray(res.tableIds)
            ? res.tableIds
            : (typeof res.tableIds === 'string' ? JSON.parse(res.tableIds) : []);
          return siblingIds.some((sid: string) => rIds.includes(sid));
        });
        if (siblingHasReservation) {
          setSelectedFreeTable(table);
          setShowFreeTableModal(true);
        } else {
          setSelectedSplitTable(table);
          setShowUndoSplitModal(true);
        }
      } else {
        setSelectedFreeTable(table);
        setShowFreeTableModal(true);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('[Planning] 🔄 Refrescando todos los datos...');
      
      // CRÍTICO: Invalidar completamente el cache de React Query
      await queryClient.invalidateQueries({ queryKey: ['reservations'] });
      await queryClient.invalidateQueries({ queryKey: ['tables'] });
      await queryClient.invalidateQueries({ queryKey: ['tableBlocks'] });
      
      // Forzar refetch con opciones para ignorar cache
      const results = await Promise.all([
        reservationsQuery.refetch({ cancelRefetch: false }),
        blockedTablesQuery.refetch({ cancelRefetch: false }),
        tablesQuery.refetch({ cancelRefetch: false }),
        schedulesQuery.refetch({ cancelRefetch: false }),
        dayExceptionsQuery.refetch({ cancelRefetch: false }),
        locationsQuery.refetch({ cancelRefetch: false }),
      ]);
      
      console.log('[Planning] ✅ Datos actualizados:');
      console.log('[Planning] - Reservas:', results[0].data?.length || 0);
      console.log('[Planning] - Bloqueos:', results[1].data?.length || 0);
      console.log('[Planning] - Mesas:', results[2].data?.length || 0);
      
      // Forzar re-render de memos
      
      Alert.alert('Actualizado', `Datos actualizados: ${results[0].data?.length || 0} reservas cargadas`);
    } catch (error) {
      console.error('[Planning] Error al refrescar:', error);
      Alert.alert('Error', 'No se pudieron actualizar los datos');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditMaxGuests = (time: string, currentMax: number) => {
    setEditingSlot(time);
    setEditMaxGuests(String(currentMax));
  };

  const handleSaveMaxGuests = () => {
    if (editingSlot && editMaxGuests) {
      const newMax = parseInt(editMaxGuests, 10);
      if (!isNaN(newMax) && newMax > 0) {
        setCustomMaxGuests(prev => ({
          ...prev,
          [editingSlot]: newMax,
        }));

        if (restaurantId && selectedShift) {
          const exception = dayExceptionsQuery.data?.find((ex: any) => {
            let exDateString: string;
            if (typeof ex.date === 'string') {
              exDateString = ex.date.includes('T') ? ex.date.split('T')[0] : ex.date;
            } else {
              const exDate = new Date(ex.date);
              exDateString = `${exDate.getFullYear()}-${String(exDate.getMonth() + 1).padStart(2, '0')}-${String(exDate.getDate()).padStart(2, '0')}`;
            }
            return exDateString === today;
          });

          let currentShifts: any[] = [];
          if (exception?.shifts && Array.isArray(exception.shifts)) {
            currentShifts = exception.shifts;
          } else if ((exception as any)?.templateIds) {
            try {
              const tIds = (exception as any).templateIds;
              currentShifts = typeof tIds === 'string' ? JSON.parse(tIds) : tIds;
            } catch {
              currentShifts = [];
            }
          }

          if (currentShifts.length > 0) {
            const updatedShifts = currentShifts.map((shift: any) => {
              if (shift.startTime === editingSlot && shift.templateId === selectedShift.templateId) {
                return { ...shift, maxGuestsPerHour: newMax };
              }
              return shift;
            });

            const hasMatch = updatedShifts.some((s: any) => s.startTime === editingSlot && s.templateId === selectedShift.templateId);
            if (!hasMatch) {
              updatedShifts.push({
                templateId: selectedShift.templateId,
                startTime: editingSlot,
                endTime: editingSlot,
                maxGuestsPerHour: newMax,
                minRating: 0,
                minLocalRating: 0,
              });
            }

            console.log('🔵 [PLANNING] Guardando maxGuests en exception:', { slot: editingSlot, newMax, shiftsCount: updatedShifts.length });
            updateExceptionWithShiftsMutation.mutate({
              restaurantId,
              date: today,
              isOpen: true,
              shifts: updatedShifts.map((s: any) => ({
                templateId: s.templateId,
                startTime: s.startTime,
                endTime: s.endTime,
                maxGuestsPerHour: s.maxGuestsPerHour || 10,
                minRating: s.minRating || 0,
                minLocalRating: s.minLocalRating || 0,
              })),
            });
          }

          // Siempre sincronizar con expandSlotCapacity para garantizar consistencia entre planning y reservations-pro
          const [slotH, slotM] = editingSlot.split(':').map(Number);
          expandSlotCapacityMutation.mutate({
            restaurantId,
            date: today,
            hour: slotH,
            minute: slotM,
            newMaxGuests: newMax,
          });
        }
      }
    }
    setEditingSlot(null);
    setEditMaxGuests('');
  };

  const handleCallClient = (phone: string) => {
    if (phone) {
      const phoneUrl = `tel:${phone}`;
      void import('react-native').then(({ Linking }) => {
        void Linking.openURL(phoneUrl).catch(() => {
          Alert.alert('Error', 'No se pudo abrir la aplicación de teléfono');
        });
      });
    }
  };

  const handleWhatsAppClient = (phone: string) => {
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}`;
      void import('react-native').then(({ Linking }) => {
        void Linking.openURL(whatsappUrl).catch(() => {
          Alert.alert('Error', 'No se pudo abrir WhatsApp');
        });
      });
    }
  };

  const handleEditReservation = (reservation: any) => {
    setShowReservationModal(false);
    setEditingReservation(reservation);
    setEditSelectedLocation(reservation.locationId || '');
    setEditSelectedTables(reservation.tableIds || []);
    setEditGuestsValue(reservation.guests || 1);
    const currentTimeStr = `${String(reservation.time.hour).padStart(2, '0')}:${String(reservation.time.minute).padStart(2, '0')}`;
    setEditTimeValue(currentTimeStr);
    setEditModalTab('comensales');
    setShowEditModal(true);
  };

  const doesBlockAffectReservationTime = useCallback((block: any, reservation: any) => {
    if (!block?.startTime || !block?.endTime || !reservation?.date || !reservation?.time) {
      return false;
    }

    const reservationDate = typeof reservation.date === 'string' && reservation.date.includes('T')
      ? reservation.date.split('T')[0]
      : reservation.date;
    const blockStart = new Date(block.startTime);
    const blockEnd = new Date(block.endTime);
    const reservationDateTime = new Date(`${reservationDate}T${String(reservation.time.hour).padStart(2, '0')}:${String(reservation.time.minute).padStart(2, '0')}:00`);

    if (Number.isNaN(blockStart.getTime()) || Number.isNaN(blockEnd.getTime()) || Number.isNaN(reservationDateTime.getTime())) {
      return false;
    }

    return reservationDateTime >= blockStart && reservationDateTime < blockEnd;
  }, []);

  const handleSaveEdit = () => {
    if (!editingReservation) return;
    
    if (editSelectedTables.length === 0) {
      Alert.alert('Error', 'Debe seleccionar una mesa');
      return;
    }

    if (editSelectedTables.length > 1) {
      Alert.alert('Error', 'Solo puede seleccionar una mesa a la vez');
      return;
    }

    const selectedTableId = editSelectedTables[0];
    
    const isBlocked = blockedTablesQuery.data?.some((block: any) => block.tableId === selectedTableId && doesBlockAffectReservationTime(block, editingReservation));
    if (isBlocked) {
      Alert.alert('Mesa Bloqueada', 'No puedes asignar una mesa que está bloqueada. Por favor, selecciona otra mesa.');
      return;
    }
    
    const conflictTable = tablesQuery.data?.find((t: any) => t.id === selectedTableId);
    const tableRotMin = (conflictTable as any)?.rotationTimeMinutes || 120;
    const editResTimeMin = editingReservation.time.hour * 60 + editingReservation.time.minute;

    const conflictingReservation = todayReservations.find((res: any) => {
      if (res.id === editingReservation.id) return false;
      if (!res.tableIds?.includes(selectedTableId)) return false;
      if (res.status === 'cancelled' || res.status === 'modified') return false;
      const resTimeMin = res.time.hour * 60 + res.time.minute;
      return Math.abs(resTimeMin - editResTimeMin) < tableRotMin;
    });
    
    if (conflictingReservation) {
      const conflictResTimeMin = conflictingReservation.time.hour * 60 + conflictingReservation.time.minute;
      const isRotationCompatible = editResTimeMin >= conflictResTimeMin + tableRotMin || conflictResTimeMin >= editResTimeMin + tableRotMin;
      if (isRotationCompatible) {
        const conflictTimeStr = `${String(conflictingReservation.time.hour).padStart(2, '0')}:${String(conflictingReservation.time.minute).padStart(2, '0')}`;
        const myTimeStr = `${String(editingReservation.time.hour).padStart(2, '0')}:${String(editingReservation.time.minute).padStart(2, '0')}`;
        Alert.alert(
          'Mesa con reserva',
          `Esta mesa tiene reserva a las ${conflictTimeStr}. El tiempo de rotación permite alojar también tu reserva de las ${myTimeStr}. ¿Confirmar cambio?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Confirmar', onPress: () => updateTableMutation.mutate({
              reservationId: editingReservation.id,
              tableIds: editSelectedTables,
              locationId: editSelectedLocation,
            })},
          ]
        );
        return;
      }
      // Validar que ambas reservas caben en las mesas intercambiadas
      const editResGuests = editGuestsValue || editingReservation.guests;
      const conflictResGuests = conflictingReservation.guests;
      const conflictTableMin = (conflictTable as any)?.minCapacity || 1;
      const conflictTableMax = (conflictTable as any)?.maxCapacity || (conflictTable as any)?.capacity || 99;
      const currentTableId = editingReservation.tableIds?.[0];
      const currentTableData = (tablesQuery.data as any[])?.find((t: any) => t.id === currentTableId);
      const currentTableMin = currentTableData?.minCapacity || 1;
      const currentTableMax = currentTableData?.maxCapacity || currentTableData?.capacity || 99;

      const editFitsInTarget = editResGuests >= conflictTableMin && editResGuests <= conflictTableMax;
      const conflictFitsInCurrent = conflictResGuests >= currentTableMin && conflictResGuests <= currentTableMax;

      if (!editFitsInTarget || !conflictFitsInCurrent) {
        let errorMsg = 'No es posible intercambiar las mesas:\n\n';
        if (!editFitsInTarget) {
          errorMsg += `• La reserva de ${editingReservation.clientName} (${editResGuests} pax) no cabe en ${(conflictTable as any)?.name} (${conflictTableMin}-${conflictTableMax} pax)\n`;
        }
        if (!conflictFitsInCurrent) {
          errorMsg += `• La reserva de ${conflictingReservation.clientName} (${conflictResGuests} pax) no cabe en la mesa actual (${currentTableMin}-${currentTableMax} pax)`;
        }
        Alert.alert('Intercambio incompatible', errorMsg);
        return;
      }

      setSwapTargetTable(conflictTable);
      setSwapTargetReservation(conflictingReservation);
      setShowSwapConfirmModal(true);
      return;
    }

    updateTableMutation.mutate({
      reservationId: editingReservation.id,
      tableIds: editSelectedTables,
      locationId: editSelectedLocation,
    });
  };

  const handleSaveEditAll = () => {
    if (!editingReservation) return;
    const currentTimeStr = `${String(editingReservation.time.hour).padStart(2, '0')}:${String(editingReservation.time.minute).padStart(2, '0')}`;
    const timeChanged = editTimeValue !== currentTimeStr && editTimeValue !== '';
    const guestsChanged = editGuestsValue !== editingReservation.guests;

    if (!timeChanged && !guestsChanged) {
      Alert.alert('Sin cambios', 'No hay cambios que guardar');
      return;
    }

    const updates: any = { reservationId: editingReservation.id, modifiedBy: 'restaurant' };
    if (guestsChanged) updates.guests = editGuestsValue;
    if (timeChanged) {
      const [h, m] = editTimeValue.split(':').map(Number);
      const slot = timeSlots.find(s => s.time === editTimeValue);
      const wouldExceed = slot && ((slot.reservedGuests - editingReservation.guests + editGuestsValue) > slot.maxGuests);
      if (wouldExceed) {
        Alert.alert(
          'Capacidad Excedida',
          `El horario ${editTimeValue} quedaría sobre el máximo. ¿Continuar de todas formas?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Guardar', onPress: () => updateReservationMutation.mutate({ ...updates, time: { hour: Number(editTimeValue.split(':')[0]), minute: Number(editTimeValue.split(':')[1]) } }) },
          ]
        );
        return;
      }
      updates.time = { hour: h, minute: m };
    }

    updateReservationMutation.mutate(updates);
  };

  const editGuestsTableCapacity = useMemo(() => {
    if (!editingReservation) return { min: 1, max: 99 };
    const tableIds: string[] = Array.isArray(editingReservation.tableIds)
      ? editingReservation.tableIds
      : (typeof editingReservation.tableIds === 'string' ? JSON.parse(editingReservation.tableIds) : []);
    const table = (tablesQuery.data as any[])?.find((t: any) => tableIds.includes(t.id));
    if (!table) return { min: 1, max: 99 };
    return { min: table.minCapacity || 1, max: table.maxCapacity || table.capacity || 99 };
  }, [editingReservation, tablesQuery.data]);

  const handleConfirmSwap = () => {
    if (!editingReservation || !swapTargetReservation) return;
    
    swapTablesMutation.mutate({
      reservationId1: editingReservation.id,
      reservationId2: swapTargetReservation.id,
    });
  };

  const handleBlockTable = (_table: TableInfo) => {
    if (!selectedShift) {
      Alert.alert('Error', 'No hay turno seleccionado');
      return;
    }
    setShowFreeTableModal(false);
    setShowBlockModal(true);
  };

  const handleConfirmBlockTable = async () => {
    if (!selectedFreeTable || !restaurantId) {
      Alert.alert('Error', 'Datos incompletos para bloquear la mesa');
      return;
    }

    const duration = parseInt(blockDuration) || 120;
    const isWalkIn = !!blockSelectedTimeSlot;

    if (isWalkIn) {
      if (!selectedShift) {
        Alert.alert('Error', 'No hay turno seleccionado');
        return;
      }
      const [slotHour, slotMin] = blockSelectedTimeSlot.split(':').map(Number);
      const slotDate = selectedDate;
      const clientPhone = blockWalkInPhone.trim()
        ? blockWalkInPhonePrefix + blockWalkInPhone.trim()
        : `walkin-${Date.now()}`;
      const clientName = blockWalkInName.trim() || 'Cliente sin cita';

      try {
        await createWalkInMutation.mutateAsync({
          restaurantId,
          clientPhone,
          clientName,
          date: slotDate,
          time: { hour: slotHour, minute: slotMin },
          guests: blockWalkInGuests,
          locationId: selectedFreeTable.locationId,
          tableIds: [selectedFreeTable.id],
          needsHighChair: false,
          needsStroller: false,
          hasPets: false,
          notes: '[WALK-IN] Reserva rápida sin cita previa',
          fromRestaurantPanel: true,
          skipConfirmation: true,
        });
        console.log('[Planning] Walk-in creado sin bloqueo de mesa - la reserva respeta el tiempo de rotación');
        setShowBlockModal(false);
        setShowFreeTableModal(false);
        setSelectedFreeTable(null);
        setBlockDuration('120');
        setBlockWalkInName('');
        setBlockWalkInPhone('');
        setBlockWalkInGuests(2);
        setBlockSelectedTimeSlot('');
        void reservationsQuery.refetch();
        Alert.alert('Éxito', 'Reserva sin cita creada correctamente. La mesa quedará disponible tras el tiempo de rotación.');
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'No se pudo crear la reserva sin cita');
      }
    } else {
      blockTableMutation.mutate({
        restaurantId,
        tableId: selectedFreeTable.id,
        locationId: selectedFreeTable.locationId,
        durationMinutes: duration,
      });
    }
  };

  const handleAddReservationToTable = (table: TableInfo) => {
    setShowFreeTableModal(false);
    const slugOrId = restaurantSlug || restaurantId;
    if (!slugOrId) {
      Alert.alert('Error', 'No se pudo obtener los datos del restaurante');
      return;
    }
    // Pasar información del turno para que pueda encontrar mesas temporales
    const shiftParams = selectedShift 
      ? `&shiftTemplateId=${selectedShift.templateId}&shiftDate=${today}`
      : '';
    router.push(`/client/restaurant3/${slugOrId}?tableId=${table.id}&locationId=${table.locationId}${shiftParams}` as any);
  };

  const handleUnblockTable = () => {
    if (!selectedBlockedTable?.blockInfo?.id) {
      Alert.alert('Error', 'No se encontró información del bloqueo');
      return;
    }
    unblockTableMutation.mutate({ blockId: selectedBlockedTable.blockInfo.id });
  };

  const handleOpenSplitModal = (table: TableInfo) => {
    setSelectedFreeTable(table);
    const originalCapacity = table.maxCapacity || table.capacity || 4;
    const originalMin = table.minCapacity || 1;
    const halfCapacity = Math.floor(originalCapacity / 2);
    const halfMin = Math.max(1, Math.floor(originalMin / 2));
    
    // Configurar Mesa A
    setModifiedTableACapacity(String(halfCapacity));
    setSplitTableAMinCapacity(String(halfMin));
    setSplitTableAHighChairs('0');
    setSplitTableAAllowsStroller(true);
    setSplitTableAAllowsPets(false);
    
    // Configurar Mesa B
    setSplitTableBCapacity(String(originalCapacity - halfCapacity));
    setSplitTableBMinCapacity(String(Math.max(1, originalMin - halfMin)));
    setSplitTableBHighChairs('0');
    setSplitTableBAllowsStroller(true);
    setSplitTableBAllowsPets(false);
    
    setShowSplitModal(true);
  };

  const handleOpenGroupModal = (table: TableInfo) => {
    setSelectedFreeTable(table);
    setSelectedTablesForGroup([table.id]);
    const minCap = table.minCapacity || 1;
    const maxCap = table.maxCapacity || table.capacity || 2;
    setGroupMinCapacity(String(minCap));
    setGroupMaxCapacity(String(maxCap));
    setGroupTimeSlot('');
    setGroupModalStep('time');
    setShowGroupModal(true);
  };

  const handleToggleTableForGroup = (tableId: string) => {
    const newSelection = selectedTablesForGroup.includes(tableId)
      ? selectedTablesForGroup.filter(id => id !== tableId)
      : [...selectedTablesForGroup, tableId];
    const selectedTables = locationTables.filter((t: any) => newSelection.includes(t.id));
    const totalMin = selectedTables.reduce((sum: number, t: any) => sum + (t.minCapacity || 1), 0);
    const totalMax = selectedTables.reduce((sum: number, t: any) => sum + (t.maxCapacity || t.capacity || 2), 0);
    setSelectedTablesForGroup(newSelection);
    setGroupMinCapacity(String(totalMin));
    setGroupMaxCapacity(String(totalMax));
  };

  const handleConfirmSplit = () => {
    if (!selectedFreeTable || !restaurantId || !selectedShift) {
      Alert.alert('Error', 'Datos incompletos para dividir la mesa');
      return;
    }
    
    const tableACapacity = parseInt(modifiedTableACapacity) || 2;
    const tableBCapacity = parseInt(splitTableBCapacity) || 2;
    const tableAHighChairs = parseInt(splitTableAHighChairs) || 0;
    const tableBHighChairs = parseInt(splitTableBHighChairs) || 0;
    
    // Verificar que las capacidades son válidas
    if (tableACapacity < 1 || tableBCapacity < 1) {
      Alert.alert('Error', 'Cada mesa debe tener al menos 1 comensal de capacidad');
      return;
    }
    
    const tableAMinCapacity = parseInt(splitTableAMinCapacity) || 1;
    const tableBMinCapacity = parseInt(splitTableBMinCapacity) || 1;
    
    splitTableDirectMutation.mutate({
      restaurantId,
      originalTableId: selectedFreeTable.id,
      locationId: selectedFreeTable.locationId,
      shiftTemplateId: selectedShift.templateId,
      shiftDate: today,
      tableAMinCapacity,
      tableACapacity,
      tableAHighChairs,
      tableAAllowsStroller: splitTableAAllowsStroller,
      tableAAllowsPets: splitTableAAllowsPets,
      tableBMinCapacity,
      tableBCapacity,
      tableBHighChairs,
      tableBAllowsStroller: splitTableBAllowsStroller,
      tableBAllowsPets: splitTableBAllowsPets,
      shiftStartTime: selectedShift.startTime,
      shiftEndTime: selectedShift.endTime,
    });
  };

  const handleConfirmGroup = () => {
    console.log('[Planning] handleConfirmGroup called, selectedTablesForGroup:', selectedTablesForGroup, 'selectedShift:', selectedShift?.templateId, 'groupFromReservationId:', groupFromReservationId);
    setGroupModalError(null);
    if (!selectedFreeTable || !restaurantId || !selectedShift || selectedTablesForGroup.length < 2) {
      const msg = !selectedShift ? 'No hay turno seleccionado' : 'Debes seleccionar al menos 2 mesas para agrupar';
      setGroupModalError(msg);
      Alert.alert('Error', msg);
      return;
    }
    
    const allTablesData = (tablesQuery.data as any[]) || [];
    const selectedTableNames = selectedTablesForGroup
      .map((id: string) => {
        const t = locationTables.find((lt: any) => lt.id === id) || allTablesData.find((at: any) => at.id === id);
        return (t as any)?.name || id;
      })
      .join(' + ');
    
    groupTablesDirectMutation.mutate({
      restaurantId,
      locationId: selectedFreeTable.locationId,
      tableIds: selectedTablesForGroup,
      shiftTemplateId: selectedShift.templateId,
      shiftDate: today,
      groupName: `Grupo ${selectedTableNames}`,
      customMinCapacity: parseInt(groupMinCapacity) || undefined,
      customMaxCapacity: parseInt(groupMaxCapacity) || undefined,
      excludeReservationId: groupFromReservationId || undefined,
    });
  };

  const waitlistEntries = useMemo(() => {
    const all = (waitlistQuery.data || []) as any[];
    if (!selectedShift) return all;
    const [shiftStartH, shiftStartM] = selectedShift.startTime.split(':').map(Number);
    const [shiftEndH, shiftEndM] = selectedShift.endTime.split(':').map(Number);
    const shiftStartMin = shiftStartH * 60 + shiftStartM;
    const shiftEndMin = shiftEndH * 60 + shiftEndM;
    return all.filter((entry: any) => {
      if (!entry.preferred_time) return true;
      const [prefH, prefM] = entry.preferred_time.split(':').map(Number);
      const prefMin = prefH * 60 + prefM;
      return prefMin >= shiftStartMin && prefMin <= shiftEndMin;
    });
  }, [waitlistQuery.data, selectedShift]);

  const waitlistAssignTables = useMemo(() => {
    if (!tablesQuery.data || !waitlistAssignLocation) return [];

    const allTables = tablesQuery.data as any[];

    const groupedIntoTempIds = new Set<string>();
    const splitOriginalIds = new Set<string>();

    allTables.forEach((t: any) => {
      if (!t.isTemporary) return;
      if (t.locationId !== waitlistAssignLocation) return;
      if (t.groupedTableIds && Array.isArray(t.groupedTableIds)) {
        t.groupedTableIds.forEach((id: string) => groupedIntoTempIds.add(id));
      }
      if (t.originalTableId) {
        splitOriginalIds.add(t.originalTableId);
      }
    });

    return allTables.filter((t: any) => {
      if (t.locationId !== waitlistAssignLocation) return false;
      if (t.isTemporary && t.groupedTableIds && Array.isArray(t.groupedTableIds) && t.groupedTableIds.length > 0) return false;
      if (!t.isTemporary && groupedIntoTempIds.has(t.id)) return false;
      if (!t.isTemporary && splitOriginalIds.has(t.id)) return false;
      return true;
    });
  }, [tablesQuery.data, waitlistAssignLocation]);

  const waitlistFreeTables = useMemo(() => {
    if (!waitlistAssignTime || !waitlistAssignLocation) return [];

    const [slotH, slotM] = waitlistAssignTime.split(':').map(Number);
    const slotMin = slotH * 60 + slotM;

    const allTables = tablesQuery.data as any[] || [];

    const locationReservations = todayReservations.filter((res: any) =>
      res.locationId === waitlistAssignLocation &&
      res.status !== 'cancelled' &&
      res.status !== 'modified'
    );

    const occupiedTableIds = new Set<string>();
    locationReservations.forEach((res: any) => {
      const resTimeMin = res.time.hour * 60 + res.time.minute;
      const resTableIds: string[] = Array.isArray(res.tableIds)
        ? res.tableIds
        : (typeof res.tableIds === 'string' ? JSON.parse(res.tableIds) : []);
      const maxRotMin = resTableIds.reduce((max: number, tableId: string) => {
        const td = allTables.find((t: any) => t.id === tableId);
        return Math.max(max, td?.rotationTimeMinutes || 120);
      }, 120);
      if (Math.abs(slotMin - resTimeMin) < maxRotMin) {
        resTableIds.forEach((id: string) => occupiedTableIds.add(id));
      }
    });

    const slotDateTimeStr = `${today}T${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}:00`;
    const slotDateTime = new Date(slotDateTimeStr);

    const blockedIds = new Set<string>(
      (blockedTablesQuery.data || [])
        .filter((b: any) => {
          const blockStart = new Date(b.startTime);
          const blockEnd = new Date(b.endTime);
          const overlaps = blockStart <= slotDateTime && blockEnd > slotDateTime;
          const isGroupOrSplitBlock = typeof b.id === 'string' && (b.id.startsWith('block-group-') || b.id.startsWith('block-split-'));
          if (isGroupOrSplitBlock) {
            return false;
          }
          return overlaps;
        })
        .map((b: any) => b.tableId as string)
    );

    return waitlistAssignTables.filter((table: any) => {
      if (occupiedTableIds.has(table.id)) return false;
      if (blockedIds.has(table.id)) return false;
      return true;
    });
  }, [waitlistAssignTime, waitlistAssignLocation, waitlistAssignTables, tablesQuery.data, todayReservations, blockedTablesQuery.data, today]);

  const freeTablesForGrouping = useMemo(() => {
    if (!selectedFreeTable) return [];
    return locationTables.filter((table: any) => {
      if (table.id === selectedFreeTable.id) return false;
      if (table.isTemporary && !table.originalTableId) return false;
      if (table.isBlocked) return false;

      if (!table.isReserved && !table.availableFromTime) return true;

      if (groupTimeSlot) {
        const [slotH, slotM] = groupTimeSlot.split(':').map(Number);
        const slotMin = slotH * 60 + slotM;

        if (table.availableFromTime) {
          const [availH, availM] = table.availableFromTime.split(':').map(Number);
          const availMin = availH * 60 + availM;
          return slotMin >= availMin;
        }

        if (table.reservations && table.reservations.length > 0) {
          const tableData = (tablesQuery.data as any[])?.find((t: any) => t.id === table.id);
          const rotMin = (tableData as any)?.rotationTimeMinutes || 120;
          return table.reservations.every((res: any) => {
            const resTimeMin = res.time.hour * 60 + res.time.minute;
            return slotMin >= resTimeMin + rotMin || resTimeMin >= slotMin + rotMin;
          });
        }
      }

      return false;
    });
  }, [locationTables, selectedFreeTable, groupTimeSlot, tablesQuery.data]);

  const createWaitlistReservation = (allowCapacityExpansion: boolean = false) => {
    if (!selectedWaitlistEntry || !restaurantId || !waitlistAssignTableId || !waitlistAssignTime) {
      Alert.alert('Error', 'Selecciona un horario y una mesa para continuar');
      return;
    }
    const [h, m] = waitlistAssignTime.split(':').map(Number);
    const table = (tablesQuery.data as any[])?.find((t: any) => t.id === waitlistAssignTableId);
    const locId = waitlistAssignLocation || table?.locationId || '';
    console.log('[Planning] Creando reserva desde lista de espera:', { tableId: waitlistAssignTableId, time: waitlistAssignTime, guests: selectedWaitlistEntry.guests, allowCapacityExpansion });
    createFromWaitlistMutation.mutate({
      restaurantId,
      clientPhone: selectedWaitlistEntry.client_phone,
      clientName: selectedWaitlistEntry.client_name,
      date: today,
      time: { hour: h, minute: m },
      guests: selectedWaitlistEntry.guests,
      locationId: locId,
      tableIds: [waitlistAssignTableId],
      needsHighChair: selectedWaitlistEntry.needs_high_chair || false,
      needsStroller: selectedWaitlistEntry.needs_stroller || false,
      hasPets: selectedWaitlistEntry.has_pets || false,
      notes: selectedWaitlistEntry.notes || '',
      fromRestaurantPanel: true,
      skipConfirmation: true,
      allowCapacityExpansion,
    });
  };

  const handleAssignWaitlist = () => {
    if (!selectedWaitlistEntry || !restaurantId || !waitlistAssignTableId || !waitlistAssignTime) {
      Alert.alert('Error', 'Selecciona un horario y una mesa para continuar');
      return;
    }

    const selectedSlot = timeSlots.find((slot) => slot.time === waitlistAssignTime);
    if (!selectedSlot) {
      createWaitlistReservation();
      return;
    }

    const requiredGuests = selectedSlot.reservedGuests + selectedWaitlistEntry.guests;
    if (requiredGuests <= selectedSlot.maxGuests) {
      createWaitlistReservation();
      return;
    }

    const newMaxGuests = requiredGuests;
    const confirmExpansion = () => {
      console.log('[Planning] Confirmada creación con ampliación automática de capacidad para lista de espera:', {
        time: selectedSlot.time,
        previousMaxGuests: selectedSlot.maxGuests,
        newMaxGuests,
        guestsToAdd: selectedWaitlistEntry.guests,
      });
      createWaitlistReservation(true);
    };

    const expansion = newMaxGuests - selectedSlot.maxGuests;
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `El horario ${selectedSlot.time} necesita ampliar su máximo en ${expansion} comensales (${selectedSlot.maxGuests} → ${newMaxGuests} pax) para acoger esta reserva. El sistema lo ampliará automáticamente si confirmas. ¿Continuar?`
      );
      if (confirmed) {
        confirmExpansion();
      }
    } else {
      Alert.alert(
        'Se superará la capacidad máxima',
        `El horario ${selectedSlot.time} necesita ampliar su máximo en ${expansion} comensales (${selectedSlot.maxGuests} → ${newMaxGuests} pax) para acoger esta reserva. El sistema lo ampliará automáticamente si confirmas. ¿Continuar?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => undefined,
          },
          {
            text: 'Sí, continuar',
            onPress: confirmExpansion,
          },
        ]
      );
    }
  };

  const handleUndoGroup = () => {
    if (!selectedGroupTable || !restaurantId) {
      Alert.alert('Error', 'Datos incompletos para deshacer el grupo');
      return;
    }
    undoGroupMutation.mutate({
      groupId: selectedGroupTable.id,
      restaurantId,
    });
  };

  const handleUndoSplit = () => {
    if (!selectedSplitTable || !restaurantId) {
      Alert.alert('Error', 'Datos incompletos para deshacer la división');
      return;
    }
    const tableData = tablesQuery.data?.find((t: any) => t.id === selectedSplitTable.id) as any;
    undoSplitMutation.mutate({
      temporaryTableId: selectedSplitTable.id,
      originalTableId: tableData?.originalTableId,
      restaurantId,
    });
  };

  const handleOpenChangeTime = () => {
    setShowReservationModal(false);
    setShowChangeTimeModal(true);
  };

  const handleOpenChangeGuests = () => {
    if (!selectedReservation) return;
    setChangeGuestsValue(selectedReservation.guests);
    setChangeNeedsHighChair(selectedReservation.needsHighChair || false);
    setChangeHighChairCount(String(selectedReservation.highChairCount || 1));
    setChangeNeedsStroller(selectedReservation.needsStroller || false);
    setChangeHasPets(selectedReservation.hasPets || false);
    setShowReservationModal(false);
    setShowChangeGuestsModal(true);
  };

  const handleSelectNewTime = (slot: TimeSlotInfo) => {
    if (!selectedReservation) return;
    const currentResTimeStr = `${String(selectedReservation.time.hour).padStart(2, '0')}:${String(selectedReservation.time.minute).padStart(2, '0')}`;
    if (slot.time === currentResTimeStr) return;
    const wouldExceed = (slot.reservedGuests + selectedReservation.guests) > slot.maxGuests;
    const [h, m] = slot.time.split(':').map(Number);
    if (wouldExceed) {
      Alert.alert(
        'Capacidad Excedida',
        `El horario ${slot.time} quedaría a ${slot.reservedGuests + selectedReservation.guests}/${slot.maxGuests} pax. ¿Continuar de todas formas?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar',
            onPress: () => updateReservationMutation.mutate({
              reservationId: selectedReservation.id,
              time: { hour: h, minute: m },
              modifiedBy: 'restaurant',
            }),
          },
        ]
      );
    } else {
      updateReservationMutation.mutate({
        reservationId: selectedReservation.id,
        time: { hour: h, minute: m },
        modifiedBy: 'restaurant',
      });
    }
  };

  const handleSaveGuestsChange = () => {
    if (!selectedReservation) return;
    updateReservationMutation.mutate({
      reservationId: selectedReservation.id,
      guests: changeGuestsValue,
      needsHighChair: changeNeedsHighChair,
      needsStroller: changeNeedsStroller,
      hasPets: changeHasPets,
      modifiedBy: 'restaurant',
    });
  };

  const editSelectableTables = useMemo<EditSelectableTable[]>(() => {
    const baseTables = ((tablesQuery.data as EditSelectableTable[] | undefined) ?? []).filter((table: EditSelectableTable) => {
      if (table.locationId !== editSelectedLocation) return false;
      if (!editingReservation) return true;

      const resGuests = editGuestsValue || editingReservation.guests || 1;
      const tableMin = table.minCapacity || 1;
      const tableMax = table.maxCapacity || table.capacity || 99;

      if (tableMin > resGuests) return false;
      if (tableMax < resGuests) return false;
      if (editingReservation.needsHighChair && editingReservation.highChairCount > 0) {
        if (!table.allowsHighChairs && !((table.availableHighChairs ?? 0) > 0)) return false;
      }
      if (editingReservation.needsStroller && !table.allowsStroller && !table.allowsStrollers) return false;
      if (editingReservation.hasPets && !table.allowsPets) return false;
      return true;
    });

    const availableTables = ((availableTablesQuery.data as EditSelectableTable[] | undefined) ?? []).filter((table: EditSelectableTable) => {
      if (table.locationId !== editSelectedLocation) return false;
      return true;
    });

    const currentTable = baseTables.find((table: EditSelectableTable) => editingReservation?.tableIds?.includes(table.id));
    const map = new Map<string, EditSelectableTable>();

    const _editResTimeMinForMemo = editingReservation
      ? editingReservation.time.hour * 60 + editingReservation.time.minute
      : 0;

    baseTables.forEach((table: EditSelectableTable) => {
      map.set(table.id, table);
    });

    availableTables.forEach((table: EditSelectableTable) => {
      map.set(table.id, {
        ...map.get(table.id),
        ...table,
      });
    });

    if (currentTable) {
      map.set(currentTable.id, currentTable);
    }

    return Array.from(map.values()).sort((a: EditSelectableTable, b: EditSelectableTable) => a.name.localeCompare(b.name, 'es'));
  }, [availableTablesQuery.data, editGuestsValue, editSelectedLocation, editingReservation, tablesQuery.data]);

  const incompatibleFreeTables = useMemo<EditSelectableTable[]>(() => {
    if (!editSelectedLocation || !editingReservation) return [];
    const allTables = (tablesQuery.data as EditSelectableTable[] | undefined) ?? [];
    const resGuests = editGuestsValue || editingReservation.guests || 1;
    const editResTimeMin = editingReservation.time.hour * 60 + editingReservation.time.minute;
    const compatibleIds = new Set(editSelectableTables.map((t: EditSelectableTable) => t.id));
    return allTables.filter((table: EditSelectableTable) => {
      if (table.locationId !== editSelectedLocation) return false;
      if (compatibleIds.has(table.id)) return false;
      const tableMin = table.minCapacity || 1;
      const tableMax = table.maxCapacity || (table as any).capacity || 99;
      const isCapacityIncompatible = tableMin > resGuests || tableMax < resGuests;
      const isAmenityIncompatible =
        (editingReservation.needsHighChair && (editingReservation.highChairCount || 0) > 0 && !table.allowsHighChairs && !((table.availableHighChairs ?? 0) > 0)) ||
        (editingReservation.needsStroller && !table.allowsStroller && !table.allowsStrollers) ||
        (editingReservation.hasPets && !table.allowsPets);
      if (!isCapacityIncompatible && !isAmenityIncompatible) return false;
      const isBlocked = blockedTablesQuery.data?.some((block: any) => block.tableId === table.id && doesBlockAffectReservationTime(block, editingReservation));
      if (isBlocked) return false;
      const tableRotMin = (table as any).rotationTimeMinutes || 120;
      const hasConflict = todayReservations.some((res: any) => {
        if (res.id === editingReservation.id) return false;
        if (!res.tableIds?.includes(table.id)) return false;
        if (res.status === 'cancelled' || res.status === 'modified') return false;
        const resTimeMin = res.time.hour * 60 + res.time.minute;
        return Math.abs(resTimeMin - editResTimeMin) < tableRotMin;
      });
      return !hasConflict;
    }).sort((a: EditSelectableTable, b: EditSelectableTable) => a.name.localeCompare(b.name, 'es'));
  }, [tablesQuery.data, editSelectableTables, editSelectedLocation, editingReservation, editGuestsValue, blockedTablesQuery.data, doesBlockAffectReservationTime, todayReservations]);

  const selectedReservationSplitTable = useMemo<EditSelectableTable | null>(() => {
    if (!selectedReservation) return null;

    const rawIds = selectedReservation.tableIds;
    const tableIds: string[] = Array.isArray(rawIds)
      ? rawIds
      : (typeof rawIds === 'string' ? JSON.parse(rawIds) : []);

    const splitTable = ((tablesQuery.data as EditSelectableTable[] | undefined) ?? []).find((table: EditSelectableTable) => (
      tableIds.includes(table.id) && Boolean(table.isTemporary) && Boolean(table.originalTableId) && !(Array.isArray(table.groupedTableIds) && table.groupedTableIds.length > 0)
    ));

    return splitTable ?? null;
  }, [selectedReservation, tablesQuery.data]);

  const _splitSiblingHasReservation = useMemo(() => {
    if (!selectedReservationSplitTable) return false;
    const origId = selectedReservationSplitTable.originalTableId;
    if (!origId) return false;
    const allTables = (tablesQuery.data as any[]) ?? [];
    const siblingIds = allTables
      .filter((t: any) =>
        t.isTemporary &&
        t.originalTableId === origId &&
        t.id !== selectedReservationSplitTable.id &&
        !(Array.isArray(t.groupedTableIds) && t.groupedTableIds.length > 0)
      )
      .map((t: any) => t.id);
    if (!siblingIds.length) return false;
    return shiftFilteredReservations.some((res: any) => {
      const rIds: string[] = Array.isArray(res.tableIds)
        ? res.tableIds
        : (typeof res.tableIds === 'string' ? JSON.parse(res.tableIds) : []);
      return siblingIds.some((sid: string) => rIds.includes(sid));
    });
  }, [selectedReservationSplitTable, tablesQuery.data, shiftFilteredReservations]);

  const changeGuestsTableData = useMemo(() => {
    if (!selectedReservation) return null;
    const rawIds = selectedReservation.tableIds;
    const tableIds: string[] = Array.isArray(rawIds) ? rawIds : (typeof rawIds === 'string' ? JSON.parse(rawIds) : []);
    if (!tableIds.length) return null;
    return (tablesQuery.data as any[])?.find((t: any) => tableIds.includes(t.id)) || null;
  }, [selectedReservation, tablesQuery.data]);

  const canAddAnotherReservationToSelectedTable = useMemo(() => {
    if (!selectedReservation || !selectedShift) return false;
    const rawIds = selectedReservation.tableIds;
    const tableIds: string[] = Array.isArray(rawIds) ? rawIds : (typeof rawIds === 'string' ? JSON.parse(rawIds) : []);
    if (!tableIds.length) return false;
    const table = (tablesQuery.data as any[])?.find((t: any) => tableIds.includes(t.id));
    if (!table) return false;
    const rotMin = (table as any).rotationTimeMinutes || 120;
    const resTimeMin = selectedReservation.time.hour * 60 + selectedReservation.time.minute;
    const nextPossibleTime = resTimeMin + rotMin;
    const [shiftEndH, shiftEndM] = selectedShift.endTime.split(':').map(Number);
    const shiftEndMinutesTotal = shiftEndH * 60 + shiftEndM;
    if (nextPossibleTime >= shiftEndMinutesTotal) return false;
    // Verificar que no hay ya una reserva posterior en esta misma mesa
    const hasLaterReservation = shiftFilteredReservations.some((res: any) => {
      if (res.id === selectedReservation.id) return false;
      const resTableIds: string[] = Array.isArray(res.tableIds)
        ? res.tableIds
        : (typeof res.tableIds === 'string' ? JSON.parse(res.tableIds) : []);
      if (!resTableIds.some((id: string) => tableIds.includes(id))) return false;
      const resTimeMinutes = res.time.hour * 60 + res.time.minute;
      return resTimeMinutes >= nextPossibleTime;
    });
    return !hasLaterReservation;
  }, [selectedReservation, selectedShift, tablesQuery.data, shiftFilteredReservations]);

  const addReservationMinTime = useMemo(() => {
    if (!selectedReservation || !canAddAnotherReservationToSelectedTable) return '';
    const rawIds = selectedReservation.tableIds;
    const tableIds: string[] = Array.isArray(rawIds) ? rawIds : (typeof rawIds === 'string' ? JSON.parse(rawIds) : []);
    const table = (tablesQuery.data as any[])?.find((t: any) => tableIds.includes(t.id));
    if (!table) return '';
    const rotMin = (table as any).rotationTimeMinutes || 120;
    const resTimeMin = selectedReservation.time.hour * 60 + selectedReservation.time.minute;
    const minTimeMin = resTimeMin + rotMin;
    const minTimeH = Math.floor(minTimeMin / 60);
    const minTimeM = minTimeMin % 60;
    return `${String(minTimeH).padStart(2, '0')}:${String(minTimeM).padStart(2, '0')}`;
  }, [selectedReservation, canAddAnotherReservationToSelectedTable, tablesQuery.data]);

  const tablesForReducedGuests = useMemo(() => {
    if (!selectedReservation) return [];
    const rawIds = selectedReservation.tableIds;
    const tableIds: string[] = Array.isArray(rawIds) ? rawIds : (typeof rawIds === 'string' ? JSON.parse(rawIds) : []);
    if (tableIds.length <= 1) return [];
    const allTables = (tablesQuery.data as any[]) || [];
    return allTables.filter((t: any) => {
      if (!tableIds.includes(t.id)) return false;
      const remainingIds = tableIds.filter((id: string) => id !== t.id);
      if (remainingIds.length === 0) return false;
      const remainingCapacity = remainingIds.reduce((sum: number, id: string) => {
        const tableData = allTables.find((td: any) => td.id === id);
        return sum + ((tableData as any)?.maxCapacity || (tableData as any)?.capacity || 0);
      }, 0);
      return remainingCapacity >= changeGuestsValue;
    });
  }, [selectedReservation, changeGuestsValue, tablesQuery.data]);

  useEffect(() => {
    if (!autoShiftSelected && todayShifts.length > 0 && locationsQuery.data) {
      setAutoShiftSelected(true);
      selectBestShift(todayShifts);
    }
  }, [todayShifts, autoShiftSelected, locationsQuery.data, selectBestShift]);

  const formatDate = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  if (isLoadingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const isLoading = schedulesQuery.isLoading || dayExceptionsQuery.isLoading || templatesQuery.isLoading;

  const shiftColors = [
    ['#10B981', '#059669'],
    ['#F59E0B', '#D97706'],
    ['#3B82F6', '#2563EB'],
    ['#EC4899', '#DB2777'],
    ['#8B5CF6', '#7C3AED'],
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Planning de Hoy',
          headerStyle: { backgroundColor: '#8B5CF6' },
          headerTintColor: '#fff',
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {showShiftSelector ? (
          <View style={styles.shiftSelectorFullScreen}>
            <View style={styles.shiftSelectorHeader}>
              <Calendar size={32} color="#8B5CF6" />
              <Text style={styles.shiftSelectorTitle}>{formatDate()}</Text>
            </View>
            
            {isLoading ? (
              <View style={styles.loadingShiftsCenter}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingShiftsText}>Cargando turnos...</Text>
              </View>
            ) : todayShifts.length === 0 ? (
              <View style={styles.emptyStateCenter}>
                <Calendar size={64} color="#D1D5DB" />
                <Text style={styles.emptyTextBig}>No hay turnos para hoy</Text>
                <Text style={styles.emptySubtext}>{'Configura los turnos en "Horarios"'}</Text>
              </View>
            ) : (
              <View style={styles.shiftsButtonsContainer}>
                <Text style={styles.selectShiftLabel}>Selecciona un turno</Text>
                {todayShifts.map((shift, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.shiftButtonLarge}
                    onPress={() => handleSelectShift(shift)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={shiftColors[index % shiftColors.length] as [string, string]}
                      style={styles.shiftButtonGradientLarge}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.shiftButtonNameLarge}>{shift.templateName}</Text>
                      <Text style={styles.shiftButtonTimeLarge}>{shift.startTime} - {shift.endTime}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.topActionSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shiftButtonsScrollRow}>
                <View style={styles.shiftButtonsInlineRow}>
                  {todayShifts.map((shift, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.shiftSwitchButton,
                        selectedShift?.templateId === shift.templateId && styles.shiftSwitchButtonActive
                      ]}
                      onPress={() => handleSelectShift(shift)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.shiftSwitchText,
                        selectedShift?.templateId === shift.templateId && styles.shiftSwitchTextActive
                      ]}>
                        {shift.templateName}
                      </Text>
                      <Text style={[
                        styles.shiftSwitchTime,
                        selectedShift?.templateId === shift.templateId && styles.shiftSwitchTimeActive
                      ]}>
                        {shift.startTime}–{shift.endTime}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.topActionsRow}>
                <View style={styles.dateNavContainer}>
                  <TouchableOpacity style={styles.dateNavArrow} onPress={() => navigateDay(-1)} activeOpacity={0.7}>
                    <ChevronLeft size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dateNavTodayButton} onPress={goToToday} activeOpacity={0.7}>
                    <Text style={styles.dateNavTodayText}>Hoy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dateNavArrow} onPress={() => navigateDay(1)} activeOpacity={0.7}>
                    <ChevronRight size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                  <View style={styles.dateNavDisplayContainer}>
                    <Text style={styles.dateNavDayOfWeek}>{formatDayOfWeek()}</Text>
                    <Text style={styles.dateNavDisplay}>{formatDisplayDate()}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
                  onPress={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw size={18} color="#fff" style={isRefreshing ? styles.refreshIconSpinning : undefined} />
                  <Text style={styles.refreshButtonText}>
                    {isRefreshing ? 'Actualizando...' : 'Refrescar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.shiftHeader}>
              <Text style={styles.shiftHeaderName}>{selectedShift?.templateName}</Text>
              <Text style={styles.shiftHeaderTime}>{selectedShift?.startTime} - {selectedShift?.endTime}</Text>
            </View>

            <View style={styles.timeSlotsContainer}>
              <Text style={styles.sectionTitle}>Horarios del turno</Text>
              <Text style={styles.sectionHint}>{'Pulsa en "max" para modificar'}</Text>
              <View style={styles.timeSlotsBox}>
                <View style={styles.timeSlotHeaderRow}>
                  <Text style={styles.timeSlotHeaderTime}> </Text>
                  <View style={styles.timeSlotStats}>
                    <Text style={styles.timeSlotColHeader}>Máximos</Text>
                    <Text style={styles.timeSlotColHeader}>Reservas</Text>
                    <Text style={styles.timeSlotColHeader}>Libres</Text>
                  </View>
                </View>
                {timeSlots.map((slot, index) => {
                  const libGuests = Math.max(0, slot.maxGuests - slot.reservedGuests);
                  return (
                  <View key={index} style={styles.timeSlotRow}>
                    <Text style={styles.timeSlotTime}>{slot.time}</Text>
                    <View style={styles.timeSlotStats}>
                      <TouchableOpacity
                        style={styles.timeSlotMaxContainer}
                        onPress={() => handleEditMaxGuests(slot.time, slot.maxGuests)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.timeSlotLabel}>max:</Text>
                        <Text style={styles.timeSlotValue}>{slot.maxGuests}</Text>
                        <Edit2 size={12} color="#8B5CF6" />
                      </TouchableOpacity>
                      <View style={[
                        styles.timeSlotResContainer,
                        slot.reservedGuests > 0 && styles.timeSlotResActive,
                        slot.reservedGuests >= slot.maxGuests && styles.timeSlotResFull
                      ]}>
                        <Text style={styles.timeSlotLabel}>res:</Text>
                        <Text style={[
                          styles.timeSlotResValue,
                          slot.reservedGuests > 0 && styles.timeSlotResValueActive,
                          slot.reservedGuests >= slot.maxGuests && styles.timeSlotResValueFull
                        ]}>
                          {slot.reservedGuests}
                        </Text>
                      </View>
                      <View style={[
                        styles.timeSlotLibContainer,
                        libGuests === 0 && styles.timeSlotLibFull
                      ]}>
                        <Text style={styles.timeSlotLabel}>lib:</Text>
                        <Text style={[
                          styles.timeSlotLibValue,
                          libGuests > 0 && styles.timeSlotLibValueAvail,
                          libGuests === 0 && styles.timeSlotLibValueFull
                        ]}>
                          {libGuests}
                        </Text>
                      </View>
                    </View>
                  </View>
                  );
                })}
                {timeSlots.length > 0 && (
                  <View style={styles.timeSlotTotalsRow}>
                    <Text style={styles.timeSlotTotalsLabel}>TOTAL</Text>
                    <View style={styles.timeSlotStats}>
                      <View style={styles.timeSlotTotalMaxContainer}>
                        <Text style={styles.timeSlotTotalsTag}>max:</Text>
                        <Text style={styles.timeSlotTotalsValue}>
                          {timeSlots.reduce((sum, s) => sum + s.maxGuests, 0)}
                        </Text>
                      </View>
                      <View style={styles.timeSlotTotalResContainer}>
                        <Text style={styles.timeSlotTotalsTag}>res:</Text>
                        <Text style={styles.timeSlotTotalsResValue}>
                          {timeSlots.reduce((sum, s) => sum + s.reservedGuests, 0)}
                        </Text>
                      </View>
                      <View style={styles.timeSlotTotalLibContainer}>
                        <Text style={styles.timeSlotTotalsTag}>lib:</Text>
                        <Text style={styles.timeSlotTotalsLibValue}>
                          {timeSlots.reduce((sum, s) => sum + Math.max(0, s.maxGuests - s.reservedGuests), 0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.locationsContainer}>
              <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Ubicaciones</Text>
              <View style={styles.locationsRowWithWaitlist}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  <View style={styles.locationButtonsRow}>
                    {locationsQuery.data?.map((location: any) => (
                      <TouchableOpacity
                        key={location.id}
                        style={[
                          styles.locationButton,
                          selectedLocation === location.id && styles.locationButtonActive
                        ]}
                        onPress={() => setSelectedLocation(location.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.locationButtonText,
                          selectedLocation === location.id && styles.locationButtonTextActive
                        ]}>
                          {location.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TouchableOpacity
                  style={styles.waitlistHeaderButton}
                  onPress={() => setShowWaitlistModal(true)}
                  activeOpacity={0.8}
                >
                  <ListChecks size={15} color="#fff" />
                  <Text style={styles.waitlistHeaderButtonText}>Lista de espera</Text>
                  {waitlistEntries.length > 0 && (
                    <View style={styles.waitlistHeaderBadge}>
                      <Text style={styles.waitlistHeaderBadgeText}>{waitlistEntries.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tablesContainer}>
              <Text style={styles.sectionTitle}>Plano de mesas</Text>
              <View style={styles.tablesGrid}>
                {locationTables.map((table: TableInfo) => {
                  const cardColor = getTableCardColor(table);
                  const activeReservations = (table.reservations || []).filter((r: any) => r.status !== 'cancelled' && r.status !== 'modified');
                  const hasAnyVip = activeReservations.some((r: any) => r.isVip);
                  const isSingleInProgress = activeReservations.length === 1 && (
                    !isWalkInReservation(activeReservations[0]) && (
                      activeReservations[0]?.status === 'in_progress' ||
                      activeReservations[0]?.status === 'in_progress_added' ||
                      isAddedReservationInProgress(activeReservations[0])
                    )
                  );
                  return (
                  <TouchableOpacity
                    key={table.id}
                    style={[
                      styles.tableCard,
                      { backgroundColor: cardColor.bg, borderWidth: (table.isReserved || table.isBlocked || !!table.availableFromTime) ? 2 : 0, borderColor: cardColor.border },
                    ]}
                    onPress={() => handleTablePress(table)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tableHeader}>
                      <Text style={[
                        styles.tableName,
                        table.isReserved && styles.tableNameReserved,
                        table.isBlocked && styles.tableNameBlocked,
                        isSingleInProgress && { color: '#FFFFFF' }
                      ]}>
                        {table.name}
                      </Text>
                      {activeReservations.length >= 1 && activeReservations[0].clientName && (
                        <Text
                          style={[
                            styles.tableClientName,
                            isSingleInProgress && { color: 'rgba(255,255,255,0.85)' },
                          ]}
                          numberOfLines={1}
                        >
                          {activeReservations[0].clientName}
                        </Text>
                      )}
                      {activeReservations.length > 1 && (
                        <View style={styles.multiResBadge}>
                          <Text style={styles.multiResBadgeText}>{activeReservations.length}</Text>
                        </View>
                      )}
                      {hasAnyVip && (
                        <View style={styles.vipCrownIndicator}>
                          <Crown size={16} color="#EC4899" />
                        </View>
                      )}
                      {table.isBlocked && (
                        <View style={styles.blockedIndicator}>
                          <Lock size={14} color="#DC2626" />
                        </View>
                      )}
                    </View>
                    {(table as any).groupedTableNames && (table as any).groupedTableNames.length > 0 && (
                      <View style={styles.groupedNamesContainer}>
                        {(table as any).groupedTableNames.map((gName: string, gIdx: number) => (
                          <View key={gIdx} style={styles.groupedNameRow}>
                            <Link2 size={11} color={isSingleInProgress ? '#FFFFFF' : '#6B7280'} />
                            <Text style={[styles.groupedNameText, isSingleInProgress && styles.groupedNameTextInProgress]}>{gName}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {table.isReserved && activeReservations.length > 0 && (
                      <View style={styles.tableReservationsContainer}>
                        {activeReservations.map((res: any, idx: number) => {
                          const statusColor = getReservationStatusColor(res);
                          const isWalkIn = isWalkInReservation(res);
                          const isInProgress = !isWalkIn && (res.status === 'in_progress' || res.status === 'in_progress_added' || isAddedReservationInProgress(res));
                          const textColor = isInProgress ? '#FFFFFF' : statusColor.textColor;
                          const adultsCount = res.highChairCount && res.highChairCount > 0 ? res.guests - res.highChairCount : res.guests;
                          return (
                            <TouchableOpacity
                              key={res.id}
                              style={[
                                styles.tableResEntry,
                                { backgroundColor: statusColor.bg, borderLeftColor: statusColor.border },
                                idx > 0 && { marginTop: 6 },
                              ]}
                              onPress={() => {
                                setSelectedReservation(res);
                                setShowReservationModal(true);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.tableResTime, { color: textColor }]}>
                                {String(res.time.hour).padStart(2, '0')}:{String(res.time.minute).padStart(2, '0')}
                              </Text>
                              <Text style={[styles.tableResPax, { color: textColor }]}>
                                {res.guests} pax
                              </Text>
                              <Text style={[styles.tableResDetail, { color: textColor }]}>
                                {adultsCount} adulto{adultsCount !== 1 ? 's' : ''}
                              </Text>
                              {res.highChairCount > 0 && (
                                <Text style={[styles.tableResHighChair, { color: isInProgress ? '#FFFFFF' : '#D97706' }]}>
                                  {res.highChairCount} trona{res.highChairCount !== 1 ? 's' : ''}
                                </Text>
                              )}
                              <View style={[styles.tableResStatusBadge, { backgroundColor: isInProgress ? 'rgba(255,255,255,0.2)' : `${statusColor.border}20` }]}>
                                <Text style={[styles.tableResStatusText, { color: textColor }]}>
                                  {statusColor.label}
                                </Text>
                              </View>
                              {clientOverlapsData?.[res.id] && (
                                <View style={styles.tableResOverlapWarning}>
                                  <AlertTriangle size={12} color="#DC2626" />
                                  <Text style={styles.tableResOverlapWarningText} numberOfLines={2}>
                                    {clientOverlapsData[res.id].hasSameRestaurant && clientOverlapsData[res.id].hasDifferentRestaurant
                                      ? '⚠️ Doble reserva (mismo y otro rest.)'
                                      : clientOverlapsData[res.id].hasSameRestaurant
                                      ? '⚠️ Otra reserva en este restaurante'
                                      : '⚠️ Reserva en otro restaurante'}
                                  </Text>
                                </View>
                              )}
                              {res.internalNotes ? (
                                <View style={styles.tableResInternalNote}>
                                  <AlertTriangle size={13} color={isInProgress ? 'rgba(255,200,150,0.95)' : '#C2410C'} />
                                  <Text
                                    style={[styles.tableResInternalNoteText, { color: isInProgress ? 'rgba(255,200,150,0.95)' : '#C2410C' }]}
                                    numberOfLines={3}
                                  >
                                    {res.internalNotes}
                                  </Text>
                                </View>
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {table.isBlocked && !table.isReserved && (
                      <View style={styles.tableBlockedInfo}>
                        <Text style={styles.tableBlockedLabel}>BLOQUEADA</Text>
                        <Text style={styles.tableBlockedHint}>Pulsa para desbloquear</Text>
                      </View>
                    )}
                    
                    {!table.isReserved && !table.isBlocked && (
                      <View style={styles.tableFreeLabel}>
                        {table.availableFromTime ? (
                          <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Clock size={11} color="#D97706" />
                              <Text style={[styles.tableFreeLabelText, { color: '#D97706', fontSize: 10 }]}>Libre a partir de</Text>
                            </View>
                            <Text style={{ fontSize: 17, fontWeight: '700' as const, color: '#B45309', marginTop: 1 }}>{table.availableFromTime}</Text>
                            <Text style={[styles.tableFreeHint, { color: '#D97706' }]}>Ocupada hasta esa hora</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.tableFreeLabelText}>LIBRE</Text>
                            <Text style={styles.tableFreeHint}>Pulsa para opciones</Text>
                          </>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                  );
                })}
              </View>

              {locationTables.length === 0 && (
                <View style={styles.emptyTablesState}>
                  <Text style={styles.emptyTablesText}>No hay mesas en esta ubicación</Text>
                </View>
              )}
            </View>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#E5E7EB' }]} />
                <Text style={styles.legendText}>Libre</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#D1FAE5', borderWidth: 2, borderColor: '#10B981' }]} />
                <Text style={styles.legendText}>Confirmada</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#059669' }]} />
                <Text style={styles.legendText}>En Curso</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FDF2F8', borderWidth: 2, borderColor: '#EC4899' }]} />
                <Text style={styles.legendText}>Valorable</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#F3E8EF', borderWidth: 2, borderColor: '#C9A0B4' }]} />
                <Text style={styles.legendText}>Finalizada</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FEE2E2', borderWidth: 2, borderColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Bloqueada</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Modal para editar máximo de comensales */}
        <Modal
          visible={editingSlot !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingSlot(null)}
        >
          <View style={styles.editModalOverlay}>
            <View style={styles.editModalContent}>
              <Text style={styles.editModalTitle}>Modificar máximo</Text>
              <Text style={styles.editModalSubtitle}>Turno {editingSlot}</Text>
              <TextInput
                style={styles.editModalInput}
                value={editMaxGuests}
                onChangeText={setEditMaxGuests}
                keyboardType="number-pad"
                placeholder="Máximo comensales"
                autoFocus
              />
              <View style={styles.editModalButtons}>
                <TouchableOpacity 
                  style={styles.editModalCancelButton}
                  onPress={() => setEditingSlot(null)}
                >
                  <Text style={styles.editModalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.editModalSaveButton}
                  onPress={handleSaveMaxGuests}
                >
                  <Check size={18} color="#fff" />
                  <Text style={styles.editModalSaveText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de detalles de reserva */}
        <Modal
          visible={showReservationModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReservationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalles de la Reserva</Text>
                <TouchableOpacity onPress={() => setShowReservationModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {selectedReservation && (
                <ScrollView style={styles.modalScroll}>
                  {clientOverlapsData?.[selectedReservation.id] && (
                    <View style={styles.overlapWarningCard}>
                      <View style={styles.overlapWarningHeader}>
                        <AlertTriangle size={20} color="#DC2626" />
                        <Text style={styles.overlapWarningTitle}>⚠️ RESERVAS SOLAPADAS</Text>
                      </View>
                      <Text style={styles.overlapWarningSubtitle}>
                        {clientOverlapsData[selectedReservation.id].hasSameRestaurant && clientOverlapsData[selectedReservation.id].hasDifferentRestaurant
                          ? 'Este cliente tiene reservas simultáneas en ESTE y en OTRO restaurante'
                          : clientOverlapsData[selectedReservation.id].hasSameRestaurant
                          ? 'Este cliente tiene otra reserva en ESTE restaurante al mismo tiempo'
                          : 'Este cliente tiene una reserva en OTRO restaurante al mismo tiempo'}
                      </Text>
                      {clientOverlapsData[selectedReservation.id].details.map((detail, idx) => (
                        <Text key={idx} style={styles.overlapWarningDetail}>• {detail}</Text>
                      ))}
                    {selectedReservation.clientId && (() => {
                      const isAlreadyBlocked = locallyBlockedClientIds.has(selectedReservation.clientId);
                      return (
                        <TouchableOpacity
                          style={[styles.overlapBlockButton, isAlreadyBlocked && styles.overlapUnblockButton]}
                          activeOpacity={0.8}
                          disabled={blockUserFromPlanningMutation.isPending}
                          onPress={() => {
                            const clientName = selectedReservation.clientName || 'este usuario';
                            const newIsUnwanted = !isAlreadyBlocked;
                            const doToggle = () => {
                              blockUserFromPlanningMutation.mutate({
                                restaurantId: restaurantId || '',
                                clientId: selectedReservation.clientId,
                                isUnwanted: newIsUnwanted,
                              });
                            };
                            if (Platform.OS === 'web') {
                              const msg = newIsUnwanted
                                ? `¿Bloquear a ${clientName}? No podrá hacer reservas en este restaurante.`
                                : `¿Desbloquear a ${clientName}? Podrá volver a hacer reservas en este restaurante.`;
                              if (window.confirm(msg)) doToggle();
                            } else {
                              Alert.alert(
                                newIsUnwanted ? 'Bloquear usuario' : 'Desbloquear usuario',
                                newIsUnwanted
                                  ? `¿Bloquear a ${clientName}? No podrá hacer reservas en este restaurante.`
                                  : `¿Desbloquear a ${clientName}? Podrá volver a hacer reservas en este restaurante.`,
                                [
                                  { text: 'Cancelar', style: 'cancel' },
                                  { text: newIsUnwanted ? 'Bloquear' : 'Desbloquear', style: newIsUnwanted ? 'destructive' : 'default', onPress: doToggle },
                                ]
                              );
                            }
                          }}
                        >
                          {isAlreadyBlocked ? <Unlock size={14} color="#fff" /> : <Lock size={14} color="#fff" />}
                          <Text style={styles.overlapBlockButtonText}>
                            {blockUserFromPlanningMutation.isPending
                              ? (isAlreadyBlocked ? 'Desbloqueando...' : 'Bloqueando...')
                              : (isAlreadyBlocked ? 'Desbloquear usuario' : 'Bloquear usuario')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })()}
                    </View>
                  )}

                  <View style={styles.reservationDetailCard}>
                    <Text style={styles.reservationClientName}>{selectedReservation.clientName}</Text>
                    <Text style={styles.reservationPhone}>{selectedReservation.clientPhone}</Text>
                    <Text style={styles.reservationId}>Nº {selectedReservation.id.slice(-8).toUpperCase()}</Text>
                    {(() => {
                      const rawIds = selectedReservation.tableIds;
                      const tIds: string[] = Array.isArray(rawIds) ? rawIds : (typeof rawIds === 'string' ? JSON.parse(rawIds) : []);
                      const names = (tablesQuery.data as any[])?.filter((t: any) => tIds.includes(t.id)).map((t: any) => t.name) || [];
                      return names.length > 0 ? (
                        <Text style={styles.reservationTableNameBadge}>🪑 {names.join(' + ')}</Text>
                      ) : null;
                    })()}
                  </View>

                  <View style={styles.reservationInfoGrid}>
                    <TouchableOpacity
                      style={[styles.reservationInfoItem, styles.reservationInfoItemClickable]}
                      onPress={handleOpenChangeTime}
                      activeOpacity={0.7}
                    >
                      <Clock size={18} color="#8B5CF6" />
                      <Text style={styles.reservationInfoText}>
                        {String(selectedReservation.time.hour).padStart(2, '0')}:{String(selectedReservation.time.minute).padStart(2, '0')}
                      </Text>
                      <Edit2 size={12} color="#8B5CF6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.reservationInfoItem, styles.reservationInfoItemClickable]}
                      onPress={handleOpenChangeGuests}
                      activeOpacity={0.7}
                    >
                      <Users size={18} color="#8B5CF6" />
                      <Text style={styles.reservationInfoText}>
                        {selectedReservation.highChairCount > 0
                          ? `${selectedReservation.guests - selectedReservation.highChairCount} adultos + ${selectedReservation.highChairCount} trona${selectedReservation.highChairCount !== 1 ? 's' : ''}`
                          : `${selectedReservation.guests} comensales`}
                      </Text>
                      <Edit2 size={12} color="#8B5CF6" />
                    </TouchableOpacity>

                    {selectedReservation.highChairCount > 0 && (
                      <View style={styles.reservationInfoItem}>
                        <Baby size={18} color="#F59E0B" />
                        <Text style={styles.reservationInfoText}>
                          {selectedReservation.highChairCount} trona{selectedReservation.highChairCount !== 1 ? 's' : ''} solicitada{selectedReservation.highChairCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}

                    {selectedReservation.needsStroller && (
                      <View style={styles.reservationInfoItem}>
                        <ShoppingCart size={18} color="#10B981" />
                        <Text style={styles.reservationInfoText}>Carrito de bebé</Text>
                      </View>
                    )}

                    {selectedReservation.hasPets && (
                      <View style={styles.reservationInfoItem}>
                        <Dog size={18} color="#EC4899" />
                        <Text style={styles.reservationInfoText}>Con mascota</Text>
                      </View>
                    )}
                  </View>

                  {selectedReservation.clientNotes && (
                    <View style={styles.clientNotesContainer}>
                      <Text style={styles.clientNotesLabel}>💬 Comentario del cliente:</Text>
                      <Text style={styles.clientNotesText}>{selectedReservation.clientNotes}</Text>
                    </View>
                  )}

                  <View style={styles.internalNotesContainer}>
                    <View style={styles.internalNotesHeader}>
                      <StickyNote size={14} color="#64748B" />
                      <Text style={styles.internalNotesLabel}>Nota interna</Text>
                      <TouchableOpacity
                        style={styles.internalNotesEditBtn}
                        onPress={() => {
                          setInternalNoteValue(selectedReservation.internalNotes || '');
                          setShowInternalNoteModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Edit2 size={13} color="#3B82F6" />
                        <Text style={styles.internalNotesEditBtnText}>Editar</Text>
                      </TouchableOpacity>
                    </View>
                    {selectedReservation.internalNotes ? (
                      <Text style={styles.internalNotesText}>{selectedReservation.internalNotes}</Text>
                    ) : (
                      <Text style={styles.internalNotesPlaceholder}>Sin nota. Toca "Editar" para añadir.</Text>
                    )}
                  </View>

                    {selectedReservation.notes && !isWalkInReservation(selectedReservation) && selectedReservation.notes !== 'Reserva modificada por el restaurante' && selectedReservation.notes !== 'Reserva modificada (notificado)' && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Notas:</Text>
                      <Text style={styles.notesText}>{selectedReservation.notes}</Text>
                    </View>
                  )}
                  {isWalkInReservation(selectedReservation) && (
                    <View style={styles.walkInBadge}>
                      <Text style={styles.walkInBadgeText}>👤 Reserva sin cita previa</Text>
                    </View>
                  )}

                  {(selectedReservation.notes === 'Reserva modificada por el restaurante' || selectedReservation.notes === 'Reserva modificada (notificado)') && (
                    <View style={styles.modifiedByRestaurantContainer}>
                      <View style={styles.modifiedByRestaurantLeft}>
                        <Edit2 size={13} color="#92400E" />
                        <Text style={styles.modifiedByRestaurantText}>Reserva modificada por el restaurante</Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.sendNotifButton,
                          (selectedReservation.notes === 'Reserva modificada (notificado)' || sendModificationNotificationMutation.isPending) && styles.sendNotifButtonSent,
                        ]}
                        onPress={() => {
                          if (selectedReservation.notes === 'Reserva modificada (notificado)' || sendModificationNotificationMutation.isPending) return;
                          sendModificationNotificationMutation.mutate({ reservationId: selectedReservation.id });
                        }}
                        disabled={selectedReservation.notes === 'Reserva modificada (notificado)' || sendModificationNotificationMutation.isPending}
                        activeOpacity={0.7}
                      >
                        <MessageCircle size={13} color="#fff" />
                        <Text style={styles.sendNotifButtonText}>
                          {selectedReservation.notes === 'Reserva modificada (notificado)'
                            ? 'Enviada'
                            : sendModificationNotificationMutation.isPending
                            ? '...'
                            : 'Notificar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.statusBadgeContainer}>
                    {(() => {
                      const sc = getReservationStatusColor(selectedReservation);
                      const isInProg = selectedReservation.status === 'in_progress' || selectedReservation.status === 'in_progress_added' || (selectedReservation.status === 'añadida' && isAddedReservationInProgress(selectedReservation));
                      return (
                        <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderWidth: 1.5, borderColor: sc.border }]}>
                          <Text style={[styles.statusBadgeText, { color: isInProg ? '#fff' : sc.textColor }]}>
                            {sc.label}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  {!isWalkInReservation(selectedReservation) && (
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleCallClient(selectedReservation.clientPhone)}
                      >
                        <Phone size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Llamar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.actionButtonWhatsapp]}
                        onPress={() => handleWhatsAppClient(selectedReservation.clientPhone)}
                      >
                        <MessageCircle size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.editReservationButton}
                    onPress={() => handleEditReservation(selectedReservation)}
                  >
                    <Edit2 size={18} color="#fff" />
                    <Text style={styles.editReservationButtonText}>Editar Reserva / Cambiar Mesa</Text>
                  </TouchableOpacity>


                  {canAddAnotherReservationToSelectedTable && addReservationMinTime !== '' && (() => {
                    const rawIds = selectedReservation!.tableIds;
                    const tIds: string[] = Array.isArray(rawIds) ? rawIds : (typeof rawIds === 'string' ? JSON.parse(rawIds) : []);
                    const slugOrId = restaurantSlug || restaurantId;
                    const shiftParams = selectedShift ? `&shiftTemplateId=${selectedShift.templateId}&shiftDate=${today}` : '';
                    return (
                      <TouchableOpacity
                        style={styles.addResToTableButton}
                        onPress={() => {
                          setShowReservationModal(false);
                          router.push(`/client/restaurant3/${slugOrId}?tableId=${tIds[0]}&locationId=${selectedReservation!.locationId}${shiftParams}&minTime=${addReservationMinTime}` as any);
                        }}
                      >
                        <Plus size={18} color="#fff" />
                        <Text style={styles.addResToTableButtonText}>Añadir Reserva (desde {addReservationMinTime})</Text>
                      </TouchableOpacity>
                    );
                  })()}

                  {selectedReservation.status !== 'cancelled' && selectedReservation.status !== 'modified' && selectedReservation.status !== 'completed' && (
                    <TouchableOpacity 
                      style={styles.cancelReservationButton}
                      onPress={() => handleCancelReservation(selectedReservation.id)}
                      disabled={cancelReservationMutation.isPending}
                    >
                      <AlertTriangle size={18} color="#fff" />
                      <Text style={styles.cancelReservationButtonText}>
                        {cancelReservationMutation.isPending ? 'Anulando...' : 'Anular Reserva'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {selectedReservation.isVip && selectedReservation.isVipTable && (
                    <View style={styles.vipFavoriteNote}>
                      <Star size={16} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.vipFavoriteNoteText}>Esta es la mesa favorita del cliente VIP</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal nota interna */}
        <Modal
          visible={showInternalNoteModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowInternalNoteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '60%' }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StickyNote size={20} color="#64748B" />
                  <Text style={styles.modalTitle}>Nota interna</Text>
                </View>
                <TouchableOpacity onPress={() => setShowInternalNoteModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12, paddingHorizontal: 20 }}>
                Solo visible para el restaurante. El cliente no puede verla.
              </Text>
              <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                <TextInput
                  style={{
                    borderWidth: 1.5,
                    borderColor: '#CBD5E1',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 15,
                    color: '#1E293B',
                    minHeight: 120,
                    textAlignVertical: 'top',
                    backgroundColor: '#F8FAFC',
                    marginBottom: 16,
                  }}
                  multiline
                  value={internalNoteValue}
                  onChangeText={setInternalNoteValue}
                  placeholder="Escribe aquí la nota interna..."
                  placeholderTextColor="#94A3B8"
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.cancelReservationButton, { flex: 1, backgroundColor: '#E2E8F0', marginTop: 0 }]}
                    onPress={() => setShowInternalNoteModal(false)}
                  >
                    <Text style={[styles.cancelReservationButtonText, { color: '#64748B' }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editReservationButton, { flex: 1, marginTop: 0 }]}
                    onPress={() => {
                      if (!selectedReservation) return;
                      updateInternalNotesMutation.mutate({
                        reservationId: selectedReservation.id,
                        internalNotes: internalNoteValue,
                      });
                    }}
                    disabled={updateInternalNotesMutation.isPending}
                  >
                    <Check size={18} color="#fff" />
                    <Text style={styles.editReservationButtonText}>
                      {updateInternalNotesMutation.isPending ? 'Guardando...' : 'Guardar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para mesas libres */}
        <Modal
          visible={showFreeTableModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFreeTableModal(false)}
        >
          <View style={styles.freeTableModalOverlay}>
            <View style={styles.freeTableModalContent}>
              <View style={styles.freeTableModalHeader}>
                <Text style={styles.freeTableModalTitle}>{selectedFreeTable?.name}</Text>
                <TouchableOpacity onPress={() => setShowFreeTableModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.freeTableModalSubtitle}>¿Qué deseas hacer con esta mesa?</Text>
              
              <View style={styles.freeTableModalButtons}>
                <TouchableOpacity 
                  style={styles.freeTableBlockButton}
                  onPress={() => selectedFreeTable && handleBlockTable(selectedFreeTable)}
                >
                  <Lock size={20} color="#fff" />
                  <Text style={styles.freeTableButtonText}>Bloquear Mesa</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.freeTableAddButton}
                  onPress={() => selectedFreeTable && handleAddReservationToTable(selectedFreeTable)}
                >
                  <Plus size={20} color="#fff" />
                  <Text style={styles.freeTableButtonText}>Añadir Reserva</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.freeTableSecondaryButtons}>
                <TouchableOpacity 
                  style={styles.freeTableDivideButton}
                  onPress={() => {
                    if (selectedFreeTable) {
                      setShowFreeTableModal(false);
                      handleOpenSplitModal(selectedFreeTable);
                    }
                  }}
                >
                  <Scissors size={18} color="#fff" />
                  <Text style={styles.freeTableSecondaryButtonText}>Dividir</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.freeTableGroupButton}
                  onPress={() => {
                    if (selectedFreeTable) {
                      setShowFreeTableModal(false);
                      handleOpenGroupModal(selectedFreeTable);
                    }
                  }}
                >
                  <Link2 size={18} color="#fff" />
                  <Text style={styles.freeTableSecondaryButtonText}>Agrupar</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={[styles.freeTableSecondaryButtons, { marginTop: 6, backgroundColor: '#F0FDF4', borderRadius: 10, paddingVertical: 10 }]}
                onPress={() => {
                  if (selectedFreeTable) {
                    const tableData = (tablesQuery.data as any[])?.find((t: any) => t.id === selectedFreeTable.id);
                    setTempCapacityTable(selectedFreeTable);
                    setTempMinCapacity(String(selectedFreeTable.minCapacity || tableData?.minCapacity || 1));
                    setTempMaxCapacity(String(selectedFreeTable.maxCapacity || selectedFreeTable.capacity || tableData?.maxCapacity || 4));
                    setShowFreeTableModal(false);
                    setShowTempCapacityModal(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Users size={16} color="#16A34A" />
                <Text style={[styles.freeTableSecondaryButtonText, { color: '#16A34A' }]}>Cambiar capacidad</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.freeTableCancelButton}
                onPress={() => setShowFreeTableModal(false)}
              >
                <Text style={styles.freeTableCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal para cambiar capacidad temporal de mesa */}
        <Modal
          visible={showTempCapacityModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTempCapacityModal(false)}
        >
          <View style={styles.freeTableModalOverlay}>
            <View style={styles.freeTableModalContent}>
              <View style={styles.freeTableModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Users size={18} color="#16A34A" />
                  <Text style={styles.freeTableModalTitle}>Cambiar capacidad</Text>
                </View>
                <TouchableOpacity onPress={() => setShowTempCapacityModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 14, paddingHorizontal: 2 }}>
                Mesa: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{tempCapacityTable?.name}</Text>{' '}
                — Turno actual: <Text style={{ fontWeight: '600', color: '#1E293B' }}>{selectedShift?.templateName}</Text>
              </Text>
              <Text style={{ fontSize: 12, color: '#F59E0B', marginBottom: 14, fontStyle: 'italic' }}>
                ⚠️ Cambio temporal para este turno. Recuerda restaurar los valores originales cuando el turno termine.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Mín. comensales</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 16, color: '#1E293B', backgroundColor: '#F8FAFC' }}
                    value={tempMinCapacity}
                    onChangeText={setTempMinCapacity}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Máx. comensales</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 16, color: '#1E293B', backgroundColor: '#F8FAFC' }}
                    value={tempMaxCapacity}
                    onChangeText={setTempMaxCapacity}
                    keyboardType="number-pad"
                    placeholder="4"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}
                  onPress={() => setShowTempCapacityModal(false)}
                >
                  <Text style={{ color: '#64748B', fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#16A34A', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                  onPress={() => {
                    if (!tempCapacityTable) return;
                    const newMin = parseInt(tempMinCapacity) || 1;
                    const newMax = parseInt(tempMaxCapacity) || 2;
                    if (newMax < newMin) {
                      Alert.alert('Error', 'La capacidad máxima debe ser mayor o igual a la mínima');
                      return;
                    }
                    const tableData = (tablesQuery.data as any[])?.find((t: any) => t.id === tempCapacityTable.id);
                    updateTableCapacityMutation.mutate({
                      id: tempCapacityTable.id,
                      name: tableData?.name || tempCapacityTable.name,
                      minCapacity: newMin,
                      maxCapacity: newMax,
                      allowsHighChairs: Boolean(tableData?.allowsHighChairs),
                      allowsStrollers: Boolean(tableData?.allowsStrollers || tableData?.allowsStroller),
                      allowsPets: Boolean(tableData?.allowsPets),
                      priority: tableData?.priority || 5,
                    });
                  }}
                  disabled={updateTableCapacityMutation.isPending}
                >
                  {updateTableCapacityMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Check size={18} color="#fff" />
                  )}
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Guardar capacidad</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para bloquear mesa / reserva walk-in */}
        <Modal
          visible={showBlockModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBlockModal(false)}
        >
          <View style={styles.blockModalOverlay}>
            <View style={styles.blockModalContent}>
              <View style={styles.blockModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Lock size={20} color="#EF4444" />
                  <Text style={styles.blockModalTitle}>Bloquear / Sin cita</Text>
                </View>
                <TouchableOpacity onPress={() => setShowBlockModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {selectedFreeTable && (
                <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.blockModalBody}>
                    <View style={styles.blockTableInfo}>
                      <MapPin size={20} color="#8B5CF6" />
                      <Text style={styles.blockTableName}>{selectedFreeTable.name}</Text>
                      <Text style={styles.blockTableCapacityLabel}>
                        {selectedFreeTable.minCapacity || 1}–{selectedFreeTable.maxCapacity || selectedFreeTable.capacity || 4} pax
                      </Text>
                    </View>

                    {/* Walk-in section */}
                    <View style={styles.walkInSection}>
                      <Text style={styles.walkInSectionTitle}>Reserva rápida sin cita</Text>
                      <Text style={styles.walkInSectionNote}>Selecciona un horario para crear una reserva. Nombre y teléfono son opcionales.</Text>

                      {/* Name */}
                      <Text style={styles.blockSectionTitle}>Nombre del cliente (opcional)</Text>
                      <TextInput
                        style={styles.walkInInput}
                        value={blockWalkInName}
                        onChangeText={setBlockWalkInName}
                        placeholder="Sin nombre"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="words"
                      />

                      {/* Phone */}
                      <Text style={styles.blockSectionTitle}>Teléfono (opcional)</Text>
                      <View style={styles.walkInPhoneRow}>
                        <TouchableOpacity
                          style={styles.walkInPrefixBtn}
                          onPress={() => setShowBlockPrefixModal(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.walkInPrefixText}>{blockWalkInPhonePrefix}</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={styles.walkInPhoneInput}
                          value={blockWalkInPhone}
                          onChangeText={setBlockWalkInPhone}
                          placeholder="600000000"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="phone-pad"
                        />
                      </View>

                      {/* Guests */}
                      <Text style={styles.blockSectionTitle}>Comensales</Text>
                      <View style={styles.walkInGuestsRow}>
                        <TouchableOpacity
                          style={styles.walkInGuestsBtn}
                          onPress={() => setBlockWalkInGuests(Math.max(0, blockWalkInGuests - 1))}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.walkInGuestsBtnText}>−</Text>
                        </TouchableOpacity>
                        <View style={styles.walkInGuestsDisplay}>
                          <Users size={18} color="#8B5CF6" />
                          <Text style={styles.walkInGuestsCount}>{blockWalkInGuests}</Text>
                          <Text style={styles.walkInGuestsPax}>pax</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.walkInGuestsBtn}
                          onPress={() => setBlockWalkInGuests(blockWalkInGuests + 1)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.walkInGuestsBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Extra tables when capacity exceeded */}
                      {selectedFreeTable && blockWalkInGuests > 0 && blockWalkInGuests > (selectedFreeTable.maxCapacity || selectedFreeTable.capacity || 4) && (
                        <View style={styles.walkInExtraTablesSection}>
                          <View style={styles.walkInExtraTablesAlert}>
                            <AlertTriangle size={14} color="#D97706" />
                            <Text style={styles.walkInExtraTablesAlertText}>
                              Capacidad máx: {selectedFreeTable.maxCapacity || selectedFreeTable.capacity || 4} pax. Añade mesas para acomodar {blockWalkInGuests} comensales.
                            </Text>
                          </View>
                          {locationTables.filter((t: TableInfo) =>
                            t.id !== selectedFreeTable.id &&
                            !t.isReserved &&
                            !t.isBlocked &&
                            !t.availableFromTime
                          ).map((t: TableInfo) => (
                            <TouchableOpacity
                              key={t.id}
                              style={[
                                styles.walkInExtraTableOption,
                                blockWalkInExtraTables.includes(t.id) && styles.walkInExtraTableOptionSelected,
                              ]}
                              onPress={() => {
                                setBlockWalkInExtraTables(prev =>
                                  prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                );
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.walkInExtraTableName,
                                blockWalkInExtraTables.includes(t.id) && styles.walkInExtraTableNameSelected,
                              ]}>
                                {t.name}
                              </Text>
                              <Text style={styles.walkInExtraTableCap}>
                                {t.minCapacity || 1}–{t.maxCapacity || t.capacity} pax
                              </Text>
                              {blockWalkInExtraTables.includes(t.id) && (
                                <View style={styles.walkInExtraTableCheck}>
                                  <Check size={13} color="#fff" />
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Time slot selection */}
                      <Text style={styles.blockSectionTitle}>Horario del turno</Text>
                      {timeSlots.length === 0 ? (
                        <Text style={styles.walkInNoSlotsText}>No hay horarios disponibles en este turno</Text>
                      ) : (
                        <View style={styles.walkInTimeSlotsGrid}>
                          {timeSlots.map((slot) => {
                            const willExceed = (slot.reservedGuests + blockWalkInGuests) > slot.maxGuests;
                            const isSelected = blockSelectedTimeSlot === slot.time;
                            const overBy = willExceed ? (slot.reservedGuests + blockWalkInGuests) - slot.maxGuests : 0;
                            return (
                              <TouchableOpacity
                                key={slot.time}
                                style={[
                                  styles.walkInTimeSlot,
                                  willExceed && styles.walkInTimeSlotOverCapacity,
                                  isSelected && styles.walkInTimeSlotSelected,
                                ]}
                                onPress={() => setBlockSelectedTimeSlot(isSelected ? '' : slot.time)}
                                activeOpacity={0.7}
                              >
                                <Text style={[
                                  styles.walkInTimeSlotText,
                                  willExceed && styles.walkInTimeSlotTextOver,
                                  isSelected && styles.walkInTimeSlotTextSelected,
                                ]}>
                                  {slot.time}
                                </Text>
                                <Text style={[
                                  styles.walkInTimeSlotCapacity,
                                  willExceed && styles.walkInTimeSlotCapacityOver,
                                  isSelected && styles.walkInTimeSlotCapacitySelected,
                                ]}>
                                  {slot.reservedGuests}/{slot.maxGuests}
                                  {willExceed ? ` +${overBy}` : ''}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>

                    {/* Duration */}
                    <Text style={styles.blockSectionTitle}>
                      {blockSelectedTimeSlot ? 'Tiempo de rotación (min) desde horario seleccionado' : 'Duración del bloqueo (minutos)'}
                    </Text>
                    <TextInput
                      style={styles.blockDurationInput}
                      value={blockDuration}
                      onChangeText={setBlockDuration}
                      placeholder="120"
                      keyboardType="number-pad"
                      placeholderTextColor="#9CA3AF"
                    />

                    <View style={styles.blockModalButtons}>
                      <TouchableOpacity
                        style={styles.blockModalCancelButton}
                        onPress={() => {
                          setShowBlockModal(false);
                          setBlockDuration('120');
                          setBlockWalkInName('');
                          setBlockWalkInPhone('');
                          setBlockWalkInGuests(2);
                          setBlockSelectedTimeSlot('');
                          setBlockWalkInExtraTables([]);
                        }}
                      >
                        <Text style={styles.blockModalCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.blockModalConfirmButton,
                          blockSelectedTimeSlot ? styles.blockModalConfirmButtonWalkIn : {},
                          (blockTableMutation.isPending || createWalkInMutation.isPending) && styles.blockModalConfirmButtonDisabled
                        ]}
                        onPress={handleConfirmBlockTable}
                        disabled={blockTableMutation.isPending || createWalkInMutation.isPending}
                      >
                        <Lock size={18} color="#fff" />
                        <Text style={styles.blockModalConfirmText}>
                          {(blockTableMutation.isPending || createWalkInMutation.isPending)
                            ? 'Procesando...'
                            : blockSelectedTimeSlot
                              ? 'Añadir sin cita'
                              : 'Bloquear'
                          }
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal de prefijo telefónico walk-in - DEBE ir después del block modal para aparecer encima */}
        <Modal
          visible={showBlockPrefixModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBlockPrefixModal(false)}
        >
          <View style={[styles.blockModalOverlay, { zIndex: 9999 }]}>
            <View style={[styles.blockModalContent, { maxHeight: 420 }]}>
              <View style={styles.blockModalHeader}>
                <Text style={styles.blockModalTitle}>Seleccionar Prefijo</Text>
                <TouchableOpacity onPress={() => setShowBlockPrefixModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { code: '+34', flag: '🇪🇸', country: 'España' },
                  { code: '+1', flag: '🇺🇸', country: 'EE.UU. / Canadá' },
                  { code: '+44', flag: '🇬🇧', country: 'Reino Unido' },
                  { code: '+33', flag: '🇫🇷', country: 'Francia' },
                  { code: '+49', flag: '🇩🇪', country: 'Alemania' },
                  { code: '+39', flag: '🇮🇹', country: 'Italia' },
                  { code: '+351', flag: '🇵🇹', country: 'Portugal' },
                  { code: '+31', flag: '🇳🇱', country: 'Países Bajos' },
                  { code: '+32', flag: '🇧🇪', country: 'Bélgica' },
                  { code: '+41', flag: '🇨🇭', country: 'Suiza' },
                  { code: '+43', flag: '🇦🇹', country: 'Austria' },
                  { code: '+48', flag: '🇵🇱', country: 'Polonia' },
                  { code: '+45', flag: '🇩🇰', country: 'Dinamarca' },
                  { code: '+46', flag: '🇸🇪', country: 'Suecia' },
                  { code: '+47', flag: '🇳🇴', country: 'Noruega' },
                  { code: '+358', flag: '🇫🇮', country: 'Finlandia' },
                  { code: '+55', flag: '🇧🇷', country: 'Brasil' },
                  { code: '+52', flag: '🇲🇽', country: 'México' },
                  { code: '+54', flag: '🇦🇷', country: 'Argentina' },
                  { code: '+56', flag: '🇨🇱', country: 'Chile' },
                  { code: '+57', flag: '🇨🇴', country: 'Colombia' },
                  { code: '+51', flag: '🇵🇪', country: 'Perú' },
                  { code: '+58', flag: '🇻🇪', country: 'Venezuela' },
                  { code: '+593', flag: '🇪🇨', country: 'Ecuador' },
                  { code: '+598', flag: '🇺🇾', country: 'Uruguay' },
                  { code: '+595', flag: '🇵🇾', country: 'Paraguay' },
                  { code: '+591', flag: '🇧🇴', country: 'Bolivia' },
                  { code: '+502', flag: '🇬🇹', country: 'Guatemala' },
                  { code: '+503', flag: '🇸🇻', country: 'El Salvador' },
                  { code: '+504', flag: '🇭🇳', country: 'Honduras' },
                  { code: '+505', flag: '🇳🇮', country: 'Nicaragua' },
                  { code: '+506', flag: '🇨🇷', country: 'Costa Rica' },
                  { code: '+507', flag: '🇵🇦', country: 'Panamá' },
                  { code: '+53', flag: '🇨🇺', country: 'Cuba' },
                  { code: '+1809', flag: '🇩🇴', country: 'Rep. Dominicana' },
                  { code: '+61', flag: '🇦🇺', country: 'Australia' },
                  { code: '+81', flag: '🇯🇵', country: 'Japón' },
                  { code: '+86', flag: '🇨🇳', country: 'China' },
                  { code: '+82', flag: '🇰🇷', country: 'Corea del Sur' },
                  { code: '+91', flag: '🇮🇳', country: 'India' },
                  { code: '+971', flag: '🇦🇪', country: 'Emiratos Árabes' },
                  { code: '+212', flag: '🇲🇦', country: 'Marruecos' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.blockPrefixOption, blockWalkInPhonePrefix === item.code && styles.blockPrefixOptionSelected]}
                    onPress={() => { setBlockWalkInPhonePrefix(item.code); setShowBlockPrefixModal(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.blockPrefixFlag}>{item.flag}</Text>
                    <View style={styles.blockPrefixInfo}>
                      <Text style={[styles.blockPrefixCountry, blockWalkInPhonePrefix === item.code && styles.blockPrefixOptionTextSelected]}>{item.country}</Text>
                      <Text style={[styles.blockPrefixOptionText, blockWalkInPhonePrefix === item.code && styles.blockPrefixOptionTextSelected]}>{item.code}</Text>
                    </View>
                    {blockWalkInPhonePrefix === item.code && <Text style={styles.blockPrefixCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal para editar reserva */}
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
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {editingReservation && (
                <View style={styles.editInfoCard}>
                  <Text style={styles.editInfoName}>{editingReservation.clientName}</Text>
                  <Text style={styles.editInfoDetail}>
                    Hora: {String(editingReservation.time.hour).padStart(2, '0')}:{String(editingReservation.time.minute).padStart(2, '0')} · {editingReservation.guests} pax
                  </Text>
                </View>
              )}

              {/* Tabs */}
              <View style={styles.editModalTabs}>
                {(['comensales', 'horario', 'mesa'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.editModalTab, editModalTab === tab && styles.editModalTabActive]}
                    onPress={() => setEditModalTab(tab)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.editModalTabText, editModalTab === tab && styles.editModalTabTextActive]}>
                      {tab === 'comensales' ? '👥 Comensales' : tab === 'horario' ? '🕐 Horario' : '🪑 Mesa'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={styles.modalScroll}>
                {/* TAB: Comensales */}
                {editModalTab === 'comensales' && (
                  <View style={{ paddingVertical: 8 }}>
                    <Text style={styles.editSectionTitle}>Número de comensales</Text>
                    <View style={styles.editGuestsRow}>
                      <TouchableOpacity
                        style={[styles.editGuestsBtn, editGuestsValue <= 1 && styles.editGuestsBtnDisabled]}
                        onPress={() => setEditGuestsValue(Math.max(1, editGuestsValue - 1))}
                        disabled={editGuestsValue <= 1}
                      >
                        <Text style={styles.editGuestsBtnText}>−</Text>
                      </TouchableOpacity>
                      <View style={styles.editGuestsDisplay}>
                        <Users size={22} color="#8B5CF6" />
                        <Text style={styles.editGuestsCount}>{editGuestsValue}</Text>
                        <Text style={styles.editGuestsPax}>pax</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editGuestsBtn}
                        onPress={() => setEditGuestsValue(editGuestsValue + 1)}
                      >
                        <Text style={styles.editGuestsBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    {editGuestsValue > editGuestsTableCapacity.max && (
                      <View style={styles.editGuestsWarning}>
                        <Text style={styles.editGuestsWarningText}>
                          ⚠️ La mesa actual solo admite {editGuestsTableCapacity.max} pax máximo.
                        </Text>
                        <View style={styles.editGuestsWarningActions}>
                          <TouchableOpacity
                            style={styles.editGuestsWarningBtn}
                            onPress={() => setEditModalTab('mesa')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.editGuestsWarningBtnText}>🔄 Cambiar mesa</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.editGuestsWarningBtn, { backgroundColor: '#E0E7FF' }]}
                            onPress={() => {
                              if (editingReservation) {
                                const table = locationTables.find((t: any) => editingReservation.tableIds?.includes(t.id)) ||
                                  (tablesQuery.data as any[])?.find((t: any) => editingReservation.tableIds?.includes(t.id) && t.locationId === (editingReservation.locationId || editSelectedLocation));
                                if (table) {
                                  const timeStr = `${String(editingReservation.time.hour).padStart(2, '0')}:${String(editingReservation.time.minute).padStart(2, '0')}`;
                                  setGroupTimeSlot(timeStr);
                                  setGroupModalStep('tables');
                                  setSelectedTablesForGroup([table.id]);
                                  setSelectedFreeTable(table);
                                  const minCap = (table as any).minCapacity || 1;
                                  const maxCap = (table as any).maxCapacity || (table as any).capacity || 2;
                                  setGroupMinCapacity(String(minCap));
                                  setGroupMaxCapacity(String(maxCap));
                                  setGroupModalError(null);
                                  setGroupFromReservationId(editingReservation.id);
                                  setShowEditModal(false);
                                  setTimeout(() => setShowGroupModal(true), 300);
                                } else {
                                  Alert.alert('Error', 'No se encontró la mesa de esta reserva en la ubicación actual.');
                                }
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.editGuestsWarningBtnText, { color: '#4338CA' }]}>➕ Agrupar mesa</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* TAB: Horario */}
                {editModalTab === 'horario' && (
                  <View style={{ paddingVertical: 8 }}>
                    <Text style={styles.editSectionTitle}>Cambiar horario</Text>
                    <Text style={styles.editSectionHint}>🔴 En rosa: excedería el aforo del turno</Text>
                    {timeSlots.map((slot, index) => {
                      const currentResTimeStr = editingReservation
                        ? `${String(editingReservation.time.hour).padStart(2, '0')}:${String(editingReservation.time.minute).padStart(2, '0')}`
                        : '';
                      const isCurrent = slot.time === currentResTimeStr;
                      const isSelected = slot.time === editTimeValue;
                      const guestsForSlot = editGuestsValue || (editingReservation?.guests || 0);
                      const wouldExceed = !isCurrent && (slot.reservedGuests - (isCurrent ? guestsForSlot : 0) + guestsForSlot) > slot.maxGuests;
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.changeTimeSlotItem,
                            isCurrent && styles.changeTimeSlotItemCurrent,
                            isSelected && !isCurrent && styles.editTimeSlotSelected,
                            wouldExceed && !isSelected && styles.changeTimeSlotItemOver,
                          ]}
                          onPress={() => setEditTimeValue(slot.time)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.changeTimeSlotTime,
                            isCurrent && styles.changeTimeSlotTimeCurrent,
                            isSelected && !isCurrent && { color: '#fff', fontWeight: '700' as const },
                            wouldExceed && !isSelected && styles.changeTimeSlotTimeOver,
                          ]}>
                            {slot.time}
                          </Text>
                          <View style={styles.changeTimeSlotRight}>
                            <Text style={[
                              styles.changeTimeSlotCapacity,
                              wouldExceed && !isSelected && styles.changeTimeSlotCapacityOver,
                            ]}>
                              {slot.reservedGuests}/{slot.maxGuests} pax
                            </Text>
                            {isCurrent && (
                              <View style={styles.changeTimeCurrentBadge}>
                                <Text style={styles.changeTimeCurrentBadgeText}>Actual</Text>
                              </View>
                            )}
                            {isSelected && !isCurrent && (
                              <View style={[styles.changeTimeCurrentBadge, { backgroundColor: '#7C3AED' }]}>
                                <Text style={styles.changeTimeCurrentBadgeText}>✓</Text>
                              </View>
                            )}
                            {wouldExceed && !isSelected && (
                              <View style={styles.changeTimeOverBadge}>
                                <Text style={styles.changeTimeOverBadgeText}>+{(slot.reservedGuests + guestsForSlot) - slot.maxGuests}</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {timeSlots.length === 0 && (
                      <Text style={styles.editSectionHint}>No hay horarios disponibles</Text>
                    )}
                  </View>
                )}

                {/* TAB: Mesa */}
                {editModalTab === 'mesa' && (
                  <>
                    <Text style={[styles.editSectionTitle, { marginTop: 8 }]}>Seleccionar Ubicación</Text>
                    <View style={styles.editLocationsList}>
                      {locationsQuery.data?.map((location: any) => (
                        <TouchableOpacity
                          key={location.id}
                          style={[
                            styles.editLocationOption,
                            editSelectedLocation === location.id && styles.editLocationOptionSelected,
                          ]}
                          onPress={() => {
                            if (editSelectedLocation !== location.id) {
                              setEditSelectedLocation(location.id);
                              setEditSelectedTables([]);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.editLocationText,
                            editSelectedLocation === location.id && styles.editLocationTextSelected,
                          ]}>
                            {location.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {editSelectedLocation && (
                      <>
                        <Text style={styles.editSectionTitle}>Seleccionar Nueva Mesa</Text>
                        {availableTablesQuery.isLoading ? (
                          <ActivityIndicator size="small" color="#8B5CF6" style={{ marginVertical: 20 }} />
                        ) : (
                          <View style={styles.editTablesList}>
                            {(() => {
                              const editResTimeMin2 = editingReservation ? editingReservation.time.hour * 60 + editingReservation.time.minute : 0;
                              const freeTables: EditSelectableTable[] = [];
                              const swappableTables: EditSelectableTable[] = [];
                              const blockedTablesList: EditSelectableTable[] = [];
                              editSelectableTables.forEach((table: EditSelectableTable) => {
                                const isBlocked = blockedTablesQuery.data?.some((block: any) => block.tableId === table.id && doesBlockAffectReservationTime(block, editingReservation));
                                if (isBlocked) { blockedTablesList.push(table); return; }
                                const tableRotMin2 = (table as any).rotationTimeMinutes || 120;
                                const otherResOnTable = todayReservations.filter((res: any) => {
                                  if (res.id === editingReservation?.id) return false;
                                  if (!res.tableIds?.includes(table.id)) return false;
                                  if (res.status === 'cancelled' || res.status === 'modified') return false;
                                  const resTimeMin = res.time.hour * 60 + res.time.minute;
                                  return Math.abs(resTimeMin - editResTimeMin2) < tableRotMin2;
                                });
                                const hasOtherReservation = otherResOnTable.length > 0;
                                const isRotationCompatible = hasOtherReservation && otherResOnTable.every((res: any) => {
                                  const resT = res.time.hour * 60 + res.time.minute;
                                  return editResTimeMin2 >= resT + tableRotMin2 || resT >= editResTimeMin2 + tableRotMin2;
                                });
                                if (!hasOtherReservation || isRotationCompatible) {
                                  freeTables.push(table);
                                } else {
                                  swappableTables.push(table);
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
                                      {freeTables.map((table: EditSelectableTable) => {
                                        const isSelected = editSelectedTables.includes(table.id);
                                        const isCurrentTable = editingReservation?.tableIds?.includes(table.id);
                                        const tableRotMin2 = (table as any).rotationTimeMinutes || 120;
                                        const otherResOnTable = todayReservations.filter((res: any) => {
                                          if (res.id === editingReservation?.id) return false;
                                          if (!res.tableIds?.includes(table.id)) return false;
                                          if (res.status === 'cancelled' || res.status === 'modified') return false;
                                          const resTimeMin = res.time.hour * 60 + res.time.minute;
                                          return Math.abs(resTimeMin - editResTimeMin2) < tableRotMin2;
                                        });
                                        const isRotationCompatible = otherResOnTable.length > 0 && otherResOnTable.every((res: any) => {
                                          const resT = res.time.hour * 60 + res.time.minute;
                                          return editResTimeMin2 >= resT + tableRotMin2 || resT >= editResTimeMin2 + tableRotMin2;
                                        });
                                        const rotationCompatibleRes = isRotationCompatible ? otherResOnTable[0] : null;
                                        return (
                                          <TouchableOpacity
                                            key={table.id}
                                            style={[
                                              styles.editTableOption,
                                              styles.editTableOptionAvailable,
                                              isSelected && styles.editTableOptionSelected,
                                              isCurrentTable && !isSelected && styles.editTableOptionCurrent,
                                            ]}
                                            onPress={() => {
                                              if (isSelected) setEditSelectedTables([]);
                                              else setEditSelectedTables([table.id]);
                                            }}
                                            activeOpacity={0.7}
                                          >
                                            <View style={{ flex: 1 }}>
                                              <Text style={[styles.editTableName, isSelected && styles.editTableNameSelected, !isSelected && { color: '#065F46' }]}>
                                                {table.name}
                                              </Text>
                                              <Text style={[styles.editTableCapacity, !isSelected && { color: '#059669' }]}>
                                                {table.minCapacity}-{table.maxCapacity} pax
                                              </Text>
                                              {!isRotationCompatible && !isSelected && <Text style={styles.editTableAvailableLabel}>disponible</Text>}
                                              {isRotationCompatible && !isSelected && rotationCompatibleRes && (
                                                <Text style={styles.editTableRotationLabel}>
                                                  Libre · rotación desde {String(rotationCompatibleRes.time.hour).padStart(2, '0')}:{String(rotationCompatibleRes.time.minute).padStart(2, '0')}
                                                </Text>
                                              )}
                                              {isCurrentTable && !isSelected && <Text style={styles.editTableCurrentLabel}>Mesa actual</Text>}
                                            </View>
                                            {isSelected && (
                                              <View style={styles.editTableCheck}>
                                                <Check size={16} color="#fff" />
                                              </View>
                                            )}
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
                                      {swappableTables.map((table: EditSelectableTable) => {
                                        const isSelected = editSelectedTables.includes(table.id);
                                        const tableRotMin2 = (table as any).rotationTimeMinutes || 120;
                                        const otherResOnTable = todayReservations.filter((res: any) => {
                                          if (res.id === editingReservation?.id) return false;
                                          if (!res.tableIds?.includes(table.id)) return false;
                                          if (res.status === 'cancelled' || res.status === 'modified') return false;
                                          const resTimeMin = res.time.hour * 60 + res.time.minute;
                                          return Math.abs(resTimeMin - editResTimeMin2) < tableRotMin2;
                                        });
                                        return (
                                          <TouchableOpacity
                                            key={table.id}
                                            style={[
                                              styles.editTableOption,
                                              styles.editTableOptionOccupied,
                                              isSelected && styles.editTableOptionSelected,
                                            ]}
                                            onPress={() => {
                                              if (isSelected) setEditSelectedTables([]);
                                              else setEditSelectedTables([table.id]);
                                            }}
                                            activeOpacity={0.7}
                                          >
                                            <View style={{ flex: 1 }}>
                                              <Text style={[styles.editTableName, isSelected && styles.editTableNameSelected, !isSelected && styles.editTableNameOccupied]}>
                                                {table.name}
                                              </Text>
                                              <Text style={[styles.editTableCapacity, !isSelected && styles.editTableCapacityOccupied]}>
                                                {table.minCapacity}-{table.maxCapacity} pax
                                              </Text>
                                              {!isSelected && (
                                                <Text style={styles.editTableOccupiedLabel}>
                                                  Reservada · {otherResOnTable[0]?.clientName || 'intercambiar'}
                                                </Text>
                                              )}
                                            </View>
                                            {isSelected && (
                                              <View style={styles.editTableCheck}>
                                                <Check size={16} color="#fff" />
                                              </View>
                                            )}
                                          </TouchableOpacity>
                                        );
                                      })}
                                    </>
                                  )}

                                  {incompatibleFreeTables.length > 0 && (
                                    <>
                                      <View style={styles.tableSectionHeader}>
                                        <View style={[styles.tableSectionDot, { backgroundColor: '#EF4444' }]} />
                                        <Text style={[styles.tableSectionLabel, { color: '#7F1D1D' }]}>Configurables</Text>
                                      </View>
                                      {incompatibleFreeTables.map((table: EditSelectableTable) => (
                                        <TouchableOpacity
                                          key={table.id}
                                          style={[styles.editTableOption, styles.editTableOptionConfigurable]}
                                          onPress={() => {
                                            setConfigurableSelectedTable(table);
                                            setConfigurableGuestsInput(String(editingReservation?.guests || 1));
                                            setShowConfigurableTableModal(true);
                                          }}
                                          activeOpacity={0.7}
                                        >
                                          <View style={{ flex: 1 }}>
                                            <Text style={[styles.editTableName, { color: '#991B1B' }]}>{table.name}</Text>
                                            <Text style={[styles.editTableCapacity, { color: '#B91C1C' }]}>
                                              {table.minCapacity}-{table.maxCapacity} pax
                                            </Text>
                                            <Text style={styles.editTableConfigurableLabel}>configurable</Text>
                                          </View>
                                        </TouchableOpacity>
                                      ))}
                                    </>
                                  )}

                                  {blockedTablesList.map((table: EditSelectableTable) => (
                                    <View key={table.id} style={[styles.editTableOption, styles.editTableOptionBlocked]}>
                                      <View style={styles.editTableBlockedBadge}>
                                        <Lock size={12} color="#DC2626" />
                                      </View>
                                      <Text style={[styles.editTableName, styles.editTableNameBlocked]}>{table.name}</Text>
                                      <Text style={styles.editTableBlockedText}>Bloqueada</Text>
                                    </View>
                                  ))}

                                  {editSelectableTables.length === 0 && incompatibleFreeTables.length === 0 && (
                                    <View style={styles.editNoTables}>
                                      <Text style={styles.editNoTablesText}>No hay mesas disponibles en esta ubicación</Text>
                                    </View>
                                  )}
                                </>
                              );
                            })()}
                          </View>
                        )}
                      </>
                    )}
                  </>
                )}
              </ScrollView>

              <View style={styles.editModalFooter}>
                <TouchableOpacity
                  style={styles.editCancelButton}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.editCancelText}>Cancelar</Text>
                </TouchableOpacity>
                {editModalTab === 'mesa' ? (
                  <TouchableOpacity
                    style={[
                      styles.editSaveButton,
                      (updateTableMutation.isPending || editSelectedTables.length === 0) && styles.editSaveButtonDisabled
                    ]}
                    onPress={handleSaveEdit}
                    disabled={updateTableMutation.isPending || editSelectedTables.length === 0}
                  >
                    <Text style={styles.editSaveText}>
                      {updateTableMutation.isPending ? 'Guardando...' : 'Cambiar Mesa'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.editSaveButton,
                      (updateReservationMutation.isPending) && styles.editSaveButtonDisabled
                    ]}
                    onPress={handleSaveEditAll}
                    disabled={updateReservationMutation.isPending}
                  >
                    <Text style={styles.editSaveText}>
                      {updateReservationMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para mesa configurable */}
        <Modal
          visible={showConfigurableTableModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfigurableTableModal(false)}
        >
          <View style={styles.swapModalOverlay}>
            <View style={styles.swapModalContent}>
              <View style={styles.swapModalHeader}>
                <Text style={styles.swapModalTitle}>Mesa Configurable</Text>
                <TouchableOpacity onPress={() => setShowConfigurableTableModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={styles.swapModalBody}>
                <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FECACA' }}>
                  <Text style={{ fontSize: 15, color: '#991B1B', fontWeight: '700' as const }}>{configurableSelectedTable?.name}</Text>
                  <Text style={{ fontSize: 13, color: '#B91C1C', marginTop: 4 }}>
                    Capacidad: {configurableSelectedTable?.minCapacity}–{configurableSelectedTable?.maxCapacity} pax · Reserva: {editingReservation?.guests} comensales
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 14, lineHeight: 20 }}>
                  Esta mesa no coincide con los requisitos de la reserva. Elige cómo proceder:
                </Text>

                <TouchableOpacity
                  style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#BFDBFE', flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 }}
                  onPress={() => {
                    setShowConfigurableTableModal(false);
                    setGroupModalStep('tables');
                    setSelectedTablesForGroup(configurableSelectedTable ? [configurableSelectedTable.id] : []);
                    setTimeout(() => setShowGroupModal(true), 150);
                  }}
                  activeOpacity={0.7}
                >
                  <Link2 size={18} color="#1D4ED8" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600' as const, color: '#1D4ED8' }}>Agrupar con otra mesa</Text>
                    <Text style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>Une esta mesa con otra para aumentar la capacidad</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ backgroundColor: '#FFFBEB', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 }}
                  onPress={() => {
                    setShowConfigurableTableModal(false);
                    if (configurableSelectedTable) {
                      setSelectedFreeTable({
                        id: configurableSelectedTable.id,
                        name: configurableSelectedTable.name,
                        capacity: configurableSelectedTable.maxCapacity || (configurableSelectedTable as any).capacity || 4,
                        locationId: configurableSelectedTable.locationId,
                        isReserved: false,
                      });
                      setTimeout(() => setShowSplitModal(true), 150);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Scissors size={18} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600' as const, color: '#D97706' }}>Dividir mesa</Text>
                    <Text style={{ fontSize: 12, color: '#F59E0B', marginTop: 2 }}>Divide la mesa para ajustar la capacidad</Text>
                  </View>
                </TouchableOpacity>

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
                        if (!editingReservation || !configurableSelectedTable) return;
                        setShowConfigurableTableModal(false);
                        updateTableMutation.mutate({
                          reservationId: editingReservation.id,
                          tableIds: [configurableSelectedTable.id],
                          locationId: editSelectedLocation,
                        });
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#fff' }}>Aplicar</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={{ paddingVertical: 12, alignItems: 'center' as const }}
                  onPress={() => setShowConfigurableTableModal(false)}
                >
                  <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '500' as const }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para desbloquear mesa */}
        <Modal
          visible={showUnblockModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUnblockModal(false)}
        >
          <View style={styles.unblockModalOverlay}>
            <View style={styles.unblockModalContent}>
              <View style={styles.unblockModalHeader}>
                <Text style={styles.unblockModalTitle}>{selectedBlockedTable?.name}</Text>
                <TouchableOpacity onPress={() => setShowUnblockModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.unblockModalBody}>
                {selectedBlockedTable?.blockInfo?.id?.startsWith('block-split-') ? (
                  <>
                    <View style={[styles.blockedStatusBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                      <Scissors size={20} color="#D97706" />
                      <Text style={[styles.blockedStatusText, { color: '#92400E' }]}>Mesa Dividida</Text>
                    </View>
                    <Text style={styles.unblockModalNote}>
                      Esta mesa ha sido dividida en mesas temporales para este turno. Deshacer la división eliminará las mesas temporales y restaurará la mesa original.
                    </Text>
                    <Text style={[styles.unblockModalNote, { color: '#DC2626', marginTop: 6 }]}>
                      Solo puedes deshacer la división si ninguna de las mesas temporales tiene una reserva activa.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.unblockConfirmButton,
                        { backgroundColor: '#D97706' },
                        unblockTableMutation.isPending && styles.unblockConfirmButtonDisabled
                      ]}
                      onPress={handleUnblockTable}
                      disabled={unblockTableMutation.isPending}
                    >
                      <Scissors size={18} color="#fff" />
                      <Text style={styles.unblockConfirmText}>
                        {unblockTableMutation.isPending ? 'Deshaciendo...' : 'Deshacer División'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.blockedStatusBadge}>
                      <Lock size={20} color="#DC2626" />
                      <Text style={styles.blockedStatusText}>Mesa Bloqueada</Text>
                    </View>
                    <Text style={styles.unblockModalNote}>
                      Esta mesa está actualmente bloqueada y no está disponible para reservas.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.unblockConfirmButton,
                        unblockTableMutation.isPending && styles.unblockConfirmButtonDisabled
                      ]}
                      onPress={handleUnblockTable}
                      disabled={unblockTableMutation.isPending}
                    >
                      <Unlock size={18} color="#fff" />
                      <Text style={styles.unblockConfirmText}>
                        {unblockTableMutation.isPending ? 'Desbloqueando...' : 'Desbloquear Mesa'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={styles.unblockCancelButton}
                  onPress={() => setShowUnblockModal(false)}
                >
                  <Text style={styles.unblockCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para confirmar intercambio de mesas */}
        <Modal
          visible={showSwapConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSwapConfirmModal(false)}
        >
          <View style={styles.swapModalOverlay}>
            <View style={styles.swapModalContent}>
              <View style={styles.swapModalHeader}>
                <Text style={styles.swapModalTitle}>Intercambiar Mesas</Text>
                <TouchableOpacity onPress={() => setShowSwapConfirmModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.swapModalBody}>
                <Text style={styles.swapModalDescription}>
                  La mesa <Text style={styles.swapModalHighlight}>{swapTargetTable?.name}</Text> ya tiene una reserva asignada.
                </Text>
                
                <View style={styles.swapReservationsContainer}>
                  <View style={styles.swapReservationCard}>
                    <Text style={styles.swapReservationLabel}>Reserva actual ({editingReservation?.tableNames?.join(', ')})</Text>
                    <Text style={styles.swapReservationName}>{editingReservation?.clientName}</Text>
                    <Text style={styles.swapReservationTime}>
                      {editingReservation?.time ? `${String(editingReservation.time.hour).padStart(2, '0')}:${String(editingReservation.time.minute).padStart(2, '0')}` : ''} - {editingReservation?.guests} pax
                    </Text>
                  </View>
                  
                  <View style={styles.swapArrow}>
                    <Text style={styles.swapArrowText}>⇄</Text>
                  </View>
                  
                  <View style={styles.swapReservationCard}>
                    <Text style={styles.swapReservationLabel}>Reserva en {swapTargetTable?.name}</Text>
                    <Text style={styles.swapReservationName}>{swapTargetReservation?.clientName}</Text>
                    <Text style={styles.swapReservationTime}>
                      {swapTargetReservation?.time ? `${String(swapTargetReservation.time.hour).padStart(2, '0')}:${String(swapTargetReservation.time.minute).padStart(2, '0')}` : ''} - {swapTargetReservation?.guests} pax
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.swapModalQuestion}>
                  ¿Deseas intercambiar las mesas de estas reservas?
                </Text>
                
                <View style={styles.swapModalButtons}>
                  <TouchableOpacity
                    style={styles.swapCancelButton}
                    onPress={() => {
                      setShowSwapConfirmModal(false);
                      setSwapTargetTable(null);
                      setSwapTargetReservation(null);
                    }}
                  >
                    <Text style={styles.swapCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.swapConfirmButton,
                      swapTablesMutation.isPending && styles.swapConfirmButtonDisabled
                    ]}
                    onPress={handleConfirmSwap}
                    disabled={swapTablesMutation.isPending}
                  >
                    <Text style={styles.swapConfirmText}>
                      {swapTablesMutation.isPending ? 'Intercambiando...' : 'Sí, Intercambiar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para dividir mesa */}
        <Modal
          visible={showSplitModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSplitModal(false)}
        >
          <View style={styles.splitModalOverlay}>
            <View style={styles.splitModalContent}>
              <View style={styles.splitModalHeader}>
                <Text style={styles.splitModalTitle}>Dividir Mesa</Text>
                <TouchableOpacity onPress={() => setShowSplitModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.splitModalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.splitTableInfo}>
                  <Scissors size={24} color="#F59E0B" />
                  <Text style={styles.splitTableName}>{selectedFreeTable?.name}</Text>
                  <Text style={styles.splitTableCapacity}>
                    Capacidad original: {selectedFreeTable?.maxCapacity || selectedFreeTable?.capacity || 4} pax
                  </Text>
                </View>
                
                <Text style={styles.splitModalNote}>
                  La mesa se dividirá temporalmente en dos para este turno ({selectedShift?.templateName}). La mesa original quedará bloqueada.
                </Text>
                
                {/* Mesa A */}
                <View style={styles.splitTableSection}>
                  <Text style={styles.splitTableSectionTitle}>{selectedFreeTable?.name}A</Text>
                  
                  <View style={styles.splitInputRow}>
                    <View style={styles.splitInputGroup}>
                      <Text style={styles.splitInputLabel}>Min. Comensales</Text>
                      <TextInput
                        style={styles.splitInputField}
                        value={splitTableAMinCapacity}
                        onChangeText={setSplitTableAMinCapacity}
                        keyboardType="number-pad"
                        placeholder="1"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.splitInputGroup}>
                      <Text style={styles.splitInputLabel}>Max. Comensales</Text>
                      <TextInput
                        style={styles.splitInputField}
                        value={modifiedTableACapacity}
                        onChangeText={setModifiedTableACapacity}
                        keyboardType="number-pad"
                        placeholder="2"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                  
                  <View style={styles.splitInputRow}>
                    <View style={styles.splitInputGroup}>
                      <Text style={styles.splitInputLabel}>Tronas</Text>
                      <TextInput
                        style={styles.splitInputField}
                        value={splitTableAHighChairs}
                        onChangeText={setSplitTableAHighChairs}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.splitInputGroup} />
                  </View>
                  
                  <View style={styles.splitToggleRow}>
                    <TouchableOpacity
                      style={[styles.splitToggle, splitTableAAllowsStroller && styles.splitToggleActive]}
                      onPress={() => setSplitTableAAllowsStroller(!splitTableAAllowsStroller)}
                    >
                      <ShoppingCart size={16} color={splitTableAAllowsStroller ? '#fff' : '#6B7280'} />
                      <Text style={[styles.splitToggleText, splitTableAAllowsStroller && styles.splitToggleTextActive]}>Carrito</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.splitToggle, splitTableAAllowsPets && styles.splitToggleActive]}
                      onPress={() => setSplitTableAAllowsPets(!splitTableAAllowsPets)}
                    >
                      <Dog size={16} color={splitTableAAllowsPets ? '#fff' : '#6B7280'} />
                      <Text style={[styles.splitToggleText, splitTableAAllowsPets && styles.splitToggleTextActive]}>Mascota</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.splitDividerLine}>
                  <View style={styles.splitDividerDash} />
                  <Text style={styles.splitDividerPlus}>+</Text>
                  <View style={styles.splitDividerDash} />
                </View>
                
                {/* Mesa B */}
                <View style={styles.splitTableSection}>
                  <Text style={styles.splitTableSectionTitle}>{selectedFreeTable?.name}B</Text>
                  
                  <View style={styles.splitInputRow}>
                    <View style={styles.splitInputGroup}>
                      <Text style={styles.splitInputLabel}>Min. Comensales</Text>
                      <TextInput
                        style={styles.splitInputField}
                        value={splitTableBMinCapacity}
                        onChangeText={setSplitTableBMinCapacity}
                        keyboardType="number-pad"
                        placeholder="1"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.splitInputGroup}>
                      <Text style={styles.splitInputLabel}>Max. Comensales</Text>
                      <TextInput
                        style={styles.splitInputField}
                        value={splitTableBCapacity}
                        onChangeText={setSplitTableBCapacity}
                        keyboardType="number-pad"
                        placeholder="2"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                  
                  <View style={styles.splitInputRow}>
                    <View style={styles.splitInputGroup}>
                      <Text style={styles.splitInputLabel}>Tronas</Text>
                      <TextInput
                        style={styles.splitInputField}
                        value={splitTableBHighChairs}
                        onChangeText={setSplitTableBHighChairs}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.splitInputGroup} />
                  </View>
                  
                  <View style={styles.splitToggleRow}>
                    <TouchableOpacity
                      style={[styles.splitToggle, splitTableBAllowsStroller && styles.splitToggleActive]}
                      onPress={() => setSplitTableBAllowsStroller(!splitTableBAllowsStroller)}
                    >
                      <ShoppingCart size={16} color={splitTableBAllowsStroller ? '#fff' : '#6B7280'} />
                      <Text style={[styles.splitToggleText, splitTableBAllowsStroller && styles.splitToggleTextActive]}>Carrito</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.splitToggle, splitTableBAllowsPets && styles.splitToggleActive]}
                      onPress={() => setSplitTableBAllowsPets(!splitTableBAllowsPets)}
                    >
                      <Dog size={16} color={splitTableBAllowsPets ? '#fff' : '#6B7280'} />
                      <Text style={[styles.splitToggleText, splitTableBAllowsPets && styles.splitToggleTextActive]}>Mascota</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.splitModalButtons}>
                  <TouchableOpacity
                    style={styles.splitCancelButton}
                    onPress={() => setShowSplitModal(false)}
                    disabled={splitTableDirectMutation.isPending}
                  >
                    <Text style={styles.splitCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.splitConfirmButton,
                      splitTableDirectMutation.isPending && styles.splitConfirmButtonDisabled
                    ]}
                    onPress={handleConfirmSplit}
                    disabled={splitTableDirectMutation.isPending}
                  >
                    {splitTableDirectMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Scissors size={18} color="#fff" />
                    )}
                    <Text style={styles.splitConfirmText}>
                      {splitTableDirectMutation.isPending ? 'Dividiendo...' : 'Dividir Mesa'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal para agrupar mesas */}
        <Modal
          visible={showGroupModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGroupModal(false)}
        >
          <View style={styles.groupModalOverlay}>
            <View style={styles.groupModalContent}>
              <View style={styles.groupModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Link2 size={18} color="#3B82F6" />
                  <Text style={styles.groupModalTitle}>
                    {groupModalStep === 'time' ? 'Agrupar: Seleccionar Horario' : 'Agrupar: Seleccionar Mesas'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => {
                  setShowGroupModal(false);
                  setSelectedTablesForGroup([]);
                  setGroupModalError(null);
                  setGroupTimeSlot('');
                  setGroupModalStep('time');
                }}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Step indicators */}
              <View style={styles.groupStepIndicator}>
                <View style={[styles.groupStepDot, groupModalStep === 'time' && styles.groupStepDotActive]}>
                  <Text style={[styles.groupStepDotText, groupModalStep === 'time' && styles.groupStepDotTextActive]}>1</Text>
                </View>
                <View style={styles.groupStepLine} />
                <View style={[styles.groupStepDot, groupModalStep === 'tables' && styles.groupStepDotActive, groupTimeSlot !== '' && groupModalStep === 'time' && styles.groupStepDotCompleted]}>
                  <Text style={[styles.groupStepDotText, (groupModalStep === 'tables' || groupTimeSlot !== '') && styles.groupStepDotTextActive]}>2</Text>
                </View>
              </View>

              {groupModalStep === 'time' ? (
                <ScrollView style={styles.groupModalBody}>
                  <View style={styles.groupSelectedInfo}>
                    <Link2 size={20} color="#3B82F6" />
                    <Text style={styles.groupSelectedTitle}>Mesa: {selectedFreeTable?.name}</Text>
                  </View>
                  <Text style={styles.groupModalNote}>
                    Selecciona el horario para el que necesitas más capacidad. El sistema mostrará todas las mesas disponibles a esa hora, incluyendo las que quedan libres por tiempo de rotación.
                  </Text>
                  <Text style={styles.groupSectionTitle}>Horario del turno ({selectedShift?.templateName}):</Text>
                  {timeSlots.length === 0 ? (
                    <View style={styles.groupNoTablesMessage}>
                      <Text style={styles.groupNoTablesText}>No hay horarios disponibles en este turno</Text>
                    </View>
                  ) : (
                    <View style={styles.groupTimeSlotsGrid}>
                      {timeSlots.map((slot) => {
                        const isSelected = groupTimeSlot === slot.time;
                        const isFull = slot.reservedGuests >= slot.maxGuests;
                        return (
                          <TouchableOpacity
                            key={slot.time}
                            style={[
                              styles.groupTimeSlotOption,
                              isSelected && styles.groupTimeSlotOptionSelected,
                              isFull && !isSelected && styles.groupTimeSlotOptionFull,
                            ]}
                            onPress={() => setGroupTimeSlot(isSelected ? '' : slot.time)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.groupTimeSlotText, isSelected && styles.groupTimeSlotTextSelected, isFull && !isSelected && styles.groupTimeSlotTextFull]}>
                              {slot.time}
                            </Text>
                            <Text style={[styles.groupTimeSlotCapacity, isSelected && styles.groupTimeSlotCapacitySelected, isFull && !isSelected && { color: '#DC2626' }]}>
                              {slot.reservedGuests}/{slot.maxGuests}
                            </Text>
                            {isSelected && (
                              <View style={styles.groupTimeSlotCheck}>
                                <Check size={12} color="#fff" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <View style={styles.groupModalButtons}>
                    <TouchableOpacity
                      style={styles.groupCancelButton}
                      onPress={() => {
                        setShowGroupModal(false);
                        setGroupTimeSlot('');
                        setGroupModalStep('time');
                      }}
                    >
                      <Text style={styles.groupCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.groupConfirmButton, !groupTimeSlot && styles.groupConfirmButtonDisabled]}
                      onPress={() => {
                        if (!groupTimeSlot) return;
                        setGroupModalStep('tables');
                        setSelectedTablesForGroup([selectedFreeTable?.id || '']);
                        const minCap = selectedFreeTable?.minCapacity || 1;
                        const maxCap = selectedFreeTable?.maxCapacity || selectedFreeTable?.capacity || 2;
                        setGroupMinCapacity(String(minCap));
                        setGroupMaxCapacity(String(maxCap));
                      }}
                      disabled={!groupTimeSlot}
                    >
                      <ChevronRight size={18} color="#fff" />
                      <Text style={styles.groupConfirmText}>Siguiente</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : (
              <ScrollView style={styles.groupModalBody}>
                <View style={styles.groupSelectedInfo}>
                  <Link2 size={20} color="#3B82F6" />
                  <View>
                    <Text style={styles.groupSelectedTitle}>Mesa principal: {selectedFreeTable?.name}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Horario seleccionado: {groupTimeSlot}</Text>
                  </View>
                </View>
                
                <Text style={styles.groupModalNote}>
                  Selecciona las mesas para agrupar con {selectedFreeTable?.name} a las {groupTimeSlot}.
                </Text>
                
                <Text style={styles.groupSectionTitle}>Mesas disponibles para agrupar:</Text>

                {groupModalError && (
                  <View style={styles.groupErrorContainer}>
                    <Text style={styles.groupErrorText}>{groupModalError}</Text>
                  </View>
                )}
                
                {freeTablesForGrouping.length === 0 ? (
                  <View style={styles.groupNoTablesMessage}>
                    <Text style={styles.groupNoTablesText}>No hay otras mesas disponibles para este horario</Text>
                  </View>
                ) : (
                  <View style={styles.groupTablesList}>
                    {freeTablesForGrouping.map((table: any) => {
                      const isSelected = selectedTablesForGroup.includes(table.id);
                      const isRotationBased = table.isReserved || !!table.availableFromTime;
                      return (
                        <TouchableOpacity
                          key={table.id}
                          style={[
                            styles.groupTableOption,
                            isSelected && styles.groupTableOptionSelected,
                            isRotationBased && !isSelected && styles.groupTableOptionRotation,
                          ]}
                          onPress={() => handleToggleTableForGroup(table.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.groupTableInfo}>
                            <Text style={[
                              styles.groupTableName,
                              isSelected && styles.groupTableNameSelected,
                            ]}>
                              {table.name}
                            </Text>
                            <Text style={styles.groupTableCapacity}>
                              {table.minCapacity || table.capacity}-{table.maxCapacity || table.capacity} pax
                            </Text>
                            {isRotationBased && (
                              <Text style={styles.groupTableRotationLabel}>
                                <Clock size={10} color="#D97706" /> Libre por rotación
                              </Text>
                            )}
                          </View>
                          {isSelected && (
                            <View style={styles.groupTableCheck}>
                              <Check size={16} color="#fff" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                
                <View style={styles.groupSelectedSummary}>
                  <Text style={styles.groupSelectedSummaryTitle}>Mesas seleccionadas:</Text>
                  <Text style={styles.groupSelectedSummaryCount}>
                    {selectedTablesForGroup.length} mesa{selectedTablesForGroup.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                
                {selectedTablesForGroup.length >= 2 && (
                  <View style={styles.groupCapacitySection}>
                    <Text style={styles.groupCapacitySectionTitle}>Capacidad del grupo</Text>
                    <View style={styles.groupCapacityRow}>
                      <View style={styles.groupCapacityInputGroup}>
                        <Text style={styles.groupCapacityLabel}>Mín. comensales</Text>
                        <TextInput
                          style={styles.groupCapacityInput}
                          value={groupMinCapacity}
                          onChangeText={setGroupMinCapacity}
                          keyboardType="number-pad"
                          placeholder="1"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <View style={styles.groupCapacityInputGroup}>
                        <Text style={styles.groupCapacityLabel}>Máx. comensales</Text>
                        <TextInput
                          style={styles.groupCapacityInput}
                          value={groupMaxCapacity}
                          onChangeText={setGroupMaxCapacity}
                          keyboardType="number-pad"
                          placeholder="4"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>
                  </View>
                )}
                
                <View style={styles.groupModalButtons}>
                  <TouchableOpacity
                    style={styles.groupCancelButton}
                    onPress={() => setGroupModalStep('time')}
                    disabled={groupTablesDirectMutation.isPending}
                  >
                    <Text style={styles.groupCancelText}>← Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.groupConfirmButton,
                      (selectedTablesForGroup.length < 2 || groupTablesDirectMutation.isPending) && styles.groupConfirmButtonDisabled
                    ]}
                    onPress={handleConfirmGroup}
                    disabled={selectedTablesForGroup.length < 2 || groupTablesDirectMutation.isPending}
                  >
                    {groupTablesDirectMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Link2 size={18} color="#fff" />
                    )}
                    <Text style={styles.groupConfirmText}>
                      {groupTablesDirectMutation.isPending ? 'Agrupando...' : 'Agrupar Mesas'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal para deshacer grupo */}
        <Modal
          visible={showUndoGroupModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUndoGroupModal(false)}
        >
          <View style={styles.undoGroupModalOverlay}>
            <View style={styles.undoGroupModalContent}>
              <View style={styles.undoGroupModalHeader}>
                <Text style={styles.undoGroupModalTitle}>{selectedGroupTable?.name}</Text>
                <TouchableOpacity onPress={() => setShowUndoGroupModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.undoGroupModalBody}>
                <View style={styles.groupBadge}>
                  <Link2 size={20} color="#3B82F6" />
                  <Text style={styles.groupBadgeText}>Grupo Temporal</Text>
                </View>
                
                <Text style={styles.undoGroupModalNote}>
                  Este es un grupo temporal de mesas. Puedes añadir una reserva al grupo o deshacerlo.
                </Text>
                
                <TouchableOpacity
                  style={styles.undoGroupAddReservationButton}
                  onPress={() => {
                    if (selectedGroupTable) {
                      setShowUndoGroupModal(false);
                      handleAddReservationToTable(selectedGroupTable);
                    }
                  }}
                >
                  <Plus size={18} color="#fff" />
                  <Text style={styles.undoGroupAddReservationText}>Añadir Reserva</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.undoGroupConfirmButton,
                    undoGroupMutation.isPending && styles.undoGroupConfirmButtonDisabled
                  ]}
                  onPress={handleUndoGroup}
                  disabled={undoGroupMutation.isPending}
                >
                  <Unlink size={18} color="#fff" />
                  <Text style={styles.undoGroupConfirmText}>
                    {undoGroupMutation.isPending ? 'Deshaciendo...' : 'Deshacer Grupo'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.undoGroupCancelButton}
                  onPress={() => setShowUndoGroupModal(false)}
                >
                  <Text style={styles.undoGroupCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para deshacer división de mesa */}
        <Modal
          visible={showUndoSplitModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUndoSplitModal(false)}
        >
          <View style={styles.undoGroupModalOverlay}>
            <View style={styles.undoGroupModalContent}>
              <View style={styles.undoGroupModalHeader}>
                <Text style={styles.undoGroupModalTitle}>{selectedSplitTable?.name}</Text>
                <TouchableOpacity onPress={() => setShowUndoSplitModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.undoGroupModalBody}>
                <View style={styles.groupBadge}>
                  <Scissors size={20} color="#F59E0B" />
                  <Text style={[styles.groupBadgeText, { color: '#F59E0B' }]}>Mesa Dividida</Text>
                </View>

                <Text style={styles.undoGroupModalNote}>
                  Esta es una mesa temporal creada al dividir una mesa. Puedes añadir una reserva o deshacer la división.
                </Text>

                <TouchableOpacity
                  style={styles.undoGroupAddReservationButton}
                  onPress={() => {
                    if (selectedSplitTable) {
                      setShowUndoSplitModal(false);
                      handleAddReservationToTable(selectedSplitTable);
                    }
                  }}
                >
                  <Plus size={18} color="#fff" />
                  <Text style={styles.undoGroupAddReservationText}>Añadir Reserva</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.undoGroupConfirmButton,
                    { backgroundColor: '#F59E0B' },
                    undoSplitMutation.isPending && styles.undoGroupConfirmButtonDisabled
                  ]}
                  onPress={handleUndoSplit}
                  disabled={undoSplitMutation.isPending}
                >
                  <Unlink size={18} color="#fff" />
                  <Text style={styles.undoGroupConfirmText}>
                    {undoSplitMutation.isPending ? 'Deshaciendo...' : 'Deshacer División'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.undoGroupCancelButton}
                  onPress={() => setShowUndoSplitModal(false)}
                >
                  <Text style={styles.undoGroupCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Lista de espera */}
        <Modal
          visible={showWaitlistModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowWaitlistModal(false);
            setSelectedWaitlistEntry(null);
            setWaitlistAssignLocation('');
            setWaitlistAssignTableId('');
            setWaitlistAssignTime('');
          }}
        >
          <View style={styles.waitlistModalOverlay}>
            <View style={styles.waitlistModalContent}>
              <View style={styles.waitlistModalHeader}>
                <View style={styles.waitlistModalHeaderLeft}>
                  <ListChecks size={20} color="#0EA5E9" />
                  <View>
                    <Text style={styles.waitlistModalTitle}>
                      {selectedWaitlistEntry ? 'Asignar Mesa' : 'Lista de Espera'}
                    </Text>
                    <Text style={styles.waitlistModalSubtitle}>{formatDisplayDate()}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedWaitlistEntry) {
                      setSelectedWaitlistEntry(null);
                      setWaitlistAssignLocation('');
                      setWaitlistAssignTableId('');
                      setWaitlistAssignTime('');
                    } else {
                      setShowWaitlistModal(false);
                    }
                  }}
                >
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {!selectedWaitlistEntry ? (
                <ScrollView style={styles.waitlistModalScroll} showsVerticalScrollIndicator={false}>
                  {waitlistQuery.isLoading ? (
                    <View style={styles.waitlistEmptyState}>
                      <ActivityIndicator size="large" color="#0EA5E9" />
                      <Text style={styles.waitlistEmptyText}>Cargando lista de espera...</Text>
                    </View>
                  ) : waitlistEntries.length === 0 ? (
                    <View style={styles.waitlistEmptyState}>
                      <ListChecks size={48} color="#CBD5E1" />
                      <Text style={styles.waitlistEmptyText}>No hay solicitudes de lista de espera para hoy</Text>
                    </View>
                  ) : (
                    waitlistEntries.map((entry: any) => (
                      <View key={entry.id} style={styles.waitlistEntryCard}>
                        <View style={styles.waitlistEntryHeader}>
                          <View style={styles.waitlistEntryGuestsBadge}>
                            <Users size={14} color="#0EA5E9" />
                            <Text style={styles.waitlistEntryGuestsText}>
                              {entry.needs_high_chair && entry.high_chair_count > 0
                                ? `${entry.guests - entry.high_chair_count} adultos + ${entry.high_chair_count} trona${entry.high_chair_count !== 1 ? 's' : ''}`
                                : `${entry.guests} pax`}
                            </Text>
                          </View>
                          {entry.preferred_time && (
                            <TouchableOpacity
                              style={styles.waitlistEntryTimeBadge}
                              onPress={() => {
                                setEditingWaitlistTime(entry);
                                setEditWaitlistNewTime(entry.preferred_time || '');
                              }}
                              activeOpacity={0.7}
                            >
                              <Clock size={13} color="#6B7280" />
                              <Text style={styles.waitlistEntryTimeText}>Pref: {entry.preferred_time}</Text>
                              <Edit2 size={10} color="#9CA3AF" />
                            </TouchableOpacity>
                          )}
                          {!entry.preferred_time && (
                            <TouchableOpacity
                              style={[styles.waitlistEntryTimeBadge, { borderStyle: 'dashed' as const, borderWidth: 1, borderColor: '#CBD5E1' }]}
                              onPress={() => {
                                setEditingWaitlistTime(entry);
                                setEditWaitlistNewTime(timeSlots[0]?.time || '13:00');
                              }}
                              activeOpacity={0.7}
                            >
                              <Clock size={13} color="#9CA3AF" />
                              <Text style={[styles.waitlistEntryTimeText, { color: '#9CA3AF' }]}>Añadir hora</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {entry.location_id && locationsQuery.data && (() => {
                          const loc = (locationsQuery.data as any[]).find((l: any) => l.id === entry.location_id);
                          return loc ? (
                            <View style={styles.waitlistEntryLocationRow}>
                              <MapPin size={12} color="#8B5CF6" />
                              <Text style={styles.waitlistEntryLocationText}>{loc.name}</Text>
                            </View>
                          ) : null;
                        })()}
                        <Text style={styles.waitlistEntryName}>{entry.client_name}</Text>
                        <Text style={styles.waitlistEntryPhone}>{entry.client_phone}</Text>
                        {entry.notes ? (
                          <Text style={styles.waitlistEntryNotes}>{entry.notes}</Text>
                        ) : null}
                        <View style={styles.waitlistEntryExtras}>
                          {entry.needs_high_chair && entry.high_chair_count > 0 && (
                            <View style={styles.waitlistEntryExtraChip}>
                              <Baby size={12} color="#D97706" />
                              <Text style={styles.waitlistEntryExtraText}>{entry.high_chair_count} trona{entry.high_chair_count !== 1 ? 's' : ''}</Text>
                            </View>
                          )}
                          {entry.needs_stroller && (
                            <View style={styles.waitlistEntryExtraChip}>
                              <ShoppingCart size={12} color="#10B981" />
                              <Text style={styles.waitlistEntryExtraText}>Carrito</Text>
                            </View>
                          )}
                          {entry.has_pets && (
                            <View style={styles.waitlistEntryExtraChip}>
                              <Dog size={12} color="#EC4899" />
                              <Text style={styles.waitlistEntryExtraText}>Mascota</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.waitlistContactButtons}>
                          <TouchableOpacity
                            style={styles.waitlistContactCallButton}
                            onPress={() => handleCallClient(entry.client_phone)}
                            activeOpacity={0.7}
                          >
                            <Phone size={13} color="#fff" />
                            <Text style={styles.waitlistContactButtonText}>Llamar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.waitlistContactWhatsAppButton}
                            onPress={() => handleWhatsAppClient(entry.client_phone)}
                            activeOpacity={0.7}
                          >
                            <MessageCircle size={13} color="#fff" />
                            <Text style={styles.waitlistContactButtonText}>WhatsApp</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.waitlistEntryActions}>
                          <TouchableOpacity
                            style={styles.waitlistCancelEntryButton}
                            onPress={() => {
                              const confirmCancel = () => {
                                cancelWaitlistMutation.mutate({ id: entry.id, clientPhone: entry.client_phone });
                              };
                              if (Platform.OS === 'web') {
                                if (window.confirm('¿Cancelar esta solicitud de lista de espera?')) confirmCancel();
                              } else {
                                Alert.alert('Cancelar solicitud', '¿Cancelar esta solicitud de lista de espera?', [
                                  { text: 'No', style: 'cancel' },
                                  { text: 'Sí, cancelar', style: 'destructive', onPress: confirmCancel },
                                ]);
                              }
                            }}
                            disabled={cancelWaitlistMutation.isPending}
                            activeOpacity={0.7}
                          >
                            <X size={14} color="#EF4444" />
                            <Text style={styles.waitlistCancelEntryText}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.waitlistAssignButton}
                            onPress={() => {
                              setSelectedWaitlistEntry(entry);
                              const defaultLoc = selectedLocation || locationsQuery.data?.[0]?.id || '';
                              setWaitlistAssignLocation(defaultLoc);
                              setWaitlistAssignTableId('');
                              setWaitlistAssignTime(entry.preferred_time || (timeSlots[0]?.time || ''));
                            }}
                            activeOpacity={0.8}
                          >
                            <MapPin size={14} color="#fff" />
                            <Text style={styles.waitlistAssignButtonText}>Asignar mesa</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              ) : (
                <ScrollView style={styles.waitlistModalScroll} showsVerticalScrollIndicator={false}>
                  {/* Entry summary */}
                  <View style={styles.waitlistAssignSummary}>
                    <Text style={styles.waitlistAssignSummaryName}>{selectedWaitlistEntry.client_name}</Text>
                    <View style={styles.waitlistAssignSummaryRow}>
                      <View style={styles.waitlistAssignSummaryChip}>
                        <Users size={13} color="#0EA5E9" />
                        <Text style={styles.waitlistAssignSummaryChipText}>{selectedWaitlistEntry.guests} pax</Text>
                      </View>
                      {selectedWaitlistEntry.preferred_time && (
                        <View style={styles.waitlistAssignSummaryChip}>
                          <Clock size={13} color="#6B7280" />
                          <Text style={styles.waitlistAssignSummaryChipText}>Pref: {selectedWaitlistEntry.preferred_time}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Time selection */}
                  <Text style={styles.waitlistAssignSectionTitle}>1. Selecciona el horario</Text>
                  <View style={styles.waitlistTimeSlotsGrid}>
                    {timeSlots.length === 0 ? (
                      <Text style={styles.waitlistNoSlotsText}>No hay horarios disponibles en este turno</Text>
                    ) : (
                      timeSlots.map((slot) => {
                        const isSelected = waitlistAssignTime === slot.time;
                        const isFull = slot.reservedGuests >= slot.maxGuests;
                        return (
                          <TouchableOpacity
                            key={slot.time}
                            style={[
                              styles.waitlistTimeSlot,
                              isSelected && styles.waitlistTimeSlotSelected,
                              isFull && !isSelected && styles.waitlistTimeSlotFull,
                            ]}
                            onPress={() => {
                              setWaitlistAssignTime(slot.time);
                              setWaitlistAssignTableId('');
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.waitlistTimeSlotTime, isSelected && styles.waitlistTimeSlotTimeSelected, isFull && !isSelected && styles.waitlistTimeSlotTimeFull]}>
                              {slot.time}
                            </Text>
                            <Text style={[styles.waitlistTimeSlotCap, isSelected && styles.waitlistTimeSlotCapSelected]}>
                              {slot.reservedGuests}/{slot.maxGuests}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>

                  {/* Location selection */}
                  <Text style={styles.waitlistAssignSectionTitle}>2. Selecciona la ubicación</Text>
                  <View style={styles.waitlistLocationRow}>
                    {locationsQuery.data?.map((loc: any) => (
                      <TouchableOpacity
                        key={loc.id}
                        style={[
                          styles.waitlistLocationChip,
                          waitlistAssignLocation === loc.id && styles.waitlistLocationChipSelected,
                        ]}
                        onPress={() => {
                          setWaitlistAssignLocation(loc.id);
                          setWaitlistAssignTableId('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.waitlistLocationChipText,
                          waitlistAssignLocation === loc.id && styles.waitlistLocationChipTextSelected,
                        ]}>
                          {loc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Table selection */}
                  {waitlistAssignLocation ? (
                    <>
                      <Text style={styles.waitlistAssignSectionTitle}>3. Selecciona la mesa</Text>
                      {waitlistAssignTime ? (
                        <Text style={styles.waitlistAssignHint}>
                          {waitlistAvailableTablesQuery.isLoading
                            ? 'Comprobando disponibilidad real...'
                            : `${waitlistFreeTables.length} mesa${waitlistFreeTables.length !== 1 ? 's' : ''} libre${waitlistFreeTables.length !== 1 ? 's' : ''} a las ${waitlistAssignTime}`}
                        </Text>
                      ) : (
                        <Text style={styles.waitlistAssignHint}>Selecciona primero un horario</Text>
                      )}
                      {waitlistSelectedSlot && selectedWaitlistEntry && (waitlistSelectedSlot.reservedGuests + selectedWaitlistEntry.guests) > waitlistSelectedSlot.maxGuests ? (
                        <View style={styles.waitlistCapacityWarning}>
                          <AlertTriangle size={16} color="#92400E" />
                          <Text style={styles.waitlistCapacityWarningText}>
                            {(() => {
                              const total = waitlistSelectedSlot.reservedGuests + selectedWaitlistEntry.guests;
                              const expansion = total - waitlistSelectedSlot.maxGuests;
                              return `Turno ${waitlistSelectedSlot.time} lleno (${waitlistSelectedSlot.reservedGuests}/${waitlistSelectedSlot.maxGuests} pax). Para añadir ${selectedWaitlistEntry.guests} comensales hay que ampliar el máximo en ${expansion} pax (${waitlistSelectedSlot.maxGuests} → ${total} pax). Si confirmas, el sistema lo hará automáticamente.`;
                            })()}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.waitlistTablesGrid}>
                        {(waitlistAssignTime ? waitlistAssignTables : waitlistAssignTables).map((table: any) => {
                          const isSelected = waitlistAssignTableId === table.id;
                          const isFree = waitlistFreeTables.some((t: any) => t.id === table.id);
                          const isDisabled = !!waitlistAssignTime && !isFree;
                          return (
                            <TouchableOpacity
                              key={table.id}
                              style={[
                                styles.waitlistTableOption,
                                isSelected && styles.waitlistTableOptionSelected,
                                isDisabled && styles.waitlistTableOptionOccupied,
                              ]}
                              onPress={() => {
                                if (isDisabled) {
                                  return;
                                }
                                setWaitlistAssignTableId(isSelected ? '' : table.id);
                              }}
                              activeOpacity={0.7}
                              disabled={isDisabled}
                            >
                              <Text style={[
                                styles.waitlistTableName,
                                isSelected && styles.waitlistTableNameSelected,
                              ]}>
                                {table.name}
                              </Text>
                              <Text style={styles.waitlistTableCap}>
                                {table.minCapacity || 1}–{table.maxCapacity || table.capacity} pax
                              </Text>
                              {!isFree && waitlistAssignTime && (
                                <Text style={styles.waitlistTableOccupied}>Ocupada</Text>
                              )}
                              {isSelected && (
                                <View style={styles.waitlistTableCheck}>
                                  <Check size={13} color="#fff" />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  ) : null}

                  <View style={{ height: 20 }} />
                </ScrollView>
              )}

              {selectedWaitlistEntry && (
                <View style={styles.waitlistAssignFooter}>
                  <TouchableOpacity
                    style={styles.waitlistAssignBackButton}
                    onPress={() => {
                      setSelectedWaitlistEntry(null);
                      setWaitlistAssignLocation('');
                      setWaitlistAssignTableId('');
                      setWaitlistAssignTime('');
                    }}
                  >
                    <ChevronLeft size={16} color="#6B7280" />
                    <Text style={styles.waitlistAssignBackText}>Volver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.waitlistAssignConfirmButton,
                      (!waitlistAssignTableId || !waitlistAssignTime || createFromWaitlistMutation.isPending) && styles.waitlistAssignConfirmButtonDisabled,
                    ]}
                    onPress={handleAssignWaitlist}
                    disabled={!waitlistAssignTableId || !waitlistAssignTime || createFromWaitlistMutation.isPending}
                    activeOpacity={0.85}
                  >
                    {createFromWaitlistMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Check size={16} color="#fff" />
                    )}
                    <Text style={styles.waitlistAssignConfirmText}>
                      {createFromWaitlistMutation.isPending ? 'Creando reserva...' : 'Confirmar y crear reserva'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {!selectedWaitlistEntry && (
                <TouchableOpacity
                  style={styles.waitlistCloseButton}
                  onPress={() => setShowWaitlistModal(false)}
                >
                  <Text style={styles.waitlistCloseText}>Cerrar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal para cambiar hora preferida de lista de espera */}
        <Modal
          visible={editingWaitlistTime !== null}
          transparent
          animationType="fade"
          onRequestClose={() => { setEditingWaitlistTime(null); setEditWaitlistNewTime(''); }}
        >
          <View style={styles.editModalOverlay}>
            <View style={[styles.editModalContent, { maxWidth: 360 }]}>
              <Text style={styles.editModalTitle}>Cambiar Hora Preferida</Text>
              {editingWaitlistTime && (
                <Text style={styles.editModalSubtitle}>
                  {editingWaitlistTime.client_name} · {editingWaitlistTime.guests} pax
                </Text>
              )}
              <View style={styles.waitlistTimeSlotsGrid}>
                {timeSlots.map((slot) => {
                  const isSelected = editWaitlistNewTime === slot.time;
                  return (
                    <TouchableOpacity
                      key={slot.time}
                      style={[
                        styles.waitlistTimeSlot,
                        isSelected && styles.waitlistTimeSlotSelected,
                      ]}
                      onPress={() => setEditWaitlistNewTime(slot.time)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.waitlistTimeSlotTime, isSelected && styles.waitlistTimeSlotTimeSelected]}>
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={styles.editModalCancelButton}
                  onPress={() => { setEditingWaitlistTime(null); setEditWaitlistNewTime(''); }}
                >
                  <Text style={styles.editModalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editModalSaveButton, (!editWaitlistNewTime || updateWaitlistTimeMutation.isPending) && { opacity: 0.5 }]}
                  onPress={() => {
                    if (editingWaitlistTime && editWaitlistNewTime) {
                      updateWaitlistTimeMutation.mutate({
                        id: editingWaitlistTime.id,
                        preferredTime: editWaitlistNewTime,
                      });
                    }
                  }}
                  disabled={!editWaitlistNewTime || updateWaitlistTimeMutation.isPending}
                >
                  <Check size={18} color="#fff" />
                  <Text style={styles.editModalSaveText}>
                    {updateWaitlistTimeMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para cambiar hora de reserva */}
        <Modal
          visible={showChangeTimeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowChangeTimeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cambiar Hora</Text>
                <TouchableOpacity onPress={() => setShowChangeTimeModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              {selectedReservation && (
                <View style={styles.changeTimeInfoBar}>
                  <Text style={styles.changeTimeInfoText}>
                    {selectedReservation.clientName} · {selectedReservation.guests} pax
                  </Text>
                  <Text style={styles.changeTimeCurrentTime}>
                    Hora actual: {String(selectedReservation.time.hour).padStart(2, '0')}:{String(selectedReservation.time.minute).padStart(2, '0')}
                  </Text>
                </View>
              )}
              <Text style={styles.changeTimeHint}>🔴 En rosa: excedería el aforo del turno</Text>
              <ScrollView style={styles.changeTimeSlotsList} showsVerticalScrollIndicator={false}>
                {timeSlots.map((slot, index) => {
                  const currentResTimeStr = selectedReservation
                    ? `${String(selectedReservation.time.hour).padStart(2, '0')}:${String(selectedReservation.time.minute).padStart(2, '0')}`
                    : '';
                  const isCurrent = slot.time === currentResTimeStr;
                  const guestsForSlot = selectedReservation?.guests || 0;
                  const wouldExceed = !isCurrent && (slot.reservedGuests + guestsForSlot) > slot.maxGuests;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.changeTimeSlotItem,
                        isCurrent && styles.changeTimeSlotItemCurrent,
                        wouldExceed && styles.changeTimeSlotItemOver,
                      ]}
                      onPress={() => !isCurrent && !updateReservationMutation.isPending && handleSelectNewTime(slot)}
                      activeOpacity={isCurrent ? 1 : 0.7}
                    >
                      <Text style={[
                        styles.changeTimeSlotTime,
                        isCurrent && styles.changeTimeSlotTimeCurrent,
                        wouldExceed && styles.changeTimeSlotTimeOver,
                      ]}>
                        {slot.time}
                      </Text>
                      <View style={styles.changeTimeSlotRight}>
                        <Text style={[
                          styles.changeTimeSlotCapacity,
                          wouldExceed && styles.changeTimeSlotCapacityOver,
                        ]}>
                          {isCurrent ? slot.reservedGuests : slot.reservedGuests + guestsForSlot}/{slot.maxGuests} pax
                        </Text>
                        {isCurrent && (
                          <View style={styles.changeTimeCurrentBadge}>
                            <Text style={styles.changeTimeCurrentBadgeText}>Actual</Text>
                          </View>
                        )}
                        {wouldExceed && (
                          <View style={styles.changeTimeOverBadge}>
                            <Text style={styles.changeTimeOverBadgeText}>+{(slot.reservedGuests + guestsForSlot) - slot.maxGuests}</Text>
                          </View>
                        )}
                        {updateReservationMutation.isPending && !isCurrent && (
                          <ActivityIndicator size="small" color="#8B5CF6" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.changeTimeFooter}>
                <TouchableOpacity
                  style={styles.changeTimeCancelButton}
                  onPress={() => setShowChangeTimeModal(false)}
                >
                  <Text style={styles.changeTimeCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para modificar comensales */}
        <Modal
          visible={showChangeGuestsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowChangeGuestsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Modificar Comensales</Text>
                <TouchableOpacity onPress={() => setShowChangeGuestsModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.changeGuestsSelector}>
                  <TouchableOpacity
                    style={[styles.changeGuestsButton, changeGuestsValue <= 1 && styles.changeGuestsButtonDisabled]}
                    onPress={() => setChangeGuestsValue(Math.max(1, changeGuestsValue - 1))}
                    disabled={changeGuestsValue <= 1}
                  >
                    <Text style={styles.changeGuestsButtonText}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.changeGuestsDisplay}>
                    <Users size={22} color="#8B5CF6" />
                    <Text style={styles.changeGuestsCount}>{changeGuestsValue}</Text>
                    <Text style={styles.changeGuestsLabel}>pax</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeGuestsButton}
                    onPress={() => setChangeGuestsValue(changeGuestsValue + 1)}
                  >
                    <Text style={styles.changeGuestsButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                {changeGuestsTableData && (
                  <Text style={styles.changeGuestsTableInfo}>
                    Mesa: {(changeGuestsTableData as any).name} · {(changeGuestsTableData as any).minCapacity || (changeGuestsTableData as any).min_capacity || 1}-{(changeGuestsTableData as any).maxCapacity || (changeGuestsTableData as any).max_capacity || (changeGuestsTableData as any).capacity} pax
                  </Text>
                )}
                {tablesForReducedGuests.length > 0 && selectedReservation && changeGuestsValue < (selectedReservation.guests || 0) && (
                  <View style={styles.releaseTableSection}>
                    <View style={styles.releaseTableAlert}>
                      <Unlink size={14} color="#1E40AF" />
                      <Text style={styles.releaseTableAlertText}>
                        Con {changeGuestsValue} pax puedes liberar alguna mesa del grupo. Elige qué mesa quieres liberar:
                      </Text>
                    </View>
                    {tablesForReducedGuests.map((releaseTable: any) => {
                      const rawIds = selectedReservation?.tableIds;
                      const currentTableIds: string[] = Array.isArray(rawIds) ? rawIds : (typeof rawIds === 'string' ? JSON.parse(rawIds) : []);
                      const remainingTableIds = currentTableIds.filter((id: string) => id !== releaseTable.id);
                      return (
                      <TouchableOpacity
                        key={releaseTable.id}
                        style={styles.releaseTableButton}
                        onPress={async () => {
                          if (!selectedReservation) return;
                          try {
                            await updateTableMutation.mutateAsync({
                              reservationId: selectedReservation.id,
                              tableIds: remainingTableIds,
                              locationId: selectedReservation.locationId,
                            });
                            await updateReservationMutation.mutateAsync({
                              reservationId: selectedReservation.id,
                              guests: changeGuestsValue,
                              needsHighChair: changeNeedsHighChair,
                              needsStroller: changeNeedsStroller,
                              hasPets: changeHasPets,
                              modifiedBy: 'restaurant',
                            });
                            setShowChangeGuestsModal(false);
                          } catch (err: any) {
                            Alert.alert('Error', err?.message || 'No se pudo actualizar');
                          }
                        }}
                        disabled={updateTableMutation.isPending || updateReservationMutation.isPending}
                      >
                        <Unlink size={16} color="#fff" />
                        <Text style={styles.releaseTableButtonText}>
                          Liberar {releaseTable.name} ({releaseTable.minCapacity || 1}–{releaseTable.maxCapacity || releaseTable.capacity} pax)
                        </Text>
                      </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <View style={styles.changeGuestsExtras}>
                  {((changeGuestsTableData as any)?.allows_high_chairs || (changeGuestsTableData as any)?.allowsHighChairs || ((changeGuestsTableData as any)?.available_high_chairs || (changeGuestsTableData as any)?.availableHighChairs || 0) > 0) && (
                    <View style={styles.changeGuestsToggleRow}>
                      <TouchableOpacity
                        style={[styles.changeGuestsToggle, changeNeedsHighChair && styles.changeGuestsToggleActive]}
                        onPress={() => setChangeNeedsHighChair(!changeNeedsHighChair)}
                      >
                        <Baby size={18} color={changeNeedsHighChair ? '#fff' : '#9CA3AF'} />
                        <Text style={[styles.changeGuestsToggleText, changeNeedsHighChair && styles.changeGuestsToggleTextActive]}>Trona(s)</Text>
                      </TouchableOpacity>
                      {changeNeedsHighChair && (
                        <TextInput
                          style={styles.changeGuestsHighChairInput}
                          value={changeHighChairCount}
                          onChangeText={setChangeHighChairCount}
                          keyboardType="number-pad"
                          placeholder="1"
                          placeholderTextColor="#9CA3AF"
                        />
                      )}
                    </View>
                  )}
                  {((changeGuestsTableData as any)?.allows_strollers || (changeGuestsTableData as any)?.allowsStroller || (changeGuestsTableData as any)?.allowsStrollers) && (
                    <TouchableOpacity
                      style={[styles.changeGuestsToggle, changeNeedsStroller && styles.changeGuestsToggleActive]}
                      onPress={() => setChangeNeedsStroller(!changeNeedsStroller)}
                    >
                      <ShoppingCart size={18} color={changeNeedsStroller ? '#fff' : '#9CA3AF'} />
                      <Text style={[styles.changeGuestsToggleText, changeNeedsStroller && styles.changeGuestsToggleTextActive]}>Carrito</Text>
                    </TouchableOpacity>
                  )}
                  {((changeGuestsTableData as any)?.allows_pets || (changeGuestsTableData as any)?.allowsPets) && (
                    <TouchableOpacity
                      style={[styles.changeGuestsToggle, changeHasPets && styles.changeGuestsToggleActive]}
                      onPress={() => setChangeHasPets(!changeHasPets)}
                    >
                      <Dog size={18} color={changeHasPets ? '#fff' : '#9CA3AF'} />
                      <Text style={[styles.changeGuestsToggleText, changeHasPets && styles.changeGuestsToggleTextActive]}>Mascota</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
              <View style={styles.changeGuestsFooter}>
                <TouchableOpacity
                  style={styles.changeGuestsCancelButton}
                  onPress={() => setShowChangeGuestsModal(false)}
                >
                  <Text style={styles.changeGuestsCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.changeGuestsSaveButton, updateReservationMutation.isPending && styles.changeGuestsSaveButtonDisabled]}
                  onPress={handleSaveGuestsChange}
                  disabled={updateReservationMutation.isPending}
                >
                  <Text style={styles.changeGuestsSaveText}>
                    {updateReservationMutation.isPending ? 'Guardando...' : 'Guardar'}
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
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  locationsRowWithWaitlist: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
  waitlistHeaderButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  waitlistHeaderButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  waitlistHeaderBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  waitlistHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#0EA5E9',
  },
  waitlistModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  waitlistModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 8,
  },
  waitlistModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  waitlistModalHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 10,
  },
  waitlistModalTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#0F172A',
  },
  waitlistModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  waitlistModalScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  waitlistEmptyState: {
    alignItems: 'center' as const,
    paddingVertical: 48,
    gap: 12,
  },
  waitlistEmptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center' as const,
    paddingHorizontal: 24,
  },
  waitlistEntryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  waitlistEntryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  waitlistEntryGuestsBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  waitlistEntryGuestsText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#0369A1',
  },
  waitlistEntryTimeBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  waitlistEntryTimeText: {
    fontSize: 12,
    color: '#475569',
  },
  waitlistEntryName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
    marginBottom: 2,
  },
  waitlistEntryPhone: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  waitlistEntryNotes: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic' as const,
    marginBottom: 6,
  },
  waitlistEntryExtras: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 10,
  },
  waitlistEntryExtraChip: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  waitlistEntryExtraText: {
    fontSize: 11,
    color: '#475569',
  },
  waitlistEntryLocationRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  waitlistEntryLocationText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500' as const,
  },
  waitlistContactButtons: {
    flexDirection: 'row' as const,
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  waitlistContactCallButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#10B981',
  },
  waitlistContactWhatsAppButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#059669',
  },
  waitlistContactButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  waitlistEntryActions: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 2,
  },
  waitlistCancelEntryButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F2',
  },
  waitlistCancelEntryText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  waitlistAssignButton: {
    flex: 2,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0EA5E9',
  },
  waitlistAssignButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  waitlistAssignSummary: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  waitlistAssignSummaryName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 6,
  },
  waitlistAssignSummaryRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  waitlistAssignSummaryChip: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  waitlistAssignSummaryChipText: {
    fontSize: 12,
    color: '#0369A1',
  },
  waitlistAssignSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  waitlistAssignHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  waitlistCapacityWarning: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  waitlistCapacityWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#92400E',
    fontWeight: '600' as const,
  },
  waitlistTimeSlotsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  waitlistTimeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minWidth: 70,
    alignItems: 'center' as const,
  },
  waitlistTimeSlotSelected: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0284C7',
  },
  waitlistTimeSlotFull: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  waitlistTimeSlotTime: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
  },
  waitlistTimeSlotTimeSelected: {
    color: '#fff',
  },
  waitlistTimeSlotTimeFull: {
    color: '#EF4444',
  },
  waitlistTimeSlotCap: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  waitlistTimeSlotCapSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  waitlistNoSlotsText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  waitlistLocationRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  waitlistLocationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  waitlistLocationChipSelected: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0284C7',
  },
  waitlistLocationChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#374151',
  },
  waitlistLocationChipTextSelected: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  waitlistTablesGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  waitlistTableOption: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    minWidth: 90,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  waitlistTableOptionSelected: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0284C7',
  },
  waitlistTableOptionOccupied: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    opacity: 0.7,
  },
  waitlistTableName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#374151',
  },
  waitlistTableNameSelected: {
    color: '#fff',
  },
  waitlistTableCap: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  waitlistTableOccupied: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 2,
  },
  waitlistTableCheck: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    backgroundColor: '#0284C7',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  waitlistAssignFooter: {
    flexDirection: 'row' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  waitlistAssignBackButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  waitlistAssignBackText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  waitlistAssignConfirmButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
  },
  waitlistAssignConfirmButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  waitlistAssignConfirmText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  waitlistCloseButton: {
    marginHorizontal: 16,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center' as const,
  },
  waitlistCloseText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  headerDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  shiftSelectorFullScreen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  shiftSelectorHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shiftSelectorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#4B5563',
    marginTop: 12,
    textTransform: 'capitalize',
  },
  loadingShiftsCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingShiftsText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
  },
  emptyStateCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyTextBig: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  shiftsButtonsContainer: {
    width: '100%',
    gap: 16,
  },
  selectShiftLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  shiftButtonLarge: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  shiftButtonGradientLarge: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  shiftButtonNameLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  shiftButtonTimeLarge: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500' as const,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  refreshButtonDisabled: {
    backgroundColor: '#86EFAC',
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  refreshIconSpinning: {
    opacity: 0.7,
  },
  shiftHeader: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  shiftHeaderName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  shiftHeaderTime: {
    fontSize: 14,
    color: '#8B5CF6',
    marginTop: 4,
  },
  timeSlotsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  timeSlotsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeSlotTime: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1F2937',
    minWidth: 60,
  },
  timeSlotStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeSlotMaxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeSlotLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  timeSlotValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  timeSlotResContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
  },
  timeSlotResActive: {
    backgroundColor: '#D1FAE5',
  },
  timeSlotResFull: {
    backgroundColor: '#FEE2E2',
  },
  timeSlotResValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  timeSlotResValueActive: {
    color: '#059669',
  },
  timeSlotResValueFull: {
    color: '#DC2626',
  },
  timeSlotTotalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#8B5CF6',
    backgroundColor: '#F5F3FF',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  timeSlotTotalsLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#8B5CF6',
    letterSpacing: 1,
    minWidth: 60,
  },
  timeSlotTotalMaxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  timeSlotTotalResContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    minWidth: 70,
  },
  timeSlotTotalsTag: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  timeSlotTotalsValue: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#8B5CF6',
  },
  timeSlotTotalsResValue: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#059669',
  },
  locationsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  locationButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  locationButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  locationButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4B5563',
  },
  locationButtonTextActive: {
    color: '#fff',
  },
  tablesContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  tableCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
  },
  tableCardFree: {
    backgroundColor: '#E5E7EB',
  },
  tableCardBlocked: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  tableCardReserved: {
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  multiResBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiResBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  tableReservationsContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  tableResEntry: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 3,
  },
  tableResTime: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  tableResPax: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  tableResDetail: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 1,
  },
  tableResHighChair: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 1,
  },
  tableResStatusBadge: {
    marginTop: 4,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start' as const,
  },
  tableResStatusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#4B5563',
  },
  tableNameReserved: {
    color: '#065F46',
  },
  tableNameBlocked: {
    color: '#DC2626',
  },
  tableClientName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#111827',
    flex: 1,
    textAlign: 'right' as const,
    marginLeft: 6,
  },
  groupedNamesContainer: {
    marginTop: 4,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107,114,128,0.2)',
    paddingTop: 4,
  },
  groupedNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  groupedNameText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700' as const,
  },
  groupedNameTextInProgress: {
    color: '#FFFFFF',
  },
  blockedIndicator: {
    backgroundColor: '#FEE2E2',
    padding: 4,
    borderRadius: 6,
  },
  tableBlockedInfo: {
    marginTop: 'auto',
    paddingTop: 10,
  },
  tableBlockedLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#DC2626',
    textAlign: 'center',
  },
  tableBlockedHint: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 4,
    textAlign: 'center',
  },
  tableCapacity: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tableCapacityReserved: {
    color: '#059669',
  },
  tableReservationInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.3)',
    gap: 2,
  },
  tableReservationTime: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#065F46',
  },
  tableGuestsPax: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#065F46',
    marginTop: 4,
  },
  tableGuestsDetail: {
    fontSize: 12,
    color: '#047857',
  },
  tableHighChairsDetail: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600' as const,
  },
  tableFreeLabel: {
    marginTop: 'auto',
    paddingTop: 10,
  },
  tableFreeLabelText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptyTablesState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTablesText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    color: '#6B7280',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
    textAlign: 'center',
  },
  editModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  editModalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 20,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editModalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  editModalCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  editModalSaveButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editModalSaveText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  modalScroll: {
    padding: 20,
  },
  reservationDetailCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reservationClientName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  reservationPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  reservationId: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  reservationInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  reservationInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reservationInfoText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500' as const,
  },
  notesContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#92400E',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#78350F',
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  statusConfirmed: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusActive: {
    backgroundColor: '#059669',
  },
  statusAdded: {
    backgroundColor: '#E0E7FF',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonWhatsapp: {
    backgroundColor: '#25D366',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vipCrownIndicator: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    backgroundColor: '#FDF2F8',
    padding: 4,
    borderRadius: 8,
  },
  tableFreeHint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  editReservationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  editReservationButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  cancelReservationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  cancelReservationButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  vipFavoriteNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  vipFavoriteNoteText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  freeTableModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  freeTableModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  freeTableModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  freeTableModalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  freeTableModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  freeTableModalButtons: {
    gap: 12,
  },
  freeTableBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
  },
  freeTableAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  freeTableButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  freeTableCancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  freeTableCancelText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  editInfoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  editInfoName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 8,
  },
  editInfoDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  editSectionHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
    marginTop: -8,
  },
  editLocationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  editLocationOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  editLocationOptionSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  editLocationText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#4B5563',
  },
  editLocationTextSelected: {
    color: '#fff',
  },
  editTablesList: {
    gap: 10,
  },
  editTableOption: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  editTableOptionSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: '#8B5CF6',
  },
  editTableName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    flex: 1,
  },
  editTableNameSelected: {
    color: '#7C3AED',
  },
  editTableCapacity: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 12,
  },
  editTableCheck: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editNoTables: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  editNoTablesText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  editModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  editCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  editSaveButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editSaveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  editSaveText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  blockModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  blockModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
  },
  blockModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  blockModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  blockModalBody: {
    padding: 20,
  },
  blockTableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  blockTableName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  blockModalNote: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  blockSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4B5563',
    marginBottom: 8,
  },
  blockDurationInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 24,
  },
  blockModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  blockModalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  blockModalCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  blockModalConfirmButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  blockModalConfirmButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  blockModalConfirmText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  blockModalConfirmButtonWalkIn: {
    backgroundColor: '#8B5CF6',
  },
  blockTableCapacityLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  walkInSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  walkInSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  walkInSectionNote: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 17,
  },
  walkInInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 12,
  },
  walkInPhoneRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  walkInPrefixBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  walkInPrefixText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
  },
  walkInPhoneInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  walkInGuestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 14,
  },
  walkInGuestsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walkInGuestsBtnText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    lineHeight: 26,
  },
  walkInGuestsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
    justifyContent: 'center',
  },
  walkInGuestsCount: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  walkInGuestsPax: {
    fontSize: 13,
    color: '#6B7280',
  },
  walkInNoSlotsText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  walkInTimeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  walkInTimeSlot: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 68,
  },
  walkInTimeSlotOverCapacity: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FCA5A5',
  },
  walkInTimeSlotSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED',
  },
  walkInTimeSlotText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#374151',
  },
  walkInTimeSlotTextOver: {
    color: '#DC2626',
  },
  walkInTimeSlotTextSelected: {
    color: '#fff',
  },
  walkInTimeSlotCapacity: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  walkInTimeSlotCapacityOver: {
    color: '#EF4444',
    fontWeight: '600' as const,
  },
  walkInTimeSlotCapacitySelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  blockPrefixOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  blockPrefixOptionSelected: {
    backgroundColor: '#EDE9FE',
  },
  blockPrefixFlag: {
    fontSize: 24,
    width: 32,
    textAlign: 'center' as const,
  },
  blockPrefixInfo: {
    flex: 1,
  },
  blockPrefixCountry: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500' as const,
  },
  blockPrefixOptionText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  blockPrefixOptionTextSelected: {
    color: '#7C3AED',
    fontWeight: '700' as const,
  },
  blockPrefixCheck: {
    fontSize: 18,
    color: '#7C3AED',
    fontWeight: '700' as const,
  },
  walkInBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  walkInBadgeText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  unblockModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unblockModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  unblockModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  unblockModalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  unblockModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  blockedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  blockedStatusText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#DC2626',
  },
  unblockModalNote: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  unblockConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  unblockConfirmButtonDisabled: {
    backgroundColor: '#86EFAC',
  },
  unblockConfirmText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  unblockCancelButton: {
    paddingVertical: 12,
  },
  unblockCancelText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  editTableOptionBlocked: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    opacity: 0.7,
  },
  editTableBlockedBadge: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    backgroundColor: '#FEE2E2',
    padding: 4,
    borderRadius: 4,
  },
  editTableNameBlocked: {
    color: '#DC2626',
  },
  editTableBlockedText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600' as const,
    marginTop: 4,
  },
  editTableOptionOccupied: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  editTableNameOccupied: {
    color: '#92400E',
  },
  editTableCapacityOccupied: {
    color: '#B45309',
  },
  editTableOccupiedLabel: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600' as const,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  editTableOptionCurrent: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  editTableCurrentLabel: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600' as const,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  swapModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  swapModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  swapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  swapModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  swapModalBody: {
    padding: 20,
  },
  swapModalDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  swapModalHighlight: {
    fontWeight: '700' as const,
    color: '#8B5CF6',
  },
  swapReservationsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  swapReservationCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  swapReservationLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600' as const,
    marginBottom: 4,
    textAlign: 'center' as const,
  },
  swapReservationName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1F2937',
    textAlign: 'center' as const,
  },
  swapReservationTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  swapArrow: {
    paddingHorizontal: 8,
  },
  swapArrowText: {
    fontSize: 24,
    color: '#8B5CF6',
  },
  swapModalQuestion: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1F2937',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  swapModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  swapCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  swapCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  swapConfirmButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  swapConfirmButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  swapConfirmText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  freeTableSecondaryButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  freeTableDivideButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
  },
  freeTableGroupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  freeTableSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  splitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  splitModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  splitModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  splitModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  splitModalBody: {
    padding: 20,
  },
  splitTableInfo: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  splitTableName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#92400E',
    marginTop: 8,
  },
  splitTableCapacity: {
    fontSize: 14,
    color: '#B45309',
    marginTop: 4,
  },
  splitModalNote: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  splitCapacityInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  splitCapacityInput: {
    flex: 1,
    alignItems: 'center',
  },
  splitCapacityLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4B5563',
    marginBottom: 8,
  },
  splitCapacityField: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    width: 80,
    color: '#1F2937',
  },
  splitCapacityHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  splitCapacityDivider: {
    paddingHorizontal: 12,
  },
  splitCapacityDividerText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#D1D5DB',
  },
  splitModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  splitCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  splitCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  splitConfirmButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  splitConfirmButtonDisabled: {
    backgroundColor: '#FCD34D',
    opacity: 0.7,
  },
  splitConfirmText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  groupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  groupModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  groupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  groupModalBody: {
    padding: 20,
  },
  groupSelectedInfo: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  groupSelectedTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1E40AF',
    marginTop: 8,
  },
  groupModalNote: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  groupSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4B5563',
    marginBottom: 12,
  },
  groupErrorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  groupErrorText: {
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center' as const,
  },
  groupNoTablesMessage: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  groupNoTablesText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center' as const,
  },
  groupTablesList: {
    gap: 10,
    marginBottom: 16,
  },
  groupTableOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  groupTableOptionSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  groupTableInfo: {
    flex: 1,
  },
  groupTableName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  groupTableNameSelected: {
    color: '#1E40AF',
  },
  groupTableCapacity: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  groupTableCheck: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupSelectedSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  groupSelectedSummaryTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  groupSelectedSummaryCount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#3B82F6',
  },
  groupModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  groupCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  groupCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  groupConfirmButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  groupConfirmButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  groupConfirmText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  splitTableSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  splitTableSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#F59E0B',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  splitInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  splitInputGroup: {
    flex: 1,
  },
  splitInputLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6B7280',
    marginBottom: 6,
  },
  splitInputField: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937',
  },
  splitToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  splitToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E5E7EB',
    paddingVertical: 10,
    borderRadius: 8,
  },
  splitToggleActive: {
    backgroundColor: '#10B981',
  },
  splitToggleText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  splitToggleTextActive: {
    color: '#fff',
  },
  splitDividerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  splitDividerDash: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  splitDividerPlus: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#D1D5DB',
    paddingHorizontal: 12,
  },
  undoGroupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  undoGroupModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  undoGroupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  undoGroupModalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  undoGroupModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  groupBadgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1E40AF',
  },
  undoGroupModalNote: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  undoGroupConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  undoGroupConfirmButtonDisabled: {
    backgroundColor: '#FCD34D',
  },
  undoGroupConfirmText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  undoGroupCancelButton: {
    paddingVertical: 12,
  },
  undoGroupCancelText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  undoGroupAddReservationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  undoGroupAddReservationText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  groupCapacitySection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  groupCapacitySectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1E40AF',
    marginBottom: 12,
  },
  groupCapacityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  groupCapacityInputGroup: {
    flex: 1,
  },
  groupCapacityLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6B7280',
    marginBottom: 6,
  },
  groupCapacityInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937',
  },
  topActionSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  shiftButtonsScrollRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  shiftButtonsInlineRow: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingBottom: 4,
  },
  shiftSwitchButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center' as const,
    minWidth: 80,
  },
  shiftSwitchButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  shiftSwitchText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#4B5563',
  },
  shiftSwitchTextActive: {
    color: '#fff',
  },
  shiftSwitchTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  shiftSwitchTimeActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  dateNavContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingLeft: 12,
    flex: 1,
  },
  dateNavArrow: {
    padding: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  dateNavTodayButton: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateNavTodayText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#8B5CF6',
  },
  dateNavDisplayContainer: {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    marginLeft: 4,
  },
  dateNavDayOfWeek: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8B5CF6',
    textTransform: 'capitalize' as const,
    lineHeight: 14,
  },
  dateNavDisplay: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  timeSlotHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 4,
  },
  timeSlotHeaderTime: {
    minWidth: 60,
  },
  timeSlotColHeader: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    textAlign: 'center' as const,
    minWidth: 70,
  },
  timeSlotLibContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
  },
  timeSlotLibFull: {
    backgroundColor: '#FEE2E2',
  },
  timeSlotLibValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  timeSlotLibValueAvail: {
    color: '#059669',
  },
  timeSlotLibValueFull: {
    color: '#DC2626',
  },
  timeSlotTotalLibContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
    minWidth: 70,
  },
  timeSlotTotalsLibValue: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#059669',
  },
  reservationInfoItemClickable: {
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  changeTimeInfoBar: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  changeTimeInfoText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  changeTimeCurrentTime: {
    fontSize: 13,
    color: '#8B5CF6',
    marginTop: 2,
  },
  changeTimeHint: {
    fontSize: 12,
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  changeTimeSlotsList: {
    paddingHorizontal: 16,
    maxHeight: 400,
  },
  changeTimeSlotItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  changeTimeSlotItemCurrent: {
    backgroundColor: '#EDE9FE',
    borderColor: '#8B5CF6',
  },
  changeTimeSlotItemOver: {
    backgroundColor: '#FFF0F3',
    borderColor: '#FDA4AF',
  },
  changeTimeSlotTime: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  changeTimeSlotTimeCurrent: {
    color: '#7C3AED',
  },
  changeTimeSlotTimeOver: {
    color: '#E11D48',
  },
  changeTimeSlotRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  changeTimeSlotCapacity: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  changeTimeSlotCapacityOver: {
    color: '#E11D48',
    fontWeight: '600' as const,
  },
  changeTimeCurrentBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  changeTimeCurrentBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
  changeTimeOverBadge: {
    backgroundColor: '#FCA5A5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  changeTimeOverBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#9B1C1C',
  },
  changeTimeFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  changeTimeCancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  changeTimeCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  changeGuestsSelector: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 20,
    paddingVertical: 20,
  },
  changeGuestsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  changeGuestsButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  changeGuestsButtonText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  changeGuestsDisplay: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 100,
    justifyContent: 'center' as const,
  },
  changeGuestsCount: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#1F2937',
  },
  changeGuestsLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  changeGuestsTableInfo: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  changeGuestsExtras: {
    gap: 10,
    paddingBottom: 10,
  },
  changeGuestsToggleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  changeGuestsToggle: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  changeGuestsToggleActive: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  changeGuestsToggleText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  changeGuestsToggleTextActive: {
    color: '#fff',
  },
  changeGuestsHighChairInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    width: 60,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937',
  },
  changeGuestsFooter: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  changeGuestsCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  changeGuestsCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  changeGuestsSaveButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  changeGuestsSaveButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  changeGuestsSaveText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modifiedByRestaurantContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  modifiedByRestaurantLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    flex: 1,
  },
  modifiedByRestaurantText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500' as const,
    flex: 1,
  },
  sendNotifButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sendNotifButtonSent: {
    backgroundColor: '#9CA3AF',
  },
  sendNotifButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  editModalTabs: {
    flexDirection: 'row' as const,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 3,
    marginBottom: 4,
  },
  editModalTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  editModalTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  editModalTabText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  editModalTabTextActive: {
    color: '#1F2937',
    fontWeight: '600' as const,
  },
  editGuestsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 20,
    paddingVertical: 20,
  },
  editGuestsBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#8B5CF6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  editGuestsBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  editGuestsBtnText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    lineHeight: 34,
  },
  editGuestsDisplay: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    minWidth: 120,
    justifyContent: 'center' as const,
  },
  editGuestsCount: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#1F2937',
  },
  editGuestsPax: {
    fontSize: 14,
    color: '#6B7280',
  },
  editGuestsWarning: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: 14,
    marginTop: 8,
  },
  editGuestsWarningText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500' as const,
    marginBottom: 10,
  },
  editGuestsWarningActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  editGuestsWarningBtn: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  editGuestsWarningBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#92400E',
  },
  editTimeSlotSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#6D28D9',
  },
  addResToTableButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  addResToTableButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  releaseTableSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  releaseTableAlert: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    marginBottom: 12,
  },
  releaseTableAlertText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  releaseTableButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
  },
  releaseTableButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  editTableOptionRotationCompat: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  editTableNameRotationCompat: {
    color: '#166534',
  },
  editTableRotationLabel: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '600' as const,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  editTableOptionAvailable: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  editTableAvailableLabel: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700' as const,
    marginTop: 3,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  editTableOptionConfigurable: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  editTableConfigurableLabel: {
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
  walkInExtraTablesSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: 8,
  },
  walkInExtraTablesAlert: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 6,
  },
  walkInExtraTablesAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  walkInExtraTableOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  walkInExtraTableOptionSelected: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  walkInExtraTableName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  walkInExtraTableNameSelected: {
    color: '#065F46',
  },
  walkInExtraTableCap: {
    fontSize: 12,
    color: '#6B7280',
  },
  walkInExtraTableCheck: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  reservationTableNameBadge: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8B5CF6',
    marginTop: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
  },
  clientNotesContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  clientNotesLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#92400E',
    marginBottom: 4,
  },
  clientNotesText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  internalNotesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  internalNotesHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 6,
  },
  internalNotesLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748B',
    flex: 1,
  },
  internalNotesEditBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  internalNotesEditBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#3B82F6',
  },
  internalNotesText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  internalNotesPlaceholder: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic' as const,
  },
  tableResInternalNote: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 5,
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(194,65,12,0.15)',
    backgroundColor: 'rgba(254,215,170,0.18)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingBottom: 4,
  },
  tableResInternalNoteText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontWeight: '700' as const,
  },
  groupStepIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 0,
  },
  groupStepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  groupStepDotActive: {
    backgroundColor: '#3B82F6',
  },
  groupStepDotCompleted: {
    backgroundColor: '#10B981',
  },
  groupStepDotText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#9CA3AF',
  },
  groupStepDotTextActive: {
    color: '#fff',
  },
  groupStepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 6,
  },
  groupTimeSlotsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  groupTimeSlotOption: {
    width: '30%' as any,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  groupTimeSlotOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  groupTimeSlotOptionFull: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  groupTimeSlotText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  groupTimeSlotTextSelected: {
    color: '#1D4ED8',
  },
  groupTimeSlotTextFull: {
    color: '#DC2626',
  },
  groupTimeSlotCapacity: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  groupTimeSlotCapacitySelected: {
    color: '#3B82F6',
  },
  groupTimeSlotCheck: {
    position: 'absolute' as const,
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  groupTableOptionRotation: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  groupTableRotationLabel: {
    fontSize: 10,
    color: '#D97706',
    marginTop: 2,
    fontWeight: '500' as const,
  },
  tableResOverlapWarning: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  tableResOverlapWarningText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#DC2626',
    flex: 1,
  },
  overlapWarningCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  overlapWarningHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  overlapWarningTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#991B1B',
    letterSpacing: 0.3,
  },
  overlapWarningSubtitle: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600' as const,
    marginBottom: 6,
    lineHeight: 18,
  },
  overlapWarningDetail: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 3,
    fontWeight: '500' as const,
  },
  overlapBlockButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 10,
    alignSelf: 'flex-start' as const,
  },
  overlapUnblockButton: {
    backgroundColor: '#6B7280',
  },
  overlapBlockButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
