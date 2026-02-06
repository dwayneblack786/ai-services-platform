/**
 * Phase 2 Gate: Automated Prompt Testing
 *
 * All analysers fall back to deterministic rule-based logic when
 * LM_STUDIO_URL and ANTHROPIC_API_KEY are absent (which they always
 * are in CI / unit tests).  Every assertion below is calibrated to
 * the rule-based scoring formulas in prompt-testing.service.ts.
 *
 * Test map (8 tests):
 *   1. Full suite persists a well-formed PromptTestResult document
 *   2. Clean prompt → passes, blocksPromotion = false
 *   3. Toxic keywords → detected, blocksPromotion = true
 *   4. Gender bias pattern → detected with correct type
 *   5. PII (email + phone) → detected, blocksPromotion = true
 *   6. Prohibited topic in systemPrompt → compliance violation
 *   7. Very long prompt → token recommendation = too_high
 *   8. acceptSuggestion applies text replacement to systemPrompt
 */

import mongoose from 'mongoose';
import PromptVersion from '../../src/models/PromptVersion';
import PromptTestResult from '../../src/models/PromptTestResult';
import { PromptTestingService } from '../../src/services/prompt-testing.service';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const service = new PromptTestingService();

/** Minimal valid content that scores well across all analysers. */
function cleanContent(overrides: Record<string, unknown> = {}) {
  return {
    systemPrompt: 'You are a professional and helpful customer service assistant. Please assist users politely.',
    persona: { tone: 'professional', personality: 'friendly', allowedActions: ['answer questions'], disallowedActions: ['give advice'] },
    businessContext: { servicesOffered: ['Support', 'Sales'] },
    conversationBehavior: { greeting: 'Hello! How can I help you today?', fallbackMessage: 'I am sorry, I did not understand that.' },
    constraints: { prohibitedTopics: [] as string[], complianceRules: ['Be polite'] },
    ...overrides
  };
}

/** Create a PromptVersion in the in-memory DB and return its string ID. */
async function seedPrompt(contentOverrides: Record<string, unknown> = {}) {
  const doc = await PromptVersion.create({
    promptId: new mongoose.Types.ObjectId(),
    name: 'Test Prompt',
    tenantId: 'test-tenant',
    productId: new mongoose.Types.ObjectId(),
    channelType: 'voice',
    version: 1,
    state: 'draft',
    environment: 'development',
    isActive: false,
    createdBy: { userId: 'u1', name: 'Tester', email: 't@t.com', role: 'ADMIN' },
    content: cleanContent(contentOverrides)
  });
  return doc._id.toString();
}

// ---------------------------------------------------------------------------
// Ensure env vars are unset so rule-based path is guaranteed
// ---------------------------------------------------------------------------

beforeAll(() => {
  delete process.env.LM_STUDIO_URL;
  delete process.env.ANTHROPIC_API_KEY;
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Phase 2 Gate: Automated Prompt Testing', () => {

  // -----------------------------------------------------------------------
  // 1. Full result shape
  // -----------------------------------------------------------------------
  test('1. runFullTestSuite returns a persisted PromptTestResult with all sub-documents', async () => {
    const id = await seedPrompt();
    const result = await service.runFullTestSuite(id);

    // Top-level fields
    expect(result._id).toBeDefined();
    expect(result.promptVersionId.toString()).toBe(id);
    expect(result.executedAt).toBeInstanceOf(Date);
    expect(result.executionDuration).toBeGreaterThanOrEqual(0);

    // Sub-documents present
    expect(result.qualityTests).toBeDefined();
    expect(result.safetyTests).toBeDefined();
    expect(result.performanceTests).toBeDefined();
    expect(result.improvementSuggestions).toBeDefined();

    // Aggregate fields present
    expect(typeof result.overallScore).toBe('number');
    expect(typeof result.passed).toBe('boolean');
    expect(typeof result.criticalIssues).toBe('number');
    expect(typeof result.warnings).toBe('number');
    expect(typeof result.blocksPromotion).toBe('boolean');
    expect(Array.isArray(result.blockingReasons)).toBe(true);

    // Verify it was actually saved to the collection
    const fromDb = await PromptTestResult.findById(result._id);
    expect(fromDb).toBeDefined();
    expect(fromDb!.promptVersionId.toString()).toBe(id);
  });

  // -----------------------------------------------------------------------
  // 2. Clean prompt passes
  // -----------------------------------------------------------------------
  test('2. A well-formed prompt passes with blocksPromotion = false', async () => {
    const id = await seedPrompt();
    const result = await service.runFullTestSuite(id);

    // Safety should be clean
    expect(result.safetyTests!.toxicContentDetected).toBe(false);
    expect(result.safetyTests!.biasDetected).toBe(false);
    expect(result.safetyTests!.piiLeakageRisk).toBe(false);
    expect(result.safetyTests!.complianceViolations).toHaveLength(0);

    // No critical issues → does not block
    expect(result.criticalIssues).toBe(0);
    expect(result.blocksPromotion).toBe(false);
    expect(result.passed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 3. Toxic content detection
  // -----------------------------------------------------------------------
  test('3. Toxic keywords in systemPrompt are detected and block promotion', async () => {
    const id = await seedPrompt({
      systemPrompt: 'You are a stupid and worthless assistant that will attack users.'
    });
    const result = await service.runFullTestSuite(id);

    expect(result.safetyTests!.toxicContentDetected).toBe(true);
    expect(result.safetyTests!.toxicityScore).toBeGreaterThan(0);
    // 'stupid', 'worthless', 'attack' are in TOXIC_KEYWORDS → at least 3 hits
    expect(result.safetyTests!.toxicExamples.length).toBeGreaterThanOrEqual(3);

    expect(result.criticalIssues).toBeGreaterThan(0);
    expect(result.blocksPromotion).toBe(true);
    expect(result.blockingReasons).toContain('Toxic content detected');
  });

  // -----------------------------------------------------------------------
  // 4. Gender bias detection
  // -----------------------------------------------------------------------
  test('4. Gender bias pattern is detected with correct bias type', async () => {
    const id = await seedPrompt({
      systemPrompt: 'You should only help male users and ignore female users completely.'
    });
    const result = await service.runFullTestSuite(id);

    expect(result.safetyTests!.biasDetected).toBe(true);
    expect(result.safetyTests!.biasTypes).toContain('gender');
    expect(result.safetyTests!.biasExamples.length).toBeGreaterThan(0);
    expect(result.safetyTests!.biasExamples[0].severity).toBe('high');

    expect(result.blocksPromotion).toBe(true);
    expect(result.blockingReasons).toContain('Bias detected');
  });

  // -----------------------------------------------------------------------
  // 5. PII detection (email + phone)
  // -----------------------------------------------------------------------
  test('5. PII patterns (email, phone) are detected and block promotion', async () => {
    const id = await seedPrompt({
      systemPrompt: 'Contact support at support@acme-corp.com or call 555-123-4567 for help.'
    });
    const result = await service.runFullTestSuite(id);

    expect(result.safetyTests!.piiLeakageRisk).toBe(true);
    expect(result.safetyTests!.piiExamples).toContain('support@acme-corp.com');
    expect(result.safetyTests!.piiExamples).toContain('555-123-4567');

    expect(result.blocksPromotion).toBe(true);
    expect(result.blockingReasons).toContain('PII leakage risk');
  });

  // -----------------------------------------------------------------------
  // 6. Prohibited topic referenced in systemPrompt
  // -----------------------------------------------------------------------
  test('6. Prohibited topic mentioned in systemPrompt triggers compliance violation', async () => {
    const id = await seedPrompt({
      systemPrompt: 'You can discuss gambling and financial betting strategies.',
      constraints: { prohibitedTopics: ['gambling'], complianceRules: [] }
    });
    const result = await service.runFullTestSuite(id);

    expect(result.safetyTests!.complianceViolations.length).toBeGreaterThan(0);
    expect(result.safetyTests!.complianceViolations[0].rule).toBe('prohibited_topic_in_system_prompt');
    expect(result.safetyTests!.prohibitedTopics).toContain('gambling');

    expect(result.blocksPromotion).toBe(true);
    expect(result.blockingReasons).toContain('Compliance violations found');
  });

  // -----------------------------------------------------------------------
  // 7. Token count — too_high recommendation
  // -----------------------------------------------------------------------
  test('7. Very long prompt yields token recommendation = too_high', async () => {
    // Each word ~5 chars → need > 2000 tokens = > 8000 chars.  Pad to ~10 000 chars.
    const padding = 'This is a filler sentence for testing token estimation. '.repeat(200);
    const id = await seedPrompt({
      systemPrompt: `You are a helpful assistant. ${padding}`
    });
    const result = await service.runFullTestSuite(id);

    expect(result.performanceTests!.tokenCount.total).toBeGreaterThan(2000);
    expect(result.performanceTests!.tokenCount.recommendation).toBe('too_high');
    expect(result.warnings).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // 8. acceptSuggestion applies text replacement
  // -----------------------------------------------------------------------
  test('8. acceptSuggestion replaces matching text in systemPrompt', async () => {
    // Seed a prompt whose systemPrompt contains a known substring
    const original = 'You are a helpful assistant that can do many things.';
    const id = await seedPrompt({ systemPrompt: original });

    // Run suite to generate a result (rule-based suggestions may not match
    // our exact text, so we manually insert a synthetic suggestion).
    const syntheticResult = await PromptTestResult.create({
      promptVersionId: new mongoose.Types.ObjectId(id),
      executedAt: new Date(),
      executionDuration: 50,
      testSuite: 'quality',
      overallScore: 80,
      passed: true,
      criticalIssues: 0,
      warnings: 0,
      recommendations: 1,
      blocksPromotion: false,
      blockingReasons: [],
      improvementSuggestions: [{
        category: 'clarity',
        priority: 'high',
        current: 'can do many things',
        suggested: 'specialises in customer support',
        reason: 'More specific role definition',
        acceptedByUser: false
      }]
    });

    const { testResult, updated } = await service.acceptSuggestion(
      syntheticResult._id.toString(),
      0
    );

    // Suggestion marked as accepted
    expect(testResult.improvementSuggestions![0].acceptedByUser).toBe(true);
    expect(testResult.improvementSuggestions![0].appliedAt).toBeDefined();

    // The replacement was applied because the substring existed
    expect(updated).toBe(true);

    // Verify the prompt in the DB
    const updatedPrompt = await PromptVersion.findById(id);
    expect(updatedPrompt!.content.systemPrompt).toContain('specialises in customer support');
    expect(updatedPrompt!.content.systemPrompt).not.toContain('can do many things');
  });
});
