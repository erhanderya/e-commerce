package com.webapp.back_end.service;

import com.webapp.back_end.model.*;
import com.webapp.back_end.repository.OrderRepository;
import com.webapp.back_end.repository.ProductRepository;
import com.webapp.back_end.repository.AddressRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.checkout.Session;
import com.stripe.param.RefundCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.HashSet;
import java.util.Set;
import java.util.HashMap;
import java.util.Map;

@Service
public class OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private CartService cartService;
    
    @Autowired
    private AddressRepository addressRepository;
    
    @Autowired
    private PaymentService paymentService;
    
    /**
     * Create a new order from user's cart
     */
    @Transactional
    public Order createOrderFromCart(Long userId, Long addressId, String paymentId) {
        // Get user's cart
        Cart cart = cartService.getUserCart(userId);
        
        if (cart.getCartItems().isEmpty()) {
            throw new RuntimeException("Cannot create order with empty cart");
        }
        
        // Find the shipping address
        Address shippingAddress = addressRepository.findById(addressId)
            .orElseThrow(() -> new RuntimeException("Shipping address not found"));
        
        // Create new order
        Order order = new Order();
        order.setUser(cart.getUser());
        order.setOrderDate(new Date());
        order.setStatus(OrderStatus.PENDING);
        order.setShippingAddress(shippingAddress);
        order.setPaymentId(paymentId);
        
        // Calculate total amount
        BigDecimal totalAmount = BigDecimal.valueOf(cart.getTotalPrice());
        order.setTotalAmount(totalAmount);
        
        // Create order items from cart items
        List<OrderItem> orderItems = new ArrayList<>();
        for (CartItem cartItem : cart.getCartItems()) {
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(cartItem.getProduct());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setPrice(BigDecimal.valueOf(cartItem.getProduct().getPrice()));
            orderItems.add(orderItem);
            
            // Update product stock
            Product product = cartItem.getProduct();
            product.setStock_quantity(product.getStock_quantity() - cartItem.getQuantity());
            productRepository.save(product);
        }
        
        order.setItems(orderItems);
        
        // Save the order
        Order savedOrder = orderRepository.save(order);
        
        // Clear the cart after order is created
        cartService.clearCart(userId);
        
        return savedOrder;
    }
    
    /**
     * Get all orders for a user
     */
    public List<Order> getOrdersByUser(Long userId) {
        return orderRepository.findByUserIdOrderByOrderDateDesc(userId);
    }
    
    /**
     * Get an order by ID
     */
    public Optional<Order> getOrderById(Long orderId) {
        return orderRepository.findById(orderId);
    }
    
    /**
     * Update order status
     */
    @Transactional
    public Order updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        
        order.setStatus(status);
        return orderRepository.save(order);
    }
    
    /**
     * Get all orders (for admin)
     */
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }
    
    /**
     * Get orders that contain products from a specific seller
     */
    public List<Order> getOrdersForSeller(Long sellerId) {
        return orderRepository.findOrdersContainingSellerProducts(sellerId);
    }
    
    /**
     * Extract a payment intent ID from a checkout session ID
     * @param sessionId The Stripe Checkout Session ID
     * @return The associated PaymentIntent ID or null if not found
     */
    private String getPaymentIntentFromSession(String sessionId) {
        try {
            // Clean the sessionId in case it has query parameters
            String cleanSessionId = sessionId;
            if (sessionId.contains("?")) {
                cleanSessionId = sessionId.substring(0, sessionId.indexOf("?"));
                logger.info("Cleaned session ID from '{}' to '{}'", sessionId, cleanSessionId);
            }
            
            Session session = Session.retrieve(cleanSessionId);
            String paymentIntentId = session.getPaymentIntent();
            
            if (paymentIntentId != null && !paymentIntentId.isEmpty()) {
                logger.info("Found payment intent '{}' from session '{}'", paymentIntentId, cleanSessionId);
                return paymentIntentId;
            } else {
                logger.warn("No payment intent found in session '{}'", cleanSessionId);
                return null;
            }
        } catch (StripeException e) {
            logger.error("Error retrieving session '{}': {}", sessionId, e.getMessage());
            return null;
        }
    }
    
    /**
     * Process refund for an order
     * @param order The order to refund
     * @return true if refund was successful, false otherwise
     */
    private boolean processRefund(Order order) {
        try {
            String paymentId = order.getPaymentId();
            if (paymentId == null || paymentId.isEmpty()) {
                logger.error("No payment ID found for order ID: {}", order.getId());
                throw new RuntimeException("No payment ID found for this order");
            }
            
            logger.info("Processing refund for order ID: {} with payment ID: {}", order.getId(), paymentId);
            
            // Determine if this is a checkout session ID or a payment intent ID
            String actualPaymentIntentId = paymentId;
            
            // If it starts with 'cs_', it's a checkout session
            if (paymentId.startsWith("cs_")) {
                logger.info("Detected checkout session ID '{}', retrieving associated payment intent", paymentId);
                String sessionPaymentIntentId = getPaymentIntentFromSession(paymentId);
                
                if (sessionPaymentIntentId != null) {
                    actualPaymentIntentId = sessionPaymentIntentId;
                    logger.info("Using payment intent '{}' from session for refund", actualPaymentIntentId);
                } else {
                    logger.error("Failed to retrieve payment intent from session '{}'", paymentId);
                    return false;
                }
            }
            
            // Create refund parameters
            Map<String, Object> refundParams = new HashMap<>();
            refundParams.put("payment_intent", actualPaymentIntentId);
            
            // Create refund through Stripe
            Refund refund = Refund.create(refundParams);
            logger.info("Refund created with ID: {} and status: {}", refund.getId(), refund.getStatus());
            
            // Update order with refund information
            order.setRefundId(refund.getId());
            orderRepository.save(order);
            
            return "succeeded".equals(refund.getStatus());
        } catch (StripeException e) {
            logger.error("Failed to process refund for order ID: {}: {}", order.getId(), e.getMessage(), e);
            return false;
        } catch (Exception e) {
            logger.error("Unexpected error during refund processing for order ID: {}: {}", order.getId(), e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Cancel an order
     * Only orders in PENDING or PREPARING status can be cancelled
     */
    @Transactional
    public Order cancelOrder(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        
        // Check if the order belongs to the user
        if (!order.getUser().getId().equals(userId)) {
            logger.warn("User ID: {} attempted to cancel order ID: {} which they don't own", userId, orderId);
            throw new RuntimeException("You don't have permission to cancel this order");
        }
        
        // Check if the order can be cancelled
        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.PREPARING) {
            logger.warn("Cannot cancel order ID: {} with status: {}", orderId, order.getStatus());
            throw new RuntimeException("Cannot cancel order with status: " + order.getStatus());
        }
        
        // Check if it already has a refund ID (already refunded)
        if (order.getRefundId() != null && !order.getRefundId().isEmpty()) {
            logger.info("Order ID: {} already has refund ID: {}, skipping refund", orderId, order.getRefundId());
        } else {
            // Process refund through Stripe
            boolean refundProcessed = processRefund(order);
            if (!refundProcessed) {
                logger.error("Failed to process refund for order ID: {}", orderId);
                throw new RuntimeException("Failed to process refund. Order cannot be canceled.");
            }
            
            logger.info("Order ID: {} successfully refunded", orderId);
        }
        
        // Update the status to CANCELLED
        order.setStatus(OrderStatus.CANCELLED);
        
        // Restore product quantities
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            product.setStock_quantity(product.getStock_quantity() + item.getQuantity());
            productRepository.save(product);
        }
        
        Order savedOrder = orderRepository.save(order);
        logger.info("Order ID: {} successfully canceled", orderId);
        return savedOrder;
    }

    /**
     * Check if a user has purchased a specific product
     * @param userId the user's ID
     * @param productId the product's ID
     * @return true if the user has purchased the product, false otherwise
     */
    public boolean hasUserPurchasedProduct(Long userId, Long productId) {
        return orderRepository.hasUserPurchasedProduct(userId, productId);
    }
}