const { MongoClient } = require('mongodb');

async function checkTemplates() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('ai_platform');
    
    const products = await db.collection('products').find({ category: 'Virtual Assistant' }).toArray();
    console.log('Product → Template Associations:\n');
    
    for (const product of products) {
      if (product.defaultPromptTemplateId) {
        const template = await db.collection('prompt_templates').findOne({ _id: product.defaultPromptTemplateId });
        console.log(`✓ ${product.name}`);
        console.log(`  → Template: ${template ? template.name : 'NOT FOUND'}`);
        console.log(`  → Industry: ${template ? template.industry : 'N/A'}\n`);
      } else {
        console.log(`✗ ${product.name}`);
        console.log(`  → No template assigned\n`);
      }
    }
    
    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTemplates();
