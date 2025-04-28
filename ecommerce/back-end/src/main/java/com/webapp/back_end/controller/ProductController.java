package com.webapp.back_end.controller;

import java.util.List;
import java.util.Map; // Import Map
import java.util.HashMap; // Import HashMap

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication; // Import Authentication
import org.springframework.web.bind.annotation.*;

import com.webapp.back_end.model.Product;
import com.webapp.back_end.model.User; // Import User
import com.webapp.back_end.repository.UserRepository; // Import UserRepository
import com.webapp.back_end.service.ProductService;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:4200")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private UserRepository userRepository; // Inject UserRepository

    @GetMapping
    public List<Product> getAllProducts() {
        return productService.getAllProducts();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        return productService.getProductById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<Product>> getProductsByCategory(@PathVariable Long categoryId) {
        List<Product> products = productService.getProductsByCategory(categoryId);
        return ResponseEntity.ok(products);
    }
    
    @GetMapping("/seller")
    public ResponseEntity<?> getSellerProducts(Authentication authentication) {
        try {
            User seller = getUserFromAuthentication(authentication);
            List<Product> products = productService.getAllProducts().stream()
                .filter(p -> p.getSeller() != null && p.getSeller().getId().equals(seller.getId()))
                .toList();
            return ResponseEntity.ok(products);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createProduct(@RequestBody Product product, Authentication authentication) { // Require authentication
        try {
            User seller = getUserFromAuthentication(authentication);
            // Ensure the user has the SELLER role (or ADMIN)
            if (seller.getRole() != com.webapp.back_end.model.Role.SELLER && seller.getRole() != com.webapp.back_end.model.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of("error", "User must be a seller or admin to create products"));
            }
            Product createdProduct = productService.createProduct(product, seller);
            return ResponseEntity.ok(createdProduct);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @RequestBody Product product, Authentication authentication) { // Require authentication
         try {
            User seller = getUserFromAuthentication(authentication);
            Product updatedProduct = productService.updateProduct(id, product, seller);
            return ResponseEntity.ok(updatedProduct);
        } catch (RuntimeException e) {
             Map<String, String> response = new HashMap<>();
             response.put("error", e.getMessage());
             // Return 403 Forbidden if it's an authorization error
             if (e.getMessage().contains("authorized")) {
                 return ResponseEntity.status(403).body(response);
             }
             return ResponseEntity.badRequest().body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id, Authentication authentication) { // Require authentication
         try {
            User seller = getUserFromAuthentication(authentication);
            productService.deleteProduct(id, seller);
            return ResponseEntity.ok().build();
         } catch (RuntimeException e) {
             Map<String, String> response = new HashMap<>();
             response.put("error", e.getMessage());
             // Return 403 Forbidden if it's an authorization error
             if (e.getMessage().contains("authorized")) {
                 return ResponseEntity.status(403).body(response);
             }
             return ResponseEntity.badRequest().body(response);
        }
    }

    // Helper method to get User from Authentication
    private User getUserFromAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
    }
}