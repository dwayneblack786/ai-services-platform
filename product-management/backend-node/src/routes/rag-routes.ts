/**
 * RAG Routes — Phase 2.5 / Phase 1 File Upload
 *
 * All routes are scoped under /api/pms/rag (mounted in index.ts).
 *
 * POST   /:promptVersionId/sources                        – add a knowledge-base source
 * GET    /:promptVersionId/sources                        – list sources + ragConfig
 * DELETE /:promptVersionId/sources/:sourceId              – remove a source (+ its documents)
 * PUT    /:promptVersionId/sources/:sourceId/toggle       – enable / disable a source
 * POST   /:promptVersionId/sources/:sourceId/sync         – scrape & index a website source
 * POST   /:promptVersionId/sources/:sourceId/upload       – upload a file (PDF, DOCX, TXT, MD)
 * GET    /:promptVersionId/documents                      – list indexed documents (summary)
 * POST   /:promptVersionId/retrieve                       – keyword retrieval against chunks
 */

import { Router, Request, Response } from 'express';
import ragService from '../services/rag.service';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

const OID_RE = /^[0-9a-fA-F]{24}$/;

// ---------------------------------------------------------------------------
// POST /:promptVersionId/sources
// ---------------------------------------------------------------------------
router.post('/:promptVersionId/sources', async (req: Request, res: Response) => {
  const { promptVersionId } = req.params;
  if (!OID_RE.test(promptVersionId)) {
    res.status(400).json({ error: 'Invalid prompt version ID' });
    return;
  }

  const { type, name, config, chunkSize, chunkOverlap } = req.body;
  if (!type || !name || !config) {
    res.status(400).json({ error: 'type, name, and config are required' });
    return;
  }
  if (type === 'website' && !config.url) {
    res.status(400).json({ error: 'config.url is required for website sources' });
    return;
  }

  try {
    const prompt = await ragService.addSource(promptVersionId, { type, name, config, chunkSize, chunkOverlap });
    res.status(201).json({ ragConfig: prompt.content.ragConfig });
  } catch (err: any) {
    if (err.message === 'Prompt version not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[RAG] addSource error:', err);
    res.status(500).json({ error: 'Failed to add source' });
  }
});

// ---------------------------------------------------------------------------
// GET /:promptVersionId/sources
// ---------------------------------------------------------------------------
router.get('/:promptVersionId/sources', async (req: Request, res: Response) => {
  const { promptVersionId } = req.params;
  if (!OID_RE.test(promptVersionId)) {
    res.status(400).json({ error: 'Invalid prompt version ID' });
    return;
  }

  try {
    const ragConfig = await ragService.getSources(promptVersionId);
    res.json({ ragConfig });
  } catch (err: any) {
    if (err.message === 'Prompt version not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[RAG] getSources error:', err);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:promptVersionId/sources/:sourceId
// ---------------------------------------------------------------------------
router.delete('/:promptVersionId/sources/:sourceId', async (req: Request, res: Response) => {
  const { promptVersionId, sourceId } = req.params;
  if (!OID_RE.test(promptVersionId)) {
    res.status(400).json({ error: 'Invalid prompt version ID' });
    return;
  }
  if (!OID_RE.test(sourceId)) {
    res.status(400).json({ error: 'Invalid source ID' });
    return;
  }

  try {
    await ragService.removeSource(promptVersionId, sourceId);
    res.status(204).send();
  } catch (err: any) {
    if (err.message === 'Prompt version not found' || err.message === 'Source not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[RAG] removeSource error:', err);
    res.status(500).json({ error: 'Failed to remove source' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:promptVersionId/sources/:sourceId/toggle
// ---------------------------------------------------------------------------
router.put('/:promptVersionId/sources/:sourceId/toggle', async (req: Request, res: Response) => {
  const { promptVersionId, sourceId } = req.params;
  if (!OID_RE.test(promptVersionId)) {
    res.status(400).json({ error: 'Invalid prompt version ID' });
    return;
  }
  if (!OID_RE.test(sourceId)) {
    res.status(400).json({ error: 'Invalid source ID' });
    return;
  }

  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled (boolean) is required' });
    return;
  }

  try {
    const prompt = await ragService.toggleSource(promptVersionId, sourceId, enabled);
    res.json({ ragConfig: prompt.content.ragConfig });
  } catch (err: any) {
    if (err.message === 'Prompt version not found' || err.message === 'Source not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[RAG] toggleSource error:', err);
    res.status(500).json({ error: 'Failed to toggle source' });
  }
});

// ---------------------------------------------------------------------------
// POST /:promptVersionId/sources/:sourceId/sync
// ---------------------------------------------------------------------------
router.post('/:promptVersionId/sources/:sourceId/sync', async (req: Request, res: Response) => {
  const { promptVersionId, sourceId } = req.params;
  if (!OID_RE.test(promptVersionId)) {
    res.status(400).json({ error: 'Invalid prompt version ID' });
    return;
  }
  if (!OID_RE.test(sourceId)) {
    res.status(400).json({ error: 'Invalid source ID' });
    return;
  }

  try {
    const doc = await ragService.syncSource(promptVersionId, sourceId);
    res.status(201).json({
      document: {
        _id: doc._id,
        filename: doc.filename,
        status: doc.status,
        chunkCount: doc.chunks?.length || 0,
        lastSynced: doc.vectorStore?.syncedAt
      }
    });
  } catch (err: any) {
    if (err.message === 'Prompt version not found' || err.message === 'Source not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    // Sync failures are user-facing (bad URL, no content, etc.)
    console.error('[RAG] syncSource error:', err);
    res.status(422).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /:promptVersionId/sources/:sourceId/upload
// ---------------------------------------------------------------------------
router.post('/:promptVersionId/sources/:sourceId/upload', (req: Request, res: Response) => {
  const { promptVersionId, sourceId } = req.params;

  if (!OID_RE.test(promptVersionId)) {
    res.status(400).json({ error: 'Invalid prompt version ID' });
    return;
  }
  if (!OID_RE.test(sourceId)) {
    res.status(400).json({ error: 'Invalid source ID' });
    return;
  }

  // Run multer first — it validates file type and size before we touch the service
  uploadMiddleware(req, res, async (multerErr) => {
    if (multerErr) {
      // multer throws its own error for size limits and file filter rejections
      const status = (multerErr as any).code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      res.status(status).json({ error: multerErr.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file attached. Send a multipart/form-data request with field name "file".' });
      return;
    }

    try {
      const doc = await ragService.uploadDocument(promptVersionId, sourceId, req.file);
      res.status(201).json({
        document: {
          _id: doc._id,
          filename: doc.filename,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          status: doc.status,
          chunkCount: doc.chunks?.length || 0,
          lastSynced: doc.vectorStore?.syncedAt
        }
      });
    } catch (err: any) {
      if (err.message === 'Prompt version not found' || err.message === 'Source not found') {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.statusCode === 413) {
        res.status(413).json({ error: err.message });
        return;
      }
      console.error('[RAG] uploadDocument error:', err);
      res.status(422).json({ error: err.message });
    }
  });
});

// ---------------------------------------------------------------------------
// GET /:promptVersionId/documents
// ---------------------------------------------------------------------------
router.get('/:promptVersionId/documents', async (req: Request, res: Response) => {
  const { promptVersionId } = req.params;
  if (!OID_RE.test(promptVersionId)) {
    res.status(400).json({ error: 'Invalid prompt version ID' });
    return;
  }

  try {
    const docs = await ragService.getDocuments(promptVersionId);
    res.json({ documents: docs });
  } catch (err) {
    console.error('[RAG] getDocuments error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ---------------------------------------------------------------------------
// POST /:promptVersionId/retrieve
// ---------------------------------------------------------------------------
router.post('/:promptVersionId/retrieve', async (req: Request, res: Response) => {
  const { promptVersionId } = req.params;
  if (!OID_RE.test(promptVersionId)) {
    res.status(400).json({ error: 'Invalid prompt version ID' });
    return;
  }

  const { query, topK, minScore } = req.body;
  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'query (string) is required' });
    return;
  }

  try {
    const results = await ragService.retrieve(promptVersionId, query, topK, minScore);
    res.json({ results });
  } catch (err) {
    console.error('[RAG] retrieve error:', err);
    res.status(500).json({ error: 'Failed to retrieve' });
  }
});

export default router;
