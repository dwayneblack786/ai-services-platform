import { UserRole } from '../../../../shared/types';

/**
 * JWT token payload structure
 * Used for typing jwt.verify() results
 */
export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  iat?: number;
  exp?: number;
}
