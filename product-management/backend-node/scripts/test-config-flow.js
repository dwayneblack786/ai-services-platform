const { MongoClient, ObjectId } = require('mongodb');

async function testConfigurationFlow() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('ai_platform');
    
    // Simulate loading config for a product
    const tenantId = 'ten-splendor-florida-33064';
    const productId = new ObjectId('69667c560e03d4f31472dbd3'); // Healthcare product
    
    console.log('Testing configuration flow for:');
    console.log('  Tenant:', tenantId);
    console.log('  Product:', productId.toString(), '\n');
    
    // 1. Check if channel exists
    let channel = await db.collection('assistant_channels').findOne({
      tenantId,
      productId
    });
    
    console.log('1. Existing channel:', channel ? 'YES' : 'NO');
    
    // 2. If no channel, get product and template
    if (!channel) {
      const product = await db.collection('products').findOne({ _id: productId });
      console.log('2. Product found:', product.name);
      console.log('   Template ID:', product.defaultPromptTemplateId);
      
      if (product.defaultPromptTemplateId) {
        const template = await db.collection('prompt_templates').findOne({ _id: product.defaultPromptTemplateId });
        console.log('3. Template found:', template.name);
        console.log('   Voice greeting:', template.voice.greeting.substring(0, 60) + '...');
        
        // Create default channel
        const defaultChannel = {
          tenantId,
          customerId: tenantId,
          productId,
          voice: {
            enabled: true,
            phoneNumber: null,
            provider: 'twilio',
            promptTemplateId: template._id,
            customPrompts: null,
            ragConfig: { enabled: false, sources: [] },
            promptContext: {}
          },
          chat: {
            enabled: true,
            promptTemplateId: template._id,
            customPrompts: null,
            ragConfig: { enabled: false, sources: [] },
            promptContext: {}
          },
          sms: { enabled: false },
          whatsapp: { enabled: false },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        console.log('\n4. Would create channel with template defaults');
        console.log('   Channel would have promptTemplateId:', template._id);
      }
    } else {
      console.log('2. Channel exists');
      console.log('   Voice template ID:', channel.voice?.promptTemplateId);
      console.log('   Has custom prompts:', !!channel.voice?.customPrompts);
      
      if (channel.voice?.promptTemplateId) {
        const template = await db.collection('prompt_templates').findOne({ 
          _id: channel.voice.promptTemplateId 
        });
        console.log('3. Template:', template ? template.name : 'NOT FOUND');
      }
    }
    
    console.log('\n✅ Flow test complete');
    
    await client.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConfigurationFlow();
