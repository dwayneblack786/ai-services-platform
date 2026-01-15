import { ObjectId } from 'mongodb';

export interface BusinessHoursDay {
  open: string | null;
  close: string | null;
}

export interface RagSource {
  url: string;
  type: 'website' | 'api' | 'documentation';
  description?: string;
  refreshInterval?: number; // in hours
}

export interface RagConfiguration {
  enabled: boolean;
  sources: RagSource[];
  maxResults?: number;
  confidenceThreshold?: number;
}

export interface PromptContext {
  // Business Identity
  tenantName?: string;
  tenantIndustry?: string;
  businessContext?: string;
  
  // Role/Persona
  tone?: string;
  personality?: string;
  allowedActions?: string[];
  disallowedActions?: string[];
  
  // Static Business Knowledge
  servicesOffered?: string[];
  pricingInfo?: string;
  locations?: Array<{
    address: string;
    city: string;
    state: string;
  }>;
  businessHours?: string;
  policies?: string;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  productCatalog?: string;
  
  // Conversation Behavior
  maxResponseLength?: number;
  escalationTriggers?: string[];
  askForNameFirst?: boolean;
  confirmBeforeActions?: boolean;
  defaultLanguage?: string;
  conversationMemoryTurns?: number;
  
  // Custom Variables
  customVariables?: { [key: string]: string };
}

export interface CustomPrompts {
  systemPrompt?: string;
  greeting?: string;
  intentPrompts?: { [key: string]: string };
  fallbackMessage?: string;
  closingMessage?: string;
  
  // Safety & Compliance
  prohibitedTopics?: string[];
  complianceRules?: string[];
  privacyPolicy?: string;
  requireConsent?: boolean;
  escalationPolicy?: string;
  sensitiveDataHandling?: string;
  maxConversationTurns?: number;
  logConversations?: boolean;
}

export interface BusinessHours {
  timezone: string;
  monday?: BusinessHoursDay;
  tuesday?: BusinessHoursDay;
  wednesday?: BusinessHoursDay;
  thursday?: BusinessHoursDay;
  friday?: BusinessHoursDay;
  saturday?: BusinessHoursDay;
  sunday?: BusinessHoursDay;
}

export interface VoiceSettings {
  language: string;
  voiceId: string;
  speechRate?: number;
  pitch?: number;
}

export interface VoiceChannelConfig {
  enabled: boolean;
  phoneNumber: string;
  fallbackNumber?: string;
  businessHours?: BusinessHours;
  voiceSettings?: VoiceSettings;
  customPrompts?: CustomPrompts;
  promptTemplateId?: string;
  ragConfig?: RagConfiguration;
  promptContext?: PromptContext;
}

export interface ChatChannelConfig {
  enabled: boolean;
  greeting?: string;
  typingIndicator?: boolean;
  maxTurns?: number;
  customPrompts?: CustomPrompts;
  promptTemplateId?: string;
  showIntent?: boolean;
  allowFileUpload?: boolean;
  ragConfig?: RagConfiguration;
  promptContext?: PromptContext;
}

export interface SmsChannelConfig {
  enabled: boolean;
  phoneNumber?: string;
  autoReply?: boolean;
}

export interface WhatsAppChannelConfig {
  enabled: boolean;
  businessAccountId?: string;
  phoneNumberId?: string;
}

export interface AssistantChannel {
  _id?: ObjectId | string;
  customerId: string;            // @deprecated - Use tenantId instead. Kept for backward compatibility
  productId: string | ObjectId;  // Link to subscribed product
  tenantId: string;              // Tenant reference (replaces customerId)
  voice?: VoiceChannelConfig;
  chat?: ChatChannelConfig;
  sms?: SmsChannelConfig;
  whatsapp?: WhatsAppChannelConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

// Default configurations
export const defaultVoiceConfig: VoiceChannelConfig = {
  enabled: false,
  phoneNumber: '',
  voiceSettings: {
    language: 'en-US',
    voiceId: 'en-US-Neural2-A',
    speechRate: 1.0,
    pitch: 0.0
  },
  businessHours: {
    timezone: 'America/New_York',
    monday: { open: '09:00', close: '17:00' },
    tuesday: { open: '09:00', close: '17:00' },
    wednesday: { open: '09:00', close: '17:00' },
    thursday: { open: '09:00', close: '17:00' },
    friday: { open: '09:00', close: '17:00' },
    saturday: undefined,
    sunday: undefined
  }
};

export const defaultChatConfig: ChatChannelConfig = {
  enabled: true,
  greeting: 'Hi! How can I help you today? bags',
  typingIndicator: true,
  maxTurns: 20,
  showIntent: false,
  allowFileUpload: false
};

export const defaultSmsConfig: SmsChannelConfig = {
  enabled: false,
  autoReply: true
};

export const defaultWhatsAppConfig: WhatsAppChannelConfig = {
  enabled: false
};
