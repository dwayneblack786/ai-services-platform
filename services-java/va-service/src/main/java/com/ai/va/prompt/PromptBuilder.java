package com.ai.va.prompt;

import com.ai.va.model.SessionState;
import com.ai.va.model.Turn;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Production-ready builder for assembling business-aware, multi-layered prompts.
 * 
 * Combines:
 * - Role/Persona
 * - Static Business Context
 * - RAG Knowledge
 * - Conversation Context
 * - Constraints/Guardrails
 * - Channel-specific settings (voice/chat)
 */
public class PromptBuilder {

    private String businessName;
    private String industry;
    private String persona;
    private String staticContext;
    private String ragContext;
    private String constraints;
    private String channel; // "voice" or "chat"

    private SessionState sessionState;

    public PromptBuilder withBusinessName(String businessName) {
        this.businessName = businessName;
        return this;
    }

    public PromptBuilder withIndustry(String industry) {
        this.industry = industry;
        return this;
    }

    public PromptBuilder withPersona(String persona) {
        this.persona = persona;
        return this;
    }

    public PromptBuilder withStaticContext(String staticContext) {
        this.staticContext = staticContext;
        return this;
    }

    public PromptBuilder withRagContext(String ragContext) {
        this.ragContext = ragContext;
        return this;
    }

    public PromptBuilder withConstraints(String constraints) {
        this.constraints = constraints;
        return this;
    }

    public PromptBuilder withChannel(String channel) {
        this.channel = channel;
        return this;
    }

    public PromptBuilder withSessionState(SessionState sessionState) {
        this.sessionState = sessionState;
        return this;
    }

    public String build() {
        return """
            You are a virtual assistant for %s, operating in the %s industry.

            ROLE / PERSONA:
            %s

            BUSINESS CONTEXT:
            %s

            RETRIEVED KNOWLEDGE (RAG):
            %s

            CONVERSATION CONTEXT:
            %s

            CHANNEL:
            %s

            CONSTRAINTS:
            %s

            Respond clearly, concisely, and professionally. If you are unsure, ask clarifying questions.
            """.formatted(
                safe(businessName),
                safe(industry),
                safe(persona),
                safe(staticContext),
                safe(ragContext),
                buildConversationContext(),
                safe(channel),
                safe(constraints)
        );
    }

    private String buildConversationContext() {
        if (sessionState == null) {
            return "No prior conversation.";
        }

        List<Turn> turns = sessionState.getRecentTurns(10);
        
        if (turns == null || turns.isEmpty()) {
            return "No prior conversation.";
        }

        return turns.stream()
                .map(t -> t.getSpeaker().toUpperCase() + ": " + t.getText())
                .collect(Collectors.joining("\n"));
    }

    private String safe(String value) {
        return value == null ? "Not provided." : value;
    }
}
