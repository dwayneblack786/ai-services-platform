package com.ai.listing.datastore;

import java.util.List;
import java.util.Map;

/**
 * Pluggable data store interface.
 * All store implementations must implement this interface.
 * The factory returns the correct implementation based on tenant config.
 */
public interface DataStore {

    /** Save accepted listing data. Returns the stored listing ID. */
    String saveListing(String tenantId, String listingId, Map<String, Object> data);

    /** Retrieve a listing by ID. Returns null if not found. */
    Map<String, Object> getListing(String tenantId, String listingId);

    /** Partially update a listing. */
    void updateListing(String tenantId, String listingId, Map<String, Object> data);

    /** List listings for a tenant, newest first. */
    List<Map<String, Object>> listListings(String tenantId, int limit, int offset);
}
