package com.webapp.back_end.dto.request;

/**
 * Data Transfer Object for Return Request Creation
 */
public class ReturnRequestCreationDto {
    private String reason;
    private Long orderItemId;

    // Getters and Setters
    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Long getOrderItemId() {
        return orderItemId;
    }

    public void setOrderItemId(Long orderItemId) {
        this.orderItemId = orderItemId;
    }
} 