import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFullSessionData, clearSupportSession, isSupportSession } from '@/lib/restaurantSession';
import {
  CalendarDays,
  Settings,
  Grid3X3,
  Clock,
  Star,
  CreditCard,
  LogOut,
  Store,
  ChevronRight,
  RefreshCw,
  Plus,
  LayoutGrid,
  ClipboardList,
  QrCode,
  Gamepad2,
} from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}


export default function RestaurantDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState<string>('');
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    void loadRestaurantData();
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        void checkForUpdates();
        setupServiceWorkerListeners();
      } catch (err) {
        console.error('[Dashboard] Error setting up web features:', err);
      }
    }
  }, []);

  const checkForUpdates = async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      console.log('[Update] Checking for updates...');
      setIsUpdating(true);
      
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        swRegistrationRef.current = registration;
        
        await registration.update();
        
        if (registration.waiting) {
          console.log('[Update] New version waiting to install');
          applyUpdate(registration.waiting);
        }
      }
    } catch (error) {
      console.error('[Update] Error checking for updates:', error);
    } finally {
      setTimeout(() => setIsUpdating(false), 1000);
    }
  };

  const applyUpdate = (worker: ServiceWorker) => {
    setShowUpdateModal(true);
    
    worker.postMessage({ type: 'SKIP_WAITING' });
    
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[Update] Controller changed, reloading...');
      window.location.reload();
    });
  };

  const setupServiceWorkerListeners = () => {
    try {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return;
      }

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('[SW] Received update notification, version:', event.data.version);
          setShowUpdateModal(true);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      });

      navigator.serviceWorker.ready.then((registration) => {
        swRegistrationRef.current = registration;
        
        registration.addEventListener('updatefound', () => {
          console.log('[SW] Update found!');
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New version installed and ready');
                applyUpdate(newWorker);
              }
            });
          }
        });
      }).catch((err) => {
        console.error('[SW] Error in service worker ready:', err);
      });
    } catch (err) {
      console.error('[SW] Error setting up listeners:', err);
    }
  };

  const loadRestaurantData = async () => {
    try {
      console.log('[Dashboard] Loading restaurant data from storage...');
      const { restaurantId: id, restaurantName: name, restaurantSlug: slug } = await getFullSessionData();
      console.log('[Dashboard] Loaded: id=', id, 'name=', name, 'slug=', slug, 'support=', isSupportSession());
      setRestaurantId(id);
      setRestaurantName(name || 'Mi Restaurante');
      setRestaurantSlug(slug || '');
    } catch (error) {
      console.error('[Dashboard] Error loading restaurant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const restaurantsQuery = trpc.restaurants.list.useQuery(
    {},
    { enabled: !!restaurantId, retry: 2 }
  );
  const subscriptionPlansQuery = trpc.subscriptionPlans.list.useQuery(
    undefined,
    { enabled: !!restaurantId, retry: 2 }
  );
  const modulesListQuery = trpc.modules.list.useQuery(
    undefined,
    { enabled: !!restaurantId, retry: 2 }
  );

  const menuItems: MenuItem[] = [
    {
      id: 'reservations-pro',
      title: 'Reservas PRO',
      description: 'Gestiona todas las reservas del día',
      icon: <CalendarDays size={28} color="#fff" />,
      route: '/restaurant/reservations-pro',
      color: '#10B981',
    },
    {
      id: 'comandas',
      title: 'Comandas',
      description: '1 monitor cocina, 1 PC/Caja, 1 comandera',
      icon: <ClipboardList size={28} color="#fff" />,
      route: '/restaurant/comandas',
      color: '#F97316',
    },
    {
      id: 'comandas-pro',
      title: 'Comandas Pro',
      description: '2 monitores cocina, 2 PC/Caja, 3 comanderas',
      icon: <ClipboardList size={28} color="#fff" />,
      route: '/restaurant/comandas',
      color: '#8B5CF6',
    },
    {
      id: 'carta-digital',
      title: 'Carta Digital',
      description: 'Gestión de carta online y QR',
      icon: <QrCode size={28} color="#fff" />,
      route: '/restaurant/carta-digital',
      color: '#0EA5E9',
    },
    {
      id: 'reservations',
      title: 'Reservas',
      description: 'Vista clásica de reservas',
      icon: <CalendarDays size={28} color="#fff" />,
      route: '/restaurant/reservations',
      color: '#3B82F6',
    },
    {
      id: 'tables',
      title: 'Mesas',
      description: 'Configura las mesas del restaurante',
      icon: <Grid3X3 size={28} color="#fff" />,
      route: '/restaurant/tables',
      color: '#8B5CF6',
    },
    {
      id: 'schedules',
      title: 'Horarios',
      description: 'Define turnos y horarios',
      icon: <Clock size={28} color="#fff" />,
      route: '/restaurant/schedules',
      color: '#F59E0B',
    },
    {
      id: 'ratings',
      title: 'Valoraciones + VIP + Bloqueos',
      description: 'Consulta las opiniones de clientes',
      icon: <Star size={28} color="#fff" />,
      route: '/restaurant/ratings',
      color: '#EC4899',
    },
    {
      id: 'deposits',
      title: 'Fianzas',
      description: 'Gestión de depósitos y pagos',
      icon: <CreditCard size={28} color="#fff" />,
      route: '/restaurant/deposits',
      color: '#06B6D4',
    },
    {
      id: 'config',
      title: 'Configuración',
      description: 'Datos del restaurante',
      icon: <Settings size={28} color="#fff" />,
      route: '/restaurant/config',
      color: '#6366F1',
    },
    {
      id: 'config-pro',
      title: 'Configuración PRO',
      description: 'Opciones avanzadas',
      icon: <Settings size={28} color="#fff" />,
      route: '/restaurant/config-pro',
      color: '#EF4444',
    },
    {
      id: 'game-chef',
      title: 'Juego Chef',
      description: 'Gamificación y QR para clientes',
      icon: <Gamepad2 size={28} color="#fff" />,
      route: '/restaurant/game-chef',
      color: '#FF6B35',
    },
  ];

  const enabledModuleRoutes = useMemo(() => {
    try {
      if (!restaurantId || !restaurantsQuery.data || !subscriptionPlansQuery.data || !modulesListQuery.data) {
        console.log('[Dashboard] Module data not ready yet, showing all items');
        return null;
      }
      const restaurant = restaurantsQuery.data.find((r: any) => r.id === restaurantId);
      if (!restaurant?.subscriptionPlanId) {
        console.log('[Dashboard] No subscription plan found, showing all items');
        return null;
      }
      const plan = subscriptionPlansQuery.data.find((p: any) => p.id === restaurant.subscriptionPlanId);
      if (!plan?.enabledModules || plan.enabledModules.length === 0) {
        console.log('[Dashboard] No enabled modules in plan, showing all items');
        return null;
      }
      const enabledModuleIds = new Set(plan.enabledModules);
      const routes = new Set<string>();
      modulesListQuery.data.forEach((m: any) => {
        if (enabledModuleIds.has(m.id) && m.route) {
          routes.add(m.route);
        }
      });
      console.log('[Dashboard] Enabled module routes:', Array.from(routes));
      return routes.size > 0 ? routes : null;
    } catch (err) {
      console.error('[Dashboard] Error computing enabled modules:', err);
      return null;
    }
  }, [restaurantId, restaurantsQuery.data, subscriptionPlansQuery.data, modulesListQuery.data]);

  const filteredMenuItems = useMemo(() => {
    if (!enabledModuleRoutes) return menuItems;
    return menuItems.filter(item => enabledModuleRoutes.has(item.route));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledModuleRoutes]);

  const showQuickActions = useMemo(() => {
    if (!enabledModuleRoutes) return true;
    return enabledModuleRoutes.has('/restaurant/reservations-pro');
  }, [enabledModuleRoutes]);

  const handleAddReservation = useCallback(() => {
    if (restaurantSlug) {
      router.push(`/client/restaurant2/${restaurantSlug}` as any);
    } else if (restaurantId) {
      router.push(`/client/restaurant2/${restaurantId}` as any);
    } else {
      Alert.alert('Error', 'No se pudo obtener la información del restaurante');
    }
  }, [restaurantSlug, restaurantId, router]);

  const handlePlanningToday = useCallback(() => {
    router.push('/restaurant/planning-today' as any);
  }, [router]);

  const handleNavigate = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      if (isSupportSession()) {
        clearSupportSession();
      } else {
        await AsyncStorage.removeItem('restaurantSession');
        await AsyncStorage.removeItem('restaurantId');
        await AsyncStorage.removeItem('restaurantName');
      }
      router.replace('/restaurant' as any);
    } catch (error) {
      console.error('[Dashboard] Error al cerrar sesión:', error);
    }
  }, [router]);

  const handleManualRefresh = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    
    setIsUpdating(true);
    
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[Update] Caches cleared');
      }
      
      if (swRegistrationRef.current) {
        await swRegistrationRef.current.update();
      }
      
      window.location.reload();
    } catch (error) {
      console.error('[Update] Error during manual refresh:', error);
      window.location.reload();
    }
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Cargando panel...</Text>
      </View>
    );
  }

  if (!restaurantId) {
    return (
      <View style={styles.loadingContainer}>
        <Store size={48} color="#9CA3AF" />
        <Text style={styles.errorTitle}>Sesión no encontrada</Text>
        <Text style={styles.errorText}>Por favor, inicia sesión de nuevo</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.replace('/restaurant' as any)}
        >
          <Text style={styles.errorButtonText}>Ir al login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Modal
        visible={showUpdateModal}
        transparent
        animationType="fade"
      >
        <View style={styles.updateModalOverlay}>
          <View style={styles.updateModalContent}>
            <RefreshCw size={48} color="#10B981" style={styles.updateIcon} />
            <Text style={styles.updateTitle}>Actualizando</Text>
            <Text style={styles.updateText}>
              Se está aplicando una nueva versión del sistema...
            </Text>
            <ActivityIndicator size="large" color="#10B981" style={styles.updateSpinner} />
          </View>
        </View>
      </Modal>



      {isUpdating && !showUpdateModal && (
        <View style={styles.updateBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.updateBannerText}>Buscando actualizaciones...</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Store size={40} color="#10B981" />
          </View>
          <Text style={styles.restaurantName}>{restaurantName}</Text>
          <Text style={styles.welcomeText}>Panel de Gestión</Text>
        </View>

        {showQuickActions && (
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleAddReservation}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIconContainer}>
                <Plus size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>Añadir Reserva</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, styles.quickActionButtonSecondary]}
              onPress={handlePlanningToday}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIconContainer, styles.quickActionIconSecondary]}>
                <LayoutGrid size={24} color="#fff" />
              </View>
              <Text style={[styles.quickActionText, styles.quickActionTextSecondary]}>Planning de Hoy</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.menuGrid}>
          {filteredMenuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                {item.icon}
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomButtonsContainer}>
          {isWeb && (
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={handleManualRefresh}
              activeOpacity={0.7}
            >
              <RefreshCw size={20} color="#3B82F6" />
              <Text style={styles.refreshText}>Actualizar Sistema</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 10,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionButtonSecondary: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
  },
  quickActionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionIconSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  quickActionTextSecondary: {
    color: '#fff',
  },
  menuGrid: {
    gap: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  bottomButtonsContainer: {
    marginTop: 32,
    gap: 12,
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  refreshText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#3B82F6',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  updateBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  updateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  updateModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  updateIcon: {
    marginBottom: 16,
  },
  updateTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 8,
  },
  updateText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  updateSpinner: {
    marginTop: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  errorText: {
    marginTop: 8,
    fontSize: 15,
    color: '#6B7280',
  },
  errorButton: {
    marginTop: 24,
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
