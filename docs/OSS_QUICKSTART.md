# FogUI OSS Quickstart

FogUI v1 is designed to run fully self-hosted with BYOK.

## Build all Java modules

From repository root:

```bash
./backend-java/mvnw -f pom.xml -q -DskipTests package
```

This builds:

- `fogui-java-core`
- `fogui-spring-starter`
- `backend-java` (reference server)

## Run reference server

```bash
cd backend-java
./mvnw spring-boot:run
```

## Configure BYOK

Set your provider credentials in environment:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL` (optional; defaults to OpenAI API)
- `OPENAI_MODEL` (optional)

## Use transform endpoint

```bash
curl -X POST http://localhost:5001/fogui/transform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fog_live_xxx" \
  -d '{"content":"Summarize pipeline health"}'
```
