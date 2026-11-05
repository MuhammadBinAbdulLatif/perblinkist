import path from 'path';
import { prisma } from '../lib/prisma';
import { runMediaScan, findAudioFiles } from '../lib/scanner';

async function main() {
  console.log('=====================================================');
  console.log('🚀 Running PerBlinkist Media Ingestion Pipeline Test');
  console.log('=====================================================\n');

  const exampleDir = path.join(process.cwd(), 'example-files');
  console.log(`📁 Target Ingestion Directory: ${exampleDir}`);

  const detectedFiles = findAudioFiles(exampleDir);
  console.log(`🔍 Detected ${detectedFiles.length} audio summary files.`);

  console.log('\n⚙️ Processing and extracting metadata from APIs...');
  const scanResult = await runMediaScan(exampleDir);

  console.log('\n=====================================================');
  console.log('📊 Ingestion Results:');
  console.log(`- Total Files Found: ${scanResult.totalFound}`);
  console.log(`- Successfully Processed: ${scanResult.processed}`);
  console.log(`- New Records Added/Updated: ${scanResult.newAdded}`);
  console.log(`- Errors: ${scanResult.errors}`);
  console.log('=====================================================\n');

  // Query database and display results table
  const allIndexedBooks = await prisma.bookSummary.findMany({
    orderBy: { title: 'asc' },
  });

  console.log(`📚 Stored Book Records in Prisma SQLite (${allIndexedBooks.length} total):\n`);

  const displayData = allIndexedBooks.map((book) => ({
    Title: book.title.length > 30 ? book.title.substring(0, 27) + '...' : book.title,
    Author: (book.author || 'Unknown').substring(0, 20),
    Source: book.matchedSource,
    Format: `${book.format} (${book.codec || 'audio'})`,
    Duration: `${Math.round((book.durationSeconds || 0) / 60)} min`,
    HasCover: Boolean(book.localCoverPath || book.coverUrl) ? '✅ Yes' : '❌ No',
    Category: (book.category || 'General').substring(0, 18),
  }));

  console.table(displayData);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal Ingestion Test Failure:', err);
  process.exit(1);
});
