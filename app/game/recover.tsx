import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { playSound } from "@/lib/gameSounds";
import { MEMORY_ITEMS, GAME_CONFIG, SPAIN_REGIONS } from "@/constants/gameData";
import AdBanner from "@/components/AdBanner";
import { useGame } from "@/lib/gameContext";


const { width } = Dimensions.get("window");

const C = {
  bg: "#0f0800",
  surface: "#1e1200",
  card: "#2a1a00",
  gold: "#c8a84b",
  goldLight: "#e8c870",
  green: "#2d6a1e",
  greenLight: "#4a9e30",
  red: "#c0392b",
  redLight: "#e74c3c",
  orange: "#e67e22",
  cream: "#f5e6c8",
  text: "#f0d8a0",
  textMuted: "#7a6030",
  border: "#3d2500",
  blue: "#1a3a5c",
  blueBorder: "#2a6a9c",
};

type RecoverPhase = "ad" | "wheel" | "trivia" | "memory" | "win" | "lose";

interface ProcessedQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

function shuffleTriviaOptions(q: { question: string; options: string[]; answer: number; explanation: string }): ProcessedQuestion {
  const correctText = q.options[q.answer];
  const shuffled = [...q.options].sort(() => Math.random() - 0.5);
  const newAnswerIdx = shuffled.indexOf(correctText);
  return {
    question: q.question,
    options: shuffled,
    answer: newAnswerIdx,
    explanation: q.explanation,
  };
}

function getWheelOptions(themeName: string): { label: string; emoji: string; type: "trivia" | "memory" }[] {
  return [
    { label: `Trivia ${themeName}`, emoji: "🧠", type: "trivia" },
    { label: "Memory Menú", emoji: "🃏", type: "memory" },
    { label: `Trivia ${themeName}`, emoji: "🧠", type: "trivia" },
    { label: "Memory Menú", emoji: "🃏", type: "memory" },
    { label: `Trivia ${themeName}`, emoji: "🧠", type: "trivia" },
    { label: "Memory Menú", emoji: "🃏", type: "memory" },
  ];
}

const MEMORY_PAIRS = 8;
const MEMORY_MAX_MOVES = 20;
const TRIVIA_TIME_LIMIT = 12000;

interface MemoryCard {
  id: string;
  itemId: string;
  emoji: string;
  name: string;
  imageUrl?: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function RecoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recoverOneLife, savedGameState, answeredTriviaIds, markTriviaQuestionsUsed, resetTriviaHistory, getActiveMemoryItems, getActiveTriviaQuestions, restaurantConfig } = useGame();
  const triviaThemeId = restaurantConfig?.triviaTheme || "galicia";
  const triviaThemeName = SPAIN_REGIONS.find(r => r.id === triviaThemeId)?.name || "Galicia";
  const WHEEL_OPTIONS = useMemo(() => getWheelOptions(triviaThemeName), [triviaThemeName]);
  const [phase, setPhase] = useState<RecoverPhase>("ad");
  const [adCountdown, setAdCountdown] = useState(5);
  const [adDone, setAdDone] = useState(false);
  const [wheelIdx, setWheelIdx] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [chosenGame, setChosenGame] = useState<"trivia" | "memory">("trivia");
  const [triviaIdx, setTriviaIdx] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaAnswered, setTriviaAnswered] = useState<number | null>(null);
  const [currentLives, setCurrentLives] = useState(savedGameState?.lives ?? 0);
  const [triviaTimerMs, setTriviaTimerMs] = useState(TRIVIA_TIME_LIMIT);
  const triviaTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTrivia = getActiveTriviaQuestions();

  const [triviaQuestions, setTriviaQuestions] = useState<ProcessedQuestion[]>(() => {
    return pickTriviaQuestions(answeredTriviaIds, activeTrivia).map(shuffleTriviaOptions);
  });
  const [triviaQuestionIndices, setTriviaQuestionIndices] = useState<number[]>([]);

  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [memoryMatches, setMemoryMatches] = useState(0);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryLocked, setMemoryLocked] = useState(false);

  const wheelAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const adProgressAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef<Record<string, Animated.Value>>({}).current;
  const triviaTimerAnim = useRef(new Animated.Value(1)).current;

  function pickTriviaQuestions(usedIds: number[], questions = activeTrivia): ProcessedQuestion[] {
    const available = questions.map((q, i) => ({ q, i })).filter(({ i }) => !usedIds.includes(i));
    let pool = available.length >= 5 ? available : questions.map((q, i) => ({ q, i }));
    if (available.length < 5 && available.length > 0) {
      pool = questions.map((q, i) => ({ q, i }));
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);
    return selected.map(s => shuffleTriviaOptions(s.q));
  }

  function pickTriviaQuestionIndices(usedIds: number[], questions = activeTrivia) {
    const available = questions.map((q, i) => ({ q, i })).filter(({ i }) => !usedIds.includes(i));
    let pool = available.length >= 5 ? available : questions.map((q, i) => ({ q, i }));
    if (available.length < 5 && available.length > 0) {
      pool = questions.map((q, i) => ({ q, i }));
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);
    return selected.map(s => s.i);
  }

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [phase]);

  useEffect(() => {
    if (phase !== "ad") return;
    Animated.timing(adProgressAnim, { toValue: 1, duration: 5000, useNativeDriver: false }).start();
    const interval = setInterval(() => {
      setAdCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setAdDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const startTriviaTimer = useCallback(() => {
    setTriviaTimerMs(TRIVIA_TIME_LIMIT);
    triviaTimerAnim.setValue(1);
    Animated.timing(triviaTimerAnim, {
      toValue: 0,
      duration: TRIVIA_TIME_LIMIT,
      useNativeDriver: false,
    }).start();
    if (triviaTimerRef.current) clearInterval(triviaTimerRef.current);
    triviaTimerRef.current = setInterval(() => {
      setTriviaTimerMs(prev => {
        const next = prev - 100;
        if (next <= 0) {
          if (triviaTimerRef.current) clearInterval(triviaTimerRef.current);
          return 0;
        }
        return next;
      });
    }, 100);
  }, [triviaTimerAnim]);

  const stopTriviaTimer = useCallback(() => {
    if (triviaTimerRef.current) {
      clearInterval(triviaTimerRef.current);
      triviaTimerRef.current = null;
    }
    triviaTimerAnim.stopAnimation();
  }, [triviaTimerAnim]);

  useEffect(() => {
    if (phase === "trivia" && triviaAnswered === null) {
      startTriviaTimer();
    }
    return () => stopTriviaTimer();
  }, [phase, triviaIdx]);

  useEffect(() => {
    if (phase === "trivia" && triviaTimerMs <= 0 && triviaAnswered === null) {
      console.log("[Recover] Time expired for trivia question", triviaIdx);
      handleTriviaTimeout();
    }
  }, [triviaTimerMs, phase, triviaAnswered]);

  const initMemory = useCallback(() => {
    const currentMemory = getActiveMemoryItems();
    const items = [...(currentMemory)].sort(() => Math.random() - 0.5).slice(0, MEMORY_PAIRS);
    const cards: MemoryCard[] = [];
    for (const item of items) {
      for (let i = 0; i < 2; i++) {
        const id = `${item.id}_${i}`;
        cards.push({ id, itemId: item.id, emoji: item.emoji, name: item.name, imageUrl: item.imageUrl, isFlipped: false, isMatched: false });
        cardAnims[id] = new Animated.Value(0);
      }
    }
    const shuffled = cards.sort(() => Math.random() - 0.5);
    setMemoryCards(shuffled);
    setSelectedCards([]);
    setMemoryMatches(0);
    setMemoryMoves(0);
    setMemoryLocked(false);
  }, [cardAnims]);

  const startWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    playSound("wheelSpin");
    const spins = 20 + Math.floor(Math.random() * 15);
    const targetIdx = Math.floor(Math.random() * WHEEL_OPTIONS.length);
    let current = 0;
    let speed = 50;

    const spin = () => {
      setWheelIdx(prev => (prev + 1) % WHEEL_OPTIONS.length);
      current++;
      if (current >= spins) {
        setWheelIdx(targetIdx);
        setIsSpinning(false);
        setChosenGame(WHEEL_OPTIONS[targetIdx].type);
        Animated.sequence([
          Animated.timing(wheelAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(wheelAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
        setTimeout(() => {
          fadeAnim.setValue(0);
          const gameType = WHEEL_OPTIONS[targetIdx].type;
          setPhase(gameType);
          if (gameType === "memory") {
            initMemory();
          } else {
            const currentTrivia = getActiveTriviaQuestions();
            const indices = pickTriviaQuestionIndices(answeredTriviaIds, currentTrivia);
            setTriviaQuestionIndices(indices);
            const qs = indices.map(i => shuffleTriviaOptions(currentTrivia[i]));
            setTriviaQuestions(qs);
            setTriviaIdx(0);
            setTriviaScore(0);
            setTriviaAnswered(null);
          }
        }, 1000);
        return;
      }
      if (current > spins * 0.6) speed = Math.min(speed + 30, 300);
      setTimeout(spin, speed);
    };
    spin();
  };

  const handleTriviaTimeout = () => {
    stopTriviaTimer();
    setTriviaAnswered(-1);
    playSound("fail", 0.8);
    const newScore = triviaScore;
    const isLastQuestion = triviaIdx >= triviaQuestions.length - 1;
    const remainingQuestions = triviaQuestions.length - 1 - triviaIdx;
    const failedAlready = remainingQuestions + newScore < 5;

    setTimeout(() => {
      if (!isLastQuestion && !failedAlready) {
        setTriviaIdx(prev => prev + 1);
        setTriviaAnswered(null);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      } else {
        fadeAnim.setValue(0);
        markTriviaQuestionsUsed(triviaQuestionIndices);
        setPhase("lose");
        Animated.timing(resultAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      }
    }, 1400);
  };

  const handleTriviaAnswer = (answerIdx: number) => {
    if (triviaAnswered !== null) return;
    stopTriviaTimer();
    setTriviaAnswered(answerIdx);
    const correct = answerIdx === triviaQuestions[triviaIdx].answer;
    const newScore = correct ? triviaScore + 1 : triviaScore;
    setTriviaScore(newScore);
    playSound(correct ? "success" : "fail", 0.9);

    const isLastQuestion = triviaIdx >= triviaQuestions.length - 1;
    const remainingQuestions = triviaQuestions.length - 1 - triviaIdx;
    const failedAlready = !correct && remainingQuestions + newScore < 5;

    setTimeout(() => {
      if (!isLastQuestion && !failedAlready) {
        setTriviaIdx(prev => prev + 1);
        setTriviaAnswered(null);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      } else {
        const passed = newScore >= 5;
        fadeAnim.setValue(0);
        markTriviaQuestionsUsed(triviaQuestionIndices);
        if (passed) {
          recoverOneLife();
          const newLives = Math.min(currentLives + 1, GAME_CONFIG.maxLives);
          setCurrentLives(newLives);
          console.log("[Recover] Trivia won! +1 life recovered, total:", newLives);
        }
        setPhase(passed ? "win" : "lose");
        Animated.timing(resultAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      }
    }, 1400);
  };

  const flipCard = (cardId: string) => {
    if (memoryLocked) return;
    const card = memoryCards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (selectedCards.length >= 2) return;
    playSound("cardFlip", 0.7);
    Animated.timing(cardAnims[cardId], { toValue: 1, duration: 300, useNativeDriver: true }).start();
    const newSelected = [...selectedCards, cardId];
    setMemoryCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true } : c));
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      const newMoves = memoryMoves + 1;
      setMemoryMoves(newMoves);
      setMemoryLocked(true);
      const [id1, id2] = newSelected;
      const c1 = memoryCards.find(c => c.id === id1);
      const c2 = memoryCards.find(c => c.id === id2);
      if (c1 && c2 && c1.itemId === c2.itemId) {
        const newMatches = memoryMatches + 1;
        setMemoryMatches(newMatches);
        setMemoryCards(prev => prev.map(c =>
          c.id === id1 || c.id === id2 ? { ...c, isMatched: true } : c
        ));
        setSelectedCards([]);
        setMemoryLocked(false);
        if (newMatches === MEMORY_PAIRS) {
          playSound("success");
          setTimeout(() => {
            fadeAnim.setValue(0);
            recoverOneLife();
            const newLives = Math.min(currentLives + 1, GAME_CONFIG.maxLives);
            setCurrentLives(newLives);
            console.log("[Recover] Memory won! +1 life recovered, total:", newLives);
            setPhase("win");
            Animated.timing(resultAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
          }, 600);
        }
      } else {
        playSound("fail", 0.5);
        setTimeout(() => {
          Animated.timing(cardAnims[id1], { toValue: 0, duration: 300, useNativeDriver: true }).start();
          Animated.timing(cardAnims[id2], { toValue: 0, duration: 300, useNativeDriver: true }).start();
          setMemoryCards(prev => prev.map(c =>
            c.id === id1 || c.id === id2 ? { ...c, isFlipped: false } : c
          ));
          setSelectedCards([]);
          setMemoryLocked(false);
          if (newMoves >= MEMORY_MAX_MOVES) {
            fadeAnim.setValue(0);
            playSound("fail");
            setPhase("lose");
            Animated.timing(resultAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
          }
        }, 900);
      }
    }
  };

  const handleRetry = () => {
    setAdCountdown(5);
    setAdDone(false);
    adProgressAnim.setValue(0);
    fadeAnim.setValue(0);
    setTriviaIdx(0);
    setTriviaScore(0);
    setTriviaAnswered(null);
    resultAnim.setValue(0);
    setPhase("ad");
  };

  const handleRecoverMore = () => {
    setAdCountdown(5);
    setAdDone(false);
    adProgressAnim.setValue(0);
    fadeAnim.setValue(0);
    resultAnim.setValue(0);
    setTriviaIdx(0);
    setTriviaScore(0);
    setTriviaAnswered(null);
    setPhase("ad");
  };

  const handleGoBack = () => {
    router.replace("/game");
  };

  const q = triviaQuestions[triviaIdx];
  const timerRatio = triviaTimerMs / TRIVIA_TIME_LIMIT;
  const timerColor = timerRatio > 0.5 ? C.greenLight : timerRatio > 0.25 ? C.orange : C.redLight;
  const timerSeconds = Math.ceil(triviaTimerMs / 1000);
  const canRecoverMore = currentLives < GAME_CONFIG.maxLives;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>❤️ Recuperar Vidas</Text>
          <View style={styles.livesDisplay}>
            {Array.from({ length: GAME_CONFIG.maxLives }).map((_, i) => (
              <Text key={i} style={styles.lifeHeart}>
                {i < currentLives ? "❤️" : "🖤"}
              </Text>
            ))}
          </View>
        </View>

        {phase === "ad" && (
          <Animated.View style={[styles.phaseContainer, { opacity: fadeAnim }]}>
            <Text style={styles.phaseTitle}>📺 Publicidad</Text>

            <View style={styles.adBox}>
              <AdBanner adSlot="7994614748" />
              <View style={styles.adBrandRow}>
                <Text style={styles.adRestaurantEmoji}>🍐</Text>
                <Text style={styles.adBrandText}>O Lar de Pereiras</Text>
              </View>
            </View>

            <View style={styles.adProgressBg}>
              <Animated.View
                style={[
                  styles.adProgressFill,
                  { width: adProgressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) as unknown as number },
                ]}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, !adDone && styles.primaryBtnDisabled]}
              onPress={() => { if (adDone) { fadeAnim.setValue(0); setPhase("wheel"); } }}
              disabled={!adDone}
              testID="skip-ad-button"
            >
              <Text style={styles.primaryBtnText}>
                {adDone ? "Continuar →" : `Espera ${adCountdown}s...`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {phase === "wheel" && (
          <Animated.View style={[styles.phaseContainer, { opacity: fadeAnim }]}>
            <Text style={styles.phaseTitle}>🎰 La Ruleta del Chef</Text>
            <Text style={styles.phaseSubtitle}>Gira para descubrir tu prueba</Text>

            <View style={styles.wheelContainer}>
              {WHEEL_OPTIONS.map((opt, i) => (
                <View
                  key={i}
                  style={[
                    styles.wheelSlot,
                    wheelIdx === i && styles.wheelSlotActive,
                  ]}
                >
                  <Text style={styles.wheelSlotEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.wheelSlotLabel, wheelIdx === i && styles.wheelSlotLabelActive]}>
                    {opt.label}
                  </Text>
                </View>
              ))}
            </View>

            {!isSpinning && wheelIdx >= 0 && (
              <View style={styles.wheelSelected}>
                <Text style={styles.wheelSelectedEmoji}>{WHEEL_OPTIONS[wheelIdx].emoji}</Text>
                <Text style={styles.wheelSelectedText}>{WHEEL_OPTIONS[wheelIdx].label}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, isSpinning && styles.primaryBtnDisabled]}
              onPress={startWheel}
              disabled={isSpinning}
              testID="spin-wheel-button"
            >
              <Text style={styles.primaryBtnText}>
                {isSpinning ? "Girando..." : "🎰 ¡GIRAR!"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {phase === "trivia" && q && (
          <Animated.View style={[styles.phaseContainer, { opacity: fadeAnim }]}>
            <Text style={styles.phaseTitle}>🧠 Trivia {triviaThemeName}</Text>
            <View style={styles.triviaProgress}>
              {triviaQuestions.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.triviaDot,
                    i < triviaIdx && (i < triviaScore ? styles.triviaDotDone : styles.triviaDotFailed),
                    i === triviaIdx && styles.triviaDotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.triviaScore}>✅ {triviaScore}/{triviaIdx} correctas — Necesitas 5/5</Text>

            <View style={styles.timerContainer}>
              <View style={styles.timerBarBg}>
                <Animated.View
                  style={[
                    styles.timerBarFill,
                    {
                      width: triviaTimerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }) as unknown as number,
                      backgroundColor: timerColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.timerText, { color: timerColor }]}>
                ⏱️ {timerSeconds}s
              </Text>
            </View>

            <View style={styles.triviaQuestion}>
              <Text style={styles.triviaQuestionText}>{q.question}</Text>
            </View>

            <View style={styles.triviaOptions}>
              {q.options.map((opt, i) => {
                let optStyle = styles.triviaOption;
                let textStyle = styles.triviaOptionText;
                if (triviaAnswered !== null) {
                  if (i === q.answer) {
                    optStyle = { ...styles.triviaOption, ...styles.triviaOptionCorrect };
                    textStyle = { ...styles.triviaOptionText, ...styles.triviaOptionTextCorrect };
                  } else if (i === triviaAnswered && i !== q.answer) {
                    optStyle = { ...styles.triviaOption, ...styles.triviaOptionWrong };
                    textStyle = { ...styles.triviaOptionText, ...styles.triviaOptionTextWrong };
                  }
                }
                return (
                  <TouchableOpacity
                    key={i}
                    style={optStyle}
                    onPress={() => handleTriviaAnswer(i)}
                    disabled={triviaAnswered !== null}
                    activeOpacity={0.7}
                    testID={`trivia-option-${i}`}
                  >
                    <Text style={styles.triviaOptionLetter}>
                      {["A", "B", "C", "D"][i]}
                    </Text>
                    <Text style={textStyle}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {triviaAnswered !== null && (
              <View style={[
                styles.explanationBox,
                triviaAnswered === -1
                  ? styles.explanationWrong
                  : triviaAnswered === q.answer ? styles.explanationCorrect : styles.explanationWrong,
              ]}>
                <Text style={styles.explanationText}>
                  {triviaAnswered === -1
                    ? "⏰ ¡Se acabó el tiempo! "
                    : triviaAnswered === q.answer ? "✅ " : "❌ "}
                  {q.explanation}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {phase === "memory" && (
          <Animated.View style={[styles.phaseContainer, { opacity: fadeAnim }]}>
            <Text style={styles.phaseTitle}>🃏 Memory del Menú</Text>
            <Text style={styles.phaseSubtitle}>Encuentra las {MEMORY_PAIRS} parejas en máximo {MEMORY_MAX_MOVES} movimientos</Text>
            <View style={styles.memoryStats}>
              <Text style={styles.memoryStat}>🔄 {memoryMoves}/{MEMORY_MAX_MOVES} movimientos</Text>
              <Text style={styles.memoryStat}>✅ {memoryMatches}/{MEMORY_PAIRS} parejas</Text>
            </View>
            <View style={styles.memoryGrid}>
              {memoryCards.map(card => {
                const anim = cardAnims[card.id] || new Animated.Value(card.isFlipped ? 1 : 0);
                const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.memoryCard,
                      card.isMatched && styles.memoryCardMatched,
                    ]}
                    onPress={() => flipCard(card.id)}
                    disabled={card.isFlipped || card.isMatched || memoryLocked}
                    activeOpacity={0.8}
                    testID={`memory-card-${card.id}`}
                  >
                    <Animated.View style={[styles.memoryCardInner, { transform: [{ rotateY: rotate }] }]}>
                      {card.isFlipped || card.isMatched ? (
                        <View style={styles.memoryCardFront}>
                          {card.imageUrl ? (
                            <Image source={{ uri: card.imageUrl }} style={styles.memoryCardImage} />
                          ) : (
                            <Text style={styles.memoryCardEmoji}>{card.emoji}</Text>
                          )}
                          <Text style={styles.memoryCardName} numberOfLines={1}>{card.name}</Text>
                        </View>
                      ) : (
                        <View style={styles.memoryCardBack}>
                          <Text style={styles.memoryCardBackEmoji}>🍐</Text>
                        </View>
                      )}
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {phase === "win" && (
          <Animated.View style={[styles.phaseContainer, { opacity: resultAnim }]}>
            <Text style={styles.resultEmoji}>🎉</Text>
            <Text style={styles.resultTitle}>¡Lo conseguiste!</Text>
            <Text style={styles.resultSubtitle}>
              Has superado la prueba y ganas una vida extra.
            </Text>
            <View style={styles.lifeGained}>
              <Text style={styles.lifeGainedEmoji}>❤️</Text>
              <Text style={styles.lifeGainedText}>+1 Vida recuperada</Text>
            </View>
            <View style={styles.currentLivesBox}>
              <Text style={styles.currentLivesLabel}>Vidas actuales:</Text>
              <View style={styles.currentLivesRow}>
                {Array.from({ length: GAME_CONFIG.maxLives }).map((_, i) => (
                  <Text key={i} style={styles.currentLifeHeart}>
                    {i < currentLives ? "❤️" : "🖤"}
                  </Text>
                ))}
              </View>
              <Text style={styles.currentLivesCount}>{currentLives}/{GAME_CONFIG.maxLives}</Text>
            </View>
            {canRecoverMore && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: C.orange, marginBottom: 10 }]}
                onPress={handleRecoverMore}
                testID="recover-more-button"
              >
                <Text style={styles.primaryBtnText}>📺 Recuperar otra vida</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: C.green }]}
              onPress={handleGoBack}
              testID="continue-game-button"
            >
              <Text style={styles.primaryBtnText}>¡Seguir jugando!</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {phase === "lose" && (
          <Animated.View style={[styles.phaseContainer, { opacity: resultAnim }]}>
            <Text style={styles.resultEmoji}>😔</Text>
            <Text style={styles.resultTitle}>No fue esta vez...</Text>
            <Text style={styles.resultSubtitle}>
              No superaste la prueba. Pero puedes intentarlo de nuevo.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: C.orange }]}
              onPress={handleRetry}
              testID="retry-button"
            >
              <Text style={styles.primaryBtnText}>📺 Intentar de nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn]}
              onPress={handleGoBack}
              testID="give-up-button"
            >
              <Text style={styles.secondaryBtnText}>🏠 Volver al menú</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const CARD_SIZE = (width - 48 - 24) / 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.card, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border,
  },
  backBtnText: { fontSize: 14, color: C.textMuted, fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.gold, flex: 1 },
  livesDisplay: { flexDirection: "row", gap: 2 },
  lifeHeart: { fontSize: 14 },
  phaseContainer: {
    paddingTop: 10,
    alignItems: "center",
  },
  phaseTitle: {
    fontSize: 24, fontWeight: "800", color: C.gold,
    marginBottom: 6, textAlign: "center",
  },
  phaseSubtitle: {
    fontSize: 13, color: C.textMuted,
    marginBottom: 20, textAlign: "center",
  },
  adBox: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  adPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: C.surface,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  adPlaceholderText: {
    fontSize: 18,
    color: C.textMuted,
  },
  adBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  adRestaurantEmoji: { fontSize: 18 },
  adBrandText: {
    fontSize: 12, fontWeight: "600", color: C.textMuted,
  },
  adProgressBg: {
    height: 6, width: "100%", backgroundColor: C.card,
    borderRadius: 3, marginBottom: 16, overflow: "hidden",
  },
  adProgressFill: { height: "100%", backgroundColor: C.orange, borderRadius: 3 },
  primaryBtn: {
    backgroundColor: C.gold,
    borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 40, alignItems: "center",
    width: "100%",
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnDisabled: { backgroundColor: C.textMuted, shadowOpacity: 0 },
  primaryBtnText: { fontSize: 17, fontWeight: "800", color: C.bg },
  secondaryBtn: {
    backgroundColor: C.surface,
    borderRadius: 14, paddingVertical: 13,
    paddingHorizontal: 40, alignItems: "center",
    width: "100%",
    borderWidth: 1, borderColor: C.border,
    marginTop: 10,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600", color: C.textMuted },
  wheelContainer: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 16,
  },
  wheelSlot: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  wheelSlotActive: { backgroundColor: C.gold + "22" },
  wheelSlotEmoji: { fontSize: 24, width: 32, textAlign: "center" },
  wheelSlotLabel: { fontSize: 14, color: C.textMuted, fontWeight: "500" },
  wheelSlotLabelActive: { color: C.goldLight, fontWeight: "700" },
  wheelSelected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  wheelSelectedEmoji: { fontSize: 28 },
  wheelSelectedText: { fontSize: 16, fontWeight: "700", color: C.gold },
  triviaProgress: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  triviaDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.border,
  },
  triviaDotActive: { backgroundColor: C.gold },
  triviaDotDone: { backgroundColor: C.green },
  triviaDotFailed: { backgroundColor: C.red },
  triviaScore: { fontSize: 13, color: C.textMuted, marginBottom: 10 },
  timerContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  timerBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: C.card,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  timerBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  timerText: {
    fontSize: 14,
    fontWeight: "800",
    width: 52,
    textAlign: "right",
  },
  triviaQuestion: {
    backgroundColor: C.card,
    borderRadius: 16, padding: 20,
    width: "100%",
    marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
  },
  triviaQuestionText: {
    fontSize: 17, fontWeight: "600",
    color: C.cream, lineHeight: 24, textAlign: "center",
  },
  triviaOptions: { width: "100%", gap: 8, marginBottom: 12 },
  triviaOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  triviaOptionCorrect: {
    backgroundColor: "#0a2a08",
    borderColor: C.greenLight,
  },
  triviaOptionWrong: {
    backgroundColor: "#2a0808",
    borderColor: C.redLight,
  },
  triviaOptionLetter: {
    fontSize: 14, fontWeight: "800",
    color: C.gold, width: 22,
    textAlign: "center",
  },
  triviaOptionText: { fontSize: 14, color: C.text, flex: 1 },
  triviaOptionTextCorrect: { color: C.greenLight },
  triviaOptionTextWrong: { color: C.redLight },
  explanationBox: {
    width: "100%",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  explanationCorrect: {
    backgroundColor: "#0a1a08",
    borderColor: C.greenLight,
  },
  explanationWrong: {
    backgroundColor: "#1a0808",
    borderColor: C.redLight,
  },
  explanationText: {
    fontSize: 13, color: C.text, lineHeight: 18,
  },
  memoryStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
  },
  memoryStat: { fontSize: 13, color: C.gold, fontWeight: "600" },
  memoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 20,
  },
  memoryCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 12,
    overflow: "hidden",
  },
  memoryCardMatched: { opacity: 0.6 },
  memoryCardInner: { width: "100%", height: "100%" },
  memoryCardFront: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.gold,
  },
  memoryCardEmoji: { fontSize: 22 },
  memoryCardImage: {
    width: CARD_SIZE - 16,
    height: CARD_SIZE - 28,
    borderRadius: 6,
    resizeMode: "cover" as const,
  },
  memoryCardName: { fontSize: 7, color: C.textMuted, marginTop: 2, textAlign: "center", paddingHorizontal: 2 },
  memoryCardBack: {
    flex: 1,
    backgroundColor: C.green,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.greenLight,
  },
  memoryCardBackEmoji: { fontSize: 22 },
  resultEmoji: { fontSize: 72, marginTop: 20, marginBottom: 12, textAlign: "center" },
  resultTitle: {
    fontSize: 28, fontWeight: "800",
    color: C.gold, textAlign: "center", marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 15, color: C.text, textAlign: "center",
    lineHeight: 22, marginBottom: 24,
  },
  lifeGained: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1a0a08",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.red,
    width: "100%",
    justifyContent: "center",
  },
  lifeGainedEmoji: { fontSize: 32 },
  lifeGainedText: { fontSize: 18, fontWeight: "700", color: "#ff6b6b" },
  currentLivesBox: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
    width: "100%",
    alignItems: "center",
  },
  currentLivesLabel: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "600",
    marginBottom: 8,
  },
  currentLivesRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  currentLifeHeart: {
    fontSize: 24,
  },
  currentLivesCount: {
    fontSize: 14,
    color: C.gold,
    fontWeight: "700",
  },
});
