import express from 'express';
import { authenticateSession } from '../middleware/auth';
import { productSignupSessionService } from '../services/productSignupSession.service';
import { tenantPromptService } from '../services/tenantPrompt.service';
import ProductModel from '../models/Product';
import { ProductSubscriptionModel } from '../models/ProductSubscription';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateSession);

/**
 * POST /api/product-signup/initiate
 * Create a new signup session
 */
router.post('/initiate', async (req, res) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId, selectedTier } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Missing productId' });
    }

    // Fetch product to get pricing
    const product = await ProductModel.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Determine locked price
    let lockedPrice = 0;

    if (product.pricing.model === 'subscription' && selectedTier) {
      const tier = product.pricing.tiers?.find(t => t.name === selectedTier);

      if (!tier) {
        return res.status(400).json({ error: 'Invalid pricing tier' });
      }

      lockedPrice = tier.price;
    } else if (product.pricing.model === 'per-use') {
      lockedPrice = product.pricing.minimumCharge || 0;
    } else if (product.pricing.model === 'enterprise') {
      lockedPrice = product.pricing.enterprisePrice || 0;
    }

    // Create session
    const session = await productSignupSessionService.createSession({
      userId: user.id,
      tenantId: user.tenantId,
      productId,
      selectedTier,
      lockedPrice,
      currency: product.pricing.currency
    });

    res.json({
      success: true,
      ...session,
      product: {
        _id: product._id,
        name: product.name,
        description: product.description
      }
    });
  } catch (error: any) {
    console.error('[ProductSignup] Initiate error:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate signup' });
  }
});

/**
 * GET /api/product-signup/session/:sessionId
 * Get session state
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.params;

    const session = await productSignupSessionService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Security: Verify ownership
    if (session.userId.toString() !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get product details
    const product = await ProductModel.findById(session.productId);

    res.json({
      success: true,
      session,
      product: product ? {
        _id: product._id,
        name: product.name,
        description: product.description,
        pricing: product.pricing
      } : null
    });
  } catch (error: any) {
    console.error('[ProductSignup] Get session error:', error);
    res.status(500).json({ error: error.message || 'Failed to get session' });
  }
});

/**
 * PATCH /api/product-signup/session/:sessionId/step
 * Update wizard step progress
 */
router.patch('/session/:sessionId/step', async (req, res) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.params;
    const { step, data } = req.body;

    if (!step) {
      return res.status(400).json({ error: 'Missing step' });
    }

    const validSteps = ['tier-selected', 'payment-validated', 'complete'];

    if (!validSteps.includes(step)) {
      return res.status(400).json({ error: 'Invalid step' });
    }

    const updatedSession = await productSignupSessionService.updateStep(
      sessionId,
      user.id,
      step,
      data
    );

    res.json({
      success: true,
      session: updatedSession
    });
  } catch (error: any) {
    console.error('[ProductSignup] Update step error:', error);
    res.status(500).json({ error: error.message || 'Failed to update step' });
  }
});

/**
 * POST /api/product-signup/session/:sessionId/cancel
 * Cancel signup
 */
router.post('/session/:sessionId/cancel', async (req, res) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.params;

    await productSignupSessionService.cancelSession(sessionId, user.id);

    res.json({
      success: true,
      message: 'Signup cancelled successfully'
    });
  } catch (error: any) {
    console.error('[ProductSignup] Cancel error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel signup' });
  }
});

/**
 * GET /api/product-signup/resume/:resumeToken
 * Resume signup via email link
 */
router.get('/resume/:resumeToken', async (req, res) => {
  try {
    const { resumeToken } = req.params;

    const validation = await productSignupSessionService.validateResumeToken(resumeToken);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.reason,
        startOver: true
      });
    }

    // Get product details
    const product = await ProductModel.findById(validation.session.productId);

    res.json({
      success: true,
      session: validation.session,
      redirectUrl: `/products/${validation.session.productId}/signup?session=${validation.session.sessionId}&step=${validation.session.currentStep}`,
      product: product ? {
        _id: product._id,
        name: product.name
      } : null
    });
  } catch (error: any) {
    console.error('[ProductSignup] Resume error:', error);
    res.status(500).json({ error: error.message || 'Failed to resume signup' });
  }
});

/**
 * POST /api/product-signup/session/:sessionId/complete
 * Finalize subscription after payment validation
 */
router.post('/session/:sessionId/complete', async (req, res) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.params;
    const db = mongoose.connection.db!;

    // Validate session
    const validation = await productSignupSessionService.validateSession(sessionId, user.id);

    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    const session = validation.session;

    // Idempotency check
    if (session.completedSubscriptionId) {
      // Session already completed, return existing subscription
      const existingSubscription = await db.collection('product_subscriptions')
        .findOne({ _id: new ObjectId(session.completedSubscriptionId) });

      return res.json({
        success: true,
        alreadyCompleted: true,
        subscription: existingSubscription,
        redirectUrl: `/products/${session.productId}/configure`
      });
    }

    // Verify payment was validated
    if (!session.paymentValidated || !session.paymentMethodId) {
      return res.status(400).json({ error: 'Payment not validated' });
    }

    // Payment replay protection
    try {
      await productSignupSessionService.recordChargeAttempt(sessionId);
    } catch (error: any) {
      return res.status(429).json({ error: error.message });
    }

    // Check if subscription already exists for this user+product
    const existingSub = await db.collection('product_subscriptions').findOne({
      userId: new ObjectId(user.id),
      productId: new ObjectId(session.productId),
      status: { $in: ['active', 'trial'] }
    });

    if (existingSub) {
      return res.status(400).json({ error: 'Active subscription already exists for this product' });
    }

    // Get product details
    const product = await ProductModel.findById(session.productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Verify locked price matches current tier price
    if (session.selectedTierId) {
      const currentTier = product.pricing.tiers?.find(t => t.name === session.selectedTierId);

      if (!currentTier) {
        return res.status(400).json({ error: 'Pricing tier no longer available' });
      }

      if (currentTier.price !== session.lockedPrice) {
        console.warn(`[ProductSignup] Price mismatch: locked=${session.lockedPrice}, current=${currentTier.price}`);
      }
    }

    const now = new Date();
    const billingCycle = 'monthly'; // Default
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // Create subscription
    const newSubscription = {
      tenantId: user.tenantId,
      productId: new ObjectId(session.productId),
      userId: new ObjectId(user.id),
      pricingTier: session.selectedTierId,
      status: 'active',
      billingCycle,
      amount: session.lockedPrice,
      currency: session.currency,
      startDate: now,
      renewalDate: nextBillingDate,
      autoRenew: true,
      paymentMethod: session.paymentMethodId,
      nextBillingDate,
      signupSessionId: sessionId, // Link to signup session for idempotency
      createdAt: now,
      updatedAt: now
    };

    const subscriptionResult = await db.collection('product_subscriptions').insertOne(newSubscription);
    const subscriptionId = subscriptionResult.insertedId.toString();

    // Create transaction
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const paymentMethod = await db.collection('payment_methods').findOne({
      _id: new ObjectId(session.paymentMethodId)
    });

    const newTransaction = {
      transactionId,
      tenantId: user.tenantId,
      userId: new ObjectId(user.id),
      paymentMethodId: session.paymentMethodId,
      amount: session.lockedPrice,
      currency: session.currency,
      status: 'success',
      type: 'subscription',
      productId: new ObjectId(session.productId),
      productName: product.name,
      description: `Initial subscription for ${product.name}`,
      cardBrand: paymentMethod?.cardBrand,
      cardLast4: paymentMethod?.cardLast4,
      billingInfo: paymentMethod?.billingInfo,
      metadata: {
        subscriptionId,
        billingCycle,
        sessionId
      },
      createdAt: now,
      updatedAt: now
    };

    await db.collection('transactions').insertOne(newTransaction);

    // Create user-product access
    const newUserProduct = {
      tenantId: user.tenantId,
      userId: new ObjectId(user.id),
      productId: new ObjectId(session.productId),
      accessLevel: 'full',
      status: 'active',
      subscriptionId,
      grantedAt: now,
      expiresAt: nextBillingDate,
      createdAt: now,
      updatedAt: now
    };

    await db.collection('user_products').insertOne(newUserProduct);

    // CRITICAL: Provision prompts
    let provisionedPrompts: any = null;

    try {
      const result = await tenantPromptService.pullTemplates(
        user.tenantId,
        session.productId.toString(),
        {
          userId: user.id,
          name: user.name || user.email,
          email: user.email,
          role: user.role || 'USER'
        }
      );

      provisionedPrompts = result;

      console.log(`[ProductSignup] Provisioned ${result.newCount} prompts for tenant ${user.tenantId}`);
    } catch (error: any) {
      console.error('[ProductSignup] Prompt provisioning failed:', error);

      // Option A: Rollback subscription (recommended)
      // Uncomment to enable rollback on prompt failure
      /*
      await db.collection('product_subscriptions').deleteOne({ _id: subscriptionResult.insertedId });
      await db.collection('transactions').deleteOne({ transactionId });
      await db.collection('user_products').deleteOne({ subscriptionId });
      return res.status(500).json({
        error: 'Prompt provisioning failed. Subscription cancelled. Please try again.',
        details: error.message
      });
      */

      // Option B: Continue but log error (currently active)
      console.error('[ProductSignup] Continuing despite prompt provisioning failure');
    }

    // Mark session as complete
    await productSignupSessionService.completeSession(sessionId, subscriptionId);

    // Update payment method stats
    if (paymentMethod) {
      await db.collection('payment_methods').updateOne(
        { _id: new ObjectId(session.paymentMethodId) },
        {
          $set: {
            lastTransactionDate: now,
            lastTransactionAmount: session.lockedPrice,
            lastTransactionStatus: 'success',
            updatedAt: now
          },
          $inc: {
            transactionCount: 1
          }
        }
      );
    }

    res.json({
      success: true,
      subscription: { ...newSubscription, _id: subscriptionResult.insertedId },
      transaction: newTransaction,
      userProduct: newUserProduct,
      provisionedPrompts: provisionedPrompts ? {
        newCount: provisionedPrompts.newCount,
        templates: provisionedPrompts.templates
      } : null,
      redirectUrl: `/products/${session.productId}/configure`
    });
  } catch (error: any) {
    console.error('[ProductSignup] Complete error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete signup' });
  }
});

/**
 * GET /api/product-signup/active
 * Get active signup session for a product (if any)
 */
router.get('/active/:productId', async (req, res) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId } = req.params;

    const session = await productSignupSessionService.getActiveSession(user.id, productId);

    if (!session) {
      return res.json({
        success: true,
        hasActiveSession: false
      });
    }

    res.json({
      success: true,
      hasActiveSession: true,
      session
    });
  } catch (error: any) {
    console.error('[ProductSignup] Get active session error:', error);
    res.status(500).json({ error: error.message || 'Failed to get active session' });
  }
});

export default router;
