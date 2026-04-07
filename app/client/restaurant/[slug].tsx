import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { trpc, trpcClient, ensureWhatsAppWakeUp } from '@/lib/trpc';
import type { TimeSlot } from '@/types';
import { ExternalLink, ShieldCheck } from 'lucide-react-native';
import { InstagramImage } from '@/lib/instagram-image';
import AdBanner from '@/components/AdBanner';

interface AlternativeLocationAvailability {
  locationId: string;
  locationName: string;
  firstAvailableTime: string;
  availableSlotsCount: number;
}

export default function RestaurantDetailsScreen() {
  const { slug, modifyToken, returnToken2 } = useLocalSearchParams<{ slug: string; modifyToken?: string; returnToken2?: string }>();
  const router = useRouter();

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
  const [isModifying, setIsModifying] = useState<boolean>(false);
  const [showUnavailableModal, setShowUnavailableModal] = useState<boolean>(false);
  const [selectedUnavailableTime, setSelectedUnavailableTime] = useState<string>('');
  const [showMoreGuestsModal, setShowMoreGuestsModal] = useState<boolean>(false);
  const [moreGuestsCount, setMoreGuestsCount] = useState<string>('');
  const [depositCheckoutLoading, setDepositCheckoutLoading] = useState<boolean>(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState<boolean>(false);
  const [waitlistNotes, setWaitlistNotes] = useState<string>('');
  const [waitlistSuccess, setWaitlistSuccess] = useState<boolean>(false);
  const [waitlistHighChairs, setWaitlistHighChairs] = useState<boolean>(false);
  const [waitlistHighChairCount, setWaitlistHighChairCount] = useState<string>('1');
  const [waitlistStroller, setWaitlistStroller] = useState<boolean>(false);
  const [waitlistPets, setWaitlistPets] = useState<boolean>(false);
  const [waitlistError, setWaitlistError] = useState<string>('');
  const [waitlistPreferredTime, setWaitlistPreferredTime] = useState<string>('');
  const [waitlistTermsAccepted, setWaitlistTermsAccepted] = useState<boolean>(false);
  const [alternativeLocations, setAlternativeLocations] = useState<AlternativeLocationAvailability[]>([]);
  const [isLoadingAlternativeLocations, setIsLoadingAlternativeLocations] = useState<boolean>(false);

  const waitlistCreateMutation = trpc.waitlist.create.useMutation({
    onSuccess: () => {
      console.log('[Restaurant] ✅ Lista de espera creada exitosamente');
      setWaitlistError('');
      setWaitlistSuccess(true);
    },
    onError: (err: any) => {
      console.error('[Restaurant] ❌ Error lista de espera:', err?.message);
      const msg = err?.message || 'No se pudo añadir a la lista de espera';
      setWaitlistError(msg);
    },
  });

  const existingReservationQuery = trpc.reservations.getByToken.useQuery(
    { token: modifyToken || '' },
    { enabled: !!modifyToken }
  );

  React.useEffect(() => {
    if (modifyToken && existingReservationQuery.data) {
      const res = existingReservationQuery.data;
      setIsModifying(true);
      
      console.log('🔵 [MODIFY MODE] Cargando datos de reserva existente:', res.id);
      
      setSelectedDate(new Date(res.date));
      setSelectedLocation(res.locationId || '');
      setGuests(res.guests);
      setSelectedTime(res.time);
      setNeedsHighChairs(res.needsHighChair);
      setHighChairCount(String(res.highChairCount || 1));
      setNeedsStroller(res.needsStroller);
      setHasPets(res.hasPets);
      setClientName(res.clientName);
      
      const fullPhone = res.clientPhone || '';
      console.log('🔵 [MODIFY] Teléfono completo recibido:', fullPhone);
      
      if (fullPhone.startsWith('+')) {
        let prefix = '+34';
        let number = '';
        
        const prefixes = [
          { code: '+351', length: 4 },
          { code: '+34', length: 3 },
          { code: '+44', length: 3 },
          { code: '+33', length: 3 },
          { code: '+49', length: 3 },
          { code: '+39', length: 3 },
          { code: '+52', length: 3 },
          { code: '+54', length: 3 },
          { code: '+55', length: 3 },
          { code: '+1', length: 2 },
        ];
        
        let found = false;
        for (const p of prefixes) {
          if (fullPhone.startsWith(p.code)) {
            prefix = p.code;
            number = fullPhone.substring(p.length);
            found = true;
            break;
          }
        }
        
        if (!found) {
          const match = fullPhone.match(/^(\+\d{1,4})(\d+)$/);
          if (match) {
            prefix = match[1];
            number = match[2];
          } else {
            number = fullPhone.replace(/^\+/, '');
          }
        }
        
        console.log('🔵 [MODIFY] Prefijo extraído:', prefix, '- Número:', number);
        setPhonePrefix(prefix);
        setPhoneNumber(number);
      } else {
        setPhonePrefix('+34');
        setPhoneNumber(fullPhone);
      }
      
      setNotes(res.clientNotes || '');
      setPhoneChecked(true);
      setIsExistingClient(true);
      setClientVerified(true);
    }
  }, [modifyToken, existingReservationQuery.data]);

  const restaurantQuery = trpc.restaurants.details.useQuery({ slug: slug || '' });

  const lastWakeUpRestaurantIdRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    const restaurantId = restaurantQuery.data?.id;

    if (!restaurantId || lastWakeUpRestaurantIdRef.current === restaurantId) {
      return;
    }

    lastWakeUpRestaurantIdRef.current = restaurantId;
    console.log('[Restaurant] 🔔 Despertando WhatsApp Manager para:', restaurantId);
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

  const availableSlotsQuery = trpc.reservations.availableSlots.useQuery(
    {
      restaurantId: restaurantQuery.data?.id || '',
      date: selectedDateString,
      guests: guests || 0,
      locationId: selectedLocation,
      needsHighChair: needsHighChairs,
      highChairCount: needsHighChairs ? (parseInt(highChairCount) || 1) : undefined,
      needsStroller: needsStroller,
      hasPets: hasPets,
      excludeToken: isModifying ? modifyToken : undefined,
      clientPhone: fullPhoneForQuery,
    },
    { enabled: !!restaurantQuery.data?.id && !!selectedDate && !!selectedLocation && !!guests && clientVerified }
  );

  React.useEffect(() => {
    let isCancelled = false;

    const loadAlternativeLocations = async () => {
      if (!restaurantQuery.data?.id || !selectedDateString || !selectedLocation || !guests || !clientVerified) {
        setAlternativeLocations([]);
        setIsLoadingAlternativeLocations(false);
        return;
      }

      if (availableSlotsQuery.isLoading) {
        return;
      }

      const selectedLocationSlots = availableSlotsQuery.data ?? [];
      const hasBookableSlots = selectedLocationSlots.some((slot: any) => !slot.isFullyBooked && !slot.isUnavailableDueToMinAdvance);
      if (hasBookableSlots) {
        setAlternativeLocations([]);
        setIsLoadingAlternativeLocations(false);
        return;
      }

      const otherLocations = (locationsQuery.data ?? []).filter((location: any) => location.id !== selectedLocation);
      if (otherLocations.length === 0) {
        setAlternativeLocations([]);
        setIsLoadingAlternativeLocations(false);
        return;
      }

      setIsLoadingAlternativeLocations(true);

      try {
        const results = await Promise.all(
          otherLocations.map(async (location: any) => {
            const slots = await trpcClient.reservations.availableSlots.query({
              restaurantId: restaurantQuery.data?.id || '',
              date: selectedDateString,
              guests,
              locationId: location.id,
              needsHighChair: needsHighChairs,
              highChairCount: needsHighChairs ? (parseInt(highChairCount) || 1) : undefined,
              needsStroller,
              hasPets,
              excludeToken: isModifying ? modifyToken : undefined,
              clientPhone: fullPhoneForQuery,
            });

            const bookableSlots = slots.filter((slot: any) => !slot.isFullyBooked && !slot.isUnavailableDueToMinAdvance);
            if (bookableSlots.length === 0) {
              return null;
            }

            const firstSlot = bookableSlots
              .slice()
              .sort((a: any, b: any) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute))[0];

            if (!firstSlot) {
              return null;
            }

            return {
              locationId: location.id,
              locationName: location.name,
              firstAvailableTime: `${String(firstSlot.hour).padStart(2, '0')}:${String(firstSlot.minute).padStart(2, '0')}`,
              availableSlotsCount: bookableSlots.length,
            } satisfies AlternativeLocationAvailability;
          })
        );

        if (!isCancelled) {
          const nextAlternativeLocations = results
            .filter((location): location is AlternativeLocationAvailability => location !== null)
            .sort((a: AlternativeLocationAvailability, b: AlternativeLocationAvailability) => a.firstAvailableTime.localeCompare(b.firstAvailableTime));
          console.log('[Restaurant] 📍 Ubicaciones alternativas disponibles:', nextAlternativeLocations);
          setAlternativeLocations(nextAlternativeLocations);
        }
      } catch (error) {
        console.error('[Restaurant] ❌ Error cargando ubicaciones alternativas:', error);
        if (!isCancelled) {
          setAlternativeLocations([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAlternativeLocations(false);
        }
      }
    };

    void loadAlternativeLocations();

    return () => {
      isCancelled = true;
    };
  }, [
    availableSlotsQuery.data,
    availableSlotsQuery.isLoading,
    clientVerified,
    fullPhoneForQuery,
    guests,
    highChairCount,
    isModifying,
    locationsQuery.data,
    modifyToken,
    needsHighChairs,
    needsStroller,
    hasPets,
    restaurantQuery.data?.id,
    selectedDateString,
    selectedLocation,
  ]);

  const depositCheckQuery = trpc.deposits.checkRequired.useQuery(
    {
      restaurantId: restaurantQuery.data?.id || '',
      date: selectedDateString,
      guests: guests || 0,
      highChairCount: needsHighChairs ? (parseInt(highChairCount) || 0) : 0,
    },
    {
      enabled: !!restaurantQuery.data?.id && !!selectedDate && !!guests && !!selectedTime && clientVerified && !isModifying,
    }
  );

  const depositCheckoutMutation = trpc.deposits.createCheckout.useMutation({
    onSuccess: (data: any) => {
      console.log('✅ [DEPOSIT] Checkout creado:', data);
      if (data.requiresPayment && data.url) {
        if (typeof window !== 'undefined') {
          window.location.href = data.url;
        } else {
          Alert.alert('Redirigiendo', 'Se abrirá la pasarela de pago...');
        }
      }
    },
    onError: (error: any) => {
      console.error('❌ [DEPOSIT] Error checkout:', error);
      setDepositCheckoutLoading(false);
      Alert.alert('Error', error?.message || 'No se pudo iniciar el pago de la fianza.');
    },
  });

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

  const [vipMessage, setVipMessage] = useState<string | undefined>(undefined);

  const createReservationMutation = trpc.reservations.create.useMutation({
    onSuccess: (data: any) => {
      console.log('✅ [CREATE RESERVATION] Reserva pendiente creada:', data);
      if (data.vipMessage) {
        setVipMessage(data.vipMessage);
      }
      setShowSuccessModal(true);
      setTermsAccepted(false);
      setTimeout(() => {
        setTermsAccepted(false);
      }, 100);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'No se pudo crear la reserva. Inténtalo de nuevo.';
      Alert.alert('Error', errorMessage);
      console.error('Error creando reserva:', error);
    },
  });

  const modifyReservationMutation = trpc.reservations.modifyByClient.useMutation({
    onSuccess: (data) => {
      console.log('✅ [MODIFY] Reserva modificada exitosamente, redirigiendo...');
      if (returnToken2) {
        console.log('✅ [MODIFY] Volviendo a token2:', returnToken2);
        if (typeof window !== 'undefined') {
          window.location.href = `/client/reservation2/${returnToken2}?refresh=${Date.now()}`;
        } else {
          router.replace(`/client/reservation2/${returnToken2}?refresh=${Date.now()}` as any);
        }
      } else {
        if (typeof window !== 'undefined') {
          window.location.href = `/client/reservation/${data.token}?refresh=${Date.now()}`;
        } else {
          router.replace(`/client/reservation/${data.token}?refresh=${Date.now()}`);
        }
      }
    },
    onError: (error: any) => {
      console.error('❌ [MODIFY] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo modificar la reserva.');
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
        setBlockReason('No hay mesas disponibles para ti.');
        setClientVerified(false);
        Alert.alert(
          'Sin disponibilidad',
          'No hay mesas disponibles para ti en este restaurante.',
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

  const noTablesAvailableWithRequirements = useMemo(() => {
    if (!selectedDate || !selectedLocation || !guests) return false;
    
    if (needsHighChairs || needsStroller || hasPets) {
      return availableSlotsQuery.data !== undefined && availableSlotsQuery.data.length === 0;
    }
    
    return false;
  }, [selectedDate, selectedLocation, guests, needsHighChairs, needsStroller, hasPets, availableSlotsQuery.data]);

  const isSelectedTimeStillValid = useMemo(() => {
    if (!selectedTime || !availableSlotsQuery.data) return false;
    
    const slot = availableSlotsQuery.data.find(
      (s: any) => s.hour === selectedTime.hour && s.minute === selectedTime.minute && !(s as any).isUnavailableDueToMinAdvance
    );
    
    return !!slot;
  }, [selectedTime, availableSlotsQuery.data]);

  React.useEffect(() => {
    if (selectedTime && availableSlotsQuery.data && !isSelectedTimeStillValid) {
      console.log('⚠️ [VALIDATION] Horario seleccionado ya no es válido, limpiando selección');
      setSelectedTime(null);
    }
  }, [selectedTime, availableSlotsQuery.data, isSelectedTimeStillValid]);

  const handleSubmit = () => {
    console.log('🔵 [SUBMIT] handleSubmit iniciado');
    console.log('🔵 [SUBMIT] isModifying:', isModifying, 'modifyToken:', modifyToken);
    
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

    if (!termsAccepted && !isModifying) {
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
    
    if (isModifying && modifyToken) {
      console.log('🔵 [MODIFY] Iniciando modificación de reserva con token:', modifyToken);
      
      modifyReservationMutation.mutate({
        token: modifyToken,
        date: dateString,
        time: selectedTime,
        guests: guests,
        locationId: selectedLocation,
        needsHighChair: needsHighChairs,
        highChairCount: needsHighChairs ? parseInt(highChairCount) || 1 : undefined,
        needsStroller: needsStroller,
        hasPets: hasPets,
        clientNotes: notes.trim() || '',
        tableIds: [],
      });
    } else if (depositCheckQuery.data?.required) {
      console.log('🔵 [SUBMIT] Fianza requerida, redirigiendo a pago...');
      setDepositCheckoutLoading(true);
      const fullPhone = phonePrefix + phoneNumber;
      
      depositCheckoutMutation.mutate({
        restaurantId: restaurantQuery.data!.id,
        date: dateString,
        guests: guests,
        highChairCount: needsHighChairs ? (parseInt(highChairCount) || 0) : 0,
        clientPhone: fullPhone,
        clientName: clientName.trim(),
        reservationData: {
          time: selectedTime,
          locationId: selectedLocation,
          needsHighChair: needsHighChairs,
          needsStroller: needsStroller,
          hasPets: hasPets,
          notes: notes.trim() || '',
          tableIds: [],
        },
      });
    } else {
      console.log('🔵 [CREATE] Creando nueva reserva');
      const fullPhone = phonePrefix + phoneNumber;
      
      createReservationMutation.mutate({
        restaurantId: restaurantQuery.data!.id,
        clientPhone: fullPhone,
        clientName: clientName.trim(),
        date: dateString,
        time: selectedTime,
        guests: guests,
        locationId: selectedLocation,
        tableIds: [],
        needsHighChair: needsHighChairs,
        highChairCount: needsHighChairs ? parseInt(highChairCount) || 1 : 0,
        needsStroller: needsStroller,
        hasPets: hasPets,
        notes: notes.trim() || '',
      });
    }
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
      <Stack.Screen options={{ title: 'quieromesa.com' }} />
      <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {Platform.OS === 'web' && (
          <View style={styles.adBannerWrapper}>
            <AdBanner adSlot="1375509739" />
          </View>
        )}
        {restaurant.imageUrl && (
          <InstagramImage
            uri={restaurant.imageUrl}
            isInstagram={false}
            style={styles.coverImage}
            alt={restaurant.name}
          />
        )}
        <View style={styles.header}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantDescription}>{restaurant.description}</Text>
          <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
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

        {clientVerified && selectedDate && specialDayMessage && (
          <View style={styles.specialMessageContainer}>
            <Text style={styles.specialMessageIcon}>📅</Text>
            <Text style={styles.specialMessageText}>{specialDayMessage}</Text>
          </View>
        )}

        {clientVerified && selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Selecciona la Ubicación</Text>
            {locationsQuery.isLoading ? (
              <ActivityIndicator />
            ) : (
              <View style={styles.locationContainerVertical}>
                {locationsQuery.data?.map((location) => {
                  const isSelected = selectedLocation === location.id;
                  return (
                    <View key={location.id} style={styles.locationWrapperVertical}>
                      {location.imageUrl && (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setSelectedLocation(location.id)}
                        >
                          <InstagramImage
                            uri={location.imageUrl}
                            isInstagram={false}
                            style={[styles.locationImageVertical, isSelected && styles.locationImageSelected]}
                            alt={location.name}
                            onLoad={() => console.log('✅ Imagen de ubicación cargada:', location.name)}
                            onError={() => console.error('❌ Error cargando imagen de ubicación:', location.name)}
                          />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.locationCardVertical, isSelected && styles.locationCardSelected]}
                        onPress={() => setSelectedLocation(location.id)}
                      >
                        <Text style={[styles.locationText, isSelected && styles.locationTextSelected]}>
                          {location.name}
                        </Text>
                      </TouchableOpacity>
                    </View>
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
                {restaurant.phone && restaurant.phone.length > 0 && (
                  <TouchableOpacity
                    style={[styles.clearOptionsButton, { backgroundColor: '#10B981', marginTop: 8 }]}
                    onPress={() => {
                      const restaurantPhone = restaurant.phone[0];
                      void Linking.openURL(`tel:${restaurantPhone}`);
                    }}
                  >
                    <Text style={styles.clearOptionsText}>{'📞 Llamar al Restaurante'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.guestContainer}>
                {guestCountsQuery.data?.guestCounts?.map((count) => {
                  const isSelected = guests === count;
                  return (
                    <TouchableOpacity
                      key={count}
                      style={[styles.guestCard, isSelected && styles.guestCardSelected]}
                      onPress={() => setGuests(count)}
                    >
                      <Text style={[styles.guestText, isSelected && styles.guestTextSelected]}>
                        {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.guestCard, styles.guestCardMore]}
                  onPress={() => setShowMoreGuestsModal(true)}
                >
                  <Text style={[styles.guestText, styles.guestTextMore]}>+</Text>
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
            ) : (() => {
              const allSlots = availableSlotsQuery.data || [];
              const hasAnySlots = allSlots.length > 0;
              const hasBookableSlots = allSlots.some((s: any) => !s.isFullyBooked && !s.isUnavailableDueToMinAdvance);
              const hasOnlyFullyBooked = hasAnySlots && allSlots.every((s: any) => s.isFullyBooked);

              if (!hasAnySlots) {
                return (
                  <View style={styles.noTablesMessage}>
                    <Text style={styles.noTablesTitle}>
                      {needsHighChairs
                        ? '⚠️ No hay mesas disponibles con tronas'
                        : (needsStroller || hasPets)
                        ? '⚠️ No hay mesas disponibles con estas características'
                        : '⚠️ No hay horarios disponibles'}
                    </Text>
                    <Text style={styles.noTablesText}>
                      {needsHighChairs
                        ? `No hay mesas disponibles para ${guests} comensales que admitan ${highChairCount} trona${parseInt(highChairCount) !== 1 ? 's' : ''} para este día.\n\nPor favor, reduce la cantidad de tronas solicitadas, selecciona otro número de comensales, otra fecha o contacta con el restaurante para verificar disponibilidad.`
                        : needsStroller || hasPets
                        ? 'No hay mesas disponibles para ' + guests + ' comensales con las características seleccionadas (carrito o mascotas). Por favor, intenta quitando algunas opciones o selecciona otro número de comensales.'
                        : 'No hay horarios disponibles para este día. Por favor, selecciona otra fecha.'}
                    </Text>
                    {(needsHighChairs || needsStroller || hasPets) && (
                      <TouchableOpacity
                        style={styles.clearOptionsButton}
                        onPress={() => {
                          setNeedsHighChairs(false);
                          setHighChairCount('1');
                          setNeedsStroller(false);
                          setHasPets(false);
                        }}
                      >
                        <Text style={styles.clearOptionsText}>Quitar opciones especiales</Text>
                      </TouchableOpacity>
                    )}
                    {restaurant.phone && restaurant.phone.length > 0 && (
                      <TouchableOpacity
                        style={[styles.clearOptionsButton, { backgroundColor: '#10B981', marginTop: 8 }]}
                        onPress={() => {
                          const restaurantPhone = restaurant.phone[0];
                          void Linking.openURL(`tel:${restaurantPhone}`);
                        }}
                      >
                        <Text style={styles.clearOptionsText}>📞 Llamar al Restaurante</Text>
                      </TouchableOpacity>
                    )}
                    {!needsHighChairs && !needsStroller && !hasPets && clientVerified && selectedDate && restaurantQuery.data?.id && (
                      <TouchableOpacity
                        style={styles.waitlistButton}
                        onPress={() => { setWaitlistPreferredTime(''); setWaitlistSuccess(false); setShowWaitlistModal(true); }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.waitlistButtonText}>📋 Lista de espera</Text>
                        <Text style={styles.waitlistButtonSub}>Avísame si se libera disponibilidad</Text>
                      </TouchableOpacity>
                    )}
                    {(isLoadingAlternativeLocations || alternativeLocations.length > 0) && (
                      <View style={styles.alternativeLocationsCard}>
                        <Text style={styles.alternativeLocationsTitle}>Otras ubicaciones disponibles</Text>
                        <Text style={styles.alternativeLocationsText}>
                          {isLoadingAlternativeLocations
                            ? 'Buscando otras ubicaciones con mesas libres...'
                            : 'No hay mesa en la ubicación elegida, pero sí en otras zonas del restaurante.'}
                        </Text>
                        {alternativeLocations.map((locationOption: AlternativeLocationAvailability) => (
                          <TouchableOpacity
                            key={locationOption.locationId}
                            style={styles.alternativeLocationButton}
                            onPress={() => {
                              console.log('[Restaurant] 🔄 Cambiando a ubicación alternativa:', locationOption);
                              setSelectedLocation(locationOption.locationId);
                              setSelectedTime(null);
                            }}
                          >
                            <View style={styles.alternativeLocationButtonContent}>
                              <Text style={styles.alternativeLocationButtonTitle}>{locationOption.locationName}</Text>
                              <Text style={styles.alternativeLocationButtonSubtitle}>
                                Desde {locationOption.firstAvailableTime} · {locationOption.availableSlotsCount} horario{locationOption.availableSlotsCount !== 1 ? 's' : ''}
                              </Text>
                            </View>
                            <Text style={styles.alternativeLocationButtonAction}>Seleccionar</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              }

              return (
                <>
                  {hasOnlyFullyBooked && (
                    <View style={styles.fullyBookedNotice}>
                      <Text style={styles.fullyBookedNoticeText}>🔴 Todos los horarios están completos. Pulsa en uno para unirte a la lista de espera y te avisaremos si se libera una mesa.</Text>
                    </View>
                  )}
                  {(hasOnlyFullyBooked || !hasBookableSlots) && (isLoadingAlternativeLocations || alternativeLocations.length > 0) && (
                    <View style={styles.alternativeLocationsCard}>
                      <Text style={styles.alternativeLocationsTitle}>También hay mesa en otras ubicaciones</Text>
                      <Text style={styles.alternativeLocationsText}>
                        {isLoadingAlternativeLocations
                          ? 'Buscando ubicaciones alternativas disponibles...'
                          : 'Si te encaja otra zona, puedes cambiar ahora mismo y reservar allí.'}
                      </Text>
                      {alternativeLocations.map((locationOption: AlternativeLocationAvailability) => (
                        <TouchableOpacity
                          key={locationOption.locationId}
                          style={styles.alternativeLocationButton}
                          onPress={() => {
                            console.log('[Restaurant] 🔄 Cambiando a ubicación alternativa:', locationOption);
                            setSelectedLocation(locationOption.locationId);
                            setSelectedTime(null);
                          }}
                        >
                          <View style={styles.alternativeLocationButtonContent}>
                            <Text style={styles.alternativeLocationButtonTitle}>{locationOption.locationName}</Text>
                            <Text style={styles.alternativeLocationButtonSubtitle}>
                              Desde {locationOption.firstAvailableTime} · {locationOption.availableSlotsCount} horario{locationOption.availableSlotsCount !== 1 ? 's' : ''}
                            </Text>
                          </View>
                          <Text style={styles.alternativeLocationButtonAction}>Seleccionar</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <View style={styles.timeContainer}>
                    {allSlots
                      .sort((a: any, b: any) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute))
                      .map((slot: any, index: number) => {
                        const isSelected = selectedTime?.hour === slot.hour && selectedTime?.minute === slot.minute;
                        const isUnavailable = slot.isUnavailableDueToMinAdvance === true;
                        const isFullyBooked = slot.isFullyBooked === true;
                        const timeString = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
                        const isAvailable = !isUnavailable && !isFullyBooked;
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.timeCard,
                              isAvailable && styles.timeCardAvailable,
                              isSelected && isAvailable && styles.timeCardSelected,
                              isUnavailable && styles.timeCardUnavailable,
                              isFullyBooked && styles.timeCardFullyBooked,
                            ]}
                            onPress={() => {
                              if (isUnavailable) {
                                setSelectedUnavailableTime(timeString);
                                setShowUnavailableModal(true);
                              } else if (isFullyBooked) {
                                setWaitlistPreferredTime(timeString);
                                setWaitlistSuccess(false);
                                setShowWaitlistModal(true);
                              } else {
                                setSelectedTime(slot);
                              }
                            }}
                          >
                            <Text style={[
                              styles.timeText,
                              isAvailable && styles.timeTextAvailable,
                              isSelected && isAvailable && styles.timeTextSelected,
                              isUnavailable && styles.timeTextUnavailable,
                              isFullyBooked && styles.timeTextFullyBooked,
                            ]}>
                              {timeString}
                            </Text>
                            {isAvailable && (
                              <Text style={[
                                styles.availableLabel,
                                isSelected && styles.availableLabelSelected,
                              ]}>Disponible</Text>
                            )}
                            {isFullyBooked && (
                              <Text style={styles.fullyBookedLabel}>Lista espera</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                  {!hasBookableSlots && clientVerified && selectedDate && restaurantQuery.data?.id && (
                    <TouchableOpacity
                      style={[styles.waitlistButton, { marginTop: 12 }]}
                      onPress={() => { setWaitlistPreferredTime(''); setWaitlistSuccess(false); setShowWaitlistModal(true); }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.waitlistButtonText}>📋 Lista de espera</Text>
                      <Text style={styles.waitlistButtonSub}>Avísame si se libera disponibilidad</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
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
                              <Text style={styles.tronasSummaryEmoji}>👶</Text>
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

            {!isModifying && (
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
            )}

            {specialDayMessage && (
              <View style={styles.specialMessageContainerBottom}>
                <Text style={styles.specialMessageIcon}>📅</Text>
                <Text style={styles.specialMessageText}>{specialDayMessage}</Text>
              </View>
            )}

            {!isModifying && depositCheckQuery.data?.required && (
              <View style={styles.depositInfoContainer}>
                <View style={styles.depositInfoHeader}>
                  <ShieldCheck size={20} color="#7C3AED" />
                  <Text style={styles.depositInfoTitle}>Fianza Requerida</Text>
                </View>
                <Text style={styles.depositInfoAmount}>
                  {depositCheckQuery.data.amount}€ x {depositCheckQuery.data.chargeableGuests} comensal{depositCheckQuery.data.chargeableGuests > 1 ? 'es' : ''} = {depositCheckQuery.data.totalAmount}€
                </Text>
                {depositCheckQuery.data.message ? (
                  <Text style={styles.depositInfoMessage}>{depositCheckQuery.data.message}</Text>
                ) : null}
              </View>
            )}

            <TouchableOpacity
              style={[
                depositCheckQuery.data?.required && !isModifying ? styles.submitButtonDeposit : styles.submitButton,
                (createReservationMutation.isPending || modifyReservationMutation.isPending || depositCheckoutLoading || (!termsAccepted && !isModifying) || isHighChairLimitExceeded || highChairExceedsGuests || noTablesAvailableWithRequirements || !isSelectedTimeStillValid) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={createReservationMutation.isPending || modifyReservationMutation.isPending || depositCheckoutLoading || (!termsAccepted && !isModifying) || isHighChairLimitExceeded || highChairExceedsGuests || noTablesAvailableWithRequirements || !isSelectedTimeStillValid}
            >
              {(createReservationMutation.isPending || modifyReservationMutation.isPending || depositCheckoutLoading) ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isModifying
                    ? 'Confirmar Modificación'
                    : depositCheckQuery.data?.required
                    ? `Pagar Fianza (${depositCheckQuery.data.totalAmount}€) y Reservar`
                    : 'Confirmar Reserva'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              {depositCheckQuery.data?.required && !isModifying
                ? 'Se te redirigirá a Stripe para pagar la fianza. Después se creará tu reserva automáticamente.'
                : 'Recibirás un WhatsApp con un enlace para confirmar tu reserva. Debes confirmarla en 5 minutos o la mesa se liberará.'}
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>

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
              Es posible que queden mesas libres aún para las <Text style={styles.unavailableModalTime}>{selectedUnavailableTime}</Text>!! pero no hay suficiente tiempo para reservar online.
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
            <Text style={styles.modalTitle}>¡Reserva Pendiente!</Text>
            <Text style={styles.modalMessage}>
              Hemos enviado un WhatsApp al número {phonePrefix}{phoneNumber} con un enlace para confirmar tu reserva. Por favor, revisa tu WhatsApp y confirma la reserva en los próximos 5 minutos.
            </Text>
            {vipMessage && (
              <View style={styles.vipMessageContainer}>
                <Text style={styles.vipMessageText}>{vipMessage}</Text>
              </View>
            )}
            <View style={styles.modalDetails}>
              <Text style={styles.modalDetailLabel}>Detalles de tu reserva:</Text>
              <Text style={styles.modalDetailText}>📅 {selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              <Text style={styles.modalDetailText}>🕐 {selectedTime ? `${String(selectedTime.hour).padStart(2, '0')}:${String(selectedTime.minute).padStart(2, '0')}` : ''}</Text>
              <Text style={styles.modalDetailText}>👥 {guests} personas</Text>
            </View>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                setTermsAccepted(false);
                setVipMessage(undefined);
                resetForm();
              }}
            >
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
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
        visible={showMoreGuestsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreGuestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>👥 Más comensales</Text>
            <Text style={styles.modalMessage}>
              Introduce el número de comensales de tu grupo y únete a la lista de espera. Te avisaremos en cuanto haya disponibilidad.
            </Text>
            <TextInput
              style={styles.moreGuestsInput}
              value={moreGuestsCount}
              onChangeText={setMoreGuestsCount}
              keyboardType="number-pad"
              placeholder="Número de comensales"
              placeholderTextColor="#9CA3AF"
            />
            {clientVerified && selectedDate && selectedLocation && (
              <TouchableOpacity
                style={[styles.waitlistButton, { marginTop: 8, marginBottom: 8 }]}
                onPress={() => {
                  const count = parseInt(moreGuestsCount);
                  if (!count || count < 1) {
                    Alert.alert('Comensales requeridos', 'Por favor introduce un número de comensales válido.');
                    return;
                  }
                  setGuests(count);
                  setShowMoreGuestsModal(false);
                  setWaitlistPreferredTime('');
                  setWaitlistSuccess(false);
                  setWaitlistError('');
                  setTimeout(() => setShowWaitlistModal(true), 300);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.waitlistButtonText}>📋 Lista de espera</Text>
                <Text style={styles.waitlistButtonSub}>Avísame si se libera disponibilidad</Text>
              </TouchableOpacity>
            )}
            {restaurant.phone && restaurant.phone.length > 0 && (
              <TouchableOpacity
                style={styles.callRestaurantButton}
                onPress={() => {
                  const restaurantPhone = restaurant.phone[0];
                  void Linking.openURL(`tel:${restaurantPhone}`);
                  setShowMoreGuestsModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.callRestaurantButtonText}>📞 Llamar al Restaurante</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMoreGuestsModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
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
                <Text style={styles.waitlistSuccessIcon}>📩</Text>
                <Text style={styles.waitlistSuccessTitle}>¡Revisa tu WhatsApp!</Text>
                <Text style={styles.waitlistSuccessText}>
                  Te hemos enviado un mensaje de WhatsApp con un enlace de confirmación. Pulsa el enlace para confirmar tu solicitud y entrar en la lista de espera.
                </Text>
                <Text style={[styles.waitlistNotice, { marginTop: 8, marginBottom: 0 }]}>⏰ El enlace expira en 30 minutos.</Text>
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
                    <Text style={[styles.waitlistNotice, { marginBottom: 8, marginTop: 0 }]}>Selecciona el horario que prefieres. Te avisaremos si hay disponibilidad.</Text>
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
                  Una vez confirmada tu solicitud, cuando se libere una mesa que encaje con tu reserva, recibirás un WhatsApp con la confirmación directa de tu reserva.
                </Text>

                <TouchableOpacity
                  style={styles.waitlistCheckboxRow}
                  onPress={() => setWaitlistTermsAccepted(!waitlistTermsAccepted)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.waitlistCheckboxBox, waitlistTermsAccepted && styles.waitlistCheckboxBoxChecked]}>
                    {waitlistTermsAccepted && <Text style={styles.waitlistCheckboxCheck}>✓</Text>}
                  </View>
                  <Text style={[styles.waitlistCheckboxLabel, { flex: 1 }]}>
                    Acepto los términos y condiciones y autorizo notificaciones de WhatsApp relacionadas con mi solicitud.
                  </Text>
                </TouchableOpacity>

                {waitlistError ? (
                  <View style={styles.waitlistErrorBox}>
                    <Text style={styles.waitlistErrorText}>⚠️ {waitlistError}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[styles.waitlistSubmitButton, (waitlistCreateMutation.isPending || !waitlistTermsAccepted) && styles.waitlistSubmitButtonDisabled]}
                  onPress={() => {
                    setWaitlistError('');
                    if (!waitlistTermsAccepted) {
                      setWaitlistError('Debes aceptar los términos y condiciones para continuar.');
                      return;
                    }
                    if (!restaurantQuery.data?.id) {
                      setWaitlistError('Error: datos del restaurante no cargados. Recarga la página.');
                      return;
                    }
                    if (!selectedDate) {
                      setWaitlistError('Por favor selecciona una fecha.');
                      return;
                    }
                    if (!guests) {
                      setWaitlistError('Por favor selecciona el número de comensales.');
                      return;
                    }
                    if (!phoneNumber.trim()) {
                      setWaitlistError('Por favor introduce tu número de teléfono.');
                      return;
                    }
                    if (!clientName.trim()) {
                      setWaitlistError('Por favor introduce tu nombre.');
                      return;
                    }
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
                  disabled={waitlistCreateMutation.isPending || !waitlistTermsAccepted}
                  activeOpacity={0.8}
                >
                  <Text style={styles.waitlistSubmitButtonText}>
                    {waitlistCreateMutation.isPending ? 'Enviando...' : 'Solicitar lista de espera'}
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
  adBannerWrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    overflow: 'hidden',
    minHeight: 60,
    maxHeight: 90,
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
  locationContainerVertical: {
    flexDirection: 'column',
    gap: 16,
  },
  locationWrapperVertical: {
    width: '100%',
    marginBottom: 8,
  },
  locationCardVertical: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  locationImageVertical: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  locationImageSelected: {
    borderWidth: 3,
    borderColor: '#4F46E5',
  },
  coverImage: {
    width: '100%',
    height: 220,
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
    minWidth: 88,
    alignItems: 'center',
  },
  timeCardAvailable: {
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC',
  },
  timeCardSelected: {
    borderColor: '#15803D',
    backgroundColor: '#BBF7D0',
  },
  timeCardUnavailable: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    opacity: 0.7,
  },
  timeCardFullyBooked: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  timeTextFullyBooked: {
    color: '#7C3AED',
  },
  availableLabel: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '700' as const,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  availableLabelSelected: {
    color: '#166534',
  },
  fullyBookedLabel: {
    fontSize: 9,
    color: '#7C3AED',
    fontWeight: '600' as const,
    marginTop: 2,
    textAlign: 'center' as const,
  },
  fullyBookedNotice: {
    backgroundColor: '#EDE9FE',
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  fullyBookedNoticeText: {
    fontSize: 13,
    color: '#5B21B6',
    lineHeight: 18,
  },
  alternativeLocationsCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 10,
  },
  alternativeLocationsTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1D4ED8',
  },
  alternativeLocationsText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#1E3A8A',
  },
  alternativeLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  alternativeLocationButtonContent: {
    flex: 1,
  },
  alternativeLocationButtonTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#111827',
  },
  alternativeLocationButtonSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#4B5563',
  },
  alternativeLocationButtonAction: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#2563EB',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  timeTextAvailable: {
    color: '#166534',
  },
  timeTextSelected: {
    color: '#14532D',
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
  depositInfoContainer: {
    backgroundColor: '#F5F3FF',
    borderWidth: 2,
    borderColor: '#C4B5FD',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
  },
  depositInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  depositInfoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#7C3AED',
  },
  depositInfoAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#4C1D95',
    marginBottom: 4,
  },
  depositInfoMessage: {
    fontSize: 13,
    color: '#6D28D9',
    lineHeight: 18,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
  },
  submitButtonDeposit: {
    backgroundColor: '#7C3AED',
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
    borderColor: '#10B981',
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
  vipMessageContainer: {
    backgroundColor: '#fef9e7',
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  vipMessageText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#92400e',
    textAlign: 'center',
    lineHeight: 22,
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
  specialMessageContainerBottom: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  specialMessageIcon: {
    fontSize: 20,
  },
  specialMessageTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 8,
  },
  specialMessageText: {
    flex: 1,
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
  moreGuestsInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    width: '100%',
    marginBottom: 12,
    textAlign: 'center' as const,
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
  waitlistErrorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  waitlistErrorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500' as const,
    textAlign: 'center' as const,
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

