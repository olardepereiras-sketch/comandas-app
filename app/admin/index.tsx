import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import {
  Building2, MapPin, Users, Settings, Package,
  TrendingUp, Star, Calendar, AlertTriangle,
  MessageSquare, UserCog,
  ClipboardList, LogOut, Radio, CreditCard,
  Cpu, HardDrive, Activity, Server
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';

const ALL_OPTIONS = [
  { key: 'restaurants', title: 'Gestión de Restaurantes', description: 'Crear, editar y administrar restaurantes', icon: Building2, color: '#3b82f6', superAdminOnly: false },
  { key: 'locations', title: 'Ubicaciones', description: 'Gestionar provincias y poblaciones', icon: MapPin, color: '#10b981', superAdminOnly: false },
  { key: 'users', title: 'Gestión de Usuarios', description: 'Administrar clientes y permisos', icon: Users, color: '#f59e0b', superAdminOnly: false },
  { key: 'whatsapp', title: 'WhatsApp Web', description: 'Enviar mensajes a usuarios y restaurantes', icon: MessageSquare, color: '#25D366', superAdminOnly: false },
  { key: 'modules', title: 'Módulos y Tarifas', description: 'Configurar módulos disponibles por plan', icon: Package, color: '#8b5cf6', superAdminOnly: false },
  { key: 'rating-criteria', title: 'Criterios de Valoración', description: 'Definir criterios para valorar clientes', icon: Star, color: '#ec4899', superAdminOnly: false },
  { key: 'cuisine-types', title: 'Tipos de Cocina', description: 'Gestionar tipos de cocina por provincia', icon: Package, color: '#f97316', superAdminOnly: false },
  { key: 'statistics', title: 'Estadísticas y Tienda Virtual', description: 'Ver estadísticas, reportes y configurar Stripe', icon: TrendingUp, color: '#06b6d4', superAdminOnly: false },
  { key: 'settings', title: 'Configuración del Sistema', description: 'Ajustes generales de la plataforma', icon: Settings, color: '#64748b', superAdminOnly: false },
  { key: 'commissions', title: 'Comisiones', description: 'Gestionar comisiones de comerciales', icon: TrendingUp, color: '#84cc16', superAdminOnly: false },
  { key: 'whatsapp-worker', title: 'Worker de WhatsApp', description: 'Ver y gestionar notificaciones pendientes de envío', icon: Radio, color: '#25D366', superAdminOnly: false },
  { key: 'whatsapp-pro', title: 'WhatsApp de Pago', description: 'Configurar proveedor, planes de créditos y recargas', icon: CreditCard, color: '#059669', superAdminOnly: false },
  { key: 'whatsapp-inbox', title: 'Chatbot & Bandeja WhatsApp', description: 'Ver conversaciones del chatbot IA y responder manualmente', icon: MessageSquare, color: '#075e54', superAdminOnly: false },
  { key: 'sub-admins', title: 'Sub-administradores', description: 'Crear y gestionar cuentas de acceso', icon: UserCog, color: '#0ea5e9', superAdminOnly: true },
  { key: 'audit-log', title: 'Registro de Actividad', description: 'Ver todos los cambios realizados en el sistema', icon: ClipboardList, color: '#6366f1', superAdminOnly: true },
];

interface VpsBarProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  extra?: string;
}

function VpsBar({ label, value, icon, color, extra }: VpsBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const barColor = clampedValue > 85 ? '#ef4444' : clampedValue > 65 ? '#f59e0b' : color;
  return (
    <View style={styles.vpsBar}>
      <View style={styles.vpsBarHeader}>
        <View style={styles.vpsBarLeft}>
          {icon}
          <Text style={styles.vpsBarLabel}>{label}</Text>
        </View>
        <Text style={[styles.vpsBarValue, { color: barColor }]}>
          {extra ?? `${clampedValue.toFixed(1)}%`}
        </Text>
      </View>
      <View style={styles.vpsBarTrack}>
        <View style={[styles.vpsBarFill, { width: `${clampedValue}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>{icon}</View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [adminName, setAdminName] = useState('');
  const [_sessionId, setSessionId] = useState('');

  const statsQuery = trpc.stats.dashboard.useQuery(undefined, {
    enabled: !isLoading && isSuperAdmin,
  });

  useEffect(() => {
    void checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const session = await AsyncStorage.getItem('adminSession');
      if (!session) {
        router.replace('/admin/login');
        return;
      }
      setSessionId(session);
      const superAdmin = await AsyncStorage.getItem('adminIsSuperAdmin');
      const permsStr = await AsyncStorage.getItem('adminPermissions');
      const name = await AsyncStorage.getItem('adminName');
      setIsSuperAdmin(superAdmin === 'true');
      setPermissions(permsStr ? JSON.parse(permsStr) : []);
      setAdminName(name || '');
      setIsLoading(false);
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      router.replace('/admin/login');
    }
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      await AsyncStorage.multiRemove(['adminSession', 'adminId', 'adminIsSuperAdmin', 'adminPermissions', 'adminName', 'adminUserType']);
      router.replace('/admin/login');
    };
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('¿Cerrar sesión?')) void doLogout();
    } else {
      Alert.alert('Cerrar sesión', '¿Estás seguro?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const handleOptionPress = (key: string) => {
    const routes: Record<string, string> = {
      restaurants: '/admin/restaurants',
      whatsapp: '/admin/whatsapp',
      locations: '/admin/locations',
      commissions: '/admin/commissions',
      users: '/admin/users',
      modules: '/admin/modules',
      'rating-criteria': '/admin/rating-criteria',
      'cuisine-types': '/admin/cuisine-types',
      statistics: '/admin/statistics',
      settings: '/admin/system-config',
      'sub-admins': '/admin/sub-admins',
      'audit-log': '/admin/audit-log',
      'whatsapp-worker': '/admin/whatsapp-worker',
      'whatsapp-pro': '/admin/whatsapp-pro',
      'whatsapp-inbox': '/admin/whatsapp-inbox',
    };
    if (routes[key]) router.push(routes[key] as any);
  };

  const visibleOptions = ALL_OPTIONS.filter(opt => {
    if (isLoading) return false;
    if (opt.superAdminOnly) return isSuperAdmin;
    if (isSuperAdmin) return true;
    return permissions.includes(opt.key);
  });

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="admin-screen">
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Panel de Administración</Text>
              <Text style={styles.headerSubtitle}>
                {adminName ? `Hola, ${adminName}` : 'Quieromesa'}
                {!isSuperAdmin && <Text style={styles.subAdminBadge}> · Sub-admin</Text>}
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <LogOut size={20} color="#64748b" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {!isSuperAdmin && (
            <View style={styles.subAdminInfo}>
              <Text style={styles.subAdminInfoText}>
                Tienes acceso a {permissions.length} módulo{permissions.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {isSuperAdmin && statsQuery.data && (
          <View style={styles.vpsCard}>
            <View style={styles.vpsCardHeader}>
              <Server size={16} color="#64748b" strokeWidth={2} />
              <Text style={styles.vpsCardTitle}>Estado del VPS · 200.234.236.133</Text>
            </View>
            <VpsBar
              label="CPU"
              value={statsQuery.data.systemLoad?.cpu ?? 0}
              color="#3b82f6"
              icon={<Cpu size={13} color="#64748b" strokeWidth={2} />}
            />
            <VpsBar
              label="RAM"
              value={statsQuery.data.systemLoad?.memory ?? 0}
              color="#8b5cf6"
              icon={<Activity size={13} color="#64748b" strokeWidth={2} />}
            />
            <VpsBar
              label="Disco"
              value={statsQuery.data.diskUsage?.percentage ?? 0}
              color="#10b981"
              icon={<HardDrive size={13} color="#64748b" strokeWidth={2} />}
              extra={`${statsQuery.data.diskUsage?.used ?? '?'} usados · ${statsQuery.data.diskUsage?.available ?? '?'} libres`}
            />
          </View>
        )}

        {isSuperAdmin && (
          <View style={styles.statsContainer}>
            {statsQuery.isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : (
              <>
                <View style={styles.statsRow}>
                  <StatCard title="Restaurantes" value={String(statsQuery.data?.restaurants || 0)} icon={<Building2 size={24} color="#3b82f6" strokeWidth={2.5} />} color="#3b82f6" />
                  <StatCard title="Reservas (Hoy)" value={String(statsQuery.data?.todayReservations || 0)} icon={<Calendar size={24} color="#10b981" strokeWidth={2.5} />} color="#10b981" />
                </View>
                <View style={styles.statsRow}>
                  <StatCard title="Clientes" value={String(statsQuery.data?.clients || 0)} icon={<Users size={24} color="#f59e0b" strokeWidth={2.5} />} color="#f59e0b" />
                  <StatCard title="Valoración" value={statsQuery.data?.avgRating || '0.0'} icon={<Star size={24} color="#ec4899" strokeWidth={2.5} />} color="#ec4899" />
                </View>
                <View style={styles.statsRow}>
                  <StatCard title="No Show (Año)" value={String(statsQuery.data?.noShowYear || 0)} icon={<AlertTriangle size={24} color="#ef4444" strokeWidth={2.5} />} color="#ef4444" />
                  <StatCard title="Reservas (Mes)" value={String(statsQuery.data?.monthReservations || 0)} icon={<Calendar size={24} color="#06b6d4" strokeWidth={2.5} />} color="#06b6d4" />
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isSuperAdmin ? 'Gestión Principal' : 'Módulos disponibles'}
          </Text>

          {visibleOptions.length === 0 ? (
            <View style={styles.noPermissions}>
              <Settings size={40} color="#cbd5e1" strokeWidth={1.5} />
              <Text style={styles.noPermissionsText}>Sin módulos asignados</Text>
              <Text style={styles.noPermissionsSubText}>Contacta con el administrador</Text>
            </View>
          ) : (
            visibleOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.optionCard}
                  onPress={() => handleOptionPress(opt.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconContainer, { backgroundColor: opt.color }]}>
                    <Icon size={24} color="#fff" strokeWidth={2.5} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{opt.title}</Text>
                    <Text style={styles.optionDescription}>{opt.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {isSuperAdmin && (
          <View style={styles.infoCard}>
            <LinearGradient colors={['#0ea5e9', '#0284c7']} style={styles.infoGradient}>
              <Text style={styles.infoTitle}>Sistema Activo</Text>
              <Text style={styles.infoText}>Todos los servicios funcionan correctamente</Text>
              <View style={styles.infoStats}>
                <View style={styles.infoStat}>
                  <Text style={styles.infoStatValue}>99.9%</Text>
                  <Text style={styles.infoStatLabel}>Uptime</Text>
                </View>
                <View style={styles.infoStat}>
                  <Text style={styles.infoStatValue}>24/7</Text>
                  <Text style={styles.infoStatLabel}>Disponibilidad</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  header: {
    padding: 20, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitle: { fontSize: 28, fontWeight: '800' as const, color: '#0f172a', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: '#64748b', fontWeight: '500' as const },
  subAdminBadge: { color: '#8b5cf6', fontWeight: '700' as const },
  subAdminInfo: {
    marginTop: 10, backgroundColor: '#f0f9ff', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  subAdminInfoText: { fontSize: 13, color: '#0369a1', fontWeight: '500' as const },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  statsContainer: { padding: 20, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIconContainer: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  statInfo: { flex: 1 },
  statValue: { fontSize: 28, fontWeight: '800' as const, color: '#0f172a', marginBottom: 2 },
  statTitle: { fontSize: 14, color: '#64748b', fontWeight: '500' as const },
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700' as const, color: '#0f172a', marginBottom: 16 },
  optionCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  optionIconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600' as const, color: '#0f172a', marginBottom: 4 },
  optionDescription: { fontSize: 13, color: '#64748b' },
  noPermissions: { alignItems: 'center', paddingVertical: 60 },
  noPermissionsText: { fontSize: 18, fontWeight: '700' as const, color: '#0f172a', marginTop: 16, marginBottom: 8 },
  noPermissionsSubText: { fontSize: 14, color: '#64748b' },
  infoCard: { marginHorizontal: 20, marginTop: 8, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  infoGradient: { padding: 24 },
  infoTitle: { fontSize: 20, fontWeight: '700' as const, color: '#fff', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#e0f2fe', marginBottom: 20 },
  infoStats: { flexDirection: 'row', gap: 32 },
  infoStat: { alignItems: 'center' },
  infoStatValue: { fontSize: 24, fontWeight: '700' as const, color: '#fff', marginBottom: 4 },
  infoStatLabel: { fontSize: 12, color: '#e0f2fe' },
  loadingContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  vpsCard: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    gap: 12,
  },
  vpsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  vpsCardTitle: { fontSize: 12, fontWeight: '600' as const, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  vpsBar: { gap: 6 },
  vpsBarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vpsBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vpsBarLabel: { fontSize: 13, fontWeight: '500' as const, color: '#374151' },
  vpsBarValue: { fontSize: 12, fontWeight: '700' as const },
  vpsBarTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  vpsBarFill: { height: 6, borderRadius: 3 },
});
