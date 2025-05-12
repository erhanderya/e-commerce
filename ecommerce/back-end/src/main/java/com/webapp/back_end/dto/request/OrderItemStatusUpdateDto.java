package com.webapp.back_end.dto.request;

import com.webapp.back_end.model.OrderItemStatus;

/**
 * Data Transfer Object for Order Item Status Update Request
 */
public class OrderItemStatusUpdateDto {
    private OrderItemStatus status;

    // Getters and Setters
    public OrderItemStatus getStatus() {
        return status;
    }

    public void setStatus(OrderItemStatus status) {
        this.status = status;
    }
} 