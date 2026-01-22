# FogUI Backend (Spring Boot)

Spring Boot + Spring AI backend for the FogUI platform.

## Prerequisites

- Java 21+
- Maven 3.9+ (or use Docker)

## Quick Start

### Option 1: Using Docker

```bash
# Build the image
docker build -t genui-backend .

# Run with environment variables
docker run -p 5001:5001 \
  -e OPENAI_API_KEY=your-key-here \
  genui-backend
```

### Option 2: Using Maven

```bash
# Install dependencies and run
./mvnw spring-boot:run

# Or with environment variables
OPENAI_API_KEY=your-key ./mvnw spring-boot:run
```

## Configuration

Set these environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | For OpenAI |
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI API key | For Azure |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | For Azure |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Azure deployment name | For Azure |
| `GOOGLE_AI_API_KEY` | Your Google AI Studio API key | For Gemini |
| `GOOGLE_AI_MODEL` | Gemini model name (default: `gemini-1.5-flash`) | No |
| `GENUI_PROVIDER` | Default provider: `openai`, `azureopenai`, or `gemini` | No |

## API Usage

### Chat Completions (OpenAI-compatible)

```bash
curl -X POST http://localhost:5001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-LLM-API-Key: your-openai-key" \
  -d '{
    "model": "gpt-4o-mini",
    "stream": true,
    "messages": [
      {"role": "user", "content": "What is the weather in Tokyo?"}
    ]
  }'
```

### Headers

| Header | Description |
|--------|-------------|
| `X-LLM-API-Key` | Your LLM provider API key (BYOK) |
| `X-LLM-Provider` | Provider: `openai`, `azure` |
| `X-Azure-Endpoint` | Azure OpenAI endpoint (if using Azure) |
| `X-Azure-Deployment` | Azure deployment name (if using Azure) |

### Response Format

The response includes a `genui` field with structured UI components:

```json
{
  "id": "chatcmpl-xxx",
  "model": "gpt-4o-mini",
  "choices": [...],
  "genui": {
    "thinking": [
      {"message": "Analyzing query...", "status": "complete"}
    ],
    "content": [
      {"type": "text", "value": "Here's the weather:"},
      {
        "type": "component",
        "componentType": "card",
        "props": {
          "title": "Tokyo Weather",
          "data": {"temperature": "18°C", "condition": "Sunny"}
        }
      }
    ]
  }
}
```

## SSE Events (Streaming)

When `stream: true`, you'll receive:

1. `data: {...}` - Standard OpenAI chunks
2. `event: genui` - Parsed UI structure
3. `event: usage` - Token usage and cost
4. `data: [DONE]` - End marker

## Health Check

```bash
curl http://localhost:5001/health
# {"status":"healthy","version":"1.0.0"}
```
