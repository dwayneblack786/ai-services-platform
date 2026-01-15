package com.ai.va.model;

import java.util.List;

/**
 * RAG (Retrieval Augmented Generation) Configuration
 * Defines internet sources for grounding AI responses
 */
public class RagConfiguration {
    
    private boolean enabled;
    private List<RagSource> sources;
    private Integer maxResults;
    private Double confidenceThreshold;

    public RagConfiguration() {
        this.enabled = false;
        this.maxResults = 5;
        this.confidenceThreshold = 0.7;
    }

    // Getters and Setters
    
    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public List<RagSource> getSources() {
        return sources;
    }

    public void setSources(List<RagSource> sources) {
        this.sources = sources;
    }

    public Integer getMaxResults() {
        return maxResults;
    }

    public void setMaxResults(Integer maxResults) {
        this.maxResults = maxResults;
    }

    public Double getConfidenceThreshold() {
        return confidenceThreshold;
    }

    public void setConfidenceThreshold(Double confidenceThreshold) {
        this.confidenceThreshold = confidenceThreshold;
    }

    @Override
    public String toString() {
        return "RagConfiguration{" +
                "enabled=" + enabled +
                ", sources=" + (sources != null ? sources.size() : 0) +
                ", maxResults=" + maxResults +
                ", confidenceThreshold=" + confidenceThreshold +
                '}';
    }
}
