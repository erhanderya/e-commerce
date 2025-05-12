package com.webapp.back_end.controller;

import com.webapp.back_end.model.User;
import com.webapp.back_end.model.Role;
import com.webapp.back_end.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:4200")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    /**
     * Simple endpoint to check if a user has admin access
     */
    @GetMapping("/check")
    public ResponseEntity<?> checkAdminAccess(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

            // Check if user has admin role
            boolean isAdmin = user.getRole() == Role.ADMIN;
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", isAdmin);
            response.put("role", user.getRole().toString());
            
            if (!isAdmin) {
                return ResponseEntity.status(403).body(response);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
} 