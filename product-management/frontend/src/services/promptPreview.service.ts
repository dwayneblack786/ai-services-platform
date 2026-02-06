/**
 * Prompt Preview Service (Phase 1.5)
 *
 * Assembles all 6 prompt layers into final markdown-formatted string.
 * Handles token counting for OpenAI and Claude models.
 * Provides formatting helpers for preview display.
 */

import { IPromptVersion } from './promptApi';
import { encoding_for_model } from 'tiktoken';

export class PromptPreviewService {
  /**
   * Assemble all 6 layers into final prompt string
   */
  static assemblePrompt(prompt: IPromptVersion): string {
    if (!prompt || !prompt.content) {
      return '';
    }

    const { content } = prompt;
    let assembled = '';

    // Header with prompt name
    assembled += `# ${prompt.name || 'Untitled Prompt'}\n\n`;

    // Layer 1: System Prompt
    if (content.systemPrompt) {
      assembled += content.systemPrompt + '\n\n';
    }

    // Layer 2: Persona
    if (content.persona) {
      assembled += '## Persona\n\n';
      if (content.persona.tone) {
        assembled += `- **Tone**: ${content.persona.tone}\n`;
      }
      if (content.persona.personality) {
        assembled += `- **Personality**: ${content.persona.personality}\n`;
      }
      if (content.persona.allowedActions && content.persona.allowedActions.length > 0) {
        assembled += '- **Allowed Actions**:\n';
        content.persona.allowedActions.forEach(action => {
          assembled += `  - ${action}\n`;
        });
      }
      if (content.persona.disallowedActions && content.persona.disallowedActions.length > 0) {
        assembled += '- **Disallowed Actions**:\n';
        content.persona.disallowedActions.forEach(action => {
          assembled += `  - ${action}\n`;
        });
      }
      assembled += '\n';
    }

    // Layer 3: Business Context
    if (content.businessContext) {
      assembled += '## Business Context\n\n';

      if (content.businessContext.servicesOffered && content.businessContext.servicesOffered.length > 0) {
        assembled += '### Services Offered\n';
        content.businessContext.servicesOffered.forEach(service => {
          assembled += `- ${service}\n`;
        });
        assembled += '\n';
      }

      if (content.businessContext.pricingInfo) {
        assembled += '### Pricing\n';
        assembled += content.businessContext.pricingInfo + '\n\n';
      }

      if (content.businessContext.locations && content.businessContext.locations.length > 0) {
        assembled += '### Locations\n';
        content.businessContext.locations.forEach(location => {
          assembled += `**${location.name}**\n`;
          if (location.address) assembled += `- Address: ${location.address}, ${location.city}\n`;
          if (location.phone) assembled += `- Phone: ${location.phone}\n`;
          if (location.hours) assembled += `- Hours: ${location.hours}\n`;
          assembled += '\n';
        });
      }

      if (content.businessContext.policies) {
        assembled += '### Policies\n';
        assembled += content.businessContext.policies + '\n\n';
      }

      if (content.businessContext.faqs && content.businessContext.faqs.length > 0) {
        assembled += '### FAQs\n';
        content.businessContext.faqs.forEach(faq => {
          assembled += `**Q: ${faq.question}**\n`;
          assembled += `A: ${faq.answer}\n\n`;
        });
      }
    }

    // Layer 4: RAG Configuration
    if (content.ragConfig && content.ragConfig.enabled) {
      assembled += '## Knowledge Sources (RAG)\n\n';
      assembled += '- **RAG Enabled**: Yes\n';
      if (content.ragConfig.vectorStore) {
        assembled += `- **Vector Store**: ${content.ragConfig.vectorStore.provider}\n`;
      }
      assembled += '\n';
    } else {
      assembled += '## Knowledge Sources (RAG)\n\n';
      assembled += '- **RAG Enabled**: No\n\n';
    }

    // Layer 5: Conversation Behavior
    if (content.conversationBehavior) {
      assembled += '## Conversation Behavior\n\n';
      if (content.conversationBehavior.greeting) {
        assembled += `- **Greeting**: "${content.conversationBehavior.greeting}"\n`;
      }
      if (content.conversationBehavior.fallbackMessage) {
        assembled += `- **Fallback**: "${content.conversationBehavior.fallbackMessage}"\n`;
      }
      if (content.conversationBehavior.askForNameFirst !== undefined) {
        assembled += `- **Ask for name first**: ${content.conversationBehavior.askForNameFirst ? 'Yes' : 'No'}\n`;
      }
      if (content.conversationBehavior.conversationMemoryTurns) {
        assembled += `- **Conversation memory**: ${content.conversationBehavior.conversationMemoryTurns} turns\n`;
      }
      assembled += '\n';
    }

    // Layer 6: Constraints
    if (content.constraints) {
      assembled += '## Constraints & Compliance\n\n';

      if (content.constraints.prohibitedTopics && content.constraints.prohibitedTopics.length > 0) {
        assembled += '### Prohibited Topics\n';
        content.constraints.prohibitedTopics.forEach(topic => {
          assembled += `- ${topic}\n`;
        });
        assembled += '\n';
      }

      if (content.constraints.complianceRules && content.constraints.complianceRules.length > 0) {
        assembled += '### Compliance Rules\n';
        content.constraints.complianceRules.forEach(rule => {
          assembled += `- ${rule}\n`;
        });
        assembled += '\n';
      }

      if (content.constraints.requireConsent !== undefined) {
        assembled += `- **Require consent**: ${content.constraints.requireConsent ? 'Yes' : 'No'}\n`;
      }
      if (content.constraints.maxConversationTurns) {
        assembled += `- **Max conversation turns**: ${content.constraints.maxConversationTurns}\n`;
      }
      assembled += '\n';
    }

    // Footer separator
    assembled += '─'.repeat(60) + '\n';

    return assembled;
  }

  /**
   * Count tokens for OpenAI models (GPT-3.5, GPT-4)
   */
  static countTokensOpenAI(text: string, model: 'gpt-4' | 'gpt-3.5-turbo' = 'gpt-4'): number {
    try {
      const enc = encoding_for_model(model);
      const tokens = enc.encode(text);
      const count = tokens.length;
      enc.free();
      return count;
    } catch (error) {
      console.error('Error counting tokens:', error);
      // Fallback: rough estimate (4 chars = 1 token)
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Count tokens for Claude models (rough estimate)
   * Anthropic SDK requires API key, so we use estimation
   */
  static countTokensClaude(text: string): number {
    // Claude tokenization is similar to OpenAI but slightly different
    // Rough estimate: ~3.5 chars per token for Claude
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Count tokens based on model type
   */
  static countTokens(text: string, modelType: 'gpt-4' | 'claude-3' | 'gpt-3.5' = 'gpt-4'): number {
    if (modelType === 'claude-3') {
      return this.countTokensClaude(text);
    } else {
      return this.countTokensOpenAI(text, modelType === 'gpt-4' ? 'gpt-4' : 'gpt-3.5-turbo');
    }
  }

  /**
   * Word count
   */
  static wordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Character count
   */
  static characterCount(text: string): number {
    return text.length;
  }

  /**
   * Extract variable placeholders from text (e.g., {{tenantName}})
   */
  static extractVariables(text: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Validate that all variables used are defined
   */
  static validateVariables(text: string, availableVars: string[]): { valid: boolean; missing: string[] } {
    const usedVars = this.extractVariables(text);
    const missing = usedVars.filter(v => !availableVars.includes(v));

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get token count recommendation
   */
  static getTokenRecommendation(tokenCount: number): {
    status: 'optimal' | 'high' | 'too_high';
    message: string;
  } {
    if (tokenCount < 1000) {
      return {
        status: 'optimal',
        message: 'Token count is optimal'
      };
    } else if (tokenCount < 2000) {
      return {
        status: 'high',
        message: 'Token count is getting high, consider optimizing'
      };
    } else {
      return {
        status: 'too_high',
        message: 'Token count is very high, strongly recommend reducing'
      };
    }
  }
}

export default PromptPreviewService;
