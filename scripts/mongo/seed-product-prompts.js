/**
 * Seed Product Prompts
 * Creates prompts and bindings for a specific product
 *
 * ⚠️  WARNING: This script is for INITIAL SETUP ONLY
 * - Do NOT run this on production data without reviewing existing prompts first
 * - This will DELETE all existing prompts for the configured tenantId/productId
 * - Use only for setting up new tenants or testing environments
 * - Production prompts should be managed through the PMS UI or API
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform'; // Changed from 'ai-services' to match backend

// Configuration - EDIT THESE VALUES
const CONFIG = {
  tenantId: 'tenant-default',
  productId: new ObjectId('69728bdb0959e1a2da517684'), // Use ObjectId
  productName: 'Virtual Assistant Service',
  userInfo: {
    userId: 'admin-user',
    name: 'System Admin',
    email: 'admin@example.com',
    role: 'TENANT_ADMIN'
  }
};

// Prompt templates
const PROMPTS = [
  {
    name: 'Customer Support Chat',
    description: 'Handle customer support inquiries via chat',
    category: 'support',
    channelType: 'chat',
    icon: '💬',
    content: {
      systemPrompt: 'You are a helpful customer support assistant. Be friendly, professional, and solution-oriented.',
      persona: {
        tone: 'friendly',
        personality: 'helpful and empathetic',
        allowedActions: ['answer questions', 'troubleshoot issues', 'escalate to human'],
        disallowedActions: ['make refunds', 'access accounts']
      },
      businessContext: {
        servicesOffered: ['Customer support', 'Product information', 'Technical assistance'],
        policies: 'Always prioritize customer satisfaction'
      },
      conversationBehavior: {
        greeting: 'Hello! How can I assist you today?',
        fallbackMessage: 'I\'m not sure about that. Let me connect you with a specialist.'
      },
      constraints: {
        prohibitedTopics: ['medical advice', 'legal advice']
      }
    }
  },
  {
    name: 'Sales Inquiry Chat',
    description: 'Handle sales and product questions via chat',
    category: 'sales',
    channelType: 'chat',
    icon: '💰',
    content: {
      systemPrompt: 'You are a sales assistant focused on helping customers understand products and pricing.',
      persona: {
        tone: 'enthusiastic',
        personality: 'helpful and knowledgeable',
        allowedActions: ['provide product info', 'explain pricing', 'schedule demos'],
        disallowedActions: ['make promises', 'offer discounts']
      },
      businessContext: {
        servicesOffered: ['Product demonstrations', 'Pricing information', 'Sales consultations'],
        pricingInfo: 'Contact sales team for custom pricing'
      },
      conversationBehavior: {
        greeting: 'Hi! I can help you learn about our products and services.',
        fallbackMessage: 'Let me connect you with our sales team for more details.'
      },
      constraints: {
        prohibitedTopics: ['confidential information']
      }
    }
  },
  {
    name: 'Customer Support Voice',
    description: 'Handle customer support via voice calls',
    category: 'support',
    channelType: 'voice',
    icon: '📞',
    content: {
      systemPrompt: 'You are a voice customer support assistant. Keep responses concise and clear for voice conversations.',
      persona: {
        tone: 'professional',
        personality: 'calm and patient',
        allowedActions: ['answer questions', 'provide instructions', 'transfer calls'],
        disallowedActions: ['access customer accounts']
      },
      businessContext: {
        servicesOffered: ['Phone support', 'Technical guidance', 'Account inquiries'],
        policies: 'Verify customer identity before providing account information'
      },
      conversationBehavior: {
        greeting: 'Thank you for calling. How may I help you?',
        fallbackMessage: 'Let me transfer you to the appropriate department.'
      },
      constraints: {
        prohibitedTopics: ['account passwords', 'payment details']
      }
    }
  }
];

async function seedProductPrompts() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // 1. Create or verify product exists
    console.log('📦 Step 1: Checking/Creating product...');
    const existingProduct = await db.collection('products').findOne({
      _id: CONFIG.productId
    });

    if (!existingProduct) {
      await db.collection('products').insertOne({
        _id: CONFIG.productId,
        productId: CONFIG.productId.toString(), // Also store as string for compatibility
        name: CONFIG.productName,
        type: 'virtual-assistant',
        createdAt: new Date(),
        isActive: true
      });
      console.log('   ✅ Product created:', CONFIG.productId);
    } else {
      console.log('   ✅ Product already exists:', CONFIG.productId);
    }

    // 2. Clear existing data for this product
    console.log('\n🗑️  Step 2: Clearing existing prompts and bindings...');
    const deletePromptsResult = await db.collection('prompt_versions').deleteMany({
      tenantId: CONFIG.tenantId,
      productId: CONFIG.productId
    });
    const deleteBindingsResult = await db.collection('tenant_prompt_bindings').deleteMany({
      tenantId: CONFIG.tenantId,
      productId: CONFIG.productId
    });
    console.log('   Deleted', deletePromptsResult.deletedCount, 'prompts');
    console.log('   Deleted', deleteBindingsResult.deletedCount, 'bindings');

    // 3. Create prompts
    console.log('\n📝 Step 3: Creating prompt versions...');
    const createdPrompts = [];

    for (const promptTemplate of PROMPTS) {
      const promptId = new ObjectId();

      const prompt = {
        _id: promptId,
        promptId: promptId,
        version: 1,
        name: promptTemplate.name,
        description: promptTemplate.description,
        category: promptTemplate.category,
        channelType: promptTemplate.channelType,
        icon: promptTemplate.icon,
        tenantId: CONFIG.tenantId,
        productId: CONFIG.productId,
        content: promptTemplate.content,
        state: 'production',
        environment: 'production',
        isActive: true,
        isTemplate: false,
        createdBy: CONFIG.userInfo,
        createdAt: new Date(),
        canRollback: false,
        isDeleted: false
      };

      await db.collection('prompt_versions').insertOne(prompt);
      createdPrompts.push(prompt);
      console.log('   ✅ Created:', promptTemplate.name, '(', promptTemplate.channelType, ')');
    }

    // 4. Create tenant prompt bindings
    console.log('\n🔗 Step 4: Creating tenant prompt bindings...');
    const bindings = createdPrompts.map(prompt => ({
      tenantId: CONFIG.tenantId,
      productId: CONFIG.productId,
      channelType: prompt.channelType,
      activeProductionId: prompt._id,
      pulledTemplateIds: [],
      scoreThreshold: 90,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await db.collection('tenant_prompt_bindings').insertMany(bindings);
    console.log('   ✅ Created', bindings.length, 'bindings');

    // 5. Summary
    console.log('\n📊 Summary:');
    console.log('   Tenant ID:', CONFIG.tenantId);
    console.log('   Product ID:', CONFIG.productId);
    console.log('   Product Name:', CONFIG.productName);
    console.log('   Prompts created:', createdPrompts.length);
    console.log('   Bindings created:', bindings.length);
    console.log();

    console.log('🎯 Menu Options that will be generated:');
    const chatPrompts = createdPrompts.filter(p => p.channelType === 'chat');
    const voicePrompts = createdPrompts.filter(p => p.channelType === 'voice');

    console.log('\n   Chat Channel (', chatPrompts.length, 'prompts):');
    chatPrompts.forEach((p, idx) => {
      console.log('      ', idx + 1, '.', p.icon, p.name);
      console.log('          ID:', p._id);
    });

    console.log('\n   Voice Channel (', voicePrompts.length, 'prompts):');
    voicePrompts.forEach((p, idx) => {
      console.log('      ', idx + 1, '.', p.icon, p.name);
      console.log('          ID:', p._id);
    });

    console.log('\n✅ Setup complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Start backend: npm start');
    console.log('   2. Open chat UI for product:', CONFIG.productId);
    console.log('   3. You should see', chatPrompts.length, 'option bubbles in chat');
    console.log('   4. Voice channel will have', voicePrompts.length, 'option(s)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedProductPrompts();
