package com.ai.listing.agent;

import com.ai.listing.pipeline.ListingPipelineState;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Agent 1: Photo Ingestion
 *
 * Responsibilities:
 * - Validate images (format, size, corruption)
 * - Resize to DINOv2-compatible dimensions (518px min)
 * - Deduplicate via perceptual hash
 * - Assign stable photo IDs
 *
 * TODO: Implement full validation logic. Currently passes photos through with IDs assigned.
 */
@Component
public class IngestAgent implements ListingAgent {

    private static final Logger logger = LogManager.getLogger(IngestAgent.class);

    @Override
    public String getName() { return "Ingest"; }

    @Override
    public ListingPipelineState execute(ListingPipelineState state) {
        logger.info("[{}] Starting photo ingestion — runId={}, photos={}",
                getName(), state.getRunId(), state.getPhotos().size());

        List<Map<String, Object>> raw = state.getPhotos();
        List<Map<String, Object>> validated = new ArrayList<>();

        for (Map<String, Object> photo : raw) {
            String photoId = photo.containsKey("photoId")
                    ? (String) photo.get("photoId")
                    : UUID.randomUUID().toString();

            Map<String, Object> validatedPhoto = new java.util.HashMap<>(photo);
            validatedPhoto.put("photoId", photoId);
            validatedPhoto.put("isValid", true);
            validatedPhoto.put("validationErrors", List.of());
            // TODO: validatedPhoto.put("perceptualHash", computeHash(photo));
            // TODO: validatedPhoto.put("processedPath", resize(photo));

            validated.add(validatedPhoto);
        }

        logger.info("[{}] Validated {} photos — runId={}", getName(), validated.size(), state.getRunId());

        state.setPhotos(validated);
        state.setStatus("vision");
        return state;
    }
}
