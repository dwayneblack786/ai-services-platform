const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const dbName = 'ai_platform';

async function testPromptLoading() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Find the Healthcare product
    const product = await db.collection('products').findOne({
      name: 'Healthcare Voice & Chat Assistant'
    });
    console.log('\n=== PRODUCT ===');
    console.log(JSON.stringify(product, null, 2));
    
    if (product) {
      // Find the assistant channel for this product
      const channel = await db.collection('assistant_channels').findOne({
        productId: product._id.toString()
      });
      console.log('\n=== ASSISTANT CHANNEL ===');
      console.log(JSON.stringify(channel, null, 2));
      
      // Find the template
      if (channel && channel.voice && channel.voice.promptTemplateId) {
        const template = await db.collection('prompt_templates').findOne({
          _id: new ObjectId(channel.voice.promptTemplateId)
        });
        console.log('\n=== TEMPLATE ===');
        console.log(JSON.stringify(template, null, 2));
      }
      
      // Also check if product has defaultPromptTemplateId
      if (product.defaultPromptTemplateId) {
        productTemplate = await db.collection('prompt_templates').findOne({
          _id: new ObjectId(product.defaultPromptTemplateId)
        });
        console.log('\n=== PRODUCT DEFAULT TEMPLATE ===');
        console.log(JSON.stringify(defaultTemplate, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testPromptLoading();
