import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import uploadImageApp from "./hono/routes/upload-image";
import printAgentApp from "./hono/routes/print-agent";
import whatsappWebhookApp from "./hono/routes/whatsapp-webhook";

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// tRPC handler using @hono/trpc-server
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    endpoint: "/api/trpc",
    createContext: async (opts, c) => {
      console.log(`📨 tRPC Request: ${c.req.method} ${c.req.path}`);
      return createContext({
        req: c.req.raw,
        resHeaders: new Headers(),
      });
    },
  })
);

// Mount upload image routes
app.route("/", uploadImageApp);

// Mount print agent routes
app.route("/print-agent", printAgentApp);

// Mount WhatsApp chatbot webhook
app.route("/webhooks/whatsapp", whatsappWebhookApp);

// Health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    database: {
      type: "PostgreSQL",
      connected: !!process.env.DATABASE_URL,
      url: process.env.DATABASE_URL ? "configured" : "missing",
    },
    api: {
      baseUrl: process.env.EXPO_PUBLIC_RORK_API_BASE_URL || "not configured",
    },
  });
});

export default app;
