# Azure Deployment Guide for Spring AI Agent

> **Prerequisites:** Complete local development setup first with LM Studio
> 
> **See also:**
> - [Quick Start Guide](../services-java/va-service/QUICKSTART.md) - Local setup with LM Studio
> - [Provider-Agnostic Design](PROVIDER_AGNOSTIC_DESIGN.md) - Why this architecture works perfectly
> - [Spring AI Agent Implementation](SPRING_AI_AGENT_IMPLEMENTATION.md) - Complete implementation overview

## Overview

This guide covers deploying the Spring AI Agent to Azure using Azure OpenAI Service instead of OpenAI's API.

## Architecture

### Development (Local)
```
va-service → LM Studio (localhost:1234) → Local LLM
```

### Production (Azure)
```
va-service (Azure App Service) → Azure OpenAI Service → GPT-4
```

## Prerequisites

1. Azure subscription
2. Azure OpenAI Service access (requires approval)
3. Azure App Service or Azure Container Apps

## Step 1: Create Azure OpenAI Resource

### Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new resource → **Azure OpenAI**
3. Configure:
   - Resource Group: `ai-services-rg`
   - Region: `East US` (or your preferred region)
   - Name: `ai-services-openai`
   - Pricing Tier: `Standard S0`
4. Wait for deployment

### Using Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create --name ai-services-rg --location eastus

# Create Azure OpenAI resource
az cognitiveservices account create \
  --name ai-services-openai \
  --resource-group ai-services-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus
```

## Step 2: Deploy GPT-4 Model

### Using Azure Portal

1. Go to your Azure OpenAI resource
2. Navigate to **Deployments** → **Create new deployment**
3. Configure:
   - Model: `gpt-4` or `gpt-4-turbo`
   - Deployment name: `gpt-4-deployment`
   - Model version: Latest
   - Capacity: Start with 10K TPM (tokens per minute)
4. Create deployment

### Using Azure CLI

```bash
az cognitiveservices account deployment create \
  --name ai-services-openai \
  --resource-group ai-services-rg \
  --deployment-name gpt-4-deployment \
  --model-name gpt-4 \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 10
```

## Step 3: Get Azure OpenAI Credentials

### Endpoint

```bash
# Get endpoint URL
az cognitiveservices account show \
  --name ai-services-openai \
  --resource-group ai-services-rg \
  --query properties.endpoint \
  --output tsv
```

Example output: `https://ai-services-openai.openai.azure.com/`

### API Key

```bash
# Get API key
az cognitiveservices account keys list \
  --name ai-services-openai \
  --resource-group ai-services-rg \
  --query key1 \
  --output tsv
```

## Step 4: Configure Environment Variables

### Local Testing with Azure OpenAI

```bash
# Windows PowerShell
$env:AZURE_OPENAI_ENDPOINT="https://ai-services-openai.openai.azure.com/"
$env:AZURE_OPENAI_KEY="your-azure-openai-key-here"
$env:AZURE_OPENAI_DEPLOYMENT="gpt-4-deployment"

# Linux/Mac
export AZURE_OPENAI_ENDPOINT="https://ai-services-openai.openai.azure.com/"
export AZURE_OPENAI_KEY="your-azure-openai-key-here"
export AZURE_OPENAI_DEPLOYMENT="gpt-4-deployment"
```

### Run with Production Profile

```bash
cd services-java/va-service

# Test locally with Azure OpenAI
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

## Step 5: Deploy to Azure App Service

### Create App Service

```bash
# Create App Service Plan
az appservice plan create \
  --name ai-services-plan \
  --resource-group ai-services-rg \
  --sku B2 \
  --is-linux

# Create Web App (Java 17)
az webapp create \
  --name ai-services-va \
  --resource-group ai-services-rg \
  --plan ai-services-plan \
  --runtime "JAVA:17-java17"
```

### Configure Environment Variables in App Service

```bash
az webapp config appsettings set \
  --name ai-services-va \
  --resource-group ai-services-rg \
  --settings \
    SPRING_PROFILES_ACTIVE=prod \
    AZURE_OPENAI_ENDPOINT="https://ai-services-openai.openai.azure.com/" \
    AZURE_OPENAI_KEY="your-key-here" \
    AZURE_OPENAI_DEPLOYMENT="gpt-4-deployment" \
    MONGODB_URI="your-mongodb-connection-string" \
    MONGODB_DATABASE="ai_platform"
```

### Deploy Application

```bash
# Build the JAR
cd services-java/va-service
./mvnw clean package -DskipTests

# Deploy to Azure
az webapp deploy \
  --name ai-services-va \
  --resource-group ai-services-rg \
  --src-path target/va-service-0.0.1-SNAPSHOT.jar \
  --type jar
```

## Step 6: Deploy to Azure Container Apps (Alternative)

For better scaling and cost optimization:

### Build Docker Image

Create `Dockerfile` in `services-java/va-service/`:

```dockerfile
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY target/va-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8136
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Build and Push to Azure Container Registry

```bash
# Create Azure Container Registry
az acr create \
  --name aiservicesacr \
  --resource-group ai-services-rg \
  --sku Basic

# Build and push image
az acr build \
  --registry aiservicesacr \
  --image va-service:latest \
  --file Dockerfile .
```

### Deploy to Container Apps

```bash
# Create Container Apps environment
az containerapp env create \
  --name ai-services-env \
  --resource-group ai-services-rg \
  --location eastus

# Deploy container
az containerapp create \
  --name va-service \
  --resource-group ai-services-rg \
  --environment ai-services-env \
  --image aiservicesacr.azurecr.io/va-service:latest \
  --registry-server aiservicesacr.azurecr.io \
  --target-port 8136 \
  --ingress external \
  --env-vars \
    SPRING_PROFILES_ACTIVE=prod \
    AZURE_OPENAI_ENDPOINT="https://ai-services-openai.openai.azure.com/" \
    AZURE_OPENAI_KEY=secretref:azure-openai-key \
    AZURE_OPENAI_DEPLOYMENT="gpt-4-deployment"
```

## Step 7: Verify Deployment

### Test Health Endpoint

```bash
curl https://ai-services-va.azurewebsites.net/agent/health
```

### Test Agent Execution

```bash
curl -X POST https://ai-services-va.azurewebsites.net/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "message": "Hello from Azure!",
    "context": {}
  }'
```

## Configuration Summary

### Development (LM Studio)

```properties
# application-dev.properties
spring.ai.openai.base-url=http://localhost:1234/v1
spring.ai.openai.api-key=lm-studio
spring.ai.openai.chat.options.model=google/gemma-2-9b
```

**Run:** `./mvnw spring-boot:run` (uses dev profile by default)

### Production (Azure OpenAI)

```properties
# application-prod.properties
spring.ai.openai.base-url=${AZURE_OPENAI_ENDPOINT}
spring.ai.openai.api-key=${AZURE_OPENAI_KEY}
spring.ai.openai.chat.options.model=${AZURE_OPENAI_DEPLOYMENT}
```

**Run:** `./mvnw spring-boot:run -Dspring-boot.run.profiles=prod`

## Cost Optimization

### Azure OpenAI Pricing (as of 2026)

- **GPT-4 Turbo:** ~$0.01/1K input tokens, ~$0.03/1K output tokens
- **GPT-3.5 Turbo:** ~$0.001/1K input tokens, ~$0.002/1K output tokens

### Tips

1. **Start with GPT-3.5 Turbo** for testing
2. **Set max-tokens limit** (default 500 is good)
3. **Monitor usage** in Azure Portal
4. **Use caching** for repeated queries
5. **Implement rate limiting** on Node.js layer

## Monitoring

### Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app ai-services-insights \
  --location eastus \
  --resource-group ai-services-rg

# Get instrumentation key
az monitor app-insights component show \
  --app ai-services-insights \
  --resource-group ai-services-rg \
  --query instrumentationKey \
  --output tsv
```

### Configure in App Service

```bash
az webapp config appsettings set \
  --name ai-services-va \
  --resource-group ai-services-rg \
  --settings \
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=your-key-here"
```

## Security Best Practices

1. **Use Managed Identity** instead of API keys:
   ```bash
   az webapp identity assign \
     --name ai-services-va \
     --resource-group ai-services-rg
   ```

2. **Store secrets in Azure Key Vault**:
   ```bash
   az keyvault create \
     --name ai-services-kv \
     --resource-group ai-services-rg \
     --location eastus
   
   az keyvault secret set \
     --vault-name ai-services-kv \
     --name azure-openai-key \
     --value "your-key-here"
   ```

3. **Use Virtual Network** for internal services

4. **Enable HTTPS only**

## Troubleshooting

### Issue: "401 Unauthorized" from Azure OpenAI

**Solution:**
- Verify API key is correct
- Check endpoint URL format: `https://RESOURCE-NAME.openai.azure.com/`
- Ensure deployment name matches

### Issue: "429 Rate Limit Exceeded"

**Solution:**
- Increase TPM capacity in Azure Portal
- Implement exponential backoff in code
- Add rate limiting on Node.js API

### Issue: "Model not found"

**Solution:**
- Verify deployment name matches `AZURE_OPENAI_DEPLOYMENT`
- Check deployment status in Azure Portal
- Ensure model is fully deployed (not deploying)

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions or Azure DevOps)
2. Configure auto-scaling rules
3. Add health checks and monitoring
4. Implement disaster recovery plan
5. Set up staging environment

## Resources

- [Azure OpenAI Service Documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [Spring AI Azure OpenAI](https://docs.spring.io/spring-ai/reference/api/clients/azure-openai-chat.html)
- [Azure App Service Java](https://learn.microsoft.com/azure/app-service/quickstart-java)
- [Azure Container Apps](https://learn.microsoft.com/azure/container-apps/)
- [Provider-Agnostic Design](PROVIDER_AGNOSTIC_DESIGN.md) - Architecture rationale
- [Spring AI Agent Implementation](SPRING_AI_AGENT_IMPLEMENTATION.md) - Implementation details
- [Quick Start Guide](../services-java/va-service/QUICKSTART.md) - Local development setup
