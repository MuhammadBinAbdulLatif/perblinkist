import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, signAuthToken, createAuthCookie, createClearAuthCookie } from '@/lib/auth';

export const authRouter = router({
  // Check if system is initialized (has at least 1 user) and return current session
  status: publicProcedure.query(async ({ ctx }) => {
    const userCount = await prisma.user.count();
    return {
      initialized: userCount > 0,
      currentUser: ctx.user,
    };
  }),

  // First-run Admin setup (disabled once any user exists)
  setupAdmin: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(30),
        password: z.string().min(6),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existingCount = await prisma.user.count();
      if (existingCount > 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin account has already been created for this instance.',
        });
      }

      const passwordHash = await hashPassword(input.password);
      const user = await prisma.user.create({
        data: {
          username: input.username.trim(),
          email: input.email?.trim(),
          passwordHash,
          isAdmin: true,
        },
      });

      const token = signAuthToken({
        userId: user.id,
        username: user.username,
        isAdmin: true,
      });

      return {
        success: true,
        user: { id: user.id, username: user.username, isAdmin: true },
        cookie: createAuthCookie(token),
      };
    }),

  // Classic username/password login
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: input.username }, { email: input.username }],
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid username or password',
        });
      }

      const isValid = await verifyPassword(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid username or password',
        });
      }

      const token = signAuthToken({
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });

      return {
        success: true,
        user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
        cookie: createAuthCookie(token),
      };
    }),

  // Logout
  logout: publicProcedure.mutation(async () => {
    return {
      success: true,
      cookie: createClearAuthCookie(),
    };
  }),

  // Return logged in user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.userId },
      select: { id: true, username: true, email: true, isAdmin: true, createdAt: true },
    });
    return user;
  }),
});
