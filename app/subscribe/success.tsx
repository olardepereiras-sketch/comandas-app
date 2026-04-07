import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, Mail, Copy, ExternalLink } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';

export default function SuccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id?: string; order_id?: string }>();
  
  const [processing, setProcessing] = useState<boolean>(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmPayment = trpc.subscriptions.confirmPayment.useMutation();

  useEffect(() => {
    if (params.session_id && params.order_id) {
      handleConfirmPayment();
    }
  }, [params.session_id, params.order_id]);

  const handleConfirmPayment = async () => {
    try {
      setProcessing(true);
      const response = await confirmPayment.mutateAsync({
        sessionId: params.session_id!,
        orderId: params.order_id!,
      });
      setResult(response);
      setProcessing(false);
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      setError(err.message || 'Error al confirmar el pago');
      setProcessing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
  };

  const openUrl = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  if (processing) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Procesando',
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#FF1493',
          }}
        />
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.message}>Confirmando tu pago...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Error',
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#FF1493',
          }}
        />
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <Text style={styles.errorTitle}>Error al procesar el pago</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            style={styles.button}
            onPress={() => router.push('/')}
          >
            <Text style={styles.buttonText}>Volver al inicio</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '¡Éxito!',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#FF1493',
          headerLeft: () => null,
        }}
      />
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <View style={styles.successIcon}>
          <CheckCircle size={80} color="#10B981" />
        </View>

        <Text style={styles.successTitle}>¡Pago completado!</Text>
        <Text style={styles.successMessage}>
          Tu suscripción ha sido activada exitosamente. Hemos enviado un email con tus credenciales de acceso.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Mail size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              Revisa tu correo para encontrar el link de acceso y tus credenciales
            </Text>
          </View>
        </View>

        {result?.accessUrl && (
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>Link de acceso</Text>
            <View style={styles.urlContainer}>
              <Text style={styles.urlText} numberOfLines={1}>
                {result.accessUrl}
              </Text>
              <View style={styles.urlActions}>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => copyToClipboard(result.accessUrl)}
                >
                  <Copy size={20} color="#FF1493" />
                </Pressable>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => openUrl(result.accessUrl)}
                >
                  <ExternalLink size={20} color="#FF1493" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.contactText}>
            Contáctanos en:
          </Text>
          <Pressable onPress={() => Linking.openURL('tel:615914434')}>
            <Text style={styles.contactLink}>📞 615 91 44 34</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('mailto:info@quieromesa.com')}>
            <Text style={styles.contactLink}>✉️ info@quieromesa.com</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.button}
          onPress={() => router.push('/')}
        >
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  successIcon: {
    alignSelf: 'center' as const,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1F2937',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center' as const,
    marginBottom: 32,
    lineHeight: 24,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 20,
    textAlign: 'center' as const,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  accessCard: {
    backgroundColor: '#FFF5FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  accessTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 8,
  },
  urlContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: '#FF1493',
    fontWeight: '500' as const,
  },
  urlActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  contactLink: {
    fontSize: 14,
    color: '#FF1493',
    fontWeight: '500' as const,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#FF1493',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#DC2626',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center' as const,
    marginBottom: 32,
  },
});
