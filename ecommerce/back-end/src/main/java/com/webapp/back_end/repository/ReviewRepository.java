package com.webapp.back_end.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.webapp.back_end.model.Review;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    
    // Find reviews by product ID
    List<Review> findByProductId(Long productId);
    
    // Find reviews by user ID
    List<Review> findByUserId(Long userId);
    
    // Find reviews by both product and user ID
    List<Review> findByProductIdAndUserId(Long productId, Long userId);
}