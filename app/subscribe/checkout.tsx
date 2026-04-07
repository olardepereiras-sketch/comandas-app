import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string; orderId: string }>();

  useEffect(() => {
    if (params.url) {
      const checkoutUrl = decodeURIComponent(params.url);
      
      if (Platform.OS === 'web') {
        window.location.href = checkoutUrl;
      } else {
        WebBrowser.openBrowserAsync(checkoutUrl).then(() => {
          router.push(`/subscribe/success?order_id=${params.orderId}`);
        });
      }
    }
  }, [params.url, params.orderId, router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Procesando pago',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#FF1493',
        }}
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF1493" />
        <Text style={styles.message}>Redirigiendo a la pasarela de pago...</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 20,
    textAlign: 'center' as const,
  },
});
