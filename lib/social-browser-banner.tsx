import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { getSocialBrowserName } from './use-instagram-detection';

export function SocialBrowserBanner() {
  const [socialBrowser, setSocialBrowser] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const name = getSocialBrowserName();
      setSocialBrowser(name);
    }
  }, []);

  if (!socialBrowser) return null;

  const handleOpenInBrowser = () => {
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        if (/instagram/i.test(navigator.userAgent)) {
          window.location.href = currentUrl.replace(/^https?:\/\//, 'googlechrome://');
          setTimeout(() => {
            window.location.href = currentUrl.replace(/^https?:\/\//, 'safari-');
          }, 500);
        } else {
          window.open(currentUrl, '_system');
        }
      } else {
        window.open(currentUrl, '_blank');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconEmoji}>⚠️</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>🔴 Imágenes no visibles en {socialBrowser}</Text>
          <Text style={styles.description}>
            Para ver todas las fotos del restaurante, debes abrir esta página en tu navegador.
          </Text>
          <Text style={styles.instructions}>
            {Platform.OS === 'web' && /Android/i.test(navigator.userAgent) 
              ? '👉 Pulsa los 3 puntos (⋮) arriba a la derecha y selecciona "Abrir en Chrome" o "Abrir en navegador externo"'
              : '👉 Pulsa los 3 puntos (•••) abajo y selecciona "Abrir en Safari" o "Abrir en navegador"'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleOpenInBrowser} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Intentar Abrir en Navegador</Text>
        <ExternalLink size={18} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF2F2',
    borderWidth: 3,
    borderColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#991B1B',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 8,
    fontWeight: '600' as const,
  },
  instructions: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 19,
    fontWeight: '600' as const,
    fontStyle: 'italic' as const,
  },
  button: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800' as const,
  },
});
