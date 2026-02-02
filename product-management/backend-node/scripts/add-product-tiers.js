/**
 * Script to update existing products in MongoDB with tiered pricing
 * Adds small/medium/large pricing tiers to all products
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'ai_platform';

// Define pricing tiers for different product types
const tierTemplates = {
  'Virtual Assistant': {
    small: {
      name: 'small',
      displayName: 'Small Business',
      description: 'Perfect for startups and small teams',
      price: 99,
      features: [
        'Up to 1,000 requests/month',
        'Basic AI capabilities',
        'Email support',
        '99% uptime SLA',
        '1 user license'
      ]
    },
    medium: {
      name: 'medium',
      displayName: 'Growing Business',
      description: 'Ideal for medium-sized companies',
      price: 299,
      features: [
        'Up to 10,000 requests/month',
        'Advanced AI capabilities',
        'Priority email & chat support',
        '99.5% uptime SLA',
        'Up to 5 user licenses',
        'Custom integrations'
      ]
    },
    large: {
      name: 'large',
      displayName: 'Enterprise',
      description: 'Full-scale solution for large organizations',
      price: 999,
      features: [
        'Unlimited requests',
        'Premium AI capabilities',
        'Dedicated account manager',
        '99.9% uptime SLA',
        'Unlimited user licenses',
        'Custom integrations',
        'Advanced analytics',
        'White-label options'
      ]
    }
  },
  'IDP': {
    small: {
      name: 'small',
      displayName: 'Small Business',
      description: 'Essential document processing',
      price: 149,
      features: [
        'Up to 500 documents/month',
        'Basic OCR & extraction',
        'Email support',
        '99% uptime SLA',
        '1 user license'
      ]
    },
    medium: {
      name: 'medium',
      displayName: 'Growing Business',
      description: 'Advanced document automation',
      price: 449,
      features: [
        'Up to 5,000 documents/month',
        'Advanced OCR & data extraction',
        'Priority support',
        '99.5% uptime SLA',
        'Up to 5 user licenses',
        'Custom templates',
        'API access'
      ]
    },
    large: {
      name: 'large',
      displayName: 'Enterprise',
      description: 'Enterprise-grade document processing',
      price: 1499,
      features: [
        'Unlimited documents',
        'AI-powered extraction',
        'Dedicated support',
        '99.9% uptime SLA',
        'Unlimited user licenses',
        'Custom workflows',
        'Advanced API access',
        'Compliance features'
      ]
    }
  },
  'Computer Vision': {
    small: {
      name: 'small',
      displayName: 'Small Business',
      description: 'Basic image & video analysis',
      price: 199,
      features: [
        'Up to 1,000 images/month',
        'Basic object detection',
        'Email support',
        '99% uptime SLA',
        '1 user license'
      ]
    },
    medium: {
      name: 'medium',
      displayName: 'Growing Business',
      description: 'Advanced computer vision',
      price: 599,
      features: [
        'Up to 10,000 images/month',
        'Advanced object & facial recognition',
        'Priority support',
        '99.5% uptime SLA',
        'Up to 5 user licenses',
        'Real-time processing',
        'Custom models'
      ]
    },
    large: {
      name: 'large',
      displayName: 'Enterprise',
      description: 'Enterprise vision AI',
      price: 1999,
      features: [
        'Unlimited image processing',
        'Custom AI models',
        'Dedicated support',
        '99.9% uptime SLA',
        'Unlimited user licenses',
        'Real-time video processing',
        'Advanced analytics',
        'Edge deployment'
      ]
    }
  }
};

async function updateProductTiers() {
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const productsCollection = db.collection('products');

    // Get all products
    const products = await productsCollection.find({}).toArray();
    console.log(`Found ${products.length} products to update`);

    for (const product of products) {
      // Get appropriate tier template based on category
      const tierTemplate = tierTemplates[product.category] || tierTemplates['Virtual Assistant'];
      
      const tiers = [
        tierTemplate.small,
        tierTemplate.medium,
        tierTemplate.large
      ];

      // Update product with new pricing structure
      await productsCollection.updateOne(
        { _id: product._id },
        {
          $set: {
            pricing: {
              model: product.pricing.model || 'subscription',
              currency: product.pricing.currency || 'USD',
              tiers: tiers
            },
            updatedAt: new Date()
          }
        }
      );

      console.log(`✓ Updated product: ${product.name} (${product.category})`);
    }

    console.log('\n✅ Successfully updated all products with tiered pricing!');
    
  } catch (error) {
    console.error('Error updating products:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
updateProductTiers().catch(console.error);
