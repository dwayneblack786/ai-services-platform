package com.ai.listing.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Document(collection = "listings")
public class Listing {

    @Id
    private String id;

    @Indexed
    private String tenantId;

    private String address;
    private Integer bedrooms;
    private Double bathrooms;
    private Integer sqft;
    private Double price;
    private String propertyType;
    private Integer yearBuilt;
    private String style;
    private String condition;
    private String tone;
    private List<String> features;
    private List<String> photoPaths;
    private List<String> stagedImageUrls;

    // Generated copy (populated after pipeline completes)
    private String mlsDescription;
    private String headline;
    private String tagline;
    private String socialInstagram;
    private String socialFacebook;
    private String socialLinkedin;

    // Vision analysis results (from PropVision)
    private Map<String, Object> visionAttributes;

    // Pipeline reference
    private String lastRunId;

    private String status;  // draft | processing | review_1 | review_2 | published
    private Instant createdAt;
    private Instant updatedAt;

    public Listing() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.status = "draft";
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Integer getBedrooms() { return bedrooms; }
    public void setBedrooms(Integer bedrooms) { this.bedrooms = bedrooms; }

    public Double getBathrooms() { return bathrooms; }
    public void setBathrooms(Double bathrooms) { this.bathrooms = bathrooms; }

    public Integer getSqft() { return sqft; }
    public void setSqft(Integer sqft) { this.sqft = sqft; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public String getPropertyType() { return propertyType; }
    public void setPropertyType(String propertyType) { this.propertyType = propertyType; }

    public Integer getYearBuilt() { return yearBuilt; }
    public void setYearBuilt(Integer yearBuilt) { this.yearBuilt = yearBuilt; }

    public String getStyle() { return style; }
    public void setStyle(String style) { this.style = style; }

    public String getCondition() { return condition; }
    public void setCondition(String condition) { this.condition = condition; }

    public String getTone() { return tone; }
    public void setTone(String tone) { this.tone = tone; }

    public List<String> getFeatures() { return features; }
    public void setFeatures(List<String> features) { this.features = features; }

    public List<String> getPhotoPaths() { return photoPaths; }
    public void setPhotoPaths(List<String> photoPaths) { this.photoPaths = photoPaths; }

    public List<String> getStagedImageUrls() { return stagedImageUrls; }
    public void setStagedImageUrls(List<String> stagedImageUrls) { this.stagedImageUrls = stagedImageUrls; }

    public String getMlsDescription() { return mlsDescription; }
    public void setMlsDescription(String mlsDescription) { this.mlsDescription = mlsDescription; }

    public String getHeadline() { return headline; }
    public void setHeadline(String headline) { this.headline = headline; }

    public String getTagline() { return tagline; }
    public void setTagline(String tagline) { this.tagline = tagline; }

    public String getSocialInstagram() { return socialInstagram; }
    public void setSocialInstagram(String socialInstagram) { this.socialInstagram = socialInstagram; }

    public String getSocialFacebook() { return socialFacebook; }
    public void setSocialFacebook(String socialFacebook) { this.socialFacebook = socialFacebook; }

    public String getSocialLinkedin() { return socialLinkedin; }
    public void setSocialLinkedin(String socialLinkedin) { this.socialLinkedin = socialLinkedin; }

    public Map<String, Object> getVisionAttributes() { return visionAttributes; }
    public void setVisionAttributes(Map<String, Object> visionAttributes) { this.visionAttributes = visionAttributes; }

    public String getLastRunId() { return lastRunId; }
    public void setLastRunId(String lastRunId) { this.lastRunId = lastRunId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; this.updatedAt = Instant.now(); }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
