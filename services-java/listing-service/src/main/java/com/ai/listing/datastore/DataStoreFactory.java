package com.ai.listing.datastore;

import com.ai.listing.model.DataStoreConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Factory that returns the correct DataStore implementation based on tenant config.
 * New store types are added here as additional cases.
 */
@Component
public class DataStoreFactory {

    @Autowired
    private MongoDataStore mongoDataStore;

    public DataStore getDataStore(DataStoreConfig config) {
        if (config == null) return mongoDataStore;

        return switch (config.getType()) {
            case MONGODB -> mongoDataStore;
            case POSTGRESQL -> throw new UnsupportedOperationException("PostgreSQL store not yet implemented");
            case S3 -> throw new UnsupportedOperationException("S3 store not yet implemented");
        };
    }
}
