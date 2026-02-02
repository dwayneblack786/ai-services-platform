import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-services-platform';

async function fixTenantIds() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    console.log('\n=== Fixing Tenant IDs: default-tenant → tenant-default ===\n');

    // First, let's see what we have
    console.log('Checking product_configurations collection:');
    const productConfigs = await db.collection('product_configurations').find({}).toArray();
    console.log('Total product_configurations:', productConfigs.length);
    productConfigs.forEach(doc => {
      console.log('  -', {
        _id: doc._id,
        tenantId: doc.tenantId,
        productId: doc.productId,
        productIdType: typeof doc.productId,
        productIdConstructor: doc.productId?.constructor?.name,
        status: doc.status
      });
    });

    // Check specifically for the productId from the error
    const searchingProductId = '69728bdb0959e1a2da517684';
    console.log(`\nSearching for productId: ${searchingProductId}`);
    const matchByString = await db.collection('product_configurations').findOne({
      productId: searchingProductId
    });
    console.log('Match by string:', matchByString ? 'FOUND' : 'NOT FOUND');
    
    const matchByObjectId = await db.collection('product_configurations').findOne({
      productId: new mongoose.Types.ObjectId(searchingProductId)
    });
    console.log('Match by ObjectId:', matchByObjectId ? 'FOUND' : 'NOT FOUND');
    
    if (matchByString || matchByObjectId) {
      const foundDoc = (matchByString || matchByObjectId)!;
      console.log('Found document:', {
        _id: foundDoc._id,
        tenantId: foundDoc.tenantId,
        productId: foundDoc.productId,
        status: foundDoc.status
      });
    }

    console.log('\n');

    // Also check subscriptions
    console.log('Checking product_subscriptions collection:');
    const subscriptions = await db.collection('product_subscriptions').find({}).toArray();
    console.log('Total product_subscriptions:', subscriptions.length);
    subscriptions.forEach(doc => {
      console.log('  -', {
        _id: doc._id,
        tenantId: doc.tenantId,
        userId: doc.userId,
        productId: doc.productId,
        productIdType: typeof doc.productId,
        status: doc.status
      });
    });

    console.log('\n');

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    let totalModified = 0;

    for (const collName of collectionNames) {
      // Check if collection has tenantId field
      const sampleDoc = await db.collection(collName).findOne({ tenantId: { $exists: true } });
      
      if (sampleDoc) {
        const result = await db.collection(collName).updateMany(
          { tenantId: 'default-tenant' },
          { $set: { tenantId: 'tenant-default' } }
        );

        if (result.modifiedCount > 0) {
          console.log(`✓ ${collName}: Updated ${result.modifiedCount} document(s)`);
          totalModified += result.modifiedCount;
        }
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total documents updated: ${totalModified}`);
    
    if (totalModified === 0) {
      console.log('No documents needed updating. All tenantIds are correct!');
    } else {
      console.log('All tenant IDs have been fixed successfully!');
    }

  } catch (error) {
    console.error('Error fixing tenant IDs:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
fixTenantIds();
