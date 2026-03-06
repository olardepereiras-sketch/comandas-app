import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChefHat, Smartphone, Monitor, Settings2, ArrowRight, UtensilsCrossed } from 'lucide-react-native';

type Mode = 'waiter' | 'cashier' | 'kitchen' | 'floor-config';

interface ModeOption {
  key: Mode;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const MODES: ModeOption[] = [
  {
    key: 'waiter',
    label: 'Comandera',
    description: 'Para camarero — tomar pedidos de cada mesa',
    icon: <Smartphone size={28} color="#F97316" />,
    color: '#F97316',
    bg: '#FFF7ED',
  },
  {
    key: 'cashier',
    label: 'PC / Caja',
    description: 'Vista completa con opción de imprimir ticket',
    icon: <Monitor size={28} color="#0F3460" />,
    color: '#0F3460',
    bg: '#EFF6FF',
  },
  {
    key: 'kitchen',
    label: 'Monitor Cocina',
    description: 'Pantalla para cocina — gestionar pedidos en curso',
    icon: <ChefHat size={28} color="#10B981" />,
    color: '#10B981',
    bg: '#ECFDF5',
  },
  {
    key: 'floor-config',
    label: 'Configurar Plano',
    description: 'Posicionar y ajustar el plano de mesas',
    icon: <Settings2 size={28} color="#8B5CF6" />,
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAccess = async () => {
    if (!restaurantId.trim()) {
      Alert.alert('Campo requerido', 'Introduce el ID del restaurante.');
      return;
    }
    if (!selectedMode) {
      Alert.alert('Selecciona modo', 'Elige una opción de acceso.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push({
        pathname: `/${selectedMode}` as any,
        params: {
          restaurantId: restaurantId.trim(),
          restaurantName: restaurantName.trim() || restaurantId.trim(),
        },
      });
    }, 300);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <UtensilsCrossed size={32} color="#FFFFFF" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Sistema Comandas</Text>
          <Text style={styles.headerSub}>QuieroMesa · Gestión de pedidos</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DATOS DEL RESTAURANTE</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ID del Restaurante *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: abc123-def456"
                value={restaurantId}
                onChangeText={setRestaurantId}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#9CA3AF"
                testID="input-restaurant-id"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre del Restaurante (opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Casa Pepe"
                value={restaurantName}
                onChangeText={setRestaurantName}
                placeholderTextColor="#9CA3AF"
                testID="input-restaurant-name"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECCIONA EL MODO</Text>
            <View style={styles.modesGrid}>
              {MODES.map(mode => {
                const isSelected = selectedMode === mode.key;
                return (
                  <TouchableOpacity
                    key={mode.key}
                    style={[
                      styles.modeCard,
                      { borderColor: isSelected ? mode.color : '#E5E7EB' },
                      isSelected && { backgroundColor: mode.bg },
                    ]}
                    onPress={() => setSelectedMode(mode.key)}
                    testID={`mode-${mode.key}`}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.modeIconWrap, { backgroundColor: mode.bg }]}>
                      {mode.icon}
                    </View>
                    <View style={styles.modeTextWrap}>
                      <Text style={[styles.modeLabel, isSelected && { color: mode.color }]}>
                        {mode.label}
                      </Text>
                      <Text style={styles.modeDesc}>{mode.description}</Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.modeCheck, { backgroundColor: mode.color }]}>
                        <Text style={styles.modeCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.accessBtn, (!restaurantId.trim() || !selectedMode) && styles.accessBtnDisabled]}
            onPress={handleAccess}
            disabled={!restaurantId.trim() || !selectedMode || isLoading}
            testID="btn-access"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.accessBtnText}>Acceder</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7F4' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  content: { padding: 20, gap: 24 },
  section: { gap: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#9CA3AF',
    letterSpacing: 1.5,
  },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600' as const, color: '#374151' },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  modesGrid: { gap: 10 },
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  modeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTextWrap: { flex: 1, gap: 3 },
  modeLabel: { fontSize: 15, fontWeight: '700' as const, color: '#1F2937' },
  modeDesc: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  modeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCheckText: { fontSize: 13, fontWeight: '700' as const, color: '#FFFFFF' },
  accessBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  accessBtnDisabled: { backgroundColor: '#9CA3AF' },
  accessBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
});
