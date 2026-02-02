import express, { Request, Response } from 'express';
import { authenticateSession } from '../middleware/auth';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

const router = express.Router();

interface AnalyticsQuery {
  range?: '24h' | '7d' | '30d' | '90d';
  productId?: string;
  customerId?: string;
}

// GET /api/analytics
// Get aggregated analytics data for the authenticated user/tenant
router.get('/', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { range = '30d', productId, customerId } = req.query as AnalyticsQuery;
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId || userId;

    console.log('[Analytics] Query:', { range, productId, customerId, tenantId });

    const db = mongoose.connection.db!;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Build query filter
    const filter: any = {
      startTime: { $gte: startDate }
    };

    // Filter by customer/tenant
    if (customerId) {
      filter.customerId = customerId;
    } else if (tenantId) {
      filter.customerId = tenantId;
    }

    // Filter by product
    if (productId && ObjectId.isValid(productId)) {
      filter.productId = new ObjectId(productId);
    } else if (productId) {
      filter.productId = productId;
    }

    console.log('[Analytics] Query filter:', JSON.stringify(filter, null, 2));

    // Aggregate usage metrics from assistant_calls
    const usageAgg = await db.collection('assistant_calls').aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          sttSeconds: { $sum: '$usage.sttSeconds' },
          ttsCharacters: { $sum: '$usage.ttsCharacters' },
          llmTokensIn: { $sum: '$usage.llmTokensIn' },
          llmTokensOut: { $sum: '$usage.llmTokensOut' },
          totalCalls: { $sum: 1 }
        }
      }
    ]).toArray();

    const usage = usageAgg[0] || {
      sttSeconds: 0,
      ttsCharacters: 0,
      llmTokensIn: 0,
      llmTokensOut: 0,
      totalCalls: 0
    };

    // Aggregate chat messages
    const chatFilter: any = {
      createdAt: { $gte: startDate }
    };
    if (customerId) {
      chatFilter.customerId = customerId;
    } else if (tenantId) {
      chatFilter.customerId = tenantId;
    }

    const chatStats = await db.collection('chat_history').aggregate([
      { $match: chatFilter },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          userMessages: {
            $sum: { $cond: [{ $eq: ['$speaker', 'user'] }, 1, 0] }
          },
          assistantMessages: {
            $sum: { $cond: [{ $eq: ['$speaker', 'assistant'] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    const chatMetrics = chatStats[0] || {
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0
    };

    // Get top intents from assistant_calls
    const intentsAgg = await db.collection('assistant_calls').aggregate([
      { $match: filter },
      { $unwind: { path: '$transcript', preserveNullAndEmptyArrays: true } },
      { $match: { 'transcript.intent': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$transcript.intent',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    const topIntents = intentsAgg.map((item) => ({
      intent: item._id || 'unknown',
      count: item.count
    }));

    // Get daily activity for the range
    const dailyActivityAgg = await db.collection('assistant_calls').aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startTime' }
          },
          calls: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Get daily chat activity
    const dailyChatAgg = await db.collection('chat_history').aggregate([
      { $match: chatFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          chats: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Merge daily stats
    const dailyStatsMap = new Map<string, { calls: number; chats: number }>();
    dailyActivityAgg.forEach((item) => {
      dailyStatsMap.set(item._id, { calls: item.calls, chats: 0 });
    });
    dailyChatAgg.forEach((item) => {
      const existing = dailyStatsMap.get(item._id) || { calls: 0, chats: 0 };
      existing.chats = item.chats;
      dailyStatsMap.set(item._id, existing);
    });

    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Count unique active users (from transcript speaker or customerId)
    const activeUsersAgg = await db.collection('assistant_calls').aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$customerId'
        }
      }
    ]).toArray();

    const activeUsers = activeUsersAgg.length;

    // Calculate average response time (from call duration)
    const responseTimeAgg = await db.collection('assistant_calls').aggregate([
      { $match: { ...filter, durationSeconds: { $exists: true, $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$durationSeconds' }
        }
      }
    ]).toArray();

    const averageResponseTime = responseTimeAgg[0]?.avgDuration || 0;

    // Calculate total cost estimate (rough approximation)
    const sttCost = (usage.sttSeconds || 0) * 0.006; // $0.006 per minute
    const ttsCost = (usage.ttsCharacters || 0) * 0.000016; // $0.016 per 1000 chars
    const llmCost = ((usage.llmTokensIn || 0) + (usage.llmTokensOut || 0)) * 0.000002; // Approx $0.002 per 1k tokens
    const totalCost = sttCost + ttsCost + llmCost;

    // Calculate completion rate (calls that ended normally vs errored)
    const completedCalls = await db.collection('assistant_calls').countDocuments({
      ...filter,
      status: 'completed'
    });
    const completionRate = usage.totalCalls > 0 
      ? (completedCalls / usage.totalCalls) * 100 
      : 100;

    // Build response matching frontend interface
    const analyticsData = {
      totalCalls: usage.totalCalls || 0,
      totalChats: chatMetrics.totalMessages || 0,
      avgDuration: averageResponseTime || 0, // in seconds
      completionRate: completionRate,
      totalCost: totalCost,
      usage: {
        sttSeconds: usage.sttSeconds || 0,
        ttsCharacters: usage.ttsCharacters || 0,
        llmTokensIn: usage.llmTokensIn || 0,
        llmTokensOut: usage.llmTokensOut || 0
      },
      channelBreakdown: {
        voice: usage.totalCalls || 0,
        chat: chatMetrics.totalMessages || 0
      },
      dailyStats: dailyStats.length > 0 ? dailyStats : [
        { date: now.toISOString().split('T')[0], calls: 0, chats: 0 }
      ],
      topIntents: topIntents.length > 0 ? topIntents : [
        { intent: 'greeting', count: 0 },
        { intent: 'help_request', count: 0 }
      ]
    };

    console.log('[Analytics] Response summary:', {
      totalCalls: analyticsData.totalCalls,
      totalChats: analyticsData.totalChats,
      totalCost: analyticsData.totalCost,
      completionRate: analyticsData.completionRate,
      sttSeconds: analyticsData.usage.sttSeconds,
      intentsCount: analyticsData.topIntents.length,
      dailyStatsCount: analyticsData.dailyStats.length
    });

    return res.json(analyticsData);

  } catch (error) {
    console.error('[Analytics] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch analytics data',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// GET /api/analytics/product/:productId
// Get analytics for a specific product
router.get('/product/:productId', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { range = '30d' } = req.query as AnalyticsQuery;

    // Add productId to query and fetch analytics
    req.query = { ...req.query, productId, range };
    
    // Call the main analytics endpoint logic
    const db = mongoose.connection.db!;
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId || userId;

    console.log('[Analytics Product] Query:', { range, productId, tenantId });

    // This will use the same logic as the main endpoint but filtered by productId
    // For simplicity, redirect client to use query parameter instead
    return res.redirect(`/api/analytics?range=${range}&productId=${productId}`);

  } catch (error) {
    console.error('[Analytics Product] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch product analytics' 
    });
  }
});

export default router;
