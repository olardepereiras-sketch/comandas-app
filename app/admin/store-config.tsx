import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Eye, EyeOff, Info, Percent, Save } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

export default function StoreConfigContent() {
  const plansQuery = trpc.subscriptionPlans.listAll.useQuery();
  const durationsQuery = trpc.subscriptionDurations.listAll.useQuery();
  const modulesQuery = trpc.modules.list.useQuery();
  const vatConfigQuery = trpc.stats.getStoreVatConfig.useQuery();
  const [vatInput, setVatInput] = useState<string>('');

  React.useEffect(() => {
    if (vatConfigQuery.data !== undefined) {
      setVatInput(String(vatConfigQuery.data.vatPercent));
    }
  }, [vatConfigQuery.data]);

  const updateVatMutation = trpc.stats.updateStoreVatConfig.useMutation({
    onSuccess: () => {
      void vatConfigQuery.refetch();
      Alert.alert('Éxito', 'Porcentaje de I.V.A. actualizado correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSaveVat = () => {
    const parsed = parseFloat(vatInput);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      Alert.alert('Error', 'Introduce un porcentaje válido entre 0 y 100');
      return;
    }
    updateVatMutation.mutate({ vatPercent: parsed });
  };

  const setPlanVisibilityMutation = trpc.subscriptionPlans.setVisibility.useMutation({
    onSuccess: () => {
      void plansQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const setDurationVisibilityMutation = trpc.subscriptionDurations.setVisibility.useMutation({
    onSuccess: () => {
      void durationsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const setPlanDurationsMutation = trpc.subscriptionPlans.setPlanDurations.useMutation({
    onSuccess: () => {
      void plansQuery.refetch();
      Alert.alert('Éxito', 'Duraciones asociadas correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const [selectedPlanForDurations, setSelectedPlanForDurations] = useState<string | null>(null);
  const [selectedDurationIds, setSelectedDurationIds] = useState<string[]>([]);

  const moduleMap = useMemo(() => {
    if (!modulesQuery.data) return {};
    const map: Record<string, { name: string; description: string }> = {};
    modulesQuery.data.forEach((module) => {
      map[module.id] = { name: module.name, description: module.description };
    });
    return map;
  }, [modulesQuery.data]);

  const togglePlanVisibility = (planId: string, currentVisibility: boolean) => {
    setPlanVisibilityMutation.mutate({ planId, visible: !currentVisibility });
  };

  const toggleDurationVisibility = (durationId: string, currentVisibility: boolean) => {
    setDurationVisibilityMutation.mutate({ durationId, visible: !currentVisibility });
  };

  const openDurationSelector = (planId: string, currentDurations: string[]) => {
    setSelectedPlanForDurations(planId);
    setSelectedDurationIds(currentDurations || []);
  };

  const savePlanDurations = () => {
    if (selectedPlanForDurations) {
      setPlanDurationsMutation.mutate({
        planId: selectedPlanForDurations,
        durationIds: selectedDurationIds,
      });
      setSelectedPlanForDurations(null);
    }
  };

  const toggleDurationSelection = (durationId: string) => {
    setSelectedDurationIds((prev) =>
      prev.includes(durationId)
        ? prev.filter((id) => id !== durationId)
        : [...prev, durationId]
    );
  };

  if (plansQuery.isLoading || durationsQuery.isLoading || modulesQuery.isLoading || vatConfigQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.vatHeader} />

        <View style={styles.vatHeaderRow}>
          <Percent size={20} color="#3b82f6" strokeWidth={2.5} />
          <Text style={styles.sectionTitle}>I.V.A. de la Tienda Virtual</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Porcentaje de I.V.A. que se aplica en el proceso de pago de https://quieromesa.com/subscribe
        </Text>
        <View style={styles.vatRow}>
          <View style={styles.vatInputBox}>
            <TextInput
              style={styles.vatInputField}
              value={vatInput}
              onChangeText={setVatInput}
              keyboardType="decimal-pad"
              placeholder="21"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.vatPercSymbol}>%</Text>
          </View>
          <TouchableOpacity
            style={[styles.vatBtn, updateVatMutation.isPending && styles.vatBtnDisabled]}
            onPress={handleSaveVat}
            disabled={updateVatMutation.isPending}
          >
            {updateVatMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={16} color="#fff" strokeWidth={2.5} />
                <Text style={styles.vatBtnText}>Guardar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        {vatConfigQuery.data && (
          <Text style={styles.vatCurrentText}>
            I.V.A. actual: {vatConfigQuery.data.vatPercent}% — Los precios en /subscribe se muestran sin I.V.A. y el total incluye el {vatConfigQuery.data.vatPercent}% de I.V.A.
          </Text>
        )}
      </View>

      <View style={styles.infoCard}>
        <Info size={24} color="#3b82f6" strokeWidth={2.5} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Configuración de la Tienda Virtual</Text>
          <Text style={styles.infoText}>
            Aquí puedes configurar qué planes y duraciones son visibles en https://quieromesa.com/subscribe
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Planes de Suscripción</Text>
        <Text style={styles.sectionDesc}>
          Selecciona los planes que quieres mostrar en la tienda virtual
        </Text>

        {plansQuery.data?.map((plan) => (
          <View key={plan.id} style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price === 0 ? 'Gratuito' : `${plan.price.toFixed(2)}€/mes`}</Text>
              </View>
              <TouchableOpacity
                style={[styles.visibilityButton, plan.isVisible && styles.visibilityButtonActive]}
                onPress={() => togglePlanVisibility(plan.id, plan.isVisible || false)}
                disabled={setPlanVisibilityMutation.isPending}
              >
                {plan.isVisible ? (
                  <Eye size={20} color="#10b981" strokeWidth={2.5} />
                ) : (
                  <EyeOff size={20} color="#94a3b8" strokeWidth={2.5} />
                )}
                <Text style={[styles.visibilityText, plan.isVisible && styles.visibilityTextActive]}>
                  {plan.isVisible ? 'Visible' : 'Oculto'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modulesContainer}>
              <Text style={styles.modulesLabel}>Módulos incluidos:</Text>
              {plan.enabledModules.map((moduleId) => (
                <View key={moduleId} style={styles.moduleChip}>
                  <Text style={styles.moduleText}>
                    {moduleMap[moduleId]?.name || moduleId}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.configureDurationsButton}
              onPress={() => openDurationSelector(plan.id, plan.allowedDurationIds || [])}
            >
              <Text style={styles.configureDurationsText}>
                Configurar duraciones ({(plan.allowedDurationIds || []).length} seleccionadas)
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Duraciones</Text>
        <Text style={styles.sectionDesc}>
          Selecciona las duraciones que quieres mostrar en la tienda virtual
        </Text>

        {durationsQuery.data?.map((duration) => (
          <View key={duration.id} style={styles.durationCard}>
            <View style={styles.durationInfo}>
              <Text style={styles.durationName}>{duration.name}</Text>
              {duration.description && (
                <Text style={styles.durationDesc}>{duration.description}</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.visibilityButton, duration.isVisible && styles.visibilityButtonActive]}
              onPress={() => toggleDurationVisibility(duration.id, duration.isVisible || false)}
              disabled={setDurationVisibilityMutation.isPending}
            >
              {duration.isVisible ? (
                <Eye size={20} color="#10b981" strokeWidth={2.5} />
              ) : (
                <EyeOff size={20} color="#94a3b8" strokeWidth={2.5} />
              )}
              <Text style={[styles.visibilityText, duration.isVisible && styles.visibilityTextActive]}>
                {duration.isVisible ? 'Visible' : 'Oculto'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {selectedPlanForDurations && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Seleccionar duraciones para {plansQuery.data?.find((p) => p.id === selectedPlanForDurations)?.name}
            </Text>
            <Text style={styles.modalDesc}>
              Estas duraciones estarán disponibles cuando el usuario seleccione este plan
            </Text>

            <View style={styles.durationsList}>
              {durationsQuery.data?.map((duration) => (
                <TouchableOpacity
                  key={duration.id}
                  style={[
                    styles.durationSelectItem,
                    selectedDurationIds.includes(duration.id) && styles.durationSelectItemActive,
                  ]}
                  onPress={() => toggleDurationSelection(duration.id)}
                >
                  <Text
                    style={[
                      styles.durationSelectText,
                      selectedDurationIds.includes(duration.id) && styles.durationSelectTextActive,
                    ]}
                  >
                    {duration.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setSelectedPlanForDurations(null)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={savePlanDurations}
                disabled={setPlanDurationsMutation.isPending}
              >
                {setPlanDurationsMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    padding: 40,
    alignItems: 'center' as const,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    gap: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    margin: 20,
    marginBottom: 10,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  planHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600' as const,
  },
  visibilityButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  visibilityButtonActive: {
    backgroundColor: '#dcfce7',
  },
  visibilityText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  visibilityTextActive: {
    color: '#10b981',
  },
  modulesContainer: {
    marginBottom: 12,
  },
  modulesLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 8,
  },
  moduleChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 6,
    alignSelf: 'flex-start' as const,
  },
  moduleText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500' as const,
  },
  configureDurationsButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  configureDurationsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  durationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  durationInfo: {
    flex: 1,
  },
  durationName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 2,
  },
  durationDesc: {
    fontSize: 13,
    color: '#64748b',
  },
  modal: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  durationsList: {
    gap: 8,
    marginBottom: 20,
  },
  durationSelectItem: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  durationSelectItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  durationSelectText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#64748b',
  },
  durationSelectTextActive: {
    color: '#3b82f6',
    fontWeight: '600' as const,
  },
  modalButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  vatHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  vatRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  vatInputBox: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  vatInputField: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#0f172a',
    paddingVertical: 12,
  },
  vatPercSymbol: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#3b82f6',
  },
  vatBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  vatBtnDisabled: {
    opacity: 0.5,
  },
  vatBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  vatCurrentText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    fontStyle: 'italic' as const,
  },
  vatHeader: {
    display: 'none' as const,
  },
});

