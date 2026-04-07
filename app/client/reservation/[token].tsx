import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Clock, Users, Phone, MessageSquare, AlertCircle, X, MapPin, ShoppingCart, PawPrint, Edit3, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';

export default function ClientReservationScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [minutesPending, setMinutesPending] = useState<number>(0);

  console.log('🔍 [RESERVATION SCREEN] Token recibido:', token);
  console.log('🔍 [RESERVATION SCREEN] Tipo de token:', typeof token);

  const reservationQuery = trpc.reservations.getByToken.useQuery(
    { token: token || '' },
    { 
      enabled: !!token,
      retry: 1,
      staleTime: 0,
      refetchOnMount: 'always' as const,
    }
  );

  console.log('🔍 [RESERVATION SCREEN] Estado del query:', {
    isLoading: reservationQuery.isLoading,
    isError: reservationQuery.isError,
    error: reservationQuery.error?.message,
    hasData: !!reservationQuery.data,
    status: reservationQuery.data?.status,
  });

  if (reservationQuery.data) {
    console.log('✅ [RESERVATION SCREEN] Datos recibidos:', reservationQuery.data);
  }
  if (reservationQuery.error) {
    console.error('❌ [RESERVATION SCREEN] Error en query:', reservationQuery.error);
  }

  const cancelMutation = trpc.reservations.cancelByClient.useMutation({
    onSuccess: () => {
      console.log('✅ [FRONTEND] Reserva cancelada por cliente exitosamente');
      void reservationQuery.refetch();
      Alert.alert('Éxito', 'Reserva cancelada correctamente. El restaurante ha sido notificado.');
      setIsCancelling(false);
    },
    onError: (error: any) => {
      console.error('❌ [FRONTEND] Error cancelando reserva:', error);
      Alert.alert('Error', error?.message || 'No se pudo cancelar la reserva');
      setIsCancelling(false);
    },
  });

  const confirmMutation = trpc.reservations.confirmPending.useMutation({
    onSuccess: () => {
      console.log('✅ [CONFIRM] Reserva confirmada exitosamente');
      setTermsAccepted(false);
      void reservationQuery.refetch();
    },
    onError: (error: any) => {
      console.error('❌ [CONFIRM] Error:', error);
      if (Platform.OS === 'web') {
        window.alert(error?.message || 'No se pudo confirmar la reserva');
      } else {
        Alert.alert('Error', error?.message || 'No se pudo confirmar la reserva');
      }
      setTermsAccepted(false);
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
    console.log('🔴 [DEBUG] Click en botón cancelar - Token:', token);
    if (!token) {
      console.error('❌ [ERROR] No hay token válido');
      Alert.alert('Error', 'No se puede cancelar: token no válido');
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `⚠️ CANCELAR RESERVA\n\n¿Estás seguro de que deseas cancelar esta reserva?\n\nEsta acción no se puede deshacer y el restaurante será notificado.`
      );
      console.log('🔴 [DEBUG] Confirmación web cancelar:', confirmed);
      if (confirmed) {
        console.log('🔵 [FRONTEND] INICIO - Intentando cancelar reserva con token:', token);
        setIsCancelling(true);
        cancelMutation.mutate({ token });
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
              console.log('🔵 [FRONTEND] INICIO - Intentando cancelar reserva con token:', token);
              setIsCancelling(true);
              cancelMutation.mutate({ token });
            },
          },
        ]
      );
    }
  };

  const handleCallRestaurant = (phone: string) => {
    void Linking.openURL(`tel:${phone}`);
  };

  if (!token) {
    console.error('❌ [RESERVATION SCREEN] No hay token en la URL');
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
    console.log('🔄 [RESERVATION SCREEN] Cargando...');
    return (
      <>
        <Stack.Screen options={{ title: 'Cargando...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Cargando reserva...</Text>
        </View>
      </>
    );
  }

  if (reservationQuery.error || !reservationQuery.data) {
    console.error('❌ [RESERVATION SCREEN] Error o sin datos:', reservationQuery.error);
    const errMsg = reservationQuery.error?.message || '';
    const isNetworkError = errMsg.toLowerCase().includes('network') || 
      errMsg.toLowerCase().includes('fetch') || 
      errMsg.toLowerCase().includes('connect') ||
      errMsg.toLowerCase().includes('failed') ||
      errMsg === '';
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>
            {isNetworkError ? 'Error de conexión' : 'Reserva no encontrada'}
          </Text>
          <Text style={styles.errorMessage}>
            {isNetworkError 
              ? 'No se pudo validar el token. Comprueba la conexión e inténtalo de nuevo.'
              : (errMsg || 'No se pudo encontrar la reserva. Verifica el enlace o contacta al restaurante.')}
          </Text>
          {isNetworkError && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void reservationQuery.refetch()}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  }

  console.log('✅ [RESERVATION SCREEN] Reserva cargada:', {
    id: reservationQuery.data.id,
    status: reservationQuery.data.status,
    date: reservationQuery.data.date,
  });

  const reservation = reservationQuery.data;
  const isCancelled = reservation.status === 'cancelled';
  const isModified = reservation.status === 'modified';
  const isPending = reservation.status === 'pending';
  const isFromRestaurantPanel = (reservation as any).fromRestaurantPanel === true;
  const clientRating = parseFloat(String(reservation.clientRating ?? 0));

  let reservationDate: Date;
  try {
    reservationDate = new Date(reservation.date);
    if (isNaN(reservationDate.getTime())) {
      throw new Error('Fecha inválida');
    }
  } catch (error) {
    console.error('❌ Error parseando fecha:', reservation.date, error);
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Error en los datos</Text>
          <Text style={styles.errorMessage}>
            Los datos de la reserva no son válidos. Por favor contacta al restaurante.
          </Text>
        </View>
      </>
    );
  }

  const timeData = reservation.time ?? { hour: 0, minute: 0 };
  const now = new Date();
  const reservationDateTime = new Date(reservationDate);
  reservationDateTime.setHours(timeData.hour, timeData.minute, 0, 0);
  const minModifyCancelMinutes = reservation.minModifyCancelMinutes || 180;
  const minutesUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60);
  const canModify = isFromRestaurantPanel
    ? minutesUntilReservation > 0 && !isCancelled && !isModified && !isPending
    : minutesUntilReservation >= minModifyCancelMinutes && !isCancelled && !isModified && !isPending;

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
          title: 'Mi Reserva',
          headerStyle: { backgroundColor: reservation.status === 'pending' ? '#f59e0b' : '#8b5cf6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.headerGradient}>
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
            <Text style={styles.headerSubtitle}>Detalles de su reserva</Text>
          </LinearGradient>
        </View>

        {isPending && (
          <View style={styles.pendingBanner}>
            <AlertCircle size={20} color="#f59e0b" />
            <View style={styles.pendingTextContainer}>
              <Text style={styles.pendingText}>Reserva pendiente de confirmación</Text>
              <Text style={styles.pendingCounter}>⏱️ {minutesPending} {minutesPending === 1 ? 'minuto' : 'minutos'} en estado pendiente</Text>
            </View>
          </View>
        )}

        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <X size={20} color="#ef4444" />
            <Text style={styles.cancelledText}>Esta reserva ha sido cancelada</Text>
          </View>
        )}

        {isModified && (
          <View style={styles.modifiedBanner}>
            <AlertCircle size={20} color="#f59e0b" />
            <Text style={styles.modifiedText}>Esta reserva fue modificada y ya no es válida</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información de la Reserva</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Calendar size={20} color="#8b5cf6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Fecha</Text>
              <Text style={styles.infoValue}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Clock size={20} color="#8b5cf6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Hora</Text>
              <Text style={styles.infoValue}>{timeString}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Users size={20} color="#8b5cf6" />
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
                <MapPin size={20} color="#8b5cf6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ubicación en el restaurante</Text>
                <Text style={styles.infoValue}>{reservation.locationName}</Text>
              </View>
            </View>
          )}

          {(reservation.needsStroller || reservation.hasPets) && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <AlertCircle size={20} color="#8b5cf6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Necesidades especiales</Text>
                <View style={styles.needsContainer}>
                  {reservation.needsStroller && (
                    <View style={styles.needBadge}>
                      <ShoppingCart size={16} color="#8b5cf6" />
                      <Text style={styles.needText}>Con carrito de bebé</Text>
                    </View>
                  )}
                  {reservation.hasPets && (
                    <View style={styles.needBadge}>
                      <PawPrint size={16} color="#8b5cf6" />
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
                <MessageSquare size={20} color="#8b5cf6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Observaciones</Text>
                <Text style={styles.infoValue}>{reservation.clientNotes}</Text>
              </View>
            </View>
          )}

          {isCancelled && reservation.notes && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <X size={20} color="#ef4444" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Estado</Text>
                <Text style={[styles.infoValue, { color: '#ef4444' }]}>{reservation.notes}</Text>
              </View>
            </View>
          )}

          {!isCancelled && reservation.notes && reservation.notes !== 'Reserva anulada por el restaurante' && reservation.notes !== 'Reserva anulada por el cliente' && !reservation.notes.startsWith('Anulada:') && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MessageSquare size={20} color="#f59e0b" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Notas del restaurante</Text>
                <Text style={styles.infoValue}>{reservation.notes}</Text>
              </View>
            </View>
          )}
        </View>



        {isPending && (
          <View style={styles.actionsCard}>
            <Text style={styles.confirmInfo}>
              Para confirmar su reserva, por favor revise los datos y acepte los términos.
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
                console.log('🔵 [CONFIRM] Iniciando confirmación de reserva con token:', token);
                confirmMutation.mutate({ token: token || '' });
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

        {!isCancelled && !isModified && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Acciones</Text>

            {reservation.restaurantId && (
              <TouchableOpacity
                style={styles.mapsButton}
                onPress={() => {
                  const mapsUrl = reservation.googleMapsUrl || reservation.restaurantGoogleMaps;
                  console.log('🗺️ [MAPS] Abriendo ubicación del restaurante:', reservation.restaurantName);
                  console.log('🗺️ [MAPS] URL de Google Maps:', mapsUrl);
                  
                  if (!mapsUrl || typeof mapsUrl !== 'string' || mapsUrl.trim() === '') {
                    console.error('❌ [MAPS] No hay URL de Google Maps configurada');
                    Alert.alert('Error', 'Este restaurante no tiene una ubicación configurada. Por favor, contacta al restaurante.');
                    return;
                  }

                  let finalUrl = mapsUrl.trim();
                  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                    finalUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(finalUrl);
                    console.log('🗺️ [MAPS] URL convertida:', finalUrl);
                  }
                  
                  console.log('🗺️ [MAPS] Abriendo:', finalUrl);
                  Linking.openURL(finalUrl).catch(err => {
                    console.error('❌ [MAPS] Error al abrir Google Maps:', err);
                    Alert.alert('Error', 'No se pudo abrir Google Maps. URL: ' + finalUrl);
                  });
                }}
                activeOpacity={0.7}
              >
                <MapPin size={20} color="#fff" />
                <Text style={styles.mapsButtonText}>Cómo llegar</Text>
              </TouchableOpacity>
            )}

            {reservation.restaurantPhone && (
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={() => handleCallRestaurant(reservation.restaurantPhone)}
                activeOpacity={0.7}
              >
                <Phone size={20} color="#fff" />
                <Text style={styles.phoneButtonText}>Llamar al Restaurante</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isCancelled && !isModified && !isPending && (
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
                      console.log('🔵 [MODIFY] Redirigiendo a modificación con token:', token);
                      router.push(`/client/restaurant/${reservation.restaurantSlug}?modifyToken=${token}`);
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
    shadowColor: '#8b5cf6',
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
  confirmInfo: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 16,
  },
  confirmButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
  modifiedBanner: {
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
  modifiedText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#f59e0b',
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
    backgroundColor: '#f5f3ff',
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
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  mapsButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
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
  needsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  needsSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 12,
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
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  needText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8b5cf6',
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
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
