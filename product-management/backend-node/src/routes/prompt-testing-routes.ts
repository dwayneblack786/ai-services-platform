/**
 * Prompt Testing Routes — Phase 2
 *
 * POST   /api/pms/prompt-testing/:promptVersionId/test          – run full test suite
 * GET    /api/pms/prompt-testing/:promptVersionId/test-results  – list results (newest first)
 * POST   /api/pms/prompt-testing/results/:resultId/suggestions/:index/accept – accept a suggestion
 */

import { Router, Request, Response } from 'express';
import promptTestingService from '../services/prompt-testing.service';

const router = Router();

// ---------------------------------------------------------------------------
// POST /:promptVersionId/test
// ---------------------------------------------------------------------------
router.post('/:promptVersionId/test', async (req: Request, res: Response) => {
  const { promptVersionId } = req.params;

  if (!promptVersionId || !/^[0-9a-fA-F]{24}$/.test(promptVersionId)) {
    res.status(400).json({ error: 'Invalid prompt version ID' });
    return;
  }

  try {
    const result = await promptTestingService.runFullTestSuite(promptVersionId);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === 'Prompt version not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[PromptTesting] runFullTestSuite error:', err);
    res.status(500).json({ error: 'Failed to run test suite' });
  }
});

// ---------------------------------------------------------------------------
// GET /:promptVersionId/test-results
// ---------------------------------------------------------------------------
router.get('/:promptVersionId/test-results', async (req: Request, res: Response) => {
  const { promptVersionId } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  if (!promptVersionId || !/^[0-9a-fA-F]{24}$/.test(promptVersionId)) {
    res.status(400).json({ error: 'Invalid prompt version ID' });
    return;
  }

  try {
    const results = await promptTestingService.getTestResults(promptVersionId, limit);
    res.json(results);
  } catch (err) {
    console.error('[PromptTesting] getTestResults error:', err);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

// ---------------------------------------------------------------------------
// POST /results/:resultId/suggestions/:index/accept
// ---------------------------------------------------------------------------
router.post('/results/:resultId/suggestions/:index/accept', async (req: Request, res: Response) => {
  const { resultId, index } = req.params;
  const suggestionIndex = parseInt(index);

  if (!resultId || !/^[0-9a-fA-F]{24}$/.test(resultId)) {
    res.status(400).json({ error: 'Invalid result ID' });
    return;
  }
  if (isNaN(suggestionIndex) || suggestionIndex < 0) {
    res.status(400).json({ error: 'Invalid suggestion index' });
    return;
  }

  try {
    const { testResult, updated } = await promptTestingService.acceptSuggestion(resultId, suggestionIndex);
    res.json({ testResult, applied: updated });
  } catch (err: any) {
    if (err.message === 'Test result or suggestion not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[PromptTesting] acceptSuggestion error:', err);
    res.status(500).json({ error: 'Failed to accept suggestion' });
  }
});

export default router;
