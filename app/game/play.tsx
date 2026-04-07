import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { playSound, initAudio } from "@/lib/gameSounds";
import {
  useGame,
  ActiveGameState,
  Customer,
  KitchenOrder,
  CustomerState,
  createInitialGameState,
  TABLE_COUNT,
  getRandomMenuItem,
  getCustomerPatience,
  getCookingTime,
} from "@/lib/gameContext";
import { GAME_CONFIG, CUSTOMER_EMOJIS, HIRE_STAFF_OPTIONS } from "@/constants/gameData";
import CharacterSprite from "@/components/game/CharacterSprite";

let { width: _w, height: _h } = Dimensions.get("window");
let width = (_w && _w >= 100) ? _w : 390;
let height = (_h && _h >= 100) ? _h : 844;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const ww = window.innerWidth || document.documentElement.clientWidth;
    const wh = window.innerHeight || document.documentElement.clientHeight;
    if (ww >= 100) width = Math.min(ww, 500);
    if (wh >= 100) height = wh;
  } catch (e) { console.log('[Game] Could not get window dimensions:', e); }
}

const DINING_H = Math.floor(height * 0.50);
const SERVICE_H = 68;
const DIVIDER_H = 14;
const SCENE_H = DINING_H + DIVIDER_H + SERVICE_H;
const BAR_W = Math.floor(width * 0.42);
const PASS_W = 22;
const KITCHEN_X = BAR_W + PASS_W;
const KITCHEN_W = width - KITCHEN_X;

const CW = 28;
const CH = 38;

const ENTRANCE_ZONE_W = 50;
const ENTRANCE_ZONE_H = 36;

const TABLE_POSITIONS: { x: number; y: number; w: number; h: number }[] = (() => {
  const dw = width;
  const dh = DINING_H;
  const pad = 8;
  const topY = pad + ENTRANCE_ZONE_H + 4;
  const availH = dh - topY - pad - 28;
  const tW = Math.floor((dw - pad * 2) / 3.7);
  const tH = Math.min(tW, Math.floor(availH / 3.0));
  const midY = topY + tH + 10;
  const botY = midY + tH + 8;

  return [
    { x: pad + 4, y: topY, w: tW, h: tH },
    { x: pad + tW + 12, y: topY, w: tW + 8, h: tH },
    { x: dw - pad - tW - 4, y: topY, w: tW, h: tH },

    { x: pad + 4, y: midY, w: tW, h: tH },
    { x: Math.floor(dw * 0.33), y: midY, w: tW, h: tH },
    { x: dw - pad - tW + 2, y: midY, w: tW, h: tH },

    { x: pad + Math.floor(tW * 0.25), y: botY, w: tW, h: tH },
    { x: dw - pad - tW + 4, y: botY, w: tW, h: tH },
  ];
})();

function tblRect(id: number) {
  const idx = id - 1;
  if (idx >= 0 && idx < TABLE_POSITIONS.length) return TABLE_POSITIONS[idx];
  return { x: 10, y: 10, w: 60, h: 40 };
}

function tblCenter(id: number) {
  const r = tblRect(id);
  return { x: r.x + r.w / 2 - CW / 2, y: r.y + r.h / 2 - CH / 2 };
}

const WAITER_HOME_X = BAR_W / 2 - CW / 2;
const WAITER_HOME_Y = DINING_H + DIVIDER_H + SERVICE_H / 2 - CH / 2;
const COOK_X = KITCHEN_X + KITCHEN_W / 2 - CW / 2;
const COOK_Y = DINING_H + DIVIDER_H + SERVICE_H / 2 - CH / 2;
const ENTRANCE_X = 4;
const ENTRANCE_Y = 4;

const C = {
  bg: "#080602",
  diningFloor: "#2a1a08",
  diningFloorAlt: "#231508",
  tableWood: "#5c3510",
  tableBorder: "#7a4820",
  tableGlow: "#c8a84b",
  tableGlowBg: "rgba(200,168,75,0.15)",
  chair: "#3d2008",
  barFloor: "#1a1a2a",
  barCounter: "#2d2d4a",
  barCounterTop: "#3a3a5c",
  kitchenFloor: "#121a0a",
  kitchenCounter: "#1a2a10",
  kitchenCounterTop: "#1e3412",
  wallDark: "#0a0604",
  wallLight: "#140e06",
  passWindow: "#1a3a5c",
  gold: "#c8a84b",
  goldLight: "#e8c870",
  green: "#2d6a1e",
  greenLight: "#4aaf30",
  red: "#c0392b",
  redLight: "#e74c3c",
  orange: "#e67e22",
  cream: "#f5e6c8",
  text: "#f0d8a0",
  textMuted: "#7a6030",
  surface: "#1a1000",
  card: "#251800",
  border: "#3a2800",
  phone: "#1a3a5c",
  phoneBorder: "#2a6a9c",
  woodBeam: "#3d2000",
};

const TILE = 20;
const TILES_X = Math.ceil(width / TILE) + 1;
const TILES_Y = Math.ceil(DINING_H / TILE) + 1;

const TICK_MS = 150;
let cid = 0;
let oid = 0;
function genCid() { return `c${++cid}_${Date.now()}`; }
function genOid() { return `o${++oid}_${Date.now()}`; }
function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

type CAnimData = {
  pos: Animated.ValueXY;
  scale: Animated.Value;
  nervousActive: boolean;
  nervousAnim: Animated.CompositeAnimation | null;
  moving: boolean;
};

function getFaceEmoji(c: Customer): string {
  if (c.state === "done") return "😁";
  const r = c.patience / c.maxPatience;
  if (c.state === "arriving") return c.groupEmoji;
  if (r > 0.55) return c.groupEmoji;
  if (r > 0.32) return "😟";
  if (r > 0.14) return "😤";
  return "🤬";
}

function patienceTint(r: number): string {
  if (r > 0.55) return "rgba(46,204,113,0.12)";
  if (r > 0.32) return "rgba(230,126,34,0.22)";
  return "rgba(231,76,60,0.36)";
}

function patienceBarColor(r: number): string {
  if (r > 0.55) return C.greenLight;
  if (r > 0.32) return C.orange;
  return C.redLight;
}

const CUSTOMER_SKIN_COLORS = ["#f4c090", "#d4956a", "#e8b87a", "#c0784a", "#f0d0a8"];
const CUSTOMER_OUTFIT_COLORS = ["#3a6ea5", "#8b2252", "#2d6a4f", "#7a4f1a", "#4a4a8a", "#6a3a1a"];
const CUSTOMER_HAIR_COLORS = ["#1a1a1a", "#8b4513", "#f4c542", "#c0392b", "#2c1810", "#888"];

type CustomerConfig = { skin: string; outfit: string; hair: string };
const customerConfigMap = new Map<string, CustomerConfig>();
function getCustomerConfig(id: string): CustomerConfig {
  if (!customerConfigMap.has(id)) {
    customerConfigMap.set(id, {
      skin: rnd(CUSTOMER_SKIN_COLORS),
      outfit: rnd(CUSTOMER_OUTFIT_COLORS),
      hair: rnd(CUSTOMER_HAIR_COLORS),
    });
  }
  return customerConfigMap.get(id)!;
}

export default function GamePlay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const playParams = useLocalSearchParams<{ restaurant?: string }>();
  const { currentUsername, submitScore, saveGameForRecovery, consumeSavedGame, clearSavedGame, tutorialDone, markTutorialDone, restaurantConfig, setRestaurantSlug } = useGame();
  const restaurantDisplayName = restaurantConfig?.restaurantName || "O Lar de Pereiras";

  useEffect(() => {
    if (playParams.restaurant && !restaurantConfig) {
      console.log('[Game Play] Setting restaurant slug from URL param:', playParams.restaurant);
      setRestaurantSlug(playParams.restaurant);
    }
  }, [playParams.restaurant]);

  const gameRef = useRef<ActiveGameState>(createInitialGameState());
  const [gs, setGs] = useState<ActiveGameState>(gameRef.current);
  const [gameReady, setGameReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phoneRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showHire, setShowHire] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [prizePosition, setPrizePosition] = useState<number | null>(null);
  const [prizeAchievedAt, setPrizeAchievedAt] = useState<string>("");
  const [flashMsg, setFlashMsg] = useState<{ text: string; color: string } | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [tutorialActive, setTutorialActive] = useState<boolean>(false);
  const tutorialStarted = useRef(false);

  const smokeAnims = useRef<Animated.Value[]>([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const flameAnim = useRef(new Animated.Value(0)).current;

  const [waiterMoving, setWaiterMoving] = useState(false);
  const [waiterCarrying, setWaiterCarrying] = useState(false);
  const [cookWorking, setCookWorking] = useState(false);
  const [playerOutfit, setPlayerOutfit] = useState<"waiter" | "cook">("waiter");
  const [isChangingOutfit, setIsChangingOutfit] = useState(false);
  const outfitChangeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playerStatusText, setPlayerStatusText] = useState<string | null>(null);
  const statusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cAnims = useRef<Map<string, CAnimData>>(new Map());
  const waiterX = useRef(new Animated.Value(WAITER_HOME_X)).current;
  const waiterY = useRef(new Animated.Value(WAITER_HOME_Y)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const phoneShake = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const doorAnim = useRef(new Animated.Value(1)).current;
  const stoveGlow = useRef(new Animated.Value(0.4)).current;
  const alarmPlayedFor = useRef<Set<string>>(new Set());
  const gameStartTime = useRef<number>(Date.now());
  const rushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [rushMultiplier, setRushMultiplier] = useState<number>(1);

  const sync = useCallback(() => setGs({ ...gameRef.current }), []);

  useEffect(() => {
    try { initAudio(); } catch (e) { console.log("[Game] initAudio failed:", e); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        console.log("[Game] Initializing game play...");
        const saved = await consumeSavedGame();
        if (cancelled) return;
        if (saved) {
          console.log("[Game] Resuming saved game with", saved.lives, "lives");
          gameRef.current = saved;
          setGs(saved);
        } else {
          console.log("[Game] No saved game, starting fresh");
        }
      } catch (e) {
        console.log("[Game] consumeSavedGame error:", e);
      }
      if (!cancelled) {
        console.log("[Game] Setting gameReady = true");
        setGameReady(true);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [consumeSavedGame]);

  const showFlash = useCallback((text: string, color: string) => {
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
    setFlashMsg({ text, color });
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(flashAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setFlashMsg(null));
    flashTimeout.current = setTimeout(() => setFlashMsg(null), 2000);
  }, [flashAnim]);

  const showPlayerStatus = useCallback((text: string, duration: number = 2000) => {
    if (statusTimeout.current) clearTimeout(statusTimeout.current);
    setPlayerStatusText(text);
    statusTimeout.current = setTimeout(() => setPlayerStatusText(null), duration);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(stoveGlow, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(stoveGlow, { toValue: 0.4, duration: 800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!cookWorking) {
      smokeAnims.forEach(anim => anim.stopAnimation());
      flameAnim.stopAnimation();
      return;
    }
    smokeAnims.forEach((anim, i) => {
      anim.stopAnimation();
      anim.setValue(0);
    });
    flameAnim.stopAnimation();
    flameAnim.setValue(0);

    smokeAnims.forEach((anim, i) => {
      const delay = i * 260;
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 900 + i * 80, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 350, useNativeDriver: true }),
          ])
        ).start();
      }, delay);
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(flameAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ])
    ).start();
  }, [cookWorking]);

  const flashDoor = useCallback(() => {
    doorAnim.setValue(1.5);
    Animated.spring(doorAnim, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }).start();
  }, [doorAnim]);

  useEffect(() => {
    const hasCooking = gs.kitchenOrders.some(o => o.progress > 0 && !o.isReady && o.menuItem.category !== "drink");
    setCookWorking(hasCooking);
  }, [gs.kitchenOrders]);

  const moveWaiterTo = useCallback((x: number, y: number, duration: number, onDone?: () => void) => {
    setWaiterMoving(true);
    Animated.parallel([
      Animated.timing(waiterX, { toValue: x, duration, useNativeDriver: true }),
      Animated.timing(waiterY, { toValue: y, duration, useNativeDriver: true }),
    ]).start(() => {
      setWaiterMoving(false);
      onDone?.();
    });
  }, [waiterX, waiterY]);

  const waiterToTable = useCallback((tableId: number) => {
    const pos = tblCenter(tableId);
    moveWaiterTo(pos.x, pos.y - 4, 500, () => {
      setTimeout(() => moveWaiterTo(WAITER_HOME_X, WAITER_HOME_Y, 480), 300);
    });
  }, [moveWaiterTo]);

  const waiterServeTable = useCallback((tableId: number) => {
    setWaiterMoving(true);
    Animated.parallel([
      Animated.timing(waiterX, { toValue: COOK_X - CW - 6, duration: 360, useNativeDriver: true }),
      Animated.timing(waiterY, { toValue: COOK_Y, duration: 360, useNativeDriver: true }),
    ]).start(() => {
      setWaiterCarrying(true);
      setWaiterMoving(true);
      const pos = tblCenter(tableId);
      Animated.parallel([
        Animated.timing(waiterX, { toValue: pos.x, duration: 550, useNativeDriver: true }),
        Animated.timing(waiterY, { toValue: pos.y - 4, duration: 550, useNativeDriver: true }),
      ]).start(() => {
        setWaiterCarrying(false);
        moveWaiterTo(WAITER_HOME_X, WAITER_HOME_Y, 400);
      });
    });
  }, [waiterX, waiterY, moveWaiterTo]);

  const triggerPhoneRing = useCallback(() => {
    const state = gameRef.current;
    if (state.phase !== "playing" || state.pendingPhoneOrder) return;
    const item = getRandomMenuItem();
    const phone: Customer = {
      id: genCid(),
      tableId: null,
      state: "arriving",
      patience: getCustomerPatience(state.level) * 1.4,
      maxPatience: getCustomerPatience(state.level) * 1.4,
      menuItem: item,
      orderType: "takeout",
      groupEmoji: "📱",
      tip: 0,
      isPhoneOrder: true,
      colorIndex: Math.floor(Math.random() * 10),
    };
    gameRef.current = { ...state, pendingPhoneOrder: phone };
    Animated.loop(
      Animated.sequence([
        Animated.timing(phoneShake, { toValue: 7, duration: 75, useNativeDriver: true }),
        Animated.timing(phoneShake, { toValue: -7, duration: 75, useNativeDriver: true }),
        Animated.timing(phoneShake, { toValue: 4, duration: 55, useNativeDriver: true }),
        Animated.timing(phoneShake, { toValue: 0, duration: 55, useNativeDriver: true }),
        Animated.delay(450),
      ]), { iterations: 7 }
    ).start();
    sync();
  }, [phoneShake, sync]);

  const schedulePhone = useCallback(() => {
    if (phoneRef.current) clearTimeout(phoneRef.current);
    const state = gameRef.current;
    const interval = Math.max(8000, 22000 - state.level * 2500);
    phoneRef.current = setTimeout(() => {
      triggerPhoneRing();
      schedulePhone();
    }, interval + Math.random() * 4000);
  }, [triggerPhoneRing]);

  const spawnCustomer = useCallback(() => {
    const state = gameRef.current;
    if (state.phase !== "playing") return;
    const empty = Array.from({ length: TABLE_COUNT }, (_, i) => i + 1)
      .filter(tid => !state.customers.find(c => c.tableId === tid));
    if (empty.length === 0) return;
    const arrivingCount = state.customers.filter(c => c.state === "arriving" && !c.tableId).length;
    const elapsedMs = Date.now() - gameStartTime.current;
    const timeBlocks = Math.floor(elapsedMs / 120000);
    const arrivalBoost = Math.pow(1.1, timeBlocks);
    const maxArriving = Math.min(20, Math.floor(4 * Math.pow(1.2, state.level - 1) * arrivalBoost));
    if (arrivingCount >= maxArriving) return;
    const item = getRandomMenuItem();
    const patience = getCustomerPatience(state.level);
    const emoji = rnd(CUSTOMER_EMOJIS);
    const customer: Customer = {
      id: genCid(),
      tableId: null,
      state: "arriving",
      patience,
      maxPatience: patience,
      menuItem: item,
      orderType: "dine_in",
      groupEmoji: emoji,
      tip: 0,
      colorIndex: Math.floor(Math.random() * 10),
    };
    console.log("[Game] Spawn customer", customer.id, "→ waiting at entrance");
    flashDoor();
    gameRef.current = { ...state, customers: [...state.customers, customer] };
    sync();
  }, [sync, flashDoor]);

  const getSpawnInterval = useCallback((level: number) => {
    const baseInterval = Math.max(GAME_CONFIG.minCustomerInterval, Math.floor(GAME_CONFIG.baseCustomerInterval * Math.pow(0.8, level - 1)));
    const elapsedMs = Date.now() - gameStartTime.current;
    const twoMinBlocks = Math.floor(elapsedMs / 120000);
    const timeMultiplier = Math.pow(0.9, twoMinBlocks);
    const finalInterval = Math.max(2000, Math.floor(baseInterval * timeMultiplier));
    console.log(`[Game] Spawn interval: base=${baseInterval}ms, blocks=${twoMinBlocks}, rush=x${(1 / timeMultiplier).toFixed(2)}, final=${finalInterval}ms`);
    return finalInterval;
  }, []);

  const startSpawnLoop = useCallback((level: number) => {
    if (spawnRef.current) clearInterval(spawnRef.current);
    const interval = getSpawnInterval(level);
    spawnRef.current = setInterval(spawnCustomer, interval);
  }, [spawnCustomer, getSpawnInterval]);

  const autoStaffLoop = useCallback(() => {
    const state = gameRef.current;
    if (state.phase !== "playing") return;
    let updated = { ...state };
    if (state.staffWaiters > 0) {
      const arriving = state.customers.find(c => c.state === "arriving" && !c.tableId);
      if (arriving) {
        const empty = Array.from({ length: TABLE_COUNT }, (_, i) => i + 1)
          .filter(tid => !updated.customers.find(c => c.tableId === tid));
        if (empty.length > 0) {
          const tableId = rnd(empty);
          updated.customers = updated.customers.map(c =>
            c.id === arriving.id ? { ...c, tableId, state: "seated" as CustomerState } : c
          );
          const anim = cAnims.current.get(arriving.id);
          if (anim) {
            anim.moving = true;
            const target = tblCenter(tableId);
            Animated.timing(anim.pos, {
              toValue: { x: target.x, y: target.y },
              duration: 1200,
              useNativeDriver: true,
            }).start(() => { anim.moving = false; });
          }
          waiterToTable(tableId);
        }
      }
      const seated = updated.customers.find(c => c.state === "seated" && c.tableId !== null);
      if (seated) {
        const anim = cAnims.current.get(seated.id);
        if (anim && !anim.moving) {
          const order: KitchenOrder = {
            id: genOid(),
            customerId: seated.id,
            menuItem: seated.menuItem,
            progress: 0,
            isReady: false,
            isTakeout: false,
          };
          updated.customers = updated.customers.map(c =>
            c.id === seated.id ? { ...c, state: "waiting" as CustomerState } : c
          );
          updated.kitchenOrders = [...updated.kitchenOrders, order];
          if (seated.tableId) waiterToTable(seated.tableId);
        }
      }
    }
    if (state.staffCooks > 0) {
      const queued = updated.kitchenOrders.find(o => o.progress === 0 && !o.isReady);
      if (queued) {
        updated.kitchenOrders = updated.kitchenOrders.map(o =>
          o.id === queued.id ? { ...o, progress: 1 } : o
        );
      }
    }
    gameRef.current = updated;
  }, [waiterToTable]);

  const endGame = useCallback(async () => {
    const state = gameRef.current;
    const score = state.score;
    setFinalScore(score);
    if (tickRef.current) clearInterval(tickRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (autoRef.current) clearInterval(autoRef.current);
    if (phoneRef.current) clearTimeout(phoneRef.current);
    await saveGameForRecovery(state);
    const result = await submitScore(currentUsername || "Jugador", score);
    const pos = typeof result === 'object' ? result.position : result;
    const achievedAt = typeof result === 'object' ? (result.achievedAt || "") : "";
    setPrizePosition(pos);
    setPrizeAchievedAt(achievedAt);
    setShowGameOver(true);
  }, [currentUsername, submitScore, saveGameForRecovery]);

  useEffect(() => {
    if (!gameReady || !gameStarted) return;
    if (gs.phase !== "playing") return;
    tickRef.current = setInterval(() => {
      const state = gameRef.current;
      if (state.phase !== "playing") return;
      let livesLost = 0;
      const updatedCustomers: Customer[] = [];

      const totalStaff = state.staffWaiters + state.staffCooks;
      const patienceMultiplier = (totalStaff === 0 ? 0.7 : 1 + totalStaff * 0.15) * 0.9;

      const angryCustomerIds = new Set<string>();
      let wastedMoney = 0;
      let wastedPoints = 0;
      let alarmTriggered = false;

      for (const c of state.customers) {
        if (c.state === "arriving" || c.state === "seated" || c.state === "ordering" || c.state === "waiting") {
          const newP = c.patience - TICK_MS * patienceMultiplier;
          if (newP <= 0) {
            livesLost++;
            angryCustomerIds.add(c.id);
            alarmPlayedFor.current.delete(c.id);
            console.log("[Game] Customer", c.id, "left ANGRY, wasting order", c.menuItem.name);
            wastedMoney += c.menuItem.price;
            wastedPoints += Math.floor(c.menuItem.points * 0.5);
            const anim = cAnims.current.get(c.id);
            if (anim) {
              Animated.sequence([
                Animated.timing(anim.scale, { toValue: 1.5, duration: 150, useNativeDriver: true }),
                Animated.timing(anim.scale, { toValue: 0, duration: 300, useNativeDriver: true }),
              ]).start(() => cAnims.current.delete(c.id));
            }
          } else {
            const newRatio = newP / c.maxPatience;
            if (newRatio < 0.14 && !alarmPlayedFor.current.has(c.id)) {
              alarmPlayedFor.current.add(c.id);
              alarmTriggered = true;
            }
            updatedCustomers.push({ ...c, patience: newP });
          }
        } else {
          updatedCustomers.push(c);
        }
      }
      if (alarmTriggered) playSound("alarm", 0.7);

      const validCustomerIds = new Set(updatedCustomers.map(c => c.id));
      const updatedOrders = state.kitchenOrders
        .filter(o => !angryCustomerIds.has(o.customerId))
        .filter(o => {
          if (o.isTakeout) return true;
          if (validCustomerIds.has(o.customerId)) return true;
          console.log("[Game] Orphaned order removed for missing customer:", o.customerId);
          wastedMoney += o.menuItem.price;
          wastedPoints += Math.floor(o.menuItem.points * 0.5);
          return false;
        })
        .map(o => {
        if (!o.isReady && o.progress > 0) {
          const ct = getCookingTime(o.menuItem, state.staffCooks);
          const np = o.progress + TICK_MS;
          if (np >= ct) return { ...o, progress: ct, isReady: true };
          return { ...o, progress: np };
        }
        return o;
      });

      const newLives = state.lives - livesLost;
      const newScore = state.score;
      const newLevel = Math.max(1, GAME_CONFIG.levelThresholds.filter(t => newScore >= t).length);

      if (livesLost > 0) {
        showFlash(`-${livesLost} ❤️ ¡Cliente enfadado! -€${wastedMoney}`, C.red);
        playSound("alarm");
      }

      const next: ActiveGameState = {
        ...state,
        customers: updatedCustomers,
        kitchenOrders: updatedOrders,
        lives: Math.max(0, newLives),
        score: Math.max(0, newScore - wastedPoints),
        money: Math.max(0, state.money - wastedMoney),
        level: newLevel,
        totalAngry: state.totalAngry + livesLost,
        phase: newLives <= 0 ? "game_over" : state.phase,
      };

      gameRef.current = next;
      setGs({ ...next });
      if (next.phase === "game_over") endGame();
    }, TICK_MS);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [gs.phase, gameReady, gameStarted, showFlash, endGame]);

  useEffect(() => {
    if (!gameReady || !gameStarted) return;
    startSpawnLoop(gs.level);
  }, [gs.level, gameReady, gameStarted, startSpawnLoop, rushMultiplier]);

  useEffect(() => {
    if (!gameReady || !gameStarted) return;
    if (rushTimerRef.current) clearInterval(rushTimerRef.current);
    rushTimerRef.current = setInterval(() => {
      const elapsedMs = Date.now() - gameStartTime.current;
      const blocks = Math.floor(elapsedMs / 120000);
      const newMultiplier = Math.pow(0.9, blocks);
      setRushMultiplier(prev => {
        if (prev !== newMultiplier) {
          console.log(`[Game] Rush hour! ${blocks * 2}min played, spawn speed x${(1 / newMultiplier).toFixed(2)}`);
          return newMultiplier;
        }
        return prev;
      });
    }, 10000);
    return () => { if (rushTimerRef.current) clearInterval(rushTimerRef.current); };
  }, [gameReady, gameStarted]);

  useEffect(() => {
    if (!gameReady || !gameStarted) return;
    autoRef.current = setInterval(autoStaffLoop, 2000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoStaffLoop, gameReady, gameStarted]);

  const spawnCustomerRef = useRef(spawnCustomer);
  spawnCustomerRef.current = spawnCustomer;
  const schedulePhoneRef = useRef(schedulePhone);
  schedulePhoneRef.current = schedulePhone;
  const tutorialDoneRef = useRef(tutorialDone);
  tutorialDoneRef.current = tutorialDone;

  useEffect(() => {
    if (!gameReady) return;
    console.log("[Game] gameReady=true, tutorialDone=", tutorialDoneRef.current, "starting game...");
    if (!tutorialDoneRef.current && !tutorialStarted.current) {
      tutorialStarted.current = true;
      setTutorialActive(true);
      setTutorialStep(0);
      console.log("[Game] Tutorial mode started, game paused until tutorial ends");
    } else {
      gameStartTime.current = Date.now();
      setGameStarted(true);
      try { spawnCustomerRef.current(); } catch (e) { console.log("[Game] spawnCustomer error:", e); }
      try { schedulePhoneRef.current(); } catch (e) { console.log("[Game] schedulePhone error:", e); }
      try { playSound("gameStart"); } catch (e) { console.log("[Game] playSound error:", e); }
      console.log("[Game] Game started, gameStarted=true");
    }
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (autoRef.current) clearInterval(autoRef.current);
      if (phoneRef.current) clearTimeout(phoneRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      if (rushTimerRef.current) clearInterval(rushTimerRef.current);
    };
  }, [gameReady]);

  useEffect(() => {
    const currentIds = new Set(gs.customers.map(c => c.id));

    gs.customers.forEach(customer => {
      if (!cAnims.current.has(customer.id)) {
        const arrivingIdx = gs.customers.filter(c => c.state === "arriving" && !c.tableId).indexOf(customer);
        const idx = Math.max(0, arrivingIdx);
        const entrX = ENTRANCE_X + 4 + (idx % 3) * (CW + 8);
        const entrY = ENTRANCE_Y + 2 + Math.floor(idx / 3) * (CH + 4);
        const anim: CAnimData = {
          pos: new Animated.ValueXY({ x: entrX, y: entrY }),
          scale: new Animated.Value(0.3),
          nervousActive: false,
          nervousAnim: null,
          moving: false,
        };
        cAnims.current.set(customer.id, anim);
        Animated.spring(anim.scale, { toValue: 1, tension: 220, friction: 7, useNativeDriver: true }).start();
      }

      const anim = cAnims.current.get(customer.id);
      if (!anim) return;
      const ratio = customer.patience / customer.maxPatience;
      const shouldNerve = ratio < 0.28 && (customer.state === "waiting" || customer.state === "seated");

      if (shouldNerve && !anim.nervousActive) {
        anim.nervousActive = true;
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim.scale, { toValue: 1.25, duration: 85, useNativeDriver: true }),
            Animated.timing(anim.scale, { toValue: 0.85, duration: 85, useNativeDriver: true }),
            Animated.timing(anim.scale, { toValue: 1.12, duration: 65, useNativeDriver: true }),
            Animated.timing(anim.scale, { toValue: 1, duration: 100, useNativeDriver: true }),
          ])
        );
        anim.nervousAnim = loop;
        loop.start();
      } else if (!shouldNerve && anim.nervousActive) {
        anim.nervousActive = false;
        if (anim.nervousAnim) { anim.nervousAnim.stop(); anim.nervousAnim = null; }
        Animated.spring(anim.scale, { toValue: 1, useNativeDriver: true }).start();
      }
    });

    const toDelete: string[] = [];
    cAnims.current.forEach((_, id) => { if (!currentIds.has(id)) toDelete.push(id); });
    toDelete.forEach(id => {
      const a = cAnims.current.get(id);
      if (a?.nervousAnim) a.nervousAnim.stop();
      cAnims.current.delete(id);
    });
  }, [gs.customers]);

  const changeOutfit = useCallback((targetOutfit: "waiter" | "cook", onDone: () => void) => {
    const state = gameRef.current;
    if (isChangingOutfit) {
      onDone();
      return;
    }
    if (playerOutfit === targetOutfit) {
      if (targetOutfit === "cook") {
        setWaiterMoving(true);
        Animated.parallel([
          Animated.timing(waiterX, { toValue: COOK_X, duration: 300, useNativeDriver: true }),
          Animated.timing(waiterY, { toValue: COOK_Y, duration: 300, useNativeDriver: true }),
        ]).start(() => { setWaiterMoving(false); onDone(); });
      } else {
        onDone();
      }
      return;
    }
    if (state.staffCooks > 0 && targetOutfit === "cook") {
      onDone();
      return;
    }
    if (state.staffWaiters > 0 && targetOutfit === "waiter") {
      onDone();
      return;
    }
    if (targetOutfit === "waiter" && playerOutfit === "cook" && state.staffCooks === 0) {
      const activeFoodCooking = state.kitchenOrders.some(
        o => o.progress > 0 && !o.isReady && o.menuItem.category !== "drink"
      );
      if (activeFoodCooking) {
        showFlash("¡Termina de cocinar primero! 🍳", C.orange);
        return;
      }
    }
    setIsChangingOutfit(true);
    const outfitLabel = targetOutfit === "cook" ? "Poniéndose el delantal..." : "Cambiándose de ropa...";
    showPlayerStatus(outfitLabel, 1800);

    const doChange = () => {
      if (outfitChangeRef.current) clearTimeout(outfitChangeRef.current);
      outfitChangeRef.current = setTimeout(() => {
        setPlayerOutfit(targetOutfit);
        setIsChangingOutfit(false);
        console.log("[Game] Outfit changed to", targetOutfit);
        onDone();
      }, 1500);
    };

    if (targetOutfit === "cook") {
      setWaiterMoving(true);
      Animated.parallel([
        Animated.timing(waiterX, { toValue: COOK_X, duration: 400, useNativeDriver: true }),
        Animated.timing(waiterY, { toValue: COOK_Y, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setWaiterMoving(false);
        doChange();
      });
    } else {
      doChange();
    }
  }, [playerOutfit, isChangingOutfit, showPlayerStatus, waiterX, waiterY]);

  const advanceTutorial = useCallback(() => {
    const nextStep = tutorialStep + 1;
    if (nextStep >= 4) {
      setTutorialActive(false);
      setTutorialStep(0);
      markTutorialDone();
      gameStartTime.current = Date.now();
      setGameStarted(true);
      try { spawnCustomerRef.current(); } catch (e) { console.log("[Game] spawnCustomer error:", e); }
      try { schedulePhoneRef.current(); } catch (e) { console.log("[Game] schedulePhone error:", e); }
      try { playSound("gameStart"); } catch (e) { console.log("[Game] playSound error:", e); }
      console.log("[Game] Tutorial complete, game started!");
    } else {
      setTutorialStep(nextStep);
    }
  }, [tutorialStep, markTutorialDone]);

  const waiterEscortToTable = useCallback((tableId: number, onDone?: () => void) => {
    setWaiterMoving(true);
    Animated.parallel([
      Animated.timing(waiterX, { toValue: ENTRANCE_X + CW + 6, duration: 350, useNativeDriver: true }),
      Animated.timing(waiterY, { toValue: ENTRANCE_Y, duration: 350, useNativeDriver: true }),
    ]).start(() => {
      const pos = tblCenter(tableId);
      Animated.parallel([
        Animated.timing(waiterX, { toValue: pos.x, duration: 550, useNativeDriver: true }),
        Animated.timing(waiterY, { toValue: pos.y - 4, duration: 550, useNativeDriver: true }),
      ]).start(() => {
        setWaiterMoving(false);
        setTimeout(() => moveWaiterTo(WAITER_HOME_X, WAITER_HOME_Y, 400), 200);
        onDone?.();
      });
    });
  }, [waiterX, waiterY, moveWaiterTo]);

  const handleCustomerTap = useCallback((customer: Customer) => {
    const state = gameRef.current;
    if (state.phase !== "playing" || isChangingOutfit) return;

    if (customer.state === "arriving") {
      if (tutorialActive && tutorialStep === 0) {
        setTutorialStep(1);
      }
      const empty = Array.from({ length: TABLE_COUNT }, (_, i) => i + 1)
        .filter(tid => !state.customers.find(c => c.tableId === tid));
      if (empty.length === 0) {
        showFlash("¡No hay mesas libres!", C.red);
        return;
      }
      const tableId = rnd(empty);
      changeOutfit("waiter", () => {
        const s = gameRef.current;
        gameRef.current = {
          ...s,
          customers: s.customers.map(c =>
            c.id === customer.id ? { ...c, tableId, state: "seated" as CustomerState } : c
          ),
        };
        const anim = cAnims.current.get(customer.id);
        if (anim) {
          anim.moving = true;
          const target = tblCenter(tableId);
          Animated.timing(anim.pos, {
            toValue: { x: target.x, y: target.y },
            duration: 1200,
            useNativeDriver: true,
          }).start(() => { anim.moving = false; });
        }
        waiterEscortToTable(tableId);
        showFlash("¡Bienvenido! 😊", C.gold);
        sync();
        if (tutorialActive && tutorialStep === 1) {
          setTimeout(() => setTutorialStep(2), 800);
        }
      });
    } else if (customer.state === "seated") {
      if (tutorialActive && tutorialStep === 2) {
        setTutorialStep(3);
      }
      changeOutfit("waiter", () => {
        const s = gameRef.current;
        const order: KitchenOrder = {
          id: genOid(),
          customerId: customer.id,
          menuItem: customer.menuItem,
          progress: 0,
          isReady: false,
          isTakeout: false,
        };
        gameRef.current = {
          ...s,
          customers: s.customers.map(c =>
            c.id === customer.id ? { ...c, state: "waiting" as CustomerState } : c
          ),
          kitchenOrders: [...s.kitchenOrders, order],
        };
        if (customer.tableId) waiterToTable(customer.tableId);
        showFlash(`${customer.menuItem.emoji} Pedido anotado`, C.goldLight);
        sync();
        if (tutorialActive && tutorialStep === 3) {
          setTimeout(() => setTutorialStep(4), 800);
        }
      });
    } else if (customer.state === "done") {
      changeOutfit("waiter", () => {
        const s = gameRef.current;
        const earned = customer.menuItem.price + customer.tip;
        const updInner = {
          ...s,
          money: s.money + earned,
          score: s.score + customer.menuItem.points,
          totalServed: s.totalServed + 1,
          customers: s.customers.filter(c => c.id !== customer.id),
          level: Math.max(1, GAME_CONFIG.levelThresholds.filter(t => (s.score + customer.menuItem.points) >= t).length),
        };
        const anim = cAnims.current.get(customer.id);
        if (anim) {
          Animated.timing(anim.pos, {
            toValue: { x: ENTRANCE_X, y: ENTRANCE_Y },
            duration: 800,
            useNativeDriver: true,
          }).start(() => {
            Animated.timing(anim.scale, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
              cAnims.current.delete(customer.id);
            });
          });
        }
        showFlash(`+€${earned}  +${customer.menuItem.points}pts ✨`, C.greenLight);
        playSound("cashRegister");
        alarmPlayedFor.current.delete(customer.id);
        gameRef.current = updInner;
        sync();
      });
    }
  }, [showFlash, sync, waiterToTable, waiterEscortToTable, changeOutfit, isChangingOutfit, tutorialActive, tutorialStep]);

  const handleKitchenTap = useCallback((order: KitchenOrder) => {
    const state = gameRef.current;
    if (state.phase !== "playing" || isChangingOutfit) return;

    const isDrink = order.menuItem.category === "drink";

    if (!order.isReady && order.progress === 0) {
      if (isDrink) {
        changeOutfit("waiter", () => {
          setWaiterMoving(true);
          Animated.parallel([
            Animated.timing(waiterX, { toValue: BAR_W / 2 - CW / 2, duration: 350, useNativeDriver: true }),
            Animated.timing(waiterY, { toValue: WAITER_HOME_Y, duration: 350, useNativeDriver: true }),
          ]).start(() => {
            setWaiterMoving(false);
            const s2 = gameRef.current;
            gameRef.current = {
              ...s2,
              kitchenOrders: s2.kitchenOrders.map(o =>
                o.id === order.id ? { ...o, progress: 1 } : o
              ),
            };
            showPlayerStatus(`Preparando ${order.menuItem.emoji}...`, 1500);
            sync();
          });
        });
      } else {
        changeOutfit("cook", () => {
          const s = gameRef.current;
          gameRef.current = {
            ...s,
            kitchenOrders: s.kitchenOrders.map(o =>
              o.id === order.id ? { ...o, progress: 1 } : o
            ),
          };
          showPlayerStatus(`Cocinando ${order.menuItem.emoji}...`, 2000);
          sync();
        });
      }
    } else if (order.isReady) {
      if (order.isTakeout) {
        changeOutfit("waiter", () => {
          showPlayerStatus("Entregando pedido...", 1200);
          const s = gameRef.current;
          const earned = order.menuItem.price;
          gameRef.current = {
            ...s,
            money: s.money + earned,
            score: s.score + order.menuItem.points,
            totalServed: s.totalServed + 1,
            kitchenOrders: s.kitchenOrders.filter(o => o.id !== order.id),
            pendingPhoneOrder: null,
          };
          showFlash(`📦 Para llevar +€${earned}`, C.gold);
          sync();
        });
      } else {
        changeOutfit("waiter", () => {
          showPlayerStatus(`Sirviendo ${order.menuItem.emoji}...`, 1500);
          const s = gameRef.current;
          const customer = s.customers.find(c => c.id === order.customerId);
          if (customer) {
            const tip = Math.floor(Math.random() * 5) + 1;
            gameRef.current = {
              ...s,
              customers: s.customers.map(c =>
                c.id === customer.id ? { ...c, state: "done" as CustomerState, tip } : c
              ),
              kitchenOrders: s.kitchenOrders.filter(o => o.id !== order.id),
            };
            if (customer.tableId) waiterServeTable(customer.tableId);
            showFlash(`${order.menuItem.emoji} ¡Servido!`, C.greenLight);
            sync();
          } else {
            console.log("[Game] Order ready but customer gone, removing wasted order", order.id);
            gameRef.current = {
              ...s,
              kitchenOrders: s.kitchenOrders.filter(o => o.id !== order.id),
              money: Math.max(0, s.money - order.menuItem.price),
              score: Math.max(0, s.score - Math.floor(order.menuItem.points * 0.5)),
            };
            showFlash(`💸 Comida desperdiciada -€${order.menuItem.price}`, C.red);
            sync();
          }
        });
      }
    }
  }, [showFlash, showPlayerStatus, sync, waiterServeTable, changeOutfit, isChangingOutfit, waiterX, waiterY]);

  const handlePhoneTap = useCallback(() => {
    const state = gameRef.current;
    if (!state.pendingPhoneOrder || state.phase !== "playing") return;
    const phone = state.pendingPhoneOrder;
    const order: KitchenOrder = {
      id: genOid(),
      customerId: phone.id,
      menuItem: phone.menuItem,
      progress: 0,
      isReady: false,
      isTakeout: true,
    };
    gameRef.current = { ...state, kitchenOrders: [...state.kitchenOrders, order], pendingPhoneOrder: null };
    phoneShake.stopAnimation();
    phoneShake.setValue(0);
    showFlash(`📱 Para llevar: ${phone.menuItem.emoji}`, C.phoneBorder);
    sync();
  }, [showFlash, sync, phoneShake]);

  const getHireCost = useCallback((type: "waiter" | "cook") => {
    const base = GAME_CONFIG.hiringCosts[type];
    const count = type === "waiter" ? gs.staffWaiters : gs.staffCooks;
    return Math.floor(base * Math.pow(GAME_CONFIG.hiringMultiplier, count));
  }, [gs.staffWaiters, gs.staffCooks]);

  const MAX_STAFF = 3;
  const allStaffMaxed = gs.staffWaiters >= MAX_STAFF && gs.staffCooks >= MAX_STAFF;

  const handleHire = useCallback((type: "waiter" | "cook") => {
    const state = gameRef.current;
    if (type === "waiter" && state.staffWaiters >= MAX_STAFF) {
      showFlash("¡Máximo 3 camareros! 🤵", C.orange);
      return;
    }
    if (type === "cook" && state.staffCooks >= MAX_STAFF) {
      showFlash("¡Máximo 3 cocineros! 👨‍🍳", C.orange);
      return;
    }
    const cost = getHireCost(type);
    if (state.money < cost) { showFlash("Sin dinero 💸", C.red); return; }
    if (type === "waiter") {
      gameRef.current = { ...state, money: state.money - cost, staffWaiters: state.staffWaiters + 1 };
      showFlash("¡Camarero contratado! 🤵", C.gold);
    } else {
      gameRef.current = { ...state, money: state.money - cost, staffCooks: state.staffCooks + 1 };
      showFlash("¡Cocinero contratado! 👨‍🍳", C.gold);
    }
    sync();
    setShowHire(false);
  }, [getHireCost, showFlash, sync]);

  const cookProgress = (o: KitchenOrder) => {
    const ct = getCookingTime(o.menuItem, gs.staffCooks);
    return Math.min(1, o.progress / ct);
  };

  const livesArr = Array.from({ length: GAME_CONFIG.maxLives });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      <View style={styles.hud}>
        <View style={styles.hudGroup}>
          <Text style={styles.hudLabel}>💰</Text>
          <Text style={styles.hudVal}>€{gs.money}</Text>
        </View>
        <View style={styles.hudGroup}>
          {livesArr.map((_, i) => (
            <Text key={i} style={[styles.heart, i >= gs.lives && styles.heartDead]}>
              {i < gs.lives ? "❤️" : "🖤"}
            </Text>
          ))}
        </View>
        <View style={styles.hudGroup}>
          <Text style={styles.hudLabel}>🏆</Text>
          <Text style={styles.hudVal}>{gs.score}</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Nv.{gs.level}</Text>
        </View>
      </View>

      <View style={styles.scene}>

        <View style={[styles.diningArea, { backgroundColor: C.diningFloor }]}>
          {Platform.OS !== 'web' ? (
            Array.from({ length: TILES_Y }).map((_, row) =>
              Array.from({ length: TILES_X }).map((_, col) => (
                <View
                  key={`t${row}-${col}`}
                  style={[
                    styles.floorTile,
                    {
                      left: col * TILE,
                      top: row * TILE,
                      backgroundColor: (row + col) % 2 === 0 ? C.diningFloor : C.diningFloorAlt,
                    },
                  ]}
                />
              ))
            )
          ) : (
            Array.from({ length: Math.ceil(TILES_Y / 2) }).map((_, row) =>
              Array.from({ length: Math.ceil(TILES_X / 2) }).map((_, col) => (
                <View
                  key={`t${row}-${col}`}
                  style={[
                    styles.floorTile,
                    {
                      left: col * TILE * 2,
                      top: row * TILE * 2,
                      width: TILE * 2,
                      height: TILE * 2,
                      backgroundColor: (row + col) % 2 === 0 ? C.diningFloor : C.diningFloorAlt,
                    },
                  ]}
                />
              ))
            )
          )}

          <View style={styles.entranceZone}>
            <Animated.View style={{ transform: [{ scale: doorAnim }] }}>
              <Text style={styles.doorIcon}>🚪</Text>
            </Animated.View>
            <Text style={styles.entranceLabel}>ENTRADA</Text>
          </View>

          {Array.from({ length: TABLE_COUNT }, (_, i) => {
            const id = i + 1;
            const r = tblRect(id);
            const customer = gs.customers.find(c => c.tableId === id);
            const isOccupied = !!customer;
            const isDone = customer?.state === "done";
            const hasFood = customer?.state === "waiting";
            const ratio = customer ? customer.patience / customer.maxPatience : 1;

            return (
              <View
                key={id}
                style={[
                  styles.table,
                  {
                    left: r.x,
                    top: r.y,
                    width: r.w,
                    height: r.h,
                    borderColor: isDone ? C.gold : isOccupied ? patienceBarColor(ratio) : C.tableBorder,
                    backgroundColor: isOccupied ? patienceTint(ratio) : C.tableWood,
                  },
                ]}
              >
                <View style={styles.chairN} />
                <View style={styles.chairS} />
                <View style={styles.chairW} />
                <View style={styles.chairE} />
                <Text style={styles.tableNum}>M{id}</Text>
                {hasFood && <Text style={styles.tableFood}>{customer!.menuItem.emoji}</Text>}
                {isDone && (
                  <Animated.Text style={[styles.tableDone, { transform: [{ scale: pulseAnim }] }]}>
                    💰
                  </Animated.Text>
                )}
              </View>
            );
          })}

          <View style={styles.signBar} pointerEvents="none">
            <Text style={styles.signText} numberOfLines={1}>✦  {restaurantDisplayName.toUpperCase()}  ✦</Text>
          </View>
        </View>

        <View style={[styles.dividerWall, { top: DINING_H }]}>
          <View style={[styles.wallSection, { width: BAR_W - PASS_W / 2 }]}>
            <Text style={styles.wallLabel}>BARRA</Text>
          </View>
          <View style={styles.passWindow}>
            <Text style={styles.passIcon}>🪟</Text>
          </View>
          <View style={[styles.wallSection, { flex: 1 }]}>
            <Text style={styles.wallLabel}>COCINA</Text>
          </View>
        </View>

        <View style={[styles.barArea, { top: DINING_H + DIVIDER_H }]}>
          <View style={styles.barCounter}>
            <View style={styles.barCounterTop}>
              <Text style={styles.barEquip}>🍷</Text>
              <Text style={styles.barEquip}>🧊</Text>
              <Text style={styles.barEquip}>☕</Text>
              <Text style={styles.barEquip}>📞</Text>
            </View>
          </View>
          <View style={styles.barLabel}>
            <Text style={styles.barLabelText}>BARRA</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.kitchenArea,
            {
              top: DINING_H + DIVIDER_H,
              left: KITCHEN_X,
              borderColor: Platform.OS === 'web' ? '#1e3412' : stoveGlow.interpolate({ inputRange: [0, 1], outputRange: ["#1e3412", "#3a6820"] }),
            },
          ]}
        >
          <View style={styles.stovesRow}>
            <View style={styles.stoveUnit}>
              {cookWorking && (
                <>
                  <Animated.Text style={[styles.flameIconBig, { opacity: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }), transform: [{ scale: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.5] }) }] }]}>🔥</Animated.Text>
                  <Animated.Text style={[styles.flameIconBigLeft, { opacity: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }), transform: [{ scale: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }] }]}>🔥</Animated.Text>
                </>
              )}
              <Text style={styles.stoveIcon}>🍳</Text>
            </View>
            <View style={styles.stoveUnit}>
              {cookWorking && (
                <>
                  <Animated.Text style={[styles.flameIconBig, { opacity: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }), transform: [{ scale: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1.6] }) }] }]}>🔥</Animated.Text>
                  <Animated.Text style={[styles.flameIconBigRight, { opacity: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), transform: [{ scale: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.4] }) }] }]}>🔥</Animated.Text>
                </>
              )}
              <Text style={styles.stoveIcon}>🥘</Text>
            </View>
            <View style={styles.stoveUnit}>
              {cookWorking && (
                <>
                  <Animated.Text style={[styles.flameIconBig, { opacity: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }), transform: [{ scale: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.4] }) }] }]}>🔥</Animated.Text>
                  <Animated.Text style={[styles.flameIconBigLeft, { opacity: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] }), transform: [{ scale: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.2] }) }] }]}>🔥</Animated.Text>
                </>
              )}
              <Text style={styles.stoveIcon}>🍳</Text>
            </View>
          </View>

          <View style={styles.prepCounter}>
            <Text style={styles.kitchenLabel}>Plancha</Text>
          </View>
          <View style={styles.kitchenLabelWrap}>
            <Text style={styles.kitchenLabelBig}>COCINA</Text>
          </View>
        </Animated.View>

        {Array.from({ length: gs.staffCooks }, (_, idx) => {
          const cookOffsetX = idx * (CW + 6);
          const skinColors = ["#d4956a", "#f4c090", "#c0784a"];
          return (
            <View
              key={`staff-cook-${idx}`}
              style={[styles.charWrapper, { left: COOK_X + cookOffsetX, top: COOK_Y }]}
              pointerEvents="none"
            >
              <CharacterSprite
                type="cook"
                working={cookWorking}
                moving={false}
                size={1}
                skinColor={skinColors[idx % skinColors.length]}
              />
            </View>
          );
        })}

        <Animated.View
          style={[
            styles.charWrapper,
            {
              left: 0,
              top: 0,
              transform: [{ translateX: waiterX }, { translateY: waiterY }],
            },
          ]}
          pointerEvents="none"
        >
          {isChangingOutfit ? (
            <View style={styles.changingOutfitBubble}>
              {playerOutfit === "waiter" ? (
                <View style={styles.outfitPreview}>
                  <View style={[styles.outfitHat, { backgroundColor: "#f0f0f0" }]} />
                  <View style={[styles.outfitBody, { backgroundColor: "#e8e8e8" }]}>
                    <View style={styles.outfitButton} />
                    <View style={[styles.outfitButton, { top: 8 }]} />
                  </View>
                  <Text style={styles.changingLabel}>👨‍🍳</Text>
                </View>
              ) : (
                <View style={styles.outfitPreview}>
                  <View style={[styles.outfitBody, { backgroundColor: "#1a1a2e" }]}>
                    <View style={[styles.outfitBowTie, { backgroundColor: "#c0392b" }]} />
                  </View>
                  <Text style={styles.changingLabel}>🤵</Text>
                </View>
              )}
            </View>
          ) : (
            <CharacterSprite
              type={playerOutfit}
              moving={waiterMoving}
              carrying={waiterCarrying}
              working={playerOutfit === "cook" && cookWorking}
              size={1}
            />
          )}
          {playerStatusText && (
            <View style={styles.playerStatusBubble}>
              <Text style={styles.playerStatusText}>{playerStatusText}</Text>
            </View>
          )}
        </Animated.View>

        {Array.from({ length: gs.staffWaiters }, (_, idx) => {
          const staffSkins = ["#e8b87a", "#d4956a", "#f4c090"];
          return (
            <View
              key={`staff-waiter-${idx}`}
              style={[styles.charWrapper, { left: WAITER_HOME_X + (CW + 6) * (idx + 1), top: WAITER_HOME_Y }]}
              pointerEvents="none"
            >
              <CharacterSprite
                type="waiter"
                moving={false}
                size={0.9}
                skinColor={staffSkins[idx % staffSkins.length]}
              />
            </View>
          );
        })}

        {gs.customers.map(customer => {
          if (!cAnims.current.has(customer.id)) return null;
          const anim = cAnims.current.get(customer.id)!;
          const ratio = customer.patience / customer.maxPatience;
          const isActionable = customer.state === "arriving" || customer.state === "seated" || customer.state === "done";
          const cfg = getCustomerConfig(customer.id);
          const isMoving = anim.moving;
          const isWaving = (customer.state === "arriving" && !anim.moving) || (customer.state === "seated" && !anim.moving);

          return (
            <Animated.View
              key={customer.id}
              style={[
                styles.customerWrapper,
                {
                  transform: [
                    { translateX: anim.pos.x },
                    { translateY: anim.pos.y },
                    { scale: anim.scale },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => handleCustomerTap(customer)}
                disabled={!isActionable}
                activeOpacity={0.8}
                style={[
                  styles.customerTouch,
                  { borderColor: isActionable ? C.gold : "transparent", borderWidth: isActionable ? 1.5 : 0 },
                  { backgroundColor: patienceTint(ratio) },
                ]}
              >
                <CharacterSprite
                  type="customer"
                  moving={isMoving}
                  working={false}
                  waving={isWaving}
                  outfitColor={cfg.outfit}
                  skinColor={cfg.skin}
                  hairColor={cfg.hair}
                  size={0.85}
                />

                {isActionable && (
                  <Animated.View style={[styles.actionDot, { transform: [{ scale: pulseAnim }] }]} />
                )}
                {customer.state === "done" && (
                  <Text style={styles.doneBadge}>💰</Text>
                )}
                {(customer.state === "arriving" || customer.state === "seated" || customer.state === "waiting") && (
                  <View style={styles.patienceBar}>
                    <View
                      style={[
                        styles.patienceFill,
                        {
                          width: `${ratio * 100}%` as unknown as number,
                          backgroundColor: patienceBarColor(ratio),
                        },
                      ]}
                    />
                  </View>
                )}
                {customer.state === "waiting" && (
                  <View style={styles.waitBubble}>
                    <Text style={styles.waitEmoji}>{customer.menuItem.emoji}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        {cookWorking && (
          <View
            style={{
              position: "absolute",
              left: KITCHEN_X + 2,
              top: DINING_H - 55,
              width: KITCHEN_W - 4,
              height: 80,
              zIndex: 1000,
              pointerEvents: "none",
            }}
          >
            {smokeAnims.map((anim, i) => (
              <Animated.View
                key={`smoke-top-${i}`}
                style={[
                  styles.smokePuff,
                  {
                    left: 2 + (i % 3) * Math.floor((KITCHEN_W - 4) / 3),
                    bottom: 0,
                    top: undefined,
                    opacity: anim.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [0, 0.95, 0.9, 0] }),
                    transform: [
                      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, -40] }) },
                      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) },
                    ],
                  },
                ]}
              />
            ))}
            {smokeAnims.map((anim, i) => (
              <Animated.View
                key={`smoke-top2-${i}`}
                style={[
                  styles.smokePuffLarge,
                  {
                    left: 8 + (i % 3) * Math.floor((KITCHEN_W - 4) / 3) + 6,
                    bottom: 0,
                    top: undefined,
                    opacity: anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0.75, 0.7, 0] }),
                    transform: [
                      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [35, -55] }) },
                      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.5] }) },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <ScrollView style={styles.bottomPanel} bounces={false} showsVerticalScrollIndicator={false}>

        {gs.pendingPhoneOrder && (
          <TouchableOpacity
            style={styles.phoneCard}
            onPress={handlePhoneTap}
            activeOpacity={0.8}
            testID="phone-order"
          >
            <Animated.Text style={[styles.phoneIcon, { transform: [{ translateX: phoneShake }] }]}>
              📱
            </Animated.Text>
            <View style={styles.phoneInfo}>
              <Text style={styles.phoneTitle}>¡Pedido telefónico!</Text>
              <Text style={styles.phoneItem}>
                {gs.pendingPhoneOrder.menuItem.emoji} {gs.pendingPhoneOrder.menuItem.name} — Para llevar
              </Text>
            </View>
            <View style={styles.phoneBtn}>
              <Text style={styles.phoneBtnText}>Aceptar</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👨‍🍳 PEDIDOS EN COCINA</Text>
          {gs.staffCooks > 0 && <Text style={styles.autoChip}>AUTO ×{gs.staffCooks}</Text>}
        </View>

        <View style={styles.ordersRow}>
          {gs.kitchenOrders.length === 0 ? (
            <View style={styles.ordersEmpty}>
              <Text style={styles.ordersEmptyText}>Sin pedidos 🍽️</Text>
            </View>
          ) : (
            gs.kitchenOrders.map(order => {
              const prog = cookProgress(order);
              const isReady = order.isReady;
              return (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderCard, isReady && styles.orderCardReady]}
                  onPress={() => handleKitchenTap(order)}
                  activeOpacity={0.75}
                  testID={`kitchen-order-${order.id}`}
                >
                  <Animated.Text style={[styles.orderEmoji, isReady && { transform: [{ scale: pulseAnim }] }]}>
                    {order.menuItem.emoji}
                  </Animated.Text>
                  <Text style={styles.orderName} numberOfLines={1}>{order.menuItem.name}</Text>
                  {order.progress > 0 && !isReady && (
                    <View style={styles.cookBar}>
                      <View style={[styles.cookFill, { width: `${prog * 100}%` as unknown as number }]} />
                    </View>
                  )}
                  <Text style={[styles.orderAction, isReady && styles.orderActionReady]}>
                    {isReady
                      ? (order.isTakeout ? "📦 Lista" : "🍽️ Servir")
                      : order.progress > 0 ? "🔥 Cocinando" : "👆 Cocinar"}
                  </Text>
                  {order.isTakeout && <Text style={styles.takeoutTag}>📦</Text>}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.staffRow}>
          {gs.staffWaiters > 0 && (
            <View style={styles.staffChip}>
              <Text style={styles.staffChipTxt}>🤵 ×{gs.staffWaiters}</Text>
            </View>
          )}
          {gs.staffCooks > 0 && (
            <View style={styles.staffChip}>
              <Text style={styles.staffChipTxt}>👨‍🍳 ×{gs.staffCooks}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.hireBtn, allStaffMaxed && styles.hireBtnDisabled]}
            onPress={() => { if (!allStaffMaxed) setShowHire(true); }}
            disabled={allStaffMaxed}
            testID="hire-button"
          >
            <Text style={[styles.hireBtnTxt, allStaffMaxed && styles.hireBtnDisabledTxt]}>
              {allStaffMaxed ? "✓ Plantilla completa" : "+ Contratar"}
            </Text>
          </TouchableOpacity>
          <View style={styles.servedChip}>
            <Text style={styles.servedTxt}>✅ {gs.totalServed}</Text>
          </View>
        </View>

        <View style={{ height: insets.bottom + 10 }} />
      </ScrollView>

      {flashMsg && (
        <Animated.View style={[styles.flash, { opacity: flashAnim, borderColor: flashMsg.color }]}>
          <Text style={[styles.flashTxt, { color: flashMsg.color }]}>{flashMsg.text}</Text>
        </Animated.View>
      )}

      <Modal visible={showHire} transparent animationType="slide" onRequestClose={() => setShowHire(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>💼 Contratar Personal</Text>
            {HIRE_STAFF_OPTIONS.map(opt => {
              const cost = getHireCost(opt.type);
              const canAfford = gs.money >= cost;
              const currentCount = opt.type === "waiter" ? gs.staffWaiters : gs.staffCooks;
              const isMaxed = currentCount >= 3;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.hireOption, (!canAfford || isMaxed) && styles.hireOptionOff]}
                  onPress={() => handleHire(opt.type)}
                  testID={`hire-${opt.type}`}
                >
                  <Text style={styles.hireOptEmoji}>{opt.emoji}</Text>
                  <View style={styles.hireOptInfo}>
                    <Text style={styles.hireOptTitle}>{opt.title} ({currentCount}/3)</Text>
                    <Text style={styles.hireOptDesc}>
                      {isMaxed ? "¡Máximo alcanzado!" : opt.description}
                    </Text>
                  </View>
                  <Text style={[styles.hireOptCost, (!canAfford || isMaxed) && { color: C.red }]}>
                    {isMaxed ? "MAX" : `€${cost}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowHire(false)}>
              <Text style={styles.modalCloseTxt}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showGameOver} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverEmoji}>
              {prizePosition !== null && prizePosition < 10 ? "🏆" : "😔"}
            </Text>
            <Text style={styles.gameOverTitle}>
              {prizePosition !== null && prizePosition < 10 ? "¡INCREÍBLE!" : "FIN DEL JUEGO"}
            </Text>
            <Text style={styles.gameOverScore}>{finalScore} puntos</Text>

            {prizePosition !== null && prizePosition >= 0 && prizePosition < 10 ? (
              <View style={styles.prizeBox}>
                <Text style={styles.prizeBoxTitle}>🍮 ¡Premio desbloqueado!</Text>
                <Text style={styles.prizeBoxRestaurant}>📍 {restaurantDisplayName}</Text>
                <Text style={styles.prizeBoxTxt}>
                  ¡Has ganado un postre gratis!{"\n"}
                  Posición #{prizePosition + 1} · Muestra este mensaje al camarero
                </Text>
                {prizeAchievedAt !== "" && (
                  <Text style={styles.prizeBoxDate}>🕐 Conseguido el {prizeAchievedAt}</Text>
                )}
                <Text style={styles.prizeBoxWarn}>⚠️ Válido solo hoy en el restaurante</Text>
              </View>
            ) : prizePosition !== null && prizePosition >= 10 && prizePosition < 20 ? (
              <View style={styles.inRankingBox}>
                <Text style={styles.inRankingTitle}>🏆 ¡Estás en el ranking!</Text>
                <Text style={styles.inRankingTxt}>
                  Posición #{prizePosition + 1} del Top 20.{"\n"}
                  ¡Sigue jugando para entrar en el Top 10 y ganar un postre!
                </Text>
              </View>
            ) : (
              <View style={styles.notRankedBox}>
                <Text style={styles.notRankedTxt}>
                  Tu puntuación no está entre las 20 mejores puntuaciones, pero estás muy cerca ¡síguelo intentando!!
                </Text>
                <Text style={styles.gameOverSub}>
                  Serviste {gs.totalServed} clientes.
                </Text>
              </View>
            )}

            {gs.lives === 0 && (
              <TouchableOpacity
                style={styles.recoverBtn}
                onPress={() => { setShowGameOver(false); if (Platform.OS === 'web' && typeof window !== 'undefined') { window.location.href = '/game/recover'; } else { router.push("/game/recover"); } }}
                testID="recover-life-button"
              >
                <Text style={styles.recoverBtnTxt}>❤️ Recuperar vidas</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => { setShowGameOver(false); if (Platform.OS === 'web' && typeof window !== 'undefined') { window.location.href = '/game'; } else { router.replace("/game"); } }}
              testID="back-menu-button"
            >
              <Text style={styles.menuBtnTxt}>🏠 Menú principal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {tutorialActive && (
        <TouchableOpacity
          style={styles.tutorialOverlay}
          activeOpacity={1}
          onPress={advanceTutorial}
        >
          <View style={styles.tutorialCard}>
            {tutorialStep === 0 && (
              <>
                <Text style={styles.tutorialEmoji}>👋</Text>
                <Text style={styles.tutorialTitle}>¡Bienvenido a {restaurantDisplayName}!</Text>
                <Text style={styles.tutorialText}>
                  Un cliente acaba de llegar al restaurante. Espera en la entrada moviendo el brazo. Toca sobre él para acompañarlo a su mesa.
                </Text>
                <Text style={styles.tutorialHint}>👆 Toca para continuar</Text>
              </>
            )}
            {tutorialStep === 1 && (
              <>
                <Text style={styles.tutorialEmoji}>🖐️</Text>
                <Text style={styles.tutorialTitle}>¡El cliente quiere pedir!</Text>
                <Text style={styles.tutorialText}>
                  Cuando el cliente se sienta, mueve el brazo llamándote. Tócalo para tomar su pedido. ¡La barra de paciencia baja!
                </Text>
                <Text style={styles.tutorialHint}>👆 Toca para continuar</Text>
              </>
            )}
            {tutorialStep === 2 && (
              <>
                <Text style={styles.tutorialEmoji}>📝</Text>
                <Text style={styles.tutorialTitle}>¡Pedido anotado!</Text>
                <Text style={styles.tutorialText}>
                  Ahora cocina el pedido en el panel de abajo. Si no tienes cocinero, tendrás que cambiarte de ropa - ¡eso lleva tiempo!
                </Text>
                <Text style={styles.tutorialHint}>👆 Toca para continuar</Text>
              </>
            )}
            {tutorialStep === 3 && (
              <>
                <Text style={styles.tutorialEmoji}>💡</Text>
                <Text style={styles.tutorialTitle}>Consejos importantes</Text>
                <Text style={styles.tutorialText}>
                  • Trabajas solo: la paciencia baja más lento{"\n"}
                  • Más empleados: más presión{"\n"}
                  • Cambiarte de ropa lleva tiempo{"\n"}
                  • Contrata camareros (€80) y cocineros (€120){"\n"}
                  • Si pierdes vidas, recupéralas viendo un anuncio
                </Text>
                <Text style={styles.tutorialHint}>👆 Toca para empezar a jugar</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#0e0a04",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  hudGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  hudLabel: { fontSize: 14 },
  hudVal: { fontSize: 16, fontWeight: "800" as const, color: C.gold },
  heart: { fontSize: 13 },
  heartDead: { opacity: 0.25 },
  levelBadge: {
    backgroundColor: C.gold,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelText: { fontSize: 12, fontWeight: "800" as const, color: C.bg },

  scene: {
    width,
    height: SCENE_H,
    overflow: "hidden" as const,
    position: "relative" as const,
  },

  diningArea: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: DINING_H,
    overflow: "hidden" as const,
  },
  floorTile: {
    position: "absolute" as const,
    width: TILE,
    height: TILE,
  },

  entranceZone: {
    position: "absolute" as const,
    top: 2,
    left: 2,
    width: ENTRANCE_ZONE_W,
    height: ENTRANCE_ZONE_H,
    backgroundColor: "rgba(200,168,75,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(200,168,75,0.2)",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 4,
    zIndex: 12,
  },
  doorIcon: { fontSize: 16 },
  entranceLabel: { fontSize: 7, fontWeight: "800" as const, color: "#5a4a20", letterSpacing: 1 },

  table: {
    position: "absolute" as const,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 2,
  },
  chairN: {
    position: "absolute" as const, top: -5, alignSelf: "center" as const,
    width: 18, height: 5, backgroundColor: C.chair, borderRadius: 3,
  },
  chairS: {
    position: "absolute" as const, bottom: -5, alignSelf: "center" as const,
    width: 18, height: 5, backgroundColor: C.chair, borderRadius: 3,
  },
  chairW: {
    position: "absolute" as const, left: -5,
    width: 5, height: 12, backgroundColor: C.chair, borderRadius: 3,
  },
  chairE: {
    position: "absolute" as const, right: -5,
    width: 5, height: 12, backgroundColor: C.chair, borderRadius: 3,
  },
  tableNum: {
    position: "absolute" as const, top: 3, left: 5,
    fontSize: 8, color: "#8a6030", fontWeight: "700" as const,
  },
  tableFood: { fontSize: 16 },
  tableDone: { position: "absolute" as const, top: -6, fontSize: 13 },

  signBar: {
    position: "absolute" as const,
    top: 4,
    left: ENTRANCE_ZONE_W + 8,
    right: 0,
    alignItems: "center" as const,
    zIndex: 10,
  },
  signText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: C.gold,
    letterSpacing: 2,
    opacity: 0.8,
  },

  dividerWall: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    height: DIVIDER_H,
    backgroundColor: C.wallDark,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    zIndex: 8,
  },
  wallSection: {
    height: DIVIDER_H,
    backgroundColor: C.wallDark,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  wallLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#6a5a30",
    letterSpacing: 2,
  },
  passWindow: {
    width: PASS_W,
    height: 22,
    backgroundColor: C.passWindow,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 8,
    zIndex: 9,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#2a5a8c",
  },
  passIcon: { fontSize: 11 },

  barArea: {
    position: "absolute" as const,
    left: 0,
    width: BAR_W,
    height: SERVICE_H,
    backgroundColor: C.barFloor,
  },
  barCounter: {
    position: "absolute" as const,
    top: 8,
    left: 8,
    right: 8,
    height: 28,
    backgroundColor: C.barCounter,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3a3a6a",
    overflow: "hidden" as const,
  },
  barCounterTop: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: C.barCounterTop,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-around" as const,
    paddingHorizontal: 8,
  },
  barEquip: { fontSize: 14 },
  barLabel: {
    position: "absolute" as const,
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: "center" as const,
  },
  barLabelText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "#4a4a7a",
    letterSpacing: 2,
  },

  kitchenArea: {
    position: "absolute" as const,
    width: KITCHEN_W,
    height: SERVICE_H,
    backgroundColor: C.kitchenFloor,
    borderLeftWidth: 1,
    borderLeftColor: "#1e3412",
  },
  stovesRow: {
    position: "absolute" as const,
    top: 6,
    left: 8,
    right: 8,
    flexDirection: "row" as const,
    gap: 6,
  },
  stoveUnit: {
    flex: 1,
    height: 28,
    backgroundColor: C.kitchenCounter,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2a4a1a",
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    paddingBottom: 2,
    overflow: "visible" as const,
  },
  stoveIcon: { fontSize: 14 },
  prepCounter: {
    position: "absolute" as const,
    bottom: 22,
    left: 8,
    right: 8,
    height: 16,
    backgroundColor: C.kitchenCounterTop,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#2a4a1a",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  kitchenLabel: { fontSize: 7, color: "#3a5a1a", fontWeight: "700" as const, letterSpacing: 1 },
  kitchenLabelWrap: {
    position: "absolute" as const,
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: "center" as const,
  },
  kitchenLabelBig: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "#3a6a1a",
    letterSpacing: 2,
  },

  charWrapper: { position: "absolute" as const, zIndex: 15 },
  changingOutfitBubble: {
    width: CW,
    height: CH,
    borderRadius: 8,
    backgroundColor: "rgba(200,168,75,0.3)",
    borderWidth: 1,
    borderColor: C.gold,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  changingOutfitText: { fontSize: 18 },
  customerWrapper: { position: "absolute" as const, left: 0, top: 0, zIndex: 20 },
  customerTouch: {
    width: CW + 2,
    borderRadius: 8,
    alignItems: "center" as const,
    overflow: "visible" as const,
    paddingBottom: 2,
  },
  actionDot: {
    position: "absolute" as const,
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.gold,
    borderWidth: 1,
    borderColor: C.bg,
  },
  doneBadge: {
    position: "absolute" as const,
    top: -8,
    fontSize: 11,
  },
  patienceBar: {
    width: CW,
    height: 3,
    backgroundColor: "#0a0400",
    borderRadius: 2,
    overflow: "hidden" as const,
    marginTop: 1,
  },
  patienceFill: { height: 3, borderRadius: 2 },
  waitBubble: {
    position: "absolute" as const,
    top: -10,
    right: -4,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: C.gold,
  },
  waitEmoji: { fontSize: 9 },

  bottomPanel: { flex: 1, backgroundColor: C.bg },

  phoneCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: C.phone,
    borderRadius: 14,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.phoneBorder,
    gap: 10,
  },
  phoneIcon: { fontSize: 24 },
  phoneInfo: { flex: 1 },
  phoneTitle: { fontSize: 13, fontWeight: "700" as const, color: "#7dcfff" },
  phoneItem: { fontSize: 11, color: "#90b8d8", marginTop: 2 },
  phoneBtn: {
    backgroundColor: C.phoneBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  phoneBtnText: { fontSize: 11, fontWeight: "700" as const, color: "#fff" },

  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 11, fontWeight: "700" as const, color: C.textMuted, letterSpacing: 1.5 },
  autoChip: {
    fontSize: 10, fontWeight: "700" as const, color: C.greenLight,
    backgroundColor: "rgba(45,106,30,0.2)", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },

  ordersRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, paddingHorizontal: 10, gap: 6 },
  ordersEmpty: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 14,
    backgroundColor: "#0c0800", borderRadius: 12, alignItems: "center" as const,
    borderWidth: 1, borderColor: C.border, borderStyle: "dashed" as const,
  },
  ordersEmptyText: { color: C.textMuted, fontSize: 12 },
  orderCard: {
    backgroundColor: "#0c1005", borderRadius: 12, padding: 10,
    alignItems: "center" as const, borderWidth: 1, borderColor: "#182010",
    minWidth: (width - 32) / 3 - 4, flex: 1, gap: 3,
  },
  orderCardReady: { borderColor: C.gold, backgroundColor: "#0e1800" },
  orderEmoji: { fontSize: 22 },
  orderName: { fontSize: 9, color: C.text, fontWeight: "500" as const, textAlign: "center" as const },
  cookBar: { width: "90%", height: 3, backgroundColor: "#111", borderRadius: 2, overflow: "hidden" as const },
  cookFill: { height: 3, backgroundColor: C.orange, borderRadius: 2 },
  orderAction: { fontSize: 9, color: C.textMuted, fontWeight: "600" as const, textAlign: "center" as const },
  orderActionReady: { color: C.goldLight },
  takeoutTag: { position: "absolute" as const, top: 4, right: 4, fontSize: 9 },

  staffRow: {
    flexDirection: "row" as const, alignItems: "center" as const,
    paddingHorizontal: 14, paddingVertical: 10,
    flexWrap: "wrap" as const, gap: 8, marginTop: 4,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
  },
  staffChip: {
    backgroundColor: C.card, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border,
  },
  staffChipTxt: { fontSize: 12, color: C.gold, fontWeight: "600" as const },
  hireBtn: { backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  hireBtnDisabled: { backgroundColor: "#1a2a10", borderWidth: 1, borderColor: "#2a4a1a" },
  hireBtnTxt: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  hireBtnDisabledTxt: { color: "#4a7a2a", fontSize: 11 },
  servedChip: { marginLeft: "auto" },
  servedTxt: { fontSize: 11, color: C.textMuted },

  flash: {
    position: "absolute" as const, top: 75, alignSelf: "center" as const,
    backgroundColor: C.card, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
    borderWidth: 1, zIndex: 999,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 10,
  },
  flashTxt: { fontSize: 14, fontWeight: "700" as const },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" as const,
  },
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderTopWidth: 1, borderTopColor: C.border,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" as const, color: C.gold, marginBottom: 16 },
  hireOption: {
    flexDirection: "row" as const, alignItems: "center" as const,
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, gap: 12,
  },
  hireOptionOff: { opacity: 0.35 },
  hireOptEmoji: { fontSize: 32 },
  hireOptInfo: { flex: 1 },
  hireOptTitle: { fontSize: 16, fontWeight: "700" as const, color: C.text },
  hireOptDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  hireOptCost: { fontSize: 18, fontWeight: "800" as const, color: C.gold },
  modalClose: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14, alignItems: "center" as const, marginTop: 4,
  },
  modalCloseTxt: { fontSize: 15, fontWeight: "600" as const, color: C.textMuted },

  gameOverCard: {
    backgroundColor: C.card, margin: 20, borderRadius: 24, padding: 28,
    alignItems: "center" as const, borderWidth: 1, borderColor: C.border,
    marginTop: "auto", marginBottom: "auto",
  },
  gameOverEmoji: { fontSize: 64, marginBottom: 8 },
  gameOverTitle: { fontSize: 28, fontWeight: "800" as const, color: C.gold, marginBottom: 6 },
  gameOverScore: { fontSize: 22, fontWeight: "700" as const, color: C.cream, marginBottom: 16 },
  gameOverSub: { fontSize: 13, color: C.textMuted, textAlign: "center" as const, marginTop: 6 },
  notRankedBox: {
    backgroundColor: "#1a0c00", borderRadius: 14, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: C.border, alignItems: "center" as const,
  },
  notRankedTxt: { fontSize: 13, color: C.cream, textAlign: "center" as const, lineHeight: 20, marginBottom: 4 },
  inRankingBox: {
    backgroundColor: "#0a1a00", borderRadius: 14, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: C.green, alignItems: "center" as const,
  },
  inRankingTitle: { fontSize: 15, fontWeight: "700" as const, color: C.greenLight, marginBottom: 6 },
  inRankingTxt: { fontSize: 13, color: C.cream, textAlign: "center" as const, lineHeight: 20 },
  prizeBox: {
    backgroundColor: "#1a2a00", borderRadius: 14, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: C.gold, alignItems: "center" as const,
  },
  prizeBoxTitle: { fontSize: 16, fontWeight: "700" as const, color: C.gold, marginBottom: 6 },
  prizeBoxRestaurant: { fontSize: 14, fontWeight: "700" as const, color: C.cream, marginBottom: 8, textAlign: "center" as const },
  prizeBoxTxt: { fontSize: 13, color: C.cream, textAlign: "center" as const, lineHeight: 20, marginBottom: 6 },
  prizeBoxDate: { fontSize: 12, color: C.goldLight, textAlign: "center" as const, marginBottom: 6, fontStyle: "italic" as const },
  prizeBoxWarn: { fontSize: 11, color: C.orange, textAlign: "center" as const },
  recoverBtn: {
    backgroundColor: C.red, borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 28, marginBottom: 10, width: "100%", alignItems: "center" as const,
  },
  recoverBtnTxt: { fontSize: 16, fontWeight: "700" as const, color: "#fff" },
  menuBtn: {
    backgroundColor: C.surface, borderRadius: 14, paddingVertical: 12,
    paddingHorizontal: 28, width: "100%", alignItems: "center" as const,
    borderWidth: 1, borderColor: C.border,
  },
  menuBtnTxt: { fontSize: 15, fontWeight: "600" as const, color: C.textMuted },

  flameIcon: {
    position: "absolute" as const,
    bottom: -2,
    fontSize: 10,
  },
  flameIconBig: {
    position: "absolute" as const,
    top: -2,
    fontSize: 14,
    zIndex: 5,
  },
  flameIconBigLeft: {
    position: "absolute" as const,
    top: 0,
    left: 1,
    fontSize: 11,
    zIndex: 5,
  },
  flameIconBigRight: {
    position: "absolute" as const,
    top: 0,
    right: 1,
    fontSize: 11,
    zIndex: 5,
  },
  smokeContainer: {
    position: "absolute" as const,
    top: -2,
    left: 0,
    right: 0,
    height: 20,
    flexDirection: "row" as const,
    zIndex: 30,
  },
  smokePuff: {
    position: "absolute" as const,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(200,200,200,0.75)",
  },
  smokePuffLarge: {
    position: "absolute" as const,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(180,180,180,0.6)",
  },
  flameIconLeft: {
    position: "absolute" as const,
    bottom: -2,
    left: 2,
    fontSize: 8,
  },
  flameIconRight: {
    position: "absolute" as const,
    bottom: -2,
    right: 2,
    fontSize: 8,
  },

  outfitPreview: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 1,
  },
  outfitHat: {
    width: 12,
    height: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  outfitBody: {
    width: 16,
    height: 12,
    borderRadius: 3,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  outfitButton: {
    position: "absolute" as const,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#aaa",
    top: 3,
  },
  outfitBowTie: {
    width: 6,
    height: 3,
    borderRadius: 1,
    position: "absolute" as const,
    top: 2,
  },
  changingLabel: {
    fontSize: 8,
    marginTop: 1,
  },
  playerStatusBubble: {
    position: "absolute" as const,
    top: -18,
    alignSelf: "center" as const,
    backgroundColor: "rgba(0,0,0,0.82)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.gold,
    zIndex: 50,
    minWidth: 60,
  },
  playerStatusText: {
    fontSize: 7,
    fontWeight: "700" as const,
    color: C.goldLight,
    textAlign: "center" as const,
  },

  tutorialOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  tutorialCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: C.gold,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  tutorialEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  tutorialTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: C.gold,
    textAlign: "center" as const,
    marginBottom: 8,
  },
  tutorialText: {
    fontSize: 13,
    color: C.cream,
    textAlign: "center" as const,
    lineHeight: 20,
    marginBottom: 10,
  },
  tutorialHint: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: C.orange,
    textAlign: "center" as const,
    marginTop: 4,
  },
  tutorialBtn: {
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 12,
  },
  tutorialBtnText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: C.bg,
  },
});
