import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, Switch, ActivityIndicator, Modal, Animated, Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Save, Calendar, DollarSign, CreditCard, Info, Plus, Trash2, Baby,
  ToggleLeft, Settings, List, Search, RotateCcw, ChevronLeft,
  ChevronRight, Phone, Clock, CheckCircle, XCircle, Percent,
  ShieldCheck, AlertTriangle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { getRestaurantId } from '@/lib/restaurantSession';
import { Calendar as RNCalendar } from 'react-native-calendars';

interface SpecificDayDeposit {
  date: string;
  amount: number;
  customMessage?: string;
}

interface DepositOperation {
  id: string;
  clientName: string;
  clientPhone: string;
  reservationDate: string;
  guests: number;
  chargeableGuests: number;
  depositPerPerson: number;
  totalAmount: number;
  managementFeePercent: number;
  managementFeeAmount: number;
  status: string;
  stripePaymentIntentId: string;
  reservationId: string;
  reservationShortId: string;
  refundedAt: string | null;
  refundId: string | null;
  createdAt: string;
}

type ActiveTab = 'config' | 'operations';

export default function DepositsScreen() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('config');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const tabAnim = useRef(new Animated.Value(0)).current;

  // Config state
  const [depositsEnabled, setDepositsEnabled] = useState<boolean>(false);
  const [depositsApplyToAllDays, setDepositsApplyToAllDays] = useState<boolean>(true);
  const [defaultAmount, setDefaultAmount] = useState<string>('10');
  const [stripeAccountId, setStripeAccountId] = useState<string>('');
  const [stripeSecretKey, setStripeSecretKey] = useState<string>('');
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [specificDays, setSpecificDays] = useState<SpecificDayDeposit[]>([]);
  const [includeHighChairs, setIncludeHighChairs] = useState<boolean>(true);
  const [isManualUpdate, setIsManualUpdate] = useState<boolean>(false);

  // Management fee state
  const [managementFeeEnabled, setManagementFeeEnabled] = useState<boolean>(false);
  const [managementFeePercent, setManagementFeePercent] = useState<string>('2');

  // Cancellation policy state
  const [cancellationHours, setCancellationHours] = useState<string>('24');
  const [autoRefund, setAutoRefund] = useState<boolean>(false);
  const [cancellationPolicy, setCancellationPolicy] = useState<string>('');

  // Calendar state
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [selectedDateForAmount, setSelectedDateForAmount] = useState<string>('');
  const [tempAmount, setTempAmount] = useState<string>('');
  const [tempMessage, setTempMessage] = useState<string>('');

  // Operations state
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterPhone, setFilterPhone] = useState<string>('');
  const [opsPage, setOpsPage] = useState<number>(1);
  const [activeFilters, setActiveFilters] = useState<{ dateFrom: string; dateTo: string; phone: string }>({ dateFrom: '', dateTo: '', phone: '' });
  const [expandedOp, setExpandedOp] = useState<string | null>(null);

  useEffect(() => {
    const loadRestaurantId = async () => {
      const id = await getRestaurantId();
      if (id) setRestaurantId(id);
    };
    void loadRestaurantId();
  }, []);

  const configQuery = trpc.deposits.getConfig.useQuery(
    { restaurantId },
    { enabled: !!restaurantId }
  );

  const operationsQuery = trpc.deposits.listOperations.useQuery(
    {
      restaurantId,
      dateFrom: activeFilters.dateFrom || undefined,
      dateTo: activeFilters.dateTo || undefined,
      phone: activeFilters.phone || undefined,
      page: opsPage,
      limit: 15,
    },
    { enabled: !!restaurantId && activeTab === 'operations' }
  );

  const updateMutation = trpc.deposits.updateConfig.useMutation({
    onSuccess: () => {
      void configQuery.refetch();
      setTimeout(() => setIsManualUpdate(false), 300);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.replace('/restaurant/dashboard' as any);
      }, 1500);
    },
    onError: (error: any) => {
      setIsManualUpdate(false);
      Alert.alert('Error', error.message || 'No se pudo guardar la configuración');
    },
  });

  const refundMutation = trpc.deposits.refundOperation.useMutation({
    onSuccess: () => {
      void operationsQuery.refetch();
      Alert.alert('✅ Devolución procesada', 'El importe ha sido devuelto al cliente correctamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'No se pudo procesar la devolución');
    },
  });

  useEffect(() => {
    if (configQuery.data && !updateMutation.isPending && !isManualUpdate) {
      const d = configQuery.data;
      setDepositsEnabled(d.depositsEnabled);
      setDepositsApplyToAllDays(d.depositsApplyToAllDays !== false);
      setDefaultAmount(String(d.depositsDefaultAmount));
      setStripeAccountId(d.depositsStripeAccountId);
      setStripePublishableKey(d.depositsStripePublishableKey);
      setCustomMessage(d.depositsCustomMessage);
      setIncludeHighChairs(d.depositsIncludeHighChairs !== false);
      setSpecificDays(d.depositsSpecificDays || []);
      setManagementFeeEnabled(d.depositsManagementFeeEnabled || false);
      setManagementFeePercent(String(d.depositsManagementFeePercent || 2));
      setCancellationHours(String(d.depositsCancellationHours || 24));
      setAutoRefund(d.depositsAutoRefund || false);
      setCancellationPolicy(d.depositsCancellationPolicy || '');
    }
  }, [configQuery.data, updateMutation.isPending, isManualUpdate]);

  const switchTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === 'config' ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 10,
    }).start();
  }, [tabAnim]);

  const handleSave = async () => {
    if (!restaurantId) {
      Alert.alert('Error', 'No se pudo identificar el restaurante');
      return;
    }
    if (depositsEnabled && !stripePublishableKey.trim()) {
      Alert.alert('Error', 'Debes configurar la clave pública de Stripe');
      return;
    }
    const amount = parseFloat(defaultAmount);
    if (depositsEnabled && (isNaN(amount) || amount < 0)) {
      Alert.alert('Error', 'La cantidad de fianza debe ser un número válido');
      return;
    }
    const feePercent = parseFloat(managementFeePercent);
    if (managementFeeEnabled && (isNaN(feePercent) || feePercent < 0 || feePercent > 100)) {
      Alert.alert('Error', 'El porcentaje de gastos de gestión debe ser entre 0 y 100');
      return;
    }
    const cancelHours = parseInt(cancellationHours);
    if (isNaN(cancelHours) || cancelHours < 0) {
      Alert.alert('Error', 'Las horas de cancelación deben ser un número válido');
      return;
    }

    setIsManualUpdate(true);
    try {
      await updateMutation.mutateAsync({
        restaurantId,
        depositsEnabled,
        depositsApplyToAllDays,
        depositsDefaultAmount: parseFloat(defaultAmount) || 0,
        depositsStripeAccountId: stripeAccountId.trim() || undefined,
        depositsStripeSecretKey: stripeSecretKey.trim() || undefined,
        depositsStripePublishableKey: stripePublishableKey.trim() || undefined,
        depositsCustomMessage: customMessage.trim() || undefined,
        depositsIncludeHighChairs: includeHighChairs,
        depositsSpecificDays: specificDays,
        depositsManagementFeeEnabled: managementFeeEnabled,
        depositsManagementFeePercent: parseFloat(managementFeePercent) || 0,
        depositsCancellationHours: parseInt(cancellationHours) || 0,
        depositsAutoRefund: autoRefund,
        depositsCancellationPolicy: cancellationPolicy.trim() || undefined,
      });
    } catch {
      setIsManualUpdate(false);
    }
  };

  const handleDateSelect = (date: string) => {
    const existing = specificDays.find(d => d.date === date);
    setSelectedDateForAmount(date);
    setTempAmount(existing ? String(existing.amount) : defaultAmount);
    setTempMessage(existing?.customMessage || customMessage);
  };

  const handleConfirmAmount = () => {
    if (!selectedDateForAmount) return;
    const amount = parseFloat(tempAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'La cantidad debe ser un número válido');
      return;
    }
    const dayConfig: SpecificDayDeposit = {
      date: selectedDateForAmount,
      amount,
      customMessage: tempMessage.trim() || undefined,
    };
    const existingIndex = specificDays.findIndex(d => d.date === selectedDateForAmount);
    if (existingIndex >= 0) {
      const updated = [...specificDays];
      updated[existingIndex] = dayConfig;
      setSpecificDays(updated);
    } else {
      setSpecificDays([...specificDays, dayConfig]);
    }
    setSelectedDateForAmount('');
    setTempAmount('');
    setTempMessage('');
    setShowCalendar(false);
  };

  const handleRefund = (op: DepositOperation) => {
    const baseAmount = op.depositPerPerson * op.chargeableGuests;
    const hasFee = op.managementFeeAmount > 0;
    const feeNote = hasFee
      ? `\n\n⚠️ Los gastos de gestión (${op.managementFeeAmount.toFixed(2)}€) no se devuelven según la política del servicio.`
      : '';
    if (Platform.OS === 'web') {
      const confirmed = (window as any).confirm(
        `¿Devolver ${baseAmount.toFixed(2)}€ a ${op.clientName}?${feeNote}\n\nEsta acción no se puede deshacer.`
      );
      if (confirmed) {
        refundMutation.mutate({ depositOrderId: op.id, restaurantId });
      }
    } else {
      Alert.alert(
        'Confirmar Devolución',
        `¿Devolver ${baseAmount.toFixed(2)}€ a ${op.clientName}?${feeNote}\n\nEsta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Devolver',
            style: 'destructive',
            onPress: () => refundMutation.mutate({ depositOrderId: op.id, restaurantId }),
          },
        ]
      );
    }
  };

  const handleApplyFilters = () => {
    setOpsPage(1);
    setActiveFilters({ dateFrom: filterDateFrom, dateTo: filterDateTo, phone: filterPhone });
  };

  const handleClearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterPhone('');
    setOpsPage(1);
    setActiveFilters({ dateFrom: '', dateTo: '', phone: '' });
  };

  const markedDates: any = {};
  specificDays.forEach(day => {
    markedDates[day.date] = { selected: true, selectedColor: '#7c3aed', marked: true, dotColor: '#fff' };
  });

  const baseDepositAmount = parseFloat(defaultAmount) || 0;
  const feePercent = parseFloat(managementFeePercent) || 0;
  const exampleGuests = 2;
  const exampleBase = baseDepositAmount * exampleGuests;
  const exampleFee = managementFeeEnabled ? Math.round(exampleBase * (feePercent / 100) * 100) / 100 : 0;
  const exampleTotal = exampleBase + exampleFee;

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  if (configQuery.isLoading || !restaurantId) {
    return (
      <>
        <Stack.Screen options={{ title: 'Fianzas', headerStyle: { backgroundColor: '#7c3aed' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' as const } }} />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Fianzas', headerStyle: { backgroundColor: '#7c3aed' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' as const } }} />
      <View style={styles.container}>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <View style={styles.tabBarInner}>
            <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
            <TouchableOpacity style={styles.tab} onPress={() => switchTab('config')} activeOpacity={0.8}>
              <Settings size={16} color={activeTab === 'config' ? '#fff' : '#9ca3af'} strokeWidth={2.5} />
              <Text style={[styles.tabText, activeTab === 'config' && styles.tabTextActive]}>Configuración</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => switchTab('operations')} activeOpacity={0.8}>
              <List size={16} color={activeTab === 'operations' ? '#fff' : '#9ca3af'} strokeWidth={2.5} />
              <Text style={[styles.tabText, activeTab === 'operations' && styles.tabTextActive]}>Operaciones</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.pageHeader}>
              <LinearGradient colors={['#7c3aed', '#5b21b6']} style={styles.headerGradient}>
                <DollarSign size={28} color="#fff" strokeWidth={2.5} />
                <Text style={styles.headerTitle}>Sistema de Fianzas</Text>
                <Text style={styles.headerSubtitle}>Cobra depósitos con Stripe para confirmar reservas</Text>
              </LinearGradient>
            </View>

            {/* ACTIVAR */}
            <View style={styles.section}>
              <SectionHeader icon={<Info size={18} color="#7c3aed" strokeWidth={2.5} />} title="Activar Servicio" />
              <SwitchRow
                title="Habilitar Fianzas"
                description="Los clientes pagarán una fianza para confirmar su reserva"
                value={depositsEnabled}
                onValueChange={setDepositsEnabled}
              />
            </View>

            {depositsEnabled && (
              <>
                {/* STRIPE */}
                <View style={styles.section}>
                  <SectionHeader icon={<CreditCard size={18} color="#7c3aed" strokeWidth={2.5} />} title="Credenciales Stripe" />
                  <Text style={styles.sectionSubtitle}>Configura tus claves de Stripe para procesar pagos</Text>
                  <FormField label="ID de Cuenta Stripe (Opcional)" value={stripeAccountId} onChangeText={setStripeAccountId} placeholder="acct_xxxxxxxxxxxxx" />
                  <FormField label="Clave Secreta (Secret Key) *" value={stripeSecretKey} onChangeText={setStripeSecretKey} placeholder="sk_live_xxxxxxxxxxxxx" secure />
                  <FormField label="Clave Pública (Publishable Key) *" value={stripePublishableKey} onChangeText={setStripePublishableKey} placeholder="pk_live_xxxxxxxxxxxxx" last />
                </View>

                {/* GASTOS DE GESTIÓN */}
                <View style={styles.section}>
                  <SectionHeader icon={<Percent size={18} color="#7c3aed" strokeWidth={2.5} />} title="Gastos de Gestión" />
                  <Text style={styles.sectionSubtitle}>Añade un porcentaje al importe de la fianza como gastos de gestión</Text>
                  <SwitchRow
                    title="Cobrar Gastos de Gestión"
                    description="Se añadirá un porcentaje adicional desglosado al usuario"
                    value={managementFeeEnabled}
                    onValueChange={setManagementFeeEnabled}
                  />
                  {managementFeeEnabled && (
                    <>
                      <FormField
                        label="Porcentaje de Gastos de Gestión (%)"
                        value={managementFeePercent}
                        onChangeText={setManagementFeePercent}
                        placeholder="2"
                        keyboardType="decimal-pad"
                        last
                      />
                      {/* Preview */}
                      <View style={styles.feePreview}>
                        <Text style={styles.feePreviewTitle}>Vista previa del desglose:</Text>
                        <View style={styles.feePreviewRow}>
                          <Text style={styles.feePreviewLabel}>{exampleGuests} comensales × {baseDepositAmount.toFixed(2)}€</Text>
                          <Text style={styles.feePreviewValue}>{exampleBase.toFixed(2)}€</Text>
                        </View>
                        <View style={styles.feePreviewRow}>
                          <Text style={styles.feePreviewLabel}>Gastos de gestión ({feePercent}%)</Text>
                          <Text style={styles.feePreviewValue}>+ {exampleFee.toFixed(2)}€</Text>
                        </View>
                        <View style={[styles.feePreviewRow, styles.feePreviewTotal]}>
                          <Text style={styles.feePreviewTotalLabel}>Total a pagar</Text>
                          <Text style={styles.feePreviewTotalValue}>{exampleTotal.toFixed(2)}€</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {/* POLÍTICA DE CANCELACIÓN */}
                <View style={styles.section}>
                  <SectionHeader icon={<ShieldCheck size={18} color="#7c3aed" strokeWidth={2.5} />} title="Política de Cancelación" />
                  <Text style={styles.sectionSubtitle}>Define las condiciones para la devolución de la fianza al usuario</Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Horas de antelación mínima para devolución</Text>
                    <Text style={styles.labelHint}>Si cancela con más de X horas antes, se le devuelve la fianza. Pon 0 para no aplicar límite.</Text>
                    <TextInput
                      style={styles.input}
                      value={cancellationHours}
                      onChangeText={setCancellationHours}
                      placeholder="24"
                      keyboardType="number-pad"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <SwitchRow
                    title="Devolución Automática"
                    description={autoRefund
                      ? 'El sistema devuelve la fianza automáticamente cuando el cliente cancela dentro del plazo'
                      : 'La devolución debe realizarse manualmente desde el panel de operaciones'}
                    value={autoRefund}
                    onValueChange={setAutoRefund}
                  />

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Texto de Política de Cancelación</Text>
                    <Text style={styles.labelHint}>El usuario deberá aceptar estas condiciones antes de pagar la fianza</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={cancellationPolicy}
                      onChangeText={setCancellationPolicy}
                      placeholder={`Ej: La fianza será devuelta si cancela la reserva con más de ${cancellationHours} horas de antelación. Pasado este plazo, se perderá el importe de la fianza.`}
                      placeholderTextColor="#94a3b8"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  {parseInt(cancellationHours) > 0 && (
                    <View style={styles.policyNote}>
                      <AlertTriangle size={14} color="#d97706" strokeWidth={2.5} />
                      <Text style={styles.policyNoteText}>
                        El cliente perderá la fianza si cancela con menos de {cancellationHours}h de antelación
                        {managementFeeEnabled ? '. Los gastos de gestión no se devuelven.' : '.'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* TRONAS */}
                <View style={styles.section}>
                  <SectionHeader icon={<Baby size={18} color="#7c3aed" strokeWidth={2.5} />} title="Tronas y Fianzas" />
                  <SwitchRow
                    title="Incluir Tronas en Fianza"
                    description={includeHighChairs ? 'Las tronas se cobran como un comensal más' : 'Solo se cobra fianza a los adultos'}
                    value={includeHighChairs}
                    onValueChange={setIncludeHighChairs}
                  />
                </View>

                {/* MODO DE COBRO */}
                <View style={styles.section}>
                  <SectionHeader icon={<ToggleLeft size={18} color="#7c3aed" strokeWidth={2.5} />} title="Modo de Cobro" />
                  <SwitchRow
                    title="Cobrar todos los días"
                    description={depositsApplyToAllDays
                      ? 'Se cobra fianza todos los días. Los días especiales anulan el importe general.'
                      : 'Solo se cobra fianza en los días especiales configurados.'}
                    value={depositsApplyToAllDays}
                    onValueChange={setDepositsApplyToAllDays}
                  />
                </View>

                {depositsApplyToAllDays && (
                  <>
                    <View style={styles.section}>
                      <SectionHeader icon={<DollarSign size={18} color="#7c3aed" strokeWidth={2.5} />} title="Importe General" />
                      <Text style={styles.sectionSubtitle}>Cantidad aplicada por comensal por defecto en todos los días</Text>
                      <FormField
                        label="Fianza por Comensal (€)"
                        value={defaultAmount}
                        onChangeText={setDefaultAmount}
                        placeholder="10"
                        keyboardType="decimal-pad"
                        last
                      />
                    </View>

                    <View style={styles.section}>
                      <SectionHeader icon={<Info size={18} color="#7c3aed" strokeWidth={2.5} />} title="Mensaje General" />
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={customMessage}
                        onChangeText={setCustomMessage}
                        placeholder="Ej: El importe de la fianza se descontará en la cuenta el día de su reserva."
                        placeholderTextColor="#94a3b8"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>
                  </>
                )}

                {/* DÍAS ESPECIALES */}
                <View style={styles.section}>
                  <SectionHeader icon={<Calendar size={18} color="#7c3aed" strokeWidth={2.5} />} title="Días Especiales" />
                  <Text style={styles.sectionSubtitle}>
                    {depositsApplyToAllDays
                      ? 'Configura un importe diferente para días concretos'
                      : 'Añade los días en los que quieres cobrar fianza'}
                  </Text>
                  {specificDays.length > 0 && (
                    <View style={styles.specificDaysList}>
                      {specificDays.map((day) => (
                        <View key={day.date} style={styles.dayItem}>
                          <View style={styles.dayInfo}>
                            <Text style={styles.dayDate}>
                              {new Date(day.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                            </Text>
                            <Text style={styles.dayAmount}>{day.amount}€ / comensal</Text>
                            {day.customMessage && <Text style={styles.dayMessage} numberOfLines={2}>{day.customMessage}</Text>}
                          </View>
                          <View style={styles.dayActions}>
                            <TouchableOpacity style={styles.editDayButton} onPress={() => { setSelectedDateForAmount(day.date); setTempAmount(String(day.amount)); setTempMessage(day.customMessage || ''); setShowCalendar(true); }} activeOpacity={0.7}>
                              <Text style={styles.editDayButtonText}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.removeButton} onPress={() => setSpecificDays(specificDays.filter(d => d.date !== day.date))} activeOpacity={0.7}>
                              <Trash2 size={16} color="#ef4444" strokeWidth={2.5} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity style={styles.addDayButton} onPress={() => setShowCalendar(true)} activeOpacity={0.7}>
                    <Plus size={18} color="#7c3aed" strokeWidth={2.5} />
                    <Text style={styles.addDayText}>Añadir Día Especial</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85} disabled={updateMutation.isPending}>
              <LinearGradient colors={['#7c3aed', '#5b21b6']} style={styles.saveGradient}>
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={18} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.saveText}>Guardar Configuración</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* OPERATIONS TAB */}
        {activeTab === 'operations' && (
          <View style={styles.opsContainer}>
            {/* Filters */}
            <View style={styles.filtersCard}>
              <View style={styles.filtersRow}>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Calendar size={14} color="#7c3aed" strokeWidth={2.5} />
                  <TextInput
                    style={styles.filterInput}
                    value={filterDateFrom}
                    onChangeText={setFilterDateFrom}
                    placeholder="Desde (YYYY-MM-DD)"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Calendar size={14} color="#7c3aed" strokeWidth={2.5} />
                  <TextInput
                    style={styles.filterInput}
                    value={filterDateTo}
                    onChangeText={setFilterDateTo}
                    placeholder="Hasta (YYYY-MM-DD)"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
              <View style={styles.filtersRow}>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Phone size={14} color="#7c3aed" strokeWidth={2.5} />
                  <TextInput
                    style={styles.filterInput}
                    value={filterPhone}
                    onChangeText={setFilterPhone}
                    placeholder="Teléfono del usuario"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                  />
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={handleApplyFilters} activeOpacity={0.8}>
                  <Search size={16} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.searchBtnText}>Buscar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearBtn} onPress={handleClearFilters} activeOpacity={0.8}>
                  <XCircle size={16} color="#64748b" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {operationsQuery.isLoading ? (
              <View style={styles.opsLoading}>
                <ActivityIndicator size="large" color="#7c3aed" />
              </View>
            ) : (
              <ScrollView style={styles.opsList} contentContainerStyle={styles.opsListContent} showsVerticalScrollIndicator={false}>
                {(!operationsQuery.data?.operations || operationsQuery.data.operations.length === 0) ? (
                  <View style={styles.emptyOps}>
                    <DollarSign size={40} color="#c4b5fd" strokeWidth={1.5} />
                    <Text style={styles.emptyOpsTitle}>Sin operaciones</Text>
                    <Text style={styles.emptyOpsText}>No se encontraron operaciones con los filtros seleccionados</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.opsCount}>{operationsQuery.data.total} operación{operationsQuery.data.total !== 1 ? 'es' : ''} encontrada{operationsQuery.data.total !== 1 ? 's' : ''}</Text>
                    {operationsQuery.data.operations.map((op) => (
                      <OperationCard
                        key={op.id}
                        op={op}
                        expanded={expandedOp === op.id}
                        onToggle={() => setExpandedOp(expandedOp === op.id ? null : op.id)}
                        onRefund={() => handleRefund(op)}
                        isRefunding={refundMutation.isPending}
                      />
                    ))}
                    {/* Pagination */}
                    {operationsQuery.data.totalPages > 1 && (
                      <View style={styles.pagination}>
                        <TouchableOpacity
                          style={[styles.pageBtn, opsPage <= 1 && styles.pageBtnDisabled]}
                          onPress={() => setOpsPage(p => Math.max(1, p - 1))}
                          disabled={opsPage <= 1}
                          activeOpacity={0.8}
                        >
                          <ChevronLeft size={18} color={opsPage <= 1 ? '#c4b5fd' : '#7c3aed'} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.pageInfo}>
                          {opsPage} / {operationsQuery.data.totalPages}
                        </Text>
                        <TouchableOpacity
                          style={[styles.pageBtn, opsPage >= (operationsQuery.data.totalPages) && styles.pageBtnDisabled]}
                          onPress={() => setOpsPage(p => Math.min(operationsQuery.data?.totalPages ?? p, p + 1))}
                          disabled={opsPage >= (operationsQuery.data?.totalPages ?? 1)}
                          activeOpacity={0.8}
                        >
                          <ChevronRight size={18} color={opsPage >= (operationsQuery.data?.totalPages ?? 1) ? '#c4b5fd' : '#7c3aed'} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalIcon}>
              <Text style={styles.successModalIconText}>✓</Text>
            </View>
            <Text style={styles.successModalTitle}>¡Guardado!</Text>
            <Text style={styles.successModalText}>Configuración guardada correctamente</Text>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="slide" onRequestClose={() => { setShowCalendar(false); setSelectedDateForAmount(''); setTempAmount(''); setTempMessage(''); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Día Especial</Text>
            {!selectedDateForAmount ? (
              <>
                <Text style={styles.modalSubtitle}>Selecciona el día a configurar</Text>
                <RNCalendar
                  onDayPress={(day: any) => handleDateSelect(day.dateString)}
                  markedDates={markedDates}
                  theme={{ selectedDayBackgroundColor: '#7c3aed', todayTextColor: '#7c3aed', arrowColor: '#7c3aed' }}
                />
              </>
            ) : (
              <View style={styles.amountInputContainer}>
                <Text style={styles.selectedDateText}>
                  {new Date(selectedDateForAmount + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
                <Text style={styles.amountLabel}>Importe de Fianza (€) por comensal:</Text>
                <TextInput style={styles.amountInput} value={tempAmount} onChangeText={setTempAmount} placeholder="10" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                <Text style={styles.amountLabel}>Mensaje para este día (opcional):</Text>
                <TextInput style={[styles.amountInput, { height: 72, paddingTop: 10 }]} value={tempMessage} onChangeText={setTempMessage} placeholder="Mensaje personalizado..." placeholderTextColor="#94a3b8" multiline textAlignVertical="top" />
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmAmount} activeOpacity={0.8}>
                  <Text style={styles.confirmButtonText}>Guardar este día</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backToCalendarButton} onPress={() => { setSelectedDateForAmount(''); setTempAmount(''); setTempMessage(''); }} activeOpacity={0.7}>
                  <Text style={styles.backToCalendarText}>← Volver al calendario</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => { setShowCalendar(false); setSelectedDateForAmount(''); setTempAmount(''); setTempMessage(''); }} activeOpacity={0.7}>
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function SwitchRow({ title, description, value, onValueChange }: { title: string; description: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchInfo}>
        <Text style={styles.switchTitle}>{title}</Text>
        <Text style={styles.switchDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#cbd5e1', true: '#7c3aed' }}
        thumbColor={value ? '#fff' : '#f1f5f9'}
      />
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType, secure, last }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string;
  keyboardType?: any; secure?: boolean; last?: boolean;
}) {
  return (
    <View style={[styles.formGroup, last && { marginBottom: 0 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType || 'default'}
        secureTextEntry={secure}
        autoCapitalize="none"
      />
    </View>
  );
}

function OperationCard({ op, expanded, onToggle, onRefund, isRefunding }: {
  op: DepositOperation; expanded: boolean; onToggle: () => void; onRefund: () => void; isRefunding: boolean;
}) {
  const isPaid = op.status === 'paid';
  const isRefunded = op.status === 'refunded';
  const baseAmount = Math.round(op.depositPerPerson * op.chargeableGuests * 100) / 100;

  const statusColor = isPaid ? '#059669' : isRefunded ? '#3b82f6' : '#6b7280';
  const statusBg = isPaid ? '#d1fae5' : isRefunded ? '#dbeafe' : '#f3f4f6';
  const statusLabel = isPaid ? 'Cobrada' : isRefunded ? 'Devuelta' : op.status;
  const StatusIcon = isPaid ? CheckCircle : isRefunded ? RotateCcw : Clock;

  const formattedDate = op.reservationDate
    ? new Date(op.reservationDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <TouchableOpacity style={styles.opCard} onPress={onToggle} activeOpacity={0.9}>
      <View style={styles.opCardHeader}>
        <View style={styles.opClientInfo}>
          <Text style={styles.opClientName}>{op.clientName || 'Sin nombre'}</Text>
          <View style={styles.opMetaRow}>
            <Phone size={11} color="#94a3b8" strokeWidth={2.5} />
            <Text style={styles.opMeta}>{op.clientPhone || '—'}</Text>
            <Text style={styles.opMetaSep}>·</Text>
            <Calendar size={11} color="#94a3b8" strokeWidth={2.5} />
            <Text style={styles.opMeta}>{formattedDate}</Text>
          </View>
        </View>
        <View style={styles.opRight}>
          <Text style={styles.opTotal}>{op.totalAmount.toFixed(2)}€</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <StatusIcon size={10} color={statusColor} strokeWidth={2.5} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      {expanded && (
        <View style={styles.opDetails}>
          <View style={styles.opDetailDivider} />

          {op.reservationShortId ? (
            <DetailRow label="Nº Reserva" value={`#${op.reservationShortId.toUpperCase()}`} />
          ) : null}
          <DetailRow label="Comensales" value={`${op.chargeableGuests} comensal${op.chargeableGuests !== 1 ? 'es'  : ''}`} />

          {/* Desglose importe */}
          <View style={styles.amountBreakdown}>
            <Text style={styles.breakdownTitle}>Desglose del importe</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{op.chargeableGuests} comensal{op.chargeableGuests !== 1 ? 'es' : ''} × {op.depositPerPerson.toFixed(2)}€</Text>
              <Text style={styles.breakdownValue}>{baseAmount.toFixed(2)}€</Text>
            </View>
            {op.managementFeeAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Gastos de gestión ({op.managementFeePercent}%)</Text>
                <Text style={styles.breakdownValue}>+ {op.managementFeeAmount.toFixed(2)}€</Text>
              </View>
            )}
            <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
              <Text style={styles.breakdownTotalLabel}>Total cobrado</Text>
              <Text style={styles.breakdownTotalValue}>{op.totalAmount.toFixed(2)}€</Text>
            </View>
          </View>

          {isRefunded && op.refundedAt && (
            <View style={styles.refundInfo}>
              <RotateCcw size={12} color="#3b82f6" strokeWidth={2.5} />
              <Text style={styles.refundInfoText}>
                Devuelto el {new Date(op.refundedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          )}

          {isPaid && (
            <TouchableOpacity
              style={styles.refundBtn}
              onPress={onRefund}
              activeOpacity={0.85}
              disabled={isRefunding}
            >
              {isRefunding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <RotateCcw size={15} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.refundBtnText}>Devolver {baseAmount.toFixed(2)}€{op.managementFeeAmount > 0 ? ' (fianza)' : ''} al cliente</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  tabBar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ede9fe' },
  tabBarInner: { flexDirection: 'row' as const, backgroundColor: '#f5f3ff', borderRadius: 12, padding: 3, position: 'relative' as const },
  tabIndicator: { position: 'absolute' as const, top: 3, bottom: 3, width: '50%', backgroundColor: '#7c3aed', borderRadius: 10 },
  tab: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 9, gap: 6, zIndex: 1 },
  tabText: { fontSize: 13, fontWeight: '600' as const, color: '#9ca3af' },
  tabTextActive: { color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  pageHeader: { margin: 16, marginBottom: 0, borderRadius: 16, overflow: 'hidden' as const, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  headerGradient: { padding: 20, alignItems: 'center' as const, gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' as const },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14, padding: 16, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: '#1e1b4b' },
  sectionSubtitle: { fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 17 },
  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, backgroundColor: '#faf5ff', padding: 12, borderRadius: 10, marginBottom: 4, borderWidth: 1, borderColor: '#ede9fe' },
  switchInfo: { flex: 1, marginRight: 12 },
  switchTitle: { fontSize: 14, fontWeight: '600' as const, color: '#1e1b4b', marginBottom: 2 },
  switchDescription: { fontSize: 12, color: '#6b7280', lineHeight: 16 },
  formGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600' as const, color: '#4b5563', marginBottom: 6 },
  labelHint: { fontSize: 11, color: '#9ca3af', marginBottom: 6, lineHeight: 15 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827' },
  textArea: { height: 90, paddingTop: 12 },
  feePreview: { backgroundColor: '#faf5ff', borderRadius: 10, padding: 12, marginTop: 4, borderWidth: 1, borderColor: '#ede9fe' },
  feePreviewTitle: { fontSize: 11, fontWeight: '600' as const, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  feePreviewRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 4 },
  feePreviewLabel: { fontSize: 13, color: '#4b5563' },
  feePreviewValue: { fontSize: 13, color: '#4b5563', fontWeight: '500' as const },
  feePreviewTotal: { borderTopWidth: 1, borderTopColor: '#ddd6fe', paddingTop: 8, marginTop: 4 },
  feePreviewTotalLabel: { fontSize: 14, fontWeight: '700' as const, color: '#1e1b4b' },
  feePreviewTotalValue: { fontSize: 14, fontWeight: '700' as const, color: '#7c3aed' },
  policyNote: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 6, backgroundColor: '#fffbeb', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fde68a', marginTop: 4 },
  policyNoteText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 16 },
  specificDaysList: { gap: 8, marginBottom: 10 },
  dayItem: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, backgroundColor: '#faf5ff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd6fe' },
  dayInfo: { flex: 1 },
  dayDate: { fontSize: 13, fontWeight: '600' as const, color: '#1e1b4b', textTransform: 'capitalize' as const },
  dayAmount: { fontSize: 13, color: '#7c3aed', fontWeight: '700' as const },
  dayMessage: { fontSize: 11, color: '#6b7280', marginTop: 2, fontStyle: 'italic' as const },
  dayActions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  editDayButton: { backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  editDayButtonText: { fontSize: 12, fontWeight: '600' as const, color: '#7c3aed' },
  removeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fee2e2', alignItems: 'center' as const, justifyContent: 'center' as const },
  addDayButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, backgroundColor: '#faf5ff', paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: '#c4b5fd', borderStyle: 'dashed' as const, marginTop: 4 },
  addDayText: { fontSize: 14, fontWeight: '600' as const, color: '#7c3aed' },
  saveButton: { marginHorizontal: 16, marginTop: 20, borderRadius: 14, overflow: 'hidden' as const, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  saveGradient: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 15, gap: 8 },
  saveText: { fontSize: 15, fontWeight: '700' as const, color: '#fff' },

  // Operations
  opsContainer: { flex: 1 },
  filtersCard: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#ede9fe', gap: 8 },
  filtersRow: { flexDirection: 'row' as const, gap: 8, alignItems: 'center' as const },
  filterField: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9 },
  filterInput: { flex: 1, fontSize: 13, color: '#111827', padding: 0 },
  searchBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, gap: 5 },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
  clearBtn: { width: 38, height: 38, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: '#f3f4f6', borderRadius: 9 },
  opsLoading: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const },
  opsList: { flex: 1 },
  opsListContent: { padding: 14, paddingBottom: 30, gap: 10 },
  opsCount: { fontSize: 12, color: '#7c3aed', fontWeight: '600' as const, marginBottom: 2 },
  emptyOps: { alignItems: 'center' as const, paddingVertical: 48, gap: 10 },
  emptyOpsTitle: { fontSize: 16, fontWeight: '700' as const, color: '#4b5563' },
  emptyOpsText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' as const },
  opCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f0eeff' },
  opCardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const },
  opClientInfo: { flex: 1 },
  opClientName: { fontSize: 14, fontWeight: '700' as const, color: '#1e1b4b', marginBottom: 4 },
  opMetaRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  opMeta: { fontSize: 11, color: '#94a3b8' },
  opMetaSep: { fontSize: 11, color: '#cbd5e1' },
  opRight: { alignItems: 'flex-end' as const, gap: 5 },
  opTotal: { fontSize: 16, fontWeight: '700' as const, color: '#1e1b4b' },
  statusBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusLabel: { fontSize: 11, fontWeight: '600' as const },
  opDetails: { marginTop: 12 },
  opDetailDivider: { height: 1, backgroundColor: '#f0eeff', marginBottom: 10 },
  detailRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 6 },
  detailLabel: { fontSize: 13, color: '#6b7280' },
  detailValue: { fontSize: 13, color: '#1e1b4b', fontWeight: '600' as const },
  amountBreakdown: { backgroundColor: '#faf5ff', borderRadius: 9, padding: 12, marginVertical: 8, borderWidth: 1, borderColor: '#ede9fe' },
  breakdownTitle: { fontSize: 11, color: '#7c3aed', fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8 },
  breakdownRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 4 },
  breakdownLabel: { fontSize: 12, color: '#4b5563' },
  breakdownValue: { fontSize: 12, color: '#4b5563', fontWeight: '500' as const },
  breakdownTotalRow: { borderTopWidth: 1, borderTopColor: '#ddd6fe', paddingTop: 8, marginTop: 4 },
  breakdownTotalLabel: { fontSize: 13, fontWeight: '700' as const, color: '#1e1b4b' },
  breakdownTotalValue: { fontSize: 13, fontWeight: '700' as const, color: '#7c3aed' },
  refundInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: '#dbeafe', padding: 8, borderRadius: 8 },
  refundInfoText: { fontSize: 12, color: '#1d4ed8' },
  refundBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, backgroundColor: '#ef4444', paddingVertical: 11, borderRadius: 10, marginTop: 8 },
  refundBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' as const },
  pagination: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 16, marginTop: 10 },
  pageBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#faf5ff', alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: '#ddd6fe' },
  pageBtnDisabled: { opacity: 0.4 },
  pageInfo: { fontSize: 13, fontWeight: '600' as const, color: '#4b5563' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, alignItems: 'center' as const, padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 20, fontWeight: '700' as const, color: '#1e1b4b', marginBottom: 8, textAlign: 'center' as const },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 12, textAlign: 'center' as const },
  amountInputContainer: { gap: 10 },
  selectedDateText: { fontSize: 14, fontWeight: '700' as const, color: '#7c3aed', textAlign: 'center' as const, textTransform: 'capitalize' as const },
  amountLabel: { fontSize: 13, fontWeight: '600' as const, color: '#4b5563' },
  amountInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827' },
  confirmButton: { backgroundColor: '#7c3aed', paddingVertical: 13, borderRadius: 10, alignItems: 'center' as const },
  confirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  backToCalendarButton: { paddingVertical: 8, alignItems: 'center' as const },
  backToCalendarText: { color: '#7c3aed', fontSize: 13, fontWeight: '600' as const },
  modalCloseButton: { backgroundColor: '#f3f4f6', paddingVertical: 13, borderRadius: 10, marginTop: 8 },
  modalCloseButtonText: { color: '#4b5563', fontSize: 14, fontWeight: '600' as const, textAlign: 'center' as const },
  successModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, alignItems: 'center' as const },
  successModalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center' as const, minWidth: 260 },
  successModalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#10b981', justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 16 },
  successModalIconText: { fontSize: 36, color: '#fff', fontWeight: '700' as const },
  successModalTitle: { fontSize: 20, fontWeight: '700' as const, color: '#111827', marginBottom: 4 },
  successModalText: { fontSize: 14, color: '#6b7280', textAlign: 'center' as const },
});
