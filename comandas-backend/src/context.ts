import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { initTRPC, TRPCError } from '@trpc/server';
import { query, getPool } from './db';

export const createContext = async (opts: Partial<FetchCreateContextFnOptions>) => {
  return {
    req: opts.req!,
    db: { query },
    pool: getPool(),
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export { TRPCError };
