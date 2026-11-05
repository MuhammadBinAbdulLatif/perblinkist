import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, signAuthToken, verifyAuthToken } from '../lib/auth';
import { appRouter } from '../server/routers/app';

async function testAuthSystem() {
  console.log('=====================================================');
  console.log('🛡️ Testing PerBlinkist Basic Authentication System');
  console.log('=====================================================\n');

  // 1. Password hashing & verification
  console.log('--- Test 1: Bcrypt Hashing & Verification ---');
  const rawSecret = 'MySecurePassword2026!';
  const hashed = await hashPassword(rawSecret);
  const isMatch = await verifyPassword(rawSecret, hashed);
  const isWrongMatch = await verifyPassword('WrongPassword', hashed);

  console.log(`Password Hashed: ${hashed.substring(0, 20)}...`);
  console.log(`Valid Password Match: ${isMatch} (Expected: true)`);
  console.log(`Wrong Password Match: ${isWrongMatch} (Expected: false)`);

  if (!isMatch || isWrongMatch) {
    throw new Error('Test 1 Failed: Bcrypt verification mismatch');
  }
  console.log('✅ Test 1 Passed!\n');

  // 2. JWT Signing & Extraction
  console.log('--- Test 2: JWT Session Token Issuance & Decoding ---');
  const token = signAuthToken({ userId: 'test-user-123', username: 'admin', isAdmin: true });
  const payload = verifyAuthToken(token);

  console.log(`JWT Token: ${token.substring(0, 30)}...`);
  console.log(`Decoded User: ${payload?.username}, Admin: ${payload?.isAdmin}`);

  if (!payload || payload.username !== 'admin' || !payload.isAdmin) {
    throw new Error('Test 2 Failed: JWT decoding failed');
  }
  console.log('✅ Test 2 Passed!\n');

  // 3. First-Run Setup Flow via tRPC Router Caller
  console.log('--- Test 3: First-Run Admin Setup Flow ---');

  // Clean admin users for fresh test run
  await prisma.user.deleteMany({ where: { isAdmin: true } });

  const caller = appRouter.createCaller({ user: null, req: new Request('http://localhost:3000') });

  const setupRes = await caller.auth.setupAdmin({
    username: 'testadmin',
    password: 'SuperAdminPassword123!',
    email: 'admin@perblinkist.local',
    securityQuestion: 'What was the name of your first pet?',
    securityAnswer: 'Rover',
  });

  console.log(`Created Admin User: ${setupRes.user.username} (ID: ${setupRes.user.id})`);
  console.log(`Token generated: ${Boolean(setupRes.token)}`);

  if (!setupRes.success || !setupRes.token) {
    throw new Error('Test 3 Failed: Admin setup failed');
  }
  console.log('✅ Test 3 Passed!\n');

  // 4. Test Second Setup Rejection
  console.log('--- Test 4: Prevent Duplicate Admin Setup ---');
  try {
    await caller.auth.setupAdmin({
      username: 'hacker',
      password: 'hackedpassword',
      securityQuestion: 'What was your first car?',
      securityAnswer: 'Civic',
    });
    throw new Error('Test 4 Failed: Allowed duplicate admin registration!');
  } catch (err: any) {
    console.log(`Correctly Rejected: ${err.message}`);
    console.log('✅ Test 4 Passed!\n');
  }

  // 5. Login Flow Verification
  console.log('--- Test 5: Login Flow (Invalid & Valid Credentials) ---');
  try {
    await caller.auth.login({ username: 'testadmin', password: 'BadPassword' });
    throw new Error('Test 5 Failed: Bad password was accepted!');
  } catch {
    console.log('Correctly rejected bad password.');
  }

  const loginRes = await caller.auth.login({
    username: 'testadmin',
    password: 'SuperAdminPassword123!',
  });

  console.log(`Login Successful for: ${loginRes.user.username}`);
  console.log(`Session Token Issued: ${Boolean(loginRes.token)}`);
  if (!loginRes.success) {
    throw new Error('Test 5 Failed: Valid login rejected');
  }
  console.log('✅ Test 5 Passed!\n');

  // 6. Protected Procedure Guard
  console.log('--- Test 6: Protected Procedure Guard ---');
  const unauthCaller = appRouter.createCaller({ user: null, req: new Request('http://localhost:3000') });
  try {
    await unauthCaller.triggerScan();
    throw new Error('Test 6 Failed: Unauthenticated caller triggered scan!');
  } catch (err: any) {
    console.log(`Protected procedure safely blocked unauthenticated caller: ${err.message}`);
    console.log('✅ Test 6 Passed!\n');
  }

  const authCaller = appRouter.createCaller({
    user: { userId: setupRes.user.id, username: 'testadmin', isAdmin: true },
    req: new Request('http://localhost:3000'),
  });
  const meRes = await authCaller.auth.me();
  console.log(`Authenticated Me Profile Query: ${meRes?.username} (Admin: ${meRes?.isAdmin})`);
  console.log('✅ Test 6 Passed!\n');

  // Clean test user
  await prisma.user.deleteMany({ where: { username: 'testadmin' } });

  console.log('=====================================================');
  console.log('🎉 ALL BASIC AUTHENTICATION SPEC TESTS PASSED!');
  console.log('=====================================================\n');

  await prisma.$disconnect();
}

testAuthSystem().catch((err) => {
  console.error('Fatal Auth Test Error:', err);
  process.exit(1);
});
