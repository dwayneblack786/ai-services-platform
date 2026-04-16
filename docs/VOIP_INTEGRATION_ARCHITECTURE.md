# VoIP Integration Architecture - Enterprise Voice Assistant

**Date:** 2026-02-09
**Status:** Architecture Plan

---

## Executive Summary

Architecture plan for production VoIP integration with comprehensive pre-production testing capability.

**Key Requirements:**
- Production: Connect to VoIP provider (SIP/WebRTC)
- Development: Test complete flow without VoIP dependency
- Validate voice assistant before production deployment
- Support multiple VoIP providers

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Gateway Layer                         │
├──────────────────┬──────────────────┬──────────────────────┤
│  VoIP Gateway    │  WebSocket Gateway│  Test Gateway       │
│  (Production)    │  (Web Clients)    │  (Development)      │
└────────┬─────────┴─────────┬────────┴──────────┬──────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Orchestrator    │
                    │  (Strategy Router)│
                    └─────────┬─────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐
    │ Unified  │      │  Component  │     │   Hybrid    │
    │ Strategy │      │  Strategy   │     │  Strategy   │
    │ (GPT-4o) │      │(STT→LLM→TTS)│     │  (Tiered)   │
    └──────────┘      └─────────────┘     └─────────────┘
```

---

## 1. Gateway Layer

### 1.1 VoIP Gateway (Production)

**Purpose:** SIP/WebRTC integration for telephony providers

**Responsibilities:**
- Accept incoming calls from VoIP provider
- Handle SIP/RTP protocol translation
- Convert telephony audio (G.711, G.729) → WebM/Opus
- Manage call lifecycle (dial, hangup, transfer, hold)
- Handle DTMF input
- Provide call metadata (caller ID, call duration)

**VoIP Provider Support:**
- Twilio (SIP/WebRTC)
- Vonage (WebRTC)
- Bandwidth (SIP)
- Plivo (SIP)
- Custom SIP trunks

**Key Features:**
- Multi-provider adapter pattern
- Automatic codec negotiation
- NAT traversal (STUN/TURN)
- Call recording
- Regional failover

**Configuration:**
```typescript
interface VoIPConfig {
  provider: 'twilio' | 'vonage' | 'bandwidth' | 'plivo' | 'sip';
  credentials: {
    accountSid: string;
    authToken: string;
    phoneNumber?: string;
  };
  sipConfig?: {
    domain: string;
    username: string;
    password: string;
  };
  codec: 'opus' | 'pcmu' | 'pcma' | 'g729';
  recording: boolean;
  region: string;
}
```

### 1.2 WebSocket Gateway (Web Clients)

**Purpose:** Browser-based voice chat

**Responsibilities:**
- WebRTC media stream handling
- Real-time audio streaming
- Browser compatibility (Chrome, Firefox, Safari)
- Network quality monitoring

**Already Implemented:**
- [voice-socket.ts](../ai-product-management/backend-node/src/sockets/voice-socket.ts)
- Rate limiting (100 chunks/sec)
- Format validation (WebM, Ogg/Opus, MP4)
- Buffer management with timeout

### 1.3 Test Gateway (Development)

**Purpose:** Pre-production testing without VoIP

**Responsibilities:**
- Accept test audio files (WebM, WAV, MP3)
- Simulate call scenarios
- Record test sessions
- Performance benchmarking
- Load testing support

**Test Scenarios:**
```typescript
interface TestScenario {
  name: string;
  audioInput: string;           // Path to test audio
  expectedTranscription: string;
  expectedResponseType: 'text' | 'transfer' | 'dtmf';
  maxLatency: number;           // Max acceptable latency (ms)
  iterations: number;           // For load testing
}
```

**Already Implemented:**
- [voice-streaming.e2e.test.ts](../ai-product-management/backend-node/tests/e2e/voice-streaming.e2e.test.ts)
- [generate-sample.ts](../ai-product-management/backend-node/tests/fixtures/audio/generate-sample.ts)
- MP3 output for verification

---

## 2. Orchestrator (Strategy Router)

**Purpose:** Route calls to appropriate strategy based on tenant config

**Routing Logic:**
```typescript
interface RoutingDecision {
  strategy: 'unified' | 'component' | 'hybrid';
  model?: string;              // For unified: 'gpt-4o', 'gemini-live'
  services?: {                 // For component
    stt: string;
    llm: string;
    tts: string;
  };
  fallback?: RoutingDecision;  // Fallback if primary fails
  healthCheck: boolean;        // Check service health first
}

function selectStrategy(tenantConfig: TenantConfig, serviceHealth: HealthStatus): RoutingDecision {
  // 1. Check tier (enterprise → unified, basic → component)
  // 2. Verify service health
  // 3. Apply geographic routing
  // 4. Consider cost optimization
  // 5. Select fallback chain
}
```

**Health Monitoring:**
- Service registry with health checks
- Circuit breaker pattern
- Automatic failover
- Latency tracking per service
- Error rate monitoring

---

## 3. Strategy Implementations

### 3.1 Unified Strategy (GPT-4o Realtime, Gemini Live)

**Pros:**
- Single API call (lowest latency)
- Natural conversation flow
- Handles interruptions natively
- Built-in context management
- Voice emotion/tone preserved

**Cons:**
- Vendor lock-in
- Higher cost per call
- Limited voice customization
- Provider-specific features

**Use Cases:**
- Enterprise tier customers
- Complex multi-turn conversations
- Real-time interruptions required
- Premium voice quality needed

**Implementation:**
```typescript
interface UnifiedProvider {
  connect(): Promise<Stream>;
  sendAudio(chunk: Buffer): void;
  onTranscription(callback: (text: string) => void): void;
  onResponse(callback: (audio: Buffer) => void): void;
  interrupt(): void;
  disconnect(): void;
}
```

### 3.2 Component Strategy (STT → LLM → TTS)

**Pros:**
- Best-of-breed services
- Cost optimization (mix cheap/premium)
- Easy A/B testing
- Provider flexibility
- Custom voice training

**Cons:**
- Higher cumulative latency
- Three points of failure
- Complex error handling
- State management overhead

**Use Cases:**
- Basic/standard tier customers
- Cost-sensitive deployments
- Custom voice requirements
- Specific language support

**Current Implementation:**
- STT: Java service ([voice.proto](../ai-product-management/backend-node/proto/voice.proto))
- LLM: Assistant service
- TTS: Azure/Google/ElevenLabs

### 3.3 Hybrid Strategy (Tiered)

**Purpose:** Start with unified, fallback to component

**Logic:**
```typescript
async function hybridStrategy(audio: Buffer, config: TenantConfig): Promise<AudioResponse> {
  // Try unified first (if configured and healthy)
  if (config.enableUnified && await healthCheck('gpt-4o-realtime')) {
    try {
      return await unifiedStrategy(audio, 'gpt-4o-realtime');
    } catch (error) {
      logger.warn('Unified strategy failed, falling back to component', { error });
    }
  }

  // Fallback to component pipeline
  return await componentStrategy(audio, config.services);
}
```

---

## 4. Development Testing Strategy

### 4.1 Test Environment Setup

**No VoIP Required:**
```
Developer Workstation
├── Backend services (local)
│   ├── Orchestrator
│   ├── STT service (or mock)
│   ├── LLM service (or mock)
│   └── TTS service (or mock)
├── Test Gateway (replaces VoIP)
└── Audio fixtures (test files)
```

**Test Modes:**

**Mode 1: E2E with Real Services**
```bash
# Start all services locally
docker-compose up -d

# Run E2E test
npm run test:voice
```

**Mode 2: Mock External Services**
```bash
# Use mocks for STT/LLM/TTS
MOCK_SERVICES=true npm run test:voice
```

**Mode 3: VoIP Simulation**
```bash
# Simulate actual VoIP call flow
npm run test:voip-simulation
```

### 4.2 Test Scenarios

**Scenario 1: Basic Flow**
- Input: "Hello, what's the weather?"
- Expected: Transcription → LLM response → TTS audio
- Verify: MP3 output playable, content correct, latency < 2s

**Scenario 2: Interruption**
- Input: Audio stream with interruption
- Expected: Handle interrupt, respond appropriately
- Verify: No memory leaks, clean state reset

**Scenario 3: Failure Handling**
- Input: Valid audio
- Simulate: STT service down
- Expected: Fallback to alternative or graceful error
- Verify: Error message sent to caller

**Scenario 4: DTMF Input**
- Input: Audio + DTMF tones
- Expected: Route to appropriate IVR menu
- Verify: Correct menu selection

**Scenario 5: Call Transfer**
- Input: "Transfer me to support"
- Expected: LLM detects intent, initiates transfer
- Verify: Transfer initiated with context

**Scenario 6: Load Test**
- Input: 100 concurrent calls
- Expected: All handled within latency SLA
- Verify: No service degradation, proper queuing

### 4.3 Audio Test Fixtures

**Already Created:**
- [sample-voice.webm](../ai-product-management/backend-node/tests/fixtures/audio/sample-voice.webm) (45.6 KB)
- Generator: [generate-sample.ts](../ai-product-management/backend-node/tests/fixtures/audio/generate-sample.ts)

**Additional Fixtures Needed:**
```
tests/fixtures/audio/
├── scenarios/
│   ├── greeting.webm              # "Hello"
│   ├── weather-query.webm         # "What's the weather?"
│   ├── transfer-request.webm      # "Transfer me to support"
│   ├── dtmf-input.webm            # Audio + DTMF tones
│   ├── interruption.webm          # Mid-sentence interrupt
│   ├── background-noise.webm      # Noisy environment
│   ├── multiple-speakers.webm     # Conference call
│   └── non-english.webm           # Spanish/French/etc
└── codecs/
    ├── g711-mulaw.wav             # VoIP codec
    ├── g711-alaw.wav              # VoIP codec
    ├── g729.wav                   # VoIP codec
    └── opus.webm                  # WebRTC codec
```

---

## 5. VoIP Integration Implementation

### 5.1 Phase 1: VoIP Gateway Development

**Tasks:**
1. Implement SIP/WebRTC adapter for primary provider (Twilio)
2. Audio codec conversion (G.711 → Opus)
3. Call lifecycle management
4. DTMF handling
5. Call recording infrastructure

**Files to Create:**
```
src/
├── voip/
│   ├── gateway.ts                 # Main gateway interface
│   ├── providers/
│   │   ├── twilio-adapter.ts      # Twilio implementation
│   │   ├── vonage-adapter.ts      # Vonage implementation
│   │   └── sip-adapter.ts         # Generic SIP trunk
│   ├── codec-converter.ts         # Audio format conversion
│   ├── call-manager.ts            # Call lifecycle
│   └── dtmf-handler.ts            # DTMF input processing
```

**Estimated Effort:** 2-3 days

### 5.2 Phase 2: Orchestrator Enhancement

**Tasks:**
1. Add VoIP gateway to orchestrator routing
2. Implement health monitoring
3. Add fallback chains
4. Performance metrics collection

**Files to Modify:**
- Create: `src/orchestrator/voice-orchestrator.ts`
- Create: `src/orchestrator/strategy-selector.ts`
- Create: `src/orchestrator/health-monitor.ts`

**Estimated Effort:** 1-2 days

### 5.3 Phase 3: Test Infrastructure Enhancement

**Tasks:**
1. Create VoIP simulation test suite
2. Add more audio fixtures (codecs, scenarios)
3. Load testing framework
4. CI/CD integration for voice tests

**Files to Create:**
```
tests/
├── voip/
│   ├── voip-simulation.test.ts    # Simulate VoIP calls
│   ├── load-test.test.ts          # Concurrent calls
│   └── codec-test.test.ts         # Test all codecs
```

**Estimated Effort:** 1-2 days

### 5.4 Phase 4: Production Deployment

**Tasks:**
1. Configure VoIP provider (Twilio account)
2. Deploy VoIP gateway (dedicated servers)
3. Configure STUN/TURN servers
4. Set up monitoring/alerting
5. Load test with real VoIP provider

**Infrastructure:**
- VoIP gateway servers (2+ for HA)
- STUN/TURN servers (WebRTC)
- Load balancer (SIP traffic)
- Monitoring (Prometheus, Grafana)

**Estimated Effort:** 2-3 days

---

## 6. Development Workflow

### 6.1 Local Development (No VoIP)

```bash
# 1. Start local services
docker-compose up -d mongodb redis

# 2. Start backend
cd ai-product-management/backend-node
npm run dev

# 3. Run voice tests
npm run test:voice

# 4. Verify MP3 output
ls tests/output/audio/voice-response-*.mp3
```

**No VoIP provider needed** - uses Test Gateway

### 6.2 Staging Environment (VoIP Simulation)

```bash
# 1. Deploy to staging
./deploy-staging.sh

# 2. Run VoIP simulation tests
npm run test:voip-simulation

# 3. Load test
npm run test:load -- --concurrent=100

# 4. Review metrics
open http://staging-monitoring.example.com
```

**VoIP provider in "test mode"** - uses Twilio test credentials

### 6.3 Production Deployment

```bash
# 1. Final validation in staging
npm run test:voip-simulation -- --env=staging

# 2. Deploy to production
./deploy-production.sh

# 3. Smoke test with real VoIP
npm run test:voip -- --env=production --real-calls=5

# 4. Monitor live traffic
open http://monitoring.example.com
```

**Real VoIP provider** - production credentials, real phone calls

---

## 7. Testing Matrix

### 7.1 Pre-Production Testing (No VoIP)

| Test Type | Gateway | Services | Pass Criteria |
|-----------|---------|----------|---------------|
| Unit | Test | Mock | All tests pass |
| Integration | Test | Real (local) | E2E flow works |
| E2E | Test | Real (local) | MP3 output valid |
| Load | Test | Real (local) | 100 concurrent |
| Stress | Test | Real (local) | Graceful degradation |

**Command:**
```bash
npm run test:voice              # E2E
npm run test:voice:load         # Load test
npm run test:voice:stress       # Stress test
```

### 7.2 Staging Testing (VoIP Simulation)

| Test Type | Gateway | Services | Pass Criteria |
|-----------|---------|----------|---------------|
| VoIP Sim | Test | Real (staging) | Simulates VoIP flow |
| Codec | Test | Real (staging) | All codecs work |
| Failover | VoIP (test) | Real (staging) | Fallback works |
| Latency | VoIP (test) | Real (staging) | < 2s total |

**Command:**
```bash
npm run test:voip-simulation
npm run test:codecs
npm run test:failover
```

### 7.3 Production Testing (Real VoIP)

| Test Type | Gateway | Services | Pass Criteria |
|-----------|---------|----------|---------------|
| Smoke | VoIP (real) | Real (prod) | 5 test calls succeed |
| Monitor | VoIP (real) | Real (prod) | Continuous health checks |
| Shadow | VoIP (real) | Real (prod) | Compare old vs new |

**Command:**
```bash
npm run test:voip:smoke -- --env=production
```

---

## 8. Deployment Strategy

### 8.1 Environment Separation

**Development:**
- No VoIP provider
- Test Gateway only
- Mock external services (optional)
- Local audio fixtures

**Staging:**
- VoIP test credentials (Twilio test mode)
- Real services (staging instances)
- VoIP simulation tests
- Load testing allowed

**Production:**
- Real VoIP credentials
- Real services (production instances)
- Live traffic monitoring
- Blue-green deployment

### 8.2 Rollout Plan

**Week 1: Development**
- Create VoIP Gateway interfaces
- Implement Test Gateway
- Add VoIP simulation tests
- Local testing only

**Week 2: Staging**
- Deploy VoIP Gateway to staging
- Configure Twilio test account
- Run VoIP simulation tests
- Load testing (100+ concurrent calls)

**Week 3: Production (Pilot)**
- Deploy VoIP Gateway to production
- Route 5% traffic to new system
- Monitor performance/errors
- Gradual rollout (5% → 25% → 50%)

**Week 4: Production (Full)**
- Route 100% traffic to new system
- Decommission old system
- Continuous monitoring

---

## 9. Monitoring & Alerting

### 9.1 Key Metrics

**VoIP Gateway:**
- Calls per second
- Call success rate
- Call duration
- Codec negotiation failures
- DTMF accuracy

**Orchestrator:**
- Strategy selection distribution
- Fallback rate
- Service health status
- Latency per strategy

**Services:**
- STT accuracy
- LLM response time
- TTS quality score
- Error rates

### 9.2 Alerts

**Critical:**
- VoIP gateway down
- Call success rate < 95%
- Total latency > 5s

**Warning:**
- Fallback rate > 10%
- Service health degraded
- Load > 80% capacity

---

## 10. Cost Optimization

### 10.1 Strategy Cost Comparison

**Unified (GPT-4o Realtime):**
- Cost: ~$0.24/minute ($0.06 input + $0.18 output)
- Use for: Enterprise tier, complex conversations

**Component (Whisper + Claude + Azure):**
- Cost: ~$0.05/minute ($0.006 STT + $0.015 LLM + $0.03 TTS)
- Use for: Basic/standard tier, simple queries

**Hybrid (Auto-select):**
- Cost: $0.05-$0.24/minute (based on tenant tier)
- Use for: All tiers with automatic optimization

### 10.2 VoIP Provider Costs

**Twilio:**
- Inbound: $0.0085/minute
- Outbound: $0.013/minute

**Vonage:**
- Inbound: $0.0070/minute
- Outbound: $0.012/minute

**Total Cost Per Call:**
- Enterprise: ~$0.25/min (VoIP + unified)
- Standard: ~$0.06/min (VoIP + component)

---

## 11. Security Considerations

### 11.1 VoIP Security

**Encryption:**
- TLS for SIP signaling
- SRTP for media streams
- End-to-end encryption (where possible)

**Authentication:**
- SIP digest authentication
- API key validation
- IP whitelisting

**Fraud Prevention:**
- Rate limiting per caller ID
- Geographic restrictions
- Call duration limits
- DTMF injection prevention

### 11.2 Data Privacy

**PII Handling:**
- Redact sensitive data from logs
- Encrypt call recordings
- GDPR compliance (EU callers)
- HIPAA compliance (healthcare)

**Compliance:**
- Call recording consent (required in some jurisdictions)
- Data retention policies
- Right to deletion (GDPR)

---

## 12. Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create VoIP Gateway interfaces
- [ ] Implement Test Gateway
- [ ] Add VoIP simulation test suite
- [ ] Create additional audio fixtures (codecs, scenarios)
- [ ] Update E2E tests to support Test Gateway
- [ ] Document testing workflow

### Phase 2: Integration (Week 2)
- [ ] Implement Twilio adapter
- [ ] Add codec converter (G.711 → Opus)
- [ ] Implement call lifecycle management
- [ ] Add DTMF handler
- [ ] Create orchestrator with strategy routing
- [ ] Add health monitoring
- [ ] Deploy to staging

### Phase 3: Testing (Week 3)
- [ ] Run VoIP simulation tests
- [ ] Load test (100+ concurrent)
- [ ] Codec compatibility test
- [ ] Failover testing
- [ ] Performance benchmarking
- [ ] Security audit

### Phase 4: Production (Week 4)
- [ ] Configure production VoIP provider
- [ ] Deploy VoIP Gateway (HA setup)
- [ ] Set up monitoring/alerting
- [ ] Pilot deployment (5% traffic)
- [ ] Gradual rollout (25%, 50%, 100%)
- [ ] Decommission old system

---

## 13. File Structure

```
ai-product-management/backend-node/
├── src/
│   ├── voip/                              # NEW
│   │   ├── gateway.ts                     # VoIP gateway interface
│   │   ├── providers/
│   │   │   ├── twilio-adapter.ts
│   │   │   ├── vonage-adapter.ts
│   │   │   └── sip-adapter.ts
│   │   ├── codec-converter.ts
│   │   ├── call-manager.ts
│   │   └── dtmf-handler.ts
│   ├── orchestrator/                      # NEW
│   │   ├── voice-orchestrator.ts          # Main orchestrator
│   │   ├── strategy-selector.ts           # Strategy routing logic
│   │   ├── health-monitor.ts              # Service health checks
│   │   └── fallback-chain.ts              # Fallback management
│   ├── strategies/                        # NEW
│   │   ├── unified-strategy.ts            # GPT-4o Realtime
│   │   ├── component-strategy.ts          # STT→LLM→TTS
│   │   └── hybrid-strategy.ts             # Tiered approach
│   └── sockets/
│       └── voice-socket.ts                # EXISTING (already fixed)
├── tests/
│   ├── e2e/
│   │   ├── voice-streaming.e2e.test.ts    # EXISTING
│   │   └── VOICE_TESTING_GUIDE.md         # EXISTING
│   ├── voip/                              # NEW
│   │   ├── voip-simulation.test.ts        # VoIP simulation tests
│   │   ├── load-test.test.ts              # Load testing
│   │   ├── codec-test.test.ts             # Codec compatibility
│   │   └── failover-test.test.ts          # Failover testing
│   ├── fixtures/
│   │   └── audio/
│   │       ├── generate-sample.ts         # EXISTING
│   │       ├── sample-voice.webm          # EXISTING
│   │       ├── scenarios/                 # NEW
│   │       │   ├── greeting.webm
│   │       │   ├── weather-query.webm
│   │       │   ├── transfer-request.webm
│   │       │   ├── dtmf-input.webm
│   │       │   └── interruption.webm
│   │       └── codecs/                    # NEW
│   │           ├── g711-mulaw.wav
│   │           ├── g711-alaw.wav
│   │           └── opus.webm
│   └── output/
│       └── audio/
│           ├── .gitignore                 # EXISTING
│           └── voice-response-*.mp3       # EXISTING (test outputs)
├── docs/                                  # EXISTING
│   ├── VOIP_INTEGRATION_ARCHITECTURE.md   # THIS DOCUMENT
│   ├── VOICE_TESTING_GUIDE.md             # EXISTING
│   ├── E2E_VOICE_TEST_SETUP.md            # EXISTING
│   └── VOICE_CRITICAL_FIXES.md            # EXISTING
└── proto/
    └── voice.proto                        # EXISTING
```

---

## 14. Next Steps

### Immediate (This Week)
1. Review this architecture plan
2. Decide on VoIP provider (recommend: Twilio)
3. Create VoIP Gateway interface
4. Implement Test Gateway
5. Add VoIP simulation tests

### Short Term (Next 2 Weeks)
1. Implement Twilio adapter
2. Create orchestrator with strategy routing
3. Deploy to staging
4. Load testing

### Long Term (Next Month)
1. Production pilot deployment
2. Gradual rollout
3. Monitor and optimize
4. Add additional VoIP providers

---

## 15. Questions to Resolve

1. **VoIP Provider:** Twilio, Vonage, Bandwidth, or multiple?
2. **Strategy Default:** Start with unified or component?
3. **Recording:** Record all calls or only on-demand?
4. **Compliance:** GDPR/HIPAA requirements?
5. **Scale:** Expected calls per second (peak)?
6. **Budget:** Monthly VoIP + AI service budget?

---

## Conclusion

This architecture enables:
- ✅ Production VoIP integration (Twilio/Vonage/etc)
- ✅ Pre-production testing without VoIP (Test Gateway)
- ✅ Multiple strategy support (unified, component, hybrid)
- ✅ Comprehensive testing (E2E, load, codec, failover)
- ✅ Gradual rollout with monitoring
- ✅ Cost optimization by tier
- ✅ Security and compliance ready

**Ready to implement:** Start with Phase 1 (Test Gateway + VoIP simulation tests)

