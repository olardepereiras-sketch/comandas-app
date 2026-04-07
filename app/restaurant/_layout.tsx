import { Stack } from 'expo-router';

export default function RestaurantLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#0f172a',
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen 
        name="login/[slug]" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          title: 'Panel de Restaurante',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="config" 
        options={{ 
          title: 'Configuración',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="config-pro" 
        options={{ 
          title: 'Configuración PRO',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="tables" 
        options={{ 
          title: 'Mesas',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="reservations" 
        options={{ 
          title: 'Reservas',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="reservations-pro" 
        options={{ 
          title: 'Reservas PRO',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="schedules" 
        options={{ 
          title: 'Horarios',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="ratings" 
        options={{ 
          title: 'Valoraciones + VIP',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="comandas" 
        options={{ 
          title: 'Comandas',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="carta-digital" 
        options={{ 
          title: 'Carta Digital',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="deposits" 
        options={{ 
          title: 'Fianzas',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="planning-today" 
        options={{ 
          title: 'Planning de Hoy',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="support-access/[slug]" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="whatsapp-credits" 
        options={{ 
          title: 'Recargar Saldo WhatsApp',
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
