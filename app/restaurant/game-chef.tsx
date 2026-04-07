import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { trpc } from '@/lib/trpc';
import { getFullSessionData } from '@/lib/restaurantSession';
import { SPAIN_REGIONS } from '@/constants/gameData';
import { ChevronLeft, Gamepad2, QrCode, ToggleLeft, ToggleRight, Trash2, Plus, Bell, X, Trophy, Camera } from 'lucide-react-native';

const C = {
  bg: '#0f1117',
  surface: '#1a1d27',
  card: '#1e2230',
  border: '#2a2d3e',
  gold: '#f59e0b',
  goldLight: '#fbbf24',
  green: '#10b981',
  greenDark: '#065f46',
  red: '#ef4444',
  text: '#f1f5f9',
  textMuted: '#64748b',
  textDim: '#94a3b8',
  accent: '#6366f1',
  accentLight: '#818cf8',
};

interface MemoryImageInput {
  url: string;
  name: string;
}

interface GameNotification {
  id: number;
  username: string;
  score: number;
  position: number;
  achievedAt: string;
}

export default function GameChefScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState<string>('');
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [notifications, setNotifications] = useState<GameNotification[]>([]);

  const [isActive, setIsActive] = useState(true);
  const [triviaTheme, setTriviaTheme] = useState('galicia');
  const [memoryImages, setMemoryImages] = useState<MemoryImageInput[]>(
    Array(8).fill({ url: '', name: '' }).map((_, i) => ({ url: '', name: `Plato ${i + 1}` }))
  );

  const notifPulse = useRef(new Animated.Value(1)).current;

  const getConfigQuery = trpc.game.getConfig.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId, refetchOnWindowFocus: false }
  );

  const getNotificationsQuery = trpc.game.getNotifications.useQuery(
    { restaurantId: restaurantId || '' },
    {
      enabled: !!restaurantId,
      refetchInterval: 30000,
    }
  );

  const updateConfigMutation = trpc.game.updateConfig.useMutation();
  const dismissNotificationMutation = trpc.game.dismissNotification.useMutation();

  useEffect(() => {
    const load = async () => {
      try {
        const { restaurantId: id, restaurantSlug: slug, restaurantName: name } = await getFullSessionData();
        setRestaurantId(id);
        setRestaurantSlug(slug || '');
        setRestaurantName(name || 'Mi Restaurante');
      } catch (e) {
        console.error('[GameChef] Error loading session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (getConfigQuery.data) {
      const cfg = getConfigQuery.data;
      setIsActive(cfg.isActive);
      setTriviaTheme(cfg.triviaTheme || 'galicia');
      if (cfg.memoryImages && cfg.memoryImages.length > 0) {
        const filled = Array(8).fill(null).map((_, i) => ({
          url: cfg.memoryImages[i]?.url || '',
          name: cfg.memoryImages[i]?.name || `Plato ${i + 1}`,
        }));
        setMemoryImages(filled);
      }
    }
  }, [getConfigQuery.data]);

  useEffect(() => {
    if (getNotificationsQuery.data) {
      setNotifications(getNotificationsQuery.data);
      if (getNotificationsQuery.data.length > 0) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(notifPulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
            Animated.timing(notifPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
          ])
        ).start();
      }
    }
  }, [getNotificationsQuery.data]);

  const gameUrl = restaurantSlug ? `https://quieromesa.com/game?restaurant=${restaurantSlug}` : '';
  const qrUrl = gameUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=ffffff&color=0f1117&data=${encodeURIComponent(gameUrl)}` : '';

  const handleToggleActive = useCallback(async (value: boolean) => {
    if (!restaurantId) return;
    setIsActive(value);
    try {
      await updateConfigMutation.mutateAsync({ restaurantId, isActive: value });
      setSavedMsg(value ? '✅ Juego activado' : '⚠️ Juego desactivado');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {
      console.error('[GameChef] Error toggling active:', e);
      setIsActive(!value);
    }
  }, [restaurantId, updateConfigMutation]);

  const handleSaveTriviaTheme = useCallback(async (theme: string) => {
    if (!restaurantId) return;
    setTriviaTheme(theme);
    try {
      await updateConfigMutation.mutateAsync({ restaurantId, triviaTheme: theme });
      setSavedMsg('✅ Temática guardada');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {
      console.error('[GameChef] Error saving theme:', e);
    }
  }, [restaurantId, updateConfigMutation]);

  const handleSaveImages = useCallback(async () => {
    if (!restaurantId) return;
    const validImages = memoryImages.filter(img => img.url.trim() !== '');
    if (validImages.length < 8) {
      setSavedMsg('⚠️ Necesitas 8 imágenes completas');
      setTimeout(() => setSavedMsg(''), 3000);
      return;
    }
    setIsSaving(true);
    try {
      await updateConfigMutation.mutateAsync({ restaurantId, memoryImages });
      setSavedMsg('✅ Imágenes guardadas');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {
      console.error('[GameChef] Error saving images:', e);
      setSavedMsg('❌ Error al guardar');
      setTimeout(() => setSavedMsg(''), 2500);
    } finally {
      setIsSaving(false);
    }
  }, [restaurantId, memoryImages, updateConfigMutation]);

  const handleDismissNotification = useCallback(async (id: number) => {
    try {
      await dismissNotificationMutation.mutateAsync({ notificationId: id });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('[GameChef] Error dismissing notification:', e);
    }
  }, [dismissNotificationMutation]);

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handleUpdateImage = useCallback((index: number, field: 'url' | 'name', value: string) => {
    setMemoryImages(prev => prev.map((img, i) => i === index ? { ...img, [field]: value } : img));
  }, []);

  const handlePickMemoryImage = useCallback(async (index: number) => {
    if (!restaurantId) return;
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permisos necesarios', 'Necesitamos permisos para acceder a tu galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploadingIndex(index);
      const imageUri = result.assets[0].uri;

      const uploadFormData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        uploadFormData.append('file', blob, 'memory-image.jpg');
      } else {
        uploadFormData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'memory-image.jpg',
        } as any);
      }
      uploadFormData.append('restaurantId', restaurantId);
      uploadFormData.append('index', String(index));

      const baseUrl = Platform.OS === 'web' ? '' : 'https://quieromesa.com';
      const uploadResponse = await fetch(baseUrl + '/api/upload-game-memory-image', {
        method: 'POST',
        body: uploadFormData,
      });
      const uploadData = await uploadResponse.json();
      console.log('📸 [GAME-CHEF] Upload memory image response:', uploadData);

      if (uploadData.success && uploadData.imageUrl) {
        const imageUrl = String(uploadData.imageUrl);
        setMemoryImages(prev => prev.map((img, i) => i === index ? { ...img, url: imageUrl } : img));
      } else {
        throw new Error(uploadData.error || 'Error al subir la imagen');
      }
    } catch (error: any) {
      console.error('❌ [GAME-CHEF] Error picking/uploading memory image:', error);
      Alert.alert('Error', error.message || 'No se pudo subir la imagen');
    } finally {
      setUploadingIndex(null);
    }
  }, [restaurantId]);

  const handleOpenGame = useCallback(() => {
    if (gameUrl) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(gameUrl, '_blank');
      } else {
        Linking.openURL(gameUrl);
      }
    }
  }, [gameUrl]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={C.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>🎮 Juego Chef</Text>
          <Text style={styles.headerSub}>{restaurantName}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: isActive ? C.green : C.red }]} />
      </View>

      {savedMsg !== '' && (
        <View style={styles.savedBanner}>
          <Text style={styles.savedBannerText}>{savedMsg}</Text>
        </View>
      )}

      {notifications.length > 0 && (
        <View style={styles.notifSection}>
          {notifications.map(n => (
            <Animated.View key={n.id} style={[styles.notifCard, { transform: [{ scale: notifPulse }] }]}>
              <View style={styles.notifIcon}>
                <Trophy size={20} color={C.gold} />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>🏆 ¡Premio ganado!</Text>
                <Text style={styles.notifText}>
                  <Text style={styles.notifUsername}>{n.username}</Text> ha ganado un postre (#{n.position + 1} con {n.score} pts)
                </Text>
                <Text style={styles.notifDate}>{n.achievedAt}</Text>
              </View>
              <TouchableOpacity
                style={styles.notifClose}
                onPress={() => handleDismissNotification(n.id)}
              >
                <X size={16} color={C.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ToggleRight size={20} color={C.gold} />
            <Text style={styles.sectionTitle}>Estado del Juego</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{isActive ? '✅ Juego Activo' : '⏸️ Juego Pausado'}</Text>
                <Text style={styles.toggleDesc}>
                  {isActive
                    ? 'Los clientes pueden acceder al juego con tu QR'
                    : 'El juego está desactivado para tus clientes'}
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={handleToggleActive}
                trackColor={{ false: '#374151', true: C.green }}
                thumbColor={isActive ? '#fff' : '#9ca3af'}
                testID="game-active-switch"
              />
            </View>
          </View>
        </View>

        {restaurantSlug ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <QrCode size={20} color={C.gold} />
              <Text style={styles.sectionTitle}>Código QR del Juego</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: qrUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.urlBox}>
                <Text style={styles.urlLabel}>URL del juego:</Text>
                <Text style={styles.urlText} selectable>{gameUrl}</Text>
              </View>
              <TouchableOpacity style={styles.openGameBtn} onPress={handleOpenGame} activeOpacity={0.8}>
                <Gamepad2 size={18} color="#fff" />
                <Text style={styles.openGameBtnText}>Abrir juego</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.noSlugText}>⚠️ El restaurante no tiene slug configurado. Configura el slug en los ajustes del restaurante para generar el QR.</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={C.gold} />
            <Text style={styles.sectionTitle}>Temática de la Trivia</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldDesc}>
              Elige la temática de las preguntas de trivia que aparecerán en el juego cuando los clientes intenten recuperar vidas.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionsScroll}>
              <View style={styles.regionsRow}>
                {SPAIN_REGIONS.map(region => (
                  <TouchableOpacity
                    key={region.id}
                    style={[styles.regionChip, triviaTheme === region.id && styles.regionChipActive]}
                    onPress={() => handleSaveTriviaTheme(region.id)}
                    activeOpacity={0.8}
                    testID={`region-${region.id}`}
                  >
                    <Text style={styles.regionEmoji}>{region.emoji}</Text>
                    <Text style={[styles.regionName, triviaTheme === region.id && styles.regionNameActive]}>
                      {region.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.selectedRegionText}>
              Temática actual: <Text style={styles.selectedRegionValue}>
                {SPAIN_REGIONS.find(r => r.id === triviaTheme)?.emoji} {SPAIN_REGIONS.find(r => r.id === triviaTheme)?.name || triviaTheme}
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Plus size={20} color={C.gold} />
            <Text style={styles.sectionTitle}>Fotos del Memory</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldDesc}>
              Añade 8 fotos de tus platos para el juego de Memory. Los clientes tendrán que emparejar las imágenes para recuperar vidas.
            </Text>
            {memoryImages.map((img, index) => (
              <View key={index} style={styles.imageRow}>
                <View style={styles.imageIndexBadge}>
                  <Text style={styles.imageIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.imageInputs}>
                  <TouchableOpacity
                    style={styles.pickImageBtn}
                    onPress={() => handlePickMemoryImage(index)}
                    disabled={uploadingIndex === index}
                    activeOpacity={0.8}
                    testID={`image-pick-${index}`}
                  >
                    {uploadingIndex === index ? (
                      <ActivityIndicator size="small" color={C.gold} />
                    ) : (
                      <>
                        <Camera size={16} color={img.url ? C.green : C.gold} />
                        <Text style={[styles.pickImageBtnText, img.url ? styles.pickImageBtnTextDone : null]}>
                          {img.url ? 'Cambiar foto' : 'Añadir foto'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.imageUrlInput, styles.imageNameInput]}
                    value={img.name}
                    onChangeText={val => handleUpdateImage(index, 'name', val)}
                    placeholder="Nombre del plato..."
                    placeholderTextColor={C.textMuted}
                    testID={`image-name-${index}`}
                  />
                </View>
                {img.url ? (
                  <Image source={{ uri: img.url }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePreviewEmpty}>
                    <Text style={styles.imagePreviewEmptyText}>🍽️</Text>
                  </View>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={[styles.saveImagesBtn, isSaving && styles.savingBtn]}
              onPress={handleSaveImages}
              disabled={isSaving}
              activeOpacity={0.8}
              testID="save-images-button"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveImagesBtnText}>💾 Guardar imágenes del Memory</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.prizeInfoTitle}>🏆 Sistema de Premios</Text>
            <Text style={styles.prizeInfoText}>
              Los jugadores que entren en el <Text style={styles.prizeInfoBold}>Top 10 del ranking</Text> recibirán un mensaje indicando que han ganado un postre gratis en tu restaurante.
            </Text>
            <Text style={styles.prizeInfoText}>
              Cuando un cliente gane un postre, recibirás una notificación en esta pantalla con el nombre del jugador, su puntuación y la hora en que lo consiguió.
            </Text>
            <View style={styles.prizeExampleBox}>
              <Text style={styles.prizeExampleTitle}>Ejemplo del mensaje al cliente:</Text>
              <Text style={styles.prizeExampleText}>
                "🎉 ¡Has ganado un postre gratis en {restaurantName}! Preséntate con este mensaje al restaurante. Conseguido el 27/02/2026 a las 20:35"
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: C.text },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  savedBanner: {
    backgroundColor: '#1a2a1a',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a4a2a',
    alignItems: 'center',
  },
  savedBannerText: { fontSize: 14, color: '#4ade80', fontWeight: '600' as const },

  notifSection: {
    padding: 12,
    gap: 8,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1500',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3a2a00',
    gap: 10,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  notifIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2a1a00',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.gold,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '700' as const, color: C.gold, marginBottom: 2 },
  notifText: { fontSize: 12, color: '#e2c87a', lineHeight: 17 },
  notifUsername: { fontWeight: '700' as const, color: '#fff' },
  notifDate: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  notifClose: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 0 },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: C.text },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: '600' as const, color: C.text, marginBottom: 3 },
  toggleDesc: { fontSize: 12, color: C.textMuted, lineHeight: 17 },

  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  qrImage: { width: 200, height: 200 },

  urlBox: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  urlLabel: { fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: '600' as const, letterSpacing: 0.5 },
  urlText: { fontSize: 12, color: C.accentLight, lineHeight: 18 },

  openGameBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 12, gap: 8,
  },
  openGameBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#fff' },

  noSlugText: { fontSize: 13, color: '#f59e0b', lineHeight: 20 },

  fieldDesc: { fontSize: 12, color: C.textMuted, lineHeight: 18, marginBottom: 14 },

  regionsScroll: { marginBottom: 12 },
  regionsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  regionChip: {
    alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, minWidth: 80, gap: 4,
  },
  regionChipActive: { backgroundColor: '#1a1500', borderColor: C.gold },
  regionEmoji: { fontSize: 18 },
  regionName: { fontSize: 10, color: C.textMuted, fontWeight: '500' as const, textAlign: 'center' as const },
  regionNameActive: { color: C.gold, fontWeight: '700' as const },
  selectedRegionText: { fontSize: 12, color: C.textMuted },
  selectedRegionValue: { color: C.gold, fontWeight: '600' as const },

  imageRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  imageIndexBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  imageIndexText: { fontSize: 12, fontWeight: '800' as const, color: '#fff' },
  imageInputs: { flex: 1, gap: 6 },
  pickImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  pickImageBtnText: {
    fontSize: 12,
    color: C.gold,
    fontWeight: '600' as const,
  },
  pickImageBtnTextDone: {
    color: C.green,
  },
  imageUrlInput: {
    backgroundColor: C.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 12, color: C.text,
    borderWidth: 1, borderColor: C.border,
  },
  imageNameInput: { paddingVertical: 8 },
  imagePreview: { width: 52, height: 52, borderRadius: 8, marginTop: 4 },
  imagePreviewEmpty: {
    width: 52, height: 52, borderRadius: 8, marginTop: 4,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  imagePreviewEmptyText: { fontSize: 22 },

  saveImagesBtn: {
    backgroundColor: C.green, borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', marginTop: 8,
  },
  savingBtn: { opacity: 0.6 },
  saveImagesBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#fff' },

  prizeInfoTitle: { fontSize: 15, fontWeight: '700' as const, color: C.gold, marginBottom: 10 },
  prizeInfoText: { fontSize: 13, color: C.textDim, lineHeight: 20, marginBottom: 8 },
  prizeInfoBold: { fontWeight: '700' as const, color: C.text },
  prizeExampleBox: {
    backgroundColor: C.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.border, marginTop: 8,
  },
  prizeExampleTitle: { fontSize: 11, color: C.textMuted, fontWeight: '600' as const, marginBottom: 6 },
  prizeExampleText: { fontSize: 12, color: C.accentLight, lineHeight: 18, fontStyle: 'italic' as const },
});
