import { getDB } from '../config/database';
import { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import PromptVersionModel from '../models/PromptVersion';
import PromptAuditLogModel from '../models/PromptAuditLog';
import TenantPromptBinding from '../models/TenantPromptBinding';

/**
 * Prompt Service
 * Handles session prompt configuration, selection validation, versioning,
 * lifecycle management (draft → testing → production), and rollback.
 *
 * Two prompt domains:
 *   - System prompts (isTemplate: true, tenantId: null) — managed by admins, immutable once published
 *   - Tenant prompts (isTemplate: false, tenantId set) — editable by tenant admins
 */

export interface IActor {
  userId: string;
  name: string;
  email: string;
  role: string;
  ipAddress?: string;
  sessionId?: string;
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

// ─── Shared audit log helper ──────────────────────────────────────────────────

async function logAudit(
  promptVersionId: Types.ObjectId | any,
  action: string,
  actor: IActor,
  context: { tenantId?: string; productId?: any; environment: string; requestId: string },
  changes?: Array<{ field: string; path: string; oldValue: any; newValue: any }>
): Promise<void> {
  try {
    // Ensure promptVersionId is a proper Types.ObjectId regardless of how _id comes back from Mongoose
    const resolvedId = promptVersionId instanceof Types.ObjectId
      ? promptVersionId
      : new Types.ObjectId(promptVersionId.toString());

    await PromptAuditLogModel.create({
      promptVersionId: resolvedId,
      action,
      actor: {
        userId: actor.userId,
        name: actor.name,
        email: actor.email,
        role: actor.role,
        ipAddress: actor.ipAddress || '0.0.0.0',
        sessionId: actor.sessionId || 'system'
      },
      changes: changes || [],
      context,
      compliance: {
        dataClassification: 'PUBLIC',
        consentRecorded: false,
        retentionPolicy: '7_YEARS'
      }
    });
  } catch (err) {
    // Audit log failures must never crash the main operation
    console.error('[PromptService] Audit log error:', err);
  }
}

// ─── Error classes ────────────────────────────────────────────────────────────

export class PromptNotFoundError extends Error {
  constructor(id: string) { super(`Prompt not found: ${id}`); this.name = 'PromptNotFoundError'; }
}

export class PromptImmutableError extends Error {
  constructor() {
    super('System prompt is published. Use POST /api/pms/prompts/:id/versions to create a new version.');
    this.name = 'PromptImmutableError';
  }
}

export class PromptStateError extends Error {
  constructor(msg: string) { super(msg); this.name = 'PromptStateError'; }
}

export class PromptConflictError extends Error {
  constructor() { super('Prompt was modified by another user. Please reload and try again.'); this.name = 'PromptConflictError'; }
}

// ─── PromptService ────────────────────────────────────────────────────────────

export class PromptService {

  // ── Session / menu helpers (original methods) ───────────────────────────────

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
      // Use Types.ObjectId (Mongoose/bson 7.x) not mongodb's ObjectId (bson 6.x)
      let productQuery: any = productId;
      if (Types.ObjectId.isValid(productId) && productId.length === 24) {
        productQuery = new Types.ObjectId(productId);
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

  // ── Template helpers (original methods) ─────────────────────────────────────

  /**
   * Create a new prompt from a template
   * Used during product signup to provision tenant-specific prompts
   */
  async createFromTemplate(
    params: {
      templateId: string | ObjectId;
      tenantId: string;
      productId?: string | ObjectId;
      customizations?: any;
      actor: IActor;
    }
  ): Promise<any> {
    const { templateId, tenantId, productId, actor } = params;
    try {
      // Fetch the template prompt
      const template = await PromptVersionModel.findById(templateId);

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      if (!template.isTemplate) {
        throw new Error(`Prompt ${templateId} is not a template`);
      }

      const resolvedProductId = productId
        ? (Types.ObjectId.isValid(productId as string) ? new Types.ObjectId(productId as string) : productId)
        : template.productId;

      // Clone the template as a new tenant-specific draft prompt
      const newPrompt = new PromptVersionModel({
        // Identity
        promptId: new Types.ObjectId(),
        version: 1,
        tenantId,
        productId: resolvedProductId,
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

      await logAudit(
        savedPrompt._id as Types.ObjectId,
        'created_from_template',
        actor,
        { tenantId, productId: resolvedProductId, environment: 'development', requestId: `pull-${Date.now()}` },
        [{ field: 'template', path: 'template', oldValue: null, newValue: { templateId: template._id.toString(), templateName: template.name } }]
      );

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
      // Use Mongoose Types.ObjectId (bson 7.x) — not mongodb's ObjectId (bson 6.x) —
      // to avoid BSONVersionError when passing to Mongoose queries.
      const productIdStr = productId.toString();
      const productObjectId = Types.ObjectId.isValid(productIdStr)
        ? new Types.ObjectId(productIdStr)
        : undefined;

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

  // ── Versioning / lifecycle methods ───────────────────────────────────────────

  /**
   * Fetch a single prompt by _id. Logs 'accessed'.
   */
  async getPrompt(id: string, actor: IActor): Promise<any> {
    const prompt = await PromptVersionModel.findOne({
      _id: id,
      isDeleted: { $ne: true }
    });
    if (!prompt) return null;

    await logAudit(
      prompt._id as Types.ObjectId,
      'accessed',
      actor,
      { tenantId: prompt.tenantId, productId: prompt.productId, environment: prompt.environment, requestId: `get-${Date.now()}` }
    );

    return prompt;
  }

  /**
   * Get the single active production prompt for a channel.
   */
  async getActivePrompt(filters: {
    tenantId?: string;
    productId?: string;
    channelType: string;
    environment: string;
  }): Promise<any> {
    const query: any = {
      channelType: filters.channelType,
      state: 'production',
      isActive: true,
      isDeleted: { $ne: true }
    };
    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.productId) {
      query.productId = Types.ObjectId.isValid(filters.productId)
        ? new Types.ObjectId(filters.productId)
        : filters.productId;
    }
    // environment is stored on the doc but production prompts are environment-agnostic here
    return PromptVersionModel.findOne(query);
  }

  /**
   * Create a new draft prompt (version 1, new stable promptId).
   * For system prompts pass isTemplate: true and omit tenantId.
   */
  async createDraft(params: {
    name: string;
    description?: string;
    category?: string;
    channelType: string;
    tenantId?: string;
    productId?: string;
    isTemplate?: boolean;
    content: any;
    actor: IActor;
  }): Promise<any> {
    const { name, description, category, channelType, tenantId, productId, isTemplate, content, actor } = params;

    const resolvedProductId = productId && Types.ObjectId.isValid(productId)
      ? new Types.ObjectId(productId)
      : (productId || undefined);

    const prompt = new PromptVersionModel({
      promptId: new Types.ObjectId(),
      version: 1,
      name,
      description,
      category,
      channelType,
      tenantId: tenantId || undefined,
      productId: resolvedProductId,
      isTemplate: isTemplate || false,
      state: 'draft',
      environment: 'development',
      isActive: false,
      canRollback: false,
      content,
      createdBy: { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role }
    });

    const saved = await prompt.save();

    await logAudit(
      saved._id as Types.ObjectId,
      'created',
      actor,
      { tenantId, productId: resolvedProductId, environment: 'development', requestId: `create-${Date.now()}` }
    );

    console.log(`[PromptService] Created draft: ${saved._id} (v${saved.version})`);
    return saved;
  }

  /**
   * Update a draft prompt in-place with optimistic locking.
   *
   * Immutability rules:
   *   - System prompts (isTemplate:true) that are not in 'draft' → 403 PromptImmutableError
   *   - Any non-draft prompt → 400 PromptStateError
   *   - Concurrent edit (wrong __v) → 409 PromptConflictError
   */
  async updateDraft(
    id: string,
    updates: any,
    actor: IActor
  ): Promise<{ prompt: any; isNewVersion: boolean }> {
    // First fetch to check immutability
    const existing = await PromptVersionModel.findById(id);
    if (!existing) throw new PromptNotFoundError(id);

    if (existing.isTemplate && existing.state !== 'draft') {
      throw new PromptImmutableError();
    }

    if (existing.state !== 'draft') {
      throw new PromptStateError(`Cannot update a ${existing.state} prompt. Only drafts can be edited.`);
    }

    // Build the fields to update (exclude system fields)
    const { __v, _id, promptId, version, createdBy, createdAt, ...safeUpdates } = updates;

    // Track field-level changes for audit
    const changes: Array<{ field: string; path: string; oldValue: any; newValue: any }> = [];
    if (safeUpdates.name && safeUpdates.name !== existing.name) {
      changes.push({ field: 'name', path: 'name', oldValue: existing.name, newValue: safeUpdates.name });
    }
    if (safeUpdates.content) {
      changes.push({ field: 'content', path: 'content', oldValue: '[previous]', newValue: '[updated]' });
    }

    // Optimistic locking: use __v if client provided it
    const filter: any = { _id: id, state: 'draft' };
    if (typeof __v === 'number') filter.__v = __v;

    const updated = await PromptVersionModel.findOneAndUpdate(
      filter,
      {
        $set: {
          ...safeUpdates,
          updatedBy: { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role }
        },
        $inc: { __v: 1 }
      },
      { new: true }
    );

    if (!updated) {
      // If filter had __v and nothing matched, it's a concurrent edit conflict
      if (typeof __v === 'number') throw new PromptConflictError();
      throw new PromptNotFoundError(id);
    }

    await logAudit(
      updated._id as Types.ObjectId,
      'updated',
      actor,
      { tenantId: updated.tenantId, productId: updated.productId, environment: updated.environment, requestId: `update-${Date.now()}` },
      changes
    );

    return { prompt: updated, isNewVersion: false };
  }

  /**
   * Create a new draft version from any existing version.
   * Increments version by 1, sets basedOn to source._id.
   */
  async createNewVersion(id: string, actor: IActor): Promise<any> {
    const source = await PromptVersionModel.findById(id);
    if (!source) throw new PromptNotFoundError(id);

    // Find the highest version for this logical prompt
    const latest = await PromptVersionModel.findOne({ promptId: source.promptId, isDeleted: { $ne: true } })
      .sort({ version: -1 });
    const nextVersion = (latest?.version ?? source.version) + 1;

    const newDraft = new PromptVersionModel({
      promptId: source.promptId,
      version: nextVersion,
      name: source.name,
      description: source.description,
      category: source.category,
      channelType: source.channelType,
      tenantId: source.tenantId,
      productId: source.productId,
      isTemplate: source.isTemplate,
      baseTemplateId: source.baseTemplateId,
      templateDescription: source.templateDescription,
      icon: source.icon,
      state: 'draft',
      environment: 'development',
      isActive: false,
      canRollback: false,
      basedOn: source._id as Types.ObjectId,
      content: source.content,
      createdBy: { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role }
    });

    const saved = await newDraft.save();

    await logAudit(
      saved._id as Types.ObjectId,
      'created',
      actor,
      { tenantId: saved.tenantId, productId: saved.productId, environment: 'development', requestId: `version-${Date.now()}` },
      [{ field: 'basedOn', path: 'basedOn', oldValue: null, newValue: source._id?.toString() }]
    );

    console.log(`[PromptService] Created version ${nextVersion} from ${source._id}`);
    return saved;
  }

  /**
   * Promote a prompt to the next state.
   *
   * System prompts (isTemplate:true): draft → production only (skip testing).
   * Tenant prompts: draft → testing → production.
   *
   * On promotion to production:
   *   1. Deactivate all other production versions with the same promptId.
   *   2. Set state=production, isActive=true, activatedAt=now, canRollback=true.
   *   3. For tenant prompts: update tenant_prompt_bindings.activeProductionId.
   */
  async promotePrompt(
    id: string,
    targetState: 'testing' | 'production',
    actor: IActor
  ): Promise<any> {
    const prompt = await PromptVersionModel.findById(id);
    if (!prompt) throw new PromptNotFoundError(id);

    // Validate transition
    const isSystemPrompt = prompt.isTemplate === true;
    if (isSystemPrompt && targetState === 'testing') {
      throw new PromptStateError('System prompts skip testing — promote directly to production.');
    }

    const validTransitions: Record<string, string[]> = {
      draft: ['testing', 'production'],
      testing: ['production']
    };
    if (!validTransitions[prompt.state]?.includes(targetState)) {
      throw new PromptStateError(`Cannot promote from '${prompt.state}' to '${targetState}'.`);
    }

    const auditAction = targetState === 'production' ? 'deployed' : 'approved';

    if (targetState === 'production') {
      // Deactivate all other production versions with the same promptId
      await PromptVersionModel.updateMany(
        { promptId: prompt.promptId, state: 'production', _id: { $ne: prompt._id } },
        { $set: { isActive: false, state: 'archived' } }
      );

      const promoted = await PromptVersionModel.findByIdAndUpdate(
        id,
        {
          $set: {
            state: 'production',
            isActive: true,
            activatedAt: new Date(),
            canRollback: true,
            environment: 'production',
            updatedBy: { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role }
          }
        },
        { new: true }
      );

      if (!promoted) throw new PromptNotFoundError(id);

      // Update tenant binding if this is a tenant prompt
      if (!isSystemPrompt && promoted.tenantId && promoted.productId && promoted.channelType) {
        await TenantPromptBinding.findOneAndUpdate(
          {
            tenantId: promoted.tenantId,
            productId: promoted.productId,
            channelType: promoted.channelType
          },
          {
            $set: {
              activeProductionId: promoted._id,
              currentDraftId: undefined
            }
          }
        );
      }

      await logAudit(
        promoted._id as Types.ObjectId,
        auditAction,
        actor,
        { tenantId: promoted.tenantId, productId: promoted.productId, environment: 'production', requestId: `promote-${Date.now()}` }
      );

      console.log(`[PromptService] Promoted ${id} to production`);
      return promoted;
    } else {
      // Promote to testing
      const promoted = await PromptVersionModel.findByIdAndUpdate(
        id,
        {
          $set: {
            state: 'testing',
            environment: 'testing',
            updatedBy: { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role }
          }
        },
        { new: true }
      );

      if (!promoted) throw new PromptNotFoundError(id);

      await logAudit(
        promoted._id as Types.ObjectId,
        auditAction,
        actor,
        { tenantId: promoted.tenantId, productId: promoted.productId, environment: 'testing', requestId: `promote-${Date.now()}` }
      );

      console.log(`[PromptService] Promoted ${id} to testing`);
      return promoted;
    }
  }

  /**
   * Rollback to a previous production version.
   * Deactivates the current production version and reactivates the target.
   */
  async rollbackPrompt(
    currentId: string,
    targetVersionId: string,
    actor: IActor
  ): Promise<any> {
    const current = await PromptVersionModel.findById(currentId);
    if (!current) throw new PromptNotFoundError(currentId);

    const target = await PromptVersionModel.findById(targetVersionId);
    if (!target) throw new PromptNotFoundError(targetVersionId);

    if (!target.canRollback) {
      throw new PromptStateError('Target version is not eligible for rollback.');
    }

    // Deactivate all current production versions for this promptId
    await PromptVersionModel.updateMany(
      { promptId: current.promptId, state: 'production' },
      { $set: { isActive: false, state: 'archived' } }
    );

    // Reactivate the target version
    const restored = await PromptVersionModel.findByIdAndUpdate(
      targetVersionId,
      {
        $set: {
          state: 'production',
          isActive: true,
          activatedAt: new Date(),
          canRollback: true,
          rollbackFrom: current._id as Types.ObjectId,
          updatedBy: { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role }
        }
      },
      { new: true }
    );

    if (!restored) throw new PromptNotFoundError(targetVersionId);

    // Update binding if tenant prompt
    if (!restored.isTemplate && restored.tenantId && restored.productId && restored.channelType) {
      await TenantPromptBinding.findOneAndUpdate(
        { tenantId: restored.tenantId, productId: restored.productId, channelType: restored.channelType },
        { $set: { activeProductionId: restored._id, currentDraftId: undefined } }
      );
    }

    await logAudit(
      restored._id as Types.ObjectId,
      'rolled_back',
      actor,
      { tenantId: restored.tenantId, productId: restored.productId, environment: 'production', requestId: `rollback-${Date.now()}` },
      [{ field: 'state', path: 'state', oldValue: 'archived', newValue: 'production' }]
    );

    console.log(`[PromptService] Rolled back to version ${target.version} (${targetVersionId})`);
    return restored;
  }

  /**
   * Get version history for a logical prompt.
   * Accepts either an _id of any version or a promptId (stable ObjectId).
   * Returns all versions sorted newest first.
   */
  async getVersionHistory(idOrPromptId: string): Promise<any[]> {
    // Resolve stable promptId: try as _id first, follow to promptId
    let stablePromptId: Types.ObjectId;

    const doc = await PromptVersionModel.findById(idOrPromptId).select('promptId');
    if (doc?.promptId) {
      stablePromptId = doc.promptId;
    } else if (Types.ObjectId.isValid(idOrPromptId)) {
      stablePromptId = new Types.ObjectId(idOrPromptId);
    } else {
      throw new PromptNotFoundError(idOrPromptId);
    }

    return PromptVersionModel.find({ promptId: stablePromptId, isDeleted: { $ne: true } })
      .sort({ version: -1 });
  }

  /**
   * List prompts with filters and pagination.
   */
  async listPrompts(filters: {
    tenantId?: string;
    productId?: string;
    state?: string;
    channelType?: string;
    environment?: string;
    isTemplate?: boolean;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ prompts: any[]; total: number }> {
    const query: any = {};

    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.productId) {
      query.productId = Types.ObjectId.isValid(filters.productId)
        ? new Types.ObjectId(filters.productId)
        : filters.productId;
    }
    if (filters.state) query.state = filters.state;
    if (filters.channelType) query.channelType = filters.channelType;
    if (filters.environment) query.environment = filters.environment;
    if (typeof filters.isTemplate === 'boolean') query.isTemplate = filters.isTemplate;
    if (!filters.includeDeleted) query.isDeleted = { $ne: true };

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const [prompts, total] = await Promise.all([
      PromptVersionModel.find(query).sort({ updatedAt: -1 }).skip(offset).limit(limit),
      PromptVersionModel.countDocuments(query)
    ]);

    return { prompts, total };
  }

  /**
   * Soft-delete a prompt. Refuses to delete active production prompts.
   */
  async softDeletePrompt(id: string, actor: IActor): Promise<boolean> {
    const prompt = await PromptVersionModel.findById(id);
    if (!prompt) return false;

    if (prompt.state === 'production' && prompt.isActive) {
      throw new PromptStateError('Cannot delete an active production prompt. Archive or rollback first.');
    }

    await PromptVersionModel.findByIdAndUpdate(id, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role }
      }
    });

    await logAudit(
      prompt._id as Types.ObjectId,
      'deleted',
      actor,
      { tenantId: prompt.tenantId, productId: prompt.productId, environment: prompt.environment, requestId: `delete-${Date.now()}` }
    );

    return true;
  }

  /**
   * Restore a soft-deleted prompt to draft state.
   */
  async restorePrompt(id: string, actor: IActor): Promise<any> {
    const prompt = await PromptVersionModel.findById(id);
    if (!prompt) throw new PromptNotFoundError(id);

    if (!prompt.isDeleted) {
      throw new PromptStateError('Prompt is not deleted.');
    }

    const restored = await PromptVersionModel.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: false,
          state: 'draft',
          updatedBy: { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role }
        },
        $unset: { deletedAt: '', deletedBy: '' }
      },
      { new: true }
    );

    await logAudit(
      restored!._id as Types.ObjectId,
      'updated',
      actor,
      { tenantId: restored!.tenantId, productId: restored!.productId, environment: restored!.environment, requestId: `restore-${Date.now()}` },
      [{ field: 'isDeleted', path: 'isDeleted', oldValue: true, newValue: false }]
    );

    return restored;
  }

  /**
   * Permanently delete a prompt. Only allowed if soft-deleted or state='draft'.
   */
  async hardDeletePrompt(id: string, actor: IActor): Promise<boolean> {
    const prompt = await PromptVersionModel.findById(id);
    if (!prompt) return false;

    if (!prompt.isDeleted && prompt.state !== 'draft') {
      throw new PromptStateError('Hard delete only allowed on soft-deleted prompts or drafts.');
    }

    await PromptVersionModel.findByIdAndDelete(id);

    await logAudit(
      prompt._id as Types.ObjectId,
      'deleted',
      actor,
      { tenantId: prompt.tenantId, productId: prompt.productId, environment: prompt.environment, requestId: `hard-delete-${Date.now()}` },
      [{ field: 'id', path: '_id', oldValue: id, newValue: null }]
    );

    return true;
  }

  /**
   * Get a single system prompt template by _id.
   */
  async getTemplate(id: string): Promise<any> {
    return PromptVersionModel.findOne({ _id: id, isTemplate: true, isDeleted: { $ne: true } });
  }
}

// Singleton instance
export const promptService = new PromptService();
export default promptService;
