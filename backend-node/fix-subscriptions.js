// Run with: node fix-subscriptions.js
// This script links existing subscriptions to valid products

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';
const TARGET_TENANT = 'ten-splendor-florida-33064';

async function fixSubscriptions() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log(`✓ Connected to MongoDB\n`);
    
    const db = client.db(DB_NAME);
    
    // Get products
    const products = await db.collection('products').find({ status: 'active' }).toArray();
    console.log(`Found ${products.length} active products\n`);
    
    // Get subscriptions
    const subscriptions = await db.collection('product_subscriptions').find({}).toArray();
    console.log(`Found ${subscriptions.length} subscription(s)\n`);
    
    if (subscriptions.length === 0) {
      console.log('No subscriptions to fix. Exiting.');
      return;
    }
    
    // Check each subscription
    for (const sub of subscriptions) {
      console.log(`\n=== Processing Subscription ${sub._id} ===`);
      console.log(`Current productId: ${sub.productId}`);
      console.log(`Current tenantId: ${sub.tenantId}`);
      console.log(`Current status: ${sub.status}`);
      
      // Check if product exists
      const product = products.find(p => p._id.toString() === sub.productId.toString());
      
      if (!product) {
        console.log(`⚠️  Product not found! Available active products:`);
        products.forEach((p, idx) => {
          console.log(`  ${idx + 1}. ${p.name} (${p.category}) - ID: ${p._id}`);
        });
        
        // Auto-link to first active Virtual Assistant product
        const defaultProduct = products.find(p => p.category === 'Virtual Assistant');
        
        if (defaultProduct) {
          console.log(`\n🔧 Updating subscription to link to: ${defaultProduct.name}`);
          
          const updateResult = await db.collection('product_subscriptions').updateOne(
            { _id: sub._id },
            { 
              $set: { 
                productId: defaultProduct._id,
                updatedAt: new Date()
              } 
            }
          );
          
          console.log(`✅ Updated subscription productId: ${sub._id} → ${defaultProduct._id}`);
          
          // Also update or create user_product entry
          const userProduct = await db.collection('user_products').findOne({
            tenantId: sub.tenantId,
            userId: sub.userId,
            productId: defaultProduct._id
          });
          
          if (!userProduct) {
            console.log(`Creating user_product entry...`);
            await db.collection('user_products').insertOne({
              _id: new ObjectId(),
              tenantId: sub.tenantId,
              userId: sub.userId,
              productId: defaultProduct._id,
              grantedAt: new Date(),
              source: 'subscription',
              subscriptionId: sub._id
            });
            console.log(`✅ Created user_product entry`);
          } else {
            console.log(`✓ User product entry already exists`);
          }
        } else {
          console.log(`❌ No active Virtual Assistant products found to link to`);
        }
      } else {
        console.log(`✓ Product link is valid: ${product.name}`);
        
        // Check if user_product exists
        const userProduct = await db.collection('user_products').findOne({
          tenantId: sub.tenantId,
          userId: sub.userId,
          productId: sub.productId
        });
        
        if (!userProduct) {
          console.log(`Creating missing user_product entry...`);
          await db.collection('user_products').insertOne({
            _id: new ObjectId(),
            tenantId: sub.tenantId,
            userId: sub.userId,
            productId: sub.productId,
            grantedAt: sub.startDate || new Date(),
            source: 'subscription',
            subscriptionId: sub._id
          });
          console.log(`✅ Created user_product entry`);
        } else {
          console.log(`✓ User product entry exists`);
        }
      }
    }
    
    // Fix orphaned user_products without tenantId
    console.log(`\n\n=== Fixing Orphaned User Products ===`);
    const orphanedUserProducts = await db.collection('user_products').find({ tenantId: { $exists: false } }).toArray();
    
    if (orphanedUserProducts.length > 0) {
      console.log(`Found ${orphanedUserProducts.length} user_product(s) without tenantId`);
      
      for (const up of orphanedUserProducts) {
        console.log(`\nUser Product ${up._id}:`);
        console.log(`  userId: ${up.userId}`);
        console.log(`  productId: ${up.productId}`);
        
        // Try to find matching user
        const user = await db.collection('users').findOne({ _id: up.userId });
        
        if (user && user.tenantId) {
          console.log(`  Found user with tenantId: ${user.tenantId}`);
          await db.collection('user_products').updateOne(
            { _id: up._id },
            { $set: { tenantId: user.tenantId } }
          );
          console.log(`  ✅ Updated tenantId to: ${user.tenantId}`);
        } else {
          console.log(`  ⚠️  Could not find user or user has no tenantId`);
          console.log(`  Consider setting tenantId to: ${TARGET_TENANT}`);
          
          // Optional: Auto-assign to target tenant
          await db.collection('user_products').updateOne(
            { _id: up._id },
            { $set: { tenantId: TARGET_TENANT } }
          );
          console.log(`  ✅ Updated tenantId to: ${TARGET_TENANT}`);
        }
      }
    } else {
      console.log(`✓ No orphaned user_products found`);
    }
    
    // Final verification
    console.log(`\n\n=== FINAL VERIFICATION ===`);
    const updatedSubs = await db.collection('product_subscriptions').find({}).toArray();
    
    for (const sub of updatedSubs) {
      const product = await db.collection('products').findOne({ _id: sub.productId });
      if (product) {
        console.log(`✅ Subscription ${sub._id} → ${product.name} (${product.category})`);
      } else {
        console.log(`❌ Subscription ${sub._id} → STILL NO MATCHING PRODUCT`);
      }
    }
    
    console.log(`\n✅ All fixes applied successfully!`);
    console.log(`\n⚠️  IMPORTANT: Restart your backend server for changes to take effect`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixSubscriptions();
