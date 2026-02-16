import { getDB } from '../config/database';
import { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import PromptVersionModel from '../models/PromptVersion';
import PromptAuditLogModel from '../models/PromptAuditLog';

/**
 * Prompt Service
 * Handles session prompt configuration and selection validation
 * Dynamically loads tenant-specific prompts from prompt_versions collection
 */

export interface IActor {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export interface MenuOption {
  id: string;
  text: string;
  value: string;
  icon?: string;
  dtmfKey?: string; // For voice: "1", "2", "3"
  requiresInput?: boolean;
}

export interface MenuConfig {
  enabled: boolean;
  promptText: string;
  options: MenuOption[];
  allowFreeText?: boolean; // If false, only options allowed
}

export class PromptService {
  /**
   * Get session prompts for a tenant/product/channel
   * Dynamically loads available prompts from prompt_versions collection
   */
  async getSessionPrompts(
    tenantId: string,
    productId: string,
    channelType: 'voice' | 'chat'
  ): Promise<MenuConfig | null> {
    try {
      const db = getDB();

      console.log('[PromptService] Loading dynamic menu for:', { tenantId, productId, channelType });

      // Convert productId to ObjectId if it's a valid ObjectId string
      let productQuery: any = productId;
      if (ObjectId.isValid(productId) && productId.length === 24) {
        productQuery = new ObjectId(productId);
        console.log('[PromptService] Using ObjectId for productId:', productQuery);
      } else {
        console.log('[PromptService] Using string for productId:', productQuery);
      }

      // Query all production prompts directly for this tenant+product+channel
      // NOTE: We don't use tenant_prompt_bindings here because the unique constraint
      // (tenant+product+channel) prevents multiple bindings per channel.
      // Instead, we fetch all production prompts and let the user choose.
      const prompts = await db.collection('prompt_versions').find({
        tenantId,
        productId: productQuery,
        channelType,
        state: 'production',
        isActive: true,
        isDeleted: { $ne: true }
      }).toArray();

      if (!prompts || prompts.length === 0) {
        console.log('[PromptService] No active production prompts found');
        return null;
      }

      console.log(`[PromptService] Found ${prompts.length} production prompts`);

      // Build menu options from prompts
      const options: MenuOption[] = prompts.map((prompt, index) => ({
        id: prompt._id.toString(),
        text: prompt.name,
        value: prompt.name,
        icon: prompt.icon || '💬',
        dtmfKey: (index + 1).toString() // Assign DTMF keys: 1, 2, 3...
      }));

      // Return dynamic menu configuration
      return {
        enabled: true,
        promptText: 'Select a service:',
        options,
        allowFreeText: false // Only allow prompt selection initially
      };
    } catch (error: any) {
      console.error('[PromptService] Error fetching menu config:', error);
      return null;
    }
  }

  /**
   * Validate that a selected prompt is valid and retrieve the prompt ID
   */
  async validatePromptSelection(
    optionId: string,
    tenantId: string,
    productId: string,
    channelType: 'voice' | 'chat'
  ): Promise<{ valid: boolean; promptId?: string; promptName?: string; value?: string }> {
    try {
      const menuConfig = await this.getSessionPrompts(tenantId, productId, channelType);

      if (!menuConfig) {
        // No menu configured - allow any input
        return { valid: true };
      }

      // Find the option by ID (which is the promptId)
      const option = menuConfig.options.find(
        (opt) => opt.id === optionId || opt.value === optionId
      );

      if (!option) {
        // If allowFreeText is true, accept the selection
        if (menuConfig.allowFreeText) {
          return { valid: true, value: optionId };
        }
        return { valid: false };
      }

      // Return the prompt information
      return {
        valid: true,
        promptId: option.id, // The ObjectId of the selected prompt
        promptName: option.value, // The name of the prompt
        value: option.value
      };
    } catch (error: any) {
      console.error('[PromptService] Error validating selection:', error);
      return { valid: true }; // Fail open - allow selection on error
    }
  }

  /**
   * Map DTMF key to prompt option
   */
  async mapDTMFToPrompt(
    dtmfKey: string,
    tenantId: string,
    productId: string
  ): Promise<MenuOption | null> {
    try {
      const menuConfig = await this.getSessionPrompts(tenantId, productId, 'voice');

      if (!menuConfig) {
        return null;
      }

      // Find option by DTMF key
      const option = menuConfig.options.find((opt) => opt.dtmfKey === dtmfKey);

      return option || null;
    } catch (error: any) {
      console.error('[PromptService] Error mapping DTMF:', error);
      return null;
    }
  }

  /**
   * Create a new prompt from a template
   * Used during product signup to provision tenant-specific prompts
   */
  async createFromTemplate(
    templateId: string | ObjectId,
    tenantId: string,
    productId: string | ObjectId,
    actor: IActor
  ): Promise<any> {
    try {
      // Fetch the template prompt
      const template = await PromptVersionModel.findById(templateId);

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      if (!template.isTemplate) {
        throw new Error(`Prompt ${templateId} is not a template`);
      }

      // Clone the template as a new tenant-specific draft prompt
      const newPrompt = new PromptVersionModel({
        // Identity
        promptId: new Types.ObjectId(),
        version: 1,
        tenantId,
        productId: ObjectId.isValid(productId as string) ? new ObjectId(productId as string) : productId,
        channelType: template.channelType,

        // Metadata
        name: template.name,
        description: template.description,
        icon: template.icon,

        // Template tracking
        isTemplate: false,
        baseTemplateId: template._id,
        templateDescription: template.templateDescription,

        // State
        state: 'draft',
        environment: 'development',
        isActive: true,
        isDeleted: false,
        canRollback: false,

        // Copy all 6 content layers (nested in content object)
        content: {
          systemPrompt: template.content.systemPrompt,
          persona: template.content.persona,
          businessContext: template.content.businessContext,
          ragConfig: template.content.ragConfig,
          conversationBehavior: template.content.conversationBehavior,
          constraints: template.content.constraints,
          customVariables: template.content.customVariables
        },

        // Audit
        createdBy: {
          userId: actor.userId,
          name: actor.name,
          email: actor.email,
          role: actor.role
        },

        // Initialize metrics
        metrics: {
          totalUses: 0,
          successCount: 0,
          errorCount: 0,
          avgLatency: 0,
          p95Latency: 0,
          p99Latency: 0,
          avgTokensUsed: 0,
          totalCost: 0,
          lastUsedAt: new Date(),
          errorRate: 0,
          successRate: 0
        }
      });

      const savedPrompt = await newPrompt.save();

      // Log audit trail
      await PromptAuditLogModel.create({
        promptId: savedPrompt._id,
        promptVersion: savedPrompt.version,
        action: 'created_from_template',
        actor: {
          userId: actor.userId,
          name: actor.name,
          email: actor.email,
          role: actor.role
        },
        changes: [{
          field: 'template',
          oldValue: null,
          newValue: {
            templateId: template._id.toString(),
            templateName: template.name,
            tenantId,
            productId: productId.toString()
          }
        }],
        context: {
          tenantId,
          productId: productId.toString(),
          environment: 'development'
        }
      });

      console.log(`[PromptService] Created prompt from template: ${template.name} → ${savedPrompt._id}`);

      return savedPrompt;
    } catch (error: any) {
      console.error('[PromptService] Error creating from template:', error);
      throw error;
    }
  }

  /**
   * Get all templates for a product
   * Returns templates grouped by channel type
   */
  async getTemplatesByProduct(
    productId: string | ObjectId
  ): Promise<{ voice: any[]; chat: any[]; sms: any[]; whatsapp: any[]; email: any[] }> {
    try {
      const productObjectId = ObjectId.isValid(productId as string)
        ? new ObjectId(productId as string)
        : productId;

      const templates = await PromptVersionModel.find({
        isTemplate: true,
        productId: productObjectId,
        isActive: true,
        isDeleted: { $ne: true },
        state: 'production'
      }).sort({ channelType: 1, name: 1 });

      // Group by channel type
      const grouped = {
        voice: templates.filter(t => t.channelType === 'voice'),
        chat: templates.filter(t => t.channelType === 'chat'),
        sms: templates.filter(t => t.channelType === 'sms'),
        whatsapp: templates.filter(t => t.channelType === 'whatsapp'),
        email: templates.filter(t => t.channelType === 'email')
      };

      console.log(`[PromptService] Found templates for product ${productId}:`, {
        voice: grouped.voice.length,
        chat: grouped.chat.length,
        sms: grouped.sms.length,
        whatsapp: grouped.whatsapp.length,
        email: grouped.email.length
      });

      return grouped;
    } catch (error: any) {
      console.error('[PromptService] Error fetching templates:', error);
      throw error;
    }
  }
}

// Singleton instance
export const promptService = new PromptService();
