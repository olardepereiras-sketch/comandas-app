import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';

export type { AppRouter } from '../../comandas-backend/src/router';

import type { AppRouter } from '../../comandas-backend/src/router';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const envUrl = (process.env as any).EXPO_PUBLIC_COMANDAS_API_URL;
    if (envUrl) return envUrl;
    return window.location.origin;
  }
  return (process.env as any).EXPO_PUBLIC_COMANDAS_API_URL ?? 'http://localhost:3001';
};

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/comandas-api/trpc`,
      headers: () => ({ 'Content-Type': 'application/json' }),
    }),
  ],
});
