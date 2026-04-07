import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Linking,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Smartphone,
  Download,
  Monitor,
  Terminal,
  Key,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Printer,
  Package,
  Apple,
} from 'lucide-react-native';

const APK_URL = 'https://quieromesa.com/downloads/comandas.apk';
const BASE_URL = 'https://quieromesa.com';

type DownloadState = 'idle' | 'loading' | 'done';

function DownloadButton({
  label,
  subLabel,
  onPress,
  state,
  color,
  testID,
}: {
  label: string;
  subLabel?: string;
  onPress: () => void;
  state: DownloadState;
  color: string;
  testID?: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.dlBtn, { backgroundColor: color }, state === 'done' && styles.dlBtnDone]}
        onPress={handlePress}
        activeOpacity={0.88}
        testID={testID}
      >
        {state === 'done' ? (
          <CheckCircle size={18} color="#fff" strokeWidth={2.5} />
        ) : (
          <Download size={18} color="#fff" strokeWidth={2.2} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.dlBtnLabel}>{state === 'done' ? 'Descarga iniciada' : label}</Text>
          {subLabel && state !== 'done' ? (
            <Text style={styles.dlBtnSub}>{subLabel}</Text>
          ) : null}
        </View>
        {state === 'loading' && (
          <Text style={styles.dlBtnLoading}>...</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function SectionCard({
  icon,
  iconBg,
  title,
  subtitle,
  tag,
  tagColor,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  tag?: string;
  tagColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{title}</Text>
            {tag ? (
              <View style={[styles.tag, { backgroundColor: tagColor ?? '#f3f4f6' }]}>
                <Text style={[styles.tagText, { color: tagColor === '#fff7ed' ? '#ea580c' : tagColor === '#f0fdf4' ? '#15803d' : '#6b7280' }]}>{tag}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.cardDivider} />
      {children}
    </View>
  );
}

export default function InstalarApp() {
  const params = useLocalSearchParams<{ token?: string }>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const [token, setToken] = useState<string>(params.token ?? '');
  const [apkState, setApkState] = useState<DownloadState>('idle');
  const [winState, setWinState] = useState<DownloadState>('idle');
  const [linuxState, setLinuxState] = useState<DownloadState>('idle');
  const [agentState, setAgentState] = useState<DownloadState>('idle');
  const [tokenError, setTokenError] = useState<string>('');

  const fadeAnimRef = useRef(fadeAnim);
  const slideAnimRef = useRef(slideAnim);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnimRef.current, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnimRef.current, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleApk = () => {
    console.log('[InstalarApp] Descargando APK:', APK_URL);
    setApkState('loading');
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = APK_URL;
        a.download = 'comandas.apk';
        a.setAttribute('target', '_blank');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        Linking.openURL(APK_URL);
      }
      setTimeout(() => setApkState('done'), 1500);
    } catch (e) {
      console.error('[InstalarApp] Error APK:', e);
      setApkState('idle');
    }
  };

  const requireToken = (): boolean => {
    if (!token.trim()) {
      setTokenError('Introduce tu token de restaurante para continuar.');
      return false;
    }
    setTokenError('');
    return true;
  };

  const handleWin = () => {
    if (!requireToken()) return;
    console.log('[InstalarApp] Descargando instalador Windows');
    setWinState('loading');
    const url = `${BASE_URL}/api/print-agent/installer-windows?token=${encodeURIComponent(token.trim())}`;
    openDownload(url, 'instalar-impresoras.bat', () => {
      setTimeout(() => setWinState('done'), 1500);
    }, () => setWinState('idle'));
  };

  const handleLinux = () => {
    if (!requireToken()) return;
    console.log('[InstalarApp] Descargando instalador Linux');
    setLinuxState('loading');
    const url = `${BASE_URL}/api/print-agent/installer-linux?token=${encodeURIComponent(token.trim())}`;
    openDownload(url, 'instalar-impresoras.sh', () => {
      setTimeout(() => setLinuxState('done'), 1500);
    }, () => setLinuxState('idle'));
  };

  const handleAgent = () => {
    if (!requireToken()) return;
    console.log('[InstalarApp] Descargando print-agent.js');
    setAgentState('loading');
    const url = `${BASE_URL}/api/print-agent/download-agent?token=${encodeURIComponent(token.trim())}`;
    openDownload(url, 'print-agent.js', () => {
      setTimeout(() => setAgentState('done'), 1500);
    }, () => setAgentState('idle'));
  };

  const openDownload = (url: string, filename: string, onOk: () => void, onErr: () => void) => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.setAttribute('target', '_blank');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        onOk();
      } else {
        Linking.openURL(url).then(onOk).catch(onErr);
      }
    } catch (e) {
      console.error('[InstalarApp] Error descarga:', e);
      onErr();
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.hero}>
        <View style={styles.heroBg} />
        <Animated.View style={[styles.heroInner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroIconRow}>
            <View style={[styles.heroIcon, { backgroundColor: '#f97316' }]}>
              <Smartphone size={26} color="#fff" strokeWidth={2} />
            </View>
            <View style={styles.heroDash} />
            <View style={[styles.heroIcon, { backgroundColor: '#6366f1' }]}>
              <Printer size={26} color="#fff" strokeWidth={2} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Centro de Descargas</Text>
          <Text style={styles.heroSub}>quieromesa.com</Text>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>

          <SectionCard
            icon={<Smartphone size={22} color="#f97316" strokeWidth={2} />}
            iconBg="#fff7ed"
            title="App Comandas"
            subtitle="Monitor de cocina · Impresión directa"
            tag="Android"
            tagColor="#fff7ed"
          >
            <View style={styles.appRow}>
              <View style={styles.appMeta}>
                <Package size={14} color="#9ca3af" strokeWidth={2} />
                <Text style={styles.appMetaText}>comandas.apk · ~25 MB</Text>
              </View>
              <View style={styles.appMeta}>
                <Monitor size={14} color="#9ca3af" strokeWidth={2} />
                <Text style={styles.appMetaText}>Requiere Android 7+</Text>
              </View>
            </View>

            <DownloadButton
              label="Descargar APK"
              subLabel="Instalación directa para Android"
              onPress={handleApk}
              state={apkState}
              color="#f97316"
              testID="download-apk-button"
            />

            <View style={styles.stepsWrap}>
              {[
                'Ajustes → Seguridad → Activa "Orígenes desconocidos"',
                'Descarga el APK y ábrelo desde la carpeta Descargas',
                'Sigue las instrucciones en pantalla e instala',
              ].map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepDot}><Text style={styles.stepDotText}>{i + 1}</Text></View>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
            </View>

            <View style={styles.iosNotice}>
              <Apple size={14} color="#6b7280" strokeWidth={2} />
              <Text style={styles.iosNoticeText}>iOS no compatible. Solo disponible para Android.</Text>
            </View>
          </SectionCard>

          <SectionCard
            icon={<Printer size={22} color="#6366f1" strokeWidth={2} />}
            iconBg="#eef2ff"
            title="Agente de Impresión"
            subtitle="Conecta impresoras térmicas en red local"
            tag="PC / Servidor"
            tagColor="#f0fdf4"
          >
            <Text style={styles.agentDesc}>
              El agente corre en el PC que tiene acceso a la red de las impresoras. Necesitas tu token de restaurante para descargarlo configurado.
            </Text>

            <View style={styles.tokenSection}>
              <View style={styles.tokenLabelRow}>
                <Key size={14} color="#6366f1" strokeWidth={2} />
                <Text style={styles.tokenLabel}>Token del restaurante</Text>
              </View>
              <TextInput
                style={[styles.tokenInput, tokenError ? styles.tokenInputError : null]}
                value={token}
                onChangeText={(t: string) => { setToken(t); setTokenError(''); }}
                placeholder="cmd-xxxxxxxx-xxxxxxxx"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                testID="token-input"
              />
              {tokenError ? (
                <View style={styles.errorRow}>
                  <AlertCircle size={13} color="#ef4444" strokeWidth={2} />
                  <Text style={styles.errorText}>{tokenError}</Text>
                </View>
              ) : null}
              <Text style={styles.tokenHint}>
                Encuéntras tu token en el panel admin → Comandas → Configuración.
              </Text>
            </View>

            <View style={styles.agentGrid}>
              <View style={styles.agentHalf}>
                <View style={styles.agentPlatformBadge}>
                  <Monitor size={13} color="#374151" strokeWidth={2} />
                  <Text style={styles.agentPlatformText}>Windows</Text>
                </View>
                <DownloadButton
                  label="Instalador .bat"
                  subLabel="Instala Node.js + agente"
                  onPress={handleWin}
                  state={winState}
                  color="#1d4ed8"
                  testID="download-win-button"
                />
              </View>

              <View style={styles.agentHalf}>
                <View style={styles.agentPlatformBadge}>
                  <Terminal size={13} color="#374151" strokeWidth={2} />
                  <Text style={styles.agentPlatformText}>Linux / Mac</Text>
                </View>
                <DownloadButton
                  label="Instalador .sh"
                  subLabel="Script para bash/zsh"
                  onPress={handleLinux}
                  state={linuxState}
                  color="#059669"
                  testID="download-linux-button"
                />
              </View>
            </View>

            <View style={styles.manualSection}>
              <Text style={styles.manualLabel}>Instalación manual (Node.js requerido)</Text>
              <DownloadButton
                label="Descargar print-agent.js"
                subLabel="Configura manualmente con tu token"
                onPress={handleAgent}
                state={agentState}
                color="#374151"
                testID="download-agent-button"
              />
              <Text style={styles.manualHint}>
                {'Ejecutar: node print-agent.js --token <tu-token>'}
              </Text>
            </View>
          </SectionCard>

          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>¿Necesitas ayuda?</Text>
            <TouchableOpacity
              style={styles.helpLink}
              onPress={() => Linking.openURL('https://quieromesa.com')}
            >
              <Text style={styles.helpLinkText}>Ir a quieromesa.com</Text>
              <ChevronRight size={14} color="#6366f1" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
  },
  heroInner: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  heroDash: {
    width: 24,
    height: 2,
    backgroundColor: '#334155',
    borderRadius: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: -0.4,
  },
  heroSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500' as const,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#111827',
  },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 18,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 14,
  },
  appRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  appMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  appMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  dlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dlBtnDone: {
    backgroundColor: '#22c55e',
  },
  dlBtnLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  dlBtnSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  dlBtnLoading: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700' as const,
  },
  stepsWrap: {
    marginTop: 14,
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  stepText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    flex: 1,
  },
  iosNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
  },
  iosNoticeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  agentDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
    marginBottom: 14,
  },
  tokenSection: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tokenLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tokenLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#374151',
  },
  tokenInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tokenInputError: {
    borderColor: '#ef4444',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  tokenHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 7,
    lineHeight: 15,
  },
  agentGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  agentHalf: {
    flex: 1,
    gap: 8,
  },
  agentPlatformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  agentPlatformText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#374151',
  },
  manualSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
    gap: 8,
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manualHint: {
    fontSize: 11,
    color: '#9ca3af',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  helpCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3730a3',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  helpLinkText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6366f1',
  },
});
