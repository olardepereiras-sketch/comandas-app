import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './router';
import { createContext } from './context';

const app = new Hono();

app.use('*', cors());

app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    endpoint: '/api/trpc',
    createContext: async (opts, c) => {
      console.log(`📨 [COMANDAS tRPC] ${c.req.method} ${c.req.path}`);
      return createContext({ req: c.req.raw, resHeaders: new Headers() });
    },
  })
);

app.use(
  '/comandas-api/trpc/*',
  trpcServer({
    router: appRouter,
    endpoint: '/comandas-api/trpc',
    createContext: async (opts, c) => {
      console.log(`📨 [COMANDAS tRPC via proxy] ${c.req.method} ${c.req.path}`);
      return createContext({ req: c.req.raw, resHeaders: new Headers() });
    },
  })
);

app.get('/', (c) => c.json({ status: 'ok', service: 'comandas-backend' }));

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'comandas-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: { connected: !!process.env.DATABASE_URL },
  })
);

const port = Number(process.env.PORT) || 3001;

serve(
  {
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  },
  (info) => {
    console.log(`🚀 [COMANDAS] Servidor escuchando en http://0.0.0.0:${info.port}`);
  }
);
