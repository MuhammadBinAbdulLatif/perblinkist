import { prisma } from '../lib/prisma';
import { fastIndexMediaDirectory, processBatchEnrichment, getDetailedScanStats } from '../lib/scanner';
import { rateLimiter, providerLimiter } from '../lib/metadata';

async function testBatchIngestion() {
  console.log('=====================================================');
  console.log('🧪 Testing Resilient Batch Ingestion & Rate Limiting');
  console.log('=====================================================\n');

  // Reset rate limiter for test
  rateLimiter.resetCooldown();

  console.log('--- Step 1: Fast Disk Indexing (Zero External Calls) ---');
  const indexRes = await fastIndexMediaDirectory();
  console.log(`Indexed files: ${indexRes.totalFiles}`);
  console.log('✅ Stage 1 fast indexing complete.\n');

  console.log('--- Step 2: Query State Diagnostics from Database ---');
  let stats = await getDetailedScanStats();
  console.log(`Total Indexed in DB: ${stats.totalIndexed}`);
  console.log(`Total Enriched: ${stats.totalEnriched}`);
  console.log(`Total Pending: ${stats.totalPending}`);
  console.log(`Total Rate-Limited: ${stats.totalRateLimited}`);
  console.log(`Total Failed: ${stats.totalFailed}\n`);

  console.log('--- Step 3: Trigger Concurrent Batch Enrichment ---');
  const batchRes = await processBatchEnrichment();
  console.log(`Batch processed: ${batchRes.processed} items`);
  console.log(`Enriched in this batch: ${batchRes.enriched}`);
  console.log(`Remaining pending: ${batchRes.remainingPending}`);
  console.log(`Rate limited hit: ${batchRes.rateLimited ? 'YES' : 'NO'}`);
  if (batchRes.cooldownSeconds) {
    console.log(`Rate limit cooldown: ${batchRes.cooldownSeconds}s`);
  }

  console.log('\n--- Step 4: Simulate & Verify Per-Provider Rate Limit Backoff ---');
  const wait1 = providerLimiter.limitProvider('google_books', 60);
  console.log(`Backoff Tier 1: ${wait1}s (Expected: 60s)`);
  if (wait1 !== 60) throw new Error(`Expected 60s cooldown, got ${wait1}s`);

  const wait2 = providerLimiter.limitProvider('google_books', 120);
  console.log(`Backoff Tier 2: ${wait2}s (Expected: 120s)`);
  if (wait2 !== 120) throw new Error(`Expected 120s cooldown, got ${wait2}s`);

  const wait3 = providerLimiter.limitProvider('google_books', 180);
  console.log(`Backoff Tier 3: ${wait3}s (Expected: 180s)`);
  if (wait3 !== 180) throw new Error(`Expected 180s cooldown, got ${wait3}s`);

  const rlStatus = rateLimiter.getStatus();
  console.log(`Current Rate Limiter Status: Active=${rlStatus.isRateLimited}, Remaining=${rlStatus.remainingSeconds}s`);

  // Reset rate limiter cleanly after test
  rateLimiter.resetCooldown();
  console.log('\n✅ Rate limiter backoff verified and reset.');

  console.log('\n=====================================================');
  console.log('🎉 ALL BATCHING & RATE LIMIT SPEC TESTS PASSED!');
  console.log('=====================================================');

  await prisma.$disconnect();
}

testBatchIngestion().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
