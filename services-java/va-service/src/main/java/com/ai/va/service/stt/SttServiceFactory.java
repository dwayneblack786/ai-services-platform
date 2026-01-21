package com.ai.va.service.stt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Factory for creating STT service instances based on configuration.
 * Handles provider selection (Whisper vs Azure) and fallback logic.
 */
@Component
public class SttServiceFactory {
    
    private static final Logger logger = LoggerFactory.getLogger(SttServiceFactory.class);
    
    private final String provider;
    private final List<SttService> availableServices;
    
    @Autowired
    public SttServiceFactory(
            @Value("${stt.provider:whisper}") String provider,
            List<SttService> availableServices) {
        this.provider = provider;
        this.availableServices = availableServices;
        logger.info("SttServiceFactory initialized with provider: {}, Available services: {}", 
            provider, availableServices.size());
    }
    
    /**
     * Get the configured STT service.
     * 
     * @return The active STT service instance
     * @throws IllegalStateException if no service is available
     */
    public SttService getSttService() {
        // Try to find the configured provider
        SttService configuredService = availableServices.stream()
            .filter(service -> service.getProvider().equalsIgnoreCase(provider))
            .findFirst()
            .orElse(null);
        
        if (configuredService != null && configuredService.isHealthy()) {
            logger.debug("Using configured STT provider: {}", provider);
            return configuredService;
        }
        
        // Fallback: try any healthy service
        logger.warn("Configured provider '{}' not available or unhealthy, trying fallback", provider);
        SttService fallbackService = availableServices.stream()
            .filter(SttService::isHealthy)
            .findFirst()
            .orElse(null);
        
        if (fallbackService != null) {
            logger.info("Using fallback STT provider: {}", fallbackService.getProvider());
            return fallbackService;
        }
        
        // No healthy service available
        throw new IllegalStateException("No healthy STT service available. Configured: " + provider);
    }
    
    /**
     * Get a specific STT service by provider name.
     * 
     * @param providerName Provider name ("whisper" or "azure")
     * @return The requested service, or null if not found
     */
    public SttService getSttService(String providerName) {
        return availableServices.stream()
            .filter(service -> service.getProvider().equalsIgnoreCase(providerName))
            .findFirst()
            .orElse(null);
    }
    
    /**
     * Check if a specific provider is available and healthy.
     * 
     * @param providerName Provider name to check
     * @return true if provider is available and healthy
     */
    public boolean isProviderAvailable(String providerName) {
        SttService service = getSttService(providerName);
        return service != null && service.isHealthy();
    }
    
    /**
     * Get all available provider names.
     * 
     * @return List of provider names
     */
    public List<String> getAvailableProviders() {
        return availableServices.stream()
            .map(SttService::getProvider)
            .toList();
    }
}
