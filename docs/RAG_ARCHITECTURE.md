# Per-Prompt RAG Architecture

## Overview

Each prompt in the PMS can have its own independent RAG (Retrieval-Augmented Generation) configuration, allowing users to inject custom knowledge without modifying the core prompt.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                     User Configures RAG                         │
│  1. Selects vector store (Pinecone/MongoDB/Qdrant)             │
│  2. Uploads documents OR connects sources (web/API/DB)         │
│  3. Configures chunking (size, overlap)                        │
│  4. Sets retrieval parameters (top K, min score)               │
└────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│              Document Processing Pipeline                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  1. Document Upload (PDF, DOCX, TXT, HTML, MD)          │ │
│  │     ↓                                                    │ │
│  │  2. Text Extraction (pdf-parse, mammoth, cheerio)       │ │
│  │     ↓                                                    │ │
│  │  3. Chunking (LangChain TextSplitter)                   │ │
│  │     - Chunk size: 512-2048 tokens                       │ │
│  │     - Overlap: 50-200 tokens                            │ │
│  │     ↓                                                    │ │
│  │  4. Embedding Generation (OpenAI/Cohere/HF)             │ │
│  │     - Dimensions: 1536 (ada-002) or 3072 (ada-003)     │ │
│  │     ↓                                                    │ │
│  │  5. Vector Store Indexing (Pinecone/MongoDB/Qdrant)     │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    Stored in `rag_documents` collection
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                 Runtime Retrieval Flow                          │
│                                                                 │
│  User Query: "What is the return policy?"                      │
│       ↓                                                         │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  1. Query Embedding (same model as documents)          │   │
│  └────────────────────────────────────────────────────────┘   │
│       ↓                                                         │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  2. Vector Search in Prompt's Index                    │   │
│  │     - Top K = 5 results                                │   │
│  │     - Min score = 0.7                                  │   │
│  │     - Optional: Hybrid search (vector + keyword)       │   │
│  └────────────────────────────────────────────────────────┘   │
│       ↓                                                         │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  3. Re-ranking (Optional - Cohere/Cross-Encoder)       │   │
│  │     - Re-rank top 5 results                            │   │
│  │     - Return top 3 after re-ranking                    │   │
│  └────────────────────────────────────────────────────────┘   │
│       ↓                                                         │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  4. Context Injection                                  │   │
│  │     Template: "Context: {chunks}\n\nUser: {query}"     │   │
│  │     Max tokens: 2000                                   │   │
│  │     Citations: [1] Source - URL                        │   │
│  └────────────────────────────────────────────────────────┘   │
│       ↓                                                         │
│  Final Prompt = System + RAG Context + User Query              │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Configuration Phase (One-Time Setup)

```
User → RAG Config UI → Backend API → MongoDB (prompt_versions)
                            ↓
                    Vector Store Setup
                (Create index for this prompt)
```

### 2. Document Upload Phase

```
User uploads PDF
      ↓
Backend processes document
      ↓
Chunks stored in MongoDB (rag_documents)
      ↓
Embeddings sent to Vector Store
      ↓
Index ready for retrieval
```

### 3. Runtime Query Phase

```
User sends query to VA
      ↓
Backend loads prompt config (includes RAG settings)
      ↓
If RAG enabled:
   ├─ Embed query
   ├─ Search vector store
   ├─ Retrieve top K chunks
   └─ Inject into prompt
      ↓
Send to LLM (Claude/GPT)
      ↓
Return response with citations
```

---

## Vector Store Options

### Option 1: Pinecone (Recommended for Production)

**Pros:**
- Fully managed, no ops
- Fast (< 50ms queries)
- Auto-scaling
- Built-in metadata filtering

**Cons:**
- Paid ($70/month for starter)

**Implementation:**
```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Create index for prompt
await pinecone.createIndex({
  name: `prompt-${promptId}`,
  dimension: 1536,
  metric: 'cosine'
});

// Index chunks
await index.upsert(chunks.map(chunk => ({
  id: chunk.chunkId,
  values: chunk.embedding,
  metadata: { text: chunk.text, page: chunk.page }
})));

// Query
const results = await index.query({
  vector: queryEmbedding,
  topK: 5,
  includeMetadata: true
});
```

### Option 2: MongoDB Atlas Vector Search (Recommended if already using Atlas)

**Pros:**
- Same database as PMS
- No extra service
- Free tier available

**Cons:**
- Slightly slower than Pinecone
- Requires Atlas M10+ for production

**Implementation:**
```javascript
// Create vector search index
db.rag_documents.createSearchIndex({
  name: "vector_index",
  type: "vectorSearch",
  definition: {
    fields: [{
      type: "vector",
      path: "chunks.embedding",
      numDimensions: 1536,
      similarity: "cosine"
    }]
  }
});

// Query
const results = await db.rag_documents.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "chunks.embedding",
      queryVector: queryEmbedding,
      numCandidates: 100,
      limit: 5
    }
  }
]);
```

### Option 3: Qdrant (Open Source)

**Pros:**
- Free, self-hosted
- Good performance
- Full control

**Cons:**
- Need to manage infrastructure
- More setup

---

## Knowledge Source Types

### 1. Website/URL Scraping (PRIMARY - Most Common Use Case)

**Overview:** Automatically scrape content from URLs and websites to keep prompt context up-to-date with external documentation, help centers, blogs, and knowledge bases.

**Configuration:**
```typescript
{
  type: "website",
  name: "Company Help Center",
  enabled: true,
  config: {
    // Starting URL(s)
    url: "https://example.com/help",
    startUrls: [
      "https://example.com/help",
      "https://example.com/docs",
      "https://example.com/faq"
    ],

    // Crawling behavior
    crawlDepth: 3,                    // How many links deep to follow
    maxPages: 100,                    // Maximum pages to scrape
    allowedDomains: ["example.com"],  // Only crawl these domains
    excludePatterns: [
      "/admin/*",                     // Exclude admin pages
      "/login",                       // Exclude login pages
      "*.pdf"                         // Exclude PDF links (handle separately)
    ],
    includePatterns: [
      "/help/*",                      // Only include help pages
      "/docs/*",                      // Only include documentation
      "/kb/*"                         // Only include knowledge base
    ],

    // Content extraction
    cssSelector: "article.content",   // Target specific HTML elements
    excludeSelectors: [".ads", ".nav"], // Exclude navigation, ads, etc.
    extractMetadata: true,            // Extract title, author, date
    followLinks: true,                // Follow internal links
    respectRobotsTxt: true,           // Respect robots.txt

    // Authentication (if needed)
    requiresAuth: false,
    authType: "basic",                // "basic", "bearer", "oauth"
    credentials: {
      username: "encrypted_user",
      password: "encrypted_pass",
      // or
      bearerToken: "encrypted_token"
    },

    // Rate limiting (be a good citizen)
    requestDelay: 1000,               // 1 second between requests
    maxConcurrentRequests: 2,

    // Auto-sync settings
    refreshInterval: 24,              // Hours (daily updates)
    webhookUrl: null                  // Optional: webhook for manual triggers
  },

  // Processing settings
  chunkSize: 512,
  chunkOverlap: 50,

  // Stats
  stats: {
    totalPages: 87,
    totalChunks: 423,
    lastSyncDuration: 45000,          // 45 seconds
    lastRefreshedAt: "2024-01-15T02:00:00Z"
  }
}
```

**Implementation Tools:**

1. **Puppeteer/Playwright** (Headless Browser - For JavaScript-heavy sites)
   ```typescript
   import puppeteer from 'puppeteer';

   async function scrapePage(url: string) {
     const browser = await puppeteer.launch();
     const page = await browser.newPage();
     await page.goto(url, { waitUntil: 'networkidle0' });

     // Extract content
     const content = await page.evaluate(() => {
       const article = document.querySelector('article.content');
       return article?.innerText || '';
     });

     await browser.close();
     return content;
   }
   ```

2. **Cheerio** (Static HTML parsing - Faster, for simple sites)
   ```typescript
   import axios from 'axios';
   import * as cheerio from 'cheerio';

   async function scrapePage(url: string) {
     const { data } = await axios.get(url);
     const $ = cheerio.load(data);

     // Remove unwanted elements
     $('.ads, .nav, footer').remove();

     // Extract content
     const content = $('article.content').text();
     return content;
   }
   ```

3. **Firecrawl** (Managed scraping service - Easiest)
   ```typescript
   import FirecrawlApp from '@mendable/firecrawl-js';

   const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

   async function scrapeWebsite(url: string) {
     const result = await firecrawl.crawlUrl(url, {
       crawlerOptions: {
         excludes: ['/admin/*'],
         includes: ['/help/*'],
         maxDepth: 3,
         limit: 100
       },
       pageOptions: {
         onlyMainContent: true
       }
     });

     return result.data;  // Clean markdown content
   }
   ```

**Processing Flow:**
```
1. Schedule sync (cron: "0 2 * * *" = 2 AM daily)
     ↓
2. Fetch URLs with rate limiting
     ↓
3. Extract content (Puppeteer/Cheerio/Firecrawl)
     ↓
4. Clean HTML (remove nav, ads, footers)
     ↓
5. Convert to markdown (preserves structure)
     ↓
6. Chunk text (512 tokens, 50 overlap)
     ↓
7. Generate embeddings
     ↓
8. Upsert to vector store
     ↓
9. Update stats and lastRefreshedAt
```

**Use Cases:**
- **Help Center Sync** - Daily scrape of company help documentation
- **Product Docs** - Keep technical documentation up-to-date
- **Blog Content** - Index company blog posts for customer questions
- **Competitor Research** - Monitor competitor feature pages (public only)
- **News/Updates** - Track industry news for contextual awareness

**Cost:**
- **Self-hosted (Cheerio):** Free (just compute)
- **Puppeteer:** Free (more compute for headless browser)
- **Firecrawl:** ~$0.003 per page crawled (~$30/month for 10,000 pages)

**Recommended Approach:** Start with Cheerio for static sites, upgrade to Puppeteer for JavaScript-heavy sites, or use Firecrawl for hands-off managed solution.

---

### 2. Document Upload
- **Supported:** PDF, DOCX, TXT, HTML, Markdown
- **Processing:** Extract text → Chunk → Embed → Index
- **Use case:** Product manuals, policies, FAQs, internal documentation
- **Upload:** Drag-and-drop interface or API endpoint
- **Versioning:** Track document updates, re-index on change

---

### 3. API Integration
- **Config:** API endpoint, auth, query, response mapping
- **Processing:** Fetch JSON → Extract text fields → Chunk → Embed → Index
- **Sync:** Real-time (webhook) or scheduled (every 15 min / hourly)
- **Use case:** Product catalog, inventory, pricing, CRM data
- **Example:** Shopify API for product data, Salesforce API for customer info

---

### 4. Database Connection
- **Config:** Connection string (PostgreSQL, MySQL, MongoDB), SQL query
- **Processing:** Query DB → Format results as text → Chunk → Embed → Index
- **Sync:** Scheduled (hourly/daily) or CDC (Change Data Capture)
- **Use case:** Customer data, product specs, historical data
- **Security:** Encrypted connection strings, read-only access recommended

---

## Website Scraping Tools Comparison

| Tool | Best For | Pros | Cons | Cost |
|------|----------|------|------|------|
| **Cheerio** | Static HTML sites | Fast, lightweight, no browser overhead | Can't handle JavaScript-rendered content | Free |
| **Puppeteer** | JavaScript-heavy sites | Full browser, handles SPAs, screenshots | Slower, more memory | Free |
| **Playwright** | Modern web apps | Cross-browser, fast, reliable | Heavier dependency | Free |
| **Firecrawl** | Hands-off scraping | Managed, handles JS, returns markdown | Paid service, less control | $0.003/page |
| **Apify** | Large-scale scraping | Actors for common sites, proxies | Complex setup, overkill for simple needs | Paid |
| **Beautiful Soup** | Python-based | Great for Python services | Requires Python runtime | Free |

**Recommended Stack:**
```typescript
// RAG Scraping Service
class WebScrapingService {
  async scrapeUrl(url: string, config: SourceConfig) {
    // Decision logic based on site requirements
    if (config.requiresJavaScript) {
      return this.scrapWithPuppeteer(url, config);
    } else {
      return this.scrapeWithCheerio(url, config);
    }
  }

  async scrapeWithCheerio(url: string, config: SourceConfig) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Remove unwanted elements
    $(config.excludeSelectors.join(', ')).remove();

    // Extract content
    const content = config.cssSelector
      ? $(config.cssSelector).text()
      : $('body').text();

    return {
      content,
      metadata: {
        title: $('title').text(),
        url
      }
    };
  }

  async scrapWithPuppeteer(url: string, config: SourceConfig) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle0' });

    const content = await page.evaluate((selector) => {
      const element = selector
        ? document.querySelector(selector)
        : document.body;
      return element?.innerText || '';
    }, config.cssSelector);

    await browser.close();

    return { content, metadata: { url } };
  }

  async crawlWebsite(startUrl: string, config: SourceConfig) {
    const visited = new Set<string>();
    const queue = [startUrl];
    const results = [];

    while (queue.length > 0 && results.length < config.maxPages) {
      const url = queue.shift();
      if (visited.has(url)) continue;

      visited.add(url);

      // Respect rate limiting
      await this.delay(config.requestDelay);

      // Scrape page
      const { content, links } = await this.scrapePage(url, config);
      results.push({ url, content });

      // Add new links to queue (if within depth limit)
      if (this.getDepth(url, startUrl) < config.crawlDepth) {
        const filteredLinks = links.filter(link =>
          this.matchesPatterns(link, config.includePatterns) &&
          !this.matchesPatterns(link, config.excludePatterns)
        );
        queue.push(...filteredLinks);
      }
    }

    return results;
  }
}
```

---

## URL Source Configuration UI

**User Experience:**

1. **Add URL Source**
   ```
   [Add Knowledge Source] → Select "Website/URL"

   URL Configuration:
   ┌─────────────────────────────────────────────────┐
   │ Starting URL: https://example.com/help          │
   │                                                 │
   │ Crawl Settings:                                 │
   │   Max Depth: [3]     Max Pages: [100]          │
   │                                                 │
   │ Include Patterns:                               │
   │   [+] /help/*                                   │
   │   [+] /docs/*                                   │
   │   [Add Pattern]                                 │
   │                                                 │
   │ Exclude Patterns:                               │
   │   [+] /admin/*                                  │
   │   [+] /login                                    │
   │   [Add Pattern]                                 │
   │                                                 │
   │ Content Selector (optional):                    │
   │   CSS: article.content                          │
   │                                                 │
   │ Sync Schedule:                                  │
   │   [x] Daily at 2:00 AM                         │
   │   [ ] Weekly on Sundays                         │
   │   [ ] Manual only                               │
   │                                                 │
   │           [Test Scrape]  [Save Source]          │
   └─────────────────────────────────────────────────┘
   ```

2. **Test Scraping (Preview)**
   ```
   Testing: https://example.com/help

   ✓ Page loaded (1.2s)
   ✓ Content extracted (87 words)
   ✓ Chunked into 3 chunks

   Preview:
   ┌─────────────────────────────────────────────────┐
   │ Chunk 1 (512 tokens):                           │
   │ "Welcome to our help center. Here you'll find   │
   │  answers to common questions about..."          │
   │                                                 │
   │ Metadata:                                       │
   │   Title: "Help Center - Getting Started"       │
   │   URL: https://example.com/help                │
   │   Extracted: 2024-01-15                         │
   └─────────────────────────────────────────────────┘

   Links found: 15
   - https://example.com/help/billing (included)
   - https://example.com/help/account (included)
   - https://example.com/admin (excluded)

   [Looks Good - Save Source]
   ```

3. **Sync Status Dashboard**
   ```
   Knowledge Sources (3):

   📄 Company Help Center (website)
      Last synced: 2 hours ago
      Status: ✓ Active
      Pages indexed: 87
      Chunks: 423
      Next sync: Today at 2:00 AM
      [Sync Now] [Edit] [Delete]

   📄 Product Documentation (website)
      Last synced: 5 days ago
      Status: ⚠️ Failed (404 errors)
      [View Errors] [Retry]

   📄 Internal Policies (documents)
      Last updated: 1 week ago
      Status: ✓ Active
      Documents: 12
      [Upload New]
   ```

---

## Context Injection Strategies

### Strategy 1: Before User Query (Recommended)
```
System: You are a helpful assistant.

Context from knowledge base:
[1] Our return policy allows returns within 30 days...
[2] Refunds are processed within 5-7 business days...

User: What is your return policy?
```

### Strategy 2: Append to System Prompt
```
System: You are a helpful assistant.

Relevant information:
- Return policy: 30 days
- Refund time: 5-7 days

User: What is your return policy?
```

### Strategy 3: After User Query
```
System: You are a helpful assistant.

User: What is your return policy?

Context: Our return policy allows returns within 30 days...
```

---

## Cost Analysis

### Per-Prompt RAG Costs

**Setup (One-Time):**
- Vector store index creation: Free (Pinecone) or $0 (MongoDB)
- Document processing: $0.001-0.01 per document (embedding cost)

**Ongoing (Per Query):**
- Query embedding: $0.0001 (OpenAI ada-002)
- Vector search: $0 (included in Pinecone plan) or $0 (MongoDB)
- Re-ranking (optional): $0.002 (Cohere)
- **Total per query: ~$0.002**

**Monthly (1000 queries/prompt):**
- Base: $70 (Pinecone starter) or $0 (MongoDB Atlas free)
- Embeddings: $2 (queries + documents)
- Re-ranking: $20 (if enabled)
- **Total: ~$22-92/month** depending on vector store

---

## Testing RAG Quality

### Metrics to Track

1. **Retrieval Precision**
   - Are retrieved chunks relevant to query?
   - Metric: Precision@K (top K results)

2. **Retrieval Recall**
   - Did we retrieve all relevant chunks?
   - Metric: Recall@K

3. **Answer Quality**
   - Does the LLM answer correctly with RAG context?
   - Metric: Human evaluation / LLM-as-judge

4. **Latency**
   - How long does retrieval take?
   - Target: < 100ms for search + embedding

5. **Cost**
   - Embedding costs, vector store costs
   - Track per-prompt

### Test Interface

The PMS will include a **Retrieval Tester** UI:
- Input test queries
- See retrieved chunks with scores
- Preview final prompt with injected context
- Test against live vector store

---

## Recommendation

**Start with:**
1. **Pinecone** for vector store (easiest, fastest)
2. **OpenAI ada-002** for embeddings (cheap, reliable)
3. **512-token chunks** with 50-token overlap
4. **Top 5 retrieval** with 0.7 min score
5. **Before-user** context injection

**Optimize later:**
- Add re-ranking if precision is low
- Try hybrid search for better keyword matching
- Experiment with chunk sizes based on your data

This per-prompt RAG system enables powerful knowledge customization without modifying core prompts!

---

**Last Updated:** 2026-02-02
**Version:** 1.0.0
**Related:** [PMS Implementation Plan](./PMS_IMPLEMENTATION_PLAN.md), [Agentic Flows](./AGENTIC_FLOWS.md)
