import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GameProvider } from "@/lib/gameContext";

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class GameErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('[Game] Error boundary caught:', error.message);
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Game] Error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.emoji}>😔</Text>
          <Text style={ebStyles.title}>Error en el juego</Text>
          <Text style={ebStyles.message}>{this.state.error}</Text>
          <TouchableOpacity
            style={ebStyles.button}
            onPress={() => this.setState({ hasError: false, error: '' })}
          >
            <Text style={ebStyles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={ebStyles.buttonSecondary}
            onPress={() => {
              this.setState({ hasError: false, error: '' });
              if (typeof window !== 'undefined') {
                window.location.href = '/game';
              }
            }}
          >
            <Text style={ebStyles.buttonSecondaryText}>Volver al menú</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0800', justifyContent: 'center', alignItems: 'center', padding: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800' as const, color: '#c8a84b', marginBottom: 8 },
  message: { fontSize: 13, color: '#8a7040', textAlign: 'center' as const, marginBottom: 24, lineHeight: 20 },
  button: { backgroundColor: '#2d6a1e', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 10 },
  buttonText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },
  buttonSecondary: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, borderWidth: 1, borderColor: '#3a2800' },
  buttonSecondaryText: { fontSize: 14, color: '#8a7040' },
});

export default function GameLayout() {
  return (
    <GameProvider>
      <GameErrorBoundary>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            contentStyle: { backgroundColor: "#1a0a00" },
          }}
        />
      </GameErrorBoundary>
    </GameProvider>
  );
}
