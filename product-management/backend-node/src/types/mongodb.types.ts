import { OptionalId } from 'mongodb';

/**
 * MongoDB document types with proper typing for insertOne operations
 */

export interface Tenant {
  name: string;
  domain: string;
  settings?: {
    maxUsers?: number;
    features?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  userId: string;
  tenantId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export type TenantDocument = OptionalId<Tenant>;
export type SessionDocument = OptionalId<Session>;
