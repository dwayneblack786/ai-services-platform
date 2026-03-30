package com.ai.listing.agent;

import com.ai.listing.pipeline.ListingPipelineState;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Agent 3: Listing Auto-Fill
 *
 * Responsibilities:
 * - Map vision results to listing fields
 * - Infer room counts from detected room types
 * - Build feature list from materials/fixtures
 * - Determine primary design style
 * - Output: pre-populated ListingFields for human review gate 1
 */
@Component
public class AutoFillAgent implements ListingAgent {

    private static final Logger logger = LogManager.getLogger(AutoFillAgent.class);

    private static final Set<String> BEDROOM_ROOMS = Set.of("bedroom");
    private static final Set<String> BATHROOM_ROOMS = Set.of("bathroom");

    private static final Map<String, String> FLOORING_LABELS = Map.of(
            "hardwood", "Hardwood floors",
            "marble", "Marble flooring",
            "tile_ceramic", "Ceramic tile",
            "tile_porcelain", "Porcelain tile",
            "vinyl_plank", "Luxury vinyl plank",
            "carpet", "Carpet",
            "concrete", "Concrete floors",
            "natural_stone", "Natural stone flooring"
    );

    private static final Map<String, String> FIXTURE_LABELS = Map.of(
            "pendant_lights", "Pendant lighting",
            "recessed_lighting", "Recessed lighting",
            "stainless_appliances", "Stainless steel appliances",
            "exposed_beams", "Exposed beams",
            "crown_molding", "Crown molding",
            "freestanding_tub", "Freestanding soaking tub",
            "walk_in_shower", "Walk-in shower",
            "double_vanity", "Double vanity"
    );

    @Override
    public String getName() { return "AutoFill"; }

    @Override
    @SuppressWarnings("unchecked")
    public ListingPipelineState execute(ListingPipelineState state) {
        Map<String, Object> attrs = state.getPropertyAttributes();
        Map<String, Object> existing = state.getListingFields();

        logger.info("[{}] Filling listing fields — runId={}", getName(), state.getRunId());

        List<String> roomTypes = attrs.containsKey("roomTypes")
                ? (List<String>) attrs.get("roomTypes") : List.of();

        long bedroomCount = roomTypes.stream().filter(BEDROOM_ROOMS::contains).count();
        long bathroomCount = roomTypes.stream().filter(BATHROOM_ROOMS::contains).count();

        List<String> features = buildFeatureList(attrs);

        List<String> designStyles = attrs.containsKey("designStyles")
                ? (List<String>) attrs.get("designStyles") : List.of();
        String primaryStyle = designStyles.isEmpty() ? null : designStyles.get(0);

        Map<String, Object> fields = new HashMap<>(existing);
        // Auto-filled — only set if not already provided by user
        fields.putIfAbsent("address", null);
        fields.putIfAbsent("price", null);
        fields.putIfAbsent("sqft", null);
        fields.putIfAbsent("propertyType", null);
        fields.putIfAbsent("yearBuilt", null);
        fields.putIfAbsent("tone", "professional");

        if (bedroomCount > 0) fields.put("bedrooms", (int) bedroomCount);
        if (bathroomCount > 0) fields.put("bathrooms", (double) bathroomCount);
        fields.put("features", features);
        if (primaryStyle != null) fields.put("style", primaryStyle);
        if (attrs.get("overallCondition") != null) fields.put("condition", attrs.get("overallCondition"));

        logger.info("[{}] Fields populated — bedrooms={}, features={} — runId={}",
                getName(), fields.get("bedrooms"), features.size(), state.getRunId());

        state.setListingFields(fields);
        state.setStatus("review_1");
        return state;
    }

    @SuppressWarnings("unchecked")
    private List<String> buildFeatureList(Map<String, Object> attrs) {
        List<String> features = new ArrayList<>();

        List<String> flooring = attrs.containsKey("primaryFlooring")
                ? (List<String>) attrs.get("primaryFlooring") : List.of();
        flooring.forEach(f -> { if (FLOORING_LABELS.containsKey(f)) features.add(FLOORING_LABELS.get(f)); });

        String countertop = (String) attrs.get("primaryCountertop");
        if (countertop != null) {
            features.add(countertop.replace("_", " ").substring(0, 1).toUpperCase()
                    + countertop.replace("_", " ").substring(1) + " countertops");
        }

        List<String> fixtures = attrs.containsKey("fixtures")
                ? (List<String>) attrs.get("fixtures") : List.of();
        fixtures.forEach(f -> { if (FIXTURE_LABELS.containsKey(f)) features.add(FIXTURE_LABELS.get(f)); });

        return features;
    }
}
