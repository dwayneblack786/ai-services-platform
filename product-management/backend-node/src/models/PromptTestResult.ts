import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPromptTestResult extends Document {
  promptVersionId: Types.ObjectId;
  changeRequestId?: Types.ObjectId;

  // Test Execution
  executedAt: Date;
  executionDuration: number;
  testSuite: 'quality' | 'safety' | 'performance' | 'improvement';

  // Quality Tests
  qualityTests?: {
    clarityScore: number;
    completenessScore: number;
    ambiguityDetected: boolean;
    ambiguousTerms: string[];
    toneConsistency: {
      detected: string;
      consistencyScore: number;
      inconsistencies: string[];
    };
    variablePlaceholders: {
      valid: string[];
      invalid: string[];
      missing: string[];
    };
  };

  // Safety & Compliance Tests
  safetyTests?: {
    toxicContentDetected: boolean;
    toxicityScore: number;
    toxicExamples: string[];
    biasDetected: boolean;
    biasTypes: string[];
    biasExamples: Array<{
      type: string;
      text: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    piiLeakageRisk: boolean;
    piiExamples: string[];
    complianceViolations: Array<{
      rule: string;
      severity: string;
      description: string;
    }>;
    prohibitedTopics: string[];
  };

  // Performance Tests
  performanceTests?: {
    tokenCount: {
      system: number;
      user: number;
      total: number;
      recommendation: 'optimal' | 'high' | 'too_high';
    };
    estimatedLatency: number;
    estimatedCost: {
      perRequest: number;
      per1000Requests: number;
      currency: string;
    };
    modelCompatibility: Array<{
      model: string;
      compatible: boolean;
      issues: string[];
    }>;
  };

  // AI Improvement Suggestions
  improvementSuggestions?: Array<{
    category: 'clarity' | 'conciseness' | 'tone' | 'structure';
    priority: 'high' | 'medium' | 'low';
    current: string;
    suggested: string;
    reason: string;
    example?: string;
    acceptedByUser: boolean;
    appliedAt?: Date;
  }>;

  // Overall Assessment
  overallScore: number;
  passed: boolean;
  criticalIssues: number;
  warnings: number;
  recommendations: number;

  // Blocking
  blocksPromotion: boolean;
  blockingReasons: string[];
}

const PromptTestResultSchema = new Schema<IPromptTestResult>({
  promptVersionId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },

  changeRequestId: {
    type: Schema.Types.ObjectId
    // index covered by change_request_tests sparse index below
  },

  // Test Execution
  executedAt: {
    type: Date,
    default: Date.now,
    required: true
    // index covered by test_history and test_results_ttl indexes below
  },
  executionDuration: Number,
  testSuite: {
    type: String,
    enum: ['quality', 'safety', 'performance', 'improvement'],
    required: true
  },

  // Quality Tests
  qualityTests: {
    clarityScore: Number,
    completenessScore: Number,
    ambiguityDetected: Boolean,
    ambiguousTerms: [String],
    toneConsistency: {
      detected: String,
      consistencyScore: Number,
      inconsistencies: [String]
    },
    variablePlaceholders: {
      valid: [String],
      invalid: [String],
      missing: [String]
    }
  },

  // Safety & Compliance Tests
  safetyTests: {
    toxicContentDetected: Boolean,
    toxicityScore: Number,
    toxicExamples: [String],
    biasDetected: Boolean,
    biasTypes: [String],
    biasExamples: [{
      _id: false,
      type: { type: String },
      text: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }],
    piiLeakageRisk: Boolean,
    piiExamples: [String],
    complianceViolations: [{
      rule: String,
      severity: String,
      description: String
    }],
    prohibitedTopics: [String]
  },

  // Performance Tests
  performanceTests: {
    tokenCount: {
      system: Number,
      user: Number,
      total: Number,
      recommendation: {
        type: String,
        enum: ['optimal', 'high', 'too_high']
      }
    },
    estimatedLatency: Number,
    estimatedCost: {
      perRequest: Number,
      per1000Requests: Number,
      currency: String
    },
    modelCompatibility: [{
      model: String,
      compatible: Boolean,
      issues: [String]
    }]
  },

  // AI Improvement Suggestions
  improvementSuggestions: [{
    category: {
      type: String,
      enum: ['clarity', 'conciseness', 'tone', 'structure']
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    current: String,
    suggested: String,
    reason: String,
    example: String,
    acceptedByUser: { type: Boolean, default: false },
    appliedAt: Date
  }],

  // Overall Assessment
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  passed: {
    type: Boolean,
    required: true,
    index: true
  },
  criticalIssues: { type: Number, default: 0 },
  warnings: { type: Number, default: 0 },
  recommendations: { type: Number, default: 0 },

  // Blocking
  blocksPromotion: {
    type: Boolean,
    default: false,
    index: true
  },
  blockingReasons: [String]
}, {
  timestamps: false,
  collection: 'prompt_test_results'
});

// Indexes for efficient querying
PromptTestResultSchema.index({
  promptVersionId: 1,
  executedAt: -1
}, { name: 'test_history' });

PromptTestResultSchema.index({
  changeRequestId: 1
}, {
  name: 'change_request_tests',
  sparse: true
});

PromptTestResultSchema.index({
  passed: 1,
  blocksPromotion: 1
}, { name: 'test_status' });

PromptTestResultSchema.index({
  executedAt: -1
}, { name: 'recent_tests' });

// TTL index - keep test results for 1 year
PromptTestResultSchema.index({
  executedAt: 1
}, {
  name: 'test_results_ttl',
  expireAfterSeconds: 31536000 // 1 year
});

export default mongoose.model<IPromptTestResult>('PromptTestResult', PromptTestResultSchema);
