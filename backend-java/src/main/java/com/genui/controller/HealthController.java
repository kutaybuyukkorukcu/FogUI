package com.genui.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Health check and API info endpoints
 */
@RestController
@Tag(name = "Health", description = "Health and service metadata endpoints")
public class HealthController {

        /**
         * Health check endpoint
         */
        @GetMapping("/health")
        @Operation(summary = "Health check", description = "Returns service health and basic runtime metadata")
        public ResponseEntity<Map<String, Object>> health() {
                return ResponseEntity.ok(Map.of(
                                "status", "healthy",
                                "version", "1.0.0",
                                "timestamp", System.currentTimeMillis() // Added to trigger deployment
                ));
        }

        /**
         * API info endpoint
         */
        @GetMapping("/")
        @Operation(summary = "API info", description = "Returns API metadata and endpoint overview")
        public ResponseEntity<Map<String, Object>> info() {
                return ResponseEntity.ok(Map.of(
                                "name", "GenUI API",
                                "version", "1.0.0",
                                "description", "OpenAI-compatible API with Generative UI capabilities",
                                "endpoints", Map.of(
                                                "chatCompletions", "POST /v1/chat/completions",
                                                "health", "GET /health"),
                                "headers", Map.of(
                                                "required", new String[] { "X-LLM-API-Key: Your OpenAI/Azure API key" },
                                                "optional", new String[] {
                                                                "X-LLM-Provider: openai | azure",
                                                                "X-Azure-Endpoint: Azure OpenAI endpoint URL",
                                                                "X-Azure-Deployment: Azure deployment name"
                                                })));
        }
}
