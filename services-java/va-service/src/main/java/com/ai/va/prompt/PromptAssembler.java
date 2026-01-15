package com.ai.va.prompt;

import org.springframework.stereotype.Service;

import com.ai.va.model.ChannelConfiguration;
import com.ai.va.model.CustomPrompts;
import com.ai.va.model.PromptContext;
import com.ai.va.model.SessionState;

/**
 * Helper service that bridges between your existing configuration models
 * (PromptContext, CustomPrompts, ChannelConfiguration) and the PromptBuilder.
 *
 * This shows how to convert your rich configuration data into prompt strings.
 */
@Service
public class PromptAssembler {

	/**
	 * Overload for cases where RAG is not needed or disabled.
	 */
	public String assemblePrompt(ChannelConfiguration config, SessionState sessionState) {
		return assemblePrompt(config, sessionState, null);
	}

	/**
	 * Assembles a complete prompt using existing configuration and session state.
	 *
	 * @param config Channel configuration with prompt context and custom prompts
	 * @param sessionState Current conversation session with turns
	 * @param ragResults Optional RAG retrieval results
	 * @return Formatted prompt ready for LLM
	 */
	public String assemblePrompt(
			ChannelConfiguration config,
			SessionState sessionState,
			String ragResults) {

		PromptContext promptContext = config.getPromptContext();
		CustomPrompts customPrompts = config.getCustomPrompts();

		return new PromptBuilder()
				.withBusinessName(extractBusinessName(promptContext))
				.withIndustry(extractIndustry(promptContext))
				.withPersona(buildPersona(promptContext))
				.withStaticContext(buildStaticContext(promptContext))
				.withRagContext(ragResults)
				.withConstraints(buildConstraints(promptContext, customPrompts))
				.withChannel("chat") // Default to chat, override in service if needed
				.withSessionState(sessionState)
				.build();
	}

	private String buildConstraints(PromptContext ctx, CustomPrompts customPrompts) {
		StringBuilder sb = new StringBuilder();

		// Conversation behavior constraints from PromptContext
		if (ctx != null) {
			if (ctx.getMaxResponseLength() != null) {
				sb.append("Maximum response length: ").append(ctx.getMaxResponseLength()).append(" tokens\n");
			}

			if (ctx.getAskForNameFirst() != null && ctx.getAskForNameFirst()) {
				sb.append("Always ask for the customer's name at the start of conversation\n");
			}

			if (ctx.getConfirmBeforeActions() != null && ctx.getConfirmBeforeActions()) {
				sb.append("Always confirm before taking actions\n");
			}

			if (ctx.getEscalationTriggers() != null && !ctx.getEscalationTriggers().isEmpty()) {
				sb.append("Escalate to human if: ").append(String.join(", ", ctx.getEscalationTriggers())).append("\n");
			}

			if (ctx.getDefaultLanguage() != null) {
				sb.append("Default language: ").append(ctx.getDefaultLanguage()).append("\n");
			}
		}

		// Safety constraints from CustomPrompts
		if (customPrompts != null) {
			if (customPrompts.getProhibitedTopics() != null && !customPrompts.getProhibitedTopics().isEmpty()) {
				sb.append("\nProhibited topics: ").append(String.join(", ", customPrompts.getProhibitedTopics())).append("\n");
			}

			if (customPrompts.getComplianceRules() != null && !customPrompts.getComplianceRules().isEmpty()) {
				sb.append("\nCompliance rules:\n");
				customPrompts.getComplianceRules().forEach(rule -> sb.append("- ").append(rule).append("\n"));
			}

			if (customPrompts.getPrivacyPolicy() != null) {
				sb.append("\nPrivacy: ").append(customPrompts.getPrivacyPolicy()).append("\n");
			}

			if (customPrompts.getRequireConsent() != null && customPrompts.getRequireConsent()) {
				sb.append("Obtain explicit consent before collecting personal information\n");
			}

			if (customPrompts.getEscalationPolicy() != null) {
				sb.append("\nEscalation policy: ").append(customPrompts.getEscalationPolicy()).append("\n");
			}
		}

		return sb.toString().trim();
	}

	private String buildPersona(PromptContext ctx) {
		if (ctx == null) {
			return null;
		}

		StringBuilder sb = new StringBuilder();

		if (ctx.getPersonality() != null) {
			sb.append("Personality: ").append(ctx.getPersonality()).append("\n");
		}

		if (ctx.getTone() != null) {
			sb.append("Tone: ").append(ctx.getTone()).append("\n");
		}

		if (ctx.getAllowedActions() != null && !ctx.getAllowedActions().isEmpty()) {
			sb.append("You can: ").append(String.join(", ", ctx.getAllowedActions())).append("\n");
		}

		if (ctx.getDisallowedActions() != null && !ctx.getDisallowedActions().isEmpty()) {
			sb.append("You cannot: ").append(String.join(", ", ctx.getDisallowedActions())).append("\n");
		}

		return sb.toString().trim();
	}

	private String buildStaticContext(PromptContext ctx) {
		if (ctx == null) {
			return null;
		}

		StringBuilder sb = new StringBuilder();

		if (ctx.getServicesOffered() != null && !ctx.getServicesOffered().isEmpty()) {
			sb.append("Services:\n");
			ctx.getServicesOffered().forEach(s -> sb.append("- ").append(s).append("\n"));
			sb.append("\n");
		}

		if (ctx.getBusinessHours() != null) {
			sb.append("Business Hours: ").append(ctx.getBusinessHours()).append("\n\n");
		}

		if (ctx.getLocations() != null && !ctx.getLocations().isEmpty()) {
			sb.append("Locations:\n");
			ctx.getLocations().forEach(loc -> sb.append("- ").append(loc).append("\n"));
			sb.append("\n");
		}

		if (ctx.getPricingInfo() != null) {
			sb.append("Pricing:\n").append(ctx.getPricingInfo()).append("\n\n");
		}

		if (ctx.getPolicies() != null && !ctx.getPolicies().trim().isEmpty()) {
			sb.append("Policies:\n").append(ctx.getPolicies()).append("\n\n");
		}

		if (ctx.getFaqs() != null && !ctx.getFaqs().isEmpty()) {
			sb.append("Common Questions:\n");
			ctx.getFaqs().forEach(faq -> sb.append("- ").append(faq).append("\n"));
		}

		return sb.toString().trim();
	}

	private String extractBusinessName(PromptContext ctx) {
		if (ctx == null) {
			return null;
		}
		return ctx.getTenantName();
	}

	private String extractIndustry(PromptContext ctx) {
		if (ctx == null) {
			return null;
		}
		return ctx.getTenantIndustry();
	}
}
