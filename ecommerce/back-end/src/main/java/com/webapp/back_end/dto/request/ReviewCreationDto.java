package com.webapp.back_end.dto.request;

/**
 * Data Transfer Object for Review Creation Request
 */
public class ReviewCreationDto {
    private Long productId;
    private Integer rating;
    private String comment;

    // Getters and Setters
    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
} 