import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../backend/trpc/app-router";

export type { AppRouter };
export const trpc = createTRPCReact<AppRouter>();

// ✅ Función que determina la URL correcta según la ruta
const getApiUrl = (path?: string): string => {
  const envUrl = process.env.EXPO_PUBLIC_COMANDAS_API_URL;
  const baseUrl = typeof envUrl === "string" && envUrl.trim().length > 0 
    ? envUrl.trim() 
    : "https://quieromesa.com";
  
  // Rutas del backend de comandas (separado) → usar /comandas-api/trpc
  if (path && (
    path.startsWith("comandas.listOrders") ||
    path.startsWith("comandas.createOrder") ||
    path.startsWith("comandas.updateOrder") ||
    path.startsWith("comandas.addItem") ||
    path.startsWith("comandas.removeItem") ||
    path.startsWith("comandas.updateItem") ||
    path.startsWith("comandas.getOrder") ||
    path.startsWith("comandas.closeOrder")
  )) {
    return `${baseUrl}/comandas-api/trpc`;
  }
  
  // Rutas del backend principal → usar /api/trpc
  return `${baseUrl}/api/trpc`;
};

// Cliente base para queries/mutations
export const createTrpcLink = (path?: string) => 
  httpBatchLink({
    url: getApiUrl(path),
    headers: () => ({ "Content-Type": "application/json" }),
  });

export const trpcClient = trpc.createClient({
  links: [createTrpcLink()],
});

export const vanillaClient = createTRPCClient<AppRouter>({
  links: [createTrpcLink()],
});
