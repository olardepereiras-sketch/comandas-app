import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { XCircle, MessageCircle, Clock, Calendar, Users, CheckCircle2 } from 'lucide-react-native';

interface ReservationSummary {
  clientName: string;
  clientPhone: string;
  date: string;
  time: { hour: number; minute: number };
  guests: number;
  locationName?: string;
  highChairCount?: number;
  needsStroller?: boolean;
  hasPets?: boolean;
}

export default function DepositSuccessScreen() {
  const router = useRouter();
  const [depositId, setDepositId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [step, setStep] = useState<'verifying' | 'creating' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [reservationSummary, setReservationSummary] = useState<ReservationSummary | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dId = params.get('deposit_id') || '';
      const sId = params.get('session_id') || '';
      const sl = params.get('slug') || '';
      console.log('🔵 [DEPOSIT SUCCESS] Params:', { dId, sId, sl });
      setDepositId(dId);
      setSessionId(sId);
      setSlug(sl);
    }
  }, []);

  const confirmMutation = trpc.deposits.confirmPayment.useMutation({
    onSuccess: (data: any) => {
      console.log('✅ [DEPOSIT SUCCESS] Pago verificado:', data);
      if (data.paid && data.reservationData) {
        setStep('creating');
        const resData = data.reservationData;
        console.log('🔵 [DEPOSIT SUCCESS] Creando reserva con datos:', resData);
        setReservationSummary({
          clientName: resData.clientName || '',
          clientPhone: resData.clientPhone || '',
          date: resData.date || '',
          time: resData.time || { hour: 0, minute: 0 },
          guests: resData.guests || 0,
          locationName: resData.locationName || '',
          highChairCount: resData.highChairCount || 0,
          needsStroller: resData.needsStroller || false,
          hasPets: resData.hasPets || false,
        });
        createReservationMutation.mutate({
          restaurantId: resData.restaurantId || '',
          clientPhone: resData.clientPhone || '',
          clientName: resData.clientName || '',
          date: resData.date || '',
          time: resData.time || { hour: 0, minute: 0 },
          guests: resData.guests || 0,
          locationId: resData.locationId || '',
          tableIds: resData.tableIds || [],
          needsHighChair: resData.needsHighChair || false,
          highChairCount: resData.highChairCount || 0,
          needsStroller: resData.needsStroller || false,
          hasPets: resData.hasPets || false,
          notes: resData.notes || '',
          depositPaid: true,
        });
      } else {
        setStep('error');
        setErrorMessage('El pago no se completó correctamente. Por favor, contacta con el restaurante.');
      }
    },
    onError: (error: any) => {
      console.error('❌ [DEPOSIT SUCCESS] Error verificando pago:', error);
      setStep('error');
      setErrorMessage(error?.message || 'Error al verificar el pago.');
    },
  });

  const createReservationMutation = trpc.reservations.create.useMutation({
    onSuccess: (data: any) => {
      console.log('✅ [DEPOSIT SUCCESS] Reserva creada:', data.id);
      setStep('success');
    },
    onError: (error: any) => {
      console.error('❌ [DEPOSIT SUCCESS] Error creando reserva:', error);
      setStep('error');
      setErrorMessage(error?.message || 'Error al crear la reserva. Tu pago fue procesado correctamente. Contacta al restaurante.');
    },
  });

  useEffect(() => {
    if (depositId && sessionId && step === 'verifying') {
      console.log('🔵 [DEPOSIT SUCCESS] Verificando pago...');
      confirmMutation.mutate({
        depositOrderId: depositId,
        sessionId: sessionId,
      });
    }
  }, [depositId, sessionId]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (time: { hour: number; minute: number }) => {
    return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  };

  const handleEntendido = () => {
    if (slug && typeof window !== 'undefined') {
      window.location.href = `/client/restaurant/${slug}`;
    } else {
      router.replace('/');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Fianza Pagada', headerBackVisible: false }} />
      <View style={styles.container}>
        {step === 'verifying' && (
          <View style={styles.centerContent}>
            <View style={styles.loadingCircle}>
              <ActivityIndicator size="large" color="#7C3AED" />
            </View>
            <Text style={styles.statusTitle}>Verificando pago...</Text>
            <Text style={styles.statusMessage}>Estamos confirmando tu pago con Stripe.</Text>
          </View>
        )}

        {step === 'creating' && (
          <View style={styles.centerContent}>
            <View style={styles.loadingCircle}>
              <ActivityIndicator size="large" color="#10B981" />
            </View>
            <Text style={styles.statusTitle}>Creando tu reserva...</Text>
            <Text style={styles.statusMessage}>Tu pago fue exitoso. Estamos procesando tu reserva.</Text>
          </View>
        )}

        {step === 'success' && (
          <ScrollView contentContainerStyle={styles.successScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <View style={styles.pendingIconCircle}>
                  <Clock size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.pendingTitle}>¡Reserva Pendiente!</Text>
                <Text style={styles.pendingSubtitle}>Fianza pagada correctamente ✓</Text>
              </View>

              <View style={styles.whatsappBanner}>
                <MessageCircle size={20} color="#25D366" />
                <Text style={styles.whatsappBannerText}>
                  Te hemos enviado un <Text style={styles.whatsappBold}>WhatsApp</Text> con un enlace para confirmar tu reserva.{'\n'}
                  Por favor, <Text style={styles.whatsappBold}>confirma en los próximos 5 minutos</Text> o tu reserva será cancelada.
                </Text>
              </View>

              {reservationSummary && (
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsTitle}>Detalles de tu reserva</Text>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <Calendar size={16} color="#6B7280" />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Fecha</Text>
                      <Text style={styles.detailValue}>{formatDate(reservationSummary.date)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <Clock size={16} color="#6B7280" />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Hora</Text>
                      <Text style={styles.detailValue}>{formatTime(reservationSummary.time)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <Users size={16} color="#6B7280" />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Comensales</Text>
                      <Text style={styles.detailValue}>
                        {reservationSummary.guests} persona{reservationSummary.guests !== 1 ? 's' : ''}
                        {(reservationSummary.highChairCount ?? 0) > 0 ? ` · ${reservationSummary.highChairCount} trona${(reservationSummary.highChairCount ?? 0) !== 1 ? 's' : ''}` : ''}
                        {reservationSummary.needsStroller ? ' · Carrito' : ''}
                        {reservationSummary.hasPets ? ' · Mascota' : ''}
                      </Text>
                    </View>
                  </View>

                  {reservationSummary.locationName ? (
                    <>
                      <View style={styles.detailDivider} />
                      <View style={styles.detailRow}>
                        <View style={styles.detailIconWrap}>
                          <CheckCircle2 size={16} color="#6B7280" />
                        </View>
                        <View style={styles.detailInfo}>
                          <Text style={styles.detailLabel}>Ubicación</Text>
                          <Text style={styles.detailValue}>{reservationSummary.locationName}</Text>
                        </View>
                      </View>
                    </>
                  ) : null}

                  <View style={styles.detailDivider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <MessageCircle size={16} color="#6B7280" />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Nombre</Text>
                      <Text style={styles.detailValue}>{reservationSummary.clientName}</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.urgentWarning}>
                <Text style={styles.urgentWarningText}>⚠️ Revisa tu WhatsApp ahora y confirma la reserva para completar el proceso.</Text>
              </View>

              <TouchableOpacity style={styles.entendidoButton} onPress={handleEntendido} activeOpacity={0.85}>
                <Text style={styles.entendidoButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {step === 'error' && (
          <View style={styles.centerContent}>
            <View style={styles.errorIconCircle}>
              <XCircle size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.errorTitle}>Ha ocurrido un problema</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                if (depositId && sessionId) {
                  setStep('verifying');
                  confirmMutation.mutate({
                    depositOrderId: depositId,
                    sessionId: sessionId,
                  });
                }
              }}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButtonSecondary}
              onPress={() => {
                if (slug && typeof window !== 'undefined') {
                  window.location.href = `/client/restaurant/${slug}`;
                } else {
                  router.replace('/');
                }
              }}
            >
              <Text style={styles.backButtonSecondaryText}>Volver al Restaurante</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  successScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  pendingCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  pendingHeader: {
    backgroundColor: '#059669',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  pendingIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  pendingTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  pendingSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  whatsappBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  whatsappBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  whatsappBold: {
    fontWeight: '700' as const,
    color: '#065F46',
  },
  detailsCard: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 12,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 44,
  },
  urgentWarning: {
    margin: 20,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  urgentWarningText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  entendidoButton: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  entendidoButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  errorIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#991B1B',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  backButtonSecondary: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
  },
  backButtonSecondaryText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});
