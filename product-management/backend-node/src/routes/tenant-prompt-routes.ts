import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { tenantPromptService } from '../services/tenantPrompt.service';
import TenantPromptVersionModel from '../models/TenantPromptVersion';
import PromptVersionModel from '../models/PromptVersion';

const router = Router();

const getActor = (req: any) => ({
  userId: req.user?.sub || req.user?.id || 'unknown',
  name: req.user?.name || 'Unknown User',
  email: req.user?.email || 'unknown@example.com',
  role: req.user?.role || 'USER',
  ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
  sessionId: req.session?.id || req.headers['x-session-id'] || 'unknown'
});

/**
 * GET /api/pms/tenant-prompts/:productId
 * Get voice and chat bindings + all prompts per channel for the authenticated tenant + product.
 * Returns { voice: { binding, prompts[] }, chat: { binding, prompts[] } }
 */
router.get('/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const tenantId = (req as any).user?.tenantId || (req as any).session?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId required (from session or user context)' });
    }

    const bindings = await tenantPromptService.getBindingsForProduct(tenantId, productId);

    // Resolve productId to ObjectId for Mongoose queries
    const productObjectId = Types.ObjectId.isValid(productId) ? new Types.ObjectId(productId) : null;
    if (!productObjectId) {
      return res.status(400).json({ error: 'Invalid productId' });
    }

    const baseQuery = { tenantId, productId: productObjectId, isDeleted: { $ne: true } };

    // Fetch all prompts per channel — new collection first, fallback to legacy
    const [voiceNew, chatNew, voiceLegacy, chatLegacy] = await Promise.all([
      TenantPromptVersionModel.find({ ...baseQuery, channelType: 'voice' }).sort({ state: 1, version: -1 }),
      TenantPromptVersionModel.find({ ...baseQuery, channelType: 'chat' }).sort({ state: 1, version: -1 }),
      PromptVersionModel.find({ ...baseQuery, channelType: 'voice', isTemplate: false }).sort({ state: 1, version: -1 }),
      PromptVersionModel.find({ ...baseQuery, channelType: 'chat', isTemplate: false }).sort({ state: 1, version: -1 }),
    ]);

    // Deduplicate: prefer new collection docs
    const dedup = (newDocs: any[], legacyDocs: any[]) => {
      const ids = new Set(newDocs.map((d: any) => d._id.toString()));
      return [...newDocs, ...legacyDocs.filter((d: any) => !ids.has(d._id.toString()))];
    };

    res.json({
      voice: { binding: bindings.voice, prompts: dedup(voiceNew, voiceLegacy) },
      chat: { binding: bindings.chat, prompts: dedup(chatNew, chatLegacy) },
    });
  } catch (error: any) {
    console.error('Error fetching tenant prompt bindings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pms/tenant-prompts/:productId/:channelType
 * Get a single binding for a specific channel.
 */
router.get('/:productId/:channelType', async (req: Request, res: Response) => {
  try {
    const { productId, channelType } = req.params;
    const tenantId = (req as any).user?.tenantId || (req as any).session?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId required' });
    }

    if (channelType !== 'voice' && channelType !== 'chat') {
      return res.status(400).json({ error: 'channelType must be voice or chat' });
    }

    const binding = await tenantPromptService.getOrCreateBinding(
      tenantId,
      productId,
      channelType as 'voice' | 'chat'
    );

    res.json(binding);
  } catch (error: any) {
    console.error('Error fetching tenant prompt binding:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pms/tenant-prompts/:productId/pull
 * Pull new templates from product into tenant's prompts.
 * Only pulls templates not already pulled (tracked via pulledTemplateIds).
 * Returns { newCount, templates: [{ channelType, promptId, name }] }
 */
router.post('/:productId/pull', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const tenantId = (req as any).user?.tenantId || (req as any).session?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId required' });
    }

    const actor = getActor(req);
    const result = await tenantPromptService.pullTemplates(tenantId, productId, actor);

    res.json(result);
  } catch (error: any) {
    console.error('Error pulling templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/pms/tenant-prompts/:productId/:channelType
 * Update binding fields (currentDraftId, activeProductionId, lastScore).
 */
router.put('/:productId/:channelType', async (req: Request, res: Response) => {
  try {
    const { productId, channelType } = req.params;
    const tenantId = (req as any).user?.tenantId || (req as any).session?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId required' });
    }

    if (channelType !== 'voice' && channelType !== 'chat') {
      return res.status(400).json({ error: 'channelType must be voice or chat' });
    }

    const binding = await tenantPromptService.updateBinding(
      tenantId,
      productId,
      channelType as 'voice' | 'chat',
      req.body
    );

    if (!binding) {
      return res.status(404).json({ error: 'Binding not found' });
    }

    res.json(binding);
  } catch (error: any) {
    console.error('Error updating binding:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pms/tenant-prompts/:productId/:channelType/promote
 * Promote tenant prompt to testing or production
 * Body: { promptVersionId, targetState: 'testing' | 'production' }
 */
router.post('/:productId/:channelType/promote', async (req: Request, res: Response) => {
  try {
    const { productId, channelType } = req.params;
    const { promptVersionId, targetState } = req.body;
    const tenantId = (req as any).user?.tenantId || (req as any).session?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId required' });
    }

    if (channelType !== 'voice' && channelType !== 'chat') {
      return res.status(400).json({ error: 'channelType must be voice or chat' });
    }

    if (!promptVersionId || !targetState) {
      return res.status(400).json({ error: 'promptVersionId and targetState required' });
    }

    if (!['testing', 'production'].includes(targetState)) {
      return res.status(400).json({ error: 'targetState must be testing or production' });
    }

    const actor = getActor(req);
    const result = await tenantPromptService.promoteTenantPrompt(
      tenantId,
      productId,
      channelType as 'voice' | 'chat',
      promptVersionId,
      targetState,
      actor
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error promoting tenant prompt:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
