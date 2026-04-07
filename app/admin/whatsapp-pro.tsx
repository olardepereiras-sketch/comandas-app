import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  MessageSquare, Settings, CreditCard, Plus, Trash2, Edit3,
  Save, X, RefreshCw, Building2, Check, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';

type WhatsappProvider = 'twilio' | '360dialog' | 'cloud_api';
type ActiveTab = 'config' | 'plans' | 'restaurants';

const PROVIDER_LABELS: Record<WhatsappProvider, string> = {
  twilio: 'Twilio',
  '360dialog': '360Dialog',
  cloud_api: 'WhatsApp Cloud API',
};

export default function AdminWhatsappProScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('config');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'WhatsApp de Pago',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <View style={styles.container}>
        <View style={styles.tabBar}>
          {([
            { key: 'config', label: 'Proveedor', icon: Settings },
            { key: 'plans', label: 'Planes', icon: CreditCard },
            { key: 'restaurants', label: 'Restaurantes', icon: Building2 },
          ] as { key: ActiveTab; label: string; icon: any }[]).map(tab => {
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Icon size={18} color={activeTab === tab.key ? '#059669' : '#94a3b8'} strokeWidth={2} />
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'config' && <ProviderConfigTab />}
        {activeTab === 'plans' && <CreditPlansTab />}
        {activeTab === 'restaurants' && <RestaurantsTab />}
      </View>
    </>
  );
}

function ProviderConfigTab() {
  const configQuery = trpc.whatsappPro.getAdminConfig.useQuery();
  const updateMutation = trpc.whatsappPro.updateAdminConfig.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Configuración guardada correctamente');
      void configQuery.refetch();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const [provider, setProvider] = useState<WhatsappProvider>('twilio');
  const [enabled, setEnabled] = useState<boolean>(false);
  const [costPerMessage, setCostPerMessage] = useState<string>('0.05');
  const [twilioAccountSid, setTwilioAccountSid] = useState<string>('');
  const [twilioAuthToken, setTwilioAuthToken] = useState<string>('');
  const [twilioFromPhone, setTwilioFromPhone] = useState<string>('');
  const [dialog360ApiKey, setDialog360ApiKey] = useState<string>('');
  const [dialog360FromPhone, setDialog360FromPhone] = useState<string>('');
  const [cloudApiToken, setCloudApiToken] = useState<string>('');
  const [cloudApiPhoneNumberId, setCloudApiPhoneNumberId] = useState<string>('');
  const [cloudApiBusinessAccountId, setCloudApiBusinessAccountId] = useState<string>('');
  const [showProviderPicker, setShowProviderPicker] = useState<boolean>(false);
  const initialized = React.useRef(false);

  useEffect(() => {
    if (configQuery.data && !initialized.current) {
      initialized.current = true;
      const d = configQuery.data;
      setProvider(d.provider);
      setEnabled(d.enabled);
      setCostPerMessage(String(d.costPerMessage));
      setTwilioAccountSid(d.twilioAccountSid || '');
      setTwilioAuthToken(d.twilioAuthToken || '');
      setTwilioFromPhone(d.twilioFromPhone || '');
      setDialog360ApiKey(d.dialog360ApiKey || '');
      setDialog360FromPhone(d.dialog360FromPhone || '');
      setCloudApiToken(d.cloudApiToken || '');
      setCloudApiPhoneNumberId(d.cloudApiPhoneNumberId || '');
      setCloudApiBusinessAccountId(d.cloudApiBusinessAccountId || '');
    }
  }, [configQuery.data]);

  const handleSave = () => {
    const cost = parseFloat(costPerMessage);
    if (isNaN(cost) || cost < 0) {
      Alert.alert('Error', 'El coste por envío debe ser un número válido');
      return;
    }
    updateMutation.mutate({
      provider,
      enabled,
      costPerMessage: cost,
      twilioAccountSid,
      twilioAuthToken,
      twilioFromPhone,
      dialog360ApiKey,
      dialog360FromPhone,
      cloudApiToken,
      cloudApiPhoneNumberId,
      cloudApiBusinessAccountId,
    });
  };

  if (configQuery.isLoading) {
    return <View style={styles.tabLoading}><ActivityIndicator size="large" color="#059669" /></View>;
  }

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Settings size={20} color="#059669" strokeWidth={2.5} />
          <Text style={styles.cardTitle}>Configuración General</Text>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchTitle}>Activar WhatsApp de Pago</Text>
            <Text style={styles.switchDesc}>Habilita el servicio de envío para todos los restaurantes</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: '#cbd5e1', true: '#059669' }}
            thumbColor={enabled ? '#fff' : '#f1f5f9'}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Coste por envío (€)</Text>
          <TextInput
            style={styles.input}
            value={costPerMessage}
            onChangeText={setCostPerMessage}
            keyboardType="decimal-pad"
            placeholder="0.0500"
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.fieldHint}>Este coste se mostrará al restaurante en su configuración pro</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Proveedor de WhatsApp</Text>
          <TouchableOpacity
            style={styles.providerSelector}
            onPress={() => setShowProviderPicker(!showProviderPicker)}
            activeOpacity={0.8}
          >
            <Text style={styles.providerSelectorText}>{PROVIDER_LABELS[provider]}</Text>
            {showProviderPicker ? (
              <ChevronUp size={18} color="#64748b" />
            ) : (
              <ChevronDown size={18} color="#64748b" />
            )}
          </TouchableOpacity>
          {showProviderPicker && (
            <View style={styles.providerDropdown}>
              {(['twilio', '360dialog', 'cloud_api'] as WhatsappProvider[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.providerOption, provider === p && styles.providerOptionActive]}
                  onPress={() => { setProvider(p); setShowProviderPicker(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.providerOptionText, provider === p && styles.providerOptionTextActive]}>
                    {PROVIDER_LABELS[p]}
                  </Text>
                  {provider === p && <Check size={16} color="#059669" strokeWidth={2.5} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {provider === 'twilio' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageSquare size={20} color="#1877F2" strokeWidth={2.5} />
            <Text style={styles.cardTitle}>Credenciales Twilio</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Account SID</Text>
            <TextInput style={styles.input} value={twilioAccountSid} onChangeText={setTwilioAccountSid}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" placeholderTextColor="#94a3b8" autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Auth Token</Text>
            <TextInput style={styles.input} value={twilioAuthToken} onChangeText={setTwilioAuthToken}
              placeholder="Token de autenticación" placeholderTextColor="#94a3b8" secureTextEntry autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Número de WhatsApp (From)</Text>
            <TextInput style={styles.input} value={twilioFromPhone} onChangeText={setTwilioFromPhone}
              placeholder="whatsapp:+14155238886" placeholderTextColor="#94a3b8" autoCapitalize="none" />
          </View>
        </View>
      )}

      {provider === '360dialog' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageSquare size={20} color="#25D366" strokeWidth={2.5} />
            <Text style={styles.cardTitle}>Credenciales 360Dialog</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>API Key</Text>
            <TextInput style={styles.input} value={dialog360ApiKey} onChangeText={setDialog360ApiKey}
              placeholder="API Key de 360Dialog" placeholderTextColor="#94a3b8" secureTextEntry autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Número de WhatsApp (From)</Text>
            <TextInput style={styles.input} value={dialog360FromPhone} onChangeText={setDialog360FromPhone}
              placeholder="+34600000000" placeholderTextColor="#94a3b8" autoCapitalize="none" />
          </View>
        </View>
      )}

      {provider === 'cloud_api' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageSquare size={20} color="#1877F2" strokeWidth={2.5} />
            <Text style={styles.cardTitle}>Credenciales WhatsApp Cloud API</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Access Token</Text>
            <TextInput style={styles.input} value={cloudApiToken} onChangeText={setCloudApiToken}
              placeholder="Bearer token de acceso" placeholderTextColor="#94a3b8" secureTextEntry autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone Number ID</Text>
            <TextInput style={styles.input} value={cloudApiPhoneNumberId} onChangeText={setCloudApiPhoneNumberId}
              placeholder="ID del número de teléfono" placeholderTextColor="#94a3b8" autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Business Account ID</Text>
            <TextInput style={styles.input} value={cloudApiBusinessAccountId} onChangeText={setCloudApiBusinessAccountId}
              placeholder="ID de cuenta de negocio" placeholderTextColor="#94a3b8" autoCapitalize="none" />
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        activeOpacity={0.85}
        disabled={updateMutation.isPending}
      >
        <LinearGradient colors={['#059669', '#047857']} style={styles.saveGradient}>
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" strokeWidth={2.5} />
              <Text style={styles.saveButtonText}>Guardar Configuración</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

function CreditPlansTab() {
  const plansQuery = trpc.whatsappPro.listCreditPlans.useQuery();
  const createMutation = trpc.whatsappPro.createCreditPlan.useMutation({
    onSuccess: () => { void plansQuery.refetch(); setShowCreateModal(false); resetForm(); },
    onError: (e) => Alert.alert('Error', e.message),
  });
  const updateMutation = trpc.whatsappPro.updateCreditPlan.useMutation({
    onSuccess: () => { void plansQuery.refetch(); setEditingPlan(null); resetForm(); },
    onError: (e) => Alert.alert('Error', e.message),
  });
  const deleteMutation = trpc.whatsappPro.deleteCreditPlan.useMutation({
    onSuccess: () => void plansQuery.refetch(),
    onError: (e) => Alert.alert('Error', e.message),
  });

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formSends, setFormSends] = useState<string>('');

  const resetForm = () => { setFormName(''); setFormPrice(''); setFormSends(''); };

  const handleCreate = () => {
    const price = parseFloat(formPrice);
    const sends = parseInt(formSends);
    if (!formName.trim() || isNaN(price) || price < 0 || isNaN(sends) || sends < 1) {
      Alert.alert('Error', 'Completa todos los campos correctamente');
      return;
    }
    createMutation.mutate({ name: formName.trim(), priceWithoutVat: price, sendsCount: sends });
  };

  const handleUpdate = () => {
    if (!editingPlan) return;
    const price = parseFloat(formPrice);
    const sends = parseInt(formSends);
    if (!formName.trim() || isNaN(price) || price < 0 || isNaN(sends) || sends < 1) {
      Alert.alert('Error', 'Completa todos los campos correctamente');
      return;
    }
    updateMutation.mutate({ id: editingPlan, name: formName.trim(), priceWithoutVat: price, sendsCount: sends });
  };

  const handleDelete = (planId: string, planName: string) => {
    Alert.alert('Eliminar Plan', `¿Eliminar el plan "${planName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate({ id: planId }) },
    ]);
  };

  const openEdit = (plan: { id: string; name: string; priceWithoutVat: number; sendsCount: number }) => {
    setEditingPlan(plan.id);
    setFormName(plan.name);
    setFormPrice(String(plan.priceWithoutVat));
    setFormSends(String(plan.sendsCount));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeader}>
            <CreditCard size={20} color="#059669" strokeWidth={2.5} />
            <Text style={styles.cardTitle}>Planes de Créditos</Text>
          </View>
          <TouchableOpacity
            style={styles.addPlanButton}
            onPress={() => { resetForm(); setShowCreateModal(true); }}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#fff" strokeWidth={2.5} />
            <Text style={styles.addPlanButtonText}>Nuevo</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.cardDesc}>
          Define los paquetes de créditos disponibles para que los restaurantes recarguen su saldo.
        </Text>

        {plansQuery.isLoading ? (
          <ActivityIndicator size="large" color="#059669" style={{ margin: 20 }} />
        ) : !plansQuery.data || plansQuery.data.length === 0 ? (
          <View style={styles.emptyState}>
            <CreditCard size={40} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyStateText}>Sin planes creados</Text>
            <Text style={styles.emptyStateSubtext}>Crea el primer plan pulsando "Nuevo"</Text>
          </View>
        ) : (
          plansQuery.data.map(plan => {
            const isEditing = editingPlan === plan.id;
            return (
              <View key={plan.id} style={styles.planCard}>
                {isEditing ? (
                  <>
                    <Text style={styles.planEditTitle}>Editar Plan</Text>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Nombre</Text>
                      <TextInput style={styles.input} value={formName} onChangeText={setFormName} placeholder="Ej: Pack Básico" placeholderTextColor="#94a3b8" />
                    </View>
                    <View style={styles.twoColumns}>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Precio sin IVA (€)</Text>
                        <TextInput style={styles.input} value={formPrice} onChangeText={setFormPrice} keyboardType="decimal-pad" placeholder="9.99" placeholderTextColor="#94a3b8" />
                      </View>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>N.º de envíos</Text>
                        <TextInput style={styles.input} value={formSends} onChangeText={setFormSends} keyboardType="number-pad" placeholder="200" placeholderTextColor="#94a3b8" />
                      </View>
                    </View>
                    <View style={styles.editActions}>
                      <TouchableOpacity style={styles.editSaveBtn} onPress={handleUpdate} disabled={isPending} activeOpacity={0.8}>
                        {isPending ? <ActivityIndicator size="small" color="#fff" /> : <><Check size={16} color="#fff" strokeWidth={2.5} /><Text style={styles.editSaveBtnText}>Guardar</Text></>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.editCancelBtn} onPress={() => { setEditingPlan(null); resetForm(); }} activeOpacity={0.8}>
                        <X size={16} color="#64748b" strokeWidth={2.5} />
                        <Text style={styles.editCancelBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.planRow}>
                    <View style={styles.planInfo}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planDetails}>{plan.sendsCount.toLocaleString()} envíos · {plan.priceWithoutVat.toFixed(2)}€ sin IVA</Text>
                      <Text style={styles.planPricePerSend}>
                        {plan.sendsCount > 0 ? (plan.priceWithoutVat / plan.sendsCount).toFixed(4) : '—'}€ / envío
                      </Text>
                    </View>
                    <View style={styles.planActions}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(plan)} activeOpacity={0.8}>
                        <Edit3 size={16} color="#059669" strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(plan.id, plan.name)} activeOpacity={0.8}
                        disabled={deleteMutation.isPending}>
                        <Trash2 size={16} color="#ef4444" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nuevo Plan de Créditos</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)} activeOpacity={0.7}>
                  <X size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Nombre del plan</Text>
                  <TextInput style={styles.input} value={formName} onChangeText={setFormName}
                    placeholder="Ej: Pack Básico, Pack Pro..." placeholderTextColor="#94a3b8" />
                </View>
                <View style={styles.twoColumns}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Precio sin IVA (€)</Text>
                    <TextInput style={styles.input} value={formPrice} onChangeText={setFormPrice}
                      keyboardType="decimal-pad" placeholder="9.99" placeholderTextColor="#94a3b8" />
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>N.º de envíos</Text>
                    <TextInput style={styles.input} value={formSends} onChangeText={setFormSends}
                      keyboardType="number-pad" placeholder="200" placeholderTextColor="#94a3b8" />
                  </View>
                </View>
                {formPrice && formSends && !isNaN(parseFloat(formPrice)) && !isNaN(parseInt(formSends)) && parseInt(formSends) > 0 && (
                  <View style={styles.previewBox}>
                    <Text style={styles.previewText}>
                      Precio por envío: {(parseFloat(formPrice) / parseInt(formSends)).toFixed(4)}€
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={styles.createButton} onPress={handleCreate} disabled={isPending} activeOpacity={0.85}>
                  {isPending ? <ActivityIndicator size="small" color="#fff" /> : (
                    <><Plus size={18} color="#fff" strokeWidth={2.5} /><Text style={styles.createButtonText}>Crear Plan</Text></>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function RestaurantsTab() {
  const creditsQuery = trpc.whatsappPro.listRestaurantCredits.useQuery(undefined);
  const plansQuery = trpc.whatsappPro.listCreditPlans.useQuery();
  const rechargeMutation = trpc.whatsappPro.rechargeCredits.useMutation({
    onSuccess: (data) => {
      Alert.alert('Éxito', `Créditos recargados. Nuevo saldo: ${data.newBalance} envíos`);
      void creditsQuery.refetch();
      setRechargeModal(null);
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const [rechargeModal, setRechargeModal] = useState<{ id: string; name: string } | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<string>('');
  const [rechargeNotes, setRechargeNotes] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [useManual, setUseManual] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'paid' | 'free'>('all');
  const [searchText, setSearchText] = useState<string>('');

  const restaurants = creditsQuery.data?.filter(r => {
    if (filter === 'paid' && r.whatsappType !== 'paid') return false;
    if (filter === 'free' && r.whatsappType !== 'free') return false;
    if (searchText.trim()) {
      return r.name.toLowerCase().includes(searchText.trim().toLowerCase());
    }
    return true;
  }) ?? [];

  const handleRecharge = () => {
    if (!rechargeModal) return;
    if (useManual) {
      const amount = parseInt(rechargeAmount);
      if (isNaN(amount) || amount < 1) {
        Alert.alert('Error', 'Introduce una cantidad válida');
        return;
      }
      rechargeMutation.mutate({
        restaurantId: rechargeModal.id,
        creditsToAdd: amount,
        rechargeType: 'manual',
        notes: rechargeNotes || 'Recarga manual por administrador',
      });
    } else {
      const plan = plansQuery.data?.find(p => p.id === selectedPlanId);
      if (!plan) { Alert.alert('Error', 'Selecciona un plan'); return; }
      rechargeMutation.mutate({
        restaurantId: rechargeModal.id,
        creditsToAdd: plan.sendsCount,
        planId: plan.id,
        planName: plan.name,
        amountPaid: plan.priceWithoutVat,
        rechargeType: 'manual',
        notes: rechargeNotes || `Recarga manual: ${plan.name}`,
      });
    }
  };

  const openRecharge = (id: string, name: string) => {
    setRechargeModal({ id, name });
    setRechargeAmount('');
    setRechargeNotes('');
    setSelectedPlanId('');
    setUseManual(false);
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Building2 size={20} color="#059669" strokeWidth={2.5} />
          <Text style={styles.cardTitle}>Créditos por Restaurante</Text>
        </View>
        <Text style={styles.cardDesc}>Gestiona los créditos de WhatsApp de cada restaurante</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar restaurante..."
            placeholderTextColor="#94a3b8"
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.filterRow}>
          {(['all', 'paid', 'free'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f === 'all' ? 'Todos' : f === 'paid' ? 'De Pago' : 'Gratuitos'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.refreshBtn} onPress={() => void creditsQuery.refetch()} activeOpacity={0.8}>
            <RefreshCw size={14} color="#64748b" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {creditsQuery.isLoading ? (
          <ActivityIndicator size="large" color="#059669" style={{ margin: 20 }} />
        ) : restaurants.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={40} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyStateText}>Sin restaurantes</Text>
          </View>
        ) : (
          restaurants.map(r => (
            <View key={r.id} style={styles.restaurantCard}>
              <View style={styles.restaurantInfo}>
                <View style={styles.restaurantNameRow}>
                  <Text style={styles.restaurantName} numberOfLines={1}>{r.name}</Text>
                  <View style={[
                    styles.typeBadge,
                    r.whatsappType === 'paid' ? styles.typeBadgePaid : styles.typeBadgeFree,
                  ]}>
                    <Text style={[
                      styles.typeBadgeText,
                      r.whatsappType === 'paid' ? styles.typeBadgeTextPaid : styles.typeBadgeTextFree,
                    ]}>
                      {r.whatsappType === 'paid' ? 'Pago' : 'Gratis'}
                    </Text>
                  </View>
                </View>
                <View style={styles.restaurantCreditsRow}>
                  <Text style={styles.restaurantCreditsLabel}>Créditos: </Text>
                  <Text style={[
                    styles.restaurantCreditsValue,
                    r.whatsappProCredits < 10 ? { color: '#ef4444' } : { color: '#059669' },
                  ]}>
                    {r.whatsappProCredits}
                  </Text>
                  {r.whatsappProAlertThreshold > 0 && (
                    <Text style={styles.restaurantAlertThreshold}>
                      · Alerta en {r.whatsappProAlertThreshold}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.rechargeBtn}
                onPress={() => openRecharge(r.id, r.name)}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#fff" strokeWidth={2.5} />
                <Text style={styles.rechargeBtnText}>Recargar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <Modal visible={!!rechargeModal} transparent animationType="slide" onRequestClose={() => setRechargeModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recargar Créditos</Text>
              <TouchableOpacity onPress={() => setRechargeModal(null)} activeOpacity={0.7}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            {rechargeModal && (
              <Text style={styles.modalSubtitle}>{rechargeModal.name}</Text>
            )}

            <View style={styles.rechargeTypeToggle}>
              <TouchableOpacity
                style={[styles.rechargeTypeBtn, !useManual && styles.rechargeTypeBtnActive]}
                onPress={() => setUseManual(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.rechargeTypeBtnText, !useManual && styles.rechargeTypeBtnTextActive]}>
                  Por plan
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rechargeTypeBtn, useManual && styles.rechargeTypeBtnActive]}
                onPress={() => setUseManual(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.rechargeTypeBtnText, useManual && styles.rechargeTypeBtnTextActive]}>
                  Manual
                </Text>
              </TouchableOpacity>
            </View>

            {!useManual ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Seleccionar plan</Text>
                {plansQuery.data?.map(plan => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[styles.planOption, selectedPlanId === plan.id && styles.planOptionActive]}
                    onPress={() => setSelectedPlanId(plan.id)}
                    activeOpacity={0.8}
                  >
                    <View>
                      <Text style={[styles.planOptionName, selectedPlanId === plan.id && { color: '#059669' }]}>
                        {plan.name}
                      </Text>
                      <Text style={styles.planOptionDetails}>
                        {plan.sendsCount} envíos · {plan.priceWithoutVat.toFixed(2)}€ sin IVA
                      </Text>
                    </View>
                    {selectedPlanId === plan.id && <Check size={18} color="#059669" strokeWidth={2.5} />}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Cantidad de envíos a añadir</Text>
                <TextInput style={styles.input} value={rechargeAmount} onChangeText={setRechargeAmount}
                  keyboardType="number-pad" placeholder="Ej: 200" placeholderTextColor="#94a3b8" />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notas (opcional)</Text>
              <TextInput style={styles.input} value={rechargeNotes} onChangeText={setRechargeNotes}
                placeholder="Ej: Recarga manual Enero 2026" placeholderTextColor="#94a3b8" />
            </View>

            <TouchableOpacity style={styles.createButton} onPress={handleRecharge} disabled={rechargeMutation.isPending} activeOpacity={0.85}>
              {rechargeMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : (
                <><Plus size={18} color="#fff" strokeWidth={2.5} /><Text style={styles.createButtonText}>Confirmar Recarga</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: '#059669' },
  tabLabel: { fontSize: 13, fontWeight: '500' as const, color: '#94a3b8' },
  tabLabelActive: { color: '#059669', fontWeight: '700' as const },
  tabContent: { flex: 1 },
  tabLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700' as const, color: '#0f172a' },
  cardDesc: { fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 18 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  switchInfo: { flex: 1, marginRight: 12 },
  switchTitle: { fontSize: 14, fontWeight: '600' as const, color: '#0f172a', marginBottom: 2 },
  switchDesc: { fontSize: 12, color: '#64748b', lineHeight: 16 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: '#475569', marginBottom: 6 },
  fieldHint: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#0f172a',
  },
  providerSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
  },
  providerSelectorText: { fontSize: 15, color: '#0f172a', fontWeight: '500' as const },
  providerDropdown: {
    marginTop: 4, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  providerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  providerOptionActive: { backgroundColor: '#f0fdf4' },
  providerOptionText: { fontSize: 15, color: '#0f172a' },
  providerOptionTextActive: { fontWeight: '700' as const, color: '#059669' },
  saveButton: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 24,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },
  addPlanButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  addPlanButtonText: { fontSize: 13, fontWeight: '700' as const, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyStateText: { fontSize: 16, fontWeight: '700' as const, color: '#0f172a' },
  emptyStateSubtext: { fontSize: 13, color: '#64748b' },
  planCard: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  planRow: { flexDirection: 'row', alignItems: 'center' },
  planInfo: { flex: 1 },
  planName: { fontSize: 15, fontWeight: '700' as const, color: '#0f172a', marginBottom: 2 },
  planDetails: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  planPricePerSend: { fontSize: 12, color: '#94a3b8' },
  planActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fee2e2',
    alignItems: 'center', justifyContent: 'center',
  },
  planEditTitle: { fontSize: 14, fontWeight: '700' as const, color: '#059669', marginBottom: 12 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editSaveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10,
  },
  editSaveBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#fff' },
  editCancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
  },
  editCancelBtnText: { fontSize: 14, fontWeight: '600' as const, color: '#64748b' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#dcfce7', borderColor: '#059669' },
  filterChipText: { fontSize: 12, fontWeight: '600' as const, color: '#64748b' },
  filterChipTextActive: { color: '#059669' },
  searchRow: { marginBottom: 10 },
  searchInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#0f172a',
  },
  refreshBtn: {
    marginLeft: 'auto', width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  restaurantCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  restaurantInfo: { flex: 1 },
  restaurantNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  restaurantName: { fontSize: 14, fontWeight: '700' as const, color: '#0f172a', flex: 1 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  typeBadgePaid: { backgroundColor: '#dcfce7' },
  typeBadgeFree: { backgroundColor: '#f1f5f9' },
  typeBadgeText: { fontSize: 10, fontWeight: '700' as const },
  typeBadgeTextPaid: { color: '#059669' },
  typeBadgeTextFree: { color: '#64748b' },
  restaurantCreditsRow: { flexDirection: 'row', alignItems: 'center' },
  restaurantCreditsLabel: { fontSize: 12, color: '#64748b' },
  restaurantCreditsValue: { fontSize: 14, fontWeight: '700' as const },
  restaurantAlertThreshold: { fontSize: 11, color: '#94a3b8', marginLeft: 4 },
  rechargeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  rechargeBtnText: { fontSize: 12, fontWeight: '700' as const, color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' as const, color: '#0f172a' },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  rechargeTypeToggle: {
    flexDirection: 'row', marginBottom: 16, backgroundColor: '#f1f5f9',
    borderRadius: 10, padding: 3,
  },
  rechargeTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  rechargeTypeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  rechargeTypeBtnText: { fontSize: 14, fontWeight: '500' as const, color: '#64748b' },
  rechargeTypeBtnTextActive: { color: '#059669', fontWeight: '700' as const },
  planOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  planOptionActive: { borderColor: '#059669', backgroundColor: '#f0fdf4' },
  planOptionName: { fontSize: 14, fontWeight: '700' as const, color: '#0f172a', marginBottom: 2 },
  planOptionDetails: { fontSize: 12, color: '#64748b' },
  previewBox: {
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  previewText: { fontSize: 13, color: '#059669', fontWeight: '600' as const, textAlign: 'center' },
  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#059669', borderRadius: 14, paddingVertical: 16, marginTop: 4,
  },
  createButtonText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },
});
