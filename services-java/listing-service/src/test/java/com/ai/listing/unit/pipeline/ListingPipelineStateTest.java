package com.ai.listing.unit.pipeline;

import com.ai.listing.model.DataStoreConfig;
import com.ai.listing.pipeline.ListingPipelineState;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests — ListingPipelineState
 *
 * Verifies state initialisation, mutation, and error accumulation.
 */
class ListingPipelineStateTest {

    @Test
    void constructorSetsIdentityFields() {
        var state = new ListingPipelineState("lst-1", "tenant-1", "run-1", List.of(), null);

        assertThat(state.getListingId()).isEqualTo("lst-1");
        assertThat(state.getTenantId()).isEqualTo("tenant-1");
        assertThat(state.getRunId()).isEqualTo("run-1");
    }

    @Test
    void defaultStatusIsIngest() {
        var state = new ListingPipelineState("lst-1", "t-1", "r-1", List.of(), null);

        assertThat(state.getStatus()).isEqualTo("ingest");
    }

    @Test
    void photosAreInitialisedFromConstructor() {
        var photos = List.of(Map.of("photoId", "p1"), Map.of("photoId", "p2"));
        var state = new ListingPipelineState("lst-1", "t-1", "r-1", photos, null);

        assertThat(state.getPhotos()).hasSize(2);
    }

    @Test
    void nullPhotosInitialisedToEmptyList() {
        var state = new ListingPipelineState("lst-1", "t-1", "r-1", null, null);

        assertThat(state.getPhotos()).isEmpty();
    }

    @Test
    void addErrorAppendsToErrorsList() {
        var state = new ListingPipelineState();
        state.addError("Something failed");
        state.addError("Another failure");

        assertThat(state.getErrors()).containsExactly("Something failed", "Another failure");
    }

    @Test
    void settersAndGettersWorkCorrectly() {
        var state = new ListingPipelineState();
        var fields = Map.of("bedrooms", (Object) 3, "address", "123 Main St");
        var attrs = Map.of("flooring", (Object) "hardwood");
        var copy = Map.of("mlsDescription", (Object) "Beautiful home");

        state.setListingFields(fields);
        state.setPropertyAttributes(attrs);
        state.setGeneratedCopy(copy);
        state.setStatus("compliance");
        state.setPausedAt("review_1");

        assertThat(state.getListingFields()).containsEntry("bedrooms", 3);
        assertThat(state.getPropertyAttributes()).containsEntry("flooring", "hardwood");
        assertThat(state.getGeneratedCopy()).containsEntry("mlsDescription", "Beautiful home");
        assertThat(state.getStatus()).isEqualTo("compliance");
        assertThat(state.getPausedAt()).isEqualTo("review_1");
    }

    @Test
    void datastoreConfigIsPreserved() {
        var config = new DataStoreConfig(DataStoreConfig.StoreType.MONGODB, "mongodb://localhost", "testdb");
        var state = new ListingPipelineState("lst-1", "t-1", "r-1", List.of(), config);

        assertThat(state.getDatastoreConfig().getType()).isEqualTo(DataStoreConfig.StoreType.MONGODB);
        assertThat(state.getDatastoreConfig().getDatabase()).isEqualTo("testdb");
    }

    @Test
    void humanReview1IsNullByDefault() {
        var state = new ListingPipelineState();

        assertThat(state.getHumanReview1()).isNull();
        assertThat(state.getHumanReview2()).isNull();
    }
}
