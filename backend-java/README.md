# FogUI Reference Server (Spring Boot)

`backend-java` is the **reference implementation** for FogUI integration.

It demonstrates how to expose deterministic transform/stream/compatibility APIs and includes optional product-style endpoints for auth/API-key management.

## Tech Stack

- Java 21
- Spring Boot 3.4.x
- Spring AI (`spring-ai-starter-model-openai`)
- Spring Security + JWT
- PostgreSQL + Flyway

## Run Locally

```bash
./backend-java/mvnw -f pom.xml -q -DskipTests package
cd backend-java && ./mvnw spring-boot:run
```

Reference server URL: `http://localhost:5001`

## Core OSS Reference APIs

- `POST /fogui/transform`
- `POST /fogui/transform/stream` (SSE)
- `POST /fogui/compat/a2ui/inbound` (A2UI -> FogUI canonical translation)

These require `Authorization: Bearer <fog_live_... | fog_test_...>`.

## Reference-Server Optional APIs

These are useful for integration harness scenarios, but are not considered FogUI core OSS contract APIs:

- `GET /health`
- `GET /`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/keys`
- `POST /api/keys`
- `DELETE /api/keys/{id}`
- `POST /api/keys/{id}/rotate`
- `GET /api/usage/stats`
- `GET /api/user/profile`
- `PUT /api/user/profile`

## LLM Configuration

Configured via `spring.ai.openai.*` in `application.yml`.

Important env vars:

- `OPENAI_API_KEY` (or `GROQ_API_KEY` fallback)
- `OPENAI_BASE_URL` (default: `https://api.openai.com`)
- `OPENAI_MODEL` (default: `gpt-4.1-nano`)

## Database Configuration

- `DATABASE_URL`
- `DATABASE_USER`
- `DATABASE_PASSWORD`

Flyway migration: `src/main/resources/db/migration/V1__initial_schema.sql`

## Testing

```bash
cd backend-java
./mvnw -B test
```

## Notes

- Non-stream transform uses structured output mapping to `GenerativeUIResponse`.
- Stream path emits SSE events (`result`, `usage`, `error`, `done`).
- Stream partial snapshots are reconciled through `StreamPatchReconciler`.
- Core canonical + translation services are provided by `fogui-java-core` and wired through `fogui-spring-starter`.
