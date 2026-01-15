/**
 * Script to create sample assistant_channels documents
 * Run with: node scripts/create-assistant-channels.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

async function createAssistantChannels() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection('assistant_channels');

    // Sample channels for development
    const sampleChannels = [
      {
        _id: 'chan_dev_001',
        customerId: 'dev_tenant',
        productId: 'default',
        tenantId: 'dev_tenant',
        voice: {
          enabled: true,
          phoneNumber: '+15551234567',
          fallbackNumber: '+15550001111',
          businessHours: {
            timezone: 'America/New_York',
            monday: { open: '09:00', close: '17:00' },
            tuesday: { open: '09:00', close: '17:00' },
            wednesday: { open: '09:00', close: '17:00' },
            thursday: { open: '09:00', close: '17:00' },
            friday: { open: '09:00', close: '17:00' },
            saturday: null,
            sunday: null
          },
          voiceSettings: {
            language: 'en-US',
            voiceId: 'en-US-Neural2-F',
            speechRate: 1.0,
            pitch: 0.0
          },
          promptContext: {
            tenantName: 'Dev Healthcare Practice',
            tenantIndustry: 'healthcare',
            businessContext: 'A modern healthcare practice providing comprehensive care',
            tone: 'professional and empathetic',
            personality: 'helpful, patient, and detail-oriented',
            allowedActions: ['schedule_appointment', 'check_availability', 'provide_information', 'transfer_to_staff'],
            disallowedActions: ['provide_medical_diagnosis', 'prescribe_medication', 'give_legal_advice'],
            servicesOffered: ['Primary Care', 'Urgent Care', 'Preventive Care', 'Wellness Visits'],
            pricingInfo: 'Visit costs vary by insurance. Please contact billing for specific pricing.',
            locations: [
              { address: '123 Main St', city: 'Anytown', state: 'NY' }
            ],
            businessHours: 'Mon-Fri 9AM-5PM, Sat 10AM-2PM',
            faqs: [
              {
                question: 'Do you accept insurance?',
                answer: 'Yes, we accept most major insurance plans. Please call to verify your specific plan.'
              },
              {
                question: 'What should I bring to my first appointment?',
                answer: 'Please bring your insurance card, photo ID, and a list of current medications.'
              }
            ],
            policies: 'Cancellation policy: Please provide 24 hours notice. Late arrivals may need to reschedule.',
            maxResponseLength: 150,
            escalationTriggers: ['emergency', 'complaint', 'request for supervisor'],
            defaultLanguage: 'en-US'
          },
          customPrompts: {
            greeting: 'Thank you for calling Dev Healthcare Practice. How may I assist you today?',
            prohibitedTopics: ['medical diagnosis', 'prescription advice', 'legal advice'],
            complianceRules: [
              'Never provide medical diagnosis or treatment recommendations',
              'Always verify patient identity before discussing medical information',
              'Follow HIPAA guidelines for patient privacy'
            ],
            privacyPolicy: 'All conversations are confidential and HIPAA compliant.',
            sensitiveDataHandling: 'Do not request or store credit card information over voice.',
            maxConversationTurns: 20,
            logConversations: true
          },
          ragConfig: {
            enabled: false,
            sources: []
          }
        },
        chat: {
          enabled: true,
          greeting: 'Hi! How can I help you today? nuts',
          typingIndicator: true,
          maxTurns: 20,
          showIntent: false,
          allowFileUpload: false,
          promptContext: {
            tenantName: 'Dev Healthcare Practice',
            tenantIndustry: 'healthcare',
            businessContext: 'A modern healthcare practice providing comprehensive care',
            tone: 'professional and empathetic',
            personality: 'helpful, patient, and detail-oriented',
            servicesOffered: ['Primary Care', 'Urgent Care', 'Preventive Care', 'Wellness Visits'],
            businessHours: 'Mon-Fri 9AM-5PM, Sat 10AM-2PM'
          },
          customPrompts: {
            prohibitedTopics: ['medical diagnosis', 'prescription advice', 'legal advice'],
            complianceRules: [
              'Never provide medical diagnosis or treatment recommendations',
              'Follow HIPAA guidelines for patient privacy'
            ]
          }
        },
        sms: {
          enabled: false,
          phoneNumber: null,
          autoReply: true
        },
        whatsapp: {
          enabled: false,
          businessAccountId: null,
          phoneNumberId: null
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'chan_demo_001',
        customerId: 'demo_customer_001',
        productId: 'default',
        tenantId: 'demo_customer_001',
        voice: {
          enabled: false,
          phoneNumber: '+15559876543',
          voiceSettings: {
            language: 'en-US',
            voiceId: 'en-US-Neural2-A',
            speechRate: 1.0
          },
          promptContext: {
            tenantName: 'Demo Business',
            tenantIndustry: 'customer service',
            businessContext: 'A customer service organization',
            tone: 'friendly and professional',
            servicesOffered: ['Customer Support', 'Technical Help', 'Sales Inquiries'],
            businessHours: 'Mon-Fri 8AM-8PM'
          },
          customPrompts: {
            prohibitedTopics: ['political opinions', 'religious views'],
            complianceRules: ['Maintain professional tone at all times']
          },
          ragConfig: {
            enabled: false,
            sources: []
          }
        },
        chat: {
          enabled: true,
          greeting: 'Welcome to our support chat!',
          typingIndicator: true,
          maxTurns: 30,
          showIntent: true,
          allowFileUpload: true,
          promptContext: {
            tenantName: 'Demo Business',
            tenantIndustry: 'customer service',
            tone: 'friendly and professional',
            servicesOffered: ['Customer Support', 'Technical Help', 'Sales Inquiries']
          },
          customPrompts: {
            prohibitedTopics: ['political opinions', 'religious views']
          }
        },
        sms: {
          enabled: false
        },
        whatsapp: {
          enabled: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Clear existing test data
    await collection.deleteMany({
      customerId: { $in: ['dev_tenant', 'demo_customer_001'] }
    });
    console.log('✓ Cleared existing test data');

    // Insert sample channels
    const result = await collection.insertMany(sampleChannels);
    console.log(`✓ Created ${result.insertedCount} assistant channels`);

    // Display created channels
    console.log('\nCreated channels:');
    for (const channel of sampleChannels) {
      console.log(`\n  Customer: ${channel.customerId}`);
      console.log(`  Voice: ${channel.voice.enabled ? '✓ Enabled' : '✗ Disabled'} ${channel.voice.phoneNumber || ''}`);
      console.log(`  Chat: ${channel.chat.enabled ? '✓ Enabled' : '✗ Disabled'}`);
      console.log(`  SMS: ${channel.sms.enabled ? '✓ Enabled' : '✗ Disabled'}`);
      console.log(`  WhatsApp: ${channel.whatsapp.enabled ? '✓ Enabled' : '✗ Disabled'}`);
    }

    // Create index on customerId
    await collection.createIndex({ customerId: 1 }, { unique: true });
    console.log('\n✓ Created index on customerId');

    // Create index on voice.phoneNumber
    await collection.createIndex({ 'voice.phoneNumber': 1 }, { sparse: true });
    console.log('✓ Created index on voice.phoneNumber');

  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✓ Database connection closed');
  }
}

createAssistantChannels();
