import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { setSupportSessionData } from '@/lib/restaurantSession';
import { Shield, CheckCircle, XCircle } from 'lucide-react-native';

export default function SupportAccessScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  const validateMutation = trpc.restaurants.validateSupportToken.useMutation({
    onSuccess: (data) => {
      console.log('[SupportAccess] Token válido, creando sesión en sessionStorage (tab-isolated):', data.sessionId);
      setSupportSessionData({
        restaurantId: data.restaurantId,
        restaurantSession: data.sessionId,
        restaurantSlug: data.restaurantSlug,
        restaurantName: data.restaurantName,
      });
      setRestaurantName(data.restaurantName);
      setStatus('success');
      setTimeout(() => {
        router.replace('/restaurant/dashboard');
      }, 1500);
    },
    onError: (error) => {
      console.error('[SupportAccess] Error validando token:', error.message);
      setErrorMessage(error.message || 'Enlace de acceso inválido o expirado');
      setStatus('error');
    },
  });

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('token')
      : null;

    if (!token || !slug) {
      setErrorMessage('Parámetros de acceso inválidos');
      setStatus('error');
      return;
    }

    console.log('[SupportAccess] Validando token para slug:', slug);
    validateMutation.mutate({ token, slug });
  }, [slug]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {status === 'loading' && (
          <>
            <View style={styles.iconCircle}>
              <Shield size={48} color="#8b5cf6" strokeWidth={2} />
            </View>
            <Text style={styles.title}>Acceso soporte técnico</Text>
            <Text style={styles.subtitle}>Validando enlace de acceso...</Text>
            <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 24 }} />
          </>
        )}

        {status === 'success' && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
              <CheckCircle size={48} color="#10b981" strokeWidth={2} />
            </View>
            <Text style={styles.title}>Acceso concedido</Text>
            <Text style={styles.subtitle}>Entrando al panel de {restaurantName}...</Text>
            <ActivityIndicator size="small" color="#10b981" style={{ marginTop: 24 }} />
          </>
        )}

        {status === 'error' && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: '#fef2f2' }]}>
              <XCircle size={48} color="#ef4444" strokeWidth={2} />
            </View>
            <Text style={styles.title}>Acceso denegado</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Text style={styles.hint}>
              Este enlace puede haber expirado o ya ha sido utilizado.{'\n'}
              Solicita un nuevo enlace al administrador.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600' as const,
  },
  hint: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
