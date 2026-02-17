import mongoose from 'mongoose';
import { IPromptVersion, PromptVersionSchema } from './PromptVersion';

/**
 * ProductPromptTemplate — platform-owned system prompts.
 * Mirrors PromptVersion schema but targets 'product_prompt_templates' collection.
 * Invariants enforced at service layer:
 *   - isTemplate always true
 *   - tenantId always null/undefined
 *   - Immutable once state='production' (create new version instead)
 */
export type IProductPromptTemplate = IPromptVersion;

export default mongoose.model<IProductPromptTemplate>(
  'ProductPromptTemplate',
  PromptVersionSchema,
  'product_prompt_templates'
);
