import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, Search, Filter, ChevronDown, User, Building2, Settings, LogIn, Trash2, Edit2, Eye, Key } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn size={16} color="#3b82f6" strokeWidth={2} />,
  create_subadmin: <User size={16} color="#10b981" strokeWidth={2} />,
  update_subadmin: <Edit2 size={16} color="#f59e0b" strokeWidth={2} />,
  delete_subadmin: <Trash2 size={16} color="#ef4444" strokeWidth={2} />,
  support_access: <Key size={16} color="#8b5cf6" strokeWidth={2} />,
  create_restaurant: <Building2 size={16} color="#10b981" strokeWidth={2} />,
  update_restaurant: <Edit2 size={16} color="#f59e0b" strokeWidth={2} />,
  delete_restaurant: <Trash2 size={16} color="#ef4444" strokeWidth={2} />,
};

const ACTION_LABELS: Record<string, string> = {
  login: 'Inicio de sesión',
  create_subadmin: 'Creó sub-admin',
  update_subadmin: 'Editó sub-admin',
  delete_subadmin: 'Eliminó sub-admin',
  support_access: 'Acceso soporte restaurante',
  create_restaurant: 'Creó restaurante',
  update_restaurant: 'Editó restaurante',
  delete_restaurant: 'Eliminó restaurante',
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  superadmin: { bg: '#fef3c7', text: '#92400e' },
  subadmin: { bg: '#dbeafe', text: '#1e40af' },
  admin: { bg: '#f3e8ff', text: '#7c3aed' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function AuditLogScreen() {
  const insets = useSafeAreaInsets();
  const [sessionId, setSessionId] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('adminSession').then(s => { if (s) setSessionId(s); });
  }, []);

  const auditQuery = trpc.adminAudit.list.useQuery(
    { sessionId, limit: 200, offset: 0 },
    { enabled: !!sessionId }
  );

  const logs = auditQuery.data?.logs || [];

  const filtered = logs.filter((log: any) => {
    const matchSearch = !search ||
      log.admin_name?.toLowerCase().includes(search.toLowerCase()) ||
      (ACTION_LABELS[log.action] || log.action).toLowerCase().includes(search.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || log.admin_type === filterType;
    return matchSearch && matchType;
  });

  const stats = {
    total: logs.length,
    superadmin: logs.filter((l: any) => l.admin_type === 'superadmin').length,
    subadmin: logs.filter((l: any) => l.admin_type === 'subadmin').length,
    supportAccess: logs.filter((l: any) => l.action === 'support_access').length,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Registro de Actividad</Text>
        <Text style={styles.headerSubtitle}>{auditQuery.data?.total || 0} eventos registrados</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statPill, { backgroundColor: '#fef3c7' }]}>
          <Text style={[styles.statPillValue, { color: '#92400e' }]}>{stats.superadmin}</Text>
          <Text style={[styles.statPillLabel, { color: '#92400e' }]}>SuperAdmin</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: '#dbeafe' }]}>
          <Text style={[styles.statPillValue, { color: '#1e40af' }]}>{stats.subadmin}</Text>
          <Text style={[styles.statPillLabel, { color: '#1e40af' }]}>Sub-admins</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: '#f3e8ff' }]}>
          <Text style={[styles.statPillValue, { color: '#7c3aed' }]}>{stats.supportAccess}</Text>
          <Text style={[styles.statPillLabel, { color: '#7c3aed' }]}>Accesos soporte</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94a3b8" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar eventos..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilter && styles.filterButtonActive]}
          onPress={() => setShowFilter(!showFilter)}
          activeOpacity={0.7}
        >
          <Filter size={18} color={showFilter ? '#3b82f6' : '#64748b'} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {showFilter && (
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'superadmin', label: 'SuperAdmin' },
            { key: 'subadmin', label: 'Sub-admin' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filterType === f.key && styles.filterChipActive]}
              onPress={() => setFilterType(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filterType === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {auditQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Cargando registro...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList size={64} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Sin eventos</Text>
            <Text style={styles.emptyText}>No hay actividad registrada</Text>
          </View>
        ) : (
          filtered.map((log: any) => {
            const typeColor = TYPE_COLORS[log.admin_type] || TYPE_COLORS['admin'];
            const icon = ACTION_ICONS[log.action] || <Settings size={16} color="#64748b" strokeWidth={2} />;
            const actionLabel = ACTION_LABELS[log.action] || log.action;

            return (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logLeft}>
                  <View style={styles.logIconCircle}>{icon}</View>
                  <View style={styles.logLine} />
                </View>
                <View style={styles.logContent}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logAction}>{actionLabel}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: typeColor.text }]}>{log.admin_type}</Text>
                    </View>
                  </View>
                  <View style={styles.logMeta}>
                    <User size={12} color="#94a3b8" strokeWidth={2} />
                    <Text style={styles.logMetaText}>{log.admin_name || '—'}</Text>
                    {log.entity_name && (
                      <>
                        <Text style={styles.logMetaDot}>·</Text>
                        <Text style={styles.logMetaText} numberOfLines={1}>{log.entity_name}</Text>
                      </>
                    )}
                  </View>
                  <Text style={styles.logDate}>{formatDate(log.created_at)}</Text>
                  {log.ip_address && (
                    <Text style={styles.logIp}>IP: {log.ip_address}</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  statsRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  statPill: {
    flex: 1, borderRadius: 10, padding: 10, alignItems: 'center',
  },
  statPillValue: { fontSize: 20, fontWeight: '800' as const },
  statPillLabel: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row', gap: 8, padding: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  filterButton: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  filterButtonActive: { backgroundColor: '#dbeafe' },
  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: '#fff',
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  filterChipText: { fontSize: 13, fontWeight: '500' as const, color: '#64748b' },
  filterChipTextActive: { color: '#1d4ed8', fontWeight: '600' as const },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  loadingContainer: { alignItems: 'center', paddingVertical: 64 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, color: '#0f172a', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b' },
  logCard: { flexDirection: 'row', marginBottom: 0 },
  logLeft: { alignItems: 'center', marginRight: 12, width: 32 },
  logIconCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  logLine: { flex: 1, width: 1, backgroundColor: '#e2e8f0', marginTop: 4 },
  logContent: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9',
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  logAction: { fontSize: 14, fontWeight: '600' as const, color: '#0f172a', flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' as const },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  logMetaText: { fontSize: 12, color: '#64748b', flex: 1 },
  logMetaDot: { fontSize: 12, color: '#94a3b8' },
  logDate: { fontSize: 11, color: '#94a3b8' },
  logIp: { fontSize: 11, color: '#c4b5fd', marginTop: 2 },
});
