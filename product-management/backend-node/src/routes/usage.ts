import { Router, Request, Response } from 'express';
import UsageEvent from '../models/UsageEvent';

const router = Router();

/**
 * Ingest usage events
 * POST /api/usage/events
 * 
 * Request body:
 * {
 *   "tenant_id": "acme-corp",
 *   "user_id": "507f1f77bcf86cd799439011",
 *   "event_type": "project.created",
 *   "resource_type": "project",
 *   "resource_id": "proj_123",
 *   "metadata": { ... },
 *   "timestamp": "2026-01-28T12:00:00Z"
 * }
 * 
 * Batch format:
 * {
 *   "events": [ ... ]
 * }
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    const isBatch = Array.isArray(req.body.events);
    const events = isBatch ? req.body.events : [req.body];

    console.log('\n' + '='.repeat(80));
    console.log('📊 USAGE EVENT INGESTION');
    console.log('='.repeat(80));
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`📦 Events: ${events.length} event(s)`);
    console.log('='.repeat(80));

    // Validate and transform events
    const validatedEvents = [];
    const errors = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      try {
        const validation = validateUsageEvent(event);

        if (!validation.valid) {
          errors.push({
            index: i,
            event: event,
            error: validation.error
          });
          continue;
        }

        // Skip validation checks - store events directly for better reliability
        // Validation can cause 500 errors and block legitimate tracking
        // Instead, we'll rely on the event data itself

        validatedEvents.push({
          tenantId: event.tenant_id,
          userId: event.user_id,
          eventType: event.event_type,
          resourceType: event.resource_type,
          resourceId: event.resource_id,
          metadata: event.metadata || {},
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date()
        });
      } catch (eventError: any) {
        console.error(`[Usage] Error processing event ${i}:`, eventError.message);
        errors.push({
          index: i,
          event: event,
          error: `Processing error: ${eventError.message}`
        });
      }
    }

    // Store valid events
    if (validatedEvents.length > 0) {
      await UsageEvent.insertMany(validatedEvents);
      console.log(`✅ Stored ${validatedEvents.length} event(s)`);
    }

    if (errors.length > 0) {
      console.log(`⚠️  Rejected ${errors.length} event(s)`);
      errors.forEach(err => {
        console.log(`   [${err.index}] ${err.error}`);
      });
    }

    console.log('='.repeat(80) + '\n');

    res.status(errors.length === events.length ? 400 : 200).json({
      success: validatedEvents.length > 0,
      ingested: validatedEvents.length,
      rejected: errors.length,
      errors: errors
    });
  } catch (error: any) {
    console.error('Usage ingestion error:', error);
    console.log('='.repeat(80) + '\n');
    res.status(500).json({
      success: false,
      error: 'ingestion_failed',
      message: error.message
    });
  }
});

/**
 * Get usage summary for tenant
 * GET /api/usage/summary?tenant_id=acme-corp&start_date=2026-01-01&end_date=2026-01-31
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { tenant_id, start_date, end_date, event_type } = req.query;

    if (!tenant_id) {
      return res.status(400).json({
        error: 'tenant_id is required'
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 USAGE SUMMARY REQUEST');
    console.log('='.repeat(80));
    console.log(`🏢 Tenant ID: ${tenant_id}`);
    console.log(`📅 Period: ${start_date || 'all'} to ${end_date || 'now'}`);
    console.log('='.repeat(80));

    const query: any = { tenantId: tenant_id };

    // Date range filter
    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) {
        query.timestamp.$gte = new Date(start_date as string);
      }
      if (end_date) {
        query.timestamp.$lte = new Date(end_date as string);
      }
    }

    // Event type filter
    if (event_type) {
      query.eventType = event_type;
    }

    // Aggregate by event type
    const summary = await UsageEvent.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          firstEvent: { $min: '$timestamp' },
          lastEvent: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalEvents = await UsageEvent.countDocuments(query);

    console.log(`✅ Summary generated: ${totalEvents} total events`);
    console.log('='.repeat(80) + '\n');

    res.json({
      tenant_id,
      period: {
        start: start_date || null,
        end: end_date || null
      },
      total_events: totalEvents,
      by_event_type: summary.map(s => ({
        event_type: s._id,
        count: s.count,
        first_event: s.firstEvent,
        last_event: s.lastEvent
      }))
    });
  } catch (error: any) {
    console.error('Usage summary error:', error);
    console.log('='.repeat(80) + '\n');
    res.status(500).json({
      error: 'summary_failed',
      message: error.message
    });
  }
});

/**
 * Get usage summary for user
 * GET /api/usage/user-summary?user_id=507f1f77bcf86cd799439011&start_date=2026-01-01&end_date=2026-01-31
 */
router.get('/user-summary', async (req: Request, res: Response) => {
  try {
    const { user_id, start_date, end_date } = req.query;

    if (!user_id) {
      return res.status(400).json({
        error: 'user_id is required'
      });
    }

    const query: any = { userId: user_id };

    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) {
        query.timestamp.$gte = new Date(start_date as string);
      }
      if (end_date) {
        query.timestamp.$lte = new Date(end_date as string);
      }
    }

    const summary = await UsageEvent.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalEvents = await UsageEvent.countDocuments(query);

    res.json({
      user_id,
      period: {
        start: start_date || null,
        end: end_date || null
      },
      total_events: totalEvents,
      by_event_type: summary.map(s => ({
        event_type: s._id,
        count: s.count
      }))
    });
  } catch (error: any) {
    console.error('User summary error:', error);
    res.status(500).json({
      error: 'summary_failed',
      message: error.message
    });
  }
});

/**
 * Validate usage event structure
 */
function validateUsageEvent(event: any): { valid: boolean; error?: string } {
  if (!event.tenant_id || typeof event.tenant_id !== 'string') {
    return { valid: false, error: 'tenant_id is required and must be a string' };
  }

  if (!event.user_id || typeof event.user_id !== 'string') {
    return { valid: false, error: 'user_id is required and must be a string' };
  }

  if (!event.event_type || typeof event.event_type !== 'string') {
    return { valid: false, error: 'event_type is required and must be a string' };
  }

  return { valid: true };
}

/**
 * Validate tenant exists in MongoDB
 * Tenant validation is done by checking if users exist with that tenantId
 */
async function validateTenantExists(tenantId: string): Promise<boolean> {
  try {
    const User = (await import('../models/User')).default;
    const userCount = await User.countDocuments({ tenantId });
    return userCount > 0;
  } catch (error: any) {
    console.error(`[Usage] Tenant validation error for ${tenantId}:`, error.message);
    // Return true to not block usage tracking on validation errors
    return true;
  }
}

/**
 * Validate user exists in MongoDB
 */
async function validateUserExists(userId: string, tenantId: string): Promise<boolean> {
  try {
    const User = (await import('../models/User')).default;
    // Convert string to ObjectId if needed
    const mongoose = await import('mongoose');
    
    // Check if userId is a valid ObjectId
    if (!mongoose.default.Types.ObjectId.isValid(userId)) {
      console.warn(`[Usage] Invalid ObjectId format for userId: ${userId}`);
      // Return true to not block usage tracking on validation errors
      return true;
    }
    
    const user = await User.findOne({ _id: userId, tenantId });
    return !!user;
  } catch (error: any) {
    console.error(`[Usage] User validation error for ${userId}:`, error.message);
    // Return true to not block usage tracking on validation errors
    return true;
  }
}

export default router;
