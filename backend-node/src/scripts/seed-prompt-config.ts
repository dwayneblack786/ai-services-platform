import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';

const comprehensivePromptConfig = {
  customerId: 'ten-splendor-florida-33064',
  productId: 'prod-va-basic',
  tenantId: 'ten-splendor-florida-33064',
  
  voice: {
    enabled: true,
    phoneNumber: '+1-555-123-4567',
    fallbackNumber: '+1-555-987-6543',
    voiceSettings: {
      language: 'en-US',
      voiceId: 'en-US-Neural2-A',
      speechRate: 1.0,
      pitch: 0.0
    },
    businessHours: {
      timezone: 'America/New_York',
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '10:00', close: '14:00' },
      sunday: null
    },
    customPrompts: {
      systemPrompt: 'You are a professional voice assistant for Acme Healthcare.',
      greeting: 'Thank you for calling Acme Healthcare. How may I assist you today?',
      fallbackMessage: 'I want to make sure I understand you correctly. Could you please repeat that?',
      closingMessage: 'Thank you for calling Acme Healthcare. Have a great day!',
      
      // Safety & Compliance
      prohibitedTopics: ['medical diagnosis', 'legal advice', 'financial advice'],
      complianceRules: [
        'HIPAA compliant - never store PHI without consent',
        'Always verify caller identity before discussing account details',
        'Record all conversations for quality assurance'
      ],
      privacyPolicy: 'All calls are recorded and encrypted. Your data is protected under HIPAA.',
      requireConsent: true,
      escalationPolicy: 'Escalate to human agent if patient requests medical advice or reports emergency',
      sensitiveDataHandling: 'Never store credit card numbers or SSN in logs',
      maxConversationTurns: 20,
      logConversations: true
    },
    ragConfig: {
      enabled: true,
      sources: [
        {
          url: 'https://acmehealthcare.com/services',
          type: 'website',
          description: 'Service listings and descriptions'
        },
        {
          url: 'https://api.acmehealthcare.com/knowledge',
          type: 'api',
          description: 'Internal knowledge base API'
        }
      ],
      maxResults: 5,
      confidenceThreshold: 0.7
    },
    promptContext: {
      // Business Identity
      tenantName: 'Acme Healthcare',
      tenantIndustry: 'Healthcare',
      businessContext: 'Acme Healthcare is a full-service medical facility providing primary care, urgent care, and specialized treatments.',
      
      // Role/Persona
      tone: 'professional and empathetic',
      personality: 'helpful, patient, and detail-oriented',
      allowedActions: [
        'schedule_appointment',
        'check_appointment_status',
        'provide_directions',
        'answer_billing_questions',
        'verify_insurance'
      ],
      disallowedActions: [
        'give_medical_diagnosis',
        'prescribe_medication',
        'provide_legal_advice',
        'share_patient_records_without_consent'
      ],
      
      // Static Business Knowledge
      servicesOffered: [
        'Primary Care',
        'Urgent Care',
        'Telehealth',
        'Lab Services',
        'Radiology',
        'Physical Therapy'
      ],
      pricingInfo: 'Primary care visits start at $150. Urgent care visits are $200. Insurance accepted.',
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
      businessHours: 'Mon-Fri 9AM-5PM, Sat 10AM-2PM, Closed Sundays',
      policies: `
Return Policy: Unused medical supplies can be returned within 30 days.
Cancellation Policy: Cancel appointments at least 24 hours in advance to avoid fees.
Privacy Policy: HIPAA compliant. Your medical information is confidential.
Payment Policy: Payment due at time of service. We accept all major insurance.
      `.trim(),
      faqs: [
        {
          question: 'Do you accept my insurance?',
          answer: 'We accept most major insurance providers including Aetna, Blue Cross Blue Shield, Cigna, and UnitedHealthcare. Please call to verify your specific plan.'
        },
        {
          question: 'How do I schedule an appointment?',
          answer: 'You can schedule by calling us, using our online portal, or through this assistant. We offer same-day appointments for urgent care.'
        },
        {
          question: 'What should I bring to my first visit?',
          answer: 'Please bring a valid ID, your insurance card, a list of current medications, and any relevant medical records.'
        },
        {
          question: 'Do you offer telehealth services?',
          answer: 'Yes! We offer virtual visits for routine consultations, follow-ups, and prescription refills. Schedule through our patient portal.'
        }
      ],
      productCatalog: 'Primary Care, Urgent Care, Telehealth, Lab Services, Radiology, Physical Therapy',
      
      // Conversation Behavior
      maxResponseLength: 200,
      escalationTriggers: [
        'patient mentions emergency',
        'patient requests medical diagnosis',
        'patient is frustrated or angry',
        'complex billing dispute',
        'request to speak with doctor'
      ],
      askForNameFirst: true,
      confirmBeforeActions: true,
      defaultLanguage: 'en',
      conversationMemoryTurns: 10
    }
  },
  
  chat: {
    enabled: true,
    greeting: 'Hi! Welcome to Acme Healthcare. How can I help you today?',
    typingIndicator: true,
    maxTurns: 20,
    showIntent: true,
    allowFileUpload: true,
    customPrompts: {
      systemPrompt: 'You are a friendly chat assistant for Acme Healthcare.',
      greeting: 'Hi! Welcome to Acme Healthcare. How can I help you today?',
      fallbackMessage: 'I want to make sure I can help you properly. Could you rephrase that?',
      closingMessage: 'Thanks for chatting! Feel free to reach out anytime.',
      
      // Safety & Compliance
      prohibitedTopics: ['medical diagnosis', 'legal advice', 'political opinions'],
      complianceRules: [
        'HIPAA compliant chat encryption',
        'No PHI in chat without patient consent',
        'Log all conversations for compliance'
      ],
      privacyPolicy: 'Chat conversations are encrypted and HIPAA compliant.',
      requireConsent: true,
      escalationPolicy: 'Escalate to human if patient reports emergency or needs diagnosis',
      sensitiveDataHandling: 'Never log credit card numbers, SSN, or passwords',
      maxConversationTurns: 30,
      logConversations: true
    },
    ragConfig: {
      enabled: true,
      sources: [
        {
          url: 'https://acmehealthcare.com/faq',
          type: 'website',
          description: 'Frequently asked questions'
        },
        {
          url: 'https://acmehealthcare.com/services',
          type: 'website',
          description: 'Service information'
        }
      ],
      maxResults: 5,
      confidenceThreshold: 0.7
    },
    promptContext: {
      // Business Identity
      tenantName: 'Acme Healthcare',
      tenantIndustry: 'Healthcare',
      businessContext: 'Acme Healthcare provides comprehensive medical services with a focus on patient care.',
      
      // Role/Persona
      tone: 'friendly and professional',
      personality: 'helpful, responsive, and caring',
      allowedActions: [
        'schedule_appointment',
        'answer_questions',
        'provide_information',
        'check_status',
        'send_forms'
      ],
      disallowedActions: [
        'diagnose_conditions',
        'prescribe_treatment',
        'share_records_without_consent',
        'give_legal_advice'
      ],
      
      // Static Business Knowledge  
      servicesOffered: [
        'Primary Care',
        'Urgent Care',
        'Telehealth',
        'Lab Services',
        'Radiology',
        'Physical Therapy'
      ],
      pricingInfo: 'Visit costs vary by service. Primary care starts at $150. Contact us for detailed pricing.',
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
      businessHours: 'Mon-Fri 9AM-5PM, Sat 10AM-2PM',
      policies: 'HIPAA compliant. 24-hour cancellation policy. Payment due at service.',
      faqs: [
        {
          question: 'How do I book an appointment?',
          answer: 'Use our online portal, call us, or ask me to schedule one for you!'
        },
        {
          question: 'Do you accept walk-ins?',
          answer: 'Yes, our urgent care accepts walk-ins Mon-Sat. Primary care is by appointment only.'
        }
      ],
      productCatalog: 'Primary Care, Urgent Care, Telehealth, Lab Services',
      
      // Conversation Behavior
      maxResponseLength: 300,
      escalationTriggers: [
        'emergency situation',
        'patient very frustrated',
        'complex medical question',
        'billing dispute'
      ],
      askForNameFirst: false,
      confirmBeforeActions: true,
      defaultLanguage: 'en',
      conversationMemoryTurns: 15
    }
  },
  
  sms: {
    enabled: false,
    phoneNumber: '+1-555-123-4567',
    autoReply: true
  },
  
  whatsapp: {
    enabled: false
  },
  
  createdAt: new Date(),
  updatedAt: new Date()
};

async function seedPromptConfig() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection('assistant_channels');
    
    // Delete existing config for this customer
    await collection.deleteMany({ customerId: 'ten-splendor-florida-33064' });
    console.log('Deleted existing configuration');
    
    // Insert comprehensive config
    const result = await collection.insertOne(comprehensivePromptConfig);
    console.log('Inserted comprehensive prompt configuration:', result.insertedId);
    
    // Verify
    const inserted = await collection.findOne({ customerId: 'ten-splendor-florida-33064' });
    console.log('\nConfiguration created successfully!');
    console.log('Customer ID:', inserted?.customerId);
    console.log('Voice enabled:', inserted?.voice?.enabled);
    console.log('Chat enabled:', inserted?.chat?.enabled);
    console.log('Services offered:', inserted?.voice?.promptContext?.servicesOffered?.length);
    console.log('FAQs:', inserted?.voice?.promptContext?.faqs?.length);
    console.log('Prohibited topics:', inserted?.voice?.customPrompts?.prohibitedTopics?.length);
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the seed function
seedPromptConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
