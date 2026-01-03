package com.genui.repository;

import com.genui.entity.ApiKey;
import com.genui.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    /**
     * Find an active API key by its hash.
     * Used during authentication.
     */
    @Query("SELECT k FROM ApiKey k JOIN FETCH k.user WHERE k.keyHash = :keyHash AND k.active = true")
    Optional<ApiKey> findActiveByKeyHash(String keyHash);

    /**
     * Get all API keys for a user.
     */
    List<ApiKey> findByUserOrderByCreatedAtDesc(User user);

    /**
     * Get all active API keys for a user.
     */
    List<ApiKey> findByUserAndActiveOrderByCreatedAtDesc(User user, boolean active);
}
