const { MongoClient } = require('mongodb');

async function checkFieldNames() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('ai_platform');
    
    console.log('=== Checking for defaultTemplateId in products ===');
    const productsWithOldField = await db.collection('products').find({ 
      defaultTemplateId: { $exists: true } 
    }).toArray();
    console.log('Products with defaultTemplateId:', productsWithOldField.length);
    productsWithOldField.forEach(p => {
      console.log('  -', p.name, '- defaultTemplateId:', p.defaultTemplateId);
    });
    
    console.log('\n=== Checking for defaultPromptTemplateId in products ===');
    const productsWithNewField = await db.collection('products').find({ 
      defaultPromptTemplateId: { $exists: true } 
    }).toArray();
    console.log('Products with defaultPromptTemplateId:', productsWithNewField.length);
    productsWithNewField.forEach(p => {
      console.log('  -', p.name, '- defaultPromptTemplateId:', p.defaultPromptTemplateId);
    });
    
    if (productsWithOldField.length > 0) {
      console.log('\n=== Removing defaultTemplateId field ===');
      const result = await db.collection('products').updateMany(
        { defaultTemplateId: { $exists: true } },
        { $unset: { defaultTemplateId: "" } }
      );
      console.log('Removed defaultTemplateId from', result.modifiedCount, 'products');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkFieldNames();
