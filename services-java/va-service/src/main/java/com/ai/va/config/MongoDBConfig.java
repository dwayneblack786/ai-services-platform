package com.ai.va.config;

import com.ai.common.logging.LogFactory;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MongoDB Configuration
 * Provides MongoDB connection beans for dependency injection
 * This configuration can be reused across all microservices
 */
@Configuration
public class MongoDBConfig {

    private static final Logger logger = LogFactory.getLogger(MongoDBConfig.class);

    @Value("${mongodb.uri:mongodb://localhost:27017}")
    private String mongoUri;

    @Value("${mongodb.database:ai_platform}")
    private String databaseName;

    /**
     * Create MongoDB client bean
     * This client handles connection pooling automatically
     */
    @Bean
    public MongoClient mongoClient() {
        logger.info("[MongoDB] Connecting to: {}", mongoUri);
        return MongoClients.create(mongoUri);
    }

    /**
     * Create MongoDB database bean
     * Provides direct access to the configured database
     */
    @Bean
    public MongoDatabase mongoDatabase(MongoClient mongoClient) {
        MongoDatabase database = mongoClient.getDatabase(databaseName);
        logger.info("[MongoDB] Connected to database: {}", databaseName);
        return database;
    }
}
