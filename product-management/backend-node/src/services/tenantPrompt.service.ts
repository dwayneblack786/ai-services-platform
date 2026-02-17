import { Types } from 'mongoose';
import TenantPromptBinding, { ITenantPromptBinding } from '../models/TenantPromptBinding';
import { PromptService, IActor } from './prompt.service';

const promptService = new PromptService();

export class TenantPromptService {
  /**
   * Get or create the binding for a tenant+product+channel.
   * Returns the existing binding if one exists, otherwise creates a new empty one.
   */
  async getOrCreateBinding(
    tenantId: string,
    productId: string,
    channelType: 'voice' | 'chat'
  ): Promise<ITenantPromptBinding> {
    let binding = await TenantPromptBinding.findOne({
      tenantId,
      productId: new Types.ObjectId(productId),
      channelType
    });

    if (!binding) {
      binding = new TenantPromptBinding({
        tenantId,
        productId: new Types.ObjectId(productId),
        channelType,
        pulledTemplateIds: [],
        scoreThreshold: 90
      });
      await binding.save();
    }

    return binding;
  }

  /**
   * Get both voice and chat bindings for a tenant+product.
   * Returns an object with voice and chat keys (either may be null).
   */
  async getBindingsForProduct(
    tenantId: string,
    productId: string
  ): Promise<{ voice: ITenantPromptBinding | null; chat: ITenantPromptBinding | null }> {
    const bindings = await TenantPromptBinding.find({
      tenantId,
      productId: new Types.ObjectId(productId)
    });

    const voice = bindings.find(b => b.channelType === 'voice') || null;
    const chat = bindings.find(b => b.channelType === 'chat') || null;

    return { voice, chat };
  }

  /**
   * Pull new templates for a tenant+product.
   * For each template that hasn't been pulled yet (not in pulledTemplateIds),
   * creates a tenant-scoped draft via createFromTemplate and updates the binding.
   *
   * Returns the number of new prompts created.
   */
  async pullTemplates(
    tenantId: string,
    productId: string,
    actor: IActor
  ): Promise<{ newCount: number; templates: { channelType: string; promptId: string; name: string }[] }> {
    // Get all templates for this product (returns grouped object — flatten to array)
    const grouped = await promptService.getTemplatesByProduct(productId);
    const templates = [...grouped.voice, ...grouped.chat, ...grouped.sms, ...grouped.whatsapp, ...grouped.email];

    // Collect all already-pulled template IDs across both channels
    const bindings = await TenantPromptBinding.find({
      tenantId,
      productId: new Types.ObjectId(productId)
    });

    const allPulledIds = new Set<string>();
    for (const b of bindings) {
      for (const id of b.pulledTemplateIds) {
        allPulledIds.add(id.toString());
      }
    }

    // Filter to only new (not-yet-pulled) templates
    const newTemplates = templates.filter(t => !allPulledIds.has(t._id.toString()));

    const created: { channelType: string; promptId: string; name: string }[] = [];

    for (const template of newTemplates) {
      const channelType = template.channelType as 'voice' | 'chat';

      // Create the tenant draft from this template
      const newPrompt = await promptService.createFromTemplate(
        template._id.toString(),
        tenantId,
        productId,
        actor
      );

      // Get or create the binding for this channel
      const binding = await this.getOrCreateBinding(tenantId, productId, channelType);

      // Record the template as pulled
      binding.pulledTemplateIds.push(template._id);

      // Set as current draft if none exists
      if (!binding.currentDraftId) {
        binding.currentDraftId = newPrompt._id;
      }

      await binding.save();

      created.push({
        channelType,
        promptId: newPrompt._id.toString(),
        name: newPrompt.name
      });
    }

    return { newCount: created.length, templates: created };
  }

  /**
   * Update a binding (e.g. set currentDraftId after version creation)
   */
  async updateBinding(
    tenantId: string,
    productId: string,
    channelType: 'voice' | 'chat',
    updates: Partial<{ currentDraftId: string; activeProductionId: string; lastScore: number }>
  ): Promise<ITenantPromptBinding | null> {
    const binding = await TenantPromptBinding.findOne({
      tenantId,
      productId: new Types.ObjectId(productId),
      channelType
    });

    if (!binding) return null;

    if (updates.currentDraftId) {
      binding.currentDraftId = new Types.ObjectId(updates.currentDraftId);
    }
    if (updates.activeProductionId) {
      binding.activeProductionId = new Types.ObjectId(updates.activeProductionId);
    }
    if (updates.lastScore !== undefined) {
      binding.lastScore = updates.lastScore;
    }

    await binding.save();
    return binding;
  }

  /**
   * Promote tenant prompt and update binding
   * When promoting to production, updates activeProductionId and clears currentDraftId
   */
  async promoteTenantPrompt(
    tenantId: string,
    productId: string,
    channelType: 'voice' | 'chat',
    promptVersionId: string,
    targetState: 'testing' | 'production',
    actor: IActor
  ): Promise<{ prompt: any; binding: ITenantPromptBinding }> {
    // Promote the prompt using the main prompt service
    const promotedPrompt = await promptService.promotePrompt(promptVersionId, targetState, actor);

    // Update the binding
    const binding = await TenantPromptBinding.findOne({
      tenantId,
      productId: new Types.ObjectId(productId),
      channelType
    });

    if (!binding) {
      throw new Error('Tenant prompt binding not found');
    }

    if (targetState === 'production') {
      // Update activeProductionId and clear currentDraftId
      binding.activeProductionId = promotedPrompt._id;
      binding.currentDraftId = undefined;
    }

    await binding.save();

    return { prompt: promotedPrompt, binding };
  }
}

export const tenantPromptService = new TenantPromptService();
