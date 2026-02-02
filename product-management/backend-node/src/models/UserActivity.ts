import mongoose, { Schema, Document } from 'mongoose';

export interface IUserActivity extends Document {
  userId: string;
  userEmail: string;
  tenantId: string;
  eventType: 'login' | 'logout' | 'dashboard_view' | 'product_access' | 'settings_change' | 'api_call';
  eventName: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Date;
}

const UserActivitySchema = new Schema<IUserActivity>(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    eventType: { 
      type: String, 
      required: true, 
      enum: ['login', 'logout', 'dashboard_view', 'product_access', 'settings_change', 'api_call'],
      index: true 
    },
    eventName: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, required: true, default: Date.now, index: true }
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
UserActivitySchema.index({ tenantId: 1, timestamp: -1 });
UserActivitySchema.index({ userId: 1, timestamp: -1 });
UserActivitySchema.index({ eventType: 1, timestamp: -1 });
UserActivitySchema.index({ tenantId: 1, eventType: 1, timestamp: -1 });

const UserActivity = mongoose.model<IUserActivity>('UserActivity', UserActivitySchema);
export default UserActivity;
