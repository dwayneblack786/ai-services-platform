/**
 * migrate-cleanup-legacy-collections.ts
 *
 * ONE-TIME migration script: drops the legacy 'prompts' and 'prompt_templates'
 * collections that have been superseded by 'prompt_versions'.
 *
 * Run ONLY after confirming all tenant data lives in 'prompt_versions'.
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-cleanup-legacy-collections.ts
 *
 * Safety:
 *   - Aborts if prompt_versions has no templates (isTemplate: true)
 *   - Prints doc counts before dropping
 *   - Does NOT touch 'assistant_channels' (retained for Java VA service)
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ ABORT: MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB.');

  const db = mongoose.connection.db!;

  // Safety check: ensure prompt_versions has templates before dropping
  const templateCount = await db.collection('prompt_versions').countDocuments({ isTemplate: true });
  if (templateCount === 0) {
    console.error('❌ ABORT: No templates found in prompt_versions (isTemplate: true count = 0).');
    console.error('   Run seedProductTemplates.ts first to seed templates into prompt_versions.');
    await mongoose.connection.close();
    process.exit(1);
  }
  console.log(`✅ prompt_versions has ${templateCount} template(s) — safe to proceed.`);

  // Print counts of legacy collections
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  for (const legacyCollection of ['prompts', 'prompt_templates']) {
    if (!collectionNames.includes(legacyCollection)) {
      console.log(`ℹ️  '${legacyCollection}' collection does not exist — skipping.`);
      continue;
    }

    const count = await db.collection(legacyCollection).countDocuments();
    console.log(`🗑️  Dropping '${legacyCollection}' (${count} documents)...`);
    await db.dropCollection(legacyCollection);
    console.log(`✅ Dropped '${legacyCollection}'.`);
  }

  console.log('\n✅ Migration complete. assistant_channels retained for Java VA service.');
  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('❌ Migration failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});
