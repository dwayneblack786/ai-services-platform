import mongoose from 'mongoose';
import { PromptService } from '../../src/services/prompt.service';
import PromptVersion from '../../src/models/PromptVersion';
import PromptAuditLog from '../../src/models/PromptAuditLog';

const service = new PromptService();

const actor = { userId: 'integrator', name: 'Integration', email: 'int@test.com', role: 'ADMIN', ipAddress: '10.0.0.1', sessionId: 's1' };

const fullContent = {
  systemPrompt: 'Be helpful',
  persona: { tone: 'calm', personality: 'professional', allowedActions: [] as string[], disallowedActions: [] as string[] },
  businessContext: { servicesOffered: [] as string[] },
  conversationBehavior: { greeting: 'Hello', fallbackMessage: 'Sorry' },
  constraints: { prohibitedTopics: [] as string[] }
};

describe('Phase 1 Gate: Integration Tests', () => {
  test('1. Full lifecycle: create -> update -> version -> delete new version', async () => {
    const v1 = await service.createDraft({
      name: 'Lifecycle Prompt',
      channelType: 'voice',
      tenantId: 'tenant1',
      productId: new mongoose.Types.ObjectId().toString(),
      content: fullContent,
      actor
    });
    expect(v1.version).toBe(1);
    expect(v1.state).toBe('draft');

    // Update
    const updated = await service.updateDraft(v1._id.toString(), { name: 'Lifecycle Updated' } as any, actor);
    expect(updated!.name).toBe('Lifecycle Updated');

    // Create new version
    const v2 = await service.createNewVersion(v1._id.toString(), actor);
    expect(v2.version).toBe(2);
    expect(v2.state).toBe('draft');
    expect(v2.basedOn?.toString()).toBe(v1._id.toString());
    expect(v2.promptId?.toString()).toBe(v1.promptId?.toString());

    // Delete v2 (draft)
    const deleted = await service.deleteDraft(v2._id.toString(), actor);
    expect(deleted).toBe(true);

    // v1 still exists
    const v1Still = await PromptVersion.findById(v1._id);
    expect(v1Still).toBeDefined();

    // Audit trail has at least: created(v1), updated(v1), created(v2), deleted(v2)
    const allAudits = await PromptAuditLog.find({});
    expect(allAudits.length).toBeGreaterThanOrEqual(4);
  });

  test('2. Template workflow: create template -> create from template -> verify isolation', async () => {
    const productId = new mongoose.Types.ObjectId();

    // Seed a template directly in DB
    const template = await PromptVersion.create({
      promptId: new mongoose.Types.ObjectId(),
      name: 'Healthcare Voice Template',
      tenantId: 'system',
      productId,
      channelType: 'voice',
      version: 1,
      state: 'production',
      environment: 'production',
      isActive: true,
      isTemplate: true,
      createdBy: { userId: 'seed', name: 'Seed', email: 'seed@sys.com', role: 'ADMIN' },
      content: {
        systemPrompt: 'Template system prompt',
        persona: { tone: 'professional', personality: 'empathetic', allowedActions: ['schedule'], disallowedActions: ['diagnose'] },
        businessContext: { servicesOffered: ['consultation', 'scheduling'] },
        conversationBehavior: { greeting: 'Welcome to our clinic', fallbackMessage: 'Let me transfer you' },
        constraints: { prohibitedTopics: ['medical advice'], complianceRules: ['HIPAA'] }
      }
    });

    // Tenant A creates from template
    const promptA = await service.createFromTemplate({
      templateId: template._id.toString(),
      tenantId: 'tenantA',
      productId: productId.toString(),
      actor
    });

    expect(promptA.state).toBe('draft');
    expect(promptA.tenantId).toBe('tenantA');
    expect(promptA.baseTemplateId?.toString()).toBe(template._id.toString());
    expect(promptA.content.systemPrompt).toBe('Template system prompt');
    expect(promptA.isTemplate).toBeFalsy();

    // Tenant B creates from same template
    const promptB = await service.createFromTemplate({
      templateId: template._id.toString(),
      tenantId: 'tenantB',
      productId: productId.toString(),
      actor
    });

    // Isolation checks
    expect(promptA._id.toString()).not.toBe(promptB._id.toString());
    expect(promptA.tenantId).toBe('tenantA');
    expect(promptB.tenantId).toBe('tenantB');

    // Modify A does not affect B
    await service.updateDraft(promptA._id.toString(), { name: 'Tenant A Custom' } as any, actor);
    const reloadB = await PromptVersion.findById(promptB._id);
    expect(reloadB!.name).not.toBe('Tenant A Custom');
  });
});
