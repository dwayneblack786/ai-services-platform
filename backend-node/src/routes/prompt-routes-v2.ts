import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireTenantAdmin, requireVirtualAssistantSubscription, requireProductAccess } from '../middleware/authorization';

const router = express.Router();

// GET /prompts
// Get all default prompt templates (available to all authenticated users)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const prompts = await db.collection('prompts')
      .find({ isDefault: true })
      .toArray();

    return res.json(prompts);
  } catch (error) {
    console.error('[Prompts] Error fetching prompts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /prompts/industry/:industry
// Get prompts for a specific industry
router.get('/industry/:industry', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { industry } = req.params;
    const db = getDB();

    const prompt = await db.collection('prompts').findOne({
      industry: industry.toLowerCase(),
      isDefault: true
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompts not found for this industry' });
    }

    return res.json(prompt);
  } catch (error) {
    console.error('[Prompts] Error fetching industry prompts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /prompts/product/:productId
// Get prompts configured for a specific product
router.get('/product/:productId', 
  authenticateToken,
  requireVirtualAssistantSubscription,
  requireProductAccess,
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const tenantId = (req.user as any)?.tenantId;
      const db = getDB();

      // Try to find tenant-specific custom prompt for this product
      let prompt = await db.collection('prompts').findOne({
        tenantId: tenantId,
        productId: new ObjectId(productId),
        isDefault: false
      });

      // If no custom prompt, look for default prompts
      if (!prompt) {
        // Get the product to determine industry
        const product = await db.collection('products').findOne({
          _id: new ObjectId(productId)
        });

        // Try to find industry-specific default
        if (product?.industry) {
          prompt = await db.collection('prompts').findOne({
            industry: product.industry.toLowerCase(),
            isDefault: true
          });
        }

        // Fallback to generic default
        if (!prompt) {
          prompt = await db.collection('prompts').findOne({
            isDefault: true
          });
        }
      }

      if (!prompt) {
        return res.status(404).json({ error: 'No prompts available for this product' });
      }

      return res.json(prompt);
    } catch (error) {
      console.error('[Prompts] Error fetching product prompts:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /prompts/customer/list
// Get all prompts available to the customer (defaults + custom)
router.get('/customer/list', 
  authenticateToken,
  requireVirtualAssistantSubscription,
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any)?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const db = getDB();

      // Get all default prompts and customer's custom prompts
      const prompts = await db.collection('prompts')
        .find({
          $or: [
            { isDefault: true },
            { tenantId: tenantId, isDefault: false }
          ]
        })
        .toArray();

      return res.json(prompts);
    } catch (error) {
      console.error('[Prompts] Error fetching customer prompts:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /prompts/customer/:id
// Get a specific prompt template by ID (from prompt_templates collection)
router.get('/customer/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('[Prompts] Fetching template with ID:', id);

    const db = getDB();

    // Query the prompt_templates collection
    const template = await db.collection('prompt_templates').findOne({
      _id: new ObjectId(id)
    });

    console.log('[Prompts] Template found:', !!template);

    if (!template) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }

    return res.json(template);
  } catch (error) {
    console.error('[Prompts] Error fetching prompt template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /prompts/:id
// Get a specific prompt template by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const prompt = await db.collection('prompts').findOne({
      _id: new ObjectId(id)
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }

    return res.json(prompt);
  } catch (error) {
    console.error('[Prompts] Error fetching prompt:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /prompts/custom/:productId
// Create/Update a custom prompt template for a specific product (admin only)
router.post('/custom/:productId', 
  authenticateToken,
  requireTenantAdmin,
  requireVirtualAssistantSubscription,
  requireProductAccess,
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any)?.tenantId;
      const { productId } = req.params;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, description, industry, voice, chat } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const db = getDB();

      const customPrompt = {
        tenantId,
        productId: new ObjectId(productId),
        industry: industry?.toLowerCase() || 'custom',
        name,
        description: description || '',
        voice: voice || {},
        chat: chat || {},
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Upsert: update if exists, create if not
      const result = await db.collection('prompts').findOneAndUpdate(
        {
          tenantId,
          productId: new ObjectId(productId)
        },
        {
          $set: customPrompt
        },
        {
          upsert: true,
          returnDocument: 'after'
        }
      );

      return res.status(result ? 200 : 201).json(result);
    } catch (error) {
      console.error('[Prompts] Error creating custom prompt:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /prompts/custom/:id
// Update a custom prompt template (admin only)
router.put('/custom/:id', 
  authenticateToken,
  requireTenantAdmin,
  requireVirtualAssistantSubscription,
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any)?.tenantId;
      const { id } = req.params;
      const { name, description, industry, voice, chat } = req.body;

      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const db = getDB();

      // Verify ownership
      const existingPrompt = await db.collection('prompts').findOne({
        _id: new ObjectId(id),
        tenantId: tenantId
      });

      if (!existingPrompt) {
        return res.status(404).json({ error: 'Prompt not found or access denied' });
      }

      const updates: any = {
        updatedAt: new Date()
      };

      if (name) {updates.name = name;}
      if (description !== undefined) {updates.description = description;}
      if (industry) {updates.industry = industry.toLowerCase();}
      if (voice) {updates.voice = voice;}
      if (chat) {updates.chat = chat;}

      const result = await db.collection('prompts').findOneAndUpdate(
        { _id: new ObjectId(id), tenantId },
        { $set: updates },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ error: 'Failed to update prompt' });
      }

      return res.json(result);
    } catch (error) {
      console.error('[Prompts] Error updating custom prompt:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /prompts/custom/:id
// Delete a custom prompt template (admin only)
router.delete('/custom/:id', 
  authenticateToken,
  requireTenantAdmin,
  requireVirtualAssistantSubscription,
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any)?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const db = getDB();

      // Verify ownership and that it's not a default prompt
      const result = await db.collection('prompts').findOneAndDelete({
        _id: new ObjectId(id),
        tenantId: tenantId,
        isDefault: false
      });

      if (!result) {
        return res.status(404).json({ error: 'Prompt not found, access denied, or cannot delete default prompt' });
      }

      return res.json({ success: true, message: 'Prompt deleted successfully' });
    } catch (error) {
      console.error('[Prompts] Error deleting custom prompt:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
