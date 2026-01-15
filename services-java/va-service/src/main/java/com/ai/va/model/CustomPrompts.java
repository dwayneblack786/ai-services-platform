package com.ai.va.model;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Custom Prompts Configuration
 * Supports structured prompt templates and safety constraints
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class CustomPrompts {

	private String systemPrompt;  // Main system prompt override
	private String greeting;
	private Map<String, String> intentPrompts;  // Per-intent custom prompts
	private String fallbackMessage;
	private String closingMessage;

	// === SAFETY & COMPLIANCE CONSTRAINTS ===
	private List<String> prohibitedTopics;  // Topics to refuse discussion
	private List<String> complianceRules;  // HIPAA, GDPR, industry-specific
	private String privacyPolicy;  // How to handle PII
	private Boolean requireConsent;  // Require user consent for data collection
	private String escalationPolicy;  // When and how to escalate
	private List<String> sensitiveDataHandling;  // Rules for SSN, credit cards, etc.
	private Integer maxConversationTurns;  // Auto-escalate after X turns
	private Boolean logConversations;  // Whether to log for compliance

	public CustomPrompts() {
	}

	// === GETTERS AND SETTERS ===

	/**
	 * Build safety and compliance constraints section
	 */
	public String buildConstraintsSection() {
		StringBuilder sb = new StringBuilder();
		sb.append("IMPORTANT SAFETY CONSTRAINTS:\n");

		if (prohibitedTopics != null && !prohibitedTopics.isEmpty()) {
			List<String> validTopics = prohibitedTopics.stream()
					.filter(topic -> topic != null && !topic.trim().isEmpty())
					.collect(java.util.stream.Collectors.toList());
			if (!validTopics.isEmpty()) {
				sb.append("- NEVER discuss these topics: ").append(String.join(", ", validTopics)).append("\n");
			}
		} else {
			sb.append("- Do not provide medical, legal, or financial advice.\n");
		}

		if (complianceRules != null && !complianceRules.isEmpty()) {
			sb.append("- Compliance requirements:\n");
			for (String rule : complianceRules) {
				if (rule != null && !rule.trim().isEmpty()) {
					sb.append("  * ").append(rule).append("\n");
				}
			}
		}

		if (privacyPolicy != null && !privacyPolicy.trim().isEmpty()) {
			sb.append("- Privacy: ").append(privacyPolicy).append("\n");
		} else {
			sb.append("- Respect user privacy and handle all data responsibly.\n");
		}

		if (sensitiveDataHandling != null && !sensitiveDataHandling.isEmpty()) {
			sb.append("- When handling sensitive data:\n");
			for (String rule : sensitiveDataHandling) {
				if (rule != null && !rule.trim().isEmpty()) {
					sb.append("  * ").append(rule).append("\n");
				}
			}
		}

		if (escalationPolicy != null && !escalationPolicy.trim().isEmpty()) {
			sb.append("- Escalation: ").append(escalationPolicy).append("\n");
		}

		if (maxConversationTurns != null && maxConversationTurns > 0) {
			sb.append("- Auto-escalate after ").append(maxConversationTurns).append(" conversation turns.\n");
		}

		sb.append("- If unsure or unable to help, politely escalate to a human agent.\n");

		return sb.toString();
	}
	public String getClosingMessage() { return closingMessage; }

	public List<String> getComplianceRules() { return complianceRules; }
	public String getEscalationPolicy() { return escalationPolicy; }

	public String getFallbackMessage() { return fallbackMessage; }
	public String getGreeting() { return greeting; }

	public Map<String, String> getIntentPrompts() { return intentPrompts; }
	public Boolean getLogConversations() { return logConversations; }

	public Integer getMaxConversationTurns() { return maxConversationTurns; }
	public String getPrivacyPolicy() { return privacyPolicy; }

	public List<String> getProhibitedTopics() { return prohibitedTopics; }
	public Boolean getRequireConsent() { return requireConsent; }

	public List<String> getSensitiveDataHandling() { return sensitiveDataHandling; }
	public String getSystemPrompt() { return systemPrompt; }

	public void setClosingMessage(String closingMessage) { this.closingMessage = closingMessage; }
	public void setComplianceRules(List<String> complianceRules) { this.complianceRules = complianceRules; }

	public void setEscalationPolicy(String escalationPolicy) { this.escalationPolicy = escalationPolicy; }
	public void setFallbackMessage(String fallbackMessage) { this.fallbackMessage = fallbackMessage; }

	public void setGreeting(String greeting) { this.greeting = greeting; }
	public void setIntentPrompts(Map<String, String> intentPrompts) { this.intentPrompts = intentPrompts; }

	public void setLogConversations(Boolean logConversations) { this.logConversations = logConversations; }
	public void setMaxConversationTurns(Integer maxConversationTurns) { this.maxConversationTurns = maxConversationTurns; }

	public void setPrivacyPolicy(String privacyPolicy) { this.privacyPolicy = privacyPolicy; }
	public void setProhibitedTopics(List<String> prohibitedTopics) { this.prohibitedTopics = prohibitedTopics; }

	public void setRequireConsent(Boolean requireConsent) { this.requireConsent = requireConsent; }
	public void setSensitiveDataHandling(List<String> sensitiveDataHandling) { this.sensitiveDataHandling = sensitiveDataHandling; }

	public void setSystemPrompt(String systemPrompt) { this.systemPrompt = systemPrompt; }

	@Override
	public String toString() {
		return "CustomPrompts{" +
				"hasSystemPrompt=" + (systemPrompt != null && !systemPrompt.isEmpty()) +
				", hasGreeting=" + (greeting != null && !greeting.isEmpty()) +
				", intentPromptsCount=" + (intentPrompts != null ? intentPrompts.size() : 0) +
				", prohibitedTopicsCount=" + (prohibitedTopics != null ? prohibitedTopics.size() : 0) +
				", complianceRulesCount=" + (complianceRules != null ? complianceRules.size() : 0) +
				'}';
	}
}
