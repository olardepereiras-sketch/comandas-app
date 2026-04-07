import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert, TextInput, FlatList, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getRestaurantId } from '@/lib/restaurantSession';
import { Heart, X, Star, Search, ChevronDown, AlertTriangle, Clock, Users, Calendar, Crown, MapPin, ShieldOff, Lock, Unlock } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { PHONE_PREFIXES, DEFAULT_PREFIX } from '@/constants/phone-prefixes';
import type { PhonePrefix } from '@/constants/phone-prefixes';

export default function RestaurantRatingsScreen() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [activeSearchPhone, setActiveSearchPhone] = useState('');
  const [phonePrefix, setPhonePrefix] = useState<string>(DEFAULT_PREFIX);
  const [showPrefixModal, setShowPrefixModal] = useState(false);
  const [prefixSearch, setPrefixSearch] = useState('');
  const [selectedRating, setSelectedRating] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'ratings' | 'vip' | 'blocked'>('ratings');
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipSearchPhone, setVipSearchPhone] = useState('');
  const [vipPhonePrefix, setVipPhonePrefix] = useState<string>(DEFAULT_PREFIX);
  const [showVipPrefixModal, setShowVipPrefixModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [vipNotes, setVipNotes] = useState('');
  const [blockedSearchPhone, setBlockedSearchPhone] = useState('');
  const [blockedActivePhone, setBlockedActivePhone] = useState('');
  const [blockedPhonePrefix, setBlockedPhonePrefix] = useState<string>(DEFAULT_PREFIX);
  const [showBlockedPrefixModal, setShowBlockedPrefixModal] = useState(false);
  const [blockedSearchFoundClient, setBlockedSearchFoundClient] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [blockedSearchNotFound, setBlockedSearchNotFound] = useState(false);

  useEffect(() => {
    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSession = async () => {
    try {
      const id = await getRestaurantId();
      if (!id) {
        Alert.alert('Error', 'Sesión no encontrada');
        router.replace('/');
        return;
      }
      setRestaurantId(id);
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Error al cargar la sesión');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const ratingsQuery = trpc.restaurants.listRatings.useQuery(
    {
      restaurantId: restaurantId || '',
      phone: activeSearchPhone || undefined,
      limit: 200,
    },
    { enabled: !!restaurantId }
  );

  const ratingCriteriaQuery = trpc.ratingCriteria.list.useQuery(undefined, {
    enabled: !!restaurantId,
  });

  const toggleUnwantedMutation = trpc.clients.toggleUnwanted.useMutation({
    onSuccess: async () => {
      await ratingsQuery.refetch();
      setShowDetailModal(false);
      Alert.alert('Éxito', 'Cliente desbloqueado correctamente');
    },
    onError: (error: any) => {
      console.error('❌ [UNBLOCK CLIENT] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo desbloquear al cliente');
    },
  });

  const clientCheckQuery = trpc.clients.checkPhone.useQuery(
    { phone: vipPhonePrefix + vipSearchPhone },
    { enabled: false }
  );

  const blockedClientsQuery = trpc.clients.listBlocked.useQuery(
    { restaurantId: restaurantId || '', phone: blockedActivePhone || undefined },
    { enabled: !!restaurantId && activeTab === 'blocked', staleTime: 0 }
  );

  const blockNewClientMutation = trpc.clients.toggleUnwanted.useMutation({
    onSuccess: async () => {
      await blockedClientsQuery.refetch();
      setBlockedSearchFoundClient(null);
      setBlockedSearchNotFound(false);
      setBlockedSearchPhone('');
      setBlockedActivePhone('');
      Alert.alert('Éxito', 'Usuario bloqueado. No podrá realizar reservas.');
    },
    onError: (error: any) => {
      console.error('❌ [BLOCK CLIENT] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo bloquear al usuario');
    },
  });

  const unblockFromBlockedTabMutation = trpc.clients.toggleUnwanted.useMutation({
    onSuccess: async () => {
      await blockedClientsQuery.refetch();
      Alert.alert('Éxito', 'Usuario desbloqueado. Ya puede realizar reservas.');
    },
    onError: (error: any) => {
      console.error('❌ [UNBLOCK] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo desbloquear al usuario');
    },
  });

  const tablesQuery = trpc.tables.list.useQuery(
    { restaurantId: restaurantId || '' },
    { enabled: !!restaurantId && showVipModal }
  );

  const vipInfoQuery = trpc.clients.getVipInfo.useQuery(
    { clientId: selectedClient?.id || '' },
    { enabled: !!selectedClient?.id }
  );

  useEffect(() => {
    if (vipInfoQuery.data && selectedClient) {
      setSelectedTables(vipInfoQuery.data.preferredTableIds || []);
      setVipNotes(vipInfoQuery.data.vipNotes || '');
    }
  }, [vipInfoQuery.data, selectedClient]);

  const setVipMutation = trpc.clients.setVip.useMutation({
    onSuccess: async () => {
      Alert.alert('Éxito', 'Cliente VIP configurado correctamente');
      setShowVipModal(false);
      setSelectedClient(null);
      setSelectedTables([]);
      setVipNotes('');
    },
    onError: (error: any) => {
      console.error('❌ [SET VIP] Error:', error);
      Alert.alert('Error', error?.message || 'No se pudo configurar el cliente VIP');
    },
  });

  const blockedPhoneCheckQuery = trpc.clients.checkPhone.useQuery(
    { phone: blockedPhonePrefix + blockedSearchPhone.trim() },
    { enabled: false }
  );

  const handleBlockedSearch = async () => {
    setBlockedSearchFoundClient(null);
    setBlockedSearchNotFound(false);
    if (blockedSearchPhone.trim()) {
      const fullPhone = blockedPhonePrefix + blockedSearchPhone.trim();
      setBlockedActivePhone(fullPhone);
      try {
        const result = await blockedPhoneCheckQuery.refetch();
        if (result.data?.exists && result.data.client) {
          setBlockedSearchFoundClient(result.data.client);
        } else {
          setBlockedSearchNotFound(true);
        }
      } catch (error) {
        console.error('Error buscando cliente en bloqueos:', error);
      }
    } else {
      setBlockedActivePhone('');
    }
  };

  const handleBlockedClear = () => {
    setBlockedSearchPhone('');
    setBlockedActivePhone('');
    setBlockedSearchFoundClient(null);
    setBlockedSearchNotFound(false);
  };

  const handleSearch = () => {
    if (searchPhone.trim()) {
      setActiveSearchPhone(phonePrefix + searchPhone.trim());
    } else {
      setActiveSearchPhone('');
    }
  };

  const handleVipSearch = async () => {
    if (!vipSearchPhone.trim()) {
      Alert.alert('Error', 'Por favor ingresa un número de teléfono');
      return;
    }

    try {
      const result = await clientCheckQuery.refetch();
      if (result.data?.exists && result.data.client) {
        setSelectedClient(result.data.client);
      } else {
        Alert.alert('No encontrado', 'No existe ningún cliente con este número de teléfono');
      }
    } catch (error) {
      console.error('Error buscando cliente:', error);
      Alert.alert('Error', 'No se pudo buscar el cliente');
    }
  };

  const handleSaveVip = () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Debes buscar y seleccionar un cliente primero');
      return;
    }

    if (selectedTables.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos una mesa preferida');
      return;
    }

    setVipMutation.mutate({
      clientId: selectedClient.id,
      isVip: true,
      preferredTableIds: selectedTables,
      vipNotes: vipNotes,
    });
  };

  const toggleTableSelection = (tableId: string) => {
    if (selectedTables.includes(tableId)) {
      setSelectedTables(selectedTables.filter(id => id !== tableId));
    } else {
      setSelectedTables([...selectedTables, tableId]);
    }
  };

  const handleClearSearch = () => {
    setSearchPhone('');
    setActiveSearchPhone('');
  };

  const handleRatingPress = (rating: any) => {
    setSelectedRating(rating);
    setShowDetailModal(true);
  };

  const filteredPrefixes = useMemo(() => {
    if (!prefixSearch.trim()) return PHONE_PREFIXES;
    const q = prefixSearch.toLowerCase();
    return PHONE_PREFIXES.filter(
      (p: PhonePrefix) => p.country.toLowerCase().includes(q) || p.code.includes(q)
    );
  }, [prefixSearch]);

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return '#10b981';
    if (rating >= 3) return '#f59e0b';
    if (rating >= 2) return '#f97316';
    return '#ef4444';
  };

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (time: any) => {
    if (!time) return '';
    return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  };

  const getCriteriaName = (criteriaId: string): string => {
    if (!ratingCriteriaQuery.data) return criteriaId;
    const criteria = ratingCriteriaQuery.data.find((c: any) => c.id === criteriaId);
    return criteria?.name || criteriaId;
  };

  if (isLoadingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Valoraciones + VIP + Bloqueos',
          headerStyle: { backgroundColor: '#ec4899' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ratings' && styles.tabActive]}
            onPress={() => setActiveTab('ratings')}
            activeOpacity={0.7}
          >
            <Heart size={20} color={activeTab === 'ratings' ? '#ec4899' : '#94a3b8'} strokeWidth={2} fill={activeTab === 'ratings' ? '#ec4899' : 'transparent'} />
            <Text style={[styles.tabText, activeTab === 'ratings' && styles.tabTextActive]}>Valoraciones</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'vip' && styles.tabActive]}
            onPress={() => setActiveTab('vip')}
            activeOpacity={0.7}
          >
            <Crown size={20} color={activeTab === 'vip' ? '#ec4899' : '#94a3b8'} strokeWidth={2} />
            <Text style={[styles.tabText, activeTab === 'vip' && styles.tabTextActive]}>VIP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'blocked' && styles.tabActive]}
            onPress={() => setActiveTab('blocked')}
            activeOpacity={0.7}
          >
            <ShieldOff size={20} color={activeTab === 'blocked' ? '#ec4899' : '#94a3b8'} strokeWidth={2} />
            <Text style={[styles.tabText, activeTab === 'blocked' && styles.tabTextActive]}>Bloqueos</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'ratings' ? (
        <>
          <View style={styles.header}>
            <Heart size={36} color="#ec4899" strokeWidth={1.5} fill="#ec4899" />
            <Text style={styles.title}>Valoraciones de Clientes</Text>
            <Text style={styles.subtitle}>
              {ratingsQuery.data ? `${ratingsQuery.data.total} valoraciones en total` : 'Cargando...'}
            </Text>
          </View>

          <View style={styles.searchSection}>
          <Text style={styles.searchLabel}>Buscar por teléfono</Text>
          <View style={styles.phoneInputRow}>
            <TouchableOpacity
              style={styles.prefixSelector}
              onPress={() => {
                setPrefixSearch('');
                setShowPrefixModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.prefixText}>{phonePrefix}</Text>
              <ChevronDown size={14} color="#64748b" />
            </TouchableOpacity>
            <TextInput
              style={styles.phoneInput}
              value={searchPhone}
              onChangeText={setSearchPhone}
              placeholder="666123456"
              keyboardType="phone-pad"
              placeholderTextColor="#9ca3af"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
              activeOpacity={0.7}
            >
              <Search size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {activeSearchPhone ? (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchRow} activeOpacity={0.7}>
              <X size={14} color="#ec4899" />
              <Text style={styles.clearSearchText}>Limpiar búsqueda: {activeSearchPhone}</Text>
            </TouchableOpacity>
          ) : null}
          </View>

          {ratingsQuery.isLoading ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#ec4899" />
            </View>
          ) : !ratingsQuery.data || ratingsQuery.data.ratings.length === 0 ? (
            <View style={styles.emptyState}>
              <Heart size={48} color="#cbd5e1" strokeWidth={1.5} />
              <Text style={styles.emptyText}>
                {activeSearchPhone ? 'No se encontraron valoraciones para este número' : 'No hay valoraciones aún'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeSearchPhone
                  ? 'Prueba con otro número de teléfono'
                  : 'Las valoraciones aparecerán aquí cuando valores a tus clientes o el sistema las genere automáticamente'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={ratingsQuery.data.ratings}
              keyExtractor={(item: any) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  style={styles.ratingCard}
                  onPress={() => handleRatingPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardClientInfo}>
                      <Text style={styles.clientName}>{item.clientName}</Text>
                      <Text style={styles.clientPhone}>{item.clientPhone}</Text>
                    </View>
                    <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(item.ratingAverage) + '18', borderColor: getRatingColor(item.ratingAverage) }]}>
                      <Text style={[styles.ratingValue, { color: getRatingColor(item.ratingAverage) }]}>
                        {item.ratingAverage.toFixed(1)}
                      </Text>
                      <Heart size={14} color={getRatingColor(item.ratingAverage)} fill={getRatingColor(item.ratingAverage)} />
                    </View>
                  </View>

                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Calendar size={12} color="#94a3b8" />
                      <Text style={styles.metaText}>{formatDate(item.reservationDate)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={12} color="#94a3b8" />
                      <Text style={styles.metaText}>{formatTime(item.reservationTime)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Users size={12} color="#94a3b8" />
                      <Text style={styles.metaText}>{item.guests} com.</Text>
                    </View>
                  </View>

                  <View style={styles.cardTags}>
                    {item.wasNoShow && (
                      <View style={styles.noShowTag}>
                        <AlertTriangle size={11} color="#ef4444" />
                        <Text style={styles.noShowTagText}>No Show</Text>
                      </View>
                    )}
                    {item.isCurrentlyUnwanted && (
                      <View style={styles.blockedTag}>
                        <X size={11} color="#dc2626" />
                        <Text style={styles.blockedTagText}>Bloqueado</Text>
                      </View>
                    )}
                    {item.autoRated && !item.wasNoShow && (
                      <View style={styles.autoTag}>
                        <Clock size={11} color="#8b5cf6" />
                        <Text style={styles.autoTagText}>Automática</Text>
                      </View>
                    )}
                    {!item.autoRated && !item.wasNoShow && (
                      <View style={styles.manualTag}>
                        <Star size={11} color="#ec4899" />
                        <Text style={styles.manualTagText}>Manual</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </>
        ) : activeTab === 'vip' ? (
          <View style={styles.vipContent}>
            <View style={styles.vipHeader}>
              <Crown size={36} color="#fbbf24" strokeWidth={1.5} />
              <Text style={styles.title}>Clientes VIP</Text>
              <Text style={styles.subtitle}>Configura mesas preferidas para tus mejores clientes</Text>
            </View>

            <TouchableOpacity
              style={styles.addVipButton}
              onPress={() => {
                setVipSearchPhone('');
                setSelectedClient(null);
                setSelectedTables([]);
                setVipNotes('');
                setShowVipModal(true);
              }}
              activeOpacity={0.8}
            >
              <Crown size={20} color="#fff" strokeWidth={2} />
              <Text style={styles.addVipButtonText}>Buscar Cliente para Configurar VIP</Text>
            </TouchableOpacity>

            <Text style={styles.vipInfoText}>ℹ️ Los clientes VIP tendrán prioridad para sus mesas favoritas al hacer reservas</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <ShieldOff size={36} color="#ef4444" strokeWidth={1.5} />
              <Text style={styles.title}>Usuarios Bloqueados</Text>
              <Text style={styles.subtitle}>Gestiona los usuarios que no pueden reservar en tu restaurante</Text>
            </View>

            <View style={styles.searchSection}>
              <Text style={styles.searchLabel}>Buscar por teléfono</Text>
              <View style={styles.phoneInputRow}>
                <TouchableOpacity
                  style={styles.prefixSelector}
                  onPress={() => {
                    setPrefixSearch('');
                    setShowBlockedPrefixModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.prefixText}>{blockedPhonePrefix}</Text>
                  <ChevronDown size={14} color="#64748b" />
                </TouchableOpacity>
                <TextInput
                  style={styles.phoneInput}
                  value={blockedSearchPhone}
                  onChangeText={setBlockedSearchPhone}
                  placeholder="666123456"
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                  onSubmitEditing={() => { void handleBlockedSearch(); }}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={() => { void handleBlockedSearch(); }}
                  activeOpacity={0.7}
                >
                  <Search size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              {blockedActivePhone ? (
                <TouchableOpacity onPress={handleBlockedClear} style={styles.clearSearchRow} activeOpacity={0.7}>
                  <X size={14} color="#ec4899" />
                  <Text style={styles.clearSearchText}>Limpiar búsqueda: {blockedActivePhone}</Text>
                </TouchableOpacity>
              ) : null}

              {blockedSearchFoundClient && !blockedClientsQuery.data?.some((b: any) => b.id === blockedSearchFoundClient.id) && (
                <View style={styles.foundClientCard}>
                  <View style={styles.foundClientInfo}>
                    <Text style={styles.foundClientLabel}>Usuario encontrado</Text>
                    <Text style={styles.foundClientName}>{blockedSearchFoundClient.name}</Text>
                    <Text style={styles.foundClientPhone}>{blockedSearchFoundClient.phone}</Text>
                    <Text style={styles.foundClientStatus}>✅ Registrado · No bloqueado actualmente</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.blockBtn}
                    activeOpacity={0.8}
                    disabled={blockNewClientMutation.isPending}
                    onPress={() => {
                      const doBlock = () => {
                        blockNewClientMutation.mutate({
                          restaurantId: restaurantId || '',
                          clientId: blockedSearchFoundClient.id,
                          isUnwanted: true,
                        });
                      };
                      if (Platform.OS === 'web') {
                        if (window.confirm(`¿Bloquear a ${blockedSearchFoundClient.name}? No podrá realizar reservas en tu restaurante.`)) doBlock();
                      } else {
                        Alert.alert(
                          'Bloquear usuario',
                          `¿Bloquear a ${blockedSearchFoundClient.name}? No podrá realizar reservas en tu restaurante.`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Bloquear', style: 'destructive', onPress: doBlock },
                          ]
                        );
                      }
                    }}
                  >
                    <Lock size={14} color="#fff" />
                    <Text style={styles.blockBtnText}>{blockNewClientMutation.isPending ? 'Bloqueando...' : 'Bloquear'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {blockedSearchNotFound && blockedActivePhone && (
                <View style={styles.notFoundCard}>
                  <Text style={styles.notFoundText}>⚠️ Este número no está registrado en el sistema</Text>
                </View>
              )}
            </View>

            {blockedClientsQuery.isLoading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#ef4444" />
              </View>
            ) : !blockedClientsQuery.data || blockedClientsQuery.data.length === 0 ? (
              <View style={styles.emptyState}>
                <ShieldOff size={48} color="#cbd5e1" strokeWidth={1.5} />
                <Text style={styles.emptyText}>
                  {blockedActivePhone ? 'No hay usuarios bloqueados con este teléfono' : 'No hay usuarios bloqueados'}
                </Text>
                <Text style={styles.emptySubtext}>
                  Los usuarios bloqueados no pueden realizar reservas en tu restaurante
                </Text>
              </View>
            ) : (
              <FlatList
                data={blockedClientsQuery.data}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }: { item: any }) => (
                  <View style={styles.blockedClientCard}>
                    <View style={styles.blockedClientLeft}>
                      <View style={styles.blockedClientIcon}>
                        <Lock size={18} color="#dc2626" />
                      </View>
                      <View style={styles.blockedClientInfo}>
                        <Text style={styles.blockedClientName}>{item.name}</Text>
                        <Text style={styles.blockedClientPhone}>{item.phone}</Text>
                        <Text style={styles.blockedClientDate}>
                          Bloqueado el {new Date(item.blockedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.unblockBtn}
                      activeOpacity={0.8}
                      disabled={unblockFromBlockedTabMutation.isPending}
                      onPress={() => {
                        const doUnblock = () => {
                          unblockFromBlockedTabMutation.mutate({
                            restaurantId: restaurantId || '',
                            clientId: item.id,
                            isUnwanted: false,
                          });
                        };
                        if (Platform.OS === 'web') {
                          if (window.confirm(`¿Desbloquear a ${item.name as string}?`)) doUnblock();
                        } else {
                          Alert.alert(
                            'Desbloquear usuario',
                            `¿Desbloquear a ${item.name as string}? Podrá volver a hacer reservas.`,
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Desbloquear', onPress: doUnblock },
                            ]
                          );
                        }
                      }}
                    >
                      <Unlock size={14} color="#fff" />
                      <Text style={styles.unblockBtnText}>Desbloquear</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            <Modal
              visible={showBlockedPrefixModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowBlockedPrefixModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.prefixModalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Seleccionar prefijo</Text>
                    <TouchableOpacity onPress={() => setShowBlockedPrefixModal(false)} activeOpacity={0.7}>
                      <X size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.prefixSearchBar}>
                    <Search size={16} color="#94a3b8" />
                    <TextInput
                      style={styles.prefixSearchInput}
                      value={prefixSearch}
                      onChangeText={setPrefixSearch}
                      placeholder="Buscar país o código..."
                      placeholderTextColor="#94a3b8"
                      autoFocus
                    />
                    {prefixSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setPrefixSearch('')} activeOpacity={0.7}>
                        <X size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <FlatList
                    data={filteredPrefixes}
                    keyExtractor={(item: PhonePrefix, index: number) => `${item.code}-${item.country}-${index}`}
                    style={styles.prefixList}
                    renderItem={({ item }: { item: PhonePrefix }) => (
                      <TouchableOpacity
                        style={[
                          styles.prefixOption,
                          blockedPhonePrefix === item.code && styles.prefixOptionSelected,
                        ]}
                        onPress={() => {
                          setBlockedPhonePrefix(item.code);
                          setShowBlockedPrefixModal(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.prefixFlag}>{item.flag}</Text>
                        <View style={styles.prefixInfo}>
                          <Text style={styles.prefixCountry}>{item.country}</Text>
                          <Text style={styles.prefixCode}>{item.code}</Text>
                        </View>
                        {blockedPhonePrefix === item.code && (
                          <Text style={styles.prefixCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </Modal>
          </View>
        )}

        <Modal
          visible={showDetailModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalle de Valoración</Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {selectedRating && (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.detailClientHeader}>
                    <Text style={styles.detailClientName}>{selectedRating.clientName}</Text>
                    <Text style={styles.detailClientPhone}>{selectedRating.clientPhone}</Text>
                    {selectedRating.clientGlobalRating != null && selectedRating.clientGlobalRating > 0 && (
                      <View style={styles.globalRatingRow}>
                        <Text style={styles.globalRatingLabel}>Nota media global:</Text>
                        <Text style={styles.globalRatingValue}>{selectedRating.clientGlobalRating.toFixed(1)}</Text>
                        <Heart size={14} color="#ec4899" fill="#ec4899" />
                      </View>
                    )}
                    {selectedRating.isCurrentlyUnwanted && (
                      <View style={styles.detailBlockedBanner}>
                        <AlertTriangle size={18} color="#dc2626" />
                        <Text style={styles.detailBlockedText}>Cliente bloqueado permanentemente</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailRatingOverview}>
                    <Text style={styles.detailRatingNumber}>{selectedRating.ratingAverage.toFixed(1)}</Text>
                    <View style={styles.detailStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={24}
                          color={star <= Math.round(selectedRating.ratingAverage) ? '#fbbf24' : '#e5e7eb'}
                          fill={star <= Math.round(selectedRating.ratingAverage) ? '#fbbf24' : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.detailInfoRow}>
                    <View style={styles.detailInfoItem}>
                      <Calendar size={16} color="#64748b" />
                      <Text style={styles.detailInfoText}>{formatDate(selectedRating.reservationDate)}</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Clock size={16} color="#64748b" />
                      <Text style={styles.detailInfoText}>{formatTime(selectedRating.reservationTime)}</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Users size={16} color="#64748b" />
                      <Text style={styles.detailInfoText}>{selectedRating.guests} comensales</Text>
                    </View>
                  </View>

                  {selectedRating.wasNoShow && (
                    <View style={styles.detailNoShowBanner}>
                      <AlertTriangle size={18} color="#ef4444" />
                      <Text style={styles.detailNoShowText}>El cliente no se presentó (No Show)</Text>
                    </View>
                  )}

                  {selectedRating.autoRated && !selectedRating.wasNoShow && (
                    <View style={styles.detailAutoBanner}>
                      <Clock size={18} color="#8b5cf6" />
                      <Text style={styles.detailAutoText}>Valoración automática del sistema (pasaron 24h sin valorar)</Text>
                    </View>
                  )}

                  {selectedRating.ratings && typeof selectedRating.ratings === 'object' && (
                    <View style={styles.detailCriteria}>
                      <Text style={styles.detailCriteriaTitle}>Desglose por criterio</Text>
                      {Object.entries(selectedRating.ratings).map(([criteriaId, value]) => (
                        <View key={criteriaId} style={styles.criteriaRow}>
                          <Text style={styles.criteriaName}>{getCriteriaName(criteriaId)}</Text>
                          <View style={styles.criteriaStars}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={16}
                                color={s <= (value as number) ? '#fbbf24' : '#e5e7eb'}
                                fill={s <= (value as number) ? '#fbbf24' : 'transparent'}
                              />
                            ))}
                            <Text style={styles.criteriaValue}>{value as number}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              )}

              <View style={styles.modalFooterButtons}>
                {selectedRating?.isCurrentlyUnwanted && (
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        const confirmed = window.confirm(
                          `¿Deseas desbloquear a ${selectedRating.clientName}? El cliente podrá volver a realizar reservas en tu restaurante.`
                        );
                        if (confirmed) {
                          toggleUnwantedMutation.mutate({
                            restaurantId: restaurantId || '',
                            clientId: selectedRating.clientId,
                            isUnwanted: false,
                          });
                        }
                      } else {
                        Alert.alert(
                          'Desbloquear Cliente',
                          `¿Deseas desbloquear a ${selectedRating.clientName}? El cliente podrá volver a realizar reservas en tu restaurante.`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Desbloquear',
                              onPress: () => {
                                toggleUnwantedMutation.mutate({
                                  restaurantId: restaurantId || '',
                                  clientId: selectedRating.clientId,
                                  isUnwanted: false,
                                });
                              },
                            },
                          ]
                        );
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={toggleUnwantedMutation.isPending}
                  >
                    <Text style={styles.unblockButtonText}>
                      {toggleUnwantedMutation.isPending ? 'Desbloqueando...' : 'Desbloquear Cliente'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowDetailModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showPrefixModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPrefixModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.prefixModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar prefijo</Text>
                <TouchableOpacity onPress={() => setShowPrefixModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={styles.prefixSearchBar}>
                <Search size={16} color="#94a3b8" />
                <TextInput
                  style={styles.prefixSearchInput}
                  value={prefixSearch}
                  onChangeText={setPrefixSearch}
                  placeholder="Buscar país o código..."
                  placeholderTextColor="#94a3b8"
                  autoFocus
                />
                {prefixSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPrefixSearch('')} activeOpacity={0.7}>
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={filteredPrefixes}
                keyExtractor={(item: PhonePrefix, index: number) => `${item.code}-${item.country}-${index}`}
                style={styles.prefixList}
                renderItem={({ item }: { item: PhonePrefix }) => (
                  <TouchableOpacity
                    style={[
                      styles.prefixOption,
                      phonePrefix === item.code && styles.prefixOptionSelected,
                    ]}
                    onPress={() => {
                      setPhonePrefix(item.code);
                      setShowPrefixModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.prefixFlag}>{item.flag}</Text>
                    <View style={styles.prefixInfo}>
                      <Text style={styles.prefixCountry}>{item.country}</Text>
                      <Text style={styles.prefixCode}>{item.code}</Text>
                    </View>
                    {phonePrefix === item.code && (
                      <Text style={styles.prefixCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal
          visible={showVipModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowVipModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configurar Cliente VIP</Text>
                <TouchableOpacity onPress={() => setShowVipModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.vipModalSection}>
                  <Text style={styles.vipSectionTitle}>1. Buscar Cliente</Text>
                  <View style={styles.phoneInputRow}>
                    <TouchableOpacity
                      style={styles.prefixSelector}
                      onPress={() => {
                        setPrefixSearch('');
                        setShowVipPrefixModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.prefixText}>{vipPhonePrefix}</Text>
                      <ChevronDown size={14} color="#64748b" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.phoneInput}
                      value={vipSearchPhone}
                      onChangeText={setVipSearchPhone}
                      placeholder="666123456"
                      keyboardType="phone-pad"
                      placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity
                      style={styles.searchButton}
                      onPress={handleVipSearch}
                      activeOpacity={0.7}
                    >
                      <Search size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {selectedClient && (
                    <View style={styles.clientSelectedCard}>
                      <Crown size={20} color="#fbbf24" strokeWidth={2} />
                      <View style={styles.clientSelectedInfo}>
                        <Text style={styles.clientSelectedName}>{selectedClient.name}</Text>
                        <Text style={styles.clientSelectedPhone}>{selectedClient.phone}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {selectedClient && (
                  <>
                    <View style={styles.vipModalSection}>
                      <Text style={styles.vipSectionTitle}>2. Seleccionar Mesas Preferidas</Text>
                      <Text style={styles.vipSectionSubtitle}>Selecciona las mesas que prefiere este cliente</Text>
                      
                      {tablesQuery.isLoading ? (
                        <ActivityIndicator size="small" color="#ec4899" style={{ marginTop: 20 }} />
                      ) : !tablesQuery.data || tablesQuery.data.length === 0 ? (
                        <Text style={styles.emptySubtext}>No hay mesas configuradas</Text>
                      ) : (
                        <View style={styles.tablesGrid}>
                          {tablesQuery.data.map((table: any) => (
                            <TouchableOpacity
                              key={table.id}
                              style={[
                                styles.tableChip,
                                selectedTables.includes(table.id) && styles.tableChipSelected,
                              ]}
                              onPress={() => toggleTableSelection(table.id)}
                              activeOpacity={0.7}
                            >
                              <MapPin
                                size={14}
                                color={selectedTables.includes(table.id) ? '#ec4899' : '#64748b'}
                                strokeWidth={2}
                              />
                              <Text
                                style={[
                                  styles.tableChipText,
                                  selectedTables.includes(table.id) && styles.tableChipTextSelected,
                                ]}
                              >
                                {table.name}
                              </Text>
                              <Text style={styles.tableChipCapacity}>({table.minCapacity}-{table.maxCapacity})</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={styles.vipModalSection}>
                      <Text style={styles.vipSectionTitle}>3. Notas (Opcional)</Text>
                      <TextInput
                        style={styles.vipNotesInput}
                        value={vipNotes}
                        onChangeText={setVipNotes}
                        placeholder="Ej: Cliente habitual, prefiere ventana, alergias..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.modalFooterButtons}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowVipModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeButtonText}>Cancelar</Text>
                </TouchableOpacity>
                {selectedClient && (
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={handleSaveVip}
                    activeOpacity={0.8}
                    disabled={setVipMutation.isPending}
                  >
                    <Text style={styles.unblockButtonText}>
                      {setVipMutation.isPending ? 'Guardando...' : 'Guardar VIP'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showVipPrefixModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowVipPrefixModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.prefixModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar prefijo</Text>
                <TouchableOpacity onPress={() => setShowVipPrefixModal(false)} activeOpacity={0.7}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={styles.prefixSearchBar}>
                <Search size={16} color="#94a3b8" />
                <TextInput
                  style={styles.prefixSearchInput}
                  value={prefixSearch}
                  onChangeText={setPrefixSearch}
                  placeholder="Buscar país o código..."
                  placeholderTextColor="#94a3b8"
                  autoFocus
                />
                {prefixSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPrefixSearch('')} activeOpacity={0.7}>
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={filteredPrefixes}
                keyExtractor={(item: PhonePrefix, index: number) => `${item.code}-${item.country}-${index}`}
                style={styles.prefixList}
                renderItem={({ item }: { item: PhonePrefix }) => (
                  <TouchableOpacity
                    style={[
                      styles.prefixOption,
                      vipPhonePrefix === item.code && styles.prefixOptionSelected,
                    ]}
                    onPress={() => {
                      setVipPhonePrefix(item.code);
                      setShowVipPrefixModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.prefixFlag}>{item.flag}</Text>
                    <View style={styles.prefixInfo}>
                      <Text style={styles.prefixCountry}>{item.country}</Text>
                      <Text style={styles.prefixCode}>{item.code}</Text>
                    </View>
                    {vipPhonePrefix === item.code && (
                      <Text style={styles.prefixCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#475569',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefixSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  searchButton: {
    backgroundColor: '#ec4899',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
  },
  clearSearchText: {
    fontSize: 13,
    color: '#ec4899',
    fontWeight: '500' as const,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#94a3b8',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 20,
    paddingTop: 4,
    gap: 10,
  },
  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardClientInfo: {
    flex: 1,
    marginRight: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 13,
    color: '#64748b',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cardTags: {
    flexDirection: 'row',
    gap: 8,
  },
  noShowTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noShowTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  autoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  autoTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8b5cf6',
  },
  manualTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fdf2f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  manualTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#ec4899',
  },
  filterBlockedRow: {
    marginTop: 12,
  },
  filterBlockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  filterBlockedButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  filterBlockedText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  filterBlockedTextActive: {
    color: '#fff',
  },
  blockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  blockedTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#dc2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  modalScroll: {
    maxHeight: 450,
  },
  detailClientHeader: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  detailClientName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  detailClientPhone: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  globalRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  globalRatingLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  globalRatingValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#ec4899',
  },
  detailRatingOverview: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fdf2f8',
    marginHorizontal: 20,
    borderRadius: 14,
    marginBottom: 16,
  },
  detailRatingNumber: {
    fontSize: 44,
    fontWeight: '700' as const,
    color: '#ec4899',
    marginBottom: 8,
  },
  detailStars: {
    flexDirection: 'row',
    gap: 6,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  detailInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailInfoText: {
    fontSize: 13,
    color: '#64748b',
  },
  detailNoShowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fef2f2',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  detailNoShowText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ef4444',
    flex: 1,
  },
  detailAutoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f5f3ff',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  detailAutoText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8b5cf6',
    flex: 1,
  },
  detailCriteria: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  detailCriteriaTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 14,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  criteriaName: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    marginRight: 12,
  },
  criteriaStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  criteriaValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#475569',
    marginLeft: 6,
    minWidth: 16,
    textAlign: 'right',
  },
  closeButton: {
    backgroundColor: '#ec4899',
    margin: 20,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  modalFooterButtons: {
    padding: 20,
    gap: 12,
  },
  unblockButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  unblockButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  prefixModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '75%',
  },
  prefixSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  prefixSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  prefixList: {
    maxHeight: 400,
  },
  prefixOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  prefixOptionSelected: {
    backgroundColor: '#fdf2f8',
  },
  prefixFlag: {
    fontSize: 22,
  },
  prefixInfo: {
    flex: 1,
  },
  prefixCountry: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#0f172a',
  },
  prefixCode: {
    fontSize: 13,
    color: '#64748b',
  },
  prefixCheckmark: {
    fontSize: 18,
    color: '#ec4899',
    fontWeight: '700' as const,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#ec4899',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#ec4899',
  },
  vipContent: {
    flex: 1,
  },
  vipHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  addVipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ec4899',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addVipButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  vipInfoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  vipModalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  vipSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 12,
  },
  vipSectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  clientSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef9e7',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  clientSelectedInfo: {
    flex: 1,
  },
  clientSelectedName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 2,
  },
  clientSelectedPhone: {
    fontSize: 13,
    color: '#64748b',
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  tableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tableChipSelected: {
    backgroundColor: '#fdf2f8',
    borderColor: '#ec4899',
  },
  tableChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  tableChipTextSelected: {
    color: '#ec4899',
  },
  tableChipCapacity: {
    fontSize: 12,
    color: '#94a3b8',
  },
  vipNotesInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
    minHeight: 100,
  },
  detailBlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fef2f2',
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  detailBlockedText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#dc2626',
    flex: 1,
  },
  blockedClientCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginBottom: 8,
  },
  blockedClientLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 12,
  },
  blockedClientIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  blockedClientInfo: {
    flex: 1,
  },
  blockedClientName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 2,
  },
  blockedClientPhone: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  blockedClientDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  unblockBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  unblockBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  foundClientCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#16a34a',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  foundClientInfo: {
    flex: 1,
  },
  foundClientLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#16a34a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  foundClientName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  foundClientPhone: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 1,
  },
  foundClientStatus: {
    fontSize: 12,
    color: '#16a34a',
    marginTop: 3,
  },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  blockBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  notFoundCard: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  notFoundText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
});

