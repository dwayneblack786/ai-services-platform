import express from 'express';
import { getDB } from '../config/database';
import { authenticateSession } from '../middleware/auth';
import { trackUsage } from '../middleware/keycloak-auth';
import { ObjectId } from 'mongodb';

const router = express.Router();

/**
 * GET /api/subscriptions/active
 * Get all active subscriptions for the authenticated user's tenant
 */
router.get('/active', authenticateSession, async (req, res) => {
  try {
    const user = req.user as any;
    
    if (!user?.tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const db = getDB();
    
    // Get active subscriptions for this tenant
    const subscriptions = await db.collection('product_subscriptions').find({
      tenantId: user.tenantId,
      status: 'active'
    }).toArray();

    if (subscriptions.length === 0) {
      // Track usage
      await trackUsage('subscriptions.list', user.id, user.tenantId, 'subscription', undefined, { count: 0 });
      
      return res.json({ 
        subscriptions: [],
        products: [],
        hasVirtualAssistant: false
      });
    }

    // Get product details
    const productIds = subscriptions.map(sub => 
      typeof sub.productId === 'string' ? new ObjectId(sub.productId) : sub.productId
    );

    const products = await db.collection('products').find({
      _id: { $in: productIds }
    }).toArray();

    // Check if any product is a virtual assistant
    const virtualAssistantProducts = products.filter(product => 
      product.category === 'Virtual Assistant' || 
      product.category === 'AI Assistant' ||
      product.name?.toLowerCase().includes('assistant') ||
      product.name?.toLowerCase().includes('voice') ||
      product.name?.toLowerCase().includes('chat')
    );

    // Enrich subscriptions with product details
    const enrichedSubscriptions = subscriptions.map(sub => {
      const product = products.find(p => p._id.toString() === sub.productId.toString());
      return {
        ...sub,
        product: product ? {
          _id: product._id,
          name: product.name,
          category: product.category,
          description: product.description
        } : null
      };
    });

    // Track usage
    await trackUsage('subscriptions.list', user.id, user.tenantId, 'subscription', undefined, { 
      count: subscriptions.length,
      hasVirtualAssistant: virtualAssistantProducts.length > 0
    });

    res.json({
      subscriptions: enrichedSubscriptions,
      products: products,
      virtualAssistantProducts: virtualAssistantProducts,
      hasVirtualAssistant: virtualAssistantProducts.length > 0
    });

  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * GET /api/subscriptions/virtual-assistant
 * Get only virtual assistant subscriptions with their configurations
 */
router.get('/virtual-assistant', authenticateSession, async (req, res) => {
  try {
    const user = req.user as any;
    
    if (!user?.tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const db = getDB();
    
    // Get active subscriptions
    const subscriptions = await db.collection('product_subscriptions').find({
      tenantId: user.tenantId,
      status: 'active'
    }).toArray();

    if (subscriptions.length === 0) {
      return res.json({ products: [] });
    }

    // Get product details
    const productIds = subscriptions.map(sub => 
      typeof sub.productId === 'string' ? new ObjectId(sub.productId) : sub.productId
    );

    const products = await db.collection('products').find({
      _id: { $in: productIds }
    }).toArray();

    // Filter virtual assistant products
    const virtualAssistantProducts = products.filter(product => 
      product.category === 'Virtual Assistant' || 
      product.category === 'AI Assistant' ||
      product.name?.toLowerCase().includes('assistant') ||
      product.name?.toLowerCase().includes('voice') ||
      product.name?.toLowerCase().includes('chat')
    );

    // Get configurations for each product
    const productsWithConfig = await Promise.all(
      virtualAssistantProducts.map(async (product) => {
        // Get assistant channel config
        const channelConfig = await db.collection('assistant_channels').findOne({
          tenantId: user.tenantId,
          productId: product._id
        });

        // Get subscription details
        const subscription = subscriptions.find(
          sub => sub.productId.toString() === product._id.toString()
        );

        return {
          _id: product._id,
          name: product.name,
          category: product.category,
          description: product.description,
          hasVoice: true,  // All virtual assistant products have voice
          hasChat: true,   // All virtual assistant products have chat
          subscription: subscription,
          channelConfig: channelConfig || null
        };
      })
    );

    res.json({ products: productsWithConfig });

  } catch (error) {
    console.error('Error fetching virtual assistant subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch virtual assistant subscriptions' });
  }
});

export default router;
