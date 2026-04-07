import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator, Platform, Image } from 'react-native';
import Slider from '@react-native-community/slider';
import { Stack, useRouter } from 'expo-router';
import { Plus, Edit2, Trash2, MapPin, Users, Baby, ShoppingCart, PawPrint, X, Clock, Upload, Camera } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRestaurantId } from '@/lib/restaurantSession';
import type { Table, TableGroup } from '@/types';

export default function RestaurantTablesScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRestaurantId = async () => {
      try {
        const id = await getRestaurantId();
        if (!id) {
          Alert.alert('Error', 'Sesión no encontrada. Por favor inicia sesión nuevamente.');
          router.replace('/restaurant/login/o-lar-de-pereiras');
          return;
        }
        setRestaurantId(id);
      } catch (error) {
        console.error('Error cargando restaurantId:', error);
        Alert.alert('Error', 'No se pudo cargar la sesión');
      } finally {
        setLoading(false);
      }
    };
    loadRestaurantId();
  }, [router]);

  const restaurantDetailsQuery = trpc.restaurants.details.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );

  useEffect(() => {
    if (restaurantDetailsQuery.data) {
      console.log('🔍 [HIGH CHAIRS] Datos del restaurante recibidos:', restaurantDetailsQuery.data);
      setHighChairsForm({
        count: (restaurantDetailsQuery.data.availableHighChairs || 0).toString(),
        rotationTime: (restaurantDetailsQuery.data.highChairRotationMinutes || 120).toString(),
      });
    }
  }, [restaurantDetailsQuery.data]);

  const locationsQuery = trpc.locations.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );
  const tablesQuery = trpc.tables.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );
  const tableGroupsQuery = trpc.tables.listGroups.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId }
  );

  const locations = useMemo(() => locationsQuery.data || [], [locationsQuery.data]);
  const tables = useMemo(() => tablesQuery.data || [], [tablesQuery.data]);

  const [selectedLocation, setSelectedLocation] = useState<string | null>(locations[0]?.id || null);
  
  React.useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, selectedLocation]);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [isTableModalVisible, setIsTableModalVisible] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [locationImageUrl, setLocationImageUrl] = useState('');
  const [uploadingLocationImage, setUploadingLocationImage] = useState(false);
  const [selectedLocationImageUri, setSelectedLocationImageUri] = useState<string | null>(null);
  const isImageUploadSave = React.useRef(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [isHighChairsModalVisible, setIsHighChairsModalVisible] = useState(false);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [highChairsForm, setHighChairsForm] = useState({ count: '0', rotationTime: '120' });
  const [editingGroup, setEditingGroup] = useState<TableGroup | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    locationId: '',
    tableIds: [] as string[],
    minCapacity: '2',
    maxCapacity: '4',
    priority: 5,
  });

  const [tableForm, setTableForm] = useState({
    name: '',
    locationId: '',
    minCapacity: '2',
    maxCapacity: '4',
    allowsHighChairs: true,
    allowsStrollers: true,
    allowsPets: true,
    priority: 5,
  });

  const createLocationMutation = trpc.tables.createLocation.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['locations', 'list']] });
      setNewLocationName('');
      setLocationImageUrl('');
      setEditingLocation(null);
      setIsLocationModalVisible(false);
      Alert.alert('Éxito', 'Ubicación añadida correctamente');
    },
    onError: (error) => {
      console.error('Error creating location:', error);
      Alert.alert('Error', error.message);
    },
  });

  const updateLocationMutation = trpc.tables.updateLocation.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['locations', 'list']] });
      if (isImageUploadSave.current) {
        isImageUploadSave.current = false;
        console.log('✅ [TABLES] Imagen de ubicación guardada automáticamente en BD');
      } else {
        setNewLocationName('');
        setLocationImageUrl('');
        setSelectedLocationImageUri(null);
        setEditingLocation(null);
        setIsLocationModalVisible(false);
        Alert.alert('Éxito', 'Ubicación actualizada correctamente');
      }
    },
    onError: (error) => {
      isImageUploadSave.current = false;
      console.error('Error updating location:', error);
      Alert.alert('Error', error.message);
    },
  });

  const deleteLocationMutation = trpc.tables.deleteLocation.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['locations', 'list']] });
      queryClient.invalidateQueries({ queryKey: [['tables', 'list']] });
      Alert.alert('Éxito', 'Ubicación eliminada correctamente');
    },
    onError: (error) => {
      console.error('Error deleting location:', error);
      Alert.alert('Error', error.message);
    },
  });

  const createTableMutation = trpc.tables.createTable.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['tables', 'list']] });
      setTableForm({
        name: '',
        locationId: '',
        minCapacity: '2',
        maxCapacity: '4',
        allowsHighChairs: true,
        allowsStrollers: true,
        allowsPets: true,
        priority: 5,
      });
      setEditingTable(null);
      setIsTableModalVisible(false);
      Alert.alert('Éxito', 'Mesa añadida correctamente');
    },
    onError: (error) => {
      console.error('Error creating table:', error);
      Alert.alert('Error', error.message);
    },
  });

  const updateTableMutation = trpc.tables.updateTable.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['tables', 'list']] });
      setTableForm({
        name: '',
        locationId: '',
        minCapacity: '2',
        maxCapacity: '4',
        allowsHighChairs: true,
        allowsStrollers: true,
        allowsPets: true,
        priority: 5,
      });
      setEditingTable(null);
      setIsTableModalVisible(false);
      Alert.alert('Éxito', 'Mesa actualizada correctamente');
    },
    onError: (error) => {
      console.error('Error updating table:', error);
      Alert.alert('Error', error.message);
    },
  });

  const deleteTableMutation = trpc.tables.deleteTable.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['tables', 'list']] });
      Alert.alert('Éxito', 'Mesa eliminada correctamente');
    },
    onError: (error) => {
      console.error('Error deleting table:', error);
      Alert.alert('Error', error.message);
    },
  });

  const updateHighChairsMutation = trpc.restaurants.updateHighChairs.useMutation({
    onSuccess: async () => {
      console.log('✅ [UPDATE HIGH CHAIRS] Mutation success, refrescando datos...');
      await queryClient.invalidateQueries({ queryKey: [['restaurants', 'details']] });
      await restaurantDetailsQuery.refetch();
      
      setIsHighChairsModalVisible(false);
      Alert.alert('Éxito', 'Configuración de tronas actualizada');
    },
    onError: (error) => {
      console.error('❌ [UPDATE HIGH CHAIRS] Error:', error);
      Alert.alert('Error', error.message);
    },
  });

  const createTableGroupMutation = trpc.tables.createGroup.useMutation({
    onMutate: (variables) => {
      console.log('🔵 [CREATE TABLE GROUP MUTATION] onMutate - Iniciando mutación con variables:', variables);
    },
    onSuccess: async (data) => {
      console.log('✅ [CREATE TABLE GROUP MUTATION] onSuccess - Grupo creado exitosamente:', data);
      console.log('✅ [CREATE TABLE GROUP MUTATION] Refrescando queries...');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [['tables', 'listGroups']] }),
        queryClient.invalidateQueries({ queryKey: [['clients', 'available-guest-counts']] }),
      ]);
      await Promise.all([
        tableGroupsQuery.refetch(),
      ]);
      setGroupForm({ name: '', locationId: '', tableIds: [], minCapacity: '2', maxCapacity: '4', priority: 5 });
      setEditingGroup(null);
      setIsGroupModalVisible(false);
      Alert.alert('Éxito', 'Grupo de mesas creado correctamente');
    },
    onError: (error) => {
      console.error('❌ [CREATE TABLE GROUP MUTATION] onError:', error);
      console.error('❌ [CREATE TABLE GROUP MUTATION] Error message:', error.message);
      console.error('❌ [CREATE TABLE GROUP MUTATION] Error cause:', error.cause);
      Alert.alert('Error', error.message || 'No se pudo crear el grupo de mesas');
    },
    onSettled: () => {
      console.log('🔵 [CREATE TABLE GROUP MUTATION] onSettled - Mutación completada');
    },
  });

  const updateTableGroupMutation = trpc.tables.updateGroup.useMutation({
    onSuccess: async () => {
      console.log('✅ [UPDATE TABLE GROUP] Success, refrescando queries...');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [['tables', 'listGroups']] }),
        queryClient.invalidateQueries({ queryKey: [['clients', 'available-guest-counts']] }),
      ]);
      await Promise.all([
        tableGroupsQuery.refetch(),
      ]);
      setGroupForm({ name: '', locationId: '', tableIds: [], minCapacity: '2', maxCapacity: '4', priority: 5 });
      setEditingGroup(null);
      setIsGroupModalVisible(false);
      Alert.alert('Éxito', 'Grupo de mesas actualizado correctamente');
    },
    onError: (error) => {
      console.error('❌ [UPDATE TABLE GROUP] Error:', error);
      Alert.alert('Error', error.message);
    },
  });

  const deleteTableGroupMutation = trpc.tables.deleteGroup.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['tables', 'listGroups']] });
      queryClient.invalidateQueries({ queryKey: [['clients', 'availableGuestCounts']] });
      Alert.alert('Éxito', 'Grupo de mesas eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting table group:', error);
      Alert.alert('Error', error.message);
    },
  });

  const handleAddLocation = () => {
    if (newLocationName.trim() && restaurantId) {
      if (editingLocation) {
        updateLocationMutation.mutate({
          id: editingLocation.id,
          name: newLocationName.trim(),
          imageUrl: locationImageUrl.trim() || undefined,
        });
      } else {
        createLocationMutation.mutate({
          restaurantId,
          name: newLocationName.trim(),
          imageUrl: locationImageUrl.trim() || undefined,
        });
      }
    }
  };

  const handleEditLocation = (location: any) => {
    setEditingLocation(location);
    setNewLocationName(location.name);
    setLocationImageUrl(location.imageUrl || '');
    setSelectedLocationImageUri(location.imageUrl || null);
    setIsLocationModalVisible(true);
  };

  const handlePickLocationImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const previewUrl = URL.createObjectURL(file);
          setSelectedLocationImageUri(previewUrl);
          if (editingLocation) {
            await uploadLocationImageWeb(file, editingLocation.id);
          }
        } catch (error: any) {
          console.error('Error picking location image web:', error);
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
        setSelectedLocationImageUri(imageUri);
        if (editingLocation) {
          await uploadLocationImage(imageUri, editingLocation.id);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const uploadLocationImageWeb = async (file: File, locationId: string) => {
    try {
      setUploadingLocationImage(true);
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', file, file.name);
      uploadFormData.append('locationId', locationId);
      
      const uploadResponse = await fetch('/api/upload-location-image', {
        method: 'POST',
        body: uploadFormData,
      });
      
      const uploadData = await uploadResponse.json();
      console.log('📸 [TABLES] Upload location image response:', uploadData);
      
      if (uploadData.success && uploadData.imageUrl) {
        const imageUrl = String(uploadData.imageUrl) + '?t=' + Date.now();
        console.log('📸 [TABLES] Imagen de ubicación subida, URL:', imageUrl);
        setSelectedLocationImageUri(imageUrl);
        setLocationImageUrl(String(uploadData.imageUrl));
        
        isImageUploadSave.current = true;
        updateLocationMutation.mutate({
          id: locationId,
          name: newLocationName.trim() || editingLocation?.name || 'Ubicación',
          imageUrl: String(uploadData.imageUrl),
        });
      } else {
        throw new Error(uploadData.error || 'Error al subir la imagen');
      }
    } catch (error: any) {
      console.error('❌ [TABLES] Error uploading location image web:', error);
      Alert.alert('Error', error.message || 'No se pudo subir la imagen');
    } finally {
      setUploadingLocationImage(false);
    }
  };

  const uploadLocationImage = async (uri: string, locationId: string) => {
    try {
      setUploadingLocationImage(true);
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'location-image.jpg',
      } as any);
      uploadFormData.append('locationId', locationId);
      
      const uploadResponse = await fetch('https://quieromesa.com/api/upload-location-image', {
        method: 'POST',
        body: uploadFormData,
      });
      
      const uploadData = await uploadResponse.json();
      console.log('📸 [TABLES] Upload location image response:', uploadData);
      
      if (uploadData.success && uploadData.imageUrl) {
        const imageUrl = String(uploadData.imageUrl) + '?t=' + Date.now();
        console.log('📸 [TABLES] Imagen de ubicación subida, URL:', imageUrl);
        setSelectedLocationImageUri(imageUrl);
        setLocationImageUrl(String(uploadData.imageUrl));
        
        isImageUploadSave.current = true;
        updateLocationMutation.mutate({
          id: locationId,
          name: newLocationName.trim() || editingLocation?.name || 'Ubicación',
          imageUrl: String(uploadData.imageUrl),
        });
      } else {
        throw new Error(uploadData.error || 'Error al subir la imagen');
      }
    } catch (error: any) {
      console.error('❌ [TABLES] Error uploading location image native:', error);
      Alert.alert('Error', error.message || 'No se pudo subir la imagen');
    } finally {
      setUploadingLocationImage(false);
    }
  };

  const handleDeleteLocation = (locationId: string) => {
    const locationTables = tables.filter((t) => t.locationId === locationId);
    const tablesCount = locationTables.length;
    
    const message = tablesCount > 0
      ? `¿Estás seguro? Esta ubicación tiene ${tablesCount} mesa${tablesCount !== 1 ? 's' : ''} que ${tablesCount !== 1 ? 'serán eliminadas' : 'será eliminada'} también.`
      : '¿Estás seguro de que deseas eliminar esta ubicación?';
    
    if (Platform.OS === 'web') {
      if (window.confirm(`Eliminar Ubicación\n\n${message}`)) {
        deleteLocationMutation.mutate({ id: locationId });
        if (selectedLocation === locationId) {
          const remainingLocations = locations.filter(l => l.id !== locationId);
          setSelectedLocation(remainingLocations[0]?.id || null);
        }
      }
    } else {
      Alert.alert(
        'Eliminar Ubicación',
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              deleteLocationMutation.mutate({ id: locationId });
              if (selectedLocation === locationId) {
                const remainingLocations = locations.filter(l => l.id !== locationId);
                setSelectedLocation(remainingLocations[0]?.id || null);
              }
            },
          },
        ]
      );
    }
  };

  const handleAddTable = () => {
    if (!tableForm.locationId) {
      Alert.alert('Error', 'Debe seleccionar una ubicación');
      return;
    }
    
    if (!tableForm.name.trim()) {
      Alert.alert('Error', 'El nombre de la mesa es obligatorio');
      return;
    }

    const min = parseInt(tableForm.minCapacity);
    const max = parseInt(tableForm.maxCapacity);

    if (min > max) {
      Alert.alert('Error', 'La capacidad mínima no puede ser mayor que la máxima');
      return;
    }

    if (editingTable) {
      updateTableMutation.mutate({
        id: editingTable.id,
        name: tableForm.name,
        minCapacity: min,
        maxCapacity: max,
        allowsHighChairs: tableForm.allowsHighChairs,
        allowsStrollers: tableForm.allowsStrollers,
        allowsPets: tableForm.allowsPets,
        priority: tableForm.priority,
      });
    } else {
      if (!restaurantId) return;
      createTableMutation.mutate({
        locationId: tableForm.locationId,
        restaurantId,
        name: tableForm.name,
        minCapacity: min,
        maxCapacity: max,
        allowsHighChairs: tableForm.allowsHighChairs,
        allowsStrollers: tableForm.allowsStrollers,
        allowsPets: tableForm.allowsPets,
        priority: tableForm.priority,
      });
    }
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setTableForm({
      name: table.name,
      locationId: table.locationId,
      minCapacity: table.minCapacity.toString(),
      maxCapacity: table.maxCapacity.toString(),
      allowsHighChairs: table.allowsHighChairs,
      allowsStrollers: table.allowsStrollers,
      allowsPets: table.allowsPets,
      priority: table.priority || 5,
    });
    setIsTableModalVisible(true);
  };

  const handleDeleteTable = (tableId: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que deseas eliminar esta mesa?')) {
        deleteTableMutation.mutate({ id: tableId });
      }
    } else {
      Alert.alert('Eliminar Mesa', '¿Estás seguro de que deseas eliminar esta mesa?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTableMutation.mutate({ id: tableId });
          },
        },
      ]);
    }
  };

  const handleSaveHighChairs = () => {
    if (!restaurantId) return;
    const count = parseInt(highChairsForm.count);
    const rotationTime = parseInt(highChairsForm.rotationTime);
    if (isNaN(count) || count < 0) {
      Alert.alert('Error', 'El número de tronas debe ser válido');
      return;
    }
    if (isNaN(rotationTime) || rotationTime < 0) {
      Alert.alert('Error', 'El tiempo de rotación debe ser válido');
      return;
    }
    updateHighChairsMutation.mutate({
      restaurantId,
      availableHighChairs: count,
      highChairRotationMinutes: rotationTime,
    });
  };

  const handleSaveGroup = () => {
    console.log('🔵 [HANDLE SAVE GROUP] Iniciando...');
    console.log('🔵 [HANDLE SAVE GROUP] restaurantId:', restaurantId);
    console.log('🔵 [HANDLE SAVE GROUP] groupForm:', groupForm);
    
    if (!restaurantId) {
      console.log('❌ [HANDLE SAVE GROUP] No hay restaurantId');
      return;
    }
    if (!groupForm.locationId) {
      console.log('❌ [HANDLE SAVE GROUP] No hay locationId');
      Alert.alert('Error', 'Debe seleccionar una ubicación');
      return;
    }
    if (!groupForm.name.trim()) {
      console.log('❌ [HANDLE SAVE GROUP] No hay nombre');
      Alert.alert('Error', 'El nombre del grupo es obligatorio');
      return;
    }
    if (groupForm.tableIds.length === 0) {
      console.log('❌ [HANDLE SAVE GROUP] No hay mesas seleccionadas');
      Alert.alert('Error', 'Debe seleccionar al menos una mesa');
      return;
    }
    const min = parseInt(groupForm.minCapacity);
    const max = parseInt(groupForm.maxCapacity);
    if (isNaN(min) || isNaN(max)) {
      console.log('❌ [HANDLE SAVE GROUP] Capacidades inválidas');
      Alert.alert('Error', 'Las capacidades deben ser números válidos');
      return;
    }
    if (min > max) {
      console.log('❌ [HANDLE SAVE GROUP] Min > Max');
      Alert.alert('Error', 'La capacidad mínima no puede ser mayor que la máxima');
      return;
    }
    
    console.log('✅ [HANDLE SAVE GROUP] Todas las validaciones pasadas');
    
    if (editingGroup) {
      console.log('🔵 [HANDLE SAVE GROUP] Actualizando grupo existente:', editingGroup.id);
      updateTableGroupMutation.mutate({
        id: editingGroup.id,
        name: groupForm.name,
        locationId: groupForm.locationId,
        tableIds: groupForm.tableIds,
        minCapacity: min,
        maxCapacity: max,
        priority: groupForm.priority,
      });
    } else {
      console.log('🔵 [HANDLE SAVE GROUP] Creando nuevo grupo');
      console.log('🔵 [HANDLE SAVE GROUP] Datos a enviar:', {
        restaurantId,
        name: groupForm.name,
        locationId: groupForm.locationId,
        tableIds: groupForm.tableIds,
        minCapacity: min,
        maxCapacity: max,
        priority: groupForm.priority,
      });
      createTableGroupMutation.mutate({
        restaurantId,
        name: groupForm.name,
        locationId: groupForm.locationId,
        tableIds: groupForm.tableIds,
        minCapacity: min,
        maxCapacity: max,
        priority: groupForm.priority,
      });
    }
  };

  const handleEditGroup = (group: TableGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      locationId: group.locationId || '',
      tableIds: group.tableIds,
      minCapacity: group.minCapacity.toString(),
      maxCapacity: group.maxCapacity.toString(),
      priority: group.priority || 5,
    });
    setIsGroupModalVisible(true);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que deseas eliminar este grupo de mesas?')) {
        deleteTableGroupMutation.mutate({ id: groupId });
      }
    } else {
      Alert.alert('Eliminar Grupo', '¿Estás seguro de que deseas eliminar este grupo de mesas?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTableGroupMutation.mutate({ id: groupId });
          },
        },
      ]);
    }
  };



  const currentLocationTables = tables.filter((t) => t.locationId === selectedLocation);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!restaurantId) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestión de Mesas',
          headerStyle: { backgroundColor: '#f59e0b' },
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
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Ubicaciones</Text>
                <Text style={styles.sectionSubtitle}>Gestiona las áreas de tu restaurante</Text>
              </View>
              <TouchableOpacity
                style={styles.addLocationButton}
                onPress={() => setIsLocationModalVisible(true)}
                activeOpacity={0.7}
              >
                <Plus size={20} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationsScroll}>
              {locations.map((location) => (
                <View key={location.id} style={styles.locationWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.locationCard,
                      selectedLocation === location.id && styles.locationCardActive,
                    ]}
                    onPress={() => setSelectedLocation(location.id)}
                    activeOpacity={0.7}
                  >
                    <MapPin
                      size={20}
                      color={selectedLocation === location.id ? '#fff' : '#f59e0b'}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.locationText,
                        selectedLocation === location.id && styles.locationTextActive,
                      ]}
                    >
                      {location.name}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.locationActions}>
                    <TouchableOpacity
                      style={styles.locationEditButton}
                      onPress={() => handleEditLocation(location)}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={14} color="#3b82f6" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.locationDeleteButton}
                      onPress={() => handleDeleteLocation(location.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color="#ef4444" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Tronas Disponibles</Text>
                <Text style={styles.sectionSubtitle}>Configuración de tronas para el restaurante</Text>
              </View>
              <TouchableOpacity
                style={styles.addLocationButton}
                onPress={() => setIsHighChairsModalVisible(true)}
                activeOpacity={0.7}
              >
                <Baby size={20} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <View style={styles.highChairInfo}>
              <View style={styles.infoRow}>
                <Baby size={18} color="#64748b" strokeWidth={2.5} />
                <Text style={styles.infoLabel}>Tronas totales:</Text>
                <Text style={styles.infoValue}>{highChairsForm.count}</Text>
              </View>
              <View style={styles.infoRow}>
                <Clock size={18} color="#64748b" strokeWidth={2.5} />
                <Text style={styles.infoLabel}>Tiempo de rotación:</Text>
                <Text style={styles.infoValue}>{highChairsForm.rotationTime} min</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Grupos de Mesas</Text>
                <Text style={styles.sectionSubtitle}>Combina mesas para grupos grandes</Text>
              </View>
              <TouchableOpacity
                style={styles.addLocationButton}
                onPress={() => {
                  setEditingGroup(null);
                  setGroupForm({ name: '', locationId: '', tableIds: [], minCapacity: '2', maxCapacity: '4', priority: 5 });
                  setIsGroupModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Plus size={20} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {tableGroupsQuery.data && tableGroupsQuery.data.length > 0 ? (
              tableGroupsQuery.data.map((group: TableGroup) => {
                const groupTables = tables.filter((t) => group.tableIds.includes(t.id));
                return (
                  <View key={group.id} style={styles.tableCard}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableName}>{group.name}</Text>
                      <View style={styles.tableActions}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleEditGroup(group)}
                          activeOpacity={0.7}
                        >
                          <Edit2 size={18} color="#3b82f6" strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleDeleteGroup(group.id)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={18} color="#ef4444" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.tableInfo}>
                      <View style={styles.capacityBadge}>
                        <Users size={16} color="#64748b" strokeWidth={2.5} />
                        <Text style={styles.capacityText}>
                          {group.minCapacity} - {group.maxCapacity} personas
                        </Text>
                      </View>
                      <View style={styles.groupTablesList}>
                        <Text style={styles.groupTablesLabel}>Mesas: </Text>
                        <Text style={styles.groupTablesText}>
                          {groupTables.map(t => t.name).join(', ') || 'Sin mesas'}
                        </Text>
                      </View>
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityText}>Prioridad: {group.priority}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <MapPin size={48} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={styles.emptyStateText}>No hay grupos de mesas</Text>
                <Text style={styles.emptyStateSubtext}>Pulsa + para crear un grupo</Text>
              </View>
            )}
          </View>

          {selectedLocation && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Mesas</Text>
                  <Text style={styles.sectionSubtitle}>
                    {locations.find((l) => l.id === selectedLocation)?.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addTableButton}
                  onPress={() => {
                    setEditingTable(null);
                    setTableForm({
                      name: '',
                      locationId: selectedLocation || '',
                      minCapacity: '2',
                      maxCapacity: '4',
                      allowsHighChairs: true,
                      allowsStrollers: true,
                      allowsPets: true,
                      priority: 5,
                    });
                    setIsTableModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {currentLocationTables.length > 0 ? (
                currentLocationTables.map((table) => (
                  <View key={table.id} style={styles.tableCard}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableName}>{table.name}</Text>
                      <View style={styles.tableActions}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleEditTable(table)}
                          activeOpacity={0.7}
                        >
                          <Edit2 size={18} color="#3b82f6" strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleDeleteTable(table.id)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={18} color="#ef4444" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.tableInfo}>
                      <View style={styles.capacityBadge}>
                        <Users size={16} color="#64748b" strokeWidth={2.5} />
                        <Text style={styles.capacityText}>
                          {table.minCapacity} - {table.maxCapacity} personas
                        </Text>
                      </View>

                      <View style={styles.tableFeatures}>
                        {table.allowsHighChairs && (
                          <View style={styles.featureBadge}>
                            <Baby size={14} color="#10b981" strokeWidth={2.5} />
                            <Text style={styles.featureText}>Tronas</Text>
                          </View>
                        )}
                        {table.allowsStrollers && (
                          <View style={styles.featureBadge}>
                            <ShoppingCart size={14} color="#10b981" strokeWidth={2.5} />
                            <Text style={styles.featureText}>Carritos</Text>
                          </View>
                        )}
                        {table.allowsPets && (
                          <View style={styles.featureBadge}>
                            <PawPrint size={14} color="#10b981" strokeWidth={2.5} />
                            <Text style={styles.featureText}>Mascotas</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <MapPin size={48} color="#cbd5e1" strokeWidth={1.5} />
                  <Text style={styles.emptyStateText}>No hay mesas en esta ubicación</Text>
                  <Text style={styles.emptyStateSubtext}>Pulsa + para añadir una mesa</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={isLocationModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsLocationModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsLocationModalVisible(false);
                    setEditingLocation(null);
                    setNewLocationName('');
                    setLocationImageUrl('');
                    setSelectedLocationImageUri(null);
                  }}
                  activeOpacity={0.7}
                >
                  <X size={24} color="#64748b" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Nombre de la Ubicación</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newLocationName}
                  onChangeText={setNewLocationName}
                  placeholder="Nombre de la ubicación (ej: Terraza)"
                  placeholderTextColor="#94a3b8"
                  autoFocus
                />
              </View>

              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Foto de la Ubicación (Opcional)</Text>
                <Text style={styles.priorityDescription}>
                  Tamaño recomendado: 1200x675px (16:9) • Formatos: JPG, PNG, WebP • Máximo 5MB
                </Text>
                
                {editingLocation ? (
                  selectedLocationImageUri ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image 
                        source={{ 
                          uri: selectedLocationImageUri,
                          cache: 'reload',
                        }} 
                        style={styles.locationImagePreview}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('❌ [TABLES] Error cargando imagen de ubicación:', error.nativeEvent.error);
                        }}
                        onLoad={() => {
                          console.log('✅ [TABLES] Imagen de ubicación cargada correctamente');
                        }}
                      />
                      <TouchableOpacity
                        style={styles.changeImageButton}
                        onPress={handlePickLocationImage}
                        disabled={uploadingLocationImage}
                        activeOpacity={0.7}
                      >
                        {uploadingLocationImage ? (
                          <ActivityIndicator size="small" color="#f59e0b" />
                        ) : (
                          <>
                            <Camera size={18} color="#f59e0b" strokeWidth={2.5} />
                            <Text style={styles.changeImageText}>Cambiar Foto</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={handlePickLocationImage}
                      disabled={uploadingLocationImage}
                      activeOpacity={0.7}
                    >
                      {uploadingLocationImage ? (
                        <ActivityIndicator size="small" color="#f59e0b" />
                      ) : (
                        <>
                          <Upload size={24} color="#f59e0b" strokeWidth={2.5} />
                          <Text style={styles.uploadButtonText}>Seleccionar Foto</Text>
                          <Text style={styles.uploadButtonSubtext}>Toca para elegir una imagen de tu galería</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )
                ) : (
                  <Text style={styles.priorityDescription}>
                    Primero guarda la ubicación, luego podrás añadir una foto editándola.
                  </Text>
                )}
              </View>

              <TouchableOpacity style={styles.modalButton} onPress={handleAddLocation} activeOpacity={0.8}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.modalButtonGradient}>
                  <Text style={styles.modalButtonText}>{editingLocation ? 'Actualizar Ubicación' : 'Añadir Ubicación'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={isTableModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsTableModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingTable ? 'Editar Mesa' : 'Nueva Mesa'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsTableModalVisible(false);
                      setEditingTable(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <X size={24} color="#64748b" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Ubicación</Text>
                  <Text style={styles.priorityDescription}>
                    Selecciona la ubicación donde se creará la mesa
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationSelection}>
                    {locations.map((location) => (
                      <TouchableOpacity
                        key={location.id}
                        style={[
                          styles.locationOption,
                          tableForm.locationId === location.id && styles.locationOptionSelected,
                        ]}
                        onPress={() => setTableForm({ ...tableForm, locationId: location.id })}
                        activeOpacity={0.7}
                      >
                        <MapPin
                          size={16}
                          color={tableForm.locationId === location.id ? '#fff' : '#f59e0b'}
                          strokeWidth={2.5}
                        />
                        <Text
                          style={[
                            styles.locationOptionText,
                            tableForm.locationId === location.id && styles.locationOptionTextSelected,
                          ]}
                        >
                          {location.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Nombre de la Mesa</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={tableForm.name}
                    onChangeText={(text) => setTableForm({ ...tableForm, name: text })}
                    placeholder="Mesa 1"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.modalRow}>
                  <View style={styles.modalFormGroupHalf}>
                    <Text style={styles.modalLabel}>Min. Comensales</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={tableForm.minCapacity}
                      onChangeText={(text) => setTableForm({ ...tableForm, minCapacity: text })}
                      placeholder="2"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.modalFormGroupHalf}>
                    <Text style={styles.modalLabel}>Max. Comensales</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={tableForm.maxCapacity}
                      onChangeText={(text) => setTableForm({ ...tableForm, maxCapacity: text })}
                      placeholder="4"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Opciones</Text>
                  
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() =>
                      setTableForm({ ...tableForm, allowsHighChairs: !tableForm.allowsHighChairs })
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        tableForm.allowsHighChairs && styles.checkboxChecked,
                      ]}
                    >
                      {tableForm.allowsHighChairs && (
                        <View style={styles.checkboxInner} />
                      )}
                    </View>
                    <Baby size={20} color="#64748b" strokeWidth={2.5} />
                    <Text style={styles.checkboxLabel}>Admite tronas</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() =>
                      setTableForm({ ...tableForm, allowsStrollers: !tableForm.allowsStrollers })
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        tableForm.allowsStrollers && styles.checkboxChecked,
                      ]}
                    >
                      {tableForm.allowsStrollers && (
                        <View style={styles.checkboxInner} />
                      )}
                    </View>
                    <ShoppingCart size={20} color="#64748b" strokeWidth={2.5} />
                    <Text style={styles.checkboxLabel}>Admite carritos</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() =>
                      setTableForm({ ...tableForm, allowsPets: !tableForm.allowsPets })
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        tableForm.allowsPets && styles.checkboxChecked,
                      ]}
                    >
                      {tableForm.allowsPets && (
                        <View style={styles.checkboxInner} />
                      )}
                    </View>
                    <PawPrint size={20} color="#64748b" strokeWidth={2.5} />
                    <Text style={styles.checkboxLabel}>Admite mascotas</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Prioridad de Ocupación</Text>
                  <Text style={styles.priorityDescription}>
                    Define la prioridad para asignar esta mesa (1 = menor prioridad, 9 = mayor prioridad)
                  </Text>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderValue}>{tableForm.priority}</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={1}
                      maximumValue={9}
                      step={1}
                      value={tableForm.priority}
                      onValueChange={(value: number) => setTableForm({ ...tableForm, priority: value })}
                      minimumTrackTintColor="#f59e0b"
                      maximumTrackTintColor="#e2e8f0"
                      thumbTintColor="#f59e0b"
                    />
                    <View style={styles.sliderLabels}>
                      <Text style={styles.sliderLabel}>1</Text>
                      <Text style={styles.sliderLabel}>9</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.modalButton} onPress={handleAddTable} activeOpacity={0.8}>
                  <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.modalButtonGradient}>
                    <Text style={styles.modalButtonText}>
                      {editingTable ? 'Actualizar Mesa' : 'Añadir Mesa'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        <Modal
          visible={isHighChairsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsHighChairsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configurar Tronas</Text>
                <TouchableOpacity
                  onPress={() => setIsHighChairsModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color="#64748b" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Número de Tronas Disponibles</Text>
                <TextInput
                  style={styles.modalInput}
                  value={highChairsForm.count}
                  onChangeText={(text) => setHighChairsForm({ ...highChairsForm, count: text })}
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Tiempo de Rotación (minutos)</Text>
                <Text style={styles.priorityDescription}>
                  Tiempo que debe pasar antes de que una trona esté disponible nuevamente
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={highChairsForm.rotationTime}
                  onChangeText={(text) => setHighChairsForm({ ...highChairsForm, rotationTime: text })}
                  placeholder="120"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity style={styles.modalButton} onPress={handleSaveHighChairs} activeOpacity={0.8}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.modalButtonGradient}>
                  <Text style={styles.modalButtonText}>Guardar Configuración</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={isGroupModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsGroupModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingGroup ? 'Editar Grupo de Mesas' : 'Nuevo Grupo de Mesas'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsGroupModalVisible(false);
                      setEditingGroup(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <X size={24} color="#64748b" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Nombre del Grupo</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={groupForm.name}
                    onChangeText={(text) => setGroupForm({ ...groupForm, name: text })}
                    placeholder="Grupo 1"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Seleccionar Ubicación</Text>
                  <Text style={styles.priorityDescription}>
                    Las mesas del grupo deben estar en la misma ubicación
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationSelection}>
                    {locations.map((location) => (
                      <TouchableOpacity
                        key={location.id}
                        style={[
                          styles.locationOption,
                          groupForm.locationId === location.id && styles.locationOptionSelected,
                        ]}
                        onPress={() => {
                          setGroupForm({
                            ...groupForm,
                            locationId: location.id,
                            tableIds: [],
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <MapPin
                          size={16}
                          color={groupForm.locationId === location.id ? '#fff' : '#f59e0b'}
                          strokeWidth={2.5}
                        />
                        <Text
                          style={[
                            styles.locationOptionText,
                            groupForm.locationId === location.id && styles.locationOptionTextSelected,
                          ]}
                        >
                          {location.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Seleccionar Mesas</Text>
                  <Text style={styles.priorityDescription}>
                    Selecciona las mesas que forman parte de este grupo
                  </Text>
                  <ScrollView style={styles.tablesSelection} nestedScrollEnabled>
                    {tables.filter(t => t.locationId === groupForm.locationId).map((table) => (
                      <TouchableOpacity
                        key={table.id}
                        style={styles.checkboxRow}
                        onPress={() => {
                          const isSelected = groupForm.tableIds.includes(table.id);
                          if (isSelected) {
                            setGroupForm({
                              ...groupForm,
                              tableIds: groupForm.tableIds.filter((id) => id !== table.id),
                            });
                          } else {
                            setGroupForm({
                              ...groupForm,
                              tableIds: [...groupForm.tableIds, table.id],
                            });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            groupForm.tableIds.includes(table.id) && styles.checkboxChecked,
                          ]}
                        >
                          {groupForm.tableIds.includes(table.id) && (
                            <View style={styles.checkboxInner} />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>
                          {table.name} ({table.minCapacity}-{table.maxCapacity} personas)
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.modalRow}>
                  <View style={styles.modalFormGroupHalf}>
                    <Text style={styles.modalLabel}>Min. Comensales</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={groupForm.minCapacity}
                      onChangeText={(text) => setGroupForm({ ...groupForm, minCapacity: text })}
                      placeholder="2"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.modalFormGroupHalf}>
                    <Text style={styles.modalLabel}>Max. Comensales</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={groupForm.maxCapacity}
                      onChangeText={(text) => setGroupForm({ ...groupForm, maxCapacity: text })}
                      placeholder="4"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Prioridad de Ocupación</Text>
                  <Text style={styles.priorityDescription}>
                    Define la prioridad para asignar este grupo (1 = menor prioridad, 9 = mayor prioridad)
                  </Text>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderValue}>{groupForm.priority}</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={1}
                      maximumValue={9}
                      step={1}
                      value={groupForm.priority}
                      onValueChange={(value: number) => setGroupForm({ ...groupForm, priority: value })}
                      minimumTrackTintColor="#f59e0b"
                      maximumTrackTintColor="#e2e8f0"
                      thumbTintColor="#f59e0b"
                    />
                    <View style={styles.sliderLabels}>
                      <Text style={styles.sliderLabel}>1</Text>
                      <Text style={styles.sliderLabel}>9</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.modalButton, (createTableGroupMutation.isPending || updateTableGroupMutation.isPending) && styles.modalButtonDisabled]} 
                  onPress={handleSaveGroup} 
                  activeOpacity={0.8}
                  disabled={createTableGroupMutation.isPending || updateTableGroupMutation.isPending}
                >
                  <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.modalButtonGradient}>
                    {(createTableGroupMutation.isPending || updateTableGroupMutation.isPending) ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonText}>
                        {editingGroup ? 'Actualizar Grupo' : 'Crear Grupo'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600' as const,
  },
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
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  addLocationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  locationsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff5e6',
    borderWidth: 2,
    borderColor: '#f59e0b',
    marginRight: 12,
  },
  locationCardActive: {
    backgroundColor: '#f59e0b',
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#f59e0b',
  },
  locationTextActive: {
    color: '#fff',
  },
  addTableButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tableCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  tableActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableInfo: {
    gap: 12,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capacityText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  tableFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748b',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  modalFormGroup: {
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modalFormGroupHalf: {
    flex: 1,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#475569',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#f59e0b',
    backgroundColor: '#fff5e6',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500' as const,
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  priorityDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  sliderContainer: {
    marginTop: 8,
  },
  sliderValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#f59e0b',
    textAlign: 'center',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600' as const,
  },
  highChairInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  infoValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700' as const,
  },
  groupTablesList: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  groupTablesLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600' as const,
  },
  groupTablesText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500' as const,
    flex: 1,
  },
  priorityBadge: {
    backgroundColor: '#fff5e6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#f59e0b',
  },
  tablesSelection: {
    maxHeight: 200,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 8,
  },
  locationSelection: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff5e6',
    borderWidth: 2,
    borderColor: '#f59e0b',
    marginRight: 8,
  },
  locationOptionSelected: {
    backgroundColor: '#f59e0b',
  },
  locationOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#f59e0b',
  },
  locationOptionTextSelected: {
    color: '#fff',
  },
  locationWrapper: {
    marginRight: 12,
  },
  locationActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    justifyContent: 'center',
  },
  locationEditButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationDeleteButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imagePreviewLabel: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 8,
    fontWeight: '500' as const,
  },
  imagePreviewContainer: {
    gap: 12,
  },
  locationImagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  uploadButton: {
    backgroundColor: '#fff5e6',
    borderWidth: 2,
    borderColor: '#fed7aa',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#f59e0b',
    marginTop: 8,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff5e6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#f59e0b',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
});
