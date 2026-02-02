// Seed Prompts Collection
// Creates industry-specific default prompts for voice and chat assistants
// Run with: node seedPrompts.js

const { MongoClient } = require('mongodb');
const { DEFAULT_PROMPTS } = require('./defaultPrompts');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

async function seedPrompts() {
  console.log('🔗 Connecting to MongoDB...');
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`✓ Connected to database: ${DB_NAME}\n`);

    // Create prompts collection if it doesn't exist
    console.log('📝 Creating prompts collection...');
    
    // Clear existing prompts
    await db.collection('prompts').deleteMany({});
    console.log('✓ Cleared existing prompts\n');

    // Insert prompts for each industry
    const promptDocuments = [];
    
    for (const [industry, channels] of Object.entries(DEFAULT_PROMPTS)) {
      promptDocuments.push({
        industry: industry,
        name: `${industry.charAt(0).toUpperCase() + industry.slice(1)} Default Prompts`,
        description: `Default prompts for ${industry} customer service assistants`,
        voice: channels.voice,
        chat: channels.chat,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    const result = await db.collection('prompts').insertMany(promptDocuments);
    console.log(`✅ Inserted ${result.insertedCount} prompt templates\n`);

    // Create indexes
    console.log('🔍 Creating indexes...');
    await db.collection('prompts').createIndex({ industry: 1 });
    await db.collection('prompts').createIndex({ isDefault: 1 });
    console.log('✓ Indexes created\n');

    // Display summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Prompts Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const industry of Object.keys(DEFAULT_PROMPTS)) {
      console.log(`\n${industry.toUpperCase()}:`);
      console.log(`  Voice Prompts:`);
      console.log(`    • System Prompt: ${DEFAULT_PROMPTS[industry].voice.systemPrompt.substring(0, 80)}...`);
      console.log(`    • Greeting: ${DEFAULT_PROMPTS[industry].voice.greeting}`);
      console.log(`    • Intent Prompts: ${Object.keys(DEFAULT_PROMPTS[industry].voice.intentPrompts).length}`);
      console.log(`  Chat Prompts:`);
      console.log(`    • System Prompt: ${DEFAULT_PROMPTS[industry].chat.systemPrompt.substring(0, 80)}...`);
      console.log(`    • Greeting: ${DEFAULT_PROMPTS[industry].chat.greeting}`);
      console.log(`    • Intent Prompts: ${Object.keys(DEFAULT_PROMPTS[industry].chat.intentPrompts).length}`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Prompts seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding prompts:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  seedPrompts();
}

module.exports = { seedPrompts };
