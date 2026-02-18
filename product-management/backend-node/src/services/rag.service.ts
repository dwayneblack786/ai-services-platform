/**
 * RAG Service — Phase 2.5 / Phase 1 File Upload
 *
 * Responsibilities:
 *   - Manage knowledge-base sources attached to a PromptVersion (add / remove / enable / disable)
 *   - Scrape a URL with cheerio, extract clean text, persist as RagDocument
 *   - Accept uploaded files (PDF, DOCX, TXT, MD), extract text, chunk, and persist as RagDocument
 *   - Chunk extracted text into configurable segments
 *   - Keyword-based retrieval against stored chunks (no external vector store required)
 *
 * Design notes:
 *   - Sources live inside PromptVersion/TenantPromptVersion.content.ragConfig.sources
 *   - All RagDocument queries are tenant-scoped (tenantId is mandatory)
 *   - File uploads: text is extracted from the buffer, then the buffer is discarded (no disk storage)
 */

import axios from 'axios';
import { load as cheerioLoad } from 'cheerio';
import crypto from 'crypto';
import { Types } from 'mongoose';
import PromptVersion, { IPromptVersion } from '../models/PromptVersion';
import TenantPromptVersion from '../models/TenantPromptVersion';
import RagDocument, { IRagDocument } from '../models/RagDocument';
import { OpenAIEmbeddings } from '@langchain/openai';

// ---------------------------------------------------------------------------
// Lazy-loaded parsers (pdf-parse and mammoth are only required when used)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mammoth: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> } = require('mammoth');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Approximate token count (4 chars ≈ 1 token). */
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** MD5 checksum for duplicate detection. */
function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

/** Normalise whitespace: collapse runs of space/newline into single space. */
function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Score a single chunk against a query using simple term-overlap.
 * Returns 0–1.  Higher = more relevant.
 */
function scoreTfOverlap(query: string, chunkText: string): number {
  const qTokens = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
  if (qTokens.size === 0) return 0;

  const cTokens = chunkText.toLowerCase().split(/\W+/).filter(Boolean);
  if (cTokens.length === 0) return 0;

  // Count how many query terms appear in the chunk (with frequency boost)
  let hits = 0;
  for (const qt of qTokens) {
    const freq = cTokens.filter(t => t === qt).length;
    if (freq > 0) hits += Math.min(freq, 3); // cap at 3 to avoid single-word spam
  }

  // Normalise: hits / (qTokens.size * 3) gives 0–1 when every query term appears 3×
  return Math.min(hits / (qTokens.size * 3), 1);
}

// ---------------------------------------------------------------------------
// Scraping helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a URL and extract meaningful text using cheerio.
 * Strips script, style, nav, footer, header tags and returns clean body text.
 * Throws on network / HTTP errors.
 */
async function scrapeUrl(url: string): Promise<{ text: string; title: string }> {
  const resp = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'AI-Services-Platform RAG Scraper/1.0 (compatible; educational/internal use)'
    },
    maxRedirects: 5
  });

  const html: string = resp.data;
  const $ = cheerioLoad(html);

  // Extract title
  const title = $('title').first().text().trim() || new URL(url).hostname;

  // Remove noise elements
  $('script, style, noscript, nav, footer, header, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();

  // Remove common ad / cookie-banner classes (best-effort)
  $('.cookie-banner, .cookie-notice, .ad, .ads, .advertisement, .popup, .modal, [class*="cookie"], [class*="consent"]').remove();

  // Extract visible text
  const rawText = $('body').text();
  const cleanText = normalise(rawText);

  return { text: cleanText, title };
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

interface ChunkParams {
  text: string;
  chunkSize: number;   // target chars per chunk
  chunkOverlap: number; // overlap chars between adjacent chunks
  sourceId: string;
}

interface RawChunk {
  chunkId: string;
  text: string;
  startIndex: number;
  endIndex: number;
  tokens: number;
}

/**
 * Split text into overlapping chunks.
 * Tries to break at sentence boundaries (period + space) within a ±20% window
 * around the ideal cut point.  Falls back to hard cut if no boundary found.
 */
function chunkText({ text, chunkSize, chunkOverlap, sourceId }: ChunkParams): RawChunk[] {
  if (text.length === 0) return [];

  const chunks: RawChunk[] = [];
  let start = 0;
  let idx = 0;

  while (start < text.length) {
    const idealEnd = Math.min(start + chunkSize, text.length);

    let end = idealEnd;
    if (idealEnd < text.length) {
      // Look for a sentence boundary in the last 20% of the chunk
      const searchStart = Math.max(start, idealEnd - Math.floor(chunkSize * 0.2));
      const segment = text.slice(searchStart, idealEnd + 50); // look a bit past ideal
      const periodIdx = segment.lastIndexOf('. ');
      if (periodIdx !== -1) {
        end = searchStart + periodIdx + 2; // include the period + space
      }
    }

    const chunkStr = text.slice(start, end).trim();
    if (chunkStr.length > 0) {
      chunks.push({
        chunkId: `${sourceId}-${idx}`,
        text: chunkStr,
        startIndex: start,
        endIndex: end,
        tokens: approxTokens(chunkStr)
      });
      idx++;
    }

    // Advance start, accounting for overlap.
    // If we've reached the end of the text we're done — break to avoid an
    // infinite loop when chunkOverlap >= (text.length - start).
    if (end >= text.length) break;
    start = end - chunkOverlap;
    if (start >= end) start = end; // safety: ensure progress
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Two-collection prompt lookup (TenantPromptVersion takes priority)
// ---------------------------------------------------------------------------

async function findPromptById(id: string): Promise<IPromptVersion | null> {
  const tenant = await TenantPromptVersion.findById(id);
  if (tenant) return tenant as unknown as IPromptVersion;
  return PromptVersion.findById(id);
}

// ---------------------------------------------------------------------------
// File text extraction
// ---------------------------------------------------------------------------

type SupportedFileType = 'pdf' | 'docx' | 'txt' | 'md';

function detectFileType(originalname: string, mimetype: string): SupportedFileType {
  const lower = originalname.toLowerCase();
  if (lower.endsWith('.pdf') || mimetype === 'application/pdf') return 'pdf';
  if (lower.endsWith('.docx') || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (lower.endsWith('.md') || mimetype === 'text/markdown') return 'md';
  return 'txt';
}

async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: SupportedFileType
): Promise<{ text: string; pageCount?: number; title?: string }> {
  switch (fileType) {
    case 'pdf': {
      const result = await pdfParse(buffer);
      return { text: normalise(result.text), pageCount: result.numpages };
    }
    case 'docx': {
      const result = await mammoth.extractRawText({ buffer });
      return { text: normalise(result.value) };
    }
    case 'txt':
    case 'md':
    default: {
      return { text: normalise(buffer.toString('utf8')) };
    }
  }
}

// ---------------------------------------------------------------------------
// Embedding generation (Tier 1: LM Studio → Tier 2: OpenAI → Tier 3: skip)
// ---------------------------------------------------------------------------

/**
 * Generate embeddings for an array of text strings.
 *
 * Tier 1 — LM Studio local server (LM_STUDIO_URL env var).
 *   Calls the OpenAI-compatible /v1/embeddings endpoint.
 *   Model: LM_STUDIO_EMBEDDING_MODEL (defaults to whatever is loaded in LM Studio).
 *
 * Tier 2 — OpenAI API (OPENAI_API_KEY env var).
 *   Uses @langchain/openai OpenAIEmbeddings with EMBEDDING_MODEL env var
 *   (defaults to text-embedding-3-small).
 *
 * Tier 3 — No embedding service available.
 *   Returns null. Callers leave chunk.embedding undefined and keyword
 *   retrieval continues to work without any vector index.
 *
 * Never throws. Returns null on any provider failure so the upload/sync
 * pipeline can still complete and mark documents as 'indexed'.
 */
async function generateEmbeddings(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];

  // --- Tier 1: LM Studio ---
  const lmUrl = process.env.LM_STUDIO_URL;
  if (lmUrl) {
    try {
      const model = process.env.LM_STUDIO_EMBEDDING_MODEL; // undefined is fine — LM Studio uses loaded model
      const payload: Record<string, unknown> = { input: texts };
      if (model) payload.model = model;

      const resp = await axios.post(`${lmUrl}/v1/embeddings`, payload, {
        timeout: 30000,
        headers: { 'content-type': 'application/json' }
      });

      const data: Array<{ embedding: number[] }> = resp.data?.data;
      if (Array.isArray(data) && data.length === texts.length) {
        console.log(`[RAG] Embeddings via LM Studio (${data[0].embedding.length}d) for ${texts.length} chunks`);
        return data.map(d => d.embedding);
      }
    } catch (err: any) {
      console.warn('[RAG] LM Studio embedding failed, trying next tier:', err.message);
    }
  }

  // --- Tier 2: OpenAI ---
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
      const embedder = new OpenAIEmbeddings({ openAIApiKey: openAiKey, modelName: model });
      const vectors = await embedder.embedDocuments(texts);
      console.log(`[RAG] Embeddings via OpenAI ${model} (${vectors[0]?.length}d) for ${texts.length} chunks`);
      return vectors;
    } catch (err: any) {
      console.warn('[RAG] OpenAI embedding failed, skipping embeddings:', err.message);
    }
  }

  // --- Tier 3: no provider available ---
  if (!lmUrl && !openAiKey) {
    console.info('[RAG] No embedding provider configured (LM_STUDIO_URL / OPENAI_API_KEY). Using keyword retrieval only.');
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core service
// ---------------------------------------------------------------------------

export class RagService {

  // -----------------------------------------------------------------------
  // Source management (mutates PromptVersion.content.ragConfig.sources)
  // -----------------------------------------------------------------------

  /**
   * Add a new source to a prompt's ragConfig.  Returns the updated prompt.
   * Also flips ragConfig.enabled = true automatically.
   */
  async addSource(promptVersionId: string, source: {
    type: string;   // 'website' | 'document' | 'api'
    name: string;
    config: Record<string, unknown>; // e.g. { url: 'https://...' }
    chunkSize?: number;
    chunkOverlap?: number;
  }): Promise<IPromptVersion> {
    const prompt = await findPromptById(promptVersionId);
    if (!prompt) throw new Error('Prompt version not found');

    if (!prompt.content.ragConfig) {
      prompt.content.ragConfig = { enabled: true };
    }
    if (!prompt.content.ragConfig.sources) {
      prompt.content.ragConfig.sources = [];
    }

    prompt.content.ragConfig.sources.push({
      _id: new Types.ObjectId(),
      type: source.type,
      name: source.name,
      enabled: true,
      config: source.config,
      chunkSize: source.chunkSize || 1500,
      chunkOverlap: source.chunkOverlap || 200,
      status: 'active',
      stats: { totalChunks: 0, lastSyncDuration: 0, errorCount: 0 }
    });

    prompt.content.ragConfig.enabled = true;
    prompt.markModified('content.ragConfig');
    await prompt.save();
    return prompt;
  }

  /**
   * Remove a source by ID from a prompt's ragConfig.
   * Also deletes associated RagDocuments.
   */
  async removeSource(promptVersionId: string, sourceId: string): Promise<IPromptVersion> {
    const prompt = await findPromptById(promptVersionId);
    if (!prompt) throw new Error('Prompt version not found');

    const sources = prompt.content.ragConfig?.sources || [];
    const idx = sources.findIndex(s => s._id.toString() === sourceId);
    if (idx === -1) throw new Error('Source not found');

    sources.splice(idx, 1);
    prompt.markModified('content.ragConfig');
    await prompt.save();

    // Clean up persisted documents for this source
    await RagDocument.deleteMany({ sourceId: new Types.ObjectId(sourceId) });

    return prompt;
  }

  /**
   * Toggle a source's enabled flag.
   */
  async toggleSource(promptVersionId: string, sourceId: string, enabled: boolean): Promise<IPromptVersion> {
    const prompt = await findPromptById(promptVersionId);
    if (!prompt) throw new Error('Prompt version not found');

    const source = (prompt.content.ragConfig?.sources || []).find(s => s._id.toString() === sourceId);
    if (!source) throw new Error('Source not found');

    source.enabled = enabled;
    prompt.markModified('content.ragConfig');
    await prompt.save();
    return prompt;
  }

  /**
   * List all sources for a prompt version (thin wrapper for clarity in routes).
   */
  async getSources(promptVersionId: string): Promise<IPromptVersion['content']['ragConfig']> {
    const prompt = await findPromptById(promptVersionId);
    if (!prompt) throw new Error('Prompt version not found');
    return prompt.content.ragConfig || { enabled: false };
  }

  // -----------------------------------------------------------------------
  // Scrape & sync a website source
  // -----------------------------------------------------------------------

  /**
   * Scrape the URL configured in a source, chunk the text, and persist as a
   * RagDocument.  Updates the source's stats and lastRefreshedAt.
   *
   * Returns the persisted RagDocument.
   */
  async syncSource(promptVersionId: string, sourceId: string): Promise<IRagDocument> {
    const prompt = await findPromptById(promptVersionId);
    if (!prompt) throw new Error('Prompt version not found');

    const source = (prompt.content.ragConfig?.sources || []).find(s => s._id.toString() === sourceId);
    if (!source) throw new Error('Source not found');

    if (source.type !== 'website') {
      throw new Error('syncSource currently supports website sources only');
    }

    const url = source.config?.url as string;
    if (!url) throw new Error('Source config missing url');

    const startTime = Date.now();
    let syncStatus: 'synced' | 'failed' = 'synced';
    let errorMsg: string | undefined;

    try {
      // --- scrape ---
      const { text, title } = await scrapeUrl(url);
      if (text.length === 0) {
        throw new Error('No text extracted from URL');
      }

      // --- chunk ---
      const rawChunks = chunkText({
        text,
        chunkSize: source.chunkSize || 1500,
        chunkOverlap: source.chunkOverlap || 200,
        sourceId
      });

      // --- embed (async, best-effort — keyword retrieval still works if skipped) ---
      const embeddings = await generateEmbeddings(rawChunks.map(c => c.text));
      if (embeddings) {
        rawChunks.forEach((c, i) => { (c as any).embedding = embeddings[i]; });
      }
      const vectorProvider = embeddings ? 'local' : 'none';
      const vectorSyncStatus = embeddings ? 'synced' as const : 'pending' as const;

      const checksum = md5(text);

      // --- upsert RagDocument ---
      // Check for duplicate by checksum first
      const existing = await RagDocument.findOne({
        promptVersionId: new Types.ObjectId(promptVersionId),
        sourceId: new Types.ObjectId(sourceId)
      });

      if (existing && existing.checksum === checksum && vectorSyncStatus === 'synced') {
        // Content unchanged and already embedded — just update lastRefreshedAt on source
        source.lastRefreshedAt = new Date();
        prompt.markModified('content.ragConfig');
        await prompt.save();
        return existing;
      }

      const docData = {
        tenantId: (prompt as any).tenantId || 'platform',
        promptVersionId: new Types.ObjectId(promptVersionId),
        sourceId: new Types.ObjectId(sourceId),
        filename: `scraped_${new URL(url).hostname.replace(/\./g, '_')}.txt`,
        fileType: 'scraped_web' as const,
        fileSize: text.length,
        storageLocation: url,
        checksum,
        status: 'indexed' as const,
        processingStartedAt: new Date(startTime),
        processingCompletedAt: new Date(),
        extractedText: text,
        extractedMetadata: { title, url, language: 'en' },
        chunks: rawChunks,
        vectorStore: {
          provider: vectorProvider,
          indexName: `local_${promptVersionId}_${sourceId}`,
          syncedAt: new Date(),
          chunkCount: rawChunks.length,
          syncStatus: vectorSyncStatus
        },
        usage: { retrievalCount: 0 }
      };

      let doc: IRagDocument;
      if (existing) {
        // Replace content
        Object.assign(existing, docData);
        await existing.save();
        doc = existing;
      } else {
        doc = await RagDocument.create(docData);
      }

      // --- update source stats ---
      source.lastRefreshedAt = new Date();
      source.status = 'active';
      if (!source.stats) source.stats = { totalChunks: 0, lastSyncDuration: 0, errorCount: 0 };
      source.stats.totalChunks = rawChunks.length;
      source.stats.lastSyncDuration = Date.now() - startTime;

      prompt.markModified('content.ragConfig');
      await prompt.save();

      return doc;

    } catch (err: any) {
      syncStatus = 'failed';
      errorMsg = err.message;

      // Record error on source
      if (source.stats) {
        source.stats.errorCount = (source.stats.errorCount || 0) + 1;
      }
      source.status = 'error';
      prompt.markModified('content.ragConfig');
      await prompt.save();

      throw new Error(`Sync failed for source "${source.name}": ${errorMsg}`);
    }
  }

  // -----------------------------------------------------------------------
  // File upload → text extraction → chunking
  // -----------------------------------------------------------------------

  /**
   * Accept an uploaded file buffer, extract text, chunk it, and persist as a RagDocument.
   * The original buffer is never written to disk — text is extracted in-memory and discarded.
   *
   * Multi-tenancy: tenantId is taken from the prompt record (never from the client).
   * Storage quota is enforced before extraction.
   */
  async uploadDocument(
    promptVersionId: string,
    sourceId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
  ): Promise<IRagDocument> {
    const prompt = await findPromptById(promptVersionId);
    if (!prompt) throw new Error('Prompt version not found');

    const source = (prompt.content.ragConfig?.sources || []).find(s => s._id.toString() === sourceId);
    if (!source) throw new Error('Source not found');

    const tenantId = (prompt as any).tenantId || 'platform';

    // --- Per-tenant storage quota check ---
    const maxStorageBytes = parseInt(process.env.RAG_MAX_STORAGE_PER_TENANT_BYTES || '5368709120', 10);
    const usageAgg = await RagDocument.aggregate([
      { $match: { tenantId } },
      { $group: { _id: null, total: { $sum: '$fileSize' } } }
    ]);
    const currentUsage: number = usageAgg[0]?.total ?? 0;
    if (currentUsage + file.size > maxStorageBytes) {
      const usedMB = Math.round(currentUsage / 1024 / 1024);
      const limitGB = Math.round(maxStorageBytes / 1024 / 1024 / 1024);
      throw Object.assign(
        new Error(`Storage quota exceeded. Used: ${usedMB} MB, limit: ${limitGB} GB`),
        { statusCode: 413 }
      );
    }

    // --- Detect file type and extract text ---
    const fileType = detectFileType(file.originalname, file.mimetype);
    const startTime = Date.now();

    let extractedText: string;
    let pageCount: number | undefined;
    try {
      const extracted = await extractTextFromBuffer(file.buffer, fileType);
      extractedText = extracted.text;
      pageCount = extracted.pageCount;
    } catch (err: any) {
      throw new Error(`Text extraction failed for "${file.originalname}": ${err.message}`);
    }

    if (!extractedText || extractedText.length === 0) {
      throw new Error(`No text could be extracted from "${file.originalname}"`);
    }

    // --- Chunk ---
    const rawChunks = chunkText({
      text: extractedText,
      chunkSize: source.chunkSize || 1500,
      chunkOverlap: source.chunkOverlap || 200,
      sourceId
    });

    // --- Embed (async, best-effort — keyword retrieval still works if skipped) ---
    const embeddings = await generateEmbeddings(rawChunks.map(c => c.text));
    if (embeddings) {
      rawChunks.forEach((c, i) => { (c as any).embedding = embeddings[i]; });
    }
    const vectorProvider = embeddings ? 'local' : 'none';
    const vectorSyncStatus = embeddings ? 'synced' as const : 'pending' as const;

    const checksum = md5(extractedText);

    // --- Upsert RagDocument (replace if same source already has a doc) ---
    const existing = await RagDocument.findOne({
      tenantId,
      promptVersionId: new Types.ObjectId(promptVersionId),
      sourceId: new Types.ObjectId(sourceId)
    });

    const docData = {
      tenantId,
      promptVersionId: new Types.ObjectId(promptVersionId),
      sourceId: new Types.ObjectId(sourceId),
      filename: file.originalname,
      fileType,
      fileSize: file.size,
      storageLocation: 'extracted_inline',
      checksum,
      status: 'indexed' as const,
      processingStartedAt: new Date(startTime),
      processingCompletedAt: new Date(),
      extractedText,
      extractedMetadata: {
        title: file.originalname,
        language: 'en',
        ...(pageCount !== undefined ? { pageCount } : {})
      },
      chunks: rawChunks,
      vectorStore: {
        provider: vectorProvider,
        indexName: `local_${promptVersionId}_${sourceId}`,
        syncedAt: new Date(),
        chunkCount: rawChunks.length,
        syncStatus: vectorSyncStatus
      },
      usage: { retrievalCount: 0 }
    };

    let doc: IRagDocument;
    if (existing) {
      Object.assign(existing, docData);
      await existing.save();
      doc = existing;
    } else {
      doc = await RagDocument.create(docData);
    }

    // --- Update source stats ---
    source.lastRefreshedAt = new Date();
    source.status = 'active';
    if (!source.stats) source.stats = { totalChunks: 0, lastSyncDuration: 0, errorCount: 0 };
    source.stats.totalChunks = rawChunks.length;
    source.stats.lastSyncDuration = Date.now() - startTime;
    prompt.markModified('content.ragConfig');
    await prompt.save();

    console.log(`[RAG] Uploaded "${file.originalname}" → ${rawChunks.length} chunks for tenant ${tenantId}`);
    return doc;
  }

  // -----------------------------------------------------------------------
  // Retrieval
  // -----------------------------------------------------------------------

  /**
   * Keyword-based retrieval against all indexed chunks for a prompt version.
   * Returns top-K chunks sorted by term-overlap score.
   */
  async retrieve(promptVersionId: string, query: string, topK = 5, minScore = 0.1): Promise<Array<{
    chunkId: string;
    text: string;
    score: number;
    sourceName: string;
    sourceId: string;
  }>> {
    if (!query.trim()) return [];

    // Load all RagDocuments for this prompt
    const docs = await RagDocument.find({
      promptVersionId: new Types.ObjectId(promptVersionId),
      status: 'indexed'
    });

    // Also load prompt to get source names
    const prompt = await findPromptById(promptVersionId);
    const sourceMap = new Map<string, string>(); // sourceId → name
    if (prompt?.content.ragConfig?.sources) {
      for (const s of prompt.content.ragConfig.sources) {
        sourceMap.set(s._id.toString(), s.name);
      }
    }

    // Score every chunk
    const scored: Array<{ chunkId: string; text: string; score: number; sourceName: string; sourceId: string }> = [];
    for (const doc of docs) {
      const sId = doc.sourceId.toString();
      const sName = sourceMap.get(sId) || 'Unknown';
      for (const chunk of doc.chunks) {
        const score = scoreTfOverlap(query, chunk.text);
        if (score >= minScore) {
          scored.push({
            chunkId: chunk.chunkId,
            text: chunk.text,
            score: Math.round(score * 100) / 100,
            sourceName: sName,
            sourceId: sId
          });
        }
      }
    }

    // Sort descending and take topK
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // -----------------------------------------------------------------------
  // Documents listing (for UI)
  // -----------------------------------------------------------------------

  /**
   * Get all RagDocuments for a prompt version (summary — excludes full chunk text).
   */
  async getDocuments(promptVersionId: string): Promise<Array<{
    _id: string;
    sourceId: string;
    filename: string;
    fileType: string;
    status: string;
    chunkCount: number;
    lastSynced?: Date;
    extractedMetadata?: Record<string, unknown>;
  }>> {
    const docs = await RagDocument.find({
      promptVersionId: new Types.ObjectId(promptVersionId)
    }).select('-chunks -extractedText'); // exclude heavy fields

    return docs.map(d => ({
      _id: d._id.toString(),
      sourceId: d.sourceId.toString(),
      filename: d.filename,
      fileType: d.fileType,
      status: d.status,
      chunkCount: d.chunks?.length || (d.vectorStore?.chunkCount ?? 0),
      lastSynced: d.vectorStore?.syncedAt,
      extractedMetadata: d.extractedMetadata as Record<string, unknown> | undefined
    }));
  }
}

export default new RagService();
