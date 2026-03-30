package com.ai.listing.config;

import dev.langchain4j.model.anthropic.AnthropicChatModel;
import dev.langchain4j.model.chat.ChatLanguageModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LangChain4jConfig {

    @Value("${langchain4j.anthropic.api-key}")
    private String apiKey;

    @Value("${langchain4j.anthropic.model-name:claude-sonnet-4-6}")
    private String modelName;

    @Value("${langchain4j.anthropic.max-tokens:4096}")
    private int maxTokens;

    @Value("${langchain4j.anthropic.temperature:0.7}")
    private double temperature;

    /**
     * Primary model for copywriting and compliance — Sonnet for quality.
     */
    @Bean
    public ChatLanguageModel chatModel() {
        return AnthropicChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .maxTokens(maxTokens)
                .temperature(temperature)
                .build();
    }

    /**
     * Fast model for lighter tasks — Haiku for speed/cost.
     */
    @Bean("fastChatModel")
    public ChatLanguageModel fastChatModel() {
        return AnthropicChatModel.builder()
                .apiKey(apiKey)
                .modelName("claude-haiku-4-5-20251001")
                .maxTokens(2048)
                .temperature(0.5)
                .build();
    }
}
