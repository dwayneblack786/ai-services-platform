# 🚀 Quick Reference: LLM Configuration

## Running the Service

### Development (LM Studio)
```bash
cd services-java/va-service
.\mvnw.cmd spring-boot:run -Dspring.profiles.active=dev
```

### Production Testing (Azure - Local)
```bash
$env:AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
$env:AZURE_OPENAI_KEY="your-key"
$env:AZURE_OPENAI_DEPLOYMENT="gpt-4"

.\mvnw.cmd spring-boot:run -Dspring.profiles.active=prod
```

---

## Testing Agent

```powershell
# Multi-question test
$body = @{
    sessionId = "test-$(Get-Date -Format 'HHmmss')"
    message = "1. Hello, how are you?`n2. What can you help with?`n3. Tell me about services"
    context = @{}
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8136/agent/execute" `
    -Method POST -Body $body -ContentType "application/json"
```

---

## Configuration Files

| File | Purpose | Provider |
|------|---------|----------|
| `application.properties` | Base config | Both |
| `application-dev.properties` | LM Studio | lm-studio |
| `application-prod.properties` | Azure OpenAI | azure-openai |

---

## Environment Variables

### Development (None needed)
```
Uses application-dev.properties defaults
```

### Production
```
SPRING_PROFILES_ACTIVE=prod
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4
```

---

## Provider Differences

| Feature | LM Studio | Azure OpenAI |
|---------|-----------|--------------|
| **URL Format** | `localhost:1234/v1/chat/completions` | `{endpoint}/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01` |
| **Auth** | None | `api-key` header |
| **Model in Body** | Yes | No (in URL) |
| **Cost** | Free | ~$150-4500/month |
| **Model** | gemma-2-9b | gpt-3.5-turbo/gpt-4 |

---

## Log Output to Check

### LM Studio Mode
```
[LLMClient] Initialized with provider: lm-studio
[LLMClient] URL: http://localhost:1234/v1/chat/completions
[LLMClient] No authentication (LM Studio mode)
```

### Azure OpenAI Mode
```
[LLMClient] Initialized with provider: azure-openai
[LLMClient] URL: https://your-resource.openai.azure.com
[LLMClient] Azure deployment: gpt-4
[LLMClient] Using Azure api-key authentication
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" | Start LM Studio or check port 1234 |
| "401 Unauthorized" | Check AZURE_OPENAI_KEY |
| "404 Not Found" | Verify AZURE_OPENAI_DEPLOYMENT name |
| "Model not found" | Check model is loaded in LM Studio or deployed in Azure |

---

## Files Created/Modified

✅ `src/main/java/com/ai/va/client/LlmClient.java`  
✅ `src/main/resources/application.properties`  
✅ `src/main/resources/application-dev.properties`  
✅ `src/main/resources/application-prod.properties`  
✅ `LLM-CONFIGURATION.md` (Full guide)  
✅ `IMPLEMENTATION-SUMMARY.md` (Summary)  
✅ `test-llm-config.ps1` (Test script)  
✅ `QUICK-REFERENCE.md` (This file)

---

## Next Steps

1. Test with LM Studio: `.\test-llm-config.ps1`
2. Get Azure credentials from Azure Portal
3. Test Azure locally with prod profile
4. Compare results
5. Deploy to Azure

---

## Documentation

- **Full Guide**: `LLM-CONFIGURATION.md`
- **Summary**: `IMPLEMENTATION-SUMMARY.md`
- **This File**: `QUICK-REFERENCE.md`
