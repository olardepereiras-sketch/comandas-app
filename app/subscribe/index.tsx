import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Mail, Phone, Building, MapPin, Lock, User, Globe, Image as ImageIcon, Info } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import type { CuisineType } from '@/types';

const CUISINE_TYPES: { value: CuisineType; label: string }[] = [
  { value: 'pizzeria', label: 'Pizzería' },
  { value: 'marisqueria', label: 'Marisquería' },
  { value: 'asador', label: 'Asador' },
  { value: 'japonesa', label: 'Japonesa' },
  { value: 'italiana', label: 'Italiana' },
  { value: 'mediterranea', label: 'Mediterránea' },
  { value: 'fusion', label: 'Fusión' },
  { value: 'vegetariana', label: 'Vegetariana' },
  { value: 'sin-gluten', label: 'Sin gluten' },
  { value: 'tapas', label: 'Tapas' },
  { value: 'other', label: 'Otros' },
];

export default function SubscribeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedDurationId, setSelectedDurationId] = useState<string | undefined>();
  const [step, setStep] = useState<number>(1);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    cityId: '',
    provinceId: '',
    cuisineType: [] as string[],
    profileImageUrl: '',
    googleMapsUrl: '',
  });

  const plansQuery = trpc.subscriptionPlans.list.useQuery();
  const durationsQuery = trpc.subscriptionDurations.list.useQuery();
  const modulesQuery = trpc.modules.list.useQuery();
  const provincesQuery = trpc.locations.provinces.useQuery();
  const citiesQuery = trpc.locations.cities.useQuery();
  const vatConfigQuery = trpc.stats.getStoreVatConfig.useQuery();

  const createCheckout = trpc.subscriptions.createCheckoutSession.useMutation();

  const vatPercent = vatConfigQuery.data?.vatPercent ?? 21;

  const filteredCities = useMemo(() => {
    if (!formData.provinceId || !citiesQuery.data) return [];
    return citiesQuery.data.filter((c) => c.provinceId === formData.provinceId);
  }, [formData.provinceId, citiesQuery.data]);

  const selectedPlans = useMemo(() => {
    if (!selectedPlanId || !plansQuery.data) return [];
    return plansQuery.data.filter((p) => p.id === selectedPlanId);
  }, [selectedPlanId, plansQuery.data]);

  const selectedDuration = useMemo(() => {
    if (!selectedDurationId || !durationsQuery.data) return undefined;
    return durationsQuery.data.find((d) => d.id === selectedDurationId);
  }, [selectedDurationId, durationsQuery.data]);

  const baseAmount = useMemo(() => {
    if (!selectedPlans.length || !selectedDuration) return 0;
    return selectedPlans.reduce((sum, p) => sum + p.price, 0) * selectedDuration.months;
  }, [selectedPlans, selectedDuration]);

  const vatAmount = useMemo(() => {
    return baseAmount * (vatPercent / 100);
  }, [baseAmount, vatPercent]);

  const totalAmount = useMemo(() => {
    return baseAmount + vatAmount;
  }, [baseAmount, vatAmount]);

  const moduleMap = useMemo(() => {
    if (!modulesQuery.data) return {};
    const map: Record<string, { name: string; description: string }> = {};
    modulesQuery.data.forEach((module) => {
      map[module.id] = { name: module.name, description: module.description };
    });
    return map;
  }, [modulesQuery.data]);

  const filteredDurationsForPlans = useMemo(() => {
    const plan = selectedPlans[0];
    if (!plan || !durationsQuery.data) return durationsQuery.data ?? [];
    if (!plan.allowedDurationIds || plan.allowedDurationIds.length === 0) return durationsQuery.data;
    return durationsQuery.data.filter((d) => plan.allowedDurationIds!.includes(d.id));
  }, [selectedPlans, durationsQuery.data]);

  const selectPlan = (planId: string) => {
    setSelectedPlanId((prev) => (prev === planId ? null : planId));
    setSelectedDurationId(undefined);
  };

  const toggleCuisine = (cuisine: string) => {
    setFormData((prev) => ({
      ...prev,
      cuisineType: prev.cuisineType.includes(cuisine)
        ? prev.cuisineType.filter((c) => c !== cuisine)
        : [...prev.cuisineType, cuisine],
    }));
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!selectedPlanId) {
        Alert.alert('Error', 'Por favor selecciona un plan de suscripción');
        return;
      }
      if (!selectedDurationId) {
        Alert.alert('Error', 'Por favor selecciona la duración de la suscripción');
        return;
      }

      const allFree = selectedPlans.every((p) => p.price === 0);
      if (allFree) {
        void handleCheckout();
        return;
      }

      setStep(2);
    } else if (step === 2) {
      if (!formData.name.trim()) {
        Alert.alert('Error', 'El nombre del restaurante es obligatorio');
        return;
      }
      if (!formData.description.trim()) {
        Alert.alert('Error', 'La descripción es obligatoria');
        return;
      }
      if (!formData.username.trim()) {
        Alert.alert('Error', 'El usuario es obligatorio');
        return;
      }
      if (!formData.password.trim() || formData.password.length < 6) {
        Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        Alert.alert('Error', 'El email no es válido');
        return;
      }
      if (!formData.phone.trim()) {
        Alert.alert('Error', 'El teléfono es obligatorio');
        return;
      }
      if (!formData.address.trim()) {
        Alert.alert('Error', 'La dirección es obligatoria');
        return;
      }
      if (!formData.provinceId) {
        Alert.alert('Error', 'Por favor selecciona una provincia');
        return;
      }
      if (!formData.cityId) {
        Alert.alert('Error', 'Por favor selecciona una ciudad');
        return;
      }
      if (formData.cuisineType.length === 0) {
        Alert.alert('Error', 'Por favor selecciona al menos un tipo de cocina');
        return;
      }

      void handleCheckout();
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlanId || !selectedDurationId) return;

    const primaryPlanId = selectedPlanId;

    try {
      const result = await createCheckout.mutateAsync({
        subscriptionPlanId: primaryPlanId,
        subscriptionDurationId: selectedDurationId,
        restaurantData: formData,
      });

      if ('restaurantId' in result && result.restaurantId) {
        Alert.alert(
          'Éxito',
          'Tu restaurante ha sido creado correctamente. Ahora puedes iniciar sesión.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/restaurant/login' as any),
            },
          ]
        );
        return;
      }

      if (result.url) {
        router.push(`/subscribe/checkout?url=${encodeURIComponent(result.url)}&orderId=${result.orderId}`);
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      Alert.alert('Error', error.message || 'Error al procesar el pago');
    }
  };

  const isLoading = plansQuery.isLoading || durationsQuery.isLoading;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Suscríbete a Quieromesa',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#FF1493',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 1 ? 'Elige tu plan' : 'Datos del restaurante'}
            </Text>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
              <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
            </View>
          </View>

          {step === 1 && (
            <>
              <Text style={styles.sectionTitle}>Planes de suscripción</Text>

              {plansQuery.data?.map((plan) => (
                <Pressable
                  key={plan.id}
                  style={[
                    styles.planCard,
                    selectedPlanId === plan.id && styles.planCardSelected,
                  ]}
                  onPress={() => selectPlan(plan.id)}
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>{plan.price.toFixed(2)}€/mes</Text>
                  </View>
                  <View style={styles.modulesContainer}>
                    {plan.enabledModules.map((moduleId) => (
                      <View key={moduleId} style={styles.moduleRow}>
                        <View style={styles.moduleChip}>
                          <Check size={14} color="#10B981" />
                          <Text style={styles.moduleText}>
                            {moduleMap[moduleId]?.name || moduleId}
                          </Text>
                        </View>
                        {moduleMap[moduleId]?.description && (
                          <Pressable
                            style={styles.infoButton}
                            onPress={() => setExpandedModule(expandedModule === moduleId ? null : moduleId)}
                          >
                            <Info size={16} color="#64748b" />
                          </Pressable>
                        )}
                        {expandedModule === moduleId && moduleMap[moduleId]?.description && (
                          <View style={styles.moduleDescription}>
                            <Text style={styles.moduleDescriptionText}>
                              {moduleMap[moduleId].description}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                  {selectedPlanId === plan.id && (
                    <View style={styles.selectedBadge}>
                      <Check size={18} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              ))}

              <View style={styles.vatNoteContainer}>
                <Text style={styles.vatNote}>* I.V.A. no incluido</Text>
              </View>

              <Text style={[styles.sectionTitle, styles.marginTop]}>Duración</Text>
              <View style={styles.durationsGrid}>
                {filteredDurationsForPlans.map((duration) => (
                  <Pressable
                    key={duration.id}
                    style={[
                      styles.durationCard,
                      selectedDurationId === duration.id && styles.durationCardSelected,
                    ]}
                    onPress={() => setSelectedDurationId(duration.id)}
                  >
                    <Text style={styles.durationName}>{duration.name}</Text>
                    {duration.description && (
                      <Text style={styles.durationDesc}>{duration.description}</Text>
                    )}
                  </Pressable>
                ))}
              </View>

              {selectedPlans.length > 0 && selectedDuration && (
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>Resumen del pedido</Text>

                  {selectedPlans.map((plan) => (
                    <View key={plan.id} style={styles.totalPlanRow}>
                      <Text style={styles.totalPlanName}>{plan.name}</Text>
                      <Text style={styles.totalPlanAmount}>
                        {(plan.price * selectedDuration.months).toFixed(2)}€
                      </Text>
                    </View>
                  ))}

                  <View style={styles.totalBreakdownRow}>
                    <Text style={styles.totalBreakdownLabel}>Base imponible</Text>
                    <Text style={styles.totalBreakdownValue}>{baseAmount.toFixed(2)}€</Text>
                  </View>
                  <View style={styles.totalBreakdownRow}>
                    <Text style={styles.totalBreakdownLabel}>I.V.A. ({vatPercent}%)</Text>
                    <Text style={styles.totalBreakdownValue}>{vatAmount.toFixed(2)}€</Text>
                  </View>

                  <View style={styles.totalFinalRow}>
                    <Text style={styles.totalFinalLabel}>Total a pagar</Text>
                    <Text style={styles.totalFinalAmount}>{totalAmount.toFixed(2)}€</Text>
                  </View>

                  <Text style={styles.totalMonthlyDesc}>
                    {selectedPlans[0]?.price.toFixed(2)}€/mes × {selectedDuration.months} meses
                  </Text>
                  <Text style={styles.vatIncludedNote}>I.V.A. no incluido en precio base</Text>
                </View>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre del restaurante *</Text>
                <View style={styles.inputContainer}>
                  <Building size={20} color="#999" />
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                    placeholder="Ej: Restaurante El Quijote"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descripción *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                  placeholder="Describe tu restaurante..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Usuario de acceso *</Text>
                <View style={styles.inputContainer}>
                  <User size={20} color="#999" />
                  <TextInput
                    style={styles.input}
                    value={formData.username}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, username: text }))}
                    placeholder="usuario"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contraseña *</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color="#999" />
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, password: text }))}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#999"
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#999" />
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teléfono *</Text>
                <View style={styles.inputContainer}>
                  <Phone size={20} color="#999" />
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
                    placeholder="615 91 44 34"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dirección *</Text>
                <View style={styles.inputContainer}>
                  <MapPin size={20} color="#999" />
                  <TextInput
                    style={styles.input}
                    value={formData.address}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, address: text }))}
                    placeholder="Calle Principal 123"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Código Postal</Text>
                <TextInput
                  style={[styles.input, styles.inputAlone]}
                  value={formData.postalCode}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, postalCode: text }))}
                  placeholder="28001"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Provincia *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {provincesQuery.data?.map((province) => (
                    <Pressable
                      key={province.id}
                      style={[
                        styles.chip,
                        formData.provinceId === province.id && styles.chipSelected,
                      ]}
                      onPress={() => {
                        setFormData((prev) => ({ ...prev, provinceId: province.id, cityId: '' }));
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.provinceId === province.id && styles.chipTextSelected,
                        ]}
                      >
                        {province.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {formData.provinceId && filteredCities.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ciudad *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {filteredCities.map((city) => (
                      <Pressable
                        key={city.id}
                        style={[
                          styles.chip,
                          formData.cityId === city.id && styles.chipSelected,
                        ]}
                        onPress={() => {
                          setFormData((prev) => ({ ...prev, cityId: city.id }));
                        }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            formData.cityId === city.id && styles.chipTextSelected,
                          ]}
                        >
                          {city.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de cocina *</Text>
                <View style={styles.cuisineGrid}>
                  {CUISINE_TYPES.map((cuisine) => (
                    <Pressable
                      key={cuisine.value}
                      style={[
                        styles.cuisineChip,
                        formData.cuisineType.includes(cuisine.value) && styles.cuisineChipSelected,
                      ]}
                      onPress={() => toggleCuisine(cuisine.value)}
                    >
                      <Text
                        style={[
                          styles.cuisineChipText,
                          formData.cuisineType.includes(cuisine.value) && styles.cuisineChipTextSelected,
                        ]}
                      >
                        {cuisine.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>URL de imagen del perfil</Text>
                <View style={styles.inputContainer}>
                  <ImageIcon size={20} color="#999" />
                  <TextInput
                    style={styles.input}
                    value={formData.profileImageUrl}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, profileImageUrl: text }))}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>URL de Google Maps</Text>
                <View style={styles.inputContainer}>
                  <Globe size={20} color="#999" />
                  <TextInput
                    style={styles.input}
                    value={formData.googleMapsUrl}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, googleMapsUrl: text }))}
                    placeholder="https://maps.google.com/..."
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {selectedPlans.length > 0 && selectedDuration && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Resumen del pedido</Text>

                  {selectedPlans.map((plan) => (
                    <View key={plan.id} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{plan.name}:</Text>
                      <Text style={styles.summaryValue}>
                        {(plan.price * selectedDuration.months).toFixed(2)}€
                      </Text>
                    </View>
                  ))}

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Duración:</Text>
                    <Text style={styles.summaryValue}>{selectedDuration.name}</Text>
                  </View>

                  <View style={[styles.summaryRow, styles.summaryDivider]}>
                    <Text style={styles.summaryLabel}>Base imponible:</Text>
                    <Text style={styles.summaryValue}>{baseAmount.toFixed(2)}€</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>I.V.A. ({vatPercent}%):</Text>
                    <Text style={styles.summaryValue}>{vatAmount.toFixed(2)}€</Text>
                  </View>

                  <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                    <Text style={styles.summaryLabelTotal}>Total:</Text>
                    <Text style={styles.summaryValueTotal}>{totalAmount.toFixed(2)}€</Text>
                  </View>
                  <Text style={styles.summaryVatNote}>I.V.A. no incluido en precio base</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          {step === 2 && (
            <Pressable
              style={styles.backButton}
              onPress={() => setStep(1)}
            >
              <Text style={styles.backButtonText}>Volver</Text>
            </Pressable>
          )}
          <View style={styles.footerContent}>
            {selectedPlans.length > 0 && selectedDuration && (
              <View style={styles.footerTotal}>
                <Text style={styles.footerTotalBase}>{baseAmount.toFixed(2)}€ + I.V.A. ({vatPercent}%) = </Text>
                <Text style={styles.footerTotalAmount}>{totalAmount.toFixed(2)}€</Text>
              </View>
            )}
            <Pressable
              style={[styles.continueButton, createCheckout.isPending && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={createCheckout.isPending}
            >
              {createCheckout.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.continueButtonText}>
                  {step === 1 ? 'Continuar' : 'Proceder al pago'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  stepIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  stepDotActive: {
    backgroundColor: '#FF1493',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#FF1493',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 8,
  },
  multiSelectHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    fontStyle: 'italic' as const,
  },
  marginTop: {
    marginTop: 30,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative' as const,
  },
  planCardSelected: {
    borderColor: '#FF1493',
    backgroundColor: '#FFF5FA',
  },
  planHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FF1493',
  },
  modulesContainer: {
    gap: 8,
  },
  moduleRow: {
    position: 'relative' as const,
  },
  moduleChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    alignSelf: 'flex-start' as const,
  },
  moduleText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500' as const,
  },
  infoButton: {
    position: 'absolute' as const,
    right: 0,
    top: 4,
    padding: 4,
  },
  moduleDescription: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  moduleDescriptionText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  selectedBadge: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    backgroundColor: '#FF1493',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  vatNoteContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  vatNote: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic' as const,
  },
  durationsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  durationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 100,
  },
  durationCardSelected: {
    borderColor: '#FF1493',
    backgroundColor: '#FFF5FA',
  },
  durationName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  durationDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  totalCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 24,
    marginTop: 24,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  totalPlanRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  totalPlanName: {
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500' as const,
    flex: 1,
  },
  totalPlanAmount: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  totalSeparator: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  totalBreakdownRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  totalBreakdownLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  totalBreakdownValue: {
    fontSize: 13,
    color: '#D1D5DB',
    fontWeight: '500' as const,
  },
  totalFinalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    marginTop: 10,
    paddingTop: 14,
    marginBottom: 8,
  },
  totalFinalLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  totalFinalAmount: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#FF1493',
  },
  totalMonthlyDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center' as const,
    marginTop: 4,
  },
  vatIncludedNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center' as const,
    marginTop: 6,
    fontStyle: 'italic' as const,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 14,
  },
  inputAlone: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top' as const,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  chipScroll: {
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#FF1493',
    borderColor: '#FF1493',
  },
  chipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  cuisineGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 8,
  },
  cuisineChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cuisineChipSelected: {
    backgroundColor: '#FF1493',
    borderColor: '#FF1493',
  },
  cuisineChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  cuisineChipTextSelected: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 6,
  },
  summaryDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    paddingTop: 12,
  },
  summaryRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500' as const,
  },
  summaryLabelTotal: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600' as const,
  },
  summaryValueTotal: {
    fontSize: 24,
    color: '#FF1493',
    fontWeight: '700' as const,
  },
  summaryVatNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footerContent: {
    gap: 8,
  },
  footerTotal: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexWrap: 'wrap' as const,
    paddingVertical: 4,
  },
  footerTotalBase: {
    fontSize: 13,
    color: '#6B7280',
  },
  footerTotalAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FF1493',
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  continueButton: {
    backgroundColor: '#FF1493',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
