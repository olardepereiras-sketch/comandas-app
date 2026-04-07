import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, Platform, ActivityIndicator, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Save, Link as LinkIcon, AlertCircle, Copy, Upload, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRestaurantId, getRestaurantSlug } from '@/lib/restaurantSession';

export default function RestaurantConfigScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const restaurantQuery = trpc.restaurants.details.useQuery(
    { slug: restaurantSlug || '' },
    { enabled: !!restaurantSlug, refetchOnWindowFocus: false }
  );
  const restaurant = restaurantQuery.data;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    postalCode: '',
    email: '',
    profileImageUrl: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const imageManuallyChanged = React.useRef(false);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const id = await getRestaurantId();
      const slug = await getRestaurantSlug();
      
      if (!id || !slug) {
        Alert.alert('Error', 'Sesión no encontrada. Por favor, inicia sesión nuevamente.');
        router.replace('/');
        return;
      }

      setRestaurantId(id);
      setRestaurantSlug(slug);
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Error al cargar la sesión');
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    if (restaurant) {
      setFormData(prev => ({
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        postalCode: restaurant.postalCode || '',
        email: restaurant.email,
        profileImageUrl: imageManuallyChanged.current ? prev.profileImageUrl : (restaurant.profileImageUrl || ''),
      }));
      if (!imageManuallyChanged.current) {
        setSelectedImageUri(restaurant.profileImageUrl || null);
      }
    }
  }, [restaurant]);

  const isSavingFromButton = React.useRef(false);

  const updateRestaurantMutation = trpc.restaurants.update.useMutation({
    onSuccess: () => {
      if (isSavingFromButton.current) {
        isSavingFromButton.current = false;
        queryClient.invalidateQueries({ queryKey: [['restaurants', 'details']] });
        queryClient.invalidateQueries({ queryKey: [['restaurants', 'list']] });
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          router.replace('/restaurant/dashboard' as any);
        }, 1500);
      } else {
        console.log('✅ [CONFIG] Imagen guardada automáticamente en BD');
        queryClient.invalidateQueries({ queryKey: [['restaurants', 'list']] });
      }
    },
    onError: (error) => {
      console.error('❌ [CONFIG] Error updating restaurant:', error);
      if (isSavingFromButton.current) {
        isSavingFromButton.current = false;
      }
      Alert.alert('Error', error.message || 'Error al guardar');
    },
  });



  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const daysUntilExpiry = restaurant && restaurant.subscriptionExpiry ? Math.ceil(
    (new Date(restaurant.subscriptionExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ) : 0;

  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          imageManuallyChanged.current = true;
          const previewUrl = URL.createObjectURL(file);
          setSelectedImageUri(previewUrl);
          await uploadImageWeb(file);
        } catch (error: any) {
          console.error('Error picking image web:', error);
          Alert.alert('Error', error.message || 'No se pudo seleccionar la imagen');
        }
      };
      input.click();
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permisos necesarios', 'Necesitamos permisos para acceder a tu galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        imageManuallyChanged.current = true;
        setSelectedImageUri(imageUri);
        await uploadImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const uploadImageWeb = async (file: File) => {
    try {
      setUploadingImage(true);
      
      if (!restaurant?.id) {
        throw new Error('ID de restaurante no disponible');
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', file, file.name);
      uploadFormData.append('restaurantId', restaurant.id);
      
      const uploadResponse = await fetch('/api/upload-restaurant-image', {
        method: 'POST',
        body: uploadFormData,
      });
      
      const uploadData = await uploadResponse.json();
      console.log('📸 [CONFIG] Upload response:', uploadData);
      
      if (uploadData.success && uploadData.imageUrl) {
        const serverUrl = String(uploadData.imageUrl);
        console.log('📸 [CONFIG] Imagen subida, URL servidor:', serverUrl);
        imageManuallyChanged.current = true;
        setFormData(prev => ({ ...prev, profileImageUrl: serverUrl }));
        
        updateRestaurantMutation.mutate({
          id: restaurant.id,
          profileImageUrl: serverUrl,
        });
        console.log('📸 [CONFIG] Imagen guardada en BD, preview mantiene blob URL');
      } else {
        throw new Error(uploadData.error || 'Error al subir la imagen');
      }
    } catch (error: any) {
      console.error('❌ [CONFIG] Error uploading image web:', error);
      imageManuallyChanged.current = false;
      setSelectedImageUri(restaurant?.profileImageUrl || null);
      setFormData(prev => ({ ...prev, profileImageUrl: restaurant?.profileImageUrl || '' }));
      Alert.alert('Error', error.message || 'No se pudo subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploadingImage(true);
      
      if (!restaurant?.id) {
        throw new Error('ID de restaurante no disponible');
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'restaurant-image.jpg',
      } as any);
      uploadFormData.append('restaurantId', restaurant.id);
      
      const uploadResponse = await fetch('https://quieromesa.com/api/upload-restaurant-image', {
        method: 'POST',
        body: uploadFormData,
      });
      
      const uploadData = await uploadResponse.json();
      console.log('📸 [CONFIG] Upload response:', uploadData);
      
      if (uploadData.success && uploadData.imageUrl) {
        const serverUrl = String(uploadData.imageUrl);
        console.log('📸 [CONFIG] Imagen subida, URL servidor:', serverUrl);
        imageManuallyChanged.current = true;
        setFormData(prev => ({ ...prev, profileImageUrl: serverUrl }));
        
        updateRestaurantMutation.mutate({
          id: restaurant.id,
          profileImageUrl: serverUrl,
        });
      } else {
        throw new Error(uploadData.error || 'Error al subir la imagen');
      }
    } catch (error: any) {
      console.error('❌ [CONFIG] Error uploading image native:', error);
      imageManuallyChanged.current = false;
      setSelectedImageUri(restaurant?.profileImageUrl || null);
      setFormData(prev => ({ ...prev, profileImageUrl: restaurant?.profileImageUrl || '' }));
      Alert.alert('Error', error.message || 'No se pudo subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = () => {
    if (!restaurant) return;

    if (!formData.email || !formData.email.includes('@')) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    const mutationData: any = {
      id: restaurant.id,
      name: formData.name,
      description: formData.description,
      address: formData.address,
      postalCode: formData.postalCode,
      email: formData.email,
    };

    if (formData.profileImageUrl && formData.profileImageUrl.length > 0) {
      mutationData.profileImageUrl = formData.profileImageUrl;
    }

    console.log('💾 [CONFIG] Guardando con datos:', mutationData);
    isSavingFromButton.current = true;
    updateRestaurantMutation.mutate(mutationData);
  };

  const handleCopyLink = async () => {
    if (!restaurant) return;
    const link = `https://quieromesa.com/client/restaurant/${restaurant.slug}`;
    
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(link);
        Alert.alert('¡Enlace copiado!', 'El enlace se ha copiado al portapapeles');
      } catch (err) {
        console.log('Error copiando al portapapeles:', err);
        Alert.alert('Enlace', link);
      }
    } else {
      Alert.alert('Enlace directo', link);
    }
  };

  if (isLoadingSession || restaurantQuery.isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Configuración',
            headerStyle: { backgroundColor: '#3b82f6' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' as const },
          }}
        />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: '#64748b', marginTop: 12 }}>Cargando...</Text>
        </View>
      </>
    );
  }

  if (!restaurant) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Configuración',
            headerStyle: { backgroundColor: '#3b82f6' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' as const },
          }}
        />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#64748b' }}>Restaurante no encontrado</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Configuración',
          headerStyle: { backgroundColor: '#3b82f6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.expiryCard}>
            <LinearGradient
              colors={daysUntilExpiry > 30 ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']}
              style={styles.expiryGradient}
            >
              <AlertCircle size={24} color="#fff" strokeWidth={2.5} />
              <View style={styles.expiryTextContainer}>
                <Text style={styles.expiryLabel}>Fecha de Caducidad</Text>
                <Text style={styles.expiryDate}>{restaurant.subscriptionExpiry ? formatDate(new Date(restaurant.subscriptionExpiry)) : 'Sin fecha'}</Text>
                <Text style={styles.expiryDays}>
                  {daysUntilExpiry > 0 
                    ? `${daysUntilExpiry} días restantes`
                    : 'Suscripción expirada'
                  }
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Básica</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre del Restaurante</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Nombre"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Describe tu restaurante"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Foto de Portada</Text>
              <Text style={styles.imageInfo}>
                Tamaño recomendado: 1200x675px (16:9) • Formatos: JPG, PNG, WebP • Máximo 5MB
              </Text>
              
              {selectedImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ 
                      uri: selectedImageUri,
                      cache: 'reload',
                    }} 
                    style={styles.imagePreview}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('❌ [CONFIG] Error cargando imagen:', error.nativeEvent.error);
                    }}
                    onLoad={() => {
                      console.log('✅ [CONFIG] Imagen cargada correctamente');
                    }}
                  />
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={handlePickImage}
                    disabled={uploadingImage}
                    activeOpacity={0.7}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                      <>
                        <Camera size={18} color="#3b82f6" strokeWidth={2.5} />
                        <Text style={styles.changeImageText}>Cambiar Foto</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                  activeOpacity={0.7}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <>
                      <Upload size={24} color="#3b82f6" strokeWidth={2.5} />
                      <Text style={styles.uploadButtonText}>Seleccionar Foto</Text>
                      <Text style={styles.uploadButtonSubtext}>Toca para elegir una imagen de tu galería</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
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
                placeholder="Código Postal"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>Población</Text>
                <TextInput
                  style={styles.input}
                  value={restaurant.city?.name || ''}
                  editable={false}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>Provincia</Text>
                <TextInput
                  style={styles.input}
                  value={restaurant.province?.name || ''}
                  editable={false}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="email@ejemplo.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enlace Directo</Text>
            <Text style={styles.sectionSubtitle}>
              Comparte este enlace con tus clientes
            </Text>

            <TouchableOpacity 
              style={styles.linkCard}
              onPress={handleCopyLink}
              activeOpacity={0.7}
            >
              <LinkIcon size={20} color="#3b82f6" strokeWidth={2.5} />
              <Text style={styles.linkText}>
                https://quieromesa.com/client/restaurant/{restaurant.slug}
              </Text>
              <Copy size={18} color="#3b82f6" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={updateRestaurantMutation.isPending}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.saveGradient}
            >
              {updateRestaurantMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={20} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.saveText}>Guardar Cambios</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>¡Guardado!</Text>
            <Text style={styles.successText}>Configuración guardada correctamente</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  expiryCard: {
    margin: 20,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  expiryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  expiryTextContainer: {
    flex: 1,
  },
  expiryLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  expiryDate: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 2,
  },
  expiryDays: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
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
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  phoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500' as const,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 20,
    color: '#ef4444',
    fontWeight: '700' as const,
  },
  addPhoneContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  phoneInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500' as const,
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  linkItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  linkNumber: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  linkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600' as const,
  },
  deleteLinkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkFormGroup: {
    marginBottom: 12,
  },
  linkLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#475569',
    marginBottom: 6,
  },
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
  },
  addLinkText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#3b82f6',
  },
  imageInfo: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 16,
  },
  uploadButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#3b82f6',
    marginTop: 8,
  },
  uploadButtonSubtext: {
    fontSize: 13,
    color: '#64748b',
  },
  imagePreviewContainer: {
    gap: 12,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3b82f6',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  successContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center' as const,
    minWidth: 260,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  successIconText: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '700' as const,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  successText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center' as const,
  },
});
