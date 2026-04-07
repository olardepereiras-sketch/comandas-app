import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Animated,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import {
  ArrowLeft,
  Save,
  ChevronRight,
  LayoutGrid,
  Info,
  Check,
} from 'lucide-react-native';

interface FloorItem {
  tableId: string;
  tableName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: string;
}

const CANVAS_WIDTH = Math.min(Dimensions.get('window').width - 32, 500);
const CANVAS_HEIGHT = 340;
const SNAP = 10;

function snap(val: number) {
  return Math.round(val / SNAP) * SNAP;
}

function DraggableTable({ item, isSelected, onSelect, onPositionChange }: {
  item: FloorItem;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (id: string, x: number, y: number) => void;
}) {
  const posAnim = useRef(new Animated.ValueXY({ x: item.x, y: item.y })).current;
  const lastPos = useRef({ x: item.x, y: item.y });

  useEffect(() => {
    posAnim.setValue({ x: item.x, y: item.y });
    lastPos.current = { x: item.x, y: item.y };
  }, [item.x, item.y]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect();
        posAnim.setOffset({ x: lastPos.current.x, y: lastPos.current.y });
        posAnim.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: posAnim.x, dy: posAnim.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        const rawX = lastPos.current.x + gesture.dx;
        const rawY = lastPos.current.y + gesture.dy;
        const newX = Math.max(0, Math.min(snap(rawX), CANVAS_WIDTH - item.width));
        const newY = Math.max(0, Math.min(snap(rawY), CANVAS_HEIGHT - item.height));
        posAnim.flattenOffset();
        posAnim.setValue({ x: newX, y: newY });
        lastPos.current = { x: newX, y: newY };
        onPositionChange(item.tableId, newX, newY);
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.draggableTable,
        {
          width: item.width,
          height: item.height,
          borderRadius: item.shape === 'circle' ? item.width / 2 : 8,
          borderColor: isSelected ? '#F97316' : '#64748B',
          backgroundColor: isSelected ? '#FFF7ED' : '#F1F5F9',
          transform: [
            { translateX: posAnim.x },
            { translateY: posAnim.y },
          ],
        },
      ]}
    >
      <Text style={[styles.draggableTableText, isSelected && styles.draggableTableTextActive]} numberOfLines={1}>
        {item.tableName}
      </Text>
    </Animated.View>
  );
}

export default function FloorConfigScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { restaurantId, restaurantName } = useLocalSearchParams<{ restaurantId: string; restaurantName: string }>();

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [floorItems, setFloorItems] = useState<FloorItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showShapeModal, setShowShapeModal] = useState(false);

  const locationsQuery = trpc.locations.list.useQuery(
    { restaurantId: restaurantId ?? '' },
    { enabled: !!restaurantId }
  );

  const tablesQuery = trpc.tables.list.useQuery(
    { restaurantId: restaurantId ?? '', locationId: selectedLocationId ?? undefined },
    { enabled: !!restaurantId && !!selectedLocationId }
  );

  const floorPlanQuery = trpc.comandas.getFloorPlan.useQuery(
    { restaurantId: restaurantId ?? '', locationId: selectedLocationId ?? '' },
    { enabled: !!restaurantId && !!selectedLocationId }
  );

  const saveFloorPlanMutation = trpc.comandas.saveFloorPlan.useMutation();

  useEffect(() => {
    if (!tablesQuery.data || !selectedLocationId) return;
    const savedPlan = floorPlanQuery.data?.planData ?? [];

    const items: FloorItem[] = (tablesQuery.data as any[]).map((table: any, idx: number): FloorItem => {
      const saved = (savedPlan as any[]).find((s: any) => s.tableId === table.id);
      if (saved) {
        return {
          tableId: table.id,
          tableName: table.name,
          x: saved.x,
          y: saved.y,
          width: saved.width,
          height: saved.height,
          rotation: saved.rotation,
          shape: saved.shape,
        };
      }
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      return {
        tableId: table.id,
        tableName: table.name,
        x: 20 + col * 110,
        y: 20 + row * 90,
        width: 80,
        height: 60,
        rotation: 0,
        shape: 'rectangle',
      };
    });
    setFloorItems(items);
  }, [tablesQuery.data, floorPlanQuery.data, selectedLocationId]);

  const handlePositionChange = useCallback((tableId: string, x: number, y: number) => {
    setFloorItems(prev => prev.map(item =>
      item.tableId === tableId ? { ...item, x, y } : item
    ));
  }, []);

  const handleSizeChange = (tableId: string, dw: number, dh: number) => {
    setFloorItems(prev => prev.map(item => {
      if (item.tableId !== tableId) return item;
      return {
        ...item,
        width: Math.max(50, Math.min(item.width + dw, 140)),
        height: Math.max(40, Math.min(item.height + dh, 120)),
      };
    }));
  };

  const handleShapeChange = (shape: string) => {
    if (!selectedTableId) return;
    setFloorItems(prev => prev.map(item =>
      item.tableId === selectedTableId ? { ...item, shape } : item
    ));
    setShowShapeModal(false);
  };

  const handleAutoLayout = () => {
    Alert.alert('Auto-organizar', '¿Reorganizar todas las mesas en una cuadrícula?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Organizar',
        onPress: () => {
          setFloorItems(prev => prev.map((item, idx) => ({
            ...item,
            x: 20 + (idx % 4) * 115,
            y: 20 + Math.floor(idx / 4) * 85,
          })));
        }
      }
    ]);
  };

  const handleSave = async () => {
    if (!restaurantId || !selectedLocationId) return;
    setIsSaving(true);
    try {
      await saveFloorPlanMutation.mutateAsync({
        restaurantId,
        locationId: selectedLocationId,
        planData: floorItems.map(item => ({
          tableId: item.tableId,
          tableName: item.tableName,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
          shape: item.shape as 'rectangle' | 'circle',
        })),
      });
      Alert.alert('✅ Guardado', 'El plano ha sido guardado correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el plano.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedItem = floorItems.find(i => i.tableId === selectedTableId);

  if (!selectedLocationId) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle}>Configurar Plano</Text>
            <Text style={styles.topBarSub}>{restaurantName || 'Restaurante'}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.locationsContent}>
          <View style={styles.infoBox}>
            <Info size={16} color="#3B82F6" />
            <Text style={styles.infoText}>
              Selecciona una ubicación para configurar el plano de mesas. Podrás arrastrar las mesas para colocarlas en su posición real.
            </Text>
          </View>
          <Text style={styles.sectionTitle}>Selecciona una ubicación</Text>
          {locationsQuery.isLoading ? (
            <ActivityIndicator color="#F97316" size="large" style={{ marginTop: 40 }} />
          ) : (locationsQuery.data ?? []).length === 0 ? (
            <View style={styles.emptyState}>
              <LayoutGrid size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No hay ubicaciones configuradas</Text>
              <Text style={styles.emptySubText}>Crea ubicaciones en el módulo de Mesas primero.</Text>
            </View>
          ) : (
            (locationsQuery.data as any[] ?? []).map((loc: any) => (
              <TouchableOpacity
                key={loc.id}
                style={styles.locationCard}
                onPress={() => { setSelectedLocationId(loc.id); setSelectedLocationName(loc.name); }}
                testID={`location-${loc.id}`}
              >
                <View>
                  <Text style={styles.locationName}>{loc.name}</Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedLocationId(null); setSelectedTableId(null); }}>
          <ArrowLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>{selectedLocationName}</Text>
          <Text style={styles.topBarSub}>Arrastra las mesas para posicionarlas</Text>
        </View>
        <TouchableOpacity style={styles.autoBtn} onPress={handleAutoLayout}>
          <LayoutGrid size={14} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={14} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Guardar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.canvasWrapper}>
        <View style={[styles.canvas, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }]}>
          {Array.from({ length: Math.floor(CANVAS_HEIGHT / SNAP) }).map((_, i) =>
            i % 5 === 0 ? (
              <View key={`h${i}`} style={[styles.gridLine, styles.gridLineH, { top: i * SNAP }]} />
            ) : null
          )}
          {Array.from({ length: Math.floor(CANVAS_WIDTH / SNAP) }).map((_, i) =>
            i % 5 === 0 ? (
              <View key={`v${i}`} style={[styles.gridLine, styles.gridLineV, { left: i * SNAP }]} />
            ) : null
          )}
          {floorItems.map(item => (
            <DraggableTable
              key={item.tableId}
              item={item}
              isSelected={selectedTableId === item.tableId}
              onSelect={() => setSelectedTableId(item.tableId)}
              onPositionChange={handlePositionChange}
            />
          ))}
          {floorItems.length === 0 && (
            <View style={styles.canvasEmpty}>
              <Text style={styles.canvasEmptyText}>No hay mesas en esta ubicación</Text>
            </View>
          )}
        </View>
      </View>

      {selectedItem ? (
        <View style={styles.selectedPanel}>
          <View style={styles.selectedPanelHeader}>
            <Text style={styles.selectedTableName}>{selectedItem.tableName}</Text>
            <TouchableOpacity onPress={() => setSelectedTableId(null)}>
              <Text style={styles.deselectText}>Deseleccionar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedControls}>
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>ANCHO</Text>
              <View style={styles.controlRow}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleSizeChange(selectedItem.tableId, -10, 0)}>
                  <Text style={styles.controlBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.controlValue}>{selectedItem.width}</Text>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleSizeChange(selectedItem.tableId, 10, 0)}>
                  <Text style={styles.controlBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.controlDivider} />
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>ALTO</Text>
              <View style={styles.controlRow}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleSizeChange(selectedItem.tableId, 0, -10)}>
                  <Text style={styles.controlBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.controlValue}>{selectedItem.height}</Text>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleSizeChange(selectedItem.tableId, 0, 10)}>
                  <Text style={styles.controlBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.controlDivider} />
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>FORMA</Text>
              <TouchableOpacity style={styles.shapeBtn} onPress={() => setShowShapeModal(true)}>
                <Text style={styles.shapeBtnText}>
                  {selectedItem.shape === 'circle' ? '⬤ Redonda' : '▬ Rectangular'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.controlDivider} />
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>POSICIÓN</Text>
              <Text style={styles.controlValue}>{Math.round(selectedItem.x)}, {Math.round(selectedItem.y)}</Text>
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.hintPanel}>
          <Text style={styles.hintText}>👆 Toca y arrastra una mesa para reposicionarla</Text>
          <Text style={styles.hintSub}>Selecciona una mesa para cambiar su tamaño y forma</Text>
        </View>
      )}

      <Modal visible={showShapeModal} transparent animationType="fade">
        <TouchableOpacity style={styles.shapeModalOverlay} onPress={() => setShowShapeModal(false)}>
          <View style={styles.shapeModalContent}>
            <Text style={styles.shapeModalTitle}>Forma de la mesa</Text>
            {[
              { value: 'rectangle', label: '▬ Rectangular' },
              { value: 'circle', label: '⬤ Redonda' },
            ].map(s => (
              <TouchableOpacity
                key={s.value}
                style={styles.shapeOption}
                onPress={() => handleShapeChange(s.value)}
              >
                <Text style={styles.shapeOptionText}>{s.label}</Text>
                {selectedItem?.shape === s.value && <Check size={16} color="#F97316" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7F4' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: { flex: 1 },
  topBarTitle: { fontSize: 16, fontWeight: '700' as const, color: '#111827' },
  topBarSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  autoBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 80,
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 13, fontWeight: '700' as const, color: '#FFFFFF' },
  locationsContent: { padding: 20, gap: 12 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: '#3B82F6', lineHeight: 19 },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: '#374151', marginBottom: 4 },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '600' as const, color: '#9CA3AF' },
  emptySubText: { fontSize: 13, color: '#D1D5DB', textAlign: 'center' as const },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  locationName: { fontSize: 16, fontWeight: '600' as const, color: '#1F2937' },
  canvasWrapper: {
    padding: 16,
    alignItems: 'center',
  },
  canvas: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#F3F4F6',
  },
  gridLineH: { left: 0, right: 0, height: 1 },
  gridLineV: { top: 0, bottom: 0, width: 1 },
  canvasEmpty: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasEmptyText: { fontSize: 14, color: '#D1D5DB' },
  draggableTable: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  draggableTableText: { fontSize: 11, fontWeight: '700' as const, color: '#374151', textAlign: 'center' as const },
  draggableTableTextActive: { color: '#F97316' },
  selectedPanel: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 14,
    gap: 10,
  },
  selectedPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedTableName: { fontSize: 15, fontWeight: '700' as const, color: '#111827' },
  deselectText: { fontSize: 13, color: '#9CA3AF' },
  selectedControls: { gap: 16, paddingVertical: 4, alignItems: 'center' },
  controlGroup: { alignItems: 'center', gap: 4 },
  controlLabel: { fontSize: 9, fontWeight: '800' as const, color: '#9CA3AF', letterSpacing: 1 },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: { fontSize: 18, fontWeight: '700' as const, color: '#374151' },
  controlValue: { fontSize: 14, fontWeight: '700' as const, color: '#1F2937', minWidth: 32, textAlign: 'center' as const },
  controlDivider: { width: 1, height: 40, backgroundColor: '#F3F4F6' },
  shapeBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shapeBtnText: { fontSize: 12, fontWeight: '600' as const, color: '#374151' },
  hintPanel: {
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  hintText: { fontSize: 13, color: '#6B7280', fontWeight: '500' as const },
  hintSub: { fontSize: 12, color: '#9CA3AF' },
  shapeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shapeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: 240,
    gap: 4,
  },
  shapeModalTitle: { fontSize: 16, fontWeight: '700' as const, color: '#111827', marginBottom: 8 },
  shapeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  shapeOptionText: { fontSize: 15, color: '#374151' },
});
