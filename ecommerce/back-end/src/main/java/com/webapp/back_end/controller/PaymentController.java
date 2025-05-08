package com.webapp.back_end.controller;

import com.stripe.exception.StripeException;
import com.webapp.back_end.model.CheckoutSessionRequest;
import com.webapp.back_end.model.CheckoutSessionResponse;
import com.webapp.back_end.model.PaymentRequest;
import com.webapp.back_end.model.PaymentResponse;
import com.webapp.back_end.service.PaymentService;
import com.webapp.back_end.repository.UserRepository;
import com.webapp.back_end.model.User;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "http://localhost:4200")
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    public PaymentController(
        PaymentService paymentService,
        UserRepository userRepository
    ) {
        this.paymentService = paymentService;
        this.userRepository = userRepository;
    }

    @PostMapping("/create-payment-intent")
    public ResponseEntity<PaymentResponse> createPaymentIntent(
        @RequestBody PaymentRequest paymentRequest,
        Authentication authentication
    ) {
        try {
            User user = getUserFromAuthentication(authentication);
            PaymentResponse response = paymentService.createPaymentIntent(paymentRequest, user);

            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } catch (StripeException e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/create-checkout-session")
    public ResponseEntity<CheckoutSessionResponse> createCheckoutSession(
        @RequestBody CheckoutSessionRequest checkoutRequest,
        Authentication authentication
    ) {
        try {
            User user = getUserFromAuthentication(authentication);

            checkoutRequest.setSuccessUrl(checkoutRequest.getSuccessUrl() + 
                "?addressId=" + checkoutRequest.getAddressId());

            CheckoutSessionResponse response = paymentService.createCheckoutSession(checkoutRequest, user);
            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } catch (StripeException e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleStripeWebhook(@RequestBody String payload, @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            paymentService.handleWebhook(payload, sigHeader);
            return new ResponseEntity<>("Webhook received", HttpStatus.OK);
        } catch (StripeException e) {
            e.printStackTrace();
            return new ResponseEntity<>("Webhook error: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return new ResponseEntity<>("Webhook processing error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>("Unexpected webhook error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private User getUserFromAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
    }
}