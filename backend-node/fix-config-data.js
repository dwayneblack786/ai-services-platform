const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';
const TARGET_TENANT = 'ten-splendor-florida-33064';
const OLD_PRODUCT_ID = '69667c560e03d4f31472dbd3'; // Invalid product
const NEW_PRODUCT_ID = '69728bdb0959e1a2da517684'; // Healthcare VA
const VALID_USER_ID = '6952bf9a6b897da7649318b2'; // Dwayne Black

async function fixConfigurationData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FIXING CONFIGURATION DATA');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // 1. Fix assistant_channels productId
    console.log('📝 STEP 1: Fixing Assistant Channels');
    console.log('─────────────────────────────────────────────────────────');
    
    const channels = await db.collection('assistant_channels').find({
      tenantId: TARGET_TENANT
    }).toArray();
    
    console.log(`Found ${channels.length} channel(s) for tenant\n`);
    
    for (const channel of channels) {
      console.log(`Channel ${channel._id}:`);
      console.log(`  Current Product ID: ${channel.productId}`);
      console.log(`  Target Product ID: ${NEW_PRODUCT_ID}`);
      
      if (channel.productId.toString() !== NEW_PRODUCT_ID) {
        console.log(`  Updating...`);
        
        await db.collection('assistant_channels').updateOne(
          { _id: channel._id },
          { 
            $set: { 
              productId: new ObjectId(NEW_PRODUCT_ID),
              updatedAt: new Date()
            } 
          }
        );
        
        console.log(`  ✅ Updated\n`);
      } else {
        console.log(`  ✅ Already correct\n`);
      }
    }
    
    // 2. Fix product_configurations productId
    console.log('📝 STEP 2: Fixing Product Configurations');
    console.log('─────────────────────────────────────────────────────────');
    
    const productConfigs = await db.collection('product_configurations').find({
      tenantId: TARGET_TENANT
    }).toArray();
    
    console.log(`Found ${productConfigs.length} product configuration(s)\n`);
    
    for (const config of productConfigs) {
      console.log(`Config ${config._id}:`);
      console.log(`  Current Product ID: ${config.productId}`);
      console.log(`  Current User ID: ${config.userId}`);
      
      const updates = {};
      
      if (config.productId.toString() !== NEW_PRODUCT_ID) {
        console.log(`  Will update Product ID`);
        updates.productId = new ObjectId(NEW_PRODUCT_ID);
      }
      
      if (config.userId !== VALID_USER_ID && config.userId !== new ObjectId(VALID_USER_ID).toString()) {
        console.log(`  Will update User ID to ${VALID_USER_ID}`);
        updates.userId = new ObjectId(VALID_USER_ID);
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        
        await db.collection('product_configurations').updateOne(
          { _id: config._id },
          { $set: updates }
        );
        
        console.log(`  ✅ Updated\n`);
      } else {
        console.log(`  ✅ Already correct\n`);
      }
    }
    
    // 3. Create prompt_configurations from prompt_templates for Healthcare VA
    console.log('📝 STEP 3: Creating Prompt Configurations');
    console.log('─────────────────────────────────────────────────────────');
    
    // Check if prompt_configurations exists
    const existingPromptConfigs = await db.collection('prompt_configurations').find({
      tenantId: TARGET_TENANT,
      productId: new ObjectId(NEW_PRODUCT_ID)
    }).toArray();
    
    console.log(`Existing prompt_configurations: ${existingPromptConfigs.length}\n`);
    
    if (existingPromptConfigs.length === 0) {
      // Get the healthcare template
      const template = await db.collection('prompt_templates').findOne({
        industry: 'healthcare',
        isDefault: false // Get the custom Acme Healthcare one
      });
      
      if (template) {
        console.log(`Found template: ${template.name}`);
        console.log(`Creating prompt_configuration for Healthcare VA...\n`);
        
        const promptConfig = {
          _id: new ObjectId(),
          tenantId: TARGET_TENANT,
          productId: new ObjectId(NEW_PRODUCT_ID),
          userId: new ObjectId(VALID_USER_ID),
          name: 'Healthcare VA Configuration',
          description: 'Prompt configuration for Healthcare Virtual Assistant',
          type: 'assistant',
          version: '1.0',
          promptContext: template.promptContext,
          customPrompts: template.customPrompts,
          ragConfig: template.ragConfig,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.collection('prompt_configurations').insertOne(promptConfig);
        console.log(`  ✅ Created prompt_configuration: ${promptConfig._id}\n`);
      } else {
        console.log(`  ⚠️  No suitable template found\n`);
      }
    } else {
      console.log(`  ✅ Prompt configurations already exist\n`);
    }
    
    // 4. Verification
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Verify assistant_channels
    const updatedChannels = await db.collection('assistant_channels').find({
      tenantId: TARGET_TENANT
    }).toArray();
    
    console.log(`📋 Assistant Channels: ${updatedChannels.length}`);
    updatedChannels.forEach(ch => {
      const product = ch.productId.toString() === NEW_PRODUCT_ID ? '✅' : '❌';
      console.log(`  ${product} ${ch._id} → Product: ${ch.productId}`);
    });
    console.log('');
    
    // Verify product_configurations
    const updatedConfigs = await db.collection('product_configurations').find({
      tenantId: TARGET_TENANT
    }).toArray();
    
    console.log(`📋 Product Configurations: ${updatedConfigs.length}`);
    updatedConfigs.forEach(cfg => {
      const product = cfg.productId.toString() === NEW_PRODUCT_ID ? '✅' : '❌';
      console.log(`  ${product} ${cfg._id} → Product: ${cfg.productId}, User: ${cfg.userId}`);
    });
    console.log('');
    
    // Verify prompt_configurations
    const promptConfigs = await db.collection('prompt_configurations').find({
      tenantId: TARGET_TENANT,
      productId: new ObjectId(NEW_PRODUCT_ID)
    }).toArray();
    
    console.log(`📋 Prompt Configurations: ${promptConfigs.length}`);
    promptConfigs.forEach(pc => {
      console.log(`  ✅ ${pc._id} → ${pc.name}`);
    });
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const allCorrect = 
      updatedChannels.every(ch => ch.productId.toString() === NEW_PRODUCT_ID) &&
      updatedConfigs.every(cfg => cfg.productId.toString() === NEW_PRODUCT_ID) &&
      promptConfigs.length > 0;
    
    if (allCorrect) {
      console.log('✅ ALL CONFIGURATION DATA FIXED!');
      console.log(`✅ All records point to Healthcare VA product (${NEW_PRODUCT_ID})`);
      console.log(`✅ Prompt configurations created`);
      console.log(`✅ Ready for product configuration page\n`);
    } else {
      console.log('⚠️  Some issues remain. Please review above.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run fix
fixConfigurationData()
  .then(() => {
    console.log('\n✅ Fix complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Fix failed:', err);
    process.exit(1);
  });
