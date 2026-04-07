import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CheckCircle, MessageSquare, Zap, ArrowRight, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { getRestaurantId } from '@/lib/restaurantSession';

export default function WhatsappCreditsScreen() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  useEffect(() => {
    const load = async () => {
      const id = await getRestaurantId();
      if (id) setRestaurantId(id);
    };
    void load();
  }, []);

  const plansQuery = trpc.whatsappPro.listCreditPlans.useQuery();
  const adminConfigQuery = trpc.whatsappPro.getAdminConfig.useQuery();
  const creditsQuery = trpc.whatsappPro.listRestaurantCredits.useQuery(
    { restaurantId },
    { enabled: !!restaurantId }
  );

  const restaurantData = creditsQuery.data?.find(r => r.id === restaurantId);
  const currentCredits = restaurantData?.whatsappProCredits ?? 0;
  const costPerMessage = adminConfigQuery.data?.costPerMessage ?? 0.05;

  const selectedPlan = plansQuery.data?.find(p => p.id === selectedPlanId);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = () => {
    setShowConfirmModal(false);
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
    }, 3000);
  };

  const isLoading = plansQuery.isLoading || adminConfigQuery.isLoading;

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Recargar Saldo WhatsApp' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Cargando planes...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Recargar Saldo WhatsApp',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.heroCard}>
          <LinearGradient colors={['#059669', '#047857']} style={styles.heroGradient}>
            <View style={styles.heroIcon}>
              <MessageSquare size={32} color="#fff" strokeWidth={2} />
            </View>
            <Text style={styles.heroTitle}>WhatsApp de Pago</Text>
            <Text style={styles.heroSubtitle}>
              Envíos de notificaciones desde el número oficial de la plataforma
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{currentCredits}</Text>
                <Text style={styles.heroStatLabel}>Envíos disponibles</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{costPerMessage.toFixed(4)}\u20ac</Text>
                <Text style={styles.heroStatLabel}>Precio por envío</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {currentCredits < 10 && currentCredits >= 0 && (
          <View style={styles.alertBanner}>
            <Zap size={16} color="#dc2626" strokeWidth={2.5} />
            <Text style={styles.alertBannerText}>
              {currentCredits === 0
                ? 'Sin créditos disponibles. Recarga para continuar enviando mensajes.'
                : `Pocos créditos (${currentCredits}). Te recomendamos recargar pronto.`}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Elige tu plan de recarga</Text>
        <Text style={styles.sectionSubtitle}>
          Todos los precios mostrados son sin IVA. Una vez adquiridos, los créditos se añaden inmediatamente a tu cuenta.
        </Text>

        {!plansQuery.data || plansQuery.data.length === 0 ? (
          <View style={styles.emptyPlans}>
            <Text style={styles.emptyPlansText}>No hay planes disponibles en este momento.</Text>
            <Text style={styles.emptyPlansSubtext}>Contacta con soporte para recargar créditos.</Text>
          </View>
        ) : (
          plansQuery.data.map((plan, index) => {
            const pricePerSend = plan.sendsCount > 0 ? plan.priceWithoutVat / plan.sendsCount : 0;
            const isPopular = index === Math.floor(plansQuery.data!.length / 2);
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, isPopular && styles.planCardPopular]}
                onPress={() => handleSelectPlan(plan.id)}
                activeOpacity={0.85}
              >
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Más popular</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planName, isPopular && styles.planNamePopular]}>{plan.name}</Text>
                    <Text style={styles.planSends}>{plan.sendsCount.toLocaleString()} envíos incluidos</Text>
                  </View>
                  <View style={styles.planPriceBlock}>
                    <Text style={[styles.planPrice, isPopular && styles.planPricePopular]}>
                      {plan.priceWithoutVat.toFixed(2)}\u20ac
                    </Text>
                    <Text style={styles.planPriceLabel}>sin IVA</Text>
                  </View>
                </View>
                <View style={styles.planFooter}>
                  <View style={styles.planPricePerSend}>
                    <Text style={styles.planPricePerSendText}>
                      {pricePerSend.toFixed(4)}€ / envío
                    </Text>
                  </View>
                  <View style={[styles.planCta, isPopular && styles.planCtaPopular]}>
                    <Text style={[styles.planCtaText, isPopular && styles.planCtaTextPopular]}>Seleccionar</Text>
                    <ArrowRight size={14} color={isPopular ? '#fff' : '#059669'} strokeWidth={2.5} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.infoBox}>
          <CheckCircle size={16} color="#059669" strokeWidth={2.5} />
          <Text style={styles.infoBoxText}>
            Los créditos no caducan. Puedes usarlos en cualquier momento para enviar notificaciones a tus clientes.
          </Text>
        </View>

        <View style={styles.infoBox}>
          <MessageSquare size={16} color="#059669" strokeWidth={2.5} />
          <Text style={styles.infoBoxText}>
            Los mensajes se envían desde un número oficial registrado en WhatsApp Business, con mayor tasa de entrega.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Volver a Configuración</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={showConfirmModal} transparent animationType="slide" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar Compra</Text>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)} activeOpacity={0.7}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            {selectedPlan && (
              <>
                <View style={styles.modalPlanPreview}>
                  <Text style={styles.modalPlanName}>{selectedPlan.name}</Text>
                  <Text style={styles.modalPlanSends}>{selectedPlan.sendsCount.toLocaleString()} envíos</Text>
                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalPriceLabel}>Precio sin IVA</Text>
                    <Text style={styles.modalPriceValue}>{selectedPlan.priceWithoutVat.toFixed(2)}€</Text>
                  </View>
                </View>
                <Text style={styles.modalNote}>
                  Al confirmar, un administrador procesará tu solicitud y añadirá los créditos a tu cuenta. Recibirás una confirmación.
                </Text>
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmPurchase} activeOpacity={0.85}>
                  <Text style={styles.confirmButtonText}>Solicitar Recarga</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowConfirmModal(false)} activeOpacity={0.7}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <CheckCircle size={56} color="#059669" strokeWidth={1.5} />
            <Text style={styles.successTitle}>¡Solicitud enviada!</Text>
            <Text style={styles.successText}>
              Tu solicitud de recarga ha sido enviada. Un administrador la procesará en breve.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: '#f8fafc' },
  loadingText: { fontSize: 15, color: '#64748b' },
  heroCard: {
    margin: 20,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroGradient: { padding: 24, alignItems: 'center' },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroTitle: { fontSize: 22, fontWeight: '800' as const, color: '#fff', marginBottom: 6 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  heroStat: { alignItems: 'center' },
  heroStatValue: { fontSize: 28, fontWeight: '800' as const, color: '#fff' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '500' as const },
  heroStatDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  alertBanner: {
    marginHorizontal: 20, marginBottom: 16, backgroundColor: '#fef2f2',
    borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#fecaca',
  },
  alertBannerText: { flex: 1, fontSize: 13, color: '#dc2626', fontWeight: '500' as const, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: '#0f172a', marginHorizontal: 20, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#64748b', marginHorizontal: 20, marginBottom: 16, lineHeight: 18 },
  emptyPlans: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyPlansText: { fontSize: 16, fontWeight: '600' as const, color: '#0f172a', marginBottom: 6 },
  emptyPlansSubtext: { fontSize: 13, color: '#64748b' },
  planCard: {
    marginHorizontal: 20, marginBottom: 12, backgroundColor: '#fff',
    borderRadius: 16, padding: 18, borderWidth: 2, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  planCardPopular: { borderColor: '#059669', shadowColor: '#059669', shadowOpacity: 0.15, elevation: 4 },
  popularBadge: {
    alignSelf: 'flex-start', backgroundColor: '#dcfce7',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10,
  },
  popularBadgeText: { fontSize: 11, fontWeight: '700' as const, color: '#059669' },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  planInfo: { flex: 1 },
  planName: { fontSize: 17, fontWeight: '700' as const, color: '#0f172a', marginBottom: 4 },
  planNamePopular: { color: '#059669' },
  planSends: { fontSize: 13, color: '#64748b' },
  planPriceBlock: { alignItems: 'flex-end' },
  planPrice: { fontSize: 26, fontWeight: '800' as const, color: '#0f172a' },
  planPricePopular: { color: '#059669' },
  planPriceLabel: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  planFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planPricePerSend: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  planPricePerSendText: { fontSize: 12, color: '#475569', fontWeight: '500' as const },
  planCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: '#059669', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  planCtaPopular: { backgroundColor: '#059669', borderColor: '#059669' },
  planCtaText: { fontSize: 13, fontWeight: '700' as const, color: '#059669' },
  planCtaTextPopular: { color: '#fff' },
  infoBox: {
    marginHorizontal: 20, marginBottom: 10, flexDirection: 'row', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'flex-start',
  },
  infoBoxText: { flex: 1, fontSize: 13, color: '#065f46', lineHeight: 18 },
  backButton: {
    marginHorizontal: 20, marginTop: 10, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center',
  },
  backButtonText: { fontSize: 15, fontWeight: '600' as const, color: '#64748b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
    paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' as const, color: '#0f172a' },
  modalPlanPreview: {
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  modalPlanName: { fontSize: 18, fontWeight: '700' as const, color: '#059669', marginBottom: 4 },
  modalPlanSends: { fontSize: 14, color: '#064e3b', marginBottom: 14 },
  modalPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalPriceLabel: { fontSize: 14, color: '#064e3b' },
  modalPriceValue: { fontSize: 22, fontWeight: '800' as const, color: '#059669' },
  modalNote: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 20 },
  confirmButton: {
    backgroundColor: '#059669', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 10,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  confirmButtonText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },
  cancelButton: {
    backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600' as const, color: '#64748b' },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  successContent: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center',
    width: '100%',
  },
  successTitle: { fontSize: 22, fontWeight: '800' as const, color: '#059669', marginTop: 16, marginBottom: 8 },
  successText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
});
