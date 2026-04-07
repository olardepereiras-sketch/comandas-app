import { Stack } from 'expo-router';

export default function AdminLayout() {
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
        name="login" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Administración',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="restaurants" 
        options={{ 
          title: 'Restaurantes',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="locations" 
        options={{ 
          title: 'Ubicaciones y horas',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="users" 
        options={{ 
          title: 'Usuarios',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="modules" 
        options={{ 
          title: 'Módulos',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="rating-criteria" 
        options={{ 
          title: 'Criterios de Valoración',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="cuisine-types" 
        options={{ 
          title: 'Tipos de Cocina',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="stripe-config" 
        options={{ 
          title: 'Configuración Stripe',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="statistics" 
        options={{ 
          title: 'Estadísticas y Tienda Virtual',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="commissions" 
        options={{ 
          title: 'Comisiones',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="system-config" 
        options={{ 
          title: 'Configuración',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="whatsapp" 
        options={{ 
          title: 'WhatsApp Web',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="sub-admins" 
        options={{ 
          title: 'Sub-administradores',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="audit-log" 
        options={{ 
          title: 'Registro de Actividad',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="whatsapp-worker" 
        options={{ 
          title: 'Worker de WhatsApp',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="whatsapp-pro" 
        options={{ 
          title: 'WhatsApp de Pago',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="whatsapp-inbox" 
        options={{ 
          title: 'Bandeja WhatsApp',
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
