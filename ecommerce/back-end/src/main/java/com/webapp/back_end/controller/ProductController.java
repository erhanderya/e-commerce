package com.webapp.back_end.controller;

import java.util.List;
import java.util.Map; // Import Map
import java.util.HashMap; // Import HashMap
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication; // Import Authentication
import org.springframework.web.bind.annotation.*;

import com.webapp.back_end.model.Product;
import com.webapp.back_end.model.Review;
import com.webapp.back_end.model.User; // Import User
import com.webapp.back_end.repository.UserRepository; // Import UserRepository
import com.webapp.back_end.service.ProductService;
import com.webapp.back_end.service.ReviewService;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:4200")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private UserRepository userRepository; // Inject UserRepository
    
    @Autowired
    private ReviewService reviewService;

    @GetMapping
    public List<Map<String, Object>> getAllProducts() {
        List<Product> products = productService.getAllProducts();
        return products.stream().map(product -> {
            Map<String, Object> productMap = new HashMap<>();
            productMap.put("id", product.getId());
            productMap.put("name", product.getName());
            productMap.put("description", product.getDescription());
            productMap.put("price", product.getPrice());
            productMap.put("image_url", product.getImage_url());
            productMap.put("stock_quantity", product.getStock_quantity());
            productMap.put("category", product.getCategory());
            productMap.put("seller", product.getSeller());
            productMap.put("category_id", product.getCategory_id());
            
            // Add average rating and review count
            Double averageRating = reviewService.calculateAverageRating(product.getId());
            List<Review> reviews = reviewService.getReviewsByProductId(product.getId());
            productMap.put("averageRating", averageRating);
            productMap.put("reviewCount", reviews.size());
            
            return productMap;
        }).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(@PathVariable Long id) {
        return productService.getProductById(id)
                .map(product -> {
                    Map<String, Object> productMap = new HashMap<>();
                    productMap.put("id", product.getId());
                    productMap.put("name", product.getName());
                    productMap.put("description", product.getDescription());
                    productMap.put("price", product.getPrice());
                    productMap.put("image_url", product.getImage_url());
                    productMap.put("stock_quantity", product.getStock_quantity());
                    productMap.put("category", product.getCategory());
                    productMap.put("seller", product.getSeller());
                    productMap.put("category_id", product.getCategory_id());
                    
                    // Add average rating and review count
                    Double averageRating = reviewService.calculateAverageRating(product.getId());
                    List<Review> reviews = reviewService.getReviewsByProductId(product.getId());
                    productMap.put("averageRating", averageRating);
                    productMap.put("reviewCount", reviews.size());
                    
                    return ResponseEntity.ok(productMap);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<Map<String, Object>>> getProductsByCategory(@PathVariable Long categoryId) {
        List<Product> products = productService.getProductsByCategory(categoryId);
        List<Map<String, Object>> productsWithRatings = products.stream().map(product -> {
            Map<String, Object> productMap = new HashMap<>();
            productMap.put("id", product.getId());
            productMap.put("name", product.getName());
            productMap.put("description", product.getDescription());
            productMap.put("price", product.getPrice());
            productMap.put("image_url", product.getImage_url());
            productMap.put("stock_quantity", product.getStock_quantity());
            productMap.put("category", product.getCategory());
            productMap.put("seller", product.getSeller());
            productMap.put("category_id", product.getCategory_id());
            
            // Add average rating and review count
            Double averageRating = reviewService.calculateAverageRating(product.getId());
            List<Review> reviews = reviewService.getReviewsByProductId(product.getId());
            productMap.put("averageRating", averageRating);
            productMap.put("reviewCount", reviews.size());
            
            return productMap;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(productsWithRatings);
    }
    
    @GetMapping("/seller")
    public ResponseEntity<?> getSellerProducts(Authentication authentication) {
        try {
            User seller = getUserFromAuthentication(authentication);
            List<Product> products = productService.getAllProducts().stream()
                .filter(p -> p.getSeller() != null && p.getSeller().getId().equals(seller.getId()))
                .toList();
                
            List<Map<String, Object>> productsWithRatings = products.stream().map(product -> {
                Map<String, Object> productMap = new HashMap<>();
                productMap.put("id", product.getId());
                productMap.put("name", product.getName());
                productMap.put("description", product.getDescription());
                productMap.put("price", product.getPrice());
                productMap.put("image_url", product.getImage_url());
                productMap.put("stock_quantity", product.getStock_quantity());
                productMap.put("category", product.getCategory());
                productMap.put("seller", product.getSeller());
                productMap.put("category_id", product.getCategory_id());
                
                // Add average rating and review count
                Double averageRating = reviewService.calculateAverageRating(product.getId());
                List<Review> reviews = reviewService.getReviewsByProductId(product.getId());
                productMap.put("averageRating", averageRating);
                productMap.put("reviewCount", reviews.size());
                
                return productMap;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(productsWithRatings);
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