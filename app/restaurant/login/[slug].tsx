import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { trpc } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lock, User, Shield, Store } from 'lucide-react-native';

export default function RestaurantLoginScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  const loginMutation = trpc.auth.restaurantLogin.useMutation();
  const verifyMutation = trpc.auth.verifyCode.useMutation();

  const getIpAddress = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error obteniendo IP:', error);
      return '0.0.0.0';
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    if (!slug) {
      Alert.alert('Error', 'Slug del restaurante no encontrado');
      return;
    }

    const ipAddress = await getIpAddress();
    console.log('IP detectada:', ipAddress);

    loginMutation.mutate(
      { slug, username, password, ipAddress },
      {
        onSuccess: async (data) => {
          console.log('Respuesta login:', data);
          
          if (data.requiresVerification) {
            setRequiresVerification(true);
            setUserId(data.userId);
            setEmail((data as any).email || '');
            setRestaurantName(data.restaurantName || '');
            Alert.alert(
              'Verificación requerida',
              `Se ha detectado un inicio de sesión desde una nueva IP. Se ha enviado un código de verificación a ${(data as any).email}`,
              [{ text: 'OK' }]
            );
          } else if (!data.requiresVerification && 'sessionId' in data) {
            await AsyncStorage.setItem('restaurantSession', (data as any).sessionId);
            await AsyncStorage.setItem('restaurantId', data.userId || '');
            await AsyncStorage.setItem('restaurantSlug', slug);
            await AsyncStorage.setItem('restaurantName', data.restaurantName || slug || '');
            console.log('✅ Sesión guardada, redirigiendo a dashboard');
            Alert.alert('Éxito', 'Inicio de sesión exitoso');
            router.replace('/restaurant/dashboard');
          }
        },
        onError: (error) => {
          const msg = error.message || '';
          const isNetwork = msg.toLowerCase().includes('network') ||
            msg.toLowerCase().includes('fetch') ||
            msg.toLowerCase().includes('connect') ||
            msg.toLowerCase().includes('failed') ||
            msg === '';
          Alert.alert(
            isNetwork ? 'Error de conexión' : 'Error de acceso',
            isNetwork
              ? 'No se pudo conectar con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.'
              : (msg || 'Error al iniciar sesión')
          );
        },
      }
    );
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('Error', 'Por favor ingresa el código de verificación');
      return;
    }

    const ipAddress = await getIpAddress();

    verifyMutation.mutate(
      { userId, code: verificationCode, ipAddress },
      {
        onSuccess: async (data) => {
          await AsyncStorage.setItem('restaurantSession', data.sessionId);
          await AsyncStorage.setItem('restaurantId', data.userId);
          await AsyncStorage.setItem('restaurantSlug', slug || '');
          await AsyncStorage.setItem('restaurantName', restaurantName || slug || '');
          console.log('✅ Sesión guardada después de verificación, redirigiendo a dashboard');
          Alert.alert('Éxito', 'Verificación exitosa');
          router.replace('/restaurant/dashboard');
        },
        onError: (error) => {
          Alert.alert('Error', error.message || 'Código de verificación inválido');
        },
      }
    );
  };

  if (requiresVerification) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Shield size={60} color="#10B981" />
          </View>

          <Text style={styles.title}>Verificación de seguridad</Text>
          <Text style={styles.subtitle}>
            {restaurantName}
          </Text>
          <Text style={styles.emailText}>
            Se ha enviado un código a {email}
          </Text>

          <View style={styles.inputContainer}>
            <Shield size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Código de verificación"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleVerifyCode}
            disabled={verifyMutation.isPending}
          >
            {verifyMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verificar código</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setRequiresVerification(false);
              setVerificationCode('');
            }}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Volver al login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Store size={60} color="#10B981" />
        </View>

        <Text style={styles.title}>Panel de Restaurante</Text>
        <Text style={styles.subtitle}>Acceso exclusivo - {slug}</Text>

        <View style={styles.inputContainer}>
          <User size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Usuario"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Volver al inicio</Text>
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
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
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
    marginBottom: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1F2937',
  },
  button: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
