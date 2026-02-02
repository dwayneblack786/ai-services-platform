import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';

async function cleanupOldTemplates() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🧹 Cleaning up old prompt templates...\n');
    await client.connect();
    const db = client.db(DB_NAME);

    // Get all templates
    const allTemplates = await db.collection('prompt_templates').find({}).toArray();
    console.log(`📊 Found ${allTemplates.length} total templates\n`);

    // Identify templates to keep (those with comprehensive promptContext)
    const templatesToKeep = allTemplates.filter(t => {
      const hasPromptContext = t.promptContext && typeof t.promptContext === 'object';
      const hasComprehensiveFields = hasPromptContext && (
        t.promptContext.tenantName ||
        t.promptContext.servicesOffered ||
        t.promptContext.locations ||
        t.promptContext.faqs
      );
      return hasComprehensiveFields;
    });

    // Identify templates to delete (old templates without comprehensive structure)
    const templatesToDelete = allTemplates.filter(t => {
      const hasPromptContext = t.promptContext && typeof t.promptContext === 'object';
      const hasComprehensiveFields = hasPromptContext && (
        t.promptContext.tenantName ||
        t.promptContext.servicesOffered ||
        t.promptContext.locations ||
        t.promptContext.faqs
      );
      return !hasComprehensiveFields;
    });

    console.log('📋 Analysis:');
    console.log(`  ✅ Keep: ${templatesToKeep.length} templates (with comprehensive structure)`);
    console.log(`  ❌ Delete: ${templatesToDelete.length} templates (old/incomplete structure)\n`);

    if (templatesToDelete.length === 0) {
      console.log('✅ No old templates to delete. Database is clean!\n');
      return;
    }

    // Show what will be deleted
    console.log('🗑️  Templates to be deleted:');
    templatesToDelete.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.name || 'Unnamed'}`);
      console.log(`     - ID: ${t._id}`);
      console.log(`     - Industry: ${t.industry || 'N/A'}`);
      console.log(`     - IsDefault: ${t.isDefault}`);
    });

    console.log('\n📦 Templates to keep:');
    templatesToKeep.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.name || 'Unnamed'}`);
      console.log(`     - ID: ${t._id}`);
      console.log(`     - Industry: ${t.industry || 'N/A'}`);
      console.log(`     - IsDefault: ${t.isDefault}`);
      console.log(`     - Customer: ${t.customerId || '(system default)'}`);
      console.log(`     - Tenant Name: ${t.promptContext?.tenantName}`);
      console.log(`     - Services: ${t.promptContext?.servicesOffered?.length || 0} items`);
    });

    // Delete old templates
    const idsToDelete = templatesToDelete.map(t => t._id);
    
    console.log(`\n🗑️  Deleting ${idsToDelete.length} old templates...`);
    const result = await db.collection('prompt_templates').deleteMany({
      _id: { $in: idsToDelete }
    });

    console.log(`✅ Deleted ${result.deletedCount} templates\n`);

    // Verify final state
    const remainingTemplates = await db.collection('prompt_templates').find({}).toArray();
    console.log('='.repeat(70));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📊 Final State:');
    console.log(`   Total templates: ${remainingTemplates.length}`);
    console.log('   All templates have comprehensive structure: ✅\n');

    remainingTemplates.forEach((t, i) => {
      console.log(`${i + 1}. ${t.name}`);
      console.log(`   - Industry: ${t.industry}`);
      console.log(`   - IsDefault: ${t.isDefault}`);
      console.log(`   - Customer: ${t.customerId || '(system default)'}`);
      console.log(`   - Comprehensive: ✅ (${t.promptContext?.servicesOffered?.length || 0} services, ${t.promptContext?.faqs?.length || 0} FAQs)`);
      console.log('');
    });

    console.log(`${'='.repeat(70)  }\n`);

  } catch (error) {
    console.error('❌ Error cleaning up templates:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ Database connection closed\n');
  }
}

cleanupOldTemplates()
  .then(() => {
    console.log('✅ Cleanup completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
