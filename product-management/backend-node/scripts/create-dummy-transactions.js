const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';
const DEV_TENANT_ID = 'ten-splendor-florida-33064';

// Product catalog for realistic transactions
const PRODUCTS = [
  { id: 'cv-service', name: 'Computer Vision Service', price: 4999 }, // $49.99
  { id: 'idp-service', name: 'Document Processing Service', price: 3999 }, // $39.99
  { id: 'va-service', name: 'Voice Analysis Service', price: 2999 }, // $29.99
  { id: 'ai-consulting', name: 'AI Consulting Hours', price: 15000 }, // $150.00
  { id: 'api-credits', name: 'API Credits Package', price: 9999 } // $99.99
];

async function createDummyTransactions() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const transactionsCollection = db.collection('transactions');
    const paymentMethodsCollection = db.collection('payment_methods');

    // Get all payment methods for ten-splendor-florida-33064
    const paymentMethods = await paymentMethodsCollection
      .find({ tenantId: DEV_TENANT_ID })
      .toArray();

    if (paymentMethods.length === 0) {
      console.error('✗ No payment methods found for tenant:', DEV_TENANT_ID);
      console.log('Please run create-dummy-payment-methods.js first');
      return;
    }

    console.log(`✓ Found ${paymentMethods.length} payment methods`);

    // Clear existing transactions for this tenant
    await transactionsCollection.deleteMany({ tenantId: DEV_TENANT_ID });
    console.log('✓ Cleared existing transactions');

    const transactions = [];
    const now = new Date();

    // Create transaction history for each payment method
    for (const pm of paymentMethods) {
      let transactionCount = 0;
      let lastTransactionDate = null;
      let lastTransactionAmount = null;
      let lastTransactionStatus = null;

      // Visa ending in 4242 - 12 successful transactions
      if (pm.cardLast4 === '4242') {
        for (let i = 0; i < 12; i++) {
          const daysAgo = 7 + (i * 8); // Every ~8 days over 3 months
          const transactionDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
          const product = PRODUCTS[i % PRODUCTS.length];
          
          const transaction = {
            tenantId: DEV_TENANT_ID,
            userId: pm.userId,
            paymentMethodId: pm._id.toString(),
            transactionId: `txn_success_${Date.now()}_${i}`,
            stripeChargeId: `ch_success_${Date.now()}_${i}`,
            amount: product.price,
            currency: 'usd',
            status: 'success',
            type: i % 3 === 0 ? 'subscription' : 'one-time',
            productId: product.id,
            productName: product.name,
            description: `Payment for ${product.name}`,
            cardBrand: pm.cardBrand,
            cardLast4: pm.cardLast4,
            metadata: {
              invoiceId: `inv_${Date.now()}_${i}`,
              billingPeriod: i % 3 === 0 ? 'monthly' : 'one-time'
            },
            createdAt: transactionDate,
            updatedAt: transactionDate
          };

          transactions.push(transaction);
          transactionCount++;
          if (!lastTransactionDate || transactionDate > lastTransactionDate) {
            lastTransactionDate = transactionDate;
            lastTransactionAmount = product.price;
            lastTransactionStatus = 'success';
          }
        }
      }

      // Mastercard ending in 0002 - 5 transactions (3 failed, 2 success)
      if (pm.cardLast4 === '0002') {
        const transactionPatterns = [
          { daysAgo: 5, status: 'failed', failureCode: 'insufficient_funds' },
          { daysAgo: 15, status: 'success' },
          { daysAgo: 25, status: 'failed', failureCode: 'card_declined' },
          { daysAgo: 40, status: 'success' },
          { daysAgo: 60, status: 'failed', failureCode: 'card_declined' }
        ];

        for (let i = 0; i < transactionPatterns.length; i++) {
          const pattern = transactionPatterns[i];
          const transactionDate = new Date(now.getTime() - (pattern.daysAgo * 24 * 60 * 60 * 1000));
          const product = PRODUCTS[i % PRODUCTS.length];
          
          const transaction = {
            tenantId: DEV_TENANT_ID,
            userId: pm.userId,
            paymentMethodId: pm._id.toString(),
            transactionId: `txn_${pattern.status}_${Date.now()}_${i}`,
            stripeChargeId: pattern.status === 'success' ? `ch_success_${Date.now()}_${i}` : undefined,
            amount: product.price,
            currency: 'usd',
            status: pattern.status,
            type: 'one-time',
            productId: product.id,
            productName: product.name,
            description: `Payment for ${product.name}`,
            cardBrand: pm.cardBrand,
            cardLast4: pm.cardLast4,
            failureReason: pattern.failureCode ? getFailureReason(pattern.failureCode) : undefined,
            failureCode: pattern.failureCode,
            metadata: {
              invoiceId: `inv_${Date.now()}_${i}`,
              attemptNumber: pattern.status === 'failed' ? 1 : undefined
            },
            createdAt: transactionDate,
            updatedAt: transactionDate
          };

          transactions.push(transaction);
          transactionCount++;
          if (!lastTransactionDate || transactionDate > lastTransactionDate) {
            lastTransactionDate = transactionDate;
            lastTransactionAmount = product.price;
            lastTransactionStatus = pattern.status;
          }
        }
      }

      // Amex ending in 9999 - 3 old transactions (before expiration)
      if (pm.cardLast4 === '9999') {
        for (let i = 0; i < 3; i++) {
          const daysAgo = 700 + (i * 30); // Over 2 years ago
          const transactionDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
          const product = PRODUCTS[i % PRODUCTS.length];
          
          const transaction = {
            tenantId: DEV_TENANT_ID,
            userId: pm.userId,
            paymentMethodId: pm._id.toString(),
            transactionId: `txn_old_${Date.now()}_${i}`,
            stripeChargeId: `ch_old_${Date.now()}_${i}`,
            amount: product.price,
            currency: 'usd',
            status: 'success',
            type: 'one-time',
            productId: product.id,
            productName: product.name,
            description: `Payment for ${product.name}`,
            cardBrand: pm.cardBrand,
            cardLast4: pm.cardLast4,
            metadata: {
              invoiceId: `inv_${Date.now()}_${i}`
            },
            createdAt: transactionDate,
            updatedAt: transactionDate
          };

          transactions.push(transaction);
          transactionCount++;
          if (!lastTransactionDate || transactionDate > lastTransactionDate) {
            lastTransactionDate = transactionDate;
            lastTransactionAmount = product.price;
            lastTransactionStatus = 'success';
          }
        }
      }

      // Update payment method with transaction stats
      if (transactionCount > 0) {
        await paymentMethodsCollection.updateOne(
          { _id: pm._id },
          {
            $set: {
              transactionCount,
              lastTransactionDate,
              lastTransactionAmount,
              lastTransactionStatus,
              updatedAt: now
            }
          }
        );
        console.log(`✓ Updated payment method ${pm.cardLast4} with ${transactionCount} transactions`);
      }
    }

    // Insert all transactions
    if (transactions.length > 0) {
      await transactionsCollection.insertMany(transactions);
      console.log(`\n✓ Created ${transactions.length} transactions for tenant: ${DEV_TENANT_ID}`);
      
      // Summary
      const successCount = transactions.filter(t => t.status === 'success').length;
      const failedCount = transactions.filter(t => t.status === 'failed').length;
      
      console.log('\nTransaction Summary:');
      console.log(`  Total: ${transactions.length}`);
      console.log(`  Successful: ${successCount}`);
      console.log(`  Failed: ${failedCount}`);
      
      // Recent transactions
      const recentTransactions = transactions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);
      
      console.log('\nRecent Transactions:');
      recentTransactions.forEach(t => {
        const date = t.createdAt.toISOString().split('T')[0];
        const amount = (t.amount / 100).toFixed(2);
        console.log(`  ${date} | ${t.status.padEnd(8)} | $${amount.padStart(7)} | ${t.cardBrand} ****${t.cardLast4}`);
      });
    }

  } catch (error) {
    console.error('✗ Error creating dummy transactions:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✓ Database connection closed');
  }
}

function getFailureReason(code) {
  const reasons = {
    'insufficient_funds': 'Your card has insufficient funds.',
    'card_declined': 'Your card was declined.',
    'expired_card': 'Your card has expired.',
    'incorrect_cvc': 'The card security code is incorrect.',
    'processing_error': 'An error occurred while processing your card.',
    'card_not_supported': 'Your card is not supported.'
  };
  return reasons[code] || 'The transaction failed.';
}

// Run the script
createDummyTransactions()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
