const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

async function createDummyPaymentMethods() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const paymentMethodsCollection = db.collection('payment_methods');

    // Check if dev tenant exists
    const devTenant = await db.collection('tenants').findOne({ tenantId: 'ten-splendor-florida-33064' });
    if (!devTenant) {
      console.log('✗ Dev tenant not found. Please run the server first to create dev tenant.');
      return;
    }

    // Clear existing dummy payment methods
    await paymentMethodsCollection.deleteMany({ 
      tenantId: 'ten-splendor-florida-33064'
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Good payment method - will always succeed verification
    const goodPaymentMethod = {
      tenantId: 'ten-splendor-florida-33064',
      userId: 'local-1767030682932-zh8bsw9ld"',
      stripePaymentMethodId: 'pm_good_card_success',
      cardBrand: 'visa',
      cardLast4: '4242',
      cardExpMonth: 12,
      cardExpYear: 2025,
      billingName: 'Good Test Card',
      billingEmail: 'success@test.com',
      billingAddress: {
        line1: '123 Success Street',
        city: 'Test City',
        state: 'CA',
        postalCode: '90210',
        country: 'US'
      },
      isDefault: true,
      status: 'active',
      lastTransactionDate: thirtyDaysAgo,
      lastTransactionAmount: 9900, // $99.00 in cents
      lastTransactionStatus: 'success',
      transactionCount: 5,
      createdAt: ninetyDaysAgo,
      updatedAt: thirtyDaysAgo
    };

    // Bad payment method - will always fail verification
    const badPaymentMethod = {
      tenantId: 'ten-splendor-florida-33064',
      userId: 'email',
      stripePaymentMethodId: 'pm_bad_card_decline',
      cardBrand: 'mastercard',
      cardLast4: '0002',
      cardExpMonth: 11,
      cardExpYear: 2024,
      billingName: 'Declined Test Card',
      billingEmail: 'decline@test.com',
      billingAddress: {
        line1: '456 Decline Avenue',
        city: 'Test City',
        state: 'NY',
        postalCode: '10001',
        country: 'US'
      },
      isDefault: false,
      status: 'active',
      lastTransactionDate: thirtyDaysAgo,
      lastTransactionAmount: 4900, // $49.00 in cents
      lastTransactionStatus: 'failed',
      transactionCount: 2,
      createdAt: now,
      updatedAt: thirtyDaysAgo
    };

    // Expired payment method - for testing expired card handling
    const expiredPaymentMethod = {
      tenantId: 'ten-splendor-florida-33064',
      userId: '"dwayneblack876@gmail.com"',
      stripePaymentMethodId: 'pm_expired_card',
      cardBrand: 'amex',
      cardLast4: '9999',
      cardExpMonth: 1,
      cardExpYear: 2023,
      billingName: 'Expired Test Card',
      billingEmail: 'expired@test.com',
      billingAddress: {
        line1: '789 Expired Road',
        city: 'Test City',
        state: 'TX',
        postalCode: '75001',
        country: 'US'
      },
      isDefault: false,
      status: 'expired',
      transactionCount: 0,
      createdAt: now,
      updatedAt: now
    };

    // Insert dummy payment methods
    const result = await paymentMethodsCollection.insertMany([
      goodPaymentMethod,
      badPaymentMethod,
      expiredPaymentMethod
    ]);

    console.log(`\n✓ Created ${result.insertedCount} dummy payment methods for ten-splendor-florida-33064\n`);
    console.log('Payment Methods:');
    console.log('  1. ✅ Good Card (Visa ****4242) - Will SUCCEED verification');
    console.log('     ID:', Object.values(result.insertedIds)[0]);
    console.log('  2. ❌ Bad Card (Mastercard ****0002) - Will FAIL verification');
    console.log('     ID:', Object.values(result.insertedIds)[1]);
    console.log('  3. ⏰ Expired Card (Amex ****9999) - Expired status');
    console.log('     ID:', Object.values(result.insertedIds)[2]);
    console.log('\nUse these for testing product signup flow!');

  } catch (error) {
    console.error('✗ Error creating dummy payment methods:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✓ Database connection closed');
  }
}

createDummyPaymentMethods();
