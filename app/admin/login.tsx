import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lock, User, Shield } from 'lucide-react-native';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');

  const loginMutation = trpc.auth.adminLogin.useMutation();
  const subAdminLoginMutation = trpc.auth.subAdminLogin.useMutation();
  const verifyMutation = trpc.auth.verifyCode.useMutation();

  const getDeviceFingerprint = async () => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';
    const language = typeof navigator !== 'undefined' ? navigator.language : 'unknown';
    const screenResolution = typeof window !== 'undefined'
      ? `${window.screen.width}x${window.screen.height}`
      : 'unknown';
    const fingerprint = `${userAgent}|${platform}|${language}|${screenResolution}`;
    const simpleHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    };
    return simpleHash(fingerprint);
  };

  const saveAdminSession = async (data: {
    sessionId: string;
    userId: string;
    isSuperAdmin: boolean;
    userType: string;
    permissions?: string[] | null;
    firstName?: string;
    username?: string;
  }) => {
    await AsyncStorage.setItem('adminSession', data.sessionId);
    await AsyncStorage.setItem('adminId', data.userId);
    await AsyncStorage.setItem('adminUserType', data.userType);
    await AsyncStorage.setItem('adminIsSuperAdmin', data.isSuperAdmin ? 'true' : 'false');
    await AsyncStorage.setItem('adminPermissions', JSON.stringify(data.permissions || []));
    if (data.firstName) await AsyncStorage.setItem('adminName', data.firstName);
    if (data.username) await AsyncStorage.setItem('adminName', data.username);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    const deviceId = await getDeviceFingerprint();
    console.log('Dispositivo detectado:', deviceId.substring(0, 16) + '...');

    loginMutation.mutate(
      { username, password, ipAddress: deviceId },
      {
        onSuccess: async (data) => {
          console.log('Respuesta admin login:', data);
          if (data.requiresVerification) {
            setRequiresVerification(true);
            setUserId((data as any).userId || '');
            const adminEmail = (data as any).email || '';
            setEmail(adminEmail);
            Alert.alert(
              'Verificación requerida',
              `Se ha detectado un inicio de sesión desde un dispositivo nuevo. Se ha enviado un código a ${adminEmail}`,
              [{ text: 'OK' }]
            );
          } else if ('sessionId' in data) {
            await saveAdminSession({
              sessionId: (data as any).sessionId,
              userId: data.userId || '',
              isSuperAdmin: true,
              userType: 'admin',
              permissions: null,
              username,
            });
            router.replace('/admin');
          }
        },
        onError: () => {
          console.log('Admin login falló, intentando como sub-admin...');
          subAdminLoginMutation.mutate(
            { username, password, ipAddress: deviceId },
            {
              onSuccess: async (subData) => {
                if (subData.requiresVerification) {
                  setRequiresVerification(true);
                  setUserId((subData as any).userId || '');
                  const subEmail = (subData as any).email || '';
                  setEmail(subEmail);
                  Alert.alert(
                    'Verificación requerida',
                    `Dispositivo nuevo detectado. Código enviado a ${subEmail}`,
                    [{ text: 'OK' }]
                  );
                } else if ('sessionId' in subData) {
                  await saveAdminSession({
                    sessionId: (subData as any).sessionId,
                    userId: subData.userId || '',
                    isSuperAdmin: false,
                    userType: 'subadmin',
                    permissions: (subData as any).permissions || [],
                    firstName: (subData as any).firstName || username,
                  });
                  router.replace('/admin');
                }
              },
              onError: (subErr) => {
                Alert.alert('Error', subErr.message || 'Usuario o contraseña incorrectos');
              },
            }
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

    const deviceId = await getDeviceFingerprint();

    verifyMutation.mutate(
      { userId, code: verificationCode, ipAddress: deviceId },
      {
        onSuccess: async (data) => {
          const isSubAdmin = data.userType === 'subadmin';
          await saveAdminSession({
            sessionId: data.sessionId,
            userId: data.userId,
            isSuperAdmin: !isSubAdmin,
            userType: data.userType,
            permissions: isSubAdmin ? [] : null,
            username,
          });
          router.replace('/admin');
        },
        onError: (error) => {
          Alert.alert('Error', error.message || 'Código de verificación inválido');
        },
      }
    );
  };

  const isPending = loginMutation.isPending || subAdminLoginMutation.isPending;

  if (requiresVerification) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Shield size={60} color="#3B82F6" />
          </View>
          <Text style={styles.title}>Verificación de seguridad</Text>
          <Text style={styles.subtitle}>Se ha enviado un código a {email}</Text>

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
            onPress={() => { setRequiresVerification(false); setVerificationCode(''); }}
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
          <Shield size={60} color="#3B82F6" />
        </View>
        <Text style={styles.title}>Panel de Administración</Text>
        <Text style={styles.subtitle}>Ingresa tus credenciales</Text>

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
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    width: '100%', maxWidth: 400,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700' as const, color: '#1F2937', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 12, paddingHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 48, fontSize: 16, color: '#1F2937' },
  button: {
    backgroundColor: '#3B82F6', borderRadius: 12, height: 48,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  backButton: { marginTop: 16, alignItems: 'center' },
  backButtonText: { color: '#6B7280', fontSize: 14 },
});
