import express from 'express';
import { getDB } from '../config/database';
import { ProductSubscription } from '../models/ProductSubscription';
import { ProductBilling } from '../models/ProductBilling';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all subscriptions for tenant
router.get('/', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    
    // Get subscriptions with product details
    const subscriptions = await db.collection<ProductSubscription>('product_subscriptions')
      .find({ tenantId: user.tenantId })
      .toArray();
    
    // Get product details for each subscription
    const subscriptionsWithProducts = await Promise.all(
      subscriptions.map(async (sub) => {
        // Handle productId being either string or ObjectId
        const productQuery = typeof sub.productId === 'string'
          ? { _id: new ObjectId(sub.productId) }
          : { _id: sub.productId };
        
        const product = await db.collection('products').findOne(productQuery);
        
        if (!product) {
          console.warn(`Product not found for subscription ${sub._id}, productId: ${sub.productId}`);
        }
        
        return {
          ...sub,
          product
        };
      })
    );
    
    res.json({ success: true, subscriptions: subscriptionsWithProducts });
  } catch (error: any) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Get subscription by product ID
router.get('/product/:productId', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId } = req.params;
    const db = getDB();
    
    const subscription = await db.collection<ProductSubscription>('product_subscriptions')
      .findOne({ 
        tenantId: user.tenantId, 
        productId
      });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Get product details
    const product = await db.collection('products').findOne({ 
      _id: new ObjectId(productId) 
    });
    
    res.json({ 
      success: true, 
      subscription: {
        ...subscription,
        product
      }
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Create subscription with payment and user-product (atomic operation)
router.post('/create', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId, paymentMethodId, pricingTier } = req.body;
    
    if (!productId || !paymentMethodId) {
      return res.status(400).json({ error: 'Missing required fields: productId and paymentMethodId' });
    }

    const db = getDB();
    
    // Verify payment method exists and belongs to user
    const paymentMethod = await db.collection('payment_methods').findOne({
      _id: new ObjectId(paymentMethodId),
      tenantId: user.tenantId,
      status: 'active'
    });

    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found or inactive' });
    }

    // Verify product exists
    const product = await db.collection('products').findOne({
      _id: new ObjectId(productId)
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check pricing model
    if (product.pricing?.model === 'subscription' && !pricingTier) {
      return res.status(400).json({ error: 'Pricing tier is required for subscription model' });
    }

    // Check if subscription already exists
    const existingSubscription = await db.collection<ProductSubscription>('product_subscriptions')
      .findOne({ 
        tenantId: user.tenantId, 
        productId, 
        status: { $in: ['active', 'trial'] } 
      });
    
    if (existingSubscription) {
      return res.status(400).json({ error: 'Active subscription already exists for this product' });
    }

    // Check if user-product already exists
    const existingUserProduct = await db.collection('user_products').findOne({
      tenantId: user.tenantId,
      userId: user.id,
      productId
    });

    if (existingUserProduct) {
      return res.status(400).json({ error: 'User already has access to this product' });
    }

    const now = new Date();
    
    // Calculate subscription dates
    const billingCycle = 'monthly'; // Default for now
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // Determine amount based on pricing model
    let amount = 0;
    const currency = product.pricing?.currency || 'USD';

    if (product.pricing?.model === 'subscription') {
      const selectedTier = product.pricing?.tiers?.find((t: any) => t.name === pricingTier);
      if (!selectedTier) {
        return res.status(400).json({ error: 'Invalid pricing tier selected' });
      }
      amount = selectedTier.price;
    } else if (product.pricing?.model === 'per-use') {
      // For per-use, initial charge is the minimum charge (if any)
      amount = product.pricing?.minimumCharge || 0;
    } else if (product.pricing?.model === 'enterprise') {
      // Enterprise pricing uses the set enterprise price
      amount = product.pricing?.enterprisePrice || 0;
    }

    // Create subscription
    const newSubscription: Omit<ProductSubscription, '_id'> = {
      tenantId: user.tenantId,
      productId,
      userId: user.id,
      pricingTier: pricingTier || undefined,
      status: 'active',
      billingCycle,
      amount,
      currency,
      startDate: now,
      renewalDate: nextBillingDate,
      autoRenew: true,
      nextBillingDate,
      createdAt: now,
      updatedAt: now
    };

    const subscriptionResult = await db.collection<ProductSubscription>('product_subscriptions')
      .insertOne(newSubscription as any);
    
    const subscriptionId = subscriptionResult.insertedId.toString();

    // Create transaction
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    const newTransaction = {
      transactionId,
      tenantId: user.tenantId,
      userId: user.id,
      paymentMethodId,
      amount,
      currency,
      status: 'success',
      type: 'subscription',
      productId,
      productName: product.name,
      description: `Initial subscription for ${product.name}`,
      cardBrand: paymentMethod.cardBrand,
      cardLast4: paymentMethod.cardLast4,
      billingInfo: paymentMethod.billingInfo,
      metadata: {
        subscriptionId,
        billingCycle
      },
      createdAt: now,
      updatedAt: now
    };

    const transactionResult = await db.collection('transactions')
      .insertOne(newTransaction);

    // Create user-product access
    const newUserProduct = {
      tenantId: user.tenantId,
      userId: user.id,
      productId,
      accessLevel: 'full',
      status: 'active',
      subscriptionId,
      grantedAt: now,
      expiresAt: nextBillingDate,
      createdAt: now,
      updatedAt: now
    };

    await db.collection('user_products').insertOne(newUserProduct);

    // Update payment method stats
    await db.collection('payment_methods').updateOne(
      { _id: new ObjectId(paymentMethodId) },
      {
        $set: {
          lastTransactionDate: now,
          lastTransactionAmount: amount,
          lastTransactionStatus: 'success',
          updatedAt: now
        },
        $inc: {
          transactionCount: 1
        }
      }
    );

    res.json({ 
      success: true, 
      subscription: { ...newSubscription, _id: subscriptionResult.insertedId },
      transaction: { ...newTransaction, _id: transactionResult.insertedId },
      userProduct: newUserProduct,
      redirectUrl: `/products/${productId}/configure`
    });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription', details: error.message });
  }
});

// Validate payment method
router.post('/validate-payment', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { paymentMethodId } = req.body;
    
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Missing paymentMethodId' });
    }

    const db = getDB();
    
    // Verify payment method exists and belongs to user
    const paymentMethod = await db.collection('payment_methods').findOne({
      _id: new ObjectId(paymentMethodId),
      tenantId: user.tenantId
    });

    if (!paymentMethod) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment method not found' 
      });
    }

    // Check if payment method is active
    if (paymentMethod.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment method is not active' 
      });
    }

    // Check if card is expired
    const now = new Date();
    const expiryDate = new Date(
      parseInt(paymentMethod.expirationYear), 
      parseInt(paymentMethod.expirationMonth) - 1
    );
    
    if (expiryDate < now) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment method has expired' 
      });
    }

    // Payment method is valid
    res.json({ 
      success: true, 
      message: 'Payment method validated successfully',
      paymentMethod: {
        id: paymentMethod._id,
        cardBrand: paymentMethod.cardBrand,
        cardLast4: paymentMethod.cardLast4,
        billingInfo: paymentMethod.billingInfo
      }
    });
  } catch (error: any) {
    console.error('Validate payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to validate payment method' });
  }
});

// Create subscription
router.post('/', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId, billingCycle, amount, currency, pricingTier } = req.body;
    
    if (!productId || !billingCycle || !amount || !currency || !pricingTier) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDB();
    
    // Check if subscription already exists
    const existing = await db.collection<ProductSubscription>('product_subscriptions')
      .findOne({ tenantId: user.tenantId, productId, status: { $in: ['active', 'trial'] } });
    
    if (existing) {
      return res.status(400).json({ error: 'Active subscription already exists' });
    }

    const now = new Date();
    const nextBillingDate = new Date(now);
    if (billingCycle === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    const newSubscription: Omit<ProductSubscription, '_id'>  = {
      tenantId: user.tenantId,
      productId,
      userId: user.id,
      pricingTier,
      status: 'active',
      billingCycle,
      amount,
      currency,
      startDate: now,
      renewalDate: nextBillingDate,
      autoRenew: true,
      nextBillingDate,
      createdAt: now,
      updatedAt: now
    };

    const result = await db.collection<ProductSubscription>('product_subscriptions')
      .insertOne(newSubscription as any);
    
    res.json({ 
      success: true, 
      subscription: { ...newSubscription, _id: result.insertedId }
    });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Update subscription status
router.patch('/:subscriptionId', async (req, res) => {
  try {
    const user = req.user as any;
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { subscriptionId } = req.params;
    const { status, autoRenew } = req.body;
    
    const db = getDB();
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (status) {updateData.status = status;}
    if (autoRenew !== undefined) {updateData.autoRenew = autoRenew;}
    if (status === 'cancelled') {updateData.cancelledDate = new Date();}

    const result = await db.collection<ProductSubscription>('product_subscriptions')
      .findOneAndUpdate(
        { _id: new ObjectId(subscriptionId), tenantId: user.tenantId }  as any ,
        { $set: updateData },
        { returnDocument: 'after' }
      );
    
    if (!result) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json({ success: true, subscription: result });
  } catch (error: any) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Get billing history for subscription
router.get('/:subscriptionId/billing', async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subscriptionId } = req.params;
    const db = getDB();
    
    const billingHistory = await db.collection<ProductBilling>('product_billing')
      .find({ 
        tenantId: user.tenantId, 
        subscriptionId 
      })
      .sort({ billingDate: -1 })
      .toArray();
    
    res.json({ success: true, billing: billingHistory });
  } catch (error: any) {
    console.error('Get billing history error:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// Create billing record
router.post('/:subscriptionId/billing', async (req, res) => {
  try {
    const user = req.user as any;
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { subscriptionId } = req.params;
    const { amount, currency, description, dueDate } = req.body;
    
    const db = getDB();
    
    // Verify subscription exists
    const subscription = await db.collection<ProductSubscription>('product_subscriptions')
      .findOne({ _id: new ObjectId(subscriptionId)  as any, tenantId: user.tenantId  });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const now = new Date();
    const newBilling: Omit<ProductBilling, '_id'> = {
      tenantId: user.tenantId,
      productId: subscription.productId,
      subscriptionId,
      amount,
      currency,
      status: 'pending',
      billingDate: now,
      dueDate: new Date(dueDate),
      description,
      createdAt: now,
      updatedAt: now
    };

    const result = await db.collection<ProductBilling>('product_billing')
      .insertOne(newBilling as any);
    
    res.json({ 
      success: true, 
      billing: { ...newBilling, _id: result.insertedId }
    });
  } catch (error: any) {
    console.error('Create billing error:', error);
    res.status(500).json({ error: 'Failed to create billing record' });
  }
});

export default router;
