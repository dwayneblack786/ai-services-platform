import PromptVersion, { IPromptVersion } from '../models/PromptVersion';
import PromptAuditLog from '../models/PromptAuditLog';
import { Types } from 'mongoose';

export interface IActor {
  userId: string;
  name: string;
  email: string;
  role: string;
  ipAddress?: string;
  sessionId?: string;
}

export interface ICreateDraftParams {
  name: string;
  description?: string;
  category?: string;
  channelType: 'voice' | 'chat' | 'sms' | 'whatsapp' | 'email';
  tenantId?: string;
  productId?: string;
  content: any;
  actor: IActor;
}

export interface IGetActivePromptParams {
  tenantId?: string;
  productId?: string;
  channelType: string;
  environment: 'development' | 'testing' | 'staging' | 'production';
}

export class PromptService {
  /**
   * Create a new draft prompt
   */
  async createDraft(params: ICreateDraftParams): Promise<IPromptVersion> {
    const { name, description, category, channelType, tenantId, productId, content, actor } = params;

    // Generate new promptId (same for all versions of this prompt)
    const promptId = new Types.ObjectId();

    const prompt = new PromptVersion({
      promptId,
      version: 1,
      name,
      description,
      category,
      channelType,
      tenantId,
      productId: productId ? new Types.ObjectId(productId) : undefined,
      content,
      state: 'draft',
      environment: 'development',
      isActive: false,
      createdBy: {
        userId: actor.userId,
        name: actor.name,
        email: actor.email,
        role: actor.role
      },
      createdAt: new Date()
    });

    await prompt.save();

    // Audit log
    await this.createAuditLog({
      promptVersionId: prompt._id,
      action: 'created',
      actor,
      context: {
        tenantId,
        productId: productId ? new Types.ObjectId(productId) : undefined,
        environment: 'development',
        requestId: `req-${Date.now()}`
      }
    });

    return prompt;
  }

  /**
   * Get a prompt by ID
   */
  async getPrompt(promptVersionId: string, actor?: IActor): Promise<IPromptVersion | null> {
    const prompt = await PromptVersion.findById(promptVersionId);

    // Audit access
    if (prompt && actor) {
      await this.createAuditLog({
        promptVersionId: prompt._id,
        action: 'accessed',
        actor,
        context: {
          tenantId: prompt.tenantId,
          productId: prompt.productId,
          environment: prompt.environment,
          requestId: `req-${Date.now()}`
        }
      });
    }

    return prompt;
  }

  /**
   * Get active prompt for tenant/product/channel/environment
   */
  async getActivePrompt(params: IGetActivePromptParams): Promise<IPromptVersion | null> {
    const { tenantId, productId, channelType, environment } = params;

    const query: any = {
      channelType,
      environment,
      isActive: true
    };

    if (tenantId) query.tenantId = tenantId;
    if (productId) query.productId = new Types.ObjectId(productId);

    return await PromptVersion.findOne(query).sort({ version: -1 });
  }

  /**
   * Update a draft prompt
   * NEW: Returns metadata about whether a new version was created
   */
  async updateDraft(
    promptVersionId: string,
    updates: Partial<IPromptVersion>,
    actor: IActor
  ): Promise<{ prompt: IPromptVersion; isNewVersion: boolean }> {
    const prompt = await PromptVersion.findById(promptVersionId);
    if (!prompt) throw new Error('Prompt not found');

    let isNewVersion = false;

    // Check if editing a non-draft prompt (production, testing, staging, archived)
    if (prompt.state !== 'draft') {
      // Create a new version instead of updating
      const newVersion = await this.createNewVersion(promptVersionId, actor);

      // Apply updates to the new version
      Object.assign(newVersion, updates);
      newVersion.updatedBy = {
        userId: actor.userId,
        name: actor.name,
        email: actor.email,
        role: actor.role
      };
      newVersion.updatedAt = new Date();
      await newVersion.save();

      // Audit log for version creation from edit
      await this.createAuditLog({
        promptVersionId: newVersion._id,
        action: 'version_created_from_edit',
        actor,
        context: {
          tenantId: newVersion.tenantId,
          productId: newVersion.productId,
          environment: newVersion.environment,
          requestId: `req-${Date.now()}`
        }
      });

      return { prompt: newVersion, isNewVersion: true };
    }

    // Draft state - update in place
    // Track changes
    const changes: any[] = [];
    Object.keys(updates).forEach(key => {
      if (key in prompt && (prompt as any)[key] !== (updates as any)[key]) {
        changes.push({
          field: key,
          path: key,
          oldValue: (prompt as any)[key],
          newValue: (updates as any)[key]
        });
      }
    });

    // Apply updates
    Object.assign(prompt, updates);
    prompt.updatedBy = {
      userId: actor.userId,
      name: actor.name,
      email: actor.email,
      role: actor.role
    };
    prompt.updatedAt = new Date();

    await prompt.save();

    // Audit log
    await this.createAuditLog({
      promptVersionId: prompt._id,
      action: 'updated',
      actor,
      changes,
      context: {
        tenantId: prompt.tenantId,
        productId: prompt.productId,
        environment: prompt.environment,
        requestId: `req-${Date.now()}`
      }
    });

    return { prompt, isNewVersion };
  }

  /**
   * Create a new version from an existing prompt
   */
  async createNewVersion(
    basePromptVersionId: string,
    actor: IActor
  ): Promise<IPromptVersion> {
    const basePrompt = await PromptVersion.findById(basePromptVersionId);
    if (!basePrompt) {
      throw new Error('Base prompt not found');
    }

    // Find highest version for this promptId
    const latestVersion = await PromptVersion.findOne({
      promptId: basePrompt.promptId
    }).sort({ version: -1 });

    const newVersion = new PromptVersion({
      promptId: basePrompt.promptId,
      version: (latestVersion?.version || 0) + 1,
      name: basePrompt.name,
      description: basePrompt.description,
      category: basePrompt.category,
      channelType: basePrompt.channelType,
      tenantId: basePrompt.tenantId,
      productId: basePrompt.productId,
      content: basePrompt.content,
      state: 'draft',
      environment: basePrompt.environment,
      isActive: false,
      basedOn: basePrompt._id,
      createdBy: {
        userId: actor.userId,
        name: actor.name,
        email: actor.email,
        role: actor.role
      },
      createdAt: new Date()
    });

    await newVersion.save();

    // Audit log
    await this.createAuditLog({
      promptVersionId: newVersion._id,
      action: 'created',
      actor,
      context: {
        tenantId: newVersion.tenantId,
        productId: newVersion.productId,
        environment: newVersion.environment,
        requestId: `req-${Date.now()}`
      }
    });

    return newVersion;
  }

  /**
   * Promote prompt to next state (draft -> testing -> production)
   * Handles state transitions and archiving old versions
   */
  async promotePrompt(
    promptVersionId: string,
    targetState: 'testing' | 'production',
    actor: IActor
  ): Promise<IPromptVersion> {
    const prompt = await PromptVersion.findById(promptVersionId);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    // Validate state transitions
    if (targetState === 'testing' && prompt.state !== 'draft') {
      throw new Error('Can only promote drafts to testing');
    }
    if (targetState === 'production' && prompt.state !== 'testing') {
      throw new Error('Can only promote testing prompts to production');
    }

    const oldState = prompt.state;

    // If promoting to production, archive old production version
    if (targetState === 'production') {
      const currentProduction = await PromptVersion.findOne({
        promptId: prompt.promptId,
        state: 'production',
        isActive: true
      });

      if (currentProduction) {
        currentProduction.state = 'archived';
        currentProduction.isActive = false;
        currentProduction.updatedBy = {
          userId: actor.userId,
          name: actor.name,
          email: actor.email,
          role: actor.role
        };
        currentProduction.updatedAt = new Date();
        await currentProduction.save();

        // Audit log for archival
        await this.createAuditLog({
          promptVersionId: currentProduction._id,
          action: 'archived',
          actor,
          changes: [{
            field: 'state',
            oldValue: 'production',
            newValue: 'archived',
            description: `Archived by promotion of v${prompt.version}`
          }],
          context: {
            tenantId: currentProduction.tenantId,
            productId: currentProduction.productId,
            environment: currentProduction.environment,
            requestId: `req-${Date.now()}`
          }
        });
      }

      // Set new version as active
      prompt.isActive = true;
    }

    // Update state
    prompt.state = targetState;
    prompt.updatedBy = {
      userId: actor.userId,
      name: actor.name,
      email: actor.email,
      role: actor.role
    };
    prompt.updatedAt = new Date();

    await prompt.save();

    // Audit log for promotion
    await this.createAuditLog({
      promptVersionId: prompt._id,
      action: 'promoted',
      actor,
      changes: [{
        field: 'state',
        oldValue: oldState,
        newValue: targetState,
        description: `Promoted from ${oldState} to ${targetState}`
      }],
      context: {
        tenantId: prompt.tenantId,
        productId: prompt.productId,
        environment: prompt.environment,
        requestId: `req-${Date.now()}`
      }
    });

    return prompt;
  }

  /**
   * Get all versions of a prompt
   */
  async getVersionHistory(promptId: string): Promise<IPromptVersion[]> {
    return await PromptVersion.find({
      promptId: new Types.ObjectId(promptId)
    }).sort({ version: -1 });
  }

  /**
   * Soft delete a prompt (any state)
   * Marks prompt as deleted but preserves data for audit/recovery
   */
  async softDeletePrompt(promptVersionId: string, actor: IActor): Promise<boolean> {
    const prompt = await PromptVersion.findById(promptVersionId);
    if (!prompt) return false;

    // Check if already deleted
    if (prompt.isDeleted) {
      throw new Error('Prompt is already deleted');
    }

    // Soft delete: mark as deleted
    prompt.isDeleted = true;
    prompt.deletedAt = new Date();
    prompt.deletedBy = {
      userId: actor.userId,
      name: actor.name,
      email: actor.email,
      role: actor.role
    };

    // If it's an active production prompt, deactivate it
    if (prompt.isActive) {
      prompt.isActive = false;
    }

    await prompt.save();

    // Audit log
    await this.createAuditLog({
      promptVersionId: prompt._id,
      action: 'soft_deleted',
      actor,
      changes: [{
        field: 'isDeleted',
        oldValue: false,
        newValue: true,
        description: 'Prompt soft deleted'
      }],
      context: {
        tenantId: prompt.tenantId,
        productId: prompt.productId,
        environment: prompt.environment,
        requestId: `req-${Date.now()}`
      }
    });

    return true;
  }

  /**
   * Restore a soft-deleted prompt
   */
  async restorePrompt(promptVersionId: string, actor: IActor): Promise<IPromptVersion> {
    const prompt = await PromptVersion.findById(promptVersionId);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    if (!prompt.isDeleted) {
      throw new Error('Prompt is not deleted');
    }

    // Restore prompt
    prompt.isDeleted = false;
    prompt.deletedAt = undefined;
    prompt.deletedBy = undefined;
    prompt.updatedBy = {
      userId: actor.userId,
      name: actor.name,
      email: actor.email,
      role: actor.role
    };
    prompt.updatedAt = new Date();

    await prompt.save();

    // Audit log
    await this.createAuditLog({
      promptVersionId: prompt._id,
      action: 'restored',
      actor,
      changes: [{
        field: 'isDeleted',
        oldValue: true,
        newValue: false,
        description: 'Prompt restored from soft delete'
      }],
      context: {
        tenantId: prompt.tenantId,
        productId: prompt.productId,
        environment: prompt.environment,
        requestId: `req-${Date.now()}`
      }
    });

    return prompt;
  }

  /**
   * Hard delete a prompt (permanent removal)
   * Only for soft-deleted prompts or drafts
   */
  async hardDeletePrompt(promptVersionId: string, actor: IActor): Promise<boolean> {
    const prompt = await PromptVersion.findById(promptVersionId);
    if (!prompt) return false;

    // Only allow hard delete of soft-deleted prompts or drafts
    if (!prompt.isDeleted && prompt.state !== 'draft') {
      throw new Error('Can only hard delete soft-deleted prompts or drafts');
    }

    // Audit log before deletion
    await this.createAuditLog({
      promptVersionId: new Types.ObjectId(promptVersionId),
      action: 'hard_deleted',
      actor,
      context: {
        tenantId: prompt.tenantId,
        productId: prompt.productId,
        environment: prompt.environment,
        requestId: `req-${Date.now()}`
      }
    });

    // Permanently delete
    await PromptVersion.deleteOne({ _id: promptVersionId });

    return true;
  }

  /**
   * List prompts with filters
   */
  async listPrompts(filters: {
    tenantId?: string;
    productId?: string;
    state?: string;
    channelType?: string;
    environment?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ prompts: IPromptVersion[]; total: number }> {
    const query: any = {};

    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.productId) query.productId = new Types.ObjectId(filters.productId);
    if (filters.state) query.state = filters.state;
    if (filters.channelType) query.channelType = filters.channelType;
    if (filters.environment) query.environment = filters.environment;

    // Exclude deleted prompts by default
    if (!filters.includeDeleted) {
      query.isDeleted = { $ne: true };
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [prompts, total] = await Promise.all([
      PromptVersion.find(query)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .skip(offset),
      PromptVersion.countDocuments(query)
    ]);

    return { prompts, total };
  }

  /**
   * Get templates by product (Phase 0.5)
   * Returns voice and chat templates for a specific product
   */
  async getTemplatesByProduct(productId: string): Promise<IPromptVersion[]> {
    const templates = await PromptVersion.find({
      isTemplate: true,
      productId: new Types.ObjectId(productId),
      state: 'production',
      isActive: true
    }).sort({ channelType: 1 }); // Sort by channel (chat, voice)

    return templates;
  }

  /**
   * Get a specific template by ID (Phase 0.5)
   */
  async getTemplate(templateId: string): Promise<IPromptVersion | null> {
    const template = await PromptVersion.findOne({
      _id: new Types.ObjectId(templateId),
      isTemplate: true
    });

    return template;
  }

  /**
   * Create prompt from template (Phase 0.5)
   * Clones a template and applies tenant/product customizations
   */
  async createFromTemplate(params: {
    templateId: string;
    tenantId: string;
    productId?: string;
    customizations?: Partial<any>;
    actor: IActor;
  }): Promise<IPromptVersion> {
    const { templateId, tenantId, productId, customizations, actor } = params;

    // Get the template
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Generate new promptId
    const promptId = new Types.ObjectId();

    // Clone template content
    const content = JSON.parse(JSON.stringify(template.content));

    // Apply customizations if provided
    if (customizations) {
      Object.assign(content, customizations);
    }

    // Create new prompt from template
    const prompt = new PromptVersion({
      promptId,
      version: 1,
      name: template.name.replace(' Template', ''), // Remove "Template" from name
      description: `Created from ${template.name}`,
      category: template.category,
      channelType: template.channelType,
      tenantId,
      productId: productId ? new Types.ObjectId(productId) : template.productId,
      baseTemplateId: template._id, // Link back to template
      content,
      state: 'draft',
      environment: 'development',
      isActive: false,
      createdBy: {
        userId: actor.userId,
        name: actor.name,
        email: actor.email,
        role: actor.role
      },
      createdAt: new Date()
    });

    await prompt.save();

    // Audit log
    await this.createAuditLog({
      promptVersionId: prompt._id,
      action: 'created_from_template',
      actor,
      context: {
        tenantId,
        productId: productId ? new Types.ObjectId(productId) : template.productId,
        environment: 'development',
        requestId: `req-${Date.now()}`
      },
      changes: [{
        field: 'baseTemplateId',
        oldValue: null,
        newValue: template._id,
        description: `Created from template: ${template.name}`
      }]
    });

    return prompt;
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(params: {
    promptVersionId: Types.ObjectId;
    action: string;
    actor: IActor;
    changes?: any[];
    context: {
      tenantId?: string;
      productId?: Types.ObjectId;
      environment: string;
      requestId: string;
    };
  }): Promise<void> {
    const { promptVersionId, action, actor, changes, context } = params;

    await PromptAuditLog.create({
      promptVersionId,
      action,
      actor: {
        userId: actor.userId,
        name: actor.name,
        email: actor.email,
        role: actor.role,
        ipAddress: actor.ipAddress || '0.0.0.0',
        sessionId: actor.sessionId || 'unknown'
      },
      timestamp: new Date(),
      changes,
      context,
      compliance: {
        dataClassification: 'PUBLIC',
        consentRecorded: false,
        retentionPolicy: '7_YEARS'
      }
    });
  }
}

export default new PromptService();
