package com.webapp.back_end.model;

public enum OrderItemStatus {
    PENDING,          // Order item is just ordered but not yet processed
    PREPARING,        // Order item is being prepared
    SHIPPED,          // Order item has been shipped
    DELIVERED,        // Order item has been delivered
    RETURNED,         // Order item has been returned
    RETURN_REQUESTED, // Return has been requested for this item
    CANCELLED,        // Order item has been cancelled
    REFUNDED          // Order item has been refunded
} 