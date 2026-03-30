/**
 * Upsert the ListingLift product record.
 * Safe to run multiple times — will not delete other products.
 *
 * Run with:
 *   npx ts-node src/scripts/seed-listinglift.ts
 */
import { connectDB, closeDB } from '../config/database';

const LISTINGLIFT_SLUG = 'listing-lift';

const listingLiftProduct = {
  slug: LISTINGLIFT_SLUG,
  name: 'ListingLift',
  category: 'Real Estate AI',
  subCategory: 'Listing Management',
  description:
    'AI-powered real estate listing creation. Upload property photos and the multi-agent pipeline automatically detects rooms, flooring, countertops, design style, and fixtures — then generates MLS-compliant descriptions, social media copy, and runs a Fair Housing compliance check. Human review gates let you verify attributes and approve copy before publishing.',
  features: [
    'PropVision photo analysis (room type, flooring, countertops, design style)',
    'AI-generated MLS descriptions (character-limit compliant)',
    'Social media copy (Instagram, Facebook, LinkedIn)',
    'Fair Housing Act compliance review',
    'Human-in-the-loop review gates',
    'Virtual staging via Flux 1.1 Pro',
    'Configurable data store (MongoDB, PostgreSQL, S3)',
    'Multi-tenant isolated listings',
  ],
  pricing: {
    model: 'subscription',
    currency: 'USD',
    tiers: [
      {
        name: 'small',
        displayName: 'Starter',
        description: 'For individual agents',
        price: 49,
        features: ['25 listings/month', 'MLS + social copy', 'Compliance review'],
      },
      {
        name: 'medium',
        displayName: 'Pro',
        description: 'For small teams',
        price: 149,
        features: ['100 listings/month', 'Virtual staging (10/month)', 'Priority support'],
      },
      {
        name: 'large',
        displayName: 'Brokerage',
        description: 'For brokerages',
        price: 499,
        features: ['Unlimited listings', 'Unlimited staging', 'Custom branding', 'API access'],
      },
    ],
  },
  industries: ['Real Estate', 'Property Management', 'MLS', 'Brokerage'],
  status: 'active',
  tags: ['real-estate', 'listing', 'mls', 'copywriting', 'computer-vision', 'compliance'],
};

async function seedListingLift() {
  try {
    console.log('Connecting to MongoDB...');
    const db = await connectDB();
    const col = db.collection('products');

    // Upsert by slug — safe to run repeatedly
    const result = await col.updateOne(
      { slug: LISTINGLIFT_SLUG },
      { $set: { ...listingLiftProduct, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      console.log(`✓ ListingLift product created (id: ${result.upsertedId})`);
    } else {
      console.log(`✓ ListingLift product updated (matched: ${result.matchedCount})`);
    }

    const product = await col.findOne({ slug: LISTINGLIFT_SLUG });
    console.log(`  Product ID: ${product?._id}`);
    console.log(`  Name: ${product?.name}`);
    console.log(`  Status: ${product?.status}`);
    console.log(`  Tiers: ${product?.pricing?.tiers?.map((t: any) => t.displayName).join(', ')}`);

    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding ListingLift:', err);
    await closeDB();
    process.exit(1);
  }
}

seedListingLift();
