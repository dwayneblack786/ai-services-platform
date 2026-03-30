package com.ai.listing.repository;

import com.ai.listing.model.PipelineRun;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PipelineRunRepository extends MongoRepository<PipelineRun, String> {
    Optional<PipelineRun> findByRunId(String runId);
    List<PipelineRun> findByTenantIdAndListingId(String tenantId, String listingId);
    List<PipelineRun> findByTenantIdAndPausedAtIsNotNull(String tenantId);
}
