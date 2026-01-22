// Run with: node review-database.js
// This script reviews the current state of the MongoDB database

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';
const TARGET_TENANT = 'ten-splendor-florida-33064';

async function reviewDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log(`✓ Connected to MongoDB: ${MONGODB_URI}`);
    console.log(`✓ Using database: ${DB_NAME}\n`);
    
    const db = client.db(DB_NAME);
    
    // Get all collection names
    const collections = await db.listCollections().toArray();
    console.log('=== COLLECTIONS IN DATABASE ===');
    collections.forEach(col => console.log(`  - ${col.name}`));
    console.log('');
    
    // Review Products
    console.log('\n=== PRODUCTS COLLECTION ===');
    const products = await db.collection('products').find({}).toArray();
    console.log(`Total products: ${products.length}\n`);
    
    if (products.length > 0) {
      products.forEach(p => {
        console.log(`Product: ${p.name}`);
        console.log(`  _id: ${p._id}`);
        console.log(`  category: ${p.category || 'N/A'}`);
        console.log(`  status: ${p.status || 'N/A'}`);
        console.log(`  description: ${p.description?.substring(0, 60) || 'N/A'}...`);
        if (p.pricing) {
          console.log(`  pricing tiers: ${Object.keys(p.pricing).join(', ')}`);
        }
        console.log('');
      });
    } else {
      console.log('  No products found');
    }
    
    // Review Subscriptions
    console.log('\n=== PRODUCT_SUBSCRIPTIONS COLLECTION ===');
    const subscriptions = await db.collection('product_subscriptions').find({}).toArray();
    console.log(`Total subscriptions: ${subscriptions.length}\n`);
    
    if (subscriptions.length > 0) {
      subscriptions.forEach(sub => {
        console.log(`Subscription: ${sub._id}`);
        console.log(`  tenantId: ${sub.tenantId || 'NOT SET'}`);
        console.log(`  userId: ${sub.userId || 'NOT SET'}`);
        console.log(`  productId: ${sub.productId}`);
        console.log(`  status: ${sub.status}`);
        console.log(`  amount: ${sub.amount} ${sub.currency}`);
        console.log(`  billingCycle: ${sub.billingCycle}`);
        console.log(`  startDate: ${sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('  No subscriptions found');
    }
    
    // Review User Products
    console.log('\n=== USER_PRODUCTS COLLECTION ===');
    const userProducts = await db.collection('user_products').find({}).toArray();
    console.log(`Total user_products: ${userProducts.length}\n`);
    
    if (userProducts.length > 0) {
      userProducts.forEach(up => {
        console.log(`UserProduct: ${up._id}`);
        console.log(`  tenantId: ${up.tenantId || 'NOT SET'}`);
        console.log(`  userId: ${up.userId || 'NOT SET'}`);
        console.log(`  productId: ${up.productId}`);
        console.log(`  grantedAt: ${up.grantedAt ? new Date(up.grantedAt).toLocaleDateString() : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('  No user_products found');
    }
    
    // Review Users
    console.log('\n=== USERS COLLECTION ===');
    const users = await db.collection('users').find({}).toArray();
    console.log(`Total users: ${users.length}\n`);
    
    if (users.length > 0) {
      users.forEach(u => {
        console.log(`User: ${u.name || u.email || u._id}`);
        console.log(`  _id: ${u._id}`);
        console.log(`  email: ${u.email || 'N/A'}`);
        console.log(`  tenantId: ${u.tenantId || 'NOT SET'}`);
        console.log(`  role: ${u.role || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('  No users found');
    }
    
    // Analysis
    console.log('\n=== ANALYSIS ===');
    console.log(`Target Tenant: ${TARGET_TENANT}\n`);
    
    // Check subscriptions with target tenant
    const targetSubscriptions = subscriptions.filter(s => s.tenantId === TARGET_TENANT);
    console.log(`Subscriptions with target tenant: ${targetSubscriptions.length}`);
    
    // Check subscriptions without tenant
    const noTenantSubs = subscriptions.filter(s => !s.tenantId);
    console.log(`Subscriptions WITHOUT tenantId: ${noTenantSubs.length}`);
    
    // Check user_products with target tenant
    const targetUserProducts = userProducts.filter(up => up.tenantId === TARGET_TENANT);
    console.log(`User products with target tenant: ${targetUserProducts.length}`);
    
    // Check users with target tenant
    const targetUsers = users.filter(u => u.tenantId === TARGET_TENANT);
    console.log(`Users with target tenant: ${targetUsers.length}`);
    
    // Check for orphaned subscriptions
    console.log('\n=== SUBSCRIPTION-PRODUCT RELATIONSHIPS ===');
    for (const sub of subscriptions) {
      const product = products.find(p => p._id.toString() === sub.productId.toString());
      if (product) {
        console.log(`✓ Subscription ${sub._id} → Product "${product.name}"`);
      } else {
        console.log(`✗ Subscription ${sub._id} → NO MATCHING PRODUCT (productId: ${sub.productId})`);
      }
    }
    
    // Recommendations
    console.log('\n\n=== RECOMMENDATIONS ===');
    
    if (noTenantSubs.length > 0) {
      console.log(`\n⚠️  Found ${noTenantSubs.length} subscription(s) without tenantId`);
      console.log(`   Action needed: Link these subscriptions to tenant "${TARGET_TENANT}"`);
    }
    
    if (subscriptions.length > 0 && userProducts.length === 0) {
      console.log(`\n💡 You have subscriptions but no user_products entries`);
      console.log(`   Consider creating user_products entries for active subscriptions`);
    }
    
    if (users.length === 0) {
      console.log(`\n⚠️  No users found in database`);
      console.log(`   You may need to create a user record or check authentication`);
    }
    
    console.log('\n✅ Database review complete');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

reviewDatabase();
