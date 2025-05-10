package com.webapp.back_end.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.webapp.back_end.model.Product;
import com.webapp.back_end.model.Review;
import com.webapp.back_end.model.User;
import com.webapp.back_end.repository.ProductRepository;
import com.webapp.back_end.repository.ReviewRepository;
import com.webapp.back_end.repository.UserRepository;

@Service
public class ReviewService {
    
    @Autowired
    private ReviewRepository reviewRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private OrderService orderService;
    
    /**
     * Get all reviews
     */
    public List<Review> getAllReviews() {
        return reviewRepository.findAll();
    }
    
    /**
     * Get reviews for a specific product
     */
    public List<Review> getReviewsByProductId(Long productId) {
        return reviewRepository.findByProductId(productId);
    }
    
    /**
     * Get reviews by a specific user
     */
    public List<Review> getReviewsByUserId(Long userId) {
        return reviewRepository.findByUserId(userId);
    }
    
    /**
     * Get a specific review by ID
     */
    public Optional<Review> getReviewById(Long id) {
        return reviewRepository.findById(id);
    }
    
    /**
     * Calculate the average rating for a product
     */
    public Double calculateAverageRating(Long productId) {
        List<Review> reviews = reviewRepository.findByProductId(productId);
        if (reviews.isEmpty()) {
            return 0.0;
        }
        
        double sum = reviews.stream()
                .mapToInt(Review::getRating)
                .sum();
        
        return sum / reviews.size();
    }
    
    /**
     * Create a new review
     */
    public Review createReview(Review review, Long productId, Long userId) {
        // Find product
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NoSuchElementException("Product not found with ID: " + productId));
        
        // Find user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found with ID: " + userId));
        
        // Check if user already reviewed this product
        List<Review> existingReviews = reviewRepository.findByProductIdAndUserId(productId, userId);
        if (!existingReviews.isEmpty()) {
            throw new IllegalStateException("User has already reviewed this product");
        }
        
        // Check if user has purchased the product
        boolean hasPurchased = orderService.hasUserPurchasedProduct(userId, productId);
        if (!hasPurchased) {
            throw new IllegalStateException("Cannot review a product you haven't purchased");
        }
        
        // Set relationships
        review.setProduct(product);
        review.setUser(user);
        
        // Set created date
        review.setCreatedAt(LocalDateTime.now());
        
        // Save and return
        return reviewRepository.save(review);
    }
    
    /**
     * Update an existing review
     */
    public Review updateReview(Long reviewId, Review updatedReview, Long userId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NoSuchElementException("Review not found with ID: " + reviewId));
        
        // Check if the user is the author of the review
        if (!review.getUser().getId().equals(userId)) {
            throw new SecurityException("User not authorized to update this review");
        }
        
        // Check if user has purchased the product
        boolean hasPurchased = orderService.hasUserPurchasedProduct(userId, review.getProduct().getId());
        if (!hasPurchased) {
            throw new IllegalStateException("Cannot review a product you haven't purchased");
        }
        
        // Update fields
        if (updatedReview.getRating() != null) {
            review.setRating(updatedReview.getRating());
        }
        
        if (updatedReview.getComment() != null) {
            review.setComment(updatedReview.getComment());
        }
        
        // Save and return
        return reviewRepository.save(review);
    }
    
    /**
     * Delete a review
     */
    public void deleteReview(Long reviewId, Long userId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NoSuchElementException("Review not found with ID: " + reviewId));
                
        // Get the user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found with ID: " + userId));
        
        // Check if the user is the author of the review or an admin
        boolean isAdmin = user.getRole() == com.webapp.back_end.model.Role.ADMIN;
        boolean isAuthor = review.getUser().getId().equals(userId);
        
        if (!isAuthor && !isAdmin) {
            throw new SecurityException("User not authorized to delete this review");
        }
        
        reviewRepository.delete(review);
    }
}