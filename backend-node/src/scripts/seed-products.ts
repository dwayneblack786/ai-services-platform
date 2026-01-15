import { connectDB, closeDB } from '../config/database';
import { Product } from '../models/Product';

const mockProducts: Omit<Product, '_id'>[] = [
  // Virtual Assistants
  {
    name: 'Healthcare Virtual Assistant',
    category: 'Virtual Assistant',
    subCategory: 'Healthcare',
    description: 'AI-powered virtual assistant specialized for healthcare providers. Handles patient inquiries, appointment scheduling, and basic medical information.',
    features: [
      'HIPAA compliant',
      'Medical terminology understanding',
      'Appointment scheduling',
      'Patient data management',
      'Multi-language support',
      '24/7 availability'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        { name: 'small', displayName: 'Basic', description: 'For small practices', price: 499, features: ['Up to 1000 calls/month', 'Basic features'] },
        { name: 'medium', displayName: 'Professional', description: 'For growing practices', price: 999, features: ['Up to 5000 calls/month', 'All features'] }
      ]
    },
    industries: ['Healthcare', 'Medical', 'Hospitals', 'Clinics'],
    status: 'active',
    tags: ['healthcare', 'medical', 'appointments', 'HIPAA', 'patient-care'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Financial Services Assistant',
    category: 'Virtual Assistant',
    subCategory: 'Finance',
    description: 'Intelligent virtual assistant for banking and financial institutions. Assists with account inquiries, transactions, and financial advice.',
    features: [
      'Secure transaction handling',
      'Account balance inquiries',
      'Payment processing',
      'Financial advice',
      'Fraud detection alerts',
      'Regulatory compliance'
    ],
    pricing: {
      model: 'enterprise',
      currency: 'USD'
    },
    industries: ['Banking', 'Finance', 'Insurance', 'Investment'],
    status: 'active',
    tags: ['finance', 'banking', 'transactions', 'security', 'compliance'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Retail Customer Support AI',
    category: 'Virtual Assistant',
    subCategory: 'Retail',
    description: 'E-commerce virtual assistant that handles customer inquiries, order tracking, returns, and product recommendations.',
    features: [
      'Order tracking',
      'Product recommendations',
      'Return processing',
      'Inventory queries',
      'Customer support 24/7',
      'Multi-channel integration'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        { name: 'small', displayName: 'Starter', description: 'For small stores', price: 299, features: ['Up to 500 chats/month', 'Basic features'] },
        { name: 'medium', displayName: 'Growth', description: 'For growing businesses', price: 599, features: ['Up to 2000 chats/month', 'All features'] }
      ]
    },
    industries: ['Retail', 'E-commerce', 'Fashion', 'Consumer Goods'],
    status: 'active',
    tags: ['retail', 'ecommerce', 'customer-support', 'orders', 'shopping'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Intelligent Document Processing
  {
    name: 'Invoice Processing Suite',
    category: 'IDP',
    subCategory: 'Finance Documents',
    description: 'Automated invoice extraction and processing system. Captures invoice data, validates information, and integrates with accounting systems.',
    features: [
      'OCR technology',
      'Multi-format support (PDF, images)',
      'Data validation',
      'ERP integration',
      'Duplicate detection',
      'Approval workflows'
    ],
    pricing: {
      model: 'per-use',
      currency: 'USD',
      perUseRate: 0.50,
      perUseUnit: 'per invoice'
    },
    industries: ['Accounting', 'Finance', 'Procurement', 'Enterprise'],
    status: 'active',
    tags: ['invoice', 'accounting', 'automation', 'OCR', 'finance'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Contract Intelligence Platform',
    category: 'IDP',
    subCategory: 'Legal Documents',
    description: 'AI-powered contract analysis and management. Extracts key terms, identifies risks, and manages contract lifecycle.',
    features: [
      'Contract clause extraction',
      'Risk assessment',
      'Compliance checking',
      'Date tracking',
      'Version control',
      'Searchable repository'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        { name: 'medium', displayName: 'Professional', description: 'For law firms', price: 799, features: ['Up to 100 contracts/month'] },
        { name: 'large', displayName: 'Enterprise', description: 'For large corporations', price: 1499, features: ['Unlimited contracts'] }
      ]
    },
    industries: ['Legal', 'Corporate', 'Real Estate', 'Procurement'],
    status: 'active',
    tags: ['contracts', 'legal', 'compliance', 'risk-management', 'automation'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Insurance Claims Processor',
    category: 'IDP',
    subCategory: 'Insurance',
    description: 'Automated insurance claims document processing. Extracts data from claims forms, medical records, and supporting documents.',
    features: [
      'Multi-document processing',
      'Medical record analysis',
      'Fraud detection',
      'Policy verification',
      'Claim amount calculation',
      'Fast turnaround time'
    ],
    pricing: {
      model: 'per-use',
      currency: 'USD',
      perUseRate: 2.00,
      perUseUnit: 'per claim'
    },
    industries: ['Insurance', 'Healthcare', 'Legal'],
    status: 'active',
    tags: ['insurance', 'claims', 'healthcare', 'fraud-detection', 'automation'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Computer Vision - Real Estate
  {
    name: 'Property Image Tagging AI',
    category: 'Computer Vision',
    subCategory: 'Real Estate',
    description: 'Automatically tags and categorizes real estate property images. Identifies rooms, features, and amenities for MLS listings.',
    features: [
      'Room type detection',
      'Feature identification',
      'Quality assessment',
      'Amenity tagging',
      'Batch processing',
      'MLS integration'
    ],
    pricing: {
      model: 'per-use',
      currency: 'USD',
      perUseRate: 0.10,
      perUseUnit: 'per image'
    },
    industries: ['Real Estate', 'Property Management', 'MLS'],
    status: 'active',
    tags: ['real-estate', 'property', 'image-tagging', 'MLS', 'automation'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Property Valuation Assistant',
    category: 'Computer Vision',
    subCategory: 'Real Estate',
    description: 'AI-powered property valuation support using image analysis. Assesses property condition, renovations, and features to support appraisal.',
    features: [
      'Condition assessment',
      'Renovation detection',
      'Feature valuation',
      'Comparison analysis',
      'Report generation',
      'Historical tracking'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        { name: 'small', displayName: 'Basic', description: 'For independent appraisers', price: 599, features: ['Up to 50 valuations/month'] },
        { name: 'medium', displayName: 'Pro', description: 'For appraisal firms', price: 1199, features: ['Up to 200 valuations/month'] }
      ]
    },
    industries: ['Real Estate', 'Appraisal', 'Banking', 'Insurance'],
    status: 'beta',
    tags: ['real-estate', 'valuation', 'appraisal', 'property-analysis'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Computer Vision - Retail
  {
    name: 'Retail Shelf Monitoring System',
    category: 'Computer Vision',
    subCategory: 'Retail',
    description: 'Real-time shelf monitoring for retail stores. Detects out-of-stock items, planogram compliance, and pricing errors.',
    features: [
      'Real-time monitoring',
      'Stock level detection',
      'Planogram compliance',
      'Price tag verification',
      'Alert system',
      'Analytics dashboard'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        { name: 'small', displayName: 'Single Store', description: 'For single location', price: 899, features: ['1 store location'] },
        { name: 'medium', displayName: 'Multi-Store', description: 'For multiple locations', price: 2499, features: ['Up to 5 stores'] }
      ]
    },
    industries: ['Retail', 'Grocery', 'Pharmacy', 'Convenience Stores'],
    status: 'active',
    tags: ['retail', 'shelf-monitoring', 'inventory', 'compliance', 'automation'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Product Recognition Engine',
    category: 'Computer Vision',
    subCategory: 'Retail',
    description: 'Advanced product recognition for checkout automation and inventory management. Identifies products from images instantly.',
    features: [
      'Fast product identification',
      'Barcode-free checkout',
      'Inventory tracking',
      'Multi-product recognition',
      'Custom training',
      'High accuracy'
    ],
    pricing: {
      model: 'per-use',
      currency: 'USD',
      perUseRate: 0.05,
      perUseUnit: 'per scan'
    },
    industries: ['Retail', 'Grocery', 'Warehouse', 'Logistics'],
    status: 'active',
    tags: ['retail', 'product-recognition', 'checkout', 'inventory', 'automation'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Visual Search for E-commerce',
    category: 'Computer Vision',
    subCategory: 'Retail',
    description: 'Enable customers to search products using images. Upload a photo and find similar products in your catalog.',
    features: [
      'Image-based search',
      'Similar product matching',
      'Style recognition',
      'Color matching',
      'Mobile app integration',
      'Fast results'
    ],
    pricing: {
      model: 'subscription',
      currency: 'USD',
      tiers: [
        { name: 'small', displayName: 'Starter', description: 'For small e-commerce', price: 399, features: ['Up to 10,000 searches/month'] },
        { name: 'medium', displayName: 'Growth', description: 'For growing e-commerce', price: 799, features: ['Up to 50,000 searches/month'] }
      ]
    },
    industries: ['E-commerce', 'Fashion', 'Home Decor', 'Retail'],
    status: 'active',
    tags: ['ecommerce', 'visual-search', 'product-discovery', 'shopping'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedProducts() {
  try {
    console.log('Connecting to MongoDB...');
    const db = await connectDB();
    
    const productsCollection = db.collection<Product>('products');
    
    // Clear existing products
    console.log('Clearing existing products...');
    await productsCollection.deleteMany({});
    
    // Insert mock products
    console.log('Inserting mock products...');
    const result = await productsCollection.insertMany(mockProducts as any);
    
    console.log(`✓ Successfully inserted ${result.insertedCount} products`);
    console.log('\nProduct Categories:');
    console.log('- Virtual Assistants: 3 products');
    console.log('- Intelligent Document Processing: 3 products');
    console.log('- Computer Vision (Real Estate): 2 products');
    console.log('- Computer Vision (Retail): 3 products');
    
    // Display summary
    const count = await productsCollection.countDocuments();
    console.log(`\nTotal products in database: ${count}`);
    
    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    await closeDB();
    process.exit(1);
  }
}

// Run the seed function
seedProducts();
