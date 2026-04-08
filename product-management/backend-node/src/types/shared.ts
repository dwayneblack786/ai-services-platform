export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_ADMIN = 'PROJECT_ADMIN',
  ANALYST = 'ANALYST',
  DEVELOPER = 'DEVELOPER',
  CLIENT = 'CLIENT'
}

export interface User {
  id?: string;
  _id?: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  tenantId: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpires?: Date;
  companyDetailsCompleted: boolean;
  passwordHash?: string;
  authProvider?: 'local' | 'keycloak';
  idpSub?: string;
  idpIssuer?: string;
  keycloakSub?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  lastLogin?: Date;
  loginCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
  lastPasswordReset?: Date;
  registrationCompleted?: boolean;
  signupMethod?: 'email-password' | 'google' | 'microsoft' | 'github';
}

export interface AuthResponse {
  authenticated: boolean;
  user?: User;
}