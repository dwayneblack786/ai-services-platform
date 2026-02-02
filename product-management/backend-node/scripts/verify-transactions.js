const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';
const DEV_TENANT_ID = 'ten-splendor-florida-33064';

async function verifyTransactions() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const transactionsCollection = db.collection('transactions');
    const paymentMethodsCollection = db.collection('payment_methods');

    // Get all transactions
    const transactions = await transactionsCollection
      .find({ tenantId: DEV_TENANT_ID })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Found ${transactions.length} transactions for tenant: ${DEV_TENANT_ID}\n`);

    // Group by payment method
    const paymentMethods = await paymentMethodsCollection
      .find({ tenantId: DEV_TENANT_ID })
      .toArray();

    console.log('Transactions by Payment Method:');
    console.log('================================\n');

    for (const pm of paymentMethods) {
      const pmTransactions = transactions.filter(t => t.paymentMethodId === pm._id.toString());
      const successful = pmTransactions.filter(t => t.status === 'success').length;
      const failed = pmTransactions.filter(t => t.status === 'failed').length;

      console.log(`${pm.cardBrand.toUpperCase()} ****${pm.cardLast4}:`);
      console.log(`  Total Transactions: ${pmTransactions.length}`);
      console.log(`  Successful: ${successful}`);
      console.log(`  Failed: ${failed}`);
      console.log(`  Transaction Count (PM): ${pm.transactionCount}`);
      
      if (pmTransactions.length > 0) {
        console.log('\n  Recent Transactions:');
        pmTransactions.slice(0, 3).forEach(t => {
          const date = new Date(t.createdAt).toISOString().split('T')[0];
          const amount = (t.amount / 100).toFixed(2);
          const status = t.status === 'success' ? '✓' : '✗';
          console.log(`    ${status} ${date} | $${amount.padStart(7)} | ${t.productName || 'N/A'}`);
        });
      }
      console.log('');
    }

    // Overall statistics
    console.log('\nOverall Statistics:');
    console.log('===================');
    const totalAmount = transactions
      .filter(t => t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0);
    
    console.log(`Total Transactions: ${transactions.length}`);
    console.log(`Successful: ${transactions.filter(t => t.status === 'success').length}`);
    console.log(`Failed: ${transactions.filter(t => t.status === 'failed').length}`);
    console.log(`Total Amount (Successful): $${(totalAmount / 100).toFixed(2)}`);
    console.log(`Average Amount: $${(totalAmount / transactions.filter(t => t.status === 'success').length / 100).toFixed(2)}`);

  } catch (error) {
    console.error('✗ Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Database connection closed');
  }
}

verifyTransactions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
