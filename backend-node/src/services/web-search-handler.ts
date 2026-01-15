/**
 * Web Search Handler
 * Detects [SEARCH: query] tags in LLM responses and executes web searches
 * 
 * This is a placeholder implementation. For production, integrate with:
 * - Google Custom Search API
 * - Tavily Search API
 * - Bing Search API
 * - SerpAPI
 */

interface SearchResult {
  title: string;
  snippet: string;
  link: string;
  position?: number;
}

/**
 * Detect if LLM response contains a search query
 */
export function detectSearchIntent(message: string): { hasSearch: boolean; query?: string; cleanMessage: string } {
  const searchPattern = /\[SEARCH:\s*([^\]]+)\]/i;
  const match = message.match(searchPattern);
  
  if (match) {
    return {
      hasSearch: true,
      query: match[1].trim(),
      cleanMessage: message.replace(searchPattern, '').trim()
    };
  }
  
  return {
    hasSearch: false,
    cleanMessage: message
  };
}

/**
 * Execute web search (PLACEHOLDER)
 * Replace this with actual search API integration
 */
export async function executeWebSearch(query: string): Promise<SearchResult[]> {
  console.log('[WebSearch] Executing search:', query);
  
  // PLACEHOLDER: In production, call a real search API
  // Example integrations:
  
  // 1. Google Custom Search API
  // const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  // const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  // const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
  
  // 2. Tavily Search API (AI-focused)
  // const response = await fetch('https://api.tavily.com/search', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ 
  //     api_key: process.env.TAVILY_API_KEY,
  //     query: query,
  //     search_depth: 'advanced',
  //     include_domains: ['healthcare.gov', 'hospital.org']
  //   })
  // });
  
  // 3. SerpAPI
  // const serpapi = require('google-search-results-nodejs');
  // const search = new serpapi.GoogleSearch(process.env.SERPAPI_KEY);
  
  // For now, return mock results
  return getMockSearchResults(query);
}

/**
 * Mock search results for testing
 * Replace with actual API calls in production
 */
function getMockSearchResults(query: string): SearchResult[] {
  // Check if query is about hospitals/healthcare
  if (query.toLowerCase().includes('hospital')) {
    return [
      {
        title: 'Broward Health North - Deerfield Beach',
        snippet: '201 E Sample Rd, Deerfield Beach, FL 33064. Phone: (954) 941-8300. 24-hour emergency services, trauma center, cardiology, orthopedics. Distance: 2.3 miles.',
        link: 'https://browardhealth.org/locations/broward-health-north',
        position: 1
      },
      {
        title: 'Holy Cross Hospital - Fort Lauderdale',
        snippet: '4725 N Federal Hwy, Fort Lauderdale, FL 33308. Phone: (954) 771-8000. Full-service hospital with emergency room, heart institute, cancer center. Distance: 5.1 miles.',
        link: 'https://holy-cross.com',
        position: 2
      },
      {
        title: 'Northwest Medical Center - Margate',
        snippet: '2801 N State Road 7, Margate, FL 33063. Phone: (954) 974-0400. Emergency services, women\'s health, surgery, imaging. Distance: 4.8 miles.',
        link: 'https://northwestmedicalcenter.com',
        position: 3
      }
    ];
  }
  
  // Generic results
  return [
    {
      title: `Search Results for: ${query}`,
      snippet: 'This is a placeholder result. Integrate a real search API for production use.',
      link: 'https://example.com',
      position: 1
    }
  ];
}

/**
 * Format search results for LLM to include in response
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No results found.';
  }
  
  let formatted = '\n\n=== SEARCH RESULTS ===\n\n';
  
  results.forEach((result, idx) => {
    formatted += `${idx + 1}. **${result.title}**\n`;
    formatted += `   ${result.snippet}\n`;
    if (result.link) {
      formatted += `   Link: ${result.link}\n`;
    }
    formatted += '\n';
  });
  
  return formatted;
}

/**
 * Process LLM message and handle search if needed
 * Returns modified message with search results appended
 */
export async function processMessageWithSearch(llmMessage: string): Promise<string> {
  const detection = detectSearchIntent(llmMessage);
  
  if (!detection.hasSearch || !detection.query) {
    // No search needed, return original message
    return llmMessage;
  }
  
  console.log('[WebSearch] Search detected:', detection.query);
  
  try {
    // Execute search
    const results = await executeWebSearch(detection.query);
    
    // Format results
    const formattedResults = formatSearchResults(results);
    
    // Combine original message with search results
    // Remove the [SEARCH:] tag and append results
    return detection.cleanMessage + formattedResults;
    
  } catch (error) {
    console.error('[WebSearch] Search failed:', error);
    return detection.cleanMessage + '\n\n(Search temporarily unavailable)';
  }
}

// Example usage in chat-routes.ts:
/*
import { processMessageWithSearch } from './services/web-search-handler';

// In the /chat/message endpoint, after receiving Java response:
const javaResponse = await axios.post(`${JAVA_VA_URL}/chat/message`, ...);
let assistantMessage = javaResponse.data.message;

// Check for search intent and execute if needed
assistantMessage = await processMessageWithSearch(assistantMessage);

// Return processed message
return res.json({
  ...javaResponse.data,
  message: assistantMessage
});
*/
