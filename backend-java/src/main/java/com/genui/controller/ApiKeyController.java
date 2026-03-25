package com.genui.controller;

import com.genui.dto.ApiKeyResponse;
import com.genui.dto.CreateApiKeyRequest;
import com.genui.entity.ApiKey;
import com.genui.entity.User;
import com.genui.repository.ApiKeyRepository;
import com.genui.security.ApiKeyAuthenticationFilter;
import com.genui.security.ApiKeyUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * API Key management controller.
 * Requires JWT authentication for optional reference-server account management APIs.
 */
@Slf4j
@RestController
@RequestMapping("/api/keys")
@RequiredArgsConstructor
@Tag(
        name = "API Keys (Reference Optional)",
        description = "Optional reference-server endpoints to create, list, revoke, and rotate API keys")
public class ApiKeyController {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String LIVE_PREFIX = "fog_live_";
    private static final String TEST_PREFIX = "fog_test_";

    private final ApiKeyRepository apiKeyRepository;

    /**
     * List all API keys for the current user.
     */
    @GetMapping
    @Operation(summary = "List API keys", description = "Returns all API keys for the authenticated user")
    public ResponseEntity<List<ApiKeyResponse>> listKeys(
            @AuthenticationPrincipal ApiKeyUserDetails userDetails) {

        User user = userDetails.getUser();
        List<ApiKeyResponse> keys = apiKeyRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(ApiKeyResponse::from)
                .toList();

        return ResponseEntity.ok(keys);
    }

    /**
     * Create a new API key.
     * The full key is returned only ONCE on creation.
     */
    @PostMapping
    @Operation(summary = "Create API key", description = "Creates a new API key and returns full key once")
    public ResponseEntity<ApiKeyResponse> createKey(
            @AuthenticationPrincipal ApiKeyUserDetails userDetails,
            @RequestBody(required = false) CreateApiKeyRequest request) {

        User user = userDetails.getUser();

        if (request == null) {
            request = new CreateApiKeyRequest();
        }

        // Generate the raw API key
        String prefix = request.isTestMode() ? TEST_PREFIX : LIVE_PREFIX;
        String randomPart = generateSecureRandomHex(32);
        String fullKey = prefix + randomPart;

        // Hash for storage
        String keyHash = ApiKeyAuthenticationFilter.hashApiKey(fullKey);

        // Create and save
        ApiKey apiKey = ApiKey.builder()
                .user(user)
                .keyPrefix(prefix + randomPart.substring(0, 4)) // First 4 chars for display
                .keyHash(keyHash)
                .name(request.getName())
                .testMode(request.isTestMode())
                .build();

        apiKey = apiKeyRepository.save(apiKey);
        log.info("API key created for user: {} ({})", user.getEmail(), apiKey.getKeyPrefix());

        // Return with full key (one-time only!)
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiKeyResponse.fromWithFullKey(apiKey, fullKey));
    }

    /**
     * Revoke an API key.
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Revoke API key", description = "Revokes an existing API key by id")
    public ResponseEntity<Map<String, String>> revokeKey(
            @AuthenticationPrincipal ApiKeyUserDetails userDetails,
            @PathVariable UUID id) {

        User user = userDetails.getUser();

        return apiKeyRepository.findById(id)
                .filter(key -> key.getUser().getId().equals(user.getId()))
                .map(key -> {
                    key.revoke();
                    apiKeyRepository.save(key);
                    log.info("API key revoked: {} for user: {}", key.getKeyPrefix(), user.getEmail());
                    return ResponseEntity.ok(Map.of("message", "API key revoked"));
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "API key not found")));
    }

    /**
     * Rotate an API key (revoke old, create new).
     */
    @PostMapping("/{id}/rotate")
    @Operation(summary = "Rotate API key", description = "Revokes old key and creates a replacement key")
    public ResponseEntity<ApiKeyResponse> rotateKey(
            @AuthenticationPrincipal ApiKeyUserDetails userDetails,
            @PathVariable UUID id) {

        User user = userDetails.getUser();

        return apiKeyRepository.findById(id)
                .filter(key -> key.getUser().getId().equals(user.getId()))
                .map(oldKey -> {
                    // Revoke old key
                    oldKey.revoke();
                    apiKeyRepository.save(oldKey);

                    // Create new key with same settings
                    String prefix = Boolean.TRUE.equals(oldKey.getTestMode()) ? TEST_PREFIX : LIVE_PREFIX;
                    String randomPart = generateSecureRandomHex(32);
                    String fullKey = prefix + randomPart;
                    String keyHash = ApiKeyAuthenticationFilter.hashApiKey(fullKey);

                    ApiKey newKey = ApiKey.builder()
                            .user(user)
                            .keyPrefix(prefix + randomPart.substring(0, 4))
                            .keyHash(keyHash)
                            .name(oldKey.getName())
                            .testMode(oldKey.getTestMode())
                            .build();

                    newKey = apiKeyRepository.save(newKey);
                    log.info("API key rotated: {} -> {} for user: {}",
                            oldKey.getKeyPrefix(), newKey.getKeyPrefix(), user.getEmail());

                    return ResponseEntity.ok(ApiKeyResponse.fromWithFullKey(newKey, fullKey));
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /**
     * Generate secure random hex string.
     */
    private String generateSecureRandomHex(int length) {
        byte[] bytes = new byte[length / 2];
        SECURE_RANDOM.nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
