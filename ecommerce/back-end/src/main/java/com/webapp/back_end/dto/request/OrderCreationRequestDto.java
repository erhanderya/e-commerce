package com.webapp.back_end.dto.request;

/**
 * Data Transfer Object for Order Creation Request
 */
public class OrderCreationRequestDto {
    private Long addressId;
    private String paymentId;

    // Getters and Setters
    public Long getAddressId() {
        return addressId;
    }

    public void setAddressId(Long addressId) {
        this.addressId = addressId;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }
} 