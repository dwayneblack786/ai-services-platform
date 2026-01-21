package com.ai.va.config;

import java.io.IOException;

import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Configuration;

import com.ai.common.logging.LogFactory;
import com.ai.va.grpc.ChatServiceImpl;
import com.ai.va.grpc.VoiceServiceImpl;
import com.ai.va.grpc.HealthServiceImpl; 

import io.grpc.Server;
import io.grpc.ServerBuilder;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

/**
 * gRPC Server Configuration
 * Starts gRPC server on a separate port from HTTP REST API
 * Enables real-time streaming for voice and chat
 *
 * Note: Manually retrieves service beans to avoid Spring's eager class introspection
 * Supports both ChatService (always) and VoiceService (when 'voice' profile active)
 */
@Configuration
public class GrpcServerConfig {

	private static final Logger logger = LogFactory.getLogger(GrpcServerConfig.class);

	@Value("${grpc.server.port:50051}")
	private int grpcPort;

	private final ApplicationContext applicationContext;
	private Server grpcServer;

	public GrpcServerConfig(ApplicationContext applicationContext) {
		this.applicationContext = applicationContext;
		logger.info("🔧 GrpcServerConfig constructor called - bean is being created");
	}

	@PostConstruct
	public void startGrpcServer() {
		try {
			logger.info("Initializing gRPC Server on port {}...", grpcPort);

			// Build server with services
			ServerBuilder<?> serverBuilder = ServerBuilder.forPort(grpcPort);

			// Always register ChatService (required)
			ChatServiceImpl chatService = applicationContext.getBean(ChatServiceImpl.class);
			serverBuilder.addService(chatService);
			logger.info("📝 Registered ChatService for gRPC");

			// Conditionally register VoiceService (only if 'voice' profile is active)
			try {
				VoiceServiceImpl voiceService = applicationContext.getBean(VoiceServiceImpl.class);
				serverBuilder.addService(voiceService);
				logger.info("🎤 Registered VoiceService for gRPC (voice profile active)");
			} catch (Exception e) {
				logger.info("⏭️  VoiceService not registered (voice profile not active)");
			}

			// Always register HealthService
			try {
				HealthServiceImpl healthService = applicationContext.getBean(HealthServiceImpl.class);
				serverBuilder.addService(healthService);
				logger.info("💚 Registered HealthService for gRPC");
			} catch (Exception e) {
				logger.warn("⚠️  HealthService not registered: {}", e.getMessage());
			}

			// Start the server with all registered services
			grpcServer = serverBuilder.build().start();

			logger.info("✅ gRPC Server started successfully on port {}", grpcPort);

			// Graceful shutdown hook
			Runtime.getRuntime().addShutdownHook(new Thread(() -> {
				logger.info("Shutting down gRPC server");
				if (grpcServer != null) {
					grpcServer.shutdown();
				}
			}));
		} catch (IOException e) {
			logger.error("❌ Failed to start gRPC server on port {}: {}", grpcPort, e.getMessage(), e);
			throw new RuntimeException("Failed to start gRPC server", e);
		} catch (Exception e) {
			logger.error("❌ Unexpected error starting gRPC server: {}", e.getMessage(), e);
			throw new RuntimeException("Failed to start gRPC server", e);
		}
	}

	@PreDestroy
	public void stopGrpcServer() {
		if (grpcServer != null) {
			logger.info("Stopping gRPC server");
			grpcServer.shutdown();
		}
	}
}
