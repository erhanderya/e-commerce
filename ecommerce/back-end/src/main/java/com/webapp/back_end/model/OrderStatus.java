package com.webapp.back_end.model;

public enum OrderStatus {
    PENDING,           // Order placed but not yet processed
    PREPARING,         // Order is being prepared
    IN_COUNTRY,        // Shipment arrived in customer's country
    IN_CITY,           // Shipment arrived in customer's city
    OUT_FOR_DELIVERY,  // On way to the address (delivery expected today)
    DELIVERED,         // Order received by customer
    CANCELLED          // Order cancelled
}