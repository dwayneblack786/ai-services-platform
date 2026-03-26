/**
 * Database Migration: Real Estate Focus
 * 
 * Migrates the platform from horizontal (multi-industry) to vertical (real estate only).
 * 
 * Actions:
 * 1. Remove non-real-estate products
 * 2. Keep existing real estate products
 * 3. Add 7 new real estate products from strategy document
 * 4. Remove orphaned product relations
 * 
 * Usage: node migrate-to-real-estate-only.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

// 7 Real Estate Products from Strategy Document (SECTION 5)
const realEstateProducts = [
  {
    _id: new ObjectId(),
    name: 'ListingLift',
    category: 'Real Estate',
    subCategory: 'Listing Production',
    description: 'Full listing content production suite. AI virtual staging, MLS listing descriptions, social media posts, and property micro-sites. Transform 2-3 hours of manual work into 15 minutes.',
    features: [
      'AI virtual staging - furnished staging in under 60 seconds',
      'MLS listing description generator - Fair Housing compliant',
      'Social media post variants (Instagram, Facebook, LinkedIn)',
      'Single-property micro-site with AI neighborhood profile',
      'Photo selection and ordering suggestions',
      'Professional output in minutes, not hours'
    ],
    pricing: {
      model: 'hybrid',
      currency: 'USD',
      payAsYouGo: {
        price: 49.00,
        unit: 'listing',
        description: 'Pay per listing - no commitment'
      },
      subscription: {
        price: 199.00,
        billingPeriod: 'monthly',
        description: 'Unlimited listings per month'
      }
    },
    targetPersona: 'Solo residential agent, 15-25 transactions/year',
    keyPainPoint: 'Producing professional listing content takes too long and output is inconsistent',
    industries: ['Real Estate', 'Residential Real Estate'],
    status: 'active',
    tags: ['virtual-staging', 'listing-content', 'mls', 'social-media', 'ai-generator'],
    hasVoice: false,
    hasChat: false,
    hasImageGeneration: true,
    hasTextGeneration: true,
    techStack: ['flux-replicate', 'claude-api', 'dinov2-vision', 's3-cloudflare-r2'],
    buildOrder: 1,
    buildComplexity: 'low',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: 'PropBrief',
    category: 'Real Estate',
    subCategory: 'Market Intelligence',
    description: 'AI-powered hyperlocal market intelligence and branded reports. Weekly market briefings for specific neighborhoods with branded PDF reports agents can send to clients.',
    features: [
      'Weekly AI-generated market briefings for focus neighborhoods',
      'Branded PDF/email reports with agent branding',
      'Natural language Q&A for market trend questions',
      'Automated delivery to client lists',
      'Public records and county data integration',
      'Professional reports that rival large brokerages'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'agent',
          displayName: 'Agent Plan',
          description: 'For individual agents',
          price: 79.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 5 ZIP codes',
            'Weekly market reports',
            'Branded PDF generation',
            'Email support'
          ]
        },
        {
          name: 'brokerage',
          displayName: 'Brokerage Plan',
          description: 'White-label for brokerages',
          price: 299.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 10 agents',
            'Unlimited ZIP codes',
            'White-label branding',
            'Priority support',
            'Custom scheduling'
          ]
        }
      ]
    },
    targetPersona: 'Independent agent with 8+ years experience, strong local knowledge',
    keyPainPoint: 'Cannot produce professional market reports without hours of manual work',
    industries: ['Real Estate', 'Residential Real Estate'],
    status: 'active',
    tags: ['market-intelligence', 'reports', 'neighborhood-data', 'public-records', 'pdf-generation'],
    hasVoice: false,
    hasChat: true,
    hasReportGeneration: true,
    techStack: ['attom-data-api', 'claude-api', 'pdf-generation', 'llamaindex-rag', 'pgvector'],
    buildOrder: 3,
    buildComplexity: 'medium',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: 'ComplianceGuard',
    category: 'Real Estate',
    subCategory: 'Legal Compliance',
    description: 'AI Fair Housing and compliance monitoring for independent agents. Scan listings, emails, and marketing materials for Fair Housing violations before they go public.',
    features: [
      'Listing language scanner with Fair Housing compliance review',
      'Email draft review before sending',
      'Marketing material audit (social posts, flyers, brochures)',
      'Audit trail with timestamped records',
      'Plain-language explanations of violations',
      'Federal + state-specific regulations'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'agent',
          displayName: 'Agent Plan',
          description: 'For individual agents',
          price: 79.00,
          billingPeriod: 'monthly',
          features: [
            'Unlimited compliance scans',
            'Federal Fair Housing coverage',
            'Basic audit trail',
            'Email support'
          ]
        },
        {
          name: 'brokerage',
          displayName: 'Brokerage Plan',
          description: 'For brokerages (up to 10 agents)',
          price: 249.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 10 agents',
            'Federal + state regulations',
            'Complete audit trail',
            'Priority support',
            'Training materials'
          ]
        }
      ]
    },
    targetPersona: 'Solo agent concerned about Fair Housing compliance and legal risk',
    keyPainPoint: 'Fear of Fair Housing violations, fines, and license suspension',
    industries: ['Real Estate', 'Legal Compliance'],
    status: 'active',
    tags: ['fair-housing', 'compliance', 'legal', 'risk-management', 'audit'],
    hasVoice: false,
    hasChat: false,
    hasDocumentProcessing: true,
    techStack: ['claude-api', 'docling', 'rag-knowledge-base', 'supabase'],
    buildOrder: 2,
    buildComplexity: 'low-medium',
    disclaimer: 'ComplianceGuard is an AI screening tool. It does not provide legal advice and does not guarantee legal compliance. Consult a licensed real estate attorney for specific legal questions.',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: 'DealDesk',
    category: 'Real Estate',
    subCategory: 'CRE Document Intelligence',
    description: 'AI document intelligence for commercial real estate firms. Upload leases, LOIs, PSAs, title reports - receive extracted structured data and natural language Q&A.',
    features: [
      'Upload any CRE document type (leases, LOIs, PSAs, CC&Rs, zoning)',
      'Natural language Q&A over documents',
      'Key date extraction with calendar export',
      'Side-by-side comparison of lease versions',
      'Clause library - searchable database of clauses',
      'Source citations for every extracted data point'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'starter',
          displayName: 'Starter',
          description: 'For small CRE brokerages',
          price: 79.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 50 documents/month',
            'Document Q&A',
            'Key date extraction',
            'Email support'
          ]
        },
        {
          name: 'unlimited',
          displayName: 'Unlimited',
          description: 'For active CRE firms',
          price: 149.00,
          billingPeriod: 'monthly',
          features: [
            'Unlimited documents',
            'Advanced Q&A',
            'Clause library',
            'Version comparison',
            'Priority support'
          ]
        }
      ]
    },
    targetPersona: 'Operations coordinator at 5-person boutique CRE brokerage',
    keyPainPoint: 'Processing CRE documents manually is slow, error-prone, and does not scale',
    industries: ['Commercial Real Estate', 'CRE'],
    status: 'active',
    tags: ['cre', 'document-intelligence', 'lease-analysis', 'nlp', 'extraction'],
    hasVoice: false,
    hasChat: true,
    hasDocumentProcessing: true,
    techStack: ['docling', 'claude-200k', 'llamaindex', 'pgvector', 'supabase-rls'],
    buildOrder: 6,
    buildComplexity: 'high',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: 'FieldVoice',
    category: 'Real Estate',
    subCategory: 'AI Voice Receptionist',
    description: 'Pre-configured AI voice receptionist for real estate. 24/7 call handling with listing-aware responses, buyer/seller qualification, and appointment scheduling.',
    features: [
      '24/7 inbound call handling',
      'Listing-aware responses (answers property-specific questions)',
      'Buyer and seller qualification scripts',
      'Appointment scheduling to calendar',
      'Hot lead escalation via text/call',
      'Automated SMS follow-up after every call'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'standard',
          displayName: 'Standard',
          description: 'For small brokerages',
          price: 149.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 200 calls/month',
            'Basic qualification',
            'Calendar integration',
            'SMS follow-up'
          ]
        },
        {
          name: 'unlimited',
          displayName: 'Unlimited',
          description: 'For active brokerages',
          price: 249.00,
          billingPeriod: 'monthly',
          features: [
            'Unlimited calls',
            'Advanced qualification',
            'Hot lead escalation',
            'Custom scripts',
            'Priority support'
          ]
        }
      ],
      annualDiscount: 0.20
    },
    targetPersona: '3-agent brokerage with no front desk, missing calls during showings',
    keyPainPoint: 'Every missed call is a potential lost client. Generic answering services don\'t understand real estate.',
    industries: ['Real Estate', 'Residential Real Estate'],
    status: 'active',
    tags: ['voice', 'ai-receptionist', 'inbound-calls', 'lead-qualification', 'appointment-scheduling'],
    hasVoice: true,
    hasChat: false,
    hasTelephony: true,
    techStack: ['vapi-ai', 'twilio', 'claude-api', 'rag-listings', 'calendly-api'],
    buildOrder: 4,
    buildComplexity: 'medium-high',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: 'TenantLoop',
    category: 'Real Estate',
    subCategory: 'Property Management',
    description: 'AI communication layer for boutique property managers. 24/7 tenant inquiry handling, maintenance request triage, and lease renewal workflows via SMS and email.',
    features: [
      '24/7 tenant inquiry handling (SMS and email)',
      'Maintenance request intake and triage',
      'Lease renewal workflows starting 90 days out',
      'Payment FAQ handling',
      'Human escalation with full context',
      'Daily manager summary of all interactions'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'small',
          displayName: 'Up to 50 Units',
          description: 'For small property managers',
          price: 149.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 50 units',
            'SMS + email support',
            'Maintenance triage',
            'Daily summaries'
          ]
        },
        {
          name: 'medium',
          displayName: 'Up to 150 Units',
          description: 'For growing portfolios',
          price: 249.00,
          billingPeriod: 'monthly',
          features: [
            'Up to 150 units',
            'Advanced triage',
            'Lease renewal automation',
            'AppFolio/Buildium sync',
            'Priority support'
          ]
        }
      ]
    },
    targetPersona: 'Property manager self-managing 60 units, spending 3-4 hours/day on routine communications',
    keyPainPoint: 'Manager is bottleneck for every tenant interaction. Cannot scale without hiring staff.',
    industries: ['Property Management', 'Real Estate'],
    status: 'active',
    tags: ['property-management', 'tenant-communication', 'maintenance', 'sms', 'email-automation'],
    hasVoice: false,
    hasChat: true,
    hasSMS: true,
    hasEmail: true,
    techStack: ['twilio-sms', 'email-parsing', 'claude-api', 'rag-property-data', 'supabase'],
    buildOrder: 5,
    buildComplexity: 'medium-high',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: 'DealFlow CRE',
    category: 'Real Estate',
    subCategory: 'CRE Underwriting',
    description: 'AI-assisted underwriting and deal marketing for small CRE brokers. Generate BOVs, Offering Memoranda, pro forma models, and comp grids 10x faster.',
    features: [
      'BOV generator with comparable transaction analysis',
      'OM first draft - professionally formatted',
      'Quick pro forma modeling (NOI, cap rate, IRR, equity multiple)',
      'Comparable transaction sourcing from public data',
      'Deal pipeline tracker with AI summaries',
      'PDF export for client presentation'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        {
          name: 'pro',
          displayName: 'Professional',
          description: 'For CRE brokers and analysts',
          price: 299.00,
          billingPeriod: 'monthly',
          features: [
            'Unlimited BOVs and OMs',
            'Pro forma modeling',
            'Public comp data',
            'Deal pipeline',
            'Priority support'
          ]
        }
      ],
      annualDiscount: 0.20
    },
    targetPersona: 'Principal at 3-person boutique CRE brokerage, specializing in sub-$10M multifamily/retail',
    keyPainPoint: 'Producing professional deal marketing materials takes 8-12 hours. Loses deals to larger firms.',
    industries: ['Commercial Real Estate', 'CRE'],
    status: 'active',
    tags: ['cre', 'underwriting', 'bov', 'offering-memorandum', 'pro-forma', 'deal-marketing'],
    hasVoice: false,
    hasChat: false,
    hasFinancialModeling: true,
    hasPDFGeneration: true,
    techStack: ['attom-data-api', 'claude-api', 'numpy-financial', 'pdf-generation', 'supabase'],
    buildOrder: 7,
    buildComplexity: 'high',
    disclaimer: 'DealFlow CRE generates AI-assisted draft content. Every output must be reviewed and finalized by a licensed professional before client presentation.',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function migrateToRealEstateOnly() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const productsCollection = db.collection('products');
    
    // Step 1: Get all existing products
    const allProducts = await productsCollection.find({}).toArray();
    console.log(`\nFound ${allProducts.length} existing products`);
    
    // Step 2: Identify real estate products to keep
    const realEstateKeywords = [
      'real estate',
      'property',
      'listing',
      'agent',
      'broker',
      'tenant',
      'lease',
      'commercial real estate',
      'cre'
    ];
    
    const existingRealEstateProducts = allProducts.filter(product => {
      const searchText = `${product.name} ${product.description} ${product.category} ${product.subCategory} ${(product.industries || []).join(' ')}`.toLowerCase();
      return realEstateKeywords.some(keyword => searchText.includes(keyword));
    });
    
    console.log(`\nIdentified ${existingRealEstateProducts.length} existing real estate products to keep:`);
    existingRealEstateProducts.forEach(p => console.log(`  - ${p.name}`));
    
    // Step 3: Identify non-real-estate products to remove
    const productsToRemove = allProducts.filter(product => {
      const searchText = `${product.name} ${product.description} ${product.category} ${product.subCategory} ${(product.industries || []).join(' ')}`.toLowerCase();
      return !realEstateKeywords.some(keyword => searchText.includes(keyword));
    });
    
    console.log(`\nIdentified ${productsToRemove.length} non-real-estate products to remove:`);
    productsToRemove.forEach(p => console.log(`  - ${p.name} (${p.category})`));
    
    // Step 4: Remove non-real-estate products
    if (productsToRemove.length > 0) {
      const productIdsToRemove = productsToRemove.map(p => p._id);
      const deleteResult = await productsCollection.deleteMany({
        _id: { $in: productIdsToRemove }
      });
      console.log(`\n✓ Removed ${deleteResult.deletedCount} non-real-estate products`);
      
      // Step 5: Clean up orphaned product relations
      const collectionsWithProductRefs = ['subscriptions', 'orders', 'user_products', 'product_templates', 'product_prompts'];
      
      for (const collectionName of collectionsWithProductRefs) {
        if (await db.listCollections({ name: collectionName }).hasNext()) {
          const collection = db.collection(collectionName);
          const cleanupResult = await collection.deleteMany({
            productId: { $in: productIdsToRemove }
          });
          if (cleanupResult.deletedCount > 0) {
            console.log(`  ✓ Cleaned up ${cleanupResult.deletedCount} orphaned records from ${collectionName}`);
          }
        }
      }
    }
    
    // Step 6: Check for duplicate product names before inserting
    const existingProductNames = existingRealEstateProducts.map(p => p.name.toLowerCase());
    const newProductsToAdd = realEstateProducts.filter(p => 
      !existingProductNames.includes(p.name.toLowerCase())
    );
    
    console.log(`\n${newProductsToAdd.length} new real estate products to add:`);
    newProductsToAdd.forEach(p => console.log(`  - ${p.name}`));
    
    // Step 7: Insert new real estate products
    if (newProductsToAdd.length > 0) {
      const insertResult = await productsCollection.insertMany(newProductsToAdd);
      console.log(`\n✓ Added ${insertResult.insertedCount} new real estate products`);
    }
    
    // Step 8: Final summary
    const finalCount = await productsCollection.countDocuments();
    console.log(`\n${'='.repeat(70)}`);
    console.log('Migration Complete!');
    console.log(`${'='.repeat(70)}`);
    console.log(`Total products in database: ${finalCount}`);
    console.log(`  - Kept: ${existingRealEstateProducts.length} existing real estate products`);
    console.log(`  - Added: ${newProductsToAdd.length} new real estate products`);
    console.log(`  - Removed: ${productsToRemove.length} non-real-estate products`);
    console.log(`\nPlatform is now focused exclusively on real estate! 🏠`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrateToRealEstateOnly()
    .then(() => {
      console.log('\n✓ Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n✗ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToRealEstateOnly, realEstateProducts };
