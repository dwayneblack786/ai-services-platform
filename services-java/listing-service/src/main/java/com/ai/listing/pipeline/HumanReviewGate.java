package com.ai.listing.pipeline;

import com.ai.listing.model.PipelineRun;
import com.ai.listing.repository.PipelineRunRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

/**
 * Manages human review gate pause and resume logic.
 *
 * Pause: serializes pipeline state to MongoDB, sets pausedAt field.
 * Resume: reloads state from MongoDB, applies human edits, returns state for pipeline to continue.
 */
@Component
public class HumanReviewGate {

    private static final Logger logger = LogManager.getLogger(HumanReviewGate.class);

    @Autowired
    private PipelineRunRepository pipelineRunRepository;

    @Value("${listing.pipeline.review-timeout-hours:72}")
    private int reviewTimeoutHours;

    /**
     * Pause at review gate 1 (after Auto-Fill).
     * Persists current state so the server can handle a restart.
     */
    public void pauseAtReview1(ListingPipelineState state) {
        logger.info("[HumanReviewGate] Pausing at review_1 — runId={}", state.getRunId());
        state.setStatus("review_1");
        state.setPausedAt("review_1");
        persistState(state);
    }

    /**
     * Pause at review gate 2 (after Compliance).
     */
    public void pauseAtReview2(ListingPipelineState state) {
        logger.info("[HumanReviewGate] Pausing at review_2 — runId={}", state.getRunId());
        state.setStatus("review_2");
        state.setPausedAt("review_2");
        persistState(state);
    }

    /**
     * Resume after review gate 1 — apply human edits to listing fields.
     *
     * @param runId   Pipeline run ID
     * @param review  Human review payload: { approved, edits: { field: value }, notes }
     * @return Updated pipeline state ready to continue from Copywriter
     */
    public ListingPipelineState resumeAfterReview1(String runId, Map<String, Object> review) {
        ListingPipelineState state = loadState(runId);
        logger.info("[HumanReviewGate] Resuming after review_1 — runId={}, approved={}",
                runId, review.get("approved"));

        // Apply user edits to listing fields
        if (review.get("edits") instanceof Map<?, ?> edits) {
            Map<String, Object> updatedFields = new java.util.HashMap<>(state.getListingFields());
            edits.forEach((k, v) -> updatedFields.put(k.toString(), v));
            state.setListingFields(updatedFields);
        }

        state.setHumanReview1(review);
        state.setPausedAt(null);
        state.setStatus("copywriter");
        persistState(state);
        return state;
    }

    /**
     * Resume after review gate 2 — apply human edits to generated copy.
     *
     * @param runId   Pipeline run ID
     * @param review  Human review payload: { approved, edits: { field: value }, notes }
     * @return Updated pipeline state ready to persist accepted results
     */
    public ListingPipelineState resumeAfterReview2(String runId, Map<String, Object> review) {
        ListingPipelineState state = loadState(runId);
        logger.info("[HumanReviewGate] Resuming after review_2 — runId={}, approved={}",
                runId, review.get("approved"));

        // Apply user edits to generated copy
        if (review.get("edits") instanceof Map<?, ?> edits) {
            Map<String, Object> updatedCopy = new java.util.HashMap<>(
                    state.getGeneratedCopy() != null ? state.getGeneratedCopy() : new java.util.HashMap<>());
            edits.forEach((k, v) -> updatedCopy.put(k.toString(), v));
            state.setGeneratedCopy(updatedCopy);
        }

        state.setHumanReview2(review);
        state.setPausedAt(null);
        state.setStatus("accepted");
        persistState(state);
        return state;
    }

    private void persistState(ListingPipelineState state) {
        PipelineRun run = pipelineRunRepository.findByRunId(state.getRunId())
                .orElse(new PipelineRun());

        run.setRunId(state.getRunId());
        run.setTenantId(state.getTenantId());
        run.setListingId(state.getListingId());
        run.setStatus(state.getStatus());
        run.setPausedAt(state.getPausedAt());
        run.setPhotos(state.getPhotos());
        run.setVisionResults(state.getVisionResults());
        run.setPropertyAttributes(state.getPropertyAttributes());
        run.setListingFields(state.getListingFields());
        run.setHumanReview1(state.getHumanReview1());
        run.setGeneratedCopy(state.getGeneratedCopy());
        run.setComplianceReport(state.getComplianceReport());
        run.setHumanReview2(state.getHumanReview2());
        run.setDatastoreConfig(state.getDatastoreConfig());
        run.setErrors(state.getErrors());
        run.setExpiresAt(Instant.now().plus(reviewTimeoutHours, ChronoUnit.HOURS));

        pipelineRunRepository.save(run);
    }

    private ListingPipelineState loadState(String runId) {
        PipelineRun run = pipelineRunRepository.findByRunId(runId)
                .orElseThrow(() -> new IllegalArgumentException("Pipeline run not found: " + runId));

        ListingPipelineState state = new ListingPipelineState();
        state.setRunId(run.getRunId());
        state.setTenantId(run.getTenantId());
        state.setListingId(run.getListingId());
        state.setStatus(run.getStatus());
        state.setPausedAt(run.getPausedAt());
        state.setPhotos(run.getPhotos() != null ? run.getPhotos() : new java.util.ArrayList<>());
        state.setVisionResults(run.getVisionResults() != null ? run.getVisionResults() : new java.util.ArrayList<>());
        state.setPropertyAttributes(run.getPropertyAttributes() != null ? run.getPropertyAttributes() : new java.util.HashMap<>());
        state.setListingFields(run.getListingFields() != null ? run.getListingFields() : new java.util.HashMap<>());
        state.setHumanReview1(run.getHumanReview1());
        state.setGeneratedCopy(run.getGeneratedCopy());
        state.setComplianceReport(run.getComplianceReport());
        state.setHumanReview2(run.getHumanReview2());
        state.setDatastoreConfig(run.getDatastoreConfig());
        state.setErrors(run.getErrors() != null ? run.getErrors() : new java.util.ArrayList<>());
        return state;
    }
}
