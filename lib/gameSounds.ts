import { Platform } from "react-native";

export type SoundName =
  | "gameStart"
  | "cashRegister"
  | "alarm"
  | "success"
  | "fail"
  | "cardFlip"
  | "wheelSpin";

const SOUND_URLS: Record<SoundName, string> = {
  gameStart: "https://assets.mixkit.co/sfx/preview/mixkit-retro-game-notification-212.wav",
  cashRegister: "https://assets.mixkit.co/sfx/preview/mixkit-coin-win-notification-1990.wav",
  alarm: "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.wav",
  success: "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.wav",
  fail: "https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.wav",
  cardFlip: "https://assets.mixkit.co/sfx/preview/mixkit-quick-jump-arcade-game-239.wav",
  wheelSpin: "https://assets.mixkit.co/sfx/preview/mixkit-casino-bling-achievement-2067.wav",
};

let audioContext: AudioContext | null = null;
const audioBufferCache = new Map<SoundName, AudioBuffer>();

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  try {
    if (!audioContext) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      if (!AC) return null;
      audioContext = new AC();
    }
    return audioContext;
  } catch (e) {
    console.log("[Sound] AudioContext not available:", e);
    return null;
  }
}

export async function initAudio(): Promise<void> {
  if (Platform.OS !== "web") return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      await ctx.resume();
    }
    console.log("[Sound] Audio initialized");
  } catch (e) {
    console.log("[Sound] initAudio error:", e);
  }
}

async function loadBuffer(name: SoundName): Promise<AudioBuffer | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;

  const cached = audioBufferCache.get(name);
  if (cached) return cached;

  try {
    const response = await fetch(SOUND_URLS[name]);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    audioBufferCache.set(name, audioBuffer);
    return audioBuffer;
  } catch (e) {
    console.log("[Sound] loadBuffer error:", name, e);
    return null;
  }
}

export async function playSound(name: SoundName, volume: number = 1.0): Promise<void> {
  if (Platform.OS !== "web") {
    console.log("[Sound] Native sound skipped (web-only implementation):", name);
    return;
  }
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const buffer = await loadBuffer(name);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);

    console.log("[Sound] Playing:", name);
  } catch (e) {
    console.log("[Sound] playSound error:", name, e);
  }
}

export async function unloadAllSounds(): Promise<void> {
  audioBufferCache.clear();
  console.log("[Sound] All sounds unloaded");
}
