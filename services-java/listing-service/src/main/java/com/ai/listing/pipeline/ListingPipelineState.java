package com.ai.listing.pipeline;

import com.ai.listing.model.DataStoreConfig;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Shared mutable state passed through every agent in the pipeline.
 * Agents read from this state and write their outputs back into it.
 * The orchestrator persists this to MongoDB at each review gate.
 */
public class ListingPipelineState {

    // Identity
    private String listingId;
    private String tenantId;
    private String runId;

    // Agent 1: Ingest outputs
    private List<Map<String, Object>> photos = new ArrayList<>();

    // Agent 2: Vision outputs
    private List<Map<String, Object>> visionResults = new ArrayList<>();
    private Map<String, Object> propertyAttributes = new HashMap<>();

    // Agent 3: Auto-Fill outputs
    private Map<String, Object> listingFields = new HashMap<>();

    // Human review gate 1 (after Auto-Fill)
    private Map<String, Object> humanReview1;

    // Agent 4: Copywriter outputs
    private Map<String, Object> generatedCopy;

    // Agent 5: Compliance outputs
    private Map<String, Object> complianceReport;

    // Human review gate 2 (after Compliance)
    private Map<String, Object> humanReview2;

    // Pipeline control
    private String status = "ingest";
    private String pausedAt;
    private List<String> errors = new ArrayList<>();

    // Data store config (per-tenant)
    private DataStoreConfig datastoreConfig;

    public ListingPipelineState() {}

    public ListingPipelineState(String listingId, String tenantId, String runId,
                                 List<Map<String, Object>> initialPhotos,
                                 DataStoreConfig datastoreConfig) {
        this.listingId = listingId;
        this.tenantId = tenantId;
        this.runId = runId;
        this.photos = initialPhotos != null ? initialPhotos : new ArrayList<>();
        this.datastoreConfig = datastoreConfig;
    }

    public void addError(String error) {
        this.errors.add(error);
    }

    // Getters and setters
    public String getListingId() { return listingId; }
    public void setListingId(String listingId) { this.listingId = listingId; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }

    public List<Map<String, Object>> getPhotos() { return photos; }
    public void setPhotos(List<Map<String, Object>> photos) { this.photos = photos; }

    public List<Map<String, Object>> getVisionResults() { return visionResults; }
    public void setVisionResults(List<Map<String, Object>> visionResults) { this.visionResults = visionResults; }

    public Map<String, Object> getPropertyAttributes() { return propertyAttributes; }
    public void setPropertyAttributes(Map<String, Object> propertyAttributes) { this.propertyAttributes = propertyAttributes; }

    public Map<String, Object> getListingFields() { return listingFields; }
    public void setListingFields(Map<String, Object> listingFields) { this.listingFields = listingFields; }

    public Map<String, Object> getHumanReview1() { return humanReview1; }
    public void setHumanReview1(Map<String, Object> humanReview1) { this.humanReview1 = humanReview1; }

    public Map<String, Object> getGeneratedCopy() { return generatedCopy; }
    public void setGeneratedCopy(Map<String, Object> generatedCopy) { this.generatedCopy = generatedCopy; }

    public Map<String, Object> getComplianceReport() { return complianceReport; }
    public void setComplianceReport(Map<String, Object> complianceReport) { this.complianceReport = complianceReport; }

    public Map<String, Object> getHumanReview2() { return humanReview2; }
    public void setHumanReview2(Map<String, Object> humanReview2) { this.humanReview2 = humanReview2; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPausedAt() { return pausedAt; }
    public void setPausedAt(String pausedAt) { this.pausedAt = pausedAt; }

    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }

    public DataStoreConfig getDatastoreConfig() { return datastoreConfig; }
    public void setDatastoreConfig(DataStoreConfig datastoreConfig) { this.datastoreConfig = datastoreConfig; }
}
