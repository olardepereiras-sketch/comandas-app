import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChefHat, Plus, Search, Edit2, Trash2, X, MapPin, AlertTriangle, BarChart2, RefreshCw, CheckCircle, Building2, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';

type TabType = 'list' | 'diagnostics';

export default function AdminCuisineTypesScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeName, setTypeName] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [mergeGroup, setMergeGroup] = useState<{ name: string; ids: string[] } | null>(null);
  const [keepId, setKeepId] = useState<string>('');
  const [expandedRestaurant, setExpandedRestaurant] = useState<string | null>(null);

  const cuisineTypesQuery = trpc.cuisineTypes.list.useQuery();
  const provincesQuery = trpc.locations.provinces.useQuery();
  const diagnosticsQuery = trpc.cuisineTypes.diagnostics.useQuery(undefined, {
    enabled: activeTab === 'diagnostics',
    refetchOnMount: true,
  });
  const cuisinesByProvinceQuery = trpc.cuisineTypes.byProvince.useQuery(
    { provinceId: selectedProvince },
    { enabled: !!selectedProvince, refetchOnMount: true }
  );
  const createMutation = trpc.cuisineTypes.create.useMutation();
  const updateMutation = trpc.cuisineTypes.update.useMutation();
  const deleteMutation = trpc.cuisineTypes.delete.useMutation({
    onSuccess: async (data) => {
      console.log('✅ [CUISINE DELETE] Tipo eliminado con éxito:', data);
      await cuisineTypesQuery.refetch();
      if (activeTab === 'diagnostics') {
        await diagnosticsQuery.refetch();
      }
      const message = data?.affectedRestaurants && data.affectedRestaurants > 0
        ? `Tipo eliminado. Se ha removido de ${data.affectedRestaurants} restaurante(s).`
        : 'Tipo de cocina eliminado correctamente.';
      Alert.alert('✅ Eliminado', message);
    },
    onError: (error: any) => {
      console.error('❌ [CUISINE DELETE] Error:', error);
      Alert.alert('Error al eliminar', error.message || 'No se pudo eliminar el tipo de cocina. Inténtalo de nuevo.');
    }
  });
  const assignMutation = trpc.cuisineTypes.assignToProvince.useMutation();
  const mergeMutation = trpc.cuisineTypes.merge.useMutation({
    onSuccess: async (data) => {
      console.log('✅ [MERGE] Completado:', data);
      await cuisineTypesQuery.refetch();
      await diagnosticsQuery.refetch();
      setShowMergeModal(false);
      setMergeGroup(null);
      Alert.alert('✅ Fusión completada', data.message);
    },
    onError: (error: any) => {
      console.error('❌ [MERGE] Error:', error);
      Alert.alert('Error', error.message || 'No se pudo fusionar');
    }
  });

  const cuisineTypes = cuisineTypesQuery.data || [];
  const provinces = provincesQuery.data || [];
  const diagnostics = diagnosticsQuery.data;

  const filteredTypes = cuisineTypes.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (type?: any) => {
    if (type) {
      setEditingType(type);
      setTypeName(type.name);
    } else {
      setEditingType(null);
      setTypeName('');
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!typeName.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    try {
      if (editingType) {
        await updateMutation.mutateAsync({ id: editingType.id, name: typeName });
      } else {
        await createMutation.mutateAsync({ name: typeName });
      }
      await cuisineTypesQuery.refetch();
      setShowModal(false);
      Alert.alert('Éxito', editingType ? 'Tipo actualizado' : 'Tipo creado');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDelete = useCallback((id: string, name: string) => {
    if (deleteMutation.isPending) return;

    const doDelete = () => {
      console.log('🗑️ [CUISINE DELETE] Iniciando eliminación de:', id, name);
      deleteMutation.mutate({ id });
    };

    if (Platform.OS === 'web') {
      const msg = `¿Eliminar "${name}"?\n\nSe eliminará de todos los restaurantes y provincias donde esté asignado. Esta acción no se puede deshacer.`;
      if ((window as any).confirm(msg)) {
        doDelete();
      }
      return;
    }

    Alert.alert(
      'Eliminar Tipo de Cocina',
      `¿Eliminar "${name}"?\n\nSe eliminará de todos los restaurantes y provincias donde esté asignado. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: doDelete,
        },
      ]
    );
  }, [deleteMutation]);

  const handleOpenAssignModal = () => {
    setSelectedProvince('');
    setSelectedCuisines([]);
    setShowAssignModal(true);
  };

  const handleProvinceSelect = (provinceId: string) => {
    setSelectedProvince(provinceId);
  };

  useEffect(() => {
    if (selectedProvince && cuisinesByProvinceQuery.data) {
      const assignedIds = cuisinesByProvinceQuery.data.map((c) => c.id);
      setSelectedCuisines(assignedIds);
    } else if (!selectedProvince) {
      setSelectedCuisines([]);
    }
  }, [selectedProvince, cuisinesByProvinceQuery.data]);

  const toggleCuisine = (id: string) => {
    setSelectedCuisines(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleSaveAssignment = async () => {
    if (!selectedProvince) {
      Alert.alert('Error', 'Selecciona una provincia');
      return;
    }
    try {
      await assignMutation.mutateAsync({
        provinceId: selectedProvince,
        cuisineTypeIds: selectedCuisines,
      });
      await cuisinesByProvinceQuery.refetch();
      setShowAssignModal(false);
      Alert.alert('Éxito', 'Asignación guardada correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleOpenMerge = (group: { name: string; ids: string[] }) => {
    setMergeGroup(group);
    setKeepId(group.ids[0]);
    setShowMergeModal(true);
  };

  const handleMerge = () => {
    if (!mergeGroup || !keepId) return;
    const idsToMerge = mergeGroup.ids.filter(id => id !== keepId);
    Alert.alert(
      '⚠️ Confirmar Fusión',
      `Se mantendrá el ID "${keepId}" y se eliminarán los duplicados. Los restaurantes afectados se actualizarán automáticamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fusionar',
          style: 'destructive',
          onPress: () => mergeMutation.mutate({ keepId, mergeIds: idsToMerge }),
        },
      ]
    );
  };

  const renderDiagnosticsTab = () => {
    if (diagnosticsQuery.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Analizando base de datos...</Text>
        </View>
      );
    }

    if (!diagnostics) {
      return (
        <View style={styles.loadingContainer}>
          <TouchableOpacity style={styles.refreshButton} onPress={() => diagnosticsQuery.refetch()}>
            <RefreshCw size={20} color="#f97316" strokeWidth={2.5} />
            <Text style={styles.refreshText}>Cargar diagnóstico</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.summaryNumber, { color: '#2563eb' }]}>{diagnostics.summary.totalTypes}</Text>
            <Text style={styles.summaryLabel}>Total tipos</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: diagnostics.summary.duplicateGroups > 0 ? '#fef2f2' : '#f0fdf4' }]}>
            <Text style={[styles.summaryNumber, { color: diagnostics.summary.duplicateGroups > 0 ? '#dc2626' : '#16a34a' }]}>
              {diagnostics.summary.duplicateGroups}
            </Text>
            <Text style={styles.summaryLabel}>Duplicados</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#fff7ed' }]}>
            <Text style={[styles.summaryNumber, { color: '#ea580c' }]}>{diagnostics.summary.typesWithRestaurants}</Text>
            <Text style={styles.summaryLabel}>Con restaurantes</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#fefce8' }]}>
            <Text style={[styles.summaryNumber, { color: '#ca8a04' }]}>{diagnostics.summary.typesWithoutProvinces}</Text>
            <Text style={styles.summaryLabel}>Sin provincia</Text>
          </View>
        </View>

        {diagnostics.duplicates.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={18} color="#dc2626" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>⚠️ Duplicados detectados</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Tipos con el mismo nombre pero diferentes IDs. Esto puede impedir que el buscador funcione correctamente.
            </Text>
            {diagnostics.duplicates.map((dup) => (
              <View key={dup.name} style={styles.duplicateCard}>
                <View style={styles.duplicateHeader}>
                  <Text style={styles.duplicateName}>"{dup.name}"</Text>
                  <TouchableOpacity
                    style={styles.mergeButton}
                    onPress={() => handleOpenMerge(dup)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.mergeButtonText}>Fusionar</Text>
                  </TouchableOpacity>
                </View>
                {dup.ids.map(id => {
                  const typeData = diagnostics.cuisineTypes.find(ct => ct.id === id);
                  return (
                    <View key={id} style={styles.duplicateIdRow}>
                      <View style={styles.duplicateIdBadge}>
                        <Text style={styles.duplicateIdText}>{id}</Text>
                      </View>
                      <Text style={styles.duplicateRestCount}>
                        {typeData?.restaurantCount ?? 0} restaurante(s)
                      </Text>
                      {typeData?.assignedProvinces && typeData.assignedProvinces.length > 0 ? (
                        <View style={styles.provincesBadge}>
                          <MapPin size={10} color="#7c3aed" strokeWidth={2.5} />
                          <Text style={styles.provincesBadgeText}>{typeData.assignedProvinces.join(', ')}</Text>
                        </View>
                      ) : (
                        <View style={[styles.provincesBadge, { backgroundColor: '#fef9c3' }]}>
                          <Text style={[styles.provincesBadgeText, { color: '#854d0e' }]}>Sin provincia</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {diagnostics.duplicates.length === 0 && (
          <View style={styles.okBanner}>
            <CheckCircle size={20} color="#16a34a" strokeWidth={2.5} />
            <Text style={styles.okBannerText}>No hay duplicados detectados</Text>
          </View>
        )}

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <BarChart2 size={18} color="#2563eb" strokeWidth={2.5} />
            <Text style={styles.sectionTitle}>Tipos de cocina y sus IDs</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Estos son los IDs almacenados en la base de datos. El restaurante debe tener exactamente este ID en su configuración.
          </Text>
          {diagnostics.cuisineTypes.map(ct => (
            <View key={ct.id} style={[styles.diagTypeCard, ct.isDuplicate && styles.diagTypeCardDuplicate]}>
              <View style={styles.diagTypeTop}>
                <Text style={styles.diagTypeName}>{ct.name}</Text>
                {ct.isDuplicate && (
                  <View style={styles.dupTag}>
                    <Text style={styles.dupTagText}>DUPLICADO</Text>
                  </View>
                )}
              </View>
              <View style={styles.diagIdRow}>
                <Text style={styles.diagIdLabel}>ID:</Text>
                <Text style={styles.diagIdValue}>{ct.id}</Text>
              </View>
              <View style={styles.diagMetaRow}>
                <View style={styles.diagMetaItem}>
                  <Building2 size={12} color="#64748b" strokeWidth={2} />
                  <Text style={styles.diagMetaText}>{ct.restaurantCount} restaurante(s)</Text>
                </View>
                {ct.assignedProvinces.length > 0 ? (
                  <View style={styles.diagMetaItem}>
                    <MapPin size={12} color="#7c3aed" strokeWidth={2} />
                    <Text style={[styles.diagMetaText, { color: '#7c3aed' }]}>{ct.assignedProvinces.join(', ')}</Text>
                  </View>
                ) : (
                  <View style={styles.diagMetaItem}>
                    <Info size={12} color="#ca8a04" strokeWidth={2} />
                    <Text style={[styles.diagMetaText, { color: '#ca8a04' }]}>Sin provincia asignada</Text>
                  </View>
                )}
              </View>
              {ct.restaurantCount > 0 && (
                <TouchableOpacity
                  onPress={() => setExpandedRestaurant(expandedRestaurant === ct.id ? null : ct.id)}
                  style={styles.showRestaurantsBtn}
                >
                  <Text style={styles.showRestaurantsBtnText}>
                    {expandedRestaurant === ct.id ? 'Ocultar' : 'Ver restaurantes'}
                  </Text>
                </TouchableOpacity>
              )}
              {expandedRestaurant === ct.id && (
                <View style={styles.restaurantsList}>
                  {ct.restaurantNames.map((rName, idx) => (
                    <Text key={idx} style={styles.restaurantItem}>• {rName}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Building2 size={18} color="#0891b2" strokeWidth={2.5} />
            <Text style={styles.sectionTitle}>Restaurantes y sus tipos</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            IDs de tipos de cocina almacenados en cada restaurante.
          </Text>
          {diagnostics.restaurants.map(rest => (
            <View key={rest.id} style={styles.restaurantDiagCard}>
              <Text style={styles.restaurantDiagName}>{rest.name}</Text>
              {rest.cuisineTypeIds.length === 0 ? (
                <Text style={styles.noCuisineText}>Sin tipos de cocina asignados</Text>
              ) : (
                <View style={styles.cuisineTagsRow}>
                  {rest.cuisineTypeIds.map((cid, idx) => {
                    const exists = diagnostics.cuisineTypes.find(ct => ct.id === cid || ct.id === cid.replace(/^cuisine-/, ''));
                    return (
                      <View key={idx} style={[styles.cuisineTag, !exists && styles.cuisineTagOrphan]}>
                        <Text style={[styles.cuisineTagText, !exists && styles.cuisineTagOrphanText]}>{cid}</Text>
                        {!exists && <Text style={styles.orphanWarning}> ⚠️</Text>}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.refreshFullButton}
          onPress={() => diagnosticsQuery.refetch()}
          activeOpacity={0.8}
        >
          <RefreshCw size={16} color="#fff" strokeWidth={2.5} />
          <Text style={styles.refreshFullText}>Actualizar diagnóstico</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tipos de Cocina</Text>
        <Text style={styles.headerSubtitle}>{cuisineTypes.length} tipos configurados</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => setActiveTab('list')}
          activeOpacity={0.8}
        >
          <ChefHat size={16} color={activeTab === 'list' ? '#f97316' : '#64748b'} strokeWidth={2.5} />
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>Tipos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'diagnostics' && styles.tabActive]}
          onPress={() => setActiveTab('diagnostics')}
          activeOpacity={0.8}
        >
          {diagnostics && diagnostics.duplicates.length > 0 ? (
            <AlertTriangle size={16} color={activeTab === 'diagnostics' ? '#dc2626' : '#64748b'} strokeWidth={2.5} />
          ) : (
            <BarChart2 size={16} color={activeTab === 'diagnostics' ? '#f97316' : '#64748b'} strokeWidth={2.5} />
          )}
          <Text style={[styles.tabText, activeTab === 'diagnostics' && styles.tabTextActive]}>
            Diagnóstico
            {diagnostics && diagnostics.duplicates.length > 0 ? ` (${diagnostics.duplicates.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'list' && (
        <>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color="#64748b" strokeWidth={2.5} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar tipos..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleOpenModal()}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#f97316', '#ea580c']} style={styles.addButtonGradient}>
                <Plus size={24} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.assignButtonContainer}>
            <TouchableOpacity style={styles.assignButton} onPress={handleOpenAssignModal} activeOpacity={0.8}>
              <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.assignGradient}>
                <MapPin size={20} color="#fff" strokeWidth={2.5} />
                <Text style={styles.assignButtonText}>Asignar a Provincias</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {filteredTypes.map((type) => (
              <View key={type.id} style={styles.typeCard}>
                <View style={styles.typeIcon}>
                  <ChefHat size={24} color="#f97316" strokeWidth={2.5} />
                </View>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeName}>{type.name}</Text>
                  <Text style={styles.typeId}>ID: {type.id}</Text>
                </View>
                <View style={styles.typeActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleOpenModal(type)}
                    disabled={deleteMutation.isPending}
                  >
                    <Edit2 size={20} color="#3b82f6" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton, deleteMutation.isPending && styles.deleteButtonDisabled]}
                    onPress={() => handleDelete(type.id, type.name)}
                    disabled={deleteMutation.isPending}
                    activeOpacity={0.7}
                  >
                    {deleteMutation.isPending && deleteMutation.variables?.id === type.id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Trash2 size={20} color={deleteMutation.isPending ? '#fca5a5' : '#ef4444'} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {activeTab === 'diagnostics' && renderDiagnosticsTab()}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingType ? 'Editar Tipo' : 'Nuevo Tipo'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={typeName}
              onChangeText={setTypeName}
              placeholder="Ej: Marisquería"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <LinearGradient colors={['#f97316', '#ea580c']} style={styles.saveButtonGradient}>
              <Text style={styles.saveButtonText}>Guardar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showAssignModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAssignModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Asignar a Provincia</Text>
            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Provincia *</Text>
              {provinces.map(province => (
                <TouchableOpacity
                  key={province.id}
                  style={[styles.provinceOption, selectedProvince === province.id && styles.provinceOptionSelected]}
                  onPress={() => handleProvinceSelect(province.id)}
                >
                  <Text style={[styles.provinceText, selectedProvince === province.id && styles.provinceTextSelected]}>
                    {province.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedProvince && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tipos de Cocina</Text>
                {cuisineTypes.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.cuisineOption, selectedCuisines.includes(type.id) && styles.cuisineOptionSelected]}
                    onPress={() => toggleCuisine(type.id)}
                  >
                    <Text style={[styles.cuisineText, selectedCuisines.includes(type.id) && styles.cuisineTextSelected]}>
                      {type.name}
                    </Text>
                    <Text style={styles.cuisineOptionId}>{type.id}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
          {selectedProvince && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveAssignment}>
              <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.saveButtonGradient}>
                <Text style={styles.saveButtonText}>Guardar Asignación</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      <Modal visible={showMergeModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowMergeModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fusionar Duplicados</Text>
            <TouchableOpacity onPress={() => setShowMergeModal(false)}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {mergeGroup && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tipo a mantener: "{mergeGroup.name}"</Text>
                <Text style={styles.mergeHint}>
                  Selecciona qué ID conservar. Los restaurantes que tengan cualquiera de estos IDs serán actualizados automáticamente al ID seleccionado.
                </Text>
                {mergeGroup.ids.map(id => {
                  const typeData = diagnostics?.cuisineTypes.find(ct => ct.id === id);
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.mergeOption, keepId === id && styles.mergeOptionSelected]}
                      onPress={() => setKeepId(id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.mergeOptionRadio}>
                        {keepId === id && <View style={styles.mergeOptionRadioInner} />}
                      </View>
                      <View style={styles.mergeOptionContent}>
                        <Text style={styles.mergeOptionId}>{id}</Text>
                        <Text style={styles.mergeOptionMeta}>
                          {typeData?.restaurantCount ?? 0} restaurante(s) · {typeData?.assignedProvinces?.join(', ') || 'Sin provincia'}
                        </Text>
                      </View>
                      {keepId === id && (
                        <View style={styles.keepBadge}>
                          <Text style={styles.keepBadgeText}>MANTENER</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleMerge}
            disabled={mergeMutation.isPending}
          >
            <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.saveButtonGradient}>
              {mergeMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Fusionar y Corregir</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 24, fontWeight: '700' as const, color: '#0f172a', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#64748b' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#f97316' },
  tabText: { fontSize: 14, fontWeight: '500' as const, color: '#64748b' },
  tabTextActive: { color: '#f97316', fontWeight: '600' as const },
  searchContainer: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16, gap: 8 },
  searchInput: { flex: 1, height: 48, fontSize: 16, color: '#0f172a' },
  addButton: { borderRadius: 12, overflow: 'hidden' },
  addButtonGradient: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  assignButtonContainer: { padding: 16, paddingBottom: 8 },
  assignButton: { borderRadius: 12, overflow: 'hidden' },
  assignGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  assignButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  typeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  typeIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  typeInfo: { flex: 1 },
  typeName: { fontSize: 16, fontWeight: '600' as const, color: '#0f172a', marginBottom: 2 },
  typeId: { fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' },
  typeActions: { flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: '#f1f5f9', padding: 10, borderRadius: 10 },
  deleteButton: { backgroundColor: '#fef2f2' },
  deleteButtonDisabled: { opacity: 0.5 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: '#64748b' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, backgroundColor: '#fff7ed', borderRadius: 12 },
  refreshText: { fontSize: 15, color: '#f97316', fontWeight: '600' as const },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryNumber: { fontSize: 22, fontWeight: '700' as const, marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: '#64748b', textAlign: 'center' as const },
  sectionBlock: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: '#0f172a' },
  sectionSubtitle: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  okBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#bbf7d0' },
  okBannerText: { fontSize: 15, color: '#16a34a', fontWeight: '600' as const },
  duplicateCard: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#fecaca' },
  duplicateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  duplicateName: { fontSize: 15, fontWeight: '700' as const, color: '#dc2626' },
  mergeButton: { backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  mergeButtonText: { fontSize: 12, color: '#fff', fontWeight: '600' as const },
  duplicateIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const },
  duplicateIdBadge: { backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#fecaca' },
  duplicateIdText: { fontSize: 11, color: '#0f172a', fontFamily: 'monospace' },
  duplicateRestCount: { fontSize: 11, color: '#64748b' },
  provincesBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ede9fe', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  provincesBadgeText: { fontSize: 10, color: '#7c3aed', fontWeight: '500' as const },
  diagTypeCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  diagTypeCardDuplicate: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  diagTypeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  diagTypeName: { fontSize: 15, fontWeight: '600' as const, color: '#0f172a' },
  dupTag: { backgroundColor: '#dc2626', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  dupTagText: { fontSize: 9, color: '#fff', fontWeight: '700' as const, letterSpacing: 0.5 },
  diagIdRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  diagIdLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' as const },
  diagIdValue: { fontSize: 12, color: '#334155', fontFamily: 'monospace', backgroundColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  diagMetaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' as const },
  diagMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  diagMetaText: { fontSize: 11, color: '#64748b' },
  showRestaurantsBtn: { alignSelf: 'flex-start' as const, paddingVertical: 4 },
  showRestaurantsBtnText: { fontSize: 12, color: '#3b82f6', fontWeight: '500' as const },
  restaurantsList: { gap: 2, paddingLeft: 8 },
  restaurantItem: { fontSize: 12, color: '#475569' },
  restaurantDiagCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  restaurantDiagName: { fontSize: 14, fontWeight: '600' as const, color: '#0f172a' },
  noCuisineText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' as const },
  cuisineTagsRow: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 6 },
  cuisineTag: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cuisineTagOrphan: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  cuisineTagText: { fontSize: 11, color: '#0369a1', fontFamily: 'monospace' },
  cuisineTagOrphanText: { color: '#dc2626' },
  orphanWarning: { fontSize: 11 },
  refreshFullButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f97316', borderRadius: 12, padding: 14, marginTop: 4 },
  refreshFullText: { fontSize: 14, color: '#fff', fontWeight: '600' as const },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: '700' as const, color: '#0f172a' },
  modalScroll: { flex: 1 },
  formGroup: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { fontSize: 14, fontWeight: '600' as const, color: '#0f172a', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, color: '#0f172a' },
  provinceOption: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 8 },
  provinceOptionSelected: { backgroundColor: '#ede9fe' },
  provinceText: { fontSize: 16, color: '#64748b', fontWeight: '500' as const },
  provinceTextSelected: { color: '#7c3aed', fontWeight: '600' as const },
  cuisineOption: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 6 },
  cuisineOptionSelected: { backgroundColor: '#fef3c7' },
  cuisineText: { fontSize: 14, color: '#64748b', fontWeight: '500' as const },
  cuisineTextSelected: { color: '#92400e', fontWeight: '600' as const },
  cuisineOptionId: { fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 },
  saveButton: { margin: 20, borderRadius: 12, overflow: 'hidden' },
  saveButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#fff' },
  mergeHint: { fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18 },
  mergeOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  mergeOptionSelected: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  mergeOptionRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#94a3b8', alignItems: 'center', justifyContent: 'center' },
  mergeOptionRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#dc2626' },
  mergeOptionContent: { flex: 1 },
  mergeOptionId: { fontSize: 13, color: '#0f172a', fontFamily: 'monospace', fontWeight: '600' as const },
  mergeOptionMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  keepBadge: { backgroundColor: '#dc2626', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  keepBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' as const },
});
