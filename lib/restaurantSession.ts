import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SS_PREFIX = 'support_';

function getSessionStorage(): Storage | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  return null;
}

export function isSupportSession(): boolean {
  const ss = getSessionStorage();
  if (!ss) return false;
  return !!ss.getItem(`${SS_PREFIX}restaurantId`);
}

export function setSupportSessionData(data: {
  restaurantId: string;
  restaurantSession: string;
  restaurantSlug: string;
  restaurantName: string;
}): void {
  const ss = getSessionStorage();
  if (!ss) return;
  ss.setItem(`${SS_PREFIX}restaurantId`, data.restaurantId);
  ss.setItem(`${SS_PREFIX}restaurantSession`, data.restaurantSession);
  ss.setItem(`${SS_PREFIX}restaurantSlug`, data.restaurantSlug);
  ss.setItem(`${SS_PREFIX}restaurantName`, data.restaurantName);
  console.log('[restaurantSession] Support session stored in sessionStorage for tab isolation');
}

export function clearSupportSession(): void {
  const ss = getSessionStorage();
  if (!ss) return;
  ss.removeItem(`${SS_PREFIX}restaurantId`);
  ss.removeItem(`${SS_PREFIX}restaurantSession`);
  ss.removeItem(`${SS_PREFIX}restaurantSlug`);
  ss.removeItem(`${SS_PREFIX}restaurantName`);
}

export async function getRestaurantId(): Promise<string | null> {
  const ss = getSessionStorage();
  if (ss) {
    const supportId = ss.getItem(`${SS_PREFIX}restaurantId`);
    if (supportId) {
      console.log('[restaurantSession] Using support session restaurantId:', supportId);
      return supportId;
    }
  }
  return AsyncStorage.getItem('restaurantId');
}

export async function getRestaurantSlug(): Promise<string | null> {
  const ss = getSessionStorage();
  if (ss) {
    const supportSlug = ss.getItem(`${SS_PREFIX}restaurantSlug`);
    if (supportSlug) return supportSlug;
  }
  return AsyncStorage.getItem('restaurantSlug');
}

export async function getRestaurantSession(): Promise<string | null> {
  const ss = getSessionStorage();
  if (ss) {
    const supportSession = ss.getItem(`${SS_PREFIX}restaurantSession`);
    if (supportSession) return supportSession;
  }
  return AsyncStorage.getItem('restaurantSession');
}

export async function getRestaurantName(): Promise<string | null> {
  const ss = getSessionStorage();
  if (ss) {
    const supportName = ss.getItem(`${SS_PREFIX}restaurantName`);
    if (supportName) return supportName;
  }
  return AsyncStorage.getItem('restaurantName');
}

export async function getFullSessionData(): Promise<{
  restaurantId: string | null;
  restaurantSlug: string | null;
  restaurantSession: string | null;
  restaurantName: string | null;
}> {
  const ss = getSessionStorage();
  if (ss && ss.getItem(`${SS_PREFIX}restaurantId`)) {
    return {
      restaurantId: ss.getItem(`${SS_PREFIX}restaurantId`),
      restaurantSlug: ss.getItem(`${SS_PREFIX}restaurantSlug`),
      restaurantSession: ss.getItem(`${SS_PREFIX}restaurantSession`),
      restaurantName: ss.getItem(`${SS_PREFIX}restaurantName`),
    };
  }
  const [restaurantId, restaurantSlug, restaurantSession, restaurantName] = await Promise.all([
    AsyncStorage.getItem('restaurantId'),
    AsyncStorage.getItem('restaurantSlug'),
    AsyncStorage.getItem('restaurantSession'),
    AsyncStorage.getItem('restaurantName'),
  ]);
  return { restaurantId, restaurantSlug, restaurantSession, restaurantName };
}
