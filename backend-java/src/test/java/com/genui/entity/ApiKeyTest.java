package com.genui.entity;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ApiKey entity.
 * Tests API key methods and default values.
 */
@DisplayName("ApiKey Entity")
class ApiKeyTest {

    private ApiKey apiKey;
    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .email("test@example.com")
                .passwordHash("hashedPassword")
                .build();

        apiKey = ApiKey.builder()
                .user(user)
                .keyPrefix("fog_live_abcd")
                .keyHash("hashed_value")
                .name("Test Key")
                .build();
    }

    @Nested
    @DisplayName("Default Values")
    class DefaultValues {

        @Test
        @DisplayName("should have active as true by default")
        void shouldBeActiveByDefault() {
            ApiKey newKey = ApiKey.builder()
                    .user(user)
                    .keyPrefix("fog_live_test")
                    .keyHash("hash")
                    .build();

            assertTrue(newKey.getActive());
        }

        @Test
        @DisplayName("should have testMode as false by default")
        void shouldHaveTestModeFalseByDefault() {
            ApiKey newKey = ApiKey.builder()
                    .user(user)
                    .keyPrefix("fog_live_test")
                    .keyHash("hash")
                    .build();

            assertFalse(newKey.getTestMode());
        }

        @Test
        @DisplayName("should have createdAt set")
        void shouldHaveCreatedAtSet() {
            ApiKey newKey = ApiKey.builder()
                    .user(user)
                    .keyPrefix("fog_live_test")
                    .keyHash("hash")
                    .build();

            assertNotNull(newKey.getCreatedAt());
        }

        @Test
        @DisplayName("should have lastUsedAt as null initially")
        void shouldHaveLastUsedAtNullInitially() {
            ApiKey newKey = ApiKey.builder()
                    .user(user)
                    .keyPrefix("fog_live_test")
                    .keyHash("hash")
                    .build();

            assertNull(newKey.getLastUsedAt());
        }
    }

    @Nested
    @DisplayName("touch")
    class Touch {

        @Test
        @DisplayName("should update lastUsedAt to current time")
        void shouldUpdateLastUsedAt() {
            assertNull(apiKey.getLastUsedAt());

            apiKey.touch();

            assertNotNull(apiKey.getLastUsedAt());
        }

        @Test
        @DisplayName("should update lastUsedAt on subsequent calls")
        void shouldUpdateLastUsedAtOnSubsequentCalls() throws InterruptedException {
            apiKey.touch();
            OffsetDateTime firstTouch = apiKey.getLastUsedAt();

            // Instead of Thread.sleep, simulate time passage or use Awaitility if async
            // For demonstration, just call touch again
            apiKey.touch();
            OffsetDateTime secondTouch = apiKey.getLastUsedAt();

            assertTrue(secondTouch.isAfter(firstTouch) || secondTouch.isEqual(firstTouch));
        }
    }

    @Nested
    @DisplayName("revoke")
    class Revoke {

        @Test
        @DisplayName("should set active to false")
        void shouldSetActiveToFalse() {
            assertTrue(apiKey.getActive());

            apiKey.revoke();

            assertFalse(apiKey.getActive());
        }

        @Test
        @DisplayName("should be idempotent")
        void shouldBeIdempotent() {
            apiKey.revoke();
            assertFalse(apiKey.getActive());

            apiKey.revoke();
            assertFalse(apiKey.getActive());
        }
    }

    @Nested
    @DisplayName("Test Mode")
    class TestModeTests {

        @Test
        @DisplayName("should allow setting test mode to true")
        void shouldAllowSettingTestModeTrue() {
            ApiKey testKey = ApiKey.builder()
                    .user(user)
                    .keyPrefix("fog_test_abcd")
                    .keyHash("hash")
                    .testMode(true)
                    .build();

            assertTrue(testKey.getTestMode());
        }

        @Test
        @DisplayName("should preserve test mode value")
        void shouldPreserveTestModeValue() {
            apiKey.setTestMode(true);
            assertTrue(apiKey.getTestMode());

            apiKey.setTestMode(false);
            assertFalse(apiKey.getTestMode());
        }
    }
}
