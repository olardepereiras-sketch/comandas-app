import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Modal, Image, Dimensions,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { AlertCircle, ChevronDown, ChevronUp, Info, X, SlidersHorizontal, Check } from 'lucide-react-native';

const ALLERGEN_ICONS: Record<string, { label: string; emoji: string }> = {
  gluten:         { label: 'Gluten',            emoji: '🌾' },
  crustaceos:     { label: 'Crustáceos',         emoji: '🦐' },
  huevos:         { label: 'Huevos',             emoji: '🥚' },
  pescado:        { label: 'Pescado',            emoji: '🐟' },
  cacahuetes:     { label: 'Cacahuetes',         emoji: '🥜' },
  soja:           { label: 'Soja',               emoji: '🫘' },
  lacteos:        { label: 'Lácteos',            emoji: '🥛' },
  frutos_cascara: { label: 'Frutos de cáscara',  emoji: '🌰' },
  apio:           { label: 'Apio',               emoji: '🥬' },
  mostaza:        { label: 'Mostaza',            emoji: '🌿' },
  sesamo:         { label: 'Sésamo',             emoji: '🌱' },
  sulfitos:       { label: 'Sulfitos',           emoji: '🍷' },
  altramuces:     { label: 'Altramuces',         emoji: '🌼' },
  moluscos:       { label: 'Moluscos',           emoji: '🐚' },
};

const ALLERGENS_LIST = [
  { id: 'gluten',         label: 'Gluten',           emoji: '🌾' },
  { id: 'crustaceos',     label: 'Crustáceos',        emoji: '🦐' },
  { id: 'huevos',         label: 'Huevos',            emoji: '🥚' },
  { id: 'pescado',        label: 'Pescado',           emoji: '🐟' },
  { id: 'cacahuetes',     label: 'Cacahuetes',        emoji: '🥜' },
  { id: 'soja',           label: 'Soja',              emoji: '🫘' },
  { id: 'lacteos',        label: 'Lácteos',           emoji: '🥛' },
  { id: 'frutos_cascara', label: 'Frutos de cáscara', emoji: '🌰' },
  { id: 'apio',           label: 'Apio',              emoji: '🥬' },
  { id: 'mostaza',        label: 'Mostaza',           emoji: '🌿' },
  { id: 'sesamo',         label: 'Sésamo',            emoji: '🌱' },
  { id: 'sulfitos',       label: 'Sulfitos',          emoji: '🍷' },
  { id: 'altramuces',     label: 'Altramuces',        emoji: '🌼' },
  { id: 'moluscos',       label: 'Moluscos',          emoji: '🐚' },
];

const DIETARY_PREFS = [
  { id: 'sin_gluten',   label: 'Sin gluten',    emoji: '🌾', color: '#f59e0b' },
  { id: 'sin_lactosa',  label: 'Sin lactosa',   emoji: '🥛', color: '#3b82f6' },
  { id: 'vegetariano',  label: 'Vegetariano',   emoji: '🥗', color: '#10b981' },
  { id: 'vegano',       label: 'Vegano',        emoji: '🌱', color: '#22c55e' },
  { id: 'pescatariano', label: 'Pescatariano',  emoji: '🐟', color: '#06b6d4' },
];

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  allergens: string[];
  dietaryPreferences: string[];
  price2Enabled: boolean;
  price2Name: string | null;
  price2Amount: number | null;
  price3Enabled: boolean;
  price3Name: string | null;
  price3Amount: number | null;
}

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  color: string;
  position: number;
  isActive: boolean;
  items: MenuItem[];
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 14, g: 165, b: 233 };
}

function ImageFullscreenModal({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  const { width: screenW, height: screenH } = Dimensions.get('window');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={imgM.overlay}>
        <TouchableOpacity style={imgM.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <X size={22} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          style={imgM.imageTap}
          onPress={onClose}
          activeOpacity={1}
        >
          <Image
            source={{ uri }}
            style={{ width: screenW, height: screenH * 0.88 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const imgM = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.93)', justifyContent: 'center', alignItems: 'center' },
  imageTap: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  fullImage: {},
  fullImageInner: { flex: 1, width: '100%' as any },
  closeBtn: {
    position: 'absolute', top: 48, right: 20, zIndex: 10,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
});

function ItemCard({
  item, menuColor, catColor, hidden, onImagePress, customChars,
}: {
  item: MenuItem; menuColor: string; catColor: string; hidden: boolean;
  onImagePress: (uri: string) => void;
  customChars: { id: string; label: string; emoji: string; color: string }[];
}) {
  const [showAllergens, setShowAllergens] = useState(false);
  const [imageError, setImageError] = useState(false);
  const color = catColor || menuColor;
  const allergensPresent = item.allergens && item.allergens.length > 0;
  const dietaryPresent = (item.dietaryPreferences || []).length > 0;
  const activeChars = customChars.length > 0 ? customChars : DIETARY_PREFS;

  if (hidden) return null;

  return (
    <View style={styles.itemCard}>
      {item.imageUrl && !imageError && (
        <TouchableOpacity onPress={() => onImagePress(item.imageUrl!)} activeOpacity={0.9}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.itemImage}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        </TouchableOpacity>
      )}
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.priceCol}>
            <Text style={[styles.itemPrice, { color }]}>{item.price.toFixed(2)}€</Text>
            {item.price2Enabled && item.price2Name && item.price2Amount != null && (
              <View style={[styles.extraPrice, { borderColor: color + '40' }]}>
                <Text style={styles.extraPriceName}>{item.price2Name}</Text>
                <Text style={[styles.extraPriceAmt, { color }]}>{item.price2Amount.toFixed(2)}€</Text>
              </View>
            )}
            {item.price3Enabled && item.price3Name && item.price3Amount != null && (
              <View style={[styles.extraPrice, { borderColor: color + '40' }]}>
                <Text style={styles.extraPriceName}>{item.price3Name}</Text>
                <Text style={[styles.extraPriceAmt, { color }]}>{item.price3Amount.toFixed(2)}€</Text>
              </View>
            )}
          </View>
        </View>

        {item.description ? (
          <Text style={styles.itemDesc}>{item.description}</Text>
        ) : null}

        {dietaryPresent && (
          <View style={styles.dietaryBadgeRow}>
            {(item.dietaryPreferences || []).map((dp) => {
              const pref = DIETARY_PREFS.find((p) => p.id === dp);
              return pref ? (
                <View key={dp} style={[styles.dietaryBadge, { backgroundColor: pref.color + '18', borderColor: pref.color + '50' }]}>
                  <Text style={styles.dietaryBadgeEmoji}>{pref.emoji}</Text>
                  <Text style={[styles.dietaryBadgeLabel, { color: pref.color }]}>{pref.label}</Text>
                </View>
              ) : null;
            })}
          </View>
        )}

        {allergensPresent && (
          <TouchableOpacity
            style={styles.allergenToggle}
            onPress={() => setShowAllergens(v => !v)}
            activeOpacity={0.7}
          >
            <AlertCircle size={14} color="#f59e0b" strokeWidth={2.5} />
            <Text style={styles.allergenToggleText}>Alérgenos</Text>
            {showAllergens
              ? <ChevronUp size={14} color="#94a3b8" strokeWidth={2.5} />
              : <ChevronDown size={14} color="#94a3b8" strokeWidth={2.5} />}
          </TouchableOpacity>
        )}

        {showAllergens && allergensPresent && (
          <View style={styles.allergenList}>
            {item.allergens.map((a) => {
              const info = ALLERGEN_ICONS[a];
              return (
                <View key={a} style={styles.allergenChip}>
                  <Text style={styles.allergenEmoji}>{info?.emoji ?? '⚠️'}</Text>
                  <Text style={styles.allergenLabel}>{info?.label ?? a}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

function WineItemCard({
  item, catColor, menuColor, onImagePress,
}: {
  item: MenuItem; catColor: string; menuColor: string; onImagePress: (uri: string) => void;
}) {
  const [showAllergens, setShowAllergens] = useState(false);
  const [imageError, setImageError] = useState(false);
  const color = catColor || menuColor;
  const allergensPresent = item.allergens && item.allergens.length > 0;
  const hasExtraPrices = (item.price2Enabled && item.price2Name && item.price2Amount != null)
    || (item.price3Enabled && item.price3Name && item.price3Amount != null);

  const priceRows: { name: string; amount: number }[] = [];
  if (!hasExtraPrices) {
    priceRows.push({ name: '', amount: item.price });
  } else {
    if (item.price2Enabled && item.price2Name && item.price2Amount != null) {
      priceRows.push({ name: item.price2Name, amount: item.price2Amount });
    }
    if (item.price3Enabled && item.price3Name && item.price3Amount != null) {
      priceRows.push({ name: item.price3Name, amount: item.price3Amount });
    }
    if (!item.price2Enabled && !item.price3Enabled) {
      priceRows.push({ name: '', amount: item.price });
    }
  }

  const mainPrice = !hasExtraPrices
    ? [{ name: '', amount: item.price }]
    : [];

  const allPriceRows: { name: string; amount: number }[] = [];
  allPriceRows.push({ name: '', amount: item.price });
  if (item.price2Enabled && item.price2Name && item.price2Amount != null) {
    allPriceRows.push({ name: item.price2Name.toUpperCase(), amount: item.price2Amount });
  }
  if (item.price3Enabled && item.price3Name && item.price3Amount != null) {
    allPriceRows.push({ name: item.price3Name.toUpperCase(), amount: item.price3Amount });
  }

  return (
    <View style={wine.card}>
      <View style={wine.content}>
        <Text style={wine.name}>{item.name}</Text>
        {item.description ? <Text style={wine.desc}>{item.description}</Text> : null}
        <View style={wine.priceBlock}>
          {allPriceRows.map((row, i) => (
            <View key={i} style={wine.priceRow}>
              {row.name ? <Text style={wine.priceName}>{row.name}</Text> : null}
              <View style={wine.priceDash} />
              <Text style={[wine.priceAmt, { color }]}>{row.amount.toFixed(2)}€</Text>
            </View>
          ))}
        </View>
        {allergensPresent && (
          <TouchableOpacity
            style={wine.allergenToggle}
            onPress={() => setShowAllergens(v => !v)}
            activeOpacity={0.7}
          >
            <AlertCircle size={12} color="#f59e0b" strokeWidth={2.5} />
            <Text style={wine.allergenToggleText}>Alérgenos</Text>
            {showAllergens
              ? <ChevronUp size={12} color="#94a3b8" strokeWidth={2.5} />
              : <ChevronDown size={12} color="#94a3b8" strokeWidth={2.5} />}
          </TouchableOpacity>
        )}
        {showAllergens && allergensPresent && (
          <View style={wine.allergenList}>
            {item.allergens.map((a) => {
              const info = ALLERGEN_ICONS[a];
              return (
                <View key={a} style={wine.allergenChip}>
                  <Text style={{ fontSize: 11 }}>{info?.emoji ?? '⚠️'}</Text>
                  <Text style={wine.allergenChipText}>{info?.label ?? a}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
      {item.imageUrl && !imageError ? (
        <TouchableOpacity
          onPress={() => onImagePress(item.imageUrl!)}
          activeOpacity={0.85}
          style={wine.imageWrapper}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={wine.image}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        </TouchableOpacity>
      ) : (
        <View style={wine.imagePlaceholder} />
      )}
    </View>
  );
}

const wine = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  content: { flex: 1, paddingRight: 16 },
  name: { fontSize: 16, fontWeight: '700' as const, color: '#1a1a1a', marginBottom: 2, letterSpacing: -0.2 },
  desc: { fontSize: 12, color: '#888', marginBottom: 8, lineHeight: 16 },
  priceBlock: { gap: 4, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceName: { fontSize: 11, color: '#999', fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const, width: 72 },
  priceDash: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  priceAmt: { fontSize: 15, fontWeight: '700' as const, minWidth: 36, textAlign: 'right' as const },
  allergenToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start' as const },
  allergenToggleText: { fontSize: 11, color: '#f59e0b', fontWeight: '600' as const },
  allergenList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  allergenChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#fef9c3', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: '#fde68a',
  },
  allergenChipText: { fontSize: 10, color: '#92400e' },
  imageWrapper: { width: 90, height: 126, borderRadius: 8, backgroundColor: '#f8f8f8', alignItems: 'center' as const, justifyContent: 'center' as const },
  image: { width: 90, height: 126 },
  imagePlaceholder: { width: 90 },
});

function WineCategorySection({
  cat, menuColor, hiddenAllergens, requiredDietaryPrefs, onImagePress, customChars,
}: {
  cat: MenuCategory;
  menuColor: string;
  hiddenAllergens: string[];
  requiredDietaryPrefs: string[];
  onImagePress: (uri: string) => void;
  customChars: { id: string; label: string; emoji: string; color: string }[];
}) {
  const color = cat.color || menuColor;
  const rgb = hexToRgb(color);

  const visibleItems = useMemo(() => {
    return cat.items.filter((item) => {
      if (hiddenAllergens.length > 0) {
        const hasHiddenAllergen = item.allergens.some((a) => hiddenAllergens.includes(a));
        if (hasHiddenAllergen) return false;
      }
      if (requiredDietaryPrefs.length > 0) {
        const prefs = item.dietaryPreferences || [];
        const hasAllRequired = requiredDietaryPrefs.every((p) => prefs.includes(p));
        if (!hasAllRequired) return false;
      }
      return true;
    });
  }, [cat.items, hiddenAllergens, requiredDietaryPrefs]);

  if (visibleItems.length === 0 && (hiddenAllergens.length > 0 || requiredDietaryPrefs.length > 0)) {
    return null;
  }

  return (
    <View style={wineSection.container}>
      <View style={[wineSection.header, { backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)` }]}>
        <Text style={[wineSection.headerText, { color: `rgba(${rgb.r},${rgb.g},${rgb.b},1)` }]}>{cat.name}</Text>
        {cat.description ? <Text style={wineSection.headerDesc}>{cat.description}</Text> : null}
      </View>
      {visibleItems.length === 0 ? (
        <Text style={styles.emptyCategory}>Sin platos en esta categoría</Text>
      ) : (
        visibleItems.map((item) => (
          <WineItemCard
            key={item.id}
            item={item}
            catColor={cat.color}
            menuColor={menuColor}
            onImagePress={onImagePress}
          />
        ))
      )}
    </View>
  );
}

const wineSection = StyleSheet.create({
  container: { marginTop: 4 },
  header: {
    paddingVertical: 14, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 2,
  },
  headerText: {
    fontSize: 20, fontWeight: '700' as const,
    letterSpacing: 0.5, textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  headerDesc: { fontSize: 12, color: '#888', marginTop: 2, textAlign: 'center' as const },
});

function CategorySection({
  cat, menuColor, hiddenAllergens, requiredDietaryPrefs, onImagePress, customChars,
}: {
  cat: MenuCategory;
  menuColor: string;
  hiddenAllergens: string[];
  requiredDietaryPrefs: string[];
  onImagePress: (uri: string) => void;
  customChars: { id: string; label: string; emoji: string; color: string }[];
}) {
  const color = cat.color || menuColor;
  const [imageError, setImageError] = useState(false);
  const rgb = hexToRgb(color);

  const visibleItems = useMemo(() => {
    return cat.items.filter((item) => {
      if (hiddenAllergens.length > 0) {
        const hasHiddenAllergen = item.allergens.some((a) => hiddenAllergens.includes(a));
        if (hasHiddenAllergen) return false;
      }
      if (requiredDietaryPrefs.length > 0) {
        const prefs = item.dietaryPreferences || [];
        const hasAllRequired = requiredDietaryPrefs.every((p) => prefs.includes(p));
        if (!hasAllRequired) return false;
      }
      return true;
    });
  }, [cat.items, hiddenAllergens, requiredDietaryPrefs]);

  if (visibleItems.length === 0 && (hiddenAllergens.length > 0 || requiredDietaryPrefs.length > 0)) {
    return null;
  }

  return (
    <View style={styles.categorySection}>
      {cat.imageUrl && !imageError && (
        <Image
          source={{ uri: cat.imageUrl }}
          style={styles.categoryImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      )}
      <View style={[styles.categoryHeader, { backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`, borderLeftColor: color }]}>
        <View style={[styles.categoryDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.categoryName, { color }]}>{cat.name}</Text>
          {cat.description ? <Text style={styles.categoryDesc}>{cat.description}</Text> : null}
        </View>
      </View>

      {visibleItems.length === 0 ? (
        <Text style={styles.emptyCategory}>Sin productos en esta categoría</Text>
      ) : (
        visibleItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            menuColor={menuColor}
            catColor={cat.color}
            hidden={false}
            onImagePress={onImagePress}
            customChars={customChars}
          />
        ))
      )}
    </View>
  );
}

function FilterModal({
  visible,
  onClose,
  hiddenAllergens,
  setHiddenAllergens,
  requiredDietaryPrefs,
  setRequiredDietaryPrefs,
  accentColor,
  showAllergenFilter,
  showDietaryFilter,
  customChars,
}: {
  visible: boolean;
  onClose: () => void;
  hiddenAllergens: string[];
  setHiddenAllergens: (v: string[]) => void;
  requiredDietaryPrefs: string[];
  setRequiredDietaryPrefs: (v: string[]) => void;
  accentColor: string;
  showAllergenFilter: boolean;
  showDietaryFilter: boolean;
  customChars: { id: string; label: string; emoji: string; color: string }[];
}) {
  const toggleAllergen = useCallback((id: string) => {
    setHiddenAllergens(
      hiddenAllergens.includes(id)
        ? hiddenAllergens.filter((a) => a !== id)
        : [...hiddenAllergens, id]
    );
  }, [hiddenAllergens, setHiddenAllergens]);

  const toggleDietary = useCallback((id: string) => {
    setRequiredDietaryPrefs(
      requiredDietaryPrefs.includes(id)
        ? requiredDietaryPrefs.filter((d) => d !== id)
        : [...requiredDietaryPrefs, id]
    );
  }, [requiredDietaryPrefs, setRequiredDietaryPrefs]);

  const clearAll = useCallback(() => {
    setHiddenAllergens([]);
    setRequiredDietaryPrefs([]);
  }, [setHiddenAllergens, setRequiredDietaryPrefs]);

  const hasFilters = hiddenAllergens.length > 0 || requiredDietaryPrefs.length > 0;
  const dietaryList = customChars.length > 0 ? customChars : DIETARY_PREFS;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={fm.overlay}>
        <View style={fm.sheet}>
          <View style={fm.handle} />
          <View style={fm.header}>
            <View style={fm.headerLeft}>
              <SlidersHorizontal size={20} color={accentColor} strokeWidth={2.5} />
              <Text style={fm.title}>Filtrar carta</Text>
              {hasFilters && (
                <View style={[fm.activeBadge, { backgroundColor: accentColor }]}>
                  <Text style={fm.activeBadgeText}>{hiddenAllergens.length + requiredDietaryPrefs.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={fm.closeBtn} activeOpacity={0.7}>
              <X size={20} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={fm.scroll}>
            {(showDietaryFilter || customChars.length > 0) && (
              <View style={fm.section}>
                <Text style={fm.sectionTitle}>Ver solo:</Text>
                <Text style={fm.sectionSubtitle}>Solo se mostrarán los productos con estas características</Text>
                <View style={fm.optionGrid}>
                  {dietaryList.map((dp) => {
                    const selected = requiredDietaryPrefs.includes(dp.id);
                    return (
                      <TouchableOpacity
                        key={dp.id}
                        style={[fm.optionBtn, selected && { backgroundColor: dp.color + '18', borderColor: dp.color }]}
                        onPress={() => toggleDietary(dp.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={fm.optionEmoji}>{dp.emoji}</Text>
                        <Text style={[fm.optionLabel, selected && { color: dp.color, fontWeight: '700' as const }]}>{dp.label}</Text>
                        {selected && (
                          <View style={[fm.checkCircle, { backgroundColor: dp.color }]}>
                            <Check size={10} color="#fff" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {showAllergenFilter && (
              <View style={fm.section}>
                <Text style={fm.sectionTitle}>Ocultar productos con:</Text>
                <Text style={fm.sectionSubtitle}>Se ocultarán los productos que contengan estos alérgenos</Text>
                <View style={fm.allergenGrid}>
                  {ALLERGENS_LIST.map((a) => {
                    const selected = hiddenAllergens.includes(a.id);
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[fm.allergenBtn, selected && fm.allergenBtnSelected]}
                        onPress={() => toggleAllergen(a.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={fm.allergenEmoji}>{a.emoji}</Text>
                        <Text style={[fm.allergenLabel, selected && fm.allergenLabelSelected]}>{a.label}</Text>
                        {selected && <Check size={11} color="#ef4444" strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={fm.footer}>
            {hasFilters && (
              <TouchableOpacity style={fm.clearBtn} onPress={clearAll} activeOpacity={0.7}>
                <Text style={fm.clearBtnText}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[fm.applyBtn, { backgroundColor: accentColor }]} onPress={onClose} activeOpacity={0.8}>
              <Text style={fm.applyBtnText}>Ver resultados</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800' as const, color: '#0f172a' },
  activeBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activeBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' as const },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20 },
  section: { paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800' as const, color: '#0f172a', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 16 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
    position: 'relative',
  },
  optionEmoji: { fontSize: 17 },
  optionLabel: { fontSize: 13, color: '#475569', fontWeight: '500' as const },
  checkCircle: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  allergenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  allergenBtnSelected: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  allergenEmoji: { fontSize: 15 },
  allergenLabel: { fontSize: 12, color: '#475569' },
  allergenLabelSelected: { color: '#dc2626', fontWeight: '600' as const },
  footer: { flexDirection: 'row', gap: 10, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  clearBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0' },
  clearBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#64748b' },
  applyBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#fff' },
});

export default function PublicMenuScreen() {
  const { menuId } = useLocalSearchParams<{ menuId: string }>();
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const catRefs = useRef<Record<string, number>>({});

  const [showFilter, setShowFilter] = useState(false);
  const [hiddenAllergens, setHiddenAllergens] = useState<string[]>([]);
  const [requiredDietaryPrefs, setRequiredDietaryPrefs] = useState<string[]>([]);

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const menuQuery = trpc.digitalMenus.getPublic.useQuery(
    { menuId: menuId || '' },
    { enabled: !!menuId }
  );

  const hasActiveFilters = hiddenAllergens.length > 0 || requiredDietaryPrefs.length > 0;

  const handleImagePress = useCallback((uri: string) => {
    setFullscreenImage(uri);
  }, []);

  if (menuQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Cargando carta...</Text>
      </View>
    );
  }

  if (menuQuery.error || !menuQuery.data) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Info size={48} color="#ef4444" />
        <Text style={styles.errorText}>Carta no encontrada</Text>
        <Text style={styles.errorSub}>Comprueba que el enlace es correcto</Text>
      </View>
    );
  }

  const menu = menuQuery.data;
  const categories = (menu.categories as MenuCategory[]).filter((c) => c.isActive !== false);
  const color = menu.color || '#0EA5E9';
  const rgb = hexToRgb(color);
  const isWine = (menu as any).imageOrientation === 'vertical';
  const menuCustomChars: { id: string; label: string; emoji: string; color: string }[] =
    Array.isArray((menu as any).customCharacteristics) ? (menu as any).customCharacteristics : [];
  const effectiveChars = menuCustomChars.length > 0 ? menuCustomChars : DIETARY_PREFS;
  const showAllergenFilter = (menu as any).showAllergenFilter !== false;
  const showDietaryFilter = (menu as any).showDietaryFilter !== false;
  const hasAnyFilter = showAllergenFilter || showDietaryFilter || menuCustomChars.length > 0;

  const scrollToCategory = (catId: string) => {
    setActiveCatId(catId);
    const offset = catRefs.current[catId];
    if (offset !== undefined) {
      scrollRef.current?.scrollTo({ y: offset - 80, animated: true });
    }
  };

  return (
    <View style={[styles.root, isWine && wineRoot.root]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero header */}
      <View style={[styles.hero, { backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},1)` }]}>
        {menu.restaurantImageUrl && (
          <Image
            source={{ uri: menu.restaurantImageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        )}
        <View style={[styles.heroOverlay, { backgroundColor: `rgba(${rgb.r * 0.2},${rgb.g * 0.2},${rgb.b * 0.2},0.55)` }]} />
        <View style={styles.heroContent}>
          <Text style={styles.heroRestaurant}>{menu.restaurantName}</Text>
          <Text style={styles.heroMenuName}>{menu.name}</Text>
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilters && { backgroundColor: '#fff' }]}
          onPress={() => setShowFilter(true)}
          activeOpacity={0.8}
        >
          <SlidersHorizontal size={17} color={hasActiveFilters ? color : '#fff'} strokeWidth={2.5} />
          {hasActiveFilters && (
            <View style={[styles.filterBadge, { backgroundColor: color }]}>
              <Text style={styles.filterBadgeText}>{hiddenAllergens.length + requiredDietaryPrefs.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <View style={[styles.activeFiltersBar, { borderBottomColor: `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)` }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
            <Text style={styles.activeFiltersLabel}>Filtros:</Text>
            {requiredDietaryPrefs.map((dp) => {
              const pref = DIETARY_PREFS.find((p) => p.id === dp);
              return pref ? (
                <TouchableOpacity
                  key={dp}
                  style={[styles.activeFilterChip, { backgroundColor: pref.color + '18', borderColor: pref.color + '50' }]}
                  onPress={() => setRequiredDietaryPrefs(requiredDietaryPrefs.filter((d) => d !== dp))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.activeFilterChipText}>{pref.emoji} {pref.label}</Text>
                  <X size={11} color="#64748b" strokeWidth={2.5} />
                </TouchableOpacity>
              ) : null;
            })}
            {hiddenAllergens.map((a) => {
              const info = ALLERGEN_ICONS[a];
              return (
                <TouchableOpacity
                  key={a}
                  style={styles.activeFilterChipAllergen}
                  onPress={() => setHiddenAllergens(hiddenAllergens.filter((h) => h !== a))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.activeFilterChipText}>sin {info?.emoji ?? '⚠️'} {info?.label ?? a}</Text>
                  <X size={11} color="#64748b" strokeWidth={2.5} />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.clearAllChip}
              onPress={() => { setHiddenAllergens([]); setRequiredDietaryPrefs([]); }}
              activeOpacity={0.7}
            >
              <Text style={styles.clearAllChipText}>Limpiar todo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Category nav pills */}
      {categories.length > 1 && (
        <View style={[styles.navBar, { backgroundColor: isWine ? '#fafafa' : `rgba(${rgb.r},${rgb.g},${rgb.b},0.06)`, borderBottomColor: isWine ? '#eee' : `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)` }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
            {categories.map((cat) => {
              const isActive = activeCatId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.navPill,
                    isActive && { backgroundColor: cat.color || color },
                  ]}
                  onPress={() => scrollToCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.navPillText, isActive && { color: '#fff' }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Esta carta no tiene categorías aún</Text>
          </View>
        ) : (
          categories.map((cat) => (
            <View
              key={cat.id}
              onLayout={(e) => {
                catRefs.current[cat.id] = e.nativeEvent.layout.y;
              }}
            >
              {isWine ? (
                <WineCategorySection
                  cat={cat}
                  menuColor={color}
                  hiddenAllergens={hiddenAllergens}
                  requiredDietaryPrefs={requiredDietaryPrefs}
                  onImagePress={handleImagePress}
                  customChars={menuCustomChars}
                />
              ) : (
                <CategorySection
                  cat={cat}
                  menuColor={color}
                  hiddenAllergens={hiddenAllergens}
                  requiredDietaryPrefs={requiredDietaryPrefs}
                  onImagePress={handleImagePress}
                  customChars={menuCustomChars}
                />
              )}
            </View>
          ))
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Precios con IVA incluido</Text>
          <Text style={styles.footerBrand}>Powered by Quieromesa</Text>
        </View>
      </ScrollView>

      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        hiddenAllergens={hiddenAllergens}
        setHiddenAllergens={setHiddenAllergens}
        requiredDietaryPrefs={requiredDietaryPrefs}
        setRequiredDietaryPrefs={setRequiredDietaryPrefs}
        accentColor={color}
        showAllergenFilter={showAllergenFilter}
        showDietaryFilter={showDietaryFilter}
        customChars={menuCustomChars}
      />

      {fullscreenImage && (
        <ImageFullscreenModal
          uri={fullscreenImage}
          visible={!!fullscreenImage}
          onClose={() => setFullscreenImage(null)}
        />
      )}
    </View>
  );
}

const wineRoot = StyleSheet.create({
  root: { backgroundColor: '#fff' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 15 },
  errorText: { fontSize: 20, fontWeight: '700' as const, color: '#0f172a', marginTop: 16 },
  errorSub: { fontSize: 14, color: '#64748b', marginTop: 6, textAlign: 'center' },

  hero: { height: 200, position: 'relative', justifyContent: 'flex-end' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroContent: { padding: 20, paddingBottom: 24, paddingRight: 60 },
  heroRestaurant: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' as const, marginBottom: 2, textTransform: 'uppercase' as const, letterSpacing: 1.2 },
  heroMenuName: { fontSize: 26, fontWeight: '800' as const, color: '#fff', letterSpacing: -0.5 },

  filterBtn: {
    position: 'absolute', bottom: 20, right: 20,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  filterBadgeText: { fontSize: 10, color: '#fff', fontWeight: '800' as const },

  activeFiltersBar: { borderBottomWidth: 1, backgroundColor: '#fff' },
  activeFiltersScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  activeFiltersLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' as const, marginRight: 2 },
  activeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1,
  },
  activeFilterChipAllergen: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
  },
  activeFilterChipText: { fontSize: 12, color: '#475569', fontWeight: '500' as const },
  clearAllChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  clearAllChipText: { fontSize: 12, color: '#64748b', fontWeight: '600' as const },

  navBar: { borderBottomWidth: 1 },
  navScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  navPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  navPillText: { fontSize: 13, fontWeight: '600' as const, color: '#475569' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  categorySection: { marginTop: 4 },
  categoryImage: { width: '100%', height: 140, resizeMode: 'cover' },
  categoryHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 16, paddingLeft: 20, borderLeftWidth: 4, marginBottom: 4,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  categoryName: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.3 },
  categoryDesc: { fontSize: 13, color: '#64748b', marginTop: 2, lineHeight: 18 },
  emptyCategory: { textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 16 },

  itemCard: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 2,
  },
  itemImage: { width: '100%', height: 200, resizeMode: 'contain' as const, backgroundColor: '#f8fafc' },
  itemBody: { padding: 14 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  itemName: { flex: 1, fontSize: 15, fontWeight: '700' as const, color: '#0f172a', lineHeight: 20 },
  priceCol: { alignItems: 'flex-end', gap: 4 },
  itemPrice: { fontSize: 16, fontWeight: '800' as const },
  extraPrice: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  extraPriceName: { fontSize: 10, color: '#64748b', fontWeight: '500' as const },
  extraPriceAmt: { fontSize: 12, fontWeight: '700' as const },
  itemDesc: { fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 18 },

  dietaryBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  dietaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  dietaryBadgeEmoji: { fontSize: 12 },
  dietaryBadgeLabel: { fontSize: 11, fontWeight: '600' as const },

  allergenToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, alignSelf: 'flex-start' },
  allergenToggleText: { fontSize: 12, color: '#f59e0b', fontWeight: '600' as const },
  allergenList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  allergenChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fef9c3', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#fde68a',
  },
  allergenEmoji: { fontSize: 14 },
  allergenLabel: { fontSize: 11, color: '#92400e', fontWeight: '500' as const },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 15, color: '#94a3b8' },

  footer: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  footerText: { fontSize: 12, color: '#94a3b8' },
  footerBrand: { fontSize: 11, color: '#cbd5e1', fontWeight: '500' as const },
});
