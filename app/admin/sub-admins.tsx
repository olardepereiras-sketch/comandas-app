import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, Switch
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserCog, Plus, Edit2, Trash2, X, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALL_PERMISSIONS = [
  { key: 'restaurants', label: 'Gestión de Restaurantes', color: '#3b82f6' },
  { key: 'locations', label: 'Ubicaciones', color: '#10b981' },
  { key: 'users', label: 'Gestión de Usuarios', color: '#f59e0b' },
  { key: 'whatsapp', label: 'WhatsApp Web', color: '#25D366' },
  { key: 'modules', label: 'Módulos y Tarifas', color: '#8b5cf6' },
  { key: 'rating-criteria', label: 'Criterios de Valoración', color: '#ec4899' },
  { key: 'cuisine-types', label: 'Tipos de Cocina', color: '#f97316' },
  { key: 'statistics', label: 'Estadísticas', color: '#06b6d4' },
  { key: 'settings', label: 'Configuración del Sistema', color: '#64748b' },
  { key: 'commissions', label: 'Comisiones', color: '#84cc16' },
];

interface SubAdminFormData {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  permissions: string[];
}

export default function SubAdminsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [formData, setFormData] = useState<SubAdminFormData>({
    username: '', password: '', email: '', firstName: '', lastName: '', permissions: [],
  });

  useEffect(() => {
    AsyncStorage.getItem('adminSession').then(s => { if (s) setSessionId(s); });
  }, []);

  const subAdminsQuery = trpc.subAdmins.list.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );

  const createMutation = trpc.subAdmins.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['subAdmins', 'list']] });
      setShowModal(false);
      resetForm();
      Alert.alert('✓ Éxito', 'Sub-administrador creado correctamente');
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const updateMutation = trpc.subAdmins.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['subAdmins', 'list']] });
      setShowModal(false);
      resetForm();
      Alert.alert('✓ Éxito', 'Sub-administrador actualizado');
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const deleteMutation = trpc.subAdmins.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['subAdmins', 'list']] });
      Alert.alert('✓ Éxito', 'Sub-administrador eliminado');
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const resetForm = () => {
    setFormData({ username: '', password: '', email: '', firstName: '', lastName: '', permissions: [] });
    setEditingId(null);
    setShowPermissions(false);
  };

  const handleOpenModal = (subAdmin?: any) => {
    if (subAdmin) {
      setEditingId(subAdmin.id);
      setFormData({
        username: subAdmin.username,
        password: '',
        email: subAdmin.email,
        firstName: subAdmin.first_name,
        lastName: subAdmin.last_name || '',
        permissions: Array.isArray(subAdmin.permissions) ? subAdmin.permissions : [],
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.firstName || !formData.email) {
      Alert.alert('Error', 'Nombre y email son obligatorios');
      return;
    }
    if (!editingId && (!formData.username || !formData.password)) {
      Alert.alert('Error', 'Usuario y contraseña son obligatorios');
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        sessionId,
        id: editingId,
        ...(formData.password ? { password: formData.password } : {}),
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        permissions: formData.permissions,
      });
    } else {
      createMutation.mutate({
        sessionId,
        username: formData.username,
        password: formData.password,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        permissions: formData.permissions,
      });
    }
  };

  const handleToggleActive = (subAdmin: any) => {
    updateMutation.mutate({
      sessionId,
      id: subAdmin.id,
      isActive: !subAdmin.is_active,
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`¿Eliminar a ${name}?`)) deleteMutation.mutate({ sessionId, id });
    } else {
      Alert.alert('Eliminar', `¿Eliminar a ${name}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate({ sessionId, id }) },
      ]);
    }
  };

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const subAdmins = subAdminsQuery.data || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sub-administradores</Text>
        <Text style={styles.headerSubtitle}>{subAdmins.length} cuentas configuradas</Text>
      </View>

      <View style={styles.addContainer}>
        <TouchableOpacity style={styles.addButton} onPress={() => handleOpenModal()} activeOpacity={0.85}>
          <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.addButtonGradient}>
            <Plus size={20} color="#fff" strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Nuevo Sub-admin</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {subAdminsQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        ) : subAdmins.length === 0 ? (
          <View style={styles.emptyState}>
            <UserCog size={64} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No hay sub-administradores</Text>
            <Text style={styles.emptyText}>Crea el primero para delegar acceso</Text>
          </View>
        ) : (
          subAdmins.map((sa: any) => (
            <View key={sa.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatarCircle, { backgroundColor: sa.is_active ? '#dbeafe' : '#f1f5f9' }]}>
                  <UserCog size={24} color={sa.is_active ? '#3b82f6' : '#94a3b8'} strokeWidth={2} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{sa.first_name} {sa.last_name || ''}</Text>
                  <Text style={styles.cardUsername}>@{sa.username}</Text>
                  <Text style={styles.cardEmail}>{sa.email}</Text>
                </View>
                <Switch
                  value={sa.is_active}
                  onValueChange={() => handleToggleActive(sa)}
                  trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }}
                  thumbColor={sa.is_active ? '#3b82f6' : '#94a3b8'}
                />
              </View>

              <View style={styles.permissionsRow}>
                <Shield size={14} color="#64748b" strokeWidth={2} />
                <Text style={styles.permissionsLabel}>Acceso a: </Text>
                <Text style={styles.permissionsValue} numberOfLines={1}>
                  {Array.isArray(sa.permissions) && sa.permissions.length > 0
                    ? sa.permissions.map((p: string) => ALL_PERMISSIONS.find(a => a.key === p)?.label || p).join(', ')
                    : 'Sin módulos asignados'}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleOpenModal(sa)}
                  activeOpacity={0.7}
                >
                  <Edit2 size={18} color="#3b82f6" strokeWidth={2} />
                  <Text style={styles.actionBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(sa.id, sa.first_name)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color="#ef4444" strokeWidth={2} />
                  <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowModal(false); resetForm(); }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Editar Sub-admin' : 'Nuevo Sub-admin'}</Text>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>DATOS PERSONALES</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={t => setFormData(p => ({ ...p, firstName: t }))}
                  placeholder="Nombre"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Apellido</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={t => setFormData(p => ({ ...p, lastName: t }))}
                  placeholder="Apellido"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={t => setFormData(p => ({ ...p, email: t }))}
                  placeholder="email@empresa.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>ACCESO</Text>

              {!editingId && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Usuario *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.username}
                    onChangeText={t => setFormData(p => ({ ...p, username: t }))}
                    placeholder="nombre.usuario"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>{editingId ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={t => setFormData(p => ({ ...p, password: t }))}
                  placeholder={editingId ? '••••••••' : 'Mínimo 6 caracteres'}
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <TouchableOpacity
                style={styles.permissionsToggle}
                onPress={() => setShowPermissions(!showPermissions)}
                activeOpacity={0.7}
              >
                <View style={styles.permissionsToggleLeft}>
                  <Shield size={18} color="#3b82f6" strokeWidth={2.5} />
                  <Text style={styles.permissionsToggleText}>
                    Permisos de acceso ({formData.permissions.length} módulos)
                  </Text>
                </View>
                {showPermissions ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
              </TouchableOpacity>

              {showPermissions && (
                <View style={styles.permissionsGrid}>
                  <TouchableOpacity
                    style={styles.selectAllBtn}
                    onPress={() => {
                      if (formData.permissions.length === ALL_PERMISSIONS.length) {
                        setFormData(p => ({ ...p, permissions: [] }));
                      } else {
                        setFormData(p => ({ ...p, permissions: ALL_PERMISSIONS.map(a => a.key) }));
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.selectAllText}>
                      {formData.permissions.length === ALL_PERMISSIONS.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </Text>
                  </TouchableOpacity>

                  {ALL_PERMISSIONS.map(perm => {
                    const isSelected = formData.permissions.includes(perm.key);
                    return (
                      <TouchableOpacity
                        key={perm.key}
                        style={[styles.permissionItem, isSelected && styles.permissionItemSelected]}
                        onPress={() => togglePermission(perm.key)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.permCheckbox, isSelected && { backgroundColor: perm.color, borderColor: perm.color }]}>
                          {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                        </View>
                        <Text style={[styles.permissionLabel, isSelected && { color: '#0f172a', fontWeight: '600' as const }]}>
                          {perm.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.saveButtonGradient}>
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{editingId ? 'Guardar cambios' : 'Crear sub-admin'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    padding: 20, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 24, fontWeight: '700' as const, color: '#0f172a', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#64748b' },
  addContainer: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  addButton: { borderRadius: 12, overflow: 'hidden' },
  addButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  loadingContainer: { alignItems: 'center', paddingVertical: 64 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, color: '#0f172a', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700' as const, color: '#0f172a' },
  cardUsername: { fontSize: 13, color: '#3b82f6', fontWeight: '500' as const, marginTop: 1 },
  cardEmail: { fontSize: 13, color: '#64748b', marginTop: 1 },
  permissionsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f8fafc', borderRadius: 8, padding: 10,
    marginBottom: 12,
  },
  permissionsLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' as const },
  permissionsValue: { flex: 1, fontSize: 12, color: '#0f172a' },
  cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#f1f5f9', padding: 10, borderRadius: 10,
  },
  deleteBtn: { backgroundColor: '#fef2f2' },
  actionBtnText: { fontSize: 14, fontWeight: '600' as const, color: '#3b82f6' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 20, fontWeight: '700' as const, color: '#0f172a' },
  modalScroll: { flex: 1 },
  formSection: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700' as const, color: '#94a3b8', letterSpacing: 1, marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600' as const, color: '#0f172a', marginBottom: 8 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, padding: 14, fontSize: 16, color: '#0f172a',
  },
  permissionsToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  permissionsToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permissionsToggleText: { fontSize: 15, fontWeight: '600' as const, color: '#0f172a' },
  permissionsGrid: { marginTop: 12, gap: 8 },
  selectAllBtn: {
    backgroundColor: '#dbeafe', borderRadius: 8, padding: 10, alignItems: 'center',
    marginBottom: 4,
  },
  selectAllText: { fontSize: 13, fontWeight: '600' as const, color: '#1d4ed8' },
  permissionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  permissionItemSelected: { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' },
  permCheckbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center',
  },
  permissionLabel: { fontSize: 14, color: '#64748b', flex: 1 },
  saveButton: { margin: 20, borderRadius: 14, overflow: 'hidden' },
  saveButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },
});
