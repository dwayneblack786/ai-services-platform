// Prompt Templates TypeScript Types

export interface IntentPrompts {
  [intentName: string]: string;
}

export interface VoicePromptConfig {
  systemPrompt: string;
  greeting: string;
  intentPrompts: IntentPrompts;
  fallbackMessage: string;
  closingMessage: string;
}

export interface ChatPromptConfig {
  systemPrompt: string;
  greeting: string;
  intentPrompts: IntentPrompts;
  fallbackMessage: string;
  closingMessage: string;
}

export interface PromptTemplate {
  _id?: string;
  industry: string;
  name: string;
  description: string;
  voice: VoicePromptConfig;
  chat: ChatPromptConfig;
  isDefault: boolean;
  productId?: string;        // Optional: Link to specific product
  tenantId?: string;         // Optional: Tenant-specific custom prompts
  customerId?: string;       // @deprecated - Use tenantId instead. Legacy field for backward compatibility
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomPromptConfig {
  useCustom: boolean;
  templateId?: string;
  voice?: Partial<VoicePromptConfig>;
  chat?: Partial<ChatPromptConfig>;
}
