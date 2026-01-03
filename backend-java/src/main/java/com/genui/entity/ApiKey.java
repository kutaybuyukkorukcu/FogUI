package com.genui.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * API Key entity for authenticating SDK requests.
 * 
 * Security note: Only the SHA-256 hash of the key is stored.
 * The raw key is returned ONCE on creation and never stored.
 */
@Entity
@Table(name = "api_keys")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * First 12 characters of the key for display purposes.
     * Example: "fog_live_a1b2"
     */
    @Column(name = "key_prefix", nullable = false)
    private String keyPrefix;

    /**
     * SHA-256 hash of the full API key.
     * Used for authentication lookups.
     */
    @Column(name = "key_hash", nullable = false, unique = true)
    private String keyHash;

    /**
     * User-provided name/label for the key.
     */
    private String name;

    /**
     * If true, this is a test mode key (fog_test_).
     * Test mode keys can be used in sandbox environments.
     */
    @Column(name = "test_mode", nullable = false)
    @Builder.Default
    private Boolean testMode = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "last_used_at")
    private OffsetDateTime lastUsedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    /**
     * Update the last used timestamp.
     */
    public void touch() {
        this.lastUsedAt = OffsetDateTime.now();
    }

    /**
     * Revoke this API key.
     */
    public void revoke() {
        this.active = false;
    }
}
