package com.ai.va.controller;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.ai.va.model.ChatRequest;
import com.ai.va.model.ChatResponse;
import com.ai.va.service.ChatSessionService; 

/**
 * Chat Session Controller Handles text-based conversations from React UI Shares
 * backend logic with Voice Channel (dialog manager, LLM, session state) Only
 * input/output modality differs (text vs audio)
 */
@RestController
@RequestMapping("/chat")
public class ChatSessionController {

	private static final Logger logger = LoggerFactory.getLogger(ChatSessionController.class);

	@Autowired
	private ChatSessionService chatSessionService;

	/**
	 * Initialize a chat session Called when user starts a chat conversation Fetches
	 * customer chat configuration from MongoDB
	 * 
	 * @param request Contains customerId and optional productId
	 * @return Session ID
	 */
	@PostMapping("/session")
	public ResponseEntity<Map<String, String>> startSession(@RequestBody Map<String, String> request) {
		try {
			String customerId = request.get("customerId");
			String productId = request.getOrDefault("productId", "va-service");

			logger.info("[ChatController] Starting session - customerId: {}, productId: {}", customerId, productId);

			Map<String, String> sessionData = chatSessionService.startSession(customerId, productId);
			
			logger.debug("[ChatController] Received session data: {}", sessionData);
			logger.debug("[ChatController] Greeting from service: {}", sessionData.get("greeting"));

			Map<String, String> response = new HashMap<>();
			response.put("sessionId", sessionData.get("sessionId"));
			response.put("customerId", customerId);
			response.put("productId", productId);
			response.put("status", "initialized");
			response.put("message", "Chat session started with configuration from MongoDB");
			response.put("greeting", sessionData.get("greeting")); // Include greeting from LLM
			
			logger.debug("[ChatController] Returning response: {}", response);

			return ResponseEntity.ok(response);
		} catch (Exception e) {
			logger.error("[ChatController] ERROR starting session: {}", e.getMessage(), e);
			throw new RuntimeException("Failed to start chat session: " + e.getMessage(), e);
		}
	}

	/**
	 * Process a chat message Called for each message from the user
	 * 
	 * @param request Contains sessionId and message
	 * @return Assistant's response
	 */
	@PostMapping("/message")
	public ResponseEntity<ChatResponse> processMessage(@RequestBody ChatRequest request) {
		try {
			logger.info("[ChatController] Processing message - sessionId: {}, message length: {}", request.getSessionId(), request.getMessage().length());
			ChatResponse response = chatSessionService.processMessage(request);
			logger.info("[ChatController] Message processed successfully - response length: {}", response.getMessage().length());
			return ResponseEntity.ok(response);
		} catch (Exception e) {
			logger.error("[ChatController] ERROR processing message for session {}: {}", request.getSessionId(), e.getMessage(), e);
			throw new RuntimeException("Failed to process chat message: " + e.getMessage(), e);
		}
	}

	/**
	 * Process a chat message with SSE streaming
	 * Streams tokens in real-time for improved UX
	 * 
	 * @param sessionId The session identifier
	 * @param message The user's message
	 * @return SseEmitter for streaming response tokens
	 */
	@GetMapping("/message/stream")
	public SseEmitter streamMessage(@RequestParam String sessionId, @RequestParam String message) {
		logger.info("[ChatController] Starting streaming message - sessionId: {}, message length: {}", sessionId, message.length());
		
		SseEmitter emitter = new SseEmitter(60000L); // 60 second timeout
		
		ChatRequest request = new ChatRequest();
		request.setSessionId(sessionId);
		request.setMessage(message);
		
		// Process message asynchronously with streaming
		chatSessionService.processMessageStreaming(request, emitter);
		
		return emitter;
	}

	/**
	 * End chat session
	 * 
	 * @param sessionId The session identifier
	 * @return Success response
	 */
	@PostMapping("/end")
	public ResponseEntity<Void> endSession(@RequestParam String sessionId) {
		chatSessionService.endSession(sessionId);
		return ResponseEntity.ok().build();
	}

	/**
	 * Get session history from MongoDB
	 * 
	 * @param sessionId The session identifier
	 * @return Conversation history with messages
	 */
	@GetMapping("/history/{sessionId}")
	public ResponseEntity<?> getHistory(@PathVariable String sessionId) {
		try {
			com.ai.va.model.ChatHistory history = chatSessionService.getChatHistory(sessionId);
			
			if (history == null) {
				return ResponseEntity.notFound().build();
			}
			
			return ResponseEntity.ok(history);
		} catch (Exception e) {
			System.err.println("[ChatController] ERROR retrieving history: " + e.getMessage());
			e.printStackTrace();
			return ResponseEntity.status(500).body(Map.of("error", "Failed to retrieve history"));
		}
	}
	
	/**
	 * Get active session for a customer
	 * 
	 * @param customerId The customer identifier
	 * @return Session ID if active session exists
	 */
	@GetMapping("/active-session/{customerId}")
	public ResponseEntity<Map<String, String>> getActiveSession(@PathVariable String customerId) {
		try {
			String sessionId = chatSessionService.getActiveSessionForCustomer(customerId);
			
			if (sessionId == null) {
				return ResponseEntity.ok(Map.of("hasActiveSession", "false"));
			}
			
			return ResponseEntity.ok(Map.of(
				"hasActiveSession", "true",
				"sessionId", sessionId
			));
		} catch (Exception e) {
			System.err.println("[ChatController] ERROR checking active session: " + e.getMessage());
			return ResponseEntity.status(500).body(Map.of("error", "Failed to check active session"));
		}
	}
}
