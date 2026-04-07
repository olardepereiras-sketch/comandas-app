import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFullSessionData, isSupportSession } from '@/lib/restaurantSession';
import { Store, ArrowRight, RefreshCw } from 'lucide-react-native';

export default function RestaurantEntryScreen() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSlugInput, setShowSlugInput] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      if (isSupportSession()) {
        console.log('✅ [SupportSession] Sesión de soporte activa en esta pestaña, redirigiendo a DASHBOARD');
        router.replace('/restaurant/dashboard');
        return;
      }

      const { restaurantId: savedId, restaurantSession: savedSession, restaurantSlug: savedSlug } = await getFullSessionData();

      console.log('🔍 Verificando sesión:', { savedSlug, hasSession: !!savedSession, hasId: !!savedId });

      if (savedSlug && savedSession && savedId) {
        console.log('✅ Sesión activa encontrada, redirigiendo a DASHBOARD (panel principal)');
        router.replace('/restaurant/dashboard');
      } else if (savedSlug) {
        console.log('📱 Slug guardado encontrado, redirigiendo a login');
        router.replace(`/restaurant/login/${savedSlug}`);
      } else {
        console.log('❌ No hay datos guardados, mostrando pantalla de entrada');
        setShowSlugInput(true);
      }
    } catch (error) {
      console.error('Error verificando sesión:', error);
      setShowSlugInput(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!slug.trim()) {
      return;
    }

    const normalizedSlug = slug.trim().toLowerCase();
    await AsyncStorage.setItem('restaurantSlug', normalizedSlug);
    console.log('✅ Slug guardado:', normalizedSlug);
    router.push(`/restaurant/login/${normalizedSlug}`);
  };

  const handleResetSlug = async () => {
    await AsyncStorage.removeItem('restaurantSlug');
    await AsyncStorage.removeItem('restaurantSession');
    await AsyncStorage.removeItem('restaurantId');
    setSlug('');
    setShowSlugInput(true);
    console.log('🔄 Datos de sesión limpiados');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!showSlugInput) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const isPWA = Platform.OS === 'web' && 
    typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches || 
     (window.navigator as any).standalone === true);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Store size={70} color="#10B981" />
        </View>

        <Text style={styles.title}>Bienvenido a Quieromesa</Text>
        <Text style={styles.subtitle}>Panel de Gestión de Reservas</Text>

        {isPWA && (
          <View style={styles.pwaIndicator}>
            <Text style={styles.pwaText}>✓ Aplicación instalada</Text>
          </View>
        )}

        <Text style={styles.description}>
          Ingresa el identificador de tu restaurante para comenzar
        </Text>

        <View style={styles.inputContainer}>
          <Store size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Identificador del restaurante"
            placeholderTextColor="#9CA3AF"
            value={slug}
            onChangeText={setSlug}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleContinue}
            returnKeyType="go"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, !slug.trim() && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!slug.trim()}
        >
          <Text style={styles.buttonText}>Continuar</Text>
          <ArrowRight size={20} color="#fff" style={styles.buttonIcon} />
        </TouchableOpacity>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            ¿No conoces tu identificador?
          </Text>
          <Text style={styles.helpSubtext}>
            Consulta el email de bienvenida o contacta con soporte
          </Text>
        </View>

        {Platform.OS === 'web' && !isPWA && (
          <View style={styles.installHint}>
            <Text style={styles.installHintText}>
              💡 Instala la app en tu dispositivo para acceso rápido
            </Text>
            <Text style={styles.installHintSubtext}>
              {Platform.OS === 'web' && /iPhone|iPad|iPod/.test(navigator.userAgent)
                ? 'Toca el botón compartir y selecciona "Añadir a pantalla de inicio"'
                : 'Usa el menú de tu navegador y selecciona "Instalar aplicación"'}
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={handleResetSlug} style={styles.resetButton}>
          <RefreshCw size={16} color="#6B7280" style={styles.resetIcon} />
          <Text style={styles.resetText}>Cambiar restaurante</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  pwaIndicator: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pwaText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#1F2937',
  },
  button: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginTop: 2,
  },
  helpContainer: {
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  helpSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  installHint: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  installHintText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  installHintSubtext: {
    fontSize: 12,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 8,
  },
  resetIcon: {
    marginRight: 6,
  },
  resetText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
