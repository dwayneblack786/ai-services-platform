package com.ai.listing.agent;

import com.ai.listing.pipeline.ListingPipelineState;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.input.PromptTemplate;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Agent 4: AI Copywriter
 *
 * Uses LangChain4j + Claude to generate:
 * - MLS description (character-limit compliant)
 * - Headline and tagline
 * - Social media variants (Instagram, Facebook, LinkedIn)
 *
 * Respects the tone preference set in listing_fields (professional, luxury, conversational, etc.)
 *
 * TODO: Wire prompt templates. Currently returns placeholder copy.
 */
@Component
public class CopywriterAgent implements ListingAgent {

    private static final Logger logger = LogManager.getLogger(CopywriterAgent.class);

    @Autowired
    private ChatLanguageModel chatModel;

    @Override
    public String getName() { return "Copywriter"; }

    @Override
    @SuppressWarnings("unchecked")
    public ListingPipelineState execute(ListingPipelineState state) {
        Map<String, Object> fields = state.getListingFields();
        Map<String, Object> attrs = state.getPropertyAttributes();

        logger.info("[{}] Generating listing copy — runId={}", getName(), state.getRunId());

        Map<String, Object> copy = new HashMap<>();

        try {
            // TODO: Replace with structured prompt calls via LangChain4j
            // String mlsDesc = generateMlsDescription(fields, attrs);
            // String headline = generateHeadline(fields, attrs);
            // etc.

            copy.put("mlsDescription", null);       // TODO: Claude-generated MLS description
            copy.put("headline", null);              // TODO: Claude-generated headline
            copy.put("tagline", null);               // TODO: Claude-generated tagline
            copy.put("socialInstagram", null);       // TODO: Claude-generated Instagram caption
            copy.put("socialFacebook", null);        // TODO: Claude-generated Facebook post
            copy.put("socialLinkedin", null);        // TODO: Claude-generated LinkedIn post
            copy.put("modelUsed", "claude-sonnet-4-6");

        } catch (Exception e) {
            logger.error("[{}] Copy generation failed — runId={}: {}", getName(), state.getRunId(), e.getMessage(), e);
            state.addError("Copywriter failed: " + e.getMessage());
        }

        state.setGeneratedCopy(copy);
        state.setStatus("compliance");
        return state;
    }

    /**
     * Build the MLS description prompt context from listing fields and vision attributes.
     * Called once prompt templates are implemented.
     */
    private Map<String, Object> buildPromptContext(Map<String, Object> fields, Map<String, Object> attrs) {
        Map<String, Object> ctx = new HashMap<>();
        ctx.put("address", fields.getOrDefault("address", "this property"));
        ctx.put("bedrooms", fields.getOrDefault("bedrooms", ""));
        ctx.put("bathrooms", fields.getOrDefault("bathrooms", ""));
        ctx.put("sqft", fields.getOrDefault("sqft", ""));
        ctx.put("style", fields.getOrDefault("style", ""));
        ctx.put("condition", fields.getOrDefault("condition", ""));
        ctx.put("tone", fields.getOrDefault("tone", "professional"));
        ctx.put("features", fields.getOrDefault("features", List.of()));
        ctx.put("designStyles", attrs.getOrDefault("designStyles", List.of()));
        ctx.put("fixtures", attrs.getOrDefault("fixtures", List.of()));
        return ctx;
    }
}
