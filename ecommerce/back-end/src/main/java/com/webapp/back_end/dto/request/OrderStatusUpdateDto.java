package com.webapp.back_end.dto.request;

import com.webapp.back_end.model.OrderStatus;

/**
 * Data Transfer Object for Order Status Update Request
 */
public class OrderStatusUpdateDto {
    private OrderStatus status;

    // Getters and Setters
    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }
} 