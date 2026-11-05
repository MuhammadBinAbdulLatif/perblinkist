import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/app';
import { createContext } from '@/server/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    responseMeta: ({ data }) => {
      // If mutation returned a cookie string (e.g. login/logout/setupAdmin), pass it to Set-Cookie header
      const cookies: string[] = [];
      for (const res of data) {
        if (res && typeof res === 'object' && 'cookie' in res && typeof res.cookie === 'string') {
          cookies.push(res.cookie);
        }
      }
      if (cookies.length > 0) {
        return {
          headers: {
            'Set-Cookie': cookies.join('; '),
          },
        };
      }
      return {};
    },
  });

export { handler as GET, handler as POST };
