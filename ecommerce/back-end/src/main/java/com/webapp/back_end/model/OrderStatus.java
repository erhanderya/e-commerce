package com.webapp.back_end.model;

public enum OrderStatus {
    RECEIVED,   // Order has been received but not yet delivered
    DELIVERED,  // Order has been delivered to the customer
    CANCELED,   // Order has been canceled
    REFUNDED,   // Order has been refunded
    RETURNED    // Order has been returned
}