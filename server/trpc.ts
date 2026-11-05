import { initTRPC, TRPCError } from '@trpc/server';
import { getAuthTokenFromHeader, verifyAuthToken, AuthUserPayload } from '@/lib/auth';

export interface Context {
  user: AuthUserPayload | null;
  req: Request;
}

export function createContext(opts: { req: Request }): Context {
  const cookieHeader = opts.req.headers.get('cookie');
  const token = getAuthTokenFromHeader(cookieHeader);
  const user = token ? verifyAuthToken(token) : null;

  return {
    user,
    req: opts.req,
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this operation',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
