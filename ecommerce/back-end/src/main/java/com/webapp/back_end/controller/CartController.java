package com.webapp.back_end.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.webapp.back_end.model.Cart;
import com.webapp.back_end.model.User;
import com.webapp.back_end.repository.UserRepository;
import com.webapp.back_end.service.CartService;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;
    
    @Autowired
    private UserRepository userRepository;
    
    // Get current user's cart
    @GetMapping
    public ResponseEntity<?> getCart(Authentication authentication) {
        try {
            // Get email from authentication (assuming email is used as username in JWT)
            String email = authentication.getName();
            // Find user by email
            User user = userRepository.findByEmail(email) // Changed from findByUsername
                .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
                
            Cart cart = cartService.getOrCreateCart(user.getId());
            return ResponseEntity.ok(cart);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // Add item to cart
    @PostMapping("/items")
    public ResponseEntity<?> addItemToCart(
            @RequestBody Map<String, Object> payload,
            Authentication authentication) {
        
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email) // Changed from findByUsername
                .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
            
            Long productId = Long.parseLong(payload.get("productId").toString());
            Integer quantity = Integer.parseInt(payload.get("quantity").toString());
            
            Cart updatedCart = cartService.addItemToCart(user.getId(), productId, quantity);
            return ResponseEntity.ok(updatedCart);
        } catch (RuntimeException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // Update cart item quantity
    @PutMapping("/items/{productId}")
    public ResponseEntity<?> updateCartItemQuantity(
            @PathVariable Long productId,
            @RequestBody Map<String, Object> payload,
            Authentication authentication) {
        
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email) // Changed from findByUsername
                .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
                
            Integer quantity = Integer.parseInt(payload.get("quantity").toString());
            
            Cart updatedCart = cartService.updateCartItemQuantity(user.getId(), productId, quantity);
            return ResponseEntity.ok(updatedCart);
        } catch (RuntimeException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // Remove item from cart
    @DeleteMapping("/items/{productId}")
    public ResponseEntity<?> removeItemFromCart(
            @PathVariable Long productId,
            Authentication authentication) {
        
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email) // Changed from findByUsername
                .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
            
            Cart updatedCart = cartService.removeItemFromCart(user.getId(), productId);
            return ResponseEntity.ok(updatedCart);
        } catch (RuntimeException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // Clear cart
    @DeleteMapping
    public ResponseEntity<?> clearCart(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email) // Changed from findByUsername
                .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
            
            Cart emptyCart = cartService.clearCart(user.getId());
            return ResponseEntity.ok(emptyCart);
        } catch (RuntimeException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}