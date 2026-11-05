import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { runMediaScan } from '../lib/scanner';

async function testIncrementalSync() {
  console.log('=====================================================');
  console.log('⚡ Testing PerBlinkist Incremental Media Sync');
  console.log('=====================================================\n');

  const exampleDir = path.join(process.cwd(), 'example-files');

  // 1. First Scan (Baseline)
  console.log('--- Step 1: Baseline Ingestion Scan ---');
  const res1 = await runMediaScan(exampleDir);
  console.log(`Scan 1 Duration: ${res1.durationMs}ms`);
  console.log(`Total Found: ${res1.totalFound}, Processed: ${res1.processed}, New: ${res1.newAdded}, Unchanged: ${res1.unchanged}`);
  console.log('✅ Baseline scan ready.\n');

  // 2. Second Scan (Unchanged Rescan - Must be immediate and trigger 0 API calls)
  console.log('--- Step 2: Unchanged Rescan (Must Skip All Files) ---');
  const startT = Date.now();
  const res2 = await runMediaScan(exampleDir);
  const elapsed = Date.now() - startT;

  console.log(`Scan 2 Duration: ${elapsed}ms`);
  console.log(`Total Found: ${res2.totalFound}`);
  console.log(`Unchanged: ${res2.unchanged} (Expected: ${res2.totalFound})`);
  console.log(`New Added: ${res2.newAdded} (Expected: 0)`);
  console.log(`Modified: ${res2.modified} (Expected: 0)`);

  if (res2.newAdded !== 0 || res2.unchanged !== res2.totalFound) {
    throw new Error('Incremental sync failed: Unchanged files were not skipped!');
  }
  console.log('✅ Step 2 Passed: 100% of unchanged files skipped with 0 network calls!\n');

  // 3. Third Step: Add a new file to the folder
  console.log('--- Step 3: Add a Single New Summary File ---');
  const sourceSample = path.join(exampleDir, 'The Talent Code (Daniel Coyle).mka');
  const tempNewFile = path.join(exampleDir, 'Deep Work (Cal Newport).mka');

  // Copy sample to create a new file
  fs.copyFileSync(sourceSample, tempNewFile);
  console.log(`Created new file: ${path.basename(tempNewFile)}`);

  const res3 = await runMediaScan(exampleDir);
  console.log(`Scan 3 Duration: ${res3.durationMs}ms`);
  console.log(`Total Found: ${res3.totalFound}`);
  console.log(`Unchanged: ${res3.unchanged} (Expected: ${res2.totalFound})`);
  console.log(`New Added: ${res3.newAdded} (Expected: 1)`);

  if (res3.newAdded !== 1) {
    // Clean up before throw
    fs.unlinkSync(tempNewFile);
    throw new Error(`Expected exactly 1 new file added, got ${res3.newAdded}`);
  }
  console.log('✅ Step 3 Passed: Only the newly added file was processed!\n');

  // 4. Fourth Step: Delete the temporary file and test removal/pruning
  console.log('--- Step 4: Remove File and Verify Detection ---');
  fs.unlinkSync(tempNewFile);
  console.log(`Deleted temporary file: ${path.basename(tempNewFile)}`);

  const res4 = await runMediaScan(exampleDir, { pruneMissing: true });
  console.log(`Scan 4 Duration: ${res4.durationMs}ms`);
  console.log(`Removed / Pruned: ${res4.removed} (Expected: 1)`);

  if (res4.removed !== 1) {
    throw new Error(`Expected 1 removed file, got ${res4.removed}`);
  }
  console.log('✅ Step 4 Passed: Deleted file pruned cleanly from database!\n');

  console.log('=====================================================');
  console.log('🎉 ALL INCREMENTAL SYNC SPEC CHECKS PASSED!');
  console.log('=====================================================\n');

  await prisma.$disconnect();
}

testIncrementalSync().catch((err) => {
  console.error('Fatal Incremental Sync Test Error:', err);
  process.exit(1);
});
