import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "@/lib/gameContext";
import { RESTAURANT_NAME, SPAIN_REGIONS } from "@/constants/gameData";
import CharacterSprite from "@/components/game/CharacterSprite";

const { width, height } = Dimensions.get("window");

const COLORS = {
  bg: "#0f0800",
  surface: "#1e1200",
  card: "#2a1a00",
  gold: "#c8a84b",
  goldLight: "#e8c870",
  green: "#2d6a1e",
  greenLight: "#3d8a2e",
  cream: "#f5e6c8",
  text: "#f0d8a0",
  textMuted: "#8a7040",
  red: "#c0392b",
  border: "#3d2a00",
};

export default function GameHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ restaurant?: string }>();
  const { ranking, currentUsername, saveUsername, savedGameState, refreshGlobalRanking, setRestaurantSlug, restaurantConfig } = useGame();
  const [username, setUsername] = useState(currentUsername);
  const [tab, setTab] = useState<"home" | "ranking">("home");
  const [error, setError] = useState("");


  const logoAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const chefBobAnim = useRef(new Animated.Value(0)).current;

  const restaurantSlugParam = params.restaurant || "";
  const displayName = restaurantConfig?.restaurantName || RESTAURANT_NAME;
  const triviaThemeId = restaurantConfig?.triviaTheme || "galicia";
  const triviaThemeName = SPAIN_REGIONS.find(r => r.id === triviaThemeId)?.name || "Galicia";

  useEffect(() => {
    if (restaurantSlugParam) {
      setRestaurantSlug(restaurantSlugParam);
    }
  }, [restaurantSlugParam]);

  useEffect(() => {
    if (currentUsername) setUsername(currentUsername);
  }, [currentUsername]);

  useEffect(() => {
    if (tab === "ranking") {
      refreshGlobalRanking();
    }
  }, [tab, refreshGlobalRanking]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(chefBobAnim, { toValue: -6, duration: 1200, useNativeDriver: true }),
        Animated.timing(chefBobAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const hasNoLives = !!(savedGameState && savedGameState.lives <= 0);

  const handlePlay = async () => {
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    if (trimmed.length > 16) {
      setError("M\u00e1ximo 16 caracteres");
      return;
    }
    if (hasNoLives) {
      console.log("[Game] No lives, redirecting to recover");
      try {
        router.push("/game/recover");
      } catch (_e) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.href = '/game/recover';
        }
      }
      return;
    }
    setError("");
    try {
      await saveUsername(trimmed);
      console.log("[Game] Username saved, navigating to play...");
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const playPath = restaurantSlugParam
          ? `/game/play?restaurant=${encodeURIComponent(restaurantSlugParam)}`
          : '/game/play';
        console.log("[Game] Web navigation to:", playPath);
        window.location.href = playPath;
      } else {
        const playParams = restaurantSlugParam
          ? { pathname: '/game/play' as const, params: { restaurant: restaurantSlugParam } }
          : { pathname: '/game/play' as const };
        router.push(playParams as any);
      }
    } catch (error) {
      console.error("[Game] Error in handlePlay:", error);
      setError("Error al iniciar el juego. Int\u00e9ntalo de nuevo.");
    }
  };



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgPattern}>
        {["🍐", "🍷", "🐙", "🎂", "🐟", "🍐"].map((e, i) => (
          <Text key={i} style={[styles.bgEmoji, { top: (i * height) / 6, left: i % 2 === 0 ? -10 : width - 30 }]}>
            {e}
          </Text>
        ))}
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "home" && styles.tabBtnActive]}
          onPress={() => setTab("home")}
          testID="tab-home"
        >
          <Text style={[styles.tabText, tab === "home" && styles.tabTextActive]}>🎮 Jugar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "ranking" && styles.tabBtnActive]}
          onPress={() => setTab("ranking")}
          testID="tab-ranking"
        >
          <Text style={[styles.tabText, tab === "ranking" && styles.tabTextActive]}>🏆 Ranking</Text>
        </TouchableOpacity>
      </View>

      {tab === "home" ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoAnim,
                  transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
                },
              ]}
            >
              <Animated.View style={[styles.logoImageWrap, { transform: [{ scale: pulseAnim }] }]}>
                <Animated.View style={{ transform: [{ translateY: chefBobAnim }], width: 80, height: 80, overflow: "hidden", alignItems: "center" }}>
                  <View style={{ position: "relative", width: 70, height: 95 }}>
                    <CharacterSprite type="cook" size={2.5} waving />
                  </View>
                </Animated.View>
              </Animated.View>
              <Text style={styles.logoTitle}>{displayName}</Text>
              <Text style={styles.logoSubtitle}>EL JUEGO</Text>
              <View style={styles.logoDivider} />
              <Text style={styles.logoTagline}>Conviértete en el mejor chef de {triviaThemeName}</Text>
            </Animated.View>

            <Animated.View style={[styles.inputCard, { opacity: fadeAnim }]}>
              <Text style={styles.inputLabel}>¿Cómo te llamas, chef?</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(t) => { setUsername(t); setError(""); }}
                placeholder="Tu nombre de usuario..."
                placeholderTextColor={COLORS.textMuted}
                maxLength={16}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handlePlay}
                testID="username-input"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {hasNoLives ? (
                <View style={styles.noLivesBox}>
                  <Text style={styles.noLivesTitle}>🚫 Sin vidas disponibles</Text>
                  <Text style={styles.noLivesText}>Debes recuperar vidas para continuar jugando</Text>
                  <TouchableOpacity
                    style={styles.recoverLivesBtn}
                    onPress={() => router.push("/game/recover")}
                    activeOpacity={0.8}
                    testID="recover-lives-button"
                  >
                    <Text style={styles.recoverLivesBtnText}>❤️ Recuperar vidas</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={handlePlay}
                  activeOpacity={0.8}
                  testID="play-button"
                >
                  <Text style={styles.playBtnText}>¡EMPEZAR A JUGAR!</Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            <Animated.View style={[styles.howToCard, { opacity: fadeAnim }]}>
              <Text style={styles.howToTitle}>📖 Cómo jugar</Text>
              <View style={styles.howToItem}>
                <Text style={styles.howToEmoji}>👆</Text>
                <Text style={styles.howToText}>Toca a los clientes para atenderlos</Text>
              </View>
              <View style={styles.howToItem}>
                <Text style={styles.howToEmoji}>🍳</Text>
                <Text style={styles.howToText}>Cocina los pedidos antes de que esperen demasiado</Text>
              </View>
              <View style={styles.howToItem}>
                <Text style={styles.howToEmoji}>💰</Text>
                <Text style={styles.howToText}>Gana dinero para contratar personal</Text>
              </View>
              <View style={styles.howToItem}>
                <Text style={styles.howToEmoji}>❤️</Text>
                <Text style={styles.howToText}>Si un cliente se marcha enfadado, pierdes una vida</Text>
              </View>
              <View style={styles.howToItem}>
                <Text style={styles.howToEmoji}>🏆</Text>
                <Text style={styles.howToText}>¡Entra en el Top 10 y gana un postre gratis!</Text>
              </View>
            </Animated.View>

            <View style={{ height: insets.bottom + 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <RankingTab insets={insets} currentUsername={username} ranking={ranking} restaurantName={displayName} />
      )}
    </View>
  );
}

function RankingTab({
  insets,
  currentUsername,
  ranking,
  restaurantName,
}: {
  insets: ReturnType<typeof useSafeAreaInsets>;
  currentUsername: string;
  ranking: { username: string; score: number; date: string }[];
  restaurantName: string;
}) {
  const medalEmojis = ["🥇", "🥈", "🥉"];
  const isInRanking = currentUsername
    ? ranking.some(e => e.username.toLowerCase() === currentUsername.toLowerCase())
    : true;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.rankingContent, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.rankingTitle}>🏆 Hall of Fame</Text>
      <Text style={styles.rankingSubtitle}>Top 20 Mejores Chefs de {restaurantName}</Text>

      <View style={styles.prizeCard}>
        <Text style={styles.prizeEmoji}>🍮</Text>
        <Text style={styles.prizeTitle}>Premio Top 10</Text>
        <Text style={styles.prizeDesc}>Entra en el Top 10 y gana un postre gratis en {restaurantName}</Text>
      </View>

      {currentUsername && !isInRanking && ranking.length > 0 && (
        <View style={styles.notRankedBox}>
          <Text style={styles.notRankedText}>
            Tu puntuación no está entre las 20 mejores puntuaciones, pero estás muy cerca ¡síguelo intentando!!
          </Text>
        </View>
      )}

      {ranking.length === 0 ? (
        <View style={styles.emptyRanking}>
          <Text style={styles.emptyEmoji}>🍐</Text>
          <Text style={styles.emptyText}>¡Sé el primero en el ranking!</Text>
          <Text style={styles.emptySubtext}>Juega y consigue la mejor puntuación</Text>
        </View>
      ) : (
        ranking.map((entry, index) => {
          const isMe = entry.username.toLowerCase() === currentUsername.toLowerCase();
          const isTop10 = index < 10;
          return (
            <View
              key={`${entry.username}-${index}`}
              style={[styles.rankingRow, isMe && styles.rankingRowMe, index === 0 && styles.rankingRowFirst, isTop10 && !isMe && styles.rankingRowTop10]}
              testID={`ranking-row-${index}`}
            >
              <Text style={styles.rankingPos}>
                {index < 3 ? medalEmojis[index] : `#${index + 1}`}
              </Text>
              <View style={styles.rankingInfo}>
                <Text style={[styles.rankingName, isMe && styles.rankingNameMe]}>
                  {entry.username} {isMe ? "(Tú)" : ""}{isTop10 ? " 🍮" : ""}
                </Text>
                <Text style={styles.rankingDate}>{entry.date}</Text>
              </View>
              <Text style={[styles.rankingScore, index === 0 && styles.rankingScoreFirst]}>
                {entry.score.toLocaleString()}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex: { flex: 1 },
  bgPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    opacity: 0.06,
  },
  bgEmoji: {
    position: "absolute",
    fontSize: 60,
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: COLORS.gold,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.bg,
  },
  homeContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  logoContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  logoImageWrap: {
    width: 110,
    height: 110,
    backgroundColor: "rgba(200,168,75,0.08)",
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "rgba(200,168,75,0.25)",
    overflow: "hidden",
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: COLORS.gold,
    letterSpacing: 1,
    textAlign: "center",
  },
  logoSubtitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: COLORS.goldLight,
    letterSpacing: 6,
    marginTop: 2,
  },
  logoDivider: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.gold,
    marginVertical: 12,
    borderRadius: 1,
  },
  logoTagline: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    fontStyle: "italic" as const,
  },
  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: COLORS.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13,
    marginBottom: 8,
  },
  playBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.greenLight,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  playBtnText: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 1,
  },
  noLivesBox: {
    backgroundColor: "#1a0808",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.red,
    marginTop: 8,
    alignItems: "center",
    gap: 6,
  },
  noLivesTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#e74c3c",
    textAlign: "center",
  },
  noLivesText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 4,
  },
  recoverLivesBtn: {
    backgroundColor: COLORS.red,
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  recoverLivesBtnText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#fff",
  },
  howToCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  howToTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: COLORS.gold,
    marginBottom: 14,
  },
  howToItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  howToEmoji: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  howToText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    lineHeight: 18,
  },
  rankingContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  rankingTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: COLORS.gold,
    textAlign: "center",
    marginBottom: 4,
  },
  rankingSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 16,
  },
  prizeCard: {
    backgroundColor: "#2a1a00",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  prizeEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  prizeTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: COLORS.gold,
    marginBottom: 4,
  },
  prizeDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  notRankedBox: {
    backgroundColor: "#1a0800",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.red,
    alignItems: "center" as const,
  },
  notRankedText: {
    fontSize: 13,
    color: COLORS.cream,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  emptyRanking: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: COLORS.gold,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rankingRowFirst: {
    backgroundColor: "#2a1a00",
    borderColor: COLORS.gold,
  },
  rankingRowTop10: {
    borderColor: "rgba(200,168,75,0.35)",
  },
  rankingRowMe: {
    borderColor: COLORS.greenLight,
    backgroundColor: "#0a1a08",
  },
  rankingPos: {
    fontSize: 20,
    width: 36,
    textAlign: "center",
    color: COLORS.gold,
  },
  rankingInfo: {
    flex: 1,
    marginLeft: 8,
  },
  rankingName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: COLORS.text,
  },
  rankingNameMe: {
    color: COLORS.greenLight,
  },
  rankingDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rankingScore: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: COLORS.gold,
  },
  rankingScoreFirst: {
    color: COLORS.goldLight,
    fontSize: 20,
  },
});
