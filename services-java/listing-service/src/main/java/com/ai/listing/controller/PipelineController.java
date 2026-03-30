package com.ai.listing.controller;

import com.ai.listing.model.DataStoreConfig;
import com.ai.listing.model.PipelineRun;
import com.ai.listing.pipeline.ListingPipelineOrchestrator;
import com.ai.listing.repository.PipelineRunRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Pipeline REST controller.
 *
 * Endpoints:
 *   POST /api/pipeline/start                      — start a new pipeline run
 *   GET  /api/pipeline/{runId}/status             — poll run status
 *   POST /api/pipeline/{runId}/review/1           — submit review gate 1 (after Auto-Fill)
 *   POST /api/pipeline/{runId}/review/2           — submit review gate 2 (after Compliance)
 *   GET  /api/pipeline/pending                    — list all runs paused at a review gate
 */
@RestController
@RequestMapping("/api/pipeline")
public class PipelineController {

    private static final Logger logger = LogManager.getLogger(PipelineController.class);

    @Autowired
    private ListingPipelineOrchestrator orchestrator;

    @Autowired
    private PipelineRunRepository pipelineRunRepository;

    /**
     * Start a new pipeline run.
     *
     * Request body:
     * {
     *   "listingId": "...",
     *   "photos": [{ "photoId": "...", "originalPath": "...", ... }],
     *   "initialFields": { "address": "...", "price": 500000, ... },
     *   "datastoreConfig": { "type": "MONGODB" }
     * }
     */
    @PostMapping("/start")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> startPipeline(@RequestBody Map<String, Object> body,
                                            @RequestHeader("X-Tenant-Id") String tenantId) {
        String listingId = (String) body.get("listingId");
        List<Map<String, Object>> photos = (List<Map<String, Object>>) body.get("photos");
        Map<String, Object> initialFields = (Map<String, Object>) body.get("initialFields");

        DataStoreConfig storeConfig = new DataStoreConfig();
        if (body.get("datastoreConfig") instanceof Map<?, ?> cfg) {
            String type = (String) cfg.get("type");
            if (type != null) {
                try { storeConfig.setType(DataStoreConfig.StoreType.valueOf(type.toUpperCase())); }
                catch (IllegalArgumentException ignored) {}
            }
        }

        logger.info("[PipelineController] Starting pipeline — listingId={}, tenantId={}", listingId, tenantId);
        ListingPipelineOrchestrator.PipelineStartResult result =
                orchestrator.startPipeline(listingId, tenantId, photos, initialFields, storeConfig);

        return ResponseEntity.ok(Map.of(
                "runId", result.runId(),
                "status", result.status(),
                "message", "Pipeline started. Poll /api/pipeline/" + result.runId() + "/status for progress."
        ));
    }

    /**
     * Poll pipeline run status.
     */
    @GetMapping("/{runId}/status")
    public ResponseEntity<?> getStatus(@PathVariable String runId,
                                        @RequestHeader("X-Tenant-Id") String tenantId) {
        return pipelineRunRepository.findByRunId(runId)
                .map(run -> ResponseEntity.ok(Map.of(
                        "runId", run.getRunId(),
                        "listingId", run.getListingId(),
                        "status", run.getStatus(),
                        "pausedAt", run.getPausedAt() != null ? run.getPausedAt() : "",
                        "listingFields", run.getListingFields() != null ? run.getListingFields() : Map.of(),
                        "generatedCopy", run.getGeneratedCopy() != null ? run.getGeneratedCopy() : Map.of(),
                        "complianceReport", run.getComplianceReport() != null ? run.getComplianceReport() : Map.of(),
                        "errors", run.getErrors() != null ? run.getErrors() : List.of()
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Submit human review gate 1 — approve/edit listing fields, resume pipeline.
     *
     * Request body:
     * {
     *   "approved": true,
     *   "edits": { "bedrooms": 3, "address": "123 Main St" },
     *   "notes": "Corrected bedroom count"
     * }
     */
    @PostMapping("/{runId}/review/1")
    public ResponseEntity<?> submitReview1(@PathVariable String runId,
                                            @RequestBody Map<String, Object> review,
                                            @RequestHeader("X-Tenant-Id") String tenantId) {
        logger.info("[PipelineController] Review 1 submitted — runId={}", runId);
        orchestrator.resumeAfterReview1(runId, review);
        return ResponseEntity.ok(Map.of(
                "runId", runId,
                "message", "Review accepted. Pipeline resuming with Copywriter agent."
        ));
    }

    /**
     * Submit human review gate 2 — approve/edit generated copy, accept listing.
     *
     * Request body:
     * {
     *   "approved": true,
     *   "edits": { "mlsDescription": "Updated copy..." },
     *   "notes": "Shortened description"
     * }
     */
    @PostMapping("/{runId}/review/2")
    public ResponseEntity<?> submitReview2(@PathVariable String runId,
                                            @RequestBody Map<String, Object> review,
                                            @RequestHeader("X-Tenant-Id") String tenantId) {
        logger.info("[PipelineController] Review 2 submitted — runId={}", runId);
        orchestrator.resumeAfterReview2(runId, review);
        return ResponseEntity.ok(Map.of(
                "runId", runId,
                "message", "Review accepted. Results persisted to configured data store."
        ));
    }

    /**
     * List all runs currently paused at a human review gate for this tenant.
     */
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingReviews(@RequestHeader("X-Tenant-Id") String tenantId) {
        List<PipelineRun> pending = pipelineRunRepository
                .findByTenantIdAndPausedAtIsNotNull(tenantId);
        return ResponseEntity.ok(Map.of("pendingReviews", pending, "count", pending.size()));
    }
}
