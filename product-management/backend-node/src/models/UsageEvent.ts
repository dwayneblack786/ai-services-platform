import mongoose, { Schema, Document } from 'mongoose';

export interface IUsageEvent extends Document {
  tenantId: string;
  userId: string;
  eventType: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}

const UsageEventSchema = new Schema<IUsageEvent>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    resourceType: { type: String, index: true },
    resourceId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

// Compound indexes for common queries
UsageEventSchema.index({ tenantId: 1, timestamp: -1 });
UsageEventSchema.index({ userId: 1, timestamp: -1 });
UsageEventSchema.index({ tenantId: 1, eventType: 1, timestamp: -1 });

const UsageEvent = mongoose.model<IUsageEvent>('UsageEvent', UsageEventSchema);
export default UsageEvent;
