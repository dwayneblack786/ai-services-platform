import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';
const TEST_CUSTOMER_ID = 'ten-splendor-florida-33064';

/**
 * Simulate the API logic: Load from prompt_templates when no assistant_channels exists
 */
async function loadDefaultPromptTemplate(db: any, customerId: string, industry?: string) {
  // Try to find a template for this customer first
  let template = await db.collection('prompt_templates').findOne({
    customerId,
    isDefault: false
  });

  // If no customer template, try to find industry template
  if (!template && industry) {
    template = await db.collection('prompt_templates').findOne({
      industry: industry.toLowerCase(),
      isDefault: true
    });
  }

  // If still no template, get any default template
  if (!template) {
    template = await db.collection('prompt_templates').findOne({
      isDefault: true
    });
  }

  return template;
}

async function testPromptLoading() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🧪 Testing Prompt Configuration Loading Logic\n');
    console.log('='.repeat(70));
    
    await client.connect();
    const db = client.db(DB_NAME);

    // Step 1: Check assistant_channels
    console.log('\n📋 Step 1: Check assistant_channels collection...');
    const assistantChannel = await db.collection('assistant_channels').findOne({
      customerId: TEST_CUSTOMER_ID
    });

    if (assistantChannel) {
      console.log('✅ Found user configuration in assistant_channels');
      console.log('   - Document ID:', assistantChannel._id);
      console.log('   - Tenant Name:', assistantChannel.voice?.promptContext?.tenantName);
      console.log('   - Services:', assistantChannel.voice?.promptContext?.servicesOffered?.length, 'items');
      console.log('\n✅ RESULT: Load from assistant_channels (user\'s customizations)');
    } else {
      console.log('❌ No user configuration found in assistant_channels');
      
      // Step 2: Load from prompt_templates
      console.log('\n📋 Step 2: Load default from prompt_templates...');
      const template = await loadDefaultPromptTemplate(db, TEST_CUSTOMER_ID);
      
      if (template) {
        console.log('✅ Found template in prompt_templates');
        console.log('   - Template ID:', template._id);
        console.log('   - Template Name:', template.name);
        console.log('   - Is Default:', template.isDefault);
        console.log('   - Customer ID:', template.customerId || '(none - system default)');
        console.log('   - Tenant Name:', template.promptContext?.tenantName);
        console.log('   - Services:', template.promptContext?.servicesOffered?.length, 'items');
        console.log('   - FAQs:', template.promptContext?.faqs?.length, 'items');
        console.log('\n✅ RESULT: Load from prompt_templates (default configuration)');
      } else {
        console.log('❌ No template found - will use hardcoded defaults');
      }
    }

    // Step 3: Show both templates
    console.log('\n' + '='.repeat(70));
    console.log('📚 Available Templates:');
    console.log('='.repeat(70));
    
    const templates = await db.collection('prompt_templates').find({}).toArray();
    console.log('\nTotal templates:', templates.length);
    
    templates.forEach((t, i) => {
      console.log(`\n${i + 1}. ${t.name}`);
      console.log('   - ID:', t._id.toString());
      console.log('   - Industry:', t.industry);
      console.log('   - IsDefault:', t.isDefault);
      console.log('   - Customer:', t.customerId || '(system default)');
      console.log('   - Tenant Name:', t.promptContext?.tenantName);
      console.log('   - Services:', t.promptContext?.servicesOffered?.length, 'items');
    });

    console.log('\n' + '='.repeat(70));
    console.log('🔄 Workflow Summary:');
    console.log('='.repeat(70));
    console.log('\n1️⃣  GET /api/assistant-channels');
    console.log('   → Check assistant_channels for user config');
    console.log('   → If not found, load from prompt_templates');
    console.log('   → Return config (do NOT save to DB yet)');
    console.log('\n2️⃣  User edits configuration in UI');
    console.log('\n3️⃣  PATCH /api/assistant-channels');
    console.log('   → Save to assistant_channels (creates if not exists)');
    console.log('   → User now has custom configuration');
    console.log('\n4️⃣  Future GET requests');
    console.log('   → Load from assistant_channels (user\'s version)');
    console.log('   → prompt_templates remains as read-only defaults');
    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testPromptLoading();
