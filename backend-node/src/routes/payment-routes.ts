import express from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { PaymentMethod } from '../models/PaymentMethod';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all payment methods for tenant
router.get('/', async (req, res) => {
  try {
    console.log('==== GET /api/payment-methods ====');
    console.log('req.user:', req.user);
    
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    
    console.log('Extracted userId:', userId);
    console.log('Extracted tenantId:', tenantId);
    
    if (!userId || !tenantId) {
      console.log('❌ Missing userId or tenantId - returning 401');
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: `Missing ${!userId ? 'userId' : ''} ${!tenantId ? 'tenantId' : ''}`
      });
    }

    const db = getDB();
    const paymentMethods = await db.collection<PaymentMethod>('payment_methods')
      .find({ 
        tenantId,
        $or: [
          { status: 'active' },
          { status: 'expired' }
        ]
      })
      .sort({ isDefault: -1, createdAt: -1 })
      .toArray();
    
    // Remove sensitive Stripe IDs from response but include all other fields
    const sanitizedMethods = paymentMethods.map(pm => ({
      _id: pm._id,
      cardBrand: pm.cardBrand,
      cardLast4: pm.cardLast4,
      cardExpMonth: pm.cardExpMonth,
      cardExpYear: pm.cardExpYear,
      billingName: pm.billingName,
      billingEmail: pm.billingEmail,
      isDefault: pm.isDefault,
      status: pm.status,
      lastTransactionDate: pm.lastTransactionDate,
      lastTransactionAmount: pm.lastTransactionAmount,
      lastTransactionStatus: pm.lastTransactionStatus,
      transactionCount: pm.transactionCount,
      createdAt: pm.createdAt
    }));
    
    res.json({ success: true, paymentMethods: sanitizedMethods });
  } catch (error: any) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Add new payment method
router.post('/', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      stripePaymentMethodId, // Tokenized payment method from Stripe (optional for dev)
      cardBrand,
      cardLast4,
      cardExpMonth,
      cardExpYear,
      billingName,
      billingEmail,
      securityCode,
      billingAddress,
      setAsDefault
    } = req.body;

    // Validation
    if (!cardBrand || !cardLast4 || !billingName) {
      return res.status(400).json({ error: 'Missing required payment information' });
    }

    // Validate card last 4 digits
    if (!/^\d{4}$/.test(cardLast4)) {
      return res.status(400).json({ error: 'Card last 4 digits must be exactly 4 digits' });
    }

    // Generate a mock Stripe payment method ID if not provided (dev mode)
    const paymentMethodId = stripePaymentMethodId || `pm_${cardBrand}_${cardLast4}_${Date.now()}`;

    const db = getDB();
    
    // If setting as default, unset other default payment methods
    if (setAsDefault) {
      await db.collection<PaymentMethod>('payment_methods').updateMany(
        { tenantId, isDefault: true },
        { $set: { isDefault: false } }
      );
    } else {
      // Check if there are any payment methods, if not, make this the default
      const existingCount = await db.collection<PaymentMethod>('payment_methods')
        .countDocuments({ tenantId, status: 'active' });
      if (existingCount === 0) {
        req.body.setAsDefault = true;
      }
    }

    // Check if card is expired
    const now = new Date();
    const isExpired = cardExpYear < now.getFullYear() || 
                     (cardExpYear === now.getFullYear() && cardExpMonth < now.getMonth() + 1);

    // Create new payment method
    const newPaymentMethod: Omit<PaymentMethod, '_id'> = {
      tenantId,
      userId,
      stripePaymentMethodId: paymentMethodId,
      cardBrand: cardBrand.toLowerCase(),
      cardLast4,
      cardExpMonth: parseInt(cardExpMonth.toString()),
      cardExpYear: parseInt(cardExpYear.toString()),
      billingName,
      billingEmail,
      securityCode,
      billingAddress: billingAddress || {},
      isDefault: req.body.setAsDefault || false,
      status: isExpired ? 'expired' : 'active',
      transactionCount: 0,
      createdAt: now,
      updatedAt: now
    };

    const result = await db.collection<PaymentMethod>('payment_methods')
      .insertOne(newPaymentMethod as any);
    
    console.log(`✓ Payment method added for tenant: ${tenantId}`);
    
    res.json({ 
      success: true, 
      paymentMethod: {
        _id: result.insertedId,
        cardBrand,
        cardLast4,
        cardExpMonth: newPaymentMethod.cardExpMonth,
        cardExpYear: newPaymentMethod.cardExpYear,
        billingName,
        billingEmail,
        isDefault: newPaymentMethod.isDefault,
        status: newPaymentMethod.status
      }
    });
  } catch (error: any) {
    console.error('Add payment method error:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

// Update payment method (billing info and expiration)
router.patch('/:paymentMethodId', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    const { paymentMethodId } = req.params;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      billingName,
      billingEmail,
      cardExpMonth,
      cardExpYear
    } = req.body;

    // Validation
    if (!billingName && !billingEmail && !cardExpMonth && !cardExpYear) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const db = getDB();
    
    // Verify payment method belongs to tenant
    const paymentMethod = await db.collection<PaymentMethod>('payment_methods')
      .findOne({ _id: new ObjectId(paymentMethodId), tenantId });
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Build update object
    const updateFields: any = { updatedAt: new Date() };
    
    if (billingName) updateFields.billingName = billingName;
    if (billingEmail) updateFields.billingEmail = billingEmail;
    if (cardExpMonth) updateFields.cardExpMonth = parseInt(cardExpMonth);
    if (cardExpYear) updateFields.cardExpYear = parseInt(cardExpYear);

    // Check if card is expired with new expiration date
    if (cardExpMonth || cardExpYear) {
      const expMonth = cardExpMonth ? parseInt(cardExpMonth) : paymentMethod.cardExpMonth;
      const expYear = cardExpYear ? parseInt(cardExpYear) : paymentMethod.cardExpYear;
      const now = new Date();
      const isExpired = expYear < now.getFullYear() || 
                       (expYear === now.getFullYear() && expMonth < now.getMonth() + 1);
      updateFields.status = isExpired ? 'expired' : 'active';
    }

    // Update payment method
    await db.collection<PaymentMethod>('payment_methods').updateOne(
      { _id: new ObjectId(paymentMethodId) },
      { $set: updateFields }
    );
    
    console.log(`✓ Payment method updated: ${paymentMethodId}`);
    
    // Return updated payment method
    const updatedMethod = await db.collection<PaymentMethod>('payment_methods')
      .findOne({ _id: new ObjectId(paymentMethodId) });
    
    res.json({ 
      success: true, 
      message: 'Payment method updated successfully',
      paymentMethod: {
        _id: updatedMethod!._id,
        cardBrand: updatedMethod!.cardBrand,
        cardLast4: updatedMethod!.cardLast4,
        cardExpMonth: updatedMethod!.cardExpMonth,
        cardExpYear: updatedMethod!.cardExpYear,
        billingName: updatedMethod!.billingName,
        billingEmail: updatedMethod!.billingEmail,
        isDefault: updatedMethod!.isDefault,
        status: updatedMethod!.status
      }
    });
  } catch (error: any) {
    console.error('Update payment method error:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// Set default payment method
router.patch('/:paymentMethodId/set-default', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    const { paymentMethodId } = req.params;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    
    // Verify payment method belongs to tenant
    const paymentMethod = await db.collection<PaymentMethod>('payment_methods')
      .findOne({ _id: new ObjectId(paymentMethodId), tenantId });
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Unset all default payment methods
    await db.collection<PaymentMethod>('payment_methods').updateMany(
      { tenantId, isDefault: true },
      { $set: { isDefault: false, updatedAt: new Date() } }
    );

    // Set this one as default
    await db.collection<PaymentMethod>('payment_methods').updateOne(
      { _id: new ObjectId(paymentMethodId) },
      { $set: { isDefault: true, updatedAt: new Date() } }
    );
    
    res.json({ success: true, message: 'Default payment method updated' });
  } catch (error: any) {
    console.error('Set default payment method error:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
});

// Remove payment method
router.delete('/:paymentMethodId', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    const { paymentMethodId } = req.params;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    
    // Verify payment method belongs to tenant
    const paymentMethod = await db.collection<PaymentMethod>('payment_methods')
      .findOne({ _id: new ObjectId(paymentMethodId), tenantId });
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Mark as removed (don't actually delete for audit purposes)
    await db.collection<PaymentMethod>('payment_methods').updateOne(
      { _id: new ObjectId(paymentMethodId) },
      { $set: { status: 'removed', updatedAt: new Date() } }
    );
    
    // If this was the default, set another one as default
    if (paymentMethod.isDefault) {
      const nextPaymentMethod = await db.collection<PaymentMethod>('payment_methods')
        .findOne({ tenantId, status: 'active', _id: { $ne: new ObjectId(paymentMethodId) } });
      
      if (nextPaymentMethod) {
        await db.collection<PaymentMethod>('payment_methods').updateOne(
          { _id: nextPaymentMethod._id },
          { $set: { isDefault: true, updatedAt: new Date() } }
        );
      }
    }
    
    res.json({ success: true, message: 'Payment method removed' });
  } catch (error: any) {
    console.error('Remove payment method error:', error);
    res.status(500).json({ error: 'Failed to remove payment method' });
  }
});

// Verify payment method (for product signup)
router.post('/verify', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { paymentMethodId, testAmount } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    const db = getDB();
    
    // Get payment method
    const paymentMethod = await db.collection<PaymentMethod>('payment_methods')
      .findOne({ _id: new ObjectId(paymentMethodId), tenantId, status: 'active' });
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Development mode: Simulate verification based on Stripe ID
    if (process.env.NODE_ENV !== 'production') {
      // Good card - always succeeds
      if (paymentMethod.stripePaymentMethodId.includes('good') || 
          paymentMethod.stripePaymentMethodId.includes('success') ||
          paymentMethod.cardLast4 === '4242') {
        console.log(`✓ [DEV] Payment method verified (GOOD CARD): ${paymentMethodId}`);
        return res.json({ 
          success: true, 
          verified: true,
          message: 'Payment method verified successfully',
          testMode: true
        });
      }
      
      // Bad card - always fails
      if (paymentMethod.stripePaymentMethodId.includes('bad') || 
          paymentMethod.stripePaymentMethodId.includes('decline') ||
          paymentMethod.cardLast4 === '0002') {
        console.log(`✗ [DEV] Payment verification failed (BAD CARD): ${paymentMethodId}`);
        return res.status(400).json({ 
          error: 'Payment verification failed',
          details: 'Your card was declined. Please try a different payment method.',
          code: 'card_declined',
          testMode: true
        });
      }
      
      // Expired card
      if (paymentMethod.status === 'expired' || paymentMethod.cardLast4 === '9999') {
        console.log(`✗ [DEV] Payment verification failed (EXPIRED): ${paymentMethodId}`);
        return res.status(400).json({ 
          error: 'Payment verification failed',
          details: 'Your card has expired. Please update your payment method.',
          code: 'card_expired',
          testMode: true
        });
      }
      
      // Default: succeed for dev mode
      console.log(`✓ [DEV] Payment method verified (DEFAULT): ${paymentMethodId}`);
      return res.json({ 
        success: true, 
        verified: true,
        message: 'Payment method verified successfully',
        testMode: true
      });
    }

    // TODO: Production - Integrate with Stripe
    // Use Stripe's PaymentIntent with setup mode or create a test charge
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: testAmount || 100, // $1.00 test charge
    //   currency: 'usd',
    //   payment_method: paymentMethod.stripePaymentMethodId,
    //   confirm: true,
    //   setup_future_usage: 'off_session'
    // });
    
    console.log(`✓ Payment method verified for tenant: ${tenantId}`);
    
    res.json({ 
      success: true, 
      verified: true,
      message: 'Payment method verified successfully' 
    });
  } catch (error: any) {
    console.error('Verify payment method error:', error);
    res.status(500).json({ error: 'Failed to verify payment method' });
  }
});

// Development only: Create test payment methods
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/create-test-cards', async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const tenantId = (req.user as any)?.tenantId;
      
      if (!userId || !tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const db = getDB();
      const now = new Date();

      // Clear existing test cards
      await db.collection<PaymentMethod>('payment_methods').deleteMany({
        tenantId,
        stripePaymentMethodId: { $regex: /^pm_(good|bad|expired)_/ }
      });

      const testCards = [
        {
          tenantId,
          userId,
          stripePaymentMethodId: 'pm_good_card_success',
          cardBrand: 'visa',
          cardLast4: '4242',
          cardExpMonth: 12,
          cardExpYear: 2025,
          billingName: 'Good Test Card',
          billingEmail: 'success@test.com',
          isDefault: true,
          status: 'active',
          createdAt: now,
          updatedAt: now
        },
        {
          tenantId,
          userId,
          stripePaymentMethodId: 'pm_bad_card_decline',
          cardBrand: 'mastercard',
          cardLast4: '0002',
          cardExpMonth: 11,
          cardExpYear: 2025,
          billingName: 'Declined Test Card',
          billingEmail: 'decline@test.com',
          isDefault: false,
          status: 'active',
          createdAt: now,
          updatedAt: now
        },
        {
          tenantId,
          userId,
          stripePaymentMethodId: 'pm_expired_card',
          cardBrand: 'amex',
          cardLast4: '9999',
          cardExpMonth: 1,
          cardExpYear: 2023,
          billingName: 'Expired Test Card',
          billingEmail: 'expired@test.com',
          isDefault: false,
          status: 'expired',
          createdAt: now,
          updatedAt: now
        }
      ];

      const result = await db.collection<PaymentMethod>('payment_methods')
        .insertMany(testCards as any);

      console.log(`✓ [DEV] Created ${Object.keys(result.insertedIds).length} test payment methods`);

      res.json({
        success: true,
        message: 'Test payment methods created',
        cards: [
          { type: 'success', last4: '4242', description: 'Will succeed verification' },
          { type: 'decline', last4: '0002', description: 'Will fail verification' },
          { type: 'expired', last4: '9999', description: 'Expired card' }
        ]
      });
    } catch (error: any) {
      console.error('[DEV] Create test cards error:', error);
      res.status(500).json({ error: 'Failed to create test cards' });
    }
  });
}

export default router;
