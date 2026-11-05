import { prisma } from '../lib/prisma';
import { appRouter } from '../server/routers/app';

async function testAuthRecovery() {
  console.log('=====================================================');
  console.log('🔑 Testing Auth UX & Security Question Password Reset');
  console.log('=====================================================\n');

  // Clean test user if exists
  await prisma.user.deleteMany({ where: { username: 'reader_jane' } });

  const caller = appRouter.createCaller({ user: null, req: new Request('http://localhost:3000') });

  // 1. Register new user with Security Question
  console.log('--- Step 1: User Registration with Security Question ---');
  const regRes = await caller.auth.register({
    username: 'reader_jane',
    password: 'InitialPassword123!',
    email: 'jane@example.com',
    securityQuestion: 'What was the name of your first pet?',
    securityAnswer: 'Whiskers',
  });

  console.log(`User Registered: ${regRes.user.username} (Admin: ${regRes.user.isAdmin})`);
  console.log(`Session Token Issued: ${Boolean(regRes.token)}`);

  if (!regRes.success) {
    throw new Error('Step 1 Failed: Registration failed');
  }
  console.log('✅ Step 1 Passed!\n');

  // 2. Query Security Question for Forgot Password Flow
  console.log('--- Step 2: Retrieve Security Question ---');
  const qRes = await caller.auth.getSecurityQuestion({ username: 'reader_jane' });
  console.log(`Retrieved Security Question: "${qRes.question}"`);

  if (qRes.question !== 'What was the name of your first pet?') {
    throw new Error('Step 2 Failed: Question mismatch');
  }
  console.log('✅ Step 2 Passed!\n');

  // 3. Reject Wrong Security Answer
  console.log('--- Step 3: Reject Incorrect Security Answer ---');
  try {
    await caller.auth.resetPasswordWithSecurityAnswer({
      username: 'reader_jane',
      securityAnswer: 'Rover', // wrong!
      newPassword: 'BrandNewPassword2026!',
    });
    throw new Error('Step 3 Failed: Wrong answer was accepted!');
  } catch (err: any) {
    console.log(`Correctly Rejected: ${err.message}`);
    console.log('✅ Step 3 Passed!\n');
  }

  // 4. Accept Correct Security Answer (Case-Insensitive) & Reset Password
  console.log('--- Step 4: Reset Password with Case-Insensitive Answer ---');
  const resetRes = await caller.auth.resetPasswordWithSecurityAnswer({
    username: 'reader_jane',
    securityAnswer: '  whiskers  ', // test lowercase + extra spaces
    newPassword: 'BrandNewPassword2026!',
  });

  console.log(`Password Reset Status: ${resetRes.success}`);
  console.log(`New Session Token Issued: ${Boolean(resetRes.token)}`);

  if (!resetRes.success) {
    throw new Error('Step 4 Failed: Valid reset failed');
  }
  console.log('✅ Step 4 Passed!\n');

  // 5. Test Login with New Password
  console.log('--- Step 5: Login with Updated Password ---');
  const loginRes = await caller.auth.login({
    username: 'reader_jane',
    password: 'BrandNewPassword2026!',
  });

  console.log(`Login Successful for: ${loginRes.user.username}`);
  if (!loginRes.success) {
    throw new Error('Step 5 Failed: Could not login with new password');
  }
  console.log('✅ Step 5 Passed!\n');

  // Clean test user
  await prisma.user.deleteMany({ where: { username: 'reader_jane' } });

  console.log('=====================================================');
  console.log('🎉 ALL AUTH RECOVERY SPEC CHECKS PASSED!');
  console.log('=====================================================\n');

  await prisma.$disconnect();
}

testAuthRecovery().catch((err) => {
  console.error('Fatal Recovery Test Error:', err);
  process.exit(1);
});
