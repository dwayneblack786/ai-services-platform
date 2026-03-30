package com.ai.listing.agent;

import com.ai.listing.pipeline.ListingPipelineState;
import dev.langchain4j.model.chat.ChatLanguageModel;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Agent 5: Fair Housing Act Compliance Check
 *
 * Uses LangChain4j + Claude to:
 * - Review all generated text for Fair Housing violations
 * - Flag prohibited terms (race, religion, national origin, sex, disability, familial status)
 * - Detect steering language
 * - Suggest fixes and produce cleaned copy
 *
 * TODO: Wire LangChain4j compliance prompt. Currently runs basic keyword scan only.
 */
@Component
public class ComplianceAgent implements ListingAgent {

    private static final Logger logger = LogManager.getLogger(ComplianceAgent.class);

    @Autowired
    private ChatLanguageModel chatModel;

    private static final List<String> PROHIBITED_TERMS = List.of(
            "whites only", "no children", "no kids", "adults only",
            "perfect for families", "ideal for couples", "handicap accessible"
    );

    @Override
    public String getName() { return "Compliance"; }

    @Override
    public ListingPipelineState execute(ListingPipelineState state) {
        Map<String, Object> copy = state.getGeneratedCopy();
        logger.info("[{}] Running Fair Housing compliance check — runId={}", getName(), state.getRunId());

        List<Map<String, Object>> issues = new ArrayList<>();

        // Collect all generated text for scanning
        String allText = buildTextBlock(copy).toLowerCase();

        // Basic prohibited-term scan (stub — TODO: replace with Claude compliance review)
        for (String term : PROHIBITED_TERMS) {
            if (allText.contains(term)) {
                Map<String, Object> issue = new HashMap<>();
                issue.put("textFragment", term);
                issue.put("reason", "Potentially prohibited language under Fair Housing Act");
                issue.put("severity", "error");
                issue.put("suggestedFix", null);   // TODO: Claude-suggested fix
                issues.add(issue);
            }
        }

        // TODO: Replace keyword scan with:
        // ComplianceResult result = runClaudeComplianceReview(copy);

        Map<String, Object> report = new HashMap<>();
        report.put("passed", issues.isEmpty());
        report.put("issues", issues);
        report.put("cleanedMlsDescription", copy != null ? copy.get("mlsDescription") : null);
        report.put("reviewedAt", Instant.now().toString());

        logger.info("[{}] Check complete — passed={}, issues={} — runId={}",
                getName(), issues.isEmpty(), issues.size(), state.getRunId());

        state.setComplianceReport(report);
        state.setStatus("review_2");
        return state;
    }

    private String buildTextBlock(Map<String, Object> copy) {
        if (copy == null) return "";
        StringBuilder sb = new StringBuilder();
        for (String key : List.of("mlsDescription", "headline", "tagline",
                "socialInstagram", "socialFacebook", "socialLinkedin")) {
            Object val = copy.get(key);
            if (val instanceof String s) sb.append(s).append(" ");
        }
        return sb.toString();
    }
}
