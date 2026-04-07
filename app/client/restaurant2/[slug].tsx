import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking, Modal } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { trpc, trpcClient, ensureWhatsAppWakeUp } from '@/lib/trpc';
import type { TimeSlot } from '@/types';
import { ExternalLink } from 'lucide-react-native';

export default function RestaurantDetails2Screen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [clientName, setClientName] = useState<string>('');
  const [phonePrefix, setPhonePrefix] = useState<string>('+34');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isExistingClient, setIsExistingClient] = useState<boolean>(false);
  const [phoneChecked, setPhoneChecked] = useState<boolean>(false);
  const [showPrefixModal, setShowPrefixModal] = useState<boolean>(false);
  const [clientVerified, setClientVerified] = useState<boolean>(false);
  const [clientBlocked, setClientBlocked] = useState<boolean>(false);
  const [blockReason, setBlockReason] = useState<string>('');
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [guests, setGuests] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);
  const [needsHighChairs, setNeedsHighChairs] = useState<boolean>(false);
  const [highChairCount, setHighChairCount] = useState<string>('1');
  const [needsStroller, setNeedsStroller] = useState<boolean>(false);
  const [hasPets, setHasPets] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [showUnavailableModal, setShowUnavailableModal] = useState<boolean>(false);
  const [selectedUnavailableTime, setSelectedUnavailableTime] = useState<string>('');
  const [showOverCapacityModal, setShowOverCapacityModal] = useState<boolean>(false);
  const [overCapacitySlotInfo, setOverCapacitySlotInfo] = useState<{ slot: any; overBy: number; maxGuests: number; newMaxGuests: number } | null>(null);
  const [isExpandingCapacity, setIsExpandingCapacity] = useState<boolean>(false);

  const [showSubmitCapacityModal, setShowSubmitCapacityModal] = useState<boolean>(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<{ fullPhone: string; dateString: string; skipConfirmation: boolean; current: number; max: number; required: number } | null>(null);

  const [showNoTablesErrorModal, setShowNoTablesErrorModal] = useState<boolean>(false);
  const [noTablesErrorMessage, setNoTablesErrorMessage] = useState<string>('');

  const [showTableGroupingModal, setShowTableGroupingModal] = useState<boolean>(false);
  const [showTableSplitModal, setShowTableSplitModal] = useState<boolean>(false);
  const [showActionSelectionModal, setShowActionSelectionModal] = useState<boolean>(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [customGroupGuests, setCustomGroupGuests] = useState<string>('');
  const [selectedTableToSplit, setSelectedTableToSplit] = useState<any>(null);
  const [splitGuestCount, setSplitGuestCount] = useState<string>('');
  const [splitTableBCapacity, setSplitTableBCapacity] = useState<string>('');
  const [splitTableBHighChairs, setSplitTableBHighChairs] = useState<string>('0');
  const [splitTableBAllowsStroller, setSplitTableBAllowsStroller] = useState<boolean>(false);
  const [splitTableBAllowsPets, setSplitTableBAllowsPets] = useState<boolean>(false);
  const [modifiedTableACapacity, setModifiedTableACapacity] = useState<string>('');
  const [modifiedTableAHighChairs, setModifiedTableAHighChairs] = useState<string>('0');
  const [modifiedTableAAllowsStroller, setModifiedTableAAllowsStroller] = useState<boolean>(false);
  const [modifiedTableAAllowsPets, setModifiedTableAAllowsPets] = useState<boolean>(false);
  const [isCreatingGroup, _setIsCreatingGroup] = useState<boolean>(false);
  const [isCreatingSplit, _setIsCreatingSplit] = useState<boolean>(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState<boolean>(false);
  const [waitlistNotes, setWaitlistNotes] = useState<string>('');
  const [waitlistSuccess, setWaitlistSuccess] = useState<boolean>(false);
  const [waitlistHighChairs, setWaitlistHighChairs] = useState<boolean>(false);
  const [waitlistHighChairCount, setWaitlistHighChairCount] = useState<string>('1');
  const [waitlistStroller, setWaitlistStroller] = useState<boolean>(false);
  const [waitlistPets, setWaitlistPets] = useState<boolean>(false);
  const [waitlistPreferredTime, setWaitlistPreferredTime] = useState<string>('');

  const _createTempGroupMutation = trpc.tables.createTemporaryGroup.useMutation();
  const _createSplitTableMutation = trpc.tables.createSplitTable.useMutation();
  const expandSlotCapacityMutation = trpc.reservations.expandSlotCapacity.useMutation();

  const waitlistCreateMutation = trpc.waitlist.create.useMutation({
    onSuccess: () => {
      console.log('[Restaurant2] Lista de espera creada');
      setWaitlistSuccess(true);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'No se pudo añadir a la lista de espera');
    },
  });

  const restaurantQuery = trpc.restaurants.details.useQuery({ slug: slug || '' });

  const lastWakeUpRestaurantIdRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    const restaurantId = restaurantQuery.data?.id;

    if (!restaurantId || lastWakeUpRestaurantIdRef.current === restaurantId) {
      return;
    }

    lastWakeUpRestaurantIdRef.current = restaurantId;
    console.log('[Restaurant2] 🔔 Despertando WhatsApp Manager para:', restaurantId);
    void ensureWhatsAppWakeUp(restaurantId);
  }, [restaurantQuery.data?.id]);
  const locationsQuery = trpc.locations.list.useQuery(
    { restaurantId: restaurantQuery.data?.id || '' },
    { enabled: !!restaurantQuery.data?.id }
  );
  
  const schedulesQuery = trpc.schedules.list.useQuery(
    { restaurantId: restaurantQuery.data?.id || '' },
    { enabled: !!restaurantQuery.data?.id }
  );

  const dayExceptionsQuery = trpc.dayExceptions.list.useQuery(
    { restaurantId: restaurantQuery.data?.id || '' },
    { enabled: !!restaurantQuery.data?.id }
  );

  const selectedDateString = selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : '';

  const guestCountsQuery = trpc.clients.availableGuestCounts.useQuery(
    {
      restaurantId: restaurantQuery.data?.id || '',
      locationId: selectedLocation || undefined,
      date: selectedDateString || undefined,
    },
    { enabled: !!restaurantQuery.data?.id && !!selectedLocation && !!selectedDate && clientVerified }
  );

  React.useEffect(() => {
    if (guests && guestCountsQuery.data?.guestCounts && !guestCountsQuery.data.guestCounts.includes(guests)) {
      console.log('⚠️ [GUEST RESET] Comensales seleccionados ya no disponible, reseteando');
      setGuests(null);
      setSelectedTime(null);
    }
  }, [guestCountsQuery.data?.guestCounts, guests]);

  const fullPhoneForQuery = clientVerified ? phonePrefix + phoneNumber : undefined;

  const availableTablesQuery = trpc.tables.availableForReservation.useQuery(
    {
      restaurantId: restaurantQuery.data?.id || '',
      locationId: selectedLocation,
      date: selectedDateString,
      time: { hour: 12, minute: 0 },
      guests: 1,
      skipCapacityFilter: true,
    },
    { enabled: !!restaurantQuery.data?.id && !!selectedLocation && !!selectedDate && showTableSplitModal }
  );

  const groupModalAllTablesQuery = trpc.tables.list.useQuery(
    { restaurantId: restaurantQuery.data?.id || '', locationId: selectedLocation },
    { enabled: !!restaurantQuery.data?.id && !!selectedLocation && showTableGroupingModal && !selectedTime }
  );

  const groupModalReservationsQuery = trpc.reservations.list.useQuery(
    { restaurantId: restaurantQuery.data?.id || '', date: selectedDateString },
    { enabled: !!restaurantQuery.data?.id && !!selectedDateString && showTableGroupingModal && !selectedTime }
  );

  const groupModalAvailableTablesQuery = trpc.tables.availableForReservation.useQuery(
    {
      restaurantId: restaurantQuery.data?.id || '',
      locationId: selectedLocation,
      date: selectedDateString || '',
      time: selectedTime || { hour: 12, minute: 0 },
      guests: guests || 1,
      skipCapacityFilter: true,
    },
    { enabled: !!restaurantQuery.data?.id && !!selectedLocation && !!selectedDateString && showTableGroupingModal && !!selectedTime }
  );

  const availableSlotsQuery = trpc.reservations.availableSlots.useQuery(
    {
      restaurantId: restaurantQuery.data?.id || '',
      date: selectedDateString,
      guests: guests || 0,
      locationId: selectedLocation,
      needsHighChair: false,
      highChairCount: undefined,
      needsStroller: needsStroller,
      hasPets: hasPets,
      ignoreMinAdvance: true,
      ignoreMaxCapacity: true,
      clientPhone: fullPhoneForQuery,
    },
    { enabled: !!restaurantQuery.data?.id && !!selectedDate && !!selectedLocation && !!guests && clientVerified }
  );

  const freeTablesForGroupModal = useMemo(() => {
    if (selectedTime && groupModalAvailableTablesQuery.data) {
      return groupModalAvailableTablesQuery.data;
    }
    if (!groupModalAllTablesQuery.data) return [];
    const reservedTableIds = new Set<string>();
    (groupModalReservationsQuery.data || []).forEach((res: any) => {
      if (res.status !== 'cancelled' && res.status !== 'modified') {
        (res.tableIds || []).forEach((id: string) => reservedTableIds.add(id));
      }
    });
    return groupModalAllTablesQuery.data.filter((table: any) => !reservedTableIds.has(table.id));
  }, [groupModalAllTablesQuery.data, groupModalReservationsQuery.data, groupModalAvailableTablesQuery.data, selectedTime]);

  const waitlistTimeSlots = useMemo(() => {
    if (!selectedDate || !schedulesQuery.data) return [];
    const dayOfWeek = selectedDate.getDay();
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const exception = dayExceptionsQuery.data?.find((ex: any) => {
      let d: string;
      if (typeof ex.date === 'string') {
        d = ex.date.includes('T') ? ex.date.split('T')[0] : ex.date;
      } else {
        const exDate = new Date(ex.date);
        d = `${exDate.getFullYear()}-${String(exDate.getMonth() + 1).padStart(2, '0')}-${String(exDate.getDate()).padStart(2, '0')}`;
      }
      return d === dateStr;
    });
    let rawShifts: any[] = [];
    if (exception?.shifts && Array.isArray(exception.shifts) && exception.shifts.length > 0) {
      rawShifts = exception.shifts;
    } else {
      const schedule = schedulesQuery.data.find((s: any) => s.dayOfWeek === dayOfWeek);
      if (schedule?.shifts) {
        rawShifts = typeof schedule.shifts === 'string' ? JSON.parse(schedule.shifts) : (schedule.shifts || []);
      }
    }
    const slots = new Set<string>();
    for (const shift of rawShifts) {
      if (!shift.startTime || !shift.endTime) continue;
      const [sh, sm] = shift.startTime.split(':').map(Number);
      const [eh, em] = shift.endTime.split(':').map(Number);
      let h = sh, m = sm;
      while (h < eh || (h === eh && m <= em)) {
        slots.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        m += 30;
        if (m >= 60) { m = 0; h++; }
      }
    }
    return Array.from(slots).sort();
  }, [selectedDate, schedulesQuery.data, dayExceptionsQuery.data]);

  const specialDayMessage = useMemo(() => {
    if (!selectedDate || !dayExceptionsQuery.data) return null;
    
    const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const exception = dayExceptionsQuery.data.find((ex: any) => ex.date === dateString);
    
    if (exception?.specialMessageEnabled && exception?.specialDayMessage) {
      return exception.specialDayMessage;
    }
    return null;
  }, [selectedDate, dayExceptionsQuery.data]);

  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{
    date: Date | null;
    time: { hour: number; minute: number } | null;
    guests: number | null;
    phone: string;
  } | null>(null);

  const createReservationMutation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      console.log('✅ [CREATE RESERVATION] Reserva creada exitosamente');
      setSuccessData({
        date: selectedDate,
        time: selectedTime,
        guests: guests,
        phone: phonePrefix + phoneNumber,
      });
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      console.error('❌ [CREATE RESERVATION] Error completo:', JSON.stringify(error, null, 2));
      const errorMessage = error?.message || error?.shape?.message || error?.data?.message || 'No se pudo crear la reserva. Inténtalo de nuevo.';
      console.log('❌ [CREATE RESERVATION] Mensaje de error extraído:', errorMessage);
      if (errorMessage.includes('No hay mesas disponibles') || errorMessage.includes('no tables') || errorMessage.includes('BAD_REQUEST')) {
        const timeStr = selectedTime ? `${String(selectedTime.hour).padStart(2, '0')}:${String(selectedTime.minute).padStart(2, '0')}` : '';
        setNoTablesErrorMessage(
          `No hay mesas disponibles para ${guests} comensales a las ${timeStr} en la fecha seleccionada.\n\n` +
          `Todas las mesas compatibles están ocupadas o bloqueadas para este horario.\n\n` +
          `Sugerencias:\n• Selecciona otra hora disponible\n• Prueba con otro número de comensales\n• Selecciona otra fecha\n• Agrupa o divide mesas desde el botón "+"\n• Contacta con el restaurante para verificar disponibilidad`
        );
        setShowNoTablesErrorModal(true);
      } else {
        Alert.alert('Error al Crear Reserva', errorMessage);
      }
    },
  });

  const resetForm = () => {
    setSelectedDate(null);
    setSelectedLocation('');
    setGuests(null);
    setSelectedTime(null);
    setNeedsHighChairs(false);
    setHighChairCount('1');
    setNeedsStroller(false);
    setHasPets(false);
    setClientName('');
    setPhonePrefix('+34');
    setPhoneNumber('');
    setIsExistingClient(false);
    setPhoneChecked(false);
    setClientVerified(false);
    setClientBlocked(false);
    setBlockReason('');
    setNotes('');
    setTermsAccepted(false);
    setTimeout(() => setTermsAccepted(false), 100);
  };

  const advanceBookingDays = restaurantQuery.data?.advanceBookingDays || 30;

  const availableDates = useMemo(() => {
    const dates: { date: Date; isOpen: boolean; hasSlots: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < advanceBookingDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
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
      
      if (exception) {
        const isOpen = exception.isOpen;
        const hasSlots = !!(exception.shifts && exception.shifts.length > 0);
        dates.push({ date, isOpen, hasSlots });
      } else {
        const schedule = schedulesQuery.data?.find(s => s.dayOfWeek === dayOfWeek);
        const isOpen = schedule ? schedule.isOpen : false;
        const hasSlots = !!(schedule && schedule.shifts && schedule.shifts.length > 0);
        dates.push({ date, isOpen, hasSlots });
      }
    }
    return dates;
  }, [advanceBookingDays, schedulesQuery.data, dayExceptionsQuery.data]);

  const phonePrefixes = [
    { code: '+34', country: 'España', flag: '🇪🇸' },
    { code: '+1', country: 'Estados Unidos', flag: '🇺🇸' },
    { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
    { code: '+33', country: 'Francia', flag: '🇫🇷' },
    { code: '+49', country: 'Alemania', flag: '🇩🇪' },
    { code: '+39', country: 'Italia', flag: '🇮🇹' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  ];

  const handlePhoneNumberChange = async (number: string) => {
    setPhoneNumber(number);
    setPhoneChecked(false);
    setIsExistingClient(false);
    setClientName('');

    if (number.match(/^[0-9]{9,}$/)) {
      const fullPhone = phonePrefix + number;
      try {
        const result = await trpcClient.clients.checkPhone.query({ phone: fullPhone });
        setPhoneChecked(true);
        if (result.exists && result.client) {
          setIsExistingClient(true);
          setClientName(result.client.name);
        }
      } catch (error) {
        console.error('Error verificando teléfono:', error);
      }
    }
  };

  const handleVerifyClient = async () => {
    if (!phoneNumber.match(/^[0-9]{9,}$/)) {
      Alert.alert('Teléfono Inválido', 'Por favor ingresa un número de teléfono válido.');
      return;
    }

    if (!phoneChecked) {
      Alert.alert('Error', 'Por favor espera a que se verifique el teléfono.');
      return;
    }

    if (!isExistingClient && !clientName.trim()) {
      Alert.alert('Nombre Requerido', 'Por favor ingresa tu nombre.');
      return;
    }

    const fullPhone = phonePrefix + phoneNumber;

    try {
      const clientDetails = await trpcClient.clients.getClientDetails.query({
        restaurantId: restaurantQuery.data?.id || '',
        phone: fullPhone,
      });

      if (clientDetails?.isUnwantedClient) {
        setClientBlocked(true);
        setBlockReason('Este restaurante te ha bloqueado. No puedes realizar reservas aquí.');
        setClientVerified(false);
        Alert.alert(
          'Cliente Bloqueado',
          'Lo sentimos, no puedes realizar reservas en este restaurante. Para más información, contacta con el establecimiento.',
          [{ text: 'Entendido' }]
        );
        return;
      }

      console.log('✅ Cliente verificado correctamente');
      setClientVerified(true);
      setClientBlocked(false);
    } catch {
      console.log('Cliente nuevo o sin restricciones');
      setClientVerified(true);
      setClientBlocked(false);
    }
  };

  const highChairAvailability = useMemo(() => {
    if (!needsHighChairs) return { exceeded: false, available: 0, requested: 0, showWarning: false };
    const requestedHighChairs = parseInt(highChairCount) || 1;
    const totalHighChairs = restaurantQuery.data?.availableHighChairs || 0;
    
    if (requestedHighChairs > totalHighChairs) {
      return { exceeded: true, available: totalHighChairs, requested: requestedHighChairs, showWarning: true };
    }
    
    if (availableSlotsQuery.data && selectedDate && selectedLocation && guests && selectedTime) {
      const selectedSlot = availableSlotsQuery.data.find(
        (slot: any) => slot.hour === selectedTime.hour && slot.minute === selectedTime.minute
      );
      
      if (selectedSlot && typeof selectedSlot.availableHighChairs === 'number') {
        if (requestedHighChairs > selectedSlot.availableHighChairs) {
          return { 
            exceeded: true, 
            available: selectedSlot.availableHighChairs, 
            requested: requestedHighChairs, 
            showWarning: true 
          };
        }
      }
    }
    
    return { exceeded: false, available: totalHighChairs, requested: requestedHighChairs, showWarning: false };
  }, [needsHighChairs, highChairCount, restaurantQuery.data?.availableHighChairs, availableSlotsQuery.data, selectedDate, selectedLocation, guests, selectedTime]);
  
  const isHighChairLimitExceeded = highChairAvailability.exceeded;

  const highChairExceedsGuests = useMemo(() => {
    if (!needsHighChairs || !guests) return false;
    const requestedHighChairs = parseInt(highChairCount) || 0;
    return requestedHighChairs >= guests;
  }, [needsHighChairs, highChairCount, guests]);

  const handleSubmit = async () => {
    if (needsHighChairs) {
      const requestedHighChairs = parseInt(highChairCount) || 1;
      
      if (requestedHighChairs < 1) {
        Alert.alert('Error', 'Debes solicitar al menos 1 trona.');
        return;
      }
    }
    
    if (!selectedDate || !selectedLocation || !selectedTime || !clientName.trim() || !phoneNumber.trim() || !guests) {
      Alert.alert('Campos Requeridos', 'Por favor completa todos los campos obligatorios.');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Términos y Condiciones', 'Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    if (!phoneNumber.match(/^[0-9]{9,}$/)) {
      Alert.alert('Teléfono Inválido', 'Por favor ingresa un número de teléfono válido.');
      return;
    }

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const fullPhone = phonePrefix + phoneNumber;
    
    const selectedSlotData = availableSlotsQuery.data?.find(
      (s: any) => s.hour === selectedTime.hour && s.minute === selectedTime.minute
    );
    
    if (selectedSlotData?.isOverCapacity) {
      console.log('⚠️ [SUBMIT] Slot seleccionado está sobre capacidad, mostrando confirmación');
      setPendingSubmitData({
        fullPhone,
        dateString,
        skipConfirmation: false,
        current: selectedSlotData.currentGuests || 0,
        max: selectedSlotData.maxGuests || 0,
        required: (selectedSlotData.currentGuests || 0) + guests,
      });
      setShowSubmitCapacityModal(true);
      return;
    }
    
    proceedWithReservation(fullPhone, dateString);
  };
  
  const proceedWithReservation = (fullPhone: string, dateString: string, skipConfirmation: boolean = false) => {
    createReservationMutation.mutate({
      restaurantId: restaurantQuery.data!.id,
      clientPhone: fullPhone,
      clientName: clientName.trim(),
      date: dateString,
      time: selectedTime!,
      guests: guests!,
      locationId: selectedLocation,
      tableIds: selectedTables,
      needsHighChair: needsHighChairs,
      highChairCount: needsHighChairs ? parseInt(highChairCount) || 1 : 0,
      needsStroller: needsStroller,
      hasPets: hasPets,
      notes: notes.trim() || '',
      fromRestaurantPanel: true,
      skipConfirmation: skipConfirmation,
    });
  };

  const handleSubmitWithoutConfirmation = async () => {
    if (needsHighChairs) {
      const requestedHighChairs = parseInt(highChairCount) || 1;
      
      if (requestedHighChairs < 1) {
        Alert.alert('Error', 'Debes solicitar al menos 1 trona.');
        return;
      }
    }
    
    if (!selectedDate || !selectedLocation || !selectedTime || !clientName.trim() || !phoneNumber.trim() || !guests) {
      Alert.alert('Campos Requeridos', 'Por favor completa todos los campos obligatorios.');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Términos y Condiciones', 'Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    if (!phoneNumber.match(/^[0-9]{9,}$/)) {
      Alert.alert('Teléfono Inválido', 'Por favor ingresa un número de teléfono válido.');
      return;
    }

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const fullPhone = phonePrefix + phoneNumber;
    
    const selectedSlotData = availableSlotsQuery.data?.find(
      (s: any) => s.hour === selectedTime.hour && s.minute === selectedTime.minute
    );
    
    if (selectedSlotData?.isOverCapacity) {
      console.log('⚠️ [SUBMIT NO CONFIRM] Slot seleccionado está sobre capacidad, mostrando confirmación');
      setPendingSubmitData({
        fullPhone,
        dateString,
        skipConfirmation: true,
        current: selectedSlotData.currentGuests || 0,
        max: selectedSlotData.maxGuests || 0,
        required: (selectedSlotData.currentGuests || 0) + guests,
      });
      setShowSubmitCapacityModal(true);
      return;
    }
    
    proceedWithReservation(fullPhone, dateString, true);
  };

  if (restaurantQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!restaurantQuery.data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Restaurante no encontrado</Text>
      </View>
    );
  }

  const restaurant = restaurantQuery.data;

  return (
    <>
      <Stack.Screen options={{ title: restaurant.name + ' - Añadir Reserva' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantDescription}>{restaurant.description}</Text>
          <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>📋 Modo Restaurante: Sin restricción de tiempo mínimo</Text>
          </View>
        </View>

        {restaurant.customLinks && restaurant.customLinks.length > 0 && (
          <View style={styles.linksSection}>
            {restaurant.customLinks
              .filter((link) => link.enabled && link.url && link.buttonText)
              .map((link, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.customLinkButton}
                  onPress={() => {
                    Linking.openURL(link.url).catch((err) => {
                      console.error('Error al abrir el enlace:', err);
                      Alert.alert('Error', 'No se pudo abrir el enlace');
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <ExternalLink size={18} color="#4F46E5" strokeWidth={2.5} />
                  <Text style={styles.customLinkText}>{link.buttonText}</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {restaurant.importantMessageEnabled && restaurant.importantMessage && restaurant.importantMessage.trim().length > 0 && (
          <View style={styles.importantMessageContainer}>
            <Text style={styles.importantMessageText}>{restaurant.importantMessage}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Tus Datos de Contacto</Text>
          
          <Text style={styles.phoneLabel}>Teléfono con WhatsApp *</Text>
          <View style={styles.phoneContainer}>
            <TouchableOpacity
              style={styles.prefixButton}
              onPress={() => setShowPrefixModal(true)}
              activeOpacity={0.7}
              disabled={clientVerified}
            >
              <Text style={styles.prefixButtonText}>
                {phonePrefixes.find(p => p.code === phonePrefix)?.flag} {phonePrefix}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              keyboardType="phone-pad"
              placeholder="600 000 000"
              placeholderTextColor="#9CA3AF"
              editable={!clientVerified}
            />
          </View>
          
          {phoneChecked && !clientVerified && (
            <>
              {isExistingClient ? (
                <View style={styles.existingClientInfo}>
                  <Text style={styles.existingClientLabel}>Cliente registrado:</Text>
                  <Text style={styles.existingClientName}>{clientName}</Text>
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={clientName}
                  onChangeText={setClientName}
                  placeholder="Nombre de usuario *"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              )}
              
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerifyClient}
              >
                <Text style={styles.verifyButtonText}>Continuar</Text>
              </TouchableOpacity>
            </>
          )}
          
          {clientVerified && (
            <View style={styles.verifiedBox}>
              <Text style={styles.verifiedText}>✓ Cliente verificado: {clientName}</Text>
              <TouchableOpacity
                onPress={() => {
                  setClientVerified(false);
                  setPhoneNumber('');
                  setClientName('');
                  setPhoneChecked(false);
                  setSelectedDate(null);
                  setSelectedLocation('');
                  setGuests(null);
                  setSelectedTime(null);
                }}
              >
                <Text style={styles.changePhoneText}>Cambiar teléfono</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {clientBlocked && (
            <View style={styles.blockedBox}>
              <Text style={styles.blockedText}>🚫 {blockReason}</Text>
            </View>
          )}
        </View>

        {clientVerified && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Selecciona la Fecha</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {availableDates.map((dateInfo) => {
                const isSelected = selectedDate?.toDateString() === dateInfo.date.toDateString();
                const isClosed = !dateInfo.isOpen || !dateInfo.hasSlots;
                return (
                  <TouchableOpacity
                    key={dateInfo.date.toISOString()}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardSelected,
                      isClosed && styles.dateCardClosed,
                    ]}
                    onPress={() => {
                      if (isClosed) {
                        const restaurantPhone = restaurant.phone && restaurant.phone.length > 0 ? restaurant.phone[0] : null;
                        Alert.alert(
                          'Día no disponible',
                          restaurantPhone
                            ? 'Este día el restaurante está cerrado o todos los turnos están completos. Le sugerimos llamar al restaurante para confirmar disponibilidad.'
                            : 'Este día el restaurante está cerrado o todos los turnos están completos.',
                          restaurantPhone
                            ? [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                  text: 'Llamar',
                                  onPress: () => {
                                    Linking.openURL(`tel:${restaurantPhone}`).catch(err => {
                                      console.error('Error al abrir el teléfono:', err);
                                      Alert.alert('Error', 'No se pudo iniciar la llamada');
                                    });
                                  },
                                },
                              ]
                            : [{ text: 'Entendido' }]
                        );
                      } else {
                        setSelectedDate(dateInfo.date);
                      }
                    }}
                    disabled={false}
                  >
                    <Text style={[
                      styles.dateDay,
                      isSelected && styles.dateDaySelected,
                      isClosed && styles.dateDayClosed,
                    ]}>
                      {dateInfo.date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={[
                      styles.dateNumber,
                      isSelected && styles.dateNumberSelected,
                      isClosed && styles.dateNumberClosed,
                    ]}>
                      {dateInfo.date.getDate()}
                    </Text>
                    <Text style={[
                      styles.dateMonth,
                      isSelected && styles.dateMonthSelected,
                      isClosed && styles.dateMonthClosed,
                    ]}>
                      {dateInfo.date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                    </Text>
                    {isClosed && (
                      <Text style={styles.closedLabel}>CERRADO</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {clientVerified && selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Selecciona la Ubicación</Text>
            {locationsQuery.isLoading ? (
              <ActivityIndicator />
            ) : (
              <View style={styles.locationContainer}>
                {locationsQuery.data?.map((location) => {
                  const isSelected = selectedLocation === location.id;
                  return (
                    <TouchableOpacity
                      key={location.id}
                      style={[styles.locationCard, isSelected && styles.locationCardSelected]}
                      onPress={() => setSelectedLocation(location.id)}
                    >
                      <Text style={[styles.locationText, isSelected && styles.locationTextSelected]}>
                        {location.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {clientVerified && selectedLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Número de Comensales</Text>
            {guestCountsQuery.isLoading ? (
              <ActivityIndicator />
            ) : guestCountsQuery.data?.guestCounts && guestCountsQuery.data.guestCounts.length === 0 ? (
              <View style={styles.noTablesMessage}>
                <Text style={styles.noTablesTitle}>{'⚠️ No hay mesas disponibles'}</Text>
                <Text style={styles.noTablesText}>{'Todas las mesas est\u00e1n ocupadas o bloqueadas para este d\u00eda. Por favor, selecciona otra fecha o contacta con el restaurante.'}</Text>
              </View>
            ) : (
              <View style={styles.guestContainer}>
                {guestCountsQuery.data?.guestCounts?.map((count) => {
                  const isSelected = guests === count;
                  return (
                    <TouchableOpacity
                      key={count}
                      style={[styles.guestCard, isSelected && styles.guestCardSelected]}
                      onPress={() => {
                        const currentGuests = guests || 0;
                        if (count < currentGuests && currentGuests > 0) {
                          Alert.alert(
                            'Reducir comensales',
                            `¿Deseas dividir la mesa o continuar con ${count} ${count === 1 ? 'comensal' : 'comensales'}?`,
                            [
                              {
                                text: 'Continuar sin dividir',
                                onPress: () => setGuests(count),
                              },
                              {
                                text: 'Dividir mesa',
                                onPress: () => {
                                  setGuests(count);
                                  setShowActionSelectionModal(true);
                                },
                              },
                            ]
                          );
                        } else {
                          setGuests(count);
                        }
                      }}
                    >
                      <Text style={[styles.guestText, isSelected && styles.guestTextSelected]}>
                        {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.guestCardMore}
                  onPress={() => {
                    if (!selectedDate) {
                      Alert.alert('Selecciona una fecha', 'Primero debes seleccionar una fecha para continuar.');
                      return;
                    }
                    setShowActionSelectionModal(true);
                  }}
                >
                  <Text style={styles.guestTextMore}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {clientVerified && selectedLocation && guests && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Selecciona la Hora</Text>
            {availableSlotsQuery.isLoading ? (
              <ActivityIndicator />
            ) : availableSlotsQuery.data && availableSlotsQuery.data.length === 0 ? (
              <View style={styles.noTablesMessage}>
                <Text style={styles.noTablesTitle}>
                  {isHighChairLimitExceeded ? '⚠️ No hay suficientes tronas disponibles' : '⚠️ No hay horarios disponibles'}
                </Text>
                <Text style={styles.noTablesText}>
                  {isHighChairLimitExceeded
                    ? highChairAvailability.available === 0
                      ? `No hay tronas disponibles para los horarios de este día con ${guests} comensales.\n\nTodas las tronas están reservadas para las horas disponibles. Por favor, reduce la cantidad de tronas solicitadas, selecciona otra fecha o contacta con el restaurante.`
                      : `Solo hay ${highChairAvailability.available} trona${highChairAvailability.available !== 1 ? 's' : ''} disponible${highChairAvailability.available !== 1 ? 's' : ''} en el restaurante.\n\nPor favor, reduce la cantidad solicitada para poder continuar con tu reserva.`
                    : needsStroller || hasPets
                    ? 'No hay mesas disponibles para ' + guests + ' comensales con las características seleccionadas (carrito o mascotas). Por favor, intenta quitando algunas opciones o selecciona otro número de comensales.'
                    : 'No hay horarios disponibles para este día. Por favor, selecciona otra fecha.'}
                </Text>
                {(needsStroller || hasPets) && (
                  <TouchableOpacity
                    style={styles.clearOptionsButton}
                    onPress={() => {
                      setNeedsStroller(false);
                      setHasPets(false);
                    }}
                  >
                    <Text style={styles.clearOptionsText}>Quitar opciones especiales</Text>
                  </TouchableOpacity>
                )}
                {!isHighChairLimitExceeded && clientVerified && selectedDate && restaurantQuery.data?.id && (
                  <TouchableOpacity
                    style={styles.waitlistButton}
                    onPress={() => { setWaitlistSuccess(false); setShowWaitlistModal(true); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.waitlistButtonText}>📋 Lista de espera</Text>
                    <Text style={styles.waitlistButtonSub}>Avísame si se libera algún horario</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <View style={styles.timeContainer}>
                  {availableSlotsQuery.data?.map((slot: any, index) => {
                    const isUnavailable = slot.isUnavailableDueToMinAdvance === true;
                    const isOverCapacity = slot.isOverCapacity === true;
                    const isSelected = selectedTime?.hour === slot.hour && selectedTime?.minute === slot.minute;
                    const timeString = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.timeCard,
                          isSelected && !isUnavailable && !isOverCapacity && styles.timeCardSelected,
                          isSelected && isOverCapacity && styles.timeCardOverCapacitySelected,
                          isUnavailable && styles.timeCardUnavailable,
                          !isSelected && isOverCapacity && styles.timeCardOverCapacity,
                        ]}
                        onPress={() => {
                          if (isUnavailable) {
                            setSelectedUnavailableTime(timeString);
                            setShowUnavailableModal(true);
                          } else if (isOverCapacity) {
                            const newMax = (slot.currentGuests || 0) + (guests || 0);
                            setOverCapacitySlotInfo({ slot, overBy: slot.overBy || 0, maxGuests: slot.maxGuests || 0, newMaxGuests: newMax });
                            setShowOverCapacityModal(true);
                          } else {
                            setSelectedTime(slot);
                          }
                        }}
                        disabled={false}
                      >
                        <Text style={[
                          styles.timeText,
                          isSelected && !isUnavailable && !isOverCapacity && styles.timeTextSelected,
                          isUnavailable && styles.timeTextUnavailable,
                          isOverCapacity && styles.timeTextOverCapacity,
                        ]}>
                          {timeString}
                        </Text>
                        {isOverCapacity && (
                          <Text style={styles.overCapacityBadge}>+{slot.overBy}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {clientVerified && selectedTime && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Necesidades Especiales</Text>
              
              {guestCountsQuery.data?.allowsHighChairs && (
                <>
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => setNeedsHighChairs(!needsHighChairs)}
                    >
                      <View style={[styles.checkboxBox, needsHighChairs && styles.checkboxBoxChecked]}>
                        {needsHighChairs && <Text style={styles.checkboxCheck}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>Necesito tronas</Text>
                    </TouchableOpacity>
                  </View>

                  {needsHighChairs && (
                    <>
                      <View style={styles.tronasStepper}>
                        <TouchableOpacity
                          style={styles.tronasStepBtn}
                          onPress={() => {
                            const current = parseInt(highChairCount) || 1;
                            if (current > 1) setHighChairCount(String(current - 1));
                          }}
                        >
                          <Text style={styles.tronasStepBtnText}>−</Text>
                        </TouchableOpacity>
                        <View style={styles.tronasStepCenter}>
                          <Text style={styles.tronasStepCount}>{parseInt(highChairCount) || 1}</Text>
                          <Text style={styles.tronasStepLabel}>trona{(parseInt(highChairCount) || 1) !== 1 ? 's' : ''}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.tronasStepBtn}
                          onPress={() => {
                            const current = parseInt(highChairCount) || 1;
                            setHighChairCount(String(current + 1));
                          }}
                        >
                          <Text style={styles.tronasStepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      {!highChairExceedsGuests && guests && (parseInt(highChairCount) || 1) >= 1 && (guests - (parseInt(highChairCount) || 1)) >= 1 && (
                        <View style={styles.tronasSummaryCard}>
                          <View style={styles.tronasSummaryRow}>
                            <View style={styles.tronasSummaryItem}>
                              <Text style={styles.tronasSummaryEmoji}>🧑</Text>
                              <Text style={styles.tronasSummaryNum}>{guests - (parseInt(highChairCount) || 1)}</Text>
                              <Text style={styles.tronasSummaryLabel}>Adulto{guests - (parseInt(highChairCount) || 1) !== 1 ? 's' : ''}</Text>
                            </View>
                            <Text style={styles.tronasSummaryOp}>+</Text>
                            <View style={styles.tronasSummaryItem}>
                              <Text style={styles.tronasSummaryEmoji}>🪑</Text>
                              <Text style={styles.tronasSummaryNum}>{parseInt(highChairCount) || 1}</Text>
                              <Text style={styles.tronasSummaryLabel}>Trona{(parseInt(highChairCount) || 1) !== 1 ? 's' : ''}</Text>
                            </View>
                            <Text style={styles.tronasSummaryOp}>=</Text>
                            <View style={styles.tronasSummaryItem}>
                              <Text style={styles.tronasSummaryEmoji}>👥</Text>
                              <Text style={[styles.tronasSummaryNum, styles.tronasSummaryNumTotal]}>{guests}</Text>
                              <Text style={styles.tronasSummaryLabel}>Total</Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {highChairExceedsGuests && (
                        <View style={styles.warningBox}>
                          <Text style={styles.warningTitle}>⚠️ Número de tronas inválido</Text>
                          <Text style={styles.warningText}>
                            Debe haber al menos 1 adulto en la reserva. El número de tronas debe ser menor que el número de comensales ({guests}). Por favor, reduce la cantidad de tronas solicitadas.
                          </Text>
                        </View>
                      )}
                      {!highChairExceedsGuests && isHighChairLimitExceeded && (
                        <View style={styles.warningBox}>
                          <Text style={styles.warningTitle}>⚠️ Tronas no disponibles</Text>
                          <Text style={styles.warningText}>
                            {highChairAvailability.available === 0
                              ? `No hay tronas disponibles para la hora seleccionada. Por favor, reduce la cantidad solicitada o cambia la hora de tu reserva para poder continuar.`
                              : `Solo hay ${highChairAvailability.available} trona${highChairAvailability.available !== 1 ? 's' : ''} disponible${highChairAvailability.available !== 1 ? 's' : ''} para la hora seleccionada. Por favor, reduce la cantidad solicitada o cambia la hora de tu reserva para poder continuar.`}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}

              {guestCountsQuery.data?.allowsStrollers && (
                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setNeedsStroller(!needsStroller)}
                  >
                    <View style={[styles.checkboxBox, needsStroller && styles.checkboxBoxChecked]}>
                      {needsStroller && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>Necesito espacio para carrito de bebé</Text>
                  </TouchableOpacity>
                </View>
              )}

              {guestCountsQuery.data?.allowsPets && (
                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setHasPets(!hasPets)}
                  >
                    <View style={[styles.checkboxBox, hasPets && styles.checkboxBoxChecked]}>
                      {hasPets && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>Vendré con mascota</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {specialDayMessage && (
              <View style={styles.specialMessageContainer}>
                <Text style={styles.specialMessageTitle}>ℹ️ Mensaje Especial</Text>
                <Text style={styles.specialMessageText}>{specialDayMessage}</Text>
              </View>
            )}

            <View style={styles.section}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notas adicionales (opcional)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.termsSection}>
              <View style={styles.termsCheckboxRow}>
                <TouchableOpacity
                  style={styles.termsCheckbox}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                >
                  <View style={[styles.termsCheckboxBox, termsAccepted && styles.termsCheckboxBoxChecked]}>
                    {termsAccepted && <Text style={styles.termsCheckboxCheck}>✓</Text>}
                  </View>
                </TouchableOpacity>
                <View style={styles.termsTextContainer}>
                  <Text style={styles.termsText}>
                    He leído y acepto los términos y condiciones, autorizo que se me envíen notificaciones de WhatsApp con referencia a mis reservas, autorizo que mi número de teléfono y usuario se conserve en esta plataforma para futuras reservas, autorizo también al restaurante donde reservo a que pueda valorarme como cliente en cada reserva que realice.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (createReservationMutation.isPending || !termsAccepted || isHighChairLimitExceeded || highChairExceedsGuests) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={createReservationMutation.isPending || !termsAccepted || isHighChairLimitExceeded || highChairExceedsGuests}
            >
              {createReservationMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Confirmar Reserva</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              El cliente recibirá un WhatsApp con un enlace para confirmar la reserva.
            </Text>

            <TouchableOpacity
              style={[
                styles.submitButtonSecondary,
                (createReservationMutation.isPending || !termsAccepted || isHighChairLimitExceeded || highChairExceedsGuests) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitWithoutConfirmation}
              disabled={createReservationMutation.isPending || !termsAccepted || isHighChairLimitExceeded || highChairExceedsGuests}
            >
              {createReservationMutation.isPending ? (
                <ActivityIndicator color="#4F46E5" />
              ) : (
                <Text style={styles.submitButtonSecondaryText}>Reserva sin Confirmar</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimerSecondary}>
              La reserva se añadirá automáticamente y el cliente recibirá el enlace de gestión directamente.
            </Text>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showSubmitCapacityModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowSubmitCapacityModal(false); setPendingSubmitData(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.overCapacityModalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Capacidad Máxima Excedida</Text>
            {pendingSubmitData && (
              <>
                <Text style={styles.overCapacityModalText}>
                  Esta reserva excede la capacidad máxima del turno para la hora seleccionada.
                </Text>
                <View style={[styles.modalDetails, { width: '100%', marginVertical: 12 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>Reservas actuales:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#111827' }}>{pendingSubmitData.current} pax</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>Límite máximo:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#EF4444' }}>{pendingSubmitData.max} pax</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>Necesario tras reserva:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#F59E0B' }}>{pendingSubmitData.required} pax</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
                  ¿Deseas continuar de todas formas?
                </Text>
              </>
            )}
            <View style={styles.overCapacityModalButtons}>
              <TouchableOpacity
                style={styles.overCapacityAcceptButton}
                onPress={async () => {
                  if (!pendingSubmitData || !selectedTime || !restaurantQuery.data?.id) return;
                  setIsExpandingCapacity(true);
                  try {
                    const newMax = pendingSubmitData.required;
                    console.log('⚠️ [SUBMIT CAPACITY] Expandiendo capacidad antes de crear reserva:', newMax);
                    await expandSlotCapacityMutation.mutateAsync({
                      restaurantId: restaurantQuery.data.id,
                      date: pendingSubmitData.dateString,
                      hour: selectedTime.hour,
                      minute: selectedTime.minute,
                      newMaxGuests: newMax,
                    });
                    console.log('✅ [SUBMIT CAPACITY] Capacidad expandida a:', newMax);
                    const { fullPhone, dateString, skipConfirmation } = pendingSubmitData;
                    setShowSubmitCapacityModal(false);
                    setPendingSubmitData(null);
                    proceedWithReservation(fullPhone, dateString, skipConfirmation);
                  } catch (error) {
                    console.error('❌ [SUBMIT CAPACITY] Error expandiendo capacidad:', error);
                    Alert.alert('Error', 'No se pudo ampliar la capacidad del turno. Inténtalo de nuevo.');
                  } finally {
                    setIsExpandingCapacity(false);
                  }
                }}
                disabled={isExpandingCapacity}
                activeOpacity={0.7}
              >
                {isExpandingCapacity ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.overCapacityAcceptButtonText}>Sí, Ampliar y Continuar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.overCapacityCancelButton}
                onPress={() => { setShowSubmitCapacityModal(false); setPendingSubmitData(null); }}
                activeOpacity={0.7}
              >
                <Text style={styles.overCapacityCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showOverCapacityModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowOverCapacityModal(false); setOverCapacitySlotInfo(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.overCapacityModalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Turno con Sobreocupación</Text>
            {overCapacitySlotInfo && (
              <Text style={styles.overCapacityModalText}>
                El turno de las{' '}
                <Text style={styles.overCapacityModalTime}>
                  {String(overCapacitySlotInfo.slot.hour).padStart(2, '0')}:{String(overCapacitySlotInfo.slot.minute).padStart(2, '0')}
                </Text>
                {' '}se va a sobrepasar. Es necesario ampliar{' '}
                <Text style={styles.overCapacityModalHighlight}>
                  {overCapacitySlotInfo.overBy} comensal{overCapacitySlotInfo.overBy !== 1 ? 'es' : ''}
                </Text>
                {' '}(límite actual: {overCapacitySlotInfo.maxGuests}, nuevo límite: {overCapacitySlotInfo.newMaxGuests}).
              </Text>
            )}
            <View style={styles.overCapacityModalButtons}>
              <TouchableOpacity
                style={styles.overCapacityAcceptButton}
                onPress={async () => {
                  if (!overCapacitySlotInfo || !restaurantQuery.data?.id || !selectedDateString) return;
                  setIsExpandingCapacity(true);
                  try {
                    await expandSlotCapacityMutation.mutateAsync({
                      restaurantId: restaurantQuery.data.id,
                      date: selectedDateString,
                      hour: overCapacitySlotInfo.slot.hour,
                      minute: overCapacitySlotInfo.slot.minute,
                      newMaxGuests: overCapacitySlotInfo.newMaxGuests,
                    });
                    setSelectedTime(overCapacitySlotInfo.slot);
                    setShowOverCapacityModal(false);
                    setOverCapacitySlotInfo(null);
                  } catch {
                    Alert.alert('Error', 'No se pudo ampliar la capacidad. Inténtalo de nuevo.');
                  } finally {
                    setIsExpandingCapacity(false);
                  }
                }}
                disabled={isExpandingCapacity}
                activeOpacity={0.7}
              >
                {isExpandingCapacity ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.overCapacityAcceptButtonText}>Aceptar y Ampliar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.overCapacityCancelButton}
                onPress={() => { setShowOverCapacityModal(false); setOverCapacitySlotInfo(null); }}
                activeOpacity={0.7}
              >
                <Text style={styles.overCapacityCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showUnavailableModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnavailableModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ No disponible para reserva online</Text>
            <Text style={styles.unavailableModalText}>
              Es posible que queden mesas libres aún para las <Text style={styles.unavailableModalTime}>{selectedUnavailableTime}</Text>, pero no hay suficiente tiempo para reservar online.
              {"\n\n"}
              Si lo desea, puede llamar al restaurante y le indicarán si es posible reservar.
            </Text>
            {restaurant.phone && restaurant.phone.length > 0 && (
              <TouchableOpacity
                style={styles.callRestaurantButton}
                onPress={() => {
                  const restaurantPhone = restaurant.phone[0];
                  void Linking.openURL(`tel:${restaurantPhone}`);
                  setShowUnavailableModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.callRestaurantButtonText}>📞 Llamar al Restaurante</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowUnavailableModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>¡Reserva Creada!</Text>
            <Text style={styles.modalMessage}>
              Se ha enviado un WhatsApp al cliente al número {successData?.phone} para que confirme la reserva.
            </Text>
            <View style={styles.modalDetails}>
              <Text style={styles.modalDetailLabel}>Detalles de tu reserva:</Text>
              <Text style={styles.modalDetailText}>📅 {successData?.date?.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              <Text style={styles.modalDetailText}>🕐 {successData?.time ? `${String(successData.time.hour).padStart(2, '0')}:${String(successData.time.minute).padStart(2, '0')}` : ''}</Text>
              <Text style={styles.modalDetailText}>👥 {successData?.guests} personas</Text>
            </View>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                setSuccessData(null);
                resetForm();
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/restaurant/dashboard' as any);
                }
              }}
            >
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNoTablesErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoTablesErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.noTablesErrorIcon}>
              <Text style={styles.noTablesErrorIconText}>🚫</Text>
            </View>
            <Text style={styles.modalTitle}>Sin Mesas Disponibles</Text>
            <Text style={styles.noTablesErrorText}>{noTablesErrorMessage}</Text>
            <View style={{ width: '100%', gap: 10 }}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowNoTablesErrorModal(false);
                  setSelectedTime(null);
                }}
              >
                <Text style={styles.modalButtonText}>Seleccionar otra hora</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowNoTablesErrorModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
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
            <View style={styles.prefixModalHeader}>
              <Text style={styles.prefixModalTitle}>Selecciona tu país</Text>
              <TouchableOpacity onPress={() => setShowPrefixModal(false)} activeOpacity={0.7}>
                <Text style={styles.prefixModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.prefixList}>
              {phonePrefixes.map((prefix) => (
                <TouchableOpacity
                  key={prefix.code}
                  style={[
                    styles.prefixOption,
                    phonePrefix === prefix.code && styles.prefixOptionSelected
                  ]}
                  onPress={() => {
                    setPhonePrefix(prefix.code);
                    setShowPrefixModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.prefixFlag}>{prefix.flag}</Text>
                  <View style={styles.prefixInfo}>
                    <Text style={styles.prefixCountry}>{prefix.country}</Text>
                    <Text style={styles.prefixCode}>{prefix.code}</Text>
                  </View>
                  {phonePrefix === prefix.code && (
                    <Text style={styles.prefixCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showActionSelectionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionSelectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Acción</Text>
            <Text style={styles.modalMessage}>
              ¿Qué deseas hacer para acomodar más comensales?
            </Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (!selectedDate) {
                  Alert.alert('Selecciona una fecha', 'Primero debes seleccionar una fecha.');
                  return;
                }
                setShowActionSelectionModal(false);
                setTimeout(() => {
                  setShowTableGroupingModal(true);
                  setSelectedTables([]);
                  setCustomGroupGuests('');
                }, 300);
              }}
            >
              <Text style={styles.actionButtonTitle}>🔗 Agrupar Mesas</Text>
              <Text style={styles.actionButtonDescription}>
                Combina varias mesas disponibles para crear un grupo temporal con mayor capacidad
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (!selectedDate) {
                  Alert.alert('Selecciona una fecha', 'Primero debes seleccionar una fecha.');
                  return;
                }
                setShowActionSelectionModal(false);
                setTimeout(() => {
                  setShowTableSplitModal(true);
                  setSelectedTableToSplit(null);
                  setSplitGuestCount('');
                }, 300);
              }}
            >
              <Text style={styles.actionButtonTitle}>✂️ Dividir Mesa</Text>
              <Text style={styles.actionButtonDescription}>
                Divide una mesa grande en dos mesas temporales más pequeñas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowActionSelectionModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTableGroupingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTableGroupingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Agrupar Mesas</Text>
            <Text style={styles.modalMessage}>
              Selecciona las mesas disponibles que deseas agrupar:
            </Text>
            
            <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
              {groupModalAllTablesQuery.isLoading || groupModalReservationsQuery.isLoading ? (
                <ActivityIndicator color="#4F46E5" />
              ) : freeTablesForGroupModal.length > 0 ? (
                <View style={styles.tablesGrid}>
                  {freeTablesForGroupModal.map((table: any) => {
                      const isSelected = selectedTables.includes(table.id);
                      return (
                        <TouchableOpacity
                          key={table.id}
                          style={[
                            styles.tableCard,
                            isSelected && styles.tableCardSelected
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedTables(prev => prev.filter(id => id !== table.id));
                            } else {
                              setSelectedTables(prev => [...prev, table.id]);
                            }
                          }}
                        >
                          <Text style={[styles.tableCardText, isSelected && styles.tableCardTextSelected]}>
                            {table.name}
                          </Text>
                          <Text style={[styles.tableCardCapacity, isSelected && styles.tableCardCapacitySelected]}>
                            {table.minCapacity || 1}-{table.maxCapacity} pax
                          </Text>
                          {isSelected && <Text style={styles.tableCardCheck}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ) : (
                <Text style={styles.noTablesText}>No hay mesas disponibles para agrupar</Text>
              )}
            </ScrollView>

            {selectedTables.length > 0 && (
              <View style={styles.groupSummary}>
                <Text style={styles.groupSummaryTitle}>
                  {selectedTables.length} mesa{selectedTables.length !== 1 ? 's' : ''} seleccionada{selectedTables.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.groupSummaryCapacity}>
                  Capacidad total: {freeTablesForGroupModal
                    .filter((t: any) => selectedTables.includes(t.id))
                    .reduce((sum: number, t: any) => sum + (t.minCapacity || 1), 0)} - 
                  {freeTablesForGroupModal
                    .filter((t: any) => selectedTables.includes(t.id))
                    .reduce((sum: number, t: any) => sum + t.maxCapacity, 0)} comensales
                </Text>
                
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  value={customGroupGuests}
                  onChangeText={setCustomGroupGuests}
                  keyboardType="number-pad"
                  placeholder="Número de comensales"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
              <TouchableOpacity
                style={[styles.modalCloseButton, { flex: 1 }]}
                onPress={() => {
                  setShowTableGroupingModal(false);
                  setSelectedTables([]);
                  setCustomGroupGuests('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.callRestaurantButton,
                  { flex: 1 },
                  (selectedTables.length === 0 || !customGroupGuests || parseInt(customGroupGuests) < 1 || isCreatingGroup) && { opacity: 0.5 }
                ]}
                onPress={async () => {
                  const guestsNum = parseInt(customGroupGuests);
                  if (selectedTables.length === 0) {
                    Alert.alert('Error', 'Debes seleccionar al menos una mesa.');
                    return;
                  }
                  if (!customGroupGuests || guestsNum < 1) {
                    Alert.alert('Error', 'Ingresa un número válido de comensales.');
                    return;
                  }
                  
                  const maxCapacity = freeTablesForGroupModal
                    .filter((t: any) => selectedTables.includes(t.id))
                    .reduce((sum: number, t: any) => sum + t.maxCapacity, 0) || 0;
                  
                  if (guestsNum > maxCapacity) {
                    Alert.alert('Error', `El número de comensales no puede exceder la capacidad máxima de ${maxCapacity}.`);
                    return;
                  }
                  
                  if (!selectedDate || !selectedLocation) {
                    Alert.alert('Error', 'Fecha y ubicación son requeridas.');
                    return;
                  }
                  
                  const year = selectedDate.getFullYear();
                  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                  const day = String(selectedDate.getDate()).padStart(2, '0');
                  const dateString = `${year}-${month}-${day}`;
                  
                  try {
                    const validation = await trpcClient.reservations.validateMaxCapacity.query({
                      restaurantId: restaurantQuery.data!.id,
                      locationId: selectedLocation,
                      date: dateString,
                      time: { hour: 12, minute: 0 },
                      guests: guestsNum,
                    });
                    
                    if (!validation.canAccommodate) {
                      Alert.alert(
                        'Capacidad Máxima Excedida',
                        `El grupo de mesas excedería la capacidad máxima configurada para esta fecha.\n\nCapacidad actual: ${validation.currentCapacity}/${validation.maxCapacity}\nNueva reserva: ${guestsNum} comensales\nTotal requerido: ${validation.requiredCapacity}\n\n¿Deseas continuar ampliando la capacidad máxima a ${validation.requiredCapacity} comensales?`,
                        [
                          {
                            text: 'Cancelar',
                            style: 'cancel'
                          },
                          {
                            text: 'Sí, Ampliar y Continuar',
                            onPress: () => {
                              setGuests(guestsNum);
                              setShowTableGroupingModal(false);
                              setSelectedTables(selectedTables);
                              Alert.alert(
                                'Grupo de mesas creado',
                                `Se ha configurado un grupo temporal para ${guestsNum} comensales. Las ${selectedTables.length} mesa${selectedTables.length !== 1 ? 's' : ''} seleccionada${selectedTables.length !== 1 ? 's' : ''} se asignarán automáticamente a esta reserva.\n\n⚠️ La capacidad máxima se ampliará automáticamente a ${validation.requiredCapacity} comensales.\n\nContinúa completando los datos.`
                              );
                            }
                          }
                        ]
                      );
                      return;
                    }
                  } catch (error) {
                    console.error('Error validando capacidad:', error);
                  }
                  
                  setGuests(guestsNum);
                  setShowTableGroupingModal(false);
                  setSelectedTables(selectedTables);
                  Alert.alert(
                    'Grupo de mesas creado',
                    `Se ha configurado un grupo temporal para ${guestsNum} comensales. Las ${selectedTables.length} mesa${selectedTables.length !== 1 ? 's' : ''} seleccionada${selectedTables.length !== 1 ? 's' : ''} se asignarán automáticamente a esta reserva. Continúa completando los datos.`
                  );
                }}
                activeOpacity={0.7}
                disabled={selectedTables.length === 0 || !customGroupGuests || parseInt(customGroupGuests) < 1 || isCreatingGroup}
              >
                {isCreatingGroup ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.callRestaurantButtonText}>Confirmar Agrupación</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTableSplitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTableSplitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={{ maxWidth: 500, width: '90%' }} contentContainerStyle={{ padding: 20 }}>
            <View style={[styles.modalContent, { maxHeight: undefined }]}>
              <Text style={styles.modalTitle}>Dividir Mesa</Text>
              <Text style={styles.modalMessage}>
                Selecciona una mesa grande para dividirla en dos mesas temporales
              </Text>
              
              {!selectedTableToSplit ? (
                <>
                  <Text style={styles.splitStepTitle}>Paso 1: Selecciona la mesa a dividir</Text>
                  <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
                    {availableTablesQuery.isLoading ? (
                      <ActivityIndicator color="#4F46E5" />
                    ) : availableTablesQuery.data && availableTablesQuery.data.length > 0 ? (
                      <View style={styles.tablesGrid}>
                        {availableTablesQuery.data
                          .filter((table: any) => !table.isGroup && table.maxCapacity >= 4)
                          .map((table: any) => (
                            <TouchableOpacity
                              key={table.id}
                              style={styles.tableCard}
                              onPress={() => {
                                setSelectedTableToSplit(table);
                                setModifiedTableACapacity(String(table.maxCapacity));
                                setModifiedTableAHighChairs(String(table.availableHighChairs || 0));
                                setModifiedTableAAllowsStroller(table.allowsStroller || false);
                                setModifiedTableAAllowsPets(table.allowsPets || false);
                              }}
                            >
                              <Text style={styles.tableCardText}>{table.name}</Text>
                              <Text style={styles.tableCardCapacity}>
                                {table.minCapacity}-{table.maxCapacity} pax
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    ) : (
                      <Text style={styles.noTablesText}>No hay mesas disponibles para dividir</Text>
                    )}
                  </ScrollView>
                </>
              ) : (
                <ScrollView style={{ maxHeight: 500 }}>
                  <View style={styles.splitConfigContainer}>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => {
                        setSelectedTableToSplit(null);
                        setSplitGuestCount('');
                        setSplitTableBCapacity('');
                      }}
                    >
                      <Text style={styles.backButtonText}>← Cambiar mesa</Text>
                    </TouchableOpacity>

                    <View style={styles.selectedTableInfo}>
                      <Text style={styles.selectedTableTitle}>Mesa seleccionada: {selectedTableToSplit.name}</Text>
                      <Text style={styles.selectedTableCapacity}>
                        Capacidad original: {selectedTableToSplit.minCapacity}-{selectedTableToSplit.maxCapacity} comensales
                      </Text>
                    </View>

                    <Text style={styles.splitStepTitle}>Paso 2: Número de comensales para esta reserva</Text>
                    <TextInput
                      style={styles.input}
                      value={splitGuestCount}
                      onChangeText={setSplitGuestCount}
                      keyboardType="number-pad"
                      placeholder="Ej: 2"
                      placeholderTextColor="#9CA3AF"
                    />

                    {parseInt(splitGuestCount) > 0 && (
                      <>
                        <View style={styles.divider} />
                        
                        <Text style={styles.splitStepTitle}>Paso 3: Configurar Mesa {selectedTableToSplit.name}B (Temporal)</Text>
                        <Text style={styles.splitDescription}>
                          Esta mesa temporal será creada para la reserva de {splitGuestCount} comensales
                        </Text>
                        
                        <Text style={styles.inputLabel}>Capacidad de la Mesa {selectedTableToSplit.name}B:</Text>
                        <TextInput
                          style={styles.input}
                          value={splitTableBCapacity}
                          onChangeText={setSplitTableBCapacity}
                          keyboardType="number-pad"
                          placeholder={`Ej: ${splitGuestCount}`}
                          placeholderTextColor="#9CA3AF"
                        />

                        <Text style={styles.inputLabel}>Tronas disponibles:</Text>
                        <TextInput
                          style={styles.input}
                          value={splitTableBHighChairs}
                          onChangeText={setSplitTableBHighChairs}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor="#9CA3AF"
                        />

                        <View style={styles.checkboxRow}>
                          <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => setSplitTableBAllowsStroller(!splitTableBAllowsStroller)}
                          >
                            <View style={[styles.checkboxBox, splitTableBAllowsStroller && styles.checkboxBoxChecked]}>
                              {splitTableBAllowsStroller && <Text style={styles.checkboxCheck}>✓</Text>}
                            </View>
                            <Text style={styles.checkboxLabel}>Permite carrito</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.checkboxRow}>
                          <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => setSplitTableBAllowsPets(!splitTableBAllowsPets)}
                          >
                            <View style={[styles.checkboxBox, splitTableBAllowsPets && styles.checkboxBoxChecked]}>
                              {splitTableBAllowsPets && <Text style={styles.checkboxCheck}>✓</Text>}
                            </View>
                            <Text style={styles.checkboxLabel}>Permite mascotas</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.splitStepTitle}>Paso 4: Modificar {selectedTableToSplit.name} temporalmente</Text>
                        <Text style={styles.splitDescription}>
                          Define las nuevas características de la mesa {selectedTableToSplit.name} mientras la Mesa {selectedTableToSplit.name}B esté ocupada
                        </Text>

                        <Text style={styles.inputLabel}>Nueva capacidad de {selectedTableToSplit.name}:</Text>
                        <TextInput
                          style={styles.input}
                          value={modifiedTableACapacity}
                          onChangeText={setModifiedTableACapacity}
                          keyboardType="number-pad"
                          placeholder={`Capacidad reducida (original: ${selectedTableToSplit.maxCapacity})`}
                          placeholderTextColor="#9CA3AF"
                        />

                        <Text style={styles.inputLabel}>Tronas disponibles:</Text>
                        <TextInput
                          style={styles.input}
                          value={modifiedTableAHighChairs}
                          onChangeText={setModifiedTableAHighChairs}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor="#9CA3AF"
                        />

                        <View style={styles.checkboxRow}>
                          <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => setModifiedTableAAllowsStroller(!modifiedTableAAllowsStroller)}
                          >
                            <View style={[styles.checkboxBox, modifiedTableAAllowsStroller && styles.checkboxBoxChecked]}>
                              {modifiedTableAAllowsStroller && <Text style={styles.checkboxCheck}>✓</Text>}
                            </View>
                            <Text style={styles.checkboxLabel}>Permite carrito</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.checkboxRow}>
                          <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => setModifiedTableAAllowsPets(!modifiedTableAAllowsPets)}
                          >
                            <View style={[styles.checkboxBox, modifiedTableAAllowsPets && styles.checkboxBoxChecked]}>
                              {modifiedTableAAllowsPets && <Text style={styles.checkboxCheck}>✓</Text>}
                            </View>
                            <Text style={styles.checkboxLabel}>Permite mascotas</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.infoBox}>
                          <Text style={styles.infoText}>
                            ℹ️ Una vez que la reserva de la Mesa {selectedTableToSplit.name}B termine, la {selectedTableToSplit.name} volverá automáticamente a su configuración original.
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </ScrollView>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                <TouchableOpacity
                  style={[styles.modalCloseButton, { flex: 1 }]}
                  onPress={() => {
                    setShowTableSplitModal(false);
                    setSelectedTableToSplit(null);
                    setSplitGuestCount('');
                    setSplitTableBCapacity('');
                    setSplitTableBHighChairs('0');
                    setSplitTableBAllowsStroller(false);
                    setSplitTableBAllowsPets(false);
                    setModifiedTableACapacity('');
                    setModifiedTableAHighChairs('0');
                    setModifiedTableAAllowsStroller(false);
                    setModifiedTableAAllowsPets(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                {selectedTableToSplit && parseInt(splitGuestCount) > 0 && parseInt(splitTableBCapacity) > 0 && parseInt(modifiedTableACapacity) > 0 && (
                  <TouchableOpacity
                    style={[styles.callRestaurantButton, { flex: 1 }, isCreatingSplit && { opacity: 0.5 }]}
                    onPress={() => {
                      const guestNum = parseInt(splitGuestCount);
                      const tableBCap = parseInt(splitTableBCapacity);
                      const tableACap = parseInt(modifiedTableACapacity);

                      if (guestNum > tableBCap) {
                        Alert.alert('Error', `El número de comensales (${guestNum}) no puede exceder la capacidad de la Mesa ${selectedTableToSplit.name}B (${tableBCap}).`);
                        return;
                      }

                      if (tableACap >= selectedTableToSplit.maxCapacity) {
                        Alert.alert('Error', `La capacidad modificada de ${selectedTableToSplit.name} debe ser menor que la original (${selectedTableToSplit.maxCapacity}).`);
                        return;
                      }

                      setGuests(guestNum);
                      
                      const splitConfig = {
                        type: 'split',
                        originalTableId: selectedTableToSplit.id,
                        originalTableName: selectedTableToSplit.name,
                        splitTableBCapacity: tableBCap,
                        splitTableBHighChairs: parseInt(splitTableBHighChairs) || 0,
                        splitTableBAllowsStroller: splitTableBAllowsStroller,
                        splitTableBAllowsPets: splitTableBAllowsPets,
                        modifiedTableACapacity: tableACap,
                        modifiedTableAHighChairs: parseInt(modifiedTableAHighChairs) || 0,
                        modifiedTableAAllowsStroller: modifiedTableAAllowsStroller,
                        modifiedTableAAllowsPets: modifiedTableAAllowsPets,
                      };
                      
                      setSelectedTables([JSON.stringify(splitConfig)]);
                      setShowTableSplitModal(false);
                      
                      Alert.alert(
                        'División de mesa configurada',
                        `Se dividirá ${selectedTableToSplit.name} en:\n\n` +
                        `• ${selectedTableToSplit.name}B (${tableBCap} comensales) - Para esta reserva\n` +
                        `• ${selectedTableToSplit.name} (${tableACap} comensales) - Disponible para otras reservas\n\n` +
                        `Continúa completando los datos de la reserva.`,
                        [{ text: 'Entendido' }]
                      );
                    }}
                    activeOpacity={0.7}
                    disabled={isCreatingSplit}
                  >
                    {isCreatingSplit ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.callRestaurantButtonText}>Confirmar División</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showWaitlistModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWaitlistModal(false)}
      >
        <View style={styles.waitlistModalOverlay}>
          <View style={styles.waitlistModalContent}>
            <View style={styles.waitlistModalHeader}>
              <Text style={styles.waitlistModalTitle}>📋 Lista de espera</Text>
              <TouchableOpacity onPress={() => setShowWaitlistModal(false)} activeOpacity={0.7}>
                <Text style={styles.waitlistModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {waitlistSuccess ? (
              <View style={styles.waitlistSuccessContainer}>
                <Text style={styles.waitlistSuccessIcon}>✅</Text>
                <Text style={styles.waitlistSuccessTitle}>¡Solicitud registrada!</Text>
                <Text style={styles.waitlistSuccessText}>
                  Tu petición ha sido registrada. Te avisaremos por WhatsApp si hay disponibilidad para {guests} comensales el {selectedDate ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}{waitlistPreferredTime ? ` a las ${waitlistPreferredTime}` : ''}.
                </Text>
                <TouchableOpacity
                  style={styles.waitlistSuccessButton}
                  onPress={() => setShowWaitlistModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.waitlistSuccessButtonText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.waitlistInfoRow}>
                  <Text style={styles.waitlistInfoLabel}>📅 Fecha</Text>
                  <Text style={styles.waitlistInfoValue}>
                    {selectedDate ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : '-'}
                  </Text>
                </View>
                <View style={styles.waitlistInfoRow}>
                  <Text style={styles.waitlistInfoLabel}>👥 Comensales</Text>
                  <Text style={styles.waitlistInfoValue}>{guests} personas</Text>
                </View>

                {(guestCountsQuery.data?.allowsHighChairs || guestCountsQuery.data?.allowsStrollers || guestCountsQuery.data?.allowsPets) && (
                  <View style={styles.waitlistExtrasSection}>
                    <Text style={styles.waitlistExtrasTitle}>Necesidades especiales</Text>
                    {guestCountsQuery.data?.allowsHighChairs && (
                      <TouchableOpacity
                        style={styles.waitlistCheckboxRow}
                        onPress={() => setWaitlistHighChairs(!waitlistHighChairs)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.waitlistCheckboxBox, waitlistHighChairs && styles.waitlistCheckboxBoxChecked]}>
                          {waitlistHighChairs && <Text style={styles.waitlistCheckboxCheck}>✓</Text>}
                        </View>
                        <Text style={styles.waitlistCheckboxLabel}>Necesito tronas 🪑</Text>
                      </TouchableOpacity>
                    )}
                    {waitlistHighChairs && guestCountsQuery.data?.allowsHighChairs && (
                      <View style={styles.waitlistStepperRow}>
                        <TouchableOpacity
                          style={styles.waitlistStepBtn}
                          onPress={() => { const c = parseInt(waitlistHighChairCount) || 1; if (c > 1) setWaitlistHighChairCount(String(c - 1)); }}
                        >
                          <Text style={styles.waitlistStepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.waitlistStepCount}>{parseInt(waitlistHighChairCount) || 1} trona{(parseInt(waitlistHighChairCount) || 1) !== 1 ? 's' : ''}</Text>
                        <TouchableOpacity
                          style={styles.waitlistStepBtn}
                          onPress={() => { const c = parseInt(waitlistHighChairCount) || 1; setWaitlistHighChairCount(String(c + 1)); }}
                        >
                          <Text style={styles.waitlistStepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {guestCountsQuery.data?.allowsStrollers && (
                      <TouchableOpacity
                        style={styles.waitlistCheckboxRow}
                        onPress={() => setWaitlistStroller(!waitlistStroller)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.waitlistCheckboxBox, waitlistStroller && styles.waitlistCheckboxBoxChecked]}>
                          {waitlistStroller && <Text style={styles.waitlistCheckboxCheck}>✓</Text>}
                        </View>
                        <Text style={styles.waitlistCheckboxLabel}>Necesito espacio para carrito 🛒</Text>
                      </TouchableOpacity>
                    )}
                    {guestCountsQuery.data?.allowsPets && (
                      <TouchableOpacity
                        style={styles.waitlistCheckboxRow}
                        onPress={() => setWaitlistPets(!waitlistPets)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.waitlistCheckboxBox, waitlistPets && styles.waitlistCheckboxBoxChecked]}>
                          {waitlistPets && <Text style={styles.waitlistCheckboxCheck}>✓</Text>}
                        </View>
                        <Text style={styles.waitlistCheckboxLabel}>Vendré con mascota 🐾</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {waitlistTimeSlots.length > 0 && (
                  <View style={styles.waitlistExtrasSection}>
                    <Text style={styles.waitlistExtrasTitle}>🕐 Horario preferido (opcional)</Text>
                    <Text style={[styles.waitlistNotice, { marginBottom: 8, marginTop: 0 }]}>Selecciona el horario que prefieres.</Text>
                    <View style={styles.waitlistTimeSlotsGrid}>
                      {waitlistTimeSlots.map((slot) => (
                        <TouchableOpacity
                          key={slot}
                          style={[
                            styles.waitlistTimeSlot,
                            waitlistPreferredTime === slot && styles.waitlistTimeSlotSelected,
                          ]}
                          onPress={() => setWaitlistPreferredTime(waitlistPreferredTime === slot ? '' : slot)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.waitlistTimeSlotText,
                            waitlistPreferredTime === slot && styles.waitlistTimeSlotTextSelected,
                          ]}>
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <Text style={styles.waitlistNotesLabel}>Notas (opcional)</Text>
                <TextInput
                  style={styles.waitlistNotesInput}
                  value={waitlistNotes}
                  onChangeText={setWaitlistNotes}
                  placeholder="Preferencias adicionales, etc."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.waitlistNotice}>
                  Cuando haya disponibilidad recibirás una notificación por WhatsApp. Tendrás 15 minutos para confirmar tu reserva.
                </Text>
                <TouchableOpacity
                  style={[styles.waitlistSubmitButton, waitlistCreateMutation.isPending && styles.waitlistSubmitButtonDisabled]}
                  onPress={() => {
                    if (!restaurantQuery.data?.id || !selectedDate || !guests || !selectedLocation) return;
                    const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                    waitlistCreateMutation.mutate({
                      restaurantId: restaurantQuery.data.id,
                      clientPhone: phonePrefix + phoneNumber,
                      clientName,
                      date: dateString,
                      guests,
                      locationId: selectedLocation,
                      notes: waitlistNotes,
                      needsHighChair: waitlistHighChairs,
                      highChairCount: waitlistHighChairs ? (parseInt(waitlistHighChairCount) || 1) : 0,
                      needsStroller: waitlistStroller,
                      hasPets: waitlistPets,
                      preferredTime: waitlistPreferredTime || undefined,
                    });
                  }}
                  disabled={waitlistCreateMutation.isPending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.waitlistSubmitButtonText}>
                    {waitlistCreateMutation.isPending ? 'Registrando...' : 'Unirme a la lista de espera'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '600' as const,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 8,
  },
  restaurantDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 24,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  infoBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  infoText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600' as const,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 12,
  },
  dateScroll: {
    marginTop: 8,
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  dateCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  dateCardClosed: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    opacity: 0.7,
  },
  dateDay: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600' as const,
  },
  dateDaySelected: {
    color: '#4F46E5',
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginVertical: 4,
  },
  dateNumberSelected: {
    color: '#4F46E5',
  },
  dateMonth: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600' as const,
  },
  dateMonthSelected: {
    color: '#4F46E5',
  },
  dateDayClosed: {
    color: '#9CA3AF',
  },
  dateNumberClosed: {
    color: '#9CA3AF',
  },
  dateMonthClosed: {
    color: '#9CA3AF',
  },
  closedLabel: {
    fontSize: 8,
    color: '#EF4444',
    fontWeight: '700' as const,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  locationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 100,
  },
  locationCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    textAlign: 'center',
  },
  locationTextSelected: {
    color: '#4F46E5',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  inputSmall: {
    marginTop: 8,
    marginLeft: 32,
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
  },
  timeCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  timeCardUnavailable: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    opacity: 0.7,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  timeTextSelected: {
    color: '#4F46E5',
  },
  timeTextUnavailable: {
    color: '#DC2626',
  },
  checkboxRow: {
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#111827',
  },
  termsSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  termsCheckbox: {
    marginTop: 2,
  },
  termsCheckboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#93C5FD',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsCheckboxBoxChecked: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  termsCheckboxCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  termsText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  disclaimer: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    lineHeight: 18,
  },
  submitButtonSecondary: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  submitButtonSecondaryText: {
    color: '#4F46E5',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  disclaimerSecondary: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  linksSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  customLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 10,
  },
  customLinkText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#4F46E5',
  },
  importantMessageContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  importantMessageText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#dc2626',
    textAlign: 'center',
    lineHeight: 24,
  },
  guestContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  guestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 60,
    alignItems: 'center',
  },
  guestCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  guestCardMore: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10B981',
    minWidth: 60,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
  },
  guestTextSelected: {
    color: '#4F46E5',
  },
  guestTextMore: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 10,
  },
  tableCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative' as const,
  },
  tableCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  tableCardText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  tableCardTextSelected: {
    color: '#4F46E5',
  },
  tableCardCapacity: {
    fontSize: 12,
    color: '#6B7280',
  },
  tableCardCapacitySelected: {
    color: '#6366F1',
  },
  tableCardCheck: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    fontSize: 18,
    color: '#4F46E5',
  },
  groupSummary: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  groupSummaryTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#166534',
    marginBottom: 4,
  },
  groupSummaryCapacity: {
    fontSize: 13,
    color: '#15803D',
  },
  existingClientInfo: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 12,
  },
  existingClientLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6366F1',
    marginBottom: 4,
  },
  existingClientName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#4F46E5',
    marginBottom: 8,
  },
  verifyButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  verifiedBox: {
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  verifiedText: {
    fontSize: 16,
    color: '#065F46',
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  changePhoneText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
  blockedBox: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  blockedText: {
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  modalDetailLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4B5563',
    marginBottom: 8,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  modalButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  specialMessageContainer: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  specialMessageTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 8,
  },
  specialMessageText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  phoneLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  prefixButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefixButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  prefixModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  prefixModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  prefixModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#111827',
  },
  prefixModalClose: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '600' as const,
  },
  prefixList: {
    maxHeight: 400,
  },
  prefixOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  prefixOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  prefixFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  prefixInfo: {
    flex: 1,
  },
  prefixCountry: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 2,
  },
  prefixCode: {
    fontSize: 14,
    color: '#6B7280',
  },
  prefixCheck: {
    fontSize: 20,
    color: '#4F46E5',
    fontWeight: '700' as const,
  },
  noTablesMessage: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  noTablesTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#991B1B',
    marginBottom: 8,
  },
  noTablesText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 12,
  },
  clearOptionsButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearOptionsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    marginTop: 8,
    marginLeft: 32,
    borderRadius: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#991B1B',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  unavailableModalText: {
    fontSize: 15,
    color: '#991B1B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  unavailableModalTime: {
    fontWeight: '700' as const,
    color: '#DC2626',
  },
  callRestaurantButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  callRestaurantButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  modalCloseButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  actionButtonTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 6,
  },
  actionButtonDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  splitConfigContainer: {
    width: '100%',
  },
  splitStepTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  splitDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  selectedTableInfo: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  selectedTableTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#4F46E5',
    marginBottom: 4,
  },
  selectedTableCapacity: {
    fontSize: 14,
    color: '#6366F1',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 6,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4B5563',
  },
  timeCardOverCapacity: {
    backgroundColor: '#FFF0F3',
    borderColor: '#FBBDD3',
  },
  timeCardOverCapacitySelected: {
    backgroundColor: '#FFD6E4',
    borderColor: '#F43F7A',
  },
  timeTextOverCapacity: {
    color: '#BE185D',
  },
  overCapacityBadge: {
    fontSize: 10,
    color: '#BE185D',
    fontWeight: '700' as const,
    marginTop: 2,
  },
  overCapacityModalIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  overCapacityModalText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  overCapacityModalTime: {
    fontWeight: '700' as const,
    color: '#BE185D',
  },
  overCapacityModalHighlight: {
    fontWeight: '700' as const,
    color: '#DC2626',
  },
  overCapacityModalButtons: {
    width: '100%',
    gap: 10,
  },
  overCapacityAcceptButton: {
    backgroundColor: '#F43F7A',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  overCapacityAcceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  overCapacityCancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  overCapacityCancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  noTablesErrorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noTablesErrorIconText: {
    fontSize: 40,
  },
  noTablesErrorText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'left',
    width: '100%',
  },
  tronasStepper: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden' as const,
    marginTop: 4,
    marginBottom: 4,
  },
  tronasStepBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  tronasStepBtnText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#4F46E5',
    lineHeight: 26,
  },
  tronasStepCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tronasStepCount: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#111827',
    lineHeight: 26,
  },
  tronasStepLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  tronasSummaryCard: {
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  tronasSummaryRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tronasSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  tronasSummaryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  tronasSummaryNum: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#4F46E5',
    lineHeight: 26,
  },
  tronasSummaryNumTotal: {
    color: '#111827',
  },
  tronasSummaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500' as const,
    marginTop: 2,
  },
  tronasSummaryOp: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#9CA3AF',
    paddingBottom: 10,
  },
  waitlistButton: {
    marginTop: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  waitlistButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#4338CA',
  },
  waitlistButtonSub: {
    fontSize: 12,
    color: '#6366F1',
    marginTop: 2,
  },
  waitlistModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  waitlistModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  waitlistModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 16,
  },
  waitlistModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  waitlistModalClose: {
    fontSize: 20,
    color: '#6B7280',
    padding: 4,
  },
  waitlistSuccessContainer: {
    alignItems: 'center' as const,
    paddingVertical: 16,
  },
  waitlistSuccessIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  waitlistSuccessTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#065F46',
    marginBottom: 8,
  },
  waitlistSuccessText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 20,
  },
  waitlistSuccessButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  waitlistSuccessButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  waitlistInfoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  waitlistInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  waitlistInfoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111827',
  },
  waitlistNotesLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginTop: 8,
    marginBottom: 6,
  },
  waitlistNotesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 80,
    textAlignVertical: 'top' as const,
    marginBottom: 8,
  },
  waitlistNotice: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
  },
  waitlistSubmitButton: {
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  waitlistSubmitButtonDisabled: {
    opacity: 0.6,
  },
  waitlistSubmitButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  waitlistExtrasSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  waitlistExtrasTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 10,
  },
  waitlistCheckboxRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    gap: 10,
  },
  waitlistCheckboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  waitlistCheckboxBoxChecked: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  waitlistCheckboxCheck: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  waitlistCheckboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  waitlistStepperRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden' as const,
    marginLeft: 32,
    marginBottom: 4,
    alignSelf: 'flex-start' as const,
  },
  waitlistStepBtn: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#F3F4F6',
  },
  waitlistStepBtnText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#4338CA',
    lineHeight: 24,
  },
  waitlistStepCount: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
    paddingHorizontal: 16,
  },
  waitlistTimeSlotsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 4,
  },
  waitlistTimeSlot: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  waitlistTimeSlotSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  waitlistTimeSlotText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
  },
  waitlistTimeSlotTextSelected: {
    color: '#4338CA',
  },
});

