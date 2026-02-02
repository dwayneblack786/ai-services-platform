import express from 'express';
import mongoose from 'mongoose';
import { ProductConfigurationModel } from '../models/ProductConfiguration';
import { authenticateSession } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateSession);

// Get all product configurations for tenant
router.get('/', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const configurations = await ProductConfigurationModel.find({ 
      tenantId: user.tenantId, 
      status: 'active' 
    }).lean();
    
    res.json({ success: true, configurations });
  } catch (error: any) {
    console.error('Get configurations error:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

// Get configuration by product ID
router.get('/:productId', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId } = req.params;
    
    console.log('[Product Config] Searching for productId:', productId, 'tenantId:', user.tenantId);
    
    let configuration = null;
    
    // Try with $or to match both string and ObjectId for productId
    if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
      const objectId = new mongoose.Types.ObjectId(productId);
      
      configuration = await ProductConfigurationModel.findOne({
        tenantId: user.tenantId,
        $or: [
          { productId: productId as any },        // String format
          { productId: objectId as any }          // ObjectId format
        ]
      } as any).lean();
      
      console.log('[Product Config] Found:', !!configuration)
    } else {
      // Not a valid ObjectId, just try string match
      configuration = await ProductConfigurationModel.findOne({
        tenantId: user.tenantId,
        productId: productId
      }).lean();
    }
    
    // Filter by status after finding it
    if (configuration && configuration.status !== 'active') {
      console.log('[Product Config] Found but status is:', configuration.status);
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    if (!configuration) {
      console.log('[Product Config] Not found for productId:', productId, 'tenantId:', user.tenantId);
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json({ success: true, configuration });
  } catch (error: any) {
    console.error('Get configuration error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Create or update product configuration
router.post('/', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId, configuration } = req.body;
    if (!productId || !configuration) {
      return res.status(400).json({ error: 'Product ID and configuration are required' });
    }
    
    // Check if configuration already exists
    const existingConfig = await ProductConfigurationModel.findOne({ 
      tenantId: user.tenantId,
      productId, 
      status: 'active' 
    });
    
    if (existingConfig) {
      // Update existing configuration
      existingConfig.configuration = configuration;
      existingConfig.userId = user.id;
      existingConfig.updatedAt = new Date();
      await existingConfig.save();
      
      console.log('[Product Config] Updated existing config');
      
      return res.json({ success: true, configuration: existingConfig.toObject() });
    }

    // Create new configuration
    const newConfiguration = await ProductConfigurationModel.create({
      tenantId: user.tenantId,
      productId,
      userId: user.id,
      configuration,
      status: 'active'
    });
    
    res.json({ 
      success: true, 
      configuration: newConfiguration.toObject()
    });
  } catch (error: any) {
    console.error('Save configuration error:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Delete configuration
router.delete('/:productId', async (req, res) => {
  try {
    const user = req.user as any;
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { productId } = req.params;
    
    const result = await ProductConfigurationModel.updateOne(
      { tenantId: user.tenantId, productId, status: 'active' },
      { $set: { status: 'inactive' } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json({ success: true, message: 'Configuration deleted' });
  } catch (error: any) {
    console.error('Delete configuration error:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

export default router;
