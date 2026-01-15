package com.ai.va.service;

import com.ai.va.model.SessionState;
import com.ai.va.model.Turn;
import com.ai.va.model.SystemInstructions;
import com.ai.va.model.SlotValues;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Dialog Manager
 * Manages conversation context, intent detection, slot extraction, and structured prompts
 * Responsibilities:
 * - Maintain list of turns (caller/assistant)
 * - Clip history to last N turns for context
 * - Inject system instructions (industry, allowed actions, tone)
 * - Track detected intents
 * - Extract slot values (date, time, email, etc.)
 */
@Service
public class DialogManager {

    private static final Logger logger = LoggerFactory.getLogger(DialogManager.class);

    // Store context per callId (consider Redis for production)
    private final Map<String, Map<String, Object>> contextStore = new ConcurrentHashMap<>();

    // Intent patterns (can be replaced with ML-based NLU)
    private static final Map<String, Pattern> INTENT_PATTERNS = Map.of(
        "help_request", Pattern.compile("\\b(help|support|assist|problem|issue)\\b", Pattern.CASE_INSENSITIVE),
        "order_inquiry", Pattern.compile("\\b(order|purchase|buy|payment)\\b", Pattern.CASE_INSENSITIVE),
        "account_inquiry", Pattern.compile("\\b(account|billing|subscription|invoice)\\b", Pattern.CASE_INSENSITIVE),
        "appointment_request", Pattern.compile("\\b(appointment|schedule|booking|meeting)\\b", Pattern.CASE_INSENSITIVE),
        "transfer_request", Pattern.compile("\\b(transfer|human|representative|agent|person)\\b", Pattern.CASE_INSENSITIVE)
    );

    /**
     * Build structured prompt from session history and system instructions
     * Maintains list of turns, clips history to last N turns for context
     * Injects system instructions: industry, allowed actions, tone
     * Includes RAG sources and tenant-specific context
     */
    public String buildPrompt(SessionState state) {
        StringBuilder sb = new StringBuilder();
        
        // 1. System instructions
        SystemInstructions instructions = state.getSystemInstructions();
        if (instructions != null) {
            sb.append(instructions.buildSystemPrompt());
        } else {
            // Fallback to basic instructions
            sb.append("You are a phone assistant");
            if (state.getCustomerIndustry() != null) {
                sb.append(" for ").append(state.getCustomerIndustry());
            }
            sb.append(". Be concise and helpful.\n");
            sb.append("Keep your responses brief and natural for voice conversation.\n");
            sb.append("If you don't know something, politely say so.\n");
        }
        sb.append("\n");

        // 2. Add Prompt Context (Tenant-specific grounding data)
        if (state.getPromptContext() != null) {
            // Build structured sections from the enhanced PromptContext
            String roleSection = state.getPromptContext().buildRoleSection();
            if (roleSection != null && !roleSection.trim().isEmpty()) {
                sb.append("=== Your Role ===\n");
                sb.append(roleSection);
                sb.append("\n");
            }
            
            String businessContext = state.getPromptContext().buildBusinessContextSection();
            if (businessContext != null && !businessContext.trim().isEmpty()) {
                sb.append("=== Business Context ===\n");
                sb.append(businessContext);
                sb.append("\n");
            }
            
            String behavior = state.getPromptContext().buildBehaviorConstraints();
            if (behavior != null && !behavior.trim().isEmpty()) {
                sb.append("=== Conversation Guidelines ===\n");
                sb.append(behavior);
                sb.append("\n");
            }
            
            // Add multi-turn conversation strategy
            sb.append("=== ASKING CLARIFYING QUESTIONS ===\n");
            sb.append("When information is missing, ask for it immediately:\n");
            sb.append("- For location queries: Ask for their location/address in your first response\n");
            sb.append("- For specific services: Ask which service or location they're inquiring about\n");
            sb.append("- Gather ALL required information in as few turns as possible\n");
            sb.append("- Once you have details, provide a complete, specific answer\n");
            sb.append("\n");
        }

        // 3. Add RAG sources information if enabled
        if (state.getRagConfiguration() != null && state.getRagConfiguration().isEnabled()) {
            if (state.getRagConfiguration().getSources() != null && !state.getRagConfiguration().getSources().isEmpty()) {
                sb.append("=== Knowledge Sources ===\n");
                sb.append("You have access to the following internet sources for additional information:\n");
                
                state.getRagConfiguration().getSources().forEach(source -> {
                    sb.append("- ").append(source.getType()).append(": ").append(source.getUrl());
                    if (source.getDescription() != null && !source.getDescription().isEmpty()) {
                        sb.append(" (").append(source.getDescription()).append(")");
                    }
                    sb.append("\n");
                });
                
                sb.append("\nNote: When appropriate, you can reference information from these sources to provide accurate and up-to-date answers.\n");
                sb.append("\n");
            }
        }

        // 4. Add detected intent context
        if (state.getCurrentIntent() != null) {
            sb.append("Current intent: ").append(state.getCurrentIntent()).append("\n\n");
        }

        // 5. Add extracted slot values
        SlotValues slots = state.getSlotValues();
        if (slots != null && slots.size() > 0) {
            sb.append("Extracted information:\n");
            for (Map.Entry<String, Object> entry : slots.getAllSlots().entrySet()) {
                sb.append("- ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }
            sb.append("\n");
        }

        // 6. Add conversation history (last 6 turns for context)
        List<Turn> recentTurns = state.getRecentTurns(6);
        if (!recentTurns.isEmpty()) {
            sb.append("Conversation history:\n");
            for (Turn turn : recentTurns) {
                sb.append(turn.toPromptLine());
            }
        } else {
            sb.append("This is the start of the conversation.\n");
        }

        return sb.toString();
    }

    /**
     * Build context string from session history (legacy method)
     */
    public String buildContext(SessionState session) {
        List<Turn> turns = session.getTranscript();
        
        if (turns == null || turns.isEmpty()) {
            return "This is the start of the conversation.";
        }

        StringBuilder context = new StringBuilder();
        context.append("Conversation history:\n");
        
        // Include last N turns for context (e.g., last 10)
        int startIdx = Math.max(0, turns.size() - 10);
        for (int i = startIdx; i < turns.size(); i++) {
            Turn turn = turns.get(i);
            context.append(turn.getSpeaker()).append(": ").append(turn.getText()).append("\n");
        }

        return context.toString();
    }

    /**
     * Store context variable for a call
     */
    public void setContext(String callId, String key, Object value) {
        contextStore.computeIfAbsent(callId, k -> new ConcurrentHashMap<>()).put(key, value);
    }

    /**
     * Retrieve context variable
     */
    public Object getContext(String callId, String key) {
        Map<String, Object> context = contextStore.get(callId);
        return context != null ? context.get(key) : null;
    }

    /**
     * Clear all context for a call
     */
    public void clearContext(String callId) {
        contextStore.remove(callId);
    }

    /**
     * Detect intent from user input
     * Uses pattern matching (can be enhanced with ML-based NLU)
     */
    public String detectIntent(String userInput) {
        if (userInput == null || userInput.trim().isEmpty()) {
            return "unknown";
        }

        String normalizedInput = userInput.toLowerCase();
        
        // Check each intent pattern
        for (Map.Entry<String, Pattern> entry : INTENT_PATTERNS.entrySet()) {
            Matcher matcher = entry.getValue().matcher(normalizedInput);
            if (matcher.find()) {
                return entry.getKey();
            }
        }
        
        return "general_inquiry";
    }

    /**
     * Extract slot values from user input
     * Extracts: email, phone, date, time, name patterns
     */
    public void extractSlots(String userInput, SlotValues slots) {
        if (userInput == null || userInput.trim().isEmpty()) {
            return;
        }

        // Email extraction
        Pattern emailPattern = Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b");
        Matcher emailMatcher = emailPattern.matcher(userInput);
        if (emailMatcher.find()) {
            slots.setSlot("email", emailMatcher.group());
        }

        // Phone extraction (basic pattern)
        Pattern phonePattern = Pattern.compile("\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b");
        Matcher phoneMatcher = phonePattern.matcher(userInput);
        if (phoneMatcher.find()) {
            slots.setSlot("phone", phoneMatcher.group());
        }

        // Date extraction (basic patterns)
        Pattern datePattern = Pattern.compile("\\b(?:tomorrow|today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b", Pattern.CASE_INSENSITIVE);
        Matcher dateMatcher = datePattern.matcher(userInput);
        if (dateMatcher.find()) {
            slots.setSlot("date", dateMatcher.group().toLowerCase());
        }

        // Time extraction (basic patterns like "3pm", "3:30", "noon")
        Pattern timePattern = Pattern.compile("\\b(?:\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)|noon|midnight)\\b", Pattern.CASE_INSENSITIVE);
        Matcher timeMatcher = timePattern.matcher(userInput);
        if (timeMatcher.find()) {
            slots.setSlot("time", timeMatcher.group().toLowerCase());
        }

        // Number extraction (for quantities, amounts)
        Pattern numberPattern = Pattern.compile("\\b\\d+\\b");
        Matcher numberMatcher = numberPattern.matcher(userInput);
        if (numberMatcher.find()) {
            slots.setSlot("number", Integer.parseInt(numberMatcher.group()));
        }
    }

    /**
     * Process user input: detect intent and extract slots
     */
    public void processUserInput(SessionState state, String userInput) {
        // Detect intent
        String intent = detectIntent(userInput);
        state.setCurrentIntent(intent);

        // Extract slots
        extractSlots(userInput, state.getSlotValues());

        logger.debug("Detected intent: {}", intent);
        logger.debug("Extracted slots: {}", state.getSlotValues());
    }
}
