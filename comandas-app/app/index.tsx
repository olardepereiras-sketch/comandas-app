import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChefHat,
  Smartphone,
  Monitor,
  ArrowRight,
  UtensilsCrossed,
  Key,
  LogOut,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vanillaClient, type DeviceConfig, type UserProfile } from '@/lib/trpc';

type Mode = 'waiter' | 'cashier' | 'kitchen';
type TabMode = 'saved' | 'token';
type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid' | 'network-error';
type AppState = 'loading' | 'login' | 'userSelect' | 'navigating';

interface ModeOption {
  key: Mode;
  label: string;
  description: string;
  color: string;
  Icon: React.ComponentType<any>;
}

const MODES: ModeOption[] = [
  {
    key: 'waiter',
    label: 'Comandera',
    description: 'Para camareros — tomar pedidos por mesa',
    Icon: Smartphone,
    color: '#f97316',
  },
  {
    key: 'cashier',
    label: 'PC / Caja',
    description: 'Vista de caja con todas las comandas',
    Icon: Monitor,
    color: '#3b82f6',
  },
  {
    key: 'kitchen',
    label: 'Monitor Cocina',
    description: 'Pantalla de cocina — gestionar pedidos',
    Icon: ChefHat,
    color: '#22c55e',
  },
];

const DEVICE_TYPE_FOR_MODE: Record<Mode, DeviceConfig['type']> = {
  kitchen: 'kitchen',
  cashier: 'cashier',
  waiter: 'waiter',
};

const STORAGE_KEY = 'comandas_restaurant_id';
const STORAGE_NAME_KEY = 'comandas_restaurant_name';
const STORAGE_DEVICE_KEY = 'comandas_device_session';
const STORAGE_USER_KEY = 'comandas_selected_user';
const STORAGE_USER_DATE_KEY = 'comandas_user_selected_date';

function extractTokenFromInput(input: string): string {
  const trimmed = input.trim();
  try {
    if (trimmed.includes('token=')) {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://x.com?${trimmed}`);
      const t = urlObj.searchParams.get('token');
      if (t && t.length > 0) return t;
    }
  } catch {
    const match = trimmed.match(/[?&]token=([^&\s]+)/);
    if (match?.[1]) return match[1];
  }
  return trimmed;
}

interface DeviceSession {
  restaurantId: string;
  restaurantName: string;
  mode: Mode;
  deviceId: string;
  deviceName: string;
}

interface PendingNav {
  mode: Mode;
  restaurantId: string;
  deviceId?: string;
  deviceName?: string;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [appState, setAppState] = useState<AppState>('loading');
  const [tab, setTab] = useState<TabMode>('saved');
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<Mode>('waiter');
  const [tokenInput, setTokenInput] = useState('');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [validatedName, setValidatedName] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingNav, setPendingNav] = useState<PendingNav | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pendingNavForUser, setPendingNavForUser] = useState<PendingNav | null>(null);

  const loadUsers = useCallback(async (rid: string): Promise<UserProfile[]> => {
    try {
      const result = await vanillaClient.comandas.loadData.query({
        restaurantId: rid,
        dataTypes: ['users'],
      });
      if (result?.data?.users?.data) {
        const parsed = JSON.parse(result.data.users.data);
        if (Array.isArray(parsed)) return parsed as UserProfile[];
      }
    } catch (e) {
      console.log('[Login] Could not load users:', e);
    }
    return [];
  }, []);

  const checkNeedUserSelect = useCallback(async (): Promise<boolean> => {
    const today = getTodayString();
    const [dateStr] = await AsyncStorage.multiGet([STORAGE_USER_DATE_KEY]);
    return dateStr[1] !== today;
  }, []);

  const doNavigate = useCallback((nav: PendingNav) => {
    router.replace({
      pathname: `/${nav.mode}` as any,
      params: {
        restaurantId: nav.restaurantId,
        ...(nav.deviceId ? { deviceId: nav.deviceId } : {}),
        ...(nav.deviceName ? { deviceName: nav.deviceName } : {}),
      },
    });
  }, [router]);

  const navigateWithUserCheck = useCallback(async (nav: PendingNav) => {
    const needUser = await checkNeedUserSelect();
    if (!needUser) {
      doNavigate(nav);
      return;
    }
    const loadedUsers = await loadUsers(nav.restaurantId);
    if (loadedUsers.length === 0) {
      doNavigate(nav);
      return;
    }
    setUsers(loadedUsers);
    setSelectedUserId(null);
    setPendingNavForUser(nav);
    setAppState('userSelect');
  }, [checkNeedUserSelect, doNavigate, loadUsers]);

  const handleSelectUser = useCallback(async () => {
    if (!selectedUserId || !pendingNavForUser) return;
    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;
    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    await AsyncStorage.setItem(STORAGE_USER_DATE_KEY, getTodayString());
    await AsyncStorage.setItem('waiter_user_name', user.name);
    const nav = { ...pendingNavForUser };
    setAppState('navigating');
    doNavigate(nav);
  }, [selectedUserId, pendingNavForUser, users, doNavigate]);

  const handleSkipUser = useCallback(() => {
    if (!pendingNavForUser) return;
    doNavigate(pendingNavForUser);
  }, [pendingNavForUser, doNavigate]);

  useEffect(() => {
    const init = async () => {
      try {
        const [id, name, deviceSessionStr] = await AsyncStorage.multiGet([
          STORAGE_KEY,
          STORAGE_NAME_KEY,
          STORAGE_DEVICE_KEY,
        ]);
        const storedId = id[1];
        const storedName = name[1];
        const sessionStr = deviceSessionStr[1];

        if (storedId) {
          setSavedId(storedId);
          setSavedName(storedName);
        }

        if (storedId && sessionStr) {
          try {
            const session: DeviceSession = JSON.parse(sessionStr);
            if (session.restaurantId === storedId) {
              console.log('[Login] Auto-resuming device session:', session.deviceName, session.mode);
              await navigateWithUserCheck({
                mode: session.mode,
                restaurantId: session.restaurantId,
                deviceId: session.deviceId,
                deviceName: session.deviceName,
              });
              return;
            }
          } catch {
            await AsyncStorage.removeItem(STORAGE_DEVICE_KEY);
          }
        }
      } catch { /**/ }
      setAppState('login');
    };
    void init();
  }, [navigateWithUserCheck]);

  const loadDevices = useCallback(async (rid: string) => {
    try {
      const result = await vanillaClient.comandas.loadData.query({
        restaurantId: rid,
        dataTypes: ['devices'],
      });
      if (result?.data?.devices?.data) {
        const parsed = JSON.parse(result.data.devices.data);
        if (Array.isArray(parsed)) {
          setDevices(parsed);
          return parsed as DeviceConfig[];
        }
      }
    } catch (e) {
      console.log('[Login] Could not load devices:', e);
    }
    return [] as DeviceConfig[];
  }, []);

  const validateRestaurantId = useCallback(async (rid: string) => {
    if (!rid.trim()) {
      setValidationState('idle');
      setValidatedName(null);
      return;
    }
    setValidationState('validating');
    setValidationError(null);
    try {
      const trimmed = rid.trim();
      const isId = trimmed.startsWith('rest-');
      const query = isId ? { restaurantId: trimmed } : { slug: trimmed };
      const result = await vanillaClient.restaurants.details.query(query);
      if (result && (result.id || (result as any).restaurantId)) {
        setValidationState('valid');
        setValidatedName(result.name || trimmed);
      } else {
        setValidationState('invalid');
        setValidatedName(null);
        setValidationError('Restaurante no encontrado');
      }
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      const code = e?.data?.code || e?.shape?.data?.code || '';
      if (msg.includes('not found') || msg.includes('no encontrado') || code === 'NOT_FOUND') {
        setValidationState('invalid');
        setValidationError('Restaurante no encontrado. Verifica el ID o el slug.');
      } else if (msg.includes('suscripción') || msg.includes('subscription')) {
        setValidationState('network-error');
        setValidationError('Suscripción vencida. El módulo de Comandas puede seguir activo.');
      } else {
        setValidationState('network-error');
        setValidationError('No se pudo verificar. Si la ID es correcta puedes continuar.');
      }
    }
  }, []);

  const handleRestaurantIdChange = useCallback((text: string) => {
    setRestaurantId(text);
    setValidationState('idle');
    setValidatedName(null);
    setValidationError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length > 2) {
      debounceRef.current = setTimeout(() => void validateRestaurantId(text.trim()), 700);
    }
  }, [validateRestaurantId]);

  const canProceedWithId = validationState === 'valid' || validationState === 'network-error';

  const handleAccessWithId = useCallback(async () => {
    const rid = savedId || restaurantId.trim();
    if (!rid) {
      Alert.alert('Campo requerido', 'Introduce el ID del restaurante.');
      return;
    }
    if (!savedId && !canProceedWithId) {
      Alert.alert('ID inválido', 'El ID del restaurante no es válido o no existe.');
      return;
    }
    setIsLoading(true);
    try {
      if (!savedId) {
        await AsyncStorage.setItem(STORAGE_KEY, rid);
        const nameToSave = restaurantName.trim() || validatedName || rid;
        await AsyncStorage.setItem(STORAGE_NAME_KEY, nameToSave);
        setSavedId(rid);
        setSavedName(nameToSave);
      }

      const devList = await loadDevices(rid);
      const modeDeviceType = DEVICE_TYPE_FOR_MODE[selectedMode];
      const modeDevices = devList.filter((d) => d.type === modeDeviceType);

      if (modeDevices.length > 0) {
        setPendingNav({ mode: selectedMode, restaurantId: rid });
        setSelectedDeviceId(modeDevices[0].id);
        setPasswordInput('');
        setDevices(devList);
        setShowDeviceModal(true);
        setIsLoading(false);
        return;
      }

      await navigateWithUserCheck({ mode: selectedMode, restaurantId: rid });
    } catch (e) {
      console.error('[Login] Error:', e);
      Alert.alert('Error', 'No se pudo guardar la sesión.');
    } finally {
      setIsLoading(false);
    }
  }, [savedId, restaurantId, restaurantName, validatedName, canProceedWithId, selectedMode, loadDevices, navigateWithUserCheck]);

  const handleDeviceLogin = useCallback(async () => {
    if (!selectedDeviceId || !pendingNav) return;
    const device = devices.find((d) => d.id === selectedDeviceId);
    if (!device) return;
    if (device.password !== passwordInput.trim()) {
      Alert.alert('Contraseña incorrecta', 'La contraseña introducida no es correcta.');
      return;
    }
    const session: DeviceSession = {
      restaurantId: pendingNav.restaurantId,
      restaurantName: savedName || pendingNav.restaurantId,
      mode: pendingNav.mode,
      deviceId: device.id,
      deviceName: device.name,
    };
    await AsyncStorage.setItem(STORAGE_DEVICE_KEY, JSON.stringify(session));
    setShowDeviceModal(false);
    await navigateWithUserCheck({
      mode: pendingNav.mode,
      restaurantId: pendingNav.restaurantId,
      deviceId: device.id,
      deviceName: device.name,
    });
  }, [selectedDeviceId, pendingNav, devices, passwordInput, savedName, navigateWithUserCheck]);

  const handleAccessWithToken = useCallback(async () => {
    const raw = tokenInput.trim();
    if (!raw) {
      Alert.alert('Token requerido', 'Introduce o pega el token de acceso.');
      return;
    }
    const token = extractTokenFromInput(raw);
    if (raw !== token) setTokenInput(token);
    setIsLoading(true);
    try {
      const result = await vanillaClient.comandas.validateToken.query({ token });
      if (result && result.restaurantId) {
        const viewMap: Record<string, Mode> = {
          comandera: 'waiter',
          pc: 'cashier',
          cocina: 'kitchen',
        };
        const mode: Mode = (result as any).view ? viewMap[(result as any).view] ?? 'waiter' : 'waiter';
        await AsyncStorage.setItem(STORAGE_KEY, result.restaurantId);
        await AsyncStorage.setItem(STORAGE_NAME_KEY, result.restaurantName || result.restaurantId);
        setSavedId(result.restaurantId);
        setSavedName(result.restaurantName || result.restaurantId);
        await navigateWithUserCheck({ mode, restaurantId: result.restaurantId });
      } else {
        Alert.alert('Token inválido', 'El token no fue reconocido.\n\nObtén uno desde quieromesa.com → Comandas → icono de enlace.');
      }
    } catch (e: any) {
      const fullMsg = e?.message || '';
      const msg = fullMsg.toLowerCase();
      const code = e?.data?.code || e?.shape?.data?.code || '';
      if (msg.includes('expired') || msg.includes('caducado')) {
        Alert.alert('Token expirado', 'El token ha expirado. Genera uno nuevo desde quieromesa.com.');
      } else if (msg.includes('not found') || msg.includes('no encontrado')) {
        Alert.alert('Token inválido', 'Token no encontrado. Verifica que copiaste el token correcto.');
      } else if (code === 'INTERNAL_SERVER_ERROR') {
        Alert.alert('Error del servidor', `Detalle: ${fullMsg.slice(0, 120)}`);
      } else {
        Alert.alert('Error de conexión', 'No se pudo conectar. Verifica tu conexión a internet.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [tokenInput, navigateWithUserCheck]);

  const handleClearSaved = useCallback(() => {
    Alert.alert('Cambiar restaurante', '¿Desconectar del restaurante actual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove([STORAGE_KEY, STORAGE_NAME_KEY, STORAGE_DEVICE_KEY, STORAGE_USER_KEY, STORAGE_USER_DATE_KEY]);
          setSavedId(null);
          setSavedName(null);
          setRestaurantId('');
          setRestaurantName('');
          setValidationState('idle');
          setValidatedName(null);
          setValidationError(null);
          setDevices([]);
        },
      },
    ]);
  }, []);

  const inputBorderColor =
    validationState === 'valid' ? '#86efac' :
    validationState === 'invalid' ? '#fca5a5' :
    validationState === 'network-error' ? '#fcd34d' : '#e2e8f0';

  const inputBg =
    validationState === 'valid' ? '#f0fdf4' :
    validationState === 'invalid' ? '#fef2f2' :
    validationState === 'network-error' ? '#fffbeb' : '#f8fafc';

  const modeDevicesForModal = pendingNav
    ? devices.filter((d) => d.type === DEVICE_TYPE_FOR_MODE[pendingNav.mode])
    : [];

  if (appState === 'loading' || appState === 'navigating') {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (appState === 'userSelect') {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.userSelectHeader}>
          <View style={s.userSelectLogoWrap}>
            <UtensilsCrossed size={26} color="#fff" strokeWidth={2} />
          </View>
          <View>
            <Text style={s.userSelectTitle}>¿Quién atiende hoy?</Text>
            <Text style={s.userSelectSub}>Selecciona tu usuario para comenzar</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.userSelectList}>
          {users.map(user => {
            const isSelected = selectedUserId === user.id;
            const bgColor = user.color || '#f97316';
            return (
              <TouchableOpacity
                key={user.id}
                style={[s.userCard, isSelected && { borderColor: bgColor, backgroundColor: `${bgColor}12` }]}
                onPress={() => setSelectedUserId(user.id)}
                activeOpacity={0.8}
              >
                <View style={[s.userAvatar, { backgroundColor: bgColor }]}>
                  <Text style={s.userAvatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={s.userCardInfo}>
                  <Text style={[s.userCardName, isSelected && { color: bgColor }]}>{user.name}</Text>
                  {user.role ? <Text style={s.userCardRole}>{user.role}</Text> : null}
                </View>
                {isSelected && (
                  <View style={[s.userCardCheck, { backgroundColor: bgColor }]}>
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' as const }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[s.userSelectFooter, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={s.userSelectSkip}
            onPress={handleSkipUser}
            activeOpacity={0.8}
          >
            <Text style={s.userSelectSkipText}>Continuar sin usuario</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.userSelectConfirm, !selectedUserId && s.btnDisabled]}
            onPress={handleSelectUser}
            disabled={!selectedUserId}
            activeOpacity={0.85}
          >
            <Text style={s.btnText}>Comenzar</Text>
            <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={s.headerLogo}>
          <UtensilsCrossed size={28} color="#fff" strokeWidth={2} />
        </View>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Sistema Comandas</Text>
          <Text style={s.headerSub}>QuieroMesa · quieromesa.com</Text>
        </View>
      </View>

      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'saved' && s.tabActive]}
          onPress={() => setTab('saved')}
          activeOpacity={0.8}
        >
          <UtensilsCrossed size={14} color={tab === 'saved' ? '#f97316' : '#6b7280'} strokeWidth={2.5} />
          <Text style={[s.tabText, tab === 'saved' && s.tabTextActive]}>ID Restaurante</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'token' && s.tabActive]}
          onPress={() => setTab('token')}
          activeOpacity={0.8}
        >
          <Key size={14} color={tab === 'token' ? '#f97316' : '#6b7280'} strokeWidth={2.5} />
          <Text style={[s.tabText, tab === 'token' && s.tabTextActive]}>Token de Acceso</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {tab === 'saved' ? (
            <>
              <View style={s.card}>
                <Text style={s.sectionLabel}>RESTAURANTE</Text>
                {savedId ? (
                  <View style={s.savedBox}>
                    <View style={s.savedInfo}>
                      <CheckCircle2 size={18} color="#22c55e" strokeWidth={2.5} />
                      <View style={s.savedTexts}>
                        <Text style={s.savedName}>{savedName || savedId}</Text>
                        <Text style={s.savedId}>{savedId}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={handleClearSaved} style={s.disconnectBtn}>
                      <LogOut size={16} color="#ef4444" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>ID del Restaurante *</Text>
                    <View style={s.inputRow}>
                      <TextInput
                        style={[s.input, s.inputFlex, { borderColor: inputBorderColor, backgroundColor: inputBg }]}
                        placeholder="ej: o-lar-de-pereiras  ó  rest-xxx"
                        value={restaurantId}
                        onChangeText={handleRestaurantIdChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholderTextColor="#9ca3af"
                        testID="input-restaurant-id"
                      />
                      <View style={s.inputIcon}>
                        {validationState === 'validating' && <ActivityIndicator size="small" color="#f97316" />}
                        {validationState === 'valid' && <CheckCircle2 size={20} color="#22c55e" strokeWidth={2.5} />}
                        {validationState === 'invalid' && <XCircle size={20} color="#ef4444" strokeWidth={2.5} />}
                        {validationState === 'network-error' && <AlertTriangle size={20} color="#f59e0b" strokeWidth={2.5} />}
                      </View>
                    </View>
                    {validationState === 'valid' && validatedName && (
                      <View style={s.feedbackRow}>
                        <CheckCircle2 size={13} color="#16a34a" strokeWidth={2.5} />
                        <Text style={[s.feedbackText, { color: '#16a34a' }]}>{validatedName} — Conectado ✓</Text>
                      </View>
                    )}
                    {validationState === 'invalid' && (
                      <View style={s.feedbackRow}>
                        <XCircle size={13} color="#dc2626" strokeWidth={2.5} />
                        <Text style={[s.feedbackText, { color: '#dc2626' }]}>{validationError}</Text>
                      </View>
                    )}
                    {validationState === 'network-error' && (
                      <View style={s.feedbackRow}>
                        <AlertTriangle size={13} color="#d97706" strokeWidth={2.5} />
                        <Text style={[s.feedbackText, { color: '#d97706' }]}>{validationError}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={s.card}>
                <Text style={s.sectionLabel}>MODO DE ACCESO</Text>
                <View style={s.modesGrid}>
                  {MODES.map(({ key, label, description, Icon, color }) => {
                    const active = selectedMode === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[s.modeCard, active && { borderColor: color, backgroundColor: `${color}10` }]}
                        onPress={() => setSelectedMode(key)}
                        activeOpacity={0.8}
                        testID={`mode-${key}`}
                      >
                        <View style={[s.modeIcon, { backgroundColor: `${color}18` }]}>
                          <Icon size={22} color={color} strokeWidth={2} />
                        </View>
                        <View style={s.modeText}>
                          <Text style={[s.modeLabel, active && { color }]}>{label}</Text>
                          <Text style={s.modeDesc}>{description}</Text>
                        </View>
                        {active && (
                          <View style={[s.modeCheck, { backgroundColor: color }]}>
                            <Text style={s.modeCheckMark}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={[s.btn, (!savedId && !canProceedWithId) && s.btnDisabled]}
                onPress={handleAccessWithId}
                disabled={(!savedId && !canProceedWithId) || isLoading}
                activeOpacity={0.85}
                testID="btn-access"
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={s.btnText}>
                      {validationState === 'network-error' ? 'Continuar de todas formas' : 'Acceder'}
                    </Text>
                    <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.card}>
                <View style={s.tokenHeader}>
                  <Key size={20} color="#f97316" strokeWidth={2} />
                  <Text style={s.tokenTitle}>Acceso por Token</Text>
                </View>
                <Text style={s.tokenDesc}>
                  Pega aquí el token o el enlace completo generado desde Comandas en quieromesa.com.
                </Text>
                <TextInput
                  style={[s.input, s.tokenInput]}
                  placeholder="Token o enlace completo (https://quieromesa.com/...?token=...)"
                  value={tokenInput}
                  onChangeText={setTokenInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  placeholderTextColor="#9ca3af"
                  testID="input-token"
                />
                {tokenInput.trim().includes('token=') && (
                  <View style={s.feedbackRow}>
                    <CheckCircle2 size={13} color="#16a34a" strokeWidth={2.5} />
                    <Text style={[s.feedbackText, { color: '#16a34a' }]}>Token detectado en el enlace ✓</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[s.btn, !tokenInput.trim() && s.btnDisabled]}
                onPress={handleAccessWithToken}
                disabled={!tokenInput.trim() || isLoading}
                activeOpacity={0.85}
                testID="btn-token-access"
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={s.btnText}>Validar y Acceder</Text>
                    <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showDeviceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeviceModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Lock size={18} color="#f97316" strokeWidth={2.5} />
                <Text style={s.modalTitle}>
                  {pendingNav?.mode === 'kitchen' ? 'Monitor de Cocina' : pendingNav?.mode === 'cashier' ? 'PC / Caja' : 'Comandera'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeviceModal(false)} style={s.modalCloseBtn}>
                <X size={20} color="#64748b" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalSubtitle}>Selecciona el dispositivo e introduce la contraseña</Text>

            <View style={{ gap: 10, paddingHorizontal: 20, paddingBottom: 8 }}>
              {modeDevicesForModal.map((device) => {
                const isSelected = selectedDeviceId === device.id;
                const modeColor = pendingNav?.mode === 'kitchen' ? '#22c55e' : pendingNav?.mode === 'cashier' ? '#3b82f6' : '#f97316';
                return (
                  <TouchableOpacity
                    key={device.id}
                    style={[s.deviceOption, isSelected && { borderColor: modeColor, backgroundColor: `${modeColor}10` }]}
                    onPress={() => setSelectedDeviceId(device.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.deviceOptionIcon, { backgroundColor: `${modeColor}22` }]}>
                      {pendingNav?.mode === 'kitchen' ? <ChefHat size={20} color={modeColor} strokeWidth={2} /> :
                       pendingNav?.mode === 'cashier' ? <Monitor size={20} color={modeColor} strokeWidth={2} /> :
                       <Smartphone size={20} color={modeColor} strokeWidth={2} />}
                    </View>
                    <View style={s.deviceOptionText}>
                      <Text style={[s.deviceOptionName, isSelected && { color: modeColor }]}>{device.name}</Text>
                      <Text style={s.deviceOptionSub}>Dispositivo #{device.monitorIndex}</Text>
                    </View>
                    {isSelected && (
                      <View style={[s.deviceOptionCheck, { backgroundColor: modeColor }]}>
                        <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' as const }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
              <Text style={s.inputLabel}>Contraseña del dispositivo</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[s.input, s.inputFlex]}
                  placeholder="Contraseña"
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  secureTextEntry={!showPassword}
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                  onSubmitEditing={handleDeviceLogin}
                />
                <TouchableOpacity style={{ padding: 10 }} onPress={() => setShowPassword(v => !v)}>
                  {showPassword
                    ? <EyeOff size={20} color="#64748b" strokeWidth={2.5} />
                    : <Eye size={20} color="#64748b" strokeWidth={2.5} />}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[s.btn, !passwordInput.trim() && s.btnDisabled]}
                onPress={handleDeviceLogin}
                disabled={!passwordInput.trim()}
                activeOpacity={0.85}
              >
                <Text style={s.btnText}>Entrar</Text>
                <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  headerLogo: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#f97316',
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800' as const, color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 7,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#f97316' },
  tabText: { fontSize: 13, fontWeight: '600' as const, color: '#6b7280' },
  tabTextActive: { color: '#f97316' },
  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  sectionLabel: { fontSize: 11, fontWeight: '800' as const, color: '#94a3b8', letterSpacing: 1.2 },
  savedBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1.5, borderColor: '#86efac', padding: 12, gap: 10,
  },
  savedInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedTexts: { flex: 1 },
  savedName: { fontSize: 14, fontWeight: '700' as const, color: '#15803d' },
  savedId: { fontSize: 12, color: '#4ade80', marginTop: 1 },
  disconnectBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
  },
  inputGroup: { gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputFlex: { flex: 1 },
  inputIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  feedbackText: { fontSize: 12, fontWeight: '600' as const, flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: '600' as const, color: '#475569' },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0',
    paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: '#0f172a',
  },
  modesGrid: { gap: 10 },
  modeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', padding: 12, gap: 12,
  },
  modeIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeText: { flex: 1 },
  modeLabel: { fontSize: 14, fontWeight: '700' as const, color: '#1e293b' },
  modeDesc: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 16 },
  modeCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  modeCheckMark: { fontSize: 12, fontWeight: '800' as const, color: '#fff' },
  btn: {
    backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },
  tokenHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tokenTitle: { fontSize: 15, fontWeight: '700' as const, color: '#1e293b' },
  tokenDesc: { fontSize: 13, color: '#64748b', lineHeight: 19 },
  tokenInput: { minHeight: 80, textAlignVertical: 'top' as const, paddingTop: 12 },

  userSelectHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 18,
  },
  userSelectLogoWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center',
  },
  userSelectTitle: { fontSize: 18, fontWeight: '800' as const, color: '#fff' },
  userSelectSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  userSelectList: { padding: 16, gap: 10 },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0',
    padding: 14, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  userAvatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: 22, fontWeight: '800' as const, color: '#fff' },
  userCardInfo: { flex: 1 },
  userCardName: { fontSize: 16, fontWeight: '700' as const, color: '#1e293b' },
  userCardRole: { fontSize: 12, color: '#64748b', marginTop: 2 },
  userCardCheck: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  userSelectFooter: {
    paddingHorizontal: 16, paddingTop: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff',
  },
  userSelectSkip: { alignItems: 'center', paddingVertical: 10 },
  userSelectSkipText: { fontSize: 14, color: '#94a3b8' },
  userSelectConfirm: {
    backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, gap: 4 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '800' as const, color: '#0f172a' },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  modalSubtitle: { fontSize: 13, color: '#64748b', paddingHorizontal: 20, paddingVertical: 12 },
  deviceOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', padding: 12, gap: 12,
  },
  deviceOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deviceOptionText: { flex: 1 },
  deviceOptionName: { fontSize: 14, fontWeight: '700' as const, color: '#1e293b' },
  deviceOptionSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  deviceOptionCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
