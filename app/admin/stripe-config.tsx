import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditCard, Key, Save, AlertCircle } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';

export default function AdminStripeConfigScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const [secretKey, setSecretKey] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const configQuery = trpc.stats.getAdminStripeConfig.useQuery(undefined, {
    onSuccess: (data) => {
      setPublishableKey(data.stripePublishableKey || '');
      setEnabled(data.stripeEnabled || false);
    },
  });

  const updateMutation = trpc.stats.updateAdminStripeConfig.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      Alert.alert('Éxito', 'Configuración de Stripe actualizada correctamente');
      setSecretKey('');
      setShowSecretKey(false);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSave = () => {
    if (enabled && (!secretKey && !configQuery.data?.isConfigured)) {
      Alert.alert('Error', 'Debes introducir la clave secreta de Stripe para activar el servicio');
      return;
    }

    if (enabled && (!publishableKey)) {
      Alert.alert('Error', 'Debes introducir la clave pública de Stripe');
      return;
    }

    const input: any = {
      stripeEnabled: enabled,
    };

    if (secretKey) {
      input.stripeSecretKey = secretKey;
    }

    if (publishableKey) {
      input.stripePublishableKey = publishableKey;
    }

    updateMutation.mutate(input);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <CreditCard size={32} color="#3b82f6" strokeWidth={2.5} />
        <Text style={styles.headerTitle}>Configuración de Stripe</Text>
        <Text style={styles.headerSubtitle}>Gestiona los pagos de la tienda virtual</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!configQuery.data?.isConfigured && (
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

        {configQuery.data?.isConfigured && (
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
                Permite que la tienda virtual procese pagos
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
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
              Obtén tus claves en:{' '}
              <Text style={styles.infoLink}>https://dashboard.stripe.com/apikeys</Text>
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Clave Secreta (Secret Key)</Text>
            <TextInput
              style={styles.input}
              value={secretKey}
              onChangeText={setSecretKey}
              placeholder={configQuery.data?.isConfigured ? '••••••••••••••••' : 'sk_live_...'}
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
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={updateMutation.isLoading}
        >
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.saveButtonGradient}
          >
            <Save size={20} color="#fff" strokeWidth={2.5} />
            <Text style={styles.saveButtonText}>
              {updateMutation.isLoading ? 'Guardando...' : 'Guardar Configuración'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
  infoLink: {
    fontWeight: '600' as const,
    textDecorationLine: 'underline',
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'monospace' as const,
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
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
});