import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Plus, Search, Edit2, Trash2, X, AlertTriangle, List } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';

interface CriteriaFormData {
  name: string;
  description: string;
  defaultValue: number;
}

interface NoShowRuleFormData {
  noShowCount: string;
  blockDays: string;
  message: string;
}



export default function AdminRatingCriteriaScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showRuleFormModal, setShowRuleFormModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleFormData, setRuleFormData] = useState<NoShowRuleFormData>({
    noShowCount: '',
    blockDays: '',
    message: '',
  });

  const [editingCriteria, setEditingCriteria] = useState<any>(null);
  const [formData, setFormData] = useState<CriteriaFormData>({
    name: '',
    description: '',
    defaultValue: 4,
  });


  const criteriaQuery = trpc.ratingCriteria.list.useQuery(undefined, {
    refetchOnMount: true,
  });

  const noShowRulesQuery = trpc.noShowRules.list.useQuery(undefined, {
    refetchOnMount: true,
  });


  const createMutation = trpc.ratingCriteria.create.useMutation({
    onSuccess: () => {
      criteriaQuery.refetch();
      handleCloseModal();
      Alert.alert('Éxito', 'Criterio creado correctamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'No se pudo crear el criterio');
    },
  });

  const updateMutation = trpc.ratingCriteria.update.useMutation({
    onSuccess: () => {
      criteriaQuery.refetch();
      handleCloseModal();
      Alert.alert('Éxito', 'Criterio actualizado correctamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'No se pudo actualizar el criterio');
    },
  });

  const deleteMutation = trpc.ratingCriteria.delete.useMutation({
    onSuccess: () => {
      criteriaQuery.refetch();
      Alert.alert('Éxito', 'Criterio eliminado correctamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'No se pudo eliminar el criterio');
    },
  });

  const createRuleMutation = trpc.noShowRules.create.useMutation({
    onSuccess: () => {
      noShowRulesQuery.refetch();
      handleCloseRuleForm();
      Alert.alert('Éxito', 'Regla creada correctamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'No se pudo crear la regla');
    },
  });

  const updateRuleMutation = trpc.noShowRules.update.useMutation({
    onSuccess: () => {
      noShowRulesQuery.refetch();
      handleCloseRuleForm();
      Alert.alert('Éxito', 'Regla actualizada correctamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'No se pudo actualizar la regla');
    },
  });

  const deleteRuleMutation = trpc.noShowRules.delete.useMutation({
    onSuccess: () => {
      noShowRulesQuery.refetch();
      Alert.alert('Éxito', 'Regla eliminada correctamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'No se pudo eliminar la regla');
    },
  });



  const criteria = criteriaQuery.data || [];
  const filteredCriteria = criteria.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (criteriaItem?: any) => {
    if (criteriaItem) {
      setEditingCriteria(criteriaItem);
      setFormData({
        name: criteriaItem.name,
        description: criteriaItem.description,
        defaultValue: criteriaItem.defaultValue,
      });
    } else {
      setEditingCriteria(null);
      setFormData({
        name: '',
        description: '',
        defaultValue: 4,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCriteria(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.description) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    if (formData.defaultValue < 1 || formData.defaultValue > 5) {
      Alert.alert('Error', 'La valoración predeterminada debe estar entre 1 y 5');
      return;
    }

    if (editingCriteria) {
      updateMutation.mutate({
        id: editingCriteria.id,
        name: formData.name,
        description: formData.description,
        defaultValue: formData.defaultValue,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        description: formData.description,
        defaultValue: formData.defaultValue,
      });
    }
  };

  const handleOpenNoShowConfig = () => {
    setShowRulesModal(true);
  };

  const handleOpenRuleForm = (rule?: any) => {
    if (rule) {
      setEditingRule(rule);
      setRuleFormData({
        noShowCount: String(rule.noShowCount),
        blockDays: String(rule.blockDays),
        message: rule.message,
      });
    } else {
      setEditingRule(null);
      setRuleFormData({
        noShowCount: '',
        blockDays: '',
        message: '',
      });
    }
    setShowRuleFormModal(true);
  };

  const handleCloseRuleForm = () => {
    setShowRuleFormModal(false);
    setEditingRule(null);
  };

  const handleSaveRule = () => {
    const noShowCount = parseInt(ruleFormData.noShowCount);
    const blockDays = parseInt(ruleFormData.blockDays);

    if (isNaN(noShowCount) || noShowCount < 1) {
      Alert.alert('Error', 'La cantidad de no shows debe ser al menos 1');
      return;
    }

    if (isNaN(blockDays) || blockDays < 1) {
      Alert.alert('Error', 'Los días de bloqueo deben ser al menos 1');
      return;
    }

    if (!ruleFormData.message || ruleFormData.message.length < 10) {
      Alert.alert('Error', 'El mensaje debe tener al menos 10 caracteres');
      return;
    }

    if (editingRule) {
      updateRuleMutation.mutate({
        id: editingRule.id,
        noShowCount,
        blockDays,
        message: ruleFormData.message,
      });
    } else {
      createRuleMutation.mutate({
        noShowCount,
        blockDays,
        message: ruleFormData.message,
      });
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro de que quieres eliminar esta regla?');
      if (confirmed) {
        deleteRuleMutation.mutate({ id: ruleId });
      }
    } else {
      Alert.alert(
        'Eliminar Regla',
        '¿Estás seguro de que quieres eliminar esta regla?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => deleteRuleMutation.mutate({ id: ruleId }),
          },
        ]
      );
    }
  };

  const handleDelete = (id: string, isSpecial: boolean) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este criterio?');
      if (confirmed) {
        deleteMutation.mutate({ id });
      }
    } else {
      Alert.alert(
        'Eliminar Criterio',
        '¿Estás seguro de que quieres eliminar este criterio?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Eliminar', 
            style: 'destructive', 
            onPress: () => deleteMutation.mutate({ id }),
          },
        ]
      );
    }
  };



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Criterios de Valoración</Text>
        <Text style={styles.headerSubtitle}>{criteria.length} criterios configurados</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#64748b" strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar criterios..."
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
          <LinearGradient
            colors={['#ec4899', '#d946a6']}
            style={styles.addButtonGradient}
          >
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.noShowButtonContainer}>
        <TouchableOpacity 
          style={styles.noShowButton}
          onPress={handleOpenNoShowConfig}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ef4444', '#dc2626']}
            style={styles.noShowButtonGradient}
          >
            <AlertTriangle size={20} color="#fff" strokeWidth={2.5} />
            <Text style={styles.noShowButtonText}>Configurar No Shows</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredCriteria.map((criteriaItem) => (
          <View key={criteriaItem.id} style={styles.criteriaCard}>
            <View style={styles.criteriaInfo}>
              <View style={styles.criteriaHeader}>
                <View style={styles.criteriaIconContainer}>
                  <Heart size={24} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
                </View>
                <View style={styles.criteriaTitleContainer}>
                  <Text style={styles.criteriaName}>{criteriaItem.name}</Text>
                  <Text style={styles.criteriaDescription}>{criteriaItem.description}</Text>
                </View>
              </View>
              
              <View style={styles.criteriaDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Valoración predeterminada:</Text>
                  <View style={styles.heartsContainer}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Heart 
                        key={index}
                        size={16} 
                        color="#ec4899" 
                        strokeWidth={2.5}
                        fill={index < criteriaItem.defaultValue ? '#ec4899' : 'transparent'}
                      />
                    ))}
                  </View>
                </View>
                
                {criteriaItem.isSpecialCriteria && (
                  <View style={styles.specialBadge}>
                    <Text style={styles.specialBadgeText}>
                      Criterio especial: No Shows
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.criteriaActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleOpenModal(criteriaItem)}
                activeOpacity={0.7}
              >
                <Edit2 size={20} color="#3b82f6" strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(criteriaItem.id, criteriaItem.isSpecialCriteria)}
                activeOpacity={0.7}
              >
                <Trash2 size={20} color="#ef4444" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredCriteria.length === 0 && (
          <View style={styles.emptyState}>
            <Heart size={64} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No hay criterios</Text>
            <Text style={styles.emptyText}>Comienza agregando tu primer criterio</Text>
          </View>
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
              {editingCriteria ? 'Editar Criterio' : 'Nuevo Criterio'}
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
                placeholder="Ej: Puntualidad"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descripción del criterio"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Valoración Predeterminada (1-5)</Text>
              <View style={styles.ratingSelector}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.ratingButton,
                      formData.defaultValue === value && styles.ratingButtonSelected
                    ]}
                    onPress={() => setFormData({ ...formData, defaultValue: value })}
                    activeOpacity={0.7}
                  >
                    <Heart 
                      size={24} 
                      color={formData.defaultValue >= value ? '#ec4899' : '#cbd5e1'} 
                      strokeWidth={2.5}
                      fill={formData.defaultValue >= value ? '#ec4899' : 'transparent'}
                    />
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
                colors={['#ec4899', '#d946a6']}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showRulesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRulesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reglas de No Shows</Text>
            <TouchableOpacity onPress={() => setShowRulesModal(false)} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.noShowInfoCard}>
              <AlertTriangle size={24} color="#ef4444" strokeWidth={2.5} />
              <Text style={styles.noShowInfoText}>
                Configura las reglas de bloqueo según la cantidad de no shows del cliente
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addRuleButton}
              onPress={() => handleOpenRuleForm()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ec4899', '#d946a6']}
                style={styles.addRuleButtonGradient}
              >
                <Plus size={20} color="#fff" strokeWidth={2.5} />
                <Text style={styles.addRuleButtonText}>Añadir Nueva Regla</Text>
              </LinearGradient>
            </TouchableOpacity>

            {noShowRulesQuery.data?.map((rule) => (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                  <View style={styles.ruleIconContainer}>
                    <List size={20} color="#ef4444" strokeWidth={2.5} />
                  </View>
                  <View style={styles.ruleInfo}>
                    <Text style={styles.ruleTitle}>
                      {rule.noShowCount} {rule.noShowCount === 1 ? 'No Show' : 'No Shows'}
                    </Text>
                    <Text style={styles.ruleSubtitle}>
                      Bloqueo: {rule.blockDays} {rule.blockDays === 1 ? 'día' : 'días'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ruleMessage}>{rule.message}</Text>
                <View style={styles.ruleActions}>
                  <TouchableOpacity
                    style={styles.ruleActionButton}
                    onPress={() => handleOpenRuleForm(rule)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={18} color="#3b82f6" strokeWidth={2.5} />
                    <Text style={styles.ruleActionText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ruleActionButton, styles.ruleDeleteButton]}
                    onPress={() => handleDeleteRule(rule.id)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={18} color="#ef4444" strokeWidth={2.5} />
                    <Text style={[styles.ruleActionText, styles.ruleDeleteText]}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {(!noShowRulesQuery.data || noShowRulesQuery.data.length === 0) && (
              <View style={styles.emptyRulesState}>
                <List size={48} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={styles.emptyRulesText}>No hay reglas configuradas</Text>
                <Text style={styles.emptyRulesSubtext}>Añade tu primera regla</Text>
              </View>
            )}

            <View style={styles.noShowWarningCard}>
              <Text style={styles.noShowWarningTitle}>⚠️ Importante</Text>
              <Text style={styles.noShowWarningText}>
                • El restaurante notificará el no show al valorar la reserva{"\n"}
                • Se aplicará automáticamente la regla correspondiente{"\n"}
                • Los bloqueos afectan a toda la plataforma
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={() => setShowRulesModal(false)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ec4899', '#d946a6']}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>Cerrar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={showRuleFormModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseRuleForm}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingRule ? 'Editar Regla' : 'Nueva Regla'}
            </Text>
            <TouchableOpacity onPress={handleCloseRuleForm} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Cantidad de No Shows *</Text>
              <TextInput
                style={styles.input}
                value={ruleFormData.noShowCount}
                onChangeText={(text) => setRuleFormData({ ...ruleFormData, noShowCount: text })}
                placeholder="Ej: 1"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Días de Bloqueo *</Text>
              <TextInput
                style={styles.input}
                value={ruleFormData.blockDays}
                onChangeText={(text) => setRuleFormData({ ...ruleFormData, blockDays: text })}
                placeholder="Ej: 7"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mensaje al Cliente *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={ruleFormData.message}
                onChangeText={(text) => setRuleFormData({ ...ruleFormData, message: text })}
                placeholder="Mensaje que verá el cliente bloqueado"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
              />
              <Text style={styles.fieldNote}>
                Ejemplo: Ha sido bloqueado durante 7 días en esta plataforma por no presentarse a su reserva.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveRule}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ec4899', '#d946a6']}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>Guardar Regla</Text>
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
  criteriaCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  criteriaInfo: {
    flex: 1,
  },
  criteriaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  criteriaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  criteriaTitleContainer: {
    flex: 1,
  },
  criteriaName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  criteriaDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  criteriaDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  heartsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  specialBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  specialBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#92400e',
  },
  criteriaActions: {
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  ratingButton: {
    padding: 8,
  },
  ratingButtonSelected: {
    transform: [{ scale: 1.1 }],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  switchDescription: {
    fontSize: 12,
    color: '#64748b',
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
  noShowButtonContainer: {
    padding: 16,
    paddingTop: 0,
  },
  noShowButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  noShowButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  noShowButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  noShowInfoCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  noShowInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
  noShowConfigCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noShowConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  noShowConfigTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  noShowBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  noShowBadgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#92400e',
  },
  noShowWarningCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginTop: 0,
  },
  noShowWarningTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#92400e',
    marginBottom: 8,
  },
  noShowWarningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 22,
  },
  addRuleButton: {
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addRuleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addRuleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  ruleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  ruleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 2,
  },
  ruleSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  ruleMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  ruleActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  ruleActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  ruleDeleteButton: {
    backgroundColor: '#fef2f2',
  },
  ruleActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3b82f6',
  },
  ruleDeleteText: {
    color: '#ef4444',
  },
  emptyRulesState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyRulesText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748b',
    marginTop: 12,
  },
  emptyRulesSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  fieldNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
});
