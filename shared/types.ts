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
  authProvider?: 'google' | 'local'; // Track authentication method
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: User;
}
