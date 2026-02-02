import express from 'express';
import UserProductModel from '../models/UserProduct';
import PaymentMethodModel from '../models/PaymentMethod';
import ProductModel from '../models/Product';
import { authenticateSession } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateSession);

// Get user's subscribed products
router.get('/', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userProducts = await UserProductModel.find({ 
      userId, 
      status: 'active' 
    }).lean();
    
    res.json({ success: true, userProducts });
  } catch (error: any) {
    console.error('Get user products error:', error);
    res.status(500).json({ error: 'Failed to fetch user products' });
  }
});

// Subscribe to a product (requires payment verification)
router.post('/', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId, paymentMethodId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ 
        error: 'Payment method required',
        requiresPayment: true 
      });
    }

    // Check if product exists
    const product = await ProductModel.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Verify payment method exists and belongs to tenant
    const paymentMethod = await PaymentMethodModel.findOne({ 
      _id: paymentMethodId,
      tenantId,
      status: 'active'
    });
    
    if (!paymentMethod) {
      return res.status(404).json({ 
        error: 'Payment method not found or invalid',
        requiresPayment: true
      });
    }

    // Check if user already has this product
    const existingSubscription = await UserProductModel.findOne({ 
      userId, 
      productId, 
      status: 'active' 
    });
    
    if (existingSubscription) {
      return res.status(400).json({ error: 'Already subscribed to this product' });
    }

    // Create new subscription
    const newSubscription = await UserProductModel.create({
      userId,
      productId,
      subscribedAt: new Date(),
      status: 'active'
    });
    
    console.log(`✓ User ${userId} subscribed to product ${productId} with payment method ${paymentMethodId}`);
    
    res.json({ 
      success: true, 
      userProduct: newSubscription.toObject()
    });
  } catch (error: any) {
    console.error('Subscribe to product error:', error);
    res.status(500).json({ error: 'Failed to subscribe to product' });
  }
});

// Unsubscribe from a product
router.delete('/:productId', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId } = req.params;
    
    const result = await UserProductModel.updateOne(
      { userId, productId, status: 'active' },
      { $set: { status: 'cancelled' } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error: any) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

export default router;
