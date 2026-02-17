import mongoose, { Schema, Document, Types } from 'mongoose';

// Type definitions for prompt content layers
export interface IPersona {
  tone: string;
  personality: string;
  allowedActions: string[];
  disallowedActions: string[];
}

export interface IBusinessContext {
  servicesOffered: string[];
  pricingInfo?: string;
  locations?: Array<{
    name: string;
    address: string;
    city: string;
    phone: string;
    hours: string;
  }>;
  policies?: string;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

export interface IRagConfig {
  enabled: boolean;
  vectorStore?: {
    provider: string;
    indexName: string;
    namespace?: string;
    apiKey?: string;
    endpoint?: string;
    embedding: {
      model: string;
      dimensions: number;
      provider: string;
    };
    autoSync: boolean;
    syncSchedule?: string;
    lastSyncedAt?: Date;
  };
  sources?: Array<{
    _id: Types.ObjectId;
    type: string;
    name: string;
    enabled: boolean;
    config: any;
    chunkSize: number;
    chunkOverlap: number;
    metadata?: Map<string, string>;
    refreshInterval?: number;
    lastRefreshedAt?: Date;
    status: string;
    stats?: {
      totalChunks: number;
      lastSyncDuration: number;
      errorCount: number;
    };
  }>;
  retrieval?: {
    maxResults: number;
    minScore: number;
    hybridSearch: boolean;
    reranking?: {
      enabled: boolean;
      model: string;
      topN: number;
    };
    filters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  contextInjection?: {
    position: string;
    template: string;
    maxTokens: number;
    includeCitations: boolean;
    citationFormat?: string;
  };
  fallback?: {
    noResultsMessage?: string;
    minResultsRequired?: number;
    useStaticContext: boolean;
  };
  caching?: {
    enabled: boolean;
    ttl: number;
    cacheKey?: string;
  };
}

export interface IConversationBehavior {
  greeting: string;
  fallbackMessage: string;
  intentPrompts?: Map<string, string>;
  askForNameFirst?: boolean;
  conversationMemoryTurns?: number;
}

export interface IConstraints {
  prohibitedTopics: string[];
  complianceRules?: string[];
  requireConsent?: boolean;
  maxConversationTurns?: number;
}

export interface IPromptContent {
  systemPrompt: string;
  persona: IPersona;
  businessContext: IBusinessContext;
  ragConfig?: IRagConfig;
  conversationBehavior: IConversationBehavior;
  constraints: IConstraints;
  customVariables?: Map<string, string>;
}

export interface IABTest {
  enabled: boolean;
  testId?: string;
  variant?: string;
  trafficPercentage?: number;
  metrics?: {
    impressions: number;
    conversions: number;
    avgResponseTime: number;
  };
}

export interface IApproval {
  state: string;
  approver: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  approvedAt: Date;
  comments?: string;
}

export interface IPromptVersion extends Document {
  // Identity
  promptId: Types.ObjectId;
  version: number;

  // Metadata
  name: string;
  description?: string;
  category?: string;
  channelType: string;

  // Template fields (Phase 0.5)
  isTemplate?: boolean;
  templateDescription?: string;
  baseTemplateId?: Types.ObjectId;
  icon?: string;

  // Multi-tenant
  tenantId?: string;
  productId?: Types.ObjectId;

  // 6-Layer Prompt Content
  content: IPromptContent;

  // Workflow State
  state: 'draft' | 'testing' | 'staging' | 'production' | 'archived';
  environment: 'development' | 'testing' | 'staging' | 'production';

  // A/B Testing
  abTest?: IABTest;

  // Version Control
  basedOn?: Types.ObjectId;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    description?: string;
  }>;

  // Approvals
  approvals?: IApproval[];

  // Audit
  createdBy: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: Date;
  updatedBy?: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  updatedAt: Date;

  // Activation
  isActive: boolean;
  activatedAt?: Date;

  // Rollback
  canRollback: boolean;
  rollbackFrom?: Types.ObjectId;

  // Metrics (Phase 7: Enhanced tracking)
  metrics?: {
    totalUses: number;
    successCount: number;
    errorCount: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    avgTokensUsed: number;
    totalCost: number;
    lastUsedAt: Date;
    errorRate: number;      // Calculated: errorCount / totalUses
    successRate: number;    // Calculated: successCount / totalUses
  };

  tags?: string[];

  // Soft Deletion
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
}

export const PromptVersionSchema = new Schema<IPromptVersion>({
  // Identity
  promptId: { type: Schema.Types.ObjectId, required: true, index: true },
  version: { type: Number, required: true, default: 1 },

  // Metadata
  name: { type: String, required: true },
  description: String,
  category: String,
  channelType: { type: String, required: true, enum: ['voice', 'chat', 'sms', 'whatsapp', 'email'] },

  // Template fields (Phase 0.5)
  isTemplate: { type: Boolean, default: false, index: true },
  templateDescription: String,
  baseTemplateId: { type: Schema.Types.ObjectId, index: true },
  icon: String,

  // Multi-tenant
  tenantId: { type: String, index: true },
  productId: { type: Schema.Types.ObjectId, index: true },

  // 6-Layer Content
  content: {
    systemPrompt: { type: String, required: true },
    persona: {
      tone: { type: String, required: true },
      personality: { type: String, required: true },
      allowedActions: [String],
      disallowedActions: [String]
    },
    businessContext: {
      servicesOffered: [String],
      pricingInfo: String,
      locations: [{
        name: String,
        address: String,
        city: String,
        phone: String,
        hours: String
      }],
      policies: String,
      faqs: [{
        question: String,
        answer: String
      }]
    },
    ragConfig: {
      enabled: { type: Boolean, default: false },
      vectorStore: {
        provider: String,
        indexName: String,
        namespace: String,
        apiKey: String,
        endpoint: String,
        embedding: {
          model: String,
          dimensions: Number,
          provider: String
        },
        autoSync: Boolean,
        syncSchedule: String,
        lastSyncedAt: Date
      },
      sources: [{
        type: { type: String },
        name: String,
        enabled: Boolean,
        config: Schema.Types.Mixed,
        chunkSize: Number,
        chunkOverlap: Number,
        metadata: Map,
        refreshInterval: Number,
        lastRefreshedAt: Date,
        status: String,
        stats: {
          totalChunks: Number,
          lastSyncDuration: Number,
          errorCount: Number
        }
      }],
      retrieval: {
        maxResults: Number,
        minScore: Number,
        hybridSearch: Boolean,
        reranking: {
          enabled: Boolean,
          model: String,
          topN: Number
        },
        filters: [{
          field: String,
          operator: String,
          value: Schema.Types.Mixed
        }]
      },
      contextInjection: {
        position: String,
        template: String,
        maxTokens: Number,
        includeCitations: Boolean,
        citationFormat: String
      },
      fallback: {
        noResultsMessage: String,
        minResultsRequired: Number,
        useStaticContext: Boolean
      },
      caching: {
        enabled: Boolean,
        ttl: Number,
        cacheKey: String
      }
    },
    conversationBehavior: {
      greeting: { type: String, required: true },
      fallbackMessage: { type: String, required: true },
      intentPrompts: Map,
      askForNameFirst: Boolean,
      conversationMemoryTurns: Number
    },
    constraints: {
      prohibitedTopics: [String],
      complianceRules: [String],
      requireConsent: Boolean,
      maxConversationTurns: Number
    },
    customVariables: Map
  },

  // Workflow State
  state: {
    type: String,
    enum: ['draft', 'testing', 'staging', 'production', 'archived'],
    default: 'draft',
    index: true
  },
  environment: {
    type: String,
    enum: ['development', 'testing', 'staging', 'production'],
    default: 'development',
    index: true
  },

  // A/B Testing
  abTest: {
    enabled: { type: Boolean, default: false },
    testId: String,
    variant: String,
    trafficPercentage: Number,
    metrics: {
      impressions: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      avgResponseTime: Number
    }
  },

  // Version Control
  basedOn: Schema.Types.ObjectId,
  changes: [{
    field: String,
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    description: String
  }],

  // Approvals
  approvals: [{
    state: String,
    approver: {
      userId: String,
      name: String,
      email: String,
      role: String
    },
    approvedAt: Date,
    comments: String
  }],

  // Audit
  createdBy: {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true }
  },
  updatedBy: {
    userId: String,
    name: String,
    email: String,
    role: String
  },

  // Activation
  isActive: { type: Boolean, default: false, index: true },
  activatedAt: Date,

  // Rollback
  canRollback: { type: Boolean, default: false },
  rollbackFrom: Schema.Types.ObjectId,

  // Metrics (Phase 7: Enhanced tracking)
  metrics: {
    totalUses: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    avgLatency: Number,
    p95Latency: Number,
    p99Latency: Number,
    avgTokensUsed: Number,
    totalCost: { type: Number, default: 0 },
    lastUsedAt: Date,
    errorRate: Number,
    successRate: Number
  },

  tags: [String],

  // Soft Deletion
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: Date,
  deletedBy: {
    userId: String,
    name: String,
    email: String,
    role: String
  }
}, {
  timestamps: true,
  collection: 'prompt_versions'
});

// Compound indexes for optimal query performance
PromptVersionSchema.index({
  tenantId: 1,
  productId: 1,
  channelType: 1,
  environment: 1,
  isActive: 1
}, { name: 'active_prompt_lookup' });

PromptVersionSchema.index({
  promptId: 1,
  version: -1
}, { name: 'version_history' });

PromptVersionSchema.index({
  state: 1,
  environment: 1
}, { name: 'state_environment' });

PromptVersionSchema.index({
  'abTest.testId': 1,
  'abTest.enabled': 1
}, {
  name: 'ab_test_lookup',
  sparse: true
});

// TTL index for auto-cleanup of inactive drafts (90 days)
PromptVersionSchema.index({
  createdAt: 1
}, {
  name: 'draft_ttl',
  expireAfterSeconds: 7776000, // 90 days
  partialFilterExpression: {
    state: 'draft',
    isActive: false
  }
});

// Template lookup index (Phase 0.5)
PromptVersionSchema.index({
  isTemplate: 1,
  productId: 1,
  channelType: 1
}, {
  name: 'template_lookup',
  partialFilterExpression: {
    isTemplate: true
  }
});

export default mongoose.model<IPromptVersion>('PromptVersion', PromptVersionSchema);
