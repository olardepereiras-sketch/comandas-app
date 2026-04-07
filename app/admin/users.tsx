import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Search, Heart, Calendar, X, AlertTriangle, RotateCcw, Star, Edit2, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import type { Client } from '@/types';

interface UserFormData {
  name: string;
  email: string;
  phone: string;
}

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [showEditRatingModal, setShowEditRatingModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedNoShow, setSelectedNoShow] = useState<any>(null);
  const [selectedRating, setSelectedRating] = useState<any>(null);
  const [editRatingValues, setEditRatingValues] = useState<Record<string, number>>({});
  const [editRatingNoShow, setEditRatingNoShow] = useState<boolean>(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    phone: '',
  });

  const clientsQuery = trpc.clients.list.useQuery(
    { searchQuery },
    { refetchInterval: 5000 }
  );

  const deleteClientMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      console.log('✅ [FRONTEND] Cliente eliminado exitosamente');
      clientsQuery.refetch();
      handleCloseModal();
      Alert.alert('Éxito', 'Cliente eliminado correctamente');
    },
    onError: (error: any) => {
      console.error('❌ [FRONTEND] Error eliminando cliente:', error);
      Alert.alert('Error', error?.message || 'No se pudo eliminar el cliente');
    },
  });

  const noShowsQuery = trpc.clients.getNoShows.useQuery(
    { clientId: selectedClient?.id || '' },
    { enabled: !!selectedClient?.id }
  );

  const ratingsQuery = trpc.clients.listRatings.useQuery(
    { clientId: selectedClient?.id || '' },
    { enabled: !!selectedClient?.id && showRatingsModal }
  );

  const ratingCriteriaQuery = trpc.ratingCriteria.list.useQuery();

  const toggleNoShowMutation = trpc.clients.toggleNoShow.useMutation({
    onSuccess: () => {
      noShowsQuery.refetch();
      clientsQuery.refetch();
      setShowNoShowModal(false);
      setSelectedNoShow(null);
      Alert.alert('Éxito', 'No show actualizado correctamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'No se pudo actualizar el no show');
    },
  });

  const updateRatingMutation = trpc.clients.updateRatingDetail.useMutation({
    onSuccess: () => {
      console.log('✅ [FRONTEND] Valoración actualizada exitosamente');
      ratingsQuery.refetch();
      clientsQuery.refetch();
      setShowEditRatingModal(false);
      setSelectedRating(null);
      setEditRatingValues({});
      if (Platform.OS === 'web') {
        alert('✅ Valoración actualizada correctamente');
      } else {
        Alert.alert('Éxito', 'Valoración actualizada correctamente');
      }
    },
    onError: (error: any) => {
      console.error('❌ [FRONTEND] Error actualizando valoración:', error);
      if (Platform.OS === 'web') {
        alert(`❌ Error: ${error?.message || 'No se pudo actualizar la valoración'}`);
      } else {
        Alert.alert('Error', error?.message || 'No se pudo actualizar la valoración');
      }
    },
  });

  const deleteRatingMutation = trpc.clients.deleteRating.useMutation({
    onSuccess: () => {
      ratingsQuery.refetch();
      clientsQuery.refetch();
      Alert.alert('Éxito', 'Valoración eliminada correctamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'No se pudo eliminar la valoración');
    },
  });

  const clients = clientsQuery.data || [];
  console.log('🔍 [ADMIN USERS] Clientes recibidos:', clients.length);
  console.log('🔍 [ADMIN USERS] Primer cliente:', clients[0]);
  
  const filteredClients: Client[] = clients.filter((c) => {
    const isValid = !!c.id && !!c.phone;
    if (!isValid) {
      console.log('⚠️ [ADMIN USERS] Cliente filtrado:', { id: c.id, name: c.name, phone: c.phone });
    }
    return isValid;
  }) as Client[];
  
  console.log('✅ [ADMIN USERS] Clientes filtrados:', filteredClients.length);

  const handleOpenModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClient(null);
  };

  const handleSave = () => {
    Alert.alert('Info', 'La edición de usuarios estará disponible próximamente');
  };

  const handleOpenNoShowModal = (noShow: any) => {
    setSelectedNoShow(noShow);
    setShowNoShowModal(true);
  };

  const handleToggleNoShow = (isActive: boolean) => {
    if (!selectedNoShow) return;

    const action = isActive ? 'reactivar' : 'desactivar';
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `¿${action.charAt(0).toUpperCase() + action.slice(1)} No Show?\n\n¿Estás seguro de que deseas ${action} este no show?`
      );
      if (confirmed) {
        toggleNoShowMutation.mutate({
          noShowId: selectedNoShow.id,
          isActive,
        });
      }
    } else {
      Alert.alert(
        `¿${action.charAt(0).toUpperCase() + action.slice(1)} No Show?`,
        `¿Estás seguro de que deseas ${action} este no show?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: action.charAt(0).toUpperCase() + action.slice(1),
            onPress: () => {
              toggleNoShowMutation.mutate({
                noShowId: selectedNoShow.id,
                isActive,
              });
            },
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
        <Text style={styles.headerSubtitle}>
          {clientsQuery.isLoading ? 'Cargando...' : clients.length === 0 ? 'No hay clientes registrados' : `${clients.length} ${searchQuery ? 'resultado(s) encontrado(s)' : 'clientes registrados'}`}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#64748b" strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por teléfono, nombre o email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {clientsQuery.isLoading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : filteredClients.map((client) => (
          <TouchableOpacity 
            key={client.id || ''} 
            style={styles.clientCard}
            onPress={() => handleOpenModal(client)}
            activeOpacity={0.7}
          >
            <View style={styles.clientHeader}>
              <View style={styles.clientAvatar}>
                <Users size={24} color="#3b82f6" strokeWidth={2.5} />
              </View>
              <View style={styles.clientInfo}>
                <View style={styles.clientNameRow}>
                  <Text style={styles.clientName}>{client.name}</Text>
                  {client.totalRatings > 0 && (
                    <View style={styles.ratingBadgeInline}>
                      <Heart size={12} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
                      <Text style={styles.ratingTextInline}>{client.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.clientEmail}>{client.email}</Text>
                <Text style={styles.clientPhone}>{client.phone}</Text>
              </View>
            </View>

            <View style={styles.clientStats}>
              <View style={styles.statItem}>
                <Heart size={16} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
                <Text style={styles.statValue}>{client.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>valoración</Text>
              </View>
              <View style={styles.statItem}>
                <Calendar size={16} color="#3b82f6" strokeWidth={2.5} />
                <Text style={styles.statValue}>{client.totalRatings}</Text>
                <Text style={styles.statLabel}>valoraciones</Text>
              </View>
              {client.noShowCount ? (
                <View style={styles.statItem}>
                  <Text style={styles.noShowBadge}>⚠️ {client.noShowCount} no show</Text>
                </View>
              ) : null}
            </View>

            {client.isBlocked && client.blockedUntil && (
              <View style={styles.blockedBadge}>
                <Text style={styles.blockedText}>
                  Bloqueado hasta {new Date(client.blockedUntil).toLocaleDateString()}
                </Text>
              </View>
            )}

            <View style={styles.clientFooter}>
              <Text style={styles.clientDate}>
                Registrado: {new Date(client.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {!clientsQuery.isLoading && filteredClients.length === 0 && (
          <View style={styles.emptyState}>
            <Users size={64} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No hay usuarios</Text>
            <Text style={styles.emptyText}>No se encontraron usuarios con ese criterio</Text>
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
            <Text style={styles.modalTitle}>Editar Usuario</Text>
            <TouchableOpacity onPress={handleCloseModal} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {selectedClient && (
              <>
                {selectedClient.noShowCount && selectedClient.noShowCount > 0 && (
                  <View style={styles.noShowSection}>
                    <Text style={styles.sectionTitle}>No Shows ({noShowsQuery.data?.length || 0})</Text>
                    {noShowsQuery.isLoading ? (
                      <ActivityIndicator size="small" color="#ef4444" style={{ marginTop: 12 }} />
                    ) : (
                      <View style={styles.noShowList}>
                        {noShowsQuery.data?.map((noShow) => (
                          <TouchableOpacity
                            key={noShow.id}
                            style={[
                              styles.noShowCard,
                              !noShow.isActive && styles.noShowCardInactive,
                            ]}
                            onPress={() => handleOpenNoShowModal(noShow)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.noShowHeader}>
                              <AlertTriangle
                                size={18}
                                color={noShow.isActive ? '#ef4444' : '#94a3b8'}
                                strokeWidth={2.5}
                              />
                              <Text
                                style={[
                                  styles.noShowTitle,
                                  !noShow.isActive && styles.noShowTitleInactive,
                                ]}
                              >
                                {noShow.restaurantName}
                              </Text>
                              {!noShow.isActive && (
                                <View style={styles.inactiveBadge}>
                                  <Text style={styles.inactiveBadgeText}>Cancelado</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.noShowDetail}>
                              Reserva: {noShow.reservationToken}
                            </Text>
                            <Text style={styles.noShowDetail}>
                              Fecha: {noShow.reservationDate} a las {noShow.reservationTime}
                            </Text>
                            <Text style={styles.noShowDetail}>
                              Comensales: {noShow.guestCount}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.ratingSection}>
                  <Text style={styles.sectionTitle}>Valoraciones</Text>
                  <View style={styles.ratingGrid}>
                    <View style={styles.ratingItem}>
                      <Text style={styles.ratingLabel}>Puntualidad</Text>
                      <View style={styles.ratingValue}>
                        <Heart size={16} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
                        <Text style={styles.ratingText}>{selectedClient.ratingDetails.punctuality.toFixed(1)}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingItem}>
                      <Text style={styles.ratingLabel}>Conducta</Text>
                      <View style={styles.ratingValue}>
                        <Heart size={16} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
                        <Text style={styles.ratingText}>{selectedClient.ratingDetails.behavior.toFixed(1)}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingItem}>
                      <Text style={styles.ratingLabel}>Amabilidad</Text>
                      <View style={styles.ratingValue}>
                        <Heart size={16} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
                        <Text style={styles.ratingText}>{selectedClient.ratingDetails.kindness.toFixed(1)}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingItem}>
                      <Text style={styles.ratingLabel}>Educación</Text>
                      <View style={styles.ratingValue}>
                        <Heart size={16} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
                        <Text style={styles.ratingText}>{selectedClient.ratingDetails.education.toFixed(1)}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingItem}>
                      <Text style={styles.ratingLabel}>Propina</Text>
                      <View style={styles.ratingValue}>
                        <Heart size={16} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
                        <Text style={styles.ratingText}>{selectedClient.ratingDetails.tip.toFixed(1)}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingItem}>
                      <Text style={styles.ratingLabel}>No Shows</Text>
                      <Text style={styles.noShowText}>{selectedClient.noShowCount || 0}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.ratingsButton}
                  onPress={() => setShowRatingsModal(true)}
                  activeOpacity={0.7}
                >
                  <Star size={20} color="#f59e0b" strokeWidth={2.5} fill="#f59e0b" />
                  <Text style={styles.ratingsButtonText}>
                    Ver Historial de Valoraciones ({selectedClient.totalRatings})
                  </Text>
                </TouchableOpacity>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nombre *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Nombre del cliente"
                    placeholderTextColor="#94a3b8"
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
                  <Text style={styles.label}>Teléfono *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    placeholder="+34 600 000 000"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                  />
                  <Text style={styles.fieldNote}>
                    El teléfono es el identificador único del cliente
                  </Text>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => {
                      console.log('🔴 [DEBUG] Click en botón eliminar - Cliente:', selectedClient?.id);
                      if (!selectedClient?.id) {
                        console.error('❌ [ERROR] No hay cliente seleccionado');
                        Alert.alert('Error', 'No se puede eliminar: cliente no válido');
                        return;
                      }
                      
                      if (Platform.OS === 'web') {
                        const confirmed = window.confirm(
                          `⚠️ ELIMINAR USUARIO\n\n¿Estás seguro de que deseas eliminar a "${selectedClient.name}"?\n\nEsta acción eliminará:\n• Todos sus datos personales\n• Historial de valoraciones\n• No se podrá deshacer`
                        );
                        console.log('🔴 [DEBUG] Confirmación web:', confirmed);
                        if (confirmed) {
                          console.log('🔵 [FRONTEND] INICIO - Intentando eliminar cliente:', selectedClient.id);
                          deleteClientMutation.mutate({ clientId: selectedClient.id });
                        }
                      } else {
                        Alert.alert(
                          '⚠️ Eliminar Usuario',
                          `¿Estás seguro de que deseas eliminar a "${selectedClient.name}"?\n\nEsta acción eliminará:\n• Todos sus datos personales\n• Historial de valoraciones\n• No se podrá deshacer`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Eliminar',
                              style: 'destructive',
                              onPress: () => {
                                console.log('🔵 [FRONTEND] INICIO - Intentando eliminar cliente:', selectedClient.id);
                                deleteClientMutation.mutate({ clientId: selectedClient.id });
                              }
                            }
                          ]
                        );
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={deleteClientMutation.isPending}
                  >
                    {deleteClientMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.deleteButtonText}>Eliminar Usuario</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handleSave}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#3b82f6', '#2563eb']}
                      style={styles.saveButtonGradient}
                    >
                      <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showNoShowModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNoShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalle del No Show</Text>
            <TouchableOpacity onPress={() => setShowNoShowModal(false)} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {selectedNoShow && (
              <>
                <View style={styles.noShowDetailSection}>
                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardLabel}>Restaurante</Text>
                    <Text style={styles.detailCardValue}>{selectedNoShow.restaurantName}</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardLabel}>Número de Reserva</Text>
                    <Text style={styles.detailCardValue}>{selectedNoShow.reservationToken}</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardLabel}>Fecha</Text>
                    <Text style={styles.detailCardValue}>{selectedNoShow.reservationDate}</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardLabel}>Hora</Text>
                    <Text style={styles.detailCardValue}>{selectedNoShow.reservationTime}</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardLabel}>Comensales</Text>
                    <Text style={styles.detailCardValue}>{selectedNoShow.guestCount}</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardLabel}>Estado</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        selectedNoShow.isActive ? styles.statusActive : styles.statusInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          selectedNoShow.isActive
                            ? styles.statusActiveText
                            : styles.statusInactiveText,
                        ]}
                      >
                        {selectedNoShow.isActive ? 'Activo' : 'Cancelado'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionButtonsContainer}>
                  {selectedNoShow.isActive ? (
                    <TouchableOpacity
                      style={styles.deactivateButton}
                      onPress={() => handleToggleNoShow(false)}
                      activeOpacity={0.8}
                    >
                      <X size={20} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.actionButtonText}>Cancelar No Show</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.reactivateButton}
                      onPress={() => handleToggleNoShow(true)}
                      activeOpacity={0.8}
                    >
                      <RotateCcw size={20} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.actionButtonText}>Reactivar No Show</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showRatingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRatingsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Historial de Valoraciones</Text>
            <TouchableOpacity onPress={() => setShowRatingsModal(false)} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {ratingsQuery.isLoading ? (
              <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 40 }} />
            ) : ratingsQuery.data && ratingsQuery.data.length > 0 ? (
              <View style={styles.ratingsListContainer}>
                {ratingsQuery.data.map((rating: any) => (
                  <View key={rating.id} style={styles.ratingCard}>
                    <View style={styles.ratingHeader}>
                      <View style={styles.ratingInfo}>
                        <Text style={styles.ratingRestaurant}>{rating.restaurantName}</Text>
                        <Text style={styles.ratingDate}>
                          {new Date(rating.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      <View style={styles.ratingActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedRating(rating);
                            setEditRatingValues(rating.ratings);
                            setEditRatingNoShow(rating.wasNoShow || false);
                            setShowEditRatingModal(true);
                          }}
                          style={styles.iconButton}
                        >
                          <Edit2 size={18} color="#3b82f6" strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              if (window.confirm('¿Eliminar esta valoración?')) {
                                deleteRatingMutation.mutate({ ratingId: rating.id });
                              }
                            } else {
                              Alert.alert(
                                'Eliminar Valoración',
                                '¿Estás seguro?',
                                [
                                  { text: 'Cancelar', style: 'cancel' },
                                  {
                                    text: 'Eliminar',
                                    style: 'destructive',
                                    onPress: () => deleteRatingMutation.mutate({ ratingId: rating.id })
                                  }
                                ]
                              );
                            }
                          }}
                          style={styles.iconButton}
                        >
                          <Trash2 size={18} color="#ef4444" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.ratingDetails}>
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingLabel}>Reserva:</Text>
                        <Text style={styles.ratingValue}>#{rating.confirmationToken?.slice(-8)}</Text>
                      </View>
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingLabel}>Fecha reserva:</Text>
                        <Text style={styles.ratingValue}>
                          {rating.reservationDate} - {rating.reservationTime?.hour}:{String(rating.reservationTime?.minute).padStart(2, '0')}
                        </Text>
                      </View>
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingLabel}>Comensales:</Text>
                        <Text style={styles.ratingValue}>{rating.guests}</Text>
                      </View>
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingLabel}>Valoración Media:</Text>
                        <View style={styles.ratingStars}>
                          <Star size={16} color="#f59e0b" strokeWidth={2.5} fill="#f59e0b" />
                          <Text style={styles.ratingAverage}>{rating.ratingAverage.toFixed(1)}</Text>
                        </View>
                      </View>
                      {rating.autoRated && (
                        <View style={styles.autoRatedBadge}>
                          <Text style={styles.autoRatedText}>Auto-valorado (24h)</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Star size={64} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>Sin valoraciones</Text>
                <Text style={styles.emptyText}>Este usuario no tiene valoraciones registradas</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showEditRatingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditRatingModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Valoración</Text>
            <TouchableOpacity onPress={() => setShowEditRatingModal(false)} activeOpacity={0.7}>
              <X size={24} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {selectedRating && ratingCriteriaQuery.data && (
              <View style={styles.editRatingContainer}>
                {ratingCriteriaQuery.data.map((criteria: any) => (
                  <View key={criteria.id} style={styles.criteriaItem}>
                    <Text style={styles.criteriaLabel}>{criteria.name}</Text>
                    <View style={styles.starRating}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <TouchableOpacity
                          key={value}
                          onPress={() => {
                            setEditRatingValues({
                              ...editRatingValues,
                              [criteria.id]: value
                            });
                          }}
                          style={styles.starButton}
                        >
                          <Star
                            size={32}
                            color="#f59e0b"
                            strokeWidth={2}
                            fill={editRatingValues[criteria.id] >= value ? '#f59e0b' : 'transparent'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
                
                <View style={styles.noShowToggleContainer}>
                  <TouchableOpacity
                    style={styles.noShowToggle}
                    onPress={() => setEditRatingNoShow(!editRatingNoShow)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.checkbox,
                      editRatingNoShow && styles.checkboxSelected
                    ]}>
                      {editRatingNoShow && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.noShowToggleLabel}>
                      <Text style={styles.noShowToggleText}>Marcar como No Show</Text>
                      <Text style={styles.noShowToggleNote}>
                        {editRatingNoShow 
                          ? 'El cliente será bloqueado según las reglas configuradas'
                          : 'El cliente asistió normalmente a la reserva'
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.saveRatingButton}
                  onPress={() => {
                    console.log('💾 [ADMIN] Click en botón guardar valoración');
                    console.log('💾 [ADMIN] Valores actuales:', editRatingValues);
                    console.log('💾 [ADMIN] Rating seleccionado:', selectedRating);
                    
                    if (!selectedRating || !selectedRating.id) {
                      console.error('❌ [ADMIN] No hay valoración seleccionada');
                      if (Platform.OS === 'web') {
                        alert('Error: No hay valoración seleccionada');
                      } else {
                        Alert.alert('Error', 'No hay valoración seleccionada');
                      }
                      return;
                    }
                    
                    const ratingsArray = Object.entries(editRatingValues).map(([criteriaId, value]) => ({
                      criteriaId,
                      value: Number(value)
                    }));
                    
                    if (ratingsArray.length === 0) {
                      console.error('❌ [ADMIN] No hay valoraciones para guardar');
                      if (Platform.OS === 'web') {
                        alert('Error: Debe valorar al menos un criterio');
                      } else {
                        Alert.alert('Error', 'Debe valorar al menos un criterio');
                      }
                      return;
                    }
                    
                    console.log('📊 [ADMIN] Ratings array:', ratingsArray);
                    console.log('🚫 [ADMIN] IsNoShow:', editRatingNoShow);
                    console.log('🔑 [ADMIN] Rating ID:', selectedRating.id);
                    
                    const executeUpdate = () => {
                      console.log('🚀 [ADMIN] Ejecutando mutación...');
                      updateRatingMutation.mutate({
                        ratingId: selectedRating.id,
                        ratings: ratingsArray,
                        isNoShow: editRatingNoShow
                      });
                    };
                    
                    if (Platform.OS === 'web') {
                      const confirmed = window.confirm('¿Guardar cambios en esta valoración?');
                      console.log('🔔 [ADMIN] Confirmación:', confirmed);
                      if (confirmed) {
                        executeUpdate();
                      }
                    } else {
                      Alert.alert(
                        'Guardar Cambios',
                        '¿Estás seguro de que deseas guardar estos cambios?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Guardar',
                            onPress: executeUpdate
                          }
                        ]
                      );
                    }
                  }}
                  disabled={updateRatingMutation.isPending}
                  activeOpacity={0.8}
                >
                  {updateRatingMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveRatingButtonText}>Guardar Cambios</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBar: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  clientCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: {
    flex: 1,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  ratingBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fce7f3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ratingTextInline: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#ec4899',
  },
  clientEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 14,
    color: '#64748b',
  },
  clientStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  noShowBadge: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blockedBadge: {
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  blockedText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#dc2626',
  },
  clientFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientDate: {
    fontSize: 12,
    color: '#64748b',
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
  ratingSection: {
    padding: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 16,
  },
  ratingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  ratingItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  ratingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  noShowText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#dc2626',
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
  fieldNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  buttonContainer: {
    padding: 20,
    gap: 12,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  saveButton: {
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
  noShowSection: {
    padding: 20,
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  noShowList: {
    gap: 12,
    marginTop: 12,
  },
  noShowCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  noShowCardInactive: {
    borderLeftColor: '#cbd5e1',
    opacity: 0.7,
  },
  noShowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noShowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  noShowTitleInactive: {
    color: '#64748b',
  },
  inactiveBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  noShowDetail: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  noShowDetailSection: {
    padding: 20,
    gap: 12,
  },
  detailCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  detailCardLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 4,
  },
  detailCardValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#fee2e2',
  },
  statusInactive: {
    backgroundColor: '#f1f5f9',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statusActiveText: {
    color: '#dc2626',
  },
  statusInactiveText: {
    color: '#64748b',
  },
  actionButtonsContainer: {
    padding: 20,
    gap: 12,
  },
  deactivateButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  reactivateButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  ratingsButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    paddingVertical: 16,
    paddingHorizontal: 20,
    margin: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  ratingsButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#f59e0b',
  },
  ratingsListContainer: {
    padding: 20,
    gap: 16,
  },
  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ratingHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  ratingInfo: {
    flex: 1,
  },
  ratingRestaurant: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  ratingDate: {
    fontSize: 12,
    color: '#64748b',
  },
  ratingActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  ratingDetails: {
    gap: 8,
  },
  ratingRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingStars: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
  },
  ratingAverage: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#f59e0b',
  },
  autoRatedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  autoRatedText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#f59e0b',
  },
  editRatingContainer: {
    padding: 20,
    gap: 24,
  },
  criteriaItem: {
    gap: 12,
  },
  criteriaLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  starRating: {
    flexDirection: 'row' as const,
    gap: 8,
    justifyContent: 'center',
  },
  starButton: {
    padding: 4,
  },
  saveRatingButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveRatingButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  noShowToggleContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  noShowToggle: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start',
    gap: 12,
  },
  noShowToggleLabel: {
    flex: 1,
  },
  noShowToggleText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  noShowToggleNote: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
