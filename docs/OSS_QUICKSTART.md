# FogUI OSS Quickstart

FogUI is designed to run self-hosted with BYOK and a reference server.

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

Set provider credentials in environment:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL` (optional; defaults to OpenAI API)
- `OPENAI_MODEL` (optional)

## Core OSS reference APIs

- `POST /fogui/transform`
- `POST /fogui/transform/stream`
- `POST /fogui/compat/a2ui/inbound`

## Reference-server optional APIs

`backend-java` also includes optional product-style reference endpoints for auth/API keys/usage/profile. They are useful for integration testing, but not part of FogUI core OSS contract.

## Use transform endpoint

```bash
curl -X POST http://localhost:5001/fogui/transform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fog_live_xxx" \
  -d '{"content":"Summarize pipeline health"}'
```

## Run minimal demo (optional)

```bash
cd packages/react && npm install && npm run build
cd ../examples/react-demo && npm install && npm run dev
```
