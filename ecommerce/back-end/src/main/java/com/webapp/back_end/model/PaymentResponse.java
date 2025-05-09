package com.webapp.back_end.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaymentResponse {
    private String clientSecret;
    private String publishableKey;
    private String status;
    private String id;

    // Explicit setter for clientSecret
    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public void setPublishableKey(String publishableKey) {
        this.publishableKey = publishableKey;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setId(String id) {
        this.id = id;
    } 

    

    // ... any other explicit getters/setters if needed ...
}