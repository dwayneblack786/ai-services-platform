package com.ai.va.grpc;

import com.ai.common.logging.LogFactory;
import com.ai.va.grpc.HealthServiceGrpc.HealthServiceImplBase;
import com.ai.va.service.stt.SttService;
import com.ai.va.service.stt.SttServiceFactory;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * gRPC implementation of HealthService
 * Provides health checks for STT service and MongoDB
 * Implements Task 3.3 from Phase 3 plan
 */
@Service
public class HealthServiceImpl extends HealthServiceImplBase {

    private static final Logger logger = LogFactory.getLogger(HealthServiceImpl.class);

    @Autowired
    private SttServiceFactory sttServiceFactory;
    
    @Autowired
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    /**
     * Health check for Voice service components
     * Checks STT service and MongoDB connectivity
     */
    @Override
    public void check(HealthCheckRequest request, StreamObserver<HealthCheckResponse> responseObserver) {
        try {
            String service = request.getService();
            logger.debug("[HealthCheck] Checking service: {}", service.isEmpty() ? "all" : service);
            
            boolean sttHealthy = checkSttService();
            boolean mongoHealthy = checkMongoDb();
            
            HealthCheckResponse.Builder responseBuilder = HealthCheckResponse.newBuilder();
            
            // Determine overall status
            if (service.isEmpty() || service.equals("all")) {
                // Check all services
                if (sttHealthy && mongoHealthy) {
                    responseBuilder.setStatus(HealthCheckResponse.ServingStatus.SERVING)
                        .setMessage("All services healthy");
                } else {
                    responseBuilder.setStatus(HealthCheckResponse.ServingStatus.NOT_SERVING)
                        .setMessage("Some services unhealthy");
                }
                responseBuilder.putDetails("stt", sttHealthy ? "healthy" : "unhealthy");
                responseBuilder.putDetails("mongodb", mongoHealthy ? "healthy" : "unhealthy");
                
            } else if (service.equals("stt")) {
                // Check only STT
                if (sttHealthy) {
                    responseBuilder.setStatus(HealthCheckResponse.ServingStatus.SERVING)
                        .setMessage("STT service healthy");
                } else {
                    responseBuilder.setStatus(HealthCheckResponse.ServingStatus.NOT_SERVING)
                        .setMessage("STT service unhealthy");
                }
                responseBuilder.putDetails("stt", sttHealthy ? "healthy" : "unhealthy");
                
            } else if (service.equals("mongodb")) {
                // Check only MongoDB
                if (mongoHealthy) {
                    responseBuilder.setStatus(HealthCheckResponse.ServingStatus.SERVING)
                        .setMessage("MongoDB healthy");
                } else {
                    responseBuilder.setStatus(HealthCheckResponse.ServingStatus.NOT_SERVING)
                        .setMessage("MongoDB unhealthy");
                }
                responseBuilder.putDetails("mongodb", mongoHealthy ? "healthy" : "unhealthy");
                
            } else {
                responseBuilder.setStatus(HealthCheckResponse.ServingStatus.UNKNOWN)
                    .setMessage("Unknown service: " + service);
            }
            
            // Add provider info
            try {
                SttService sttService = sttServiceFactory.getSttService();
                String provider = sttService.getClass().getSimpleName();
                responseBuilder.putDetails("stt_provider", provider);
            } catch (Exception e) {
                logger.warn("[HealthCheck] Could not get STT provider info", e);
            }
            
            HealthCheckResponse response = responseBuilder.build();
            logger.info("[HealthCheck] Status: {}, Message: {}", 
                response.getStatus(), response.getMessage());
            
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            logger.error("[HealthCheck] Error performing health check", e);
            responseObserver.onError(Status.INTERNAL
                .withDescription("Health check failed: " + e.getMessage())
                .asRuntimeException());
        }
    }
    
    /**
     * Check STT service health
     */
    private boolean checkSttService() {
        try {
            SttService sttService = sttServiceFactory.getSttService();
            // STT service is considered healthy if we can get an instance
            // More sophisticated health check could involve a test transcription
            return sttService != null;
        } catch (Exception e) {
            logger.warn("[HealthCheck] STT service check failed", e);
            return false;
        }
    }
    
    /**
     * Check MongoDB connectivity
     */
    private boolean checkMongoDb() {
        try {
            // Try to execute a simple MongoDB command
            mongoTemplate.getDb().getName();
            return true;
        } catch (Exception e) {
            logger.warn("[HealthCheck] MongoDB check failed", e);
            return false;
        }
    }
}
