/**
 * RAG Service — Phase 2.5
 *
 * Responsibilities:
 *   - Manage knowledge-base sources attached to a PromptVersion (add / remove / enable / disable)
 *   - Scrape a URL with cheerio, extract clean text, persist as RagDocument
 *   - Chunk extracted text into configurable segments
 *   - Keyword-based retrieval against stored chunks (no external vector store required)
 *
 * Design notes:
 *   - Sources live inside PromptVersion.content.ragConfig.sources (embedded array).
 *     This keeps source metadata co-located with the prompt and avoids a separate collection
 *     for what is essentially config.
 *   - Scraped content is persisted in the `rag_documents` collection (RagDocument model).
 *     Each scrape creates or replaces the document for that source.
 *   - Chunking is a simple sliding-window over the extracted text.  Token count is
 *     approximated at 4 chars / token (good enough for retrieval scoring; accurate counts
 *     are only needed when billing).
 *   - Retrieval uses TF-IDF–style term overlap scoring.  External vector stores
 *     (Pinecone, etc.) are a Phase 5 addition; the RagDocument.chunks[].embedding
 *     field is already in the schema for when that arrives.
 */

import axios from 'axios';
import { load as cheerioLoad } from 'cheerio';
import crypto from 'crypto';
import { Types } from 'mongoose';
import PromptVersion, { IPromptVersion } from '../models/PromptVersion';
import RagDocument, { IRagDocument } from '../models/RagDocument';

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
    const prompt = await PromptVersion.findById(promptVersionId);
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
    const prompt = await PromptVersion.findById(promptVersionId);
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
    const prompt = await PromptVersion.findById(promptVersionId);
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
    const prompt = await PromptVersion.findById(promptVersionId);
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
    const prompt = await PromptVersion.findById(promptVersionId);
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

      const checksum = md5(text);

      // --- upsert RagDocument ---
      // Check for duplicate by checksum first
      const existing = await RagDocument.findOne({
        promptVersionId: new Types.ObjectId(promptVersionId),
        sourceId: new Types.ObjectId(sourceId)
      });

      if (existing && existing.checksum === checksum) {
        // Content unchanged — just update lastRefreshedAt on source
        source.lastRefreshedAt = new Date();
        prompt.markModified('content.ragConfig');
        await prompt.save();
        return existing;
      }

      const docData = {
        tenantId: prompt.tenantId || 'platform',
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
          provider: 'local',
          indexName: `local_${promptVersionId}_${sourceId}`,
          syncedAt: new Date(),
          chunkCount: rawChunks.length,
          syncStatus: 'synced' as const
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
    const prompt = await PromptVersion.findById(promptVersionId);
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
