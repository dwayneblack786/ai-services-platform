/**
 * Seed Session Menu Test Data
 *
 * Creates sample data for testing the dynamic session menu:
 * - 3 production prompt versions
 * - Tenant prompt bindings linking them
 * - No assistant_channels needed (we're using PMS prompts now)
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform'; // Master database - ai-services has been deleted

// Test data configuration
const TENANT_ID = 'tenant-default';
const PRODUCT_ID = 'va-service'; // Use string productId to match system behavior
const USER_INFO = {
  userId: 'test-user-123',
  name: 'Test Admin',
  email: 'admin@test.com',
  role: 'TENANT_ADMIN'
};

async function seedTestData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Clear existing test data
    console.log('🗑️  Clearing existing test data...');
    await db.collection('prompt_versions').deleteMany({ tenantId: TENANT_ID });
    await db.collection('tenant_prompt_bindings').deleteMany({ tenantId: TENANT_ID });
    console.log('   ✅ Cleared\n');

    // Create 3 production prompts
    console.log('📝 Creating production prompts...');

    const promptIds = [
      new ObjectId(),
      new ObjectId(),
      new ObjectId()
    ];

    const prompts = [
      {
        _id: promptIds[0],
        promptId: promptIds[0],
        version: 1,
        name: 'Sales Inquiry',
        description: 'Handle sales-related questions and product information',
        category: 'sales',
        channelType: 'chat',
        icon: '💰',
        tenantId: TENANT_ID,
        productId: PRODUCT_ID,
        content: {
          systemPrompt: 'You are a helpful sales assistant.',
          persona: {
            tone: 'friendly',
            personality: 'helpful and enthusiastic',
            allowedActions: ['answer questions', 'provide pricing'],
            disallowedActions: ['make promises']
          },
          businessContext: {
            servicesOffered: ['Product sales', 'Pricing information'],
            pricingInfo: 'Contact for custom pricing',
            policies: 'Standard return policy applies'
          },
          conversationBehavior: {
            greeting: 'Hi! I can help with sales inquiries.',
            fallbackMessage: 'I\'m not sure about that. Let me get a sales rep for you.'
          },
          constraints: {
            prohibitedTopics: ['medical advice', 'legal advice']
          }
        },
        state: 'production',
        environment: 'production',
        isActive: true,
        isTemplate: false,
        createdBy: USER_INFO,
        createdAt: new Date(),
        canRollback: false,
        isDeleted: false
      },
      {
        _id: promptIds[1],
        promptId: promptIds[1],
        version: 1,
        name: 'Technical Support',
        description: 'Provide technical assistance and troubleshooting',
        category: 'support',
        channelType: 'chat',
        icon: '🛠️',
        tenantId: TENANT_ID,
        productId: PRODUCT_ID,
        content: {
          systemPrompt: 'You are a technical support specialist.',
          persona: {
            tone: 'professional',
            personality: 'patient and knowledgeable',
            allowedActions: ['troubleshoot', 'provide instructions'],
            disallowedActions: ['access customer accounts']
          },
          businessContext: {
            servicesOffered: ['Technical troubleshooting', 'Setup assistance'],
            policies: 'Follow security protocols'
          },
          conversationBehavior: {
            greeting: 'Hello! I\'m here to help with technical issues.',
            fallbackMessage: 'Let me escalate this to a senior technician.'
          },
          constraints: {
            prohibitedTopics: ['account access', 'password resets']
          }
        },
        state: 'production',
        environment: 'production',
        isActive: true,
        isTemplate: false,
        createdBy: USER_INFO,
        createdAt: new Date(),
        canRollback: false,
        isDeleted: false
      },
      {
        _id: promptIds[2],
        promptId: promptIds[2],
        version: 1,
        name: 'Billing Questions',
        description: 'Answer billing and payment-related inquiries',
        category: 'billing',
        channelType: 'chat',
        icon: '💳',
        tenantId: TENANT_ID,
        productId: PRODUCT_ID,
        content: {
          systemPrompt: 'You are a billing support specialist.',
          persona: {
            tone: 'courteous',
            personality: 'understanding and helpful',
            allowedActions: ['explain charges', 'provide invoice info'],
            disallowedActions: ['process refunds']
          },
          businessContext: {
            servicesOffered: ['Billing inquiries', 'Invoice requests'],
            policies: 'Refunds processed within 30 days'
          },
          conversationBehavior: {
            greeting: 'Hi! I can assist with billing questions.',
            fallbackMessage: 'I\'ll need to transfer you to accounting.'
          },
          constraints: {
            prohibitedTopics: ['legal disputes']
          }
        },
        state: 'production',
        environment: 'production',
        isActive: true,
        isTemplate: false,
        createdBy: USER_INFO,
        createdAt: new Date(),
        canRollback: false,
        isDeleted: false
      }
    ];

    await db.collection('prompt_versions').insertMany(prompts);
    console.log(`   ✅ Created ${prompts.length} production prompts\n`);

    // Create tenant prompt bindings
    console.log('🔗 Creating tenant prompt bindings...');

    const bindings = promptIds.map(promptId => ({
      tenantId: TENANT_ID,
      productId: PRODUCT_ID,
      channelType: 'chat',
      activeProductionId: promptId,
      pulledTemplateIds: [],
      scoreThreshold: 90,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await db.collection('tenant_prompt_bindings').insertMany(bindings);
    console.log(`   ✅ Created ${bindings.length} bindings\n`);

    // Display summary
    console.log('📊 Summary:');
    console.log(`   Tenant ID: ${TENANT_ID}`);
    console.log(`   Product ID: ${PRODUCT_ID}`);
    console.log(`   Prompts created: ${prompts.length}`);
    console.log(`   Bindings created: ${bindings.length}\n`);

    console.log('🎯 Menu Options that will be generated:');
    prompts.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.icon} ${p.name}`);
      console.log(`      ID: ${p._id}`);
      console.log(`      DTMF Key: ${idx + 1}`);
    });

    console.log('\n✅ Test data seeded successfully!\n');
    console.log('💡 Next steps:');
    console.log('   1. Update chat-routes.ts to use the correct productId');
    console.log(`   2. Use productId: "${PRODUCT_ID}" in session init`);
    console.log('   3. Start backend and test the chat UI\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedTestData();
