# Voice Initial Greeting Implementation Plan

## 📋 Executive Summary

**Goal**: Implement initial LLM-generated greeting for voice chat sessions, matching the existing text chat experience.

**Current State**:
- ✅ **Text Chat**: Loads tenant data → Calls LLM → Returns greeting in `startSession` response
- ❌ **Voice Chat**: Only initializes session, NO initial greeting or LLM call

**Target State**: Voice sessions will immediately generate and speak a personalized greeting using tenant configuration, LLM, and TTS.

---

## 🏗️ Current Architecture Analysis

### Text Chat Flow (WORKING ✅)
```
Frontend → POST /chat/session
  ↓
ChatSessionController.startSession()
  ↓
ChatSessionService.startSession()
  ↓
  1. Load tenant config from MongoDB
  2. Build system prompt with RAG context
  3. Call LLM for greeting
  4. Save greeting to chat history
  ↓
Returns { sessionId, greeting } ← Frontend displays immediately
```

**Key Code Locations**:
- Controller: [ChatSessionController.java](c:\Users\Owner\Documents\ai-services-platform\services-java\va-service\src\main\java\com\ai\va\controller\ChatSessionController.java) line 43-76
- Service: [ChatSessionService.java](c:\Users\Owner\Documents\ai-services-platform\services-java\va-service\src\main\java\com\ai\va\service\ChatSessionService.java) line 885-946
- Greeting Generation: [ChatSessionService.java](c:\Users\Owner\Documents\ai-services-platform\services-java\va-service\src\main\java\com\ai\va\service\ChatSessionService.java) line 406-461 (`initializeSessionWithConfig` method)

### Voice Chat Flow (INCOMPLETE ❌)
```
Frontend → socket.emit('voice:start', { sessionId })
  ↓
backend-node/voice-socket.ts → voice:start handler
  ↓
  - Initializes audio buffer
  - Joins voice room
  - Emits voice:started ← NO GREETING
```

**Missing Components**:
1. ❌ No Java service call during session start
2. ❌ No tenant config loading
3. ❌ No LLM greeting generation
4. ❌ No TTS synthesis of greeting
5. ❌ No voice playback to user
6. ❌ No dialogue tracking

---

## 🎯 Proposed Solution Architecture

### Enhanced Voice Flow
```
Frontend → socket.emit('voice:session:init', { customerId, productId })
  ↓
backend-node/voice-socket.ts
  ↓
  1. Generate session ID
  2. Call Java: POST /voice/session (with customerId, productId)
  ↓
Java VoiceSessionService.startSession()
  ↓
  1. Load tenant config
  2. Call LLM for greeting (reuse ChatSessionService logic)
  3. Call TTS to convert greeting to audio
  4. Save greeting to voice transcript
  ↓
Returns { sessionId, greeting: { text, audioBase64 } }
  ↓
backend-node receives response
  ↓
  - Store session mapping
  - Emit voice:session:initialized with greeting audio
  ↓
Frontend receives greeting
  ↓
  - Play audio greeting automatically
  - Display transcription in chat UI
  - Enable microphone for user response
```

---

## 📦 Implementation Phases

### **Phase 1: Java Backend - Add Greeting Generation to Voice Sessions** ✅ COMPLETED
**Actual Time**: 6 hours  
**Status**: ✅ **DONE** - Build fixed, service running, greeting generation implemented  
**Completion Date**: January 23, 2026

#### 1.1 Extract Greeting Logic to Shared Method
**File**: `ChatSessionService.java`

**Action**: Create reusable method that both chat and voice can use
```java
/**
 * Generate initial greeting using LLM with tenant configuration
 * Reusable by both Chat and Voice channels
 * 
 * @param session Session state with tenant config loaded
 * @param channelConfig Channel-specific configuration
 * @return Generated greeting text
 */
public String generateInitialGreeting(SessionState session, ChannelConfiguration channelConfig) {
    // Extract existing logic from initializeSessionWithConfig (lines 432-460)
    // Make channel-agnostic
}
```

**Why**: DRY principle - both chat and voice need identical greeting logic

#### 1.2 Enhance VoiceSessionService
**File**: `VoiceSessionService.java`

**Changes**:
```java
@Autowired
private ChatSessionService chatSessionService; // Reuse greeting logic

@Autowired
private TtsService ttsService;

@Autowired
private TranscriptService transcriptService;

public VoiceSessionResponse startSession(String callId, String customerId, 
                                         String tenantId, String productId) {
    // Existing session initialization (lines 60-147)
    SessionState session = ...;
    
    // NEW: Generate greeting
    try {
        ChannelConfiguration voiceConfig = configurationService.getVoiceConfiguration(tenantId, productId);
        
        // Generate greeting text using shared logic
        String greetingText = chatSessionService.generateInitialGreeting(session, voiceConfig);
        
        // Convert to speech
        CompletableFuture<byte[]> audioFuture = ttsService.synthesize(
            greetingText, 
            session.getVoiceSettings().getLanguage(),
            session.getVoiceSettings().getVoiceName()
        );
        
        byte[] greetingAudio = audioFuture.get(10, TimeUnit.SECONDS); // 10s timeout
        String audioBase64 = Base64.getEncoder().encodeToString(greetingAudio);
        
        // Save to transcript
        transcriptService.addGreetingToTranscript(callId, greetingText, "assistant");
        
        return new VoiceSessionResponse(callId, greetingText, audioBase64);
        
    } catch (Exception e) {
        logger.error("Failed to generate voice greeting: {}", e.getMessage(), e);
        // Return session without greeting - non-fatal
        return new VoiceSessionResponse(callId, null, null);
    }
}
```

#### 1.3 Create Enhanced Response Model
**File**: New file `VoiceSessionResponse.java`

```java
package com.ai.va.model;

public class VoiceSessionResponse {
    private String sessionId;
    private String greetingText;      // For UI display/transcript
    private String greetingAudio;     // Base64 encoded audio
    
    // Constructors, getters, setters
}
```

#### 1.4 Update Controller
**File**: `VoiceSessionController.java`

```java
@PostMapping("/session")
public ResponseEntity<VoiceSessionResponse> startSession(@RequestBody VoiceSessionRequest request) {
    VoiceSessionResponse response = voiceSessionService.startSession(
        request.getCallId(), 
        request.getCustomerId(),
        request.getTenantId(),
        request.getProductId()
    );
    return ResponseEntity.ok(response);
}
```

**Test Endpoint**:
```bash
curl -X POST http://localhost:8136/voice/session \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "test-123",
    "customerId": "test-customer",
    "tenantId": "test-tenant",
    "productId": "va-service"
  }'
```

Expected Response:
```json
{
  "sessionId": "test-123",
  "greetingText": "Hello! I'm your virtual assistant. How may I help you today?",
  "greetingAudio": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA..."
}
```

---

### **Phase 2: Node.js Backend - Update Voice Socket Handlers**
**Estimated Time**: 3-4 hours  
**Risk Level**: 🟢 Low (minimal changes)

#### 2.1 Update Voice Socket Handler
**File**: `backend-node/src/sockets/voice-socket.ts`

**Changes**:
```typescript
// Add new event for session initialization
socket.on('voice:session:init', async (data: VoiceInitData) => {
  const { customerId, productId } = data;
  const sessionId = generateSessionId();
  
  console.log(`[Voice] Initializing session for customer: ${customerId}`);
  
  try {
    // Call Java service to initialize session with greeting
    const response = await grpcClient.startVoiceSession({
      callId: sessionId,
      customerId,
      tenantId: socket.user?.tenantId || customerId,
      productId: productId || 'va-service'
    });
    
    // Store session
    socket.join(`voice:${sessionId}`);
    
    // Send greeting back to client
    socket.emit('voice:session:initialized', {
      sessionId: response.sessionId,
      greeting: {
        text: response.greetingText,
        audio: response.greetingAudio
      },
      status: 'ready'
    });
    
    console.log(`[Voice] Session initialized with greeting: ${response.greetingText?.substring(0, 50)}...`);
    
  } catch (error) {
    console.error(`[Voice] Failed to initialize session:`, error);
    socket.emit('voice:error', {
      message: 'Failed to start voice session'
    });
  }
});

// Keep existing voice:start for backward compatibility (audio streaming)
socket.on('voice:start', (data: VoiceStartData) => {
  // Existing code for starting audio streaming
  // This is now separate from session initialization
});
```

#### 2.2 Update gRPC Client
**File**: `backend-node/src/grpc/client.ts`

```typescript
async startVoiceSession(request: {
  callId: string;
  customerId: string;
  tenantId: string;
  productId: string;
}): Promise<VoiceSessionResponse> {
  // Call Java REST endpoint (or gRPC if preferred)
  const response = await axios.post(
    `${JAVA_SERVICE_URL}/voice/session`,
    request
  );
  
  return response.data;
}
```

---

### **Phase 3: Frontend - Handle Voice Greeting Playback**
**Estimated Time**: 2-3 hours  
**Risk Level**: 🟢 Low (audio playback is standard)

#### 3.1 Update AssistantChat Component
**File**: `frontend/src/components/AssistantChat.tsx`

**Changes**:
```typescript
// Add state for greeting audio
const [greetingAudio, setGreetingAudio] = useState<string | null>(null);
const [isPlayingGreeting, setIsPlayingGreeting] = useState(false);

// Initialize voice session when user clicks voice button
const initializeVoiceSession = async () => {
  console.log('[Voice] Initializing session with greeting...');
  
  socket.emit('voice:session:init', {
    customerId: user.id,
    productId: selectedProduct
  });
};

// Listen for session initialized with greeting
useEffect(() => {
  socket.on('voice:session:initialized', async (data: {
    sessionId: string;
    greeting: { text: string; audio: string };
    status: string;
  }) => {
    console.log('[Voice] Session initialized:', data.sessionId);
    
    // Add greeting message to chat UI
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.greeting.text,
      timestamp: new Date(),
      source: 'voice'
    }]);
    
    // Play greeting audio
    if (data.greeting.audio) {
      setIsPlayingGreeting(true);
      await playGreetingAudio(data.greeting.audio);
      setIsPlayingGreeting(false);
    }
    
    // Enable microphone after greeting completes
    setVoiceStatus('ready');
  });
  
  return () => {
    socket.off('voice:session:initialized');
  };
}, [socket]);

// Play base64 audio greeting
const playGreetingAudio = async (audioBase64: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Convert base64 to audio blob
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        console.error('[Voice] Audio playback error:', error);
        reject(error);
      };
      
      audio.play();
      
    } catch (error) {
      console.error('[Voice] Failed to play greeting:', error);
      reject(error);
    }
  });
};

// Update voice button handler
const handleVoiceButtonClick = () => {
  if (!sessionId) {
    // Initialize session first (with greeting)
    initializeVoiceSession();
  } else if (isRecording) {
    stopVoiceRecording();
  } else {
    startVoiceRecording();
  }
};
```

#### 3.2 Update UI to Show Greeting Status
```tsx
{isPlayingGreeting && (
  <div className="greeting-indicator">
    <SpeakerIcon className="animate-pulse" />
    <span>Playing greeting...</span>
  </div>
)}
```

---

### **Phase 4: Dialogue Tracking Integration**
**Estimated Time**: 2 hours  
**Risk Level**: 🟢 Low (existing infrastructure)

#### 4.1 Update TranscriptService
**File**: `VoiceSessionService.java`

**Already implemented** (lines 135-145), just need to ensure greeting is saved:
```java
// Add greeting to transcript after generation
transcriptService.addTurnToTranscript(callId, new Turn(
    "assistant",
    greetingText,
    System.currentTimeMillis(),
    null,  // No audio for transcript entry
    true   // Mark as greeting/initial message
));
```

#### 4.2 Verify MongoDB Storage
**Collection**: `voice_transcripts`

Greeting should appear in dialogue:
```json
{
  "sessionId": "voice-123",
  "customerId": "customer-1",
  "channel": "voice",
  "turns": [
    {
      "speaker": "assistant",
      "text": "Hello! I'm your virtual assistant...",
      "timestamp": 1706000000000,
      "isGreeting": true
    }
  ]
}
```

---

## 🔄 User Experience Flow

### Before Implementation (Current)
```
1. User clicks voice button
2. ⏱️ Silence... (awkward wait)
3. Microphone activates
4. User not sure if system is ready
5. User starts speaking without context
```

### After Implementation (Target)
```
1. User clicks voice button
2. 🔊 "Hello! I'm your virtual assistant. How may I help you today?"
3. 🎤 Microphone activates automatically after greeting
4. User knows system is ready and listening
5. User responds naturally to greeting
```

---

## 🧪 Testing Strategy

### Phase 1 Tests (Java)
```bash
# Test greeting generation
curl -X POST http://localhost:8136/voice/session \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "test-greeting-001",
    "customerId": "test-customer",
    "tenantId": "test-tenant",
    "productId": "va-service"
  }'

# Verify response includes:
# - sessionId
# - greetingText (non-empty)
# - greetingAudio (base64 string)
```

### Phase 2 Tests (Node.js)
```javascript
// Connect to WebSocket
const socket = io('http://localhost:5000');

socket.emit('voice:session:init', {
  customerId: 'test-customer',
  productId: 'va-service'
});

socket.on('voice:session:initialized', (data) => {
  console.log('Greeting text:', data.greeting.text);
  console.log('Audio length:', data.greeting.audio.length);
  // Should receive valid greeting
});
```

### Phase 3 Tests (Frontend)
1. Click voice button in UI
2. Verify greeting plays automatically
3. Verify greeting text appears in chat
4. Verify microphone activates after greeting
5. Verify conversation continues normally

### Integration Test
```
End-to-End Flow:
1. Start voice session from UI
2. Receive personalized greeting (with tenant name)
3. Greeting audio plays
4. Transcript shows greeting
5. Ask question
6. Receive answer
7. Verify both greeting and Q&A in MongoDB transcript
```

---

## 🚨 Risk Mitigation

### Risk 1: TTS Synthesis Timeout
**Mitigation**:
- Set 10-second timeout on TTS call
- Fallback to text-only greeting if TTS fails
- Log failures for monitoring

```java
try {
    byte[] audio = ttsService.synthesize(greeting).get(10, TimeUnit.SECONDS);
} catch (TimeoutException e) {
    logger.warn("TTS timeout, returning text-only greeting");
    return new VoiceSessionResponse(sessionId, greeting, null);
}
```

### Risk 2: LLM Greeting Generation Failure
**Mitigation**:
- Always have fallback static greeting from config
- Reuse existing `initializeSessionWithConfig` error handling

### Risk 3: Audio Playback Issues
**Mitigation**:
- Detect browser audio support before playing
- Show text greeting even if audio fails
- Provide manual replay button

```typescript
try {
  await playGreetingAudio(audioBase64);
} catch (error) {
  console.error('Audio playback failed:', error);
  // User still sees text greeting in chat
  setVoiceStatus('ready'); // Allow user to proceed
}
```

### Risk 4: Session Initialization Race Condition
**Mitigation**:
- Disable voice button during initialization
- Show loading state
- Only enable microphone after greeting completes

```typescript
const [initializingSession, setInitializingSession] = useState(false);

const initializeVoiceSession = async () => {
  setInitializingSession(true);
  socket.emit('voice:session:init', ...);
  // Button disabled until voice:session:initialized received
};
```

---

## 📊 Success Metrics

### Technical Metrics
- ✅ Voice session initialization time: < 3 seconds (including LLM + TTS)
- ✅ Greeting delivery rate: > 99%
- ✅ Transcript accuracy: 100% (greeting always saved)
- ✅ Error fallback rate: < 1%

### User Experience Metrics
- ✅ User confusion reduction: 90% (no more silent starts)
- ✅ Conversation flow naturalness: Improved (greeting sets context)
- ✅ Accessibility: Enhanced (audio + text for all users)

---

## 🗺️ Rollout Plan

### Step 1: Development (Week 1)
- Phase 1: Java backend changes
- Phase 2: Node.js socket updates
- Unit tests for each component

### Step 2: Integration Testing (Week 1-2)
- Phase 3: Frontend integration
- Phase 4: Dialogue tracking
- End-to-end testing

### Step 3: Staging Deployment (Week 2)
- Deploy to staging environment
- Internal team testing
- Gather feedback

### Step 4: Production Rollout (Week 3)
- Feature flag: `voice_initial_greeting_enabled`
- Gradual rollout: 10% → 50% → 100%
- Monitor error rates and user feedback

### Step 5: Monitoring (Ongoing)
- Track greeting generation success rate
- Monitor TTS performance
- Collect user satisfaction scores

---

## 💡 Future Enhancements (Post-MVP)

### 1. Personalized Greetings
```java
// Use customer name if available
"Hello Sarah! Welcome back. How can I help you today?"

// Time-aware greetings
"Good morning! Ready to assist you."
```

### 2. Context-Aware Greetings
```java
// Based on previous interaction
"Welcome back! Last time we discussed billing. What can I help with today?"

// Based on product
"Welcome to TechCorp Support. I'm here to help with your premium subscription."
```

### 3. Multi-Language Support
```java
// Detect user language and generate greeting in that language
voiceSettings.setLanguage("es-ES");
greeting = "¡Hola! ¿En qué puedo ayudarte hoy?"
```

### 4. Emotion/Tone Customization
```java
// Friendly tone for customer service
// Professional tone for enterprise
// Empathetic tone for healthcare
```

### 5. Streaming Greeting
```java
// Stream greeting token-by-token for faster perceived response
// User hears first words while rest is generating
```

---

## 📝 Implementation Checklist

### Phase 1: Java Backend ✅ COMPLETED
- [x] Extract `generateInitialGreeting()` from ChatSessionService
- [x] Create `VoiceSessionResponse` model
- [x] Update `VoiceSessionService.startSession()` to generate greeting
- [x] Add TTS synthesis call
- [x] Update `VoiceSessionController` return type
- [x] Fix protobuf code generation in Maven build
- [x] Fix spring-boot-maven-plugin configuration
- [x] Test service starts successfully
- [ ] Write unit tests for greeting generation
- [ ] Test endpoint with curl (requires LLM + MongoDB running)

### Phase 2: Node.js Backend
- [ ] Add `voice:session:init` socket handler
- [ ] Update gRPC/REST client for Java service
- [ ] Add error handling for session initialization
- [ ] Update socket event documentation
- [ ] Write integration tests

### Phase 3: Frontend
- [ ] Add `initializeVoiceSession()` function
- [ ] Add `voice:session:initialized` event listener
- [ ] Implement `playGreetingAudio()` function
- [ ] Update voice button handler logic
- [ ] Add loading states and error handling
- [ ] Test audio playback across browsers

### Phase 4: Dialogue Tracking
- [ ] Verify greeting saves to transcript
- [ ] Test MongoDB storage format
- [ ] Verify greeting appears in transcript UI
- [ ] End-to-end dialogue flow test

### Testing & Deployment
- [ ] Manual testing on dev environment
- [ ] Code review
- [ ] Staging deployment
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Monitor logs and metrics

---

## 🤔 Questions for Review

1. **Should greeting generation be blocking or async?**
   - **Recommendation**: Blocking (with timeout) - user should hear greeting before proceeding
   - Alternative: Async - session starts immediately, greeting plays when ready

2. **What if TTS fails but LLM succeeds?**
   - **Recommendation**: Return text-only greeting, user can still proceed
   - Alternative: Retry TTS once before falling back

3. **Should we cache common greetings?**
   - **Recommendation**: Yes (future enhancement) - cache by tenant + language
   - Benefit: Faster response, lower LLM/TTS costs

4. **How to handle voice interruption during greeting?**
   - **Recommendation**: Allow user to interrupt - stop playback, enable mic immediately
   - Behavior: User can start speaking even if greeting is playing

5. **Should greeting be part of session state or separate?**
   - **Recommendation**: Separate - greeting is one-time event, not part of ongoing state
   - Benefit: Cleaner architecture, easier to disable/enable feature

---

## 📚 References

### Existing Code to Reuse
- **Chat Greeting Logic**: [ChatSessionService.java](c:\Users\Owner\Documents\ai-services-platform\services-java\va-service\src\main\java\com\ai\va\service\ChatSessionService.java) lines 406-461
- **TTS Service**: [TtsService.java](c:\Users\Owner\Documents\ai-services-platform\services-java\va-service\src\main\java\com\ai\va\service\tts\TtsService.java)
- **Voice Socket Handler**: [voice-socket.ts](c:\Users\Owner\Documents\ai-services-platform\backend-node\src\sockets\voice-socket.ts)
- **Frontend Voice Component**: [AssistantChat.tsx](c:\Users\Owner\Documents\ai-services-platform\frontend\src\components\AssistantChat.tsx) lines 400-500

### Similar Implementations
- **Alexa Skills**: Always starts with greeting before listening
- **Google Assistant**: "Hi, how can I help?" before activating mic
- **Customer Service IVR**: "Thank you for calling [Company]..." before menu

---

## 🎯 Conclusion

This implementation plan provides a **seamless, production-ready solution** for voice greeting that:

✅ **Reuses existing code** (ChatSessionService greeting logic)  
✅ **Minimal changes** (4 phases, ~150 lines of new code)  
✅ **Low risk** (graceful fallbacks at every step)  
✅ **Enhances UX** (natural conversation flow)  
✅ **Scalable** (works with all tenant configurations)  
✅ **Testable** (clear testing strategy at each phase)

**Recommendation**: Start with **Phase 1** (Java backend) as it's the foundation for all other phases. Test thoroughly before proceeding to Node.js and frontend integration.

**Estimated Total Time**: 11-15 hours (2-3 working days)

**Ready to proceed?** Let me know and I'll implement Phase 1 first for your review!
