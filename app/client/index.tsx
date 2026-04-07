import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Stack, Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, Users, Baby, ShoppingCart, PawPrint, MapPin, ChefHat, Heart, BookOpen, ExternalLink } from 'lucide-react-native';
import { Image } from 'expo-image';
import { trpc } from '@/lib/trpc';
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

function handleCustomLinkPress(url: string, router: ReturnType<typeof useRouter>) {
  try {
    const internalPrefixes = [
      'https://quieromesa.com',
      'http://quieromesa.com',
      'https://www.quieromesa.com',
    ];
    let internalPath: string | null = null;
    for (const prefix of internalPrefixes) {
      if (url.startsWith(prefix)) {
        internalPath = url.replace(prefix, '');
        break;
      }
    }
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (url.startsWith(origin)) {
        internalPath = url.replace(origin, '');
      }
    }
    if (internalPath) {
      router.push(internalPath as any);
    } else {
      Linking.openURL(url);
    }
  } catch {
    Linking.openURL(url);
  }
}

export default function ClientScreen() {
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
  
  const [showDateModal, setShowDateModal] = useState<boolean>(false);
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showPaxModal, setShowPaxModal] = useState<boolean>(false);
  const [showProvinceModal, setShowProvinceModal] = useState<boolean>(false);
  const [showCityModal, setShowCityModal] = useState<boolean>(false);
  const [showCuisineModal, setShowCuisineModal] = useState<boolean>(false);

  const provincesQuery = trpc.locations.provinces.useQuery();
  const citiesQuery = trpc.locations.cities.useQuery();

  const restaurantsQuery = trpc.restaurants.list.useQuery({
    searchText: restaurantName || undefined,
    provinceId: selectedProvinceId,
    cityId: selectedCityId,
    cuisineTypes: selectedCuisines.length > 0 ? selectedCuisines : undefined,
  });

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

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

  const toggleCuisine = (cuisine: CuisineType) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.brandText}>
            Qu
            <Text style={styles.brandHeart}>♥</Text>
            eromesa
          </Text>
        </View>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={styles.mainSection}>
            <View style={styles.selectionRow}>
              <Pressable 
                style={styles.selectionBox}
                onPress={() => setShowDateModal(true)}
              >
                <Calendar size={20} color="#FF6B95" />
                <Text style={styles.selectionText}>
                  {selectedDate || 'Fecha'}
                </Text>
              </Pressable>

              <Pressable 
                style={styles.selectionBox}
                onPress={() => setShowTimeModal(true)}
              >
                <Clock size={20} color="#FF6B95" />
                <Text style={styles.selectionText}>
                  {selectedTime || 'Hora'}
                </Text>
              </Pressable>

              <Pressable 
                style={styles.selectionBox}
                onPress={() => setShowPaxModal(true)}
              >
                <Users size={20} color="#FF6B95" />
                <Text style={styles.selectionText}>
                  {selectedPax ? `${selectedPax}` : 'Pax'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.optionsRow}>
              <Pressable
                style={[styles.optionChip, needsHighChair && styles.optionChipActive]}
                onPress={() => setNeedsHighChair(!needsHighChair)}
              >
                <Baby size={18} color={needsHighChair ? '#FFFFFF' : '#FF6B95'} />
                <Text style={[styles.optionText, needsHighChair && styles.optionTextActive]}>
                  Necesito trona
                </Text>
              </Pressable>

              <Pressable
                style={[styles.optionChip, needsStroller && styles.optionChipActive]}
                onPress={() => setNeedsStroller(!needsStroller)}
              >
                <ShoppingCart size={18} color={needsStroller ? '#FFFFFF' : '#FF6B95'} />
                <Text style={[styles.optionText, needsStroller && styles.optionTextActive]}>
                  Voy con carrito de bebé
                </Text>
              </Pressable>

              <Pressable
                style={[styles.optionChip, hasPets && styles.optionChipActive]}
                onPress={() => setHasPets(!hasPets)}
              >
                <PawPrint size={18} color={hasPets ? '#FFFFFF' : '#FF6B95'} />
                <Text style={[styles.optionText, hasPets && styles.optionTextActive]}>
                  Voy con mi mascota
                </Text>
              </Pressable>
            </View>

            <Pressable 
              style={styles.inputBox}
              onPress={() => setShowProvinceModal(true)}
            >
              <MapPin size={20} color="#7F8C8D" />
              <Text style={[styles.inputText, !selectedProvinceId && styles.placeholderText]}>
                {selectedProvinceId
                  ? provincesQuery.data?.find((p) => p.id === selectedProvinceId)?.name
                  : 'Provincia'}
              </Text>
            </Pressable>

            {selectedProvinceId && (
              <Pressable 
                style={styles.inputBox}
                onPress={() => setShowCityModal(true)}
              >
                <MapPin size={20} color="#7F8C8D" />
                <Text style={[styles.inputText, !selectedCityId && styles.placeholderText]}>
                  {selectedCityId
                    ? citiesQuery.data?.find((c) => c.id === selectedCityId)?.name
                    : 'Población'}
                </Text>
              </Pressable>
            )}

            <Pressable 
              style={styles.inputBox}
              onPress={() => setShowCuisineModal(true)}
            >
              <ChefHat size={20} color="#7F8C8D" />
              <Text style={[styles.inputText, selectedCuisines.length === 0 && styles.placeholderText]}>
                {selectedCuisines.length > 0
                  ? `${selectedCuisines.length} tipos seleccionados`
                  : 'Tipo de cocina'}
              </Text>
            </Pressable>

            <View style={styles.inputBox}>
              <ChefHat size={20} color="#7F8C8D" />
              <TextInput
                style={styles.textInput}
                placeholder="Nombre del restaurante"
                placeholderTextColor="#95A5A6"
                value={restaurantName}
                onChangeText={setRestaurantName}
              />
            </View>

            <Pressable style={styles.searchButton}>
              <Text style={styles.searchButtonText}>Buscar</Text>
            </Pressable>
          </View>



          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {restaurantsQuery.data?.length || 0} restaurantes encontrados
            </Text>

            {restaurantsQuery.isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
              </View>
            )}

            {!restaurantsQuery.isLoading &&
              restaurantsQuery.data?.map((restaurant) => {
                const enabledLinks = (restaurant.customLinks as any[] | undefined)?.filter(
                  (l: any) => l.enabled && l.url && l.buttonText
                ) ?? [];
                return (
                  <View key={restaurant.id} style={styles.restaurantCardWrapper}>
                    <Link href={`/client/restaurant/${restaurant.slug}` as any} asChild>
                      <Pressable style={styles.restaurantCard}>
                        <Image
                          source={{ uri: getRestaurantImageUrl(restaurant.imageUrl) }}
                          style={styles.restaurantImage}
                          contentFit="cover"
                        />
                        <View style={styles.restaurantInfo}>
                          <Text style={styles.restaurantName}>{restaurant.name}</Text>
                          <Text style={styles.restaurantDescription} numberOfLines={2}>
                            {restaurant.description}
                          </Text>
                          <View style={styles.restaurantMeta}>
                            <MapPin size={14} color="#7F8C8D" />
                            <Text style={styles.restaurantLocation}>
                              {restaurant.city?.name}, {restaurant.province?.name}
                            </Text>
                          </View>
                          <View style={styles.cuisineTagsContainer}>
                            {restaurant.cuisineType.slice(0, 3).map((type) => (
                              <View key={type} style={styles.cuisineTag}>
                                <Text style={styles.cuisineTagText}>
                                  {CUISINE_TYPES.find((c) => c.value === type)?.label || type}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </Pressable>
                    </Link>
                    {enabledLinks.length > 0 && (
                      <View style={styles.cardLinksRow}>
                        <Text style={styles.cardLinksLabel}>Ver carta / menú</Text>
                        <View style={styles.cardLinksBtns}>
                          {enabledLinks.map((link: any, idx: number) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.cardLinkBtn}
                              onPress={() => handleCustomLinkPress(link.url, router)}
                              activeOpacity={0.75}
                            >
                              <BookOpen size={13} color="#FF6B95" strokeWidth={2.5} />
                              <Text style={styles.cardLinkText} numberOfLines={1}>{link.buttonText}</Text>
                              <ExternalLink size={11} color="#FF6B95" strokeWidth={2.5} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

            {!restaurantsQuery.isLoading && restaurantsQuery.data?.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No se encontraron restaurantes con estos criterios
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <Modal
          visible={showDateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDateModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowDateModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecciona una fecha</Text>
              <ScrollView style={styles.modalList}>
                {next30Days.map((date, index) => (
                  <Pressable
                    key={index}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedDate(date);
                      setShowDateModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{date}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={showTimeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimeModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowTimeModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecciona una hora</Text>
              <ScrollView style={styles.modalList}>
                {timeSlots.map((time) => (
                  <Pressable
                    key={time}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedTime(time);
                      setShowTimeModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{time}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={showPaxModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPaxModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowPaxModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecciona número de comensales</Text>
              <ScrollView style={styles.modalList}>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <Pressable
                    key={num}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedPax(num);
                      setShowPaxModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{num} {num === 1 ? 'persona' : 'personas'}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={showProvinceModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProvinceModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowProvinceModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecciona una provincia</Text>
              <ScrollView style={styles.modalList}>
                {provincesQuery.data
                  ?.slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((province) => (
                    <Pressable
                      key={province.id}
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedProvinceId(province.id);
                        setSelectedCityId(undefined);
                        setShowProvinceModal(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{province.name}</Text>
                    </Pressable>
                  ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={showCityModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCityModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowCityModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecciona una población</Text>
              <ScrollView style={styles.modalList}>
                {filteredCities
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((city) => (
                    <Pressable
                      key={city.id}
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedCityId(city.id);
                        setShowCityModal(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{city.name}</Text>
                    </Pressable>
                  ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={showCuisineModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCuisineModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowCuisineModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecciona tipos de cocina</Text>
              <Text style={styles.modalSubtitle}>Puedes seleccionar varios</Text>
              <ScrollView style={styles.modalList}>
                {CUISINE_TYPES.slice()
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((cuisine) => (
                    <Pressable
                      key={cuisine.value}
                      style={[
                        styles.modalItem,
                        selectedCuisines.includes(cuisine.value) && styles.modalItemActive,
                      ]}
                      onPress={() => toggleCuisine(cuisine.value)}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          selectedCuisines.includes(cuisine.value) && styles.modalItemTextActive,
                        ]}
                      >
                        {cuisine.label}
                      </Text>
                      {selectedCuisines.includes(cuisine.value) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </Pressable>
                  ))}
              </ScrollView>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowCuisineModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cerrar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5EC',
  },
  brandText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#2C3E50',
  },
  brandHeart: {
    color: '#FF6B95',
    fontSize: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  mainSection: {
    marginBottom: 24,
  },
  selectionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  selectionBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD4E0',
    shadowColor: '#FF6B95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD4E0',
  },
  optionChipActive: {
    backgroundColor: '#FF6B95',
    borderColor: '#FF6B95',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD4E0',
    marginBottom: 12,
    shadowColor: '#FF6B95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500' as const,
  },
  placeholderText: {
    color: '#95A5A6',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#2C3E50',
  },
  searchButton: {
    backgroundColor: '#FF6B95',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF6B95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemActive: {
    backgroundColor: '#FFF5F7',
  },
  modalItemText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  modalItemTextActive: {
    fontWeight: '600' as const,
    color: '#FF6B95',
  },
  checkmark: {
    fontSize: 18,
    color: '#FF6B95',
    fontWeight: '700' as const,
  },
  modalCloseButton: {
    backgroundColor: '#FF6B95',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  modalCloseButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  resultsSection: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  restaurantCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  restaurantImage: {
    width: '100%',
    height: 180,
  },
  restaurantInfo: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#2C3E50',
    marginBottom: 6,
  },
  restaurantDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  restaurantLocation: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  cuisineTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cuisineTag: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cuisineTagText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#4ECDC4',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
  },
  restaurantCardWrapper: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardLinksRow: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFE5EC',
    backgroundColor: '#FFFBFC',
  },
  cardLinksLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#94A3B8',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  cardLinksBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF0F4',
    borderWidth: 1,
    borderColor: '#FFD4E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cardLinkText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FF6B95',
    maxWidth: 160,
  },
});
