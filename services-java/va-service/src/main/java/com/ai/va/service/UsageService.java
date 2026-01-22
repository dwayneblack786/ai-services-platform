package com.ai.va.service;

import com.ai.va.client.UsageMetricsClient;
import com.ai.va.config.UsageConfig;
import com.ai.va.model.LlmResult;
import com.ai.va.model.UsageUpdate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Usage Service
 * Tracks usage metrics for billing and analytics
 * Aggregates: sttSeconds, ttsCharacters, llmTokensIn, llmTokensOut
 * Emits: Events to queue or direct API call to Node for updating assistant_calls.usage
 */
@Service
public class UsageService {

    private static final Logger logger = LoggerFactory.getLogger(UsageService.class);

    @Autowired
    private UsageMetricsClient usageMetricsClient;

    @Autowired
    private UsageConfig usageConfig;

    // Track usage per callId (sync to DB periodically)
    private final Map<String, UsageMetrics> usageStore = new ConcurrentHashMap<>();

    /**
     * Record usage from full processing pipeline
     * Computes seconds/characters/tokens from provider metadata
     * Then POST to Node's billing/usage endpoint or emit Kafka/Redis event
     * 
     * @param callId Call identifier
     * @param llmResult LLM result with token counts
     * @param audioInBytes Input audio size in bytes
     * @param audioOutBytes Output audio size in bytes
     */
    public void recordUsage(String callId, LlmResult llmResult, int audioInBytes, int audioOutBytes) {
        UsageMetrics metrics = getOrCreateMetrics(callId);
        
        // Compute STT usage (estimate seconds from audio bytes)
        // Approximate: 1 second of audio ≈ 16KB at 8kHz mono, 32KB at 16kHz
        int estimatedSttSeconds = Math.max(1, audioInBytes / 16000);
        metrics.sttSeconds += estimatedSttSeconds;
        
        // Track LLM usage from result metadata
        metrics.llmTokensIn += llmResult.getTokensIn();
        metrics.llmTokensOut += llmResult.getTokensOut();
        
        // Track TTS usage (characters from text length)
        metrics.ttsCharacters += llmResult.getText().length();
        
        logger.debug("Recorded usage for callId: {}", callId);
        logger.debug("  STT seconds: +{}", estimatedSttSeconds);
        logger.debug("  LLM tokens in: +{}", llmResult.getTokensIn());
        logger.debug("  LLM tokens out: +{}", llmResult.getTokensOut());
        logger.debug("  TTS characters: +{}", llmResult.getText().length());

        // Emit usage update to Node backend (async if configured)
        if ("http".equals(usageConfig.getReportingMode())) {
            if (usageConfig.isAsyncReporting()) {
                emitUsageUpdateAsync(callId, metrics);
            } else {
                emitUsageUpdate(callId, metrics);
            }
        }
        // TODO: Add Kafka/Redis event emission for other modes
    }

    /**
     * Emit usage update to Node backend (synchronous)
     */
    private void emitUsageUpdate(String callId, UsageMetrics metrics) {
        try {
            UsageUpdate update = buildUsageUpdate(callId, metrics);
            usageMetricsClient.postUsageMetrics(update);
        } catch (Exception e) {
            System.err.println("Failed to emit usage update: " + e.getMessage());
        }
    }

    /**
     * Emit usage update to Node backend (asynchronous)
     */
    @Async
    private void emitUsageUpdateAsync(String callId, UsageMetrics metrics) {
        emitUsageUpdate(callId, metrics);
    }

    /**
     * Build usage update payload
     */
    private UsageUpdate buildUsageUpdate(String callId, UsageMetrics metrics) {
        UsageUpdate update = new UsageUpdate(callId);
        update.setCustomerId(metrics.customerId);
        update.setSttSeconds(metrics.sttSeconds);
        update.setTtsCharacters(metrics.ttsCharacters);
        update.setLlmTokensIn(metrics.llmTokensIn);
        update.setLlmTokensOut(metrics.llmTokensOut);
        update.setProvider("va-service");
        
        // Calculate cost estimate
        double cost = usageConfig.calculateCost(
            metrics.sttSeconds,
            metrics.ttsCharacters,
            metrics.llmTokensIn,
            metrics.llmTokensOut
        );
        update.setCostEstimate(cost);
        
        return update;
    }

    /**
     * Track STT usage
     */
    public void trackSttUsage(String callId, int audioBytes) {
        UsageMetrics metrics = getOrCreateMetrics(callId);
        // Approximate: 1 second of audio ≈ 16KB at 8kHz mono
        int estimatedSeconds = audioBytes / 16000;
        metrics.sttSeconds += Math.max(1, estimatedSeconds);
    }

    /**
     * Track LLM usage
     */
    public void trackLlmUsage(String callId, int tokensIn, int tokensOut) {
        UsageMetrics metrics = getOrCreateMetrics(callId);
        metrics.llmTokensIn += tokensIn;
        metrics.llmTokensOut += tokensOut;
    }

    /**
     * Track TTS usage
     */
    public void trackTtsUsage(String callId, int characters) {
        UsageMetrics metrics = getOrCreateMetrics(callId);
        metrics.ttsCharacters += characters;
    }

    /**
     * Get usage metrics for a call
     */
    public UsageMetrics getMetrics(String callId) {
        return usageStore.get(callId);
    }

    /**
     * Finalize and persist metrics (call when session ends)
     * Emit events to queue or direct API call to Node for:
     * - Updating assistant_calls.usage
     * - Updating subscriptions.usage for billing
     */
    public void finalizeMetrics(String callId) {
        UsageMetrics metrics = usageStore.remove(callId);
        if (metrics != null) {
            logger.info("Finalized metrics for callId: {}", callId);
            logger.info("  STT seconds: {}", metrics.sttSeconds);
            logger.info("  TTS characters: {}", metrics.ttsCharacters);
            logger.info("  LLM tokens in: {}", metrics.llmTokensIn);
            logger.info("  LLM tokens out: {}", metrics.llmTokensOut);
            
            // Calculate and log cost
            double cost = usageConfig.calculateCost(
                metrics.sttSeconds,
                metrics.ttsCharacters,
                metrics.llmTokensIn,
                metrics.llmTokensOut
            );
            logger.info("  Estimated cost: ${}", "%.4f".formatted(cost));

            // Final usage push to Node backend
            if ("http".equals(usageConfig.getReportingMode())) {
                UsageUpdate update = buildUsageUpdate(callId, metrics);
                usageMetricsClient.postUsageMetrics(update);
            }
            // TODO: Emit Kafka/Redis event for other reporting modes
        }
    }

    private UsageMetrics getOrCreateMetrics(String callId) {
        return usageStore.computeIfAbsent(callId, k -> new UsageMetrics());
    }

    /**
     * Set customer ID for a call (used for billing)
     */
    public void setCustomerId(String callId, String customerId) {
        UsageMetrics metrics = usageStore.get(callId);
        if (metrics != null) {
            metrics.customerId = customerId;
        }
    }

    /**
     * Usage metrics data class
     */
    public static class UsageMetrics {
        public String customerId;
        public int sttSeconds = 0;
        public int ttsCharacters = 0;
        public int llmTokensIn = 0;
        public int llmTokensOut = 0;
    }
}
