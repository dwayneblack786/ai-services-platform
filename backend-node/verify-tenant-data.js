const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';
const TARGET_TENANT = 'ten-splendor-florida-33064';

async function verifyTenantData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`VERIFYING DATA FOR TENANT: ${TARGET_TENANT}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // 1. Find users for this tenant
    console.log('📋 STEP 1: USERS');
    console.log('─────────────────────────────────────────────────────────');
    const users = await db.collection('users').find({ tenantId: TARGET_TENANT }).toArray();
    console.log(`Found ${users.length} user(s) for tenant ${TARGET_TENANT}:\n`);
    
    const userIds = users.map(u => u._id);
    users.forEach(user => {
      console.log(`  User ID: ${user._id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name || 'N/A'}`);
      console.log(`  Tenant: ${user.tenantId}`);
      console.log('');
    });
    
    if (users.length === 0) {
      console.log('  ⚠️  WARNING: No users found for this tenant!\n');
      return;
    }
    
    // 2. Find product_subscriptions for these users
    console.log('📋 STEP 2: PRODUCT SUBSCRIPTIONS');
    console.log('─────────────────────────────────────────────────────────');
    const subscriptions = await db.collection('product_subscriptions').find({
      userId: { $in: userIds }
    }).toArray();
    
    console.log(`Found ${subscriptions.length} subscription(s):\n`);
    
    const subscriptionIssues = [];
    const productIds = new Set();
    
    for (const sub of subscriptions) {
      console.log(`  Subscription ID: ${sub._id}`);
      console.log(`  User ID: ${sub.userId}`);
      console.log(`  Product ID: ${sub.productId}`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Billing Cycle: ${sub.billingCycle}`);
      console.log(`  Amount: ${sub.amount} ${sub.currency}`);
      console.log(`  Start Date: ${sub.startDate}`);
      
      // Track product IDs
      productIds.add(sub.productId.toString());
      
      // Verify product exists
      const productQuery = typeof sub.productId === 'string' 
        ? { _id: new ObjectId(sub.productId) } 
        : { _id: sub.productId };
      
      const product = await db.collection('products').findOne(productQuery);
      
      if (!product) {
        console.log(`  ❌ ERROR: Product not found for productId: ${sub.productId}`);
        subscriptionIssues.push({
          subscriptionId: sub._id,
          issue: 'Product not found',
          productId: sub.productId
        });
      } else {
        console.log(`  ✅ Product Found: ${product.name}`);
        console.log(`  Product Category: ${product.category}`);
      }
      console.log('');
    }
    
    // 3. Find user_products for these users
    console.log('📋 STEP 3: USER PRODUCTS (Product Access Grants)');
    console.log('─────────────────────────────────────────────────────────');
    const userProducts = await db.collection('user_products').find({
      $or: [
        { userId: { $in: userIds } },
        { tenantId: TARGET_TENANT }
      ]
    }).toArray();
    
    console.log(`Found ${userProducts.length} user_product(s):\n`);
    
    const userProductIssues = [];
    
    for (const up of userProducts) {
      console.log(`  User Product ID: ${up._id}`);
      console.log(`  User ID: ${up.userId}`);
      console.log(`  Product ID: ${up.productId}`);
      console.log(`  Tenant ID: ${up.tenantId || '⚠️  MISSING'}`);
      
      // Track product IDs
      productIds.add(up.productId.toString());
      
      // Check if tenantId is missing
      if (!up.tenantId) {
        console.log(`  ⚠️  WARNING: Missing tenantId`);
        userProductIssues.push({
          userProductId: up._id,
          issue: 'Missing tenantId',
          userId: up.userId,
          productId: up.productId
        });
      } else if (up.tenantId !== TARGET_TENANT) {
        console.log(`  ⚠️  WARNING: Wrong tenant (${up.tenantId})`);
        userProductIssues.push({
          userProductId: up._id,
          issue: `Wrong tenant: ${up.tenantId}`,
          userId: up.userId,
          productId: up.productId
        });
      }
      
      // Verify user exists
      const userExists = users.some(u => u._id.toString() === up.userId.toString());
      if (!userExists) {
        console.log(`  ⚠️  WARNING: User not found for userId: ${up.userId}`);
        userProductIssues.push({
          userProductId: up._id,
          issue: 'User not found',
          userId: up.userId
        });
      }
      
      // Verify product exists
      const productQuery = typeof up.productId === 'string' 
        ? { _id: new ObjectId(up.productId) } 
        : { _id: up.productId };
      
      const product = await db.collection('products').findOne(productQuery);
      
      if (!product) {
        console.log(`  ❌ ERROR: Product not found for productId: ${up.productId}`);
        userProductIssues.push({
          userProductId: up._id,
          issue: 'Product not found',
          productId: up.productId
        });
      } else {
        console.log(`  ✅ Product Found: ${product.name}`);
      }
      console.log('');
    }
    
    // 4. Verify all products referenced exist
    console.log('📋 STEP 4: PRODUCTS VERIFICATION');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Verifying ${productIds.size} unique product(s):\n`);
    
    for (const productId of productIds) {
      const product = await db.collection('products').findOne({
        _id: new ObjectId(productId)
      });
      
      if (product) {
        console.log(`  ✅ ${productId}`);
        console.log(`     Name: ${product.name}`);
        console.log(`     Category: ${product.category}`);
        console.log(`     Type: ${product.type}`);
      } else {
        console.log(`  ❌ ${productId} - NOT FOUND`);
      }
      console.log('');
    }
    
    // 5. Check for orphaned subscriptions (not linked to any user_product)
    console.log('📋 STEP 5: SUBSCRIPTION TO USER_PRODUCT MAPPING');
    console.log('─────────────────────────────────────────────────────────');
    
    const orphanedSubscriptions = [];
    
    for (const sub of subscriptions) {
      const hasUserProduct = userProducts.some(
        up => up.productId.toString() === sub.productId.toString() &&
              up.userId.toString() === sub.userId.toString()
      );
      
      if (!hasUserProduct) {
        console.log(`  ⚠️  Subscription ${sub._id} has no corresponding user_product`);
        console.log(`     Product ID: ${sub.productId}`);
        console.log(`     User ID: ${sub.userId}`);
        orphanedSubscriptions.push({
          subscriptionId: sub._id,
          productId: sub.productId,
          userId: sub.userId
        });
      } else {
        console.log(`  ✅ Subscription ${sub._id} has matching user_product`);
      }
    }
    
    if (orphanedSubscriptions.length === 0) {
      console.log(`\n  ✅ All subscriptions have corresponding user_products`);
    }
    console.log('');
    
    // 6. Summary Report
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`👥 Users: ${users.length}`);
    console.log(`📦 Product Subscriptions: ${subscriptions.length}`);
    console.log(`🔑 User Product Access Grants: ${userProducts.length}`);
    console.log(`📦 Unique Products Referenced: ${productIds.size}\n`);
    
    let hasIssues = false;
    
    if (subscriptionIssues.length > 0) {
      hasIssues = true;
      console.log('❌ SUBSCRIPTION ISSUES:');
      subscriptionIssues.forEach(issue => {
        console.log(`   - Subscription ${issue.subscriptionId}: ${issue.issue}`);
        if (issue.productId) console.log(`     Product ID: ${issue.productId}`);
      });
      console.log('');
    }
    
    if (userProductIssues.length > 0) {
      hasIssues = true;
      console.log('❌ USER PRODUCT ISSUES:');
      userProductIssues.forEach(issue => {
        console.log(`   - User Product ${issue.userProductId}: ${issue.issue}`);
        if (issue.userId) console.log(`     User ID: ${issue.userId}`);
        if (issue.productId) console.log(`     Product ID: ${issue.productId}`);
      });
      console.log('');
    }
    
    if (orphanedSubscriptions.length > 0) {
      hasIssues = true;
      console.log('⚠️  ORPHANED SUBSCRIPTIONS (Missing user_product):');
      orphanedSubscriptions.forEach(orphan => {
        console.log(`   - Subscription ${orphan.subscriptionId}`);
        console.log(`     User ID: ${orphan.userId}`);
        console.log(`     Product ID: ${orphan.productId}`);
      });
      console.log('');
    }
    
    if (!hasIssues) {
      console.log('✅ NO ISSUES FOUND - All data is properly linked!\n');
    } else {
      console.log('⚠️  ISSUES FOUND - Review above for details\n');
    }
    
    // 7. Data integrity recommendations
    console.log('═══════════════════════════════════════════════════════════');
    console.log('RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (orphanedSubscriptions.length > 0) {
      console.log('📝 Create missing user_product entries:');
      console.log('   Run fix script to create user_product for each subscription\n');
    }
    
    if (subscriptionIssues.some(i => i.issue === 'Product not found')) {
      console.log('📝 Fix product references:');
      console.log('   Update subscriptions to point to valid products\n');
    }
    
    if (userProductIssues.some(i => i.issue.includes('tenantId'))) {
      console.log('📝 Fix tenant assignments:');
      console.log(`   Update user_products to set tenantId: "${TARGET_TENANT}"\n`);
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run verification
verifyTenantData()
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Verification failed:', err);
    process.exit(1);
  });
