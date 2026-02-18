/**
 * create-vector-index.ts
 *
 * ONE-TIME script: creates the MongoDB Atlas Vector Search index on the
 * `rag_documents` collection so that $vectorSearch aggregation works.
 *
 * Run this ONCE after:
 *   1. You have documents with embedded chunks (vectorStore.syncStatus = 'synced')
 *   2. Your MongoDB is 7.0+ locally OR you are using MongoDB Atlas
 *
 * Usage:
 *   npx ts-node src/scripts/create-vector-index.ts
 *
 * Idempotent: re-running prints a message if the index already exists.
 *
 * Environment variables used:
 *   MONGODB_URI           – MongoDB connection string
 *   RAG_INDEX_NAME        – Index name (default: rag_chunks_vector_index)
 *   RAG_VECTOR_DIMENSIONS – Embedding dimensions (default: 1536)
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const INDEX_NAME = process.env.RAG_INDEX_NAME || 'rag_chunks_vector_index';
const DIMENSIONS = parseInt(process.env.RAG_VECTOR_DIMENSIONS || '1536', 10);
const COLLECTION = 'rag_documents';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ ABORT: MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB.');

  const db = mongoose.connection.db!;

  // --- Safety check: confirm at least one document has embeddings ---
  const embeddedCount = await db.collection(COLLECTION).countDocuments({
    'vectorStore.syncStatus': 'synced',
    'chunks.0.embedding': { $exists: true }
  });

  if (embeddedCount === 0) {
    console.warn(
      '⚠️  No documents with embedded chunks found in rag_documents.\n' +
      '   Upload or sync a document first (with LM Studio or OpenAI configured)\n' +
      '   so that chunks[].embedding is populated, then re-run this script.'
    );
    // Do not abort — on Atlas you can create the index before inserting data
    console.log('Proceeding with index creation anyway (safe on Atlas / MongoDB 7.0+)...');
  } else {
    console.log(`✅ Found ${embeddedCount} document(s) with embedded chunks.`);
  }

  // --- Check if the index already exists ---
  // Atlas Vector Search indexes are created via the Search Index API,
  // not the standard createIndex() path.
  // On local MongoDB 7.0+ we use the same Atlas-compatible API via the driver.

  let existingIndexes: any[] = [];
  try {
    // The Atlas Search Index API is exposed via db.collection().listSearchIndexes()
    // in mongodb driver 6.x+
    const cursor = db.collection(COLLECTION).listSearchIndexes();
    existingIndexes = await cursor.toArray();
  } catch {
    // Older driver or non-Atlas — will attempt creation anyway
  }

  const alreadyExists = existingIndexes.some((idx: any) => idx.name === INDEX_NAME);
  if (alreadyExists) {
    console.log(`ℹ️  Vector Search index "${INDEX_NAME}" already exists — nothing to do.`);
    await mongoose.connection.close();
    return;
  }

  // --- Create the Atlas Vector Search index ---
  // Definition:
  //   - Field: chunks.embedding (the nested array inside each chunk)
  //   - Type: vector (knnVector)
  //   - Dimensions: must match the embedding model output (1536 for OpenAI, 768 for most local models)
  //   - Similarity: cosine
  //
  // Pre-filter fields allow $vectorSearch to filter by tenantId and promptVersionId
  // BEFORE running the ANN search — this enforces multi-tenant isolation.

  const indexDefinition = {
    name: INDEX_NAME,
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'chunks.embedding',
          numDimensions: DIMENSIONS,
          similarity: 'cosine'
        },
        {
          type: 'filter',
          path: 'tenantId'
        },
        {
          type: 'filter',
          path: 'promptVersionId'
        },
        {
          type: 'filter',
          path: 'status'
        }
      ]
    }
  };

  try {
    // mongodb driver 6.x exposes createSearchIndex()
    const result = await (db.collection(COLLECTION) as any).createSearchIndex(indexDefinition);
    console.log(`✅ Vector Search index "${INDEX_NAME}" creation initiated. Result:`, result);
    console.log(
      '\nNote: Index creation is asynchronous on Atlas. It may take 1–5 minutes to become\n' +
      'queryable. Check status at: Atlas UI → Search → Indexes → rag_documents.\n' +
      'On local MongoDB 7.0+, the index is available immediately after creation.'
    );
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log(`ℹ️  Index "${INDEX_NAME}" already exists.`);
    } else {
      console.error('❌ Failed to create vector index:', err.message);
      console.error(
        '\nIf you are running MongoDB < 7.0 locally, $vectorSearch is not supported.\n' +
        'Options:\n' +
        '  1. Upgrade local MongoDB to 7.0+\n' +
        '  2. Migrate to MongoDB Atlas (free tier M0 supports vector search)\n' +
        '  3. Continue using keyword retrieval (no index needed — already working)'
      );
      await mongoose.connection.close();
      process.exit(1);
    }
  }

  // --- Also ensure the compound regular indexes exist for non-vector queries ---
  console.log('\nEnsuring compound regular indexes...');

  await db.collection(COLLECTION).createIndex(
    { tenantId: 1, promptVersionId: 1 },
    { name: 'tenant_prompt_docs', background: true }
  ).catch(() => {}); // already exists — ignore

  await db.collection(COLLECTION).createIndex(
    { tenantId: 1, sourceId: 1 },
    { name: 'tenant_source_docs', background: true }
  ).catch(() => {}); // already exists — ignore

  console.log('✅ Regular indexes confirmed.');

  await mongoose.connection.close();
  console.log('\n✅ Done.');
}

main().catch(async (err) => {
  console.error('❌ Script failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});
