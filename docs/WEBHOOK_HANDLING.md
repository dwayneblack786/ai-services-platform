# Webhook Handling & Async Events

## Overview

This guide covers webhook implementation, security, event handling, and best practices for asynchronous communication with external services.

**Implementation Status:** Current backend has basic webhook handling in voice-routes.ts for telephony provider callbacks. This document covers the current webhook implementation pattern plus recommended security patterns like signature verification, idempotency tracking, and reliable delivery mechanisms.

**Webhook Principles:**
- Secure webhook endpoints
- Verify webhook signatures
- Implement idempotency
- Handle delivery failures
- Log and monitor webhooks

## Webhook Setup

### Secure Webhook Endpoint

```typescript
// src/routes/webhookRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const router = Router();

/**
 * Verify webhook signature (Stripe example)
 */
export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const signature = req.headers['stripe-signature'] as string;
  const body = req.rawBody; // Raw body needed for signature verification

  if (!signature || !body) {
    return res.status(401).json({
      error: 'Missing signature or body',
      code: 'INVALID_WEBHOOK',
    });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    req.body = event;
    next();
  } catch (error: any) {
    return res.status(401).json({
      error: 'Webhook verification failed',
      code: 'INVALID_SIGNATURE',
    });
  }
}

/**
 * Generic webhook signature verification
 */
export function createSignatureVerifier(secretKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!signature || !timestamp) {
      return res.status(401).json({
        error: 'Missing signature headers',
        code: 'INVALID_WEBHOOK',
      });
    }

    // Check timestamp (prevent replay attacks)
    const requestTime = parseInt(timestamp);
    const now = Date.now() / 1000;

    if (Math.abs(now - requestTime) > 300) {
      // 5 minutes
      return res.status(401).json({
        error: 'Webhook timestamp too old',
        code: 'STALE_TIMESTAMP',
      });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(signature, expectedSignature)) {
      return res.status(401).json({
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      });
    }

    next();
  };
}

// Register webhook endpoint
router.post(
  '/stripe',
  verifyWebhookSignature,
  handleStripeWebhook
);

router.post(
  '/external-service',
  createSignatureVerifier(process.env.EXTERNAL_SERVICE_SECRET || ''),
  handleExternalServiceWebhook
);
```

## Webhook Handlers

### Stripe Webhook Handler

```typescript
// src/webhooks/stripeWebhook.ts
import Stripe from 'stripe';

export async function handleStripeWebhook(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  const event: Stripe.Event = req.body;

  try {
    // Log webhook
    await logWebhook({
      provider: 'stripe',
      eventType: event.type,
      eventId: event.id,
      status: 'received',
    });

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    next(error);
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  // Find associated order
  const metadata = paymentIntent.metadata as any;
  const orderId = metadata?.orderId;

  if (orderId) {
    // Update order status
    await Order.updateOne(
      { _id: orderId },
      { paymentStatus: 'completed', stripePi: paymentIntent.id }
    );

    // Queue email notification
    await emailQueue.add('send-email', {
      to: metadata?.customerEmail,
      subject: 'Payment Received',
      template: 'payment-success',
    });
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.error('Payment failed:', paymentIntent.id);

  const metadata = paymentIntent.metadata as any;
  const orderId = metadata?.orderId;

  if (orderId) {
    await Order.updateOne(
      { _id: orderId },
      { paymentStatus: 'failed' }
    );
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);

  // Update subscription in database
  const existingSubscription = await Subscription.findOne({
    stripeSubscriptionId: subscription.id,
  });

  if (existingSubscription) {
    existingSubscription.status = subscription.status;
    existingSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    await existingSubscription.save();
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  await Subscription.updateOne(
    { stripeSubscriptionId: subscription.id },
    { status: 'cancelled', cancelledAt: new Date() }
  );
}
```

## Webhook Idempotency

### Idempotent Processing

```typescript
// src/services/idempotencyService.ts
import { WebhookLog } from '../models/WebhookLog';

/**
 * Ensure webhook is processed only once
 */
export async function processWebhookIdempotently<T>(
  webhookId: string,
  process: () => Promise<T>
): Promise<T> {
  // Check if already processed
  const existing = await WebhookLog.findOne({ webhookId });

  if (existing) {
    if (existing.status === 'completed') {
      console.log(`Webhook ${webhookId} already processed`);
      return existing.result;
    }

    if (existing.status === 'processing') {
      // Wait for ongoing processing
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(async () => {
          const updated = await WebhookLog.findOne({ webhookId });
          if (updated?.status === 'completed') {
            clearInterval(checkInterval);
            resolve(updated.result);
          }
        }, 100);

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Webhook processing timeout'));
        }, 30000);
      });
    }
  }

  // Mark as processing
  await WebhookLog.create({
    webhookId,
    status: 'processing',
  });

  try {
    const result = await process();

    // Mark as completed
    await WebhookLog.updateOne(
      { webhookId },
      {
        status: 'completed',
        result,
        completedAt: new Date(),
      }
    );

    return result;
  } catch (error) {
    // Mark as failed
    await WebhookLog.updateOne(
      { webhookId },
      {
        status: 'failed',
        error: (error as Error).message,
        failedAt: new Date(),
      }
    );

    throw error;
  }
}

/**
 * WebhookLog Model
 */
const webhookLogSchema = new Schema({
  webhookId: {
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    required: true,
  },
  result: Schema.Types.Mixed,
  error: String,
  completedAt: Date,
  failedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
```

## Webhook Retry Mechanism

```typescript
// src/workers/webhookRetryWorker.ts
import { Worker, Job } from 'bullmq';
import { webhookQueue } from '../config/queue';

/**
 * Queue failed webhook for retry
 */
export async function retryFailedWebhook(
  webhookId: string,
  endpoint: string,
  payload: any,
  attempt: number = 1
) {
  await webhookQueue.add(
    'process-webhook',
    { webhookId, endpoint, payload, attempt },
    {
      retry: {
        attempts: 5,
        delay: 60000 * attempt, // Exponential backoff
      },
      jobId: `webhook-${webhookId}-attempt-${attempt}`,
    }
  );
}

/**
 * Worker for webhook delivery
 */
export const webhookWorker = new Worker(
  'webhooks',
  async (job: Job) => {
    const { webhookId, endpoint, payload, attempt } = job.data;

    try {
      console.log(`Processing webhook ${webhookId} (attempt ${attempt})`);

      const response = await axios.post(endpoint, payload, {
        timeout: 10000,
      });

      // Mark as delivered
      await WebhookLog.updateOne(
        { webhookId },
        {
          status: 'delivered',
          deliveredAt: new Date(),
          statusCode: response.status,
        }
      );

      return { success: true };
    } catch (error: any) {
      console.error(`Webhook ${webhookId} delivery failed:`, error.message);

      // Will retry via queue mechanism
      throw error;
    }
  },
  { connection: redis, concurrency: 5 }
);
```

## Webhook Event System

### Event Bus Integration

```typescript
// src/services/eventBus.ts
import EventEmitter from 'events';

export interface WebhookEvent {
  type: string;
  payload: any;
  timestamp: Date;
}

export class WebhookEventBus extends EventEmitter {
  async publish(event: WebhookEvent): Promise<void> {
    // Emit to local listeners
    this.emit(event.type, event.payload);

    // Queue for persistent storage
    await webhookQueue.add('publish-event', event);

    // Notify webhooks
    await this.notifySubscribers(event);
  }

  private async notifySubscribers(event: WebhookEvent): Promise<void> {
    // Find subscribers for this event type
    const subscriptions = await WebhookSubscription.find({
      eventType: event.type,
      active: true,
    });

    for (const subscription of subscriptions) {
      await retryFailedWebhook(
        event.timestamp.getTime().toString(),
        subscription.endpoint,
        {
          type: event.type,
          data: event.payload,
          timestamp: event.timestamp,
        }
      );
    }
  }

  subscribe(eventType: string, handler: (payload: any) => void): void {
    this.on(eventType, handler);
  }

  unsubscribe(eventType: string, handler: (payload: any) => void): void {
    this.off(eventType, handler);
  }
}

export const eventBus = new WebhookEventBus();

// Usage
eventBus.subscribe('payment.succeeded', async (payload) => {
  console.log('Payment succeeded:', payload);
});
```

## Webhook Monitoring

```typescript
// src/monitoring/webhookMonitoring.ts
export class WebhookMonitoring {
  /**
   * Get webhook statistics
   */
  static async getStats(provider: string) {
    const logs = await WebhookLog.find({ provider }).sort({
      createdAt: -1,
    });

    return {
      total: logs.length,
      successful: logs.filter(l => l.status === 'completed').length,
      failed: logs.filter(l => l.status === 'failed').length,
      failureRate: (
        (logs.filter(l => l.status === 'failed').length / logs.length) *
        100
      ).toFixed(2),
      lastProcessed: logs[0]?.createdAt,
    };
  }

  /**
   * Alert on high failure rate
   */
  static async monitorFailureRate(provider: string): Promise<void> {
    setInterval(async () => {
      const stats = await this.getStats(provider);
      const failureRate = parseFloat(stats.failureRate);

      if (failureRate > 5) {
        console.error(
          `High webhook failure rate for ${provider}: ${failureRate}%`
        );
      }
    }, 60000); // Check every minute
  }
}
```

## Webhook Best Practices Checklist

- [ ] Verify webhook signatures with HMAC
- [ ] Check webhook timestamp to prevent replay attacks
- [ ] Implement idempotent processing
- [ ] Log all webhook events
- [ ] Implement retry mechanism with exponential backoff
- [ ] Use circuit breaker for webhook endpoints
- [ ] Monitor webhook delivery success rate
- [ ] Alert on high failure rates
- [ ] Implement webhook dead-letter queue
- [ ] Keep audit trail of webhook processing
- [ ] Support webhook disabling/re-enabling
- [ ] Document webhook event types
- [ ] Test webhooks with request/response inspection
- [ ] Validate webhook payload schema
- [ ] Implement webhook subscription management

## Related Documentation

- [BATCH_PROCESSING.md](BATCH_PROCESSING.md) - Queue management
- [EXTERNAL_APIS.md](EXTERNAL_APIS.md) - API integration
- [LOGGING_MONITORING.md](LOGGING_MONITORING.md) - Monitoring strategies
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Error handling

