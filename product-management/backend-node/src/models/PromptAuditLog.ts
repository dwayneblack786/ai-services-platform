import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPromptAuditLog extends Document {
  promptVersionId: Types.ObjectId;
  action: 'created' | 'updated' | 'approved' | 'deployed' | 'rolled_back' | 'deleted' | 'accessed' | 'improvement_applied' | 'created_from_template';

  actor: {
    userId: string;
    name: string;
    email: string;
    role: string;
    ipAddress: string;
    userAgent?: string;
    sessionId: string;
  };

  timestamp: Date;

  changes?: Array<{
    field: string;
    path: string;
    oldValue: any;
    newValue: any;
  }>;

  context: {
    tenantId?: string;
    productId?: Types.ObjectId;
    environment: string;
    requestId: string;
  };

  compliance: {
    dataClassification: 'PHI' | 'PII' | 'PUBLIC';
    consentRecorded: boolean;
    retentionPolicy: '7_YEARS' | 'INDEFINITE';
    encryptedFields?: string[];
  };
}

const PromptAuditLogSchema = new Schema<IPromptAuditLog>({
  promptVersionId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },

  action: {
    type: String,
    required: true,
    enum: ['created', 'updated', 'approved', 'deployed', 'rolled_back', 'deleted', 'accessed', 'improvement_applied', 'created_from_template'],
    index: true
  },

  actor: {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    ipAddress: { type: String, required: true, index: true },
    userAgent: String,
    sessionId: { type: String, required: true }
  },

  timestamp: {
    type: Date,
    default: Date.now,
    required: true
    // index covered by audit_retention_ttl and timestamp_desc compound indexes
  },

  changes: [{
    field: String,
    path: String,
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed
  }],

  context: {
    tenantId: String,
    productId: Schema.Types.ObjectId,
    environment: {
      type: String,
      required: true,
      enum: ['development', 'testing', 'staging', 'production']
    },
    requestId: { type: String, required: true }
  },

  compliance: {
    dataClassification: {
      type: String,
      enum: ['PHI', 'PII', 'PUBLIC'],
      default: 'PUBLIC'
    },
    consentRecorded: {
      type: Boolean,
      default: false
    },
    retentionPolicy: {
      type: String,
      enum: ['7_YEARS', 'INDEFINITE'],
      default: '7_YEARS'
    },
    encryptedFields: [String]
  }
}, {
  timestamps: false,
  collection: 'prompt_audit_log'
});

// Indexes for efficient querying
PromptAuditLogSchema.index({
  promptVersionId: 1,
  timestamp: -1
}, { name: 'prompt_audit_history' });

PromptAuditLogSchema.index({
  'actor.userId': 1,
  timestamp: -1
}, { name: 'user_activity' });

PromptAuditLogSchema.index({
  action: 1,
  timestamp: -1
}, { name: 'action_lookup' });

PromptAuditLogSchema.index({
  timestamp: -1
}, { name: 'timestamp_desc' });

PromptAuditLogSchema.index({
  'actor.ipAddress': 1,
  timestamp: -1
}, { name: 'security_monitoring' });

// HIPAA/SOC2: 7-year retention requirement
PromptAuditLogSchema.index({
  timestamp: 1
}, {
  name: 'audit_retention_ttl',
  expireAfterSeconds: 220752000 // 7 years
});

export default mongoose.model<IPromptAuditLog>('PromptAuditLog', PromptAuditLogSchema);
