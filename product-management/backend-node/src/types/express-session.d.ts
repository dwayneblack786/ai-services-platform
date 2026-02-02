import { User as SharedUser } from '../../../../shared/types';

declare global {
  namespace Express {
    interface User extends SharedUser {}
  }
}

declare module 'express-session' {
  interface SessionData {
    // Keycloak tokens
    tenantId?: string;
    keycloakAccessToken?: string;
    keycloakIdToken?: string;
    keycloakRefreshToken?: string;
    
    // Passport user session (populated by req.login() and deserialized by passport)
    // Contains the full user object loaded from MongoDB
    passport?: {
      user?: {
        _id: any; // MongoDB ObjectId
        email: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        picture?: string;
        role?: string;
        tenantId?: string;
        emailVerified?: boolean;
        companyDetailsCompleted?: boolean;
        authProvider?: string;
        keycloakSub?: string;
        isActive?: boolean;
        createdAt?: Date;
        updatedAt?: Date;
      };
    };
    
    // Tenant lookup context (temporary)
    tenantContext?: {
      tenantId: string;
      keycloakRealm: string;
      timestamp: number;
    };
    
    // OAuth flow state (temporary)
    keycloakAuth?: {
      codeVerifier: string;
      state: string;
      realm?: string;
      tenantId?: string;
      returnTo?: string;
      silent?: boolean;
    };
  }
}

export {};
