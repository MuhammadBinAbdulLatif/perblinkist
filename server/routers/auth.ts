import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { cookies } from 'next/headers';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  hashSecurityAnswer,
  verifySecurityAnswer,
  signAuthToken,
  AUTH_COOKIE_NAME,
  TOKEN_MAX_AGE,
  SECURITY_QUESTIONS,
} from '@/lib/auth';

/**
 * Sets auth session cookie directly via Next.js native cookies() API
 */
async function setNativeAuthCookie(token: string) {
  try {
    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === 'production';
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      path: '/',
      maxAge: TOKEN_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });
  } catch {
    // Graceful fallback for non-request environments (e.g. standalone test scripts)
  }
}

/**
 * Clears auth session cookie directly via Next.js native cookies() API
 */
async function clearNativeAuthCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
  } catch {
    // Graceful fallback for non-request environments
  }
}

export const authRouter = router({
  // Check if system is initialized (has at least 1 user) and return current session
  status: publicProcedure.query(async ({ ctx }) => {
    const userCount = await prisma.user.count();
    return {
      initialized: userCount > 0,
      currentUser: ctx.user,
      securityQuestions: SECURITY_QUESTIONS,
    };
  }),

  // First-run Admin setup (disabled once any user exists)
  setupAdmin: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(30),
        password: z.string().min(6),
        email: z.string().email().optional(),
        securityQuestion: z.string().min(3),
        securityAnswer: z.string().min(1),
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
      const securityAnswerHash = await hashSecurityAnswer(input.securityAnswer);

      const user = await prisma.user.create({
        data: {
          username: input.username.trim(),
          email: input.email?.trim(),
          passwordHash,
          isAdmin: true,
          securityQuestion: input.securityQuestion.trim(),
          securityAnswerHash,
        },
      });

      const token = signAuthToken({
        userId: user.id,
        username: user.username,
        isAdmin: true,
      });

      await setNativeAuthCookie(token);

      return {
        success: true,
        user: { id: user.id, username: user.username, isAdmin: true },
        token,
      };
    }),

  // Standard user sign-up
  register: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(30),
        password: z.string().min(6),
        email: z.string().email().optional(),
        securityQuestion: z.string().min(3),
        securityAnswer: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { username: input.username.trim() },
            ...(input.email ? [{ email: input.email.trim() }] : []),
          ],
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A user with that username or email already exists.',
        });
      }

      const passwordHash = await hashPassword(input.password);
      const securityAnswerHash = await hashSecurityAnswer(input.securityAnswer);

      const user = await prisma.user.create({
        data: {
          username: input.username.trim(),
          email: input.email?.trim(),
          passwordHash,
          isAdmin: false,
          securityQuestion: input.securityQuestion.trim(),
          securityAnswerHash,
        },
      });

      const token = signAuthToken({
        userId: user.id,
        username: user.username,
        isAdmin: false,
      });

      await setNativeAuthCookie(token);

      return {
        success: true,
        user: { id: user.id, username: user.username, isAdmin: false },
        token,
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

      await setNativeAuthCookie(token);

      return {
        success: true,
        user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
        token,
      };
    }),

  // Get user's security question for password recovery
  getSecurityQuestion: publicProcedure
    .input(z.object({ username: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: input.username.trim() }, { email: input.username.trim() }],
        },
        select: { securityQuestion: true },
      });

      if (!user || !user.securityQuestion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No account found or no recovery question configured for this user.',
        });
      }

      return {
        question: user.securityQuestion,
      };
    }),

  // Reset password using security answer
  resetPasswordWithSecurityAnswer: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        securityAnswer: z.string().min(1),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: input.username.trim() }, { email: input.username.trim() }],
        },
      });

      if (!user || !user.securityAnswerHash) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User account not found or security answer missing.',
        });
      }

      const isAnswerCorrect = await verifySecurityAnswer(
        input.securityAnswer,
        user.securityAnswerHash
      );

      if (!isAnswerCorrect) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect answer to security question.',
        });
      }

      const newPasswordHash = await hashPassword(input.newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      const token = signAuthToken({
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });

      await setNativeAuthCookie(token);

      return {
        success: true,
        message: 'Password reset successfully.',
        token,
      };
    }),

  // Logout
  logout: publicProcedure.mutation(async () => {
    await clearNativeAuthCookie();
    return {
      success: true,
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
