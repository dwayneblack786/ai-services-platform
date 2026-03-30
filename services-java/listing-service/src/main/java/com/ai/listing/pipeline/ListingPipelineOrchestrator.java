package com.ai.listing.pipeline;

import com.ai.listing.agent.*;
import com.ai.listing.datastore.DataStore;
import com.ai.listing.datastore.DataStoreFactory;
import com.ai.listing.model.DataStoreConfig;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Sequential pipeline orchestrator for the ListingLift multi-agent workflow.
 *
 * Pipeline order:
 *   Ingest → Vision → AutoFill → [HUMAN REVIEW 1] → Copywriter → Compliance → [HUMAN REVIEW 2] → Accept & Store
 *
 * At each human review gate, the pipeline pauses — state is persisted to MongoDB.
 * The pipeline resumes when the user submits their review via the REST API.
 *
 * Agents are injected as Spring beans. To add a new agent, implement ListingAgent
 * and register it in the appropriate pipeline position here.
 */
@Service
public class ListingPipelineOrchestrator {

    private static final Logger logger = LogManager.getLogger(ListingPipelineOrchestrator.class);

    @Autowired private IngestAgent ingestAgent;
    @Autowired private VisionAgent visionAgent;
    @Autowired private AutoFillAgent autoFillAgent;
    @Autowired private CopywriterAgent copywriterAgent;
    @Autowired private ComplianceAgent complianceAgent;
    @Autowired private HumanReviewGate reviewGate;
    @Autowired private DataStoreFactory dataStoreFactory;

    /**
     * Start a new pipeline run for a listing.
     * Runs Ingest → Vision → AutoFill, then pauses at review gate 1.
     *
     * @param listingId     Platform listing ID
     * @param tenantId      Tenant ID
     * @param photos        Raw photo data (paths, sizes, etc.)
     * @param initialFields Any fields already provided by the user
     * @param storeConfig   Tenant's configured data store
     * @return PipelineStartResult containing the runId for polling/resuming
     */
    public PipelineStartResult startPipeline(String listingId, String tenantId,
                                              List<Map<String, Object>> photos,
                                              Map<String, Object> initialFields,
                                              DataStoreConfig storeConfig) {
        String runId = UUID.randomUUID().toString();
        logger.info("[Orchestrator] Starting pipeline — listingId={}, tenantId={}, runId={}", listingId, tenantId, runId);

        ListingPipelineState state = new ListingPipelineState(listingId, tenantId, runId, photos, storeConfig);
        if (initialFields != null) {
            state.setListingFields(new java.util.HashMap<>(initialFields));
        }

        // Run pre-review agents async so the HTTP response returns immediately with runId
        CompletableFuture.runAsync(() -> runPreReviewAgents(state));

        return new PipelineStartResult(runId, "ingest");
    }

    /**
     * Resume pipeline after human review gate 1.
     * Runs Copywriter → Compliance, then pauses at review gate 2.
     */
    public void resumeAfterReview1(String runId, Map<String, Object> review) {
        logger.info("[Orchestrator] Resuming after review_1 — runId={}", runId);
        ListingPipelineState state = reviewGate.resumeAfterReview1(runId, review);
        CompletableFuture.runAsync(() -> runPostReview1Agents(state));
    }

    /**
     * Resume pipeline after human review gate 2 — persist accepted results.
     */
    public void resumeAfterReview2(String runId, Map<String, Object> review) {
        logger.info("[Orchestrator] Resuming after review_2 — runId={}", runId);
        ListingPipelineState state = reviewGate.resumeAfterReview2(runId, review);
        CompletableFuture.runAsync(() -> persistAcceptedResults(state));
    }

    // --- Private pipeline segments ---

    private void runPreReviewAgents(ListingPipelineState state) {
        try {
            state = runAgent(ingestAgent, state);
            state = runAgent(visionAgent, state);
            state = runAgent(autoFillAgent, state);
            reviewGate.pauseAtReview1(state);
            logger.info("[Orchestrator] Paused at review_1 — runId={}", state.getRunId());
        } catch (Exception e) {
            logger.error("[Orchestrator] Pipeline failed before review_1 — runId={}: {}", state.getRunId(), e.getMessage(), e);
            state.addError("Pipeline failed: " + e.getMessage());
            state.setStatus("failed");
            reviewGate.pauseAtReview1(state);  // persist failed state
        }
    }

    private void runPostReview1Agents(ListingPipelineState state) {
        try {
            state = runAgent(copywriterAgent, state);
            state = runAgent(complianceAgent, state);
            reviewGate.pauseAtReview2(state);
            logger.info("[Orchestrator] Paused at review_2 — runId={}", state.getRunId());
        } catch (Exception e) {
            logger.error("[Orchestrator] Pipeline failed before review_2 — runId={}: {}", state.getRunId(), e.getMessage(), e);
            state.addError("Pipeline failed: " + e.getMessage());
            state.setStatus("failed");
            reviewGate.pauseAtReview2(state);
        }
    }

    private void persistAcceptedResults(ListingPipelineState state) {
        try {
            DataStore store = dataStoreFactory.getDataStore(state.getDatastoreConfig());
            Map<String, Object> acceptedData = buildAcceptedData(state);
            store.saveListing(state.getTenantId(), state.getListingId(), acceptedData);
            logger.info("[Orchestrator] Accepted results persisted — listingId={}, runId={}", state.getListingId(), state.getRunId());
        } catch (Exception e) {
            logger.error("[Orchestrator] Failed to persist accepted results — runId={}: {}", state.getRunId(), e.getMessage(), e);
        }
    }

    private ListingPipelineState runAgent(ListingAgent agent, ListingPipelineState state) {
        logger.info("[Orchestrator] Running agent: {} — runId={}", agent.getName(), state.getRunId());
        ListingPipelineState result = agent.execute(state);
        logger.info("[Orchestrator] Agent {} complete — status={} — runId={}", agent.getName(), result.getStatus(), result.getRunId());
        return result;
    }

    private Map<String, Object> buildAcceptedData(ListingPipelineState state) {
        Map<String, Object> data = new java.util.HashMap<>();
        data.put("listingId", state.getListingId());
        data.put("tenantId", state.getTenantId());
        data.put("runId", state.getRunId());
        data.put("listingFields", state.getListingFields());
        data.put("visionAttributes", state.getPropertyAttributes());
        data.put("generatedCopy", state.getGeneratedCopy());
        data.put("complianceReport", state.getComplianceReport());
        data.put("humanReview1", state.getHumanReview1());
        data.put("humanReview2", state.getHumanReview2());
        data.put("acceptedAt", java.time.Instant.now().toString());
        return data;
    }

    public record PipelineStartResult(String runId, String status) {}
}
