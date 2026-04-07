import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Printer,
  Plus,
  Trash2,
  ChevronLeft,
  Wifi,
  Usb,
  CheckCircle,
  AlertCircle,
  Edit3,
  Zap,
} from 'lucide-react-native';
import {
  getPrinters,
  addPrinter,
  updatePrinter,
  deletePrinter,
  getPrinterTypeLabel,
  getPrinterTypeColor,
  type PrinterConfig,
} from '@/lib/printerStorage';
import { printTestTicket } from '@/lib/printService';

type PrinterType = PrinterConfig['type'];
type ConnectionType = PrinterConfig['connectionType'];

interface FormState {
  name: string;
  connectionType: ConnectionType;
  ip: string;
  port: string;
  usbPath: string;
  width: string;
  type: PrinterType;
  enabled: boolean;
}

const DEFAULT_FORM: FormState = {
  name: '',
  connectionType: 'ip',
  ip: '',
  port: '9100',
  usbPath: '/dev/usb/lp0',
  width: '32',
  type: 'cocina',
  enabled: true,
};

const TYPE_OPTIONS: { value: PrinterType; label: string; color: string; desc: string }[] = [
  { value: 'cocina', label: 'Cocina', color: '#E65100', desc: 'Primeros, Segundos, Postres' },
  { value: 'barra', label: 'Barra', color: '#1565C0', desc: 'Bebidas y refrescos' },
  { value: 'otro', label: 'Otro', color: '#546E7A', desc: 'Uso personalizado' },
];

export default function PrintersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getPrinters();
    setPrinters(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setModalVisible(true);
  };

  const openEdit = (p: PrinterConfig) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      connectionType: p.connectionType ?? 'ip',
      ip: p.ip ?? '',
      port: String(p.port ?? 9100),
      usbPath: p.usbPath ?? '/dev/usb/lp0',
      width: String(p.width ?? 32),
      type: p.type,
      enabled: p.enabled,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimName = form.name.trim();
    if (!trimName) {
      Alert.alert('Campo requerido', 'Introduce el nombre de la impresora.');
      return;
    }

    if (form.connectionType === 'ip') {
      const trimIp = form.ip.trim();
      if (!trimIp) {
        Alert.alert('Campo requerido', 'Introduce la dirección IP.');
        return;
      }
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(trimIp)) {
        Alert.alert('IP inválida', 'Introduce una IP válida. Ej: 192.168.1.180');
        return;
      }
      const portNum = parseInt(form.port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        Alert.alert('Puerto inválido', 'El puerto debe ser un número entre 1 y 65535.');
        return;
      }
    } else {
      const trimPath = form.usbPath.trim();
      if (!trimPath) {
        Alert.alert('Campo requerido', 'Introduce la ruta del dispositivo USB.');
        return;
      }
    }

    setSaving(true);
    try {
      const portNum = parseInt(form.port, 10);
      const payload: Omit<PrinterConfig, 'id'> = {
        name: trimName,
        connectionType: form.connectionType,
        ip: form.ip.trim(),
        port: isNaN(portNum) ? 9100 : portNum,
        usbPath: form.usbPath.trim(),
        width: parseInt(form.width, 10) || 32,
        type: form.type,
        enabled: form.enabled,
      };

      if (editingId) {
        await updatePrinter(editingId, payload);
      } else {
        await addPrinter(payload);
      }
      setModalVisible(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p: PrinterConfig) => {
    Alert.alert(
      'Eliminar impresora',
      `¿Seguro que quieres eliminar "${p.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deletePrinter(p.id);
            load();
          },
        },
      ],
    );
  };

  const handleTest = async (p: PrinterConfig) => {
    setTestingId(p.id);
    setTestResults(prev => ({ ...prev, [p.id]: null }));
    try {
      await printTestTicket(p);
      setTestResults(prev => ({ ...prev, [p.id]: true }));
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [p.id]: false }));
      const connInfo =
        (p.connectionType ?? 'ip') === 'usb'
          ? p.usbPath ?? '/dev/usb/lp0'
          : `${p.ip}:${p.port}`;
      Alert.alert(
        'Error de conexión',
        `No se pudo conectar a ${p.name} (${connInfo}).\n\n${err.message}`,
        [{ text: 'OK' }],
      );
    } finally {
      setTestingId(null);
    }
  };

  const isUsb = (p: PrinterConfig) => (p.connectionType ?? 'ip') === 'usb';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#37474F" />
        </TouchableOpacity>
        <Printer size={20} color="#1A1A2E" />
        <Text style={styles.headerTitle}>Impresoras</Text>
        <TouchableOpacity style={styles.headerAdd} onPress={openAdd}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#F97316" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {printers.length === 0 && (
            <View style={styles.emptyWrap}>
              <Printer size={52} color="#BDBDBD" />
              <Text style={styles.emptyTitle}>Sin impresoras</Text>
              <Text style={styles.emptySub}>
                Pulsa el botón + para añadir tu primera impresora.{'\n'}
                Soporta conexión por WiFi/IP y por USB (OTG).
              </Text>
              <TouchableOpacity style={styles.addFirstBtn} onPress={openAdd}>
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.addFirstBtnText}>Añadir Impresora</Text>
              </TouchableOpacity>
            </View>
          )}

          {printers.map(p => {
            const typeColor = getPrinterTypeColor(p.type);
            const typeLabel = getPrinterTypeLabel(p.type);
            const testResult = testResults[p.id];
            const isTesting = testingId === p.id;
            const usbPrinter = isUsb(p);

            return (
              <View key={p.id} style={[styles.card, !p.enabled && styles.cardDisabled]}>
                <View style={[styles.cardTypeBar, { backgroundColor: typeColor }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleRow}>
                      <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
                      <Text style={[styles.cardName, !p.enabled && styles.cardNameDisabled]}>
                        {p.name}
                      </Text>
                      {usbPrinter && (
                        <View style={styles.usbBadge}>
                          <Usb size={10} color="#6A1B9A" />
                          <Text style={styles.usbBadgeText}>USB</Text>
                        </View>
                      )}
                      {!p.enabled && (
                        <View style={styles.disabledBadge}>
                          <Text style={styles.disabledBadgeText}>INACTIVA</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleTest(p)}
                        disabled={isTesting}
                      >
                        {isTesting ? (
                          <ActivityIndicator size="small" color="#F97316" />
                        ) : testResult === true ? (
                          <CheckCircle size={18} color="#2E7D32" />
                        ) : testResult === false ? (
                          <AlertCircle size={18} color="#C62828" />
                        ) : (
                          <Zap size={18} color="#F97316" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(p)}>
                        <Edit3 size={18} color="#546E7A" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(p)}>
                        <Trash2 size={18} color="#C62828" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.cardMeta}>
                    <View style={styles.metaRow}>
                      {usbPrinter ? (
                        <Usb size={13} color="#9E9E9E" />
                      ) : (
                        <Wifi size={13} color="#9E9E9E" />
                      )}
                      <Text style={styles.metaText}>
                        {usbPrinter
                          ? (p.usbPath ?? '/dev/usb/lp0')
                          : `${p.ip}:${p.port ?? 9100}`}
                      </Text>
                    </View>
                    <View style={[styles.typePill, { backgroundColor: typeColor + '22' }]}>
                      <Text style={[styles.typePillText, { color: typeColor }]}>{typeLabel}</Text>
                    </View>
                  </View>

                  {testResult === true && (
                    <View style={styles.successBanner}>
                      <CheckCircle size={13} color="#2E7D32" />
                      <Text style={styles.successBannerText}>Conexión correcta — ticket de prueba impreso</Text>
                    </View>
                  )}
                  {testResult === false && (
                    <View style={styles.errorBanner}>
                      <AlertCircle size={13} color="#C62828" />
                      <Text style={styles.errorBannerText}>
                        {usbPrinter
                          ? 'Sin acceso USB — verifica que la impresora está conectada'
                          : 'Sin conexión — verifica IP y que la impresora esté encendida'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {printers.length > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>ℹ️  Cómo funciona</Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>WiFi/IP:</Text> La tablet y la impresora deben estar en la misma red WiFi.{'\n'}
                <Text style={styles.infoBold}>USB:</Text> Conecta la impresora via cable USB-OTG. Ruta habitual: /dev/usb/lp0.{'\n'}
                Las impresoras <Text style={styles.infoBold}>Cocina</Text> reciben los platos · <Text style={styles.infoBold}>Barra</Text> las bebidas.{'\n'}
                Usa el botón <Text style={styles.infoBold}>⚡</Text> para verificar la conexión.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingId ? 'Editar Impresora' : 'Nueva Impresora'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : (
                <Text style={styles.modalSave}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formSection}>
              <Text style={styles.formSectionLabel}>INFORMACIÓN</Text>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nombre *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Cocina, Barra, Postres..."
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholderTextColor="#9E9E9E"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionLabel}>TIPO DE CONEXIÓN</Text>
              <View style={styles.connTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.connTypeBtn,
                    form.connectionType === 'ip' && styles.connTypeBtnActive,
                  ]}
                  onPress={() => setForm(f => ({ ...f, connectionType: 'ip' }))}
                  activeOpacity={0.8}
                >
                  <Wifi
                    size={18}
                    color={form.connectionType === 'ip' ? '#FFFFFF' : '#546E7A'}
                  />
                  <Text
                    style={[
                      styles.connTypeBtnText,
                      form.connectionType === 'ip' && styles.connTypeBtnTextActive,
                    ]}
                  >
                    WiFi / IP
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.connTypeBtn,
                    form.connectionType === 'usb' && styles.connTypeBtnActiveUsb,
                  ]}
                  onPress={() => setForm(f => ({ ...f, connectionType: 'usb' }))}
                  activeOpacity={0.8}
                >
                  <Usb
                    size={18}
                    color={form.connectionType === 'usb' ? '#FFFFFF' : '#546E7A'}
                  />
                  <Text
                    style={[
                      styles.connTypeBtnText,
                      form.connectionType === 'usb' && styles.connTypeBtnTextActive,
                    ]}
                  >
                    USB (OTG)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {form.connectionType === 'ip' ? (
              <View style={styles.formSection}>
                <Text style={styles.formSectionLabel}>RED</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Dirección IP *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej: 192.168.1.180"
                    value={form.ip}
                    onChangeText={v => setForm(f => ({ ...f, ip: v }))}
                    keyboardType="numeric"
                    placeholderTextColor="#9E9E9E"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Puerto</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="9100"
                      value={form.port}
                      onChangeText={v => setForm(f => ({ ...f, port: v }))}
                      keyboardType="numeric"
                      placeholderTextColor="#9E9E9E"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Ancho (chars)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="32"
                      value={form.width}
                      onChangeText={v => setForm(f => ({ ...f, width: v }))}
                      keyboardType="numeric"
                      placeholderTextColor="#9E9E9E"
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.formSection}>
                <Text style={styles.formSectionLabel}>USB</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Ruta del dispositivo *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="/dev/usb/lp0"
                    value={form.usbPath}
                    onChangeText={v => setForm(f => ({ ...f, usbPath: v }))}
                    placeholderTextColor="#9E9E9E"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Ancho (chars)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="32"
                    value={form.width}
                    onChangeText={v => setForm(f => ({ ...f, width: v }))}
                    keyboardType="numeric"
                    placeholderTextColor="#9E9E9E"
                  />
                </View>
                <View style={styles.usbHintBox}>
                  <Usb size={14} color="#6A1B9A" />
                  <Text style={styles.usbHintText}>
                    Conecta la impresora con un cable USB-OTG. En la mayoría de dispositivos Android la ruta es{' '}
                    <Text style={styles.usbHintBold}>/dev/usb/lp0</Text>. Si tienes varias impresoras prueba{' '}
                    <Text style={styles.usbHintBold}>lp1</Text>, <Text style={styles.usbHintBold}>lp2</Text>, etc.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.formSectionLabel}>TIPO</Text>
              {TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.typeOption,
                    form.type === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '11' },
                  ]}
                  onPress={() => setForm(f => ({ ...f, type: opt.value }))}
                  activeOpacity={0.8}
                >
                  <View style={[styles.typeOptionDot, { backgroundColor: opt.color }]} />
                  <View style={styles.typeOptionText}>
                    <Text style={[styles.typeOptionLabel, form.type === opt.value && { color: opt.color }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.typeOptionDesc}>{opt.desc}</Text>
                  </View>
                  {form.type === opt.value && (
                    <CheckCircle size={18} color={opt.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionLabel}>ESTADO</Text>
              <TouchableOpacity
                style={[styles.toggleRow, form.enabled && styles.toggleRowActive]}
                onPress={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={styles.toggleLabel}>Impresora activa</Text>
                  <Text style={styles.toggleDesc}>Desactiva para ignorar temporalmente</Text>
                </View>
                <View style={[styles.toggle, form.enabled && styles.toggleOn]}>
                  <View style={[styles.toggleThumb, form.enabled && styles.toggleThumbOn]} />
                </View>
              </TouchableOpacity>
            </View>

            {form.connectionType === 'ip' && (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>
                  💡 Puerto <Text style={styles.hintBold}>9100</Text> es el estándar para impresoras ESC/POS (Epson, Star, Bixolon, etc.).{'\n'}
                  Ancho <Text style={styles.hintBold}>32</Text> para papel 58mm · <Text style={styles.hintBold}>48</Text> para papel 80mm.
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    gap: 10,
  },
  headerBack: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700' as const, color: '#1A1A2E' },
  headerAdd: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 12, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: '#37474F' },
  emptySub: { fontSize: 13, color: '#9E9E9E', textAlign: 'center' as const, lineHeight: 20 },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  addFirstBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDisabled: { opacity: 0.6 },
  cardTypeBar: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  cardName: { fontSize: 15, fontWeight: '700' as const, color: '#1A1A2E' },
  cardNameDisabled: { color: '#9E9E9E' },
  usbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3E5F5',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  usbBadgeText: { fontSize: 9, fontWeight: '700' as const, color: '#6A1B9A' },
  disabledBadge: {
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  disabledBadgeText: { fontSize: 9, fontWeight: '700' as const, color: '#757575' },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#757575' },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillText: { fontSize: 11, fontWeight: '700' as const },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  successBannerText: { fontSize: 12, color: '#2E7D32' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  errorBannerText: { fontSize: 12, color: '#C62828' },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  infoTitle: { fontSize: 13, fontWeight: '700' as const, color: '#1565C0', marginBottom: 6 },
  infoText: { fontSize: 12, color: '#1565C0', lineHeight: 20 },
  infoBold: { fontWeight: '700' as const },
  modalRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalCancel: { fontSize: 15, color: '#757575' },
  modalTitle: { fontSize: 16, fontWeight: '700' as const, color: '#1A1A2E' },
  modalSave: { fontSize: 15, fontWeight: '700' as const, color: '#F97316' },
  modalContent: { padding: 20, gap: 24, paddingBottom: 40 },
  formSection: { gap: 10 },
  formSectionLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#9E9E9E',
    letterSpacing: 1.2,
  },
  formGroup: { gap: 5 },
  formRow: { flexDirection: 'row', gap: 12 },
  formLabel: { fontSize: 13, fontWeight: '600' as const, color: '#37474F' },
  formInput: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
  },
  connTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  connTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  connTypeBtnActive: {
    borderColor: '#1565C0',
    backgroundColor: '#1565C0',
  },
  connTypeBtnActiveUsb: {
    borderColor: '#6A1B9A',
    backgroundColor: '#6A1B9A',
  },
  connTypeBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#546E7A',
  },
  connTypeBtnTextActive: {
    color: '#FFFFFF',
  },
  usbHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F3E5F5',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  usbHintText: {
    flex: 1,
    fontSize: 12,
    color: '#6A1B9A',
    lineHeight: 18,
  },
  usbHintBold: { fontWeight: '700' as const },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  typeOptionDot: { width: 12, height: 12, borderRadius: 6 },
  typeOptionText: { flex: 1 },
  typeOptionLabel: { fontSize: 14, fontWeight: '700' as const, color: '#37474F' },
  typeOptionDesc: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  toggleRowActive: { borderColor: '#81C784', backgroundColor: '#F1F8E9' },
  toggleLabel: { fontSize: 14, fontWeight: '600' as const, color: '#37474F' },
  toggleDesc: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: '#43A047' },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  hintBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
  },
  hintText: { fontSize: 12, color: '#F57F17', lineHeight: 20 },
  hintBold: { fontWeight: '700' as const },
});
