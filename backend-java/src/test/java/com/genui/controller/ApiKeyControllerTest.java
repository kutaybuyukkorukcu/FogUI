package com.genui.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genui.dto.CreateApiKeyRequest;
import com.genui.entity.ApiKey;
import com.genui.entity.User;
import com.genui.entity.UserRole;
import com.genui.repository.ApiKeyRepository;
import com.genui.repository.UserRepository;
import com.genui.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for ApiKeyController.
 * Tests API key creation, listing, revocation, and rotation.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("ApiKeyController")
class ApiKeyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ApiKeyRepository apiKeyRepository;

    @Autowired
    private JwtService jwtService;

    private User testUser;
    private String jwtToken;

    @BeforeEach
    void setUp() {
        apiKeyRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user
        testUser = User.builder()
                .email("apitest@example.com")
                .passwordHash("hashed")
                .role(UserRole.FREE)
                .monthlyQuota(100)
                .build();
        testUser = userRepository.save(testUser);

        // Generate JWT for authentication
        jwtToken = jwtService.generateToken(testUser);
    }

    @Nested
    @DisplayName("POST /api/keys")
    class CreateKey {

        @Test
        @DisplayName("should create live API key")
        void shouldCreateLiveApiKey() throws Exception {
            CreateApiKeyRequest request = new CreateApiKeyRequest();
            request.setName("My Production Key");
            request.setTestMode(false);

            mockMvc.perform(post("/api/keys")
                    .header("Authorization", "Bearer " + jwtToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.keyPrefix").exists())
                    .andExpect(jsonPath("$.fullKey").exists())
                    .andExpect(jsonPath("$.name").value("My Production Key"))
                    .andExpect(jsonPath("$.testMode").value(false));
        }

        @Test
        @DisplayName("should create test mode API key")
        void shouldCreateTestModeApiKey() throws Exception {
            CreateApiKeyRequest request = new CreateApiKeyRequest();
            request.setName("My Test Key");
            request.setTestMode(true);

            mockMvc.perform(post("/api/keys")
                    .header("Authorization", "Bearer " + jwtToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.testMode").value(true));
        }

        @Test
        @DisplayName("should create key with default values when no body")
        void shouldCreateKeyWithDefaultValues() throws Exception {
            mockMvc.perform(post("/api/keys")
                    .header("Authorization", "Bearer " + jwtToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.testMode").value(false));
        }

        @Test
        @DisplayName("should return 401 without authentication")
        void shouldReturn401WithoutAuth() throws Exception {
            mockMvc.perform(post("/api/keys")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("GET /api/keys")
    class ListKeys {

        @Test
        @DisplayName("should list user's API keys")
        void shouldListUsersApiKeys() throws Exception {
            // Create some API keys first
            createApiKeyForUser(testUser, "Key 1");
            createApiKeyForUser(testUser, "Key 2");

            mockMvc.perform(get("/api/keys")
                    .header("Authorization", "Bearer " + jwtToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2));
        }

        @Test
        @DisplayName("should return empty list when no keys")
        void shouldReturnEmptyListWhenNoKeys() throws Exception {
            mockMvc.perform(get("/api/keys")
                    .header("Authorization", "Bearer " + jwtToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("should not show keys from other users")
        void shouldNotShowKeysFromOtherUsers() throws Exception {
            // Create another user with keys
            User otherUser = User.builder()
                    .email("other@example.com")
                    .passwordHash("hashed")
                    .role(UserRole.FREE)
                    .monthlyQuota(100)
                    .build();
            otherUser = userRepository.save(otherUser);
            createApiKeyForUser(otherUser, "Other User Key");

            // Our user should see 0 keys
            mockMvc.perform(get("/api/keys")
                    .header("Authorization", "Bearer " + jwtToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }
    }

    @Nested
    @DisplayName("DELETE /api/keys/{id}")
    class RevokeKey {

        @Test
        @DisplayName("should revoke API key")
        void shouldRevokeApiKey() throws Exception {
            ApiKey key = createApiKeyForUser(testUser, "To Revoke");

            mockMvc.perform(delete("/api/keys/" + key.getId())
                    .header("Authorization", "Bearer " + jwtToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("API key revoked"));
        }

        @Test
        @DisplayName("should return 404 for non-existent key")
        void shouldReturn404ForNonExistentKey() throws Exception {
            mockMvc.perform(delete("/api/keys/00000000-0000-0000-0000-000000000000")
                    .header("Authorization", "Bearer " + jwtToken))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("should not allow revoking other user's key")
        void shouldNotAllowRevokingOtherUsersKey() throws Exception {
            // Create another user with a key
            User otherUser = User.builder()
                    .email("other2@example.com")
                    .passwordHash("hashed")
                    .role(UserRole.FREE)
                    .monthlyQuota(100)
                    .build();
            otherUser = userRepository.save(otherUser);
            ApiKey otherKey = createApiKeyForUser(otherUser, "Other Key");

            // Try to revoke with our JWT
            mockMvc.perform(delete("/api/keys/" + otherKey.getId())
                    .header("Authorization", "Bearer " + jwtToken))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("POST /api/keys/{id}/rotate")
    class RotateKey {

        @Test
        @DisplayName("should rotate API key")
        void shouldRotateApiKey() throws Exception {
            ApiKey oldKey = createApiKeyForUser(testUser, "To Rotate");

            mockMvc.perform(post("/api/keys/" + oldKey.getId() + "/rotate")
                    .header("Authorization", "Bearer " + jwtToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.fullKey").exists())
                    .andExpect(jsonPath("$.name").value("To Rotate"));
        }

        @Test
        @DisplayName("should return 404 for non-existent key")
        void shouldReturn404ForNonExistentKeyRotation() throws Exception {
            mockMvc.perform(post("/api/keys/00000000-0000-0000-0000-000000000000/rotate")
                    .header("Authorization", "Bearer " + jwtToken))
                    .andExpect(status().isNotFound());
        }
    }

    // Helper method
    private ApiKey createApiKeyForUser(User user, String name) {
        ApiKey apiKey = ApiKey.builder()
                .user(user)
                .keyPrefix("fog_live_test")
                .keyHash("test_hash_" + System.nanoTime())
                .name(name)
                .testMode(false)
                .build();
        return apiKeyRepository.save(apiKey);
    }
}
