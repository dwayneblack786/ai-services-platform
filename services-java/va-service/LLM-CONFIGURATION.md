# LLM Configuration Guide
## Environment-Based LLM Provider Setup

This service supports **both** LM Studio (local development) and Azure OpenAI (production) using the same codebase.

---

## Quick Start

### Development (LM Studio)
```bash
# Start LM Studio on localhost:1234
# Run with dev profile
./mvnw spring-boot:run -Dspring.profiles.active=dev
```

### Test Azure OpenAI Locally (Before Deployment)
```bash
# Set Azure environment variables
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
export AZURE_OPENAI_KEY="your-api-key"
export AZURE_OPENAI_DEPLOYMENT="gpt-4"

# Run with prod profile
./mvnw spring-boot:run -Dspring.profiles.active=prod
```

### Production (Azure)
```bash
# Environment variables set in Azure App Service
# Automatically uses application-prod.properties
```

---

## Configuration Files

### application.properties (Base)
Default configuration with environment variable support:
```properties
api.endpoints.llm.provider=${LLM_PROVIDER:lm-studio}
api.endpoints.llm.url=${LLM_BASE_URL:http://localhost:1234/v1/chat/completions}
api.endpoints.llm.api-key=${LLM_API_KEY:lm-studio}
api.endpoints.llm.model=${LLM_MODEL:google/gemma-2-9b}
api.endpoints.llm.deployment=${LLM_DEPLOYMENT:}
```

### application-dev.properties (LM Studio)
```properties
api.endpoints.llm.provider=lm-studio
api.endpoints.llm.url=http://localhost:1234/v1/chat/completions
api.endpoints.llm.api-key=not-needed
api.endpoints.llm.model=google/gemma-2-9b
```

### application-prod.properties (Azure OpenAI)
```properties
api.endpoints.llm.provider=azure-openai
api.endpoints.llm.url=${AZURE_OPENAI_ENDPOINT}
api.endpoints.llm.api-key=${AZURE_OPENAI_KEY}
api.endpoints.llm.model=gpt-4
api.endpoints.llm.deployment=${AZURE_OPENAI_DEPLOYMENT:gpt-4}
```

---

## How It Works

### LlmClient Architecture

The `LlmClient` class automatically adapts to the provider:

**1. URL Building**
- **LM Studio**: Uses URL as-is (`http://localhost:1234/v1/chat/completions`)
- **Azure OpenAI**: Constructs Azure-specific URL format
  ```
  https://your-resource.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01
  ```

**2. Authentication**
- **LM Studio**: No auth required
- **Azure OpenAI**: Uses `api-key` header (not Bearer token)

**3. Request Body**
- **LM Studio**: Includes `model` field in request body
- **Azure OpenAI**: Excludes `model` (uses deployment in URL)

---

## Environment Variables

### Development (LM Studio)
No environment variables needed. Uses defaults from `application-dev.properties`.

### Production (Azure OpenAI)
Set these in Azure App Service Configuration:

| Variable | Example | Required |
|----------|---------|----------|
| `SPRING_PROFILES_ACTIVE` | `prod` | Yes |
| `AZURE_OPENAI_ENDPOINT` | `https://your-resource.openai.azure.com` | Yes |
| `AZURE_OPENAI_KEY` | `abc123...` | Yes |
| `AZURE_OPENAI_DEPLOYMENT` | `gpt-4` or `gpt-35-turbo` | Yes |

### Optional Override (Any Environment)
| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `lm-studio` | Provider type: `lm-studio` or `azure-openai` |
| `LLM_BASE_URL` | `http://localhost:1234/v1/chat/completions` | LLM endpoint URL |
| `LLM_API_KEY` | `not-needed` | API key for authentication |
| `LLM_MODEL` | `google/gemma-2-9b` | Default model name |
| `LLM_DEPLOYMENT` | (empty) | Azure deployment name |

---

## Testing Workflow

### 1. Develop Locally with LM Studio
```bash
# Terminal 1: Start LM Studio
# Load google/gemma-2-9b model

# Terminal 2: Run va-service
cd services-java/va-service
./mvnw spring-boot:run -Dspring.profiles.active=dev

# Test agent
curl -X POST http://localhost:8136/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "message": "Hello, how are you?",
    "context": {}
  }'
```

### 2. Test Azure OpenAI Locally
```bash
# Set Azure credentials
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
export AZURE_OPENAI_KEY="your-actual-key"
export AZURE_OPENAI_DEPLOYMENT="gpt-4"

# Run with prod profile
./mvnw spring-boot:run -Dspring.profiles.active=prod

# Test same agent workflow
curl -X POST http://localhost:8136/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-azure",
    "message": "1. Hello\\n2. What can you help with?\\n3. Tell me about services",
    "context": {}
  }'
```

### 3. Compare Results
Check logs for differences:
- Response quality (GPT-4 vs gemma-2-9b)
- Multi-question handling
- Conversational tone
- Response time

---

## Azure OpenAI Setup

### Create Azure OpenAI Resource
```bash
# Azure CLI
az cognitiveservices account create \
  --name your-openai-resource \
  --resource-group your-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus

# Deploy a model
az cognitiveservices account deployment create \
  --name your-openai-resource \
  --resource-group your-rg \
  --deployment-name gpt-4 \
  --model-name gpt-4 \
  --model-version "0613" \
  --model-format OpenAI \
  --scale-settings-capacity 10
```

### Get Credentials
```bash
# Get endpoint
az cognitiveservices account show \
  --name your-openai-resource \
  --resource-group your-rg \
  --query properties.endpoint

# Get key
az cognitiveservices account keys list \
  --name your-openai-resource \
  --resource-group your-rg \
  --query key1
```

---

## Deployment to Azure

### Azure App Service Configuration

1. **Application Settings** (Environment Variables):
```
SPRING_PROFILES_ACTIVE=prod
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=<from Key Vault>
AZURE_OPENAI_DEPLOYMENT=gpt-4
```

2. **Deploy JAR**:
```bash
cd services-java/va-service
./mvnw clean package -DskipTests
az webapp deploy --resource-group your-rg \
  --name your-app-service \
  --src-path target/va-service-0.0.1-SNAPSHOT.jar \
  --type jar
```

3. **Verify**:
```bash
curl https://your-app.azurewebsites.net/health
curl -X POST https://your-app.azurewebsites.net/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"prod-test","message":"Hello","context":{}}'
```

---

## Cost Optimization

### Development
- **Use LM Studio**: $0/month (free local inference)
- **Fast iteration**: No API call costs

### Production
- **GPT-3.5-turbo**: ~$0.002/1K tokens (~$150/month for 100K messages)
- **GPT-4**: ~$0.045/1K tokens (~$4,500/month for 100K messages)
- **Recommendation**: Start with GPT-3.5-turbo, upgrade to GPT-4 if needed

---

## Troubleshooting

### "Connection refused" in dev mode
- Check LM Studio is running on localhost:1234
- Verify model is loaded in LM Studio

### "401 Unauthorized" in prod mode
- Verify `AZURE_OPENAI_KEY` is set correctly
- Check API key hasn't expired

### "404 Not Found" in prod mode
- Verify `AZURE_OPENAI_DEPLOYMENT` matches actual deployment name
- Check endpoint URL format

### "Model not found" error
- For LM Studio: Ensure model name matches loaded model
- For Azure: Verify deployment name in Azure Portal

### Logs show wrong provider
- Check `SPRING_PROFILES_ACTIVE` environment variable
- Verify correct application-{profile}.properties is loaded

---

## Debug Logging

Enable detailed logging to troubleshoot:

```properties
# application-dev.properties
logging.level.com.ai.va.client.LlmClient=DEBUG
```

Logs will show:
- Provider type (lm-studio or azure-openai)
- Full request URL
- Authentication method
- Request/response bodies
- CURL command for manual testing

---

## Migration Checklist

- [ ] Create Azure OpenAI resource
- [ ] Deploy GPT-4 or GPT-3.5-turbo model
- [ ] Get endpoint URL and API key
- [ ] Test locally with Azure credentials
- [ ] Compare agent workflow results
- [ ] Set environment variables in Azure App Service
- [ ] Deploy to Azure
- [ ] Verify production endpoint
- [ ] Monitor costs in Azure Portal

---

## Support

For issues:
1. Check logs for `[LLMClient]` entries
2. Use CURL command from logs to test directly
3. Verify environment variables are set
4. Confirm network connectivity to Azure endpoint
