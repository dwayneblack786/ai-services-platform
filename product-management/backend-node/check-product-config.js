const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('ai_platform');
    const productId = '69728bdb0959e1a2da517684';
    
    console.log('\n=== CHECKING PRODUCT ===');
    const product = await db.collection('products').findOne({ 
      _id: new ObjectId(productId)
    });
    
    console.log('Product found:', product ? 'YES' : 'NO');
    if (product) {
      console.log('Product name:', product.name);
      console.log('Product status:', product.status);
      console.log('Product _id:', product._id.toString());
    }
    
    console.log('\n=== CHECKING PRODUCT_CONFIGURATIONS ===');
    console.log('Searching for productId:', productId);
    
    const configs = await db.collection('product_configurations').find({ 
      productId: productId 
    }).toArray();
    
    console.log('Configurations found:', configs.length);
    configs.forEach((c, i) => {
      console.log(`\nConfig ${i+1}:`);
      console.log('  _id:', c._id);
      console.log('  tenantId:', c.tenantId);
      console.log('  productId:', c.productId);
      console.log('  productId type:', typeof c.productId);
      console.log('  status:', c.status);
      console.log('  userId:', c.userId);
    });
    
    console.log('\n=== CHECKING ALL PRODUCT_CONFIGURATIONS ===');
    const allConfigs = await db.collection('product_configurations').find({}).toArray();
    console.log('Total configurations in database:', allConfigs.length);
    
    allConfigs.forEach((c, i) => {
      console.log(`\nConfig ${i+1}:`);
      console.log('  tenantId:', c.tenantId);
      console.log('  productId:', c.productId, '(type:', typeof c.productId + ')');
      console.log('  status:', c.status);
    });
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.close();
  }
}

check();
