import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';  // Changed from 'assistants' to match actual database
const TEST_CUSTOMER_ID = 'ten-splendor-florida-33064';

async function seedPromptConfiguration() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('Connected to MongoDB');

    // Step 1: Create comprehensive prompt template
    console.log('\nCreating prompt template...');
    
    const promptTemplate = {
      name: 'Acme Healthcare - Comprehensive Template',
      description: 'Complete business configuration for Acme Healthcare voice and chat assistants',
      customerId: TEST_CUSTOMER_ID,
      industry: 'healthcare',
      isDefault: false,
      
      // Business Identity & Context
      promptContext: {
        tenantName: 'Acme Healthcare',
        tenantIndustry: 'Healthcare',
        businessContext: 'We are a comprehensive healthcare provider offering primary care, urgent care, and specialized services to patients in South Florida.',
        
        // Role/Persona
        tone: 'professional and empathetic',
        personality: 'patient, detail-oriented, and committed to providing accurate healthcare information',
        allowedActions: [
          'schedule_appointment',
          'check_appointment_status',
          'provide_directions',
          'explain_services',
          'verify_insurance',
          'transfer_to_nurse'
        ],
        disallowedActions: [
          'give_medical_diagnosis',
          'prescribe_medication',
          'access_medical_records',
          'provide_test_results'
        ],
        
        // Static Business Knowledge
        servicesOffered: [
          'Primary Care',
          'Urgent Care',
          'Telehealth Consultations',
          'Laboratory Services',
          'Radiology & Imaging',
          'Physical Therapy'
        ],
        pricingInfo: 'We accept most major insurance plans. Self-pay rates are available upon request. Please contact our billing department for detailed pricing.',
        locations: [
          {
            address: '123 Main Street',
            city: 'Fort Lauderdale',
            state: 'FL'
          },
          {
            address: '456 Ocean Drive',
            city: 'Miami',
            state: 'FL'
          }
        ],
        businessHours: 'Monday-Friday: 8am-6pm, Saturday: 9am-1pm, Closed Sunday',
        policies: 'Please arrive 15 minutes before your appointment. We require 24-hour notice for cancellations. Bring your insurance card and photo ID to every visit.',
        faqs: [
          {
            question: 'Do you accept my insurance?',
            answer: 'We accept most major insurance plans including Blue Cross Blue Shield, Aetna, UnitedHealthcare, and Cigna. Please call us to verify your specific plan.'
          },
          {
            question: 'What should I bring to my first appointment?',
            answer: 'Please bring your insurance card, photo ID, a list of current medications, and any relevant medical records from previous providers.'
          },
          {
            question: 'Do you offer telehealth appointments?',
            answer: 'Yes, we offer telehealth consultations for many types of visits. Ask about telehealth availability when scheduling your appointment.'
          },
          {
            question: 'What are your urgent care hours?',
            answer: 'Our urgent care is open Monday-Friday 8am-8pm and Saturday-Sunday 9am-5pm. No appointment necessary for urgent care.'
          }
        ],
        productCatalog: 'Annual physical exam, sick visits, chronic disease management, preventive care, women\'s health, pediatrics, mental health counseling',
        
        // Conversation Behavior
        maxResponseLength: 150,
        escalationTriggers: [
          'emergency',
          'chest pain',
          'severe bleeding',
          'mental health crisis',
          'complaint',
          'speak to manager'
        ],
        askForNameFirst: true,
        confirmBeforeActions: true,
        defaultLanguage: 'en-US',
        conversationMemoryTurns: 5,
        
        customVariables: {
          clinic_phone: '555-123-4567',
          billing_phone: '555-123-4568',
          nurse_line: '555-123-4569'
        }
      },
      
      // Prompts & Safety
      customPrompts: {
        systemPrompt: 'You are a helpful healthcare receptionist for Acme Healthcare. Your goal is to assist patients with scheduling, provide information about services, and ensure they have a positive experience. Always be professional, empathetic, and HIPAA-compliant.',
        greeting: 'Thank you for calling Acme Healthcare. How may I help you today?',
        fallbackMessage: 'I apologize, but I didn\'t quite understand that. Could you please rephrase your question?',
        closingMessage: 'Thank you for calling Acme Healthcare. Have a great day!',
        
        intentPrompts: {
          schedule_appointment: 'I\'d be happy to help you schedule an appointment. What type of visit do you need?',
          get_directions: 'I can provide directions to our location. Which office would you like to visit?',
          insurance_question: 'I can help with insurance questions. What insurance provider do you have?'
        },
        
        // Safety & Compliance
        prohibitedTopics: [
          'medical diagnosis',
          'legal advice',
          'financial advice'
        ],
        complianceRules: [
          'HIPAA compliant - never ask for or share protected health information',
          'Do not provide medical advice or diagnosis',
          'Always offer to transfer to a licensed healthcare professional for medical questions'
        ],
        privacyPolicy: 'We respect your privacy and comply with HIPAA regulations.',
        requireConsent: true,
        escalationPolicy: 'Transfer to nurse line for medical questions, transfer to billing for payment issues',
        sensitiveDataHandling: 'Never collect SSN, credit card numbers, or detailed medical information',
        maxConversationTurns: 20,
        logConversations: true
      },
      
      // RAG Configuration
      ragConfig: {
        enabled: true,
        sources: [
          {
            url: 'https://acmehealthcare.com/services',
            type: 'website',
            description: 'Services offered',
            refreshInterval: 24
          },
          {
            url: 'https://acmehealthcare.com/insurance',
            type: 'website',
            description: 'Insurance information',
            refreshInterval: 168
          }
        ],
        maxResults: 3,
        confidenceThreshold: 0.7
      },
      
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Delete existing template if exists
    await db.collection('prompt_templates').deleteMany({
      customerId: TEST_CUSTOMER_ID
    });

    // Insert prompt template
    const templateResult = await db.collection('prompt_templates').insertOne(promptTemplate);
    const templateId = templateResult.insertedId;
    
    console.log('✅ Created prompt template:', templateId);

    // Step 2: Find the existing assistant_channels document
    const existingChannel = await db.collection('assistant_channels').findOne({
      customerId: TEST_CUSTOMER_ID
    });

    if (!existingChannel) {
      console.error('❌ No assistant_channels document found for customer:', TEST_CUSTOMER_ID);
      console.log('Please create an assistant_channels document first');
      return;
    }

    console.log('\n✅ Found existing assistant_channels document:', existingChannel._id);

    // Step 3: Update the assistant_channels document with comprehensive data
    const updateResult = await db.collection('assistant_channels').updateOne(
      { _id: existingChannel._id },
      {
        $set: {
          'voice.promptTemplateId': templateId,
          'voice.promptContext': promptTemplate.promptContext,
          'voice.customPrompts': promptTemplate.customPrompts,
          'voice.ragConfig': promptTemplate.ragConfig,
          'voice.phoneNumber': '+1-555-123-4567',
          'voice.voiceSettings': {
            language: 'en-US',
            voiceId: 'en-US-Neural2-A',
            speechRate: 1.0,
            pitch: 0.0
          },
          'voice.businessHours': {
            timezone: 'America/New_York',
            monday: { open: '08:00', close: '18:00' },
            tuesday: { open: '08:00', close: '18:00' },
            wednesday: { open: '08:00', close: '18:00' },
            thursday: { open: '08:00', close: '18:00' },
            friday: { open: '08:00', close: '18:00' },
            saturday: { open: '09:00', close: '13:00' },
            sunday: null
          },
          'chat.promptTemplateId': templateId,
          'chat.promptContext': promptTemplate.promptContext,
          'chat.customPrompts': promptTemplate.customPrompts,
          'chat.ragConfig': promptTemplate.ragConfig,
          'chat.greeting': 'Hi! Welcome to Acme Healthcare. How can I assist you today?',
          updatedAt: new Date()
        }
      }
    );

    console.log('✅ Updated assistant_channels document:', updateResult.modifiedCount, 'field(s) modified');

    // Step 4: Verify the update
    const updated = await db.collection('assistant_channels').findOne({
      _id: existingChannel._id
    });

    console.log(`\n${  '='.repeat(60)}`);
    console.log('✅ CONFIGURATION UPDATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 Basic Info:');
    console.log('  Customer ID:', updated?.customerId);
    console.log('  Product ID:', updated?.productId);
    console.log('  Voice enabled:', updated?.voice?.enabled);
    console.log('  Chat enabled:', updated?.chat?.enabled);
    console.log('  Voice phone:', updated?.voice?.phoneNumber);
    console.log('\n🎯 Prompt Template:');
    console.log('  Voice templateId:', updated?.voice?.promptTemplateId?.toString());
    console.log('  Chat templateId:', updated?.chat?.promptTemplateId?.toString());
    console.log('\n🏢 Business Context:');
    console.log('  Tenant Name:', updated?.voice?.promptContext?.tenantName);
    console.log('  Industry:', updated?.voice?.promptContext?.tenantIndustry);
    console.log('  Tone:', updated?.voice?.promptContext?.tone);
    console.log('  Personality:', updated?.voice?.promptContext?.personality);
    console.log('\n📚 Knowledge Base:');
    console.log('  Services:', updated?.voice?.promptContext?.servicesOffered?.length, 'items');
    console.log('  Locations:', updated?.voice?.promptContext?.locations?.length, 'items');
    console.log('  FAQs:', updated?.voice?.promptContext?.faqs?.length, 'items');
    console.log('  Allowed Actions:', updated?.voice?.promptContext?.allowedActions?.length, 'items');
    console.log('  Disallowed Actions:', updated?.voice?.promptContext?.disallowedActions?.length, 'items');
    console.log('\n🛡️  Safety & Compliance:');
    console.log('  Prohibited Topics:', updated?.voice?.customPrompts?.prohibitedTopics?.length, 'items');
    console.log('  Compliance Rules:', updated?.voice?.customPrompts?.complianceRules?.length, 'items');
    console.log('  Require Consent:', updated?.voice?.customPrompts?.requireConsent);
    console.log('  Log Conversations:', updated?.voice?.customPrompts?.logConversations);
    console.log('\n🔍 RAG Configuration:');
    console.log('  RAG Enabled:', updated?.voice?.ragConfig?.enabled);
    console.log('  RAG Sources:', updated?.voice?.ragConfig?.sources?.length, 'items');
    console.log('  Max Results:', updated?.voice?.ragConfig?.maxResults);
    console.log('  Confidence Threshold:', updated?.voice?.ragConfig?.confidenceThreshold);
    console.log(`\n${  '='.repeat(60)}`);

  } catch (error) {
    console.error('\n❌ Error seeding prompt configuration:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed\n');
  }
}

// Run the seed script
seedPromptConfiguration()
  .then(() => {
    console.log('✅ Seeding completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
