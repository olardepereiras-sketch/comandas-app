import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { MapPin, Plus, Edit2, Trash2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import type { Province, City, SalesRepresentative } from '@/types';

export default function AdminLocationsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'provinces' | 'cities' | 'timeSlots' | 'salesReps'>('provinces');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'provinces' | 'cities' | 'timeSlots' | 'salesReps'>('provinces');
  const [editingItem, setEditingItem] = useState<Province | City | SalesRepresentative | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    provinceId: '', 
    time: '',
    firstName: '',
    lastName: '',
    dni: '',
    address: '',
    phone: '',
    email: '',
    newClientCommissionPercent: 0,
    firstRenewalCommissionPercent: 0,
    renewalCommissionPercent: 0,
    isActive: true,
  });

  const provincesQuery = trpc.locations.provinces.useQuery();
  const citiesQuery = trpc.locations.cities.useQuery();
  const timeSlotsQuery = trpc.timeSlots.list.useQuery();
  const salesRepsQuery = trpc.salesReps.list.useQuery();
  
  const createProvinceMutation = trpc.locations.createProvince.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      handleCloseModal();
      Alert.alert('Éxito', 'Provincia creada correctamente');
    },
    onError: (error) => {
      console.error('Error creating province:', error);
      Alert.alert('Error', error.message);
    },
  });
  
  const updateProvinceMutation = trpc.locations.updateProvince.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['locations', 'provinces']] });
      handleCloseModal();
      Alert.alert('Éxito', 'Provincia actualizada correctamente');
    },
    onError: (error) => {
      console.error('Error updating province:', error);
      Alert.alert('Error', error.message);
    },
  });
  
  const deleteProvinceMutation = trpc.locations.deleteProvince.useMutation({
    onSuccess: async () => {
      console.log('✅ [PROVINCE DELETE] Eliminación exitosa, revalidando queries...');
      await queryClient.invalidateQueries({ queryKey: [['locations']] });
      await provincesQuery.refetch();
      await citiesQuery.refetch();
      Alert.alert('Éxito', 'Provincia eliminada correctamente');
    },
    onError: (error: any) => {
      console.error('❌ [PROVINCE DELETE] Error:', error);
      Alert.alert('Error', error.message || 'No se pudo eliminar la provincia');
    },
  });
  
  const createCityMutation = trpc.locations.createCity.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['locations', 'cities']] });
      handleCloseModal();
      Alert.alert('Éxito', 'Población creada correctamente');
    },
    onError: (error) => {
      console.error('Error creating city:', error);
      Alert.alert('Error', error.message);
    },
  });
  
  const updateCityMutation = trpc.locations.updateCity.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['locations', 'cities']] });
      handleCloseModal();
      Alert.alert('Éxito', 'Población actualizada correctamente');
    },
    onError: (error) => {
      console.error('Error updating city:', error);
      Alert.alert('Error', error.message);
    },
  });
  
  const deleteCityMutation = trpc.locations.deleteCity.useMutation({
    onSuccess: async () => {
      console.log('✅ [CITY DELETE] Eliminación exitosa, revalidando queries...');
      await queryClient.invalidateQueries({ queryKey: [['locations']] });
      await citiesQuery.refetch();
      Alert.alert('Éxito', 'Población eliminada correctamente');
    },
    onError: (error: any) => {
      console.error('❌ [CITY DELETE] Error:', error);
      Alert.alert('Error', error.message || 'No se pudo eliminar la población');
    },
  });
  
  const createTimeSlotMutation = trpc.timeSlots.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['timeSlots', 'list']] });
      handleCloseModal();
      Alert.alert('Éxito', 'Hora creada correctamente');
    },
    onError: (error) => {
      console.error('Error creating time slot:', error);
      Alert.alert('Error', error.message);
    },
  });
  
  const deleteTimeSlotMutation = trpc.timeSlots.delete.useMutation({
    onSuccess: async () => {
      console.log('✅ [TIMESLOT DELETE] Eliminación exitosa, revalidando queries...');
      await queryClient.invalidateQueries({ queryKey: [['timeSlots']] });
      await timeSlotsQuery.refetch();
      Alert.alert('Éxito', 'Hora eliminada correctamente');
    },
    onError: (error: any) => {
      console.error('❌ [TIMESLOT DELETE] Error:', error);
      Alert.alert('Error', error.message || 'No se pudo eliminar la hora');
    },
  });

  const createSalesRepMutation = trpc.salesReps.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['salesReps', 'list']] });
      handleCloseModal();
      Alert.alert('Éxito', 'Comercial creado correctamente');
    },
    onError: (error) => {
      console.error('Error creating sales rep:', error);
      Alert.alert('Error', error.message);
    },
  });

  const updateSalesRepMutation = trpc.salesReps.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['salesReps', 'list']] });
      handleCloseModal();
      Alert.alert('Éxito', 'Comercial actualizado correctamente');
    },
    onError: (error) => {
      console.error('Error updating sales rep:', error);
      Alert.alert('Error', error.message);
    },
  });

  const deleteSalesRepMutation = trpc.salesReps.delete.useMutation({
    onSuccess: async () => {
      console.log('✅ [SALES REP DELETE] Eliminación exitosa, revalidando queries...');
      await queryClient.invalidateQueries({ queryKey: [['salesReps']] });
      await salesRepsQuery.refetch();
      Alert.alert('Éxito', 'Comercial eliminado correctamente');
    },
    onError: (error: any) => {
      console.error('❌ [SALES REP DELETE] Error:', error);
      Alert.alert('Error', error.message || 'No se pudo eliminar el comercial');
    },
  });

  const provinces = provincesQuery.data || [];
  const cities = citiesQuery.data || [];
  const timeSlots = timeSlotsQuery.data || [];
  const salesReps = salesRepsQuery.data || [];

  const handleDelete = (type: 'provinces' | 'cities' | 'timeSlots' | 'salesReps', id: string, name?: string) => {
    console.log('[LOCATIONS DELETE]', type, id, name);
    
    if (type === 'provinces') {
      const message = `¿Estás seguro de que deseas eliminar "${name}"?\n\nEsta acción eliminará:\n• La provincia\n• Todas las ciudades asociadas\n• Todos los restaurantes en esas ciudades\n• No se puede deshacer`;
      
      if (Platform.OS === 'web') {
        if (window.confirm(message)) {
          console.log('🔵 [PROVINCE DELETE] Usuario confirmó borrado');
          deleteProvinceMutation.mutate({ id });
        }
      } else {
        Alert.alert(
          '⚠️ ELIMINAR PROVINCIA',
          message,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: () => {
                console.log('🔵 [PROVINCE DELETE] Usuario confirmó borrado');
                deleteProvinceMutation.mutate({ id });
              },
            },
          ]
        );
      }
    } else if (type === 'cities') {
      const message = `¿Estás seguro de que deseas eliminar "${name}"?\n\nEsta acción eliminará:\n• La población\n• Todos los restaurantes en esta población\n• No se puede deshacer`;
      
      if (Platform.OS === 'web') {
        if (window.confirm(message)) {
          console.log('🔵 [CITY DELETE] Usuario confirmó borrado');
          deleteCityMutation.mutate({ id });
        }
      } else {
        Alert.alert(
          '⚠️ ELIMINAR POBLACIÓN',
          message,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: () => {
                console.log('🔵 [CITY DELETE] Usuario confirmó borrado');
                deleteCityMutation.mutate({ id });
              },
            },
          ]
        );
      }
    } else if (type === 'timeSlots') {
      const message = `¿Estás seguro de que deseas eliminar la hora "${name}"?`;
      
      if (Platform.OS === 'web') {
        if (window.confirm(message)) {
          console.log('🔵 [TIMESLOT DELETE] Usuario confirmó borrado');
          deleteTimeSlotMutation.mutate({ id });
        }
      } else {
        Alert.alert(
          '⚠️ ELIMINAR HORA',
          message,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: () => {
                console.log('🔵 [TIMESLOT DELETE] Usuario confirmó borrado');
                deleteTimeSlotMutation.mutate({ id });
              },
            },
          ]
        );
      }
    } else {
      const message = `¿Estás seguro de que deseas eliminar al comercial "${name}"?\n\nNo se puede eliminar si tiene restaurantes asignados.`;
      
      if (Platform.OS === 'web') {
        if (window.confirm(message)) {
          console.log('🔵 [SALES REP DELETE] Usuario confirmó borrado');
          deleteSalesRepMutation.mutate({ id });
        }
      } else {
        Alert.alert(
          '⚠️ ELIMINAR COMERCIAL',
          message,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: () => {
                console.log('🔵 [SALES REP DELETE] Usuario confirmó borrado');
                deleteSalesRepMutation.mutate({ id });
              },
            },
          ]
        );
      }
    }
  };

  const handleOpenModal = (type: 'provinces' | 'cities' | 'timeSlots' | 'salesReps', item?: any) => {
    setModalType(type);
    if (item) {
      setEditingItem(item);
      if (type === 'cities' && 'provinceId' in item) {
        setFormData({ 
          name: item.name, 
          provinceId: item.provinceId, 
          time: '',
          firstName: '',
          lastName: '',
          dni: '',
          address: '',
          phone: '',
          email: '',
          newClientCommissionPercent: 0,
          firstRenewalCommissionPercent: 0,
          renewalCommissionPercent: 0,
          isActive: true,
        });
      } else if (type === 'timeSlots' && 'time' in item) {
        setFormData({ 
          name: '', 
          provinceId: '', 
          time: item.time,
          firstName: '',
          lastName: '',
          dni: '',
          address: '',
          phone: '',
          email: '',
          newClientCommissionPercent: 0,
          firstRenewalCommissionPercent: 0,
          renewalCommissionPercent: 0,
          isActive: true,
        });
      } else if (type === 'salesReps' && 'firstName' in item) {
        setFormData({ 
          name: '',
          provinceId: '',
          time: '',
          firstName: item.firstName,
          lastName: item.lastName,
          dni: item.dni,
          address: item.address,
          phone: item.phone,
          email: item.email,
          newClientCommissionPercent: item.newClientCommissionPercent,
          firstRenewalCommissionPercent: item.firstRenewalCommissionPercent,
          renewalCommissionPercent: item.renewalCommissionPercent,
          isActive: item.isActive,
        });
      } else {
        setFormData({ 
          name: item.name, 
          provinceId: '', 
          time: '',
          firstName: '',
          lastName: '',
          dni: '',
          address: '',
          phone: '',
          email: '',
          newClientCommissionPercent: 0,
          firstRenewalCommissionPercent: 0,
          renewalCommissionPercent: 0,
          isActive: true,
        });
      }
    } else {
      setEditingItem(null);
      setFormData({ 
        name: '', 
        provinceId: '', 
        time: '',
        firstName: '',
        lastName: '',
        dni: '',
        address: '',
        phone: '',
        email: '',
        newClientCommissionPercent: 0,
        firstRenewalCommissionPercent: 0,
        renewalCommissionPercent: 0,
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ 
      name: '', 
      provinceId: '', 
      time: '',
      firstName: '',
      lastName: '',
      dni: '',
      address: '',
      phone: '',
      email: '',
      newClientCommissionPercent: 0,
      firstRenewalCommissionPercent: 0,
      renewalCommissionPercent: 0,
      isActive: true,
    });
  };

  const handleSave = () => {
    if (modalType === 'timeSlots') {
      if (!formData.time) {
        Alert.alert('Error', 'Por favor completa la hora');
        return;
      }
      createTimeSlotMutation.mutate({ time: formData.time });
      return;
    }

    if (modalType === 'salesReps') {
      if (!formData.firstName || !formData.lastName || !formData.dni || 
          !formData.address || !formData.phone || !formData.email) {
        Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
        return;
      }
      
      if (editingItem) {
        updateSalesRepMutation.mutate({
          id: editingItem.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          dni: formData.dni,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          newClientCommissionPercent: formData.newClientCommissionPercent,
          firstRenewalCommissionPercent: formData.firstRenewalCommissionPercent,
          renewalCommissionPercent: formData.renewalCommissionPercent,
          isActive: formData.isActive,
        });
      } else {
        createSalesRepMutation.mutate({
          firstName: formData.firstName,
          lastName: formData.lastName,
          dni: formData.dni,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          newClientCommissionPercent: formData.newClientCommissionPercent,
          firstRenewalCommissionPercent: formData.firstRenewalCommissionPercent,
          renewalCommissionPercent: formData.renewalCommissionPercent,
        });
      }
      return;
    }
    
    if (!formData.name) {
      Alert.alert('Error', 'Por favor completa el nombre');
      return;
    }

    if (modalType === 'cities' && !formData.provinceId) {
      Alert.alert('Error', 'Por favor selecciona una provincia');
      return;
    }

    if (modalType === 'provinces') {
      if (editingItem) {
        updateProvinceMutation.mutate({
          id: editingItem.id,
          name: formData.name,
        });
      } else {
        createProvinceMutation.mutate({
          name: formData.name,
        });
      }
    } else {
      if (editingItem) {
        updateCityMutation.mutate({
          id: editingItem.id,
          name: formData.name,
          provinceId: formData.provinceId,
        });
      } else {
        createCityMutation.mutate({
          name: formData.name,
          provinceId: formData.provinceId,
        });
      }
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Ubicaciones y Horas',
          headerStyle: { backgroundColor: '#10b981' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'provinces' && styles.tabActive]}
          onPress={() => setActiveTab('provinces')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'provinces' && styles.tabTextActive]}>
            Provincias
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cities' && styles.tabActive]}
          onPress={() => setActiveTab('cities')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'cities' && styles.tabTextActive]}>
            Poblaciones
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timeSlots' && styles.tabActive]}
          onPress={() => setActiveTab('timeSlots')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'timeSlots' && styles.tabTextActive]}>
            Horas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'salesReps' && styles.tabActive]}
          onPress={() => setActiveTab('salesReps')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'salesReps' && styles.tabTextActive]}>
            Comerciales
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'provinces' && (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Provincias</Text>
                <Text style={styles.headerSubtitle}>{provinces.length} provincias</Text>
              </View>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleOpenModal('provinces')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.addButtonGradient}
                >
                  <Plus size={24} color="#fff" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {provinces.map((province) => (
              <View key={province.id} style={styles.itemCard}>
                <View style={styles.itemIcon}>
                  <MapPin size={24} color="#10b981" strokeWidth={2.5} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{province.name}</Text>
                  <Text style={styles.itemMeta}>
                    {cities.filter(c => c.provinceId === province.id).length} poblaciones
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleOpenModal('provinces', province)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={18} color="#3b82f6" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteAction]}
                    onPress={() => handleDelete('provinces', province.id, province.name)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={18} color="#ef4444" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {provinces.length === 0 && (
              <View style={styles.emptyState}>
                <MapPin size={64} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No hay provincias</Text>
                <Text style={styles.emptyText}>Comienza agregando tu primera provincia</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'cities' && (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Poblaciones</Text>
                <Text style={styles.headerSubtitle}>{cities.length} poblaciones</Text>
              </View>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleOpenModal('cities')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.addButtonGradient}
                >
                  <Plus size={24} color="#fff" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {cities.map((city) => {
              const province = provinces.find(p => p.id === city.provinceId);
              return (
                <View key={city.id} style={styles.itemCard}>
                  <View style={styles.itemIcon}>
                    <MapPin size={24} color="#10b981" strokeWidth={2.5} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemName}>{city.name}</Text>
                    <Text style={styles.itemMeta}>{province?.name || 'Sin provincia'}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleOpenModal('cities', city)}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={18} color="#3b82f6" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteAction]}
                      onPress={() => handleDelete('cities', city.id, city.name)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={18} color="#ef4444" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {cities.length === 0 && (
              <View style={styles.emptyState}>
                <MapPin size={64} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No hay poblaciones</Text>
                <Text style={styles.emptyText}>Comienza agregando tu primera población</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'timeSlots' && (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Horas Disponibles</Text>
                <Text style={styles.headerSubtitle}>{timeSlots.length} horas</Text>
              </View>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleOpenModal('timeSlots')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.addButtonGradient}
                >
                  <Plus size={24} color="#fff" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {timeSlots.map((slot) => (
              <View key={slot.id} style={styles.itemCard}>
                <View style={styles.itemIcon}>
                  <MapPin size={24} color="#10b981" strokeWidth={2.5} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{slot.time}</Text>
                  <Text style={styles.itemMeta}>Hora disponible para reservas</Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteAction]}
                    onPress={() => handleDelete('timeSlots', slot.id, slot.time)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={18} color="#ef4444" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {timeSlots.length === 0 && (
              <View style={styles.emptyState}>
                <MapPin size={64} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No hay horas disponibles</Text>
                <Text style={styles.emptyText}>Comienza agregando las primeras horas</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'salesReps' && (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Comerciales</Text>
                <Text style={styles.headerSubtitle}>{salesReps.length} comerciales</Text>
              </View>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleOpenModal('salesReps')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.addButtonGradient}
                >
                  <Plus size={24} color="#fff" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {salesReps.map((rep) => (
              <View key={rep.id} style={styles.itemCard}>
                <View style={styles.itemIcon}>
                  <MapPin size={24} color="#10b981" strokeWidth={2.5} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{rep.firstName} {rep.lastName}</Text>
                  <Text style={styles.itemMeta}>
                    {rep.phone} • {rep.email}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Alta: {rep.newClientCommissionPercent}% | 1ª Renov: {rep.firstRenewalCommissionPercent}% | Renov: {rep.renewalCommissionPercent}%
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleOpenModal('salesReps', rep)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={18} color="#3b82f6" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteAction]}
                    onPress={() => handleDelete('salesReps', rep.id, `${rep.firstName} ${rep.lastName}`)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={18} color="#ef4444" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {salesReps.length === 0 && (
              <View style={styles.emptyState}>
                <MapPin size={64} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No hay comerciales</Text>
                <Text style={styles.emptyText}>Comienza agregando el primer comercial</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingItem 
                ? `Editar ${modalType === 'provinces' ? 'Provincia' : modalType === 'cities' ? 'Población' : modalType === 'timeSlots' ? 'Hora' : 'Comercial'}` 
                : `${modalType === 'provinces' ? 'Nueva Provincia' : modalType === 'cities' ? 'Nueva Población' : modalType === 'timeSlots' ? 'Nueva Hora' : 'Nuevo Comercial'}`
              }
            </Text>
            <TouchableOpacity onPress={handleCloseModal} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {modalType === 'timeSlots' ? (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Hora *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.time}
                  onChangeText={(text) => setFormData({ ...formData, time: text })}
                  placeholder="HH:MM (ejemplo: 13:30)"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder={modalType === 'provinces' ? 'Nombre de la provincia' : 'Nombre de la población'}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}

            {modalType === 'cities' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Provincia *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.provinceChipsContainer}>
                    {provinces.map((province) => (
                      <TouchableOpacity
                        key={province.id}
                        style={[
                          styles.provinceChip,
                          formData.provinceId === province.id && styles.provinceChipSelected,
                        ]}
                        onPress={() => setFormData({ ...formData, provinceId: province.id })}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.provinceChipText,
                            formData.provinceId === province.id && styles.provinceChipTextSelected,
                          ]}
                        >
                          {province.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {modalType === 'salesReps' && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nombre *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.firstName}
                    onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                    placeholder="Nombre del comercial"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Apellidos *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.lastName}
                    onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                    placeholder="Apellidos del comercial"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>DNI *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.dni}
                    onChangeText={(text) => setFormData({ ...formData, dni: text })}
                    placeholder="DNI del comercial"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Dirección *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.address}
                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                    placeholder="Dirección del comercial"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Teléfono *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    placeholder="+34 000 000 000"
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
                    placeholder="email@ejemplo.com"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Comisión Nuevo Cliente (%) *</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.newClientCommissionPercent)}
                    onChangeText={(text) => setFormData({ ...formData, newClientCommissionPercent: parseFloat(text) || 0 })}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Comisión 1ª Renovación (%) *</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.firstRenewalCommissionPercent)}
                    onChangeText={(text) => setFormData({ ...formData, firstRenewalCommissionPercent: parseFloat(text) || 0 })}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Comisión Siguientes Renovaciones (%) *</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.renewalCommissionPercent)}
                    onChangeText={(text) => setFormData({ ...formData, renewalCommissionPercent: parseFloat(text) || 0 })}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                  />
                </View>
                {editingItem && (
                  <View style={styles.formGroup}>
                    <View style={styles.switchRow}>
                      <Text style={styles.label}>Activo</Text>
                      <TouchableOpacity
                        style={[styles.switch, formData.isActive && styles.switchActive]}
                        onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.switchThumb, formData.isActive && styles.switchThumbActive]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  tabTextActive: {
    color: '#10b981',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    color: '#64748b',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    backgroundColor: '#fef2f2',
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
  provinceChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  provinceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  provinceChipSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
  },
  provinceChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  provinceChipTextSelected: {
    color: '#059669',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#10b981',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
});
