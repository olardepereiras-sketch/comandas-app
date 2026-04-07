import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, PhoneCall, QrCode, LogOut, Send, Users, Building2 } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';

export default function AdminWhatsAppScreen() {
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [contactType, setContactType] = useState<'user' | 'restaurant'>('user');

  const [qrData, setQrData] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);

  const generateQrMutation = trpc.whatsapp.adminGetQr.useMutation({
    onSuccess: (data) => {
      console.log('[WhatsApp Admin] QR generado:', data);
      setQrData(data);
      if (data.isInitializing || data.qrCode) {
        setIsPolling(true);
      }
    },
    onError: (error) => {
      console.error('[WhatsApp Admin] Error:', error);
      Alert.alert('Error', 'No se pudo generar el código QR. Verifica que el servidor esté funcionando.');
    },
  });

  const statusQuery = trpc.whatsapp.adminGetQr.useMutation();

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const status = await statusQuery.mutateAsync();
        setQrData(status);
        
        if (status.isReady || status.authenticated) {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('[WhatsApp Admin] Error polling:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPolling]);

  useEffect(() => {
    generateQrMutation.mutate();
  }, []);

  const disconnectMutation = trpc.whatsapp.adminDisconnect.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'WhatsApp Web desconectado correctamente');
      setQrData(null);
      setIsPolling(false);
      setTimeout(() => {
        generateQrMutation.mutate();
      }, 1000);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const sendMessageMutation = trpc.whatsapp.adminSendMessage.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Mensaje enviado correctamente');
      setMessage('');
      setPhoneNumber('');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'No se pudo enviar el mensaje');
    },
  });

  const handleDisconnect = () => {
    Alert.alert(
      'Desconectar WhatsApp',
      '¿Estás seguro de que deseas desconectar WhatsApp Web? Tendrás que escanear el código QR nuevamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Desconectar', 
          style: 'destructive',
          onPress: () => disconnectMutation.mutate()
        },
      ]
    );
  };

  const handleSendMessage = () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Por favor ingresa un número de teléfono');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Por favor ingresa un mensaje');
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    
    let fullPhone = cleanPhone;
    if (!cleanPhone.startsWith('34') && cleanPhone.length === 9) {
      fullPhone = '34' + cleanPhone;
    }

    sendMessageMutation.mutate({
      to: fullPhone,
      message: message.trim(),
    });
  };

  const quickMessages = {
    user: [
      {
        title: 'Recordatorio de Reserva',
        text: 'Hola! Te recordamos que tienes una reserva próximamente. Por favor, confirma tu asistencia. ¡Gracias!',
      },
      {
        title: 'Solicitud de Información',
        text: 'Hola! Nos gustaría conocer tu opinión sobre nuestro servicio. ¿Podrías compartir tu experiencia con nosotros?',
      },
    ],
    restaurant: [
      {
        title: 'Actualización del Sistema',
        text: 'Hola! Te informamos que hemos actualizado el sistema de reservas con nuevas funcionalidades. Revisa el panel de configuración para más detalles.',
      },
      {
        title: 'Recordatorio de Suscripción',
        text: 'Hola! Te recordamos que tu suscripción está próxima a vencer. Por favor, renueva tu plan para continuar disfrutando del servicio.',
      },
    ],
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'WhatsApp Web - Administrador',
          headerShown: true,
        }}
      />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 20 }
        ]}
      >
        <View style={styles.statusSection}>
          <View style={styles.statusHeader}>
            <MessageSquare size={24} color="#25D366" />
            <Text style={styles.statusTitle}>Estado de WhatsApp Web</Text>
          </View>

          {generateQrMutation.isPending && !qrData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#25D366" />
              <Text style={styles.loadingText}>Verificando conexión...</Text>
            </View>
          ) : qrData?.isReady ? (
            <View style={styles.connectedBox}>
              <Text style={styles.connectedText}>✅ WhatsApp Web Conectado</Text>
              <Text style={styles.connectedSubtext}>
                Puedes enviar mensajes a usuarios y restaurantes
              </Text>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <LogOut size={18} color="#FFFFFF" />
                    <Text style={styles.disconnectButtonText}>Desconectar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : qrData?.isInitializing ? (
            <View style={styles.initializingBox}>
              <ActivityIndicator size="large" color="#25D366" />
              <Text style={styles.initializingText}>
                Inicializando WhatsApp Web...
              </Text>
              <Text style={styles.initializingSubtext}>
                Por favor espera mientras se genera el código QR
              </Text>
            </View>
          ) : qrData?.qrCode ? (
            <View style={styles.qrBox}>
              <Text style={styles.qrTitle}>Escanea este código QR</Text>
              <Text style={styles.qrInstructions}>
                1. Abre WhatsApp en tu teléfono{'\n'}
                2. Toca Menú o Configuración{'\n'}
                3. Toca Dispositivos vinculados{'\n'}
                4. Toca Vincular un dispositivo{'\n'}
                5. Apunta tu teléfono a esta pantalla
              </Text>
              {Platform.OS === 'web' ? (
                <img
                  src={qrData.qrCode}
                  alt="WhatsApp QR Code"
                  style={{
                    width: 280,
                    height: 280,
                    alignSelf: 'center',
                    marginVertical: 20,
                  }}
                />
              ) : (
                <Image
                  source={{ uri: qrData.qrCode }}
                  style={styles.qrImage}
                  contentFit="contain"
                />
              )}
              <Text style={styles.qrNote}>
                El código QR se actualiza cada 20 segundos
              </Text>
            </View>
          ) : (
            <View style={styles.notConnectedBox}>
              <Text style={styles.notConnectedText}>
                WhatsApp Web no está conectado
              </Text>
              <TouchableOpacity
                style={styles.reconnectButton}
                onPress={() => generateQrMutation.mutate()}
                disabled={generateQrMutation.isPending}
              >
                {generateQrMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <QrCode size={18} color="#FFFFFF" />
                    <Text style={styles.reconnectButtonText}>Generar Código QR</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {qrData?.isReady && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enviar Mensaje</Text>
              
              <View style={styles.contactTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.contactTypeButton,
                    contactType === 'user' && styles.contactTypeButtonActive,
                  ]}
                  onPress={() => setContactType('user')}
                >
                  <Users size={20} color={contactType === 'user' ? '#FFFFFF' : '#4F46E5'} />
                  <Text
                    style={[
                      styles.contactTypeText,
                      contactType === 'user' && styles.contactTypeTextActive,
                    ]}
                  >
                    Usuario
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.contactTypeButton,
                    contactType === 'restaurant' && styles.contactTypeButtonActive,
                  ]}
                  onPress={() => setContactType('restaurant')}
                >
                  <Building2 size={20} color={contactType === 'restaurant' ? '#FFFFFF' : '#4F46E5'} />
                  <Text
                    style={[
                      styles.contactTypeText,
                      contactType === 'restaurant' && styles.contactTypeTextActive,
                    ]}
                  >
                    Restaurante
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Número de teléfono</Text>
                <View style={styles.phoneInputContainer}>
                  <Text style={styles.phonePrefix}>+34</Text>
                  <TextInput
                    style={styles.phoneInput}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="600 000 000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mensaje</Text>
                <TextInput
                  style={styles.messageInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Escribe tu mensaje aquí..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  sendMessageMutation.isPending && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Send size={18} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>Enviar Mensaje</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mensajes Rápidos</Text>
              {quickMessages[contactType].map((quick, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickMessageCard}
                  onPress={() => setMessage(quick.text)}
                >
                  <Text style={styles.quickMessageTitle}>{quick.title}</Text>
                  <Text style={styles.quickMessageText} numberOfLines={2}>
                    {quick.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    padding: 20,
  },
  statusSection: {
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  connectedBox: {
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#16A34A',
  },
  connectedText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#15803D',
    marginBottom: 8,
  },
  connectedSubtext: {
    fontSize: 14,
    color: '#166534',
    marginBottom: 16,
  },
  disconnectButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  initializingBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    gap: 12,
  },
  initializingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#92400E',
  },
  initializingSubtext: {
    fontSize: 14,
    color: '#78350F',
    textAlign: 'center',
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  qrInstructions: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
  },
  qrImage: {
    width: 280,
    height: 280,
    marginVertical: 20,
  },
  qrNote: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic' as const,
    textAlign: 'center',
  },
  notConnectedBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#DC2626',
    alignItems: 'center',
    gap: 16,
  },
  notConnectedText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#991B1B',
    textAlign: 'center',
  },
  reconnectButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  reconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 20,
  },
  contactTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  contactTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
  },
  contactTypeButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  contactTypeText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#4F46E5',
  },
  contactTypeTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  phonePrefix: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  messageInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 120,
  },
  sendButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  quickMessageCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickMessageTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 6,
  },
  quickMessageText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
