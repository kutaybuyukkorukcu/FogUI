# Spring AI Provider Options Matrix
This ADR documents how FogUI's deterministic policy maps onto different Spring AI chat providers.

## Why This Exists

FogUI is published as an OSS package, so the deterministic layer cannot assume an OpenAI-only stack.

The runtime goal is:

1. Preserve one provider-neutral deterministic policy surface for consumers.
2. Translate that policy into the richest safe provider-specific option set available.
3. Degrade gracefully when a provider does not support a specific control.

## Resolution Strategy

When the deterministic advisor runs, the starter resolves provider intent in this order:

1. Inspect the incoming `ChatOptions` implementation.
2. If the prompt has no options, inspect configured Spring AI provider model properties.
3. If no known provider is detected, fall back to generic `ChatOptions`.

This makes null-option prompts work without forcing every prompt provider to construct provider-specific option objects manually.

FogUI's out-of-the-box provider target set is intentionally narrow:

1. OpenAI
2. Azure OpenAI
3. Anthropic
4. Vertex AI Gemini

Other providers are not treated as first-class integrations yet. They only receive the generic fallback path unless FogUI adds a dedicated customizer later.

## Shared FogUI Policy Surface

FogUI still exposes one configuration surface:

- `fogui.deterministic.temperature`
- `fogui.deterministic.top-p`
- `fogui.deterministic.seed`
- `fogui.deterministic.response-format`
- `fogui.deterministic.max-tokens`
- `fogui.deterministic.max-completion-tokens`

Capability flags remain the control point for disabling unsupported or undesired options without changing application code.

## Provider Mapping

### OpenAI

- Uses `OpenAiChatOptions`.
- Applies: `model`, `temperature`, `topP`, `seed`, `responseFormat`, `maxTokens`, `maxCompletionTokens`.
- `response-format=json-object` maps to `ResponseFormat.Type.JSON_OBJECT`.
- Why this is the richest mapping: OpenAI exposes seeded generation and explicit structured-output mode on the chat options surface.

### Azure OpenAI

- Uses `AzureOpenAiChatOptions`.
- Applies: `deploymentName`, `temperature`, `topP`, `seed`, `responseFormat`, `maxTokens`, `maxCompletionTokens`.
- `response-format=json-object` maps to `AzureOpenAiResponseFormat.Type.JSON_OBJECT`.
- Why deployment is used instead of plain model: Azure routes chat requests through deployment names rather than the public OpenAI model identifier.

### Anthropic

- Uses `AnthropicChatOptions`.
- Applies: `model`, `temperature`, `topP`, `maxTokens`.
- Skips: `seed`, `responseFormat`, `maxCompletionTokens`.
- Why: the Spring AI Anthropic options surface does not currently expose deterministic seed or JSON-object response controls.

### Vertex AI Gemini

- Uses `VertexAiGeminiChatOptions`.
- Applies: `model`, `temperature`, `topP`, output token limit, and JSON MIME type.
- `response-format=json-object` maps to `responseMimeType=application/json`.
- `max-completion-tokens` becomes the effective output-token cap. If it is absent, FogUI falls back to `max-tokens`.
- Why: Gemini exposes output-token and MIME-type controls rather than the OpenAI-style response-format object.

### Other Providers

- Falls back to generic `ChatOptions`.
- Applies only common fields that exist across the base Spring AI surface: `model`, `temperature`, `topP`, `maxTokens`.
- Why: this keeps FogUI from failing closed for non-target providers, but it should be treated as compatibility fallback rather than first-class support.

## Design Decision

FogUI now treats provider-specific option mapping as a starter concern, not an application concern.

That means:

1. `packages/fogui-java-core` stays provider-agnostic.
2. `packages/fogui-spring-web-starter` stays runtime-generic.
3. `packages/fogui-spring-boot-starter` owns provider detection and option translation.
4. The reference backend app may still be OpenAI-oriented without making the OSS starter OpenAI-only.

## What We Still Intentionally Do Not Promise

FogUI does not promise identical determinism guarantees across every provider.

Examples:

- Seeded determinism is still provider-dependent and best-effort.
- JSON-structured output controls vary across providers.
- Token-limit semantics differ between model families.

The contract FogUI does promise is that unsupported controls are skipped deliberately instead of failing unpredictably or forcing users into OpenAI-only APIs.