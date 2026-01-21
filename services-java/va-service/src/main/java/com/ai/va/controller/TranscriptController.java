package com.ai.va.controller;

import com.ai.va.model.VoiceTranscript;
import com.ai.va.service.TranscriptService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * REST Controller for Voice Transcript operations
 * Provides endpoints for retrieving and searching transcripts
 */
@RestController
@RequestMapping("/api/transcripts")
@CrossOrigin(origins = "*")
public class TranscriptController {

    @Autowired
    private TranscriptService transcriptService;

    /**
     * Get transcript by session ID
     * GET /api/transcripts/session/{sessionId}
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<?> getTranscriptBySession(@PathVariable String sessionId) {
        try {
            Optional<VoiceTranscript> transcript = transcriptService.getTranscriptBySession(sessionId);
            
            if (transcript.isPresent()) {
                return ResponseEntity.ok(transcript.get());
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Transcript not found for session: " + sessionId);
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error retrieving transcript: " + e.getMessage());
        }
    }

    /**
     * Get all transcripts for a customer
     * GET /api/transcripts/customer/{customerId}
     */
    @GetMapping("/customer/{customerId}")
    public ResponseEntity<?> getTranscriptsByCustomer(@PathVariable String customerId) {
        try {
            List<VoiceTranscript> transcripts = transcriptService.getTranscriptsByCustomer(customerId);
            return ResponseEntity.ok(transcripts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error retrieving transcripts: " + e.getMessage());
        }
    }

    /**
     * Get recent transcripts for a customer
     * GET /api/transcripts/customer/{customerId}/recent?limit=10
     */
    @GetMapping("/customer/{customerId}/recent")
    public ResponseEntity<?> getRecentTranscripts(
            @PathVariable String customerId,
            @RequestParam(defaultValue = "10") int limit) {
        try {
            List<VoiceTranscript> transcripts = transcriptService.getRecentTranscriptsByCustomer(customerId, limit);
            return ResponseEntity.ok(transcripts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error retrieving recent transcripts: " + e.getMessage());
        }
    }

    /**
     * Get all transcripts for a user
     * GET /api/transcripts/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getTranscriptsByUser(@PathVariable String userId) {
        try {
            List<VoiceTranscript> transcripts = transcriptService.getTranscriptsByUser(userId);
            return ResponseEntity.ok(transcripts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error retrieving transcripts: " + e.getMessage());
        }
    }

    /**
     * Search transcripts by text content
     * GET /api/transcripts/search?query=hello
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchTranscripts(@RequestParam String query) {
        try {
            if (query == null || query.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Query parameter is required");
            }
            
            List<VoiceTranscript> transcripts = transcriptService.searchTranscripts(query);
            return ResponseEntity.ok(transcripts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error searching transcripts: " + e.getMessage());
        }
    }

    /**
     * Search transcripts by customer and text content
     * GET /api/transcripts/customer/{customerId}/search?query=hello
     */
    @GetMapping("/customer/{customerId}/search")
    public ResponseEntity<?> searchTranscriptsByCustomer(
            @PathVariable String customerId,
            @RequestParam String query) {
        try {
            if (query == null || query.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Query parameter is required");
            }
            
            List<VoiceTranscript> transcripts = transcriptService.searchTranscriptsByCustomer(customerId, query);
            return ResponseEntity.ok(transcripts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error searching transcripts: " + e.getMessage());
        }
    }

    /**
     * Get transcripts within date range
     * GET /api/transcripts/customer/{customerId}/range?start=2024-01-01T00:00:00Z&end=2024-01-31T23:59:59Z
     */
    @GetMapping("/customer/{customerId}/range")
    public ResponseEntity<?> getTranscriptsByDateRange(
            @PathVariable String customerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant end) {
        try {
            if (start == null || end == null) {
                return ResponseEntity.badRequest().body("Start and end dates are required");
            }
            
            List<VoiceTranscript> transcripts = transcriptService.getTranscriptsByDateRange(customerId, start, end);
            return ResponseEntity.ok(transcripts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error retrieving transcripts by date range: " + e.getMessage());
        }
    }

    /**
     * Get recent transcripts for last N days
     * GET /api/transcripts/customer/{customerId}/days?days=7
     */
    @GetMapping("/customer/{customerId}/days")
    public ResponseEntity<?> getRecentTranscriptsByDays(
            @PathVariable String customerId,
            @RequestParam(defaultValue = "7") int days) {
        try {
            List<VoiceTranscript> transcripts = transcriptService.getRecentTranscriptsByDays(customerId, days);
            return ResponseEntity.ok(transcripts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error retrieving recent transcripts: " + e.getMessage());
        }
    }

    /**
     * Get transcript statistics for a customer
     * GET /api/transcripts/customer/{customerId}/stats
     */
    @GetMapping("/customer/{customerId}/stats")
    public ResponseEntity<?> getCustomerStats(@PathVariable String customerId) {
        try {
            TranscriptService.TranscriptStats stats = transcriptService.getCustomerStats(customerId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error retrieving customer stats: " + e.getMessage());
        }
    }

    /**
     * Delete transcript by session ID
     * DELETE /api/transcripts/session/{sessionId}
     */
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<?> deleteTranscript(@PathVariable String sessionId) {
        try {
            transcriptService.deleteTranscript(sessionId);
            return ResponseEntity.ok("Transcript deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error deleting transcript: " + e.getMessage());
        }
    }

    /**
     * Delete old transcripts (cleanup)
     * DELETE /api/transcripts/cleanup?daysToKeep=90
     */
    @DeleteMapping("/cleanup")
    public ResponseEntity<?> deleteOldTranscripts(@RequestParam(defaultValue = "90") int daysToKeep) {
        try {
            long deleted = transcriptService.deleteOldTranscripts(daysToKeep);
            return ResponseEntity.ok("Deleted " + deleted + " old transcripts");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error cleaning up old transcripts: " + e.getMessage());
        }
    }

    /**
     * Health check endpoint
     * GET /api/transcripts/health
     */
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Transcript service is healthy");
    }
}
