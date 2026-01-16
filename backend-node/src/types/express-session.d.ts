import { User as SharedUser } from '../../../shared/types';

declare global {
  namespace Express {
    interface User extends SharedUser {}
  }
}

declare module 'express-session' {
  interface SessionData {
    pendingTenantId?: string;
  }
}

export {};
