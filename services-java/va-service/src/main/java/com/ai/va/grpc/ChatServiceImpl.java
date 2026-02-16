package com.ai.va.grpc;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ai.common.logging.LogFactory;
import com.ai.va.grpc.ChatServiceGrpc.ChatServiceImplBase;
import com.ai.va.model.SessionState;
import com.ai.va.model.Turn;
import com.ai.va.service.ChatSessionService;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;

/**
 * gRPC implementation of ChatService
 * Provides streaming chat capabilities for LLM responses
 */
@Service
public class ChatServiceImpl extends ChatServiceImplBase {

	private static final Logger logger = LogFactory.getLogger(ChatServiceImpl.class);

	@Autowired
	private ChatSessionService chatSessionService;

	@Override
	public void endSession(com.ai.va.grpc.EndSessionRequest request, StreamObserver<com.ai.va.grpc.EndSessionResponse> responseObserver) {
		try {
			logger.info("gRPC EndSession - sessionId: {}", request.getSessionId());

			chatSessionService.endSession(request.getSessionId());

			com.ai.va.grpc.EndSessionResponse response = com.ai.va.grpc.EndSessionResponse.newBuilder()
					.setSuccess(true)
					.build();

			responseObserver.onNext(response);
			responseObserver.onCompleted();

		} catch (Exception e) {
			logger.error("Error in endSession gRPC", e);
			responseObserver.onError(Status.INTERNAL
					.withDescription("Failed to end session: " + e.getMessage())
					.asRuntimeException());
		}
	}

	@Override
	public void getHistory(com.ai.va.grpc.HistoryRequest request, StreamObserver<com.ai.va.grpc.HistoryResponse> responseObserver) {
		try {
			logger.info("gRPC GetHistory - sessionId: {}", request.getSessionId());

			SessionState session = chatSessionService.getSession(request.getSessionId());
			if (session == null) {
				responseObserver.onError(Status.NOT_FOUND
						.withDescription("Session not found")
						.asRuntimeException());
				return;
			}

			List<Turn> turns = session.getTranscript();
			com.ai.va.grpc.HistoryResponse.Builder builder = com.ai.va.grpc.HistoryResponse.newBuilder();

			for (Turn turn : turns) {
				com.ai.va.grpc.HistoryMessage message = com.ai.va.grpc.HistoryMessage.newBuilder()
						.setRole(turn.getSpeaker())
						.setContent(turn.getText())
						.setTimestamp((long) turn.getTimestamp())
						.build();
				builder.addMessages(message);
			}

			responseObserver.onNext(builder.build());
			responseObserver.onCompleted();

		} catch (Exception e) {
			logger.error("Error in getHistory gRPC", e);
			responseObserver.onError(Status.INTERNAL
					.withDescription("Failed to get history: " + e.getMessage())
					.asRuntimeException());
		}
	}

	@Override
	public void sendMessage(com.ai.va.grpc.ChatRequest request, StreamObserver<com.ai.va.grpc.ChatResponse> responseObserver) {
		try {
			logger.info("gRPC SendMessage (non-streaming) - sessionId: {}, message: {}",
					request.getSessionId(), request.getMessage());

			// Convert gRPC request to internal model
			com.ai.va.model.ChatRequest internalRequest = new com.ai.va.model.ChatRequest();
			internalRequest.setSessionId(request.getSessionId());
			internalRequest.setMessage(request.getMessage());

			// Process message using existing service
			com.ai.va.model.ChatResponse internalResponse = chatSessionService.processMessage(internalRequest);

			com.ai.va.grpc.ChatResponse.Builder builder = com.ai.va.grpc.ChatResponse.newBuilder()
					.setSessionId(request.getSessionId())
					.setMessage(internalResponse.getMessage())
					.setIsFinal(true);

			if (internalResponse.getIntent() != null) {
				builder.setIntent(internalResponse.getIntent());
			}

			if (internalResponse.isRequiresAction()) {
				builder.setRequiresAction(true);
				if (internalResponse.getSuggestedAction() != null) {
					builder.setSuggestedAction(internalResponse.getSuggestedAction());
				}
			}

			responseObserver.onNext(builder.build());
			responseObserver.onCompleted();

		} catch (Exception e) {
			logger.error("Error in sendMessage gRPC", e);
			responseObserver.onError(Status.INTERNAL
					.withDescription("Failed to process message: " + e.getMessage())
					.asRuntimeException());
		}
	}

	@Override
	public void sendMessageStream(com.ai.va.grpc.ChatRequest request, StreamObserver<com.ai.va.grpc.ChatResponse> responseObserver) {
		try {
			logger.info("gRPC SendMessageStream - sessionId: {}, message: {}",
					request.getSessionId(), request.getMessage());

			// Use async processing to avoid blocking gRPC thread
			chatSessionService.processMessageStreamingGrpc(
					request.getSessionId(),
					request.getMessage(),
					responseObserver
					);

		} catch (Exception e) {
			logger.error("Error in sendMessageStream gRPC", e);
			responseObserver.onError(Status.INTERNAL
					.withDescription("Failed to process message: " + e.getMessage())
					.asRuntimeException());
		}
	}

	@Override
	public void startSession(com.ai.va.grpc.SessionRequest request, StreamObserver<com.ai.va.grpc.SessionResponse> responseObserver) {
		try {
			logger.info("gRPC StartSession - customerId: {}, productId: {}",
					request.getCustomerId(), request.getProductId());

			Map<String, Object> result = chatSessionService.startSession(
					request.getCustomerId(),
					request.getProductId()
					);

			com.ai.va.grpc.SessionResponse response = com.ai.va.grpc.SessionResponse.newBuilder()
					.setSessionId((String) result.get("sessionId"))
					.setGreeting((String) result.getOrDefault("greeting", "Hello! How can I assist you today?"))
					.setSuccess(true)
					.build();

			responseObserver.onNext(response);
			responseObserver.onCompleted();

		} catch (Exception e) {
			logger.error("Error in startSession gRPC", e);
			responseObserver.onError(Status.INTERNAL
					.withDescription("Failed to start session: " + e.getMessage())
					.asRuntimeException());
		}
	}
}
