import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, Users, Search, Baby, ShoppingCart, PawPrint, MapPin, ChefHat, Mail, MessageCircle, Store, Smartphone, ArrowRight, RefreshCw } from 'lucide-react-native';
import { Image } from 'expo-image';
import { trpc, vanillaClient } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CuisineType } from '@/types';
import { getRestaurantImageUrl } from '@/lib/imageUrl';

const CUISINE_TYPES: { value: CuisineType; label: string }[] = [
  { value: 'pizzeria', label: 'Pizzería' },
  { value: 'marisqueria', label: 'Marisquería' },
  { value: 'asador', label: 'Asador' },
  { value: 'japonesa', label: 'Japonesa' },
  { value: 'italiana', label: 'Italiana' },
  { value: 'mediterranea', label: 'Mediterránea' },
  { value: 'fusion', label: 'Fusión' },
  { value: 'vegetariana', label: 'Vegetariana' },
  { value: 'sin-gluten', label: 'Sin gluten' },
  { value: 'tapas', label: 'Tapas' },
  { value: 'other', label: 'Otros' },
];

function extractParam(url: string, param: string): string | null {
  const regex = new RegExp('[?&]' + param + '=([^& ]+)');
  const match = url.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}

function parseComandaInput(input: string): { type: 'url'; token: string; view: string } | { type: 'id'; value: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const token = extractParam(trimmed, 'token') || '';
    const view = extractParam(trimmed, 'view') || 'comandera';
    console.log('[Login] URL detectada, token:', token ? token.slice(0, 12) + '...' : 'vacío', 'view:', view);
    if (token) {
      return { type: 'url', token, view };
    }
    console.warn('[Login] URL sin token, tratando como ID');
  }

  if (trimmed.startsWith('cmd-') || trimmed.startsWith('token-')) {
    return { type: 'url', token: trimmed, view: 'comandera' };
  }

  return { type: 'id', value: trimmed };
}

function NativeLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const checkSavedSession = useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem('comandasToken');
      const savedView = await AsyncStorage.getItem('comandasView');
      if (savedToken) {
        console.log('[Login] Sesión guardada encontrada, redirigiendo...');
        router.replace(`/restaurant/comandas?token=${savedToken}&view=${savedView || 'comandera'}`);
        return;
      }
    } catch (err) {
      console.log('[Login] Error leyendo sesión guardada:', err);
    } finally {
      setIsCheckingSession(false);
    }
  }, [router]);

  useEffect(() => {
    void checkSavedSession();
  }, [checkSavedSession]);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Login] Comprobando conectividad con https://quieromesa.com/api/health ...');
      const res = await fetch('https://quieromesa.com/api/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      console.log('[Login] Health check status:', res.status);
      return res.ok;
    } catch (err) {
      console.log('[Login] Health check falló:', err);
      return false;
    }
  }, []);

  const handleAccess = async () => {
    if (!input.trim()) {
      Alert.alert('Error', 'Introduce la ID del restaurante o la URL de acceso');
      return;
    }

    setIsLoading(true);
    const trimmedInput = input.trim();
    console.log('[Login] Procesando entrada:', trimmedInput);

    const parsed = parseComandaInput(trimmedInput);
    console.log('[Login] Entrada analizada tipo:', parsed?.type, parsed?.type === 'id' ? 'valor=' + (parsed as any).value : '');

    try {
      if (parsed?.type === 'url') {
        console.log('[Login] Accediendo con token:', parsed.token.slice(0, 12) + '...', 'vista:', parsed.view);
        await AsyncStorage.setItem('comandasToken', parsed.token);
        await AsyncStorage.setItem('comandasView', parsed.view);
        router.replace(`/restaurant/comandas?token=${parsed.token}&view=${parsed.view}`);
        return;
      }

      if (parsed?.type === 'id') {
        console.log('[Login] Validando ID/slug de restaurante:', parsed.value);

        const online = await checkConnectivity();
        if (!online) {
          Alert.alert(
            'Sin conexión',
            'No se puede conectar con quieromesa.com. Verifica que el servidor esté funcionando y que tengas acceso a internet.'
          );
          return;
        }

        let foundRestaurant: { id: string; name: string; slug: string } | null = null;
        let lastError = '';

        try {
          console.log('[Login] Consultando por restaurantId...');
          const result = await vanillaClient.restaurants.details.query({ restaurantId: parsed.value });
          if (result?.id) {
            foundRestaurant = { id: result.id, name: result.name, slug: result.slug };
          }
        } catch (err1) {
          lastError = err1 instanceof Error ? err1.message : String(err1);
          console.log('[Login] No encontrado por restaurantId:', lastError);
        }

        if (!foundRestaurant) {
          try {
            console.log('[Login] Consultando por slug...');
            const resultBySlug = await vanillaClient.restaurants.details.query({ slug: parsed.value });
            if (resultBySlug?.id) {
              foundRestaurant = { id: resultBySlug.id, name: resultBySlug.name, slug: resultBySlug.slug };
            }
          } catch (err2) {
            lastError = err2 instanceof Error ? err2.message : String(err2);
            console.log('[Login] No encontrado por slug:', lastError);
          }
        }

        if (foundRestaurant) {
          console.log('[Login] Restaurante encontrado:', foundRestaurant.name);
          await AsyncStorage.setItem('restaurantId', foundRestaurant.id);
          await AsyncStorage.setItem('restaurantName', foundRestaurant.name);
          await AsyncStorage.setItem('restaurantSlug', foundRestaurant.slug);
          router.replace(`/restaurant/login/${foundRestaurant.slug}`);
          return;
        }

        if (lastError.includes('suscripción') || lastError.includes('subscription')) {
          Alert.alert('Restaurante no disponible', lastError);
        } else if (lastError.includes('not found') || lastError.includes('not_found')) {
          Alert.alert('No encontrado', 'No se encontró ningún restaurante con esa ID o nombre. Verifica e inténtalo de nuevo.');
        } else {
          Alert.alert(
            'No se pudo conectar',
            `Verifica la ID e inténtalo de nuevo.${lastError ? '\n\nDetalle: ' + lastError : ''}`
          );
        }
        return;
      }

      Alert.alert('Error', 'Formato no reconocido. Introduce una ID de restaurante o una URL de acceso válida.');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log('[Login] Error de acceso inesperado:', errMsg);
      Alert.alert('Error de conexión', `No se pudo conectar al servidor.\n\nDetalle: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSession = async () => {
    await AsyncStorage.multiRemove(['comandasToken', 'comandasView', 'restaurantId', 'restaurantSlug', 'restaurantName', 'restaurantSession']);
    Alert.alert('Sesión borrada', 'Los datos de acceso han sido eliminados.');
  };

  if (isCheckingSession) {
    return (
      <View style={[nativeStyles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0f1117' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[nativeStyles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
        <View style={nativeStyles.logoArea}>
          <View style={nativeStyles.logoCircle}>
            <Smartphone size={36} color="#f97316" />
          </View>
          <Text style={nativeStyles.appName}>Quieromesa</Text>
          <Text style={nativeStyles.appSubtitle}>Comandas & Gestión</Text>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.cardTitle}>Acceder al sistema</Text>
          <Text style={nativeStyles.cardDesc}>
            Introduce la ID del restaurante, el slug o pega directamente la URL de acceso a comandas.
          </Text>

          <View style={nativeStyles.inputWrapper}>
            <TextInput
              style={nativeStyles.input}
              placeholder="ID, slug o URL de acceso..."
              placeholderTextColor="#4a5568"
              value={input}
              onChangeText={setInput}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={2}
            />
          </View>

          <Pressable
            style={[nativeStyles.button, isLoading && nativeStyles.buttonDisabled]}
            onPress={handleAccess}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={nativeStyles.buttonText}>Conectar</Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </View>

        <View style={nativeStyles.hintBox}>
          <Text style={nativeStyles.hintTitle}>¿Cómo acceder?</Text>
          <Text style={nativeStyles.hintText}>• ID del restaurante: <Text style={nativeStyles.hintCode}>rest-1234567890-abc</Text></Text>
          <Text style={nativeStyles.hintText}>• Slug del restaurante: <Text style={nativeStyles.hintCode}>mi-restaurante</Text></Text>
          <Text style={nativeStyles.hintText}>• URL de comandas completa desde el panel web</Text>
        </View>

        <Pressable style={nativeStyles.clearBtn} onPress={handleClearSession}>
          <RefreshCw size={14} color="#4a5568" />
          <Text style={nativeStyles.clearBtnText}>Borrar datos guardados</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const nativeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1117',
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 20,
  },
  logoArea: {
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e2235',
    borderWidth: 2,
    borderColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#f1f5f9',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  card: {
    backgroundColor: '#181c27',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#252840',
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#f1f5f9',
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  inputWrapper: {
    backgroundColor: '#0f1117',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#252840',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    fontSize: 14,
    color: '#f1f5f9',
    minHeight: 44,
  },
  button: {
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  hintBox: {
    backgroundColor: '#181c27',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#252840',
    gap: 6,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#94a3b8',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  hintCode: {
    color: '#f97316',
    fontFamily: 'monospace' as const,
  },
  clearBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#4a5568',
  },
});

export default function HomeScreen() {
  if (Platform.OS !== 'web') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <NativeLoginScreen />
      </>
    );
  }

  return <WebHomeScreen />;
}

function WebHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedPax, setSelectedPax] = useState<number | undefined>();
  const [needsHighChair, setNeedsHighChair] = useState<boolean>(false);
  const [needsStroller, setNeedsStroller] = useState<boolean>(false);
  const [hasPets, setHasPets] = useState<boolean>(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | undefined>();
  const [selectedCityId, setSelectedCityId] = useState<string | undefined>();
  const [selectedCuisines, setSelectedCuisines] = useState<CuisineType[]>([]);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const [showDateModal, setShowDateModal] = useState<boolean>(false);
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showPaxModal, setShowPaxModal] = useState<boolean>(false);
  const [showProvinceModal, setShowProvinceModal] = useState<boolean>(false);
  const [showCityModal, setShowCityModal] = useState<boolean>(false);
  const [showCuisineModal, setShowCuisineModal] = useState<boolean>(false);

  const provincesQuery = trpc.locations.provinces.useQuery();
  const citiesQuery = trpc.locations.cities.useQuery();
  const timeSlotsQuery = trpc.timeSlots.list.useQuery();
  const cuisineTypesQuery = trpc.cuisineTypes.byProvince.useQuery(
    { provinceId: selectedProvinceId! },
    {
      enabled: !!selectedProvinceId,
      refetchOnMount: true,
    }
  );

  useEffect(() => {
    if (selectedProvinceId) {
      void cuisineTypesQuery.refetch();
    }
  }, [selectedProvinceId, cuisineTypesQuery]);

  const selectedDateISO = useMemo(() => {
    if (!selectedDate) return undefined;
    const slots = timeSlotsQuery.data;
    if (!slots) return undefined;
    const today = new Date();
    const days: Date[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    const idx = days.findIndex(d => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', weekday: 'short' }) === selectedDate);
    if (idx === -1) return undefined;
    const d = days[idx];
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [selectedDate, timeSlotsQuery.data]);

  const restaurantsQuery = trpc.restaurants.list.useQuery({
    searchText: restaurantName || undefined,
    provinceId: selectedProvinceId,
    cityId: selectedCityId,
    cuisineTypes: selectedCuisines.length > 0 ? selectedCuisines.map(c => c.replace('cuisine-', '')) : undefined,
    date: selectedDateISO,
    time: selectedTime || undefined,
    guests: selectedPax,
    needsHighChair: needsHighChair || undefined,
    needsStroller: needsStroller || undefined,
    hasPets: hasPets || undefined,
  }, {
    enabled: hasSearched,
  });

  const next30Days = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const formatted = date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        weekday: 'short'
      });
      days.push(formatted);
    }
    return days;
  }, []);

  const filteredCities = useMemo(() => {
    if (!selectedProvinceId || !citiesQuery.data) return [];
    return citiesQuery.data.filter((c) => c.provinceId === selectedProvinceId);
  }, [selectedProvinceId, citiesQuery.data]);

  const availableCuisineTypes = useMemo(() => {
    if (!selectedProvinceId || !cuisineTypesQuery.data) return [];
    return cuisineTypesQuery.data;
  }, [selectedProvinceId, cuisineTypesQuery.data]);

  const toggleCuisine = (cuisineId: string) => {
    if (!selectedProvinceId) {
      Alert.alert('Atención', 'Primero debe seleccionar una provincia');
      return;
    }
    const cuisine = cuisineId as CuisineType;
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  };

  const handleSearch = () => {
    setHasSearched(true);
    if (hasSearched) {
      void restaurantsQuery.refetch();
    }
  };

  useEffect(() => {
    if (hasSearched) {
      void restaurantsQuery.refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateISO, selectedTime, selectedPax, needsHighChair, needsStroller, hasPets, selectedProvinceId, selectedCityId, selectedCuisines, restaurantName]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[webStyles.container, { paddingTop: insets.top }]}>
        <ScrollView
          style={webStyles.scrollView}
          contentContainerStyle={[webStyles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={webStyles.logoContainer}>
            <View style={webStyles.logoRow}>
              <View style={webStyles.searchIconCircle}>
                <Search size={28} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <View style={webStyles.brandWrapper}>
                <Text style={webStyles.logoText}>Qu</Text>
                <View style={webStyles.iContainer}>
                  <Text style={webStyles.heartDot}>♥</Text>
                  <Text style={[webStyles.logoText, webStyles.iText]}>ı</Text>
                </View>
                <Text style={webStyles.logoText}>ero</Text>
                <Text style={[webStyles.logoText, webStyles.pinkM]}>m</Text>
                <Text style={webStyles.logoText}>esa</Text>
              </View>
            </View>
          </View>

          <View style={webStyles.selectionRow}>
            <Pressable style={webStyles.selectionBox} onPress={() => setShowDateModal(true)}>
              <Calendar size={20} color="#FF1493" />
              <Text style={webStyles.selectionText}>{selectedDate || 'Fecha'}</Text>
            </Pressable>
            <Pressable style={webStyles.selectionBox} onPress={() => setShowTimeModal(true)}>
              <Clock size={20} color="#FF1493" />
              <Text style={webStyles.selectionText}>{selectedTime || 'Hora'}</Text>
            </Pressable>
            <Pressable style={webStyles.selectionBox} onPress={() => setShowPaxModal(true)}>
              <Users size={20} color="#FF1493" />
              <Text style={webStyles.selectionText}>{selectedPax ? `${selectedPax}` : 'Pax'}</Text>
            </Pressable>
          </View>

          <View style={webStyles.optionsRow}>
            <Pressable
              style={[webStyles.optionChip, needsHighChair && webStyles.optionChipActive]}
              onPress={() => setNeedsHighChair(!needsHighChair)}
            >
              <Baby size={18} color={needsHighChair ? '#FFFFFF' : '#FF1493'} />
              <Text style={[webStyles.optionText, needsHighChair && webStyles.optionTextActive]}>Necesito trona</Text>
            </Pressable>
            <Pressable
              style={[webStyles.optionChip, needsStroller && webStyles.optionChipActive]}
              onPress={() => setNeedsStroller(!needsStroller)}
            >
              <ShoppingCart size={18} color={needsStroller ? '#FFFFFF' : '#FF1493'} />
              <Text style={[webStyles.optionText, needsStroller && webStyles.optionTextActive]}>Voy con carrito de bebé</Text>
            </Pressable>
            <Pressable
              style={[webStyles.optionChip, hasPets && webStyles.optionChipActive]}
              onPress={() => setHasPets(!hasPets)}
            >
              <PawPrint size={18} color={hasPets ? '#FFFFFF' : '#FF1493'} />
              <Text style={[webStyles.optionText, hasPets && webStyles.optionTextActive]}>Voy con mi mascota</Text>
            </Pressable>
          </View>

          <Text style={webStyles.sectionTitle}>Descubre y reserva el mejor{`\n`}restaurante</Text>

          <Pressable style={webStyles.inputBox} onPress={() => setShowProvinceModal(true)}>
            <MapPin size={20} color="#CCCCCC" />
            <Text style={[webStyles.inputText, !selectedProvinceId && webStyles.placeholderText]}>
              {selectedProvinceId
                ? provincesQuery.data?.find((p) => p.id === selectedProvinceId)?.name
                : 'Provincia'}
            </Text>
          </Pressable>

          {selectedProvinceId && (
            <Pressable style={webStyles.inputBox} onPress={() => setShowCityModal(true)}>
              <MapPin size={20} color="#CCCCCC" />
              <Text style={[webStyles.inputText, !selectedCityId && webStyles.placeholderText]}>
                {selectedCityId
                  ? citiesQuery.data?.find((c) => c.id === selectedCityId)?.name
                  : 'Población'}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={webStyles.inputBox}
            onPress={() => {
              if (!selectedProvinceId) {
                Alert.alert('Atención', 'Primero debe seleccionar una provincia');
                return;
              }
              setShowCuisineModal(true);
            }}
          >
            <ChefHat size={20} color="#CCCCCC" />
            <Text style={[webStyles.inputText, selectedCuisines.length === 0 && webStyles.placeholderText]}>
              {selectedCuisines.length > 0 ? `${selectedCuisines.length} tipos seleccionados` : 'Tipo de cocina'}
            </Text>
          </Pressable>

          <View style={webStyles.inputBox}>
            <ChefHat size={20} color="#CCCCCC" />
            <TextInput
              style={webStyles.textInput}
              placeholder="Nombre del restaurante"
              placeholderTextColor="#999"
              value={restaurantName}
              onChangeText={setRestaurantName}
            />
          </View>

          <Pressable style={webStyles.searchButton} onPress={handleSearch}>
            <Text style={webStyles.searchButtonText}>BÚSQUEDA</Text>
          </Pressable>

          {hasSearched && (
            <View style={webStyles.resultsSection}>
              <Text style={webStyles.resultsTitle}>
                {restaurantsQuery.data?.length || 0} restaurantes encontrados
              </Text>
              {restaurantsQuery.isLoading && (
                <View style={webStyles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF1493" />
                </View>
              )}
              {!restaurantsQuery.isLoading &&
                restaurantsQuery.data?.map((restaurant) => (
                  <Link key={restaurant.id} href={`/client/restaurant/${restaurant.slug}`} asChild>
                    <Pressable style={webStyles.restaurantCard}>
                      <Image
                        source={{ uri: getRestaurantImageUrl(restaurant.imageUrl) }}
                        style={webStyles.restaurantImage}
                        contentFit="cover"
                      />
                      <View style={webStyles.restaurantInfo}>
                        <Text style={webStyles.restaurantName}>{restaurant.name}</Text>
                        <Text style={webStyles.restaurantDescription} numberOfLines={2}>
                          {restaurant.description}
                        </Text>
                        <View style={webStyles.restaurantMeta}>
                          <MapPin size={14} color="#CCCCCC" />
                          <Text style={webStyles.restaurantLocation}>
                            {restaurant.city?.name}, {restaurant.province?.name}
                          </Text>
                        </View>
                        <View style={webStyles.cuisineTagsContainer}>
                          {restaurant.cuisineType.slice(0, 3).map((type) => (
                            <View key={type} style={webStyles.cuisineTag}>
                              <Text style={webStyles.cuisineTagText}>
                                {CUISINE_TYPES.find((c) => c.value === type)?.label || type}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                ))}
              {!restaurantsQuery.isLoading && restaurantsQuery.data?.length === 0 && (
                <View style={webStyles.emptyContainer}>
                  <Text style={webStyles.emptyText}>No se encontraron restaurantes con estos criterios</Text>
                </View>
              )}
            </View>
          )}

          <View style={webStyles.imageContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80' }}
              style={webStyles.foodImage}
              contentFit="cover"
            />
          </View>

          <Pressable style={webStyles.subscribeSection} onPress={() => router.push('/subscribe')}>
            <Store size={32} color="#FF1493" />
            <Text style={webStyles.subscribeTitle}>¿Tienes un restaurante?</Text>
            <Text style={webStyles.subscribeDescription}>
              Únete a Quieromesa y empieza a recibir reservas online
            </Text>
            <View style={webStyles.subscribeBadge}>
              <Text style={webStyles.subscribeBadgeText}>Ver planes y suscribirte →</Text>
            </View>
          </Pressable>

          <View style={webStyles.supportSection}>
            <Text style={webStyles.supportTitle}>Soporte y Contratación</Text>
            <Text style={webStyles.supportDescription}>
              ¿Eres propietario de un restaurante y quieres ofrecer reservas online?
              ¿Eres un usuario de la app y has tenido algún problema? Contáctanos:
            </Text>
            <View style={webStyles.contactInfo}>
              <Mail size={18} color="#FF1493" />
              <Pressable onPress={() => Linking.openURL('mailto:info@quieromesa.com')}>
                <Text style={webStyles.contactText}>info@quieromesa.com</Text>
              </Pressable>
            </View>
            <View style={webStyles.buttonRow}>
              <Pressable
                style={[webStyles.contactButton, webStyles.whatsappButton]}
                onPress={() => Linking.openURL('https://wa.me/34615914434')}
              >
                <MessageCircle size={20} color="#FFFFFF" />
                <Text style={webStyles.contactButtonText}>WhatsApp</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
          <Pressable style={webStyles.modalOverlay} onPress={() => setShowDateModal(false)}>
            <View style={webStyles.modalContent}>
              <Text style={webStyles.modalTitle}>Selecciona una fecha</Text>
              <ScrollView style={webStyles.modalList}>
                {next30Days.map((date, index) => (
                  <Pressable key={index} style={webStyles.modalItem} onPress={() => { setSelectedDate(date); setShowDateModal(false); }}>
                    <Text style={webStyles.modalItemText}>{date}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={showTimeModal} transparent animationType="slide" onRequestClose={() => setShowTimeModal(false)}>
          <Pressable style={webStyles.modalOverlay} onPress={() => setShowTimeModal(false)}>
            <View style={webStyles.modalContent}>
              <Text style={webStyles.modalTitle}>Selecciona una hora</Text>
              <ScrollView style={webStyles.modalList}>
                {timeSlotsQuery.data?.map((slot) => (
                  <Pressable key={slot.id} style={webStyles.modalItem} onPress={() => { setSelectedTime(slot.time); setShowTimeModal(false); }}>
                    <Text style={webStyles.modalItemText}>{slot.time}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={showPaxModal} transparent animationType="slide" onRequestClose={() => setShowPaxModal(false)}>
          <Pressable style={webStyles.modalOverlay} onPress={() => setShowPaxModal(false)}>
            <View style={webStyles.modalContent}>
              <Text style={webStyles.modalTitle}>Selecciona número de comensales</Text>
              <ScrollView style={webStyles.modalList}>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <Pressable key={num} style={webStyles.modalItem} onPress={() => { setSelectedPax(num); setShowPaxModal(false); }}>
                    <Text style={webStyles.modalItemText}>{num} {num === 1 ? 'persona' : 'personas'}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={showProvinceModal} transparent animationType="slide" onRequestClose={() => setShowProvinceModal(false)}>
          <Pressable style={webStyles.modalOverlay} onPress={() => setShowProvinceModal(false)}>
            <View style={webStyles.modalContent}>
              <Text style={webStyles.modalTitle}>Selecciona una provincia</Text>
              <ScrollView style={webStyles.modalList}>
                {provincesQuery.data?.slice().sort((a, b) => a.name.localeCompare(b.name)).map((province) => (
                  <Pressable key={province.id} style={webStyles.modalItem} onPress={() => { setSelectedProvinceId(province.id); setSelectedCityId(undefined); setSelectedCuisines([]); setShowProvinceModal(false); }}>
                    <Text style={webStyles.modalItemText}>{province.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={showCityModal} transparent animationType="slide" onRequestClose={() => setShowCityModal(false)}>
          <Pressable style={webStyles.modalOverlay} onPress={() => setShowCityModal(false)}>
            <View style={webStyles.modalContent}>
              <Text style={webStyles.modalTitle}>Selecciona una población</Text>
              <ScrollView style={webStyles.modalList}>
                {filteredCities.slice().sort((a, b) => a.name.localeCompare(b.name)).map((city) => (
                  <Pressable key={city.id} style={webStyles.modalItem} onPress={() => { setSelectedCityId(city.id); setShowCityModal(false); }}>
                    <Text style={webStyles.modalItemText}>{city.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={showCuisineModal} transparent animationType="slide" onRequestClose={() => setShowCuisineModal(false)}>
          <Pressable style={webStyles.modalOverlay} onPress={() => setShowCuisineModal(false)}>
            <View style={webStyles.modalContent}>
              <Text style={webStyles.modalTitle}>Selecciona tipos de cocina</Text>
              <Text style={webStyles.modalSubtitle}>
                {selectedProvinceId ? 'Puedes seleccionar varios' : 'Primero selecciona una provincia'}
              </Text>
              <ScrollView style={webStyles.modalList}>
                {!selectedProvinceId ? (
                  <View style={webStyles.emptyContainer}>
                    <Text style={webStyles.emptyText}>Primero debe seleccionar una provincia</Text>
                  </View>
                ) : (
                  availableCuisineTypes.slice().sort((a, b) => a.name.localeCompare(b.name)).map((cuisine) => {
                    const cuisineName = cuisine.name;
                    const isSelected = selectedCuisines.includes(cuisineName as CuisineType);
                    return (
                      <Pressable
                        key={cuisine.id}
                        style={[webStyles.modalItem, isSelected && webStyles.modalItemActive]}
                        onPress={() => toggleCuisine(cuisineName)}
                      >
                        <Text style={[webStyles.modalItemText, isSelected && webStyles.modalItemTextActive]}>
                          {cuisineName}
                        </Text>
                        {isSelected && <Text style={webStyles.checkmark}>✓</Text>}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
              <Pressable style={webStyles.modalCloseButton} onPress={() => setShowCuisineModal(false)}>
                <Text style={webStyles.modalCloseButtonText}>Cerrar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </View>
    </>
  );
}

const webStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  logoContainer: { paddingTop: 30, paddingBottom: 20, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF1493', alignItems: 'center', justifyContent: 'center' },
  brandWrapper: { flexDirection: 'row', alignItems: 'flex-start', position: 'relative' as const },
  logoText: { fontSize: 36, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: 0.5 },
  pinkM: { color: '#FF1493' },
  iContainer: { position: 'relative' as const, alignItems: 'center', justifyContent: 'flex-end' },
  heartDot: { position: 'absolute' as const, top: -18, fontSize: 32, color: '#FF1493' },
  iText: { fontSize: 36, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: 0.5 },
  selectionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  selectionBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FF1493' },
  selectionText: { fontSize: 13, fontWeight: '600' as const, color: '#333', flex: 1 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  optionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#FF1493' },
  optionChipActive: { backgroundColor: '#FF1493', borderColor: '#FF1493' },
  optionText: { fontSize: 13, fontWeight: '600' as const, color: '#333' },
  optionTextActive: { color: '#FFFFFF' },
  sectionTitle: { fontSize: 28, fontWeight: '700' as const, color: '#FF1493', marginTop: 30, marginBottom: 20, lineHeight: 36 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FF1493', marginBottom: 12 },
  inputText: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' as const },
  placeholderText: { color: '#999' },
  textInput: { flex: 1, fontSize: 15, color: '#333' },
  searchButton: { backgroundColor: '#FF1493', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  searchButtonText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, paddingHorizontal: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: '700' as const, color: '#333', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  modalList: { maxHeight: 400 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalItemActive: { backgroundColor: '#FFF0F5' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalItemTextActive: { fontWeight: '600' as const, color: '#FF1493' },
  checkmark: { fontSize: 18, color: '#FF1493', fontWeight: '700' as const },
  modalCloseButton: { backgroundColor: '#FF1493', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginVertical: 16 },
  modalCloseButtonText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  resultsSection: { marginTop: 30 },
  resultsTitle: { fontSize: 16, fontWeight: '600' as const, color: '#CCCCCC', marginBottom: 16 },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  restaurantCard: { backgroundColor: '#1A2942', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2A3A52' },
  restaurantImage: { width: '100%', height: 180 },
  restaurantInfo: { padding: 16 },
  restaurantName: { fontSize: 20, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 6 },
  restaurantDescription: { fontSize: 14, color: '#CCCCCC', lineHeight: 20, marginBottom: 8 },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  restaurantLocation: { fontSize: 13, color: '#CCCCCC' },
  cuisineTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cuisineTag: { backgroundColor: '#FF1493', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  cuisineTagText: { fontSize: 12, fontWeight: '600' as const, color: '#FFFFFF' },
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  imageContainer: { marginTop: 30, borderRadius: 16, overflow: 'hidden', height: 300 },
  foodImage: { width: '100%', height: '100%' },
  supportSection: { marginTop: 40, marginBottom: 20, backgroundColor: '#1A2942', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#FF1493' },
  supportTitle: { fontSize: 22, fontWeight: '700' as const, color: '#FF1493', marginBottom: 12, textAlign: 'center' },
  supportDescription: { fontSize: 14, color: '#CCCCCC', lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, justifyContent: 'center' },
  contactText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' as const, textDecorationLine: 'underline' as const },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  contactButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF1493', paddingVertical: 14, borderRadius: 12 },
  whatsappButton: { backgroundColor: '#25D366' },
  contactButtonText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  subscribeSection: { marginTop: 40, marginBottom: 20, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32, alignItems: 'center' as const, borderWidth: 2, borderColor: '#FF1493', shadowColor: '#FF1493', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  subscribeTitle: { fontSize: 24, fontWeight: '700' as const, color: '#1F2937', marginTop: 16, marginBottom: 8, textAlign: 'center' as const },
  subscribeDescription: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 20, textAlign: 'center' as const },
  subscribeBadge: { backgroundColor: '#FF1493', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  subscribeBadgeText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
});
