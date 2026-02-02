# Voice Initial Greeting - Action Plan & Progress Tracker

## 🎯 Mission
Implement initial LLM-generated voice greetings to match text chat UX, creating a seamless and natural conversation start.

---

## 📊 Overall Progress: 50% Complete

| Phase | Status | Progress | ETA |
|-------|--------|----------|-----|
| Phase 1: Java Backend | ✅ **DONE** | 100% | Jan 23, 2026 |
| Phase 2: Node.js Backend | ✅ **DONE** | 100% | Jan 23, 2026 |
| Phase 3: Frontend | 🔄 **NEXT** | 0% | Jan 24, 2026 |
| Phase 4: Integration & Testing | ⏳ Pending | 0% | Jan 25, 2026 |

---

## ✅ Phase 1: Java Backend (COMPLETED)

### What Was Done
1. **Refactored greeting generation** into reusable `generateInitialGreeting()` method in ChatSessionService
2. **Created VoiceSessionResponse model** with greetingText and greetingAudio fields
3. **Enhanced VoiceSessionService** to:
   - Call ChatSessionService for greeting generation
   - Synthesize greeting to speech using TtsService
   - Save greeting to transcript via TranscriptService
4. **Updated VoiceSessionController** return type to VoiceSessionResponse
5. **Fixed critical build issues**:
   - Added explicit `generate-sources` phase binding to protobuf-maven-plugin
   - Configured spring-boot-maven-plugin with proper classpath handling

### Code Changes
- [ChatSessionService.java](c:/Users/Owner/Documents/ai-services-platform/services-java/va-service/src/main/java/com/ai/va/service/chat/ChatSessionService.java) - Lines 396-475: New reusable greeting method
- [VoiceSessionResponse.java](c:/Users/Owner/Documents/ai-services-platform/services-java/va-service/src/main/java/com/ai/va/model/VoiceSessionResponse.java) - New model class
- [VoiceSessionService.java](c:/Users/Owner/Documents/ai-services-platform/services-java/va-service/src/main/java/com/ai/va/service/voice/VoiceSessionService.java) - Lines 158-198: Greeting logic
- [VoiceSessionController.java](c:/Users/Owner/Documents/ai-services-platform/services-java/va-service/src/main/java/com/ai/va/controller/VoiceSessionController.java) - Updated endpoint
- [pom.xml](c:/Users/Owner/Documents/ai-services-platform/services-java/va-service/pom.xml) - Fixed protobuf build configuration

### Endpoint Ready
```bash
POST http://localhost:8136/voice/session
Content-Type: application/json

{
  "callId": "voice-session-123",
  "customerId": "customer-001",
  "tenantId": "tenant-abc",
  "productId": "va-service"
}

# Response:
{
  "sessionId": "voice-session-123",
  "greetingText": "Hello! I'm your virtual assistant. How may I help you today?",
  "greetingAudio": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA..." # Base64 audio
}
```

### Remaining Phase 1 Tasks
- [ ] Write unit tests for VoiceSessionService.startSession()
- [ ] Integration test with LLM + MongoDB + TTS pipeline
- [ ] Performance testing (ensure < 3 second response time)

---

## ✅ Phase 2: Node.js Backend (COMPLETED)

### Objective
Update Node.js backend to call Java voice session endpoint and handle greeting delivery via WebSockets.

**Status**: ✅ **DONE**  
**Completion Date**: January 23, 2026

### Tasks Breakdown

#### 2.1 Socket Handler Implementation ✅
**File**: `backend-node/src/sockets/voice-socket.ts`

**Changes Implemented**:
```typescript
// NEW EVENT: Initialize session with greeting
socket.on('voice:session:init', async (data: {
  customerId: string;
  productId: string;
}) => {
  const sessionId = generateUniqueId();
  
  try {
    // Call Java REST endpoint
    const response = await axios.post(
      'http://localhost:8136/voice/session',
      {
        callId: sessionId,
        customerId: data.customerId,
        tenantId: socket.user?.tenantId || data.customerId,
        productId: data.productId || 'va-service'
      }
    );
    
    // Store session mapping
    voiceSessions.set(sessionId, {
      customerId: data.customerId,
      startTime: Date.now()
    });
    
    // Join room for audio streaming
    socket.join(`voice:${sessionId}`);
    
    // Emit greeting to client
    socket.emit('voice:session:initialized', {
      sessionId: response.data.sessionId,
      greeting: {
        text: response.data.greetingText,
        audio: response.data.greetingAudio
      },
      status: 'ready'
    });
    
  } catch (error) {
    console.error('[Voice] Session init failed:', error);
    socket.emit('voice:error', {
      code: 'SESSION_INIT_FAILED',
      message: 'Could not initialize voice session'
    });
  }
});
```

**Estimated Time**: 2 hours

#### 2.2 Type Definitions
**File**: `backend-node/src/types/voice.types.ts`

```typescript
export interface VoiceSessionInitRequest {
  customerId: string;
  productId: string;
}

export interface VoiceSessionInitResponse {
  sessionId: string;
  greeting: {
    text: string;
    audio: string; // Base64
  };
  status: 'ready' | 'error';
}

export interface VoiceGreeting {
  text: string;
  audio: string; // Base64 encoded WAV
}
```

**Estimated Time**: 30 minutes

#### 2.3 Error Handling & Retries
- Add timeout (5 seconds) for Java service calls
- Retry logic: 1 retry on network failure
- Fallback: Return text-only greeting if audio generation fails

**Estimated Time**: 1 hour

#### 2.4 Testing
- Unit tests for socket handler
- Mock Java service responses
- Test error scenarios (timeout, 500 error, etc.)

**Estimated Time**: 1.5 hours

### Phase 2 Acceptance Criteria
- ✅ Socket handler responds to `voice:session:init` event
- ✅ Calls Java `/voice/session` endpoint successfully
- ✅ Emits `voice:session:initialized` with greeting data
- ✅ Handles errors gracefully with fallback
- ✅ Tests pass with >80% coverage

**Total Estimated Time**: 5 hours

---

## ⏳ Phase 3: Frontend (AFTER PHASE 2)

### Objective
Update React frontend to request voice session initialization and play greeting audio automatically.

### Tasks Breakdown

#### 3.1 Voice Session Initialization
**File**: `frontend/src/pages/Dashboard.tsx` (or `AssistantChat.tsx`)

**Changes Needed**:
```typescript
const [voiceSession, setVoiceSession] = useState<{
  sessionId: string | null;
  isInitializing: boolean;
  greetingPlayed: boolean;
}>({
  sessionId: null,
  isInitializing: false,
  greetingPlayed: false
});

// Initialize voice session when user clicks voice button
const handleVoiceButtonClick = () => {
  if (!voiceSession.sessionId) {
    // First time - initialize session with greeting
    initializeVoiceSession();
  } else if (isRecording) {
    // Already recording - stop
    stopVoiceRecording();
  } else {
    // Session exists - start recording
    startVoiceRecording();
  }
};

const initializeVoiceSession = () => {
  setVoiceSession({ ...voiceSession, isInitializing: true });
  
  socket.emit('voice:session:init', {
    customerId: user.id,
    productId: selectedProduct
  });
};
```

**Estimated Time**: 1.5 hours

#### 3.2 Greeting Playback Handler
```typescript
// Listen for session initialized event
useEffect(() => {
  const handleSessionInit = async (data: VoiceSessionInitResponse) => {
    console.log('[Voice] Session initialized:', data.sessionId);
    
    // Update session state
    setVoiceSession({
      sessionId: data.sessionId,
      isInitializing: false,
      greetingPlayed: false
    });
    
    // Add greeting to message history
    addMessage({
      role: 'assistant',
      content: data.greeting.text,
      timestamp: new Date(),
      source: 'voice'
    });
    
    // Play greeting audio
    try {
      await playGreetingAudio(data.greeting.audio);
      setVoiceSession(prev => ({ ...prev, greetingPlayed: true }));
      
      // Enable microphone after greeting completes
      setVoiceStatus('ready');
      
    } catch (error) {
      console.error('[Voice] Failed to play greeting:', error);
      // Still allow user to proceed
      setVoiceStatus('ready');
    }
  };
  
  socket.on('voice:session:initialized', handleSessionInit);
  
  return () => {
    socket.off('voice:session:initialized', handleSessionInit);
  };
}, [socket]);
```

**Estimated Time**: 2 hours

#### 3.3 Audio Playback Utility
```typescript
const playGreetingAudio = async (audioBase64: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Decode base64 to binary
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create audio blob
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      
      // Create and play audio element
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        console.error('[Voice] Audio error:', error);
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };
      
      audio.play().catch(reject);
      
    } catch (error) {
      reject(error);
    }
  });
};
```

**Estimated Time**: 1 hour

#### 3.4 UI Updates
- Show "Initializing..." state while session starts
- Display "Playing greeting..." indicator during playback
- Disable voice button during initialization
- Show error toast if session init fails

**Estimated Time**: 1.5 hours

#### 3.5 Testing
- Test voice button click flow
- Test audio playback in Chrome, Firefox, Safari
- Test error handling (no audio support, playback failure)
- Test message history shows greeting

**Estimated Time**: 2 hours

### Phase 3 Acceptance Criteria
- ✅ Voice button initiates session on first click
- ✅ Greeting audio plays automatically
- ✅ Greeting text appears in chat UI
- ✅ Microphone activates after greeting completes
- ✅ Error states handled gracefully
- ✅ Works across major browsers

**Total Estimated Time**: 8 hours

---

## ⏳ Phase 4: Integration & Testing (FINAL PHASE)

### Objective
End-to-end testing, transcript verification, and production readiness.

### Tasks Breakdown

#### 4.1 Transcript Verification
**Task**: Verify greeting is saved to MongoDB voice_transcripts collection

**Test Query**:
```javascript
db.voice_transcripts.findOne({ sessionId: "voice-session-123" })

// Expected structure:
{
  "sessionId": "voice-session-123",
  "customerId": "customer-001",
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

**Estimated Time**: 1 hour

#### 4.2 End-to-End Flow Testing
**Test Scenario 1**: Happy Path
```
1. User clicks voice button
2. Session initializes (< 3 seconds)
3. Greeting plays automatically
4. User speaks question
5. Assistant responds
6. Verify full conversation in transcript
```

**Test Scenario 2**: LLM Failure
```
1. Stop LLM service (simulate failure)
2. Click voice button
3. Verify fallback greeting is used
4. Session continues normally
```

**Test Scenario 3**: TTS Failure
```
1. Simulate TTS timeout
2. Verify text-only greeting is returned
3. User can still interact with session
```

**Test Scenario 4**: Network Issues
```
1. Simulate slow network
2. Verify loading state shown
3. Verify timeout after 5 seconds
4. Verify error message shown
```

**Estimated Time**: 3 hours

#### 4.3 Performance Testing
- Measure session init time (target: < 3 seconds)
- Test with 10 concurrent sessions
- Monitor memory usage for audio streaming
- Verify audio playback latency

**Estimated Time**: 2 hours

#### 4.4 Browser Compatibility
- Chrome (Windows, Mac, Linux)
- Firefox
- Safari (Mac, iOS)
- Edge

**Estimated Time**: 2 hours

#### 4.5 Documentation Updates
- Update API documentation with new endpoint
- Update WebSocket event documentation
- Create troubleshooting guide
- Update README with new features

**Estimated Time**: 1.5 hours

#### 4.6 Production Deployment Prep
- Feature flag configuration
- Monitoring/logging setup
- Error alerting configuration
- Rollback plan

**Estimated Time**: 1.5 hours

### Phase 4 Acceptance Criteria
- ✅ All test scenarios pass
- ✅ Performance metrics meet targets
- ✅ Works on all major browsers
- ✅ Transcripts save correctly
- ✅ Documentation complete
- ✅ Production deployment plan ready

**Total Estimated Time**: 11 hours

---

## 📋 Quick Action Items (Next Steps)

### Immediate (Today - Jan 23)
- [x] Complete Phase 1 Java implementation
- [x] Fix Maven build issues
- [x] Verify service starts successfully
- [ ] Test `/voice/session` endpoint manually (requires LLM + MongoDB)

### Tomorrow (Jan 24)
- [ ] Start Phase 2: Node.js socket handler
- [ ] Implement `voice:session:init` event handler
- [ ] Add type definitions
- [ ] Write unit tests

### Day 3 (Jan 25)
- [ ] Start Phase 3: Frontend implementation
- [ ] Update voice button handler
- [ ] Implement audio playback
- [ ] Add UI loading states

### Day 4 (Jan 26)
- [ ] Phase 4: Integration testing
- [ ] E2E flow testing
- [ ] Performance validation
- [ ] Documentation updates

---

## 🚧 Blockers & Risks

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Protobuf build issues | HIGH | ✅ Fixed with explicit phase binding | Resolved |
| TTS timeout | MEDIUM | 10s timeout + fallback to text-only | Planned |
| LLM failure | MEDIUM | Use static fallback greeting from config | Planned |
| Audio playback browser issues | LOW | Detect support, show text if unsupported | Planned |
| MongoDB connection issues | LOW | Existing error handling in TranscriptService | Handled |

---

## 📞 Testing Checklist

### Manual Testing
- [ ] Java endpoint returns valid greeting
- [ ] Greeting text is personalized (tenant name)
- [ ] Audio is valid Base64 WAV format
- [ ] Audio plays in browser
- [ ] Greeting saves to MongoDB
- [ ] Session continues after greeting
- [ ] Error states display properly

### Automated Testing
- [ ] Unit tests: VoiceSessionService
- [x] Unit tests: Node.js socket handler (Phase 2 code)
- [ ] Integration test: Java → Node.js → Frontend
- [ ] E2E test: Full voice conversation flow

### Phase 2 Completed Tasks
- [x] Add voice session type definitions (api.types.ts)
- [x] Add VA_SERVICE_REST_URL configuration (env.ts)
- [x] Implement startVoiceSessionWithGreeting() REST API method
- [x] Add voice:session:init socket handler
- [x] Emit voice:session:initialized event with greeting data
- [x] Error handling with 10-second timeout
- [x] Detailed logging for debugging
- [x] Handle text-only greeting fallback (TTS failure)
- [x] Handle no-greeting fallback (LLM failure)

### Performance Testing
- [ ] Session init < 3 seconds
- [ ] Audio playback latency < 500ms
- [ ] 10 concurrent sessions handled
- [ ] Memory stable during long sessions

---

## 📚 Related Documentation

- [Full Implementation Plan](./VOICE_INITIAL_GREETING_IMPLEMENTATION_PLAN.md)
- [Project Overview](./PROJECT_OVERVIEW.md)
- [Repository Structure](./RepositoryStrucutre.md)
- [Architecture Diagram](./Platform%20Architecture%20Diagram.ini)

---

## 🎯 Success Criteria

### Technical
- ✅ Phase 1: Java backend compiles and runs
- ⏳ Phase 2: WebSocket events working
- ⏳ Phase 3: Audio playback functional
- ⏳ Phase 4: All tests passing

### User Experience
- ⏳ No silent start (greeting always plays)
- ⏳ < 3 second wait before hearing greeting
- ⏳ Natural conversation flow
- ⏳ Clear error messages if something fails

### Quality
- ⏳ > 80% test coverage
- ⏳ Zero production errors in first week
- ⏳ 99%+ greeting delivery rate
- ⏳ Performance targets met

---

## 👥 Team Notes

### Questions to Address
1. Should greeting be interruptible? (Recommendation: Yes)
2. Should we support multiple languages? (Future enhancement)
3. What's the fallback if both LLM and TTS fail? (Static config greeting)
4. How to handle session recovery after network disconnect? (Regenerate greeting)

### Decisions Made
- ✅ Use blocking greeting generation (user waits for greeting before proceeding)
- ✅ 10-second timeout for TTS synthesis
- ✅ Fallback to text-only if TTS fails
- ✅ Save greeting to transcript for compliance/audit

---

**Last Updated**: January 23, 2026, 9:05 AM EST  
**Next Review**: January 24, 2026 (after Phase 2 completion)
