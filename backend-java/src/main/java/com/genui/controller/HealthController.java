package com.genui.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Health check and API info endpoints
 */
@RestController
public class HealthController {

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "healthy",
                "version", "1.0.0"
        ));
    }

    /**
     * API info endpoint
     */
    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> info() {
        return ResponseEntity.ok(Map.of(
                "name", "GenUI API",
                "version", "1.0.0",
                "description", "OpenAI-compatible API with Generative UI capabilities",
                "endpoints", Map.of(
                        "chatCompletions", "POST /v1/chat/completions",
                        "health", "GET /health"
                ),
                "headers", Map.of(
                        "required", new String[]{"X-LLM-API-Key: Your OpenAI/Azure API key"},
                        "optional", new String[]{
                                "X-LLM-Provider: openai | azure",
                                "X-Azure-Endpoint: Azure OpenAI endpoint URL",
                                "X-Azure-Deployment: Azure deployment name"
                        }
                )
        ));
    }
}
