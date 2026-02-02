package com.genui.dto;

import com.genui.entity.ApiKey;
import com.genui.entity.User;
import com.genui.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ApiKeyResponse DTO.
 * Tests factory methods and key masking.
 */
@DisplayName("ApiKeyResponse")
class ApiKeyResponseTest {

    private User user;
    private ApiKey apiKey;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .email("test@example.com")
                .passwordHash("hash")
                .role(UserRole.FREE)
                .build();
        user.setId(UUID.randomUUID());

        apiKey = ApiKey.builder()
                .user(user)
                .keyPrefix("fog_live_abcd")
                .keyHash("hashed_value")
                .name("Test API Key")
                .testMode(false)
                .active(true)
                .build();
        apiKey.setId(UUID.randomUUID());
        apiKey.setLastUsedAt(OffsetDateTime.now().minusDays(1));
    }

    @Nested
    @DisplayName("from(ApiKey)")
    class From {

        @Test
        @DisplayName("should mask key prefix with ****")
        void shouldMaskKeyPrefixWithStars() {
            ApiKeyResponse response = ApiKeyResponse.from(apiKey);

            assertEquals("fog_live_abcd****", response.getKeyPrefix());
        }

        @Test
        @DisplayName("should map all fields correctly")
        void shouldMapAllFieldsCorrectly() {
            ApiKeyResponse response = ApiKeyResponse.from(apiKey);

            assertEquals(apiKey.getId(), response.getId());
            assertEquals(apiKey.getName(), response.getName());
            assertEquals(apiKey.getTestMode(), response.isTestMode());
            assertEquals(apiKey.getActive(), response.isActive());
            assertEquals(apiKey.getLastUsedAt(), response.getLastUsedAt());
            assertEquals(apiKey.getCreatedAt(), response.getCreatedAt());
        }

        @Test
        @DisplayName("should not include fullKey")
        void shouldNotIncludeFullKey() {
            ApiKeyResponse response = ApiKeyResponse.from(apiKey);

            assertNull(response.getFullKey());
        }

        @Test
        @DisplayName("should handle null lastUsedAt")
        void shouldHandleNullLastUsedAt() {
            apiKey.setLastUsedAt(null);

            ApiKeyResponse response = ApiKeyResponse.from(apiKey);

            assertNull(response.getLastUsedAt());
        }
    }

    @Nested
    @DisplayName("fromWithFullKey(ApiKey, String)")
    class FromWithFullKey {

        @Test
        @DisplayName("should include full key when provided")
        void shouldIncludeFullKeyWhenProvided() {
            String fullKey = "fog_live_abcd1234567890abcdef1234567890abcdef";

            ApiKeyResponse response = ApiKeyResponse.fromWithFullKey(apiKey, fullKey);

            assertEquals(fullKey, response.getFullKey());
        }

        @Test
        @DisplayName("should mask key prefix with ****")
        void shouldMaskKeyPrefixWithStars() {
            String fullKey = "fog_live_abcd1234567890abcdef1234567890abcdef";

            ApiKeyResponse response = ApiKeyResponse.fromWithFullKey(apiKey, fullKey);

            assertEquals("fog_live_abcd****", response.getKeyPrefix());
        }

        @Test
        @DisplayName("should map all fields correctly")
        void shouldMapAllFieldsCorrectly() {
            String fullKey = "fog_live_abcd1234567890abcdef1234567890abcdef";

            ApiKeyResponse response = ApiKeyResponse.fromWithFullKey(apiKey, fullKey);

            assertEquals(apiKey.getId(), response.getId());
            assertEquals(apiKey.getName(), response.getName());
            assertEquals(apiKey.getTestMode(), response.isTestMode());
            assertEquals(apiKey.getActive(), response.isActive());
        }
    }

    @Nested
    @DisplayName("Test Mode Keys")
    class TestModeKeys {

        @Test
        @DisplayName("should correctly report test mode true")
        void shouldCorrectlyReportTestModeTrue() {
            apiKey.setTestMode(true);
            apiKey.setKeyPrefix("fog_test_abcd");

            ApiKeyResponse response = ApiKeyResponse.from(apiKey);

            assertTrue(response.isTestMode());
            assertEquals("fog_test_abcd****", response.getKeyPrefix());
        }

        @Test
        @DisplayName("should correctly report test mode false")
        void shouldCorrectlyReportTestModeFalse() {
            apiKey.setTestMode(false);

            ApiKeyResponse response = ApiKeyResponse.from(apiKey);

            assertFalse(response.isTestMode());
        }
    }
}
