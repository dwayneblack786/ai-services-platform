import express from 'express';
import { getDB } from '../config/database';
import { ProductConfiguration } from '../models/ProductConfiguration';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all product configurations for tenant
router.get('/', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    const configurations = await db.collection<ProductConfiguration>('product_configurations')
      .find({ tenantId: user.tenantId, status: 'active' })
      .toArray();
    
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
    const db = getDB();
    
    const configuration = await db.collection<ProductConfiguration>('product_configurations')
      .findOne({ 
        tenantId: user.tenantId, 
        productId, 
        status: 'active' 
      });
    
    if (!configuration) {
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

    const db = getDB();
    
    // Check if configuration already exists
    const existingConfig = await db.collection<ProductConfiguration>('product_configurations')
      .findOne({ tenantId: user.tenantId, productId, status: 'active' });
    
    if (existingConfig) {
      // Update existing configuration
      const result = await db.collection<ProductConfiguration>('product_configurations')
        .findOneAndUpdate(
          { _id: existingConfig._id },
          { 
            $set: { 
              configuration, 
              updatedAt: new Date(),
              userId: user.id 
            } 
          },
          { returnDocument: 'after' }
        );
      
      return res.json({ success: true, configuration: result });
    }

    // Create new configuration
    const newConfiguration: Omit<ProductConfiguration, '_id'> = {
      tenantId: user.tenantId,
      productId,
      userId: user.id,
      configuration,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    const result = await db.collection<ProductConfiguration>('product_configurations')
      .insertOne(newConfiguration as any);
    
    res.json({ 
      success: true, 
      configuration: { ...newConfiguration, _id: result.insertedId }
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
    const db = getDB();
    
    const result = await db.collection<ProductConfiguration>('product_configurations')
      .updateOne(
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
