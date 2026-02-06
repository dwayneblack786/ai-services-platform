/**
 * Phase 2 Gate: RAG Service
 *
 * Tests 2, 3, 5 call syncSource which internally does axios.get().
 * Under Jest 30 + ts-jest 29 (version mismatch in this repo) a jest.mock('axios')
 * causes unbounded heap growth that crashes the worker at ~4 GB — the leak lives in
 * Jest's module registry, not in application code.  The workaround is to serve real
 * HTTP from a local http.createServer so that the *real* axios is used and no mock
 * machinery is involved.
 *
 * cheerio is still mocked with a lightweight regex implementation to avoid pulling in
 * its heavy dependency tree during ts-jest compilation.
 *
 * Test map (5 tests):
 *   1. addSource / removeSource round-trip persists and cleans up correctly
 *   2. syncSource scrapes, chunks, and persists a RagDocument
 *   3. syncSource returns the existing doc unchanged when content has not changed (checksum match)
 *   4. retrieve returns chunks scored by term-overlap, filtered by minScore
 *   5. syncSource with an unreachable URL sets source.status = 'error' and throws
 */

import http from 'http';
import mongoose from 'mongoose';
import PromptVersion from '../../src/models/PromptVersion';
import RagDocument from '../../src/models/RagDocument';

// ---------------------------------------------------------------------------
// Mock cheerio — regex-based extraction is sufficient for our simple test HTML
// ---------------------------------------------------------------------------
jest.mock('cheerio', () => {
  function load(html: string) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const bodyMatch  = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').trim();

    function $(selector: string) {
      return {
        first: () => ({
          text: () => (selector === 'title' && titleMatch) ? titleMatch[1].trim() : ''
        }),
        text: () => (selector === 'body' && bodyMatch) ? stripTags(bodyMatch[1]) : '',
        remove: () => $
      };
    }
    return $;
  }
  return { load };
});

import { RagService } from '../../src/services/rag.service';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const service = new RagService();

/** Minimal HTML page that the cheerio mock can parse. */
function simplePage(bodyText: string, title = 'Test Page') {
  return `<html><head><title>${title}</title></head><body><p>${bodyText}</p></body></html>`;
}

/** Seed a PromptVersion with no ragConfig — addSource will initialise it. */
async function seedPrompt() {
  const doc = await PromptVersion.create({
    promptId: new mongoose.Types.ObjectId(),
    name: 'RAG Test Prompt',
    tenantId: 'rag-tenant',
    productId: new mongoose.Types.ObjectId(),
    channelType: 'voice',
    version: 1,
    state: 'draft',
    environment: 'development',
    isActive: false,
    createdBy: { userId: 'u1', name: 'Tester', email: 't@t.com', role: 'ADMIN' },
    content: {
      systemPrompt: 'You are a helpful assistant.',
      persona: { tone: 'professional', personality: 'friendly', allowedActions: [], disallowedActions: [] },
      businessContext: { servicesOffered: ['Support'] },
      conversationBehavior: { greeting: 'Hello!', fallbackMessage: 'Sorry.' },
      constraints: { prohibitedTopics: [], complianceRules: [] }
    }
  });
  return doc._id.toString();
}

// ---------------------------------------------------------------------------
// Local HTTP server — used by tests 2, 3, 5 to serve HTML without mocking axios
// ---------------------------------------------------------------------------

let testServer: http.Server;
let testPort: number;
/** Map of path → response body served by the test server. */
const routeMap = new Map<string, string>();

function startTestServer(): Promise<void> {
  return new Promise((resolve) => {
    testServer = http.createServer((req, res) => {
      const body = routeMap.get(req.url || '/');
      if (body !== undefined) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(body);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    testServer.listen(0, '127.0.0.1', () => {
      testPort = (testServer.address() as http.AddressInfo).port;
      resolve();
    });
  });
}

function stopTestServer(): Promise<void> {
  return new Promise((resolve) => {
    testServer.close(() => resolve());
  });
}

/** Helper: returns the full URL for a path on the test server. */
function url(path: string) {
  return `http://127.0.0.1:${testPort}${path}`;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Phase 2 Gate: RAG Service', () => {

  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  afterEach(() => {
    routeMap.clear();
  });

  // -----------------------------------------------------------------------
  // 1. Source add / remove round-trip
  // -----------------------------------------------------------------------
  test('1. addSource persists source; removeSource removes it and cleans up RagDocuments', async () => {
    const promptId = await seedPrompt();

    // --- add ---
    const afterAdd = await service.addSource(promptId, {
      type: 'website',
      name: 'Docs Site',
      config: { url: 'http://example.com/docs' },
      chunkSize: 800,
      chunkOverlap: 100
    });

    expect(afterAdd.content.ragConfig).toBeDefined();
    expect(afterAdd.content.ragConfig!.enabled).toBe(true);
    expect(afterAdd.content.ragConfig!.sources).toHaveLength(1);

    const source = afterAdd.content.ragConfig!.sources![0];
    expect(source.name).toBe('Docs Site');
    expect(source.type).toBe('website');
    expect(source.enabled).toBe(true);
    expect(source.chunkSize).toBe(800);
    expect(source.chunkOverlap).toBe(100);
    expect(source.status).toBe('active');
    expect(source.stats!.totalChunks).toBe(0);

    const sourceId = source._id.toString();

    // Manually insert a RagDocument so we can verify removal cleans it up
    await RagDocument.create({
      tenantId: 'rag-tenant',
      promptVersionId: new mongoose.Types.ObjectId(promptId),
      sourceId: new mongoose.Types.ObjectId(sourceId),
      filename: 'test.txt',
      fileType: 'txt',
      fileSize: 100,
      storageLocation: 'local',
      checksum: 'abc123',
      status: 'indexed',
      chunks: [{ chunkId: 'x-0', text: 'hello', startIndex: 0, endIndex: 5, tokens: 2 }]
    });

    // --- remove ---
    const afterRemove = await service.removeSource(promptId, sourceId);
    expect(afterRemove.content.ragConfig!.sources).toHaveLength(0);

    // Associated RagDocument should be deleted
    const remainingDocs = await RagDocument.find({ sourceId: new mongoose.Types.ObjectId(sourceId) });
    expect(remainingDocs).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // 2. syncSource end-to-end
  // -----------------------------------------------------------------------
  test('2. syncSource scrapes URL, chunks text, and persists a RagDocument', async () => {
    const promptId = await seedPrompt();

    // Body long enough for ≥ 2 chunks at chunkSize 200 with overlap 50
    const bodyText = 'Alpha sentence one here. '.repeat(12); // ~300 chars
    routeMap.set('/knowledge', simplePage(bodyText, 'Knowledge Base'));

    const afterAdd = await service.addSource(promptId, {
      type: 'website',
      name: 'Knowledge Base',
      config: { url: url('/knowledge') },
      chunkSize: 200,
      chunkOverlap: 50
    });
    const sourceId = afterAdd.content.ragConfig!.sources![0]._id.toString();

    const doc = await service.syncSource(promptId, sourceId);

    // Shape checks
    expect(doc.status).toBe('indexed');
    expect(doc.fileType).toBe('scraped_web');
    expect(doc.extractedText).toBeTruthy();
    expect(doc.checksum).toBeTruthy();
    expect(doc.chunks.length).toBeGreaterThanOrEqual(2);

    // Each chunk has correct fields
    doc.chunks.forEach((chunk, i) => {
      expect(chunk.chunkId).toBe(`${sourceId}-${i}`);
      expect(chunk.text.length).toBeGreaterThan(0);
      expect(chunk.tokens).toBe(Math.ceil(chunk.text.length / 4));
    });

    // Source stats updated on the prompt
    const refreshedPrompt = await PromptVersion.findById(promptId);
    const refreshedSource = refreshedPrompt!.content.ragConfig!.sources![0];
    expect(refreshedSource.stats!.totalChunks).toBe(doc.chunks.length);
    expect(refreshedSource.lastRefreshedAt).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // 3. Checksum-based duplicate detection
  // -----------------------------------------------------------------------
  test('3. syncSource returns existing RagDocument unchanged when content has not changed', async () => {
    const promptId = await seedPrompt();
    const bodyText = 'Stable content that never changes.';
    const html = simplePage(bodyText, 'Stable');

    routeMap.set('/stable', html);

    const afterAdd = await service.addSource(promptId, {
      type: 'website',
      name: 'Stable',
      config: { url: url('/stable') },
      chunkSize: 1500,
      chunkOverlap: 200
    });
    const sourceId = afterAdd.content.ragConfig!.sources![0]._id.toString();

    const firstDoc = await service.syncSource(promptId, sourceId);

    // Second sync — identical content (routeMap still serves same html)
    const secondDoc = await service.syncSource(promptId, sourceId);

    // Same document returned (checksum match)
    expect(secondDoc._id.toString()).toBe(firstDoc._id.toString());

    // Only one RagDocument in the collection
    const docs = await RagDocument.find({
      promptVersionId: new mongoose.Types.ObjectId(promptId),
      sourceId: new mongoose.Types.ObjectId(sourceId)
    });
    expect(docs).toHaveLength(1);
  });

  // -----------------------------------------------------------------------
  // 4. Keyword retrieval with scoring
  // -----------------------------------------------------------------------
  test('4. retrieve returns chunks scored by term-overlap, respecting minScore', async () => {
    const promptId = await seedPrompt();
    const sourceId = new mongoose.Types.ObjectId();

    // Seed a RagDocument with 3 chunks — two mention "pricing", one does not
    await RagDocument.create({
      tenantId: 'rag-tenant',
      promptVersionId: new mongoose.Types.ObjectId(promptId),
      sourceId,
      filename: 'scraped_test.txt',
      fileType: 'scraped_web',
      fileSize: 500,
      storageLocation: 'http://example.com',
      checksum: 'deadbeef',
      status: 'indexed',
      extractedText: 'full text',
      chunks: [
        { chunkId: 'src-0', text: 'Our pricing plans are flexible. Pricing starts at ten dollars per month. Check pricing options below.', startIndex: 0, endIndex: 103, tokens: 26 },
        { chunkId: 'src-1', text: 'We offer support Monday through Friday. Contact us any time during business hours.', startIndex: 103, endIndex: 186, tokens: 21 },
        { chunkId: 'src-2', text: 'Pricing details and billing FAQ can be found in the pricing section of our website.', startIndex: 186, endIndex: 269, tokens: 21 }
      ]
    });

    // Register the source on the prompt so sourceMap resolves the name
    await service.addSource(promptId, {
      type: 'website',
      name: 'Pricing Docs',
      config: { url: 'http://example.com' }
    });
    // Overwrite the auto-generated _id to match our seeded RagDocument
    const prompt = await PromptVersion.findById(promptId);
    prompt!.content.ragConfig!.sources![0]._id = sourceId;
    prompt!.markModified('content.ragConfig');
    await prompt!.save();

    // Query — high minScore filters out the support-only chunk
    const results = await service.retrieve(promptId, 'pricing', 5, 0.2);

    expect(results.length).toBeGreaterThanOrEqual(2);

    // Every returned chunk must contain "pricing"
    results.forEach(r => {
      expect(r.text.toLowerCase()).toContain('pricing');
    });

    // Sorted descending by score
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }

    // Source name populated from ragConfig
    expect(results[0].sourceName).toBe('Pricing Docs');
  });

  // -----------------------------------------------------------------------
  // 5. syncSource error handling — network failure
  // -----------------------------------------------------------------------
  test('5. syncSource with a network error sets source status to error and throws', async () => {
    const promptId = await seedPrompt();

    // Point at a path that the test server does NOT serve → 404.
    // scrapeUrl will receive an empty / error response.  But to guarantee a hard
    // network-level failure (ECONNREFUSED), we point at a port where nothing is
    // listening.  Port 1 is privileged and reliably refused on all platforms.
    const deadUrl = 'http://127.0.0.1:1/will-not-connect';

    const afterAdd = await service.addSource(promptId, {
      type: 'website',
      name: 'Broken Site',
      config: { url: deadUrl }
    });
    const sourceId = afterAdd.content.ragConfig!.sources![0]._id.toString();

    await expect(service.syncSource(promptId, sourceId)).rejects.toThrow(/Sync failed/);

    // Source status should be 'error' and errorCount incremented
    const updatedPrompt = await PromptVersion.findById(promptId);
    const updatedSource = updatedPrompt!.content.ragConfig!.sources![0];
    expect(updatedSource.status).toBe('error');
    expect(updatedSource.stats!.errorCount).toBeGreaterThanOrEqual(1);
  });
});
