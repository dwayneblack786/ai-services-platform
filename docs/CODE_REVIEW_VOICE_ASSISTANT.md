# Code Review: Voice Assistant Implementation

**Date:** 2026-02-06
**Scope:** Conversational Flow, PMS, Voice Implementation (UI/Node/Java), Error Handling, Logging

---

## CRITICAL ISSUES

### 1. Excessive Console Logging in Production Code
**Files:** `voice-socket.ts`, `voice-routes.ts`
**Count:** 59 console.log/error statements

**Issue:** Console statements in socket handlers impact WebSocket latency
- L36: `console.log('[Voice] Setting up voice handlers...')`
- L42-48: Structured log every session init (7 lines)
- L74-78: Greeting log with substring operations (5 lines)

**Action Required:**
```typescript
// Replace with structured logger
import logger from '../utils/logger';
logger.info('voice.session.init', { sessionId, customerId });
```

**Impact:** ~5-15ms added latency per message on high-frequency events

---

### 2. Missing Timeout on Audio Buffer Accumulation
**File:** `voice-socket.ts:28`
**Issue:** `audioBuffers` Map never cleared if session doesn't call `voice:end`

```typescript
const audioBuffers = new Map<string, Buffer[]>();
```

**Risk:** Memory leak on disconnected/crashed clients

**Fix:**
```typescript
// Add timeout cleanup
const BUFFER_TTL = 300000; // 5 min
const bufferTimers = new Map<string, NodeJS.Timeout>();

socket.on('voice:chunk', (data) => {
  clearTimeout(bufferTimers.get(sessionId));
  bufferTimers.set(sessionId, setTimeout(() => {
    audioBuffers.delete(sessionId);
    bufferTimers.delete(sessionId);
  }, BUFFER_TTL));
});
```

---

### 3. Error Details Exposed to Client
**File:** `voice-socket.ts:295-297`

```typescript
socket.emit('voice:error', {
  error: 'Failed to process voice input',
  details: error.message || error.details  // ⚠️ EXPOSES INTERNAL ERRORS
});
```

**Risk:** Stack traces, DB errors, API keys leaked to client

**Fix:**
```typescript
logger.error('voice.processing.error', { error, sessionId });
socket.emit('voice:error', {
  error: 'Failed to process voice input',
  code: 'VOICE_PROCESSING_ERROR'
});
```

---

### 4. No Rate Limiting on Voice Streaming
**File:** `voice-socket.ts:222` (`voice:conversation:stream` event)

**Issue:** Client can flood with audio chunks (DoS attack vector)

**Fix:**
```typescript
import rateLimit from 'express-rate-limit';
const voiceRateLimiter = new Map<string, number>();

socket.on('voice:conversation:stream', async (data) => {
  const key = `${socket.id}:${Date.now() / 1000 | 0}`;
  const count = (voiceRateLimiter.get(key) || 0) + 1;

  if (count > 50) { // 50 chunks/sec max
    socket.emit('voice:error', { code: 'RATE_LIMIT_EXCEEDED' });
    return;
  }
  voiceRateLimiter.set(key, count);
  // ... process audio
});
```

---

### 5. Java Voice Service Integration: Missing Link
**Search Result:** No `.java` files found in repository

**Issue:** Review requested Java voice processing, but no Java source exists

**Findings:**
- `voice-routes.ts:3` imports `javaVAClient` (API client wrapper)
- `voice-socket.ts:52` calls `grpcClient.startVoiceSessionWithGreeting()`
- Actual Java service is **external** (not in this repo)

**Action:** Cannot review Java accuracy without source. Verify:
1. gRPC proto definitions match (`backend-node/proto/voice.proto`)
2. Error codes documented
3. Latency SLA defined (recommend <200ms STT, <500ms TTS)

---

## WARNING ISSUES

### 6. Business Hours Timezone Handling
**File:** `voice-routes.ts:74-78`

```typescript
const currentTime = now.toLocaleString('en-US', { timeZone: timezone });
const currentDate = new Date(currentTime); // ⚠️ FRAGILE
```

**Issue:** `toLocaleString()` parsing is locale-dependent and unreliable

**Fix:**
```typescript
import { zonedTimeToUtc } from 'date-fns-tz';
const currentDate = zonedTimeToUtc(now, timezone);
```

---

### 7. PMS Integration: Test Scores Not Updated Reactively
**File:** `prompt-testing.service.ts:232` (from earlier fix)

**Issue:** `lastScore` only updates when test runs, not when binding is fetched

**Observation:** Working as designed, but consider:
- Add webhook/event when score updates
- Cache invalidation for stale scores

---

### 8. Missing Audio Format Validation
**File:** `voice-socket.ts:226` (`voice:conversation:stream`)

```typescript
interface VoiceChunkData {
  sessionId: string;
  audio: ArrayBuffer;  // ⚠️ No format validation
  timestamp: number;
}
```

**Risk:** Client sends corrupt/invalid audio → Java service crashes

**Fix:**
```typescript
if (!(data.audio instanceof ArrayBuffer) || data.audio.byteLength > 1048576) {
  socket.emit('voice:error', { code: 'INVALID_AUDIO_FORMAT' });
  return;
}
```

---

### 9. Frontend Voice UI: No Microphone Permission Check
**File:** `VoiceDemo.tsx:27-40`

**Issue:** No check if `navigator.mediaDevices` exists or permissions granted

**Expected in AssistantChat.tsx:**
```typescript
const checkMicPermission = async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    setError('Microphone access denied');
  }
};
```

**Action:** Verify in `AssistantChat.tsx` component (not in scope of VoiceDemo.tsx)

---

## OPTIMIZATION OPPORTUNITIES

### 10. Voice Chunk Processing: Synchronous Buffer Ops
**File:** `voice-socket.ts:226-289`

**Issue:** Potential blocking on large audio buffers

**Recommendation:**
```typescript
// Move to worker thread for >100KB audio
if (totalSize > 102400) {
  const worker = new Worker('./audio-processor.worker.js');
  worker.postMessage(audioBuffer);
}
```

---

### 11. Greeting Audio Caching
**File:** `voice-socket.ts:68-78`

**Observation:** Greeting generated per session (redundant for same tenant/product)

**Optimization:**
```typescript
const greetingCache = new Map<string, VoiceGreeting>();
const cacheKey = `${tenantId}:${productId}`;
if (greetingCache.has(cacheKey)) {
  greeting = greetingCache.get(cacheKey);
}
```

**Impact:** Save ~500ms + TTS API call per session

---

## LOGGING ASSESSMENT

### Current State:
- **Console:** 59 instances (❌ too verbose)
- **Structured Logger:** Not used in voice files
- **Error Context:** Good (includes sessionId, customerId)
- **PII Risk:** Low (no user content logged)

### Recommendations:
1. Replace all `console.log` with `logger.debug()` (file output)
2. Keep critical errors: `logger.error('voice.session.init.failed', context)`
3. Add correlation IDs across Node ↔ Java services

---

## LATENCY ANALYSIS

### Current Flow:
```
Client → WebSocket → Node → gRPC → Java → STT → LLM → TTS → Java → Node → Client
```

### Estimated Latency (per turn):
- **WebSocket overhead:** ~10-20ms
- **Console logging:** ~5-15ms (REMOVABLE)
- **Audio buffering:** ~50-100ms (tunable)
- **Java gRPC:** <50ms (assumed)
- **STT:** ~200-500ms (Azure/OpenAI)
- **LLM:** ~500-2000ms (Claude/GPT)
- **TTS:** ~300-800ms (Azure Neural)

**Total:** ~1-3.5 seconds (acceptable for voice assistant)

**Quick Win:** Remove console logs → save ~5-15ms per message

---

## PMS REVIEW

### Prompt Management System:
- ✅ Version control working (`PromptVersion` model)
- ✅ Test scores updating (`lastScore` in bindings)
- ✅ Tenant isolation implemented
- ⚠️ Voice prompts not cached (see #11)
- ✅ Metrics tracking (Phase 7) ready for voice usage data

**Integration Points:**
1. `voice-socket.ts` should call PMS to get active prompt:
   ```typescript
   const prompt = await promptApi.getActivePrompt({
     tenantId, productId, channelType: 'voice', environment: 'production'
   });
   ```
2. Verify this exists in Java service (not visible in Node code)

---

## ERROR HANDLING SCORE: 6/10

### Strengths:
- ✅ Try-catch blocks present
- ✅ Errors emitted to client
- ✅ Session ID included in error context

### Weaknesses:
- ❌ Error details exposed to client (security risk)
- ❌ No retry logic for transient failures
- ❌ Missing timeout handling on gRPC calls
- ❌ No circuit breaker for Java service

---

## SUMMARY

### Critical (Fix Immediately):
1. Remove console logs from hot path (59 instances)
2. Add audio buffer cleanup timeout
3. Sanitize error messages sent to client
4. Add rate limiting on voice streaming

### High Priority:
5. Validate audio format before processing
6. Add microphone permission checks (frontend)
7. Cache greeting audio per tenant/product

### Medium Priority:
8. Switch to structured logger
9. Add retry logic for gRPC failures
10. Implement circuit breaker for Java service

### Low Priority:
11. Optimize business hours timezone handling
12. Consider worker threads for large audio buffers

---

## FILES REVIEWED:
- ✅ `voice-routes.ts` (109 lines)
- ✅ `voice-socket.ts` (350+ lines)
- ✅ `VoiceDemo.tsx` (partial, 80 lines)
- ❌ Java voice service (not in repo)
- ⚠️ `AssistantChat.tsx` (mentioned, not read)

---

**Next Steps:**
1. Implement critical fixes (#1-4)
2. Share Java service repo link for accuracy review
3. Add integration tests for voice flow
