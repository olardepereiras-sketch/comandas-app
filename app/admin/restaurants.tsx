import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Clipboard, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, Plus, Search, Edit2, Trash2, X, Copy, ExternalLink, Headphones, Link2, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Restaurant, CuisineType } from '@/types';

const cuisineTypes: { value: CuisineType; label: string }[] = [
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
  { value: 'other', label: 'Otra' },
];

interface RestaurantFormData {
  name: string;
  description: string;
  username: string;
  password: string;
  profileImageUrl: string;
  googleMapsUrl: string;
  cuisineType: CuisineType[];
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  cityId: string;
  provinceId: string;
  subscriptionPlanId: string;
  subscriptionDurationMonths: number;
  salesRepId: string;
}

export default function AdminRestaurantsScreen() {
  const insets = useSafeAreaInsets();
  const [sessionId, setSessionId] = useState('');
  const [supportLoadingId, setSupportLoadingId] = useState<string | null>(null);
  const [copyLoadingId, setCopyLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userType, setUserType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void AsyncStorage.getItem('adminSession').then(s => { if (s) setSessionId(s); });
    void AsyncStorage.getItem('adminIsSuperAdmin').then(v => { if (v === 'true') setIsSuperAdmin(true); });
    void AsyncStorage.getItem('adminUserType').then(v => { if (v) setUserType(v); });
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportModalUrl] = useState('');
  const [supportModalRestaurantName] = useState('');
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [selectedDurationId, setSelectedDurationId] = useState('');
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: '',
    description: '',
    username: '',
    password: '',
    profileImageUrl: '',
    googleMapsUrl: '',
    cuisineType: [],
    address: '',
    postalCode: '',
    phone: '',
    email: '',
    cityId: '',
    provinceId: '',
    subscriptionPlanId: '',
    subscriptionDurationMonths: 12,
    salesRepId: '',
  });

  const queryClient = useQueryClient();

  const restaurantsQuery = trpc.restaurants.list.useQuery({ includeInactive: true });
  const provincesQuery = trpc.locations.provinces.useQuery();
  const citiesQuery = trpc.locations.cities.useQuery();
  const plansQuery = trpc.subscriptionPlans.list.useQuery();
  const durationsQuery = trpc.subscriptionDurations.list.useQuery();
  const salesRepsQuery = trpc.salesReps.list.useQuery();

  
  const provinceCuisineTypesQuery = trpc.cuisineTypes.byProvince.useQuery(
    { provinceId: formData.provinceId },
    { enabled: !!formData.provinceId }
  );

  const restaurants = restaurantsQuery.data || [];
  const provinces = provincesQuery.data || [];
  const cities = citiesQuery.data || [];
  const plans = plansQuery.data || [];
  const durations = durationsQuery.data || [];
  const salesReps = salesRepsQuery.data || [];
  const availableCuisineTypes = formData.provinceId && provinceCuisineTypesQuery.data
    ? provinceCuisineTypesQuery.data
    : [];

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (restaurant?: Restaurant) => {
    if (restaurant) {
      setEditingRestaurant(restaurant);
      setFormData({
        name: restaurant.name,
        description: restaurant.description,
        username: restaurant.username || '',
        password: restaurant.password || '',
        profileImageUrl: restaurant.profileImageUrl || '',
        googleMapsUrl: restaurant.googleMapsUrl || '',
        cuisineType: restaurant.cuisineType,
        address: restaurant.address,
        postalCode: restaurant.postalCode || '',
        phone: restaurant.phone[0] || '',
        email: restaurant.email,
        cityId: restaurant.cityId,
        provinceId: restaurant.provinceId,
        subscriptionPlanId: restaurant.subscriptionPlanId || '',
        subscriptionDurationMonths: 12,
        salesRepId: restaurant.salesRepId || '',
      });
    } else {
      setEditingRestaurant(null);
      setFormData({
        name: '',
        description: '',
        username: '',
        password: '',
        profileImageUrl: '',
        googleMapsUrl: '',
        cuisineType: [],
        address: '',
        postalCode: '',
        phone: '',
        email: '',
        cityId: '',
        provinceId: '',
        subscriptionPlanId: '',
        subscriptionDurationMonths: 12,
        salesRepId: 'salesrep-website',
      });
    }
    setSelectedDurationId('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRestaurant(null);
  };

  const createRestaurantMutation = trpc.restaurants.create.useMutation({
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: [['restaurants', 'list']] });
      handleCloseModal();
      Alert.alert(
        'Éxito',
        `Restaurante creado correctamente.\n\nRuta de acceso:\n${data.accessUrl}`,
        [
          { text: 'OK' }
        ]
      );
    },
    onError: (error) => {
      console.error('Error creating restaurant:', error);
      Alert.alert('Error', error.message);
    },
  });

  const updateRestaurantMutation = trpc.restaurants.update.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['restaurants', 'list']] });
      handleCloseModal();
      Alert.alert('Éxito', 'Restaurante actualizado correctamente');
    },
    onError: (error) => {
      console.error('Error updating restaurant:', error);
      Alert.alert('Error', error.message);
    },
  });

  const deleteRestaurantMutation = trpc.restaurants.delete.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['restaurants', 'list']] });
      Alert.alert('Éxito', 'Restaurante eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting restaurant:', error);
      Alert.alert('Error', error.message);
    },
  });

  const generateSupportTokenMutation = trpc.restaurants.generateSupportToken.useMutation({
    onSuccess: () => {},
    onError: () => {},
  });

  const handleSupportOpen = async (restaurantId: string) => {
    const sid = sessionId || await AsyncStorage.getItem('adminSession') || '';
    if (!sid) {
      if (typeof window !== 'undefined') window.alert('Error: Sin sesión activa. Por favor, inicia sesión de nuevo.');
      else Alert.alert('Error', 'Sin sesión activa');
      return;
    }
    console.log('🔑 [SUPPORT] Abriendo panel para restaurantId:', restaurantId);
    setSupportLoadingId(restaurantId);
    try {
      const data = await generateSupportTokenMutation.mutateAsync({ sessionId: sid, restaurantId });
      const url = `https://quieromesa.com${data.accessUrl}`;
      console.log('🔑 [SUPPORT] Token generado, navegando a:', url);
      if (typeof window !== 'undefined') {
        window.location.href = url;
      } else {
        void Linking.openURL(url);
      }
    } catch (e: any) {
      console.error('🔑 [SUPPORT] Error:', e?.message);
      const msg = e?.message || 'No se pudo generar el enlace de soporte';
      if (typeof window !== 'undefined') window.alert('Error: ' + msg);
      else Alert.alert('Error', msg);
    } finally {
      setSupportLoadingId(null);
    }
  };

  const handleSupportCopyLink = async (restaurantId: string) => {
    const sid = sessionId || await AsyncStorage.getItem('adminSession') || '';
    if (!sid) {
      if (typeof window !== 'undefined') window.alert('Error: Sin sesión activa. Por favor, inicia sesión de nuevo.');
      else Alert.alert('Error', 'Sin sesión activa');
      return;
    }
    console.log('🔑 [SUPPORT COPY] Copiando enlace para restaurantId:', restaurantId);
    setCopyLoadingId(restaurantId);
    try {
      const data = await generateSupportTokenMutation.mutateAsync({ sessionId: sid, restaurantId });
      const url = `https://quieromesa.com${data.accessUrl}`;
      console.log('🔑 [SUPPORT COPY] URL generada:', url);
      let copied = false;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(url);
          copied = true;
        } catch (clipErr) {
          console.error('[SUPPORT COPY] clipboard error:', clipErr);
        }
      }
      if (!copied) {
        Clipboard.setString(url);
        copied = true;
      }
      if (copied) {
        setCopiedId(restaurantId);
        setTimeout(() => setCopiedId(null), 3000);
        console.log('🔑 [SUPPORT COPY] Copiado exitosamente');
      }
    } catch (e: any) {
      console.error('🔑 [SUPPORT COPY] Error:', e?.message);
      const msg = e?.message || 'No se pudo generar el enlace';
      if (typeof window !== 'undefined') window.alert('Error: ' + msg);
      else Alert.alert('Error', msg);
    } finally {
      setCopyLoadingId(null);
    }
  };

  const loadDurationMutation = trpc.restaurants.loadDuration.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['restaurants', 'list']] });
      Alert.alert('Éxito', 'Duración cargada correctamente');
      setSelectedDurationId('');
    },
    onError: (error) => {
      console.error('Error loading duration:', error);
      Alert.alert('Error', error.message);
    },
  });

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.phone) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    if (!formData.cityId || !formData.provinceId) {
      Alert.alert('Error', 'Selecciona provincia y población');
      return;
    }

    if (!formData.username || !formData.password) {
      Alert.alert('Error', 'Usuario y contraseña son obligatorios');
      return;
    }

    if (editingRestaurant) {
      updateRestaurantMutation.mutate({
        id: editingRestaurant.id,
        name: formData.name,
        description: formData.description,
        username: formData.username,
        password: formData.password,
        profileImageUrl: formData.profileImageUrl,
        googleMapsUrl: formData.googleMapsUrl,
        cuisineType: formData.cuisineType,
        address: formData.address,
        postalCode: formData.postalCode,
        phone: formData.phone,
        email: formData.email,
        cityId: formData.cityId,
        provinceId: formData.provinceId,
        subscriptionPlanId: formData.subscriptionPlanId,
        salesRepId: formData.salesRepId,
      });
    } else {
      createRestaurantMutation.mutate({
        name: formData.name,
        description: formData.description,
        username: formData.username,
        password: formData.password,
        profileImageUrl: formData.profileImageUrl,
        googleMapsUrl: formData.googleMapsUrl,
        cuisineType: formData.cuisineType,
        address: formData.address,
        postalCode: formData.postalCode,
        phone: formData.phone,
        email: formData.email,
        cityId: formData.cityId,
        provinceId: formData.provinceId,
        subscriptionPlanId: formData.subscriptionPlanId,
        subscriptionDurationMonths: formData.subscriptionDurationMonths,
        salesRepId: formData.salesRepId,
      });
    }
  };

  const handleDelete = (id: string) => {
    console.log('🗑️ [DELETE] Botón presionado para restaurante:', id);
    
    const executeMutation = () => {
      console.log('✅ [DELETE] Ejecutando mutación de eliminación');
      deleteRestaurantMutation.mutate({ id });
    };

    if (typeof window !== 'undefined' && window.confirm) {
      console.log('📱 [DELETE] Mostrando window.confirm');
      const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este restaurante?');
      console.log('📱 [DELETE] Usuario respondió:', confirmed);
      if (confirmed) {
        executeMutation();
      } else {
        console.log('❌ [DELETE] Usuario canceló');
      }
    } else {
      console.log('📱 [DELETE] Mostrando Alert.alert');
      Alert.alert(
        'Eliminar Restaurante',
        '¿Estás seguro de que quieres eliminar este restaurante?',
        [
          { 
            text: 'Cancelar', 
            style: 'cancel',
            onPress: () => console.log('❌ [DELETE] Usuario canceló')
          },
          { 
            text: 'Eliminar', 
            style: 'destructive', 
            onPress: executeMutation
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestión de Restaurantes</Text>
        <Text style={styles.headerSubtitle}>{restaurants.length} restaurantes</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#64748b" strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar restaurantes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
        {isSuperAdmin && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => handleOpenModal()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.addButtonGradient}
            >
              <Plus size={24} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredRestaurants.map((restaurant) => (
          <View key={restaurant.id} style={styles.restaurantCard}>
            <View style={styles.restaurantInfo}>
              <View style={styles.restaurantHeader}>
                <Building2 size={24} color="#3b82f6" strokeWidth={2.5} />
                <View style={styles.restaurantTitleContainer}>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  <Text style={styles.restaurantDescription}>{restaurant.description}</Text>
                </View>
              </View>
              
              <View style={styles.cuisineTypesContainer}>
                {restaurant.cuisineType.map((type) => (
                  <View key={type} style={styles.cuisineTypeBadge}>
                    <Text style={styles.cuisineTypeText}>
                      {cuisineTypes.find(c => c.value === type)?.label || type}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.restaurantDetails}>
                <Text style={styles.restaurantDetailText}>📍 {restaurant.address}</Text>
                <Text style={styles.restaurantDetailText}>📞 {restaurant.phone[0]}</Text>
                <Text style={styles.restaurantDetailText}>✉️ {restaurant.email}</Text>
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, restaurant.isActive ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusText, !restaurant.isActive && styles.statusTextInactive]}>
                    {restaurant.isActive ? 'Activo' : restaurant.subscriptionExpiry && new Date(restaurant.subscriptionExpiry) < new Date() ? 'Suscripción Caducada' : 'Desactivado'}
                  </Text>
                </View>
                {restaurant.subscriptionExpiry && (
                  <Text style={styles.expiryText}>
                    Caduca: {new Date(restaurant.subscriptionExpiry).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <View style={styles.urlsContainer}>
                <View style={styles.urlBox}>
                  <View style={styles.urlHeader}>
                    <ExternalLink size={16} color="#3b82f6" strokeWidth={2} />
                    <Text style={styles.urlLabel}>Acceso Restaurante</Text>
                  </View>
                  <Text style={styles.urlText} numberOfLines={1}>
                    https://quieromesa.com/restaurant/login/{restaurant.slug}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => {
                      Clipboard.setString(`https://quieromesa.com/restaurant/login/${restaurant.slug}`);
                      Alert.alert('✓ Copiado', 'URL copiada al portapapeles');
                    }}
                    activeOpacity={0.7}
                  >
                    <Copy size={16} color="#3b82f6" strokeWidth={2} />
                    <Text style={styles.copyButtonText}>Copiar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.urlBox}>
                  <View style={styles.urlHeader}>
                    <ExternalLink size={16} color="#10b981" strokeWidth={2} />
                    <Text style={styles.urlLabel}>Acceso Clientes</Text>
                  </View>
                  <Text style={styles.urlText} numberOfLines={1}>
                    https://quieromesa.com/client/restaurant/{restaurant.slug}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => {
                      Clipboard.setString(`https://quieromesa.com/client/restaurant/${restaurant.slug}`);
                      Alert.alert('✓ Copiado', 'URL copiada al portapapeles');
                    }}
                    activeOpacity={0.7}
                  >
                    <Copy size={16} color="#10b981" strokeWidth={2} />
                    <Text style={styles.copyButtonText}>Copiar</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.urlBox, styles.idBox]}>
                  <View style={styles.urlHeader}>
                    <Copy size={16} color="#f59e0b" strokeWidth={2} />
                    <Text style={[styles.urlLabel, styles.idLabel]}>ID del Restaurante</Text>
                  </View>
                  <Text style={[styles.urlText, styles.idText]} selectable>
                    {restaurant.id}
                  </Text>
                  <TouchableOpacity
                    style={[styles.copyButton, styles.idCopyButton]}
                    onPress={() => {
                      Clipboard.setString(restaurant.id);
                      Alert.alert('✓ Copiado', 'ID del restaurante copiada al portapapeles');
                    }}
                    activeOpacity={0.7}
                  >
                    <Copy size={16} color="#f59e0b" strokeWidth={2} />
                    <Text style={[styles.copyButtonText, styles.idCopyButtonText]}>Copiar ID</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.restaurantActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleOpenModal(restaurant)}
                activeOpacity={0.7}
                disabled={deleteRestaurantMutation.isPending}
              >
                <Edit2 size={20} color="#3b82f6" strokeWidth={2.5} />
              </TouchableOpacity>
              {(isSuperAdmin || userType === 'subadmin') && (
                <>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.supportButton]}
                    onPress={() => { void handleSupportOpen(restaurant.id); }}
                    activeOpacity={0.7}
                    disabled={supportLoadingId === restaurant.id}
                  >
                    {supportLoadingId === restaurant.id ? (
                      <ActivityIndicator size="small" color="#8b5cf6" />
                    ) : (
                      <Headphones size={20} color="#8b5cf6" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.copyLinkButton]}
                    onPress={() => { void handleSupportCopyLink(restaurant.id); }}
                    activeOpacity={0.7}
                    disabled={copyLoadingId === restaurant.id}
                  >
                    {copyLoadingId === restaurant.id ? (
                      <ActivityIndicator size="small" color="#0ea5e9" />
                    ) : copiedId === restaurant.id ? (
                      <Check size={20} color="#22c55e" strokeWidth={2.5} />
                    ) : (
                      <Link2 size={20} color="#0ea5e9" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(restaurant.id)}
                activeOpacity={0.7}
                disabled={deleteRestaurantMutation.isPending}
              >
                {deleteRestaurantMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Trash2 size={20} color="#ef4444" strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredRestaurants.length === 0 && (
          <View style={styles.emptyState}>
            <Building2 size={64} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No hay restaurantes</Text>
            <Text style={styles.emptyText}>Comienza agregando tu primer restaurante</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showSupportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSupportModal(false)}
      >
        <View style={styles.supportModalOverlay}>
          <View style={styles.supportModalContent}>
            <View style={styles.supportModalHeader}>
              <Headphones size={24} color="#8b5cf6" strokeWidth={2} />
              <Text style={styles.supportModalTitle}>Acceso Soporte</Text>
              <TouchableOpacity onPress={() => setShowSupportModal(false)} activeOpacity={0.7}>
                <X size={22} color="#64748b" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <Text style={styles.supportModalRestaurant}>{supportModalRestaurantName}</Text>
            <Text style={styles.supportModalNote}>Enlace temporal de acceso (expira en 2 horas)</Text>
            <View style={styles.supportModalUrlBox}>
              <Text style={styles.supportModalUrl} numberOfLines={2} selectable>{supportModalUrl}</Text>
            </View>
            <View style={styles.supportModalButtons}>
              <TouchableOpacity
                style={styles.supportOpenButton}
                onPress={() => {
                  setShowSupportModal(false);
                  if (typeof window !== 'undefined') {
                    void window.open(supportModalUrl, '_blank');
                  } else {
                    void Linking.openURL(supportModalUrl);
                  }
                }}
                activeOpacity={0.8}
              >
                <ExternalLink size={18} color="#fff" strokeWidth={2} />
                <Text style={styles.supportOpenButtonText}>Abrir Panel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.supportCopyButton}
                onPress={() => { void handleSupportCopyLink(''); }}
                activeOpacity={0.8}
              >
                <Copy size={18} color="#8b5cf6" strokeWidth={2} />
                <Text style={styles.supportCopyButtonText}>Copiar Enlace</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingRestaurant ? 'Editar Restaurante' : 'Nuevo Restaurante'}
            </Text>
            <TouchableOpacity onPress={handleCloseModal} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Nombre del restaurante"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descripción del restaurante"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Usuario *</Text>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="Usuario para acceso"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Contraseña *</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Contraseña"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>URL Foto de Perfil</Text>
              <TextInput
                style={styles.input}
                value={formData.profileImageUrl}
                onChangeText={(text) => setFormData({ ...formData, profileImageUrl: text })}
                placeholder="https://ejemplo.com/foto.jpg"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ubicación Google Maps</Text>
              <TextInput
                style={styles.input}
                value={formData.googleMapsUrl}
                onChangeText={(text) => setFormData({ ...formData, googleMapsUrl: text })}
                placeholder="URL de Google Maps"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Dirección</Text>
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Dirección completa"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Código Postal</Text>
              <TextInput
                style={styles.input}
                value={formData.postalCode}
                onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
                placeholder="36969"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Provincia *</Text>
              <View style={styles.pickerOptions}>
                {provinces.map((p: { id: string; name: string }) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.pickerOption,
                      formData.provinceId === p.id && styles.pickerOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, provinceId: p.id, cityId: '', cuisineType: [] })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.provinceId === p.id && styles.pickerOptionTextSelected
                    ]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Población *</Text>
              <View style={styles.pickerOptions}>
                {cities
                  .filter((c: { id: string; name: string; provinceId: string }) => 
                    !formData.provinceId || c.provinceId === formData.provinceId
                  )
                  .map((c: { id: string; name: string; provinceId: string }) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.pickerOption,
                        formData.cityId === c.id && styles.pickerOptionSelected
                      ]}
                      onPress={() => setFormData({ ...formData, cityId: c.id })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        formData.cityId === c.id && styles.pickerOptionTextSelected
                      ]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tipo de Cocina</Text>
              {!formData.provinceId ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>⚠️ Primero debe seleccionar una provincia</Text>
                </View>
              ) : provinceCuisineTypesQuery.isLoading ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : availableCuisineTypes.length === 0 ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>No hay tipos de cocina disponibles para esta provincia</Text>
                </View>
              ) : (
                <View style={styles.cuisineGrid}>
                  {availableCuisineTypes.map((type: any) => {
                    const isSelected = formData.cuisineType.includes(type.id);
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.cuisineOption,
                          isSelected && styles.cuisineOptionSelected
                        ]}
                        onPress={() => {
                          setFormData(prev => ({
                            ...prev,
                            cuisineType: isSelected
                              ? prev.cuisineType.filter(t => t !== type.id)
                              : [...prev.cuisineType, type.id]
                          }));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.cuisineOptionText,
                          isSelected && styles.cuisineOptionTextSelected
                        ]}>
                          {type.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Teléfono *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+34 600 000 000"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="email@restaurante.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Plan de Suscripción</Text>
              <View style={styles.pickerOptions}>
                {plans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planOption,
                      formData.subscriptionPlanId === plan.id && styles.planOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, subscriptionPlanId: plan.id })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.planOptionName,
                      formData.subscriptionPlanId === plan.id && styles.planOptionTextSelected
                    ]}>
                      {plan.name}
                    </Text>
                    <Text style={[
                      styles.planOptionPrice,
                      formData.subscriptionPlanId === plan.id && styles.planOptionTextSelected
                    ]}>
                      {plan.price.toFixed(2)}€
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {!editingRestaurant && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Duración Suscripción</Text>
                <View style={styles.durationOptions}>
                  {durations.map((duration) => (
                    <TouchableOpacity
                      key={duration.id}
                      style={[
                        styles.durationOption,
                        formData.subscriptionDurationMonths === duration.months && styles.durationOptionSelected
                      ]}
                      onPress={() => setFormData({ ...formData, subscriptionDurationMonths: duration.months })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.durationOptionText,
                        formData.subscriptionDurationMonths === duration.months && styles.durationOptionTextSelected
                      ]}>
                        {duration.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {editingRestaurant && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Duración de Suscripción</Text>
                {editingRestaurant.subscriptionExpiry && (
                  <View style={styles.expiryInfoBox}>
                    <Text style={styles.expiryInfoLabel}>Fecha de caducidad actual:</Text>
                    <Text style={styles.expiryInfoDate}>
                      {new Date(editingRestaurant.subscriptionExpiry).toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                )}
                <View style={styles.durationOptions}>
                  {durations.map((duration) => (
                    <TouchableOpacity
                      key={duration.id}
                      style={[
                        styles.durationOption,
                        selectedDurationId === duration.id && styles.durationOptionSelected
                      ]}
                      onPress={() => setSelectedDurationId(duration.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.durationOptionText,
                        selectedDurationId === duration.id && styles.durationOptionTextSelected
                      ]}>
                        {duration.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedDurationId && (
                  <TouchableOpacity
                    style={styles.loadDurationButton}
                    onPress={() => {
                      loadDurationMutation.mutate({
                        restaurantId: editingRestaurant.id,
                        durationId: selectedDurationId,
                      });
                    }}
                    activeOpacity={0.8}
                    disabled={loadDurationMutation.isPending}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      style={styles.loadDurationButtonGradient}
                    >
                      <Text style={styles.loadDurationButtonText}>
                        {loadDurationMutation.isPending ? 'Cargando...' : 'Cargar Duración'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Comercial Asignado *</Text>
              <View style={styles.pickerOptions}>
                {salesReps.map((rep) => (
                  <TouchableOpacity
                    key={rep.id}
                    style={[
                      styles.salesRepOption,
                      formData.salesRepId === rep.id && styles.salesRepOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, salesRepId: rep.id })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.salesRepOptionName,
                      formData.salesRepId === rep.id && styles.salesRepOptionTextSelected
                    ]}>
                      {rep.firstName} {rep.lastName}
                    </Text>
                    {rep.id === 'salesrep-website' && (
                      <Text style={[
                        styles.salesRepBadge,
                        formData.salesRepId === rep.id && styles.salesRepBadgeSelected
                      ]}>
                        Por defecto
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#0f172a',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  restaurantTitleContainer: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  restaurantDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  cuisineTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  cuisineTypeBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cuisineTypeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1e40af',
  },
  restaurantDetails: {
    gap: 6,
    marginBottom: 12,
  },
  restaurantDetailText: {
    fontSize: 13,
    color: '#64748b',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  statusTextInactive: {
    color: '#ef4444',
  },
  expiryText: {
    fontSize: 12,
    color: '#64748b',
  },
  urlsContainer: {
    marginTop: 12,
    gap: 8,
  },
  urlBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  urlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  urlText: {
    fontSize: 12,
    color: '#0f172a',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#3b82f6',
  },
  restaurantActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  supportButton: {
    backgroundColor: '#f5f3ff',
  },
  copyLinkButton: {
    backgroundColor: '#e0f2fe',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  modalScroll: {
    flex: 1,
  },
  formGroup: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineOption: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cuisineOptionSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  cuisineOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#64748b',
  },
  cuisineOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '600' as const,
  },
  pickerContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  pickerText: {
    fontSize: 16,
    color: '#0f172a',
  },
  pickerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerOptionSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#64748b',
  },
  pickerOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '600' as const,
  },
  planOption: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: '100%',
  },
  planOptionSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  planOptionName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 2,
  },
  planOptionPrice: {
    fontSize: 12,
    color: '#64748b',
  },
  planOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '600' as const,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationOption: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  durationOptionSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  durationOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#64748b',
  },
  durationOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '600' as const,
  },
  saveButton: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
  },
  expiryInfoBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  expiryInfoLabel: {
    fontSize: 13,
    color: '#15803d',
    marginBottom: 4,
  },
  expiryInfoDate: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#15803d',
  },
  loadDurationButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadDurationButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadDurationButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  salesRepOption: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  salesRepOptionSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
  },
  salesRepOptionName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  salesRepOptionTextSelected: {
    color: '#059669',
  },
  salesRepBadge: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  salesRepBadgeSelected: {
    color: '#059669',
  },
  supportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  supportModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  supportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  supportModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    flex: 1,
  },
  supportModalRestaurant: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#334155',
    marginBottom: 4,
  },
  supportModalNote: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
  },
  supportModalUrlBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  supportModalUrl: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'monospace',
  },
  supportModalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  supportOpenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  supportOpenButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  supportCopyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  supportCopyButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8b5cf6',
  },
  idBox: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  idLabel: {
    color: '#92400e',
  },
  idText: {
    color: '#78350f',
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  idCopyButton: {
    borderColor: '#fcd34d',
  },
  idCopyButtonText: {
    color: '#b45309',
    fontWeight: '600' as const,
  },
});
