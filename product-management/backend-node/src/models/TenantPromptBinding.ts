import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITenantPromptBinding extends Document {
  tenantId: string;
  productId: Types.ObjectId;
  channelType: 'voice' | 'chat';

  // Currently active draft PromptVersion for this tenant+product+channel
  currentDraftId?: Types.ObjectId;

  // Currently active production PromptVersion (stays until new version is promoted)
  activeProductionId?: Types.ObjectId;

  // Template IDs already pulled into this tenant's prompts.
  // "Pull Prompts" skips any templateId already in this array.
  pulledTemplateIds: Types.ObjectId[];

  // Scoring threshold for auto-promotion (Phase 2).
  // If lastScore < scoreThreshold, prompt stays in draft.
  scoreThreshold: number;

  // Cached last score from Phase 2 testing (null until first test run)
  lastScore?: number;
}

const TenantPromptBindingSchema = new Schema<ITenantPromptBinding>({
  tenantId: {
    type: String,
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  channelType: {
    type: String,
    required: true,
    enum: ['voice', 'chat']
  },

  currentDraftId: Schema.Types.ObjectId,
  activeProductionId: Schema.Types.ObjectId,

  pulledTemplateIds: [{
    type: Schema.Types.ObjectId
  }],

  scoreThreshold: {
    type: Number,
    default: 90
  },

  lastScore: Number
}, {
  timestamps: true,
  collection: 'tenant_prompt_bindings'
});

// Each tenant has exactly one binding per product+channel
TenantPromptBindingSchema.index({
  tenantId: 1,
  productId: 1,
  channelType: 1
}, {
  name: 'tenant_product_channel_unique',
  unique: true
});

// List all bindings for a tenant+product (returns voice + chat)
TenantPromptBindingSchema.index({
  tenantId: 1,
  productId: 1
}, { name: 'tenant_product_lookup' });

export default mongoose.model<ITenantPromptBinding>('TenantPromptBinding', TenantPromptBindingSchema);
