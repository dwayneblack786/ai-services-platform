package com.ai.va.service;

import com.ai.common.logging.LogFactory;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * MongoDB Service
 * Provides common MongoDB operations with error handling
 * This service can be reused across all microservices for MongoDB operations
 */
@Service
public class MongoDBService {

    private static final Logger logger = LogFactory.getLogger(MongoDBService.class);
    
    private final MongoDatabase database;

    @Autowired
    public MongoDBService(MongoDatabase database) {
        this.database = database;
    }

    /**
     * Get a collection from the database
     */
    public MongoCollection<Document> getCollection(String collectionName) {
        return database.getCollection(collectionName);
    }

    /**
     * Find a single document by query
     */
    public Document findOne(String collectionName, Document query) {
        try {
            logger.debug("[MongoDB] findOne in {} with query: {}", collectionName, query.toJson());
            MongoCollection<Document> collection = getCollection(collectionName);
            Document result = collection.find(query).first();
            logger.debug("[MongoDB] findOne result: {}", (result != null ? "Found" : "Not found"));
            if (result != null) {
                logger.debug("[MongoDB] Document: {}", result.toJson());
            }
            return result;
        } catch (Exception e) {
            logger.error("[MongoDB] Error finding document in {}: {}", collectionName, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Find multiple documents by query
     */
    public List<Document> find(String collectionName, Document query) {
        List<Document> results = new ArrayList<>();
        try {
            MongoCollection<Document> collection = getCollection(collectionName);
            collection.find(query).into(results);
        } catch (Exception e) {
            logger.error("[MongoDB] Error finding documents in {}: {}", collectionName, e.getMessage(), e);
        }
        return results;
    }

    /**
     * Find multiple documents by query with limit
     */
    public List<Document> find(String collectionName, Document query, int limit) {
        List<Document> results = new ArrayList<>();
        try {
            MongoCollection<Document> collection = getCollection(collectionName);
            collection.find(query).limit(limit).into(results);
        } catch (Exception e) {
            logger.error("[MongoDB] Error finding documents in {}: {}", collectionName, e.getMessage(), e);
        }
        return results;
    }

    /**
     * Insert a document
     */
    public boolean insertOne(String collectionName, Document document) {
        try {
            MongoCollection<Document> collection = getCollection(collectionName);
            collection.insertOne(document);
            return true;
        } catch (Exception e) {
            logger.error("[MongoDB] Error inserting document in {}: {}", collectionName, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Update a document
     */
    public boolean updateOne(String collectionName, Document query, Document update) {
        try {
            MongoCollection<Document> collection = getCollection(collectionName);
            collection.updateOne(query, new Document("$set", update));
            return true;
        } catch (Exception e) {
            logger.error("[MongoDB] Error updating document in {}: {}", collectionName, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Delete a document
     */
    public boolean deleteOne(String collectionName, Document query) {
        try {
            MongoCollection<Document> collection = getCollection(collectionName);
            collection.deleteOne(query);
            return true;
        } catch (Exception e) {
            logger.error("[MongoDB] Error deleting document in {}: {}", collectionName, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Count documents matching query
     */
    public long count(String collectionName, Document query) {
        try {
            MongoCollection<Document> collection = getCollection(collectionName);
            return collection.countDocuments(query);
        } catch (Exception e) {
            logger.error("[MongoDB] Error counting documents in {}: {}", collectionName, e.getMessage(), e);
            return 0;
        }
    }
}
