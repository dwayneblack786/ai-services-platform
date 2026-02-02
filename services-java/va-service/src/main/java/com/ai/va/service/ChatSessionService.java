package com.ai.va.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.ai.common.logging.LogFactory;
import com.ai.va.model.ChannelConfiguration;
import com.ai.va.model.ChannelType;
import com.ai.va.model.ChatRequest;
import com.ai.va.model.ChatResponse;
import com.ai.va.model.LlmResult;
import com.ai.va.model.PromptContext;
import com.ai.va.model.SessionState;
import com.ai.va.model.Turn;

import io.grpc.stub.StreamObserver;

/**
 * Chat Session Service
 * Handles text-based conversations (Chat Channel)
 * Shares the same dialog manager, LLM logic, and session state with Voice Channel
 * Only the input/output modality changes (text vs audio)
 */
@Service
public class ChatSessionService {

	private static final Logger logger = LogFactory.getLogger(MongoDBService.class);

	@Autowired
	private LlmService llmService;

	@Autowired
	private DialogManager dialogManager;

	@Autowired
	private UsageService usageService;

	@Autowired
	private ConfigurationService configurationService;

	@Autowired
	private com.ai.va.client.LlmClient llmClient;

	@Autowired
	private MongoDBService mongoDBService;

	// In-memory session storage (consider Redis for production)
	private final Map<String, SessionState> activeSessions = new ConcurrentHashMap<>();

	// Track active session by customer (one session per customer)
	private final Map<String, String> customerToSessionMap = new ConcurrentHashMap<>();

	/**
	 * Build location-based response from available data
	 */
	private String buildLocationResponse(SessionState state) {
		ChannelConfiguration config = configurationService.getChatConfiguration(
				state.getCustomerId(), state.getProductId());
		if (config == null || config.getPromptContext() == null) {
			return null;
		}

		List<Object> locations = config.getPromptContext().getLocations();
		if (locations == null || locations.isEmpty()) {
			return null;
		}

		StringBuilder sb = new StringBuilder();
		sb.append("Based on the location information I have, here are the relevant facilities:\n\n");

		int count = 0;
		for (Object loc : locations) {
			if (loc instanceof Map && count < 4) { // Limit to top 4 results
				@SuppressWarnings("unchecked")
				Map<String, Object> locMap = (Map<String, Object>) loc;

				String name = (String) locMap.get("name");
				String address = (String) locMap.get("address");
				String phone = (String) locMap.get("phone");
				String distance = (String) locMap.get("distance");

				count++;
				sb.append(count).append(". **").append(name).append("**\n");
				if (address != null) {
					sb.append("   Address: ").append(address).append("\n");
				}
				if (phone != null) {
					sb.append("   Phone: ").append(phone).append("\n");
				}
				if (distance != null) {
					sb.append("   Distance: ").append(distance).append("\n");
				}
				sb.append("\n");
			}
		}

		if (count > 0) {
			sb.append("Would you like more information about any of these locations?");
			return sb.toString();
		}

		return null;
	}

	/**
	 * Build comprehensive system prompt from configuration
	 * Implements the 5-layer prompt structure:
	 * 1. Role/Persona
	 * 2. Business Context (Static Knowledge)
	 * 3. RAG Knowledge (placeholder for now)
	 * 4. Conversation Context
	 * 5. Constraints/Guardrails
	 */
	private String buildSystemPrompt(ChannelConfiguration config) {
		StringBuilder prompt = new StringBuilder();

		// === LAYER 1: ROLE / PERSONA ===
		prompt.append("=== YOUR ROLE ===\n");
		if (config.getPromptContext() != null) {
			prompt.append(config.getPromptContext().buildRoleSection());
		} else {
			prompt.append("You are a helpful virtual assistant.\n");
		}
		prompt.append("\n");

		// === LAYER 2: BUSINESS CONTEXT (Static Knowledge) ===
		prompt.append("=== BUSINESS KNOWLEDGE ===\n");
		if (config.getPromptContext() != null) {
			String businessContext = config.getPromptContext().buildBusinessContextSection();
			if (businessContext != null && !businessContext.isEmpty()) {
				prompt.append(businessContext);
			} else {
				prompt.append("No specific business context provided.\n");
			}
		}
		prompt.append("\n");

		// === LAYER 3: RAG KNOWLEDGE (Web Search Capability) ===
		if (config.getRagConfig() != null && config.getRagConfig().isEnabled()) {
			prompt.append("=== WEB SEARCH & REAL-TIME DATA ===\n");
			prompt.append("You have the ability to search the internet for real-time information.\n\n");

			prompt.append("WHEN TO SEARCH:\n");
			prompt.append("- User asks for location-based information (nearest hospital, restaurants, stores)\n");
			prompt.append("- User asks about current events, weather, or time-sensitive information\n");
			prompt.append("- User asks about specific businesses, addresses, or phone numbers\n");
			prompt.append("- User requests directions or distance calculations\n");
			prompt.append("- Any information not in the BUSINESS KNOWLEDGE section above\n\n");

			prompt.append("HOW TO SEARCH:\n");
			prompt.append("When you need to search, format your response as follows:\n");
			prompt.append("1. Acknowledge the request\n");
			prompt.append("2. State that you'll search for the information\n");
			prompt.append("3. Include a search query in this format: [SEARCH: your search query here]\n");
			prompt.append("4. Explain what you're looking for\n\n");

			prompt.append("SEARCH EXAMPLES:\n\n");

			prompt.append("User: 'Where is the nearest hospital to 33064?'\n");
			prompt.append("YOU: 'I understand you're looking for the nearest hospital to zip code 33064 (Deerfield Beach, FL). ");
			prompt.append("Let me search for hospitals near you.\n\n");
			prompt.append("[SEARCH: hospitals near 33064 Deerfield Beach Florida with addresses phone numbers]\n\n");
			prompt.append("I'm searching for nearby hospitals with their contact information and distances.'\n\n");

			prompt.append("User: 'What's the weather like today?'\n");
			prompt.append("YOU: 'I'd be happy to check the current weather for you. ");
			prompt.append("What is your location?\n\n");
			prompt.append("[SEARCH: current weather {location once provided}]'\n\n");

			prompt.append("User: 'Find restaurants open now near me' (after they've provided location)\n");
			prompt.append("YOU: 'Let me search for restaurants currently open near you.\n\n");
			prompt.append("[SEARCH: restaurants open now near {location} with hours phone numbers]\n\n");
			prompt.append("I'm looking for restaurants that are open right now in your area.'\n\n");

			prompt.append("CRITICAL SEARCH RULES:\n");
			prompt.append("- Always include [SEARCH: query] tag on its own line\n");
			prompt.append("- Make search queries specific and detailed\n");
			prompt.append("- Include location information in the query when relevant\n");
			prompt.append("- Request specific details (addresses, phone numbers, hours, distance)\n");
			prompt.append("- After stating [SEARCH:], explain to the user what you're searching for\n");
			prompt.append("- Once search results are provided, format them clearly with bullet points or numbered lists\n\n");

			if (config.getRagConfig().getSources() != null && !config.getRagConfig().getSources().isEmpty()) {
				prompt.append("AVAILABLE SEARCH SOURCES:\n");
				config.getRagConfig().getSources().forEach(source -> {
					prompt.append("- ").append(source.getType()).append(": ").append(source.getUrl());
					if (source.getDescription() != null) {
						prompt.append(" (").append(source.getDescription()).append(")");
					}
					prompt.append("\n");
				});
			}
			prompt.append("\n");
		} else {
			prompt.append("=== KNOWLEDGE LIMITATION ===\n");
			prompt.append("You do NOT have access to real-time internet data or web search.\n");
			prompt.append("Only provide information from the BUSINESS KNOWLEDGE section above.\n");
			prompt.append("If asked about information not in your knowledge base, politely explain you don't have access to that information.\n");
			prompt.append("\n");
		}

		// === LAYER 4: CONVERSATION BEHAVIOR ===
		prompt.append("=== CONVERSATION GUIDELINES ===\n");
		if (config.getPromptContext() != null) {
			String behaviorConstraints = config.getPromptContext().buildBehaviorConstraints();
			if (behaviorConstraints != null && !behaviorConstraints.isEmpty()) {
				prompt.append(behaviorConstraints);
			}
		}
		prompt.append("- Respond clearly and concisely.\n");
		prompt.append("- Be helpful and professional.\n");
		prompt.append("- If you don't know something, say so honestly.\n");
		prompt.append("\n");

		prompt.append("=== RESPONSE PATTERN: ACKNOWLEDGE → PERSONA → EXPECTATIONS ===\n");
		prompt.append("Every response should follow this 3-part structure:\n\n");

		prompt.append("1. ACKNOWLEDGEMENT (Show you understood):\n");
		prompt.append("   - Reflect back what the user asked for\n");
		prompt.append("   - Examples: 'I understand you're looking for...', 'You asked about...', 'Thank you for providing...'\n\n");

		prompt.append("2. ESTABLISH HELPFUL PERSONA (Show capability and willingness):\n");
		prompt.append("   - Express your ability and desire to help\n");
		prompt.append("   - Examples: 'I'd be happy to help you with that.', 'I can assist you with...', 'Let me help you find...'\n\n");

		prompt.append("3. MANAGE EXPECTATIONS (Clear next step or complete answer):\n");
		prompt.append("   - If you have the information in BUSINESS KNOWLEDGE section: Provide the complete answer immediately\n");
		prompt.append("   - If you need more information: Ask specific clarifying questions\n");
		prompt.append("   - Examples: 'Here are the options near you...', 'I'll need your location to provide accurate results.'\n\n");

		prompt.append("=== EXAMPLE RESPONSES ===\n\n");

		prompt.append("User: 'Where is the nearest hospital?'\n");
		prompt.append("BAD: 'I can help you find directions to a nearby hospital if you'd like.'\n");
		prompt.append("GOOD: 'I understand you're looking for the nearest hospital. I'd be happy to help you find nearby hospitals. ");
		prompt.append("To give you accurate information, what is your current location or zip code?'\n\n");

		prompt.append("User: '33064'\n");
		prompt.append("BAD: 'Okay, 33064. Let me find the closest hospital to you.' (then nothing)\n");
		prompt.append("GOOD: 'Thank you for providing your location in 33064 (Deerfield Beach). I can help you find hospitals in your area. ");
		prompt.append("Based on the location data I have, here are the closest hospitals: [list from BUSINESS KNOWLEDGE].'\n\n");

		prompt.append("=== CRITICAL RULES ===\n");
		prompt.append("- NEVER promise to do something you cannot deliver in the same response\n");
		prompt.append("- If location data exists in BUSINESS KNOWLEDGE section, USE IT immediately when user provides location\n");
		prompt.append("- Don't say 'Let me find...' or 'I'll look up...' - either provide the answer NOW or ask for needed info\n");
		prompt.append("- Always complete all 3 parts: Acknowledge → Persona → Expectations\n");
		prompt.append("\n");

		// === LAYER 5: CONSTRAINTS / GUARDRAILS ===
		prompt.append("=== SAFETY CONSTRAINTS ===\n");
		if (config.getCustomPrompts() != null) {
			prompt.append(config.getCustomPrompts().buildConstraintsSection());
		} else {
			prompt.append("- Always be respectful and professional.\n");
			prompt.append("- Do not provide medical, legal, or financial advice.\n");
			prompt.append("- If unsure, escalate to a human agent.\n");
		}

		// Add custom system prompt override if provided
		if (config.getCustomPrompts() != null &&
				config.getCustomPrompts().getSystemPrompt() != null &&
				!config.getCustomPrompts().getSystemPrompt().isEmpty()) {
			prompt.append("\n=== ADDITIONAL INSTRUCTIONS ===\n");
			prompt.append(config.getCustomPrompts().getSystemPrompt());
			prompt.append("\n");
		}

		return prompt.toString();
	}

	/**
	 * End session and cleanup
	 */
	public void endSession(String sessionId) {
		SessionState session = activeSessions.remove(sessionId);
		if (session != null) {
			// Remove from customer mapping
			customerToSessionMap.remove(session.getCustomerId());

			// Mark chat history as ended in MongoDB
			try {
				markHistoryAsEnded(sessionId);
			} catch (Exception e) {
				System.err.println("Error marking history as ended: " + e.getMessage());
			}

			dialogManager.clearContext(sessionId);
			usageService.finalizeMetrics(sessionId);
			logger.info("Ended chat session: {}", sessionId);
		}
	}

	/**
	 * Generate proactive follow-up messages based on context
	 * Detects scenarios where additional information should be automatically provided
	 */
	private List<String> generateProactiveFollowUp(SessionState state, String assistantMessage, String userMessage) {
		List<String> messages = new ArrayList<>();
		messages.add(assistantMessage); // Always include the primary message

		// Check if user provided location information and we have location data
		if (shouldProvideLocationData(state, userMessage)) {
			String locationInfo = buildLocationResponse(state);
			if (locationInfo != null && !locationInfo.isEmpty()) {
				messages.add(locationInfo);
				logger.debug("[ChatSession] Added proactive location response");
			}
		}

		// Only return if we have multiple messages
		return messages.size() > 1 ? messages : null;
	}

	/**
	 * Get active session ID for a customer (one session per customer)
	 */
	public String getActiveSessionForCustomer(String customerId) {
		return customerToSessionMap.get(customerId);
	}

	/**
	 * Get chat history from MongoDB
	 */
	public com.ai.va.model.ChatHistory getChatHistory(String sessionId) {
		try {
			org.bson.Document query = new org.bson.Document("sessionId", sessionId);
			org.bson.Document historyDoc = mongoDBService.findOne("chat_messages", query);

			if (historyDoc == null) {
				return null;
			}

			com.ai.va.model.ChatHistory history = new com.ai.va.model.ChatHistory();
			history.setSessionId(sessionId);
			history.setCustomerId(historyDoc.getString("customerId"));
			history.setProductId(historyDoc.getString("productId"));
			history.setStartedAt(historyDoc.getDate("startedAt"));
			history.setLastUpdatedAt(historyDoc.getDate("lastUpdatedAt"));
			history.setEndedAt(historyDoc.getDate("endedAt"));
			history.setActive(historyDoc.getBoolean("isActive", true));

			// Parse messages
			java.util.List<org.bson.Document> messageDocs =
					(java.util.List<org.bson.Document>) historyDoc.get("messages");

			if (messageDocs != null) {
				java.util.List<com.ai.va.model.ChatMessage> messages = new java.util.ArrayList<>();
				for (org.bson.Document msgDoc : messageDocs) {
					com.ai.va.model.ChatMessage msg = new com.ai.va.model.ChatMessage();
					msg.setRole(msgDoc.getString("role"));
					msg.setContent(msgDoc.getString("content"));
					msg.setTimestamp(msgDoc.getDate("timestamp"));
					msg.setIntent(msgDoc.getString("intent"));
					messages.add(msg);
				}
				history.setMessages(messages);
			}

			return history;
		} catch (Exception e) {
			System.err.println("[ChatHistory] Error retrieving history: " + e.getMessage());
			e.printStackTrace();
			return null;
		}
	}

	/**
	 * Get active session (nullable)
	 */
	public SessionState getSession(String sessionId) {
		return activeSessions.get(sessionId);
	}

	/**
	 * Get active session state
	 */
	public SessionState getState(String sessionId) {
		SessionState state = activeSessions.get(sessionId);
		if (state == null) {
			throw new IllegalStateException("Session not found: " + sessionId);
		}
		return state;
	}

	/**
	 * Generate initial greeting using LLM with tenant configuration
	 * Reusable by both Chat and Voice channels
	 * 
	 * @param session Session state with configuration loaded
	 * @param channelConfig Channel-specific configuration (chat or voice)
	 * @param sessionId Session ID for logging
	 * @return Generated greeting text
	 */
	public String generateInitialGreeting(SessionState session, ChannelConfiguration channelConfig, String sessionId) {
		String greetingMessage = "Hello! How can I assist you today?"; // Default

		// Extract and set industry/context from prompt context
		if (channelConfig.getPromptContext() != null) {
			PromptContext context = channelConfig.getPromptContext();
			if (context.getTenantIndustry() != null) {
				session.setCustomerIndustry(context.getTenantIndustry());
			}
			if (context.getBusinessContext() != null) {
				session.setBusinessContext(context.getBusinessContext());
			}
		}

		// Build system prompt from configuration
		String systemPrompt = buildSystemPrompt(channelConfig);
		String greetingPrompt = "Generate a brief, friendly greeting message for this session. Keep it concise and welcoming.";

		logger.debug("============================================================");
		logger.debug(systemPrompt);

		try {
			logger.info("[Session] Initializing LLM with system prompt...");
			logger.debug("[Session] System prompt length: {} characters", systemPrompt.length());
			logger.debug("[Session] Generating greeting message...");

			// Generate greeting using LLM with the system prompt
			String llmResponse = llmClient.getChatCompletion(
					systemPrompt,
					greetingPrompt,
					0.7
					);

			logger.info("[Session] LLM initialized successfully for session: {}", sessionId);
			logger.debug("[Session] LLM greeting response: {}", llmResponse);

			// Use LLM response as greeting message
			if (llmResponse != null && !llmResponse.isEmpty()) {
				greetingMessage = llmResponse;
				logger.info("[Session] Using LLM-generated greeting");
			} else if (channelConfig.getGreeting() != null && !channelConfig.getGreeting().isEmpty()) {
				greetingMessage = channelConfig.getGreeting();
				logger.info("[Session] Using config greeting as fallback");
			}

		} catch (Exception llmError) {
			logger.error("[Session] ============================================");
			logger.error("[Session] ERROR: LLM greeting generation failed!");
			logger.error("[Session] Error type: {}", llmError.getClass().getName());
			logger.error("[Session] Error message: {}", llmError.getMessage());
			logger.error("[Session] ============================================", llmError);
			logger.warn("[Session] Using configured greeting as fallback");

			// Use configured greeting as fallback
			if (channelConfig.getGreeting() != null && !channelConfig.getGreeting().isEmpty()) {
				greetingMessage = channelConfig.getGreeting();
			}
		}

		logger.debug("[Session] Final Greeting: {}", greetingMessage);
		return greetingMessage;
	}

	/**
	 * Initialize session with configuration and generate consistent greeting using LLM
	 * This method ensures the greeting is always generated using the same system prompt
	 * whether starting a new session or resuming an existing one
	 *
	 * @param session The session state to initialize
	 * @param chatConfig The chat channel configuration from MongoDB
	 * @param sessionId The session ID for logging
	 * @return The greeting message generated by LLM or from config
	 */
	private String initializeSessionWithConfig(SessionState session, ChannelConfiguration chatConfig, String sessionId) {
		String greetingMessage = "Hello! How can I assist you today?"; // Default

		session.setChannelConfiguration(chatConfig);

		// Generate greeting using shared logic
		greetingMessage = generateInitialGreeting(session, chatConfig, sessionId);

		logger.info("Configuration loaded for session: {}", sessionId);
		logger.debug("  - Has Custom Prompts: {}", (chatConfig.getCustomPrompts() != null));
		logger.debug("  - RAG Enabled: {}", (chatConfig.getRagConfig() != null && chatConfig.getRagConfig().isEnabled()));
		logger.debug("  - Industry: {}", session.getCustomerIndustry());
		logger.debug("  - Final Greeting: {}", greetingMessage);

		return greetingMessage;
	}

	/**
	 * Mark history as ended in MongoDB
	 */
	private void markHistoryAsEnded(String sessionId) {
		try {
			org.bson.Document query = new org.bson.Document("sessionId", sessionId);
			org.bson.Document update = new org.bson.Document("$set",
					new org.bson.Document("endedAt", new java.util.Date())
					.append("isActive", false));

			mongoDBService.getCollection("chat_messages").updateOne(query, update);
			logger.info("[ChatHistory] Marked session as ended: {}", sessionId);
		} catch (Exception e) {
			logger.error("[ChatHistory] Error marking as ended: {}", e.getMessage(), e);
		}
	}

	/**
	 * Process text message through the assistant pipeline
	 * Steps:
	 * 1. No STT needed - already text
	 * 2. Dialog: update context, detect intent, extract slots
	 * 3. LLM: generate response
	 * 4. No TTS needed - return text
	 * 5. Record usage (only LLM tokens)
	 */
	public ChatResponse processMessage(ChatRequest request) {
		String sessionId = request.getSessionId();
		String userMessage = request.getMessage();

		SessionState state = activeSessions.get(sessionId);
		if (state == null) {
			throw new IllegalStateException("Session not found: " + sessionId);
		}

		try {
			logger.info("[ChatSession] Processing message for session: {}", sessionId);

			// Save user message to MongoDB
			com.ai.va.model.ChatMessage userMsg = new com.ai.va.model.ChatMessage("user", userMessage);
			saveChatHistory(sessionId, state.getCustomerId(), state.getProductId(), userMsg);

			// 1. Add user message to conversation
			state.addTurn(Turn.caller(userMessage));
			logger.debug("[ChatSession] User message added, turn count: {}", state.getTranscript().size());

			// 2. Process user input: detect intent and extract slots
			logger.debug("[ChatSession] Processing user input through dialog manager...");
			dialogManager.processUserInput(state, userMessage);
			logger.debug("[ChatSession] Intent detected: {}", state.getCurrentIntent());

			// 3. Build prompt and generate LLM response
			logger.debug("[ChatSession] Building prompt...");
			String prompt = dialogManager.buildPrompt(state);
			logger.debug("[ChatSession] Prompt length: {} characters", prompt.length());

			logger.debug("[ChatSession] Calling LLM service...");
			LlmResult llmResult = llmService.generateWithMetadata(prompt);
			String assistantMessage = llmResult.getText();
			logger.debug("[ChatSession] LLM response received: {} characters", (assistantMessage != null ? assistantMessage.length() : 0));

			// 4. Add assistant response to conversation
			state.addTurn(Turn.assistant(assistantMessage));
			saveState(sessionId, state);
			logger.debug("[ChatSession] State saved");

			// Save assistant message to MongoDB
			com.ai.va.model.ChatMessage assistantMsg = new com.ai.va.model.ChatMessage(
					"assistant", assistantMessage, state.getCurrentIntent());
			saveChatHistory(sessionId, state.getCustomerId(), state.getProductId(), assistantMsg);

			// 5. Usage metrics (only LLM for chat channel)
			usageService.trackLlmUsage(sessionId, llmResult.getTokensIn(), llmResult.getTokensOut());
			usageService.setCustomerId(sessionId, state.getCustomerId());
			logger.debug("[ChatSession] Usage tracked: in={} out={}", llmResult.getTokensIn(), llmResult.getTokensOut());

			// 6. Check if proactive follow-up is needed
			List<String> multiMessages = generateProactiveFollowUp(state, assistantMessage, userMessage);

			// 7. Build response
			ChatResponse response = new ChatResponse(sessionId, assistantMessage);
			response.setIntent(state.getCurrentIntent());
			response.setExtractedSlots(state.getSlotValues());

			// Add multiple messages if generated
			if (multiMessages != null && !multiMessages.isEmpty()) {
				response.setMessages(multiMessages);
				logger.debug("[ChatSession] Proactive follow-up generated: {} messages", multiMessages.size());
			}

			// Check if action is required (e.g., transfer to human)
			if ("transfer_request".equals(state.getCurrentIntent())) {
				response.setRequiresAction(true);
				response.setSuggestedAction("transfer_to_human");
			}

			logger.info("[ChatSession] Message processing completed successfully");
			return response;

		} catch (Exception e) {
			logger.error("[ChatSession] ============================================");
			logger.error("[ChatSession] ERROR processing message for session: {}", sessionId);
			logger.error("[ChatSession] Error type: {}", e.getClass().getName());
			logger.error("[ChatSession] Error message: {}", e.getMessage());
			logger.error("[ChatSession] ============================================", e);
			throw new RuntimeException("Error processing chat message for sessionId: " + sessionId + " - " + e.getMessage(), e);
		}
	}

	/**
	 * Process message with streaming support
	 * Streams tokens via SSE while accumulating full response
	 *
	 * @param request Chat request with sessionId and message
	 * @param emitter SSE emitter for streaming tokens
	 */
	@Async
	public void processMessageStreaming(ChatRequest request, SseEmitter emitter) {
		String sessionId = request.getSessionId();
		String userMessage = request.getMessage();

		SessionState state = activeSessions.get(sessionId);
		if (state == null) {
			try {
				emitter.completeWithError(new IllegalStateException("Session not found: " + sessionId));
			} catch (Exception e) {
				logger.error("[ChatSession] Error completing emitter with error: {}", e.getMessage());
			}
			return;
		}

		try {
			logger.info("[ChatSession] Processing streaming message for session: {}", sessionId);

			// Save user message to MongoDB
			com.ai.va.model.ChatMessage userMsg = new com.ai.va.model.ChatMessage("user", userMessage);
			saveChatHistory(sessionId, state.getCustomerId(), state.getProductId(), userMsg);

			// 1. Add user message to conversation
			state.addTurn(Turn.caller(userMessage));
			logger.debug("[ChatSession] User message added, turn count: {}", state.getTranscript().size());

			// 2. Process user input: detect intent and extract slots
			logger.debug("[ChatSession] Processing user input through dialog manager...");
			dialogManager.processUserInput(state, userMessage);
			logger.debug("[ChatSession] Intent detected: {}", state.getCurrentIntent());

			// 3. Build prompt
			logger.debug("[ChatSession] Building prompt...");
			String prompt = dialogManager.buildPrompt(state);
			logger.debug("[ChatSession] Prompt length: {} characters", prompt.length());

			// 4. Get channel configuration for system prompt
			ChannelConfiguration config = configurationService.getChatConfiguration(
					state.getCustomerId(), state.getProductId());
			String systemPrompt = buildSystemPrompt(config);

			// 5. Stream LLM response with token callback
			logger.debug("[ChatSession] Starting LLM streaming...");
			StringBuilder fullResponse = new StringBuilder();

			String completeResponse = llmClient.streamChatCompletion(
					systemPrompt,
					prompt,
					0.7,
					(token) -> {
						// Send each token as SSE event
						try {
							Map<String, String> tokenData = new HashMap<>();
							tokenData.put("token", token);
							tokenData.put("sessionId", sessionId);
							emitter.send(SseEmitter.event()
									.name("token")
									.data(tokenData));
							fullResponse.append(token);
						} catch (Exception e) {
							logger.error("[ChatSession] Error sending token: {}", e.getMessage());
						}
					}
					);

			logger.debug("[ChatSession] Streaming completed, full response length: {}", completeResponse.length());

			// 6. Add assistant response to conversation
			state.addTurn(Turn.assistant(completeResponse));
			saveState(sessionId, state);

			// Save assistant message to MongoDB
			com.ai.va.model.ChatMessage assistantMsg = new com.ai.va.model.ChatMessage(
					"assistant", completeResponse, state.getCurrentIntent());
			saveChatHistory(sessionId, state.getCustomerId(), state.getProductId(), assistantMsg);

			// 7. Send completion event
			Map<String, Object> completionData = new HashMap<>();
			completionData.put("sessionId", sessionId);
			completionData.put("intent", state.getCurrentIntent());
			completionData.put("complete", true);

			emitter.send(SseEmitter.event()
					.name("complete")
					.data(completionData));

			emitter.complete();
			logger.info("[ChatSession] Streaming message processing completed successfully");

		} catch (Exception e) {
			logger.error("[ChatSession] ERROR in streaming message for session: {}", sessionId, e);
			try {
				Map<String, String> errorData = new HashMap<>();
				errorData.put("error", e.getMessage());
				emitter.send(SseEmitter.event()
						.name("error")
						.data(errorData));
				emitter.completeWithError(e);
			} catch (Exception sendError) {
				logger.error("[ChatSession] Error sending error event: {}", sendError.getMessage());
			}
		}
	}

	/**
	 * Process message with gRPC streaming support
	 * Streams tokens via gRPC StreamObserver while accumulating full response
	 *
	 * @param sessionId Session identifier
	 * @param userMessage User's message
	 * @param responseObserver gRPC StreamObserver for streaming tokens
	 */
	@Async
	public void processMessageStreamingGrpc(String sessionId, String userMessage,
			StreamObserver<com.ai.va.grpc.ChatResponse> responseObserver) {

		SessionState state = activeSessions.get(sessionId);
		if (state == null) {
			responseObserver.onError(io.grpc.Status.NOT_FOUND
					.withDescription("Session not found: " + sessionId)
					.asRuntimeException());
			return;
		}

		try {
			logger.info("[ChatSession] Processing gRPC streaming message for session: {}", sessionId);

			// Save user message to MongoDB
			com.ai.va.model.ChatMessage userMsg = new com.ai.va.model.ChatMessage("user", userMessage);
			saveChatHistory(sessionId, state.getCustomerId(), state.getProductId(), userMsg);

			// 1. Add user message to conversation
			state.addTurn(Turn.caller(userMessage));
			logger.debug("[ChatSession] User message added, turn count: {}", state.getTranscript().size());

			// 2. Process user input: detect intent and extract slots
			logger.debug("[ChatSession] Processing user input through dialog manager...");
			dialogManager.processUserInput(state, userMessage);
			logger.debug("[ChatSession] Intent detected: {}", state.getCurrentIntent());

			// 3. Build prompt
			logger.debug("[ChatSession] Building prompt...");
			String prompt = dialogManager.buildPrompt(state);
			logger.debug("[ChatSession] Prompt length: {} characters", prompt.length());

			// 4. Get channel configuration for system prompt
			ChannelConfiguration config = configurationService.getChatConfiguration(
					state.getCustomerId(), state.getProductId());
			String systemPrompt = buildSystemPrompt(config);

			// 5. Stream LLM response with token callback for gRPC
			logger.debug("[ChatSession] Starting LLM streaming via gRPC...");

			String completeResponse = llmClient.streamChatCompletion(
					systemPrompt,
					prompt,
					0.7,
					(token) -> {
						// Send each token as gRPC message
						try {
							com.ai.va.grpc.ChatResponse tokenResponse = com.ai.va.grpc.ChatResponse.newBuilder()
									.setSessionId(sessionId)
									.setMessage(token)
									.setIsFinal(false)
									.build();

							responseObserver.onNext(tokenResponse);
						} catch (Exception e) {
							logger.error("[ChatSession] Error sending gRPC token: {}", e.getMessage());
						}
					}
					);

			logger.debug("[ChatSession] gRPC streaming completed, full response length: {}", completeResponse.length());

			// 6. Add assistant response to conversation
			state.addTurn(Turn.assistant(completeResponse));
			saveState(sessionId, state);

			// Save assistant message to MongoDB
			com.ai.va.model.ChatMessage assistantMsg = new com.ai.va.model.ChatMessage(
					"assistant", completeResponse, state.getCurrentIntent());
			saveChatHistory(sessionId, state.getCustomerId(), state.getProductId(), assistantMsg);

			// 7. Send final completion message
			com.ai.va.grpc.ChatResponse finalResponse = com.ai.va.grpc.ChatResponse.newBuilder()
					.setSessionId(sessionId)
					.setMessage(completeResponse)
					.setIntent(state.getCurrentIntent())
					.setIsFinal(true)
					.build();

			responseObserver.onNext(finalResponse);
			responseObserver.onCompleted();

			logger.info("[ChatSession] gRPC streaming message processing completed successfully");

		} catch (Exception e) {
			logger.error("[ChatSession] ERROR in gRPC streaming message for session: {}", sessionId, e);
			responseObserver.onError(io.grpc.Status.INTERNAL
					.withDescription("Error processing message: " + e.getMessage())
					.asRuntimeException());
		}
	}

	/**
	 * Save chat history to MongoDB
	 */
	public void saveChatHistory(String sessionId, String customerId, String productId,
			com.ai.va.model.ChatMessage message) {
		try {
			org.bson.Document query = new org.bson.Document("sessionId", sessionId);
			org.bson.Document history = mongoDBService.findOne("chat_messages", query);

			org.bson.Document messageDoc = new org.bson.Document()
					.append("role", message.getRole())
					.append("content", message.getContent())
					.append("timestamp", message.getTimestamp())
					.append("intent", message.getIntent());

			if (history == null) {
				// Create new history document
				org.bson.Document newHistory = new org.bson.Document()
						.append("sessionId", sessionId)
						.append("customerId", customerId)
						.append("productId", productId)
						.append("messages", java.util.Arrays.asList(messageDoc))
						.append("startedAt", new java.util.Date())
						.append("lastUpdatedAt", new java.util.Date())
						.append("isActive", true);

				mongoDBService.insertOne("chat_messages", newHistory);
				logger.debug("[ChatHistory] Created new history for session: {}", sessionId);
			} else {
				// Append message to existing history
				org.bson.Document update = new org.bson.Document("$push",
						new org.bson.Document("messages", messageDoc))
						.append("$set", new org.bson.Document("lastUpdatedAt", new java.util.Date()));

				mongoDBService.getCollection("chat_messages").updateOne(query, update);
				logger.debug("[ChatHistory] Updated history for session: {}", sessionId);
			}
		} catch (Exception e) {
			logger.error("[ChatHistory] Error saving message: {}", e.getMessage(), e);
		}
	}

	/**
	 * Save session state
	 */
	public void saveState(String sessionId, SessionState state) {
		activeSessions.put(sessionId, state);
	}

	/**
	 * Check if user message contains location information and context suggests location query
	 */
	private boolean shouldProvideLocationData(SessionState state, String userMessage) {
		state.getCurrentIntent();
		List<Turn> transcript = state.getTranscript();

		// Look at last few turns for location-related keywords
		if (transcript.size() >= 2) {
			Turn previousTurn = transcript.get(transcript.size() - 2);
			if ("assistant".equals(previousTurn.getSpeaker())) {
				String prevMsg = previousTurn.getText().toLowerCase();
				if (prevMsg.contains("location") || prevMsg.contains("address") ||
						prevMsg.contains("zip code") || prevMsg.contains("where are you")) {

					// User provided zip code or location
					if (userMessage.matches(".*\\b\\d{5}\\b.*") || // Contains 5-digit zip
							userMessage.toLowerCase().contains("beach") ||
							userMessage.toLowerCase().contains("street") ||
							userMessage.toLowerCase().contains("drive") ||
							userMessage.toLowerCase().contains("road")) {
						return true;
					}
				}
			}
		}

		return false;
	}

	/**
	 * Start a new chat session
	 * Fetches customer chat configuration from MongoDB and initializes LLM
	 * Ends any existing active session for this customer (one session per customer rule)
	 *
	 * @param customerId Customer ID for context (tenantId)
	 * @param productId Product ID (e.g., "va-service")
	 * @return Map containing sessionId and greeting message
	 */
	public Map<String, String> startSession(String customerId, String productId) {
		// Check if customer has an active session and end it
		String existingSessionId = customerToSessionMap.get(customerId);
		if (existingSessionId != null) {
			logger.info("[ChatSession] Customer {} has active session {}, ending it", customerId, existingSessionId);
			endSession(existingSessionId);
		}

		String sessionId = UUID.randomUUID().toString();
		SessionState session = new SessionState(sessionId, ChannelType.CHAT);
		session.setCustomerId(customerId);
		session.setProductId(productId);

		// Map customer to this new session
		customerToSessionMap.put(customerId, sessionId);

		String greetingMessage = "Hello! How can I assist you today?"; // Default greeting

		try {
			// Fetch chat configuration from MongoDB
			// This includes custom prompts, RAG config, and prompt context
			ChannelConfiguration chatConfig = configurationService.getChatConfiguration(
					customerId,
					productId
					);

			if (chatConfig != null && chatConfig.isEnabled()) {
				// Initialize session with configuration and get consistent greeting
				greetingMessage = initializeSessionWithConfig(session, chatConfig, sessionId);

				logger.info("Loaded chat configuration for customer: {}, product: {}", customerId, productId);
				logger.debug("  - Has Custom Prompts: {}", (chatConfig.getCustomPrompts() != null));
				logger.debug("  - RAG Enabled: {}", (chatConfig.getRagConfig() != null && chatConfig.getRagConfig().isEnabled()));
				logger.debug("  - Industry: {}", session.getCustomerIndustry());
				logger.debug("  - Greeting: {}", chatConfig.getGreeting());
			} else {
				logger.warn("Chat channel not enabled or config not found for customer: {}, product: {}", customerId, productId);
			}

		} catch (Exception e) {
			logger.error("Error loading chat configuration for customer {}: {}", customerId, e.getMessage(), e);
			// Continue with default settings
			session.setCustomerIndustry("General Business");
		}

		activeSessions.put(sessionId, session);

		// Save initial greeting to MongoDB
		com.ai.va.model.ChatMessage greetingMsg = new com.ai.va.model.ChatMessage("assistant", greetingMessage);
		saveChatHistory(sessionId, customerId, productId, greetingMsg);

		logger.debug("[ChatSession] Greeting message being returned to controller: {}", greetingMessage);

		// Return both sessionId and greeting message
		Map<String, String> result = new HashMap<>();
		result.put("sessionId", sessionId);
		result.put("greeting", greetingMessage);
		logger.debug("[ChatSession] Result map: {}", result);
		return result;
	}
}
