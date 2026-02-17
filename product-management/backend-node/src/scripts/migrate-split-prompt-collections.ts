/**
 * Migration: split prompt_versions into product_prompt_templates + tenant_prompt_versions
 *
 * Run once with: ts-node src/scripts/migrate-split-prompt-collections.ts
 *
 * Safe to re-run — skips documents already present in target collections.
 */

import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;

  const source = db.collection('prompt_versions');
  const templates = db.collection('product_prompt_templates');
  const tenantVersions = db.collection('tenant_prompt_versions');

  const total = await source.countDocuments();
  console.log(`prompt_versions total: ${total}`);

  // ── Migrate system prompts (isTemplate: true) ───────────────────────────────
  const templateDocs = await source.find({ isTemplate: true }).toArray();
  console.log(`System prompts to migrate: ${templateDocs.length}`);

  let templateInserted = 0;
  let templateSkipped = 0;
  for (const doc of templateDocs) {
    const exists = await templates.findOne({ _id: doc._id });
    if (exists) { templateSkipped++; continue; }
    await templates.insertOne(doc);
    templateInserted++;
  }
  console.log(`product_prompt_templates: inserted=${templateInserted}, skipped=${templateSkipped}`);

  // ── Migrate tenant prompts (isTemplate: false / undefined) ──────────────────
  const tenantDocs = await source.find({ isTemplate: { $ne: true } }).toArray();
  console.log(`Tenant prompts to migrate: ${tenantDocs.length}`);

  let tenantInserted = 0;
  let tenantSkipped = 0;
  for (const doc of tenantDocs) {
    const exists = await tenantVersions.findOne({ _id: doc._id });
    if (exists) { tenantSkipped++; continue; }
    // Ensure isTemplate is explicitly false
    await tenantVersions.insertOne({ ...doc, isTemplate: false });
    tenantInserted++;
  }
  console.log(`tenant_prompt_versions: inserted=${tenantInserted}, skipped=${tenantSkipped}`);

  console.log('\nMigration complete.');
  console.log('prompt_versions is retained as a read-only legacy fallback.');
  console.log('Once verified, you may drop it with: db.prompt_versions.drop()');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
