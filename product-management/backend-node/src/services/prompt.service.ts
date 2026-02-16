import { getDB } from '../config/database';
import { ObjectId } from 'mongodb';

/**
 * Prompt Service
 * Handles session prompt configuration and selection validation
 * Dynamically loads tenant-specific prompts from prompt_versions collection
 */

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
}

// Singleton instance
export const promptService = new PromptService();
