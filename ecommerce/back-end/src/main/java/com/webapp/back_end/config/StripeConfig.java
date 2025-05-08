package com.webapp.back_end.config;

import com.stripe.Stripe;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

@Configuration
public class StripeConfig {
    
    @Value("${stripe.api.secret.key}")
    private String secretKey;
    
    @Value("${stripe.api.publishable.key}")
    private String publishableKey;
    
    @PostConstruct
    public void initStripe() {
        Stripe.apiKey = secretKey;
    }
    
    public String getPublishableKey() {
        return publishableKey;
    }
}