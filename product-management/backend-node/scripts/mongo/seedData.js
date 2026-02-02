// Seed Data for Voice + Chat Assistants Testing
// Run with: node seedData.js

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

async function seedData() {
  console.log('🔗 Connecting to MongoDB...');
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`✓ Connected to database: ${DB_NAME}\n`);

    // Clear existing test data
    console.log('🗑️  Clearing existing test data...');
    await db.collection('customers').deleteMany({ _id: { $regex: /^test_/ } });
    await db.collection('assistant_channels').deleteMany({ customerId: { $regex: /^test_/ } });
    await db.collection('assistant_calls').deleteMany({ customerId: { $regex: /^test_/ } });
    await db.collection('assistant_chats').deleteMany({ customerId: { $regex: /^test_/ } });
    await db.collection('products').deleteMany({ _id: { $regex: /^test_/ } });
    await db.collection('subscriptions').deleteMany({ customerId: { $regex: /^test_/ } });
    await db.collection('users').deleteMany({ customerId: { $regex: /^test_/ } });
    console.log('✓ Test data cleared\n');

    // Customer
    console.log('📊 Inserting test customer...');
    await db.collection('customers').insertOne({
      _id: "test_cust_001",
      name: "Acme Health",
      industry: "healthcare",
      contact: { 
        email: "admin@acmehealth.com",
        phone: "+15559876543"
      },
      billing: { 
        billing_email: "billing@acmehealth.com",
        payment_method: "credit_card"
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✓ Customer created: Acme Health\n');

    // Assistant Channels
    console.log('🤖 Inserting assistant channels...');
    await db.collection('assistant_channels').insertOne({
      _id: "test_chan_001",
      customerId: "test_cust_001",
      voice: {
        enabled: true,
        phoneNumber: "+15551234567",
        fallbackNumber: "+15550001111",
        businessHours: {
          timezone: "America/New_York",
          monday: { open: "09:00", close: "17:00" },
          tuesday: { open: "09:00", close: "17:00" },
          wednesday: { open: "09:00", close: "17:00" },
          thursday: { open: "09:00", close: "17:00" },
          friday: { open: "09:00", close: "17:00" },
          saturday: undefined,
          sunday: undefined
        },
        voiceSettings: {
          language: "en-US",
          voiceId: "female_1",
          speed: 1.0
        }
      },
      chat: {
        enabled: true,
        greeting: "Hi! I'm the Acme Health virtual assistant. How can I help you today?",
        typingIndicator: true,
        maxTurns: 20,
        showIntent: false,
        allowFileUpload: false
      },
      sms: {
        enabled: false
      },
      whatsapp: {
        enabled: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✓ Assistant channels configured (Voice + Chat enabled)\n');

    // Products
    console.log('🛍️  Inserting test products...');
    await db.collection('products').insertMany([
      {
        _id: "test_prod_voice_va",
        name: "Voice Assistant",
        category: "Virtual Assistant",
        subCategory: "Healthcare",
        description: "AI-powered voice assistant for healthcare providers",
        features: [
          "24/7 availability",
          "Appointment scheduling",
          "Patient inquiries",
          "Medical terminology understanding",
          "HIPAA compliant"
        ],
        pricing: {
          model: "subscription",
          currency: "USD",
          tiers: [
            {
              name: "small",
              displayName: "Starter",
              description: "For small practices",
              price: 49.99,
              features: ["Up to 500 calls/month", "Basic features"]
            },
            {
              name: "medium",
              displayName: "Professional",
              description: "For growing practices",
              price: 99.99,
              features: ["Up to 2000 calls/month", "Advanced features"]
            }
          ]
        },
        industries: ["Healthcare", "Medical"],
        status: "active",
        tags: ["voice", "ai", "healthcare", "appointments"],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: "test_prod_chat_va",
        name: "Chat Assistant",
        category: "Virtual Assistant",
        subCategory: "Healthcare",
        description: "AI-powered chat assistant for patient engagement",
        features: [
          "Real-time chat",
          "Multi-language support",
          "FAQ handling",
          "Appointment booking",
          "Patient data integration"
        ],
        pricing: {
          model: "subscription",
          currency: "USD",
          tiers: [
            {
              name: "small",
              displayName: "Basic",
              description: "For small clinics",
              price: 29.99,
              features: ["Up to 1000 messages/month", "Basic features"]
            },
            {
              name: "medium",
              displayName: "Pro",
              description: "For larger practices",
              price: 59.99,
              features: ["Up to 5000 messages/month", "Advanced features"]
            }
          ]
        },
        industries: ["Healthcare", "Medical"],
        status: "active",
        tags: ["chat", "ai", "healthcare", "messaging"],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log('✓ Products created: Voice Assistant, Chat Assistant\n');

    // Subscriptions
    console.log('📝 Inserting test subscriptions...');
    await db.collection('subscriptions').insertMany([
      {
        _id: "test_sub_voice_001",
        customerId: "test_cust_001",
        productId: "test_prod_voice_va",
        status: "active",
        billingCycle: "monthly",
        usage: { 
          conversations: 125,
          limit: 500
        },
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: "test_sub_chat_001",
        customerId: "test_cust_001",
        productId: "test_prod_chat_va",
        status: "active",
        billingCycle: "monthly",
        usage: { 
          messages: 387,
          limit: 1000
        },
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log('✓ Subscriptions created: 2 active\n');

    // Sample Voice Call
    console.log('📞 Inserting sample voice call...');
    await db.collection('assistant_calls').insertOne({
      _id: new ObjectId(),
      customerId: "test_cust_001",
      assistantPhoneNumber: "+15551234567",
      callerNumber: "+15559998888",
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() - 3300000),   // 55 minutes ago
      duration: 300, // 5 minutes
      status: "completed",
      transcript: [
        {
          speaker: "assistant",
          message: "Hello, this is Acme Health. How can I help you today?",
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          speaker: "caller",
          message: "Hi, I'd like to schedule an appointment with Dr. Smith.",
          timestamp: new Date(Date.now() - 3590000)
        },
        {
          speaker: "assistant",
          message: "I'd be happy to help you schedule an appointment with Dr. Smith. What date works best for you?",
          timestamp: new Date(Date.now() - 3580000)
        },
        {
          speaker: "caller",
          message: "How about next Tuesday afternoon?",
          timestamp: new Date(Date.now() - 3570000)
        },
        {
          speaker: "assistant",
          message: "I have availability on Tuesday at 2 PM or 3:30 PM. Which time would you prefer?",
          timestamp: new Date(Date.now() - 3560000)
        },
        {
          speaker: "caller",
          message: "2 PM works great.",
          timestamp: new Date(Date.now() - 3550000)
        },
        {
          speaker: "assistant",
          message: "Perfect! I've scheduled your appointment with Dr. Smith for Tuesday at 2 PM. You'll receive a confirmation email shortly.",
          timestamp: new Date(Date.now() - 3540000)
        }
      ],
      detectedIntent: "schedule_appointment",
      extractedSlots: {
        doctor: "Dr. Smith",
        date: "next Tuesday",
        time: "2 PM"
      },
      usage: {
        sttSeconds: 45,
        llmTokensIn: 256,
        llmTokensOut: 178,
        ttsCharacters: 432,
        cost: 0.12
      },
      createdAt: new Date(Date.now() - 3600000)
    });
    console.log('✓ Sample voice call created\n');

    // Sample Chat Session
    console.log('💬 Inserting sample chat session...');
    await db.collection('assistant_chats').insertOne({
      _id: new ObjectId(),
      customerId: "test_cust_001",
      sessionId: "chat_sess_" + Date.now(),
      startTime: new Date(Date.now() - 1800000), // 30 minutes ago
      endTime: new Date(Date.now() - 1500000),   // 25 minutes ago
      duration: 300, // 5 minutes
      status: "completed",
      messages: [
        {
          speaker: "assistant",
          message: "Hi! I'm the Acme Health virtual assistant. How can I help you today?",
          timestamp: new Date(Date.now() - 1800000)
        },
        {
          speaker: "user",
          message: "What are your office hours?",
          timestamp: new Date(Date.now() - 1790000)
        },
        {
          speaker: "assistant",
          message: "Our office hours are Monday through Friday, 9 AM to 5 PM EST. We're closed on weekends.",
          timestamp: new Date(Date.now() - 1780000)
        },
        {
          speaker: "user",
          message: "Do you accept walk-ins?",
          timestamp: new Date(Date.now() - 1770000)
        },
        {
          speaker: "assistant",
          message: "We do accept walk-ins, but we recommend scheduling an appointment to minimize wait times. Would you like me to help you schedule one?",
          timestamp: new Date(Date.now() - 1760000)
        },
        {
          speaker: "user",
          message: "No, that's all I needed. Thanks!",
          timestamp: new Date(Date.now() - 1750000)
        }
      ],
      detectedIntent: "business_hours_inquiry",
      extractedSlots: {
        inquiry_type: "office_hours"
      },
      usage: {
        llmTokensIn: 189,
        llmTokensOut: 134,
        cost: 0.05
      },
      createdAt: new Date(Date.now() - 1800000)
    });
    console.log('✓ Sample chat session created\n');

    // Users
    console.log('👥 Inserting test user...');
    await db.collection('users').insertOne({
      _id: "test_user_001",
      customerId: "test_cust_001",
      email: "admin@acmehealth.com",
      passwordHash: "$2b$10$hashedPasswordHere", // In production, use bcrypt
      role: "admin",
      firstName: "John",
      lastName: "Doe",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✓ User created: admin@acmehealth.com\n');

    console.log('✅ All seed data inserted successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Summary:');
    console.log('   • Customer: Acme Health (test_cust_001)');
    console.log('   • Channels: Voice + Chat enabled');
    console.log('   • Products: 2 (Voice & Chat Assistants)');
    console.log('   • Subscriptions: 2 active');
    console.log('   • Sample Voice Call: 1 completed');
    console.log('   • Sample Chat Session: 1 completed');
    console.log('   • User: admin@acmehealth.com');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  seedData();
}

module.exports = { seedData };
