import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import {
  getDetailedScanStats,
  fastIndexMediaDirectory,
  processBatchEnrichment,
  runFullOrchestratedIngestion,
} from '@/lib/scanner';
import { rateLimiter, providerLimiter } from '@/lib/metadata';
import { getBookRecommendations } from '@/lib/recommendations';
import { getTrendingLocalBooks } from '@/lib/trending';
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

  // Stage 2: Process a single concurrent enrichment batch
  processNextBatch: protectedProcedure
    .input(z.object({ batchSize: z.number().min(1).max(50).optional() }).optional())
    .mutation(async ({ input }) => {
      return processBatchEnrichment(input?.batchSize);
    }),

  // Continuous Orchestrated Ingestion (fast index + concurrent enrichment with backoff)
  triggerScan: protectedProcedure.mutation(async () => {
    // Run orchestrated pipeline in background
    runFullOrchestratedIngestion().catch((err) => console.error('[Scan] Error running orchestrated pipeline:', err));
    return { success: true, message: 'Batch ingestion pipeline initiated', status: await getDetailedScanStats() };
  }),

  // Reset rate limit cooldown for all providers (admin action)
  resetRateLimit: protectedProcedure.mutation(async () => {
    // Clear in-memory per-provider limits
    rateLimiter.resetCooldown();
    providerLimiter.resetProvider('google_books');
    providerLimiter.resetProvider('open_library');
    // Reset any rate_limited books back to pending so they get retried
    const { count } = await prisma.bookSummary.updateMany({
      where: { enrichmentStatus: 'rate_limited' },
      data: { enrichmentStatus: 'pending', enrichmentError: null },
    });
    return { success: true, resetBooks: count };
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

  // Curation & Dashboard Shelves procedures
  getContinueListening: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }).optional())
    .query(async ({ input }) => {
      return prisma.bookSummary.findMany({
        take: input?.limit || 10,
        where: {
          isMissing: false,
          playbackPosition: { gt: 0 },
          isCompleted: false,
        },
        orderBy: { lastPlayedAt: 'desc' },
      });
    }),

  getTrendingShelf: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }).optional())
    .query(async ({ input }) => {
      return getTrendingLocalBooks(input?.limit || 10);
    }),

  getRandomShelf: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }).optional())
    .query(async ({ input }) => {
      const count = await prisma.bookSummary.count({ where: { isMissing: false } });
      if (count === 0) return [];
      const sampleSize = Math.min(input?.limit || 10, count);
      const skip = Math.max(0, Math.floor(Math.random() * Math.max(1, count - sampleSize)));
      const books = await prisma.bookSummary.findMany({
        where: { isMissing: false },
        take: sampleSize,
        skip,
      });
      return books.sort(() => 0.5 - Math.random());
    }),

  getQuickReadsShelf: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }).optional())
    .query(async ({ input }) => {
      return prisma.bookSummary.findMany({
        where: {
          isMissing: false,
          durationSeconds: { gt: 60, lte: 1200 }, // Under 20 mins
        },
        take: input?.limit || 10,
        orderBy: { durationSeconds: 'asc' },
      });
    }),

  getCategoriesWithCounts: publicProcedure.query(async () => {
    const rawCategories = await prisma.bookSummary.groupBy({
      by: ['category'],
      where: { isMissing: false },
      _count: { id: true },
    });

    const categoryMap = new Map<string, number>();

    for (const item of rawCategories) {
      const raw = item.category?.trim();
      if (!raw || raw.toLowerCase() === 'general') {
        const current = categoryMap.get('General') || 0;
        categoryMap.set('General', current + item._count.id);
      } else {
        const cleanName = raw.split(/[,/]/)[0].trim();
        const current = categoryMap.get(cleanName) || 0;
        categoryMap.set(cleanName, current + item._count.id);
      }
    }

    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }),

  getPaginatedBooks: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(30),
        category: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(['recent', 'title', 'duration_asc', 'duration_desc']).default('recent'),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, category, search, sortBy } = input;
      const skip = (page - 1) * pageSize;

      const whereClause: any = { isMissing: false };
      if (category && category !== 'All') {
        whereClause.category = { contains: category };
      }
      if (search && search.trim().length > 0) {
        whereClause.OR = [
          { title: { contains: search } },
          { author: { contains: search } },
          { synopsis: { contains: search } },
        ];
      }

      let orderBy: any = { createdAt: 'desc' };
      if (sortBy === 'title') orderBy = { title: 'asc' };
      if (sortBy === 'duration_asc') orderBy = { durationSeconds: 'asc' };
      if (sortBy === 'duration_desc') orderBy = { durationSeconds: 'desc' };

      const [books, totalCount] = await Promise.all([
        prisma.bookSummary.findMany({
          where: whereClause,
          skip,
          take: pageSize,
          orderBy,
        }),
        prisma.bookSummary.count({ where: whereClause }),
      ]);

      return {
        books,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      };
    }),

  // Legacy getBooks procedures
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
      const cleanTerm = query.trim();
      if (!cleanTerm) return [];

      return prisma.bookSummary.findMany({
        take: limit,
        where: {
          isMissing: false,
          OR: [
            { title: { contains: cleanTerm } },
            { author: { contains: cleanTerm } },
            { category: { contains: cleanTerm } },
            { fileName: { contains: cleanTerm } },
            { synopsis: { contains: cleanTerm } },
          ],
        },
        orderBy: [{ title: 'asc' }],
      });
    }),

  // Production Global Typeahead Search Procedure with counts & relevance
  searchGlobal: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(30).default(6),
      })
    )
    .query(async ({ input }) => {
      const term = input.query.trim();
      if (!term) {
        return { items: [], totalMatches: 0 };
      }

      const whereClause = {
        isMissing: false,
        OR: [
          { title: { contains: term } },
          { author: { contains: term } },
          { category: { contains: term } },
          { fileName: { contains: term } },
          { synopsis: { contains: term } },
        ],
      };

      const [items, totalMatches] = await Promise.all([
        prisma.bookSummary.findMany({
          take: input.limit,
          where: whereClause,
          select: {
            id: true,
            title: true,
            author: true,
            category: true,
            coverUrl: true,
            localCoverPath: true,
            durationSeconds: true,
            format: true,
          },
          orderBy: [
            // Title matches take natural alphabetical preference
            { title: 'asc' },
          ],
        }),
        prisma.bookSummary.count({ where: whereClause }),
      ]);

      return {
        items,
        totalMatches,
      };
    }),

  getBookById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const book = await prisma.bookSummary.findUnique({
        where: { id: input.id },
      });
      if (!book) return null;

      let isSaved = false;
      if (ctx.user) {
        const item = await prisma.listenLater.findUnique({
          where: {
            userId_bookId: {
              userId: ctx.user.userId,
              bookId: input.id,
            },
          },
        });
        isSaved = Boolean(item);
      }

      return {
        ...book,
        isSaved,
      };
    }),

  getRecommendations: publicProcedure
    .input(z.object({ bookId: z.string(), limit: z.number().default(6) }))
    .query(async ({ input }) => {
      return getBookRecommendations(input.bookId, input.limit);
    }),

  toggleListenLater: protectedProcedure
    .input(z.object({ bookId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.listenLater.findUnique({
        where: {
          userId_bookId: {
            userId: ctx.user.userId,
            bookId: input.bookId,
          },
        },
      });

      if (existing) {
        await prisma.listenLater.delete({
          where: { id: existing.id },
        });
        return { saved: false };
      } else {
        await prisma.listenLater.create({
          data: {
            userId: ctx.user.userId,
            bookId: input.bookId,
          },
        });
        return { saved: true };
      }
    }),

  getListenLaterBooks: protectedProcedure.query(async ({ ctx }) => {
    const items = await prisma.listenLater.findMany({
      where: { userId: ctx.user.userId },
      include: { book: true },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i) => i.book).filter((b) => !b.isMissing);
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
