/**
 * Metrics Service (Phase 7)
 *
 * Aggregates and tracks prompt usage metrics from Java/Python services.
 * Calculates statistics like avg/p95/p99 latency, error rates, costs.
 */

import PromptVersion from '../models/PromptVersion';
import { Types } from 'mongoose';

export interface InvocationMetric {
  success: boolean;
  latency: number;         // Response time in ms
  tokens?: number;         // Tokens used
  cost?: number;           // Cost in USD
  error?: string;          // Error message if failed
  timestamp: string;       // ISO timestamp
}

export interface MetricsData {
  totalUses: number;
  successCount: number;
  errorCount: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  avgTokensUsed: number;
  totalCost: number;
  lastUsedAt: Date;
  errorRate: number;
  successRate: number;
}

class MetricsService {
  /**
   * Record invocation metrics from Java/Python services
   */
  async recordInvocations(
    promptVersionId: string,
    invocations: InvocationMetric[]
  ): Promise<MetricsData> {
    const prompt = await PromptVersion.findById(promptVersionId);
    if (!prompt) {
      throw new Error('Prompt version not found');
    }

    // Initialize metrics if not present
    if (!prompt.metrics) {
      prompt.metrics = {
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
      };
    }

    // Aggregate new invocations
    const newSuccesses = invocations.filter(i => i.success).length;
    const newErrors = invocations.filter(i => !i.success).length;
    const newTotal = invocations.length;

    // Update counts
    const oldTotal = prompt.metrics.totalUses || 0;
    const oldSuccesses = prompt.metrics.successCount || 0;
    const oldErrors = prompt.metrics.errorCount || 0;

    prompt.metrics.totalUses = oldTotal + newTotal;
    prompt.metrics.successCount = oldSuccesses + newSuccesses;
    prompt.metrics.errorCount = oldErrors + newErrors;

    // Calculate average latency (incremental average)
    const oldAvgLatency = prompt.metrics.avgLatency || 0;
    const newLatencies = invocations.map(i => i.latency);
    const newAvgLatency = newLatencies.reduce((sum, l) => sum + l, 0) / newLatencies.length;
    prompt.metrics.avgLatency = (oldAvgLatency * oldTotal + newAvgLatency * newTotal) / (oldTotal + newTotal);

    // Calculate percentile latencies (using all-time approximation)
    const allLatencies = [...newLatencies]; // In production, would keep rolling window
    allLatencies.sort((a, b) => a - b);
    prompt.metrics.p95Latency = this.percentile(allLatencies, 95);
    prompt.metrics.p99Latency = this.percentile(allLatencies, 99);

    // Calculate average tokens
    const tokensInvocations = invocations.filter(i => i.tokens !== undefined);
    if (tokensInvocations.length > 0) {
      const oldAvgTokens = prompt.metrics.avgTokensUsed || 0;
      const newTokens = tokensInvocations.map(i => i.tokens!);
      const newAvgTokens = newTokens.reduce((sum, t) => sum + t, 0) / newTokens.length;
      const oldTokenTotal = oldTotal;
      const newTokenTotal = tokensInvocations.length;
      prompt.metrics.avgTokensUsed = (oldAvgTokens * oldTokenTotal + newAvgTokens * newTokenTotal) / (oldTokenTotal + newTokenTotal);
    }

    // Calculate total cost
    const costInvocations = invocations.filter(i => i.cost !== undefined);
    if (costInvocations.length > 0) {
      const newCost = costInvocations.reduce((sum, i) => sum + (i.cost || 0), 0);
      prompt.metrics.totalCost = (prompt.metrics.totalCost || 0) + newCost;
    }

    // Update timestamp
    const latestTimestamp = invocations
      .map(i => new Date(i.timestamp))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    prompt.metrics.lastUsedAt = latestTimestamp;

    // Calculate rates
    prompt.metrics.errorRate = prompt.metrics.totalUses > 0
      ? prompt.metrics.errorCount / prompt.metrics.totalUses
      : 0;
    prompt.metrics.successRate = prompt.metrics.totalUses > 0
      ? prompt.metrics.successCount / prompt.metrics.totalUses
      : 0;

    // Save
    prompt.markModified('metrics');
    await prompt.save();

    return prompt.metrics;
  }

  /**
   * Get current metrics for a prompt version
   */
  async getMetrics(promptVersionId: string): Promise<MetricsData | null> {
    const prompt = await PromptVersion.findById(promptVersionId);
    if (!prompt) {
      throw new Error('Prompt version not found');
    }

    if (!prompt.metrics) {
      // Return empty metrics if none recorded
      return {
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
      };
    }

    return prompt.metrics;
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  /**
   * Reset metrics for a prompt version (useful for testing)
   */
  async resetMetrics(promptVersionId: string): Promise<void> {
    const prompt = await PromptVersion.findById(promptVersionId);
    if (!prompt) {
      throw new Error('Prompt version not found');
    }

    prompt.metrics = {
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
    };

    prompt.markModified('metrics');
    await prompt.save();
  }
}

export const metricsService = new MetricsService();
export default metricsService;
