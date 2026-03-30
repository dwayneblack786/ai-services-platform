package com.ai.listing.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Persisted pipeline run state — saved at review gate pauses so the server
 * can restart without losing progress. Completed runs are moved to pipeline_history.
 */
@Document(collection = "pipeline_runs")
public class PipelineRun {

    @Id
    private String id;

    @Indexed
    private String runId;

    @Indexed
    private String tenantId;

    @Indexed
    private String listingId;

    // Current pipeline stage
    private String status;       // ingest | vision | autofill | review_1 | copywriter | compliance | review_2 | accepted | failed
    private String pausedAt;     // "review_1" | "review_2" | null

    // Agent outputs — accumulated as pipeline progresses
    private List<Map<String, Object>> photos;
    private List<Map<String, Object>> visionResults;
    private Map<String, Object> propertyAttributes;
    private Map<String, Object> listingFields;
    private Map<String, Object> humanReview1;
    private Map<String, Object> generatedCopy;
    private Map<String, Object> complianceReport;
    private Map<String, Object> humanReview2;

    // Data store config for accepted results
    private DataStoreConfig datastoreConfig;

    private List<String> errors;

    private Instant createdAt;
    private Instant updatedAt;
    private Instant expiresAt;   // auto-expire paused runs

    public PipelineRun() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public String getListingId() { return listingId; }
    public void setListingId(String listingId) { this.listingId = listingId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; this.updatedAt = Instant.now(); }

    public String getPausedAt() { return pausedAt; }
    public void setPausedAt(String pausedAt) { this.pausedAt = pausedAt; }

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

    public DataStoreConfig getDatastoreConfig() { return datastoreConfig; }
    public void setDatastoreConfig(DataStoreConfig datastoreConfig) { this.datastoreConfig = datastoreConfig; }

    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
