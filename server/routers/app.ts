import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import {
  getDetailedScanStats,
  fastIndexMediaDirectory,
  processBatchEnrichment,
  runFullOrchestratedIngestion,
} from '@/lib/scanner';
import { authRouter } from './auth';

export const appRouter = router({
  // Sub-routers
  auth: authRouter,

  // Enhanced Scan & Resilient Batching procedures
  getScanStatus: publicProcedure.query(async () => {
    return getDetailedScanStats();
  }),

  // Stage 1: Fast local disk indexing (zero API calls)
  triggerFastIndex: protectedProcedure.mutation(async () => {
    return fastIndexMediaDirectory();
  }),

  // Stage 2: Process a single batch of 10 items
  processNextBatch: protectedProcedure
    .input(z.object({ batchSize: z.number().min(1).max(50).default(10) }).optional())
    .mutation(async ({ input }) => {
      return processBatchEnrichment(input?.batchSize || 10);
    }),

  // Continuous Orchestrated Ingestion (Fast index + auto-batching in 10s with backoff)
  triggerScan: protectedProcedure.mutation(async () => {
    // Run orchestrated pipeline in background
    runFullOrchestratedIngestion().catch((err) => console.error('[Scan] Error running orchestrated pipeline:', err));
    return { success: true, message: 'Batch ingestion pipeline initiated', status: await getDetailedScanStats() };
  }),

  // Detailed Ingestion Diagnostics for Thousands of Files
  getIngestionDiagnostics: protectedProcedure.query(async () => {
    const [totalFiles, enriched, pending, rateLimited, failed] = await Promise.all([
      prisma.bookSummary.count({ where: { isMissing: false } }),
      prisma.bookSummary.findMany({
        where: { isMissing: false, enrichmentStatus: 'enriched' },
        select: { id: true, title: true, author: true, enrichedAt: true, matchedSource: true },
        take: 10,
        orderBy: { enrichedAt: 'desc' },
      }),
      prisma.bookSummary.findMany({
        where: { isMissing: false, enrichmentStatus: 'pending' },
        select: { id: true, fileName: true, title: true, createdAt: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bookSummary.findMany({
        where: { isMissing: false, enrichmentStatus: 'rate_limited' },
        select: { id: true, fileName: true, title: true, enrichmentError: true, retryCount: true },
        take: 10,
      }),
      prisma.bookSummary.findMany({
        where: { isMissing: false, enrichmentStatus: 'failed' },
        select: { id: true, fileName: true, title: true, enrichmentError: true, retryCount: true },
        take: 10,
      }),
    ]);

    const stats = await getDetailedScanStats();

    return {
      stats,
      samples: {
        enriched,
        pending,
        rateLimited,
        failed,
      },
      summary: {
        totalFiles,
        enrichedCount: stats.totalEnriched,
        pendingCount: stats.totalPending,
        rateLimitedCount: stats.totalRateLimited,
        failedCount: stats.totalFailed,
      },
    };
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
