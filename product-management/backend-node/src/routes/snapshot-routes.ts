/**
 * Snapshot API Routes (Phase 7)
 *
 * Capture and retrieve prompt snapshots for debugging AI conversations.
 */

import { Router, Request, Response } from 'express';
import PromptSnapshot from '../models/PromptSnapshot';
import PromptVersion from '../models/PromptVersion';

const router = Router();

/**
 * POST /api/pms/snapshots
 *
 * Create a snapshot of the prompt used in a session
 *
 * Body:
 * {
 *   sessionId: string,
 *   promptVersionId: string,
 *   retentionDays: number (optional, default: 90)
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionId, promptVersionId, retentionDays = 90 } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!promptVersionId) {
      return res.status(400).json({ error: 'promptVersionId is required' });
    }

    // Fetch the prompt version
    const prompt = await PromptVersion.findById(promptVersionId);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt version not found' });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    // Create snapshot
    const snapshot = new PromptSnapshot({
      sessionId,
      promptVersionId: prompt._id,
      promptContent: prompt.content,
      tenantId: prompt.tenantId,
      productId: prompt.productId,
      channelType: prompt.channelType,
      capturedAt: new Date(),
      expiresAt
    });

    await snapshot.save();

    res.status(201).json({
      snapshotId: snapshot._id,
      sessionId: snapshot.sessionId,
      promptVersionId: snapshot.promptVersionId,
      capturedAt: snapshot.capturedAt,
      expiresAt: snapshot.expiresAt
    });
  } catch (error: any) {
    console.error('Error creating snapshot:', error);
    res.status(500).json({ error: error.message || 'Failed to create snapshot' });
  }
});

/**
 * GET /api/pms/snapshots/:sessionId
 *
 * Get snapshot(s) for a session (for debugging)
 */
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const snapshots = await PromptSnapshot.find({ sessionId })
      .sort({ capturedAt: -1 })
      .populate('promptVersionId', 'name version state')
      .limit(10); // Limit to 10 most recent snapshots

    if (snapshots.length === 0) {
      return res.status(404).json({ error: 'No snapshots found for this session' });
    }

    res.json({
      sessionId,
      count: snapshots.length,
      snapshots: snapshots.map(s => ({
        snapshotId: s._id,
        promptVersionId: s.promptVersionId,
        promptContent: s.promptContent,
        tenantId: s.tenantId,
        productId: s.productId,
        channelType: s.channelType,
        capturedAt: s.capturedAt,
        expiresAt: s.expiresAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch snapshots' });
  }
});

/**
 * DELETE /api/pms/snapshots/:sessionId
 *
 * Delete snapshot(s) for a session
 */
router.delete('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const result = await PromptSnapshot.deleteMany({ sessionId });

    res.json({
      success: true,
      deleted: result.deletedCount
    });
  } catch (error: any) {
    console.error('Error deleting snapshots:', error);
    res.status(500).json({ error: error.message || 'Failed to delete snapshots' });
  }
});

export default router;
