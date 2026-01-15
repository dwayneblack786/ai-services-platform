// Common interfaces used across the application

// Product related types
export interface PricingTier {
  name: 'small' | 'medium' | 'large';
  displayName: string;
  description: string;
  price: number;
  features: string[];
}

export interface Product {
  _id?: string;
  name: string;
  category: 'Virtual Assistant' | 'IDP' | 'Computer Vision';
  subCategory?: string;
  description: string;
  features: string[];
  pricing: {
    model: 'subscription' | 'per-use' | 'enterprise';
    currency: string;
    tiers?: PricingTier[];
    perUseRate?: number;
    perUseUnit?: string;
    minimumCharge?: number;
    enterprisePrice?: number;
    enterpriseDescription?: string;
  };
  industries?: string[];
  status: 'active' | 'beta' | 'coming-soon';
  tags: string[];
}

// Subscription related types
export interface Subscription {
  _id: string;
  tenantId: string;
  productId: string;
  userId: string;
  pricingTier?: 'small' | 'medium' | 'large';
  status: 'active' | 'suspended' | 'cancelled' | 'trial';
  billingCycle: 'monthly' | 'yearly' | 'one-time' | 'usage-based';
  amount: number;
  currency: string;
  startDate: Date;
  renewalDate?: Date;
  cancelledDate?: Date;
  trialEndsAt?: Date;
  autoRenew: boolean;
  paymentMethod?: string;
  lastBillingDate?: Date;
  nextBillingDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
}

export interface UserProduct {
  _id: string;
  userId: string;
  productId: string;
  subscribedAt: Date;
  status: string;
}

// Payment related types
export interface PaymentMethod {
  _id: string;
  tenantId?: string;
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  billingName: string;
  billingEmail?: string;
  billingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  status: 'active' | 'inactive' | 'expired' | 'removed';
  isDefault: boolean;
  lastTransactionDate?: Date;
  lastTransactionAmount?: number;
  lastTransactionStatus?: 'success' | 'failed' | 'pending';
  transactionCount?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Transaction {
  _id: string;
  transactionId: string;
  tenantId?: string;
  userId?: string;
  paymentMethodId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  type: 'subscription' | 'one-time' | 'refund' | 'charge';
  productId?: string;
  productName?: string;
  description?: string;
  cardBrand: string;
  cardLast4: string;
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  failureReason?: string;
  failureCode?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt?: Date;
}

// Configuration related types
export interface ProductConfiguration {
  _id?: string;
  tenantId: string;
  productId: string;
  userId: string;
  configuration: {
    [key: string]: any;
  };
  status: 'draft' | 'active' | 'archived';
  createdAt?: Date;
  updatedAt?: Date;
}

// Tenant related types
export interface Tenant {
  tenantId: string;
  users: any[];
}

// Component Props types
export interface AuthContextType {
  user: any;
  loading: boolean;
  login: (tenantId: string) => void;
  devLogin: () => Promise<{ success: boolean; error?: string }>;
  emailLogin: (email: string, password: string, tenantId: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (role: any) => boolean;
  hasAnyRole: (...roles: any[]) => boolean;
  isAdmin: () => boolean;
  isProjectAdmin: () => boolean;
}

export interface LayoutProps {
  children: React.ReactNode;
}

export interface SidebarProps {
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: any[];
  redirectTo?: string;
}

export interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export interface PaymentMethodSelectorProps {
  onPaymentMethodSelected: (paymentMethodId: string) => void;
  onVerified?: () => void;
  selectedPaymentMethodId?: string;
}

export interface TierSelectionStepProps {
  product: Product | null;
  selectedTier: 'small' | 'medium' | 'large' | null;
  onTierSelect: (tier: 'small' | 'medium' | 'large') => void;
  onCancel: () => void;
  onContinue: () => void;
  styles: any;
}

export interface TermsAgreementStepProps {
  productName: string;
  acceptedTerms: boolean;
  onTermsChange: (accepted: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  styles: any;
}

export interface PaymentSelectionStepProps {
  selectedPaymentMethod: string | null;
  subscribing: boolean;
  onPaymentMethodSelected: (paymentMethodId: string) => void;
  onBack: () => void;
  onContinue: () => void;
  styles: any;
}

export interface ConfirmationStepProps {
  product: Product | null;
  selectedTier: 'small' | 'medium' | 'large' | null;
  subscribing: boolean;
  onBack: () => void;
  onComplete: () => Promise<void>;
  styles: any;
}