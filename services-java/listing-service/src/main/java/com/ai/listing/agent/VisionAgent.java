package com.ai.listing.agent;

import com.ai.listing.pipeline.ListingPipelineState;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

/**
 * Agent 2: PropVision Analysis
 *
 * Responsibilities:
 * - For each validated photo, call vision-server /analyze endpoint
 * - Classify: room_type, flooring, countertop, design_style, fixtures, materials, condition
 * - Aggregate per-photo results into a property-level attribute profile
 *
 * TODO: Implement HTTP calls to vision-server. Stub returns empty results.
 */
@Component
public class VisionAgent implements ListingAgent {

    private static final Logger logger = LogManager.getLogger(VisionAgent.class);

    @Value("${listing.vision-server-url:http://localhost:8001}")
    private String visionServerUrl;

    // WebClient initialized lazily to avoid startup failures if vision-server is offline
    private WebClient webClient;

    @Override
    public String getName() { return "Vision"; }

    @Override
    public ListingPipelineState execute(ListingPipelineState state) {
        List<Map<String, Object>> photos = state.getPhotos();
        logger.info("[{}] Analyzing {} photos — runId={}", getName(), photos.size(), state.getRunId());

        List<Map<String, Object>> visionResults = new ArrayList<>();

        for (Map<String, Object> photo : photos) {
            if (!Boolean.TRUE.equals(photo.get("isValid"))) continue;

            // TODO: Replace stub with vision-server HTTP call:
            // VisionResult result = callVisionServer(photo.get("processedPath").toString());
            Map<String, Object> result = new HashMap<>();
            result.put("photoId", photo.get("photoId"));
            result.put("roomType", null);          // TODO: from vision-server
            result.put("flooring", List.of());
            result.put("countertop", null);
            result.put("designStyle", List.of());
            result.put("fixtures", List.of());
            result.put("materials", List.of());
            result.put("condition", null);
            result.put("confidence", 0.0);

            visionResults.add(result);
        }

        Map<String, Object> propertyAttributes = aggregateAttributes(visionResults);

        logger.info("[{}] Analysis complete — runId={}", getName(), state.getRunId());

        state.setVisionResults(visionResults);
        state.setPropertyAttributes(propertyAttributes);
        state.setStatus("autofill");
        return state;
    }

    private Map<String, Object> aggregateAttributes(List<Map<String, Object>> results) {
        List<String> roomTypes = new ArrayList<>();
        List<String> allFlooring = new ArrayList<>();
        List<String> countertops = new ArrayList<>();
        List<String> designStyles = new ArrayList<>();
        List<String> allFixtures = new ArrayList<>();
        List<String> allMaterials = new ArrayList<>();
        List<String> conditions = new ArrayList<>();

        for (Map<String, Object> r : results) {
            if (r.get("roomType") != null) roomTypes.add((String) r.get("roomType"));
            if (r.get("flooring") instanceof List<?> f) f.forEach(v -> allFlooring.add(v.toString()));
            if (r.get("countertop") != null) countertops.add((String) r.get("countertop"));
            if (r.get("designStyle") instanceof List<?> d) d.forEach(v -> designStyles.add(v.toString()));
            if (r.get("fixtures") instanceof List<?> fx) fx.forEach(v -> allFixtures.add(v.toString()));
            if (r.get("materials") instanceof List<?> m) m.forEach(v -> allMaterials.add(v.toString()));
            if (r.get("condition") != null) conditions.add((String) r.get("condition"));
        }

        Map<String, Object> attrs = new HashMap<>();
        attrs.put("roomTypes", new ArrayList<>(new LinkedHashSet<>(roomTypes)));
        attrs.put("primaryFlooring", new ArrayList<>(new LinkedHashSet<>(allFlooring)));
        attrs.put("primaryCountertop", mode(countertops).orElse(null));
        attrs.put("designStyles", new ArrayList<>(new LinkedHashSet<>(designStyles)));
        attrs.put("fixtures", new ArrayList<>(new LinkedHashSet<>(allFixtures)));
        attrs.put("materials", new ArrayList<>(new LinkedHashSet<>(allMaterials)));
        attrs.put("overallCondition", mode(conditions).orElse(null));
        attrs.put("featureSummary", List.of());  // TODO: generate readable feature list
        return attrs;
    }

    private Optional<String> mode(List<String> list) {
        return list.stream()
                .collect(java.util.stream.Collectors.groupingBy(s -> s, Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey);
    }
}
