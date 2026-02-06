/**
 * Verify and fix prompt data integrity
 * - Check if all prompts have productId
 * - Check if tenant bindings exist for tenant prompts
 * - Update lastScore from latest test results
 */

import mongoose from 'mongoose';
import PromptVersion from '../models/PromptVersion';
import TenantPromptBinding from '../models/TenantPromptBinding';
import PromptTestResult from '../models/PromptTestResult';

async function verifyPromptData() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai-services';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Check prompts with tenantId but no productId
    const promptsWithoutProduct = await PromptVersion.find({
      tenantId: { $exists: true, $ne: null },
      productId: { $exists: false }
    });

    console.log(`\n📊 Prompts with tenantId but no productId: ${promptsWithoutProduct.length}`);
    if (promptsWithoutProduct.length > 0) {
      console.log('⚠️  These prompts need a productId:');
      promptsWithoutProduct.forEach(p => {
        console.log(`   - ${p._id} (${p.name}) - tenantId: ${p.tenantId}`);
      });
    }

    // 2. Check tenant bindings and update lastScore
    const bindings = await TenantPromptBinding.find({});
    console.log(`\n📊 Total tenant bindings: ${bindings.length}`);

    let updated = 0;
    for (const binding of bindings) {
      if (binding.currentDraftId) {
        // Find latest test result for this prompt
        const latestTest = await PromptTestResult.findOne({
          promptVersionId: binding.currentDraftId
        }).sort({ executedAt: -1 });

        if (latestTest && latestTest.overallScore !== binding.lastScore) {
          console.log(`   Updating binding ${binding.channelType} for product ${binding.productId}`);
          console.log(`   Old score: ${binding.lastScore}, New score: ${latestTest.overallScore}`);

          binding.lastScore = latestTest.overallScore;
          await binding.save();
          updated++;
        }
      }
    }

    console.log(`\n✅ Updated ${updated} bindings with latest test scores`);

    // 3. Check prompts with test results
    const promptsWithTests = await PromptTestResult.distinct('promptVersionId');
    console.log(`\n📊 Prompts with test results: ${promptsWithTests.length}`);

    // 4. Specific check for the prompt in question
    const targetPromptId = '698361132d59c6b650f2fa1b';
    const targetPrompt = await PromptVersion.findById(targetPromptId);

    if (targetPrompt) {
      console.log(`\n🔍 Checking target prompt: ${targetPromptId}`);
      console.log(`   Name: ${targetPrompt.name}`);
      console.log(`   TenantId: ${targetPrompt.tenantId}`);
      console.log(`   ProductId: ${targetPrompt.productId}`);
      console.log(`   ChannelType: ${targetPrompt.channelType}`);
      console.log(`   State: ${targetPrompt.state}`);

      // Check if binding exists
      if (targetPrompt.tenantId && targetPrompt.productId) {
        const binding = await TenantPromptBinding.findOne({
          tenantId: targetPrompt.tenantId,
          productId: targetPrompt.productId,
          channelType: targetPrompt.channelType
        });

        if (binding) {
          console.log(`   ✅ Binding exists`);
          console.log(`   Binding lastScore: ${binding.lastScore}`);
          console.log(`   Binding scoreThreshold: ${binding.scoreThreshold}`);
        } else {
          console.log(`   ⚠️  No binding found - creating one...`);
          const newBinding = new TenantPromptBinding({
            tenantId: targetPrompt.tenantId,
            productId: targetPrompt.productId,
            channelType: targetPrompt.channelType,
            currentDraftId: targetPrompt._id,
            scoreThreshold: 70,
            pulledTemplateIds: targetPrompt.baseTemplateId ? [targetPrompt.baseTemplateId] : []
          });
          await newBinding.save();
          console.log(`   ✅ Created binding`);
        }
      }

      // Check for test results
      const testResults = await PromptTestResult.find({
        promptVersionId: targetPromptId
      }).sort({ executedAt: -1 });

      console.log(`   Test results found: ${testResults.length}`);
      if (testResults.length > 0) {
        const latest = testResults[0];
        console.log(`   Latest score: ${latest.overallScore}%`);
        console.log(`   Executed at: ${latest.executedAt}`);
        console.log(`   Blocks promotion: ${latest.blocksPromotion}`);
      }
    } else {
      console.log(`\n❌ Target prompt ${targetPromptId} not found`);
    }

    console.log('\n✅ Verification complete');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  verifyPromptData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default verifyPromptData;
