import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Clock, Users, Phone, MessageSquare, AlertCircle, MapPin, Baby, ShoppingCart, PawPrint, X, Edit3, Navigation, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';

export default function ClientReservation2Screen() {
  const { token2 } = useLocalSearchParams<{ token2: string }>();
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [minutesPending, setMinutesPending] = useState<number>(0);

  console.log('🔍 [RESERVATION2 SCREEN] Token2 recibido:', token2);
  console.log('🔍 [RESERVATION2 SCREEN] Tipo de token2:', typeof token2, 'Array:', Array.isArray(token2));

  // Asegurarse de que token2 es un string
  const tokenString = Array.isArray(token2) ? token2[0] : (token2 || '');
  console.log('🔍 [RESERVATION2 SCREEN] Token string procesado:', tokenString);

  const reservationQuery = trpc.reservations.getByToken2.useQuery(
    { token2: tokenString },
    { enabled: !!tokenString, retry: 1 }
  );

  console.log('🔍 [RESERVATION2 SCREEN] Estado del query:', {
    isLoading: reservationQuery.isLoading,
    isError: reservationQuery.isError,
    error: reservationQuery.error,
    hasData: !!reservationQuery.data,
    status: reservationQuery.data?.status,
    fullData: reservationQuery.data,
  });

  const confirmMutation = trpc.reservations.confirmPending2.useMutation({
    onSuccess: () => {
      console.log('✅ [CONFIRM2] Reserva confirmada exitosamente');
      reservationQuery.refetch();
      if (Platform.OS === 'web') {
        window.alert('✅ Reserva confirmada correctamente. Gracias por confirmar su reserva.');
      } else {
        Alert.alert('Éxito', 'Reserva confirmada correctamente. Gracias por confirmar su reserva.');
      }
      setTermsAccepted(false);
    },
    onError: (error: any) => {
      console.error('❌ [CONFIRM2] Error:', error);
      if (Platform.OS === 'web') {
        window.alert(error?.message || 'No se pudo confirmar la reserva');
      } else {
        Alert.alert('Error', error?.message || 'No se pudo confirmar la reserva');
      }
      setTermsAccepted(false);
    },
  });

  const cancelMutation = trpc.reservations.cancelByClient.useMutation({
    onSuccess: () => {
      console.log('✅ [CANCEL2] Reserva cancelada exitosamente');
      reservationQuery.refetch();
      Alert.alert('Éxito', 'Reserva cancelada correctamente. El restaurante ha sido notificado.');
      setIsCancelling(false);
    },
    onError: (error: any) => {
      console.error('❌ [CANCEL2] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo cancelar la reserva');
      setIsCancelling(false);
    },
  });

  useEffect(() => {
    if (!reservationQuery.data || reservationQuery.data.status !== 'pending') return;

    const serverSeconds = (reservationQuery.data as any).secondsSinceCreated;
    const fetchedAt = Date.now();

    const calculateMinutes = () => {
      if (typeof serverSeconds === 'number') {
        const elapsedSinceFetch = Math.floor((Date.now() - fetchedAt) / 1000);
        const totalSeconds = serverSeconds + elapsedSinceFetch;
        setMinutesPending(Math.max(0, Math.floor(totalSeconds / 60)));
      } else {
        const now = new Date();
        const createdAtStr = reservationQuery.data.createdAt;
        const createdAt = new Date(createdAtStr || Date.now());
        const minutesElapsed = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60)));
        setMinutesPending(minutesElapsed);
      }
    };

    calculateMinutes();
    const interval = setInterval(calculateMinutes, 60000);

    return () => clearInterval(interval);
  }, [reservationQuery.data]);

  const handleCancelReservation = () => {
    if (!token2 || !reservationQuery.data?.confirmationToken) {
      Alert.alert('Error', 'No se puede cancelar: token no válido');
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `⚠️ CANCELAR RESERVA\n\n¿Estás seguro de que deseas cancelar esta reserva?\n\nEsta acción no se puede deshacer y el restaurante será notificado.`
      );
      if (confirmed) {
        setIsCancelling(true);
        cancelMutation.mutate({ token: reservationQuery.data.confirmationToken });
      }
    } else {
      Alert.alert(
        '⚠️ Cancelar Reserva',
        '¿Estás seguro de que deseas cancelar esta reserva?\n\nEsta acción no se puede deshacer y el restaurante será notificado.',
        [
          { text: 'No, mantener reserva', style: 'cancel' },
          {
            text: 'Sí, cancelar',
            style: 'destructive',
            onPress: () => {
              setIsCancelling(true);
              cancelMutation.mutate({ token: reservationQuery.data.confirmationToken });
            },
          },
        ]
      );
    }
  };

  const handleCallRestaurant = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenMaps = (googleMapsUrl: string) => {
    if (googleMapsUrl) {
      Linking.openURL(googleMapsUrl);
    } else {
      if (Platform.OS === 'web') {
        window.alert('No hay ubicación disponible para este restaurante');
      } else {
        Alert.alert('Error', 'No hay ubicación disponible para este restaurante');
      }
    }
  };

  const hasToken = Array.isArray(token2) ? token2.length > 0 : !!token2;
  
  if (!hasToken) {
    console.error('❌ [RESERVATION2 SCREEN] No hay token2 en la URL');
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Enlace inválido</Text>
          <Text style={styles.errorMessage}>
            El enlace no es válido. Por favor, verifica el enlace o contacta al restaurante.
          </Text>
        </View>
      </>
    );
  }

  if (reservationQuery.isLoading) {
    console.log('🔄 [RESERVATION2 SCREEN] Cargando...');
    return (
      <>
        <Stack.Screen options={{ title: 'Cargando...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Cargando reserva...</Text>
        </View>
      </>
    );
  }

  if (reservationQuery.error || !reservationQuery.data) {
    console.error('❌ [RESERVATION2 SCREEN] Error o sin datos:', {
      error: reservationQuery.error,
      errorMessage: reservationQuery.error?.message,
      hasData: !!reservationQuery.data,
      data: reservationQuery.data,
    });
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Reserva no encontrada</Text>
          <Text style={styles.errorMessage}>
            {reservationQuery.error?.message || 'No se pudo encontrar la reserva. Verifica el enlace o contacta al restaurante.'}
          </Text>
        </View>
      </>
    );
  }

  console.log('✅ [RESERVATION2 SCREEN] Reserva cargada:', {
    id: reservationQuery.data.id,
    status: reservationQuery.data.status,
    date: reservationQuery.data.date,
  });

  const reservation = reservationQuery.data;
  const isCancelled = reservation.status === 'cancelled';
  const isConfirmed = reservation.status === 'confirmed';
  const isPending = reservation.status === 'pending';
  const isFromRestaurantPanel = (reservation as any).fromRestaurantPanel === true;
  const clientRating = parseFloat(String(reservation.clientRating ?? 0));
  const timeData = reservation.time ?? { hour: 0, minute: 0 };
  const reservationDate = new Date(reservation.date);
  const now = new Date();
  const reservationDateTime = new Date(reservationDate);
  reservationDateTime.setHours(timeData.hour, timeData.minute, 0, 0);
  const minModifyCancelMinutes = reservation.minModifyCancelMinutes || 180;
  const minutesUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60);
  const canModify = isFromRestaurantPanel
    ? minutesUntilReservation > 0 && !isCancelled
    : minutesUntilReservation >= minModifyCancelMinutes && !isCancelled;

  const formattedDate = reservationDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeString = `${String(timeData.hour).padStart(2, '0')}:${String(timeData.minute).padStart(2, '0')}`;

  return (
    <>
      <Stack.Screen
        options={{
          title: isConfirmed ? 'Mi Reserva' : 'Confirmar Reserva',
          headerStyle: { backgroundColor: isConfirmed ? '#8b5cf6' : '#f59e0b' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <LinearGradient colors={isConfirmed ? ['#8b5cf6', '#7c3aed'] : ['#f59e0b', '#d97706']} style={styles.headerGradient}>
            <View style={styles.clientInfoHeader}>
              <Text style={styles.clientNameHeader}>{reservation.clientName}</Text>
              {clientRating > 0 && (
                <View style={styles.ratingBadgeHeader}>
                  <Heart size={14} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
                  <Text style={styles.ratingTextHeader}>{clientRating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerTitle}>{reservation.restaurantName}</Text>
            <Text style={styles.headerSubtitle}>{isConfirmed ? 'Detalles de su reserva' : 'Confirme su reserva'}</Text>
          </LinearGradient>
        </View>

        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <X size={20} color="#ef4444" />
            <Text style={styles.cancelledText}>Esta reserva ha sido cancelada</Text>
          </View>
        )}

        {isPending && (
          <View style={styles.pendingBanner}>
            <AlertCircle size={20} color="#f59e0b" />
            <View style={styles.pendingTextContainer}>
              <Text style={styles.pendingText}>Reserva pendiente de confirmación</Text>
              <Text style={styles.pendingCounter}>⏱️ {minutesPending} {minutesPending === 1 ? 'minuto' : 'minutos'} en estado pendiente</Text>
            </View>
          </View>
        )}

        {isConfirmed && (
          <View style={styles.confirmedBanner}>
            <AlertCircle size={20} color="#10b981" />
            <Text style={styles.confirmedText}>✓ Reserva confirmada</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalles de la Reserva</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Calendar size={20} color={isConfirmed ? '#8b5cf6' : '#f59e0b'} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Fecha</Text>
              <Text style={styles.infoValue}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Clock size={20} color={isConfirmed ? '#8b5cf6' : '#f59e0b'} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Hora</Text>
              <Text style={styles.infoValue}>{timeString}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Users size={20} color={isConfirmed ? '#8b5cf6' : '#f59e0b'} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Comensales</Text>
              <Text style={styles.infoValue}>
                Total: {reservation.guests} {reservation.guests === 1 ? 'persona' : 'personas'}
              </Text>
              {reservation.needsHighChair && reservation.highChairCount && reservation.highChairCount > 0 && (
                <Text style={styles.infoSubValue}>
                  {reservation.guests - (reservation.highChairCount || 0)} {(reservation.guests - (reservation.highChairCount || 0)) === 1 ? 'adulto' : 'adultos'} + {reservation.highChairCount} {reservation.highChairCount === 1 ? 'trona' : 'tronas'}
                </Text>
              )}
            </View>
          </View>

          {reservation.locationName && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MapPin size={20} color={isConfirmed ? '#8b5cf6' : '#f59e0b'} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ubicación</Text>
                <Text style={styles.infoValue}>{reservation.locationName}</Text>
              </View>
            </View>
          )}

          {(reservation.needsHighChair || reservation.needsStroller || reservation.hasPets) && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <AlertCircle size={20} color={isConfirmed ? '#8b5cf6' : '#f59e0b'} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Necesidades especiales</Text>
                <View style={styles.needsContainer}>
                  {reservation.needsHighChair && (
                    <View style={styles.needBadge}>
                      <Baby size={16} color={isConfirmed ? '#8b5cf6' : '#f59e0b'} />
                      <Text style={styles.needText}>
                        {reservation.highChairCount || 1} {(reservation.highChairCount || 1) === 1 ? 'Trona' : 'Tronas'}
                      </Text>
                    </View>
                  )}
                  {reservation.needsStroller && (
                    <View style={styles.needBadge}>
                      <ShoppingCart size={16} color={isConfirmed ? '#8b5cf6' : '#f59e0b'} />
                      <Text style={styles.needText}>Con carrito</Text>
                    </View>
                  )}
                  {reservation.hasPets && (
                    <View style={styles.needBadge}>
                      <PawPrint size={16} color={isConfirmed ? '#8b5cf6' : '#f59e0b'} />
                      <Text style={styles.needText}>Con mascota</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {reservation.clientNotes && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MessageSquare size={20} color={isConfirmed ? '#8b5cf6' : '#f59e0b'} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Observaciones</Text>
                <Text style={styles.infoValue}>{reservation.clientNotes}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contacto del Restaurante</Text>

          {reservation.restaurantGoogleMapsUrl && (
            <TouchableOpacity
              style={styles.mapsButton}
              onPress={() => handleOpenMaps(reservation.restaurantGoogleMapsUrl)}
              activeOpacity={0.7}
            >
              <Navigation size={20} color="#fff" />
              <Text style={styles.mapsButtonText}>Cómo llegar</Text>
            </TouchableOpacity>
          )}

          {reservation.restaurantPhone && (
            <TouchableOpacity
              style={[styles.phoneButton, reservation.restaurantGoogleMapsUrl && { marginTop: 12 }]}
              onPress={() => handleCallRestaurant(reservation.restaurantPhone)}
              activeOpacity={0.7}
            >
              <Phone size={20} color="#fff" />
              <Text style={styles.phoneButtonText}>Llamar al Restaurante</Text>
            </TouchableOpacity>
          )}
        </View>

        {isPending && (
          <View style={styles.actionsCard}>
            <Text style={styles.confirmInfo}>
              Revise que los datos sean correctos y confirme la reserva.
            </Text>
            
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                He leído y acepto los términos y condiciones, autorizo que se me envíen notificaciones de WhatsApp con referencia a mis reservas, autorizo que mi número de teléfono y usuario se conserve en esta plataforma para futuras reservas, autorizo también al restaurante donde reservo a que pueda valorarme como cliente en cada reserva que realice.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, !termsAccepted && styles.confirmButtonDisabled]}
              onPress={() => {
                if (!termsAccepted) {
                  if (Platform.OS === 'web') {
                    window.alert('Debe aceptar los términos y condiciones para continuar.');
                  } else {
                    Alert.alert('Atención', 'Debe aceptar los términos y condiciones para continuar.');
                  }
                  return;
                }
                console.log('🔵 [CONFIRM2] Iniciando confirmación de reserva con token2:', tokenString);
                confirmMutation.mutate({ token2: tokenString });
              }}
              activeOpacity={0.7}
              disabled={!termsAccepted || confirmMutation.isPending}
            >
              <LinearGradient colors={termsAccepted ? ['#10b981', '#059669'] : ['#9ca3af', '#6b7280']} style={styles.confirmGradient}>
                {confirmMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirmar Reserva</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {isConfirmed && !isCancelled && (
          <View style={styles.actionsCard}>
            {canModify ? (
              <>
                <Text style={styles.modifyInfo}>
                  Puede modificar los datos de su reserva hasta {Math.floor(minModifyCancelMinutes / 60)} horas antes.
                </Text>
                
                <TouchableOpacity
                  style={styles.modifyButton}
                  onPress={() => {
                    if (reservation.restaurantSlug) {
                      console.log('🔵 [MODIFY2] Redirigiendo a modificación con token:', reservation.confirmationToken);
                      router.push(`/client/restaurant/${reservation.restaurantSlug}?modifyToken=${reservation.confirmationToken}&returnToken2=${tokenString}`);
                    } else {
                      Alert.alert('Error', 'No se puede modificar esta reserva en este momento');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.modifyGradient}>
                    <Edit3 size={20} color="#fff" />
                    <Text style={styles.modifyButtonText}>Modificar Reserva</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <View style={styles.separator} />
                
                <Text style={styles.cancelInfo}>
                  Puede cancelar su reserva hasta {Math.floor(minModifyCancelMinutes / 60)} horas antes del horario reservado.
                </Text>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelReservation}
                  activeOpacity={0.7}
                  disabled={isCancelling}
                >
                  <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.cancelGradient}>
                    {isCancelling ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <X size={20} color="#fff" />
                        <Text style={styles.cancelButtonText}>Cancelar Reserva</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noCancelContainer}>
                <AlertCircle size={24} color="#f59e0b" />
                <Text style={styles.noCancelTitle}>No se puede modificar o cancelar online</Text>
                <Text style={styles.noCancelMessage}>
                  Quedan menos de {Math.floor(minModifyCancelMinutes / 60)} horas para su reserva. Para realizar cambios, debe contactar
                  directamente al restaurante.
                </Text>
                {reservation.restaurantPhone && (
                  <TouchableOpacity
                    style={styles.emergencyCallButton}
                    onPress={() => handleCallRestaurant(reservation.restaurantPhone)}
                    activeOpacity={0.7}
                  >
                    <Phone size={18} color="#8b5cf6" />
                    <Text style={styles.emergencyCallText}>Llamar ahora</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingBottom: 32,
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
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    margin: 20,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGradient: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginBottom: 0,
  },
  pendingTextContainer: {
    flex: 1,
  },
  pendingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#f59e0b',
    marginBottom: 4,
  },
  pendingCounter: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#d97706',
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginBottom: 0,
  },
  cancelledText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginBottom: 0,
  },
  confirmedText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  card: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  infoValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  infoSubValue: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500' as const,
    marginTop: 4,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  phoneButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mapsButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  actionsCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmInfo: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  confirmButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  needsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  needBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  needText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#f59e0b',
  },
  modifyInfo: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 16,
  },
  modifyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  modifyGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modifyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  cancelInfo: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  cancelButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  cancelGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  noCancelContainer: {
    alignItems: 'center',
    padding: 8,
  },
  noCancelTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 8,
  },
  noCancelMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emergencyCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  emergencyCallText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#8b5cf6',
  },
  clientInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  clientNameHeader: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  ratingBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingTextHeader: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
