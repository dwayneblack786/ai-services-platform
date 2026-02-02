/**
 * Seed Products Script
 * Populates products collection with Virtual Assistant products
 * All products include both Voice and Chat elements
 * 
 * Usage: node seed-products.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

// Virtual Assistant Products
const products = [
  {
    _id: new ObjectId(),
    name: 'Healthcare Voice & Chat Assistant',
    category: 'Virtual Assistant',
    subCategory: 'Healthcare',
    description: 'Comprehensive AI-powered voice and chat assistant for healthcare providers. Handle appointments, patient inquiries, and general information 24/7.',
    features: [
      'Voice calls with natural language understanding',
      'Live chat with instant responses',
      'Appointment scheduling and reminders',
      'Patient inquiry handling',
      'Medical terminology understanding',
      'HIPAA compliant',
      'Multi-language support',
      '24/7 availability'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'small',
          displayName: 'Starter',
          description: 'Perfect for small practices',
          price: 99.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 500 voice calls/month',
            'Up to 2,000 chat messages/month',
            'Basic analytics',
            'Email support'
          ]
        },
        {
          name: 'medium',
          displayName: 'Professional',
          description: 'Ideal for growing practices',
          price: 249.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 2,000 voice calls/month',
            'Up to 10,000 chat messages/month',
            'Advanced analytics',
            'Custom prompts',
            'Priority support'
          ]
        },
        {
          name: 'large',
          displayName: 'Enterprise',
          description: 'For large healthcare organizations',
          price: 499.00,
          billingPeriod: 'monthly',
          features: [
            'Unlimited voice calls',
            'Unlimited chat messages',
            'Advanced analytics & reporting',
            'Custom integrations',
            'Dedicated account manager',
            '24/7 premium support'
          ]
        }
      ]
    },
    industries: ['Healthcare', 'Medical', 'Clinics', 'Hospitals'],
    status: 'active',
    tags: ['voice', 'chat', 'ai', 'healthcare', 'appointments', 'hipaa'],
    hasVoice: true,
    hasChat: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: 'Real Estate Voice & Chat Assistant',
    category: 'Virtual Assistant',
    subCategory: 'Real Estate',
    description: 'AI-powered assistant for real estate agencies. Handle property inquiries, schedule viewings, and provide property information through voice and chat.',
    features: [
      'Voice calls for property inquiries',
      'Live chat for instant property info',
      'Viewing scheduling',
      'Property details and availability',
      'Neighborhood information',
      'Agent availability checking',
      'Lead qualification',
      'Multi-property management'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'small',
          displayName: 'Agent',
          description: 'For individual agents',
          price: 79.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 300 voice calls/month',
            'Up to 1,500 chat messages/month',
            'Up to 10 properties',
            'Basic analytics'
          ]
        },
        {
          name: 'medium',
          displayName: 'Agency',
          description: 'For small to medium agencies',
          price: 199.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 1,500 voice calls/month',
            'Up to 7,500 chat messages/month',
            'Up to 50 properties',
            'Advanced analytics',
            'Custom prompts'
          ]
        },
        {
          name: 'large',
          displayName: 'Enterprise',
          description: 'For large real estate firms',
          price: 399.00,
          billingPeriod: 'monthly',
          features: [
            'Unlimited voice calls',
            'Unlimited chat messages',
            'Unlimited properties',
            'Advanced analytics & CRM integration',
            'White-label options',
            'Priority support'
          ]
        }
      ]
    },
    industries: ['Real Estate', 'Property Management'],
    status: 'active',
    tags: ['voice', 'chat', 'ai', 'real-estate', 'property', 'viewings'],
    hasVoice: true,
    hasChat: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: 'Customer Service Voice & Chat Assistant',
    category: 'Virtual Assistant',
    subCategory: 'Customer Support',
    description: 'Universal AI assistant for customer service. Handle inquiries, FAQs, order status, and general support through voice and chat channels.',
    features: [
      'Voice support line',
      'Live chat widget',
      'FAQ automation',
      'Order tracking',
      'Ticket creation',
      'Multi-department routing',
      'Sentiment analysis',
      'Integration ready'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'small',
          displayName: 'Starter',
          description: 'For startups and small businesses',
          price: 149.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 1,000 voice calls/month',
            'Up to 5,000 chat messages/month',
            'Basic analytics',
            'Email support'
          ]
        },
        {
          name: 'medium',
          displayName: 'Business',
          description: 'For growing companies',
          price: 349.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 5,000 voice calls/month',
            'Up to 25,000 chat messages/month',
            'Advanced analytics',
            'Custom workflows',
            'Priority support'
          ]
        },
        {
          name: 'large',
          displayName: 'Enterprise',
          description: 'For large organizations',
          price: 699.00,
          billingPeriod: 'monthly',
          features: [
            'Unlimited voice calls',
            'Unlimited chat messages',
            'Advanced analytics & AI insights',
            'Custom integrations',
            'Dedicated support team',
            'SLA guarantees'
          ]
        }
      ]
    },
    industries: ['E-commerce', 'Retail', 'SaaS', 'Services'],
    status: 'active',
    tags: ['voice', 'chat', 'ai', 'customer-service', 'support', 'faq'],
    hasVoice: true,
    hasChat: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: 'Restaurant Reservation Voice & Chat Assistant',
    category: 'Virtual Assistant',
    subCategory: 'Hospitality',
    description: 'AI assistant for restaurants to handle reservations, menu inquiries, and customer service through voice calls and chat.',
    features: [
      'Reservation booking via phone',
      'Chat-based reservations',
      'Menu information',
      'Special requests handling',
      'Waitlist management',
      'Dietary restrictions support',
      'Multi-location support',
      'Integration with POS systems'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'small',
          displayName: 'Single Location',
          description: 'For individual restaurants',
          price: 89.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 500 voice calls/month',
            'Up to 2,000 chat messages/month',
            '1 location',
            'Basic reservation management'
          ]
        },
        {
          name: 'medium',
          displayName: 'Multi-Location',
          description: 'For restaurant chains',
          price: 229.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 2,500 voice calls/month',
            'Up to 10,000 chat messages/month',
            'Up to 5 locations',
            'Advanced features',
            'Analytics'
          ]
        },
        {
          name: 'large',
          displayName: 'Enterprise',
          description: 'For large restaurant groups',
          price: 449.00,
          billingPeriod: 'monthly',
          features: [
            'Unlimited voice calls',
            'Unlimited chat messages',
            'Unlimited locations',
            'Full POS integration',
            'Custom features',
            'Dedicated support'
          ]
        }
      ]
    },
    industries: ['Restaurant', 'Hospitality', 'Food Service'],
    status: 'active',
    tags: ['voice', 'chat', 'ai', 'restaurant', 'reservations', 'hospitality'],
    hasVoice: true,
    hasChat: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: 'Legal Consultation Voice & Chat Assistant',
    category: 'Virtual Assistant',
    subCategory: 'Legal Services',
    description: 'AI assistant for law firms to handle initial consultations, appointment scheduling, and basic legal inquiries.',
    features: [
      'Initial consultation scheduling',
      'Case type classification',
      'Attorney availability',
      'Document request handling',
      'Secure communication',
      'Conflict checking',
      'Multi-language support',
      'Compliance tracking'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'small',
          displayName: 'Solo Practice',
          description: 'For individual attorneys',
          price: 129.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 300 voice calls/month',
            'Up to 1,500 chat messages/month',
            'Basic scheduling',
            'Secure messaging'
          ]
        },
        {
          name: 'medium',
          displayName: 'Small Firm',
          description: 'For small to medium law firms',
          price: 299.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 1,500 voice calls/month',
            'Up to 7,500 chat messages/month',
            'Advanced scheduling',
            'Case management integration',
            'Analytics'
          ]
        },
        {
          name: 'large',
          displayName: 'Enterprise',
          description: 'For large law firms',
          price: 599.00,
          billingPeriod: 'monthly',
          features: [
            'Unlimited voice calls',
            'Unlimited chat messages',
            'Full practice management integration',
            'Custom workflows',
            'Compliance reporting',
            'Dedicated support'
          ]
        }
      ]
    },
    industries: ['Legal', 'Law Firms', 'Professional Services'],
    status: 'active',
    tags: ['voice', 'chat', 'ai', 'legal', 'consultation', 'scheduling'],
    hasVoice: true,
    hasChat: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedProducts() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✓ Connected to database:', DB_NAME);
    console.log();

    const db = client.db(DB_NAME);
    const productsCollection = db.collection('products');

    // Clear existing products
    console.log('🗑️  Clearing existing products...');
    const deleteResult = await productsCollection.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} existing products`);
    console.log();

    // Insert new products
    console.log('📦 Inserting new products...');
    const result = await productsCollection.insertMany(products);
    console.log(`✓ Inserted ${result.insertedCount} products`);
    console.log();

    // Display inserted products
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Products Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();

    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   ID: ${product._id}`);
      console.log(`   Category: ${product.category} - ${product.subCategory}`);
      console.log(`   Channels: Voice ✓ | Chat ✓`);
      console.log(`   Pricing Tiers: ${product.pricing.tiers.length}`);
      product.pricing.tiers.forEach(tier => {
        console.log(`     - ${tier.displayName}: $${tier.price}/month`);
      });
      console.log();
    });

    // Create indexes
    console.log('📑 Creating indexes...');
    await productsCollection.createIndex({ category: 1 });
    await productsCollection.createIndex({ status: 1 });
    await productsCollection.createIndex({ industries: 1 });
    await productsCollection.createIndex({ tags: 1 });
    console.log('✓ Indexes created');
    console.log();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Products seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();
    console.log('📝 Notes:');
    console.log('  • All products include both Voice and Chat elements');
    console.log('  • Each product has 3 pricing tiers (Small, Medium, Large)');
    console.log('  • ObjectIds are properly generated');
    console.log('  • Products are ready for subscription and configuration');

  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the seed function
seedProducts().catch(console.error);
