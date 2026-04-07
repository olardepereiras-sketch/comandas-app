import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, TextInput, Switch } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar, Download, Send, TrendingUp, DollarSign, CreditCard, Key, Save, AlertCircle } from 'lucide-react-native';
import StoreConfigContent from './store-config';
import { trpc } from '@/lib/trpc';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function StatisticsScreen() {
  const router = useRouter();
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'new' | 'renewals' | 'stripe' | 'store'>('new');
  const [secretKey, setSecretKey] = useState<string>('');
  const [publishableKey, setPublishableKey] = useState<string>('');
  const [stripeEnabled, setStripeEnabled] = useState<boolean>(false);
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);

  const newRestaurantsQuery = trpc.stats.newRestaurants.useQuery(
    { startDate, endDate },
    { enabled: activeTab === 'new' }
  );

  const renewalsQuery = trpc.stats.renewals.useQuery(
    { startDate, endDate },
    { enabled: activeTab === 'renewals' }
  );

  const stripeConfigQuery = trpc.stats.getAdminStripeConfig.useQuery(undefined, {
    enabled: activeTab === 'stripe',
    onSuccess: (data) => {
      setPublishableKey(data.stripePublishableKey || '');
      setStripeEnabled(data.stripeEnabled || false);
    },
  });

  const updateStripeMutation = trpc.stats.updateAdminStripeConfig.useMutation({
    onSuccess: () => {
      stripeConfigQuery.refetch();
      Alert.alert('Éxito', 'Configuración de Stripe actualizada correctamente');
      setSecretKey('');
      setShowSecretKey(false);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  React.useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const session = await AsyncStorage.getItem('adminSession');
    if (!session) {
      Alert.alert('Error', 'Sesión no encontrada');
      router.replace('/admin/login');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const generateCSV = (data: any[], type: 'new' | 'renewals') => {
    let headers = '';
    let rows = '';

    if (type === 'new') {
      headers = 'Nombre,Email,Teléfono,Fecha Alta,Plan,Precio Mensual,Duración,Total Contrato,Comercial,Provincia,Ciudad\n';
      rows = data.map(r => 
        `"${r.name}","${r.email}","${r.phone}","${new Date(r.contractDate).toLocaleDateString('es-ES')}","${r.planName}","${r.monthlyPrice}","${r.durationMonths} meses","${r.monthlyPrice * r.durationMonths}","${r.salesRepFirstName} ${r.salesRepLastName}","${r.provinceName}","${r.cityName}"`
      ).join('\n');
    } else {
      headers = 'Nombre,Email,Teléfono,Fecha Renovación,Tipo,Plan,Precio Mensual,Duración,Total,Comercial,Provincia,Ciudad\n';
      rows = data.map(r => 
        `"${r.name}","${r.email}","${r.phone}","${new Date(r.subscriptionStart || r.createdAt).toLocaleDateString('es-ES')}","${r.renewalType}","${r.planName}","${r.monthlyPrice}","${r.durationMonths} meses","${r.monthlyPrice * r.durationMonths}","${r.salesRepFirstName} ${r.salesRepLastName}","${r.provinceName}","${r.cityName}"`
      ).join('\n');
    }

    return headers + rows;
  };

  const handleDownload = async () => {
    try {
      const data = activeTab === 'new' ? newRestaurantsQuery.data : renewalsQuery.data;
      if (!data || data.length === 0) {
        Alert.alert('Error', 'No hay datos para descargar');
        return;
      }

      const csv = generateCSV(data, activeTab);
      const fileName = `${activeTab === 'new' ? 'altas' : 'renovaciones'}_${startDate}_${endDate}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Éxito', 'Archivo descargado correctamente');
      } else {
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Éxito', `Archivo guardado en: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error('Error downloading:', error);
      Alert.alert('Error', 'No se pudo descargar el archivo');
    }
  };

  const handleSendWhatsApp = async (salesRepPhone: string) => {
    try {
      const data = activeTab === 'new' ? newRestaurantsQuery.data : renewalsQuery.data;
      if (!data || data.length === 0) return;

      const filtered = data.filter((r: any) => r.salesRepPhone === salesRepPhone);
      const csv = generateCSV(filtered, activeTab);

      const message = `Hola, aquí está tu informe de ${activeTab === 'new' ? 'altas' : 'renovaciones'} del ${new Date(startDate).toLocaleDateString('es-ES')} al ${new Date(endDate).toLocaleDateString('es-ES')}:\n\n${csv}`;
      
      const url = `https://wa.me/${salesRepPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      Alert.alert('Error', 'No se pudo abrir WhatsApp');
    }
  };

  const handleSaveStripe = () => {
    if (stripeEnabled && (!secretKey && !stripeConfigQuery.data?.isConfigured)) {
      Alert.alert('Error', 'Debes introducir la clave secreta de Stripe para activar el servicio');
      return;
    }

    if (stripeEnabled && (!publishableKey)) {
      Alert.alert('Error', 'Debes introducir la clave pública de Stripe');
      return;
    }

    const input: any = {
      stripeEnabled,
    };

    if (secretKey) {
      input.stripeSecretKey = secretKey;
    }

    if (publishableKey) {
      input.stripePublishableKey = publishableKey;
    }

    updateStripeMutation.mutate(input);
  };

  const data = activeTab === 'new' ? newRestaurantsQuery.data : (activeTab === 'renewals' ? renewalsQuery.data : null);
  const isLoading = activeTab === 'new' ? newRestaurantsQuery.isLoading : (activeTab === 'renewals' ? renewalsQuery.isLoading : stripeConfigQuery.isLoading);

  const totalRevenue = React.useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum: number, r: any) => sum + (r.monthlyPrice * r.durationMonths), 0);
  }, [data]);

  const salesRepGroups = React.useMemo(() => {
    if (!data) return {};
    const groups: Record<string, any[]> = {};
    data.forEach((r: any) => {
      const key = `${r.salesRepFirstName} ${r.salesRepLastName}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(r);
    });
    return groups;
  }, [data]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Estadísticas y Tienda Virtual',
          headerStyle: { backgroundColor: '#3b82f6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TrendingUp size={48} color="#3b82f6" strokeWidth={1.5} />
            <Text style={styles.title}>Estadísticas y Tienda Virtual</Text>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'new' && styles.tabActive]}
              onPress={() => setActiveTab('new')}
            >
              <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
                Altas Nuevas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'renewals' && styles.tabActive]}
              onPress={() => setActiveTab('renewals')}
            >
              <Text style={[styles.tabText, activeTab === 'renewals' && styles.tabTextActive]}>
                Renovaciones
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'stripe' && styles.tabActive]}
              onPress={() => setActiveTab('stripe')}
            >
              <Text style={[styles.tabText, activeTab === 'stripe' && styles.tabTextActive]}>
                Stripe
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'store' && styles.tabActive]}
              onPress={() => setActiveTab('store')}
            >
              <Text style={[styles.tabText, activeTab === 'store' && styles.tabTextActive]}>
                Tienda
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rango de Fechas</Text>
            <View style={styles.dateInputs}>
              <View style={styles.dateField}>
                <Text style={styles.label}>Desde:</Text>
                <Text style={styles.dateText}>{new Date(startDate).toLocaleDateString('es-ES')}</Text>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.label}>Hasta:</Text>
                <Text style={styles.dateText}>{new Date(endDate).toLocaleDateString('es-ES')}</Text>
              </View>
            </View>
          </View>

          {activeTab === 'store' ? (
            <View style={styles.storeSection}>
              <StoreConfigContent />
            </View>
          ) : activeTab === 'stripe' ? (
            <View style={styles.stripeSection}>
              {isLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              ) : (
                <>
                  {!stripeConfigQuery.data?.isConfigured && (
                    <View style={styles.warningCard}>
                      <AlertCircle size={24} color="#f59e0b" strokeWidth={2.5} />
                      <View style={styles.warningContent}>
                        <Text style={styles.warningTitle}>Stripe no configurado</Text>
                        <Text style={styles.warningText}>
                          La tienda virtual no puede procesar pagos hasta que configures las claves de Stripe.
                        </Text>
                      </View>
                    </View>
                  )}

                  {stripeConfigQuery.data?.isConfigured && (
                    <View style={styles.successCard}>
                      <View style={styles.successIcon}>
                        <CreditCard size={20} color="#10b981" strokeWidth={2.5} />
                      </View>
                      <View style={styles.successContent}>
                        <Text style={styles.successTitle}>Stripe configurado</Text>
                        <Text style={styles.successText}>
                          Los pagos de la tienda virtual están activos y funcionando.
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.section}>
                    <View style={styles.switchRow}>
                      <View style={styles.switchInfo}>
                        <Text style={styles.switchLabel}>Activar Stripe</Text>
                        <Text style={styles.switchDescription}>
                          Permite que la tienda virtual procese pagos en https://quieromesa.com/subscribe
                        </Text>
                      </View>
                      <Switch
                        value={stripeEnabled}
                        onValueChange={setStripeEnabled}
                        trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Key size={24} color="#3b82f6" strokeWidth={2.5} />
                      <Text style={styles.cardTitle}>Claves de API de Stripe</Text>
                    </View>

                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>
                        Obtén tus claves en: https://dashboard.stripe.com/apikeys
                      </Text>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Clave Secreta (Secret Key)</Text>
                      <TextInput
                        style={styles.input}
                        value={secretKey}
                        onChangeText={setSecretKey}
                        placeholder={stripeConfigQuery.data?.isConfigured ? '••••••••••••••••' : 'sk_live_...'}
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!showSecretKey}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowSecretKey(!showSecretKey)}
                        style={styles.showButton}
                      >
                        <Text style={styles.showButtonText}>
                          {showSecretKey ? 'Ocultar' : 'Mostrar'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.fieldNote}>
                        Solo se guarda de forma segura. Déjala vacía si no quieres cambiarla.
                      </Text>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Clave Pública (Publishable Key)</Text>
                      <TextInput
                        style={styles.input}
                        value={publishableKey}
                        onChangeText={setPublishableKey}
                        placeholder="pk_live_..."
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Text style={styles.fieldNote}>
                        Esta clave es visible para los clientes durante el proceso de pago.
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handleSaveStripe}
                    activeOpacity={0.8}
                    disabled={updateStripeMutation.isPending}
                  >
                    <LinearGradient
                      colors={['#3b82f6', '#2563eb']}
                      style={styles.saveButtonGradient}
                    >
                      <Save size={20} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.saveButtonText}>
                        {updateStripeMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : !data || data.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay datos para este período</Text>
            </View>
          ) : (
            <>
              <View style={styles.summary}>
                <View style={styles.summaryCard}>
                  <DollarSign size={32} color="#10b981" />
                  <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
                  <Text style={styles.summaryLabel}>Ingresos Totales</Text>
                </View>
                <View style={styles.summaryCard}>
                  <TrendingUp size={32} color="#3b82f6" />
                  <Text style={styles.summaryValue}>{data.length}</Text>
                  <Text style={styles.summaryLabel}>{activeTab === 'new' ? 'Altas' : 'Renovaciones'}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
                  <Download size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Descargar CSV</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Por Comercial</Text>
                {Object.entries(salesRepGroups).map(([rep, items]: [string, any]) => {
                  const repTotal = items.reduce((sum: number, r: any) => sum + (r.monthlyPrice * r.durationMonths), 0);
                  const repPhone = items[0]?.salesRepPhone || '';
                  
                  return (
                    <View key={rep} style={styles.repCard}>
                      <View style={styles.repHeader}>
                        <Text style={styles.repName}>{rep}</Text>
                        <TouchableOpacity
                          style={styles.whatsappButton}
                          onPress={() => handleSendWhatsApp(repPhone)}
                          disabled={!repPhone}
                        >
                          <Send size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.repStats}>{items.length} contratos - {formatCurrency(repTotal)}</Text>
                      {items.map((r: any, idx: number) => (
                        <View key={idx} style={styles.contractItem}>
                          <Text style={styles.contractName}>{r.name}</Text>
                          <Text style={styles.contractValue}>{formatCurrency(r.monthlyPrice * r.durationMonths)}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 32,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 16,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  tabTextActive: {
    color: '#fff',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 12,
  },
  dateInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  summary: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  actions: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  repCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  repHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  repName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    padding: 8,
    borderRadius: 8,
  },
  repStats: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  contractItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  contractName: {
    fontSize: 14,
    color: '#0f172a',
  },
  contractValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  stripeSection: {
    paddingHorizontal: 20,
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 16,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  successCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
    marginBottom: 16,
  },
  successIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#166534',
    marginBottom: 4,
  },
  successText: {
    fontSize: 14,
    color: '#15803d',
    lineHeight: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  formGroup: {
    gap: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  showButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  showButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600' as const,
  },
  fieldNote: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  storeSection: {
    flex: 1,
  },
});
