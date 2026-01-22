// Run with: node check-subscriptions.js
// This script checks subscription-product relationships in MongoDB

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai-platform';

async function checkSubscriptions() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log(`Connected to MongoDB: ${MONGODB_URI}\n`);
    console.log(`Using database: ${DB_NAME}\n`);
    
    const db = client.db(DB_NAME);
    
    // Get all subscriptions
    const subscriptions = await db.collection('product_subscriptions').find({}).toArray();
    console.log(`Found ${subscriptions.length} subscription(s)\n`);
    
    // Get all products
    const products = await db.collection('products').find({}).toArray();
    console.log(`Found ${products.length} product(s)\n`);
    
    console.log('=== PRODUCTS ===');
    products.forEach(p => {
      console.log(`  ${p.name} (${p.category})`);
      console.log(`    _id: ${p._id}`);
      console.log(`    _id type: ${typeof p._id} ${p._id instanceof ObjectId ? '(ObjectId)' : ''}\n`);
    });
    
    console.log('\n=== SUBSCRIPTIONS ===');
    for (const sub of subscriptions) {
      console.log(`Subscription ${sub._id}:`);
      console.log(`  productId: ${sub.productId}`);
      console.log(`  productId type: ${typeof sub.productId} ${sub.productId instanceof ObjectId ? '(ObjectId)' : '(String)'}`);
      console.log(`  status: ${sub.status}`);
      console.log(`  tenantId: ${sub.tenantId}`);
      
      // Try to find matching product
      let product = null;
      
      // Try direct match
      product = products.find(p => p._id.toString() === sub.productId.toString());
      
      if (product) {
        console.log(`  ✅ MATCH FOUND: ${product.name} (${product.category})`);
      } else {
        console.log(`  ❌ NO MATCH FOUND`);
        console.log(`  Need to fix: productId doesn't match any product._id`);
        
        // Show available product IDs
        console.log(`  Available product IDs:`);
        products.forEach(p => {
          console.log(`    - ${p._id} (${p.name})`);
        });
      }
      console.log('');
    }
    
    // Check for orphaned subscriptions
    console.log('\n=== ISSUES ===');
    const orphaned = subscriptions.filter(sub => {
      return !products.find(p => p._id.toString() === sub.productId.toString());
    });
    
    if (orphaned.length > 0) {
      console.log(`⚠️  Found ${orphaned.length} subscription(s) with invalid productId:`);
      orphaned.forEach(sub => {
        console.log(`  - Subscription ${sub._id}: productId=${sub.productId} (no matching product)`);
      });
      
      console.log('\n🔧 FIX SUGGESTIONS:');
      if (products.length > 0) {
        console.log(`\nTo fix, run one of these commands in MongoDB shell:`);
        orphaned.forEach(sub => {
          products.forEach(prod => {
            console.log(`\n// Update subscription ${sub._id} to point to product "${prod.name}":`);
            console.log(`db.product_subscriptions.updateOne(`);
            console.log(`  { _id: ObjectId("${sub._id}") },`);
            console.log(`  { $set: { productId: ObjectId("${prod._id}") } }`);
            console.log(`);`);
          });
        });
      } else {
        console.log('No products found in database. Create products first!');
      }
    } else {
      console.log('✅ All subscriptions have valid productId references');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkSubscriptions();
