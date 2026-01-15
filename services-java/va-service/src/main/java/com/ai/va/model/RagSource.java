package com.ai.va.model;

/**
 * RAG Source Definition
 * Represents a single internet source for RAG retrieval
 */
public class RagSource {
    
    private String url;
    private String type; // website, api, documentation
    private String description;
    private Integer refreshInterval; // in hours

    public RagSource() {
    }

    public RagSource(String url, String type) {
        this.url = url;
        this.type = type;
    }

    // Getters and Setters
    
    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getRefreshInterval() {
        return refreshInterval;
    }

    public void setRefreshInterval(Integer refreshInterval) {
        this.refreshInterval = refreshInterval;
    }

    @Override
    public String toString() {
        return "RagSource{" +
                "url='" + url + '\'' +
                ", type='" + type + '\'' +
                ", description='" + description + '\'' +
                '}';
    }
}
