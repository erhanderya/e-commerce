package com.webapp.back_end.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.webapp.back_end.model.Review;
import com.webapp.back_end.model.User;
import com.webapp.back_end.repository.UserRepository;
import com.webapp.back_end.service.ReviewService;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "http://localhost:4200")
public class ReviewController {
    
    @Autowired
    private ReviewService reviewService;
    
    @Autowired
    private UserRepository userRepository;
    
    // Get all reviews
    @GetMapping
    public List<Review> getAllReviews() {
        return reviewService.getAllReviews();
    }
    
    // Get reviews for a specific product
    @GetMapping("/product/{productId}")
    public List<Review> getReviewsByProductId(@PathVariable Long productId) {
        return reviewService.getReviewsByProductId(productId);
    }
    
    // Get reviews by a specific user
    @GetMapping("/user/{userId}")
    public List<Review> getReviewsByUserId(@PathVariable Long userId) {
        return reviewService.getReviewsByUserId(userId);
    }
    
    // Get a specific review
    @GetMapping("/{id}")
    public ResponseEntity<?> getReviewById(@PathVariable Long id) {
        Optional<Review> review = reviewService.getReviewById(id);
        if (review.isPresent()) {
            return ResponseEntity.ok(review.get());
        } else {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Review not found with ID: " + id);
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // Create a new review
    @PostMapping
    public ResponseEntity<?> createReview(@RequestBody Map<String, Object> reviewData, Authentication authentication) {
        Map<String, String> errorResponse = new HashMap<>();
        try {
            // Debug: Print the received data
            System.out.println("Received review data: " + reviewData);

            // Get authenticated user
            User user = getUserFromAuthentication(authentication);
            Long userId = user.getId();
            System.out.println("Authenticated user ID: " + userId);

            // --- Improved Data Extraction and Validation ---
            Long productId;
            Integer rating;
            String comment;

            // Validate and extract productId
            if (!reviewData.containsKey("productId") || reviewData.get("productId") == null) {
                errorResponse.put("error", "productId is required");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            try {
                // Handle potential Integer or String representation
                Object pidObj = reviewData.get("productId");
                if (pidObj instanceof Number) {
                    productId = ((Number) pidObj).longValue();
                } else {
                    productId = Long.valueOf(pidObj.toString());
                }
            } catch (NumberFormatException e) {
                errorResponse.put("error", "Invalid format for productId");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Validate and extract rating
            if (!reviewData.containsKey("rating") || reviewData.get("rating") == null) {
                errorResponse.put("error", "rating is required");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            try {
                 // Handle potential Integer or String representation
                Object ratingObj = reviewData.get("rating");
                if (ratingObj instanceof Number) {
                    rating = ((Number) ratingObj).intValue();
                } else {
                    rating = Integer.valueOf(ratingObj.toString());
                }
                 if (rating < 1 || rating > 5) { // Add rating range validation
                     errorResponse.put("error", "Rating must be between 1 and 5");
                     return ResponseEntity.badRequest().body(errorResponse);
                 }
            } catch (NumberFormatException e) {
                errorResponse.put("error", "Invalid format for rating");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Validate and extract comment
            if (!reviewData.containsKey("comment") || reviewData.get("comment") == null || reviewData.get("comment").toString().trim().isEmpty()) {
                errorResponse.put("error", "comment is required and cannot be empty");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            comment = reviewData.get("comment").toString();
            // --- End of Improved Data Extraction ---

            System.out.println("Extracted productId: " + productId);
            System.out.println("Extracted rating: " + rating);
            System.out.println("Extracted comment: " + comment);

            // Create a new review object
            Review review = new Review();
            review.setRating(rating);
            review.setComment(comment);

            // Create the review
            Review createdReview = reviewService.createReview(review, productId, userId);
            return ResponseEntity.ok(createdReview);
        } catch (IllegalStateException e) {
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
        } catch (Exception e) {
            e.printStackTrace();
            errorResponse.put("error", "Failed to create review: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // Update a review
    @PutMapping("/{id}")
    public ResponseEntity<?> updateReview(@PathVariable Long id, @RequestBody Map<String, Object> reviewData, Authentication authentication) {
        Map<String, String> errorResponse = new HashMap<>();
        try {
            User user = getUserFromAuthentication(authentication);

            // --- Improved Data Extraction and Validation ---
            Integer rating;
            String comment;

             // Validate and extract rating
            if (!reviewData.containsKey("rating") || reviewData.get("rating") == null) {
                errorResponse.put("error", "rating is required");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            try {
                // Handle potential Integer or String representation
                Object ratingObj = reviewData.get("rating");
                if (ratingObj instanceof Number) {
                    rating = ((Number) ratingObj).intValue();
                } else {
                    rating = Integer.valueOf(ratingObj.toString());
                }
                 if (rating < 1 || rating > 5) { // Add rating range validation
                     errorResponse.put("error", "Rating must be between 1 and 5");
                     return ResponseEntity.badRequest().body(errorResponse);
                 }
            } catch (NumberFormatException e) {
                errorResponse.put("error", "Invalid format for rating");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Validate and extract comment
            if (!reviewData.containsKey("comment") || reviewData.get("comment") == null || reviewData.get("comment").toString().trim().isEmpty()) {
                errorResponse.put("error", "comment is required and cannot be empty");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            comment = reviewData.get("comment").toString();
            // --- End of Improved Data Extraction ---

            // Create a review object with updated fields
            Review updatedReviewData = new Review();
            updatedReviewData.setRating(rating);
            updatedReviewData.setComment(comment);

            Review updatedReview = reviewService.updateReview(id, updatedReviewData, user.getId());
            return ResponseEntity.ok(updatedReview);
        } catch (SecurityException e) {
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(403).body(errorResponse); // Forbidden
        } catch (RuntimeException e) { // Catch specific runtime exceptions
             e.printStackTrace();
             errorResponse.put("error", e.getMessage());
             // Determine appropriate status code based on exception (e.g., 404 if review not found by service)
             // Assuming ReviewService might throw specific RuntimeExceptions we can check
             // if (e instanceof ReviewNotFoundException) { return ResponseEntity.status(404).body(errorResponse); }
             return ResponseEntity.badRequest().body(errorResponse); // Default to bad request for now
        } catch (Exception e) {
            e.printStackTrace();
            errorResponse.put("error", "Failed to update review due to an internal server error.");
            return ResponseEntity.internalServerError().body(errorResponse); // Use 500 for unexpected server errors
        }
    }
    
    // Delete a review
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReview(@PathVariable Long id, Authentication authentication) {
        try {
            User user = getUserFromAuthentication(authentication);
            reviewService.deleteReview(id, user.getId());
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(403).body(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
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