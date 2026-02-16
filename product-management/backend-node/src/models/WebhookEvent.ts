import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
  provider: 'stripe' | 'paypal';
  eventId: string;
  eventType: string;
  payload: Record<string, any>;
  status: 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: {
      type: String,
      enum: ['stripe', 'paypal'],
      required: true,
      index: true
    },
    eventId: {
      type: String,
      required: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      required: true,
      default: 'processing',
      index: true
    },
    processedAt: {
      type: Date
    },
    error: {
      type: String
    }
  },
  {
    timestamps: true,
    collection: 'webhook_events'
  }
);

// Unique compound index to prevent duplicate webhook processing
// This is critical for idempotency - each provider's event ID should only be processed once
WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

// Index for querying failed events
WebhookEventSchema.index({ status: 1, createdAt: -1 });

// Index for cleanup/analytics queries
WebhookEventSchema.index({ createdAt: -1 });

const WebhookEventModel = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

export default WebhookEventModel;
