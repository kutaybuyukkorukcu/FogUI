# FogUI Backend (Spring Boot)

Spring Boot + Spring AI backend for the FogUI platform.

## Prerequisites

- Java 21+
- Maven 3.9+ (or use Docker)

## Quick Start

### Option 1: Using Docker

```bash
# Build the image
docker build -t fogui-backend .

# Run with environment variables
docker run -p 5001:5001 \
  -e GROQ_API_KEY=your-groq-key-here \
  fogui-backend
```

### Option 2: Using Maven

```bash
# Install dependencies and run
./mvnw spring-boot:run

# Or with environment variables
GROQ_API_KEY=your-key ./mvnw spring-boot:run
```

## Configuration

The backend supports multiple LLM providers. Set `AI_PROVIDER` to choose between them:

### Provider Selection

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_PROVIDER` | Provider to use: `openai` or `gemini` | `openai` |

### OpenAI-Compatible Providers (Groq, OpenRouter, OpenAI)

When `AI_PROVIDER=openai` (default):

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` or `OPENAI_API_KEY` | API key | Required |
| `OPENAI_BASE_URL` | API base URL | `https://api.groq.com/openai` |
| `OPENAI_MODEL` | Model to use | `llama-3.3-70b-versatile` |

```bash
# Groq (default, 1000 req/day free)
AI_PROVIDER=openai
GROQ_API_KEY=your-groq-key

# OpenRouter
AI_PROVIDER=openai
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=your-openrouter-key
OPENAI_MODEL=meta-llama/llama-3.3-70b-instruct

# OpenAI
AI_PROVIDER=openai
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini
```

### Google Gemini

When `AI_PROVIDER=gemini`:

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_AI_API_KEY` | Google AI Studio API key | Required |
| `GOOGLE_AI_MODEL` | Model to use | `gemini-2.5-flash` |

```bash
# Gemini (20 req/day free)
AI_PROVIDER=gemini
GOOGLE_AI_API_KEY=your-google-ai-key
GOOGLE_AI_MODEL=gemini-2.5-flash
```

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
