import express from 'express';
import { getDB } from '../config/database';
import { Transaction } from '../models/Transaction';
import { authenticateSession } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateSession);

// Get all transactions for tenant
router.get('/', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 50, offset = 0, status, paymentMethodId } = req.query;

    const db = getDB();
    const query: any = { tenantId };
    
    if (status) {
      query.status = status;
    }
    
    if (paymentMethodId) {
      query.paymentMethodId = paymentMethodId;
    }

    const transactions = await db.collection<Transaction>('transactions')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .toArray();
    
    const total = await db.collection<Transaction>('transactions')
      .countDocuments(query);
    
    res.json({ 
      success: true, 
      transactions,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get transaction by ID
router.get('/:transactionId', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    const { transactionId } = req.params;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    const transaction = await db.collection<Transaction>('transactions')
      .findOne({ _id: transactionId as any, tenantId });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({ success: true, transaction });
  } catch (error: any) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Get transactions for a specific payment method
router.get('/payment-method/:paymentMethodId', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    const { paymentMethodId } = req.params;
    const { limit = 10 } = req.query;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    const transactions = await db.collection<Transaction>('transactions')
      .find({ tenantId, paymentMethodId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .toArray();
    
    res.json({ success: true, transactions });
  } catch (error: any) {
    console.error('Get payment method transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get transaction statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    const transactions = await db.collection<Transaction>('transactions')
      .find({ tenantId })
      .toArray();
    
    const stats = {
      total: transactions.length,
      successful: transactions.filter(t => t.status === 'success').length,
      failed: transactions.filter(t => t.status === 'failed').length,
      pending: transactions.filter(t => t.status === 'pending').length,
      refunded: transactions.filter(t => t.status === 'refunded').length,
      totalAmount: transactions
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0),
      averageAmount: 0,
      thisMonth: 0,
      lastMonth: 0
    };
    
    if (stats.successful > 0) {
      stats.averageAmount = Math.round(stats.totalAmount / stats.successful);
    }
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    stats.thisMonth = transactions.filter(t => 
      t.status === 'success' && 
      new Date(t.createdAt) >= thisMonthStart
    ).reduce((sum, t) => sum + t.amount, 0);
    
    stats.lastMonth = transactions.filter(t => 
      t.status === 'success' && 
      new Date(t.createdAt) >= lastMonthStart &&
      new Date(t.createdAt) < thisMonthStart
    ).reduce((sum, t) => sum + t.amount, 0);
    
    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction statistics' });
  }
});

export default router;
