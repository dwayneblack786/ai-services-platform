export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_ADMIN = 'PROJECT_ADMIN',
  ANALYST = 'ANALYST',
  DEVELOPER = 'DEVELOPER',
  CLIENT = 'CLIENT'
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: UserRole;
  tenantId: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpires?: Date;
  companyDetailsCompleted: boolean;
  passwordHash?: string; // Only stored in backend, never sent to client
  authProvider?: 'local' | 'keycloak'; // Track authentication method
  // OIDC Identity Mapping
  idpSub?: string; // IdP subject identifier (stable external ID)
  idpIssuer?: string; // IdP issuer URL
  keycloakSub?: string; // Keycloak subject (for backward compat)
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  // Password reset fields
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
  lastPasswordReset?: Date;
  // Registration tracking
  registrationCompleted?: boolean;
  signupMethod?: 'email-password' | 'google' | 'microsoft' | 'github';
}

export interface AuthResponse {
  authenticated: boolean;
  user?: User;
}
