import mongoose from 'mongoose';
import { PromptService } from '../../src/services/prompt.service';
import PromptVersion from '../../src/models/PromptVersion';
import PromptAuditLog from '../../src/models/PromptAuditLog';

const service = new PromptService();

const actorWithDetails = {
  userId: 'compliance-user',
  name: 'Compliance Officer',
  email: 'compliance@org.com',
  role: 'COMPLIANCE',
  ipAddress: '192.168.1.100',
  sessionId: 'sess-compliance-42'
};

const fullContent = {
  systemPrompt: 'Compliance test',
  persona: { tone: 'calm', personality: 'professional', allowedActions: [] as string[], disallowedActions: [] as string[] },
  businessContext: { servicesOffered: [] as string[] },
  conversationBehavior: { greeting: 'Hello', fallbackMessage: 'Sorry' },
  constraints: { prohibitedTopics: [] as string[] }
};

describe('Phase 1 Gate: Compliance Tests', () => {
  test('1. Every mutation (create/update/delete) produces an immutable audit trail', async () => {
    const productId = new mongoose.Types.ObjectId().toString();

    // CREATE
    const draft = await service.createDraft({
      name: 'Compliance Lifecycle',
      channelType: 'voice',
      tenantId: 'tenant-compliance',
      productId,
      content: fullContent,
      actor: actorWithDetails
    });

    // UPDATE
    await service.updateDraft(draft._id.toString(), { name: 'Compliance Updated' } as any, actorWithDetails);

    // CREATE v2
    const v2 = await service.createNewVersion(draft._id.toString(), actorWithDetails);

    // DELETE v2
    await service.deleteDraft(v2._id.toString(), actorWithDetails);

    // Collect ALL audit logs for this prompt family
    const allLogs = await PromptAuditLog.find({
      promptVersionId: { $in: [draft._id, v2._id] }
    }).sort({ timestamp: 1 });

    const actions = allLogs.map(l => l.action);

    expect(actions).toContain('created');
    expect(actions).toContain('updated');
    expect(actions).toContain('deleted');
    expect(allLogs.length).toBeGreaterThanOrEqual(4);

    // Every log has actor details
    allLogs.forEach(log => {
      expect(log.actor.ipAddress).toBeDefined();
      expect(log.actor.sessionId).toBeDefined();
      expect(log.actor.userId).toBeDefined();
    });
  });

  test('2. Tenant isolation: tenant A cannot see tenant B prompts via service', async () => {
    const productId = new mongoose.Types.ObjectId().toString();

    // Tenant A creates a prompt
    const promptA = await service.createDraft({
      name: 'Tenant A Secret',
      channelType: 'voice',
      tenantId: 'tenantA',
      productId,
      content: fullContent,
      actor: actorWithDetails
    });

    // Tenant B lists -> should not see A
    const resultB = await service.listPrompts({ tenantId: 'tenantB' });
    expect(resultB.prompts.find(p => p._id.toString() === promptA._id.toString())).toBeUndefined();

    // Tenant B getActivePrompt -> null
    const activeB = await service.getActivePrompt({
      tenantId: 'tenantB',
      productId,
      channelType: 'voice',
      environment: 'development'
    });
    expect(activeB).toBeNull();
  });

  test('3. Audit log fields satisfy HIPAA/SOC2 minimum requirements', async () => {
    const draft = await service.createDraft({
      name: 'HIPAA Check',
      channelType: 'chat',
      tenantId: 'tenant-hipaa',
      productId: new mongoose.Types.ObjectId().toString(),
      content: fullContent,
      actor: actorWithDetails
    });

    const log = await PromptAuditLog.findOne({ promptVersionId: draft._id });
    expect(log).toBeDefined();

    // Required HIPAA/SOC2 fields
    expect(log!.actor.userId).toBeTruthy();
    expect(log!.actor.name).toBeTruthy();
    expect(log!.actor.email).toBeTruthy();
    expect(log!.actor.role).toBeTruthy();
    expect(log!.actor.ipAddress).toBeTruthy();
    expect(log!.actor.sessionId).toBeTruthy();

    expect(log!.timestamp).toBeDefined();
    expect(log!.context.environment).toBeTruthy();
    expect(log!.context.requestId).toBeTruthy();

    // Compliance sub-document present
    expect(log!.compliance).toBeDefined();
    expect(log!.compliance.dataClassification).toBeDefined();
    expect(log!.compliance.retentionPolicy).toBeDefined();
    expect(['7_YEARS', 'INDEFINITE']).toContain(log!.compliance.retentionPolicy);
  });
});
