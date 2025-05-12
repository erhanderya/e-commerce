package com.webapp.back_end.service;

import com.webapp.back_end.model.*;
import com.webapp.back_end.repository.OrderRepository;
import com.webapp.back_end.repository.ProductRepository;
import com.webapp.back_end.repository.AddressRepository;
import com.webapp.back_end.repository.ReturnRequestRepository;
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
    
    @Autowired
    private ReturnRequestRepository returnRequestRepository;
    
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
            logger.info("Attempting to create refund with Stripe for PaymentIntent ID: {}", actualPaymentIntentId);
            
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
    
    /**
     * Cancel an order by a seller
     * Only orders in PENDING or PREPARING status can be cancelled by a seller
     */
    @Transactional
    public Order cancelOrderBySeller(Long orderId, Long sellerId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        
        // Check if this order contains any products from this seller
        boolean hasSellersProduct = order.getItems().stream()
                .anyMatch(item -> item.getProduct().getSeller().getId().equals(sellerId));

        if (!hasSellersProduct) {
            logger.warn("Seller ID: {} attempted to cancel order ID: {} which doesn't contain their products", sellerId, orderId);
            throw new RuntimeException("This order doesn't contain any of your products");
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
            
            logger.info("Order ID: {} successfully refunded by seller ID: {}", orderId, sellerId);
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
        logger.info("Order ID: {} successfully canceled by seller ID: {}", orderId, sellerId);
        return savedOrder;
    }

    /**
     * Create a return request for a delivered order
     */
    @Transactional
    public ReturnRequest createReturnRequest(Long orderId, Long userId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getUser().getId().equals(userId)) {
            throw new RuntimeException("You can only return your own orders");
        }

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new RuntimeException("Only delivered orders can be returned");
        }

        // Check if there's already any return request (processed or not) for this order
        if (returnRequestRepository.existsByOrderId(orderId)) {
            throw new RuntimeException("You have already submitted a return request for this order");
        }

        ReturnRequest returnRequest = new ReturnRequest();
        returnRequest.setOrder(order);
        returnRequest.setReason(reason);
        returnRequest.setRequestDate(new Date());
        returnRequest.setProcessed(false);
        returnRequest.setApproved(false);

        // Mark the order as having a return request
        order.setHasReturnRequest(true);
        orderRepository.save(order);

        return returnRequestRepository.save(returnRequest);
    }

    /**
     * Get all pending return requests for a seller
     */
    public List<ReturnRequest> getPendingReturnRequestsForSeller(Long sellerId) {
        // Get all orders that have items sold by this seller
        List<Order> sellerOrders = getOrdersForSeller(sellerId);
        
        // Filter orders that have pending return requests
        List<Long> orderIds = sellerOrders.stream()
                .filter(order -> order.getHasReturnRequest() != null && order.getHasReturnRequest())
                .map(Order::getId)
                .collect(Collectors.toList());
                
        if (orderIds.isEmpty()) {
            return new ArrayList<>();
        }
        
        // Get all pending return requests for these orders
        return orderIds.stream()
                .map(id -> returnRequestRepository.findByOrderIdAndProcessed(id, false))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
    }

    /**
     * Process a return request (approve or reject)
     */
    @Transactional
    public ReturnRequest processReturnRequest(Long requestId, Long sellerId, boolean approved, String notes) {
        ReturnRequest returnRequest = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Return request not found"));
        
        Order order = returnRequest.getOrder();
        if (order == null) {
            throw new RuntimeException("Return request has no associated order");
        }
        
        // Verify the seller has items in this order
        boolean hasSellersProduct = order.getItems().stream()
                .anyMatch(item -> item.getProduct().getSeller().getId().equals(sellerId));
        
        if (!hasSellersProduct) {
            throw new RuntimeException("You cannot process return requests for orders that don't contain your products");
        }
        
        // Only process if it hasn't been processed already
        if (returnRequest.isProcessed()) {
            throw new RuntimeException("This return request has already been processed");
        }
        
        try {
            // First save the return request changes
            returnRequest.setProcessed(true);
            returnRequest.setApproved(approved);
            returnRequest.setProcessedDate(new Date());
            
            // Add a special note indicating this is a return, not just a cancellation
            // Frontend can use this to display as "Returned" even though we use CANCELLED status
            String processedNotes = notes != null ? notes : "";
            if (approved) {
                processedNotes += "\n[THIS_IS_RETURN_APPROVED]"; // Special marker
            }
            returnRequest.setProcessorNotes(processedNotes);
            ReturnRequest savedRequest = returnRequestRepository.save(returnRequest);
            
            // Then update the order separately
            if (approved) {
                // Explicitly set order fields to avoid null issues
                order.setHasReturnRequest(false);
                
                // Use CANCELLED status instead of RETURNED to avoid DB issues
                // Frontend will interpret this as RETURNED based on the return request
                order.setStatus(OrderStatus.CANCELLED);
                
                // Try to process refund through Stripe, but continue even if it fails
                boolean refundProcessed = false;
                String refundError = null;
                
                if (order.getPaymentId() != null && !order.getPaymentId().isEmpty()) {
                    try {
                        refundProcessed = processRefund(order);
                        if (refundProcessed) {
                            logger.info("Order ID: {} was successfully refunded through return request ID: {}", 
                                order.getId(), returnRequest.getId());
                        } else {
                            logger.warn("Refund processing failed for order ID: {}, but return request was still approved", 
                                order.getId());
                            refundError = "Payment refund failed, but return was approved. Please contact support for manual refund.";
                        }
                    } catch (Exception e) {
                        logger.error("Exception during refund processing for order ID: {}: {}", 
                            order.getId(), e.getMessage(), e);
                        refundError = "Exception during payment refund: " + e.getMessage() + 
                            ". Return was approved, but please contact support for manual refund.";
                    }
                } else {
                    logger.warn("No payment ID found for order ID: {}, skipping refund", order.getId());
                    refundError = "No payment ID found, return was approved but refund may need manual processing.";
                }
                
                // Add refund error note to the return request if needed
                if (refundError != null) {
                    String updatedNotes = returnRequest.getProcessorNotes() + "\n\n" + refundError;
                    returnRequest.setProcessorNotes(updatedNotes);
                    returnRequestRepository.save(returnRequest);
                }
                
                // Handle product inventory update - add items back to stock
                for (OrderItem item : order.getItems()) {
                    Product product = item.getProduct();
                    int newQuantity = product.getStock_quantity() + item.getQuantity();
                    product.setStock_quantity(newQuantity);
                    productRepository.save(product);
                }
                
                // Save order with CANCELLED status (interpreted as RETURNED by frontend)
                orderRepository.save(order);
            } else {
                // For rejected requests, just remove the flag
                order.setHasReturnRequest(false);
                orderRepository.save(order);
            }
            
            return savedRequest;
        } catch (Exception e) {
            logger.error("Error processing return request: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process return request: " + e.getMessage());
        }
    }

    /**
     * Get all return requests for a user
     */
    public List<ReturnRequest> getUserReturnRequests(Long userId) {
        return returnRequestRepository.findByOrderUserIdAndProcessed(userId, true);
    }

    /**
     * Get pending return request for an order if it exists
     */
    public Optional<ReturnRequest> getPendingReturnRequestForOrder(Long orderId) {
        return returnRequestRepository.findByOrderIdAndProcessed(orderId, false);
    }
}