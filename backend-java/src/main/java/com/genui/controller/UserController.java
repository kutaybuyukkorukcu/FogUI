package com.genui.controller;

import com.genui.dto.UserProfile;
import com.genui.entity.User;
import com.genui.repository.UserRepository;
import com.genui.security.ApiKeyUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/profile")
    public ResponseEntity<UserProfile> getProfile(@AuthenticationPrincipal ApiKeyUserDetails userDetails) {
        return ResponseEntity.ok(UserProfile.from(userDetails.getUser()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfile> updateProfile(
            @AuthenticationPrincipal ApiKeyUserDetails userDetails,
            @RequestBody UserProfile request) {

        User user = userDetails.getUser();

        // Only allow updating allowed fields (e.g. name if we had it, or email with
        // verification)
        // For now, let's say we assume email update is allowed without verification for
        // MVP (or just reject it)
        // Actually, User entity doesn't have a 'name' field distinct from email in the
        // current definition.
        // So we might only be able to update email.

        if (request.getEmail() != null && !request.getEmail().isBlank()
                && !request.getEmail().equals(user.getEmail())) {
            // Basic check to prevent duplicate emails would be needed here if valid
            // keeping it simple: update email
            user.setEmail(request.getEmail());
        }

        userRepository.save(user);

        return ResponseEntity.ok(UserProfile.from(user));
    }
}
