package com.genui.security;

import com.genui.entity.ApiKey;
import com.genui.entity.User;
import com.genui.repository.ApiKeyRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Filter that authenticates requests using API keys.
 * 
 * Expected header format: Authorization: Bearer fog_live_xxx or fog_test_xxx
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String API_KEY_PREFIX_LIVE = "fog_live_";
    private static final String API_KEY_PREFIX_TEST = "fog_test_";

    private final ApiKeyRepository apiKeyRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            String apiKey = authHeader.substring(BEARER_PREFIX.length()).trim();

            if (isValidKeyFormat(apiKey)) {
                try {
                    Optional<ApiKey> keyOptional = authenticateApiKey(apiKey);

                    if (keyOptional.isPresent()) {
                        ApiKey key = keyOptional.get();
                        User user = key.getUser();

                        // Check if user has quota
                        if (!user.hasQuota()) {
                            log.warn("Quota exceeded for user: {}", user.getEmail());
                            response.setStatus(HttpServletResponse.SC_PAYMENT_REQUIRED); // 429 would also work
                            response.setContentType("application/json");
                            response.getWriter().write(
                                    "{\"error\": \"Monthly quota exceeded. Upgrade to PRO for more transforms.\"}");
                            return;
                        }

                        // Update last used timestamp
                        key.touch();
                        apiKeyRepository.save(key);

                        // Set authentication context
                        ApiKeyUserDetails userDetails = new ApiKeyUserDetails(user);
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        log.debug("API key authenticated for user: {}", user.getEmail());
                    } else {
                        log.warn("Invalid or inactive API key attempted: {}...",
                                apiKey.substring(0, Math.min(12, apiKey.length())));
                    }
                } catch (Exception e) {
                    log.error("Error during API key authentication", e);
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Check if the API key has a valid format.
     */
    private boolean isValidKeyFormat(String apiKey) {
        return (apiKey.startsWith(API_KEY_PREFIX_LIVE) || apiKey.startsWith(API_KEY_PREFIX_TEST))
                && apiKey.length() >= 40; // prefix (9-10) + 32 hex chars
    }

    /**
     * Authenticate an API key by hashing and looking up in the database.
     */
    private Optional<ApiKey> authenticateApiKey(String rawApiKey) {
        String keyHash = hashApiKey(rawApiKey);
        return apiKeyRepository.findActiveByKeyHash(keyHash);
    }

    /**
     * Hash an API key using SHA-256.
     */
    public static String hashApiKey(String apiKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(apiKey.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip filter for public endpoints
        return path.startsWith("/api/auth/")
                || path.equals("/health")
                || path.startsWith("/actuator/");
    }
}
