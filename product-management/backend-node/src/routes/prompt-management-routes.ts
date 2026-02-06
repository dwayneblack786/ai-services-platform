import { Router, Request, Response } from 'express';
import promptService from '../services/prompt.service';

const router = Router();

// Middleware to extract actor from request (assuming auth middleware sets req.user)
const getActor = (req: any) => ({
  userId: req.user?.sub || req.user?.id || 'unknown',
  name: req.user?.name || 'Unknown User',
  email: req.user?.email || 'unknown@example.com',
  role: req.user?.role || 'USER',
  ipAddress: req.ip || req.connection.remoteAddress || '0.0.0.0',
  sessionId: req.session?.id || req.headers['x-session-id'] || 'unknown'
});

/**
 * POST /api/prompts/drafts
 * Create a new draft prompt
 */
router.post('/drafts', async (req: Request, res: Response) => {
  try {
    const { name, description, category, channelType, tenantId, productId, content } = req.body;

    if (!name || !channelType || !content) {
      return res.status(400).json({
        error: 'Missing required fields: name, channelType, content'
      });
    }

    const actor = getActor(req);
    const prompt = await promptService.createDraft({
      name,
      description,
      category,
      channelType,
      tenantId,
      productId,
      content,
      actor
    });

    res.status(201).json(prompt);
  } catch (error: any) {
    console.error('Error creating draft:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prompts/:id
 * Get a prompt by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actor = getActor(req);

    const prompt = await promptService.getPrompt(id, actor);

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json(prompt);
  } catch (error: any) {
    console.error('Error getting prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prompts/active
 * Get active prompt for tenant/product/channel/environment
 * Query params: tenantId, productId, channelType, environment
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const { tenantId, productId, channelType, environment } = req.query;

    if (!channelType || !environment) {
      return res.status(400).json({
        error: 'Missing required query params: channelType, environment'
      });
    }

    const prompt = await promptService.getActivePrompt({
      tenantId: tenantId as string,
      productId: productId as string,
      channelType: channelType as string,
      environment: environment as any
    });

    if (!prompt) {
      return res.status(404).json({ error: 'No active prompt found' });
    }

    res.json(prompt);
  } catch (error: any) {
    console.error('Error getting active prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/prompts/:id
 * Update a draft prompt
 * Returns: { prompt, isNewVersion } - isNewVersion=true if a new version was created
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const actor = getActor(req);

    const result = await promptService.updateDraft(id, updates, actor);

    res.json(result);
  } catch (error: any) {
    console.error('Error updating prompt:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/prompts/:id/versions
 * Create a new version from existing prompt
 */
router.post('/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actor = getActor(req);

    const newVersion = await promptService.createNewVersion(id, actor);

    res.status(201).json(newVersion);
  } catch (error: any) {
    console.error('Error creating new version:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/prompts/:id/promote
 * Promote prompt to next state (draft -> testing -> production)
 * Body: { targetState: 'testing' | 'production' }
 */
router.post('/:id/promote', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetState } = req.body;
    const actor = getActor(req);

    if (!targetState || !['testing', 'production'].includes(targetState)) {
      return res.status(400).json({
        error: 'Invalid targetState. Must be "testing" or "production"'
      });
    }

    const promotedPrompt = await promptService.promotePrompt(id, targetState, actor);

    res.json(promotedPrompt);
  } catch (error: any) {
    console.error('Error promoting prompt:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/prompts/:promptId/versions
 * Get version history for a prompt
 */
router.get('/:promptId/versions', async (req: Request, res: Response) => {
  try {
    const { promptId } = req.params;

    const versions = await promptService.getVersionHistory(promptId);

    res.json(versions);
  } catch (error: any) {
    console.error('Error getting version history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/prompts/:id
 * Soft delete a prompt (marks as deleted, preserves data)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actor = getActor(req);

    const deleted = await promptService.softDeletePrompt(id, actor);

    if (!deleted) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting prompt:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/prompts/:id/restore
 * Restore a soft-deleted prompt
 */
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actor = getActor(req);

    const restoredPrompt = await promptService.restorePrompt(id, actor);

    res.json(restoredPrompt);
  } catch (error: any) {
    console.error('Error restoring prompt:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/prompts/:id/hard
 * Permanently delete a prompt (only for soft-deleted or drafts)
 */
router.delete('/:id/hard', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actor = getActor(req);

    const deleted = await promptService.hardDeletePrompt(id, actor);

    if (!deleted) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error hard deleting prompt:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/prompts
 * List prompts with filters
 * Query params: tenantId, productId, state, channelType, environment, includeDeleted, limit, offset
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, productId, state, channelType, environment, includeDeleted, limit, offset } = req.query;

    const filters: any = {};
    if (tenantId) filters.tenantId = tenantId as string;
    if (productId) filters.productId = productId as string;
    if (state) filters.state = state as string;
    if (channelType) filters.channelType = channelType as string;
    if (environment) filters.environment = environment as string;
    if (includeDeleted) filters.includeDeleted = includeDeleted === 'true';
    if (limit) filters.limit = parseInt(limit as string);
    if (offset) filters.offset = parseInt(offset as string);

    const result = await promptService.listPrompts(filters);

    // Add lastScore from latest test result for each prompt
    const PromptTestResult = (await import('../models/PromptTestResult')).default;
    const promptsWithScores = await Promise.all(
      result.prompts.map(async (prompt: any) => {
        const latestTest = await PromptTestResult.findOne({ promptVersionId: prompt._id })
          .sort({ executedAt: -1 })
          .select('overallScore')
          .limit(1);
        return {
          ...prompt.toObject(),
          lastScore: latestTest?.overallScore
        };
      })
    );

    res.json({ prompts: promptsWithScores, total: result.total });
  } catch (error: any) {
    console.error('Error listing prompts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TEMPLATE ENDPOINTS (Phase 0.5)
// ============================================

/**
 * GET /api/prompts/templates/product/:productId
 * Get templates for a specific product (voice + chat)
 */
router.get('/templates/product/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const templates = await promptService.getTemplatesByProduct(productId);

    res.json(templates);
  } catch (error: any) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prompts/templates/:id
 * Get a specific template by ID
 */
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await promptService.getTemplate(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error: any) {
    console.error('Error getting template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/prompts/from-template
 * Create a new prompt from a template
 * Body: { templateId, tenantId, productId?, customizations? }
 */
router.post('/from-template', async (req: Request, res: Response) => {
  try {
    const { templateId, tenantId, productId, customizations } = req.body;

    if (!templateId || !tenantId) {
      return res.status(400).json({
        error: 'Missing required fields: templateId, tenantId'
      });
    }

    const actor = getActor(req);
    const prompt = await promptService.createFromTemplate({
      templateId,
      tenantId,
      productId,
      customizations,
      actor
    });

    res.status(201).json(prompt);
  } catch (error: any) {
    console.error('Error creating from template:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
