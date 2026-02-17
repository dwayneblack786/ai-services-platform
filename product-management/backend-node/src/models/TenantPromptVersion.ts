import mongoose from 'mongoose';
import { IPromptVersion, PromptVersionSchema } from './PromptVersion';

/**
 * TenantPromptVersion — tenant-scoped prompts.
 * Mirrors PromptVersion schema but targets 'tenant_prompt_versions' collection.
 * Invariants enforced at service layer:
 *   - isTemplate always false
 *   - tenantId always set
 *   - Lifecycle: draft → testing → production
 *   - Editable only while state='draft'
 */
export type ITenantPromptVersion = IPromptVersion;

export default mongoose.model<ITenantPromptVersion>(
  'TenantPromptVersion',
  PromptVersionSchema,
  'tenant_prompt_versions'
);
