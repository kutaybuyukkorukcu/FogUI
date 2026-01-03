package com.genui.security;

import com.genui.repository.UserRepository;
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
import java.util.UUID;

/**
 * Filter that authenticates requests using JWT tokens.
 * Used for dashboard/API key management endpoints.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // Skip if already authenticated (e.g., by API key filter)
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            String token = authHeader.substring(BEARER_PREFIX.length()).trim();

            // Skip if it's an API key (handled by ApiKeyAuthenticationFilter)
            if (token.startsWith("fog_")) {
                filterChain.doFilter(request, response);
                return;
            }

            UUID userId = jwtService.validateTokenAndGetUserId(token);

            if (userId != null) {
                userRepository.findById(userId).ifPresent(user -> {
                    if (user.getActive()) {
                        ApiKeyUserDetails userDetails = new ApiKeyUserDetails(user);
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        log.debug("JWT authenticated for user: {}", user.getEmail());
                    }
                });
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/auth/")
                || path.equals("/health")
                || path.startsWith("/actuator/")
                || path.startsWith("/fogui/"); // API key auth handles these
    }
}
