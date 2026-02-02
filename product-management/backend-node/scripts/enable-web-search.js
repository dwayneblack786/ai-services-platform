const { MongoClient } = require('mongodb');

/**
 * Enable Web Search / RAG for Assistant
 * Configures the assistant to search the internet for real-time information
 */
async function enableWebSearch() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('ai_platform');
    const customerId = 'ten-splendor-florida-33064';
    
    // RAG Configuration with web search sources
    const ragConfig = {
      enabled: true,
      maxResults: 5,
      confidenceThreshold: 0.7,
      sources: [
        {
          type: 'google_search',
          url: 'https://www.google.com/search',
          description: 'Google Search for general web queries, local businesses, and locations',
          enabled: true
        },
        {
          type: 'google_maps',
          url: 'https://maps.google.com',
          description: 'Google Maps for directions, distances, and location-based searches',
          enabled: true
        },
        {
          type: 'bing_search',
          url: 'https://www.bing.com/search',
          description: 'Bing Search as alternative search engine',
          enabled: false
        }
      ]
    };

    // Update the assistant_channels document
    const result = await db.collection('assistant_channels').updateOne(
      { customerId },
      {
        $set: {
          'chat.ragConfig': ragConfig,
          'updatedAt': new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      console.error(`❌ No assistant_channels found for customerId: ${customerId}`);
      return;
    }

    console.log(`\n✅ Successfully enabled web search for assistant`);
    console.log(`  - Matched: ${result.matchedCount} document(s)`);
    console.log(`  - Modified: ${result.modifiedCount} document(s)`);
    console.log(`  - RAG Enabled: ${ragConfig.enabled}`);
    console.log(`  - Max Results: ${ragConfig.maxResults}`);
    console.log(`  - Search Sources: ${ragConfig.sources.length}`);
    
    // Verify the update
    const updated = await db.collection('assistant_channels').findOne({ customerId });
    console.log(`\n=== VERIFICATION ===`);
    console.log(`RAG Configuration:`);
    console.log(`  - Enabled: ${updated?.chat?.ragConfig?.enabled || false}`);
    console.log(`  - Sources: ${updated?.chat?.ragConfig?.sources?.length || 0}`);
    
    if (updated?.chat?.ragConfig?.sources) {
      console.log(`\nConfigured Sources:`);
      updated.chat.ragConfig.sources.forEach((source, idx) => {
        console.log(`  ${idx + 1}. ${source.type}`);
        console.log(`     URL: ${source.url}`);
        console.log(`     Description: ${source.description}`);
        console.log(`     Enabled: ${source.enabled}`);
      });
    }

    console.log(`\n📝 INSTRUCTIONS FOR USE:`);
    console.log(`\nThe assistant will now:`);
    console.log(`1. Detect when users ask for real-time or location-based information`);
    console.log(`2. Format search queries with [SEARCH: query] tag`);
    console.log(`3. Explain what it's searching for`);
    console.log(`\nExample conversation:`);
    console.log(`User: "Where is the nearest hospital to 33064?"`);
    console.log(`Bot: "I understand you're looking for the nearest hospital...`);
    console.log(`      [SEARCH: hospitals near 33064 Deerfield Beach Florida]`);
    console.log(`      I'm searching for nearby hospitals with contact information."`);
    console.log(`\n⚠️  NOTE: The [SEARCH:] tag indicates the assistant wants to search.`);
    console.log(`    You'll need to implement a backend service to:`);
    console.log(`    - Detect [SEARCH: query] in responses`);
    console.log(`    - Execute the search via Google API, Tavily, or similar`);
    console.log(`    - Return results to the LLM for formatting`);
    console.log(`    - Display formatted results to user`);

  } catch (error) {
    console.error('Error enabling web search:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the function
enableWebSearch()
  .then(() => {
    console.log('\n✅ Web search configuration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to enable web search:', error);
    process.exit(1);
  });
