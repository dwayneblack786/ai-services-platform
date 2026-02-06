import { Router, Request, Response } from 'express';
import { tenantPromptService } from '../services/tenantPrompt.service';

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
 * Get voice and chat bindings for the authenticated tenant + product.
 * Returns { voice: binding|null, chat: binding|null }
 */
router.get('/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const tenantId = (req as any).user?.tenantId || (req as any).session?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId required (from session or user context)' });
    }

    const bindings = await tenantPromptService.getBindingsForProduct(tenantId, productId);
    res.json(bindings);
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
