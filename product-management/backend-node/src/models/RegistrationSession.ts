import mongoose, { Schema, Document } from 'mongoose';

export interface IRegistrationSession extends Document {
  sessionId: string;
  userId?: mongoose.Types.ObjectId;
  email: string;
  phoneNumber?: string;
  phoneVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  currentStep: 'initiated' | 'phone-verified' | 'account-setup' | 'company-setup' | 'review' | 'submitted' | 'provisioning' | 'complete';
  tempTenantId?: string;
  resumeToken?: string;
  resumeTokenExpires?: Date;
  lastAccessedAt: Date;
  metadata?: Record<string, any>;
  errorDetails?: string;
  expiresAt: Date;
}

const RegistrationSessionSchema = new Schema<IRegistrationSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    email: { type: String, required: true, lowercase: true },
    phoneNumber: { type: String },
    phoneVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
    currentStep: {
      type: String,
      enum: ['initiated', 'phone-verified', 'account-setup', 'company-setup', 'review', 'submitted', 'provisioning', 'complete'],
      required: true,
      default: 'initiated'
    },
    tempTenantId: { type: String },
    resumeToken: { type: String, unique: true, sparse: true, index: true },
    resumeTokenExpires: { type: Date },
    lastAccessedAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
    errorDetails: { type: String },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 48 * 60 * 60 * 1000) } // 48 hours
  },
  { timestamps: true }
);

// Index for automatic cleanup of expired sessions
RegistrationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RegistrationSessionModel = mongoose.model<IRegistrationSession>('RegistrationSession', RegistrationSessionSchema);
export default RegistrationSessionModel;