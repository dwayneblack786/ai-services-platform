/**
 * PromptTestingService — Phase 2 Automated Prompt Testing
 *
 * Runs quality, safety, performance, and improvement analyses against a
 * PromptVersion and persists results to the prompt_test_results collection.
 *
 * External AI calls (Claude) are used when ANTHROPIC_API_KEY is set;
 * otherwise every analyser falls back to deterministic rule-based logic so
 * the system remains fully functional without credentials.
 */

import axios from 'axios';
import PromptVersion, { IPromptVersion } from '../models/PromptVersion';
import PromptTestResult, { IPromptTestResult } from '../models/PromptTestResult';
import TenantPromptBinding from '../models/TenantPromptBinding';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rough token estimate: ~4 characters per token (OpenAI heuristic). */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Flatten a prompt's 6-layer content into a single string for analysis. */
function assemblePromptText(content: IPromptVersion['content']): string {
  const parts: string[] = [];
  if (content.systemPrompt) parts.push(content.systemPrompt);
  if (content.persona) {
    if (content.persona.tone) parts.push(content.persona.tone);
    if (content.persona.personality) parts.push(content.persona.personality);
    if (content.persona.allowedActions?.length) parts.push(content.persona.allowedActions.join(', '));
    if (content.persona.disallowedActions?.length) parts.push(content.persona.disallowedActions.join(', '));
  }
  if (content.businessContext) {
    if (content.businessContext.servicesOffered?.length) parts.push(content.businessContext.servicesOffered.join(', '));
    if (content.businessContext.pricingInfo) parts.push(content.businessContext.pricingInfo);
    if (content.businessContext.policies) parts.push(content.businessContext.policies);
    if (content.businessContext.faqs?.length) {
      parts.push(...content.businessContext.faqs.map((f: any) => `${f.question} ${f.answer}`));
    }
  }
  if (content.conversationBehavior) {
    if (content.conversationBehavior.greeting) parts.push(content.conversationBehavior.greeting);
    if (content.conversationBehavior.fallbackMessage) parts.push(content.conversationBehavior.fallbackMessage);
  }
  if (content.constraints) {
    if (content.constraints.prohibitedTopics?.length) parts.push(content.constraints.prohibitedTopics.join(', '));
    if (content.constraints.complianceRules?.length) parts.push(content.constraints.complianceRules.join(', '));
  }
  return parts.join('\n');
}

// PII patterns — email, phone, SSN, credit-card-like sequences
const PII_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'email',  re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { label: 'phone',  re: /\b(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}\b/g },
  { label: 'ssn',    re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: 'cc',     re: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g }
];

// Toxic / offensive keyword lists (lightweight, no ML required)
const TOXIC_KEYWORDS = [
  'kill', 'murder', 'hate', 'racist', 'sexist', 'stupid', 'idiot',
  'worthless', 'destroy', 'attack', 'offensive', 'toxic', 'abuse',
  'harass', 'discriminat'
];

const BIAS_INDICATORS = [
  { pattern: /\bonly\s+(male|female|men|women|man|woman)\b/gi, type: 'gender' },
  { pattern: /\bignore\s+(female|women|male|men|minority)\b/gi, type: 'gender' },
  { pattern: /\b(black|white|asian|hispanic|latino)\s+people\b/gi, type: 'race' },
  { pattern: /\b(young|old|elderly)\s+people\s+only\b/gi, type: 'age' }
];

// ---------------------------------------------------------------------------
// Core service
// ---------------------------------------------------------------------------

export class PromptTestingService {

  // -----------------------------------------------------------------------
  // Private: LM-Studio / OpenAI-compat local inference
  // -----------------------------------------------------------------------

  /**
   * Send a single-turn prompt to the local LM Studio server.
   * Returns the model's text response, or `null` if LM Studio is
   * unavailable or the env var is not set.  Never throws.
   */
  private async callLLM(userContent: string, maxTokens = 1200): Promise<string | null> {
    const url = process.env.LM_STUDIO_URL;
    if (!url) return null;                          // not configured — skip silently

    const model = process.env.LM_STUDIO_MODEL || 'google/gemma-2-9b';

    try {
      const response = await axios.post(`${url}/v1/chat/completions`, {
        model,
        messages: [{ role: 'user', content: userContent }],
        max_tokens: maxTokens,
        temperature: 0.1
      }, {
        timeout: 5000,                              // 5 s — don't block if server is dead
        headers: { 'content-type': 'application/json' }
      });

      const text: string | undefined = response.data?.choices?.[0]?.message?.content;
      if (!text) return null;

      // Strip markdown code-fence wrappers that some models add
      return text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    } catch (err: any) {
      console.warn('[PromptTesting] LM Studio call failed, will try next provider:', err.message);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Public: run full suite and persist
  // -----------------------------------------------------------------------

  /**
   * Execute all four test suites against the given prompt version and save
   * the combined result.  Returns the persisted IPromptTestResult document.
   */
  async runFullTestSuite(promptVersionId: string): Promise<IPromptTestResult> {
    const startAt = Date.now();

    const prompt = await PromptVersion.findById(promptVersionId);
    if (!prompt) {
      throw new Error('Prompt version not found');
    }

    const fullText = assemblePromptText(prompt.content);

    // Run all four analyses in parallel
    const [quality, safety, performance, improvements] = await Promise.all([
      this.analyzeQuality(fullText, prompt),
      this.analyzeSafety(fullText, prompt),
      this.analyzePerformance(fullText, prompt),
      this.generateImprovements(fullText, prompt)
    ]);

    // Aggregate overall score (weighted: safety 40%, quality 35%, performance 25%)
    const overallScore = Math.round(
      safety.safetyScore * 0.40 +
      quality.clarityScore * 0.20 +
      quality.completenessScore * 0.15 +
      performance.performanceScore * 0.25
    );

    const criticalIssues =
      (safety.toxicContentDetected ? 1 : 0) +
      (safety.biasDetected ? 1 : 0) +
      (safety.piiLeakageRisk ? 1 : 0) +
      safety.complianceViolations.length;

    const warnings =
      (quality.ambiguityDetected ? 1 : 0) +
      (performance.tokenCount.recommendation === 'too_high' ? 1 : 0);

    const blocksPromotion = criticalIssues > 0 || overallScore < 60;

    const blockingReasons: string[] = [];
    if (safety.toxicContentDetected) blockingReasons.push('Toxic content detected');
    if (safety.biasDetected) blockingReasons.push('Bias detected');
    if (safety.piiLeakageRisk) blockingReasons.push('PII leakage risk');
    if (safety.complianceViolations.length) blockingReasons.push('Compliance violations found');
    if (overallScore < 60) blockingReasons.push(`Overall score ${overallScore}% is below 60% threshold`);

    const result = new PromptTestResult({
      promptVersionId: prompt._id,
      executedAt: new Date(),
      executionDuration: Date.now() - startAt,
      testSuite: 'quality', // full suite stored under 'quality' as the primary tag

      qualityTests: {
        clarityScore: quality.clarityScore,
        completenessScore: quality.completenessScore,
        ambiguityDetected: quality.ambiguityDetected,
        ambiguousTerms: quality.ambiguousTerms,
        toneConsistency: {
          detected: quality.detectedTone,
          consistencyScore: quality.toneConsistencyScore,
          inconsistencies: quality.toneInconsistencies
        },
        variablePlaceholders: {
          valid: quality.validPlaceholders,
          invalid: quality.invalidPlaceholders,
          missing: quality.missingPlaceholders
        }
      },

      safetyTests: {
        toxicContentDetected: safety.toxicContentDetected,
        toxicityScore: safety.toxicityScore,
        toxicExamples: safety.toxicExamples,
        biasDetected: safety.biasDetected,
        biasTypes: safety.biasTypes,
        biasExamples: safety.biasExamples,
        piiLeakageRisk: safety.piiLeakageRisk,
        piiExamples: safety.piiExamples,
        complianceViolations: safety.complianceViolations,
        prohibitedTopics: safety.detectedProhibitedTopics
      },

      performanceTests: {
        tokenCount: performance.tokenCount,
        estimatedLatency: performance.estimatedLatency,
        estimatedCost: performance.estimatedCost,
        modelCompatibility: performance.modelCompatibility
      },

      improvementSuggestions: improvements.map(s => ({
        ...s,
        acceptedByUser: false
      })),

      overallScore,
      passed: !blocksPromotion,
      criticalIssues,
      warnings,
      recommendations: improvements.length,
      blocksPromotion,
      blockingReasons
    });

    await result.save();

    // Update tenant binding lastScore if this prompt is bound to a tenant
    if (prompt.tenantId && prompt.productId) {
      await TenantPromptBinding.updateOne(
        {
          tenantId: prompt.tenantId,
          productId: prompt.productId,
          channelType: prompt.channelType
        },
        { lastScore: overallScore }
      );
    }

    return result;
  }

  /**
   * Retrieve test results for a prompt version, newest first.
   */
  async getTestResults(promptVersionId: string, limit = 10): Promise<IPromptTestResult[]> {
    return PromptTestResult.find({ promptVersionId })
      .sort({ executedAt: -1 })
      .limit(limit);
  }

  /**
   * Accept an improvement suggestion and apply it to the prompt draft.
   */
  async acceptSuggestion(
    testResultId: string,
    suggestionIndex: number
  ): Promise<{ testResult: IPromptTestResult; updated: boolean }> {
    const result = await PromptTestResult.findById(testResultId);
    if (!result || !result.improvementSuggestions || !result.improvementSuggestions[suggestionIndex]) {
      throw new Error('Test result or suggestion not found');
    }

    const suggestion = result.improvementSuggestions[suggestionIndex];
    suggestion.acceptedByUser = true;
    suggestion.appliedAt = new Date();
    await result.save();

    // Attempt to apply the suggestion text to the prompt's systemPrompt
    const prompt = await PromptVersion.findById(result.promptVersionId);
    let applied = false;
    if (prompt && suggestion.current && prompt.content.systemPrompt?.includes(suggestion.current)) {
      prompt.content.systemPrompt = prompt.content.systemPrompt.replace(suggestion.current, suggestion.suggested);
      await prompt.save();
      applied = true;
    }

    return { testResult: result, updated: applied };
  }

  // -----------------------------------------------------------------------
  // Private: Quality analysis
  // -----------------------------------------------------------------------

  private async analyzeQuality(fullText: string, prompt: IPromptVersion) {
    // Tier 1 — LM Studio (local, free)
    const lmRaw = await this.callLLM(this.qualityPromptText(fullText));
    if (lmRaw) {
      try { return JSON.parse(lmRaw); } catch { /* malformed JSON — fall through */ }
    }

    // Tier 2 — Claude API (production)
    if (process.env.ANTHROPIC_API_KEY) {
      try { return await this.qualityViaClaude(fullText, prompt); } catch { /* fall through */ }
    }

    // Tier 3 — deterministic rule-based
    return this.qualityRuleBased(fullText, prompt);
  }

  /** Shared prompt text for quality evaluation (used by both LM Studio and Claude). */
  private qualityPromptText(fullText: string): string {
    return `Evaluate this AI prompt for clarity, completeness, tone consistency, and ambiguity. Return ONLY valid JSON matching this shape exactly (no markdown, no explanation):
{
  "clarityScore": <0-100>,
  "completenessScore": <0-100>,
  "ambiguityDetected": <bool>,
  "ambiguousTerms": [<strings>],
  "detectedTone": "<string>",
  "toneConsistencyScore": <0-100>,
  "toneInconsistencies": [<strings>],
  "validPlaceholders": [<strings>],
  "invalidPlaceholders": [<strings>],
  "missingPlaceholders": [<strings>]
}

Prompt to evaluate:
---
${fullText}
---`;
  }

  private async qualityViaClaude(fullText: string, _prompt: IPromptVersion) {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 800,
      messages: [{ role: 'user', content: this.qualityPromptText(fullText) }]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const raw = response.data.content?.[0]?.text || '{}';
    const cleaned = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }

  private qualityRuleBased(fullText: string, prompt: IPromptVersion) {
    const systemPrompt = prompt.content.systemPrompt || '';
    const hasGreeting = !!prompt.content.conversationBehavior?.greeting;
    const hasFallback = !!prompt.content.conversationBehavior?.fallbackMessage;
    const hasPersona = !!(prompt.content.persona?.tone && prompt.content.persona?.personality);
    const hasConstraints = !!(prompt.content.constraints?.prohibitedTopics?.length || prompt.content.constraints?.complianceRules?.length);

    // Clarity: penalise very short or very long system prompts
    let clarityScore = 75;
    if (systemPrompt.length < 30) clarityScore -= 20;
    if (systemPrompt.length > 2000) clarityScore -= 10;
    if (hasPersona) clarityScore += 10;
    clarityScore = Math.min(100, Math.max(0, clarityScore));

    // Completeness: check presence of key layers
    let completenessScore = 50;
    if (systemPrompt.length > 10) completenessScore += 15;
    if (hasGreeting) completenessScore += 10;
    if (hasFallback) completenessScore += 10;
    if (hasPersona) completenessScore += 10;
    if (hasConstraints) completenessScore += 5;
    completenessScore = Math.min(100, completenessScore);

    // Ambiguity: detect vague words
    const vagueWords = ['maybe', 'perhaps', 'sometimes', 'possibly', 'could be', 'might'];
    const ambiguousTerms = vagueWords.filter(w => fullText.toLowerCase().includes(w));

    // Placeholder detection: {{variable}} style
    const placeholderRe = /\{\{(\w+)\}\}/g;
    const validPlaceholders: string[] = [];
    let m;
    while ((m = placeholderRe.exec(fullText)) !== null) validPlaceholders.push(m[1]);

    // Tone detection (simple heuristic)
    let detectedTone = 'neutral';
    const lowerText = fullText.toLowerCase();
    if (lowerText.includes('please') || lowerText.includes('thank')) detectedTone = 'polite';
    if (lowerText.includes('urgent') || lowerText.includes('immediately')) detectedTone = 'urgent';
    if (lowerText.includes('professional') || lowerText.includes('formal')) detectedTone = 'professional';

    return {
      clarityScore,
      completenessScore,
      ambiguityDetected: ambiguousTerms.length > 0,
      ambiguousTerms,
      detectedTone,
      toneConsistencyScore: ambiguousTerms.length === 0 ? 85 : 65,
      toneInconsistencies: ambiguousTerms.length > 0 ? ['Vague/ambiguous phrasing detected'] : [],
      validPlaceholders,
      invalidPlaceholders: [] as string[],
      missingPlaceholders: [] as string[]
    };
  }

  // -----------------------------------------------------------------------
  // Private: Safety analysis
  // -----------------------------------------------------------------------

  private async analyzeSafety(fullText: string, prompt: IPromptVersion) {
    const lowerText = fullText.toLowerCase();

    // Toxicity: keyword scan
    const toxicExamples = TOXIC_KEYWORDS.filter(kw => lowerText.includes(kw));
    const toxicContentDetected = toxicExamples.length > 0;
    const toxicityScore = toxicContentDetected
      ? Math.min(100, toxicExamples.length * 15)
      : 0;

    // Bias: pattern scan
    const biasExamples: Array<{ type: string; text: string; severity: 'low' | 'medium' | 'high' }> = [];
    const biasTypes: string[] = [];
    for (const indicator of BIAS_INDICATORS) {
      const matches = fullText.match(indicator.pattern);
      if (matches) {
        biasTypes.push(indicator.type);
        matches.forEach(m => biasExamples.push({
          type: indicator.type,
          text: m,
          severity: 'high'
        }));
      }
    }
    const biasDetected = biasExamples.length > 0;

    // PII scan
    const piiExamples: string[] = [];
    for (const { re } of PII_PATTERNS) {
      const matches = fullText.match(re);
      if (matches) piiExamples.push(...matches);
    }
    const piiLeakageRisk = piiExamples.length > 0;

    // Compliance: check prohibited topics are actually listed as constraints
    const prohibitedTopics = prompt.content.constraints?.prohibitedTopics || [];
    const detectedProhibitedTopics: string[] = [];
    const complianceViolations: Array<{ rule: string; severity: string; description: string }> = [];

    // If system prompt mentions a topic that's also in prohibitedTopics, flag it
    for (const topic of prohibitedTopics) {
      if (prompt.content.systemPrompt?.toLowerCase().includes(topic.toLowerCase())) {
        detectedProhibitedTopics.push(topic);
        complianceViolations.push({
          rule: 'prohibited_topic_in_system_prompt',
          severity: 'medium',
          description: `Prohibited topic "${topic}" referenced in system prompt`
        });
      }
    }

    // Overall safety score: 100 minus penalties
    let safetyScore = 100;
    if (toxicContentDetected) safetyScore -= 30;
    if (biasDetected) safetyScore -= 25;
    if (piiLeakageRisk) safetyScore -= 20;
    safetyScore -= complianceViolations.length * 10;
    safetyScore = Math.max(0, safetyScore);

    return {
      safetyScore,
      toxicContentDetected,
      toxicityScore,
      toxicExamples,
      biasDetected,
      biasTypes: [...new Set(biasTypes)],
      biasExamples,
      piiLeakageRisk,
      piiExamples,
      complianceViolations,
      detectedProhibitedTopics
    };
  }

  // -----------------------------------------------------------------------
  // Private: Performance analysis
  // -----------------------------------------------------------------------

  private async analyzePerformance(_fullText: string, prompt: IPromptVersion) {
    const systemTokens = estimateTokens(prompt.content.systemPrompt || '');
    const userLayerTokens = estimateTokens(
      assemblePromptText(prompt.content).replace(prompt.content.systemPrompt || '', '')
    );
    const totalTokens = systemTokens + userLayerTokens;

    let recommendation: 'optimal' | 'high' | 'too_high' = 'optimal';
    if (totalTokens > 2000) recommendation = 'too_high';
    else if (totalTokens > 1000) recommendation = 'high';

    // Cost estimation based on Claude Sonnet pricing (~$3 / 1M input tokens)
    const costPerToken = 3 / 1_000_000;
    const perRequest = parseFloat((totalTokens * costPerToken).toFixed(6));

    // Latency heuristic: ~1ms per 10 tokens for inference
    const estimatedLatency = Math.round(totalTokens * 0.1);

    return {
      performanceScore: recommendation === 'optimal' ? 90 : recommendation === 'high' ? 70 : 50,
      tokenCount: {
        system: systemTokens,
        user: userLayerTokens,
        total: totalTokens,
        recommendation
      },
      estimatedLatency,
      estimatedCost: {
        perRequest,
        per1000Requests: parseFloat((perRequest * 1000).toFixed(4)),
        currency: 'USD'
      },
      modelCompatibility: [
        { model: 'claude-sonnet', compatible: true, issues: [] as string[] },
        { model: 'gpt-4', compatible: totalTokens < 8000, issues: totalTokens >= 8000 ? ['Exceeds recommended context'] : [] }
      ]
    };
  }

  // -----------------------------------------------------------------------
  // Private: Improvement suggestions
  // -----------------------------------------------------------------------

  private async generateImprovements(fullText: string, prompt: IPromptVersion) {
    // Tier 1 — LM Studio (local, free)
    const lmRaw = await this.callLLM(this.improvementsPromptText(fullText));
    if (lmRaw) {
      try {
        const parsed = JSON.parse(lmRaw);
        if (Array.isArray(parsed)) return parsed.slice(0, 4);
      } catch { /* malformed JSON — fall through */ }
    }

    // Tier 2 — Claude API (production)
    if (process.env.ANTHROPIC_API_KEY) {
      try { return await this.improvementsViaClaude(fullText, prompt); } catch { /* fall through */ }
    }

    // Tier 3 — deterministic rule-based
    return this.improvementsRuleBased(fullText, prompt);
  }

  /** Shared prompt text for improvement suggestions (used by both LM Studio and Claude). */
  private improvementsPromptText(fullText: string): string {
    return `Suggest 2-4 improvements for this AI prompt. Return ONLY a JSON array (no markdown, no explanation). Each item:
{
  "category": "<clarity|conciseness|tone|structure>",
  "priority": "<high|medium|low>",
  "current": "<exact substring from the prompt that should change>",
  "suggested": "<replacement text>",
  "reason": "<why>",
  "example": "<optional usage example>"
}

Prompt:
---
${fullText}
---`;
  }

  private async improvementsViaClaude(fullText: string, _prompt: IPromptVersion) {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1200,
      messages: [{ role: 'user', content: this.improvementsPromptText(fullText) }]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const raw = response.data.content?.[0]?.text || '[]';
    const cleaned = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    const suggestions = JSON.parse(cleaned);
    return Array.isArray(suggestions) ? suggestions.slice(0, 4) : [];
  }

  private improvementsRuleBased(fullText: string, prompt: IPromptVersion) {
    const suggestions: Array<{
      category: 'clarity' | 'conciseness' | 'tone' | 'structure';
      priority: 'high' | 'medium' | 'low';
      current: string;
      suggested: string;
      reason: string;
      example?: string;
    }> = [];

    const systemPrompt = prompt.content.systemPrompt || '';

    // Suggest adding greeting if missing
    if (!prompt.content.conversationBehavior?.greeting) {
      suggestions.push({
        category: 'structure',
        priority: 'medium',
        current: '',
        suggested: 'Add a greeting message in Conversation Behavior',
        reason: 'A greeting message improves user experience by setting expectations from the first interaction.'
      });
    }

    // Suggest adding fallback if missing
    if (!prompt.content.conversationBehavior?.fallbackMessage) {
      suggestions.push({
        category: 'structure',
        priority: 'medium',
        current: '',
        suggested: 'Add a fallback message in Conversation Behavior',
        reason: 'A fallback message prevents dead-end conversations when the assistant cannot understand input.'
      });
    }

    // Suggest expanding very short system prompts
    if (systemPrompt.length > 0 && systemPrompt.length < 50) {
      suggestions.push({
        category: 'clarity',
        priority: 'high',
        current: systemPrompt,
        suggested: `${systemPrompt} Provide detailed, helpful responses tailored to the user's needs.`,
        reason: 'System prompts under 50 characters tend to produce generic responses. Adding specificity improves output quality.'
      });
    }

    // Suggest adding constraints if empty
    if (!prompt.content.constraints?.prohibitedTopics?.length && !prompt.content.constraints?.complianceRules?.length) {
      suggestions.push({
        category: 'structure',
        priority: 'low',
        current: '',
        suggested: 'Add prohibited topics and compliance rules in Constraints',
        reason: 'Explicit constraints prevent the assistant from engaging in off-topic or non-compliant conversations.'
      });
    }

    return suggestions.slice(0, 4);
  }
}

export default new PromptTestingService();
