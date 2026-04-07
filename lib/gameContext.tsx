import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { GAME_CONFIG, MenuItem, MENU_ITEMS, getTriviaQuestionsForRegion, type TriviaQuestion, type MemoryItem, MEMORY_ITEMS } from "@/constants/gameData";
import { vanillaClient } from "@/lib/trpc";

export interface RankingEntry {
  username: string;
  score: number;
  date: string;
}

export interface GameSession {
  username: string;
  score: number;
  money: number;
  lives: number;
  level: number;
  staffWaiters: number;
  staffCooks: number;
  prizeClaimedAt: number | null;
}

export interface RestaurantGameConfig {
  restaurantId: string;
  restaurantName: string;
  isActive: boolean;
  memoryImages: Array<{ url: string; name: string }>;
  triviaTheme: string;
}

const SESSION_KEY = "olar_session_v1";
const PRIZE_KEY = "olar_prize_v1";
const SAVED_GAME_KEY = "olar_saved_game_v1";
const TRIVIA_HISTORY_KEY = "olar_trivia_history_v1";
const TUTORIAL_KEY = "olar_tutorial_done_v1";

export const [GameProvider, useGame] = createContextHook(() => {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [prizeData, setPrizeData] = useState<{ username: string; claimedAt: number } | null>(null);
  const [savedGameState, setSavedGameState] = useState<ActiveGameState | null>(null);
  const [answeredTriviaIds, setAnsweredTriviaIds] = useState<number[]>([]);
  const [tutorialDone, setTutorialDone] = useState<boolean>(false);
  const [restaurantSlug, setRestaurantSlugState] = useState<string>("");
  const [restaurantConfig, setRestaurantConfig] = useState<RestaurantGameConfig | null>(null);
  const [restaurantConfigLoading, setRestaurantConfigLoading] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        console.log("[GameContext] Loading global ranking from PostgreSQL via tRPC");
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => {
          console.log("[GameContext] Ranking loading timed out after 10s");
          resolve(null);
        }, 10000));
        const rankingPromise = vanillaClient.game.getRanking.query();
        const globalRanking = await Promise.race([rankingPromise, timeoutPromise]);
        if (globalRanking && Array.isArray(globalRanking) && globalRanking.length > 0) {
          setRanking(globalRanking);
          console.log("[GameContext] Global ranking loaded:", globalRanking.length, "entries");
        } else {
          console.log("[GameContext] Ranking is currently empty or timed out");
          setRanking([]);
        }
      } catch (e) {
        console.log("[GameContext] Could not load ranking from DB:", e);
      }

      try {
        const session = await AsyncStorage.getItem(SESSION_KEY);
        if (session) {
          const s: GameSession = JSON.parse(session);
          setCurrentUsername(s.username || "");
        }
        const triviaHistory = await AsyncStorage.getItem(TRIVIA_HISTORY_KEY);
        if (triviaHistory) setAnsweredTriviaIds(JSON.parse(triviaHistory));
        const tutDone = await AsyncStorage.getItem(TUTORIAL_KEY);
        if (tutDone === "true") setTutorialDone(true);
        const savedGame = await AsyncStorage.getItem(SAVED_GAME_KEY);
        if (savedGame) {
          const state: ActiveGameState = JSON.parse(savedGame);
          setSavedGameState(state);
          console.log("[GameContext] Loaded saved game, lives:", state.lives);
        }
        const prize = await AsyncStorage.getItem(PRIZE_KEY);
        if (prize) {
          const p = JSON.parse(prize);
          const elapsed = Date.now() - p.claimedAt;
          if (elapsed < GAME_CONFIG.dessertPrizeMinutes * 60 * 1000) {
            setPrizeData(p);
          } else {
            await AsyncStorage.removeItem(PRIZE_KEY);
          }
        }
      } catch (e) {
        console.log("[GameContext] load error:", e);
      }
    };
    load();
  }, []);

  const setRestaurantSlug = useCallback(async (slug: string) => {
    if (!slug || slug === restaurantSlug) return;
    console.log("[GameContext] Setting restaurant slug:", slug);
    setRestaurantSlugState(slug);
    setRestaurantConfigLoading(true);
    try {
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => {
        console.log("[GameContext] Config loading timed out after 8s");
        resolve(null);
      }, 8000));
      const configPromise = vanillaClient.game.getConfigBySlug.query({ slug });
      const config = await Promise.race([configPromise, timeoutPromise]);
      if (config) {
        setRestaurantConfig(config);
        console.log("[GameContext] Restaurant config loaded:", config.restaurantName, "active:", config.isActive);
      } else {
        console.log("[GameContext] Restaurant not found or timed out for slug:", slug);
        setRestaurantConfig(null);
      }
    } catch (e) {
      console.log("[GameContext] Could not load restaurant config:", e);
      setRestaurantConfig(null);
    } finally {
      setRestaurantConfigLoading(false);
    }
  }, [restaurantSlug]);

  const getActiveMemoryItems = useCallback((): MemoryItem[] => {
    if (restaurantConfig && restaurantConfig.memoryImages && restaurantConfig.memoryImages.length >= 8) {
      return restaurantConfig.memoryImages.slice(0, 8).map((img, i) => ({
        id: `custom_${i}`,
        emoji: "🍽️",
        name: img.name || `Plato ${i + 1}`,
        imageUrl: img.url,
      }));
    }
    return MEMORY_ITEMS;
  }, [restaurantConfig]);

  const getActiveTriviaQuestions = useCallback((): TriviaQuestion[] => {
    const theme = restaurantConfig?.triviaTheme || "galicia";
    const questions = getTriviaQuestionsForRegion(theme);
    console.log(`[GameContext] getActiveTriviaQuestions: theme='${theme}', restaurantConfig?.triviaTheme='${restaurantConfig?.triviaTheme}', questions=${questions.length}`);
    return questions;
  }, [restaurantConfig]);

  const submitScore = useCallback(async (username: string, score: number) => {
    try {
      console.log("[GameContext] Submitting score to PostgreSQL:", username, score, "restaurant:", restaurantConfig?.restaurantId);
      const result = await vanillaClient.game.submitScore.mutate({
        username,
        score,
        restaurantId: restaurantConfig?.restaurantId,
      });
      if (result && result.ranking) {
        setRanking(result.ranking);
        console.log("[GameContext] Score saved, position:", result.position);
        return { position: result.position, achievedAt: result.achievedAt };
      }
      return { position: -1, achievedAt: "" };
    } catch (e) {
      console.log("[GameContext] submitScore error:", e);
      return { position: -1, achievedAt: "" };
    }
  }, [restaurantConfig]);

  const claimPrize = useCallback(async (username: string) => {
    try {
      const data = { username, claimedAt: Date.now() };
      await AsyncStorage.setItem(PRIZE_KEY, JSON.stringify(data));
      setPrizeData(data);
    } catch (e) {
      console.log("[GameContext] claimPrize error:", e);
    }
  }, []);

  const checkPrizeExpired = useCallback(async () => {
    if (!prizeData) return true;
    const elapsed = Date.now() - prizeData.claimedAt;
    if (elapsed >= GAME_CONFIG.dessertPrizeMinutes * 60 * 1000) {
      await AsyncStorage.removeItem(PRIZE_KEY);
      setPrizeData(null);
      return true;
    }
    return false;
  }, [prizeData]);

  const saveUsername = useCallback(async (username: string) => {
    setCurrentUsername(username);
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
    } catch (e) {
      console.log("[GameContext] saveUsername error:", e);
    }
  }, []);

  const saveGameForRecovery = useCallback(async (state: ActiveGameState) => {
    try {
      const toSave = { ...state, phase: "playing" as const, lives: 0 };
      await AsyncStorage.setItem(SAVED_GAME_KEY, JSON.stringify(toSave));
      setSavedGameState(toSave);
      console.log("[GameContext] Game saved for recovery");
    } catch (e) {
      console.log("[GameContext] saveGameForRecovery error:", e);
    }
  }, []);

  const recoverOneLife = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_GAME_KEY);
      if (stored) {
        const state: ActiveGameState = JSON.parse(stored);
        const newLives = Math.min((state.lives || 0) + 1, GAME_CONFIG.maxLives);
        const updated = { ...state, lives: newLives, phase: "playing" as const };
        await AsyncStorage.setItem(SAVED_GAME_KEY, JSON.stringify(updated));
        setSavedGameState(updated);
        console.log("[GameContext] Life recovered, saved lives now:", newLives);
      }
    } catch (e) {
      console.log("[GameContext] recoverOneLife error:", e);
    }
  }, []);

  const consumeSavedGame = useCallback(async (): Promise<ActiveGameState | null> => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_GAME_KEY);
      if (stored) {
        const state: ActiveGameState = JSON.parse(stored);
        if (state.lives > 0) {
          const recoveredLives = state.lives;
          const freshState: ActiveGameState = { ...createInitialGameState(), lives: recoveredLives };
          await AsyncStorage.removeItem(SAVED_GAME_KEY);
          setSavedGameState(null);
          console.log("[GameContext] Starting fresh game with", recoveredLives, "recovered lives");
          return freshState;
        }
      }
      return null;
    } catch (e) {
      console.log("[GameContext] consumeSavedGame error:", e);
      return null;
    }
  }, []);

  const clearSavedGame = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(SAVED_GAME_KEY);
      setSavedGameState(null);
    } catch (e) {
      console.log("[GameContext] clearSavedGame error:", e);
    }
  }, []);

  const markTriviaQuestionsUsed = useCallback(async (questionIndices: number[]) => {
    try {
      const updated = [...answeredTriviaIds, ...questionIndices];
      setAnsweredTriviaIds(updated);
      await AsyncStorage.setItem(TRIVIA_HISTORY_KEY, JSON.stringify(updated));
      console.log("[GameContext] Marked trivia questions used:", questionIndices);
    } catch (e) {
      console.log("[GameContext] markTriviaQuestionsUsed error:", e);
    }
  }, [answeredTriviaIds]);

  const resetTriviaHistory = useCallback(async () => {
    try {
      setAnsweredTriviaIds([]);
      await AsyncStorage.removeItem(TRIVIA_HISTORY_KEY);
      console.log("[GameContext] Trivia history reset");
    } catch (e) {
      console.log("[GameContext] resetTriviaHistory error:", e);
    }
  }, []);

  const markTutorialDone = useCallback(async () => {
    try {
      setTutorialDone(true);
      await AsyncStorage.setItem(TUTORIAL_KEY, "true");
      console.log("[GameContext] Tutorial marked as done");
    } catch (e) {
      console.log("[GameContext] markTutorialDone error:", e);
    }
  }, []);

  const refreshGlobalRanking = useCallback(async () => {
    try {
      console.log("[GameContext] Refreshing global ranking from PostgreSQL");
      const globalRanking = await vanillaClient.game.getRanking.query();
      if (globalRanking && globalRanking.length > 0) {
        setRanking(globalRanking);
        console.log("[GameContext] Global ranking refreshed:", globalRanking.length, "entries");
      } else {
        console.log("[GameContext] refreshGlobalRanking: DB returned empty");
      }
    } catch (e) {
      console.log("[GameContext] refreshGlobalRanking error:", e);
    }
  }, []);

  return {
    ranking,
    currentUsername,
    prizeData,
    savedGameState,
    answeredTriviaIds,
    tutorialDone,
    restaurantSlug,
    restaurantConfig,
    restaurantConfigLoading,
    submitScore,
    claimPrize,
    checkPrizeExpired,
    saveUsername,
    saveGameForRecovery,
    recoverOneLife,
    consumeSavedGame,
    clearSavedGame,
    markTriviaQuestionsUsed,
    resetTriviaHistory,
    markTutorialDone,
    refreshGlobalRanking,
    setRestaurantSlug,
    getActiveMemoryItems,
    getActiveTriviaQuestions,
  };
});

export type CustomerState =
  | "arriving"
  | "seated"
  | "ordering"
  | "waiting"
  | "eating"
  | "done"
  | "leaving_happy"
  | "leaving_angry";

export interface Customer {
  id: string;
  tableId: number | null;
  state: CustomerState;
  patience: number;
  maxPatience: number;
  menuItem: MenuItem;
  orderType: "dine_in" | "takeout";
  groupEmoji: string;
  tip: number;
  isPhoneOrder?: boolean;
  colorIndex: number;
}

export interface KitchenOrder {
  id: string;
  customerId: string;
  menuItem: MenuItem;
  progress: number;
  isReady: boolean;
  isTakeout: boolean;
}

export interface ActiveGameState {
  money: number;
  lives: number;
  score: number;
  level: number;
  day: number;
  staffWaiters: number;
  staffCooks: number;
  customers: Customer[];
  kitchenOrders: KitchenOrder[];
  phase: "playing" | "paused" | "game_over" | "prize";
  totalServed: number;
  totalAngry: number;
  playerBusy: boolean;
  pendingPhoneOrder: Customer | null;
  playerOutfit: "waiter" | "cook";
  isChangingOutfit: boolean;
}

export const createInitialGameState = (): ActiveGameState => ({
  money: 0,
  lives: 1,
  score: 0,
  level: 1,
  day: 1,
  staffWaiters: 0,
  staffCooks: 0,
  customers: [],
  kitchenOrders: [],
  phase: "playing",
  totalServed: 0,
  totalAngry: 0,
  playerBusy: false,
  pendingPhoneOrder: null,
  playerOutfit: "waiter",
  isChangingOutfit: false,
});

export const TABLE_COUNT = 8;

export const CUSTOMER_COLORS = [
  "#e74c3c", "#3498db", "#27ae60", "#f39c12",
  "#9b59b6", "#1abc9c", "#e67e22", "#16a085",
  "#d35400", "#2980b9",
];

export function getRandomMenuItem(): MenuItem {
  const idx = Math.floor(Math.random() * MENU_ITEMS.length);
  return MENU_ITEMS[idx];
}

export function getCustomerPatience(level: number): number {
  const base = GAME_CONFIG.patienceBase;
  const min = GAME_CONFIG.patienceMin;
  const patience = base - (level - 1) * 2000;
  return Math.max(min, patience);
}

export function getCookingTime(item: MenuItem, cooks: number): number {
  const reduction = 1 - cooks * 0.2;
  return Math.max(item.cookTime * reduction, item.cookTime * 0.4);
}
