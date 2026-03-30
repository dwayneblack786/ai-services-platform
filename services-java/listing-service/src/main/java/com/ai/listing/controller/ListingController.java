package com.ai.listing.controller;

import com.ai.listing.datastore.DataStore;
import com.ai.listing.datastore.DataStoreFactory;
import com.ai.listing.model.DataStoreConfig;
import com.ai.listing.model.Listing;
import com.ai.listing.repository.ListingRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Listing CRUD REST controller.
 *
 * Endpoints:
 *   POST   /api/listings              — create a listing (draft)
 *   GET    /api/listings              — list all listings for tenant
 *   GET    /api/listings/{id}         — get single listing
 *   PUT    /api/listings/{id}         — update listing fields
 *   DELETE /api/listings/{id}         — delete listing
 */
@RestController
@RequestMapping("/api/listings")
public class ListingController {

    private static final Logger logger = LogManager.getLogger(ListingController.class);

    @Autowired
    private ListingRepository listingRepository;

    @Autowired
    private DataStoreFactory dataStoreFactory;

    @PostMapping
    public ResponseEntity<?> createListing(@RequestBody Map<String, Object> body,
                                            @RequestHeader("X-Tenant-Id") String tenantId) {
        Listing listing = new Listing();
        listing.setTenantId(tenantId);
        applyFields(listing, body);
        Listing saved = listingRepository.save(listing);
        logger.info("[ListingController] Created listing — tenantId={}, id={}", tenantId, saved.getId());
        return ResponseEntity.status(201).body(Map.of("listing", saved));
    }

    @GetMapping
    public ResponseEntity<?> listListings(@RequestHeader("X-Tenant-Id") String tenantId,
                                           @RequestParam(defaultValue = "50") int limit,
                                           @RequestParam(defaultValue = "0") int offset) {
        DataStore store = dataStoreFactory.getDataStore(new DataStoreConfig());
        List<Map<String, Object>> listings = store.listListings(tenantId, limit, offset);
        return ResponseEntity.ok(Map.of("listings", listings, "count", listings.size()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getListing(@PathVariable String id,
                                         @RequestHeader("X-Tenant-Id") String tenantId) {
        return listingRepository.findByTenantIdAndId(tenantId, id)
                .map(l -> ResponseEntity.ok(Map.of("listing", l)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateListing(@PathVariable String id,
                                            @RequestBody Map<String, Object> body,
                                            @RequestHeader("X-Tenant-Id") String tenantId) {
        return listingRepository.findByTenantIdAndId(tenantId, id).map(listing -> {
            applyFields(listing, body);
            Listing saved = listingRepository.save(listing);
            return ResponseEntity.ok(Map.of("listing", saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteListing(@PathVariable String id,
                                            @RequestHeader("X-Tenant-Id") String tenantId) {
        return listingRepository.findByTenantIdAndId(tenantId, id).map(listing -> {
            listingRepository.delete(listing);
            return ResponseEntity.ok(Map.of("deleted", true));
        }).orElse(ResponseEntity.notFound().build());
    }

    @SuppressWarnings("unchecked")
    private void applyFields(Listing listing, Map<String, Object> body) {
        if (body.get("address") instanceof String s) listing.setAddress(s);
        if (body.get("bedrooms") instanceof Number n) listing.setBedrooms(n.intValue());
        if (body.get("bathrooms") instanceof Number n) listing.setBathrooms(n.doubleValue());
        if (body.get("sqft") instanceof Number n) listing.setSqft(n.intValue());
        if (body.get("price") instanceof Number n) listing.setPrice(n.doubleValue());
        if (body.get("propertyType") instanceof String s) listing.setPropertyType(s);
        if (body.get("yearBuilt") instanceof Number n) listing.setYearBuilt(n.intValue());
        if (body.get("tone") instanceof String s) listing.setTone(s);
        if (body.get("extras") instanceof String s) listing.setTone(s);
        if (body.get("photoPaths") instanceof List<?> l)
            listing.setPhotoPaths(l.stream().map(Object::toString).toList());
    }
}
