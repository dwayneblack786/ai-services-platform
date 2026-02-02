import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { User, UserRole } from '../types/shared';
import { getApiUrl } from '../config/api';
import { AuthContextType } from '../types';
import { logger } from '../utils/logger';

interface Subscription {
  _id: string;
  productId: string;
  tenantId: string;
  status: string;
  product?: {
    _id: string;
    name: string;
    category: string;
    description: string;
  };
}

interface VirtualAssistantProduct {
  _id: string;
  name: string;
  category: string;
  description?: string;
  hasVoice: boolean;
  hasChat: boolean;
}

interface ExtendedAuthContextType extends AuthContextType {
  subscriptions: Subscription[];
  virtualAssistantProducts: VirtualAssistantProduct[];
  hasVirtualAssistant: boolean;
  isLoadingSubscriptions: boolean;
  refreshSubscriptions: () => Promise<void>;
  isTenantAdmin: () => boolean;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [virtualAssistantProducts, setVirtualAssistantProducts] = useState<VirtualAssistantProduct[]>([]);
  const [hasVirtualAssistant, setHasVirtualAssistant] = useState(false);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);

  useEffect(() => {
    // Skip auth check on public pages (login, signup, etc.)
    const publicPaths = ['/login', '/signup', '/verify-email'];
    const isPublicPage = publicPaths.some(path => window.location.pathname.startsWith(path));

    if (!isPublicPage) {
      checkAuthStatus();
    } else {
      // On public pages, immediately set loading to false without checking auth
      setLoading(false);
    }
  }, []);

  // Load subscriptions when user is authenticated
  useEffect(() => {
    if (user && user.tenantId) {
      refreshSubscriptions();
    } else {
      setSubscriptions([]);
      setVirtualAssistantProducts([]);
      setHasVirtualAssistant(false);
    }
  }, [user]);

  const checkAuthStatus = async () => {
    const startTime = Date.now();
    
    try {
      console.log('\n' + '='.repeat(80));
      console.log('🔍 FRONTEND AUTH CHECK STARTING');
      console.log('='.repeat(80));
      console.log('⏰ Start Time:', new Date().toISOString());
      console.log('📍 Current Path:', window.location.pathname);
      console.log('🍪 Cookies Available to Browser:', document.cookie || 'NONE');
      console.log(`   - Has ai_platform.sid: ${document.cookie.includes('ai_platform.sid')}`);
      console.log('🔗 Making request to /api/user/me');
      logger.debug('Checking auth status via user profile...');
      
      // Try to fetch user profile - if session exists with Keycloak tokens, this will work
      const response = await apiClient.get(getApiUrl('api/user/me'));
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ AUTH CHECK SUCCESS (took ${elapsed}ms)`);
      console.log('   - User:', response.data?.user?.email || 'unknown');
      console.log('   - Tenant:', response.data?.user?.tenantId || 'unknown');
      console.log('='.repeat(80) + '\n');
      
      logger.debug('Auth status response:', response.data);
      if (response.data && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.log(`❌ AUTH CHECK FAILED (took ${elapsed}ms)`);
      console.log('   - Status:', error.response?.status || 'Network Error');
      console.log('   - Error:', error.message);
      console.log('🍪 Cookies at time of failure:', document.cookie || 'NONE');
      console.log('   - ⚠️  If no cookies present, this confirms race condition');
      console.log('   - ⚠️  Auth check ran before Set-Cookie from Keycloak redirect was processed');
      console.log('='.repeat(80) + '\n');
      
      logger.debug('Not authenticated', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (tenantId: string) => {
    // Redirect to tenant-aware Keycloak login
    // Capture full URL including query parameters for return after auth
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const returnTo = currentPath === '/login' ? '/dashboard' : (currentPath + currentSearch);
    window.location.href = getApiUrl(`api/auth/tenant/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const logout = async () => {
    try {
      // Clear session on backend
      await apiClient.post(getApiUrl('api/auth/logout'));
      setUser(null);
      window.location.href = '/login';
    } catch (error: any) {
      logger.error('Logout failed', error);
      // Force redirect to login anyway
      setUser(null);
      window.location.href = '/login';
    }
  };

  const emailLogin = async (email: string, password: string, tenantId: string) => {
    // Redirect to tenant login (Keycloak)
    window.location.href = getApiUrl(`api/auth/tenant/login?returnTo=/dashboard`);
    return { success: false, error: 'Redirecting to login...' };
  };

  const signup = async (email: string, password: string, name: string) => {
    // Signup is now handled through Keycloak - redirect to registration
    window.location.href = getApiUrl(`api/auth/tenant/login?prompt=register&returnTo=/dashboard`);
    return { success: false, error: 'Redirecting to registration...' };
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (...roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const isAdmin = (): boolean => {
    if (!user || !user.role) return false;
    return user.role === UserRole.ADMIN || 
           user.role === UserRole.PROJECT_ADMIN ||
           user.role === 'ADMIN' ||
           user.role === 'PROJECT_ADMIN';
  };

  const isProjectAdmin = (): boolean => {
    if (!user || !user.role) return false;
    return user.role === UserRole.PROJECT_ADMIN || user.role === 'PROJECT_ADMIN';
  };

  const isTenantAdmin = (): boolean => {
    if (!user || !user.role) return false;
    // Check both enum value and string value for robustness
    return user.role === UserRole.ADMIN || 
           user.role === UserRole.PROJECT_ADMIN ||
           user.role === 'ADMIN' ||
           user.role === 'PROJECT_ADMIN';
  };

  const refreshSubscriptions = async () => {
    if (!user || !user.tenantId) return;
    
    setIsLoadingSubscriptions(true);
    try {
      // Fetch subscription data from active endpoints
      const [activeResponse, vaResponse] = await Promise.all([
        apiClient.get(getApiUrl('api/subscriptions/active')).catch(() => ({ data: { subscriptions: [], hasVirtualAssistant: false } })),
        apiClient.get(getApiUrl('api/subscriptions/virtual-assistant')).catch(() => ({ data: { products: [] } }))
      ]);

      if (activeResponse.data) {
        setSubscriptions(activeResponse.data.subscriptions || []);
        setHasVirtualAssistant(activeResponse.data.hasVirtualAssistant || false);
      }

      if (vaResponse.data) {
        setVirtualAssistantProducts(vaResponse.data.products || []);
      }
    } catch (error: any) {
      logger.error('Failed to fetch subscriptions', error);
      setSubscriptions([]);
      setVirtualAssistantProducts([]);
      setHasVirtualAssistant(false);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      emailLogin, 
      signup, 
      logout,
      refreshAuth: checkAuthStatus,
      hasRole, 
      hasAnyRole, 
      isAdmin,
      isProjectAdmin,
      subscriptions,
      virtualAssistantProducts,
      hasVirtualAssistant,
      isLoadingSubscriptions,
      refreshSubscriptions,
      isTenantAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { Subscription, VirtualAssistantProduct, ExtendedAuthContextType };