package com.ai.listing.model;

/**
 * Tenant-configurable data store settings.
 * Stored in the platform's product-configurations collection.
 */
public class DataStoreConfig {

    public enum StoreType {
        MONGODB, POSTGRESQL, S3
    }

    private StoreType type = StoreType.MONGODB;
    private String connectionString;
    private String database;
    private String bucket;   // S3 only
    private String region;   // S3 only

    public DataStoreConfig() {}

    public DataStoreConfig(StoreType type, String connectionString, String database) {
        this.type = type;
        this.connectionString = connectionString;
        this.database = database;
    }

    public StoreType getType() { return type; }
    public void setType(StoreType type) { this.type = type; }

    public String getConnectionString() { return connectionString; }
    public void setConnectionString(String connectionString) { this.connectionString = connectionString; }

    public String getDatabase() { return database; }
    public void setDatabase(String database) { this.database = database; }

    public String getBucket() { return bucket; }
    public void setBucket(String bucket) { this.bucket = bucket; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
}
