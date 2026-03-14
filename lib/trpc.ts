import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { Platform } from 'react-native';
import type { AppRouter } from '../../backend/trpc/app-router';

export type { AppRouter };
export const trpc = createTRPCReact<AppRouter>();

// ✅ URL segura para nativo: SIN espacios, SIN acceso a window.location
const getApiUrl = (): string => {
  // Priority 1: Environment variable (con trim para seguridad)
  const envUrl = process.env.EXPO_PUBLIC_COMANDAS_API_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim();
  }
  
  // Priority 2: Fallback HARDCODED para producción (NATIVO)
  // Esto NUNCA usa window.location - seguro para Android/iOS
  return 'https://quieromesa.com';
};

const linkConfig = httpBatchLink({
  url: `${getApiUrl()}/api/trpc`,  // ✅ URL limpia sin espacios
  headers: () => ({ 'Content-Type': 'application/json' }),
});

export const trpcClient = trpc.createClient({ links: [linkConfig] });
export const vanillaClient = createTRPCClient<AppRouter>({ links: [linkConfig] });
