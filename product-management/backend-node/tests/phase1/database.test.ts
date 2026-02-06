import mongoose from 'mongoose';
import PromptVersion from '../../src/models/PromptVersion';
import PromptAuditLog from '../../src/models/PromptAuditLog';
import PromptTestResult from '../../src/models/PromptTestResult';
import RagDocument from '../../src/models/RagDocument';

function hasIndex(indexes: any[], keySpec: Record<string, number>, name: string): boolean {
  return indexes.some((idx: any) => {
    if (idx.name !== name) return false;
    return Object.entries(keySpec).every(([field, dir]) => idx.key[field] === dir);
  });
}

const createdBy = { userId: 'u1', name: 'Test', email: 'test@test.com', role: 'ADMIN' };

const fullContent = {
  systemPrompt: 'Test system prompt',
  persona: { tone: 'calm', personality: 'professional', allowedActions: [] as string[], disallowedActions: [] as string[] },
  businessContext: { servicesOffered: [] as string[] },
  conversationBehavior: { greeting: 'Hello', fallbackMessage: 'Sorry' },
  constraints: { prohibitedTopics: [] as string[] }
};

describe('Phase 1 Gate: Database Layer', () => {
  beforeAll(async () => {
    // Force index creation on all models (MMS does not auto-create)
    await PromptVersion.createIndexes();
    await PromptAuditLog.createIndexes();
    await PromptTestResult.createIndexes();
    await RagDocument.createIndexes();
  });

  test('1. prompt_versions has active_prompt_lookup compound index', async () => {
    const indexes = await PromptVersion.collection.listIndexes().toArray();
    expect(hasIndex(indexes, { tenantId: 1, productId: 1, channelType: 1, environment: 1, isActive: 1 }, 'active_prompt_lookup')).toBe(true);
  });

  test('2. prompt_versions has version_history and state_environment indexes', async () => {
    const indexes = await PromptVersion.collection.listIndexes().toArray();
    expect(hasIndex(indexes, { promptId: 1, version: -1 }, 'version_history')).toBe(true);
    expect(hasIndex(indexes, { state: 1, environment: 1 }, 'state_environment')).toBe(true);
  });

  test('3. prompt_versions draft_ttl index expires inactive drafts after 90 days', async () => {
    const indexes = await PromptVersion.collection.listIndexes().toArray();
    const ttl = indexes.find((i: any) => i.name === 'draft_ttl');
    expect(ttl).toBeDefined();
    expect(ttl.expireAfterSeconds).toBe(7776000);
    expect(ttl.partialFilterExpression).toEqual({ state: 'draft', isActive: false });
  });

  test('4. prompt_versions template_lookup index exists', async () => {
    const indexes = await PromptVersion.collection.listIndexes().toArray();
    expect(hasIndex(indexes, { isTemplate: 1, productId: 1, channelType: 1 }, 'template_lookup')).toBe(true);
  });

  test('5. prompt_versions ragConfig sub-document persists all nested fields', async () => {
    const doc = await PromptVersion.create({
      promptId: new mongoose.Types.ObjectId(),
      name: 'RAG Test',
      tenantId: 'tenant1',
      productId: new mongoose.Types.ObjectId(),
      channelType: 'voice',
      version: 1,
      state: 'draft',
      environment: 'development',
      isActive: false,
      content: {
        ...fullContent,
        ragConfig: {
          enabled: true,
          vectorStore: {
            provider: 'pinecone', indexName: 'idx', namespace: 'ns',
            embedding: { model: 'ada-002', dimensions: 1536, provider: 'openai' },
            autoSync: true
          },
          sources: [{ type: 'pdf', name: 'FAQ', enabled: true, config: {}, chunkSize: 500, chunkOverlap: 50, status: 'indexed' }],
          retrieval: { maxResults: 5, minScore: 0.7, hybridSearch: true },
          fallback: { noResultsMessage: 'unknown', useStaticContext: false }
        }
      },
      createdBy
    });

    expect(doc.content.ragConfig!.enabled).toBe(true);
    expect(doc.content.ragConfig!.vectorStore!.provider).toBe('pinecone');
    expect(doc.content.ragConfig!.sources!).toHaveLength(1);
    expect(doc.content.ragConfig!.retrieval!.maxResults).toBe(5);
    expect(doc.content.ragConfig!.fallback!.useStaticContext).toBe(false);
  });

  test('6. prompt_audit_log persists compliance and actor security fields', async () => {
    const log = await PromptAuditLog.create({
      promptVersionId: new mongoose.Types.ObjectId(),
      action: 'created',
      actor: { userId: 'u1', name: 'Alice', email: 'a@b.com', role: 'ADMIN', ipAddress: '10.0.0.1', sessionId: 'sess-1' },
      timestamp: new Date(),
      context: { tenantId: 'tenant1', environment: 'development', requestId: 'req-1' },
      compliance: { dataClassification: 'PHI', consentRecorded: true, retentionPolicy: '7_YEARS', encryptedFields: ['apiKey'] }
    });

    expect(log.compliance.dataClassification).toBe('PHI');
    expect(log.compliance.consentRecorded).toBe(true);
    expect(log.compliance.encryptedFields).toContain('apiKey');
    expect(log.actor.ipAddress).toBe('10.0.0.1');
    expect(log.actor.sessionId).toBe('sess-1');
  });

  test('7. prompt_audit_log has audit_retention_ttl index (7 years)', async () => {
    const indexes = await PromptAuditLog.collection.listIndexes().toArray();
    const ttl = indexes.find((i: any) => i.name === 'audit_retention_ttl');
    expect(ttl).toBeDefined();
    expect(ttl.expireAfterSeconds).toBe(220752000);
  });

  test('8. prompt_test_results and rag_documents have correct indexes', async () => {
    const trIndexes = await PromptTestResult.collection.listIndexes().toArray();
    expect(hasIndex(trIndexes, { promptVersionId: 1, executedAt: -1 }, 'test_history')).toBe(true);
    expect(hasIndex(trIndexes, { passed: 1, blocksPromotion: 1 }, 'test_status')).toBe(true);

    const rdIndexes = await RagDocument.collection.listIndexes().toArray();
    expect(hasIndex(rdIndexes, { tenantId: 1, promptVersionId: 1 }, 'tenant_prompt_docs')).toBe(true);
    expect(hasIndex(rdIndexes, { checksum: 1 }, 'duplicate_detection')).toBe(true);
    expect(hasIndex(rdIndexes, { 'vectorStore.syncStatus': 1 }, 'sync_status')).toBe(true);
  });

  test('9. voice and chat prompts stored independently for same product', async () => {
    const productId = new mongoose.Types.ObjectId();
    const makeBase = (channelType: string, name: string) => ({
      promptId: new mongoose.Types.ObjectId(),
      name,
      tenantId: 'tenant1',
      productId,
      channelType,
      version: 1,
      state: 'production' as const,
      environment: 'production' as const,
      isActive: true,
      createdBy,
      content: fullContent
    });

    await PromptVersion.create(makeBase('voice', 'Voice Prompt'));
    await PromptVersion.create(makeBase('chat', 'Chat Prompt'));

    const voice = await PromptVersion.find({ productId, channelType: 'voice' });
    const chat  = await PromptVersion.find({ productId, channelType: 'chat' });
    expect(voice).toHaveLength(1);
    expect(chat).toHaveLength(1);
    expect(voice[0].name).toBe('Voice Prompt');
    expect(chat[0].name).toBe('Chat Prompt');
  });
});
