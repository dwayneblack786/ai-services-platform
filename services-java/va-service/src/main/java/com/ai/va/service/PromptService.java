package com.ai.va.service;

import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ai.common.logging.LogFactory;
import com.ai.va.model.MenuOption;

/**
 * Prompt Service
 * Handles querying and loading prompt configurations from MongoDB
 * Used for dynamic session menu and prompt-based conversations
 */
@Service
public class PromptService {

    private static final Logger logger = LogFactory.getLogger(PromptService.class);

    @Autowired
    private MongoDBService mongoDBService;

    /**
     * Get production prompts for a product/channel
     * Returns list of available prompts with id, name, icon
     *
     * @param tenantId Tenant identifier
     * @param productId Product identifier (can be ObjectId or String)
     * @param channelType Channel type: "chat" or "voice"
     * @return List of MenuOption objects representing available prompts
     */
    public List<MenuOption> getProductionPrompts(String tenantId, String productId, String channelType) {
        try {
            logger.info("[PromptService] Loading prompts for tenant={}, product={}, channel={}",
                tenantId, productId, channelType);

            // Convert productId to ObjectId if it's a valid 24-character hex string
            Object productQuery = productId;
            if (ObjectId.isValid(productId) && productId.length() == 24) {
                try {
                    productQuery = new ObjectId(productId);
                    logger.debug("[PromptService] Using ObjectId for productId: {}", productQuery);
                } catch (IllegalArgumentException e) {
                    logger.debug("[PromptService] ProductId is not a valid ObjectId, using as string: {}", productId);
                }
            } else {
                logger.debug("[PromptService] Using string for productId: {}", productId);
            }

            // Build query for production prompts
            Document query = new Document()
                .append("tenantId", tenantId)
                .append("productId", productQuery)
                .append("channelType", channelType)
                .append("state", "production")
                .append("isActive", true)
                .append("isDeleted", new Document("$ne", true));

            logger.debug("[PromptService] Query: {}", query.toJson());

            // Execute query
            List<Document> prompts = mongoDBService.find("prompt_versions", query);

            logger.info("[PromptService] Found {} production prompts", prompts.size());

            // Build MenuOption list
            List<MenuOption> options = new ArrayList<>();
            int index = 0;

            for (Document prompt : prompts) {
                MenuOption option = new MenuOption();
                option.setId(prompt.getObjectId("_id").toHexString());
                option.setText(prompt.getString("name"));
                option.setValue(prompt.getString("name"));
                option.setIcon(prompt.getString("icon") != null ? prompt.getString("icon") : "💬");
                option.setDtmfKey(String.valueOf(index + 1));

                options.add(option);
                logger.debug("[PromptService] Added option: {}", option);
                index++;
            }

            return options;

        } catch (Exception e) {
            logger.error("[PromptService] Error loading prompts: {}", e.getMessage(), e);
            return new ArrayList<>(); // Return empty list on error
        }
    }

    /**
     * Load full prompt configuration by promptId
     * Used when user selects a specific prompt from the menu
     *
     * @param promptId MongoDB ObjectId of the prompt
     * @return Document containing full prompt configuration
     */
    public Document getPromptById(String promptId) {
        try {
            logger.info("[PromptService] Loading prompt by ID: {}", promptId);

            ObjectId id = new ObjectId(promptId);
            Document query = new Document("_id", id);

            Document prompt = mongoDBService.findOne("prompt_versions", query);

            if (prompt != null) {
                logger.debug("[PromptService] Loaded prompt: {}", prompt.getString("name"));
            } else {
                logger.warn("[PromptService] Prompt not found for ID: {}", promptId);
            }

            return prompt;

        } catch (IllegalArgumentException e) {
            logger.error("[PromptService] Invalid promptId format: {}", promptId);
            return null;
        } catch (Exception e) {
            logger.error("[PromptService] Error loading prompt by ID: {}", e.getMessage(), e);
            return null;
        }
    }
}
