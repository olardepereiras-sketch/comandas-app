import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Calendar, Clock, Users, MapPin, Baby, ShoppingCart, PawPrint, AlertCircle, CheckCircle, ClipboardList } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';

export default function WaitlistConfirmScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const entryQuery = trpc.waitlist.getByToken.useQuery(
    { token: token || '' },
    { enabled: !!token, retry: 1 }
  );

  const confirmMutation = trpc.waitlist.confirmEntry.useMutation({
    onSuccess: (data) => {
      console.log('[WAITLIST TOKEN] Confirmado:', data);
      setConfirmed(true);
    },
    onError: (error: any) => {
      console.error('[WAITLIST TOKEN] Error:', error);
      if (Platform.OS === 'web') {
        window.alert(error?.message || 'No se pudo confirmar la solicitud');
      } else {
        Alert.alert('Error', error?.message || 'No se pudo confirmar la solicitud');
      }
    },
  });

  if (!token) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centerContainer}>
          <AlertCircle size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Enlace inválido</Text>
          <Text style={styles.errorMessage}>El enlace no es válido. Por favor contacta al restaurante.</Text>
        </View>
      </>
    );
  }

  if (entryQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Cargando...' }} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Cargando solicitud...</Text>
        </View>
      </>
    );
  }

  if (entryQuery.error || !entryQuery.data) {
    return (
      <>
        <Stack.Screen options={{ title: 'No encontrado' }} />
        <View style={styles.centerContainer}>
          <AlertCircle size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Solicitud no encontrada</Text>
          <Text style={styles.errorMessage}>
            {entryQuery.error?.message || 'No se encontró la solicitud. Puede que haya expirado.'}
          </Text>
        </View>
      </>
    );
  }

  const entry = entryQuery.data;

  const isExpired = entry.status === 'expired' || entry.status === 'cancelled';
  const isAlreadyWaiting = entry.status === 'waiting' || confirmed;
  const isConfirmed = entry.status === 'confirmed';
  const isPending = entry.status === 'pending_confirmation';

  const dateObj = new Date(entry.date + 'T12:00:00');
  const formattedDate = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  if (isExpired) {
    return (
      <>
        <Stack.Screen options={{ title: 'Solicitud expirada', headerStyle: { backgroundColor: '#ef4444' }, headerTintColor: '#fff' }} />
        <View style={styles.centerContainer}>
          <AlertCircle size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Solicitud expirada</Text>
          <Text style={styles.errorMessage}>
            Esta solicitud de lista de espera ha expirado o fue cancelada. Por favor, vuelve al restaurante para hacer una nueva solicitud.
          </Text>
        </View>
      </>
    );
  }

  if (isConfirmed) {
    return (
      <>
        <Stack.Screen options={{ title: 'Reserva Confirmada', headerStyle: { backgroundColor: '#10b981' }, headerTintColor: '#fff' }} />
        <View style={styles.centerContainer}>
          <CheckCircle size={64} color="#10b981" />
          <Text style={[styles.errorTitle, { color: '#10b981' }]}>¡Reserva Confirmada!</Text>
          <Text style={styles.errorMessage}>
            Tu solicitud de lista de espera se convirtió en una reserva confirmada. Revisa tu WhatsApp para ver los detalles.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Lista de Espera',
          headerStyle: { backgroundColor: '#8b5cf6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.headerGradient}>
            <ClipboardList size={40} color="#fff" strokeWidth={1.5} />
            <Text style={styles.headerTitle}>{entry.restaurantName}</Text>
            <Text style={styles.headerSubtitle}>Solicitud de Lista de Espera</Text>
          </LinearGradient>
        </View>

        {isAlreadyWaiting && (
          <View style={styles.successBanner}>
            <CheckCircle size={22} color="#10b981" />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.successBannerTitle}>¡Estás en la lista de espera!</Text>
              <Text style={styles.successBannerText}>
                Te notificaremos por WhatsApp cuando se libere una mesa para tu reserva.
              </Text>
            </View>
          </View>
        )}

        {isPending && (
          <View style={styles.pendingBanner}>
            <AlertCircle size={22} color="#f59e0b" />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.pendingBannerTitle}>Confirma tu solicitud</Text>
              <Text style={styles.pendingBannerText}>
                Revisa los datos y pulsa confirmar para entrar en la lista de espera.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalles de la Solicitud</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Users size={20} color="#8b5cf6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Cliente</Text>
              <Text style={styles.infoValue}>{entry.clientName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Calendar size={20} color="#8b5cf6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Fecha solicitada</Text>
              <Text style={styles.infoValue}>{formattedDate}</Text>
            </View>
          </View>

          {entry.preferredTime && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Clock size={20} color="#8b5cf6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Horario preferido</Text>
                <Text style={styles.infoValue}>{entry.preferredTime}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Users size={20} color="#8b5cf6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Comensales</Text>
              <Text style={styles.infoValue}>{entry.guests} {entry.guests === 1 ? 'persona' : 'personas'}</Text>
            </View>
          </View>

          {(entry.needsHighChair || entry.needsStroller || entry.hasPets) && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <AlertCircle size={20} color="#8b5cf6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Necesidades especiales</Text>
                <View style={styles.needsContainer}>
                  {entry.needsHighChair && entry.highChairCount > 0 && (
                    <View style={styles.needBadge}>
                      <Baby size={14} color="#8b5cf6" />
                      <Text style={styles.needText}>{entry.highChairCount} trona{entry.highChairCount !== 1 ? 's' : ''}</Text>
                    </View>
                  )}
                  {entry.needsStroller && (
                    <View style={styles.needBadge}>
                      <ShoppingCart size={14} color="#8b5cf6" />
                      <Text style={styles.needText}>Carrito de bebé</Text>
                    </View>
                  )}
                  {entry.hasPets && (
                    <View style={styles.needBadge}>
                      <PawPrint size={14} color="#8b5cf6" />
                      <Text style={styles.needText}>Con mascota</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {entry.restaurantAddress && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MapPin size={20} color="#8b5cf6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Restaurante</Text>
                <Text style={styles.infoValue}>{entry.restaurantAddress}</Text>
              </View>
            </View>
          )}
        </View>

        {!isAlreadyWaiting && isPending && (
          <View style={styles.actionsCard}>
            <Text style={styles.confirmInfo}>
              Al confirmar entrarás en la lista de espera. Cuando se libere una mesa que encaje con tu solicitud, recibirás una notificación de WhatsApp con tu reserva confirmada.
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
              style={[styles.confirmButton, (!termsAccepted || confirmMutation.isPending) && styles.confirmButtonDisabled]}
              onPress={() => {
                if (!termsAccepted) {
                  if (Platform.OS === 'web') {
                    window.alert('Debes aceptar los términos y condiciones para continuar.');
                  } else {
                    Alert.alert('Atención', 'Debes aceptar los términos y condiciones para continuar.');
                  }
                  return;
                }
                confirmMutation.mutate({ token: token || '' });
              }}
              activeOpacity={0.7}
              disabled={!termsAccepted || confirmMutation.isPending}
            >
              <LinearGradient
                colors={termsAccepted ? ['#8b5cf6', '#7c3aed'] : ['#9ca3af', '#6b7280']}
                style={styles.confirmGradient}
              >
                {confirmMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <ClipboardList size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Confirmar y entrar en lista</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {isAlreadyWaiting && (
          <View style={styles.waitingInfoCard}>
            <Text style={styles.waitingInfoTitle}>¿Cómo funciona?</Text>
            <View style={styles.waitingStep}>
              <Text style={styles.waitingStepNum}>1</Text>
              <Text style={styles.waitingStepText}>Estás en la lista de espera ordenada por orden de llegada.</Text>
            </View>
            <View style={styles.waitingStep}>
              <Text style={styles.waitingStepNum}>2</Text>
              <Text style={styles.waitingStepText}>Cuando se libere una mesa que pueda alojar tu reserva, el sistema te la asignará automáticamente.</Text>
            </View>
            <View style={styles.waitingStep}>
              <Text style={styles.waitingStepNum}>3</Text>
              <Text style={styles.waitingStepText}>Recibirás un WhatsApp con la confirmación de tu reserva con todos los detalles.</Text>
            </View>
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
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
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
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.85,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginBottom: 0,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginBottom: 0,
  },
  bannerTextContainer: {
    flex: 1,
  },
  successBannerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#065f46',
    marginBottom: 4,
  },
  successBannerText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  pendingBannerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#92400e',
    marginBottom: 4,
  },
  pendingBannerText: {
    fontSize: 14,
    color: '#b45309',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    marginBottom: 14,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
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
    marginBottom: 2,
    fontWeight: '500' as const,
  },
  infoValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  needsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  needBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  needText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8b5cf6',
  },
  actionsCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmInfo: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 2,
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
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  checkmark: {
    fontSize: 14,
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
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmGradient: {
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  waitingInfoCard: {
    backgroundColor: '#f5f3ff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  waitingInfoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#4c1d95',
    marginBottom: 16,
  },
  waitingStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  waitingStepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#8b5cf6',
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 26,
    flexShrink: 0,
  },
  waitingStepText: {
    flex: 1,
    fontSize: 14,
    color: '#4c1d95',
    lineHeight: 20,
  },
});
