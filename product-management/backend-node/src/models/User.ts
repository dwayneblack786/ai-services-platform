import mongoose, { Schema, Document } from 'mongoose';
import { User as SharedUser, UserRole } from '../../../../shared/types';

export interface IUser extends Omit<SharedUser, 'id'>, Document {
  updateLastLogin(): Promise<void>;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    picture: { type: String },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.ANALYST },
    tenantId: { type: String, required: true, index: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationTokenExpires: { type: Date },
    companyDetailsCompleted: { type: Boolean, default: false },
    passwordHash: { type: String },
    authProvider: { type: String, enum: ['local', 'keycloak'] },
    keycloakSub: { type: String, unique: true, sparse: true, index: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 },
    // Password reset fields
    passwordResetToken: { type: String },
    passwordResetTokenExpires: { type: Date },
    lastPasswordReset: { type: Date },
    // Registration tracking fields
    registrationCompleted: { type: Boolean, default: false },
    signupMethod: { type: String, enum: ['email-password', 'google', 'microsoft', 'github'] }
  },
  { timestamps: true }
);

UserSchema.methods.updateLastLogin = async function() {
  this.updatedAt = new Date();
  await this.save();
};

const UserModel = mongoose.model<IUser>('User', UserSchema);
export default UserModel;
