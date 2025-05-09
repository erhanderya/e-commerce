package com.webapp.back_end.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CheckoutSessionRequest {
    private Long amount; // Amount in cents
    private String currency;
    private String description;
    private String successUrl;
    private String cancelUrl;
    private Long addressId;


    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setSuccessUrl(String successUrl) {
        this.successUrl = successUrl;
    }

    public void setCancelUrl(String cancelUrl) {
        this.cancelUrl = cancelUrl;
    }

    public void setAddressId(Long addressId) {
        this.addressId = addressId;
    }   

    public Long getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }   

    public String getDescription() {
        return description;
    }

    public String getSuccessUrl() {
        return successUrl;
    }

    public String getCancelUrl() {
        return cancelUrl;
    }

    public Long getAddressId() {
        return addressId;
    }
    
    
}