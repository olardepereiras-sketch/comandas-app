import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { trpc, trpcClient, ensureWhatsAppWakeUp } from '@/lib/trpc';
import type { TimeSlot } from '@/types';
import { MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react-native';

export default function RestaurantDetails3Screen() {
  const router = useRouter();
  const { slug, tableId, locationId, shiftTemplateId, shiftDate, minTime } = useLocalSearchParams<{ slug: string; tableId?: string; locationId?: string; shiftTemplateId?: string; shiftDate?: string; minTime?: string }>();

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
  const [preselectedTableInfo, setPreselectedTableInfo] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showOverCapacityModal, setShowOverCapacityModal] = useState<boolean>(false);
  const [overCapacitySlotInfo, setOverCapacitySlotInfo] = useState<{ slot: any; overBy: number; maxGuests: number; newMaxGuests: number } | null>(null);
  const [isExpandingCapacity, setIsExpandingCapacity] = useState<boolean>(false);
  const [showSubmitCapacityModal, setShowSubmitCapacityModal] = useState<boolean>(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<{ fullPhone: string; dateString: string; tableIds: string[]; skipConfirmation: boolean; current: number; max: number; required: number } | null>(null);

  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [groupSelectedTables, setGroupSelectedTables] = useState<string[]>([]);
  const [splitTableAMinCapacity, setSplitTableAMinCapacity] = useState<string>('1');
  const [splitTableAMaxCapacity, setSplitTableAMaxCapacity] = useState<string>('');
  const [splitTableBMinCapacity, setSplitTableBMinCapacity] = useState<string>('1');
  const [splitTableBMaxCapacity, setSplitTableBMaxCapacity] = useState<string>('');
  const [splitSelectedTable, setSplitSelectedTable] = useState<'A' | 'B'>('A');
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [additionalGroupTableIds, setAdditionalGroupTableIds] = useState<string[]>([]);
  const [effectiveTableId, setEffectiveTableId] = useState<string | undefined>(undefined);
  const [groupedMaxCapacity, setGroupedMaxCapacity] = useState<number | null>(null);

  const [showTimeRequiredHint, setShowTimeRequiredHint] = useState<boolean>(false);
  const [showReduceGuestsModal, setShowReduceGuestsModal] = useState<boolean>(false);
  const [pendingReduceGuests, setPendingReduceGuests] = useState<{ newGuests: number; originalMax: number } | null>(null);
  const [splitChoiceMade, setSplitChoiceMade] = useState<boolean>(false);

  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{
    date: Date | null;
    time: { hour: number; minute: number } | null;
    guests: number | null;
    tableName: string;
  } | null>(null);

  const expandSlotCapacityMutation = trpc.reservations.expandSlotCapacity.useMutation();
  const createSplitTableMutation = trpc.tables.createSplitTable.useMutation();

  const restaurantQuery = trpc.restaurants.details.useQuery({ slug: slug || '' });

  const lastWakeUpRestaurantIdRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    const restaurantId = restaurantQuery.data?.id;

    if (!restaurantId || lastWakeUpRestaurantIdRef.current === restaurantId) {
      return;
    }

    lastWakeUpRestaurantIdRef.current = restaurantId;
    console.log('[Restaurant3] 🔔 Despertando WhatsApp Manager para:', restaurantId);
    void ensureWhatsAppWakeUp(restaurantId);
  }, [restaurantQuery.data?.id]);
  const locationsQuery = trpc.locations.list.useQuery(
    { restaurantId: restaurantQuery.data?.id || '' },
    { enabled: !!restaurantQuery.data?.id }
  );
  
  // Usar listForPlanning para poder encontrar mesas temporales (divididas/agrupadas)
  const tablesQuery = trpc.tables.listForPlanning.useQuery(
    { 
      restaurantId: restaurantQuery.data?.id || '',
      shiftTemplateId: shiftTemplateId || undefined,
      shiftDate: shiftDate || undefined,
    },
    { enabled: !!restaurantQuery.data?.id && !!tableId }
  );

  const dayExceptionsQuery = trpc.dayExceptions.list.useQuery(
    { restaurantId: restaurantQuery.data?.id || '' },
    { enabled: !!restaurantQuery.data?.id }
  );

  useEffect(() => {
    if (!isInitialized && tablesQuery.data && tableId && locationId) {
      const table = tablesQuery.data.find((t: any) => t.id === tableId);
      if (table) {
        setPreselectedTableInfo(table);
        setSelectedLocation(locationId);
        setGuests(table.maxCapacity || 2);
        
        if (shiftDate) {
          const [y, m, d] = shiftDate.split('-').map(Number);
          const parsedDate = new Date(y, m - 1, d);
          parsedDate.setHours(0, 0, 0, 0);
          setSelectedDate(parsedDate);
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          setSelectedDate(today);
        }
        
        setIsInitialized(true);
        console.log('[Restaurant3] Pre-selected table:', table.name, 'Location:', locationId, 'Guests:', table.maxCapacity);
      }
    }
  }, [tablesQuery.data, tableId, locationId, isInitialized, shiftDate]);

  const selectedDateString = selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : '';

  const fullPhoneForQuery = clientVerified ? phonePrefix + phoneNumber : undefined;

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

  const availableTablesForGroupQuery = trpc.tables.availableForReservation.useQuery(
    {
      restaurantId: restaurantQuery.data?.id || '',
      locationId: selectedLocation,
      date: selectedDateString || '',
      time: selectedTime || { hour: 0, minute: 0 },
      guests: guests || 1,
      skipCapacityFilter: true,
    },
    { enabled: showGroupModal && !!selectedTime && !!selectedDateString && !!restaurantQuery.data?.id && !!selectedLocation }
  );

  const specialDayMessage = useMemo(() => {
    if (!selectedDate || !dayExceptionsQuery.data) return null;
    
    const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const exception = dayExceptionsQuery.data.find((ex: any) => ex.date === dateString);
    
    if (exception?.specialMessageEnabled && exception?.specialDayMessage) {
      return exception.specialDayMessage;
    }
    return null;
  }, [selectedDate, dayExceptionsQuery.data]);

  const createReservationMutation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      console.log('✅ [CREATE RESERVATION] Reserva creada exitosamente');
      setSuccessData({
        date: selectedDate,
        time: selectedTime,
        guests: guests,
        tableName: preselectedTableInfo?.name || 'Mesa',
      });
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      console.error('❌ [CREATE RESERVATION] Error completo:', error);
      const errorMessage = error?.message || error?.data?.message || 'No se pudo crear la reserva. Inténtalo de nuevo.';
      Alert.alert('Error al Crear Reserva', errorMessage);
    },
  });

  const resetForm = () => {
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
    setSplitChoiceMade(false);
  };

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
          'Lo sentimos, no puedes realizar reservas en este restaurante.',
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

  const tableAllowsHighChairs = (preselectedTableInfo?.availableHighChairs > 0) || (preselectedTableInfo?.allowsHighChairs === true);
  const tableAllowsStroller = preselectedTableInfo?.allowsStroller === true || preselectedTableInfo?.allowsStrollers === true;
  const tableAllowsPets = preselectedTableInfo?.allowsPets === true;

  const restaurantHighChairs = restaurantQuery.data?.availableHighChairs || 0;
  const slotHighChairs = (selectedTime as any)?.availableHighChairs;
  const effectiveHighChairMax = slotHighChairs !== undefined ? slotHighChairs : restaurantHighChairs;

  const highChairAvailability = useMemo(() => {
    if (!needsHighChairs) return { exceeded: false, available: 0, requested: 0, showWarning: false };
    const requestedHighChairs = parseInt(highChairCount) || 1;
    const available = slotHighChairs !== undefined ? slotHighChairs : restaurantHighChairs;
    
    if (requestedHighChairs > available) {
      return { exceeded: true, available, requested: requestedHighChairs, showWarning: true };
    }
    
    return { exceeded: false, available, requested: requestedHighChairs, showWarning: false };
  }, [needsHighChairs, highChairCount, slotHighChairs, restaurantHighChairs]);
  
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
    const activeTableId = effectiveTableId || tableId;
    const tableIds = activeTableId ? [activeTableId, ...additionalGroupTableIds] : additionalGroupTableIds;
    
    const selectedSlotData = availableSlotsQuery.data?.find(
      (s: any) => s.hour === selectedTime.hour && s.minute === selectedTime.minute
    );
    
    if (selectedSlotData?.isOverCapacity) {
      console.log('⚠️ [SUBMIT R3] Slot seleccionado está sobre capacidad, mostrando confirmación');
      setPendingSubmitData({
        fullPhone,
        dateString,
        tableIds,
        skipConfirmation: false,
        current: selectedSlotData.currentGuests || 0,
        max: selectedSlotData.maxGuests || 0,
        required: (selectedSlotData.currentGuests || 0) + guests,
      });
      setShowSubmitCapacityModal(true);
      return;
    }
    
    proceedWithReservation(fullPhone, dateString, tableIds);
  };
  
  const proceedWithReservation = (fullPhone: string, dateString: string, tableIds: string[], skipConfirmation: boolean = false) => {
    createReservationMutation.mutate({
      restaurantId: restaurantQuery.data!.id,
      clientPhone: fullPhone,
      clientName: clientName.trim(),
      date: dateString,
      time: selectedTime!,
      guests: guests!,
      locationId: selectedLocation,
      tableIds: tableIds,
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
    const activeTableId = effectiveTableId || tableId;
    const tableIds = activeTableId ? [activeTableId, ...additionalGroupTableIds] : additionalGroupTableIds;
    
    proceedWithReservation(fullPhone, dateString, tableIds, true);
  };

  if (restaurantQuery.isLoading || tablesQuery.isLoading) {
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
  const locationName = locationsQuery.data?.find((l: any) => l.id === selectedLocation)?.name || 'Ubicación';

  return (
    <>
      <Stack.Screen options={{ title: restaurant.name + ' - Reserva Rápida' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
        </View>

        {preselectedTableInfo && (
          <View style={styles.preselectedInfo}>
            <View style={styles.preselectedHeader}>
              <MapPin size={20} color="#4F46E5" />
              <Text style={styles.preselectedTitle}>Mesa Pre-seleccionada</Text>
            </View>
            <View style={styles.preselectedDetails}>
              <View style={styles.preselectedItem}>
                <Text style={styles.preselectedLabel}>Mesa:</Text>
                <Text style={styles.preselectedValue}>{preselectedTableInfo.name}</Text>
              </View>
              <View style={styles.preselectedItem}>
                <Text style={styles.preselectedLabel}>Ubicación:</Text>
                <Text style={styles.preselectedValue}>{locationName}</Text>
              </View>
              <View style={styles.preselectedItem}>
                <Text style={styles.preselectedLabel}>Capacidad:</Text>
                <Text style={styles.preselectedValue}>{preselectedTableInfo.minCapacity || 1} - {preselectedTableInfo.maxCapacity || preselectedTableInfo.capacity} pax</Text>
              </View>
              <View style={styles.preselectedItem}>
                <Text style={styles.preselectedLabel}>Fecha:</Text>
                <View style={styles.dateNavRow}>
                  <TouchableOpacity
                    style={styles.dateNavBtn}
                    onPress={() => {
                      if (!selectedDate) return;
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() - 1);
                      d.setHours(0, 0, 0, 0);
                      setSelectedDate(d);
                      setSelectedTime(null);
                    }}
                  >
                    <ChevronLeft size={18} color="#4F46E5" />
                  </TouchableOpacity>
                  <Text style={styles.preselectedValue}>
                    {selectedDate?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity
                    style={styles.dateNavBtn}
                    onPress={() => {
                      if (!selectedDate) return;
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() + 1);
                      d.setHours(0, 0, 0, 0);
                      setSelectedDate(d);
                      setSelectedTime(null);
                    }}
                  >
                    <ChevronRight size={18} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.tableFeatures}>
              {tableAllowsHighChairs && (
                <View style={styles.featureBadge}>
                  <Text style={styles.featureBadgeText}>👶 Tronas ({preselectedTableInfo.availableHighChairs})</Text>
                </View>
              )}
              {tableAllowsStroller && (
                <View style={styles.featureBadge}>
                  <Text style={styles.featureBadgeText}>🛒 Carrito</Text>
                </View>
              )}
              {tableAllowsPets && (
                <View style={styles.featureBadge}>
                  <Text style={styles.featureBadgeText}>🐕 Mascotas</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Datos de Contacto</Text>
          
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
              
              <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyClient}>
                <Text style={styles.verifyButtonText}>Continuar</Text>
              </TouchableOpacity>
            </>
          )}
          
          {clientVerified && (
            <View style={styles.verifiedBox}>
              <Text style={styles.verifiedText}>✓ Cliente: {clientName}</Text>
              <TouchableOpacity onPress={() => { setClientVerified(false); setPhoneNumber(''); setClientName(''); setPhoneChecked(false); setSelectedTime(null); }}>
                <Text style={styles.changePhoneText}>Cambiar</Text>
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
            <Text style={styles.sectionTitle}>2. Número de Comensales</Text>
            <View style={styles.guestSelector}>
              <TouchableOpacity
                style={[styles.guestButton, (guests !== null && guests <= 1) && styles.guestButtonDisabled]}
                onPress={() => {
                  const currentGuests = guests ?? (preselectedTableInfo?.maxCapacity ?? 2);
                  const newGuests = currentGuests - 1;
                  if (newGuests < 1) return;
                  const originalMax = preselectedTableInfo?.maxCapacity || 4;
                  const minCap = preselectedTableInfo?.minCapacity || 1;
                  if (preselectedTableInfo && newGuests < minCap && !splitChoiceMade) {
                    setPendingReduceGuests({ newGuests, originalMax });
                    setShowReduceGuestsModal(true);
                  } else {
                    setGuests(Math.max(1, newGuests));
                  }
                }}
                disabled={guests !== null && guests <= 1}
              >
                <Text style={styles.guestButtonText}>-</Text>
              </TouchableOpacity>
              <View style={styles.guestDisplay}>
                <Users size={20} color="#4F46E5" />
                <Text style={styles.guestCount}>{guests}</Text>
                <Text style={styles.guestLabel}>pax</Text>
              </View>
              <TouchableOpacity
                style={styles.guestButton}
                onPress={() => {
                  const currentMax = groupedMaxCapacity !== null ? groupedMaxCapacity : (preselectedTableInfo?.maxCapacity || 10);
                  const nextGuests = (guests || 1) + 1;
                  if (nextGuests > currentMax) {
                    if (!selectedTime) {
                      setShowTimeRequiredHint(true);
                      Alert.alert(
                        '⏰ Selecciona un horario primero',
                        'Para agrupar mesas y aumentar el número de comensales, primero debes seleccionar el horario deseado. Desplázate hacia abajo para ver los horarios disponibles.',
                        [{ text: 'Entendido' }]
                      );
                      return;
                    }
                    setShowTimeRequiredHint(false);
                    setSplitChoiceMade(false);
                    setGroupSelectedTables([]);
                    setShowGroupModal(true);
                  } else {
                    setShowTimeRequiredHint(false);
                    setGuests(nextGuests);
                  }
                }}
              >
                <Text style={styles.guestButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            {showTimeRequiredHint && !selectedTime && (
              <View style={styles.timeRequiredHint}>
                <Text style={styles.timeRequiredHintText}>⏰ Para aumentar más comensales (agrupar mesas), selecciona primero un horario abajo</Text>
              </View>
            )}
            {additionalGroupTableIds.length > 0 && (
              <View style={styles.groupedInfo}>
                <Text style={styles.groupedInfoText}>🔗 Mesa agrupada — Capacidad combinada: {groupedMaxCapacity} pax</Text>
                <TouchableOpacity onPress={() => { setAdditionalGroupTableIds([]); setGroupedMaxCapacity(null); setGuests(preselectedTableInfo?.maxCapacity || guests); }}>
                  <Text style={styles.groupedInfoUndo}>Deshacer agrupación</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.guestHint}>
              Capacidad: {preselectedTableInfo?.minCapacity || 1} - {groupedMaxCapacity || preselectedTableInfo?.maxCapacity || preselectedTableInfo?.capacity} personas
            </Text>
          </View>
        )}

        {clientVerified && guests && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Selecciona la Hora</Text>
            {availableSlotsQuery.isLoading ? (
              <ActivityIndicator />
            ) : availableSlotsQuery.data && availableSlotsQuery.data.length === 0 ? (
              <View style={styles.noTablesMessage}>
                <Text style={styles.noTablesTitle}>⚠️ No hay horarios disponibles</Text>
                <Text style={styles.noTablesText}>No hay horarios disponibles para hoy.</Text>
              </View>
            ) : (
              <View style={styles.timeContainer}>
                {availableSlotsQuery.data?.filter((slot: any) => {
                  if (!minTime) return true;
                  const [minH, minM] = (minTime as string).split(':').map(Number);
                  const minMinutes = minH * 60 + minM;
                  const slotMinutes = slot.hour * 60 + slot.minute;
                  return slotMinutes >= minMinutes;
                }).map((slot: any, index: number) => {
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
            )}
          </View>
        )}

        {clientVerified && selectedTime && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Necesidades Especiales</Text>
              
              {tableAllowsHighChairs && (
                <>
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity style={styles.checkbox} onPress={() => setNeedsHighChairs(!needsHighChairs)}>
                      <View style={[styles.checkboxBox, needsHighChairs && styles.checkboxBoxChecked]}>
                        {needsHighChairs && <Text style={styles.checkboxCheck}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>Tronas (máx. {effectiveHighChairMax})</Text>
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

                      {(highChairExceedsGuests || isHighChairLimitExceeded) && (
                        <View style={styles.warningBox}>
                          <Text style={styles.warningText}>
                            {highChairExceedsGuests ? 'Debe haber al menos 1 adulto.' : `Solo hay ${highChairAvailability.available} trona(s) disponible(s).`}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}

              {tableAllowsStroller && (
                <View style={styles.checkboxRow}>
                  <TouchableOpacity style={styles.checkbox} onPress={() => setNeedsStroller(!needsStroller)}>
                    <View style={[styles.checkboxBox, needsStroller && styles.checkboxBoxChecked]}>
                      {needsStroller && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>Espacio para carrito</Text>
                  </TouchableOpacity>
                </View>
              )}

              {tableAllowsPets && (
                <View style={styles.checkboxRow}>
                  <TouchableOpacity style={styles.checkbox} onPress={() => setHasPets(!hasPets)}>
                    <View style={[styles.checkboxBox, hasPets && styles.checkboxBoxChecked]}>
                      {hasPets && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>Vendré con mascota</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!tableAllowsHighChairs && !tableAllowsStroller && !tableAllowsPets && (
                <Text style={styles.noFeaturesText}>Esta mesa no tiene opciones especiales.</Text>
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
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.termsSection}>
              <View style={styles.termsCheckboxRow}>
                <TouchableOpacity style={styles.termsCheckbox} onPress={() => setTermsAccepted(!termsAccepted)}>
                  <View style={[styles.termsCheckboxBox, termsAccepted && styles.termsCheckboxBoxChecked]}>
                    {termsAccepted && <Text style={styles.termsCheckboxCheck}>✓</Text>}
                  </View>
                </TouchableOpacity>
                <View style={styles.termsTextContainer}>
                  <Text style={styles.termsText}>
                    Acepto los términos y condiciones y autorizo notificaciones de WhatsApp.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (createReservationMutation.isPending || !termsAccepted || isHighChairLimitExceeded || highChairExceedsGuests) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={createReservationMutation.isPending || !termsAccepted || isHighChairLimitExceeded || highChairExceedsGuests}
            >
              {createReservationMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Confirmar Reserva</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>El cliente recibirá WhatsApp para confirmar.</Text>

            <TouchableOpacity
              style={[styles.submitButtonSecondary, (createReservationMutation.isPending || !termsAccepted || isHighChairLimitExceeded || highChairExceedsGuests) && styles.submitButtonDisabled]}
              onPress={handleSubmitWithoutConfirmation}
              disabled={createReservationMutation.isPending || !termsAccepted || isHighChairLimitExceeded || highChairExceedsGuests}
            >
              <Text style={styles.submitButtonSecondaryText}>Reserva sin Confirmar</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimerSecondary}>Se añadirá a {preselectedTableInfo?.name} automáticamente.</Text>
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
                <View style={{ width: '100%', marginVertical: 12, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>Reservas actuales:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700' as const, color: '#111827' }}>{pendingSubmitData.current} pax</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
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
                onPress={() => {
                  if (!pendingSubmitData) return;
                  const { fullPhone, dateString, tableIds: pTableIds, skipConfirmation } = pendingSubmitData;
                  setShowSubmitCapacityModal(false);
                  setPendingSubmitData(null);
                  proceedWithReservation(fullPhone, dateString, pTableIds, skipConfirmation);
                }}
              >
                <Text style={styles.overCapacityAcceptButtonText}>Sí, Continuar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.overCapacityCancelButton}
                onPress={() => { setShowSubmitCapacityModal(false); setPendingSubmitData(null); }}
              >
                <Text style={styles.overCapacityCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showOverCapacityModal} transparent animationType="fade" onRequestClose={() => { setShowOverCapacityModal(false); setOverCapacitySlotInfo(null); }}>
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
                {' '}(límite: {overCapacitySlotInfo.maxGuests} → {overCapacitySlotInfo.newMaxGuests}).
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
              >
                <Text style={styles.overCapacityCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showGroupModal} transparent animationType="slide" onRequestClose={() => { setShowGroupModal(false); setGroupSelectedTables([]); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' as any }]}>
            <Text style={styles.modalTitle}>🔗 Agrupar Mesa</Text>
            <Text style={styles.modalMessage}>
              {additionalGroupTableIds.length > 0
                ? `Capacidad actual del grupo: ${groupedMaxCapacity} pax.\nSelecciona una mesa adicional para ampliar el grupo:`
                : `La capacidad máxima de ${preselectedTableInfo?.name} es ${preselectedTableInfo?.maxCapacity} pax.\nSelecciona otra mesa para agrupar:`}
            </Text>
            <ScrollView style={{ maxHeight: 280, width: '100%' }}>
              {tablesQuery.data
                ?.filter((t: any) => {
                  if (t.id === tableId || t.locationId !== selectedLocation || t.isTemporary) return false;
                  if (additionalGroupTableIds.includes(t.id)) return false;
                  if (selectedTime && availableTablesForGroupQuery.data) {
                    return availableTablesForGroupQuery.data.some((at: any) => at.id === t.id);
                  }
                  return true;
                })
                .map((table: any) => {
                  const isSelected = groupSelectedTables.includes(table.id);
                  return (
                    <TouchableOpacity
                      key={table.id}
                      style={[styles.groupTableCard, isSelected && styles.groupTableCardSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setGroupSelectedTables(prev => prev.filter(id => id !== table.id));
                        } else {
                          setGroupSelectedTables(prev => [...prev, table.id]);
                        }
                      }}
                    >
                      <Text style={[styles.groupTableName, isSelected && styles.groupTableNameSelected]}>{table.name}</Text>
                      <Text style={[styles.groupTableCapacity, isSelected && styles.groupTableCapacitySelected]}>
                        {table.minCapacity || 1}-{table.maxCapacity} pax
                      </Text>
                      {isSelected && <Text style={styles.groupTableCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            {groupSelectedTables.length > 0 && (() => {
              const additionalCap = groupSelectedTables.reduce((sum, id) => {
                const t = tablesQuery.data?.find((t: any) => t.id === id);
                return sum + ((t as any)?.maxCapacity || 0);
              }, 0);
              const baseCap = groupedMaxCapacity !== null ? groupedMaxCapacity : (preselectedTableInfo?.maxCapacity || 0);
              const combined = baseCap + additionalCap;
              return (
                <View style={styles.groupSummaryBox}>
                  <Text style={styles.groupSummaryText}>
                    Capacidad combinada: {baseCap} + {additionalCap} = <Text style={styles.groupSummaryCombined}>{combined} pax</Text>
                  </Text>
                  <Text style={[styles.groupSummaryText, { fontSize: 12, marginTop: 4 }]}>
                    {groupSelectedTables.length} mesa{groupSelectedTables.length !== 1 ? 's' : ''} adicional{groupSelectedTables.length !== 1 ? 'es' : ''} seleccionada{groupSelectedTables.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              );
            })()}
            <View style={styles.groupModalButtons}>
              <TouchableOpacity
                style={styles.groupCancelButton}
                onPress={() => { setShowGroupModal(false); setGroupSelectedTables([]); }}
              >
                <Text style={styles.groupCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.groupAcceptButton, groupSelectedTables.length === 0 && styles.groupAcceptButtonDisabled]}
                onPress={() => {
                  if (groupSelectedTables.length === 0) return;
                  const additionalCap = groupSelectedTables.reduce((sum, id) => {
                    const t = tablesQuery.data?.find((t: any) => t.id === id);
                    return sum + ((t as any)?.maxCapacity || 0);
                  }, 0);
                  const baseCap = groupedMaxCapacity !== null ? groupedMaxCapacity : (preselectedTableInfo?.maxCapacity || 0);
                  const combined = baseCap + additionalCap;
                  setAdditionalGroupTableIds(prev => [...prev, ...groupSelectedTables]);
                  setGroupedMaxCapacity(combined);
                  setGuests(Math.min(combined, (guests || 1) + 1));
                  setShowGroupModal(false);
                  setGroupSelectedTables([]);
                }}
                disabled={groupSelectedTables.length === 0}
              >
                <Text style={styles.groupAcceptButtonText}>Agrupar Mesas</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReduceGuestsModal} transparent animationType="fade" onRequestClose={() => { setShowReduceGuestsModal(false); setPendingReduceGuests(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reducir Comensales</Text>
            {pendingReduceGuests && (
              <Text style={styles.modalMessage}>
                ¿Deseas dividir la mesa o continuar con {pendingReduceGuests.newGuests} {pendingReduceGuests.newGuests === 1 ? 'comensal' : 'comensales'}?
              </Text>
            )}
            <View style={styles.overCapacityModalButtons}>
              <TouchableOpacity
                style={styles.overCapacityAcceptButton}
                onPress={() => {
                  if (!pendingReduceGuests) return;
                  const { newGuests } = pendingReduceGuests;
                  setGuests(Math.max(1, newGuests));
                  if (groupedMaxCapacity !== null && newGuests <= (preselectedTableInfo?.maxCapacity || 4)) {
                    setAdditionalGroupTableIds([]);
                    setGroupedMaxCapacity(null);
                  }
                  setSplitChoiceMade(true);
                  setShowReduceGuestsModal(false);
                  setPendingReduceGuests(null);
                }}
              >
                <Text style={styles.overCapacityAcceptButtonText}>Continuar sin dividir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.overCapacityCancelButton}
                onPress={() => {
                  if (!pendingReduceGuests) return;
                  const { originalMax } = pendingReduceGuests;
                  const halfA = Math.floor(originalMax / 2);
                  const halfB = originalMax - halfA;
                  setSplitTableAMinCapacity('1');
                  setSplitTableAMaxCapacity(String(halfA));
                  setSplitTableBMinCapacity('1');
                  setSplitTableBMaxCapacity(String(halfB));
                  setSplitSelectedTable('A');
                  setSplitChoiceMade(true);
                  setShowReduceGuestsModal(false);
                  setPendingReduceGuests(null);
                  setShowSplitModal(true);
                }}
              >
                <Text style={styles.overCapacityCancelButtonText}>Dividir mesa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSplitModal} transparent animationType="slide" onRequestClose={() => setShowSplitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 440 }]}>
            <Text style={styles.modalTitle}>✂️ Dividir Mesa</Text>
            <Text style={styles.modalMessage}>
              Divide {preselectedTableInfo?.name} en dos mesas temporales. Define la capacidad de cada una y selecciona cuál asignar a esta reserva.
            </Text>

            <View style={styles.splitPreview}>
              <TouchableOpacity
                style={[styles.splitPreviewItem, splitSelectedTable === 'A' && styles.splitPreviewItemSelected]}
                onPress={() => setSplitSelectedTable('A')}
                activeOpacity={0.7}
              >
                <Text style={[styles.splitPreviewLabel, splitSelectedTable === 'A' && styles.splitPreviewLabelSelected]}>{preselectedTableInfo?.name}A</Text>
                {splitSelectedTable === 'A' && <Text style={styles.splitPreviewSelectedBadge}>← Esta reserva</Text>}
              </TouchableOpacity>
              <Text style={styles.splitPreviewDivider}>+</Text>
              <TouchableOpacity
                style={[styles.splitPreviewItem, splitSelectedTable === 'B' && styles.splitPreviewItemSelected]}
                onPress={() => setSplitSelectedTable('B')}
                activeOpacity={0.7}
              >
                <Text style={[styles.splitPreviewLabel, splitSelectedTable === 'B' && styles.splitPreviewLabelSelected]}>{preselectedTableInfo?.name}B</Text>
                {splitSelectedTable === 'B' && <Text style={styles.splitPreviewSelectedBadge}>← Esta reserva</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.splitCapacitySection}>
              <Text style={styles.splitCapacityTitle}>{preselectedTableInfo?.name}A — Capacidad</Text>
              <View style={styles.splitCapacityRow}>
                <View style={styles.splitCapacityField}>
                  <Text style={styles.splitCapacityFieldLabel}>Mín</Text>
                  <TextInput
                    style={styles.splitCapacityInput}
                    value={splitTableAMinCapacity}
                    onChangeText={setSplitTableAMinCapacity}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <Text style={styles.splitCapacityDash}>—</Text>
                <View style={styles.splitCapacityField}>
                  <Text style={styles.splitCapacityFieldLabel}>Máx</Text>
                  <TextInput
                    style={styles.splitCapacityInput}
                    value={splitTableAMaxCapacity}
                    onChangeText={setSplitTableAMaxCapacity}
                    keyboardType="number-pad"
                    placeholder="4"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            <View style={styles.splitCapacitySection}>
              <Text style={styles.splitCapacityTitle}>{preselectedTableInfo?.name}B — Capacidad</Text>
              <View style={styles.splitCapacityRow}>
                <View style={styles.splitCapacityField}>
                  <Text style={styles.splitCapacityFieldLabel}>Mín</Text>
                  <TextInput
                    style={styles.splitCapacityInput}
                    value={splitTableBMinCapacity}
                    onChangeText={setSplitTableBMinCapacity}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <Text style={styles.splitCapacityDash}>—</Text>
                <View style={styles.splitCapacityField}>
                  <Text style={styles.splitCapacityFieldLabel}>Máx</Text>
                  <TextInput
                    style={styles.splitCapacityInput}
                    value={splitTableBMaxCapacity}
                    onChangeText={setSplitTableBMaxCapacity}
                    keyboardType="number-pad"
                    placeholder="4"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            {(() => {
              const aMax = parseInt(splitTableAMaxCapacity) || 0;
              const bMax = parseInt(splitTableBMaxCapacity) || 0;
              const originalMax = preselectedTableInfo?.maxCapacity || 0;
              if (aMax + bMax !== originalMax && aMax > 0 && bMax > 0) {
                return (
                  <View style={styles.splitWarningBox}>
                    <Text style={styles.splitWarningText}>
                      ⚠️ La suma de máximos ({aMax} + {bMax} = {aMax + bMax}) no coincide con la capacidad original ({originalMax})
                    </Text>
                  </View>
                );
              }
              return null;
            })()}

            <Text style={styles.splitHint}>
              La mesa {splitSelectedTable === 'A' ? 'B' : 'A'} quedará libre para otras reservas en este turno.
            </Text>

            <View style={styles.groupModalButtons}>
              <TouchableOpacity
                style={styles.groupCancelButton}
                onPress={() => setShowSplitModal(false)}
              >
                <Text style={styles.groupCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.splitAcceptButton, (isSplitting || !splitTableAMaxCapacity || !splitTableBMaxCapacity) && styles.groupAcceptButtonDisabled]}
                onPress={async () => {
                  const aMin = parseInt(splitTableAMinCapacity) || 1;
                  const aMax = parseInt(splitTableAMaxCapacity) || 0;
                  const bMin = parseInt(splitTableBMinCapacity) || 1;
                  const bMax = parseInt(splitTableBMaxCapacity) || 0;
                  if (!aMax || !bMax || !tableId || !restaurantQuery.data?.id) {
                    Alert.alert('Error', 'Debes establecer la capacidad máxima de ambas mesas.');
                    return;
                  }
                  if (aMin > aMax || bMin > bMax) {
                    Alert.alert('Error', 'La capacidad mínima no puede ser mayor que la máxima.');
                    return;
                  }
                  setIsSplitting(true);
                  try {
                    const reservationCap = splitSelectedTable === 'A' ? aMax : bMax;
                    const freeCap = splitSelectedTable === 'A' ? bMax : aMax;
                    const splitResult = await createSplitTableMutation.mutateAsync({
                      restaurantId: restaurantQuery.data.id,
                      reservationId: `pre-split-${Date.now()}`,
                      originalTableId: tableId,
                      originalTableNewCapacity: splitSelectedTable === 'A' ? aMax : bMax,
                      originalTableHighChairs: preselectedTableInfo?.availableHighChairs || 0,
                      originalTableAllowsStroller: preselectedTableInfo?.allowsStrollers || false,
                      originalTableAllowsPets: preselectedTableInfo?.allowsPets || false,
                      splitTableCapacity: splitSelectedTable === 'A' ? bMax : aMax,
                      splitTableHighChairs: 0,
                      splitTableAllowsStroller: false,
                      splitTableAllowsPets: false,
                      shiftTemplateId: shiftTemplateId || undefined,
                      shiftDate: shiftDate || undefined,
                      selectedTable: splitSelectedTable,
                    });
                    if (splitResult.selectedTableId) {
                      setEffectiveTableId(splitResult.selectedTableId);
                      console.log('✅ [SPLIT] Usando mesa temporal para reserva:', splitResult.selectedTableName, splitResult.selectedTableId);
                    }
                    setPreselectedTableInfo((prev: any) => prev ? { ...prev, maxCapacity: reservationCap, minCapacity: splitSelectedTable === 'A' ? aMin : bMin, name: splitResult.selectedTableName || prev.name } : prev);
                    setGuests(reservationCap);
                    setShowSplitModal(false);
                    console.log('✅ [SPLIT] Mesa dividida. Reserva en', splitSelectedTable, 'con', reservationCap, 'pax. Libre:', freeCap, 'pax');
                  } catch (error) {
                    console.error('❌ [SPLIT] Error:', error);
                    Alert.alert('Error', 'No se pudo dividir la mesa. Inténtalo de nuevo.');
                  } finally {
                    setIsSplitting(false);
                  }
                }}
                disabled={isSplitting || !splitTableAMaxCapacity || !splitTableBMaxCapacity}
              >
                {isSplitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.groupAcceptButtonText}>Dividir Mesa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showUnavailableModal} transparent animationType="fade" onRequestClose={() => setShowUnavailableModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ No disponible</Text>
            <Text style={styles.modalMessage}>El horario de las {selectedUnavailableTime} no está disponible.</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowUnavailableModal(false)}>
              <Text style={styles.modalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => { setShowSuccessModal(false); setSuccessData(null); resetForm(); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>¡Reserva Creada!</Text>
            <Text style={styles.modalMessage}>Reserva para {successData?.tableName} creada correctamente.</Text>
            <View style={styles.modalDetails}>
              <Text style={styles.modalDetailText}>📅 {successData?.date?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
              <Text style={styles.modalDetailText}>🕐 {successData?.time ? `${String(successData.time.hour).padStart(2, '0')}:${String(successData.time.minute).padStart(2, '0')}` : ''}</Text>
              <Text style={styles.modalDetailText}>👥 {successData?.guests} pax · 🪑 {successData?.tableName}</Text>
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={() => { setShowSuccessModal(false); setSuccessData(null); resetForm(); router.replace('/restaurant/planning-today' as any); }}>
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showPrefixModal} transparent animationType="fade" onRequestClose={() => setShowPrefixModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.prefixModalContent}>
            <View style={styles.prefixModalHeader}>
              <Text style={styles.prefixModalTitle}>Selecciona tu país</Text>
              <TouchableOpacity onPress={() => setShowPrefixModal(false)}>
                <Text style={styles.prefixModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.prefixList}>
              {phonePrefixes.map((prefix) => (
                <TouchableOpacity
                  key={prefix.code}
                  style={[styles.prefixOption, phonePrefix === prefix.code && styles.prefixOptionSelected]}
                  onPress={() => { setPhonePrefix(prefix.code); setShowPrefixModal(false); }}
                >
                  <Text style={styles.prefixFlag}>{prefix.flag}</Text>
                  <View style={styles.prefixInfo}>
                    <Text style={styles.prefixCountry}>{prefix.country}</Text>
                    <Text style={styles.prefixCode}>{prefix.code}</Text>
                  </View>
                  {phonePrefix === prefix.code && <Text style={styles.prefixCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  errorText: { fontSize: 18, color: '#EF4444', fontWeight: '600' as const },
  header: { backgroundColor: '#FFFFFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  restaurantName: { fontSize: 24, fontWeight: '700' as const, color: '#111827', marginBottom: 4 },
  restaurantAddress: { fontSize: 14, color: '#6B7280' },
  preselectedInfo: { backgroundColor: '#EEF2FF', margin: 16, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#C7D2FE' },
  preselectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  preselectedTitle: { fontSize: 16, fontWeight: '700' as const, color: '#4F46E5' },
  preselectedDetails: { gap: 8 },
  preselectedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateNavRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateNavBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#C7D2FE', justifyContent: 'center', alignItems: 'center' },
  preselectedLabel: { fontSize: 14, color: '#6366F1' },
  preselectedValue: { fontSize: 14, fontWeight: '600' as const, color: '#1F2937' },
  tableFeatures: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#C7D2FE' },
  featureBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  featureBadgeText: { fontSize: 12, color: '#4B5563' },
  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: '#111827', marginBottom: 12 },
  guestSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  guestButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  guestButtonDisabled: { backgroundColor: '#D1D5DB' },
  guestButtonText: { fontSize: 24, fontWeight: '700' as const, color: '#FFFFFF' },
  guestDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guestCount: { fontSize: 32, fontWeight: '700' as const, color: '#111827' },
  guestLabel: { fontSize: 14, color: '#6B7280' },
  guestHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, fontSize: 16, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  inputSmall: { marginTop: 8, marginLeft: 32 },
  textArea: { height: 80, paddingTop: 16 },
  timeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  timeCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#E5E7EB', minWidth: 80, alignItems: 'center' },
  timeCardSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  timeCardUnavailable: { backgroundColor: '#FEE2E2', borderColor: '#FECACA', opacity: 0.7 },
  timeText: { fontSize: 16, fontWeight: '600' as const, color: '#111827' },
  timeTextSelected: { color: '#4F46E5' },
  timeTextUnavailable: { color: '#DC2626' },
  checkboxRow: { marginBottom: 16 },
  checkbox: { flexDirection: 'row', alignItems: 'center' },
  checkboxBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxBoxChecked: { borderColor: '#4F46E5', backgroundColor: '#4F46E5' },
  checkboxCheck: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' as const },
  checkboxLabel: { fontSize: 16, color: '#111827' },
  noFeaturesText: { fontSize: 14, color: '#6B7280', fontStyle: 'italic' },
  termsSection: { marginHorizontal: 20, marginTop: 20 },
  termsCheckboxRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0F9FF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  termsCheckbox: { marginTop: 2 },
  termsCheckboxBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#93C5FD', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  termsCheckboxBoxChecked: { borderColor: '#3B82F6', backgroundColor: '#3B82F6' },
  termsCheckboxCheck: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' as const },
  termsTextContainer: { flex: 1, marginLeft: 12 },
  termsText: { fontSize: 13, color: '#1E40AF', lineHeight: 20 },
  submitButton: { backgroundColor: '#10B981', padding: 18, borderRadius: 12, alignItems: 'center', marginHorizontal: 20, marginTop: 20 },
  submitButtonDisabled: { backgroundColor: '#D1D5DB', opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' as const },
  disclaimer: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginHorizontal: 20, marginTop: 12 },
  submitButtonSecondary: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 12, alignItems: 'center', marginHorizontal: 20, marginTop: 16, borderWidth: 2, borderColor: '#4F46E5' },
  submitButtonSecondaryText: { color: '#4F46E5', fontSize: 18, fontWeight: '700' as const },
  disclaimerSecondary: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginHorizontal: 20, marginTop: 8, marginBottom: 20 },
  phoneLabel: { fontSize: 14, fontWeight: '600' as const, color: '#111827', marginBottom: 8 },
  phoneContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  prefixButton: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#E5E7EB', minWidth: 100, justifyContent: 'center', alignItems: 'center' },
  prefixButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#111827' },
  phoneInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, fontSize: 16, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB' },
  existingClientInfo: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#C7D2FE', marginBottom: 12 },
  existingClientLabel: { fontSize: 12, fontWeight: '600' as const, color: '#6366F1', marginBottom: 4 },
  existingClientName: { fontSize: 18, fontWeight: '700' as const, color: '#4F46E5' },
  verifyButton: { backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  verifyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' as const },
  verifiedBox: { backgroundColor: '#D1FAE5', padding: 16, borderRadius: 12, marginTop: 12, borderLeftWidth: 4, borderLeftColor: '#10B981', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verifiedText: { fontSize: 16, color: '#065F46', fontWeight: '600' as const },
  changePhoneText: { fontSize: 14, color: '#4F46E5', fontWeight: '600' as const, textDecorationLine: 'underline' as const },
  blockedBox: { backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12, marginTop: 12, borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  blockedText: { fontSize: 14, color: '#991B1B', fontWeight: '600' as const },
  noTablesMessage: { backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#EF4444', padding: 16, borderRadius: 12 },
  noTablesTitle: { fontSize: 16, fontWeight: '700' as const, color: '#991B1B', marginBottom: 8 },
  noTablesText: { fontSize: 14, color: '#7F1D1D' },
  warningBox: { backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#EF4444', padding: 12, marginTop: 8, marginLeft: 32, borderRadius: 8 },
  warningText: { fontSize: 13, color: '#7F1D1D' },
  specialMessageContainer: { backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B', padding: 16, marginHorizontal: 20, marginTop: 20, borderRadius: 12 },
  specialMessageTitle: { fontSize: 16, fontWeight: '700' as const, color: '#92400E', marginBottom: 8 },
  specialMessageText: { fontSize: 14, color: '#78350F' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, maxWidth: 400, width: '100%', alignItems: 'center' },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successIconText: { fontSize: 48, color: '#FFFFFF', fontWeight: '700' as const },
  modalTitle: { fontSize: 24, fontWeight: '700' as const, color: '#111827', marginBottom: 12, textAlign: 'center' },
  modalMessage: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  modalDetails: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 },
  modalDetailText: { fontSize: 14, color: '#111827', marginBottom: 4, textAlign: 'center' },
  modalButton: { backgroundColor: '#10B981', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%' },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' as const, textAlign: 'center' },
  prefixModalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '85%', maxHeight: '70%', overflow: 'hidden' },
  prefixModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  prefixModalTitle: { fontSize: 18, fontWeight: '700' as const, color: '#111827' },
  prefixModalClose: { fontSize: 24, color: '#6B7280', fontWeight: '600' as const },
  prefixList: { maxHeight: 400 },
  prefixOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  prefixOptionSelected: { backgroundColor: '#EEF2FF' },
  prefixFlag: { fontSize: 28, marginRight: 12 },
  prefixInfo: { flex: 1 },
  prefixCountry: { fontSize: 16, fontWeight: '600' as const, color: '#111827', marginBottom: 2 },
  prefixCode: { fontSize: 14, color: '#6B7280' },
  prefixCheck: { fontSize: 20, color: '#4F46E5', fontWeight: '700' as const },
  timeCardOverCapacity: { backgroundColor: '#FFF0F3', borderColor: '#FBBDD3' },
  timeCardOverCapacitySelected: { backgroundColor: '#FFD6E4', borderColor: '#F43F7A' },
  timeTextOverCapacity: { color: '#BE185D' },
  overCapacityBadge: { fontSize: 10, color: '#BE185D', fontWeight: '700' as const, marginTop: 2 },
  overCapacityModalIcon: { fontSize: 40, marginBottom: 8 },
  overCapacityModalText: { fontSize: 15, color: '#374151', textAlign: 'center' as const, lineHeight: 24, marginBottom: 20 },
  overCapacityModalTime: { fontWeight: '700' as const, color: '#BE185D' },
  overCapacityModalHighlight: { fontWeight: '700' as const, color: '#DC2626' },
  overCapacityModalButtons: { width: '100%' as any, gap: 10 },
  overCapacityAcceptButton: { backgroundColor: '#F43F7A', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center' as const },
  overCapacityAcceptButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' as const },
  overCapacityCancelButton: { backgroundColor: '#F3F4F6', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center' as const, marginTop: 8 },
  overCapacityCancelButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' as const },
  guestButtonAtMax: { backgroundColor: '#10B981' },
  groupedInfo: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#86EFAC' },
  groupedInfoText: { fontSize: 13, color: '#166534', fontWeight: '600' as const },
  groupedInfoUndo: { fontSize: 12, color: '#4F46E5', marginTop: 4, textDecorationLine: 'underline' as const },
  groupTableCard: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 8, backgroundColor: '#F9FAFB' },
  groupTableCardSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  groupTableName: { fontSize: 16, fontWeight: '700' as const, color: '#111827', flex: 1 },
  groupTableNameSelected: { color: '#4F46E5' },
  groupTableCapacity: { fontSize: 13, color: '#6B7280' },
  groupTableCapacitySelected: { color: '#6366F1' },
  groupTableCheck: { fontSize: 20, color: '#4F46E5', fontWeight: '700' as const, marginLeft: 8 },
  groupSummaryBox: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginTop: 8, width: '100%' as any, borderWidth: 1, borderColor: '#86EFAC' },
  groupSummaryText: { fontSize: 14, color: '#374151', textAlign: 'center' as const },
  groupSummaryCombined: { fontWeight: '700' as const, color: '#166534' },
  groupModalButtons: { flexDirection: 'row' as const, gap: 10, marginTop: 16, width: '100%' as any },
  groupCancelButton: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const },
  groupCancelButtonText: { color: '#374151', fontSize: 15, fontWeight: '600' as const },
  groupAcceptButton: { flex: 1, backgroundColor: '#4F46E5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const },
  groupAcceptButtonDisabled: { backgroundColor: '#D1D5DB' },
  groupAcceptButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' as const },
  splitAcceptButton: { flex: 1, backgroundColor: '#F59E0B', paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const },
  splitPreview: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 16, width: '100%' as any },
  splitPreviewItem: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, alignItems: 'center' as const, borderWidth: 2, borderColor: '#E5E7EB' },
  splitPreviewItemSelected: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  splitPreviewLabel: { fontSize: 14, fontWeight: '700' as const, color: '#374151', textAlign: 'center' as const },
  splitPreviewLabelSelected: { color: '#4F46E5' },
  splitPreviewSelectedBadge: { fontSize: 11, color: '#4F46E5', fontWeight: '600' as const, marginTop: 4 },
  splitPreviewDivider: { fontSize: 20, color: '#9CA3AF', fontWeight: '700' as const },
  splitCapacitySection: { width: '100%' as any, marginBottom: 12, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12 },
  splitCapacityTitle: { fontSize: 13, fontWeight: '700' as const, color: '#374151', marginBottom: 8 },
  splitCapacityRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  splitCapacityField: { flex: 1 },
  splitCapacityFieldLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4, fontWeight: '600' as const },
  splitCapacityInput: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, fontSize: 16, fontWeight: '700' as const, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB', textAlign: 'center' as const },
  splitCapacityDash: { fontSize: 16, color: '#9CA3AF', fontWeight: '700' as const, marginTop: 16 },
  splitWarningBox: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 8, width: '100%' as any },
  splitWarningText: { fontSize: 12, color: '#92400E', textAlign: 'center' as const },
  splitHint: { fontSize: 13, color: '#6B7280', textAlign: 'center' as const, marginBottom: 16, lineHeight: 18 },
  tronasStepper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden' as const,
    marginTop: 4,
    marginBottom: 4,
    marginLeft: 32,
  },
  tronasStepBtn: {
    width: 52,
    height: 52,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    marginLeft: 32,
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  tronasSummaryRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
  },
  tronasSummaryItem: {
    alignItems: 'center' as const,
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
  timeRequiredHint: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  timeRequiredHintText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center' as const,
  },
});
