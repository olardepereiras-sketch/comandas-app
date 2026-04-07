// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform } from "react-native";
import { trpc, trpcClient } from "@/lib/trpc";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="client/index" options={{ headerShown: false }} />
      <Stack.Screen name="client/restaurant/[slug]" options={{ headerShown: true }} />
      <Stack.Screen name="client/restaurant2/[slug]" options={{ headerShown: true }} />
      <Stack.Screen name="client/restaurant3/[slug]" options={{ headerShown: true }} />
      <Stack.Screen name="client/reservation/[token]" options={{ headerShown: true }} />
      <Stack.Screen name="client/reservation2/[token2]" options={{ headerShown: true }} />
      <Stack.Screen name="client/waitlist/[token]" options={{ headerShown: true }} />
      <Stack.Screen name="client/deposit-success" options={{ headerShown: true, title: 'Fianza Pagada' }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="restaurant" options={{ headerShown: false }} />
      <Stack.Screen name="game" options={{ headerShown: false }} />
      <Stack.Screen name="instalar-app" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || '';
      const isInAppBrowser = /instagram|FBAN|FBAV/i.test(userAgent);
      
      if (isInAppBrowser) {
        console.log('🔍 In-app browser detectado, optimizando carga de imágenes');
        
        const metaTags = [
          { property: 'og:image:secure_url', content: 'https://quieromesa.com/og-image.jpg' },
          { name: 'referrer', content: 'no-referrer-when-downgrade' },
        ];
        
        metaTags.forEach(({ property, name, content }) => {
          const meta = document.createElement('meta');
          if (property) meta.setAttribute('property', property);
          if (name) meta.setAttribute('name', name);
          meta.setAttribute('content', content);
          document.head.appendChild(meta);
        });
      }
      
      if ('serviceWorker' in navigator && !isInAppBrowser) {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('✅ Service Worker registered successfully');
            registration.update();
          })
          .catch((error) => console.log('❌ Service Worker registration failed:', error));
      }

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        (window as any).__pwaInstallPrompt = e;
        console.log('💾 PWA instalable detectado - prompt guardado globalmente');
      });

      window.addEventListener('appinstalled', () => {
        console.log('✅ PWA instalado exitosamente');
        (window as any).__pwaInstallPrompt = null;
        (window as any).__pwaInstalled = true;
      });
    }
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
