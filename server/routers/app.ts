import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import { runMediaScan, getScanStatus } from '@/lib/scanner';
import { authRouter } from './auth';

export const appRouter = router({
  // Sub-routers
  auth: authRouter,

  // Scan procedures (protected: only logged-in users/admins can trigger scans)
  getScanStatus: publicProcedure.query(async () => {
    return getScanStatus();
  }),

  triggerScan: protectedProcedure.mutation(async () => {
    const current = getScanStatus();
    if (current.status === 'scanning') {
      return { success: false, message: 'Scan already in progress', status: current };
    }
    // Fire background scan
    runMediaScan().catch((err) => console.error('Scan error:', err));
    return { success: true, message: 'Scan triggered', status: getScanStatus() };
  }),

  // Books procedures
  getBooks: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor, category } = input;
      const items = await prisma.bookSummary.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          category: category ? category : undefined,
          isMissing: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  getRandomBooks: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(6) }))
    .query(async ({ input }) => {
      const count = await prisma.bookSummary.count({ where: { isMissing: false } });
      if (count === 0) return [];

      const sampleSize = Math.min(input.limit, count);
      const skip = Math.max(0, Math.floor(Math.random() * Math.max(1, count - sampleSize)));

      const books = await prisma.bookSummary.findMany({
        where: { isMissing: false },
        take: sampleSize,
        skip,
      });

      return books.sort(() => 0.5 - Math.random());
    }),

  getRecentBooks: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }))
    .query(async ({ input }) => {
      return prisma.bookSummary.findMany({
        take: input.limit,
        where: {
          lastPlayedAt: { not: null },
          isMissing: false,
        },
        orderBy: { lastPlayedAt: 'desc' },
      });
    }),

  searchBooks: publicProcedure
    .input(z.object({ query: z.string().min(1), limit: z.number().default(15) }))
    .query(async ({ input }) => {
      const { query, limit } = input;
      return prisma.bookSummary.findMany({
        take: limit,
        where: {
          isMissing: false,
          OR: [
            { title: { contains: query } },
            { author: { contains: query } },
            { category: { contains: query } },
            { synopsis: { contains: query } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
    }),

  getBookById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.bookSummary.findUnique({
        where: { id: input.id },
      });
    }),

  updateProgress: publicProcedure
    .input(
      z.object({
        id: z.string(),
        playbackPosition: z.number().optional(),
        isCompleted: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, playbackPosition, isCompleted } = input;
      return prisma.bookSummary.update({
        where: { id },
        data: {
          playbackPosition,
          isCompleted,
          lastPlayedAt: new Date(),
        },
      });
    }),
});

export type AppRouter = typeof appRouter;
