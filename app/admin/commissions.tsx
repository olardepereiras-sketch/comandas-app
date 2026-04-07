import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { DollarSign, Calendar, Filter, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';

export default function AdminCommissionsScreen() {
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const salesRepsQuery = trpc.salesReps.list.useQuery();
  const commissionsQuery = trpc.stats.salesRepCommissions.useQuery({
    salesRepId: selectedSalesRep || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const salesReps = salesRepsQuery.data || [];
  const commissions = commissionsQuery.data || [];

  const totalCommissions = commissions.reduce((sum, rep) => sum + rep.totalCommission, 0);

  const clearFilters = () => {
    setSelectedSalesRep('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Comisiones de Comerciales',
          headerStyle: { backgroundColor: '#8b5cf6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Comisiones</Text>
            <Text style={styles.headerSubtitle}>
              Total: {totalCommissions.toFixed(2)}€
            </Text>
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.filterButtonGradient}
            >
              <Filter size={20} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersCard}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Filtros</Text>
              {(selectedSalesRep || startDate || endDate) && (
                <TouchableOpacity onPress={clearFilters} activeOpacity={0.7}>
                  <Text style={styles.clearFiltersText}>Limpiar</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Comercial</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.salesRepChipsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.salesRepChip,
                      !selectedSalesRep && styles.salesRepChipSelected,
                    ]}
                    onPress={() => setSelectedSalesRep('')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.salesRepChipText,
                        !selectedSalesRep && styles.salesRepChipTextSelected,
                      ]}
                    >
                      Todos
                    </Text>
                  </TouchableOpacity>
                  {salesReps.map((rep) => (
                    <TouchableOpacity
                      key={rep.id}
                      style={[
                        styles.salesRepChip,
                        selectedSalesRep === rep.id && styles.salesRepChipSelected,
                      ]}
                      onPress={() => setSelectedSalesRep(rep.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.salesRepChipText,
                          selectedSalesRep === rep.id && styles.salesRepChipTextSelected,
                        ]}
                      >
                        {rep.firstName} {rep.lastName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Fecha Inicio</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Fecha Fin</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {commissionsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Cargando comisiones...</Text>
            </View>
          ) : commissions.length === 0 ? (
            <View style={styles.emptyState}>
              <DollarSign size={64} color="#cbd5e1" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No hay comisiones</Text>
              <Text style={styles.emptyText}>
                No se encontraron comisiones para los filtros seleccionados
              </Text>
            </View>
          ) : (
            commissions.map((rep) => (
              <View key={rep.salesRepId} style={styles.repCard}>
                <View style={styles.repHeader}>
                  <View>
                    <Text style={styles.repName}>
                      {rep.firstName} {rep.lastName}
                    </Text>
                    <Text style={styles.repStats}>
                      {rep.restaurants.length} restaurante(s)
                    </Text>
                  </View>
                  <View style={styles.totalCommissionBadge}>
                    <Text style={styles.totalCommissionAmount}>
                      {rep.totalCommission.toFixed(2)}€
                    </Text>
                  </View>
                </View>

                {rep.restaurants.map((restaurant: any) => (
                  <View key={restaurant.restaurantId} style={styles.restaurantRow}>
                    <View style={styles.restaurantInfo}>
                      <Text style={styles.restaurantName}>
                        {restaurant.restaurantName}
                      </Text>
                      <Text style={styles.restaurantMeta}>
                        {restaurant.commissionType} • {restaurant.monthlyPrice}€/mes × {restaurant.durationMonths} meses
                      </Text>
                      <Text style={styles.restaurantTotal}>
                        Total contrato: {restaurant.totalContract.toFixed(2)}€
                      </Text>
                    </View>
                    <View style={styles.commissionInfo}>
                      <Text style={styles.commissionPercent}>
                        {restaurant.commissionPercent}%
                      </Text>
                      <Text style={styles.commissionAmount}>
                        {restaurant.commission.toFixed(2)}€
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  filterButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterButtonGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8b5cf6',
  },
  formGroup: {
    marginBottom: 16,
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
  salesRepChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  salesRepChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  salesRepChipSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  salesRepChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  salesRepChipTextSelected: {
    color: '#7c3aed',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
  repCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  repHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  repName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  repStats: {
    fontSize: 13,
    color: '#64748b',
  },
  totalCommissionBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  totalCommissionAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#7c3aed',
  },
  restaurantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  restaurantInfo: {
    flex: 1,
    marginRight: 16,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  restaurantMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  restaurantTotal: {
    fontSize: 12,
    color: '#94a3b8',
  },
  commissionInfo: {
    alignItems: 'flex-end',
  },
  commissionPercent: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8b5cf6',
    marginBottom: 4,
  },
  commissionAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#059669',
  },
});
