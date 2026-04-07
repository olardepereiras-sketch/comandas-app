import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal, Switch, Platform, Image,
} from 'react-native';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';
import {
  QrCode, Plus, Edit2, Trash2, ChevronRight, ChevronLeft,
  X, Save, Image as ImageIcon, Check, AlertCircle, Palette,
  UtensilsCrossed, Tag, AlignLeft, DollarSign, Eye, EyeOff,
  ArrowUp, ArrowDown, Settings, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react-native';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://quieromesa.com';

function stripCacheBuster(url: string | null): string | null {
  if (!url) return null;
  return url.split('?')[0];
}

const PALETTE = [
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#EF4444', '#F97316', '#F59E0B',
  '#10B981', '#14B8A6', '#06B6D4', '#64748B',
];

const ALLERGENS = [
  { id: 'gluten',        label: 'Gluten',               emoji: '🌾' },
  { id: 'crustaceos',    label: 'Crustáceos',            emoji: '🦐' },
  { id: 'huevos',        label: 'Huevos',                emoji: '🥚' },
  { id: 'pescado',       label: 'Pescado',               emoji: '🐟' },
  { id: 'cacahuetes',    label: 'Cacahuetes',            emoji: '🥜' },
  { id: 'soja',          label: 'Soja',                  emoji: '🫘' },
  { id: 'lacteos',       label: 'Lácteos',               emoji: '🥛' },
  { id: 'frutos_cascara',label: 'Frutos de cáscara',     emoji: '🌰' },
  { id: 'apio',          label: 'Apio',                  emoji: '🥬' },
  { id: 'mostaza',       label: 'Mostaza',               emoji: '🌿' },
  { id: 'sesamo',        label: 'Sésamo',                emoji: '🌱' },
  { id: 'sulfitos',      label: 'Sulfitos',              emoji: '🍷' },
  { id: 'altramuces',    label: 'Altramuces',            emoji: '🌼' },
  { id: 'moluscos',      label: 'Moluscos',              emoji: '🐚' },
];

const DIETARY_PREFERENCES = [
  { id: 'sin_gluten',   label: 'Sin gluten',    emoji: '🌾', color: '#f59e0b' },
  { id: 'sin_lactosa',  label: 'Sin lactosa',   emoji: '🥛', color: '#3b82f6' },
  { id: 'vegetariano',  label: 'Vegetariano',   emoji: '🥗', color: '#10b981' },
  { id: 'vegano',       label: 'Vegano',        emoji: '🌱', color: '#22c55e' },
  { id: 'pescatariano', label: 'Pescatariano',  emoji: '🐟', color: '#06b6d4' },
];

interface CustomCharacteristic { id: string; label: string; emoji: string; color: string; }

type Level = 'menus' | 'categories' | 'items' | 'editItem' | 'editCategory';

interface DigitalMenu {
  id: string; name: string; color: string; displayOrder: number;
  imageOrientation: 'horizontal' | 'vertical';
  showAllergenFilter: boolean;
  showDietaryFilter: boolean;
  customCharacteristics: CustomCharacteristic[];
}
interface MenuCategory {
  id: string; menuId: string; name: string; description: string | null;
  imageUrl: string | null; color: string; position: number; isActive: boolean;
}
interface MenuItem {
  id: string; categoryId: string; name: string; description: string | null;
  imageUrl: string | null; price: number; allergens: string[];
  dietaryPreferences: string[];
  price2Enabled: boolean; price2Name: string | null; price2Amount: number | null;
  price3Enabled: boolean; price3Name: string | null; price3Amount: number | null;
  displayOrder: number; isActive: boolean;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View style={cp.row}>
      {PALETTE.map((c) => (
        <TouchableOpacity
          key={c}
          style={[cp.dot, { backgroundColor: c }, value === c && cp.dotActive]}
          onPress={() => onChange(c)}
          activeOpacity={0.8}
        >
          {value === c && <Check size={12} color="#fff" strokeWidth={3} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const cp = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dotActive: { borderWidth: 3, borderColor: '#0f172a', transform: [{ scale: 1.15 }] },
});

function QrModal({ menuId, menuName, color, onClose }: { menuId: string; menuName: string; color: string; onClose: () => void }) {
  const menuUrl = `${BASE_URL}/client/menu/${menuId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(menuUrl)}&size=260x260&color=${color.replace('#', '')}&bgcolor=ffffff&margin=10`;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(menuUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      Alert.alert('Enlace', menuUrl);
    }
  };

  const handleDownload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = qrUrl;
      a.download = `qr-${menuName}.png`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={qrm.overlay}>
        <View style={qrm.sheet}>
          <View style={qrm.handle} />
          <View style={qrm.row}>
            <Text style={qrm.title}>Código QR — {menuName}</Text>
            <TouchableOpacity onPress={onClose} style={qrm.closeBtn}>
              <X size={20} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={[qrm.qrBox, { borderColor: color + '30' }]}>
            <Image source={{ uri: qrUrl }} style={qrm.qrImage} resizeMode="contain" />
          </View>

          <Text style={qrm.urlText} numberOfLines={2}>{menuUrl}</Text>

          <TouchableOpacity style={[qrm.btn, { backgroundColor: color }]} onPress={handleCopyLink} activeOpacity={0.8}>
            <Text style={qrm.btnText}>{copied ? '✓ Enlace copiado' : 'Copiar enlace'}</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity style={qrm.btnOutline} onPress={handleDownload} activeOpacity={0.8}>
              <Text style={[qrm.btnOutlineText, { color }]}>Descargar QR</Text>
            </TouchableOpacity>
          )}

          <Text style={qrm.hint}>Escanea con la cámara del móvil para ver la carta</Text>
        </View>
      </View>
    </Modal>
  );
}

const qrm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700' as const, color: '#0f172a', flex: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  qrBox: { alignSelf: 'center', borderWidth: 1.5, borderRadius: 16, padding: 12, marginBottom: 16 },
  qrImage: { width: 220, height: 220 },
  urlText: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  btnOutline: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 10 },
  btnOutlineText: { fontSize: 15, fontWeight: '700' as const },
  hint: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 8 },
});

async function uploadMenuImage(file: File, entityId: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityId', entityId);
  const res = await fetch(`${BASE_URL}/api/upload-menu-image`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok || !data.imageUrl) throw new Error(data.error || 'Error al subir imagen');
  return String(data.imageUrl) + '?t=' + Date.now();
}

async function pickAndUploadImage(entityId: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) { resolve(null); return; }
        try {
          console.log('📸 [CARTA] Subiendo imagen web para:', entityId);
          const url = await uploadMenuImage(file, entityId);
          console.log('📸 [CARTA] Imagen subida, URL:', url);
          resolve(url);
        } catch (err: any) {
          console.error('❌ [CARTA] Error subiendo imagen web:', err);
          Alert.alert('Error', err.message);
          resolve(null);
        }
      };
      input.click();
    });
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Permiso denegado'); return null; }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  try {
    console.log('📸 [CARTA] Subiendo imagen nativa para:', entityId);
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const file = new File([blob], `${entityId}.jpg`, { type: 'image/jpeg' });
    const url = await uploadMenuImage(file, entityId);
    console.log('📸 [CARTA] Imagen subida, URL:', url);
    return url;
  } catch (err: any) {
    console.error('❌ [CARTA] Error subiendo imagen nativa:', err);
    Alert.alert('Error', err.message);
    return null;
  }
}

export default function CartaDigitalScreen() {
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [level, setLevel] = useState<Level>('menus');
  const [selectedMenu, setSelectedMenu] = useState<DigitalMenu | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuColor, setNewMenuColor] = useState(PALETTE[0]);

  const [showQr, setShowQr] = useState<DigitalMenu | null>(null);
  const [newMenuOrientation, setNewMenuOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [reordering, setReordering] = useState(false);

  const [showMenuConfig, setShowMenuConfig] = useState(false);
  const [menuShowAllergen, setMenuShowAllergen] = useState(true);
  const [menuShowDietary, setMenuShowDietary] = useState(true);
  const [menuCustomChars, setMenuCustomChars] = useState<CustomCharacteristic[]>([]);
  const [newCharLabel, setNewCharLabel] = useState('');
  const [newCharEmoji, setNewCharEmoji] = useState('');
  const [newCharColor, setNewCharColor] = useState(PALETTE[3]);
  const [showAddChar, setShowAddChar] = useState(false);

  const [editMenuName, setEditMenuName] = useState('');
  const [editMenuColor, setEditMenuColor] = useState(PALETTE[0]);

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState(PALETTE[0]);
  const [catPosition, setCatPosition] = useState('0');
  const [catImageUrl, setCatImageUrl] = useState<string | null>(null);
  const [catImageLoading, setCatImageLoading] = useState(false);

  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemAllergens, setItemAllergens] = useState<string[]>([]);
  const [itemDietaryPrefs, setItemDietaryPrefs] = useState<string[]>([]);
  const [itemImageUrl, setItemImageUrl] = useState<string | null>(null);
  const [itemImageLoading, setItemImageLoading] = useState(false);
  const [itemActive, setItemActive] = useState(true);
  const [itemP2Enabled, setItemP2Enabled] = useState(false);
  const [itemP2Name, setItemP2Name] = useState('');
  const [itemP2Amount, setItemP2Amount] = useState('');
  const [itemP3Enabled, setItemP3Enabled] = useState(false);
  const [itemP3Name, setItemP3Name] = useState('');
  const [itemP3Amount, setItemP3Amount] = useState('');

  useEffect(() => {
    import('@/lib/restaurantSession').then(({ getRestaurantId }) => {
      getRestaurantId().then((id) => { if (id) setRestaurantId(id); });
    });
  }, []);

  const menusQuery = trpc.digitalMenus.list.useQuery(
    { restaurantId },
    { enabled: !!restaurantId }
  );
  const categoriesQuery = trpc.menuCategories.list.useQuery(
    { menuId: selectedMenu?.id || '' },
    { enabled: !!selectedMenu }
  );
  const itemsQuery = trpc.menuItems.list.useQuery(
    { categoryId: selectedCategory?.id || '' },
    { enabled: !!selectedCategory }
  );

  const createMenuMut = trpc.digitalMenus.create.useMutation({ onSuccess: () => { menusQuery.refetch(); setShowCreateMenu(false); setNewMenuName(''); setNewMenuColor(PALETTE[0]); setNewMenuOrientation('horizontal'); } });
  const updateMenuMut = trpc.digitalMenus.update.useMutation({ onSuccess: () => { menusQuery.refetch(); } });
  const deleteMenuMut = trpc.digitalMenus.delete.useMutation({
    onSuccess: () => menusQuery.refetch(),
    onError: (err) => Alert.alert('Error', err.message || 'No se pudo eliminar la carta'),
  });

  const createCatMut = trpc.menuCategories.create.useMutation({ onSuccess: () => { categoriesQuery.refetch(); setLevel('categories'); } });
  const updateCatMut = trpc.menuCategories.update.useMutation({ onSuccess: () => { categoriesQuery.refetch(); setLevel('categories'); } });
  const deleteCatMut = trpc.menuCategories.delete.useMutation({ onSuccess: () => categoriesQuery.refetch() });

  const createItemMut = trpc.menuItems.create.useMutation({ onSuccess: () => { itemsQuery.refetch(); setLevel('items'); } });
  const updateItemMut = trpc.menuItems.update.useMutation({ onSuccess: () => { itemsQuery.refetch(); setLevel('items'); } });
  const deleteItemMut = trpc.menuItems.delete.useMutation({ onSuccess: () => itemsQuery.refetch() });
  const reorderMut = trpc.menuItems.update.useMutation();

  const handleCreateMenu = () => {
    if (!newMenuName.trim()) { Alert.alert('Error', 'El nombre es obligatorio'); return; }
    createMenuMut.mutate({ restaurantId, name: newMenuName.trim(), color: newMenuColor, imageOrientation: newMenuOrientation });
  };

  const handleMoveItem = useCallback(async (fromIdx: number, direction: 'up' | 'down') => {
    const rawItems = [...(itemsQuery.data || [])] as MenuItem[];
    if (!rawItems.length) return;
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= rawItems.length) return;
    setReordering(true);
    const temp = rawItems[fromIdx];
    rawItems[fromIdx] = rawItems[toIdx];
    rawItems[toIdx] = temp;
    try {
      await Promise.all(rawItems.map((item, idx) => reorderMut.mutateAsync({ id: item.id, displayOrder: idx })));
      await itemsQuery.refetch();
    } catch {
      Alert.alert('Error', 'No se pudo reordenar el producto');
    } finally {
      setReordering(false);
    }
  }, [itemsQuery, reorderMut]);

  const handleSaveMenuEdit = () => {
    if (!selectedMenu) return;
    updateMenuMut.mutate({ id: selectedMenu.id, name: editMenuName, color: editMenuColor });
    setSelectedMenu({ ...selectedMenu, name: editMenuName, color: editMenuColor });
  };

  const handleSaveMenuConfig = () => {
    if (!selectedMenu) return;
    updateMenuMut.mutate({
      id: selectedMenu.id,
      showAllergenFilter: menuShowAllergen,
      showDietaryFilter: menuShowDietary,
      customCharacteristics: menuCustomChars,
    });
    setSelectedMenu({ ...selectedMenu, showAllergenFilter: menuShowAllergen, showDietaryFilter: menuShowDietary, customCharacteristics: menuCustomChars });
    Alert.alert('Guardado', 'Configuración guardada correctamente');
  };

  const handleAddChar = () => {
    if (!newCharLabel.trim()) { Alert.alert('Error', 'El nombre es obligatorio'); return; }
    const newChar: CustomCharacteristic = {
      id: `char-${Date.now()}`,
      label: newCharLabel.trim(),
      emoji: newCharEmoji.trim() || '✨',
      color: newCharColor,
    };
    setMenuCustomChars((prev) => [...prev, newChar]);
    setNewCharLabel('');
    setNewCharEmoji('');
    setNewCharColor(PALETTE[3]);
    setShowAddChar(false);
  };

  const handleDeleteChar = (id: string) => {
    setMenuCustomChars((prev) => prev.filter((c) => c.id !== id));
  };

  const handleDeleteMenu = (menu: DigitalMenu) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`¿Eliminar "${menu.name}"? Se eliminará todo su contenido.`)) {
        deleteMenuMut.mutate({ id: menu.id });
      }
    } else {
      Alert.alert('Eliminar carta', `¿Eliminar "${menu.name}"? Se eliminará todo su contenido.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMenuMut.mutate({ id: menu.id }) },
      ]);
    }
  };

  const openMenu = (menu: DigitalMenu) => {
    setSelectedMenu(menu);
    setEditMenuName(menu.name);
    setEditMenuColor(menu.color);
    setMenuShowAllergen(menu.showAllergenFilter !== false);
    setMenuShowDietary(menu.showDietaryFilter !== false);
    setMenuCustomChars(menu.customCharacteristics || []);
    setShowMenuConfig(false);
    setShowAddChar(false);
    setLevel('categories');
  };

  const handleToggleCategoryActive = useCallback((cat: MenuCategory) => {
    const newActive = !cat.isActive;
    updateCatMut.mutate(
      { id: cat.id, isActive: newActive },
      { onSuccess: () => categoriesQuery.refetch() }
    );
  }, [updateCatMut, categoriesQuery]);

  const openCategoryEdit = (cat: MenuCategory | null) => {
    if (cat) {
      setCatName(cat.name);
      setCatDesc(cat.description || '');
      setCatColor(cat.color);
      setCatPosition(String(cat.position));
      setCatImageUrl(cat.imageUrl);
    } else {
      setCatName('');
      setCatDesc('');
      setCatColor(selectedMenu?.color || PALETTE[0]);
      setCatPosition('0');
      setCatImageUrl(null);
    }
    setSelectedCategory(cat);
    setLevel('editCategory');
  };

  const handleSaveCategory = () => {
    if (!catName.trim()) { Alert.alert('Error', 'El nombre es obligatorio'); return; }
    const pos = parseInt(catPosition) || 0;
    if (selectedCategory && selectedCategory.id) {
      updateCatMut.mutate({
        id: selectedCategory.id, name: catName.trim(),
        description: catDesc.trim() || null, imageUrl: stripCacheBuster(catImageUrl),
        color: catColor, position: pos,
      });
    } else {
      createCatMut.mutate({
        menuId: selectedMenu!.id, name: catName.trim(),
        description: catDesc.trim() || undefined, imageUrl: stripCacheBuster(catImageUrl) || undefined,
        color: catColor, position: pos,
      });
    }
  };

  const handleDeleteCategory = (cat: MenuCategory) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
        deleteCatMut.mutate({ id: cat.id });
      }
    } else {
      Alert.alert('Eliminar categoría', `¿Eliminar "${cat.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteCatMut.mutate({ id: cat.id }) },
      ]);
    }
  };

  const openItems = (cat: MenuCategory) => {
    setSelectedCategory(cat);
    setLevel('items');
  };

  const openItemEdit = (item: MenuItem | null) => {
    if (item) {
      setItemName(item.name);
      setItemDesc(item.description || '');
      setItemPrice(String(item.price));
      setItemAllergens(item.allergens);
      setItemDietaryPrefs(item.dietaryPreferences || []);
      setItemImageUrl(item.imageUrl);
      setItemActive(item.isActive);
      setItemP2Enabled(item.price2Enabled);
      setItemP2Name(item.price2Name || '');
      setItemP2Amount(item.price2Amount != null ? String(item.price2Amount) : '');
      setItemP3Enabled(item.price3Enabled);
      setItemP3Name(item.price3Name || '');
      setItemP3Amount(item.price3Amount != null ? String(item.price3Amount) : '');
    } else {
      setItemName('');
      setItemDesc('');
      setItemPrice('');
      setItemAllergens([]);
      setItemDietaryPrefs([]);
      setItemImageUrl(null);
      setItemActive(true);
      setItemP2Enabled(false);
      setItemP2Name('');
      setItemP2Amount('');
      setItemP3Enabled(false);
      setItemP3Name('');
      setItemP3Amount('');
    }
    setSelectedItem(item);
    setLevel('editItem');
  };

  const handleSaveItem = () => {
    if (!itemName.trim()) { Alert.alert('Error', 'El nombre es obligatorio'); return; }
    const price = parseFloat(itemPrice) || 0;
    const p2Amount = parseFloat(itemP2Amount) || undefined;
    const p3Amount = parseFloat(itemP3Amount) || undefined;

    if (selectedItem && selectedItem.id) {
      updateItemMut.mutate({
        id: selectedItem.id, name: itemName.trim(),
        description: itemDesc.trim() || null, imageUrl: stripCacheBuster(itemImageUrl),
        price, allergens: itemAllergens, dietaryPreferences: itemDietaryPrefs, isActive: itemActive,
        price2Enabled: itemP2Enabled, price2Name: itemP2Name.trim() || null, price2Amount: p2Amount ?? null,
        price3Enabled: itemP3Enabled, price3Name: itemP3Name.trim() || null, price3Amount: p3Amount ?? null,
      });
    } else {
      createItemMut.mutate({
        categoryId: selectedCategory!.id, name: itemName.trim(),
        description: itemDesc.trim() || undefined, imageUrl: stripCacheBuster(itemImageUrl) || undefined,
        price, allergens: itemAllergens, dietaryPreferences: itemDietaryPrefs,
        price2Enabled: itemP2Enabled, price2Name: itemP2Name.trim() || undefined, price2Amount: p2Amount,
        price3Enabled: itemP3Enabled, price3Name: itemP3Name.trim() || undefined, price3Amount: p3Amount,
      });
    }
  };

  const handleDeleteItem = (item: MenuItem) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`¿Eliminar el producto "${item.name}"?`)) {
        deleteItemMut.mutate({ id: item.id });
      }
    } else {
      Alert.alert('Eliminar producto', `¿Eliminar "${item.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteItemMut.mutate({ id: item.id }) },
      ]);
    }
  };

  const toggleAllergen = (id: string) => {
    setItemAllergens((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleDietaryPref = (id: string) => {
    setItemDietaryPrefs((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const activeColor = selectedMenu?.color || '#0EA5E9';

  if (!restaurantId) {
    return (
      <View style={s.centered}>
        <Stack.Screen options={{ title: 'Carta Digital' }} />
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen
        options={{
          title: level === 'menus' ? 'Carta Digital'
            : level === 'categories' ? selectedMenu?.name || 'Categorías'
            : level === 'items' ? selectedCategory?.name || 'Productos'
            : level === 'editCategory' ? (selectedCategory ? 'Editar Categoría' : 'Nueva Categoría')
            : (selectedItem ? 'Editar Producto' : 'Nuevo Producto'),
          headerStyle: { backgroundColor: level === 'menus' ? '#fff' : activeColor },
          headerTintColor: level === 'menus' ? '#0f172a' : '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
          headerLeft: level !== 'menus' ? () => (
            <TouchableOpacity
              style={s.headerBack}
              onPress={() => {
                if (level === 'editItem') setLevel('items');
                else if (level === 'items') setLevel('categories');
                else if (level === 'editCategory') setLevel('categories');
                else if (level === 'categories') setLevel('menus');
              }}
            >
              <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          ) : undefined,
        }}
      />

      {/* ─── MENUS LEVEL ─── */}
      {level === 'menus' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.pageHeader}>
            <QrCode size={28} color="#0EA5E9" strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={s.pageTitle}>Cartas Digitales</Text>
              <Text style={s.pageSubtitle}>Crea hasta 4 cartas con QR descargable</Text>
            </View>
          </View>

          {menusQuery.isLoading ? (
            <ActivityIndicator color="#0EA5E9" style={{ marginTop: 40 }} />
          ) : (
            <>
              {(menusQuery.data || []).map((menu) => (
                <View key={menu.id} style={[s.menuCard, { borderLeftColor: menu.color }]}>
                  <TouchableOpacity style={s.menuCardMain} onPress={() => openMenu(menu)} activeOpacity={0.8}>
                    <View style={[s.menuColorDot, { backgroundColor: menu.color }]} />
                    <Text style={s.menuCardName}>{menu.name}</Text>
                    <ChevronRight size={18} color="#94a3b8" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <View style={s.menuCardActions}>
                    <TouchableOpacity style={[s.menuActionBtn, { backgroundColor: menu.color + '15' }]}
                      onPress={() => setShowQr(menu)} activeOpacity={0.7}>
                      <QrCode size={16} color={menu.color} strokeWidth={2.5} />
                      <Text style={[s.menuActionText, { color: menu.color }]}>QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.menuDeleteBtn}
                      onPress={() => handleDeleteMenu(menu)} activeOpacity={0.7}>
                      <Trash2 size={16} color="#ef4444" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {(menusQuery.data?.length ?? 0) < 4 && (
                <TouchableOpacity style={s.addMenuBtn} onPress={() => setShowCreateMenu(true)} activeOpacity={0.8}>
                  <Plus size={20} color="#0EA5E9" strokeWidth={2.5} />
                  <Text style={s.addMenuBtnText}>Crear nueva carta</Text>
                </TouchableOpacity>
              )}

              {(menusQuery.data?.length ?? 0) === 0 && !menusQuery.isLoading && (
                <View style={s.emptyState}>
                  <UtensilsCrossed size={48} color="#cbd5e1" strokeWidth={1.5} />
                  <Text style={s.emptyTitle}>Sin cartas digitales</Text>
                  <Text style={s.emptyDesc}>Crea tu primera carta y genera un código QR para tus clientes</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ─── CATEGORIES LEVEL ─── */}
      {level === 'categories' && selectedMenu && (
        <>
          <View style={[s.levelBanner, { backgroundColor: activeColor + '12' }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.levelBannerTitle}>{selectedMenu.name}</Text>
              <View style={s.levelBannerRow}>
                <TextInput
                  style={[s.inlineInput, { flex: 1 }]}
                  value={editMenuName}
                  onChangeText={setEditMenuName}
                  placeholder="Nombre de la carta"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity style={[s.saveSmallBtn, { backgroundColor: activeColor }]}
                  onPress={handleSaveMenuEdit} activeOpacity={0.8}>
                  <Save size={14} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <View style={{ marginTop: 8 }}>
                <ColorPicker value={editMenuColor} onChange={(c) => { setEditMenuColor(c); }} />
              </View>
            </View>
            <TouchableOpacity style={[s.qrSmallBtn, { backgroundColor: activeColor }]}
              onPress={() => setShowQr(selectedMenu)} activeOpacity={0.8}>
              <QrCode size={18} color="#fff" strokeWidth={2.5} />
              <Text style={s.qrSmallText}>QR</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

            {/* ─── CONFIG SECTION ─── */}
            <TouchableOpacity
              style={[s.configHeader, { borderColor: activeColor + '40' }]}
              onPress={() => setShowMenuConfig((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={s.configHeaderLeft}>
                <Settings size={15} color={activeColor} strokeWidth={2.5} />
                <Text style={[s.configHeaderText, { color: activeColor }]}>Configuración de la carta</Text>
              </View>
              {showMenuConfig
                ? <ChevronUp size={15} color={activeColor} strokeWidth={2.5} />
                : <ChevronDown size={15} color={activeColor} strokeWidth={2.5} />}
            </TouchableOpacity>

            {showMenuConfig && (
              <View style={s.configBody}>
                <View style={s.configSection}>
                  <Text style={s.configSectionTitle}>Secciones del filtro visible al cliente</Text>
                  <Text style={s.configSectionSubtitle}>Activa o desactiva las secciones que aparecerán en el filtro de la carta digital</Text>
                  <View style={s.configToggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.configToggleLabel}>Ocultar productos con...</Text>
                      <Text style={s.configToggleHint}>Filtro de alérgenos</Text>
                    </View>
                    <Switch
                      value={menuShowAllergen}
                      onValueChange={setMenuShowAllergen}
                      trackColor={{ false: '#cbd5e1', true: activeColor }}
                      thumbColor={menuShowAllergen ? '#fff' : '#f1f5f9'}
                    />
                  </View>
                  <View style={[s.configToggleRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.configToggleLabel}>Ver solo...</Text>
                      <Text style={s.configToggleHint}>Filtro de características de productos</Text>
                    </View>
                    <Switch
                      value={menuShowDietary}
                      onValueChange={setMenuShowDietary}
                      trackColor={{ false: '#cbd5e1', true: activeColor }}
                      thumbColor={menuShowDietary ? '#fff' : '#f1f5f9'}
                    />
                  </View>
                </View>

                <View style={[s.configSection, { borderBottomWidth: 0 }]}>
                  <Text style={s.configSectionTitle}>Características personalizadas de productos</Text>
                  <Text style={s.configSectionSubtitle}>Crea las características propias de esta carta (Ej: Tinto, Ecológico, Reserva…). Si no añades ninguna se usarán las predeterminadas (Sin gluten, Vegano…)</Text>
                  {menuCustomChars.map((char) => (
                    <View key={char.id} style={s.charRow}>
                      <View style={[s.charColorDot, { backgroundColor: char.color }]} />
                      <Text style={s.charEmoji}>{char.emoji}</Text>
                      <Text style={s.charLabel}>{char.label}</Text>
                      <TouchableOpacity
                        style={s.charDeleteBtn}
                        onPress={() => handleDeleteChar(char.id)}
                        activeOpacity={0.7}
                      >
                        <X size={13} color="#ef4444" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {showAddChar ? (
                    <View style={s.addCharForm}>
                      <View style={s.addCharRow}>
                        <TextInput
                          style={[s.input, { width: 64 }]}
                          value={newCharEmoji}
                          onChangeText={setNewCharEmoji}
                          placeholder="🍷"
                          placeholderTextColor="#94a3b8"
                        />
                        <TextInput
                          style={[s.input, { flex: 1 }]}
                          value={newCharLabel}
                          onChangeText={setNewCharLabel}
                          placeholder="Ej: Tinto, Reserva, Ecológico…"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                      <ColorPicker value={newCharColor} onChange={setNewCharColor} />
                      <View style={s.addCharBtns}>
                        <TouchableOpacity
                          style={s.addCharCancelBtn}
                          onPress={() => { setShowAddChar(false); setNewCharLabel(''); setNewCharEmoji(''); }}
                          activeOpacity={0.7}
                        >
                          <Text style={s.addCharCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.addCharSaveBtn, { backgroundColor: activeColor }]}
                          onPress={handleAddChar}
                          activeOpacity={0.8}
                        >
                          <Text style={s.addCharSaveText}>Añadir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.addCharBtn, { borderColor: activeColor + '60' }]}
                      onPress={() => setShowAddChar(true)}
                      activeOpacity={0.8}
                    >
                      <Plus size={14} color={activeColor} strokeWidth={2.5} />
                      <Text style={[s.addCharBtnText, { color: activeColor }]}>Añadir característica</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ padding: 12, paddingTop: 4 }}>
                  <TouchableOpacity
                    style={[s.saveBtn, { backgroundColor: activeColor }]}
                    onPress={handleSaveMenuConfig}
                    activeOpacity={0.8}
                    disabled={updateMenuMut.isPending}
                  >
                    {updateMenuMut.isPending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Save size={16} color="#fff" strokeWidth={2.5} /><Text style={s.saveBtnText}>Guardar configuración</Text></>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {categoriesQuery.isLoading ? (
              <ActivityIndicator color={activeColor} style={{ marginTop: 40 }} />
            ) : (
              <>
                {(categoriesQuery.data || []).map((cat) => {
                  const catData = cat as MenuCategory;
                  const isActive = catData.isActive !== false;
                  return (
                    <View key={cat.id} style={[s.catCard, { borderLeftColor: cat.color }, !isActive && s.catCardInactive]}>
                      <TouchableOpacity style={s.catCardMain} onPress={() => isActive ? openItems(catData) : undefined} activeOpacity={0.8}>
                        <View style={[s.catColorDot, { backgroundColor: cat.color, opacity: isActive ? 1 : 0.4 }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.catCardName, !isActive && s.catCardNameInactive]}>{cat.name}</Text>
                          {cat.description && <Text style={s.catCardDesc} numberOfLines={1}>{cat.description}</Text>}
                          <Text style={[s.catPosLabel, { color: activeColor }]}>Posición: {cat.position}</Text>
                        </View>
                        {isActive && <ChevronRight size={18} color="#94a3b8" strokeWidth={2.5} />}
                      </TouchableOpacity>
                      <View style={s.catCardActions}>
                        <TouchableOpacity
                          style={[s.catToggleBtn, { backgroundColor: isActive ? '#dcfce7' : '#f1f5f9' }]}
                          onPress={() => handleToggleCategoryActive(catData)}
                          activeOpacity={0.7}
                        >
                          {isActive
                            ? <Eye size={14} color="#16a34a" strokeWidth={2.5} />
                            : <EyeOff size={14} color="#94a3b8" strokeWidth={2.5} />
                          }
                          <Text style={[s.catToggleText, { color: isActive ? '#16a34a' : '#94a3b8' }]}>
                            {isActive ? 'Visible' : 'Oculta'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.catEditBtn} onPress={() => openCategoryEdit(catData)} activeOpacity={0.7}>
                          <Edit2 size={15} color={activeColor} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.catDeleteBtn} onPress={() => handleDeleteCategory(catData)} activeOpacity={0.7}>
                          <Trash2 size={15} color="#ef4444" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                <TouchableOpacity style={[s.addCatBtn, { borderColor: activeColor }]}
                  onPress={() => openCategoryEdit(null)} activeOpacity={0.8}>
                  <Plus size={18} color={activeColor} strokeWidth={2.5} />
                  <Text style={[s.addCatBtnText, { color: activeColor }]}>Añadir categoría</Text>
                </TouchableOpacity>

                {(categoriesQuery.data?.length ?? 0) === 0 && !categoriesQuery.isLoading && (
                  <View style={s.emptyState}>
                    <AlignLeft size={40} color="#cbd5e1" strokeWidth={1.5} />
                    <Text style={s.emptyTitle}>Sin categorías</Text>
                    <Text style={s.emptyDesc}>Añade categorías como Entrantes, Carnes, Postres…</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* ─── EDIT CATEGORY LEVEL ─── */}
      {level === 'editCategory' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.formSection}>
            <View style={s.formRow}><Tag size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Nombre *</Text></View>
            <TextInput style={s.input} value={catName} onChangeText={setCatName} placeholder="Ej: Entrantes" placeholderTextColor="#94a3b8" />
          </View>

          <View style={s.formSection}>
            <View style={s.formRow}><AlignLeft size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Descripción (opcional)</Text></View>
            <TextInput style={[s.input, s.textarea]} value={catDesc} onChangeText={setCatDesc}
              placeholder="Descripción de la categoría…" placeholderTextColor="#94a3b8"
              multiline numberOfLines={3} textAlignVertical="top" />
          </View>

          <View style={s.formSection}>
            <View style={s.formRow}><DollarSign size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Posición en la carta</Text></View>
            <TextInput style={[s.input, { width: 100 }]} value={catPosition} onChangeText={setCatPosition}
              placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
            <Text style={s.hint}>Número menor = aparece antes (ej: 1 = primera categoría)</Text>
          </View>

          <View style={s.formSection}>
            <View style={s.formRow}><Palette size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Color de la categoría</Text></View>
            <ColorPicker value={catColor} onChange={setCatColor} />
          </View>

          <View style={s.formSection}>
            <View style={s.formRow}><ImageIcon size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Foto (opcional)</Text></View>
            <TouchableOpacity
              style={[s.imagePickerBtn, catImageUrl ? { borderStyle: 'solid' as const } : {}]}
              onPress={async () => {
                const tempId = selectedCategory?.id || `cat-new-${Date.now()}`;
                setCatImageLoading(true);
                const url = await pickAndUploadImage(tempId);
                setCatImageLoading(false);
                if (url) setCatImageUrl(url);
              }}
              activeOpacity={0.8}
            >
              {catImageLoading ? (
                <ActivityIndicator color={activeColor} />
              ) : catImageUrl ? (
                <>
                  <Image source={{ uri: catImageUrl }} style={s.imagePreview} resizeMode="contain" />
                  <View style={s.imageOverlay}>
                    <Text style={s.imageOverlayText}>Cambiar foto</Text>
                  </View>
                </>
              ) : (
                <>
                  <ImageIcon size={24} color="#94a3b8" strokeWidth={1.5} />
                  <Text style={s.imagePickerText}>Añadir foto de categoría</Text>
                </>
              )}
            </TouchableOpacity>
            {catImageUrl && (
              <TouchableOpacity onPress={() => setCatImageUrl(null)} style={s.removeImageBtn}>
                <X size={14} color="#ef4444" strokeWidth={2.5} />
                <Text style={s.removeImageText}>Eliminar foto</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: activeColor }]}
            onPress={handleSaveCategory}
            activeOpacity={0.8}
            disabled={createCatMut.isPending || updateCatMut.isPending}
          >
            {(createCatMut.isPending || updateCatMut.isPending)
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Save size={18} color="#fff" strokeWidth={2.5} /><Text style={s.saveBtnText}>Guardar categoría</Text></>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ─── ITEMS LEVEL ─── */}
      {level === 'items' && selectedCategory && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[s.catBanner, { backgroundColor: (selectedCategory.color || activeColor) + '15', borderLeftColor: selectedCategory.color || activeColor }]}>
            <Text style={[s.catBannerName, { color: selectedCategory.color || activeColor }]}>{selectedCategory.name}</Text>
            {selectedCategory.description && <Text style={s.catBannerDesc}>{selectedCategory.description}</Text>}
          </View>

          {itemsQuery.isLoading ? (
            <ActivityIndicator color={activeColor} style={{ marginTop: 40 }} />
          ) : (
            <>
              {(itemsQuery.data || []).map((item, idx) => {
                const allItems = itemsQuery.data as MenuItem[];
                const itemData = item as MenuItem;
                return (
                  <View key={item.id} style={[s.itemRow, !item.isActive && s.itemInactive]}>
                    <View style={s.itemOrderCol}>
                      <TouchableOpacity
                        style={[s.itemOrderBtn, idx === 0 && s.itemOrderBtnDisabled]}
                        onPress={() => { if (idx > 0 && !reordering) handleMoveItem(idx, 'up'); }}
                        disabled={idx === 0 || reordering}
                        activeOpacity={0.6}
                      >
                        <ArrowUp size={12} color={idx === 0 ? '#cbd5e1' : activeColor} strokeWidth={2.5} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.itemOrderBtn, idx === allItems.length - 1 && s.itemOrderBtnDisabled]}
                        onPress={() => { if (idx < allItems.length - 1 && !reordering) handleMoveItem(idx, 'down'); }}
                        disabled={idx === allItems.length - 1 || reordering}
                        activeOpacity={0.6}
                      >
                        <ArrowDown size={12} color={idx === allItems.length - 1 ? '#cbd5e1' : activeColor} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                    {item.imageUrl && (
                      <Image source={{ uri: item.imageUrl }} style={s.itemThumb} resizeMode="cover" />
                    )}
                    <View style={s.itemRowContent}>
                      <Text style={s.itemRowName}>{item.name}</Text>
                      <Text style={[s.itemRowPrice, { color: activeColor }]}>{item.price.toFixed(2)}€</Text>
                      {item.allergens.length > 0 && (
                        <Text style={s.itemAllergenCount}>⚠ {item.allergens.length} alérgeno{item.allergens.length !== 1 ? 's' : ''}</Text>
                      )}
                      {(itemData.dietaryPreferences || []).length > 0 && (
                        <View style={s.itemDietaryRow}>
                          {(itemData.dietaryPreferences || []).map((dp) => {
                            const pref = DIETARY_PREFERENCES.find((p) => p.id === dp);
                            return pref ? (
                              <View key={dp} style={[s.itemDietaryBadge, { backgroundColor: pref.color + '20', borderColor: pref.color + '40' }]}>
                                <Text style={s.itemDietaryEmoji}>{pref.emoji}</Text>
                              </View>
                            ) : null;
                          })}
                        </View>
                      )}
                      {!item.isActive && <Text style={s.itemInactiveLabel}>Oculto</Text>}
                    </View>
                    <View style={s.itemRowActions}>
                      <TouchableOpacity style={s.itemEditBtn} onPress={() => openItemEdit(itemData)} activeOpacity={0.7}>
                        <Edit2 size={15} color={activeColor} strokeWidth={2.5} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.itemDeleteBtn} onPress={() => handleDeleteItem(itemData)} activeOpacity={0.7}>
                        <Trash2 size={15} color="#ef4444" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity style={[s.addItemBtn, { borderColor: activeColor }]}
                onPress={() => openItemEdit(null)} activeOpacity={0.8}>
                <Plus size={18} color={activeColor} strokeWidth={2.5} />
                <Text style={[s.addItemBtnText, { color: activeColor }]}>Añadir producto</Text>
              </TouchableOpacity>

              {(itemsQuery.data?.length ?? 0) === 0 && !itemsQuery.isLoading && (
                <View style={s.emptyState}>
                  <UtensilsCrossed size={40} color="#cbd5e1" strokeWidth={1.5} />
                  <Text style={s.emptyTitle}>Sin productos</Text>
                  <Text style={s.emptyDesc}>Añade productos a esta categoría</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ─── EDIT ITEM LEVEL ─── */}
      {level === 'editItem' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.formSection}>
            <View style={s.formRow}><UtensilsCrossed size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Nombre del producto *</Text></View>
            <TextInput style={s.input} value={itemName} onChangeText={setItemName} placeholder="Ej: Ensalada César" placeholderTextColor="#94a3b8" />
          </View>

          <View style={s.formSection}>
            <View style={s.formRow}><AlignLeft size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Descripción (opcional)</Text></View>
            <TextInput style={[s.input, s.textarea]} value={itemDesc} onChangeText={setItemDesc}
              placeholder="Ingredientes, preparación…" placeholderTextColor="#94a3b8"
              multiline numberOfLines={3} textAlignVertical="top" />
          </View>

          <View style={s.formSection}>
            <View style={s.formRow}><ImageIcon size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Foto (opcional)</Text></View>
            <TouchableOpacity
              style={[s.imagePickerBtn, itemImageUrl ? { borderStyle: 'solid' as const } : {}]}
              onPress={async () => {
                const tempId = selectedItem?.id || `item-new-${Date.now()}`;
                setItemImageLoading(true);
                const url = await pickAndUploadImage(tempId);
                setItemImageLoading(false);
                if (url) setItemImageUrl(url);
              }}
              activeOpacity={0.8}
            >
              {itemImageLoading ? (
                <ActivityIndicator color={activeColor} />
              ) : itemImageUrl ? (
                <>
                  <Image source={{ uri: itemImageUrl }} style={s.imagePreview} resizeMode="contain" />
                  <View style={s.imageOverlay}>
                    <Text style={s.imageOverlayText}>Cambiar foto</Text>
                  </View>
                </>
              ) : (
                <>
                  <ImageIcon size={24} color="#94a3b8" strokeWidth={1.5} />
                  <Text style={s.imagePickerText}>Añadir foto del plato</Text>
                </>
              )}
            </TouchableOpacity>
            {itemImageUrl && (
              <TouchableOpacity onPress={() => setItemImageUrl(null)} style={s.removeImageBtn}>
                <X size={14} color="#ef4444" strokeWidth={2.5} />
                <Text style={s.removeImageText}>Eliminar foto</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Precio principal */}
          <View style={s.formSection}>
            <View style={s.formRow}><DollarSign size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Precio principal (€) *</Text></View>
            <TextInput style={[s.input, { width: 120 }]} value={itemPrice} onChangeText={setItemPrice}
              placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
          </View>

          {/* Precio 2 */}
          <View style={s.formSection}>
            <View style={s.priceExtraHeader}>
              <View style={s.formRow}><DollarSign size={16} color="#64748b" strokeWidth={2} /><Text style={s.formLabelAlt}>Precio adicional 2</Text></View>
              <Switch value={itemP2Enabled} onValueChange={setItemP2Enabled}
                trackColor={{ false: '#cbd5e1', true: activeColor }}
                thumbColor={itemP2Enabled ? '#fff' : '#f1f5f9'} />
            </View>
            {itemP2Enabled && (
              <View style={s.extraPriceRow}>
                <TextInput style={[s.input, { flex: 1 }]} value={itemP2Name} onChangeText={setItemP2Name}
                  placeholder="Ej: Media ración" placeholderTextColor="#94a3b8" />
                <TextInput style={[s.input, { width: 100 }]} value={itemP2Amount} onChangeText={setItemP2Amount}
                  placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
              </View>
            )}
          </View>

          {/* Precio 3 */}
          <View style={s.formSection}>
            <View style={s.priceExtraHeader}>
              <View style={s.formRow}><DollarSign size={16} color="#64748b" strokeWidth={2} /><Text style={s.formLabelAlt}>Precio adicional 3</Text></View>
              <Switch value={itemP3Enabled} onValueChange={setItemP3Enabled}
                trackColor={{ false: '#cbd5e1', true: activeColor }}
                thumbColor={itemP3Enabled ? '#fff' : '#f1f5f9'} />
            </View>
            {itemP3Enabled && (
              <View style={s.extraPriceRow}>
                <TextInput style={[s.input, { flex: 1 }]} value={itemP3Name} onChangeText={setItemP3Name}
                  placeholder="Ej: Extra grande" placeholderTextColor="#94a3b8" />
                <TextInput style={[s.input, { width: 100 }]} value={itemP3Amount} onChangeText={setItemP3Amount}
                  placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
              </View>
            )}
          </View>

          {/* Alérgenos */}
          <View style={s.formSection}>
            <View style={s.formRow}><AlertCircle size={16} color="#f59e0b" strokeWidth={2.5} /><Text style={s.formLabel}>Alérgenos</Text></View>
            <View style={s.allergenGrid}>
              {ALLERGENS.map((a) => {
                const selected = itemAllergens.includes(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[s.allergenBtn, selected && { backgroundColor: '#fef9c3', borderColor: '#f59e0b' }]}
                    onPress={() => toggleAllergen(a.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.allergenBtnEmoji}>{a.emoji}</Text>
                    <Text style={[s.allergenBtnLabel, selected && { color: '#92400e', fontWeight: '700' as const }]}>{a.label}</Text>
                    {selected && <Check size={12} color="#f59e0b" strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Características */}
          <View style={s.formSection}>
            <View style={s.formRow}><Sparkles size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Características del producto</Text></View>
            <Text style={s.hint}>
              {menuCustomChars.length > 0
                ? 'Características personalizadas de esta carta'
                : 'Características predeterminadas — configura las tuyas en la carta'}
            </Text>
            <View style={s.dietaryGrid}>
              {(menuCustomChars.length > 0 ? menuCustomChars : DIETARY_PREFERENCES).map((dp) => {
                const selected = itemDietaryPrefs.includes(dp.id);
                return (
                  <TouchableOpacity
                    key={dp.id}
                    style={[s.dietaryBtn, selected && { backgroundColor: dp.color + '18', borderColor: dp.color }]}
                    onPress={() => toggleDietaryPref(dp.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.dietaryBtnEmoji}>{dp.emoji}</Text>
                    <Text style={[s.dietaryBtnLabel, selected && { color: dp.color, fontWeight: '700' as const }]}>{dp.label}</Text>
                    {selected && <Check size={12} color={dp.color} strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Visible */}
          <View style={s.formSection}>
            <View style={s.switchRow}>
              <View style={s.formRow}><Eye size={16} color={activeColor} strokeWidth={2.5} /><Text style={s.formLabel}>Visible en la carta</Text></View>
              <Switch value={itemActive} onValueChange={setItemActive}
                trackColor={{ false: '#cbd5e1', true: activeColor }}
                thumbColor={itemActive ? '#fff' : '#f1f5f9'} />
            </View>
          </View>

          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: activeColor }]}
            onPress={handleSaveItem}
            activeOpacity={0.8}
            disabled={createItemMut.isPending || updateItemMut.isPending}
          >
            {(createItemMut.isPending || updateItemMut.isPending)
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Save size={18} color="#fff" strokeWidth={2.5} /><Text style={s.saveBtnText}>Guardar producto</Text></>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ─── CREATE MENU MODAL ─── */}
      <Modal visible={showCreateMenu} animationType="slide" transparent onRequestClose={() => setShowCreateMenu(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nueva carta digital</Text>
              <TouchableOpacity onPress={() => setShowCreateMenu(false)} style={s.modalCloseBtn}>
                <X size={20} color="#64748b" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalLabel}>Nombre de la carta *</Text>
            <TextInput
              style={s.input}
              value={newMenuName}
              onChangeText={setNewMenuName}
              placeholder="Ej: Carta de verano, Menú degustación…"
              placeholderTextColor="#94a3b8"
              autoFocus
            />

            <Text style={[s.modalLabel, { marginTop: 16 }]}>Color temático</Text>
            <ColorPicker value={newMenuColor} onChange={setNewMenuColor} />

            <View style={[s.colorPreview, { backgroundColor: newMenuColor }]}>
              <Text style={s.colorPreviewText}>{newMenuName || 'Vista previa del color'}</Text>
            </View>

            <Text style={[s.modalLabel, { marginTop: 16 }]}>Tipo de presentación</Text>
            <View style={s.orientRow}>
              <TouchableOpacity
                style={[s.orientCard, newMenuOrientation === 'horizontal' && { borderColor: newMenuColor, backgroundColor: newMenuColor + '10' }]}
                onPress={() => setNewMenuOrientation('horizontal')}
                activeOpacity={0.8}
              >
                <View style={s.orientPreviewStd}>
                  <View style={s.orientPreviewImgTop} />
                  <View style={{ gap: 3 }}>
                    <View style={s.orientPreviewLine} />
                    <View style={[s.orientPreviewLine, { width: '60%' }]} />
                  </View>
                </View>
                {newMenuOrientation === 'horizontal' && (
                  <View style={[s.orientCheck, { backgroundColor: newMenuColor }]}>
                    <Check size={10} color="#fff" strokeWidth={3} />
                  </View>
                )}
                <Text style={[s.orientCardTitle, newMenuOrientation === 'horizontal' && { color: newMenuColor }]}>Carta estándar</Text>
                <Text style={s.orientCardDesc}>Imagen arriba del plato</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.orientCard, newMenuOrientation === 'vertical' && { borderColor: newMenuColor, backgroundColor: newMenuColor + '10' }]}
                onPress={() => setNewMenuOrientation('vertical')}
                activeOpacity={0.8}
              >
                <View style={s.orientPreviewWine}>
                  <View style={{ flex: 1, gap: 3, justifyContent: 'center' }}>
                    <View style={s.orientPreviewLine} />
                    <View style={[s.orientPreviewLine, { width: '70%' }]} />
                    <View style={[s.orientPreviewLine, { width: '50%' }]} />
                  </View>
                  <View style={s.orientPreviewBottle} />
                </View>
                {newMenuOrientation === 'vertical' && (
                  <View style={[s.orientCheck, { backgroundColor: newMenuColor }]}>
                    <Check size={10} color="#fff" strokeWidth={3} />
                  </View>
                )}
                <Text style={[s.orientCardTitle, newMenuOrientation === 'vertical' && { color: newMenuColor }]}>Carta de vinos</Text>
                <Text style={s.orientCardDesc}>Imagen vertical a la derecha</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: newMenuColor, marginTop: 20 }]}
              onPress={handleCreateMenu}
              activeOpacity={0.8}
              disabled={createMenuMut.isPending}
            >
              {createMenuMut.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Plus size={18} color="#fff" strokeWidth={2.5} /><Text style={s.saveBtnText}>Crear carta</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Modal */}
      {showQr && (
        <QrModal
          menuId={showQr.id}
          menuName={showQr.name}
          color={showQr.color}
          onClose={() => setShowQr(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBack: { marginLeft: 8, padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  pageTitle: { fontSize: 20, fontWeight: '800' as const, color: '#0f172a' },
  pageSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },

  menuCard: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  menuCardMain: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuColorDot: { width: 12, height: 12, borderRadius: 6 },
  menuCardName: { flex: 1, fontSize: 16, fontWeight: '700' as const, color: '#0f172a' },
  menuCardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  menuActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  menuActionText: { fontSize: 13, fontWeight: '600' as const },
  menuDeleteBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },

  addMenuBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: '#0EA5E9', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 16, backgroundColor: '#f0f9ff',
  },
  addMenuBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#0EA5E9' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700' as const, color: '#475569', marginTop: 8 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 260, lineHeight: 18 },

  levelBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  levelBannerTitle: { fontSize: 12, fontWeight: '600' as const, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 6 },
  levelBannerRow: { flexDirection: 'row', gap: 8 },
  inlineInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#0f172a',
  },
  saveSmallBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qrSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  qrSmallText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },

  catCard: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  catCardInactive: { opacity: 0.6 },
  catCardMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  catColorDot: { width: 10, height: 10, borderRadius: 5 },
  catCardName: { fontSize: 15, fontWeight: '700' as const, color: '#0f172a' },
  catCardNameInactive: { color: '#94a3b8' },
  catCardDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  catPosLabel: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 },
  catCardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 14, paddingBottom: 10, alignItems: 'center' },
  catToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  catToggleText: { fontSize: 12, fontWeight: '600' as const },
  catEditBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center' },
  catDeleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },

  addCatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  addCatBtnText: { fontSize: 14, fontWeight: '700' as const },

  catBanner: {
    padding: 16, borderLeftWidth: 4, marginBottom: 4,
    marginHorizontal: 0,
  },
  catBannerName: { fontSize: 18, fontWeight: '800' as const },
  catBannerDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },

  itemRow: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, flexDirection: 'row',
    alignItems: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  itemInactive: { opacity: 0.55 },
  itemThumb: { width: 68, height: 68 },
  itemRowContent: { flex: 1, padding: 12 },
  itemRowName: { fontSize: 14, fontWeight: '700' as const, color: '#0f172a' },
  itemRowPrice: { fontSize: 14, fontWeight: '800' as const, marginTop: 2 },
  itemAllergenCount: { fontSize: 11, color: '#f59e0b', marginTop: 2 },
  itemDietaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  itemDietaryBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  itemDietaryEmoji: { fontSize: 12 },
  itemInactiveLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  itemOrderCol: { flexDirection: 'column', gap: 3, paddingLeft: 8, justifyContent: 'center', alignItems: 'center', width: 28 },
  itemOrderBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center' },
  itemOrderBtnDisabled: { backgroundColor: '#f8fafc' },
  itemRowActions: { flexDirection: 'column', gap: 6, padding: 10 },
  itemEditBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center' },
  itemDeleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },

  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  addItemBtnText: { fontSize: 14, fontWeight: '700' as const },

  configHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  configHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  configHeaderText: { fontSize: 14, fontWeight: '700' as const },
  configBody: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  configSection: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  configSectionTitle: { fontSize: 13, fontWeight: '700' as const, color: '#0f172a', marginBottom: 3 },
  configSectionSubtitle: { fontSize: 11, color: '#94a3b8', lineHeight: 15, marginBottom: 12 },
  configToggleRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  configToggleLabel: { fontSize: 13, fontWeight: '600' as const, color: '#0f172a' },
  configToggleHint: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  charRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  charColorDot: { width: 10, height: 10, borderRadius: 5 },
  charEmoji: { fontSize: 16 },
  charLabel: { flex: 1, fontSize: 13, color: '#0f172a', fontWeight: '500' as const },
  charDeleteBtn: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#fee2e2',
    alignItems: 'center', justifyContent: 'center',
  },
  addCharForm: { marginTop: 10 },
  addCharRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  addCharBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addCharCancelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center',
  },
  addCharCancelText: { fontSize: 13, color: '#64748b', fontWeight: '600' as const },
  addCharSaveBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  addCharSaveText: { fontSize: 13, color: '#fff', fontWeight: '700' as const },
  addCharBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 8, borderWidth: 1,
    borderStyle: 'dashed' as const, marginTop: 8,
  },
  addCharBtnText: { fontSize: 13, fontWeight: '600' as const },

  formSection: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  formLabel: { fontSize: 14, fontWeight: '600' as const, color: '#0f172a' },
  formLabelAlt: { fontSize: 14, fontWeight: '600' as const, color: '#475569' },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 0, marginBottom: 10 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#0f172a',
  },
  textarea: { height: 80, paddingTop: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceExtraHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  extraPriceRow: { flexDirection: 'row', gap: 8 },

  imagePickerBtn: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed',
    borderRadius: 12, minHeight: 200, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8fafc', overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: 280 },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  imageOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
  imagePickerText: { fontSize: 13, color: '#94a3b8', marginTop: 8 },
  removeImageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' },
  removeImageText: { fontSize: 13, color: '#ef4444', fontWeight: '500' as const },

  allergenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  allergenBtnEmoji: { fontSize: 15 },
  allergenBtnLabel: { fontSize: 12, color: '#475569' },

  dietaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dietaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  dietaryBtnEmoji: { fontSize: 16 },
  dietaryBtnLabel: { fontSize: 13, color: '#475569', fontWeight: '500' as const },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 14,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' as const, color: '#0f172a' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '600' as const, color: '#0f172a', marginBottom: 8 },
  orientRow: { flexDirection: 'row', gap: 10 },
  orientCard: {
    flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    padding: 10, alignItems: 'center', backgroundColor: '#f8fafc', position: 'relative' as const,
  },
  orientPreviewStd: { width: '100%', height: 56, marginBottom: 8, gap: 4 },
  orientPreviewImgTop: { height: 30, backgroundColor: '#e2e8f0', borderRadius: 5, width: '100%' },
  orientPreviewLine: { height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, width: '100%' },
  orientPreviewWine: { width: '100%', height: 56, flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' },
  orientPreviewBottle: { width: 18, height: 50, backgroundColor: '#e2e8f0', borderRadius: 4 },
  orientCheck: {
    position: 'absolute' as const, top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  orientCardTitle: { fontSize: 12, fontWeight: '700' as const, color: '#0f172a', textAlign: 'center' as const },
  orientCardDesc: { fontSize: 10, color: '#94a3b8', textAlign: 'center' as const, marginTop: 2 },
  colorPreview: {
    borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center',
  },
  colorPreviewText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },
});
