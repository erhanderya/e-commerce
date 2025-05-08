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
}