package com.ai.listing.repository;

import com.ai.listing.model.Listing;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ListingRepository extends MongoRepository<Listing, String> {
    Optional<Listing> findByTenantIdAndId(String tenantId, String id);
    List<Listing> findByTenantId(String tenantId, Pageable pageable);
    long countByTenantId(String tenantId);
}
