package com.ai.listing.datastore;

import com.ai.listing.repository.ListingRepository;
import com.ai.listing.model.Listing;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Default MongoDB data store implementation.
 * Uses the platform's existing MongoDB instance and Spring Data repository.
 */
@Component
public class MongoDataStore implements DataStore {

    private static final Logger logger = LogManager.getLogger(MongoDataStore.class);

    @Autowired
    private ListingRepository listingRepository;

    @Override
    public String saveListing(String tenantId, String listingId, Map<String, Object> data) {
        logger.info("[MongoDataStore] Saving listing — tenantId={}, listingId={}", tenantId, listingId);

        Listing listing = listingRepository.findByTenantIdAndId(tenantId, listingId)
                .orElse(new Listing());

        applyDataToListing(listing, data);
        listing.setTenantId(tenantId);
        listing.setStatus("published");

        Listing saved = listingRepository.save(listing);
        logger.info("[MongoDataStore] Listing saved — id={}", saved.getId());
        return saved.getId();
    }

    @Override
    public Map<String, Object> getListing(String tenantId, String listingId) {
        return listingRepository.findByTenantIdAndId(tenantId, listingId)
                .map(this::listingToMap)
                .orElse(null);
    }

    @Override
    public void updateListing(String tenantId, String listingId, Map<String, Object> data) {
        Listing listing = listingRepository.findByTenantIdAndId(tenantId, listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found: " + listingId));
        applyDataToListing(listing, data);
        listingRepository.save(listing);
    }

    @Override
    public List<Map<String, Object>> listListings(String tenantId, int limit, int offset) {
        PageRequest page = PageRequest.of(offset / limit, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        return listingRepository.findByTenantId(tenantId, page)
                .stream()
                .map(this::listingToMap)
                .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private void applyDataToListing(Listing listing, Map<String, Object> data) {
        if (data.containsKey("listingFields")) {
            Map<String, Object> fields = (Map<String, Object>) data.get("listingFields");
            if (fields.get("address") instanceof String s) listing.setAddress(s);
            if (fields.get("bedrooms") instanceof Number n) listing.setBedrooms(n.intValue());
            if (fields.get("bathrooms") instanceof Number n) listing.setBathrooms(n.doubleValue());
            if (fields.get("sqft") instanceof Number n) listing.setSqft(n.intValue());
            if (fields.get("price") instanceof Number n) listing.setPrice(n.doubleValue());
            if (fields.get("propertyType") instanceof String s) listing.setPropertyType(s);
            if (fields.get("yearBuilt") instanceof Number n) listing.setYearBuilt(n.intValue());
            if (fields.get("style") instanceof String s) listing.setStyle(s);
            if (fields.get("condition") instanceof String s) listing.setCondition(s);
            if (fields.get("tone") instanceof String s) listing.setTone(s);
            if (fields.get("features") instanceof List<?> l)
                listing.setFeatures(l.stream().map(Object::toString).collect(Collectors.toList()));
        }
        if (data.containsKey("generatedCopy")) {
            Map<String, Object> copy = (Map<String, Object>) data.get("generatedCopy");
            if (copy.get("mlsDescription") instanceof String s) listing.setMlsDescription(s);
            if (copy.get("headline") instanceof String s) listing.setHeadline(s);
            if (copy.get("tagline") instanceof String s) listing.setTagline(s);
            if (copy.get("socialInstagram") instanceof String s) listing.setSocialInstagram(s);
            if (copy.get("socialFacebook") instanceof String s) listing.setSocialFacebook(s);
            if (copy.get("socialLinkedin") instanceof String s) listing.setSocialLinkedin(s);
        }
        if (data.containsKey("visionAttributes")) {
            listing.setVisionAttributes((Map<String, Object>) data.get("visionAttributes"));
        }
        if (data.containsKey("runId")) listing.setLastRunId((String) data.get("runId"));
        listing.setUpdatedAt(Instant.now());
    }

    private Map<String, Object> listingToMap(Listing l) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("id", l.getId());
        m.put("tenantId", l.getTenantId());
        m.put("address", l.getAddress());
        m.put("bedrooms", l.getBedrooms());
        m.put("bathrooms", l.getBathrooms());
        m.put("sqft", l.getSqft());
        m.put("price", l.getPrice());
        m.put("propertyType", l.getPropertyType());
        m.put("style", l.getStyle());
        m.put("condition", l.getCondition());
        m.put("features", l.getFeatures());
        m.put("photoPaths", l.getPhotoPaths());
        m.put("mlsDescription", l.getMlsDescription());
        m.put("headline", l.getHeadline());
        m.put("status", l.getStatus());
        m.put("createdAt", l.getCreatedAt());
        m.put("updatedAt", l.getUpdatedAt());
        return m;
    }
}
