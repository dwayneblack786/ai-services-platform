import mongoose, { Schema, Document } from 'mongoose';

export interface IAssistantChannel extends Document {
  _id: mongoose.Types.ObjectId;
  customerId: string;
  productId: mongoose.Types.ObjectId | string;
  tenantId: string;
  voice?: any;
  chat?: any;
  sms?: any;
  whatsapp?: any;
  createdAt: Date;
  updatedAt: Date;
}

const AssistantChannelSchema = new Schema<IAssistantChannel>({
  customerId: { type: String, required: true, index: true },
  productId: { type: Schema.Types.Mixed, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  voice: { type: Schema.Types.Mixed },
  chat: { type: Schema.Types.Mixed },
  sms: { type: Schema.Types.Mixed },
  whatsapp: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'assistant_channels',
  timestamps: true
});

// Add compound indexes
AssistantChannelSchema.index({ tenantId: 1, productId: 1 });
AssistantChannelSchema.index({ 'voice.phoneNumber': 1, 'voice.enabled': 1 });

export const AssistantChannelModel = mongoose.model<IAssistantChannel>('AssistantChannel', AssistantChannelSchema);
