import mongoose from 'mongoose';
import { PromptService } from '../../src/services/prompt.service';
import PromptVersion from '../../src/models/PromptVersion';

const service = new PromptService();

const fullContent = {
  systemPrompt: 'Perf test',
  persona: { tone: 'calm', personality: 'professional', allowedActions: [] as string[], disallowedActions: [] as string[] },
  businessContext: { servicesOffered: [] as string[] },
  conversationBehavior: { greeting: 'Hello', fallbackMessage: 'Sorry' },
  constraints: { prohibitedTopics: [] as string[] }
};

describe('Phase 1 Gate: Performance Tests', () => {
  test('1. Bulk insert 50 prompts and paginate under 2 seconds', async () => {
    const productId = new mongoose.Types.ObjectId();

    const docs = Array.from({ length: 50 }, (_, i) => ({
      promptId: new mongoose.Types.ObjectId(),
      name: `Perf Prompt ${i}`,
      tenantId: 'tenant-perf',
      productId,
      channelType: 'voice' as const,
      version: 1,
      state: 'draft' as const,
      environment: 'development' as const,
      isActive: false,
      createdBy: { userId: 'u1', name: 'T', email: 't@t.com', role: 'ADMIN' },
      content: fullContent
    }));

    const start = Date.now();
    await PromptVersion.insertMany(docs);

    const page1 = await service.listPrompts({ tenantId: 'tenant-perf', limit: 10, offset: 0 });
    const page2 = await service.listPrompts({ tenantId: 'tenant-perf', limit: 10, offset: 10 });
    const elapsed = Date.now() - start;

    expect(page1.total).toBe(50);
    expect(page1.prompts).toHaveLength(10);
    expect(page2.prompts).toHaveLength(10);
    expect(elapsed).toBeLessThan(2000);
  });

  test('2. getActivePrompt is fast with many inactive prompts', async () => {
    const productId = new mongoose.Types.ObjectId();

    const inactive = Array.from({ length: 100 }, () => ({
      promptId: new mongoose.Types.ObjectId(),
      name: 'Inactive',
      tenantId: 'tenant-perf2',
      productId,
      channelType: 'voice' as const,
      version: 1,
      state: 'production' as const,
      environment: 'production' as const,
      isActive: false,
      createdBy: { userId: 'u1', name: 'T', email: 't@t.com', role: 'ADMIN' },
      content: fullContent
    }));
    await PromptVersion.insertMany(inactive);

    // One active prompt
    await PromptVersion.create({
      promptId: new mongoose.Types.ObjectId(),
      name: 'The Active One',
      tenantId: 'tenant-perf2',
      productId,
      channelType: 'voice',
      version: 1,
      state: 'production',
      environment: 'production',
      isActive: true,
      createdBy: { userId: 'u1', name: 'T', email: 't@t.com', role: 'ADMIN' },
      content: fullContent
    });

    const start = Date.now();
    const result = await service.getActivePrompt({
      tenantId: 'tenant-perf2',
      productId: productId.toString(),
      channelType: 'voice',
      environment: 'production'
    });
    const elapsed = Date.now() - start;

    expect(result).toBeDefined();
    expect(result!.name).toBe('The Active One');
    expect(elapsed).toBeLessThan(500);
  });
});
