/**
 * Test script to verify comprehensive prompt data is being loaded
 * from templates into assistant channels
 */

const { MongoClient, ObjectId } = require('mongodb');

async function testComprehensiveLoading() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db('ai_platform');

    // 1. Check that Healthcare product has template ID
    console.log('=== 1. Checking Product Configuration ===');
    const product = await db.collection('products').findOne({ 
      name: 'Healthcare Voice & Chat Assistant' 
    });
    
    if (!product) {
      console.log('❌ Healthcare product not found!');
      return;
    }
    
    console.log('Product:', product.name);
    console.log('Product ID:', product._id);
    console.log('Has defaultPromptTemplateId:', !!product.defaultPromptTemplateId);
    
    if (!product.defaultPromptTemplateId) {
      console.log('⚠️  Product does not have defaultPromptTemplateId set');
    }

    // 2. Check the template
    console.log('\n=== 2. Checking Template ===');
    const template = await db.collection('prompt_templates').findOne({ 
      _id: product.defaultPromptTemplateId 
    });
    
    if (!template) {
      console.log('❌ Template not found!');
      return;
    }
    
    console.log('Template name:', template.name);
    console.log('Has promptContext:', !!template.promptContext);
    console.log('Has customPrompts:', !!template.customPrompts);
    console.log('Has ragConfig:', !!template.ragConfig);
    
    if (template.promptContext) {
      console.log('\nPromptContext fields:');
      console.log('  - tenantName:', template.promptContext.tenantName);
      console.log('  - servicesOffered:', template.promptContext.servicesOffered?.length, 'items');
      console.log('  - faqs:', template.promptContext.faqs?.length, 'items');
      console.log('  - locations:', template.promptContext.locations?.length, 'items');
      console.log('  - tone:', template.promptContext.tone);
      console.log('  - allowedActions:', template.promptContext.allowedActions?.length, 'items');
    }
    
    if (template.customPrompts) {
      console.log('\nCustomPrompts fields:');
      console.log('  - prohibitedTopics:', template.customPrompts.prohibitedTopics?.length, 'items');
      console.log('  - complianceRules:', template.customPrompts.complianceRules?.length, 'items');
      console.log('  - privacyPolicy:', !!template.customPrompts.privacyPolicy);
    }
    
    if (template.ragConfig) {
      console.log('\nRAG Config:');
      console.log('  - enabled:', template.ragConfig.enabled);
      console.log('  - sources:', template.ragConfig.sources?.length, 'items');
    }

    // 3. Check assistant_channels for ten-splendor-florida-33064
    console.log('\n=== 3. Checking Assistant Channels ===');
    const channel = await db.collection('assistant_channels').findOne({
      tenantId: 'ten-splendor-florida-33064',
      productId: product._id
    });
    
    if (!channel) {
      console.log('⚠️  No channel found for ten-splendor-florida-33064 with this product');
      console.log('   This is normal - channel will be created on first GET request');
      console.log('   Template data will be loaded from prompt_templates');
    } else {
      console.log('Channel found!');
      console.log('Voice config:');
      console.log('  - enabled:', channel.voice?.enabled);
      console.log('  - has promptContext:', !!channel.voice?.promptContext);
      console.log('  - has customPrompts:', !!channel.voice?.customPrompts);
      console.log('  - has ragConfig:', !!channel.voice?.ragConfig);
      console.log('  - promptTemplateId:', channel.voice?.promptTemplateId);
      
      if (channel.voice?.promptContext) {
        console.log('\nVoice promptContext:');
        console.log('  - tenantName:', channel.voice.promptContext.tenantName);
        console.log('  - servicesOffered:', channel.voice.promptContext.servicesOffered?.length);
        console.log('  - faqs:', channel.voice.promptContext.faqs?.length);
      }
    }

    // 4. Summary
    console.log('\n=== 4. Summary ===');
    if (product.defaultPromptTemplateId && template && template.promptContext) {
      console.log('✅ Product is properly configured');
      console.log('✅ Template has comprehensive data');
      console.log('✅ Ready to load comprehensive prompts into channels');
    } else {
      console.log('❌ Configuration incomplete');
      if (!product.defaultPromptTemplateId) {
        console.log('   - Product needs defaultPromptTemplateId');
      }
      if (!template?.promptContext) {
        console.log('   - Template needs comprehensive promptContext');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Connection closed');
  }
}

testComprehensiveLoading();
