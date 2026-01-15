import express from 'express';
import { getDB } from '../config/database';
import { Product } from '../models/Product';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const products = await db.collection<Product>('products').find().toArray();
    res.json({ success: true, products });
  } catch (error: any) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
      // Define a query (e.g., find a user named 'Alice')
    const query = {  _id: new ObjectId(req.params.id) as any };
    const product = await db.collection<Product>('products').findOne(query);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, product });
  } catch (error: any) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    // Validate required fields
    const { name, category, description, pricing, status } = req.body;
    
    if (!name || !category || !description || !pricing || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate category
    if (!['Virtual Assistant', 'IDP', 'Computer Vision'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // Validate status
    if (!['active', 'beta', 'coming-soon'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Validate pricing based on model
    if (pricing.model === 'subscription') {
      if (!pricing.tiers || !Array.isArray(pricing.tiers) || pricing.tiers.length === 0) {
        return res.status(400).json({ error: 'At least one pricing tier is required for subscription model' });
      }
    } else if (pricing.model === 'per-use') {
      if (pricing.perUseRate === undefined || pricing.perUseRate < 0) {
        return res.status(400).json({ error: 'Valid per-use rate is required for per-use model' });
      }
      if (!pricing.perUseUnit) {
        return res.status(400).json({ error: 'Per-use unit is required for per-use model' });
      }
    } else if (pricing.model === 'enterprise') {
      if (pricing.enterprisePrice === undefined || pricing.enterprisePrice < 0) {
        return res.status(400).json({ error: 'Valid enterprise price is required for enterprise model' });
      }
    }
    
    const db = getDB();
    const newProduct: Omit<Product, '_id'> = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Product>('products').insertOne(newProduct as any);
    res.json({ 
      success: true, 
      product: { ...newProduct, _id: result.insertedId }
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    // Validate required fields if provided
    const { category, status, pricing } = req.body;
    
    if (category && !['Virtual Assistant', 'IDP', 'Computer Vision'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    if (status && !['active', 'beta', 'coming-soon'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    if (pricing) {
      if (pricing.model === 'subscription' && pricing.tiers && (!Array.isArray(pricing.tiers) || pricing.tiers.length === 0)) {
        return res.status(400).json({ error: 'At least one pricing tier is required for subscription model' });
      }
      if (pricing.model === 'per-use') {
        if (pricing.perUseRate !== undefined && pricing.perUseRate < 0) {
          return res.status(400).json({ error: 'Per-use rate must be non-negative' });
        }
      }
      if (pricing.model === 'enterprise') {
        if (pricing.enterprisePrice !== undefined && pricing.enterprisePrice < 0) {
          return res.status(400).json({ error: 'Enterprise price must be non-negative' });
        }
      }
    }
    
    const db = getDB();
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    delete updateData._id; // Remove _id from update
    
    const result = await db.collection<Product>('products').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) as any },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, product: result });
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Update product status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'beta', 'coming-soon'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const db = getDB();
    const result = await db.collection<Product>('products').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) as any },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, product: result });
  } catch (error: any) {
    console.error('Update product status error:', error);
    res.status(500).json({ error: 'Failed to update product status' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.collection<Product>('products').deleteOne({
      _id: new ObjectId(req.params.id) as any
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
