import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Info, Calendar, LayoutGrid, Clock, Heart, Plus, Edit2, Trash2, X, Settings, CalendarDays, ShoppingCart, UserCheck, Gamepad2, ClipboardList, QrCode, ChefHat, UtensilsCrossed } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import type { SubscriptionPlan, SubscriptionDuration, Module } from '@/types';

const iconMap: Record<string, React.ReactNode> = {
  Info: <Info size={24} color="#fff" strokeWidth={2.5} />,
  Settings: <Settings size={24} color="#fff" strokeWidth={2.5} />,
  Calendar: <Calendar size={24} color="#fff" strokeWidth={2.5} />,
  CalendarDays: <CalendarDays size={24} color="#fff" strokeWidth={2.5} />,
  LayoutGrid: <LayoutGrid size={24} color="#fff" strokeWidth={2.5} />,
  Clock: <Clock size={24} color="#fff" strokeWidth={2.5} />,
  Heart: <Heart size={24} color="#fff" strokeWidth={2.5} fill="#fff" />,
  ShoppingCart: <ShoppingCart size={24} color="#fff" strokeWidth={2.5} />,
  UserClock: <UserCheck size={24} color="#fff" strokeWidth={2.5} />,
  Gamepad2: <Gamepad2 size={24} color="#fff" strokeWidth={2.5} />,
  ClipboardList: <ClipboardList size={24} color="#fff" strokeWidth={2.5} />,
  QrCode: <QrCode size={24} color="#fff" strokeWidth={2.5} />,
  ChefHat: <ChefHat size={24} color="#fff" strokeWidth={2.5} />,
  UtensilsCrossed: <UtensilsCrossed size={24} color="#fff" strokeWidth={2.5} />,
};

export default function AdminModulesScreen() {
  const insets = useSafeAreaInsets();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editingDuration, setEditingDuration] = useState<SubscriptionDuration | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [planFormData, setPlanFormData] = useState({ name: '', price: '' });
  const [durationFormData, setDurationFormData] = useState({ name: '', months: '', description: '' });
  const [moduleFormData, setModuleFormData] = useState({ name: '', description: '', icon: 'Info', color: '#3b82f6', route: '' });
  
  const queryClient = useQueryClient();

  const plansQuery = trpc.subscriptionPlans.list.useQuery();
  const durationsQuery = trpc.subscriptionDurations.list.useQuery();
  const modulesQuery = trpc.modules.list.useQuery();

  console.log('📊 [MODULES SCREEN] Queries status:', {
    plans: { loading: plansQuery.isLoading, data: plansQuery.data?.length },
    durations: { loading: durationsQuery.isLoading, data: durationsQuery.data?.length },
    modules: { loading: modulesQuery.isLoading, data: modulesQuery.data?.length, error: modulesQuery.error }
  });

  const plans = plansQuery.data || [];
  const durations = durationsQuery.data || [];
  const modules = modulesQuery.data || [];

  console.log('📋 [MODULES SCREEN] Data:', { plans: plans.length, durations: durations.length, modules: modules.length });

  const createPlanMutation = trpc.subscriptionPlans.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      handleClosePlanModal();
      Alert.alert('Éxito', 'Tarifa creada correctamente');
    },
    onError: (error) => {
      console.error('❌ [CREATE PLAN] Error:', error);
      Alert.alert('Error', error.message);
    },
  });

  const updatePlanMutation = trpc.subscriptionPlans.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      handleClosePlanModal();
      Alert.alert('Éxito', 'Tarifa actualizada correctamente');
    },
    onError: (error) => {
      console.error('❌ [UPDATE PLAN] Error:', error);
      Alert.alert('Error', error.message);
    },
  });

  const deletePlanMutation = trpc.subscriptionPlans.delete.useMutation({
    onSuccess: (data) => {
      console.log('✅ [DELETE PLAN] Plan eliminado exitosamente:', data);
      queryClient.invalidateQueries();
      Alert.alert('Éxito', 'Tarifa eliminada correctamente');
    },
    onError: (error) => {
      console.error('❌ [DELETE PLAN] Error completo:', error);
      Alert.alert('Error', error.message || 'Error al eliminar la tarifa');
    },
  });

  const createDurationMutation = trpc.subscriptionDurations.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      handleCloseDurationModal();
      Alert.alert('Éxito', 'Duración creada correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateDurationMutation = trpc.subscriptionDurations.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      handleCloseDurationModal();
      Alert.alert('Éxito', 'Duración actualizada correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const deleteDurationMutation = trpc.subscriptionDurations.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      Alert.alert('Éxito', 'Duración eliminada correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Error al eliminar la duración');
    },
  });

  const createModuleMutation = trpc.modules.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      handleCloseModuleModal();
      Alert.alert('Éxito', 'Módulo creado correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateModuleMutation = trpc.modules.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      handleCloseModuleModal();
      Alert.alert('Éxito', 'Módulo actualizado correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const deleteModuleMutation = trpc.modules.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      Alert.alert('Éxito', 'Módulo eliminado correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const toggleModule = (planId: string, moduleId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const isEnabled = plan.enabledModules.includes(moduleId);
    const updatedModules = isEnabled
      ? plan.enabledModules.filter((m: string) => m !== moduleId)
      : [...plan.enabledModules, moduleId];

    console.log('🔄 [TOGGLE MODULE] Actualizando plan:', {
      planId,
      moduleId,
      isEnabled,
      updatedModules
    });

    updatePlanMutation.mutate({
      id: planId,
      enabledModules: updatedModules,
    });
  };

  const handleOpenPlanModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanFormData({ name: plan.name, price: plan.price.toString() });
    } else {
      setEditingPlan(null);
      setPlanFormData({ name: '', price: '' });
    }
    setShowPlanModal(true);
  };

  const handleClosePlanModal = () => {
    setShowPlanModal(false);
    setEditingPlan(null);
    setPlanFormData({ name: '', price: '' });
  };

  const handleSavePlan = () => {
    if (!planFormData.name || planFormData.price === '') {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const price = parseFloat(planFormData.price);
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'El precio debe ser un número válido mayor o igual a 0');
      return;
    }

    console.log('💾 [SAVE PLAN] Guardando plan:', { name: planFormData.name, price, isEditing: !!editingPlan });

    if (editingPlan) {
      updatePlanMutation.mutate({
        id: editingPlan.id,
        name: planFormData.name,
        price,
      });
    } else {
      createPlanMutation.mutate({
        name: planFormData.name,
        price,
        enabledModules: [],
      });
    }
  };

  const handleDeletePlan = (planId: string) => {
    console.log('🗑️ [DELETE PLAN] Preparando eliminación:', planId);
    
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('¿Estás seguro de que quieres eliminar esta tarifa? Los restaurantes con este plan perderán la asignación.')) {
        console.log('🔴 [DELETE PLAN] Ejecutando eliminación:', planId);
        deletePlanMutation.mutate({ id: planId });
      }
    } else {
      Alert.alert(
        'Eliminar Tarifa',
        '¿Estás seguro de que quieres eliminar esta tarifa? Los restaurantes con este plan perderán la asignación.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              console.log('🔴 [DELETE PLAN] Ejecutando eliminación:', planId);
              deletePlanMutation.mutate({ id: planId });
            },
          },
        ]
      );
    }
  };

  const handleOpenDurationModal = (duration?: SubscriptionDuration) => {
    if (duration) {
      setEditingDuration(duration);
      setDurationFormData({ 
        name: duration.name, 
        months: duration.months.toString(),
        description: duration.description || ''
      });
    } else {
      setEditingDuration(null);
      setDurationFormData({ name: '', months: '', description: '' });
    }
    setShowDurationModal(true);
  };

  const handleCloseDurationModal = () => {
    setShowDurationModal(false);
    setEditingDuration(null);
    setDurationFormData({ name: '', months: '', description: '' });
  };

  const handleSaveDuration = () => {
    if (!durationFormData.name || !durationFormData.months) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    const months = parseInt(durationFormData.months);
    if (isNaN(months) || months <= 0) {
      Alert.alert('Error', 'Los meses deben ser un número válido mayor a 0');
      return;
    }

    if (editingDuration) {
      updateDurationMutation.mutate({
        id: editingDuration.id,
        name: durationFormData.name,
        months,
        description: durationFormData.description || undefined,
      });
    } else {
      createDurationMutation.mutate({
        name: durationFormData.name,
        months,
        description: durationFormData.description || undefined,
      });
    }
  };

  const handleDeleteDuration = (durationId: string) => {
    console.log('🗑️ [DELETE DURATION] Preparando eliminación:', durationId);
    
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('¿Estás seguro de que quieres eliminar esta duración?')) {
        console.log('🔴 [DELETE DURATION] Ejecutando eliminación:', durationId);
        deleteDurationMutation.mutate({ id: durationId });
      }
    } else {
      Alert.alert(
        'Eliminar Duración',
        '¿Estás seguro de que quieres eliminar esta duración?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              console.log('🔴 [DELETE DURATION] Ejecutando eliminación:', durationId);
              deleteDurationMutation.mutate({ id: durationId });
            },
          },
        ]
      );
    }
  };

  const handleOpenModuleModal = (module?: Module) => {
    if (module) {
      setEditingModule(module);
      setModuleFormData({ 
        name: module.name, 
        description: module.description,
        icon: module.icon,
        color: module.color,
        route: module.route || ''
      });
    } else {
      setEditingModule(null);
      setModuleFormData({ name: '', description: '', icon: 'Info', color: '#3b82f6', route: '' });
    }
    setShowModuleModal(true);
  };

  const handleCloseModuleModal = () => {
    setShowModuleModal(false);
    setEditingModule(null);
    setModuleFormData({ name: '', description: '', icon: 'Info', color: '#3b82f6', route: '' });
  };

  const handleSaveModule = () => {
    if (!moduleFormData.name || !moduleFormData.description || !moduleFormData.icon || !moduleFormData.color) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    if (editingModule) {
      updateModuleMutation.mutate({
        id: editingModule.id,
        name: moduleFormData.name,
        description: moduleFormData.description,
        icon: moduleFormData.icon,
        color: moduleFormData.color,
        route: moduleFormData.route || undefined,
      });
    } else {
      createModuleMutation.mutate({
        name: moduleFormData.name,
        description: moduleFormData.description,
        icon: moduleFormData.icon,
        color: moduleFormData.color,
        route: moduleFormData.route || undefined,
        displayOrder: modules.length,
      });
    }
  };

  const handleDeleteModule = (moduleId: string) => {
    console.log('🗑️ [DELETE MODULE] Preparando eliminación:', moduleId);
    
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('¿Estás seguro de que quieres eliminar este módulo?')) {
        console.log('🔴 [DELETE MODULE] Ejecutando eliminación:', moduleId);
        deleteModuleMutation.mutate({ id: moduleId });
      }
    } else {
      Alert.alert(
        'Eliminar Módulo',
        '¿Estás seguro de que quieres eliminar este módulo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              console.log('🔴 [DELETE MODULE] Ejecutando eliminación:', moduleId);
              deleteModuleMutation.mutate({ id: moduleId });
            },
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Módulos y Tarifas</Text>
        <Text style={styles.headerSubtitle}>Configurar planes y duraciones</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modulesSection}>
          <View style={styles.plansSectionHeader}>
            <Text style={styles.sectionTitle}>Módulos Disponibles</Text>
            <TouchableOpacity 
              style={styles.addPlanButton}
              onPress={() => handleOpenModuleModal()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.addPlanButtonGradient}
              >
                <Plus size={20} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={styles.modulesGrid}>
            {modules.map((module) => (
              <View key={module.id} style={styles.moduleCard}>
                <View style={[styles.moduleIcon, { backgroundColor: module.color }]}>
                  {iconMap[module.icon] || iconMap.Info}
                </View>
                <Text style={styles.moduleName}>{module.name}</Text>
                <Text style={styles.moduleDescription}>{module.description}</Text>
                <View style={styles.moduleActions}>
                  <TouchableOpacity 
                    onPress={() => handleOpenModuleModal(module)}
                    activeOpacity={0.7}
                    style={styles.moduleActionButton}
                  >
                    <Edit2 size={16} color="#3b82f6" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDeleteModule(module.id)}
                    activeOpacity={0.7}
                    style={styles.moduleActionButton}
                  >
                    <Trash2 size={16} color="#ef4444" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.plansSection}>
          <View style={styles.plansSectionHeader}>
            <Text style={styles.sectionTitle}>Tarifas</Text>
            <TouchableOpacity 
              style={styles.addPlanButton}
              onPress={() => handleOpenPlanModal()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.addPlanButtonGradient}
              >
                <Plus size={20} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {plans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.planHeader}
              >
                <View style={styles.planHeaderContent}>
                  <View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.planPrice}>
                      {plan.price === 0 ? (
                        <Text style={styles.planPriceAmount}>¡Gratis!</Text>
                      ) : (
                        <Text style={styles.planPriceAmount}>{plan.price.toFixed(2)}€</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.planHeaderActions}>
                    <TouchableOpacity 
                      style={styles.planHeaderButton}
                      onPress={() => handleOpenPlanModal(plan)}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={18} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.planHeaderButton}
                      onPress={() => handleDeletePlan(plan.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={18} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.planModules}>
                {modulesQuery.isLoading ? (
                  <Text style={styles.emptyText}>Cargando módulos...</Text>
                ) : modules.length === 0 ? (
                  <Text style={styles.emptyText}>No hay módulos disponibles. Crea módulos primero.</Text>
                ) : (
                  modules.map((module) => {
                    const isEnabled = plan.enabledModules.includes(module.id);
                    return (
                    <View key={module.id} style={styles.moduleRow}>
                      <View style={styles.moduleRowInfo}>
                        <View style={[styles.moduleRowIcon, { backgroundColor: module.color + '20' }]}>
                          <View style={{ transform: [{ scale: 0.85 }] }}>
                            {iconMap[module.icon] || iconMap.Info}
                          </View>
                        </View>
                        <Text style={styles.moduleRowName}>{module.name}</Text>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => toggleModule(plan.id, module.id)}
                        trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                        thumbColor="#fff"
                      />
                    </View>
                    );
                  })
                )}
              </View>
            </View>
          ))}

          {plans.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay tarifas creadas</Text>
            </View>
          )}
        </View>

        <View style={styles.durationsSection}>
          <View style={styles.plansSectionHeader}>
            <Text style={styles.sectionTitle}>Duraciones de Suscripción</Text>
            <TouchableOpacity 
              style={styles.addPlanButton}
              onPress={() => handleOpenDurationModal()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.addPlanButtonGradient}
              >
                <Plus size={20} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.durationsGrid}>
            {durations.map((duration) => (
              <View key={duration.id} style={styles.durationCard}>
                <View style={styles.durationContent}>
                  <Text style={styles.durationName}>{duration.name}</Text>
                  <Text style={styles.durationMonths}>{duration.months} meses</Text>
                  {duration.description && (
                    <Text style={styles.durationDescription}>{duration.description}</Text>
                  )}
                </View>
                <View style={styles.durationActions}>
                  <TouchableOpacity 
                    onPress={() => handleOpenDurationModal(duration)}
                    activeOpacity={0.7}
                    style={styles.durationActionButton}
                  >
                    <Edit2 size={16} color="#3b82f6" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDeleteDuration(duration.id)}
                    activeOpacity={0.7}
                    style={styles.durationActionButton}
                  >
                    <Trash2 size={16} color="#ef4444" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {durations.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay duraciones creadas</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showPlanModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClosePlanModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPlan ? 'Editar Tarifa' : 'Nueva Tarifa'}
            </Text>
            <TouchableOpacity onPress={handleClosePlanModal} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre de la Tarifa *</Text>
              <TextInput
                style={styles.input}
                value={planFormData.name}
                onChangeText={(text) => setPlanFormData({ ...planFormData, name: text })}
                placeholder="Ej: Plan Profesional"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Precio (€) *</Text>
              <TextInput
                style={styles.input}
                value={planFormData.price}
                onChangeText={(text) => setPlanFormData({ ...planFormData, price: text })}
                placeholder="39.99"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Módulos Incluidos</Text>
              <Text style={styles.fieldNote}>
                Puedes configurar los módulos después de crear la tarifa
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSavePlan}
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

      <Modal
        visible={showDurationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseDurationModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingDuration ? 'Editar Duración' : 'Nueva Duración'}
            </Text>
            <TouchableOpacity onPress={handleCloseDurationModal} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={durationFormData.name}
                onChangeText={(text) => setDurationFormData({ ...durationFormData, name: text })}
                placeholder="Ej: 1 mes, 3 meses, 1 año"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Duración (meses) *</Text>
              <TextInput
                style={styles.input}
                value={durationFormData.months}
                onChangeText={(text) => setDurationFormData({ ...durationFormData, months: text })}
                placeholder="12"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={durationFormData.description}
                onChangeText={(text) => setDurationFormData({ ...durationFormData, description: text })}
                placeholder="Descripción adicional"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveDuration}
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

      <Modal
        visible={showModuleModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModuleModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingModule ? 'Editar Módulo' : 'Nuevo Módulo'}
            </Text>
            <TouchableOpacity onPress={handleCloseModuleModal} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={moduleFormData.name}
                onChangeText={(text) => setModuleFormData({ ...moduleFormData, name: text })}
                placeholder="Ej: Gestión de Reservas"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={moduleFormData.description}
                onChangeText={(text) => setModuleFormData({ ...moduleFormData, description: text })}
                placeholder="Descripción del módulo"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Icono *</Text>
              <TextInput
                style={styles.input}
                value={moduleFormData.icon}
                onChangeText={(text) => setModuleFormData({ ...moduleFormData, icon: text })}
                placeholder="Info, Calendar, LayoutGrid, Clock, Heart"
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.fieldNote}>
                Opciones: Info, Settings, Calendar, CalendarDays, LayoutGrid, Clock, Heart, ShoppingCart, UserClock, Gamepad2, ClipboardList, QrCode, ChefHat, UtensilsCrossed
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Color (hex) *</Text>
              <TextInput
                style={styles.input}
                value={moduleFormData.color}
                onChangeText={(text) => setModuleFormData({ ...moduleFormData, color: text })}
                placeholder="#3b82f6"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ruta (opcional)</Text>
              <TextInput
                style={styles.input}
                value={moduleFormData.route}
                onChangeText={(text) => setModuleFormData({ ...moduleFormData, route: text })}
                placeholder="/restaurant/reservations"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveModule}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  modulesSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  modulesGrid: {
    gap: 12,
  },
  moduleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  moduleActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  moduleActionButton: {
    width: 32,
    height: 32,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plansSection: {
    gap: 16,
  },
  plansSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addPlanButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  addPlanButtonGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planHeader: {
    padding: 20,
  },
  planHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  planHeaderButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  planPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  planPriceAmount: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#fff',
  },
  planModules: {
    padding: 16,
    gap: 12,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  moduleRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  moduleRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleRowName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#0f172a',
    flex: 1,
  },
  durationsSection: {
    gap: 16,
  },
  durationsGrid: {
    gap: 12,
  },
  durationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  durationContent: {
    flex: 1,
  },
  durationName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  durationMonths: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500' as const,
  },
  durationDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  durationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  durationActionButton: {
    width: 32,
    height: 32,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldNote: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic' as const,
    marginTop: 4,
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
});
