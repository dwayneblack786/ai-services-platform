package com.ai.va.repository;

import com.ai.va.model.VoiceTranscript;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for VoiceTranscript entities
 * Provides CRUD operations and custom queries
 */
@Repository
public interface TranscriptRepository extends MongoRepository<VoiceTranscript, String> {

    /**
     * Find transcript by session ID
     */
    Optional<VoiceTranscript> findBySessionId(String sessionId);

    /**
     * Find all transcripts for a specific user
     */
    List<VoiceTranscript> findByUserId(String userId);

    /**
     * Find all transcripts for a specific customer
     */
    List<VoiceTranscript> findByCustomerId(String customerId);

    /**
     * Find transcripts by customer within date range
     */
    List<VoiceTranscript> findByCustomerIdAndCreatedAtBetween(
        String customerId, 
        Instant startDate, 
        Instant endDate
    );

    /**
     * Find transcripts by user within date range
     */
    List<VoiceTranscript> findByUserIdAndCreatedAtBetween(
        String userId, 
        Instant startDate, 
        Instant endDate
    );

    /**
     * Search transcripts by text content (full-text search on transcript segments)
     * Note: This requires MongoDB text index on transcript.text field
     */
    @Query("{ 'transcript.text': { $regex: ?0, $options: 'i' } }")
    List<VoiceTranscript> searchByTranscriptText(String searchText);

    /**
     * Search transcripts by customer and text content
     */
    @Query("{ 'customerId': ?0, 'transcript.text': { $regex: ?1, $options: 'i' } }")
    List<VoiceTranscript> searchByCustomerIdAndText(String customerId, String searchText);

    /**
     * Find transcripts by tenant ID
     */
    @Query("{ 'metadata.tenantId': ?0 }")
    List<VoiceTranscript> findByTenantId(String tenantId);

    /**
     * Find transcripts by tenant and product
     */
    @Query("{ 'metadata.tenantId': ?0, 'metadata.productId': ?1 }")
    List<VoiceTranscript> findByTenantIdAndProductId(String tenantId, String productId);

    /**
     * Find recent transcripts for a customer (limit results)
     */
    List<VoiceTranscript> findTop10ByCustomerIdOrderByCreatedAtDesc(String customerId);

    /**
     * Find transcripts with minimum duration
     */
    @Query("{ 'metadata.durationMs': { $gte: ?0 } }")
    List<VoiceTranscript> findByMinimumDuration(Long minDurationMs);

    /**
     * Count transcripts by customer
     */
    long countByCustomerId(String customerId);

    /**
     * Count transcripts by user
     */
    long countByUserId(String userId);

    /**
     * Delete transcripts older than specified date
     */
    void deleteByCreatedAtBefore(Instant date);
}
