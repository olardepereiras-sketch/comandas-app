import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink, httpLink, splitLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

import { Platform } from 'react-native';

const PRODUCTION_URL = 'https://quieromesa.com';

const getBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location && typeof window.location.origin === 'string' && window.location.origin.length > 0) {
    const origin = window.location.origin;
    if (origin.includes('quieromesa.com')) return origin;
    return PRODUCTION_URL;
  }
  return PRODUCTION_URL;
};

const BASE_URL = `${getBaseUrl()}/api/trpc`;

const commonHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

const createLinks = () => {
  if (Platform.OS !== 'web') {
    return [
      httpLink({
        url: BASE_URL,
        headers: commonHeaders,
      }),
    ];
  }
  return [
    splitLink({
      condition: (op) => op.type === 'subscription',
      true: httpLink({ url: BASE_URL, headers: commonHeaders }),
      false: httpBatchLink({ url: BASE_URL, headers: commonHeaders }),
    }),
  ];
};

export const trpcClient = trpc.createClient({
  links: createLinks(),
});

export const vanillaClient = createTRPCClient<AppRouter>({
  links: createLinks(),
});

type WakeUpResult = {
  success: boolean;
  throttled?: boolean;
  cooldownRemainingMs?: number;
  alreadyReady?: boolean;
  initializing?: boolean;
  reason?: string;
  error?: string;
};

const clientWakeUpTimestamps = new Map<string, number>();
const clientWakeUpRequests = new Map<string, Promise<WakeUpResult>>();
const CLIENT_WAKE_UP_COOLDOWN_MS = 600000;

const LS_KEY_PREFIX = 'wakeup_ts_';

function getLastWakeUpTs(restaurantId: string): number {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      const val = localStorage.getItem(LS_KEY_PREFIX + restaurantId);
      if (val) return parseInt(val, 10) || 0;
    } catch { /* ignore */ }
  }
  return clientWakeUpTimestamps.get(restaurantId) ?? 0;
}

function setLastWakeUpTs(restaurantId: string, ts: number): void {
  clientWakeUpTimestamps.set(restaurantId, ts);
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LS_KEY_PREFIX + restaurantId, String(ts));
    } catch { /* ignore */ }
  }
}

let wakeUpScheduled = false;
const pendingWakeUpIds = new Set<string>();

function flushWakeUpBatch(): void {
  wakeUpScheduled = false;
  const ids = Array.from(pendingWakeUpIds);
  pendingWakeUpIds.clear();

  for (const rid of ids) {
    if (clientWakeUpRequests.has(rid)) continue;

    const request: Promise<WakeUpResult> = vanillaClient.whatsapp.wakeUp
      .mutate({ restaurantId: rid })
      .then((result: WakeUpResult) => result)
      .catch((error: unknown) => {
        console.error(`[WhatsApp WakeUp Client] ❌ Error en wakeUp para ${rid}:`, error);
        return { success: false, error: String(error) } as WakeUpResult;
      })
      .finally(() => {
        clientWakeUpRequests.delete(rid);
      });

    clientWakeUpRequests.set(rid, request);
  }
}

export async function ensureWhatsAppWakeUp(restaurantId: string): Promise<WakeUpResult> {
  const normalizedRestaurantId = restaurantId.trim();

  if (!normalizedRestaurantId) {
    return { success: false, reason: 'missing_restaurant_id' };
  }

  const now = Date.now();
  const lastWakeUpAt = getLastWakeUpTs(normalizedRestaurantId);
  const elapsedMs = now - lastWakeUpAt;

  if (elapsedMs < CLIENT_WAKE_UP_COOLDOWN_MS) {
    return {
      success: true,
      throttled: true,
      cooldownRemainingMs: CLIENT_WAKE_UP_COOLDOWN_MS - elapsedMs,
    };
  }

  const existingRequest = clientWakeUpRequests.get(normalizedRestaurantId);
  if (existingRequest) {
    return existingRequest;
  }

  setLastWakeUpTs(normalizedRestaurantId, now);
  console.log(`[WhatsApp WakeUp Client] 🔔 Lanzando wakeUp para: ${normalizedRestaurantId}`);

  pendingWakeUpIds.add(normalizedRestaurantId);

  if (!wakeUpScheduled) {
    wakeUpScheduled = true;
    setTimeout(flushWakeUpBatch, 50);
  }

  await new Promise(resolve => setTimeout(resolve, 60));

  const req = clientWakeUpRequests.get(normalizedRestaurantId);
  if (req) return req;

  return { success: true, throttled: true };
}
