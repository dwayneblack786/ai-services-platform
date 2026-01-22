package com.ai.va.service;

import com.ai.va.model.ChannelConfiguration;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import org.bson.Document;
import org.bson.json.JsonMode;
import org.bson.json.JsonWriterSettings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import org.bson.types.ObjectId;

/**
 * Configuration Service
 * Fetches tenant and product-specific configuration using the shared MongoDBService
 */
@Service
public class ConfigurationService {

    private static final Logger logger = LoggerFactory.getLogger(ConfigurationService.class);

    private final MongoDBService mongoDBService;
    private final ObjectMapper objectMapper;
    private final JsonWriterSettings jsonWriterSettings;
    
    // Cache configurations to avoid repeated database calls
    private final Map<String, ChannelConfiguration> voiceConfigCache = new HashMap<>();
    private final Map<String, ChannelConfiguration> chatConfigCache = new HashMap<>();

    @Autowired
    public ConfigurationService(MongoDBService mongoDBService) {
        this.mongoDBService = mongoDBService;
        this.objectMapper = new ObjectMapper();
        // Configure Jackson to accept empty strings as empty collections
        this.objectMapper.configure(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT, true);
        // Use RELAXED mode to convert ObjectIds to plain strings in JSON
        this.jsonWriterSettings = JsonWriterSettings.builder()
                .outputMode(JsonMode.RELAXED)
                .build();
    }

    /**
     * Helper method to convert all ObjectId values in a Document to their string representations
     * This ensures Jackson can deserialize the document without issues
     */
    private Document convertObjectIdsToStrings(Document doc) {
        Document result = new Document();
        for (Map.Entry<String, Object> entry : doc.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof ObjectId id) {
                // Convert ObjectId to its hex string representation
                result.put(entry.getKey(), id.toHexString());
            } else if (value instanceof Document document) {
                // Recursively convert nested documents
                result.put(entry.getKey(), convertObjectIdsToStrings(document));
            } else {
                // Keep other values as-is
                result.put(entry.getKey(), value);
            }
        }
        return result;
    }

    /**
     * Fetch voice channel configuration for a tenant and product
     * 
     * @param tenantId Tenant ID (customerId)
     * @param productId Product ID
     * @return Voice channel configuration with RAG and context
     */
    public ChannelConfiguration getVoiceConfiguration(String tenantId, String productId) {
        String cacheKey = tenantId + ":" + productId;
        
        // Check cache first
        if (voiceConfigCache.containsKey(cacheKey)) {
            logger.debug("[ConfigService] Voice config cache hit for: {}", cacheKey);
            return voiceConfigCache.get(cacheKey);
        }

        try {
            Document doc = null;
            
            // Try with ObjectId first if productId looks like a valid ObjectId
            if (ObjectId.isValid(productId)) {
                try {
                    ObjectId productIdObjectId = new ObjectId(productId);
                    Document query = new Document("customerId", tenantId)
                            .append("productId", productIdObjectId)
                            .append("voice.enabled", true);
                    doc = mongoDBService.findOne("assistant_channels", query);
                } catch (IllegalArgumentException e) {
                    logger.debug("[ConfigService] ProductId is not a valid ObjectId: {}", productId);
                }
            }
            
            // Try with productId as string if ObjectId query didn't work
            if (doc == null) {
                logger.debug("[ConfigService] Trying productId as string: {}", productId);
                Document query = new Document("customerId", tenantId)
                        .append("productId", productId)
                        .append("voice.enabled", true);
                doc = mongoDBService.findOne("assistant_channels", query);
            }
            
            // Fallback: find any channel for this customer with voice enabled
            if (doc == null) {
                logger.debug("[ConfigService] No exact match, trying fallback for tenantId: {}", tenantId);
                Document query = new Document("customerId", tenantId)
                        .append("voice.enabled", true);
                doc = mongoDBService.findOne("assistant_channels", query);
            }
            
            if (doc != null && doc.containsKey("voice")) {
                Document voiceDoc = doc.get("voice", Document.class);
                // Convert all ObjectIds to strings before JSON serialization
                Document cleanedDoc = convertObjectIdsToStrings(voiceDoc);
                String json = cleanedDoc.toJson(jsonWriterSettings);
                ChannelConfiguration config = objectMapper.readValue(json, ChannelConfiguration.class);
                
                // Cache the configuration
                voiceConfigCache.put(cacheKey, config);
                
                logger.info("[ConfigService] Loaded voice config from MongoDB: {}", config);
                return config;
            }
            
        } catch (Exception e) {
            logger.error("[ConfigService] Error fetching voice configuration: {}", e.getMessage(), e);
        }

        // Return default configuration if fetch fails
        return getDefaultVoiceConfiguration();
    }

    /**
     * Fetch chat channel configuration for a tenant and product
     * 
     * @param tenantId Tenant ID (customerId)
     * @param productId Product ID
     * @return Chat channel configuration with RAG and context
     */
    public ChannelConfiguration getChatConfiguration(String tenantId, String productId) {
        String cacheKey = tenantId + ":" + productId;
        
        // Check cache first
        if (chatConfigCache.containsKey(cacheKey)) {
            logger.debug("[ConfigService] Chat config cache hit for: {}", cacheKey);
            return chatConfigCache.get(cacheKey);
        }

        try {
            Document doc = null;
            
            // Try with ObjectId first if productId looks like a valid ObjectId
            if (ObjectId.isValid(productId)) {
                try {
                    ObjectId productIdObjectId = new ObjectId(productId);
                    Document query = new Document("customerId", tenantId)
                            .append("productId", productIdObjectId)
                            .append("chat.enabled", true);
                    doc = mongoDBService.findOne("assistant_channels", query);
                } catch (IllegalArgumentException e) {
                    logger.debug("[ConfigService] ProductId is not a valid ObjectId: {}", productId);
                }
            }
            
            // Try with productId as string if ObjectId query didn't work
            if (doc == null) {
                logger.debug("[ConfigService] Trying productId as string: {}", productId);
                Document query = new Document("customerId", tenantId)
                        .append("productId", productId)
                        .append("chat.enabled", true);
                doc = mongoDBService.findOne("assistant_channels", query);
            }
            
            // Fallback: find any channel for this customer with chat enabled
            if (doc == null) {
                logger.debug("[ConfigService] No exact match, trying fallback for tenantId: {}", tenantId);
                Document query = new Document("customerId", tenantId)
                        .append("chat.enabled", true);
                doc = mongoDBService.findOne("assistant_channels", query);
            }
            
            if (doc != null && doc.containsKey("chat")) {
                Document chatDoc = doc.get("chat", Document.class);
                // Convert all ObjectIds to strings before JSON serialization
                Document cleanedDoc = convertObjectIdsToStrings(chatDoc);
                String json = cleanedDoc.toJson(jsonWriterSettings);
                ChannelConfiguration config = objectMapper.readValue(json, ChannelConfiguration.class);
                
                // Cache the configuration
                chatConfigCache.put(cacheKey, config);
                
                logger.info("[ConfigService] Loaded chat config from MongoDB: {}", config);
                return config;
            }
            
        } catch (Exception e) {
            logger.error("[ConfigService] Error fetching chat configuration: {}", e.getMessage(), e);
        }

        // Return default configuration if fetch fails
        return getDefaultChatConfiguration();
    }

    /**
     * Clear cache for a specific tenant/product (call after configuration updates)
     */
    public void clearCache(String tenantId, String productId) {
        String cacheKey = tenantId + ":" + productId;
        voiceConfigCache.remove(cacheKey);
        chatConfigCache.remove(cacheKey);
        logger.info("[ConfigService] Cleared cache for: {}", cacheKey);
    }

    /**
     * Clear all cached configurations
     */
    public void clearAllCache() {
        voiceConfigCache.clear();
        chatConfigCache.clear();
        logger.info("[ConfigService] Cleared all configuration cache");
    }

    private ChannelConfiguration getDefaultVoiceConfiguration() {
        ChannelConfiguration config = new ChannelConfiguration();
        config.setEnabled(true);
        logger.warn("[ConfigService] Using default voice configuration");
        return config;
    }

    private ChannelConfiguration getDefaultChatConfiguration() {
        ChannelConfiguration config = new ChannelConfiguration();
        config.setEnabled(true);
        logger.warn("[ConfigService] Using default chat configuration");
        return config;
    }
}
