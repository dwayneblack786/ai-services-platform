# PromptBuilder Usage Guide

## 📑 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
  - [Components](#components)
- [Prompt Layers](#prompt-layers)
- [Quick Start](#quick-start)
  - [Option 1: Manual Building (Simple Cases)](#option-1-manual-building-simple-cases)
  - [Option 2: Using PromptAssembler (Recommended)](#option-2-using-promptassembler-recommended)
- [Integration Examples](#integration-examples)
  - [ChatSessionService.startSession()](#chatsessionservicestartsession)
  - [DialogManager.processUserMessage()](#dialogmanagerprocessusermessage)
- [Configuration Mapping](#configuration-mapping)
  - [PromptContext → PromptBuilder](#promptcontext--promptbuilder)
  - [CustomPrompts → PromptBuilder](#customprompts--promptbuilder)
- [Example Output](#example-output)
- [Advanced Usage](#advanced-usage)
  - [Channel-Specific Prompts](#channel-specific-prompts)
  - [Dynamic RAG Integration](#dynamic-rag-integration)
  - [Conversation Memory Control](#conversation-memory-control)
- [Benefits](#benefits)
- [Migration Path](#migration-path)
- [Testing](#testing)
- [Next Steps](#next-steps)
- [Support](#support)

---

## Overview
The `PromptBuilder` class provides a clean, fluent API for assembling enterprise-grade, business-aware prompts for your VA service. It combines multiple layers of context into a cohesive system prompt.

## Architecture

### Components

1. **PromptBuilder** (`com.ai.va.prompt.PromptBuilder`)
   - Core builder class with fluent API
   - Assembles all prompt layers into formatted text
   - Handles conversation context from SessionState

2. **PromptAssembler** (`com.ai.va.prompt.PromptAssembler`) 
   - Spring service that bridges configuration models and PromptBuilder
   - Converts PromptContext + CustomPrompts → PromptBuilder inputs
   - Simplifies integration with existing code

3. **PromptBuilderExamples** (`com.ai.va.prompt.PromptBuilderExamples`)
   - Complete usage examples
   - Integration patterns for ChatSessionService and DialogManager

## Prompt Layers

The PromptBuilder assembles 8 distinct sections:

1. **Business Identity** - "You are a virtual assistant for [Business], operating in [Industry]"
2. **Role/Persona** - Personality, tone, allowed/disallowed actions
3. **Business Context** - Services, hours, locations, pricing, policies, FAQs
4. **RAG Knowledge** - Retrieved chunks from documents/APIs (optional)
5. **Conversation Context** - Last N turns from session transcript
6. **Channel** - Voice or chat specific instructions
7. **Constraints** - Safety rules, compliance, escalation policies
8. **Closing** - "Respond clearly, concisely, and professionally..."

## Quick Start

### Option 1: Manual Building (Simple Cases)

```java
String prompt = new PromptBuilder()
        .withBusinessName("Acme Health")
        .withIndustry("Healthcare")
        .withPersona("You are a friendly, professional medical support assistant.")
        .withStaticContext("Acme Health provides primary care and telehealth...")
        .withRagContext("Walk-in appointments available 9am–5pm")
        .withConstraints("Do not provide medical diagnosis.")
        .withChannel("chat")
        .withSessionState(sessionState)
        .build();

String response = llmClient.getChatCompletion(prompt, userMessage);
```

### Option 2: Using PromptAssembler (Recommended)

```java
@Autowired
private PromptAssembler promptAssembler;

// In your service method:
ChannelConfiguration config = configurationService.getChatConfiguration(customerId, productId);
SessionState sessionState = sessionManager.getSession(sessionId);

// Optional: Get RAG results
String ragResults = ragService.retrieveRelevantChunks(userMessage);

// Assemble complete prompt
String prompt = promptAssembler.assemblePrompt(config, sessionState, ragResults);

// Send to LLM
String response = llmClient.getChatCompletion(prompt, userMessage);
```

## Integration Examples

### ChatSessionService.startSession()

```java
public String startSession(String customerId, String productId, String sessionId) {
    
    // Load configuration
    ChannelConfiguration config = configurationService.getChatConfiguration(customerId, productId);
    
    // Create session
    SessionState session = new SessionState();
    session.setSessionId(sessionId);
    session.setPromptContext(config.getPromptContext());
    session.setCustomPrompts(config.getCustomPrompts());
    
    // Build initial system prompt
    String systemPrompt = promptAssembler.assemblePrompt(config, session);
    
    // Test LLM with system prompt
    llmClient.testConnection();
    
    // Store session
    sessionManager.storeSession(sessionId, session);
    
    return config.getGreeting() != null ? config.getGreeting() : "Hello!";
}
```

### DialogManager.processUserMessage()

```java
public String processUserMessage(String sessionId, String userMessage) {
    
    // Get session
    SessionState sessionState = sessionManager.getSession(sessionId);
    ChannelConfiguration config = getConfigurationForSession(sessionState);
    
    // Add user turn
    sessionState.addTurn(new Turn("USER", userMessage));
    
    // Optional: RAG retrieval
    String ragResults = null;
    if (sessionState.getRagConfiguration() != null && 
        sessionState.getRagConfiguration().isEnabled()) {
        ragResults = ragService.retrieveRelevantChunks(userMessage);
    }
    
    // Build complete prompt with conversation history
    String systemPrompt = promptAssembler.assemblePrompt(config, sessionState, ragResults);
    
    // Get LLM response
    String assistantResponse = llmClient.getChatCompletion(systemPrompt, userMessage);
    
    // Add assistant turn
    sessionState.addTurn(new Turn("ASSISTANT", assistantResponse));
    
    // Update session
    sessionManager.storeSession(sessionId, sessionState);
    
    return assistantResponse;
}
```

## Configuration Mapping

### PromptContext → PromptBuilder

| PromptContext Field | Maps To |
|---------------------|---------|
| `tenantName` | `withBusinessName()` |
| `tenantIndustry` | `withIndustry()` |
| `tone`, `personality`, `allowedActions`, `disallowedActions` | `withPersona()` |
| `servicesOffered`, `businessHours`, `locations`, `pricingInfo`, `policies`, `faqs` | `withStaticContext()` |
| `maxResponseLength`, `escalationTriggers`, `askForNameFirst`, etc. | `withConstraints()` |

### CustomPrompts → PromptBuilder

| CustomPrompts Field | Maps To |
|---------------------|---------|
| `prohibitedTopics`, `complianceRules` | `withConstraints()` |
| `privacyPolicy`, `escalationPolicy` | `withConstraints()` |
| `requireConsent`, `sensitiveDataHandling` | `withConstraints()` |

## Example Output

```
You are a virtual assistant for Acme Health, operating in the Healthcare industry.

ROLE / PERSONA:
Personality: friendly
Tone: professional
You can: book_appointment, provide_quote, answer_faq
You cannot: give_medical_advice, provide_legal_advice

BUSINESS CONTEXT:
Services:
- Primary Care
- Urgent Care
- Telehealth

Business Hours: Mon-Fri 9am-5pm

Locations:
- 123 Main St, Boston MA
- 456 Oak Ave, Cambridge MA

RETRIEVED KNOWLEDGE (RAG):
Walk-in appointments available 9am–5pm
Insurance accepted: Aetna, Cigna, BCBS

CONVERSATION CONTEXT:
USER: I need to schedule an appointment.
ASSISTANT: Sure, what date works for you?
USER: How about tomorrow at 2pm?

CHANNEL:
chat

CONSTRAINTS:
Maximum response length: 200 tokens
Always ask for the customer's name at the start of conversation
Escalate to human if: patient requests medical diagnosis, emergency situation
Prohibited topics: medical diagnosis, financial advice
Compliance rules:
- HIPAA compliant
- Obtain consent before collecting PHI
Privacy: All conversations are encrypted and HIPAA compliant

Respond clearly, concisely, and professionally. If you are unsure, ask clarifying questions.
```

## Advanced Usage

### Channel-Specific Prompts

```java
// Voice channel
String voicePrompt = new PromptBuilder()
        .withChannel("voice")
        .withConstraints("Keep responses under 50 words. Speak naturally.")
        // ... other fields
        .build();

// Chat channel
String chatPrompt = new PromptBuilder()
        .withChannel("chat")
        .withConstraints("Provide detailed responses with formatting.")
        // ... other fields
        .build();
```

### Dynamic RAG Integration

```java
// Retrieve relevant chunks based on user message
String ragResults = ragService.retrieveRelevantChunks(userMessage);

String prompt = promptAssembler.assemblePrompt(config, sessionState, ragResults);
```

### Conversation Memory Control

```java
// Get last 10 turns (configurable)
List<Turn> recentTurns = sessionState.getRecentTurns(10);

// PromptBuilder automatically formats conversation context
```

## Benefits

✅ **Clean API** - Fluent builder pattern, easy to read and maintain  
✅ **Complete Context** - All 8 layers in structured format  
✅ **Type Safe** - Compile-time checking for all fields  
✅ **Reusable** - Single builder for chat, voice, and custom channels  
✅ **Testable** - Easy to mock and unit test  
✅ **Extensible** - Add new sections without breaking existing code  

## Migration Path

### Before (Old approach):
```java
String prompt = chatSessionService.buildSystemPrompt(config, session);
```

### After (New approach):
```java
String prompt = promptAssembler.assemblePrompt(config, session, ragResults);
```

The PromptAssembler handles all the complexity of extracting and formatting data from your existing configuration models.

## Testing

```java
@Test
public void testPromptBuilder() {
    String prompt = new PromptBuilder()
            .withBusinessName("Test Corp")
            .withIndustry("Technology")
            .withPersona("Professional assistant")
            .withStaticContext("We provide software services")
            .withChannel("chat")
            .build();
    
    assertThat(prompt).contains("Test Corp");
    assertThat(prompt).contains("Technology");
    assertThat(prompt).contains("chat");
}
```

## Next Steps

1. **Update ChatSessionService** - Replace `buildSystemPrompt()` with `promptAssembler.assemblePrompt()`
2. **Update DialogManager** - Use PromptAssembler for message processing
3. **Add RAG Integration** - Connect RAG service to populate retrieved knowledge
4. **Configure per Tenant** - Store PromptContext in MongoDB for customization
5. **Monitor Prompts** - Log generated prompts to validate structure

## Support

For questions or issues, see:
- `PromptBuilderExamples.java` - Complete working examples
- `PromptAssembler.java` - Configuration mapping logic
- `PromptBuilder.java` - Core builder implementation
