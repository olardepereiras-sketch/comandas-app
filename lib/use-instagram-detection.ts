import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useInstagramDetection() {
  const [isInstagram, setIsInstagram] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const detected = /instagram/i.test(userAgent) || /FBAN|FBAV/i.test(userAgent);
      setIsInstagram(detected);
      
      if (detected) {
        console.log('🔍 Instagram/Facebook browser detected - User Agent:', userAgent);
      }
    }
  }, []);

  return isInstagram;
}

export function isFacebookBrowser(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    return /FBAN|FBAV|FB_IAB|FB4A/i.test(userAgent);
  }
  return false;
}

export function isInstagramBrowser(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    return /instagram/i.test(userAgent);
  }
  return false;
}

export function getSocialBrowserName(): string | null {
  if (isInstagramBrowser()) return 'Instagram';
  if (isFacebookBrowser()) return 'Facebook';
  return null;
}

export function getImageUrlForInstagram(url: string, isInstagram: boolean): string {
  if (!isInstagram || !url) return url;
  
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('t', Date.now().toString());
    return urlObj.toString();
  } catch {
    return url;
  }
}
