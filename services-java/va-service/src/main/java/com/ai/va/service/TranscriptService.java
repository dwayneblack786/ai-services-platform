package com.ai.va.service;

import com.ai.va.model.VoiceTranscript;
import com.ai.va.model.VoiceTranscript.TranscriptSegment;
import com.ai.va.repository.TranscriptRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * Service for managing voice transcripts
 * Handles saving, retrieving, and searching transcripts
 */
@Service
public class TranscriptService {

    private static final Logger logger = LoggerFactory.getLogger(TranscriptService.class);

    @Autowired
    private TranscriptRepository transcriptRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    /**
     * Save a new transcript or update existing one
     * @param transcript The transcript to save
     * @return Saved transcript with ID
     */
    public VoiceTranscript saveTranscript(VoiceTranscript transcript) {
        try {
            transcript.setUpdatedAt(Instant.now());
            VoiceTranscript saved = transcriptRepository.save(transcript);
            logger.info("Saved transcript for session: {}", saved.getSessionId());
            return saved;
        } catch (Exception e) {
            logger.error("Error saving transcript for session: {}", transcript.getSessionId(), e);
            throw new RuntimeException("Failed to save transcript", e);
        }
    }

    /**
     * Create or update a transcript by session ID
     * @param sessionId Session identifier
     * @param userId User identifier
     * @param customerId Customer identifier
     * @return Created or existing transcript
     */
    public VoiceTranscript createOrGetTranscript(String sessionId, String userId, String customerId) {
        Optional<VoiceTranscript> existing = transcriptRepository.findBySessionId(sessionId);
        
        if (existing.isPresent()) {
            logger.debug("Found existing transcript for session: {}", sessionId);
            return existing.get();
        } else {
            VoiceTranscript newTranscript = new VoiceTranscript(sessionId, userId, customerId);
            logger.info("Creating new transcript for session: {}", sessionId);
            return transcriptRepository.save(newTranscript);
        }
    }

    /**
     * Add a segment to an existing transcript
     * @param sessionId Session identifier
     * @param speaker Speaker ("user" or "assistant")
     * @param text Transcript text
     * @param confidence Optional STT confidence score
     * @return Updated transcript
     */
    public VoiceTranscript addSegment(String sessionId, String speaker, String text, Double confidence) {
        Optional<VoiceTranscript> transcriptOpt = transcriptRepository.findBySessionId(sessionId);
        
        if (transcriptOpt.isEmpty()) {
            logger.warn("Transcript not found for session: {}", sessionId);
            throw new IllegalArgumentException("Transcript not found for session: " + sessionId);
        }

        VoiceTranscript transcript = transcriptOpt.get();
        TranscriptSegment segment = new TranscriptSegment(speaker, text, transcript.getTranscript().size() + 1);
        segment.setConfidence(confidence);
        
        transcript.addSegment(segment);
        
        return transcriptRepository.save(transcript);
    }

    /**
     * Get transcript by session ID
     * @param sessionId Session identifier
     * @return Transcript if found
     */
    public Optional<VoiceTranscript> getTranscriptBySession(String sessionId) {
        try {
            return transcriptRepository.findBySessionId(sessionId);
        } catch (Exception e) {
            logger.error("Error retrieving transcript for session: {}", sessionId, e);
            return Optional.empty();
        }
    }

    /**
     * Get all transcripts for a customer
     * @param customerId Customer identifier
     * @return List of transcripts
     */
    public List<VoiceTranscript> getTranscriptsByCustomer(String customerId) {
        try {
            return transcriptRepository.findByCustomerId(customerId);
        } catch (Exception e) {
            logger.error("Error retrieving transcripts for customer: {}", customerId, e);
            return List.of();
        }
    }

    /**
     * Get recent transcripts for a customer
     * @param customerId Customer identifier
     * @param limit Maximum number of results
     * @return List of recent transcripts
     */
    public List<VoiceTranscript> getRecentTranscriptsByCustomer(String customerId, int limit) {
        try {
            Query query = new Query()
                .addCriteria(Criteria.where("customerId").is(customerId))
                .with(Sort.by(Sort.Direction.DESC, "createdAt"))
                .limit(limit);
            
            return mongoTemplate.find(query, VoiceTranscript.class);
        } catch (Exception e) {
            logger.error("Error retrieving recent transcripts for customer: {}", customerId, e);
            return List.of();
        }
    }

    /**
     * Get all transcripts for a user
     * @param userId User identifier
     * @return List of transcripts
     */
    public List<VoiceTranscript> getTranscriptsByUser(String userId) {
        try {
            return transcriptRepository.findByUserId(userId);
        } catch (Exception e) {
            logger.error("Error retrieving transcripts for user: {}", userId, e);
            return List.of();
        }
    }

    /**
     * Search transcripts by text content
     * @param searchText Text to search for (case-insensitive)
     * @return List of matching transcripts
     */
    public List<VoiceTranscript> searchTranscripts(String searchText) {
        try {
            return transcriptRepository.searchByTranscriptText(searchText);
        } catch (Exception e) {
            logger.error("Error searching transcripts for text: {}", searchText, e);
            return List.of();
        }
    }

    /**
     * Search transcripts by customer and text content
     * @param customerId Customer identifier
     * @param searchText Text to search for
     * @return List of matching transcripts
     */
    public List<VoiceTranscript> searchTranscriptsByCustomer(String customerId, String searchText) {
        try {
            return transcriptRepository.searchByCustomerIdAndText(customerId, searchText);
        } catch (Exception e) {
            logger.error("Error searching transcripts for customer: {} text: {}", customerId, searchText, e);
            return List.of();
        }
    }

    /**
     * Get transcripts within date range
     * @param customerId Customer identifier
     * @param startDate Start date
     * @param endDate End date
     * @return List of transcripts
     */
    public List<VoiceTranscript> getTranscriptsByDateRange(String customerId, Instant startDate, Instant endDate) {
        try {
            return transcriptRepository.findByCustomerIdAndCreatedAtBetween(customerId, startDate, endDate);
        } catch (Exception e) {
            logger.error("Error retrieving transcripts for customer: {} in date range", customerId, e);
            return List.of();
        }
    }

    /**
     * Get transcripts for the last N days
     * @param customerId Customer identifier
     * @param days Number of days to look back
     * @return List of transcripts
     */
    public List<VoiceTranscript> getRecentTranscriptsByDays(String customerId, int days) {
        Instant startDate = Instant.now().minus(days, ChronoUnit.DAYS);
        Instant endDate = Instant.now();
        return getTranscriptsByDateRange(customerId, startDate, endDate);
    }

    /**
     * Update transcript metadata
     * @param sessionId Session identifier
     * @param sttProvider STT provider name
     * @param language Language code
     * @param tenantId Tenant identifier
     * @param productId Product identifier
     * @return Updated transcript
     */
    public VoiceTranscript updateMetadata(String sessionId, String sttProvider, String language, 
                                          String tenantId, String productId) {
        Optional<VoiceTranscript> transcriptOpt = transcriptRepository.findBySessionId(sessionId);
        
        if (transcriptOpt.isEmpty()) {
            throw new IllegalArgumentException("Transcript not found for session: " + sessionId);
        }

        VoiceTranscript transcript = transcriptOpt.get();
        VoiceTranscript.TranscriptMetadata metadata = transcript.getMetadata();
        
        if (metadata == null) {
            metadata = new VoiceTranscript.TranscriptMetadata();
            transcript.setMetadata(metadata);
        }
        
        metadata.setSttProvider(sttProvider);
        metadata.setLanguage(language);
        metadata.setTenantId(tenantId);
        metadata.setProductId(productId);
        
        return transcriptRepository.save(transcript);
    }

    /**
     * Finalize transcript (set final duration)
     * @param sessionId Session identifier
     * @return Updated transcript
     */
    public VoiceTranscript finalizeTranscript(String sessionId) {
        Optional<VoiceTranscript> transcriptOpt = transcriptRepository.findBySessionId(sessionId);
        
        if (transcriptOpt.isEmpty()) {
            logger.warn("Transcript not found for finalization: {}", sessionId);
            return null;
        }

        VoiceTranscript transcript = transcriptOpt.get();
        
        // Calculate final duration
        long duration = Instant.now().toEpochMilli() - transcript.getCreatedAt().toEpochMilli();
        if (transcript.getMetadata() != null) {
            transcript.getMetadata().setDurationMs(duration);
        }
        
        logger.info("Finalized transcript for session: {} (duration: {}ms)", sessionId, duration);
        return transcriptRepository.save(transcript);
    }

    /**
     * Delete transcript by session ID
     * @param sessionId Session identifier
     */
    public void deleteTranscript(String sessionId) {
        try {
            transcriptRepository.findBySessionId(sessionId).ifPresent(transcript -> {
                transcriptRepository.delete(transcript);
                logger.info("Deleted transcript for session: {}", sessionId);
            });
        } catch (Exception e) {
            logger.error("Error deleting transcript for session: {}", sessionId, e);
            throw new RuntimeException("Failed to delete transcript", e);
        }
    }

    /**
     * Delete old transcripts (cleanup/archival)
     * @param daysToKeep Number of days to keep
     * @return Number of deleted transcripts
     */
    public long deleteOldTranscripts(int daysToKeep) {
        try {
            Instant cutoffDate = Instant.now().minus(daysToKeep, ChronoUnit.DAYS);
            long countBefore = transcriptRepository.count();
            transcriptRepository.deleteByCreatedAtBefore(cutoffDate);
            long countAfter = transcriptRepository.count();
            long deleted = countBefore - countAfter;
            
            logger.info("Deleted {} old transcripts (older than {} days)", deleted, daysToKeep);
            return deleted;
        } catch (Exception e) {
            logger.error("Error deleting old transcripts", e);
            return 0;
        }
    }

    /**
     * Get transcript statistics for a customer
     * @param customerId Customer identifier
     * @return Statistics object
     */
    public TranscriptStats getCustomerStats(String customerId) {
        try {
            long totalCount = transcriptRepository.countByCustomerId(customerId);
            List<VoiceTranscript> recent = getRecentTranscriptsByDays(customerId, 30);
            
            long totalDuration = recent.stream()
                .filter(t -> t.getMetadata() != null && t.getMetadata().getDurationMs() != null)
                .mapToLong(t -> t.getMetadata().getDurationMs())
                .sum();
            
            double averageDuration = recent.isEmpty() ? 0.0 : 
                (double) totalDuration / recent.size();
            
            return new TranscriptStats(totalCount, recent.size(), totalDuration, averageDuration);
        } catch (Exception e) {
            logger.error("Error calculating stats for customer: {}", customerId, e);
            return new TranscriptStats(0, 0, 0L, 0.0);
        }
    }

    /**
     * Statistics data class
     */
    public static class TranscriptStats {
        private final long totalTranscripts;
        private final long recentTranscripts;
        private final long totalDurationMs;
        private final double averageDurationMs;

        public TranscriptStats(long totalTranscripts, long recentTranscripts, 
                             long totalDurationMs, double averageDurationMs) {
            this.totalTranscripts = totalTranscripts;
            this.recentTranscripts = recentTranscripts;
            this.totalDurationMs = totalDurationMs;
            this.averageDurationMs = averageDurationMs;
        }

        public long getTotalTranscripts() { return totalTranscripts; }
        public long getRecentTranscripts() { return recentTranscripts; }
        public long getTotalDurationMs() { return totalDurationMs; }
        public double getAverageDurationMs() { return averageDurationMs; }
    }
}
