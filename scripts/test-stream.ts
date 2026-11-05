import { NextRequest } from 'next/server';
import { prisma } from '../lib/prisma';
import { GET, resolveAudioPath } from '../app/api/stream/[id]/route';

async function runStreamTests() {
  console.log('=====================================================');
  console.log('🧪 Testing PerBlinkist Audio Streaming Media Server');
  console.log('=====================================================\n');

  // 1. Pick first book from database
  const book = await prisma.bookSummary.findFirst({
    where: { format: 'mka' },
  });

  if (!book) {
    console.error('❌ No indexed book found in SQLite. Run ingestion first.');
    process.exit(1);
  }

  console.log(`🎵 Selected Test Book: "${book.title}" (ID: ${book.id})`);
  const resolvedPath = resolveAudioPath(book.filePath);
  console.log(`📁 Resolved Audio Path: ${resolvedPath}`);

  // Test 1: Full stream (HTTP 200)
  console.log('\n--- Test 1: Full Stream Request (No Range Header) ---');
  const req1 = new NextRequest(`http://localhost:3000/api/stream/${book.id}`);
  const res1 = await GET(req1, { params: Promise.resolve({ id: book.id }) });

  console.log(`Status Code: ${res1.status} (Expected: 200)`);
  console.log(`Content-Type: ${res1.headers.get('content-type')}`);
  console.log(`Accept-Ranges: ${res1.headers.get('accept-ranges')}`);
  console.log(`Content-Length: ${res1.headers.get('content-length')} bytes`);

  if (res1.status !== 200 || res1.headers.get('accept-ranges') !== 'bytes') {
    throw new Error('Test 1 Failed: Expected 200 with Accept-Ranges');
  }
  console.log('✅ Test 1 Passed!');

  // Test 2: Byte-range probe (HTTP 206)
  console.log('\n--- Test 2: Initial Audio Probe (Range: bytes=0-1024) ---');
  const req2 = new NextRequest(`http://localhost:3000/api/stream/${book.id}`, {
    headers: { Range: 'bytes=0-1024' },
  });
  const res2 = await GET(req2, { params: Promise.resolve({ id: book.id }) });

  console.log(`Status Code: ${res2.status} (Expected: 206)`);
  console.log(`Content-Range: ${res2.headers.get('content-range')}`);
  console.log(`Content-Length: ${res2.headers.get('content-length')} (Expected: 1025)`);

  if (res2.status !== 206 || res2.headers.get('content-length') !== '1025') {
    throw new Error('Test 2 Failed: Expected 206 with Content-Length: 1025');
  }
  console.log('✅ Test 2 Passed!');

  // Test 3: Mid-stream seeking (HTTP 206)
  console.log('\n--- Test 3: Mid-Stream Scrubbing (Range: bytes=100000-200000) ---');
  const req3 = new NextRequest(`http://localhost:3000/api/stream/${book.id}`, {
    headers: { Range: 'bytes=100000-200000' },
  });
  const res3 = await GET(req3, { params: Promise.resolve({ id: book.id }) });

  console.log(`Status Code: ${res3.status} (Expected: 206)`);
  console.log(`Content-Range: ${res3.headers.get('content-range')}`);
  console.log(`Content-Length: ${res3.headers.get('content-length')} (Expected: 100001)`);

  if (res3.status !== 206 || res3.headers.get('content-length') !== '100001') {
    throw new Error('Test 3 Failed: Expected 206 with Content-Length: 100001');
  }
  console.log('✅ Test 3 Passed!');

  // Test 4: Open-ended seek (HTTP 206)
  console.log('\n--- Test 4: Open-Ended Seek (Range: bytes=100000-) ---');
  const req4 = new NextRequest(`http://localhost:3000/api/stream/${book.id}`, {
    headers: { Range: 'bytes=100000-' },
  });
  const res4 = await GET(req4, { params: Promise.resolve({ id: book.id }) });

  console.log(`Status Code: ${res4.status} (Expected: 206)`);
  console.log(`Content-Range: ${res4.headers.get('content-range')}`);

  if (res4.status !== 206 || !res4.headers.get('content-range')?.startsWith('bytes 100000-')) {
    throw new Error('Test 4 Failed: Expected 206 with Content-Range starting at 100000');
  }
  console.log('✅ Test 4 Passed!');

  // Test 5: Out of bounds Range (HTTP 416)
  console.log('\n--- Test 5: Out of Range Request (Range: bytes=999999999-) ---');
  const req5 = new NextRequest(`http://localhost:3000/api/stream/${book.id}`, {
    headers: { Range: 'bytes=999999999-' },
  });
  const res5 = await GET(req5, { params: Promise.resolve({ id: book.id }) });

  console.log(`Status Code: ${res5.status} (Expected: 416)`);
  console.log(`Content-Range: ${res5.headers.get('content-range')}`);

  if (res5.status !== 416) {
    throw new Error('Test 5 Failed: Expected 416 Range Not Satisfiable');
  }
  console.log('✅ Test 5 Passed!');

  console.log('\n=====================================================');
  console.log('🎉 ALL 5 AUDIO STREAMING SPEC TESTS PASSED SUCCESSFULLY!');
  console.log('=====================================================\n');

  await prisma.$disconnect();
}

runStreamTests().catch((err) => {
  console.error('Fatal Streaming Test Error:', err);
  process.exit(1);
});
