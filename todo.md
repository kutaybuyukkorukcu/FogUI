# Backlog

## Integration Tests
- [ ] Add integration tests for SSE streaming endpoint (`POST /fogui/transform/stream`) using WebTestClient
  - Test SSE event streaming (chunk, result, usage, [DONE] events)
  - Test error event handling when LLM fails
  - Test empty/null content error events
  - Note: MockMvc doesn't properly support async SSE testing with Spring Security

## Notes
- jakarta.servlet vs org.springframework.test.web.servlet - investigate compatibility
