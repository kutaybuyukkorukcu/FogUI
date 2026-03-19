# Structured Output Direction

## Context

We are running **Spring AI 1.1.0-M2** with `spring-ai-starter-model-openai` (the OpenAI-compatible adapter).
The active model is **`gpt-4.1-nano`**, pointing at the OpenAI API directly.

The goal is to move from the current "generate raw string → parse/sanitize afterward" pattern to
generation-level constraint so the model cannot produce structurally invalid output in the first place.

---

## Does `.entity()` automatically use `response_format`?

**No.** This is the critical thing to understand.

Spring AI's `.entity(Class)` uses `BeanOutputConverter` under the hood. What it does:

1. Generates a JSON Schema from the Java class using Jackson's schema generator.
2. **Appends that schema as a format instruction to the user message** (prompt injection).
3. After the LLM responds, parses the raw string output into the target class.

This is advisory enforcement — the model reads the instruction and is expected to follow it, but nothing
at the token-sampling level prevents it from producing invalid JSON. It is the exact same
"prompt-as-contract" pattern we already have, just automated.

---

## What we actually want: `response_format: json_schema`

OpenAI's **Structured Outputs** API (`response_format: { type: "json_schema", ... }` with `strict: true`)
enforces the schema at the token-sampling level. The model physically cannot emit a token that would
make the output deviate from the declared schema. This is generation-level constraint, not post-generation parsing.

**`gpt-4.1-nano` supports this fully.** The entire GPT-4.1 family was released with Structured Outputs
support (strict mode included).

---

## How to enable it in Spring AI 1.1.0-M2

Spring AI added `withStructuredOutputEnabled(true)` to `OpenAiChatOptions` starting in 1.0.0-M6.
When this flag is set alongside `.entity(Class)`, Spring AI switches from prompt injection to
passing the generated schema as `response_format: json_schema` with `strict: true`.

### Non-streaming call (target pattern)

```java
import org.springframework.ai.openai.OpenAiChatOptions;

var options = OpenAiChatOptions.builder()
    .withStructuredOutputEnabled(true)
    .build();

var uiResponse = chatClient.prompt(prompt)
    .options(options)
    .call()
    .entity(GenerativeUIResponse.class);
```

Spring AI's `OpenAiChatModel` detects the structured output flag, calls `BeanOutputConverter` to generate
the schema, and passes it as:

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "GenerativeUIResponse",
      "strict": true,
      "schema": { ... }
    }
  }
}
```

No `UIResponseParser`, no `tryFixIncompleteJson`, no sanitization needed for the non-streaming path.

---

## The Recursive Schema Problem

`ContentBlock.children: List<ContentBlock>` is a recursive type.

`BeanOutputConverter` uses Jackson's `JsonSchemaGenerator`, which handles recursive types via `$defs` and `$ref`.
OpenAI's Structured Outputs API supports `$ref` references within the same schema document.

**Constraint**: OpenAI requires `additionalProperties: false` at every nested level in strict mode. Jackson's
schema generator does not emit this by default. You may need to either:

- Post-process the generated schema to inject `"additionalProperties": false` at every object level, OR
- Inline the schema manually for `GenerativeUIResponse` and pass it via `OpenAiChatOptions.responseFormat()` directly.

**Depth limit**: OpenAI enforces a maximum nesting depth of 5 levels for Structured Outputs. Since
`ContentBlock.children` is recursive, a deeply nested UI response (e.g. Container inside Container inside Container...)
could exceed this. In practice, FogUI UI trees are shallow (1–2 levels of nesting) so this is unlikely to be
an issue in production, but worth knowing.

**Fallback if schema generation fails**: If `BeanOutputConverter` cannot produce a schema that OpenAI accepts
(e.g. due to the recursive type), the alternative is to use `response_format: json_object` (guarantees valid JSON
but not schema compliance) combined with a simplified, non-recursive response class for the initial LLM call,
with children resolved in a second pass.

---

## Streaming Constraint

`response_format: json_schema` is enforced at the **final token only**. The model streams chunks of partial
JSON during generation; the final assembled string is guaranteed to match the schema, but individual chunks
are not valid JSON.

This means:
- The **non-streaming path** benefits 100% — the returned object is always schema-valid.
- The **streaming path** still needs a thin partial-JSON buffer to emit incremental patches mid-stream. At
  `doOnComplete`, the final full string can be deserialized directly without `UIResponseParser`.

The streaming path keeps:
- `tryParsePartial(fullContent)` — for mid-stream patch emission only.
- Final result deserialization can be `objectMapper.readValue(finalContent, GenerativeUIResponse.class)` directly.

What disappears from streaming:
- `UIResponseParser.parse()` with `<genui>` tag extraction, JSON repair, and block sanitization.
- The system prompt's JSON format documentation (structure is guaranteed by schema).

---

## What gets deleted

| File / Method | Fate |
|---|---|
| `UIResponseParser.java` — `parse()` | Deleted (non-streaming + streaming final) |
| `UIResponseParser.java` — `sanitizeBlock()` | Deleted |
| `UIResponseParser.java` — `sanitizePropsToMap()` | Deleted |
| `UIResponseParser.java` — `extractChildrenFromProps()` | Deleted |
| `UIResponseParser.java` — `tryFixIncompleteJson()` | Deleted |
| `UIResponseParser.java` — `tryParsePartial()` | **Kept** (streaming mid-stream only) |
| `UIResponseParserTest.java` | Mostly deleted; keep streaming partial tests |
| `TransformPrompts.TRANSFORM_SYSTEM_PROMPT` | Remove JSON format documentation; keep semantic guidance only |
| `schema.zod.ts` — `normalizeFogUIResponse()` | Simplify to thin type guard; remove all recovery/coercion logic |

What stays:
- `patches.ts` — `isValidPatch()`: external API boundary, not model output.
- `FogUIRenderer.tsx` — `safeMapProps()`: adapter author contract, not model output.

---

## Implementation Order

### Step 1 — Verify schema compatibility (before writing code)

Run a quick manual test: call OpenAI's API directly with the generated schema for `GenerativeUIResponse`
and `response_format: json_schema` with `strict: true`. Check whether OpenAI accepts the recursive
`ContentBlock.children` field. This is the one unknown that could block the approach.

```bash
# Get the schema Spring AI would generate by temporarily logging it:
# In ChatClientFactory.createClient(), add:
# new BeanOutputConverter<>(GenerativeUIResponse.class).getFormat() → logs the schema
```

### Step 2 — Non-streaming path migration

In `TransformController.transform()`:
- Replace `.call().content()` + `responseParser.parse(content)` with `.call().entity(GenerativeUIResponse.class)`.
- Add `OpenAiChatOptions.builder().withStructuredOutputEnabled(true)` to the call.
- Remove `UIResponseParser responseParser` dependency from the controller.
- Delete the JSON format section from `TRANSFORM_SYSTEM_PROMPT`.
- Delete `UIResponseParser.java` (or keep as a shell with only `tryParsePartial`).

### Step 3 — Streaming path migration

- Keep `tryParsePartial()` for mid-stream patch emission.
- Replace `responseParser.parse(content)` in `sendStreamResult()` with direct `objectMapper.readValue()`.
- Remove `<genui>` tag handling (structured output won't produce XML wrappers).

### Step 4 — Frontend cleanup

- Simplify `normalizeFogUIResponse()` in `schema.zod.ts` from a recovery layer to a thin Zod parse.
- Delete Level 2 normalization tests that were testing compensation for malformed model output.

---

## Environment Note

The current `application.yml` defaults to Groq (`base-url: https://api.groq.com/openai`). To point at
OpenAI directly for `gpt-4.1-nano`, set:

```
OPENAI_BASE_URL=https://api.openai.com
OPENAI_MODEL=gpt-4.1-nano
OPENAI_API_KEY=<openai-key>
```

Groq does not offer `gpt-4.1-nano`. If `OPENAI_BASE_URL` is not overridden, the default Groq URL is used,
which will reject the model name. Groq also does not support `response_format: json_schema` with `strict: true`
as of early 2026 — so Groq users would fall back to prompt injection (`.entity()` without structured output flag).
