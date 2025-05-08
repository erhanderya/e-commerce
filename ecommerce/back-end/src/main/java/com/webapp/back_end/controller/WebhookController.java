package com.webapp.back_end.controller;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.net.Webhook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/webhook")
public class WebhookController {

    @Value("${stripe.webhook.secret:}")
    private String webhookSecret;

    @PostMapping("/stripe")
    public ResponseEntity<String> handleStripeWebhook(HttpServletRequest request) {
        String payload;
        
        try {
            // Read the request body
            payload = request.getReader().lines().collect(Collectors.joining());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error reading request body");
        }
        
        String sigHeader = request.getHeader("Stripe-Signature");
        Event event = null;
        
        // Verify webhook signature and extract the event
        if (webhookSecret != null && !webhookSecret.isEmpty()) {
            try {
                event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
            } catch (SignatureVerificationException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
            }
        } else {
            try {
                event = Event.GSON.fromJson(payload, Event.class);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid payload");
            }
        }

        // Handle the event
        EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
        StripeObject stripeObject = null;
        
        if (dataObjectDeserializer.getObject().isPresent()) {
            stripeObject = dataObjectDeserializer.getObject().get();
        } else {
            // Deserialization failed, probably due to an API version mismatch
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid event data");
        }

        // Handle the event type
        switch (event.getType()) {
            case "payment_intent.succeeded":
                PaymentIntent paymentIntent = (PaymentIntent) stripeObject;
                System.out.println("💰 Payment succeeded: " + paymentIntent.getId());
                // Here you would typically:
                // 1. Create an order record in your database
                // 2. Update inventory
                // 3. Send order confirmation email to customer
                break;
            case "payment_intent.payment_failed":
                PaymentIntent failedPaymentIntent = (PaymentIntent) stripeObject;
                System.out.println("❌ Payment failed: " + failedPaymentIntent.getId());
                // Handle failed payment (e.g., notify customer)
                break;
            default:
                System.out.println("Unhandled event type: " + event.getType());
        }

        return ResponseEntity.ok().body("Webhook processed successfully");
    }
}