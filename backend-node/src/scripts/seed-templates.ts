import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';

async function seedPromptTemplates() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('✅ Connected to MongoDB\n');

    // ============================================
    // 1. CREATE DEFAULT HEALTHCARE TEMPLATE
    // ============================================
    console.log('📋 Creating default healthcare template...');
    
    await db.collection('prompt_templates').deleteMany({
      industry: 'healthcare',
      isDefault: true
    });

    const defaultHealthcareTemplate = {
      name: 'Healthcare - Default Template',
      description: 'Default template for healthcare businesses. Used when no custom configuration exists.',
      industry: 'healthcare',
      isDefault: true,  // This is a system default
      
      promptContext: {
        tenantName: 'Healthcare Practice',
        tenantIndustry: 'Healthcare',
        businessContext: 'We provide comprehensive healthcare services to our community.',
        
        tone: 'professional and empathetic',
        personality: 'caring, patient, and detail-oriented',
        allowedActions: [
          'schedule_appointment',
          'check_appointment_status',
          'provide_directions',
          'explain_services'
        ],
        disallowedActions: [
          'give_medical_diagnosis',
          'prescribe_medication',
          'access_medical_records'
        ],
        
        servicesOffered: ['Primary Care', 'Preventive Care', 'Wellness Visits'],
        businessHours: 'Monday-Friday: 9am-5pm',
        maxResponseLength: 150,
        escalationTriggers: ['emergency', 'urgent', 'complaint'],
        defaultLanguage: 'en-US'
      },
      
      customPrompts: {
        systemPrompt: 'You are a helpful healthcare assistant. Provide information professionally and refer to healthcare providers for medical advice.',
        greeting: 'Thank you for contacting us. How may I help you today?',
        fallbackMessage: 'I apologize, but I didn\'t understand that. Could you please rephrase?',
        
        prohibitedTopics: ['medical diagnosis', 'legal advice'],
        complianceRules: ['HIPAA compliant', 'Do not provide medical advice'],
        requireConsent: true
      },
      
      ragConfig: {
        enabled: false,
        sources: []
      },
      
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const defaultResult = await db.collection('prompt_templates').insertOne(defaultHealthcareTemplate);
    console.log('✅ Created default healthcare template:', defaultResult.insertedId.toString());

    // ============================================
    // 2. CREATE CUSTOMER-SPECIFIC TEMPLATE
    // ============================================
    const TEST_CUSTOMER_ID = 'ten-splendor-florida-33064';
    console.log('\n📋 Creating customer-specific template for:', TEST_CUSTOMER_ID);
    
    await db.collection('prompt_templates').deleteMany({
      customerId: TEST_CUSTOMER_ID
    });

    const customerTemplate = {
      name: 'Acme Healthcare - Custom Configuration',
      description: 'Comprehensive business configuration for Acme Healthcare',
      customerId: TEST_CUSTOMER_ID,
      industry: 'healthcare',
      isDefault: false,  // This is customer-specific
      
      promptContext: {
        // Business Identity
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
        pricingInfo: 'We accept most major insurance plans. Self-pay rates available upon request.',
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
        policies: 'Please arrive 15 minutes before your appointment. We require 24-hour notice for cancellations.',
        faqs: [
          {
            question: 'Do you accept my insurance?',
            answer: 'We accept most major insurance plans including Blue Cross, Aetna, UnitedHealthcare, and Cigna.'
          },
          {
            question: 'What should I bring to my first appointment?',
            answer: 'Please bring your insurance card, photo ID, a list of current medications, and any relevant medical records.'
          },
          {
            question: 'Do you offer telehealth appointments?',
            answer: 'Yes, we offer telehealth consultations. Ask about availability when scheduling.'
          },
          {
            question: 'What are your urgent care hours?',
            answer: 'Our urgent care is open Monday-Friday 8am-8pm and Saturday-Sunday 9am-5pm.'
          }
        ],
        productCatalog: 'Annual physical, sick visits, chronic disease management, preventive care, women\'s health, pediatrics',
        
        // Conversation Behavior
        maxResponseLength: 150,
        escalationTriggers: ['emergency', 'chest pain', 'severe bleeding', 'complaint', 'speak to manager'],
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
      
      customPrompts: {
        systemPrompt: 'You are a helpful healthcare receptionist for Acme Healthcare. Assist with scheduling and information. Always be professional, empathetic, and HIPAA-compliant.',
        greeting: 'Thank you for calling Acme Healthcare. How may I help you today?',
        fallbackMessage: 'I apologize, but I didn\'t understand that. Could you please rephrase?',
        closingMessage: 'Thank you for calling Acme Healthcare. Have a great day!',
        
        intentPrompts: {
          schedule_appointment: 'I\'d be happy to help you schedule an appointment. What type of visit do you need?',
          get_directions: 'I can provide directions. Which office would you like to visit?',
          insurance_question: 'I can help with insurance questions. What insurance provider do you have?'
        },
        
        prohibitedTopics: ['medical diagnosis', 'legal advice', 'financial advice'],
        complianceRules: [
          'HIPAA compliant - never ask for or share protected health information',
          'Do not provide medical advice or diagnosis',
          'Always offer to transfer to a licensed healthcare professional for medical questions'
        ],
        privacyPolicy: 'We respect your privacy and comply with HIPAA regulations.',
        requireConsent: true,
        escalationPolicy: 'Transfer to nurse line for medical questions, billing for payment issues',
        sensitiveDataHandling: 'Never collect SSN, credit card numbers, or detailed medical information',
        maxConversationTurns: 20,
        logConversations: true
      },
      
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

    const customerResult = await db.collection('prompt_templates').insertOne(customerTemplate);
    console.log('✅ Created customer template:', customerResult.insertedId.toString());

    // ============================================
    // 3. UPDATE ASSISTANT_CHANNELS (if exists)
    // ============================================
    console.log('\n📋 Updating assistant_channels (if exists)...');
    
    const existingChannel = await db.collection('assistant_channels').findOne({
      customerId: TEST_CUSTOMER_ID
    });

    if (existingChannel) {
      await db.collection('assistant_channels').updateOne(
        { _id: existingChannel._id },
        {
          $set: {
            'voice.promptTemplateId': customerResult.insertedId,
            'voice.promptContext': customerTemplate.promptContext,
            'voice.customPrompts': customerTemplate.customPrompts,
            'voice.ragConfig': customerTemplate.ragConfig,
            'chat.promptTemplateId': customerResult.insertedId,
            'chat.promptContext': customerTemplate.promptContext,
            'chat.customPrompts': customerTemplate.customPrompts,
            'chat.ragConfig': customerTemplate.ragConfig,
            updatedAt: new Date()
          }
        }
      );
      console.log('✅ Updated existing assistant_channels document');
    } else {
      console.log('ℹ️  No assistant_channels document found (will use template as default)');
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(70));
    console.log('✅ SEED COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log('\n📚 Templates Created:');
    console.log('  1. Default Healthcare Template (isDefault: true)');
    console.log('     - Used for new customers without custom config');
    console.log('     - ID:', defaultResult.insertedId.toString());
    console.log('\n  2. Customer-Specific Template (Acme Healthcare)');
    console.log('     - Used for customer:', TEST_CUSTOMER_ID);
    console.log('     - ID:', customerResult.insertedId.toString());
    console.log('\n🔄 How It Works:');
    console.log('  1. User loads config → API checks assistant_channels');
    console.log('  2. If NOT found → Load from prompt_templates');
    console.log('  3. User edits config → Saves to assistant_channels');
    console.log('  4. Future loads → Read from assistant_channels (user\'s customizations)');
    console.log('\n📦 Collections:');
    console.log('  - prompt_templates: Read-only defaults (2 documents)');
    console.log('  - assistant_channels: User customizations (created on first save)');
    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Error seeding templates:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ Database connection closed\n');
  }
}

seedPromptTemplates()
  .then(() => {
    console.log('✅ Seeding completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
