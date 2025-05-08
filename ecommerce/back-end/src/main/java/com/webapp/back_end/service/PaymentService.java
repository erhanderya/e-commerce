package com.webapp.back_end.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import com.webapp.back_end.config.StripeConfig;
import com.webapp.back_end.model.CheckoutSessionRequest;
import com.webapp.back_end.model.CheckoutSessionResponse;
import com.webapp.back_end.model.PaymentRequest;
import com.webapp.back_end.model.PaymentResponse;
import com.webapp.back_end.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    @Autowired
    private StripeConfig stripeConfig;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    public PaymentResponse createPaymentIntent(PaymentRequest paymentRequest, User user) throws StripeException {
        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(paymentRequest.getAmount())
                .setCurrency(paymentRequest.getCurrency() != null ? paymentRequest.getCurrency() : "usd")
                .setDescription(paymentRequest.getDescription())
                .setAutomaticPaymentMethods(
                    PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                        .setEnabled(true)
                        .build()
                )
                .putMetadata("userId", user.getId().toString())
                .build();

        PaymentIntent paymentIntent = PaymentIntent.create(params);

        PaymentResponse response = new PaymentResponse();
        response.setClientSecret(paymentIntent.getClientSecret());
        response.setPublishableKey(stripeConfig.getPublishableKey());
        response.setId(paymentIntent.getId());
        response.setStatus(paymentIntent.getStatus());

        return response;
    }

    public CheckoutSessionResponse createCheckoutSession(CheckoutSessionRequest checkoutRequest, User user) throws StripeException {
        SessionCreateParams params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setSuccessUrl(checkoutRequest.getSuccessUrl())
            .setCancelUrl(checkoutRequest.getCancelUrl())
            .addLineItem(
                SessionCreateParams.LineItem.builder()
                    .setPriceData(
                        SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency(checkoutRequest.getCurrency())
                            .setUnitAmount(checkoutRequest.getAmount())
                            .setProductData(
                                SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                    .setName("Order Payment")
                                    .setDescription(checkoutRequest.getDescription())
                                    .build()
                            )
                            .build()
                    )
                    .setQuantity(1L)
                    .build()
            )
            .putMetadata("userId", user.getId().toString())
            .build();

        Session session = Session.create(params);

        CheckoutSessionResponse response = new CheckoutSessionResponse();
        response.setSessionId(session.getId());
        response.setUrl(session.getUrl());

        return response;
    }

    public void handleWebhook(String payload, String sigHeader) throws StripeException {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (Exception e) {
            throw new RuntimeException("Webhook error while constructing event", e);
        }

        switch (event.getType()) {
            case "payment_intent.succeeded":
                PaymentIntent paymentIntent = (PaymentIntent) event.getDataObjectDeserializer().getObject().orElse(null);
                System.out.println("PaymentIntent was successful: " + (paymentIntent != null ? paymentIntent.getId() : "N/A"));
                break;
            case "checkout.session.completed":
                Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
                System.out.println("Checkout Session was successful for session: " + (session != null ? session.getId() : "N/A"));
                break;
            default:
                System.out.println("Unhandled event type: " + event.getType());
        }
    }
}