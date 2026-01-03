package com.genui.dto;

import com.genui.entity.ApiKey;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ApiKeyResponse {
    private UUID id;
    private String keyPrefix; // "fog_live_a1b2****" (masked)
    private String name;
    private boolean testMode;
    private boolean active;
    private OffsetDateTime lastUsedAt;
    private OffsetDateTime createdAt;

    // Only set when key is created (one-time display)
    private String fullKey;

    public static ApiKeyResponse from(ApiKey apiKey) {
        return ApiKeyResponse.builder()
                .id(apiKey.getId())
                .keyPrefix(apiKey.getKeyPrefix() + "****")
                .name(apiKey.getName())
                .testMode(apiKey.getTestMode())
                .active(apiKey.getActive())
                .lastUsedAt(apiKey.getLastUsedAt())
                .createdAt(apiKey.getCreatedAt())
                .build();
    }

    public static ApiKeyResponse fromWithFullKey(ApiKey apiKey, String fullKey) {
        return ApiKeyResponse.builder()
                .id(apiKey.getId())
                .keyPrefix(apiKey.getKeyPrefix() + "****")
                .name(apiKey.getName())
                .testMode(apiKey.getTestMode())
                .active(apiKey.getActive())
                .lastUsedAt(apiKey.getLastUsedAt())
                .createdAt(apiKey.getCreatedAt())
                .fullKey(fullKey)
                .build();
    }
}
