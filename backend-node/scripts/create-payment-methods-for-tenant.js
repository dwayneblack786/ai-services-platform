const { MongoClient, ObjectId } = require('mongodb');

const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'ai_platform';

async function createPaymentMethodsForTenant() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const paymentMethodsCollection = db.collection('payment_methods');
    
    const tenantId = 'ten-splendor-florida-33064';
    const userId = 'user-' + tenantId; // Mock user ID
    const now = new Date();
    
    // Clear existing payment methods for this tenant
    const deleteResult = await paymentMethodsCollection.deleteMany({ tenantId });
    console.log(`Deleted ${deleteResult.deletedCount} existing payment methods for tenant: ${tenantId}`);
    
    // Create test payment methods
    const testPaymentMethods = [
      {
        tenantId,
        userId,
        stripePaymentMethodId: 'pm_good_card_success',
        cardBrand: 'visa',
        cardLast4: '4242',
        cardExpMonth: 12,
        cardExpYear: 2026,
        billingName: 'John Doe',
        billingEmail: 'john@example.com',
        securityCode: '123',
        billingAddress: {
          line1: '123 Main St',
          city: 'Fort Lauderdale',
          state: 'FL',
          postalCode: '33064',
          country: 'US'
        },
        isDefault: true,
        status: 'active',
        transactionCount: 5,
        lastTransactionDate: new Date('2025-12-25'),
        lastTransactionAmount: 9900,
        lastTransactionStatus: 'success',
        createdAt: now,
        updatedAt: now
      },
      {
        tenantId,
        userId,
        stripePaymentMethodId: 'pm_bad_card_decline',
        cardBrand: 'mastercard',
        cardLast4: '0002',
        cardExpMonth: 11,
        cardExpYear: 2026,
        billingName: 'Jane Smith',
        billingEmail: 'jane@example.com',
        securityCode: '456',
        billingAddress: {
          line1: '456 Oak Ave',
          city: 'Pompano Beach',
          state: 'FL',
          postalCode: '33064',
          country: 'US'
        },
        isDefault: false,
        status: 'active',
        transactionCount: 2,
        lastTransactionDate: new Date('2025-12-20'),
        lastTransactionAmount: 4900,
        lastTransactionStatus: 'failed',
        createdAt: now,
        updatedAt: now
      },
      {
        tenantId,
        userId,
        stripePaymentMethodId: 'pm_expired_card',
        cardBrand: 'amex',
        cardLast4: '9999',
        cardExpMonth: 1,
        cardExpYear: 2023,
        billingName: 'Bob Wilson',
        billingEmail: 'bob@example.com',
        securityCode: '789',
        billingAddress: {
          line1: '789 Pine Rd',
          city: 'Coral Springs',
          state: 'FL',
          postalCode: '33064',
          country: 'US'
        },
        isDefault: false,
        status: 'expired',
        transactionCount: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        tenantId,
        userId,
        stripePaymentMethodId: 'pm_visa_5678',
        cardBrand: 'visa',
        cardLast4: '5678',
        cardExpMonth: 8,
        cardExpYear: 2027,
        billingName: 'Alice Johnson',
        billingEmail: 'alice@example.com',
        securityCode: '321',
        billingAddress: {
          line1: '321 Elm St',
          city: 'Fort Lauderdale',
          state: 'FL',
          postalCode: '33064',
          country: 'US'
        },
        isDefault: false,
        status: 'active',
        transactionCount: 12,
        lastTransactionDate: new Date('2025-12-28'),
        lastTransactionAmount: 19900,
        lastTransactionStatus: 'success',
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Insert payment methods
    const result = await paymentMethodsCollection.insertMany(testPaymentMethods);
    console.log(`\n✓ Created ${result.insertedCount} payment methods for tenant: ${tenantId}`);
    
    // Display created payment methods
    console.log('\nCreated payment methods:');
    testPaymentMethods.forEach((pm, index) => {
      console.log(`  ${index + 1}. ${pm.cardBrand.toUpperCase()} ****${pm.cardLast4} - ${pm.billingName} (${pm.status})`);
      console.log(`     Default: ${pm.isDefault}, Transactions: ${pm.transactionCount}`);
    });
    
  } catch (error) {
    console.error('Error creating payment methods:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

createPaymentMethodsForTenant();
