import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch, ActivityIndicator, Modal, Image, FlatList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Save, Plus, Trash2, Phone, Calendar, Link as LinkIcon, Mail, Bell, ChevronDown, X, Search, AlertTriangle, CreditCard } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CustomLink } from '@/types';
import { trpc } from '@/lib/trpc';
import { getRestaurantId } from '@/lib/restaurantSession';
import { PHONE_PREFIXES, DEFAULT_PREFIX } from '@/constants/phone-prefixes';
import type { PhonePrefix } from '@/constants/phone-prefixes';

function WhatsappProCreditsPanel({
  alertThreshold,
  onAlertThresholdChange,
  router,
  credits,
}: {
  alertThreshold: number;
  onAlertThresholdChange: (val: number) => void;
  router: ReturnType<typeof useRouter>;
  credits: number;
}) {
  const adminConfigQuery = trpc.whatsappPro.getAdminConfig.useQuery();
  const costPerMessage = adminConfigQuery.data?.costPerMessage ?? 0.05;

  return (
    <View style={styles.creditsPanel}>
      <View style={styles.creditsPanelRow}>
        <Text style={styles.creditsPanelLabel}>Coste por envío</Text>
        {adminConfigQuery.isLoading ? (
          <ActivityIndicator size="small" color="#059669" />
        ) : (
          <Text style={styles.creditsPanelValue}>{costPerMessage.toFixed(4)}€</Text>
        )}
      </View>
      <View style={styles.creditsPanelRow}>
        <Text style={styles.creditsPanelLabel}>Envíos disponibles</Text>
        <Text style={[styles.creditsPanelValue, credits < 10 ? { color: '#ef4444' } : {}]}>
          {credits} envíos
        </Text>
      </View>
      <View style={styles.creditsPanelDivider} />
      <View style={styles.creditsAlertRow}>
        <Text style={styles.creditsAlertLabel}>Alertarme cuando queden</Text>
        <TextInput
          style={styles.creditsAlertInput}
          value={String(alertThreshold)}
          onChangeText={(text) => onAlertThresholdChange(parseInt(text) || 0)}
          keyboardType="number-pad"
          placeholder="10"
          placeholderTextColor="#86efac"
        />
        <Text style={styles.creditsPanelLabel}>envíos</Text>
      </View>
      <TouchableOpacity
        style={styles.rechargeButton}
        onPress={() => router.push('/restaurant/whatsapp-credits' as any)}
        activeOpacity={0.8}
      >
        <CreditCard size={16} color="#fff" strokeWidth={2.5} />
        <Text style={styles.rechargeButtonText}>Recargar Saldo</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RestaurantConfigProScreen() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  useEffect(() => {
    const loadRestaurantId = async () => {
      const id = await getRestaurantId();
      if (id) {
        setRestaurantId(id);
      }
    };
    void loadRestaurantId();
  }, []);

  const restaurantsQuery = trpc.restaurants.list.useQuery({});
  const restaurantData = restaurantsQuery.data?.find((r: any) => r.id === restaurantId);
  const updateMutation = trpc.restaurants.update.useMutation({
    onSuccess: async () => {
      console.log('✅ [CONFIG PRO] Mutación exitosa');
      try {
        await restaurantsQuery.refetch();
      } catch (e) {
        console.error('❌ [CONFIG PRO] Error refrescando datos:', e);
      }
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.replace('/restaurant/dashboard' as any);
      }, 1500);
    },
    onError: (error: any) => {
      console.error('❌ [CONFIG PRO] Error en mutación:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar la configuración');
    },
  });

  const [advanceBookingDays, setAdvanceBookingDays] = useState<number>(0);
  const [notificationPhones, setNotificationPhones] = useState<string[]>([]);
  const [notificationEmail, setNotificationEmail] = useState<string>('');
  const [whatsappCustomMessage, setWhatsappCustomMessage] = useState<string>('');
  const [autoSendWhatsapp, setAutoSendWhatsapp] = useState<boolean>(false);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [newPhone, setNewPhone] = useState<string>('');
  const [newPhonePrefix, setNewPhonePrefix] = useState<string>(DEFAULT_PREFIX);
  const [showPhonePrefixModal, setShowPhonePrefixModal] = useState<boolean>(false);
  const [phonePrefixSearch, setPhonePrefixSearch] = useState<string>('');
  const [tableRotationTime, setTableRotationTime] = useState<string>('100');
  const [minBookingAdvanceMinutes, setMinBookingAdvanceMinutes] = useState<number>(0);
  const [minModifyCancelMinutes, setMinModifyCancelMinutes] = useState<number>(180);
  const [useWhatsappWeb, setUseWhatsappWeb] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [whatsappType, setWhatsappType] = useState<'free' | 'paid'>('free');
  const [whatsappProAlertThreshold, setWhatsappProAlertThreshold] = useState<number>(0);
  const initialDataLoaded = React.useRef(false);
  const [enableEmailNotifications, setEnableEmailNotifications] = useState<boolean>(false);
  const [reminder1Enabled, setReminder1Enabled] = useState<boolean>(false);
  const [reminder1Hours, setReminder1Hours] = useState<number>(24);
  const [reminder2Enabled, setReminder2Enabled] = useState<boolean>(false);
  const [reminder2Minutes, setReminder2Minutes] = useState<number>(60);
  const [importantMessageEnabled, setImportantMessageEnabled] = useState<boolean>(false);
  const [importantMessage, setImportantMessage] = useState<string>('');

  useEffect(() => {
    if (restaurantData && !initialDataLoaded.current) {
      initialDataLoaded.current = true;
      console.log('🔄 [CONFIG PRO] Carga inicial desde restaurantData:', restaurantData);
      setAdvanceBookingDays(restaurantData.advanceBookingDays || 0);
      setNotificationPhones(restaurantData.notificationPhones || []);
      setNotificationEmail(restaurantData.notificationEmail || '');
      setWhatsappCustomMessage(restaurantData.whatsappCustomMessage || '');
      setAutoSendWhatsapp(restaurantData.autoSendWhatsapp === true);
      setCustomLinks(restaurantData.customLinks || []);
      setTableRotationTime(String(restaurantData.tableRotationTime ?? 100));
      setMinBookingAdvanceMinutes(restaurantData.minBookingAdvanceMinutes || 0);
      setMinModifyCancelMinutes(restaurantData.minModifyCancelMinutes || 180);
      setUseWhatsappWeb(restaurantData.useWhatsappWeb === true);
      setWhatsappType((restaurantData.whatsappType as 'free' | 'paid') || 'free');
      setWhatsappProAlertThreshold(restaurantData.whatsappProAlertThreshold || 0);
      setEnableEmailNotifications(restaurantData.enableEmailNotifications === true);
      setReminder1Enabled(restaurantData.reminder1Enabled === true);
      setReminder1Hours(restaurantData.reminder1Hours || 24);
      setReminder2Enabled(restaurantData.reminder2Enabled === true);
      setReminder2Minutes(restaurantData.reminder2Minutes || 60);
      setImportantMessageEnabled(restaurantData.importantMessageEnabled === true);
      setImportantMessage(restaurantData.importantMessage || '');
    }
  }, [restaurantData]);

  const handleSave = async () => {
    if (!restaurantId) {
      Alert.alert('Error', 'No se pudo identificar el restaurante');
      return;
    }

    const rotationValue = tableRotationTime === '' ? 0 : Number(tableRotationTime);
    if (isNaN(rotationValue) || rotationValue < 0) {
      Alert.alert('Error', 'El tiempo de rotación debe ser un número válido');
      return;
    }

    const minAdvanceValue = Number(minBookingAdvanceMinutes);
    if (isNaN(minAdvanceValue) || minAdvanceValue < 0) {
      Alert.alert('Error', 'El tiempo mínimo de anticipación debe ser un número válido');
      return;
    }

    const minModifyValue = Number(minModifyCancelMinutes);
    if (isNaN(minModifyValue) || minModifyValue < 0) {
      Alert.alert('Error', 'El tiempo mínimo de modificación/cancelación debe ser un número válido');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: restaurantId,
        advanceBookingDays: Number(advanceBookingDays) || 0,
        notificationPhones,
        notificationEmail: notificationEmail || undefined,
        whatsappCustomMessage: whatsappCustomMessage || undefined,
        autoSendWhatsapp,
        customLinks,
        tableRotationTime: rotationValue,
        minBookingAdvanceMinutes: minAdvanceValue,
        minModifyCancelMinutes: minModifyValue,
        useWhatsappWeb: useWhatsappWeb,
        whatsappType,
        whatsappProAlertThreshold: Number(whatsappProAlertThreshold) || 0,
        enableEmailNotifications,
        reminder1Enabled,
        reminder1Hours: Number(reminder1Hours) || 24,
        reminder2Enabled,
        reminder2Minutes: Number(reminder2Minutes) || 60,
        importantMessageEnabled,
        importantMessage: importantMessage ?? '',
      });
    } catch (error: any) {
      console.error('❌ [CONFIG PRO] Error al guardar:', error);
      Alert.alert('Error', error?.message || 'No se pudo guardar la configuración');
    }
  };

  const filteredPhonePrefixes = useMemo(() => {
    if (!phonePrefixSearch.trim()) return PHONE_PREFIXES;
    const q = phonePrefixSearch.toLowerCase();
    return PHONE_PREFIXES.filter(
      (p: PhonePrefix) => p.country.toLowerCase().includes(q) || p.code.includes(q)
    );
  }, [phonePrefixSearch]);

  const handleAddPhone = () => {
    if (newPhone.trim()) {
      const fullPhone = newPhonePrefix + newPhone.trim();
      setNotificationPhones([...notificationPhones, fullPhone]);
      setNewPhone('');
    }
  };

  const handleRemovePhone = (index: number) => {
    setNotificationPhones(notificationPhones.filter((_, i) => i !== index));
  };

  if (restaurantsQuery.isLoading || !restaurantId) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Configuración Pro',
            headerStyle: { backgroundColor: '#8b5cf6' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' as const },
          }}
        />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Configuración Pro',
          headerStyle: { backgroundColor: '#8b5cf6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.proHeader}>
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.proHeaderGradient}
            >
              <Text style={styles.proHeaderTitle}>Configuración Avanzada</Text>
              <Text style={styles.proHeaderSubtitle}>
                Funciones exclusivas para tu plan premium
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Phone size={20} color="#8b5cf6" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Teléfonos de Contacto</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Números de WhatsApp que recibirán notificaciones automáticas con los datos de la reserva: Día - Hora - Nombre - Teléfono - Ubicación - Mesa - Comensales (adultos - tronas). Solo se incluyen carritos y tronas si el usuario los solicita.
            </Text>

            {notificationPhones.map((phone, index) => (
              <View key={index} style={styles.phoneItem}>
                <Text style={styles.phoneText}>{phone}</Text>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => handleRemovePhone(index)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addPhoneContainer}>
              <TouchableOpacity
                style={styles.phonePrefixSelector}
                onPress={() => {
                  setPhonePrefixSearch('');
                  setShowPhonePrefixModal(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.phonePrefixText}>{newPhonePrefix}</Text>
                <ChevronDown size={14} color="#64748b" />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="666123456"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddPhone}
                activeOpacity={0.7}
              >
                <Plus size={18} color="#fff" strokeWidth={2.5} />
                <Text style={styles.addButtonText}>Añadir</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Mail size={20} color="#8b5cf6" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Notificaciones por Email</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Configura si deseas recibir notificaciones de nuevas reservas por email
            </Text>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Activar Notificaciones por Email</Text>
                <Text style={styles.switchDescription}>
                  Recibirás un email cada vez que se cree una nueva reserva
                </Text>
              </View>
              <Switch
                value={enableEmailNotifications}
                onValueChange={(value) => {
                  setEnableEmailNotifications(value);
                }}
                trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                thumbColor={enableEmailNotifications ? '#fff' : '#f1f5f9'}
              />
            </View>

            {enableEmailNotifications && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email de Notificaciones</Text>
                <Text style={styles.sectionSubtitle}>
                  Email donde recibirás las notificaciones (opcional, usa el email del restaurante por defecto)
                </Text>
                <TextInput
                  style={styles.input}
                  value={notificationEmail}
                  onChangeText={setNotificationEmail}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Mail size={20} color="#8b5cf6" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Notificaciones WhatsApp</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Elige cómo enviar las notificaciones de WhatsApp a tus clientes
            </Text>

            <TouchableOpacity
              style={[
                styles.whatsappOptionCard,
                whatsappType === 'free' && styles.whatsappOptionCardActive,
              ]}
              onPress={() => setWhatsappType('free')}
              activeOpacity={0.8}
            >
              <View style={styles.whatsappOptionHeader}>
                <View style={[styles.whatsappOptionRadio, whatsappType === 'free' && styles.whatsappOptionRadioActive]}>
                  {whatsappType === 'free' && <View style={styles.whatsappOptionRadioDot} />}
                </View>
                <View style={styles.whatsappOptionTitleBlock}>
                  <Text style={[styles.whatsappOptionTitle, whatsappType === 'free' && styles.whatsappOptionTitleActive]}>Opción Gratuita</Text>
                  <Text style={styles.whatsappOptionBadge}>WhatsApp Web propio</Text>
                </View>
              </View>
              <Text style={styles.whatsappOptionDesc}>
                Conecta tu propio WhatsApp para enviar notificaciones. Sin coste adicional por envío.
              </Text>
            </TouchableOpacity>

            {whatsappType === 'free' && (
              <View style={styles.whatsappOptionContent}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchTitle}>Conectar WhatsApp Web</Text>
                    <Text style={styles.switchDescription}>
                      Vincula tu número de WhatsApp. Recibirás un código QR para escanear.
                    </Text>
                  </View>
                  <Switch
                    value={useWhatsappWeb}
                    onValueChange={setUseWhatsappWeb}
                    trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                    thumbColor={useWhatsappWeb ? '#fff' : '#f1f5f9'}
                  />
                </View>
                {useWhatsappWeb && (
                  <>
                    <TouchableOpacity
                      style={styles.qrButton}
                      onPress={() => setShowQrModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.qrButtonText}>📱 Ver Código QR para Conectar</Text>
                    </TouchableOpacity>
                    <View style={styles.switchRow}>
                      <View style={styles.switchInfo}>
                        <Text style={styles.switchTitle}>Envío Automático de WhatsApp</Text>
                        <Text style={styles.switchDescription}>
                          Envía confirmaciones automáticas al cliente cuando se crea una reserva
                        </Text>
                      </View>
                      <Switch
                        value={autoSendWhatsapp}
                        onValueChange={setAutoSendWhatsapp}
                        trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                        thumbColor={autoSendWhatsapp ? '#fff' : '#f1f5f9'}
                      />
                    </View>
                  </>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.whatsappOptionCard,
                whatsappType === 'paid' && styles.whatsappOptionCardPaidActive,
              ]}
              onPress={() => setWhatsappType('paid')}
              activeOpacity={0.8}
            >
              <View style={styles.whatsappOptionHeader}>
                <View style={[styles.whatsappOptionRadio, whatsappType === 'paid' && styles.whatsappOptionRadioPaidActive]}>
                  {whatsappType === 'paid' && <View style={styles.whatsappOptionRadioDotPaid} />}
                </View>
                <View style={styles.whatsappOptionTitleBlock}>
                  <Text style={[styles.whatsappOptionTitle, whatsappType === 'paid' && styles.whatsappOptionTitlePaidActive]}>Opción de Pago</Text>
                  <Text style={[styles.whatsappOptionBadge, styles.whatsappOptionBadgePaid]}>Número de la plataforma</Text>
                </View>
                <CreditCard size={20} color={whatsappType === 'paid' ? '#059669' : '#94a3b8'} strokeWidth={2} />
              </View>
              <Text style={styles.whatsappOptionDesc}>
                Los mensajes se envían desde el número oficial de la plataforma. Se descuentan créditos por cada envío.
              </Text>
            </TouchableOpacity>

            {whatsappType === 'paid' && (
              <>
                <WhatsappProCreditsPanel
                  credits={restaurantData?.whatsappProCredits ?? 0}
                  alertThreshold={whatsappProAlertThreshold}
                  onAlertThresholdChange={setWhatsappProAlertThreshold}
                  router={router}
                />
                <View style={styles.whatsappOptionContent}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchInfo}>
                      <Text style={styles.switchTitle}>También conectar WhatsApp Web</Text>
                      <Text style={styles.switchDescription}>
                        Activa también tu WhatsApp personal para contactar clientes desde el botón "WhatsApp" en las reservas (escaneo de QR).
                      </Text>
                    </View>
                    <Switch
                      value={useWhatsappWeb}
                      onValueChange={setUseWhatsappWeb}
                      trackColor={{ false: '#cbd5e1', true: '#059669' }}
                      thumbColor={useWhatsappWeb ? '#fff' : '#f1f5f9'}
                    />
                  </View>
                  {useWhatsappWeb && (
                    <TouchableOpacity
                      style={styles.qrButton}
                      onPress={() => setShowQrModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.qrButtonText}>📱 Ver Código QR para Conectar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mensaje Personalizado WhatsApp</Text>
              <Text style={styles.sectionSubtitle}>
                Texto adicional que se enviará al cliente en el WhatsApp que confirma su reserva
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={whatsappCustomMessage}
                onChangeText={setWhatsappCustomMessage}
                placeholder="Ej: Les ruego puntualidad, las reservas se cancelan a los 10 min de la hora acordada. Un saludo."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.reminderSection}>
              <View style={styles.reminderHeader}>
                <Bell size={18} color="#8b5cf6" strokeWidth={2.5} />
                <Text style={styles.reminderTitle}>Recordatorios de Reserva</Text>
              </View>

              <View style={styles.reminderItem}>
                <View style={styles.reminderHeaderRow}>
                  <Text style={styles.reminderLabel}>Envío de WhatsApp recordando la reserva 1</Text>
                  <Switch
                    value={reminder1Enabled}
                    onValueChange={setReminder1Enabled}
                    trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                    thumbColor={reminder1Enabled ? '#fff' : '#f1f5f9'}
                  />
                </View>
                <Text style={styles.reminderSubtext}>
                  Cuantas horas antes se le envía el recordatorio:
                </Text>
                <TextInput
                  style={styles.input}
                  value={String(reminder1Hours)}
                  onChangeText={(text) => {
                    const num = text === '' ? 0 : parseInt(text);
                    setReminder1Hours(isNaN(num) ? 24 : num);
                  }}
                  placeholder="24"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  editable={reminder1Enabled}
                />
                <Text style={styles.reminderMessage}>
                  Texto que se enviará: Hola [nombre], le recordamos que tiene una reserva el [día] a las [hora], si lo desea puede modificar esta reserva desde el mensaje anterior que ha recibido confirmando la reserva. Quedamos a su disposición para solucionar cualquier duda. Un saludo. [nombre del restaurante]
                </Text>
              </View>

              <View style={styles.reminderItem}>
                <View style={styles.reminderHeaderRow}>
                  <Text style={styles.reminderLabel}>Envío de WhatsApp recordando la reserva 2</Text>
                  <Switch
                    value={reminder2Enabled}
                    onValueChange={setReminder2Enabled}
                    trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                    thumbColor={reminder2Enabled ? '#fff' : '#f1f5f9'}
                  />
                </View>
                <Text style={styles.reminderSubtext}>
                  Cuantos minutos antes se le envía el recordatorio:
                </Text>
                <TextInput
                  style={styles.input}
                  value={String(reminder2Minutes)}
                  onChangeText={(text) => {
                    const num = text === '' ? 0 : parseInt(text);
                    setReminder2Minutes(isNaN(num) ? 60 : num);
                  }}
                  placeholder="60"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  editable={reminder2Enabled}
                />
                <Text style={styles.reminderMessage}>
                  Texto que se enviará: Hola [nombre], le recordamos que tiene una reserva el [día] a las [hora], le rogamos puntualidad. Un saludo. [nombre del restaurante]
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={20} color="#8b5cf6" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Configuración de Reservas</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Días de Antelación para Reservas</Text>
              <Text style={styles.sectionSubtitle}>
                Con cuántos días de antelación los clientes pueden hacer reservas
              </Text>
              <TextInput
                style={styles.input}
                value={advanceBookingDays > 0 ? String(advanceBookingDays) : ''}
                onChangeText={(text) => setAdvanceBookingDays(parseInt(text) || 0)}
                placeholder="Ej: 30"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tiempo Rotación de Mesas (minutos)</Text>
              <Text style={styles.sectionSubtitle}>
                Tiempo mínimo entre reservas para la misma mesa. Valor por defecto: 100 minutos
              </Text>
              <TextInput
                style={styles.input}
                value={tableRotationTime}
                onChangeText={(text) => setTableRotationTime(text.replace(/[^0-9]/g, ''))}
                placeholder="100"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tiempo Mínimo de Anticipación (minutos)</Text>
              <Text style={styles.sectionSubtitle}>
                Tiempo mínimo en minutos que los clientes deben reservar con anticipación. Ejemplo: si pones 30, los clientes no podrán reservar con menos de 30 minutos de anticipación a la hora de la reserva.
              </Text>
              <TextInput
                style={styles.input}
                value={String(minBookingAdvanceMinutes)}
                onChangeText={(text) => setMinBookingAdvanceMinutes(parseInt(text) || 0)}
                placeholder="30"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tiempo Mínimo de Modificación / Cancelación (minutos)</Text>
              <Text style={styles.sectionSubtitle}>
                Tiempo mínimo para que los clientes puedan modificar o anular desde su mensaje de confirmación. Después para cualquier cambio tendrán que contactar con el restaurante. Ejemplo: si pones 120, los clientes no podrán hacer cambios con menos de 2 horas de anticipación a la hora de la reserva.
              </Text>
              <TextInput
                style={styles.input}
                value={String(minModifyCancelMinutes)}
                onChangeText={(text) => setMinModifyCancelMinutes(parseInt(text) || 180)}
                placeholder="180"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <LinkIcon size={20} color="#8b5cf6" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Enlaces Personalizados</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Agrega enlaces a tu carta, menú, etc. que verán los clientes al reservar
            </Text>

            {customLinks.map((link, index) => (
              <View key={index} style={styles.linkItem}>
                <View style={styles.linkHeader}>
                  <Text style={styles.linkNumber}>Enlace {index + 1}</Text>
                  <View style={styles.linkActions}>
                    <View style={styles.switchContainer}>
                      <Text style={styles.switchLabel}>
                        {link.enabled ? 'Habilitado' : 'Deshabilitado'}
                      </Text>
                      <Switch
                        value={link.enabled}
                        onValueChange={(value) => {
                          const updated = [...customLinks];
                          updated[index] = { ...updated[index], enabled: value };
                          setCustomLinks(updated);
                        }}
                        trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                        thumbColor={link.enabled ? '#fff' : '#f1f5f9'}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.deleteLinkButton}
                      onPress={() => {
                        setCustomLinks(customLinks.filter((_, i) => i !== index));
                      }}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={18} color="#ef4444" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.linkFormGroup}>
                  <Text style={styles.linkLabel}>Nombre del Botón</Text>
                  <TextInput
                    style={styles.input}
                    value={link.buttonText}
                    onChangeText={(text) => {
                      const updated = [...customLinks];
                      updated[index] = { ...updated[index], buttonText: text };
                      setCustomLinks(updated);
                    }}
                    placeholder="Ej: Carta de comida"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.linkFormGroup}>
                  <Text style={styles.linkLabel}>URL</Text>
                  <TextInput
                    style={styles.input}
                    value={link.url}
                    onChangeText={(text) => {
                      const updated = [...customLinks];
                      updated[index] = { ...updated[index], url: text };
                      setCustomLinks(updated);
                    }}
                    placeholder="https://ejemplo.com/carta.pdf"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addLinkButton}
              onPress={() => {
                setCustomLinks([...customLinks, { url: '', buttonText: '', enabled: true }]);
              }}
              activeOpacity={0.7}
            >
              <Plus size={20} color="#8b5cf6" strokeWidth={2.5} />
              <Text style={styles.addLinkText}>Agregar Enlace</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={20} color="#ef4444" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Mensaje Importante</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Muestra un mensaje destacado en rojo y negrita en el buscador de reservas, debajo de los enlaces. Ideal para avisos como "Cerrado por Vacaciones".
            </Text>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Activar Mensaje Importante</Text>
                <Text style={styles.switchDescription}>
                  El mensaje se mostrará de forma destacada a los clientes
                </Text>
              </View>
              <Switch
                value={importantMessageEnabled}
                onValueChange={setImportantMessageEnabled}
                trackColor={{ false: '#cbd5e1', true: '#ef4444' }}
                thumbColor={importantMessageEnabled ? '#fff' : '#f1f5f9'}
              />
            </View>

            {importantMessageEnabled && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Texto del Mensaje</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={importantMessage}
                  onChangeText={setImportantMessage}
                  placeholder="Ej: Cerrado por Vacaciones del 1 al 15 de Agosto"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {importantMessage.trim().length > 0 && (
                  <View style={styles.importantMessagePreview}>
                    <Text style={styles.importantMessagePreviewLabel}>Vista previa:</Text>
                    <Text style={styles.importantMessagePreviewText}>{importantMessage}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={updateMutation.isPending}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.saveGradient}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={20} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.saveText}>Guardar Cambios</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => {}}>
          <View style={styles.successOverlay}>
            <View style={styles.successContent}>
              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
              <Text style={styles.successTitle}>¡Guardado!</Text>
              <Text style={styles.successText}>Configuración guardada correctamente</Text>
            </View>
          </View>
        </Modal>

        <WhatsAppQrModal
          visible={showQrModal}
          onClose={() => setShowQrModal(false)}
          restaurantId={restaurantId}
        />

        <Modal
          visible={showPhonePrefixModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPhonePrefixModal(false)}
        >
          <View style={styles.prefixModalOverlay}>
            <View style={styles.prefixModalContainer}>
              <View style={styles.prefixModalHeader}>
                <Text style={styles.prefixModalTitle}>Seleccionar prefijo</Text>
                <TouchableOpacity onPress={() => setShowPhonePrefixModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={styles.prefixSearchBar}>
                <Search size={16} color="#94a3b8" />
                <TextInput
                  style={styles.prefixSearchInput}
                  value={phonePrefixSearch}
                  onChangeText={setPhonePrefixSearch}
                  placeholder="Buscar país o código..."
                  placeholderTextColor="#94a3b8"
                  autoFocus
                />
                {phonePrefixSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPhonePrefixSearch('')} activeOpacity={0.7}>
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={filteredPhonePrefixes}
                keyExtractor={(item: PhonePrefix, index: number) => `${item.code}-${item.country}-${index}`}
                style={styles.prefixListScroll}
                renderItem={({ item }: { item: PhonePrefix }) => (
                  <TouchableOpacity
                    style={[
                      styles.prefixOptionItem,
                      newPhonePrefix === item.code && styles.prefixOptionItemSelected,
                    ]}
                    onPress={() => {
                      setNewPhonePrefix(item.code);
                      setShowPhonePrefixModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.prefixOptionFlag}>{item.flag}</Text>
                    <View style={styles.prefixOptionInfo}>
                      <Text style={styles.prefixOptionCountry}>{item.country}</Text>
                      <Text style={styles.prefixOptionCode}>{item.code}</Text>
                    </View>
                    {newPhonePrefix === item.code && (
                      <Text style={styles.prefixOptionCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

function WhatsAppQrModal({ visible, onClose, restaurantId }: { visible: boolean; onClose: () => void; restaurantId: string }) {
  const [loadingSeconds, setLoadingSeconds] = React.useState(0);
  const [confirmAction, setConfirmAction] = React.useState<'reset' | 'disconnect' | null>(null);
  const [resetSuccess, setResetSuccess] = React.useState(false);
  const [resetError, setResetError] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const qrQuery = trpc.whatsapp.getQr.useQuery(
    { restaurantId },
    { enabled: visible && !!restaurantId, refetchInterval: 5000 }
  );
  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => {
      setLoadingSeconds(0);
      setConfirmAction(null);
      void qrQuery.refetch();
    },
    onError: () => {
      setConfirmAction(null);
    },
  });
  const forceResetMutation = trpc.whatsapp.forceReset.useMutation({
    onSuccess: () => {
      setLoadingSeconds(0);
      setConfirmAction(null);
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        void qrQuery.refetch();
      }, 2500);
    },
    onError: () => {
      setConfirmAction(null);
      setResetError(true);
      setTimeout(() => setResetError(false), 3000);
    },
  });

  React.useEffect(() => {
    if (!visible) {
      setLoadingSeconds(0);
      setConfirmAction(null);
      setResetSuccess(false);
      setResetError(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const isConnected = qrQuery.data?.isReady === true;
    const hasQr = !!qrQuery.data?.qrCode;
    if (isConnected || hasQr) {
      setLoadingSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setLoadingSeconds(s => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, qrQuery.data?.isReady, qrQuery.data?.qrCode]);

  const handleDisconnect = () => setConfirmAction('disconnect');
  const handleForceReset = () => setConfirmAction('reset');

  const handleConfirm = () => {
    if (confirmAction === 'reset') {
      forceResetMutation.mutate({ restaurantId });
    } else if (confirmAction === 'disconnect') {
      disconnectMutation.mutate({ restaurantId });
    }
  };

  const isConnected = qrQuery.data?.isReady === true;
  const isInitializing = qrQuery.data?.isInitializing === true;
  const hasQr = !!qrQuery.data?.qrCode;
  const isMutating = disconnectMutation.isPending || forceResetMutation.isPending;
  const isStuck = loadingSeconds >= 60;

  const renderConfirmPanel = () => {
    const isReset = confirmAction === 'reset';
    return (
      <View style={qrModalStyles.confirmPanel}>
        <Text style={qrModalStyles.confirmTitle}>
          {isReset ? '🔄 Cambiar número de WhatsApp' : '⚠️ Desconectar WhatsApp'}
        </Text>
        <Text style={qrModalStyles.confirmText}>
          {isReset
            ? 'Esto desvinculará el WhatsApp actual y eliminará la sesión guardada. Tendrás que escanear un nuevo código QR para vincular otro número.\n\nCada restaurante tiene su propia sesión independiente.'
            : '¿Estás seguro de que quieres desconectar tu WhatsApp? Se desvinculará el número actual.'}
        </Text>
        <TouchableOpacity
          style={[qrModalStyles.confirmBtn, { backgroundColor: '#EF4444' }]}
          onPress={handleConfirm}
          activeOpacity={0.8}
          disabled={isMutating}
        >
          {isMutating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={qrModalStyles.confirmBtnText}>
              {isReset ? '✓ Sí, desvincular y cambiar' : '✓ Sí, desconectar'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={qrModalStyles.cancelBtn}
          onPress={() => setConfirmAction(null)}
          activeOpacity={0.7}
          disabled={isMutating}
        >
          <Text style={qrModalStyles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMainContent = () => {
    if (resetSuccess) {
      return (
        <View style={styles.qrLoading}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
          <Text style={[styles.qrLoadingText, { color: '#10b981', fontWeight: '700' as const }]}>¡Sesión reiniciada!</Text>
          <Text style={styles.qrLoadingSubtext}>En unos segundos aparecerá el código QR para vincular un nuevo número.</Text>
        </View>
      );
    }
    if (resetError) {
      return (
        <View style={styles.qrLoading}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>❌</Text>
          <Text style={[styles.qrLoadingText, { color: '#EF4444', fontWeight: '700' as const }]}>Error al reiniciar</Text>
          <Text style={styles.qrLoadingSubtext}>No se pudo reiniciar la sesión. Inténtalo de nuevo.</Text>
        </View>
      );
    }
    if (isMutating) {
      return (
        <View style={styles.qrLoading}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.qrLoadingText}>Procesando...</Text>
        </View>
      );
    }
    if (qrQuery.isLoading) {
      return (
        <View style={styles.qrLoading}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.qrLoadingText}>Generando código QR...</Text>
        </View>
      );
    }
    if (isConnected) {
      return (
        <View style={styles.qrConnected}>
          <Text style={styles.qrConnectedTitle}>✅ WhatsApp Conectado</Text>
          <Text style={styles.qrConnectedText}>
            Tu WhatsApp está conectado y listo para enviar notificaciones automáticas desde este restaurante.
          </Text>
          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect} activeOpacity={0.7}>
            <Text style={styles.disconnectButtonText}>Desconectar WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.forceResetButton} onPress={handleForceReset} activeOpacity={0.7}>
            <Text style={styles.forceResetButtonText}>🔄 Cambiar Número de WhatsApp</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (hasQr) {
      return (
        <View style={styles.qrContainer}>
          <Image source={{ uri: qrQuery.data!.qrCode }} style={styles.qrImage} />
          <Text style={styles.qrInstructions}>
            {'1. Abre WhatsApp en tu teléfono\n'}
            {'2. Ve a Configuración → Dispositivos vinculados\n'}
            {'3. Toca "Vincular un dispositivo"\n'}
            {'4. Escanea este código QR'}
          </Text>
          <TouchableOpacity style={styles.forceResetButton} onPress={handleForceReset} activeOpacity={0.7}>
            <Text style={styles.forceResetButtonText}>🔄 Vincular Otro Número</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.qrLoading}>
        {!isStuck && <ActivityIndicator size="large" color="#8b5cf6" />}
        {isStuck ? (
          <Text style={[styles.qrLoadingText, { color: '#EF4444', marginBottom: 8 }]}>⚠️ El proceso tardó demasiado</Text>
        ) : (
          <Text style={styles.qrLoadingText}>
            {isInitializing ? 'Inicializando WhatsApp Web...' : 'Conectando con WhatsApp Web...'}
          </Text>
        )}
        {loadingSeconds > 0 && !isStuck && (
          <Text style={[styles.qrLoadingText, { marginTop: 4, fontSize: 12 }]}>{loadingSeconds}s...</Text>
        )}
        <Text style={styles.qrLoadingSubtext}>
          {isStuck
            ? 'Pulsa el botón para reiniciar la sesión y volver a vincular un número.'
            : 'Este proceso puede tardar hasta 2 minutos. Si lleva demasiado tiempo, pulsa el botón de abajo.'}
        </Text>
        <TouchableOpacity
          style={[styles.forceResetButton, { marginTop: 16 }, isStuck && { backgroundColor: '#EF4444' }]}
          onPress={handleForceReset}
          activeOpacity={0.7}
        >
          <Text style={[styles.forceResetButtonText, isStuck && { color: '#fff' }]}>
            🔄 {isStuck ? 'Reiniciar Sesión WhatsApp' : 'Reiniciar y Cambiar Número'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>WhatsApp Web</Text>
          <Text style={[styles.qrLoadingText, { marginTop: 0, marginBottom: 8, color: '#8b5cf6', fontSize: 12 }]}>Sesión exclusiva para este restaurante</Text>

          {confirmAction ? renderConfirmPanel() : renderMainContent()}

          {!confirmAction && (
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const qrModalStyles = StyleSheet.create({
  confirmPanel: {
    paddingVertical: 16,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  confirmText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  proHeader: {
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
  proHeaderGradient: {
    padding: 24,
    alignItems: 'center',
  },
  proHeaderTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  proHeaderSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  phoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500' as const,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 20,
    color: '#ef4444',
    fontWeight: '700' as const,
  },
  addPhoneContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  phoneInput: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  linkItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  linkNumber: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  linkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600' as const,
  },
  deleteLinkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkFormGroup: {
    marginBottom: 12,
  },
  linkLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#475569',
    marginBottom: 6,
  },
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f5f3ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c4b5fd',
    borderStyle: 'dashed',
  },
  addLinkText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#8b5cf6',
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  qrButton: {
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  reminderSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  reminderItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reminderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0f172a',
    flex: 1,
  },
  reminderSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  reminderMessage: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  qrLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrImage: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  qrInstructions: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    textAlign: 'left',
  },
  qrConnected: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrConnectedTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#10b981',
    marginBottom: 12,
  },
  qrConnectedText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  disconnectButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  disconnectButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  forceResetButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  forceResetButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  qrLoadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center' as const,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  modalCloseButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  modalCloseButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  phonePrefixSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  phonePrefixText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  prefixModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  prefixModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '75%',
  },
  prefixModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  prefixModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  prefixSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  prefixSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  prefixListScroll: {
    maxHeight: 400,
  },
  prefixOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  prefixOptionItemSelected: {
    backgroundColor: '#f5f3ff',
  },
  prefixOptionFlag: {
    fontSize: 22,
  },
  prefixOptionInfo: {
    flex: 1,
  },
  prefixOptionCountry: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#0f172a',
  },
  prefixOptionCode: {
    fontSize: 13,
    color: '#64748b',
  },
  prefixOptionCheckmark: {
    fontSize: 18,
    color: '#8b5cf6',
    fontWeight: '700' as const,
  },
  importantMessagePreview: {
    marginTop: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
  },
  importantMessagePreviewLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  importantMessagePreviewText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#dc2626',
    lineHeight: 22,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  successContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center' as const,
    minWidth: 260,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  successIconText: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '700' as const,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  successText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center' as const,
  },
  whatsappOptionCard: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  whatsappOptionCardActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#faf5ff',
  },
  whatsappOptionCardPaidActive: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  whatsappOptionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 6,
  },
  whatsappOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  whatsappOptionRadioActive: {
    borderColor: '#8b5cf6',
  },
  whatsappOptionRadioPaidActive: {
    borderColor: '#059669',
  },
  whatsappOptionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8b5cf6',
  },
  whatsappOptionRadioDotPaid: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  whatsappOptionTitleBlock: {
    flex: 1,
  },
  whatsappOptionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  whatsappOptionTitleActive: {
    color: '#7c3aed',
  },
  whatsappOptionTitlePaidActive: {
    color: '#059669',
  },
  whatsappOptionBadge: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500' as const,
    marginTop: 1,
  },
  whatsappOptionBadgePaid: {
    color: '#059669',
  },
  whatsappOptionDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginLeft: 30,
  },
  whatsappOptionContent: {
    marginHorizontal: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: '#faf5ff',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  creditsPanel: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginHorizontal: 4,
  },
  creditsPanelRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  creditsPanelLabel: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500' as const,
  },
  creditsPanelValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#059669',
  },
  creditsPanelDivider: {
    height: 1,
    backgroundColor: '#bbf7d0',
    marginVertical: 10,
  },
  creditsAlertRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 10,
  },
  creditsAlertLabel: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500' as const,
    flex: 1,
  },
  creditsAlertInput: {
    width: 80,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#0f172a',
    textAlign: 'center' as const,
  },
  rechargeButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  rechargeButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
