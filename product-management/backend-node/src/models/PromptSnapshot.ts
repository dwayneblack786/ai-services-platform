/**
 * Prompt Snapshot Model (Phase 7)
 *
 * Captures exact prompt content used in each AI session for debugging and auditing.
 * Snapshots expire after 90 days via TTL index.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { IPromptContent } from './PromptVersion';

export interface IPromptSnapshot extends Document {
  sessionId: string;
  promptVersionId: mongoose.Types.ObjectId;
  promptContent: IPromptContent;
  tenantId?: string;
  productId?: mongoose.Types.ObjectId;
  channelType: string;
  capturedAt: Date;
  expiresAt: Date;
}

const PromptSnapshotSchema = new Schema<IPromptSnapshot>({
  sessionId: { type: String, required: true, index: true },
  promptVersionId: { type: Schema.Types.ObjectId, required: true, ref: 'PromptVersion', index: true },
  promptContent: { type: Schema.Types.Mixed, required: true },
  tenantId: { type: String, index: true },
  productId: { type: Schema.Types.ObjectId, index: true },
  channelType: { type: String, required: true, enum: ['voice', 'chat', 'sms', 'whatsapp', 'email'] },
  capturedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }  // TTL index
}, {
  timestamps: true
});

// Create TTL index to auto-delete snapshots after 90 days
PromptSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient session lookup
PromptSnapshotSchema.index({ sessionId: 1, capturedAt: -1 });

const PromptSnapshot = mongoose.model<IPromptSnapshot>('PromptSnapshot', PromptSnapshotSchema);

export default PromptSnapshot;
