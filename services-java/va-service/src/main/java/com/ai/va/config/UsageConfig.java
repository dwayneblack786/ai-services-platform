package com.ai.va.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Usage Service Configuration
 */
@Configuration
@ConfigurationProperties(prefix = "usage")
public class UsageConfig {
    
    private String reportingMode = "http"; // http, kafka, redis, disabled
    private String nodeBackendUrl = "http://localhost:5000";
    private boolean asyncReporting = true;
    private int batchSize = 1; // For batch reporting
    
    // Cost estimates (USD per unit)
    private double sttCostPerSecond = 0.006; // $0.006 per second
    private double ttsCostPerCharacter = 0.000016; // $0.016 per 1000 chars
    private double llmCostPerTokenIn = 0.00003; // $0.03 per 1000 tokens (GPT-4)
    private double llmCostPerTokenOut = 0.00006; // $0.06 per 1000 tokens

    public String getReportingMode() {
        return reportingMode;
    }

    public void setReportingMode(String reportingMode) {
        this.reportingMode = reportingMode;
    }

    public String getNodeBackendUrl() {
        return nodeBackendUrl;
    }

    public void setNodeBackendUrl(String nodeBackendUrl) {
        this.nodeBackendUrl = nodeBackendUrl;
    }

    public boolean isAsyncReporting() {
        return asyncReporting;
    }

    public void setAsyncReporting(boolean asyncReporting) {
        this.asyncReporting = asyncReporting;
    }

    public int getBatchSize() {
        return batchSize;
    }

    public void setBatchSize(int batchSize) {
        this.batchSize = batchSize;
    }

    public double getSttCostPerSecond() {
        return sttCostPerSecond;
    }

    public void setSttCostPerSecond(double sttCostPerSecond) {
        this.sttCostPerSecond = sttCostPerSecond;
    }

    public double getTtsCostPerCharacter() {
        return ttsCostPerCharacter;
    }

    public void setTtsCostPerCharacter(double ttsCostPerCharacter) {
        this.ttsCostPerCharacter = ttsCostPerCharacter;
    }

    public double getLlmCostPerTokenIn() {
        return llmCostPerTokenIn;
    }

    public void setLlmCostPerTokenIn(double llmCostPerTokenIn) {
        this.llmCostPerTokenIn = llmCostPerTokenIn;
    }

    public double getLlmCostPerTokenOut() {
        return llmCostPerTokenOut;
    }

    public void setLlmCostPerTokenOut(double llmCostPerTokenOut) {
        this.llmCostPerTokenOut = llmCostPerTokenOut;
    }

    /**
     * Calculate cost estimate for usage
     */
    public double calculateCost(int sttSeconds, int ttsCharacters, int llmTokensIn, int llmTokensOut) {
        double sttCost = sttSeconds * sttCostPerSecond;
        double ttsCost = ttsCharacters * ttsCostPerCharacter;
        double llmInCost = llmTokensIn * llmCostPerTokenIn;
        double llmOutCost = llmTokensOut * llmCostPerTokenOut;
        
        return sttCost + ttsCost + llmInCost + llmOutCost;
    }
}
