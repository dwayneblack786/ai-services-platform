package com.ai.va.config;

import com.ai.va.model.VoiceTranscript;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;

import jakarta.annotation.PostConstruct;

/**
 * MongoDB Configuration
 * Creates indexes for VoiceTranscript collection
 */
@Configuration
public class MongoConfig {

    private final MongoTemplate mongoTemplate;

    public MongoConfig(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * Initialize MongoDB indexes on application startup
     */
    @PostConstruct
    public void initIndexes() {
        try {
            IndexOperations indexOps = mongoTemplate.indexOps(VoiceTranscript.class);

            // Get all existing indexes
            System.out.println("Existing indexes before cleanup:");
            indexOps.getIndexInfo().forEach(index -> 
                System.out.println("  - " + index.getName())
            );

            // Drop all indexes except _id
            indexOps.getIndexInfo().forEach(index -> {
                String indexName = index.getName();
                if (!indexName.equals("_id_")) {
                    try {
                        indexOps.dropIndex(indexName);
                        System.out.println("Dropped index: " + indexName);
                    } catch (Exception e) {
                        System.out.println("Could not drop index " + indexName + ": " + e.getMessage());
                    }
                }
            });

            // Now create new indexes
            System.out.println("Creating new indexes...");

            // Index on sessionId (unique)
            indexOps.ensureIndex(new Index()
                .on("sessionId", Sort.Direction.ASC)
                .unique()
                .named("idx_session_id"));

            // Index on userId
            indexOps.ensureIndex(new Index()
                .on("userId", Sort.Direction.ASC)
                .named("idx_user_id"));

            // Index on customerId
            indexOps.ensureIndex(new Index()
                .on("customerId", Sort.Direction.ASC)
                .named("idx_customer_id"));

            // Compound index on customerId + createdAt for date range queries
            indexOps.ensureIndex(new Index()
                .on("customerId", Sort.Direction.ASC)
                .on("createdAt", Sort.Direction.DESC)
                .named("idx_customer_created"));

            // Index on tenantId in metadata
            indexOps.ensureIndex(new Index()
                .on("metadata.tenantId", Sort.Direction.ASC)
                .named("idx_tenant_id"));

            // Compound index on tenantId + productId
            indexOps.ensureIndex(new Index()
                .on("metadata.tenantId", Sort.Direction.ASC)
                .on("metadata.productId", Sort.Direction.ASC)
                .named("idx_tenant_product"));

            // Index on createdAt for cleanup queries
            indexOps.ensureIndex(new Index()
                .on("createdAt", Sort.Direction.ASC)
                .named("idx_created_at"));

            // Text index for full-text search on transcript segments
            // Note: MongoDB supports one text index per collection
            indexOps.ensureIndex(new Index()
                .on("transcript.text", Sort.Direction.ASC)
                .named("idx_transcript_text"));

            System.out.println("MongoDB indexes created for VoiceTranscript collection");
        } catch (Exception e) {
            System.err.println("Error initializing MongoDB indexes: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
