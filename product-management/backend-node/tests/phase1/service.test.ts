import mongoose from 'mongoose';
import { PromptService } from '../../src/services/prompt.service';
import PromptVersion from '../../src/models/PromptVersion';
import PromptAuditLog from '../../src/models/PromptAuditLog';

const service = new PromptService();

const actor = {
  userId: 'user1', name: 'Tester', email: 'test@test.com',
  role: 'ADMIN', ipAddress: '127.0.0.1', sessionId: 'sess-x'
};

const fullContent = {
  systemPrompt: 'Be helpful',
  persona: { tone: 'calm', personality: 'professional', allowedActions: [] as string[], disallowedActions: [] as string[] },
  businessContext: { servicesOffered: [] as string[] },
  conversationBehavior: { greeting: 'Hello', fallbackMessage: 'Sorry' },
  constraints: { prohibitedTopics: [] as string[] }
};

describe('Phase 1 Gate: Service Layer', () => {
  test('1. createDraft produces a valid draft document', async () => {
    const draft = await service.createDraft({
      name: 'My Draft',
      channelType: 'voice',
      tenantId: 'tenant1',
      productId: new mongoose.Types.ObjectId().toString(),
      content: fullContent,
      actor
    });

    expect(draft.state).toBe('draft');
    expect(draft.environment).toBe('development');
    expect(draft.version).toBe(1);
    expect(draft.isActive).toBe(false);
    expect(draft.name).toBe('My Draft');
  });

  test('2. createDraft emits an audit log entry', async () => {
    const draft = await service.createDraft({
      name: 'Audit Draft',
      channelType: 'chat',
      tenantId: 'tenant1',
      productId: new mongoose.Types.ObjectId().toString(),
      content: fullContent,
      actor
    });

    const logs = await PromptAuditLog.find({ promptVersionId: draft._id, action: 'created' });
    expect(logs).toHaveLength(1);
    expect(logs[0].actor.ipAddress).toBe('127.0.0.1');
    expect(logs[0].actor.sessionId).toBe('sess-x');
    expect(logs[0].compliance.retentionPolicy).toBe('7_YEARS');
  });

  test('3. getActivePrompt returns the correct active prompt', async () => {
    const productId = new mongoose.Types.ObjectId();

    await PromptVersion.create({
      promptId: new mongoose.Types.ObjectId(),
      name: 'Active Voice',
      tenantId: 'tenant1',
      productId,
      channelType: 'voice',
      version: 1,
      state: 'production',
      environment: 'production',
      isActive: true,
      createdBy: { userId: 'u1', name: 'T', email: 't@t.com', role: 'ADMIN' },
      content: fullContent
    });

    const result = await service.getActivePrompt({
      tenantId: 'tenant1',
      productId: productId.toString(),
      channelType: 'voice',
      environment: 'production'
    });

    expect(result).toBeDefined();
    expect(result!.name).toBe('Active Voice');
    expect(result!.isActive).toBe(true);
  });

  test('4. updateDraft allows editing prompts in any state (Phase 1)', async () => {
    // Create via service then manually promote to production
    const draft = await service.createDraft({
      name: 'Will Be Promoted',
      channelType: 'voice',
      tenantId: 'tenant1',
      productId: new mongoose.Types.ObjectId().toString(),
      content: fullContent,
      actor
    });

    // Manually promote
    await PromptVersion.findByIdAndUpdate(draft._id, { state: 'production', isActive: true });

    // Should NOT throw - Phase 1 allows editing any state
    const updated = await service.updateDraft(
      draft._id.toString(),
      { name: 'Edited In Production' } as any,
      actor
    );

    expect(updated).toBeDefined();
    expect(updated!.name).toBe('Edited In Production');

    // Verify update audit log
    const logs = await PromptAuditLog.find({ promptVersionId: draft._id, action: 'updated' });
    expect(logs).toHaveLength(1);
  });

  test('5. deleteDraft rejects deletion of non-draft prompts', async () => {
    const prompt = await PromptVersion.create({
      promptId: new mongoose.Types.ObjectId(),
      name: 'Prod No Delete',
      tenantId: 'tenant1',
      productId: new mongoose.Types.ObjectId(),
      channelType: 'voice',
      version: 1,
      state: 'production',
      environment: 'production',
      isActive: true,
      createdBy: { userId: 'u1', name: 'T', email: 't@t.com', role: 'ADMIN' },
      content: fullContent
    });

    await expect(service.deleteDraft(prompt._id.toString(), actor))
      .rejects.toThrow('Can only delete drafts');

    // Document still exists
    const still = await PromptVersion.findById(prompt._id);
    expect(still).toBeDefined();
  });
});
