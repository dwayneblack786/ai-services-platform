# Redis Implementation Guide for Load Balancing

## When to Read This Document

⚠️ **Read this when you need to:**
- Scale Java services horizontally (multiple instances)
- Implement load balancing
- Deploy to production with high availability
- Add distributed session management
- Reduce LLM API costs through caching

---

## Current State (January 2026)

### ✅ What's Using Redis:
- **Backend-Node**: Session storage for user authentication (express-session)
- **Redis Server**: Running at `127.0.0.1:6379`

### ❌ What's NOT Using Redis:
- **Java VA Service**: Using in-memory `ConcurrentHashMap` for:
  - Chat sessions (`ChatSessionService`)
  - Voice sessions (`VoiceSessionService`)
  - Dialog context (`DialogManager`)
  - Usage metrics (`UsageService`)

---

## Why You'll Need Redis for Java

### Problem: In-Memory Sessions Don't Scale

**Single Instance (Current):**
```
User Request → Load Balancer → Java VA Instance
                                ↓
                        In-Memory Sessions
                        ✅ Works fine
```

**Multiple Instances (Load Balanced - BROKEN without Redis):**
```
User Request #1 → Load Balancer → Java VA #1 (Session A stored here)
User Request #2 → Load Balancer → Java VA #2 (Session A NOT found!)
                                    ❌ User gets "Session not found" error
```

**Multiple Instances WITH Redis (SOLUTION):**
```
User Request #1 → Load Balancer → Java VA #1 ──┐
User Request #2 → Load Balancer → Java VA #2 ──┤
                                                ├→ Redis (Shared Sessions)
User Request #3 → Load Balancer → Java VA #3 ──┘
                                    ✅ All instances see same sessions
```

---

## Implementation Steps

### Step 1: Add Redis Dependencies to `pom.xml`

```xml
<!-- Add to services-java/va-service/pom.xml -->
<dependencies>
    <!-- Spring Data Redis -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
    
    <!-- Lettuce (Redis client) -->
    <dependency>
        <groupId>io.lettuce</groupId>
        <artifactId>lettuce-core</artifactId>
    </dependency>
    
    <!-- Jackson for JSON serialization -->
    <dependency>
        <groupId>com.fasterxml.jackson.datatype</groupId>
        <artifactId>jackson-datatype-jsr310</artifactId>
    </dependency>
</dependencies>
```

### Step 2: Create Redis Configuration

**File:** `services-java/va-service/src/main/java/com/ai/va/config/RedisConfig.java`

```java
package com.ai.va.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.ai.va.model.SessionState;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
public class RedisConfig {

    @Value("${redis.host:127.0.0.1}")
    private String redisHost;

    @Value("${redis.port:6379}")
    private int redisPort;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(redisHost);
        config.setPort(redisPort);
        return new LettuceConnectionFactory(config);
    }

    @Bean
    public RedisTemplate<String, SessionState> sessionRedisTemplate(
            RedisConnectionFactory connectionFactory) {
        
        RedisTemplate<String, SessionState> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        
        // String serializer for keys
        template.setKeySerializer(new StringRedisSerializer());
        
        // JSON serializer for values
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        
        Jackson2JsonRedisSerializer<SessionState> serializer = 
            new Jackson2JsonRedisSerializer<>(SessionState.class);
        serializer.setObjectMapper(mapper);
        
        template.setValueSerializer(serializer);
        template.setHashValueSerializer(serializer);
        
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public RedisTemplate<String, String> stringRedisTemplate(
            RedisConnectionFactory connectionFactory) {
        
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }
}
```

### Step 3: Create Redis Session Service

**File:** `services-java/va-service/src/main/java/com/ai/va/service/RedisSessionService.java`

```java
package com.ai.va.service;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.ai.va.model.SessionState;

@Service
public class RedisSessionService {

    @Autowired
    private RedisTemplate<String, SessionState> sessionRedisTemplate;

    private static final String CHAT_SESSION_PREFIX = "chat:session:";
    private static final String VOICE_SESSION_PREFIX = "voice:session:";
    private static final Duration SESSION_TTL = Duration.ofHours(24);

    // Chat Sessions
    public void saveChatSession(String sessionId, SessionState state) {
        String key = CHAT_SESSION_PREFIX + sessionId;
        sessionRedisTemplate.opsForValue().set(key, state, SESSION_TTL);
    }

    public SessionState getChatSession(String sessionId) {
        String key = CHAT_SESSION_PREFIX + sessionId;
        return sessionRedisTemplate.opsForValue().get(key);
    }

    public void deleteChatSession(String sessionId) {
        String key = CHAT_SESSION_PREFIX + sessionId;
        sessionRedisTemplate.delete(key);
    }

    public boolean chatSessionExists(String sessionId) {
        String key = CHAT_SESSION_PREFIX + sessionId;
        return Boolean.TRUE.equals(sessionRedisTemplate.hasKey(key));
    }

    // Voice Sessions
    public void saveVoiceSession(String sessionId, SessionState state) {
        String key = VOICE_SESSION_PREFIX + sessionId;
        sessionRedisTemplate.opsForValue().set(key, state, SESSION_TTL);
    }

    public SessionState getVoiceSession(String sessionId) {
        String key = VOICE_SESSION_PREFIX + sessionId;
        return sessionRedisTemplate.opsForValue().get(key);
    }

    public void deleteVoiceSession(String sessionId) {
        String key = VOICE_SESSION_PREFIX + sessionId;
        sessionRedisTemplate.delete(key);
    }

    // Customer to Session Mapping
    public void mapCustomerToSession(String customerId, String sessionId) {
        String key = "customer:session:" + customerId;
        sessionRedisTemplate.opsForValue().set(key, sessionId, SESSION_TTL);
    }

    public String getSessionForCustomer(String customerId) {
        String key = "customer:session:" + customerId;
        return (String) sessionRedisTemplate.opsForValue().get(key);
    }
}
```

### Step 4: Update ChatSessionService

**Replace in:** `services-java/va-service/src/main/java/com/ai/va/service/ChatSessionService.java`

```java
// OLD CODE (Remove this):
// In-memory session storage (consider Redis for production)
private final Map<String, SessionState> activeSessions = new ConcurrentHashMap<>();
private final Map<String, String> customerToSessionMap = new ConcurrentHashMap<>();

// NEW CODE (Add this):
@Autowired
private RedisSessionService redisSessionService;

// Update all methods that use activeSessions:

// OLD: activeSessions.put(sessionId, state);
// NEW: redisSessionService.saveChatSession(sessionId, state);

// OLD: SessionState state = activeSessions.get(sessionId);
// NEW: SessionState state = redisSessionService.getChatSession(sessionId);

// OLD: activeSessions.remove(sessionId);
// NEW: redisSessionService.deleteChatSession(sessionId);

// OLD: customerToSessionMap.put(customerId, sessionId);
// NEW: redisSessionService.mapCustomerToSession(customerId, sessionId);

// OLD: String sessionId = customerToSessionMap.get(customerId);
// NEW: String sessionId = redisSessionService.getSessionForCustomer(customerId);
```

### Step 5: Add Redis Configuration to `application.properties`

**File:** `services-java/va-service/src/main/resources/application.properties`

```properties
# Redis Configuration
redis.host=127.0.0.1
redis.port=6379
redis.password=
redis.timeout=2000
redis.database=0

# Production override (environment variables)
# REDIS_HOST=your-redis-host.com
# REDIS_PORT=6379
# REDIS_PASSWORD=your-password
```

---

## Bonus: LLM Response Caching (Cost Savings)

### Create LLM Cache Service

**File:** `services-java/va-service/src/main/java/com/ai/va/service/LlmCacheService.java`

```java
package com.ai.va.service;

import java.security.MessageDigest;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class LlmCacheService {

    @Autowired
    private RedisTemplate<String, String> stringRedisTemplate;

    private static final String LLM_CACHE_PREFIX = "llm:response:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    public String getCachedResponse(String prompt) {
        String key = LLM_CACHE_PREFIX + hashPrompt(prompt);
        return stringRedisTemplate.opsForValue().get(key);
    }

    public void cacheResponse(String prompt, String response) {
        String key = LLM_CACHE_PREFIX + hashPrompt(prompt);
        stringRedisTemplate.opsForValue().set(key, response, CACHE_TTL);
    }

    private String hashPrompt(String prompt) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(prompt.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return String.valueOf(prompt.hashCode());
        }
    }
}
```

### Use in LlmClient

```java
@Autowired
private LlmCacheService cacheService;

public String getChatCompletion(String systemPrompt, String userMessage, 
                                double temperature, String model, int maxTokens) throws Exception {
    
    // Check cache first
    String cacheKey = systemPrompt + "|" + userMessage + "|" + temperature;
    String cached = cacheService.getCachedResponse(cacheKey);
    
    if (cached != null) {
        logger.info("Cache HIT - returning cached LLM response");
        return cached;
    }
    
    // Cache miss - call LLM
    logger.info("Cache MISS - calling LLM API");
    String response = // ... existing LLM call logic ...
    
    // Cache the response
    cacheService.cacheResponse(cacheKey, response);
    
    return response;
}
```

---

## Testing Redis Integration

### 1. Start Redis (if not running)
```bash
# Windows (WSL)
sudo service redis-server start

# Check status
redis-cli ping
# Should return: PONG
```

### 2. Test Connection
```bash
# Connect to Redis CLI
redis-cli

# Check keys
KEYS *

# Monitor real-time operations
MONITOR
```

### 3. Verify Session Storage
```bash
# In Redis CLI:
KEYS chat:session:*
GET chat:session:your-session-id

# Should see JSON session data
```

---

## Load Balancing Architecture

### Before (Single Instance):
```
                    ┌─────────────────┐
Internet ─────────→ │   Java VA:8136  │
                    │   (In-Memory)   │
                    └─────────────────┘
                           ↓
                    ┌─────────────────┐
                    │     MongoDB     │
                    └─────────────────┘
```

### After (Load Balanced with Redis):
```
                    ┌─────────────────┐
Internet ─────────→ │  Load Balancer  │
                    └─────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Java VA #1   │ │ Java VA #2   │ │ Java VA #3   │
    │   :8136      │ │   :8137      │ │   :8138      │
    └──────────────┘ └──────────────┘ └──────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            ↓
                    ┌─────────────────┐
                    │   Redis Cache   │
                    │   (Sessions)    │
                    └─────────────────┘
                            ↓
                    ┌─────────────────┐
                    │    MongoDB      │
                    │   (Persistent)  │
                    └─────────────────┘
```

---

## Environment Variables for Production

### Docker Compose Example:
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  java-va-1:
    image: va-service:latest
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - SERVER_PORT=8136
    depends_on:
      - redis

  java-va-2:
    image: va-service:latest
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - SERVER_PORT=8137
    depends_on:
      - redis

volumes:
  redis-data:
```

---

## Performance Metrics

### Expected Performance:

| Operation | In-Memory | Redis (Same Server) | Redis (Network) |
|-----------|-----------|---------------------|-----------------|
| Session Read | 0.001ms | 1-3ms | 5-10ms |
| Session Write | 0.001ms | 1-3ms | 5-10ms |
| LLM Cache Hit | N/A | 1-3ms | 5-10ms |
| LLM Cache Miss | 5000ms | 5000ms | 5000ms |

### Cost Savings (LLM Caching):

- **Without Cache:** 100 requests × $0.01 = **$1.00**
- **With Cache (90% hit rate):** 10 requests × $0.01 = **$0.10**
- **Savings:** **90% reduction in LLM costs**

---

## Monitoring Redis

### Key Metrics to Track:

```bash
# Redis CLI commands:

# Memory usage
INFO memory

# Connected clients
CLIENT LIST

# Hit/miss ratio
INFO stats
# Look for: keyspace_hits, keyspace_misses

# Slow queries
SLOWLOG GET 10

# Key count by pattern
KEYS chat:session:* | wc -l
KEYS llm:response:* | wc -l
```

---

## Troubleshooting

### Issue: Redis Connection Failed
**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# Check Java logs
tail -f logs/application.log | grep -i redis

# Verify application.properties
cat src/main/resources/application.properties | grep redis
```

### Issue: Sessions Not Found After Restart
**Cause:** Redis not configured or not running  
**Solution:** Verify RedisSessionService is @Autowired and being used

### Issue: High Memory Usage
**Cause:** Too many cached keys  
**Solution:** Set TTL on all keys, use Redis eviction policies

---

## Migration Checklist

When implementing Redis:

- [ ] Add Redis dependencies to pom.xml
- [ ] Create RedisConfig.java
- [ ] Create RedisSessionService.java
- [ ] Update ChatSessionService to use Redis
- [ ] Update VoiceSessionService to use Redis
- [ ] Update DialogManager to use Redis
- [ ] Add LlmCacheService (optional but recommended)
- [ ] Update application.properties with Redis config
- [ ] Test locally with single instance
- [ ] Test with multiple instances
- [ ] Monitor Redis memory usage
- [ ] Set up Redis persistence (AOF/RDB)
- [ ] Configure Redis backup strategy
- [ ] Update deployment documentation

---

## Related Documentation

- [Project Overview](PROJECT_OVERVIEW.md)
- [gRPC Implementation](GRPC_IMPLEMENTATION.md)
- [Architecture Diagram](Platform%20Architecture%20Diagram.ini)

---

**Last Updated:** January 16, 2026  
**Status:** Redis running for Backend-Node sessions only. Java implementation pending.
